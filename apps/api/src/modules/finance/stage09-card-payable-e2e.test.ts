/**
 * Etapa 09 - Escritores de pendentes e faturas sobre PG17 FICTICIO e descartavel.
 * NUNCA executar em Supabase, banco restaurado ou dados de usuario.
 * O CI cria uma base vazia e a descarta ao terminar.
 */
import assert from 'node:assert/strict';
import { Prisma, UserRole, UserStatus, prisma } from '@meg/database';
import { createFinancialEventProtected } from './event-mutation';
import { createPayablesProtected } from '../payables/create-service';
import { payPayableProtected, PayableDomainError } from '../payables/service';
import { createCardPurchaseProtected, payCardStatementProtected, CardDomainError } from '../cards/service';

function guardSyntheticTarget() {
  assert.equal(process.env.CI, 'true');
  assert.equal(process.env.MEG_STAGE09_SYNTHETIC_ONLY, 'YES');
  assert.equal(
    process.env.DATABASE_URL,
    'postgresql://ci:ci@127.0.0.1:5432/meg_stage09_synthetic?schema=public',
    'Apenas banco CI local e descartavel pode receber writes.'
  );
}
function shape(value: unknown): Record<string, unknown> {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value));
  return value as Record<string, unknown>;
}
function code(expected: string) {
  return (error: unknown) =>
    error instanceof Error
    && 'code' in error
    && (error as { code?: string }).code === expected;
}
function number(value: unknown) { return Number(value); }
function money(value: unknown) { return Math.round(Number(value) * 100) / 100; }

