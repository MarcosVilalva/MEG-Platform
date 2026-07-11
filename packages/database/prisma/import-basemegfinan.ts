import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import iconv from 'iconv-lite';
import { parse } from 'csv-parse/sync';
import { Prisma, PrismaClient } from '@prisma/client';

type RawRow = Record<string, string>;

const prisma = new PrismaClient();
const filePath = process.argv[2];
const userEmail = process.env.IMPORT_USER_EMAIL || 'm_vilalva@hotmail.com';

if (!filePath) throw new Error('Informe o caminho do CSV: npm run db:import:basemeg -- "C:\\caminho\\basemegfinan.csv"');
if (!process.env.DATABASE_URL?.startsWith('postgres')) throw new Error('DATABASE_URL deve apontar para o PostgreSQL do Supabase.');

const HEADERS = {
  date: 'DATA', type: 'TPLANCAMENTO', description: 'DESCRICAO', income: 'RECEITA',
  expenseClass: 'CLASSIFICAODADESPESA', group: 'GRUPO', expense: 'DESPESAR',
  payment: 'FORMADEPAGAMENTO', situation: 'SITUACAO', modality: 'MODADLIDADE', notes: 'OBSERVACOES'
} as const;

function normalizeHeader(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function decodeSource(bytes: Buffer) {
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), encoding: 'utf8' };
  } catch {
    return { text: iconv.decode(bytes, 'cp850'), encoding: 'cp850' };
  }
}

function resolveHeaders(row: RawRow) {
  const available = new Map(Object.keys(row).map((header) => [normalizeHeader(header), header]));
  const resolved = Object.fromEntries(Object.entries(HEADERS).map(([key, expected]) => [key, available.get(normalizeHeader(expected))])) as Record<keyof typeof HEADERS, string | undefined>;
  const required: Array<keyof typeof HEADERS> = ['date', 'description', 'income', 'expense', 'situation'];
  const missing = required.filter((key) => !resolved[key]);
  if (missing.length) throw new Error(`Cabeçalhos obrigatórios ausentes: ${missing.join(', ')}. Importação cancelada sem alterar dados.`);
  return resolved as Record<keyof typeof HEADERS, string>;
}
function excelDate(value: string) {
  const serial = Number(value.replace(',', '.'));
  if (!Number.isFinite(serial)) throw new Error('INVALID_DATE');
  return new Date(Date.UTC(1899, 11, 30) + serial * 86_400_000);
}

