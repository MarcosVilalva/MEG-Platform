import { createMegDataSource, mergeMegDataSource } from './data.js';

const asArray = (value) => Array.isArray(value) ? value : [];
const isoDay = (value) => value ? String(value).slice(0, 10) : null;
const number = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Adapta respostas já calculadas pela API para a fonte única da Web.
 * Nenhuma regra financeira é recalculada aqui.
 */
export function fromFinanceCatalogs(payload = {}) {
  return createMegDataSource({
    meta: { mode: 'api', sources: ['finance-catalogs'] },
    accounts: asArray(payload.accounts).map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      institution: item.institution ?? null,
      openingBalance: number(item.openingBalance),
      isActive: item.isActive !== false,
      updatedAt: item.updatedAt ?? null,
    })),
    categories: asArray(payload.categories).map((item) => ({
      id: item.id,
      name: item.name,
      group: item.group ?? null,
      type: item.type ?? null,
      isActive: item.isActive !== false,
      updatedAt: item.updatedAt ?? null,
    })),
    paymentMethods: asArray(payload.paymentMethods).map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type ?? null,
      isActive: item.isActive !== false,
      updatedAt: item.updatedAt ?? null,
    })),
  });
}

export function fromFinancialEvents(payload = {}) {
  const items = asArray(payload.items ?? payload);
  const transactions = items.map((item) => ({
    id: item.id,
    description: item.description,
    type: item.type,
    status: item.status,
    date: isoDay(item.date),
    competence: item.competence ?? null,
    amount: number(item.amount),
    signedAmount: number(item.signedAmount),
    accountId: item.accountId ?? item.account?.id ?? null,
    categoryId: item.categoryId ?? item.category?.id ?? null,
    paymentMethodId: item.paymentMethodId ?? item.paymentMethod?.id ?? null,
    notes: item.notes ?? null,
    classification: item.sourceDetails?.expenseClass ?? null,
    sourceDetails: item.sourceDetails ?? null,
    sourcePayload: item.sourcePayload ?? null,
    updatedAt: item.updatedAt ?? null,
  }));

  const transferGroups = new Map();
  for (const item of transactions) {
    if (item.type !== 'transfer' || !item.sourcePayload || typeof item.sourcePayload !== 'object') continue;
    const transferId = item.sourcePayload.transferId;
    const leg = item.sourcePayload.transferLeg;
    if (!transferId || !['source', 'destination'].includes(leg)) continue;
    const group = transferGroups.get(transferId) ?? { id: transferId, source: null, destination: null };
    group[leg] = item;
    transferGroups.set(transferId, group);
  }

  const transfers = [...transferGroups.values()]
    .filter((group) => group.source && group.destination)
    .map((group) => ({
      id: group.id,
      fromAccountId: group.source.accountId,
      toAccountId: group.destination.accountId,
      amount: Math.abs(group.source.signedAmount),
      date: group.source.date,
      status: group.source.status,
      description: group.source.description,
      sourceEventId: group.source.id,
      destinationEventId: group.destination.id,
    }));

  return createMegDataSource({
    meta: { mode: 'api', sources: ['finance-events'] },
    transactions,
    transfers,
  });
}

export function fromPayables(payload = []) {
  return createMegDataSource({
    meta: { mode: 'api', sources: ['payables'] },
    payables: asArray(payload).map((item) => ({
      id: item.id,
      description: item.description,
      totalAmount: number(item.totalAmount),
      openAmount: number(item.openAmount),
      dueDate: isoDay(item.dueDate),
      status: item.status,
      installmentNo: item.installmentNo ?? 1,
      installmentQty: item.installmentQty ?? 1,
      recurrenceId: item.recurrenceId ?? null,
      categoryId: item.categoryId ?? item.category?.id ?? null,
      notes: item.notes ?? null,
      payments: asArray(item.payments).map((payment) => ({
        ...payment,
        amount: number(payment.amount),
        interestAmount: number(payment.interestAmount),
        fineAmount: number(payment.fineAmount),
        paidAt: isoDay(payment.paidAt),
      })),
    })),
  });
}

export function fromCards(payload = []) {
  const cards = [];
  const installments = [];
  const statements = [];
  const statementIds = new Set();

  const ensureStatement = (cardId, month, value = {}) => {
    if (!month) return null;
    const id = `${cardId}:${month}`;
    if (!statementIds.has(id)) {
      statements.push({ id, cardId, month, ...value });
      statementIds.add(id);
    }
    return id;
  };

  for (const card of asArray(payload)) {
    cards.push({
      id: card.id,
      name: card.name,
      issuer: card.issuer ?? null,
      brand: card.brand ?? null,
      lastFour: card.lastFour ?? null,
      creditLimit: number(card.creditLimit),
      closingDay: card.closingDay,
      dueDay: card.dueDay,
      color: card.color ?? null,
      isActive: card.isActive !== false,
      usedLimit: number(card.usedLimit),
      availableLimit: number(card.availableLimit),
      statementAmount: number(card.statementAmount),
      payableStatementAmount: number(card.payableStatementAmount),
      statementCreditBalance: number(card.statementCreditBalance),
    });

    if (card.statement?.month) ensureStatement(card.id, card.statement.month, card.statement);

    for (const purchase of asArray(card.purchases)) {
      for (const entry of asArray(purchase.entries)) {
        installments.push({
          id: entry.id,
          cardId: card.id,
          transactionId: null,
          purchaseId: purchase.id,
          statementId: ensureStatement(card.id, entry.statementMonth),
          number: entry.number,
          amount: number(entry.amount),
          partialPaidAmount: number(entry.partialPaidAmount),
          statementMonth: entry.statementMonth ?? null,
          status: entry.status,
          paidAt: isoDay(entry.paidAt),
          description: purchase.description,
          purchaseDate: isoDay(purchase.purchaseDate),
          categoryId: purchase.categoryId ?? purchase.category?.id ?? null,
        });
      }
    }
  }

  return createMegDataSource({
    meta: { mode: 'api', sources: ['cards'] },
    cards,
    installments,
    statements,
  });
}

export function fromCanonicalReadModels(payload = {}) {
  return createMegDataSource({
    meta: {
      mode: 'api',
      month: payload.summary?.month ?? payload.cashflow?.month ?? payload.analytics?.month ?? payload.benefitSummary?.month ?? null,
      sources: ['canonical-read-models'],
    },
    readModels: {
      summary: payload.summary ?? null,
      cashflow: payload.cashflow ?? null,
      analytics: payload.analytics ?? null,
      benefitSummary: payload.benefitSummary ?? null,
    },
  });
}

export function fromSyncStatus(payload = {}) {
  return createMegDataSource({
    meta: {
      mode: 'api',
      syncToken: payload.token ?? null,
      changedAt: payload.changedAt ?? null,
      sources: ['sync-status'],
    },
  });
}

export function composeMegApiSnapshot(parts = []) {
  return parts.reduce((source, patch) => mergeMegDataSource(source, patch), createMegDataSource({ meta: { mode: 'api' } }));
}