async function main() {
  guardSyntheticTarget(); // Antes da primeira consulta Prisma.
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const user = await prisma.user.create({
    data: {
      name: 'MEG Etapa09 Payable Card Synthetic',
      email: `stage09-card-payable-${suffix}@example.invalid`,
      passwordHash: 'NOT_A_REAL_PASSWORD',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      isActive: true,
      approvedAt: new Date(),
    },
  });
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Etapa09 PG17 Isolado',
      slug: `stage09-pay-card-${suffix}`,
      ownerId: user.id,
      members: { create: { userId: user.id, role: UserRole.ADMIN, status: UserStatus.ACTIVE, isActive: true } },
      appState: {
        create: {
          userId: user.id,
          state: { transactions: [], budgets: {} } as Prisma.InputJsonValue,
          revision: 1,
        },
      },
    },
  });
  const [account, emptyAccount, method, creditMethod, card] = await Promise.all([
    prisma.account.create({ data: { userId: user.id, name: 'Conta ficticia', type: 'CHECKING', openingBalance: 0 } }),
    prisma.account.create({ data: { userId: user.id, name: 'Sem saldo', type: 'CASH', openingBalance: 0 } }),
    prisma.paymentMethod.create({ data: { userId: user.id, name: 'PIX sintético', type: 'instant' } }),
    prisma.paymentMethod.create({ data: { userId: user.id, name: 'Cartão sintético', type: 'credit' } }),
    prisma.creditCard.create({
      data: {
        userId: user.id, name: `Cartão Etapa09 ${suffix}`,
        creditLimit: 500, closingDay: 10, dueDay: 18,
      },
    }),
  ]);
  const paidAt = '2026-11-11';
  const fund = shape(await createFinancialEventProtected(user.id, {
    description: 'Receita ficticia para testes',
    type: 'income', status: 'paid', date: '2026-11-10T12:00:00.000Z',
    amount: 200, accountId: account.id, operationId: `fund-${suffix}`,
  }));
  assert.equal(number(fund.signedAmount), 200);
  assert.equal((fund.ledgerEntries as unknown[]).length, 1);

  // Parcelamento de R$ 100,01: soma exata, resto de centavos e datas civis.
  const createOp = `payable-create-${suffix}`;
  const input = {
    description: 'Parcelas ficticias',
    totalAmount: 100.01,
    dueDate: '2026-09-10',
    installmentQty: 3,
    operationId: createOp,
  };
  const created = shape(await createPayablesProtected(user.id, input));
  const ids = created.ids;
  assert.ok(Array.isArray(ids) && ids.length === 3 && ids.every((id) => typeof id === 'string'));
  const rows = await prisma.payable.findMany({ where: { id: { in: ids as string[] } }, orderBy: { installmentNo: 'asc' } });
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map((row) => money(row.totalAmount)), [33.34, 33.34, 33.33]);
  assert.equal(money(rows.reduce((sum, row) => sum + number(row.totalAmount), 0)), 100.01);
  assert.deepEqual(rows.map((row) => row.dueDate.toISOString().slice(0, 10)), [
    '2026-09-10', '2026-10-12', '2026-11-10',
  ]);
  const createReplay = shape(await createPayablesProtected(user.id, input));
  assert.deepEqual(createReplay.ids, ids);
  assert.equal(await prisma.payable.count({ where: { userId: user.id } }), 3);
  assert.equal(await prisma.cloudMutationReceipt.count({
    where: { workspaceId: workspace.id, operationId: createOp },
  }), 1);
  await assert.rejects(
    () => createPayablesProtected(user.id, { ...input, totalAmount: 100.02 }),
    code('OPERATION_ID_REUSED'),
  );

  const payableId = rows[0].id;
  const initialOpen = money(rows[0].openAmount);
  const payableEventsBefore = await prisma.financialEvent.count({ where: { workspaceId: workspace.id } });
  // Tentativa sem saldo nao deve gerar pagamento, evento ou recibo.
  const noFundsOp = `payable-nofunds-${suffix}`;
  await assert.rejects(
    () => payPayableProtected(user.id, payableId, {
      amount: 10, paidAt, interestAmount: 0, fineAmount: 0,
      accountId: emptyAccount.id, paymentMethodId: method.id, operationId: noFundsOp,
    }), code('INSUFFICIENT_MONETARY_BALANCE'),
  );
  assert.equal(await prisma.payablePayment.count({ where: { payableId } }), 0);
  assert.equal(await prisma.financialEvent.count({ where: { workspaceId: workspace.id } }), payableEventsBefore);
  assert.equal(await prisma.cloudMutationReceipt.count({
    where: { workspaceId: workspace.id, operationId: noFundsOp },
  }), 0);
  assert.equal(await prisma.ledgerEntry.count({ where: { accountId: emptyAccount.id } }), 0,
    'Baixa recusada nao pode criar lancamento no razao.');

  const paymentOp = `payable-partial-${suffix}`;
  const partialInput = {
    amount: 10, paidAt, interestAmount: 0.2, fineAmount: 0.3,
    accountId: account.id, paymentMethodId: method.id, operationId: paymentOp,
  };
  const partial = shape(await payPayableProtected(user.id, payableId, partialInput));
  assert.equal(money(partial.remaining), 23.34);
  assert.equal(partial.payableStatus, 'partial');
  const savedPartial = await prisma.payablePayment.findFirstOrThrow({
    where: { payableId, financialEventId: partial.financialEventId as string },
    include: { financialEvent: true },
  });
  assert.equal(money(savedPartial.amount), 10);
  assert.equal(money(savedPartial.interestAmount), 0.2);
  assert.equal(money(savedPartial.fineAmount), 0.3);
  assert.equal(money(savedPartial.financialEvent?.signedAmount), -10.5);
  const partialLedger = await prisma.ledgerEntry.findMany({
    where: { eventId: partial.financialEventId as string },
  });
  assert.equal(partialLedger.length, 1, 'Baixa parcial realizada deve gerar UMA contrapartida no razao.');
  assert.equal(partialLedger[0].accountId, account.id);
  assert.equal(money(partialLedger[0].debit), 0);
  assert.equal(money(partialLedger[0].credit), 10.5,
    'Razao deve incluir principal, juros e multa do pagamento efetivo.');
  assert.equal(await prisma.payablePayment.count({ where: { payableId } }), 1);
  const partialReplay = shape(await payPayableProtected(user.id, payableId, partialInput));
  assert.equal(partialReplay.financialEventId, partial.financialEventId);
  assert.equal(await prisma.payablePayment.count({ where: { payableId } }), 1);
  assert.equal(await prisma.ledgerEntry.count({
    where: { eventId: partial.financialEventId as string },
  }), 1, 'Replay nao pode duplicar razao.');
  assert.equal(await prisma.cloudMutationReceipt.count({
    where: { workspaceId: workspace.id, operationId: paymentOp },
  }), 1);
  await assert.rejects(
    () => payPayableProtected(user.id, payableId, { ...partialInput, amount: 9 }),
    code('OPERATION_ID_REUSED'),
  );
  await assert.rejects(
    () => payPayableProtected(user.id, payableId, {
      ...partialInput, amount: initialOpen, operationId: `payable-too-much-${suffix}`,
    }), code('AMOUNT_EXCEEDS_OPEN_BALANCE'),
  );
  assert.equal(await prisma.payablePayment.count({ where: { payableId } }), 1);

  const finalPayable = shape(await payPayableProtected(user.id, payableId, {
    amount: 23.34, paidAt, interestAmount: 0, fineAmount: 0,
    accountId: account.id, paymentMethodId: method.id,
    operationId: `payable-final-${suffix}`,
  }));
  assert.equal(money(finalPayable.remaining), 0);
  assert.equal(finalPayable.payableStatus, 'paid');
  const closedPayable = await prisma.payable.findUniqueOrThrow({ where: { id: payableId } });
  assert.equal(money(closedPayable.openAmount), 0);
  assert.equal(closedPayable.status, 'paid');
  assert.equal(await prisma.payablePayment.count({ where: { payableId } }), 2);
  // #674: cada baixa realizada deve escriturar uma contrapartida, na
  // MESMA transacao que o evento e o PayablePayment, sem duplicar no replay.
  const payableLedger = await prisma.ledgerEntry.findMany({
    where: { eventId: { in: [partial.financialEventId as string, finalPayable.financialEventId as string] } },
    orderBy: { createdAt: 'asc' },
  });
  assert.equal(payableLedger.length, 2, 'Duas baixas realizadas devem gerar dois lancamentos de razao.');
  const ledgerByEvent = new Map(payableLedger.map((entry) => [entry.eventId, entry]));
  const finalLedger = ledgerByEvent.get(finalPayable.financialEventId as string);
  assert.ok(finalLedger);
  assert.equal(money(finalLedger.debit), 0);
  assert.equal(money(finalLedger.credit), 23.34);
  assert.equal(money(payableLedger.reduce((sum, entry) => sum + number(entry.credit), 0)), 33.84);
  console.log('STAGE09_PAYABLE_LEDGER_ROWS_VERIFIED=2');

  // Compra parcelada canônica: um centavo residual vai à primeira parcela.
  const purchaseOp = `card-purchase-${suffix}`;
  const purchaseInput = {
    cardId: card.id,
    description: 'Compra ficticia parcelada',
    totalAmount: 100.01,
    purchaseDate: '2026-09-09',
    installments: 3,
    operationId: purchaseOp,
  };
  const purchase = shape(await createCardPurchaseProtected(user.id, purchaseInput));
  assert.equal(purchase.idempotentReplay, false);
  const purchaseId = purchase.id as string;
  const entries = await prisma.cardInstallment.findMany({
    where: { purchaseId }, orderBy: { number: 'asc' },
  });
  assert.deepEqual(entries.map((entry) => money(entry.amount)), [33.34, 33.34, 33.33]);
  assert.deepEqual(entries.map((entry) => entry.statementMonth), ['2026-09', '2026-10', '2026-11']);
  assert.deepEqual(shape(await createCardPurchaseProtected(user.id, purchaseInput)).id, purchaseId);
  assert.equal(await prisma.cardPurchase.count({ where: { userId: user.id, cardId: card.id } }), 1);
  assert.equal(await prisma.cloudMutationReceipt.count({
    where: { workspaceId: workspace.id, operationId: purchaseOp },
  }), 1);
  await assert.rejects(
    () => createCardPurchaseProtected(user.id, { ...purchaseInput, totalAmount: 99.99 }),
    code('OPERATION_ID_REUSED'),
  );

  const statementMonth = '2026-09';
  const statementPaymentCount = () => prisma.financialEvent.count({
    where: { workspaceId: workspace.id, description: `Fatura ${card.name} ${statementMonth}` },
  });
  const beforeStatement = await statementPaymentCount();
  await assert.rejects(
    () => payCardStatementProtected(user.id, card.id, statementMonth, {
      accountId: account.id, paymentMethodId: method.id, paidAt,
      amount: 50, operationId: `card-too-much-${suffix}`,
    }), code('AMOUNT_EXCEEDS_OPEN_STATEMENT'),
  );
  await assert.rejects(
    () => payCardStatementProtected(user.id, card.id, statementMonth, {
      accountId: account.id, paymentMethodId: creditMethod.id, paidAt,
      amount: 10, operationId: `card-invalid-method-${suffix}`,
    }), code('INVALID_PAYMENT_METHOD'),
  );
  await assert.rejects(
    () => payCardStatementProtected(user.id, card.id, statementMonth, {
      accountId: emptyAccount.id, paymentMethodId: method.id, paidAt,
      amount: 10, operationId: `card-nofunds-${suffix}`,
    }), code('INSUFFICIENT_MONETARY_BALANCE'),
  );
  assert.equal(await statementPaymentCount(), beforeStatement);
  assert.equal((await prisma.cardInstallment.findUniqueOrThrow({ where: { id: entries[0].id } })).status, 'open');

  const statementOp = `card-partial-${suffix}`;
  const cardPartialInput = {
    accountId: account.id, paymentMethodId: method.id, paidAt,
    amount: 10, operationId: statementOp,
  };
  const statementPartial = shape(await payCardStatementProtected(user.id, card.id, statementMonth, cardPartialInput));
  assert.equal(statementPartial.partial, true);
  assert.equal(statementPartial.paid, false);
  assert.equal(money(statementPartial.remainingStatementAmount), 23.34);
  const partiallyPaidEntry = await prisma.cardInstallment.findUniqueOrThrow({ where: { id: entries[0].id } });
  assert.equal(partiallyPaidEntry.status, 'open');
  assert.equal(money(partiallyPaidEntry.partialPaidAmount), 10);
  const cardPaymentReplay = shape(await payCardStatementProtected(user.id, card.id, statementMonth, cardPartialInput));
  assert.equal(cardPaymentReplay.eventId, statementPartial.eventId);
  assert.equal(await statementPaymentCount(), beforeStatement + 1);
  assert.equal(await prisma.cloudMutationReceipt.count({
    where: { workspaceId: workspace.id, operationId: statementOp },
  }), 1);

  const statementFull = shape(await payCardStatementProtected(user.id, card.id, statementMonth, {
    accountId: account.id, paymentMethodId: method.id, paidAt,
    operationId: `card-full-${suffix}`,
  }));
  assert.equal(statementFull.paid, true);
  assert.equal(money(statementFull.remainingStatementAmount), 0);
  assert.equal((await prisma.cardInstallment.findUniqueOrThrow({ where: { id: entries[0].id } })).status, 'paid');
  assert.equal(await statementPaymentCount(), beforeStatement + 2);
  assert.equal(await prisma.ledgerEntry.count({
    where: { eventId: { in: [statementPartial.eventId as string, statementFull.eventId as string] } },
  }), 2);
  assert.equal(await prisma.auditLog.count({
    where: { userId: user.id, action: 'CARD_STATEMENT_PAID' },
  }), 2);
  assert.equal(await prisma.auditLog.count({
    where: { userId: user.id, action: 'PAYABLE_PAYMENT_CREATED' },
  }), 2);
  // As parcelas dos meses seguintes ficam intactas.
  const rest = await prisma.cardInstallment.findMany({
    where: { purchaseId, number: { in: [2, 3] } }, orderBy: { number: 'asc' },
  });
  assert.deepEqual(rest.map((entry) => entry.status), ['open', 'open']);
  assert.deepEqual(rest.map((entry) => money(entry.partialPaidAmount)), [0, 0]);

  console.log('STAGE09_PG17_CARD_PAYABLE_WRITERS=PASS_SYNTHETIC_ONLY');
  console.log('STAGE09_SCOPE=PAYABLE_INSTALLMENTS_PARTIAL_TOTAL_REPLAY_CARD_INSTALLMENTS_STATEMENT_ATOMICITY_BALANCE_AUDIT');
}

main().catch((error) => {
  console.error('STAGE09_PG17_CARD_PAYABLE_WRITERS=FAIL_SYNTHETIC_ONLY');
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
