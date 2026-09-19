import type { CreditCard } from '../../app/cards-client';
import type { Category, FinancialEvent, FinancialEventStatus } from '../../app/finance-client';

type ProjectedFinancialEvent = FinancialEvent & {
  sourcePayload: Record<string, unknown>;
};

function monthPlus(month: string, offset: number) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber - 1 + offset, 1)).toISOString().slice(0, 7);
}

function validDayInMonth(month: string, day: number) {
  const [year, monthNumber] = month.split('-').map(Number);
  const last = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return Math.min(Math.max(1, day), last);
}

function dueDateForStatement(card: CreditCard, statementMonth: string) {
  const dueMonth = monthPlus(statementMonth, card.dueDay <= card.closingDay ? 1 : 0);
  return `${dueMonth}-${String(validDayInMonth(dueMonth, card.dueDay)).padStart(2, '0')}`;
}

function statementLabel(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  return `${String(monthNumber).padStart(2, '0')}/${year}`;
}

function statusForInstallment(value: string): FinancialEventStatus {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'paid') return 'paid';
  if (normalized === 'cancelled' || normalized === 'canceled' || normalized === 'archived') return 'archived';
  return 'planned';
}

function weekday(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' })
    .format(new Date(`${value.slice(0, 10)}T12:00:00Z`))
    .replace('.', '');
}

/**
 * Projeção somente de leitura para a grade de Lançamentos.
 *
 * Compras em cartão pertencem ao domínio de cartões/faturas e, por isso, não
 * criam uma despesa monetária comum no momento da compra. Cada parcela é
 * projetada como uma linha visual no mês da fatura, preservando data da compra,
 * vencimento, cartão, parcela e modalidade CRÉDITO.
 *
 * O account.type="benefit" abaixo é apenas o sentinela já reconhecido pela
 * tela V15 para excluir movimentos não monetários dos KPIs de caixa. Nada desta
 * projeção é persistido de volta no domínio financeiro.
 */
export function projectCardInstallmentsIntoEvents(
  cards: CreditCard[],
  categories: Category[],
  month: string,
): FinancialEvent[] {
  const projected: ProjectedFinancialEvent[] = [];

  for (const card of cards) {
    for (const purchase of card.purchases || []) {
      if (String(purchase.id || '').startsWith('legacy-')) continue;
      if (String(purchase.status || '').toLowerCase() === 'cancelled') continue;

      const purchaseDate = String(purchase.purchaseDate || '').slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate)) continue;

      const category = purchase.category?.id
        ? categories.find((item) => item.id === purchase.category?.id) || null
        : null;

      for (const entry of purchase.entries || []) {
        if (entry.statementMonth !== month) continue;
        const status = statusForInstallment(entry.status);
        if (status === 'archived') continue;

        const installmentNumber = Number(entry.number || 1);
        const installmentCount = Math.max(1, Number(purchase.installments || 1));
        const statementEffect = Number(entry.amount || 0);
        if (!Number.isFinite(statementEffect) || statementEffect === 0) continue;
        const amount = Math.abs(statementEffect);

        const dueDate = dueDateForStatement(card, entry.statementMonth);
        const installmentLabel = `${installmentNumber}/${installmentCount}`;
        const faturaLabel = `Fatura ${statementLabel(entry.statementMonth)}`;
        const paymentLabel = `${card.name} · ${faturaLabel}`;
        const description = installmentCount > 1
          ? `${purchase.description} · ${installmentLabel}`
          : purchase.description;
        const situation = status === 'paid' ? 'Pago' : 'Pendente';
        const observations = `Domínio de cartões/faturas · ${faturaLabel} · Parcela ${installmentLabel}`;
        const virtualScopeId = `card:${card.id}`;

        projected.push({
          id: `card-installment:${entry.id}`,
          legacyTransactionId: null,
          description,
          type: 'expense',
          status,
          date: `${dueDate}T12:00:00.000Z`,
          competence: entry.statementMonth,
          amount,
          signedAmount: -statementEffect,
          notes: observations,
          accountId: null,
          categoryId: category?.id || purchase.category?.id || null,
          paymentMethodId: null,
          account: {
            id: virtualScopeId,
            name: card.name,
            type: 'benefit',
            openingBalance: 0,
            isActive: card.isActive,
          },
          category: category || (purchase.category ? {
            id: purchase.category.id,
            name: purchase.category.name,
            group: null,
            type: 'expense',
            isActive: true,
          } : null),
          paymentMethod: {
            id: virtualScopeId,
            name: paymentLabel,
            type: 'credit',
            isActive: true,
          },
          sourceRowNumber: null,
          sourceDetails: {
            weekday: weekday(purchaseDate),
            launchType: 'DESPESA',
            expenseClass: category?.group || '',
            group: category?.name || purchase.category?.name || '',
            paymentMethod: paymentLabel,
            situation,
            modality: 'CRÉDITO',
            observations,
            statementEffect,
            statementLineKind: statementEffect < 0 ? 'credit' : 'charge',
          },
          sourcePayload: {
            cardDomain: true,
            nonMonetary: true,
            cardId: card.id,
            cardName: card.name,
            purchaseId: purchase.id,
            installmentId: entry.id,
            installmentNumber,
            installmentCount,
            statementMonth: entry.statementMonth,
            purchaseDate,
            dueDate,
            modality: 'CRÉDITO',
            paymentMethod: paymentLabel,
            situation,
            observations,
          },
        });
      }
    }
  }

  return projected.sort((left, right) => String(right.date).localeCompare(String(left.date)));
}
