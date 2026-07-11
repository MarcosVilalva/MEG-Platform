import { prisma } from '@meg/database';

type RawRow = Record<string, unknown>;
const HEADERS = {
  date: 'DATA', type: 'TPLANCAMENTO', description: 'DESCRICAO', income: 'RECEITA',
  expenseClass: 'CLASSIFICAODADESPESA', group: 'GRUPO', expense: 'DESPESAR',
  payment: 'FORMADEPAGAMENTO', situation: 'SITUACAO'
} as const;
function normalizeKey(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
function fields(raw: RawRow) { return new Map(Object.entries(raw).map(([key, value]) => [normalizeKey(key), value])); }
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
  const type = income !== null || isRefund ? 'income' : 'expense';
  const amount = Math.abs(income ?? rawExpense);
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
    categoryName: text(values, 'group') || 'Sem categoria',
    categoryGroup: text(values, 'expenseClass') || (type === 'income' ? 'Receitas' : 'Despesas')
  };
}

export async function repairLegacyImportedEvents() {
  const rows = await prisma.importedRow.findMany({
    where: { event: { description: { startsWith: 'Linha ' } } },
    select: { id: true, rawData: true, eventId: true }
  });
  if (!rows.length) return { repaired: 0, issues: 0 };

  const categoryCache = new Map<string, string>();
  let repaired = 0;
  let issues = 0;
  const prepared: Array<{ eventId: string; data: ReturnType<typeof parseImportedRawRow>; categoryId?: string }> = [];

  for (const row of rows) {
    if (!row.eventId) continue;
    try {
      const data = parseImportedRawRow(row.rawData);
      let categoryId: string | undefined;
      if (data.type === 'expense') {
        const key = `${data.categoryGroup}|${data.categoryName}`;
        categoryId = categoryCache.get(key);
        if (!categoryId) {
          const category = await prisma.category.findFirst({ where: { name: data.categoryName, group: data.categoryGroup, type: 'expense' } })
            ?? await prisma.category.create({ data: { name: data.categoryName, group: data.categoryGroup, type: 'expense' } });
          categoryId = category.id;
          categoryCache.set(key, category.id);
        }
      }
      prepared.push({ eventId: row.eventId, data, categoryId });
    } catch {
      issues += 1;
    }
  }

  for (let index = 0; index < prepared.length; index += 40) {
    const batch = prepared.slice(index, index + 40);
    await Promise.all(batch.map(({ eventId, data, categoryId }) => prisma.financialEvent.update({
      where: { id: eventId },
      data: {
        description: data.description,
        type: data.type,
        status: data.status,
        date: data.date,
        competence: data.competence,
        amount: data.amount,
        signedAmount: data.signedAmount,
        categoryId: data.type === 'expense' ? categoryId : null
      }
    })));
    repaired += batch.length;
  }

  return { repaired, issues };
}