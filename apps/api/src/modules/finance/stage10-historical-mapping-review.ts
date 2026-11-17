import { isBenefitFinancialEvent, resolveCanonicalFinancialStatus, type CanonicalFinancialStatus } from './financial-policy';

/**
 * Etapa 10: TRIAGEM SOMENTE LEITURA de propostas de vínculo histórico.
 * Não contém UPDATE, operações de banco, aprovação ou rotina de migração.
 * Mesmo uma proposta elegível exige auditoria por ID e autorização expressa.
 */
type HistoricalCandidate = {
  event: {
    id: string;
    userId: string | null;
    description: string;
    type: string;
    status: string;
    amount: number;
    signedAmount: number;
    categoryId: string | null;
    paymentMethodId: string | null;
    archivedAt: Date | null;
    sourcePayload: unknown;
    account: { id: string; userId: string | null; type: string; isActive: boolean } | null;
    hasLedger: boolean;
    hasReceipt: boolean;
    hasPayablePayment: boolean;
    hasImportedRow: boolean;
  };
  category: {
    id: string; userId: string | null; name: string; group: string | null;
    type: string | null; isActive: boolean;
  } | null;
  paymentMethod: {
    id: string; userId: string | null; name: string; type: string | null; isActive: boolean;
  } | null;
  categoryMatchCount: number;
  paymentMatchCount: number;
};
type Classification = {
  classification: 'blocked' | 'eligible_for_explicit_review';
  reasons: string[];
  categoryId: string | null;
  paymentMethodId: string | null;
  writeAuthorized: false;
};

const low = (x: unknown) => String(x ?? '').trim().toLocaleLowerCase('pt-BR');

export function classifyStage10HistoricalLink(input: HistoricalCandidate): Classification {
  const { event: e, category: c, paymentMethod: p } = input;
  const source = e.sourcePayload && typeof e.sourcePayload === 'object' && !Array.isArray(e.sourcePayload)
    ? e.sourcePayload as Record<string, unknown> : {};
  const reasons: string[] = [];
  const cat = low(source.category);
  const grp = low(source.expenseClass);
  const method = low(source.paymentMethod);
  const modality = low(source.modality);
  const scope = low(source.financialScope);

  if (!e.id || !e.userId || e.archivedAt) reasons.push('EVENT_NOT_ACTIVE_OR_OWNED');
  if (e.categoryId || e.paymentMethodId) reasons.push('ALREADY_CANONICALLY_LINKED');
  if (!e.account || !e.account.id || !e.account.isActive || e.account.userId !== e.userId
    || !['checking','savings','cash'].includes(low(e.account.type))) {
    reasons.push('MONETARY_ACCOUNT_SCOPE_OR_STATUS_INVALID');
  }
  if (!c || !p || input.categoryMatchCount !== 1 || input.paymentMatchCount !== 1) {
    reasons.push('NO_UNAMBIGUOUS_CATALOG_MATCH');
  }
  if (c && (!c.isActive || c.userId !== e.userId || c.type !== e.type
    || low(c.name) !== cat || low(c.group) !== grp)) reasons.push('CATEGORY_SCOPE_OR_LABEL_MISMATCH');
  if (p && (!p.isActive || p.userId !== e.userId || low(p.name) !== method)) {
    reasons.push('PAYMENT_SCOPE_OR_LABEL_MISMATCH');
  }
  if (!cat || cat === 'sem categoria' || cat === 'sem classificação' || cat === 'sem classificacao'
    || !method || method === 'não informado' || method === 'nao informado') {
    reasons.push('LEGACY_SENTINEL_VALUE');
  }
  if (scope !== 'monetary' || modality !== 'à vista' || method.startsWith('cartão')
    || method.startsWith('cartao') || method === 'verocard'
    || isBenefitFinancialEvent({
      description:e.description, paymentMethod: p ? {name:p.name} : null, account:e.account,
    })) {
    reasons.push('FINANCIAL_DOMAIN_SPECIALIST_REQUIRED');
  }
  if (p && low(p.type) === 'credit') reasons.push('CREDIT_METHOD_REQUIRES_CARD_AUTHORITY');
  if (e.type !== 'expense' && e.type !== 'income') reasons.push('UNSUPPORTED_EVENT_TYPE');
  if (e.status !== 'paid' && e.status !== 'planned') reasons.push('UNSUPPORTED_HISTORICAL_STATUS');
  if (!Number.isFinite(e.amount) || e.amount <= 0 || !Number.isFinite(e.signedAmount)
    || (e.type === 'expense' && e.signedAmount >= 0)
    || (e.type === 'income' && e.signedAmount <= 0)) reasons.push('SIGNED_AMOUNT_REQUIRES_FINANCIAL_REVIEW');
  if (e.hasLedger || e.hasReceipt || e.hasPayablePayment || e.hasImportedRow) {
    reasons.push('LINKED_FINANCIAL_DOMAIN_REQUIRES_CANONICAL_WRITER');
  }
  if (c && (low(c.name) === 'fixo' || low(c.group) === 'fixo')) {
    reasons.push('FIXED_CATEGORY_STATUS_REQUIRES_REVIEW');
  }
  // Apenas compara a regra financeira existente antes/depois. Jamais recalcula
  // valores, saldos, parcelas ou faturas, nem persiste o resultado.
  if (c && p && (e.status === 'paid' || e.status === 'planned')
    && (e.type === 'expense' || e.type === 'income')) {
    const wouldResolve = resolveCanonicalFinancialStatus({
      type:e.type, requestedStatus:e.status as CanonicalFinancialStatus,
      category:c, paymentMethod:p,
    });
    if (wouldResolve !== e.status) reasons.push('CANONICAL_STATUS_WOULD_CHANGE');
  }

  return {
    classification: reasons.length === 0 ? 'eligible_for_explicit_review' : 'blocked',
    reasons,
    categoryId: reasons.length === 0 ? c?.id || null : null,
    paymentMethodId: reasons.length === 0 ? p?.id || null : null,
    writeAuthorized: false,
  };
}
