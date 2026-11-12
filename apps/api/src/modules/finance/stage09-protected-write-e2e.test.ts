/**
 * Etapa 09: teste de writers financeiros canônicos com dados 100% FICTÍCIOS.
 * Só pode ser executado em CI com PostgreSQL 17 descartável e DB local exclusivo.
 * Este teste escreve APENAS no banco sintético da execução, NUNCA no restore.
 */
import assert from 'node:assert/strict';
import { Prisma, UserRole, UserStatus, prisma } from '@meg/database';
import { createFinancialEventProtected, FinancialEventMutationError } from './event-mutation';
import { createFinancialTransfer, FinancialTransferError } from './transfer-service';

// Guard obrigatório ANTES da primeira operação Prisma, inclusive leitura.
function assertDisposableDatabase() {
  assert.equal(process.env.CI, 'true', 'Executar exclusivamente no ambiente CI.');
  assert.equal(process.env.MEG_STAGE09_SYNTHETIC_ONLY, 'YES');
  const raw = process.env.DATABASE_URL;
  assert.ok(raw, 'DATABASE_URL sintetica ausente.');
  const url = new URL(raw);
  assert.equal(url.protocol, 'postgresql:');
  assert.equal(url.hostname, '127.0.0.1');
  assert.equal(url.port, '5432');
  assert.equal(url.pathname, '/meg_stage09_synthetic');
  assert.equal(url.username, 'ci');
  assert.equal(url.searchParams.get('schema'), 'public');
}

function hasCode(expected: string) {
  return (error: unknown) =>
    error instanceof Error
    && 'code' in error
    && (error as { code?: string }).code === expected;
}

