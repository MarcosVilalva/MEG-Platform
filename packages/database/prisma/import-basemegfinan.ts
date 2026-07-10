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
  date: 'DATA', type: 'TP LANÇAMENTO', description: 'DESCRIÇÃO', income: 'RECEITA($)',
  expenseClass: 'CLASSIFIÇÃO DA DESPESA', group: 'GRUPO', expense: 'DESPESA (R$)',
  payment: 'FORMA DE PAGAMENTO', situation: 'SITUAÇÃO', modality: 'MODADLIDADE', notes: 'OBSERVAÇÕES'
} as const;

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
  const normalized = name.toUpperCase();
  if (normalized.includes('PIX')) return 'instant';
  if (normalized.includes('BOLETO')) return 'bill';
  if (normalized.includes('DÉBITO') || normalized.includes('DEBITO')) return 'debit';
  if (normalized.includes('CARTÃO') || normalized.includes('CARTAO') || normalized === 'VEROCARD' || normalized === 'RIACHUELO') return 'credit';
  return 'other';
}

async function main() {
  const bytes = await readFile(filePath);
  const fileHash = createHash('sha256').update(bytes).digest('hex');
  const text = iconv.decode(bytes, 'cp850');
  const rows = parse(text, { columns: true, delimiter: ';', bom: true, skip_empty_lines: true, relax_column_count: true, trim: true }) as RawRow[];
  const user = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!user) throw new Error(`Usuário ${userEmail} não encontrado. Entre no MEG online uma vez antes da importação.`);

  const batch = await prisma.importBatch.upsert({
    where: { userId_fileHash: { userId: user.id, fileHash } },
    update: { rowCount: rows.length, status: 'processing' },
    create: { userId: user.id, fileName: path.basename(filePath), fileHash, rowCount: rows.length, sourceEncoding: 'cp850' }
  });

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

    const income = decimal(row[HEADERS.income] || '');
    const expense = decimal(row[HEADERS.expense] || '');
    const originalType = (row[HEADERS.type] || '').toUpperCase();
    const rawData = row as Prisma.InputJsonValue;

    if ((income === null && expense === null) || (income !== null && expense !== null)) {
      await prisma.importedRow.create({ data: { batchId: batch.id, rowNumber, status: 'issue', issueCode: 'INVALID_AMOUNT_COLUMNS', duplicateOfRow, rawData } });
      continue;
    }

    let date: Date;
    try { date = excelDate(row[HEADERS.date] || ''); }
    catch {
      await prisma.importedRow.create({ data: { batchId: batch.id, rowNumber, status: 'issue', issueCode: 'INVALID_DATE', duplicateOfRow, rawData } });
      continue;
    }

    const isRefund = originalType === 'DESPESA' && expense !== null && expense < 0;
    const type = originalType === 'RECEITA' || isRefund ? 'income' : 'expense';
    const rawAmount = income ?? expense ?? 0;
    const amount = Math.abs(rawAmount);
    const signedAmount = type === 'income' ? amount : -amount;
    const situation = (row[HEADERS.situation] || '').toUpperCase();
    const today = new Date();
    const status = situation === 'PAGO' ? 'paid' : situation === 'PENDENTE' ? 'planned' : date <= today ? 'paid' : 'planned';

    let categoryId: string | undefined;
    if (type === 'expense') {
      const categoryName = row[HEADERS.group] || 'Sem categoria';
      const categoryGroup = row[HEADERS.expenseClass] || 'Despesas';
      const cacheKey = `${categoryGroup}|${categoryName}`;
      categoryId = categoryCache.get(cacheKey);
      if (!categoryId) {
        const category = await prisma.category.findFirst({ where: { name: categoryName, group: categoryGroup, type: 'expense' } })
          ?? await prisma.category.create({ data: { name: categoryName, group: categoryGroup, type: 'expense' } });
        categoryId = category.id; categoryCache.set(cacheKey, category.id);
      }
    }

    let paymentMethodId: string | undefined;
    const paymentName = row[HEADERS.payment] || '';
    if (paymentName) {
      paymentMethodId = paymentCache.get(paymentName);
      if (!paymentMethodId) {
        const method = await prisma.paymentMethod.findUnique({ where: { name: paymentName } })
          ?? await prisma.paymentMethod.create({ data: { name: paymentName, type: paymentType(paymentName) } });
        paymentMethodId = method.id; paymentCache.set(paymentName, method.id);
      }
    }

    const sourceNotes = row[HEADERS.notes] || '';
    const modality = row[HEADERS.modality] || '';
    const notes = [isRefund ? 'Estorno/reembolso importado' : '', modality && modality !== '-' ? `Modalidade: ${modality}` : '', sourceNotes].filter(Boolean).join(' | ') || undefined;

    await prisma.$transaction(async (tx) => {
      const event = await tx.financialEvent.create({ data: {
        userId: user.id, description: row[HEADERS.description] || `Linha ${rowNumber}`, type, status, date,
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
