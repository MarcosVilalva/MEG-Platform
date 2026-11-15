/**
 * MEG Etapa 09 | Concurrent settlement regression against EPHEMERAL PG17.
 *
 * No production or WSL restore access. Synthetic values and identifiers only.
 * Uses canonical payables and card writers, not shadow financial calculations.
 */
import assert from 'node:assert/strict';
import { Prisma, UserRole, UserStatus, prisma } from '@meg/database';
import { createFinancialEventProtected } from './event-mutation';
import { createPayablesProtected } from '../payables/create-service';
import { payPayableProtected } from '../payables/service';
import { createCardPurchaseProtected, payCardStatementProtected } from '../cards/service';
import { monetaryAccountBalanceAt, serializableFinancialTransaction } from './monetary-protection';

function guardDisposable() {
  assert.equal(process.env.CI, 'true');
  assert.equal(process.env.MEG_STAGE09_SYNTHETIC_ONLY, 'YES');
  assert.equal(
    process.env.DATABASE_URL,
    'postgresql://ci:ci@127.0.0.1:5432/meg_stage09_synthetic?schema=public',
    'Conexao permitida exclusivamente ao PostgreSQL 17 descartavel de CI.'
  );
}

type Outcome = PromiseSettledResult<unknown>;
const toNumber = (value: unknown) => Number(value);
const currency = (value: unknown) => Math.round(Number(value) * 100) / 100;

function shape(value: unknown): Record<string, unknown> {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value));
  return value as Record<string, unknown>;
}

function verifySingleWinner(outcomes: Outcome[], label: string) {
  const success = outcomes.filter((outcome): outcome is PromiseFulfilledResult<unknown> => outcome.status === 'fulfilled');
  const failed = outcomes.filter((outcome): outcome is PromiseRejectedResult => outcome.status === 'rejected');
  assert.equal(success.length, 1, `${label}: apenas uma operacao pode confirmar.`);
  assert.equal(failed.length, 1, `${label}: outra operacao precisa ser recusada.`);
  const failure = failed[0].reason;
  assert.ok(failure && typeof failure === 'object' && 'code' in failure,
    `${label}: rejeicao deve ser erro financeiro ou conflito serializavel conhecido.`);
  const permitted = new Set([
    'PAYABLE_NOT_FOUND', 'AMOUNT_EXCEEDS_OPEN_BALANCE',
    'EMPTY_STATEMENT', 'AMOUNT_EXCEEDS_OPEN_STATEMENT',
    'CARD_STATEMENT_NOT_PAYABLE', 'INSUFFICIENT_MONETARY_BALANCE',
    'STATEMENT_CHANGED_RETRY', 'P2034',
  ]);
  assert.ok(permitted.has((failure as { code: string }).code),
    `${label}: codigo de rejeicao nao previsto no contrato.`);
}