async function main() {
  assertDisposableDatabase();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const user = await prisma.user.create({
    data: {
      name: 'MEG Stage09 FICTICIO',
      email: `stage09-writer-${suffix}@example.invalid`,
      passwordHash: 'FAKE-DO-NOT-USE',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      isActive: true,
      approvedAt: new Date(),
    },
  });
  const workspace = await prisma.workspace.create({
    data: {
      name: 'MEG Stage09 Synthetic Only',
      slug: `stage09-only-${suffix}`,
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
  const [source, destination, benefit, creditMethod] = await Promise.all([
    prisma.account.create({ data: { userId: user.id, name: 'Origem sintética', type: 'CHECKING', openingBalance: 0 } }),
    prisma.account.create({ data: { userId: user.id, name: 'Destino sintético', type: 'SAVINGS', openingBalance: 0 } }),
    prisma.account.create({ data: { userId: user.id, name: 'Benefício sintético', type: 'benefit', openingBalance: 0 } }),
    prisma.paymentMethod.create({ data: { userId: user.id, name: 'Crédito sintético', type: 'credit' } }),
  ]);
  const date = '2026-11-11T12:00:00.000Z';
  const day = '2026-11-11';
  const operationId = `stage09-income-${suffix}`;
  const incomeInput = {
    description: 'Receita fictícia com competência independente',
    type: 'income' as const,
    status: 'planned' as const,
    date,
    competence: '2026-10',
    amount: 200,
    accountId: source.id,
    operationId,
  };

  const income = await createFinancialEventProtected(user.id, incomeInput);
  assert.equal(income.idempotentReplay, false);
  assert.equal(income.status, 'paid', 'Receita deve entrar realizada mesmo solicitada planned.');
  assert.equal(income.competence, '2026-10', 'Competência informada deve prevalecer sobre data.');
  assert.equal(Number(income.signedAmount), 200);
  assert.equal(income.ledgerEntries.length, 1);
  assert.equal(Number(income.ledgerEntries[0].debit), 200);
  assert.equal(Number(income.ledgerEntries[0].credit), 0);

  // Mesmo operationId e payload não podem gerar novo lançamento ou novo razão.
  const replay = await createFinancialEventProtected(user.id, incomeInput);
  assert.equal(replay.id, income.id);
  assert.equal(replay.idempotentReplay, true);
  assert.equal(await prisma.financialEvent.count({ where: { workspaceId: workspace.id, id: income.id } }), 1);
  assert.equal(await prisma.ledgerEntry.count({ where: { eventId: income.id } }), 1);
  assert.equal(await prisma.cloudMutationReceipt.count({ where: { workspaceId: workspace.id, operationId } }), 1);
  await assert.rejects(
    () => createFinancialEventProtected(user.id, { ...incomeInput, amount: 201 }),
    hasCode('OPERATION_ID_REUSED'),
  );
  assert.equal(await prisma.financialEvent.count({ where: { workspaceId: workspace.id } }), 1);

  // Estorno de despesa, entrada negativa e sinal armazenado positivo.
  const refund = await createFinancialEventProtected(user.id, {
    description: 'Estorno sintético',
    type: 'expense',
    status: 'paid',
    date,
    amount: -25,
    accountId: source.id,
    operationId: `stage09-refund-${suffix}`,
  });
  assert.equal(Number(refund.amount), 25);
  assert.equal(Number(refund.signedAmount), 25);
  assert.equal(Number(refund.ledgerEntries[0].debit), 25);

  // Cartão de crédito permanece planejado sem lançamento em razão monetário.
  const plannedCredit = await createFinancialEventProtected(user.id, {
    description: 'Compra sintética cartão',
    type: 'expense',
    status: 'paid',
    date,
    amount: 12.34,
    accountId: source.id,
    paymentMethodId: creditMethod.id,
    operationId: `stage09-credit-${suffix}`,
  });
  assert.equal(plannedCredit.status, 'planned');
  assert.equal(plannedCredit.ledgerEntries.length, 0);

  // O writer genérico não pode gravar em conta de benefício nem deixar
  // vestígios parciais de evento ou recibo da tentativa recusada.
  const beforeReject = await prisma.financialEvent.count({ where: { workspaceId: workspace.id } });
  const rejectedOperationId = `stage09-benefit-denied-${suffix}`;
  await assert.rejects(
    () => createFinancialEventProtected(user.id, {
      description: 'Benefício roteado incorretamente',
      type: 'expense',
      status: 'paid',
      date,
      amount: 10,
      accountId: benefit.id,
      operationId: rejectedOperationId,
    }),
    hasCode('BENEFIT_CONTRACT_REQUIRED'),
  );
  assert.equal(await prisma.financialEvent.count({ where: { workspaceId: workspace.id } }), beforeReject);
  assert.equal(await prisma.cloudMutationReceipt.count({ where: { workspaceId: workspace.id, operationId: rejectedOperationId } }), 0);

  // Falha por saldo insuficiente deve reverter a operação inteira:
  // nenhuma perna, nenhum lançamento de razão, nenhum recibo e nenhuma auditoria.
  const failedTransferId = `stage09-transfer-rejected-${suffix}`;
  await assert.rejects(
    () => createFinancialTransfer(user.id, {
      operationId: failedTransferId,
      sourceAccountId: source.id,
      destinationAccountId: destination.id,
      amount: 300,
      date: day,
    }),
    hasCode('INSUFFICIENT_SOURCE_ACCOUNT_BALANCE'),
  );
  assert.equal(await prisma.financialEvent.count({ where: { workspaceId: workspace.id, type: 'transfer' } }), 0);
  assert.equal(await prisma.cloudMutationReceipt.count({ where: { workspaceId: workspace.id, operationId: failedTransferId } }), 0);
  assert.equal(await prisma.auditLog.count({
    where: { userId: user.id, action: 'FINANCIAL_TRANSFER_CREATED' },
  }), 0);

  const transferId = `stage09-transfer-accepted-${suffix}`;
  const transferInput = {
    operationId: transferId,
    sourceAccountId: source.id,
    destinationAccountId: destination.id,
    amount: 50,
    date: day,
    description: 'Transferência fictícia',
  };
  const transfer = await createFinancialTransfer(user.id, transferInput);
  assert.equal(transfer.idempotentReplay, false);
  assert.equal(transfer.sourceBalanceBefore, 225);
  assert.equal(transfer.sourceBalanceAfter, 175);
  const legs = await prisma.financialEvent.findMany({
    where: { workspaceId: workspace.id, type: 'transfer' },
    include: { ledgerEntries: true },
  });
  assert.equal(legs.length, 2, 'Transferência concluída deve gerar exatamente duas pernas.');
  assert.equal(legs.reduce((sum, event) => sum + Number(event.signedAmount), 0), 0);
  assert.equal(legs.reduce((sum, event) => sum + event.ledgerEntries.length, 0), 2);
  const transferReplay = await createFinancialTransfer(user.id, transferInput);
  assert.equal(transferReplay.idempotentReplay, true);
  assert.equal(transferReplay.sourceEventId, transfer.sourceEventId);
  assert.equal(transferReplay.destinationEventId, transfer.destinationEventId);
  assert.equal(await prisma.financialEvent.count({ where: { workspaceId: workspace.id, type: 'transfer' } }), 2);
  assert.equal(await prisma.cloudMutationReceipt.count({ where: { workspaceId: workspace.id, operationId: transferId } }), 1);
  await assert.rejects(
    () => createFinancialTransfer(user.id, { ...transferInput, amount: 60 }),
    hasCode('OPERATION_ID_REUSED'),
  );

  assert.equal(await prisma.auditLog.count({
    where: { userId: user.id, action: 'FINANCIAL_TRANSFER_CREATED' },
  }), 1);
  assert.equal(await prisma.auditLog.count({
    where: { userId: user.id, action: 'FINANCIAL_EVENT_CREATED' },
  }), 3);

  console.log('STAGE09_PG17_PROTECTED_WRITERS=PASS_SYNTHETIC_ONLY');
  console.log('STAGE09_SCOPE=EVENT_WRITER_TRANSFER_IDEMPOTENCY_ATOMICITY_REFUND_COMPETENCE_CREDIT_BENEFIT_ROUTING');
}

main()
  .catch((error) => {
    console.error('STAGE09_PG17_PROTECTED_WRITERS=FAIL_SYNTHETIC_ONLY');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
