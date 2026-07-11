import { prisma } from '@meg/database';

type RawRow = Record<string, unknown>;
const HEADERS = {
  date: 'DATA', type: 'TPLANCAMENTO', description: 'DESCRICAO', income: 'RECEITA',
  expenseClass: 'CLASSIFICAODADESPESA', group: 'GRUPO', expense: 'DESPESAR',
  payment: 'FORMADEPAGAMENTO', situation: 'SITUACAO', modality: 'MODADLIDADE', notes: 'OBSERVACOES'
} as const;
function normalizeKey(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
function fields(raw: RawRow) {
  const entries = Object.entries(raw);
  const values = new Map(entries.map(([key, value]) => [normalizeKey(key), value]));
  // A primeira importação foi feita com alguns cabeçalhos danificados. A ordem
  // é a do arquivo oficial e serve apenas como recuperação quando a chave não
  // pode ser reconhecida pelo nome.
  const positions: Partial<Record<keyof typeof HEADERS, number>> = {
    date: 0, type: 2, description: 3, income: 4, expenseClass: 5,
    group: 6, expense: 7, payment: 8, situation: 9, modality: 10, notes: 11
  };
  for (const [field, index] of Object.entries(positions) as Array<[keyof typeof HEADERS, number]>) {
    if (!values.has(HEADERS[field]) && entries[index]) values.set(HEADERS[field], entries[index][1]);
  }
  return values;
}
function text(values: Map<string, unknown>, key: keyof typeof HEADERS) { const value = values.get(HEADERS[key]); return value == null ? '' : String(value).trim(); }
function decimal(value: string) { const normalized = value.replace(/\./g, '').replace(',', '.'); if (!normalized) return null; const number = Number(normalized); return Number.isFinite(number) ? number : null; }
function excelDate(value: string) { const serial = Number(value.replace(',', '.')); if (!Number.isFinite(serial)) throw new Error('INVALID_DATE'); return new Date(Date.UTC(1899, 11, 30) + serial * 86_400_000); }
function normalize(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase(); }

export function parseImportedRawRow(rawData: unknown) {
  if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) throw new Error('INVALID_RAW_DATA');
  const values = fields(rawData as RawRow);
  const missing = (['date', 'description', 'income', 'expense', 'situation'] as const).filter((key) => !values.has(HEADERS[key]));
  if (missing.length) throw new Error(`INVALID_RAW_COLUMNS: ${missing.join(',')}`);
  const description = text(values, 'description');
  const income = decimal(text(values, 'income'));
  const expense = decimal(text(values, 'expense'));
  if (!description) throw new Error('MISSING_DESCRIPTION');
  if ((income === null && expense === null) || (income !== null && expense !== null)) throw new Error('INVALID_AMOUNT_COLUMNS');
  const rawExpense = expense ?? 0;
  const isRefund = income === null && rawExpense < 0;
  const type = income !== null ? 'income' : 'expense';
  // Estornos permanecem despesas negativas. Isso preserva os totais e os
  // agrupamentos da base original, em vez de inflar artificialmente receitas.
  const amount = income ?? rawExpense;
  const date = excelDate(text(values, 'date'));
  const situation = normalize(text(values, 'situation'));
  const status = situation === 'PAGO' ? 'paid' : situation === 'PENDENTE' ? 'planned' : date <= new Date() ? 'paid' : 'planned';
  return {
    description,
    type,
    status,
    date,
    competence: date.toISOString().slice(0, 7),
    amount,
    signedAmount: type === 'income' ? amount : -amount,
    categoryName: type === 'income' ? 'Receitas' : text(values, 'group') || 'Sem categoria',
    categoryGroup: text(values, 'expenseClass') || (type === 'income' ? 'Receitas' : 'Despesas'),
    expenseClass: text(values, 'expenseClass'),
    group: text(values, 'group'),
    paymentName: text(values, 'payment'),
    situation: text(values, 'situation'),
    modality: text(values, 'modality'),
    notes: text(values, 'notes'),
    isRefund
  };
}

export async function repairLegacyImportedEvents() {
  const rows = await prisma.importedRow.findMany({
    // Reprocessar todas as linhas importadas torna a correção idempotente e
    // também recupera categoria e forma de pagamento de eventos já renomeados.
    where: { eventId: { not: null } },
    select: { id: true, rawData: true, eventId: true }
  });
  if (!rows.length) return { scanned: 0, repaired: 0, issues: 0 };

  const categoryCache = new Map<string, string>();
  const paymentCache = new Map<string, string>();
  let repaired = 0;
  let issues = 0;
  const prepared: Array<{ eventId: string; data: ReturnType<typeof parseImportedRawRow>; categoryId?: string; paymentMethodId?: string }> = [];

  for (const row of rows) {
    if (!row.eventId) continue;
    try {
      const data = parseImportedRawRow(row.rawData);
      let categoryId: string | undefined;
      {
        const key = `${data.categoryGroup}|${data.categoryName}`;
        categoryId = categoryCache.get(key);
        if (!categoryId) {
          const category = await prisma.category.findFirst({ where: { name: data.categoryName, group: data.categoryGroup, type: data.type } })
            ?? await prisma.category.create({ data: { name: data.categoryName, group: data.categoryGroup, type: data.type } });
          categoryId = category.id;
          categoryCache.set(key, category.id);
        }
      }
      let paymentMethodId: string | undefined;
      if (data.paymentName && normalize(data.paymentName) !== 'NAO INFORMADO') {
        paymentMethodId = paymentCache.get(data.paymentName);
        if (!paymentMethodId) {
          const payment = await prisma.paymentMethod.findUnique({ where: { name: data.paymentName } })
            ?? await prisma.paymentMethod.create({ data: { name: data.paymentName, type: 'other' } });
          paymentMethodId = payment.id;
          paymentCache.set(data.paymentName, payment.id);
        }
      }
      prepared.push({ eventId: row.eventId, data, categoryId, paymentMethodId });
    } catch {
      issues += 1;
    }
  }

  for (let index = 0; index < prepared.length; index += 40) {
    const batch = prepared.slice(index, index + 40);
    await Promise.all(batch.map(({ eventId, data, categoryId, paymentMethodId }) => prisma.financialEvent.update({
      where: { id: eventId },
      data: {
        description: data.description,
        type: data.type,
        status: data.status,
        date: data.date,
        competence: data.competence,
        amount: data.amount,
        signedAmount: data.signedAmount,
        categoryId,
        paymentMethodId: paymentMethodId ?? null,
        notes: [
          data.isRefund ? 'Estorno/reembolso importado' : '',
          data.modality && data.modality !== '-' ? `Modalidade: ${data.modality}` : '',
          data.notes
        ].filter(Boolean).join(' | ') || null
      }
    })));
    repaired += batch.length;
  }

  if (rows.length > 0 && repaired === 0) {
    throw new Error(`IMPORT_REPAIR_ABORTED: ${issues} de ${rows.length} linhas não puderam ser interpretadas.`);
  }
  return { scanned: rows.length, repaired, issues };
}