function decimal(value: string) {
  const normalized = value.trim().replace(/\./g, '').replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function paymentType(name: string) {
  const normalized = normalizeHeader(name);
  if (normalized.includes('PIX')) return 'instant';
  if (normalized.includes('BOLETO')) return 'bill';
  if (normalized.includes('DEBITO')) return 'debit';
  if (normalized.includes('CARTAO') || normalized === 'VEROCARD' || normalized === 'RIACHUELO') return 'credit';
  return 'other';
}

async function main() {
  const bytes = await readFile(filePath);
  const fileHash = createHash('sha256').update(bytes).digest('hex');
  const { text, encoding } = decodeSource(bytes);
  const rows = parse(text, { columns: true, delimiter: ';', bom: true, skip_empty_lines: true, relax_column_count: true, trim: true }) as RawRow[];
  if (!rows.length) throw new Error('CSV sem dados.');
  const headers = resolveHeaders(rows[0]);
  const read = (row: RawRow, key: keyof typeof HEADERS) => row[headers[key]] || '';
  const replaceExisting = process.argv.includes('--replace');
  if (process.argv.includes('--validate-only')) {
    let incomeCount = 0; let expenseCount = 0; let missingDescriptions = 0; let invalidAmounts = 0; let invalidDates = 0; let totalIncome = 0; let totalExpense = 0;
    for (const row of rows) {
      const income = decimal(read(row, 'income')); const expense = decimal(read(row, 'expense'));
      if ((income === null && expense === null) || (income !== null && expense !== null)) invalidAmounts += 1;
      else if (income !== null) { incomeCount += 1; totalIncome += income; }
      else { expenseCount += 1; totalExpense += expense!; }
      if (!read(row, 'description').trim()) missingDescriptions += 1;
      try { excelDate(read(row, 'date')); } catch { invalidDates += 1; }
    }
    console.log(JSON.stringify({ encoding, rows: rows.length, incomeCount, expenseCount, totalIncome, totalExpense, balance: totalIncome - totalExpense, missingDescriptions, invalidAmounts, invalidDates, headers: Object.fromEntries(Object.entries(headers).map(([key, value]) => [key, normalizeHeader(value)])) }, null, 2));
    return;
  }
  const user = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!user) throw new Error(`Usu�rio ${userEmail} n�o encontrado. Entre no MEG online uma vez antes da importa��o.`);

  const batch = await prisma.importBatch.upsert({
    where: { userId_fileHash: { userId: user.id, fileHash } },
    update: { rowCount: rows.length, status: 'processing', sourceEncoding: encoding },
    create: { userId: user.id, fileName: path.basename(filePath), fileHash, rowCount: rows.length, sourceEncoding: encoding }
  });

  if (replaceExisting) {
    const imported = await prisma.importedRow.findMany({ where: { batchId: batch.id, eventId: { not: null } }, select: { eventId: true } });
    const eventIds = imported.flatMap((item) => item.eventId ? [item.eventId] : []);
    await prisma.$transaction(async (tx) => {
      if (eventIds.length) {
        await tx.ledgerEntry.deleteMany({ where: { eventId: { in: eventIds } } });
        await tx.importedRow.deleteMany({ where: { batchId: batch.id } });
        await tx.financialEvent.deleteMany({ where: { id: { in: eventIds }, userId: user.id } });
      } else {
        await tx.importedRow.deleteMany({ where: { batchId: batch.id } });
      }
    });
  }

  const duplicateMap = new Map<string, number>();
  const categoryCache = new Map<string, string>();
  const paymentCache = new Map<string, string>();

  for (let index = 0; index < rows.length; index += 1) {
    const rowNumber = index + 2;
    const row = rows[index];
    const existing = await prisma.importedRow.findUnique({ where: { batchId_rowNumber: { batchId: batch.id, rowNumber } } });
    if (existing) continue;

    const fingerprint = createHash('sha256').update(JSON.stringify(row)).digest('hex');
    const duplicateOfRow = duplicateMap.get(fingerprint);
    if (!duplicateOfRow) duplicateMap.set(fingerprint, rowNumber);

    const income = decimal(read(row, 'income'));
    const expense = decimal(read(row, 'expense'));
    const rawData = row as Prisma.InputJsonValue;

    if ((income === null && expense === null) || (income !== null && expense !== null)) {
      await prisma.importedRow.create({ data: { batchId: batch.id, rowNumber, status: 'issue', issueCode: 'INVALID_AMOUNT_COLUMNS', duplicateOfRow, rawData } });
      continue;
    }

    let date: Date;
    try { date = excelDate(read(row, 'date')); }
    catch {
      await prisma.importedRow.create({ data: { batchId: batch.id, rowNumber, status: 'issue', issueCode: 'INVALID_DATE', duplicateOfRow, rawData } });
      continue;
    }

    const isRefund = expense !== null && expense < 0;
    const type = income !== null ? 'income' : 'expense';
    const rawAmount = income ?? expense ?? 0;
    const amount = rawAmount;
    const signedAmount = type === 'income' ? amount : -amount;
    const situation = (read(row, 'situation')).toUpperCase();
    const today = new Date();
    const status = situation === 'PAGO' ? 'paid' : situation === 'PENDENTE' ? 'planned' : date <= today ? 'paid' : 'planned';

    let categoryId: string | undefined;
    {
      const categoryName = type === 'income' ? 'Receitas' : read(row, 'group') || 'Sem categoria';
      const categoryGroup = read(row, 'expenseClass') || (type === 'income' ? 'Receitas' : 'Despesas');
      const cacheKey = `${categoryGroup}|${categoryName}`;
      categoryId = categoryCache.get(cacheKey);
      if (!categoryId) {
        const category = await prisma.category.findFirst({ where: { name: categoryName, group: categoryGroup, type } })
          ?? await prisma.category.create({ data: { name: categoryName, group: categoryGroup, type } });
        categoryId = category.id; categoryCache.set(cacheKey, category.id);
      }
    }

    let paymentMethodId: string | undefined;
    const paymentName = read(row, 'payment');
    if (paymentName) {
      paymentMethodId = paymentCache.get(paymentName);
      if (!paymentMethodId) {
        const method = await prisma.paymentMethod.findUnique({ where: { name: paymentName } })
          ?? await prisma.paymentMethod.create({ data: { name: paymentName, type: paymentType(paymentName) } });
        paymentMethodId = method.id; paymentCache.set(paymentName, method.id);
      }
    }

    const description = read(row, 'description').trim();
    if (!description) {
      await prisma.importedRow.create({ data: { batchId: batch.id, rowNumber, status: 'issue', issueCode: 'MISSING_DESCRIPTION', duplicateOfRow, rawData } });
      continue;
    }
    const sourceNotes = read(row, 'notes');
    const modality = read(row, 'modality');
    const notes = [isRefund ? 'Estorno/reembolso importado' : '', modality && modality !== '-' ? `Modalidade: ${modality}` : '', sourceNotes].filter(Boolean).join(' | ') || undefined;

    await prisma.$transaction(async (tx) => {
      const event = await tx.financialEvent.create({ data: {
        userId: user.id, description, type, status, date,
        competence: date.toISOString().slice(0, 7), amount, signedAmount, categoryId, paymentMethodId, notes
      } });
      await tx.importedRow.create({ data: { batchId: batch.id, rowNumber, eventId: event.id, status: duplicateOfRow ? 'imported_duplicate' : 'imported', duplicateOfRow, rawData } });
    });
  }

  const importedCount = await prisma.importedRow.count({ where: { batchId: batch.id, status: { startsWith: 'imported' } } });
  const issueCount = await prisma.importedRow.count({ where: { batchId: batch.id, status: 'issue' } });
  await prisma.importBatch.update({ where: { id: batch.id }, data: { importedCount, issueCount, status: issueCount ? 'completed_with_issues' : 'completed', completedAt: new Date() } });
  await prisma.auditLog.create({ data: { userId: user.id, entity: 'ImportBatch', entityId: batch.id, action: 'IMPORT_BASEMEGFINAN', metadata: JSON.stringify({ fileName: path.basename(filePath), fileHash, rowCount: rows.length, importedCount, issueCount }) } });
  console.log(JSON.stringify({ batchId: batch.id, rows: rows.length, imported: importedCount, issues: issueCount }, null, 2));
}

main().finally(() => prisma.$disconnect());