async function main() {
  guardDisposable(); // Antes de QUALQUER consulta Prisma.
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const user = await prisma.user.create({
    data: {
      name: 'Ficticio Concurrent Stage09',
      email: `stage09-concurrent-${suffix}@example.invalid`,
      passwordHash: 'TEST_ONLY',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      isActive: true,
      approvedAt: new Date(),
    },
  });
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Synthetic Race Isolation',
      slug: `stage09-races-${suffix}`,
      ownerId: user.id,
      members: {
        create: { userId: user.id, role: UserRole.ADMIN, status: UserStatus.ACTIVE, isActive: true },
      },
      appState: {
        create: {
          userId: user.id,
          state: { transactions: [], budgets: {} } as Prisma.InputJsonValue,
          revision: 1,
        },
      },
    },
  });
  const [payAccount, cardAccount, sharedAccount, method, cardForRace, cardForShared] = await Promise.all([
    prisma.account.create({ data: { userId: user.id, name: 'Ficticia P', type: 'CHECKING', openingBalance: 0 } }),
    prisma.account.create({ data: { userId: user.id, name: 'Ficticia C', type: 'CHECKING', openingBalance: 0 } }),
    prisma.account.create({ data: { userId: user.id, name: 'Ficticia S', type: 'CHECKING', openingBalance: 0 } }),
    prisma.paymentMethod.create({ data: { userId: user.id, name: 'PIX Ficticio', type: 'instant' } }),
    prisma.creditCard.create({ data: { userId: user.id, name: `Card Race ${suffix}`, closingDay: 10, dueDay: 18, creditLimit: 300 } }),
    prisma.creditCard.create({ data: { userId: user.id, name: `Card Shared ${suffix}`, closingDay: 10, dueDay: 18, creditLimit: 300 } }),
  ]);
  const paidAt = '2026-11-11';
  const incomeDate = '2026-11-10T12:00:00.000Z';
  const funding = [
    { account: payAccount, value: 200 },
    { account: cardAccount, value: 200 },
    { account: sharedAccount, value: 100 },
  ];
  for (const [index, item] of funding.entries()) {
    const income = shape(await createFinancialEventProtected(user.id, {
      description: `Receita Ficticia ${index}`,
      type: 'income', status: 'paid', date: incomeDate, amount: item.value,
      accountId: item.account.id, operationId: `stage09-race-fund-${index}-${suffix}`,
    }));
    assert.equal(toNumber(income.signedAmount), item.value);
  }

  // Cenario 1: duas baixas distintas de 80, para o MESMO titulo de 100.
  const samePayable = shape(await createPayablesProtected(user.id, {
    description: 'Titulo Ficticio Concorrente', totalAmount: 100,
    dueDate: '2026-09-10', installmentQty: 1,
    operationId: `stage09-race-payable-create-${suffix}`,
  }));
  const firstPayableId = (samePayable.ids as string[])[0];
  const payableOperationIds = [`stage09-race-payable-a-${suffix}`, `stage09-race-payable-b-${suffix}`];
  const payableResults = await Promise.allSettled(payableOperationIds.map(operationId =>
    payPayableProtected(user.id, firstPayableId, {
      amount: 80, interestAmount: 0, fineAmount: 0, paidAt,
      accountId: payAccount.id, paymentMethodId: method.id, operationId,
    })
  ));
  verifySingleWinner(payableResults, 'PAYABLE_SAME_TITLE');
  const payableSaved = await prisma.payable.findUniqueOrThrow({ where: { id: firstPayableId } });
  assert.equal(currency(payableSaved.openAmount), 20);
  assert.equal(payableSaved.status, 'partial');
  const payablePayments = await prisma.payablePayment.findMany({
    where: { payableId: firstPayableId }, include: { financialEvent: { include: { ledgerEntries: true } } },
  });
  assert.equal(payablePayments.length, 1);
  assert.equal(currency(payablePayments[0].amount), 80);
  assert.equal(currency(payablePayments[0].financialEvent?.signedAmount), -80);
  assert.equal(payablePayments[0].financialEvent?.ledgerEntries.length, 1);
  assert.equal(currency(payablePayments[0].financialEvent?.ledgerEntries[0].credit), 80);
  assert.equal(await prisma.cloudMutationReceipt.count({
    where: { workspaceId: workspace.id, operationId: { in: payableOperationIds } },
  }), 1);
  assert.equal(await prisma.auditLog.count({
    where: { userId: user.id, entity: 'Payable', action: 'PAYABLE_PAYMENT_CREATED' },
  }), 1);
  assert.equal(await serializableFinancialTransaction(tx => monetaryAccountBalanceAt(tx, user.id, payAccount, paidAt)), 120);

  // Cenario 2: mesma fatura, dois pagamentos de 80 para total aberto de 100.
  const purchase = shape(await createCardPurchaseProtected(user.id, {
    cardId: cardForRace.id, description: 'Compra Race Ficticia', totalAmount: 100,
    purchaseDate: '2026-10-05', installments: 1,
    operationId: `stage09-race-card-purchase-${suffix}`,
  }));
  const purchaseId = purchase.id as string;
  const cardOperationIds = [`stage09-race-card-a-${suffix}`, `stage09-race-card-b-${suffix}`];
  const cardResults = await Promise.allSettled(cardOperationIds.map(operationId =>
    payCardStatementProtected(user.id, cardForRace.id, '2026-10', {
      paidAt, amount: 80, accountId: cardAccount.id, paymentMethodId: method.id,
      operationId,
    })
  ));
  verifySingleWinner(cardResults, 'CARD_SAME_STATEMENT');
  const [cardInstallment] = await prisma.cardInstallment.findMany({
    where: { purchaseId },
  });
  assert.ok(cardInstallment);
  assert.equal(cardInstallment.status, 'open');
  assert.equal(currency(cardInstallment.partialPaidAmount), 80);
  const cardEvents = await prisma.financialEvent.findMany({
    where: { workspaceId: workspace.id, description: `Fatura ${cardForRace.name} 2026-10` },
    include: { ledgerEntries: true },
  });
  assert.equal(cardEvents.length, 1);
  assert.equal(currency(cardEvents[0].signedAmount), -80);
  assert.equal(cardEvents[0].ledgerEntries.length, 1);
  assert.equal(currency(cardEvents[0].ledgerEntries[0].credit), 80);
  assert.equal(await prisma.cloudMutationReceipt.count({
    where: { workspaceId: workspace.id, operationId: { in: cardOperationIds } },
  }), 1);
  assert.equal(await prisma.auditLog.count({
    where: { userId: user.id, entity: 'CreditCard', action: 'CARD_STATEMENT_PAID' },
  }), 1);
  assert.equal(await serializableFinancialTransaction(tx => monetaryAccountBalanceAt(tx, user.id, cardAccount, paidAt)), 120);

  // Cenario 3: contas compartilhadas em escritor DIFERENTE: titulo e fatura
  // concorrendo por saldo de 100, cada um exige 80. Apenas um deve confirmar.
  const otherPayable = shape(await createPayablesProtected(user.id, {
    description: 'Titulo Compartilhado Ficticio', totalAmount: 80,
    dueDate: '2026-09-10', installmentQty: 1,
    operationId: `stage09-race-shared-payable-create-${suffix}`,
  }));
  const sharedPayableId = (otherPayable.ids as string[])[0];
  const sharedPurchase = shape(await createCardPurchaseProtected(user.id, {
    cardId: cardForShared.id, description: 'Card Compartilhado Ficticio',
    totalAmount: 80, purchaseDate: '2026-10-05', installments: 1,
    operationId: `stage09-race-shared-card-create-${suffix}`,
  }));
  const sharedOps = [`stage09-race-shared-pay-${suffix}`, `stage09-race-shared-card-${suffix}`];
  const mixed = await Promise.allSettled([
    payPayableProtected(user.id, sharedPayableId, {
      amount: 80, interestAmount: 0, fineAmount: 0, paidAt,
      accountId: sharedAccount.id, paymentMethodId: method.id,
      operationId: sharedOps[0],
    }),
    payCardStatementProtected(user.id, cardForShared.id, '2026-10', {
      amount: 80, paidAt, accountId: sharedAccount.id, paymentMethodId: method.id,
      operationId: sharedOps[1],
    }),
  ]);
  verifySingleWinner(mixed, 'SHARED_BALANCE_CROSS_DOMAIN');
  const sharedPayableDb = await prisma.payable.findUniqueOrThrow({ where: { id: sharedPayableId } });
  const sharedCardInstallments = await prisma.cardInstallment.findMany({
    where: { purchaseId: sharedPurchase.id as string },
  });
  assert.equal(sharedCardInstallments.length, 1);
  const payablePaid = currency(sharedPayableDb.openAmount) === 0;
  const cardPaid = sharedCardInstallments[0].status === 'paid';
  assert.notEqual(payablePaid, cardPaid, 'Exatamente um dominio deve consumir o saldo compartilhado.');
  assert.equal(await prisma.cloudMutationReceipt.count({
    where: { workspaceId: workspace.id, operationId: { in: sharedOps } },
  }), 1);
  const sharedEvents = await prisma.financialEvent.findMany({
    where: { workspaceId: workspace.id, accountId: sharedAccount.id, type: 'expense', status: 'paid' },
    include: { ledgerEntries: true },
  });
  assert.equal(sharedEvents.length, 1, 'Proibido gravar dois pagamentos para saldo compartilhado insuficiente.');
  assert.equal(currency(sharedEvents[0].signedAmount), -80);
  assert.equal(sharedEvents[0].ledgerEntries.length, 1);
  assert.equal(currency(sharedEvents[0].ledgerEntries[0].credit), 80);
  assert.equal(await serializableFinancialTransaction(tx => monetaryAccountBalanceAt(tx, user.id, sharedAccount, paidAt)), 20);

  console.log('STAGE09_PG17_PAYABLE_CARD_CONCURRENCY=PASS_SYNTHETIC_ONLY');
  console.log('STAGE09_CONCURRENCY=PAYABLE_SAME_TITLE_CARD_SAME_STATEMENT_CROSS_DOMAIN_SHARED_BALANCE');
}

main()
  .catch((error) => {
    console.error('STAGE09_PG17_PAYABLE_CARD_CONCURRENCY=FAIL_SYNTHETIC_ONLY');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => { await prisma.$disconnect(); });
