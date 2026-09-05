type Transaction = Record<string, unknown>;

const ESSENTIAL_GROUPS = new Set([
  'MORADIA', 'ALIMENTACAO', 'SAUDE', 'EDUCACAO', 'TRANSPORTE', 'SEGUROS', 'IMPOSTOS', 'CONTAS GERAIS',
]);
const FLEXIBLE_GROUPS = new Set([
  'LAZER', 'ENTRETENIMENTO', 'RESTAURANTE', 'VIAGEM', 'COMPRAS', 'ESTILO DE VIDA',
]);
const FIXED_TERMS = ['ALUGUEL', 'CONDOMINIO', 'MENSALIDADE', 'ASSINATURA', 'INTERNET', 'PLANO', 'SEGURO'];
const VARIABLE_TERMS = ['ENERGIA', 'LUZ', 'AGUA', 'MERCADO', 'SUPERMERCADO', 'COMBUSTIVEL', 'RESTAURANTE'];

function normalize(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+\d+\/\d+\s*$/u, '')
    .replace(/[^A-Z0-9]+/gi, ' ')
    .trim()
    .toUpperCase();
}

function amount(item: Transaction): number {
  const type = String(item.type || '').toLowerCase();
  const value = type === 'income' ? item.incomeAmount ?? item.amount : item.expenseAmount ?? item.amount;
  const parsed = Math.abs(Number(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function coefficientOfVariation(values: number[]): number | null {
  if (values.length < 3) return null;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (!mean) return null;
  const variance = values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / values.length;
  return Math.sqrt(variance) / mean;
}

function months(items: Transaction[]): Set<string> {
  return new Set(items.map((item) => String(item.date || '').slice(0, 7)).filter((value) => /^\d{4}-\d{2}$/.test(value)));
}

export function classifyTransactionsPreview(transactions: Transaction[]) {
  const expenses = transactions.filter((item) => String(item.type || '').toLowerCase() !== 'income');
  const cohorts = new Map<string, Transaction[]>();
  for (const item of expenses) {
    const key = normalize(item.description);
    if (!key) continue;
    cohorts.set(key, [...(cohorts.get(key) || []), item]);
  }

  return expenses.map((item) => {
    const description = normalize(item.description);
    const group = normalize(item.group || item.category);
    const cohort = cohorts.get(description) || [item];
    const variation = coefficientOfVariation(cohort.map(amount).filter((value) => value > 0));
    const installment = Boolean(item.installmentSeriesId) || Number(item.installmentCount || 0) > 1;
    const explicitRecurrence = Boolean(item.recurrenceSeriesId) || normalize(item.recurrenceKind) === 'MONTHLY';
    const historicalRecurrence = months(cohort).size >= 3;
    const frequency = installment ? 'INSTALLMENT' : explicitRecurrence || historicalRecurrence ? 'RECURRING' : 'ONE_OFF';
    const fixedByTerm = FIXED_TERMS.some((term) => description.includes(term));
    const variableByTerm = VARIABLE_TERMS.some((term) => description.includes(term));
    const amountBehavior = variation != null
      ? variation <= 0.03 ? 'FIXED' : 'VARIABLE'
      : installment || fixedByTerm ? 'FIXED' : 'VARIABLE';
    const necessity = ESSENTIAL_GROUPS.has(group)
      ? 'ESSENTIAL'
      : FLEXIBLE_GROUPS.has(group) ? 'FLEXIBLE' : 'REVIEW';
    const evidence = [
      installment ? 'parcelamento identificado' : '',
      explicitRecurrence ? 'recorrência cadastrada' : '',
      historicalRecurrence ? `presente em ${months(cohort).size} meses` : '',
      variation != null ? `variação histórica de ${(variation * 100).toFixed(1)}%` : '',
      fixedByTerm ? 'descrição típica de compromisso fixo' : '',
      variableByTerm ? 'descrição típica de valor variável' : '',
      necessity !== 'REVIEW' ? `grupo ${group}` : 'necessidade exige revisão',
    ].filter(Boolean);
    const confidence = installment || explicitRecurrence || variation != null
      ? 'HIGH'
      : fixedByTerm || variableByTerm || necessity !== 'REVIEW' ? 'MEDIUM' : 'LOW';
    const reviewed = normalize(item.classificationSource) === 'USER REVIEWED';
    const reviewedAmountBehavior = ['FIXED', 'VARIABLE'].includes(String(item.amountBehavior)) ? String(item.amountBehavior) : null;
    const reviewedNecessity = ['ESSENTIAL', 'FLEXIBLE', 'REVIEW'].includes(String(item.necessity)) ? String(item.necessity) : null;
    const reviewedFrequency = ['RECURRING', 'INSTALLMENT', 'ONE_OFF'].includes(String(item.frequency)) ? String(item.frequency) : null;
    return {
      transactionId: String(item.id || ''),
      amountBehavior: reviewedAmountBehavior || (variableByTerm && variation == null ? 'VARIABLE' : amountBehavior),
      necessity: reviewedNecessity || necessity,
      frequency: reviewedFrequency || frequency,
      confidence: reviewed ? 'REVIEWED' : confidence,
      reviewed,
      evidence: reviewed ? ['classificação revisada pelo usuário'] : evidence,
    };
  });
}
