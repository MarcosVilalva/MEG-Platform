import assert from 'node:assert/strict';
import { Prisma, UserRole, UserStatus, prisma } from '@meg/database';
import { createFinancialEvent, deleteFinancialEvent, updateFinancialEvent } from './service';
import { createFinancialTransfer, FinancialTransferError } from './transfer-service';
import { createBenefitEventProtected, BenefitEventMutationError } from './benefit-event-mutation';

type FullTransferResult = {
  transferId: string;
  sourceEventId: string;
  destinationEventId: string;
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
  date: string;
  sourceBalanceBefore: number;
  sourceBalanceAfter: number;
  idempotentReplay: boolean;
};

function assertFullTransferResult(value: unknown): asserts value is FullTransferResult {
  assert.ok(value && typeof value === 'object', 'Transferência deve retornar payload estruturado.');
  const result = value as Record<string, unknown>;
  assert.equal(typeof result.transferId, 'string');
  assert.equal(typeof result.sourceEventId, 'string');
  assert.equal(typeof result.destinationEventId, 'string');
  assert.equal(typeof result.sourceAccountId, 'string');
  assert.equal(typeof result.destinationAccountId, 'string');
  assert.equal(typeof result.amount, 'number');
  assert.equal(typeof result.date, 'string');
  assert.equal(typeof result.sourceBalanceBefore, 'number');
  assert.equal(typeof result.sourceBalanceAfter, 'number');
  assert.equal(typeof result.idempotentReplay, 'boolean');
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function dayBefore(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

async function main() {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const user = await prisma.user.create({
    data: {
      name: 'RC1 Financial E2E',
      email: `rc1-financial-e2e-${suffix}@meg.local`,
      passwordHash: 'not-used-in-e2e',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      isActive: true,
      approvedAt: new Date(),
    },
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: `RC1 Financial E2E ${suffix}`,
      slug: `rc1-financial-e2e-${suffix}`,
      ownerId: user.id,
      members: {
        create: {
          userId: user.id,
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
          isActive: true,
        },
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

  const [sourceAccount, destinationAccount, benefitAccount] = await Promise.all([
    prisma.account.create({
      data: {
        userId: user.id,
        name: 'Conta RC1 Origem',
        type: 'CHECKING',
        openingBalance: 0,
        isActive: true,
      },
    }),
    prisma.account.create({
      data: {
        userId: user.id,
        name: 'Conta RC1 Destino',
        type: 'SAVINGS',
        openingBalance: 0,
        isActive: true,
      },
    }),
    prisma.account.create({
      data: {
        userId: user.id,
        name: 'Benefício Alimentação RC1',
        type: 'benefit',
        openingBalance: 0,
        isActive: true,
      },
    }),
  ]);

  const [benefitCategory, benefitPaymentMethod] = await Promise.all([
    prisma.category.create({
      data: {
        userId: user.id,
        name: 'Alimentação RC1',
        group: 'ALIMENTAÇÃO',
        type: 'expense',
        isActive: true,
      },
    }),
    prisma.paymentMethod.create({
      data: {
        userId: user.id,
        name: 'VEROCARD',
        type: 'benefit',
        isActive: true,
      },
    }),
  ]);

  const foreignUser = await prisma.user.create({
    data: {
      name: 'RC1 Foreign Catalog Owner',
      email: `rc1-foreign-${suffix}@meg.local`,
      passwordHash: 'not-used-in-e2e',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      isActive: true,
      approvedAt: new Date(),
    },
  });
  const foreignAccount = await prisma.account.create({
    data: {
      userId: foreignUser.id,
      name: 'Conta estrangeira RC1',
      type: 'CHECKING',
      openingBalance: 9999,
      isActive: true,
    },
  });

  await assert.rejects(
    () => createFinancialEvent(user.id, {
      description: 'RC1 tentativa de conta de outro usuário',
      type: 'expense',
      status: 'paid',
      date: `${dayBefore(2)}T12:00:00.000Z`,
      amount: 1,
      accountId: foreignAccount.id,
    }),
    (error: unknown) => error instanceof Error && error.message === 'INVALID_ACCOUNT',
    'Evento financeiro não pode usar conta pertencente a outro usuário.',
  );

  const effectiveDay = dayBefore(2);
  const effectiveAt = `${effectiveDay}T12:00:00.000Z`;

  const income = await createFinancialEvent(user.id, {
    description: 'RC1 Receita homologação',
    type: 'income',
    status: 'paid',
    date: effectiveAt,
    amount: 1000,
    accountId: sourceAccount.id,
  });
  assert.equal(Number(income.signedAmount), 1000);
  assert.equal(income.ledgerEntries.length, 1);
  assert.equal(Number(income.ledgerEntries[0].debit), 1000);
  assert.equal(Number(income.ledgerEntries[0].credit), 0);

  const expense = await createFinancialEvent(user.id, {
    description: 'RC1 Despesa homologação',
    type: 'expense',
    status: 'paid',
    date: effectiveAt,
    amount: 200,
    accountId: sourceAccount.id,
  });
  assert.equal(Number(expense.signedAmount), -200);
  assert.equal(expense.ledgerEntries.length, 1);
  assert.equal(Number(expense.ledgerEntries[0].debit), 0);
  assert.equal(Number(expense.ledgerEntries[0].credit), 200);

  const planned = await createFinancialEvent(user.id, {
    description: 'RC1 Despesa planejada',
    type: 'expense',
    status: 'planned',
    date: effectiveAt,
    amount: 50,
    accountId: sourceAccount.id,
  });
  assert.equal(planned.ledgerEntries.length, 0, 'Lançamento planejado não pode movimentar o razão.');

  const benefitCreditOperationId = `rc1-benefit-credit-${suffix}`;
  const benefitCredit = await createBenefitEventProtected(user.id, {
    description: 'RC1 Recarga benefício',
    type: 'income',
    date: effectiveDay,
    amount: 500,
    accountId: benefitAccount.id,
    paymentMethodId: benefitPaymentMethod.id,
    operationId: benefitCreditOperationId,
  });
  assert.equal(benefitCredit.status, 'paid');
  assert.equal(Number(benefitCredit.signedAmount), 500);
  assert.equal(benefitCredit.ledgerEntries.length, 1);
  assert.equal(Number(benefitCredit.ledgerEntries[0].debit), 500);
  assert.equal(Number(benefitCredit.ledgerEntries[0].credit), 0);
  assert.equal(benefitCredit.idempotentReplay, false);

  const benefitDebitOperationId = `rc1-benefit-debit-${suffix}`;
  const benefitDebit = await createBenefitEventProtected(user.id, {
    description: 'RC1 Despesa benefício',
    type: 'expense',
    date: effectiveDay,
    amount: 120,
    accountId: benefitAccount.id,
    categoryId: benefitCategory.id,
    paymentMethodId: benefitPaymentMethod.id,
    operationId: benefitDebitOperationId,
  });
  assert.equal(benefitDebit.status, 'paid');
  assert.equal(Number(benefitDebit.signedAmount), -120);
  assert.equal(Number(benefitDebit.ledgerEntries[0].credit), 120);

  const benefitReplay = await createBenefitEventProtected(user.id, {
    description: 'RC1 Despesa benefício',
    type: 'expense',
    date: effectiveDay,
    amount: 120,
    accountId: benefitAccount.id,
    categoryId: benefitCategory.id,
    paymentMethodId: benefitPaymentMethod.id,
    operationId: benefitDebitOperationId,
  });
  assert.equal(benefitReplay.id, benefitDebit.id);
  assert.equal(benefitReplay.idempotentReplay, true, 'Replay de benefício deve reutilizar o recibo original.');
  assert.equal(await prisma.cloudMutationReceipt.count({
    where: { workspaceId: workspace.id, operationId: benefitDebitOperationId },
  }), 1);

  await assert.rejects(
    () => createBenefitEventProtected(user.id, {
      description: 'RC1 Benefício sem saldo',
      type: 'expense',
      date: effectiveDay,
      amount: 999,
      accountId: benefitAccount.id,
      categoryId: benefitCategory.id,
      paymentMethodId: benefitPaymentMethod.id,
      operationId: `rc1-benefit-insufficient-${suffix}`,
    }),
    (error: unknown) => error instanceof BenefitEventMutationError && error.code === 'INSUFFICIENT_BENEFIT_BALANCE',
    'Benefício Alimentação deve bloquear gasto superior ao saldo disponível.',
  );

  const benefitLedger = await prisma.ledgerEntry.findMany({ where: { accountId: benefitAccount.id } });
  const benefitLedgerBalance = roundMoney(benefitLedger.reduce(
    (sum, entry) => sum + Number(entry.debit) - Number(entry.credit),
    0,
  ));
  assert.equal(benefitLedgerBalance, 380, 'Razão do benefício deve fechar em R$ 380,00 sem afetar contas monetárias.');

  const operationId = `rc1-transfer-${suffix}`;
  const transfer = await createFinancialTransfer(user.id, {
    operationId,
    sourceAccountId: sourceAccount.id,
    destinationAccountId: destinationAccount.id,
    amount: 300,
    date: effectiveDay,
    description: 'RC1 Transferência homologação',
  });
  assertFullTransferResult(transfer);
  assert.equal(transfer.idempotentReplay, false);
  assert.equal(transfer.amount, 300);
  assert.equal(transfer.sourceBalanceBefore, 800);
  assert.equal(transfer.sourceBalanceAfter, 500);

  const transferEventCountBeforeReplay = await prisma.financialEvent.count({
    where: { id: { in: [transfer.sourceEventId, transfer.destinationEventId] } },
  });
  assert.equal(transferEventCountBeforeReplay, 2);

  const replay = await createFinancialTransfer(user.id, {
    operationId,
    sourceAccountId: sourceAccount.id,
    destinationAccountId: destinationAccount.id,
    amount: 300,
    date: effectiveDay,
    description: 'RC1 Transferência homologação',
  });
  assertFullTransferResult(replay);
  assert.equal(replay.idempotentReplay, true, 'Replay idempotente deve reutilizar o recibo da mutação.');
  assert.equal(replay.sourceEventId, transfer.sourceEventId);
  assert.equal(replay.destinationEventId, transfer.destinationEventId);
  assert.equal(await prisma.cloudMutationReceipt.count({ where: { workspaceId: workspace.id, operationId } }), 1);
  assert.equal(await prisma.financialEvent.count({ where: { id: { in: [transfer.sourceEventId, transfer.destinationEventId] } } }), 2);

  await assert.rejects(
    () => createFinancialTransfer(user.id, {
      operationId: `rc1-insufficient-${suffix}`,
      sourceAccountId: sourceAccount.id,
      destinationAccountId: destinationAccount.id,
      amount: 9999,
      date: effectiveDay,
      description: 'RC1 Transferência sem saldo',
    }),
    (error: unknown) => error instanceof FinancialTransferError && error.code === 'INSUFFICIENT_SOURCE_ACCOUNT_BALANCE',
  );

  await assert.rejects(
    () => updateFinancialEvent(user.id, expense.id, { accountId: foreignAccount.id }),
    (error: unknown) => error instanceof Error && error.message === 'INVALID_ACCOUNT',
    'Edição financeira não pode trocar o lançamento para conta de outro usuário.',
  );

  const updatedExpense = await updateFinancialEvent(user.id, expense.id, { amount: 250 });
  assert.equal(Number(updatedExpense.signedAmount), -250);
  assert.equal(updatedExpense.ledgerEntries.length, 1);
  assert.equal(Number(updatedExpense.ledgerEntries[0].credit), 250);

  await deleteFinancialEvent(user.id, expense.id);
  const archivedExpense = await prisma.financialEvent.findUnique({
    where: { id: expense.id },
    include: { ledgerEntries: true },
  });
  assert.ok(archivedExpense?.archivedAt, 'Exclusão financeira deve arquivar o evento.');
  assert.equal(archivedExpense?.ledgerEntries.length, 0, 'Evento arquivado não pode conservar lançamento no razão.');

  const ledger = await prisma.ledgerEntry.findMany({
    where: { accountId: { in: [sourceAccount.id, destinationAccount.id] } },
  });
  const balanceByAccount = new Map<string, number>();
  for (const entry of ledger) {
    const effect = Number(entry.debit) - Number(entry.credit);
    balanceByAccount.set(entry.accountId, roundMoney((balanceByAccount.get(entry.accountId) || 0) + effect));
  }
  assert.equal(balanceByAccount.get(sourceAccount.id), 700, 'Razão da origem deve fechar em R$ 700,00.');
  assert.equal(balanceByAccount.get(destinationAccount.id), 300, 'Razão do destino deve fechar em R$ 300,00.');

  const expectedAuditActions = [
    'FINANCIAL_EVENT_CREATED',
    'FINANCIAL_EVENT_UPDATED',
    'FINANCIAL_EVENT_ARCHIVED',
    'FINANCIAL_TRANSFER_CREATED',
    'BENEFIT_EVENT_CREATED',
  ];
  const audits = await prisma.auditLog.findMany({
    where: { userId: user.id, action: { in: expectedAuditActions } },
    select: { action: true },
  });
  const auditActions = new Set(audits.map((item) => item.action));
  for (const action of expectedAuditActions) {
    assert.ok(auditActions.has(action), `Auditoria obrigatória ausente: ${action}`);
  }

  const postedSourceEvents = await prisma.financialEvent.findMany({
    where: {
      userId: user.id,
      accountId: sourceAccount.id,
      archivedAt: null,
      status: { in: ['paid', 'reconciled', 'confirmed'] },
    },
    select: { signedAmount: true },
  });
  const sourceBalanceFromEvents = roundMoney(postedSourceEvents.reduce((sum, item) => sum + Number(item.signedAmount), 0));
  assert.equal(sourceBalanceFromEvents, 700, 'Eventos postados e razão devem fechar no mesmo saldo da conta origem.');

  const postedBenefitEvents = await prisma.financialEvent.findMany({
    where: {
      userId: user.id,
      accountId: benefitAccount.id,
      archivedAt: null,
      status: { in: ['paid', 'reconciled', 'confirmed'] },
    },
    select: { signedAmount: true },
  });
  const benefitBalanceFromEvents = roundMoney(postedBenefitEvents.reduce((sum, item) => sum + Number(item.signedAmount), 0));
  assert.equal(benefitBalanceFromEvents, 380, 'Eventos do benefício e razão do benefício devem fechar no mesmo saldo.');

  console.log('RC1 financial E2E: APROVADO.');
  console.log('Fluxos validados: receita postada, despesa postada/planejada, Benefício Alimentação, atualização, arquivamento, razão, transferência atômica, saldo, idempotência e auditoria.');
}

main()
  .catch((error) => {
    console.error('RC1 financial E2E: REPROVADO.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
