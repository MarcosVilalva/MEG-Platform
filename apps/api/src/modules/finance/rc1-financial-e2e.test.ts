import assert from 'node:assert/strict';
import { Prisma, UserRole, UserStatus, prisma } from '@meg/database';
import { createFinancialEvent, deleteFinancialEvent, updateFinancialEvent } from './service';
import { createFinancialTransfer, FinancialTransferError } from './transfer-service';

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

  const [sourceAccount, destinationAccount] = await Promise.all([
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
  ]);

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

  console.log('RC1 financial E2E: APROVADO.');
  console.log('Fluxos validados: receita postada, despesa postada/planejada, atualização, arquivamento, razão, transferência atômica, saldo, idempotência e auditoria.');
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
