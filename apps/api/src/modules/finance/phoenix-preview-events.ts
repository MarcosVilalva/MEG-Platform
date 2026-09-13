import { prisma } from '@meg/database';

function normalizeText(value: unknown) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
}

function sourceDetails(rawData: unknown) {
  if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) return null;
  const values = new Map(
    Object.entries(rawData as Record<string, unknown>)
      .map(([key, value]) => [normalizeText(key).replace(/[^A-Z0-9]/g, ''), value])
  );
  const read = (key: string) => String(values.get(key) ?? '').trim();
  return {
    weekday: read('DIASEMANA'),
    launchType: read('TPLANCAMENTO'),
    expenseClass: read('CLASSIFICAODADESPESA'),
    group: read('GRUPO'),
    paymentMethod: read('FORMADEPAGAMENTO'),
    situation: read('SITUACAO'),
    modality: read('MODADLIDADE'),
    observations: read('OBSERVACOES'),
  };
}

function startOfDay(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function dayAfter(value: string) {
  const date = startOfDay(value);
  date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

/**
 * Leitura somente leitura para o seletor global da Phoenix.
 * Evita dezenas de páginas HTTP ao consultar "Tudo" e permite intervalos reais
 * sem recalcular snapshots financeiros mensais que não são usados pela grade.
 */
export async function listPhoenixPreviewEvents(
  userId: string,
  input: { from?: string; to?: string }
) {
  const date = input.from || input.to
    ? {
        ...(input.from ? { gte: startOfDay(input.from) } : {}),
        ...(input.to ? { lt: dayAfter(input.to) } : {}),
      }
    : undefined;

  const items = await prisma.financialEvent.findMany({
    where: {
      userId,
      archivedAt: null,
      ...(date ? { date } : {}),
    },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    include: {
      account: true,
      category: true,
      paymentMethod: true,
      importedRow: { select: { rowNumber: true, rawData: true } },
    },
  });

  const mapped = items.map((item) => ({
    ...item,
    sourceRowNumber: item.importedRow?.rowNumber ?? null,
    sourceDetails: sourceDetails(item.importedRow?.rawData),
    importedRow: undefined,
  }));

  return {
    items: mapped,
    total: mapped.length,
    page: 1,
    pageSize: mapped.length,
  };
}
