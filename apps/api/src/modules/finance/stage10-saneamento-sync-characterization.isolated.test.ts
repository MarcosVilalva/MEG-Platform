import assert from 'node:assert/strict';
import { prisma, UserRole, UserStatus } from '@meg/database';
import { synchronizeNormalizedRows } from '../app-state/normalization-migration';

/**
 * Regressao P0 da issue #698, EXCLUSIVAMENTE no Postgres17 descartavel.
 * Fixtures e testes ocorrem em uma transacao externa sempre revertida.
 */
const url = new URL(process.env.DATABASE_URL || 'http://invalid');
if (
  process.env.MEG_STAGE10_ISOLATED_PG !== '1'
  || !['127.0.0.1', 'localhost'].includes(url.hostname)
  || url.pathname !== '/meg_stage10_sandbox'
  || url.username !== 'meg_stage10_ci'
) throw new Error('STAGE10_QA_DISPOSABLE_ONLY');

class ExpectedRollback extends Error {}
const stamp = 'stage10-p0-' + Date.now() + '-' + Math.random().toString(36).slice(2);
const context = (workspaceId: string, userId: string, revision = 2) => ({ workspaceId, userId, revision });

function legacy(id: string, accountId: string, amount = 35.25) {
  return {
    id, description: 'Despesa ficticia de QA', date: '2026-11-11',
    type: 'expense', status: 'paid', situation: 'PAGO',
    amount, expenseAmount: amount, financialAccountId: accountId,
    category: 'Mercado', group: 'Mercado', expenseClass: 'CONTAS GERAIS',
    paymentMethod: 'PIX', modality: 'À VISTA',
  };
}

async function main() {
  try {
    await prisma.$transaction(async tx => {
      const owner = await tx.user.create({ data: {
        email: stamp + '@meg.test', name: 'Titular QA', passwordHash: 'QA_ONLY',
        role: UserRole.ADMIN, status: UserStatus.ACTIVE, isActive: true, approvedAt: new Date(),
      } });
      const foreign = await tx.user.create({ data: {
        email: stamp + '-foreign@meg.test', name: 'Outro titular QA', passwordHash: 'QA_ONLY',
        role: UserRole.ADMIN, status: UserStatus.ACTIVE, isActive: true, approvedAt: new Date(),
      } });
      const ws = await tx.workspace.create({ data: { name: 'Workspace QA', slug: stamp, ownerId: owner.id } });
      const account = await tx.account.create({ data: { userId: owner.id, name: 'Conta QA', type: 'checking' } });
      const foreignAccount = await tx.account.create({ data: { userId: foreign.id, name: 'Conta estrangeira QA', type: 'checking' } });
      const category = await tx.category.create({ data: { userId: owner.id, name: 'Mercado', group: 'CONTAS GERAIS', type: 'expense' } });
      const method = await tx.paymentMethod.create({ data: { userId: owner.id, name: 'PIX', type: 'instant' } });
      const legacyA = 'a-' + stamp;
      const payloadA = legacy(legacyA, account.id);
      const original = await tx.financialEvent.create({ data: {
        workspaceId: ws.id, userId: owner.id, legacyTransactionId: legacyA,
        description: payloadA.description, type: 'expense', status: 'paid',
        date: new Date('2026-11-11T12:00:00Z'), competence: '2026-11',
        amount: 35.25, signedAmount: -35.25, accountId: account.id,
        categoryId: category.id, paymentMethodId: method.id,
        sourcePayload: payloadA,
      } });
      const state = (transactions: unknown[]) => ({
        __megNormalization: { mode: 'normalized-primary' }, transactions,
      });

      // Atualizacao em lugar, SEM descartar o ID ou as relacoes canonicas.
      const changed = await synchronizeNormalizedRows(
        tx, state([payloadA]), context(ws.id, owner.id), [legacyA],
      );
      assert.equal(changed.active, true);
      assert.equal(changed.updated, 1);
      const updated = await tx.financialEvent.findUniqueOrThrow({ where: { id: original.id } });
      assert.equal(updated.id, original.id);
      assert.equal(updated.categoryId, category.id);
      assert.equal(updated.paymentMethodId, method.id);
      assert.equal(updated.accountId, account.id);
      assert.equal(updated.amount.toString(), original.amount.toString());
      assert.equal(updated.signedAmount.toString(), original.signedAmount.toString());
      assert.equal(updated.status, 'paid');
      assert.equal(await tx.financialEvent.count({ where: { legacyTransactionId: legacyA, workspaceId: ws.id } }), 1);

      // Repetir o estado não altera o evento nem reescreve a revisao do registro.
      const again = await synchronizeNormalizedRows(
        tx, state([payloadA]), context(ws.id, owner.id, 3), [legacyA],
      );
      assert.equal(again.updated, 0);
      assert.equal((await tx.financialEvent.findUniqueOrThrow({ where: { id: original.id } })).updatedAt.toISOString(), updated.updatedAt.toISOString());

      // Vinculo no ledger protege o evento e deve permitir leitura sem escrita.
      await tx.ledgerEntry.create({ data: {
        eventId: original.id, accountId: account.id, date: original.date,
        debit: 0, credit: 35.25, memo: 'Lancamento ficticio QA',
      } });
      const noOp = await synchronizeNormalizedRows(
        tx, state([payloadA]), context(ws.id, owner.id, 4), [legacyA],
      );
      assert.equal(noOp.updated, 0);
      await assert.rejects(
        () => synchronizeNormalizedRows(
          tx, state([{ ...payloadA, description: 'ALTERACAO INDEVIDA' }]),
          context(ws.id, owner.id, 5), [legacyA],
        ),
        /NORMALIZATION_LINKED_EVENT_REQUIRES_CANONICAL_WRITER/,
      );
      await assert.rejects(
        () => synchronizeNormalizedRows(tx, state([]), context(ws.id, owner.id, 6), [legacyA]),
        /NORMALIZATION_LINKED_EVENT_REQUIRES_CANONICAL_WRITER/,
      );
      assert.equal((await tx.financialEvent.findUniqueOrThrow({ where: { id: original.id } })).description, original.description);
      assert.equal(await tx.ledgerEntry.count({ where: { eventId: original.id } }), 1);

      // Outra linha sem dependentes continua editavel e e arquivada sem destruir o ID.
      const legacyB = 'b-' + stamp;
      const payloadB = legacy(legacyB, account.id, 6.75);
      const second = await tx.financialEvent.create({ data: {
        workspaceId: ws.id, userId: owner.id, legacyTransactionId: legacyB,
        description: payloadB.description, type: 'expense', status: 'paid',
        date: new Date('2026-11-11T12:00:00Z'), competence: '2026-11',
        amount: 6.75, signedAmount: -6.75, accountId: account.id,
        categoryId: category.id, paymentMethodId: method.id,
        sourcePayload: payloadB,
      } });
      const newB = { ...payloadB, description: 'Descricao alterada' };
      await synchronizeNormalizedRows(tx, state([payloadA, newB]), context(ws.id, owner.id, 7), [legacyB]);
      const afterB = await tx.financialEvent.findUniqueOrThrow({ where: { id: second.id } });
      assert.equal(afterB.description, 'Descricao alterada');
      assert.equal(afterB.categoryId, category.id);
      assert.equal(afterB.paymentMethodId, method.id);
      assert.equal(afterB.id, second.id);
      const deleted = await synchronizeNormalizedRows(tx, state([payloadA]), context(ws.id, owner.id, 8), [legacyB]);
      assert.equal(deleted.archived, 1);
      const archived = await tx.financialEvent.findUniqueOrThrow({ where: { id: second.id } });
      assert.ok(archived.archivedAt);
      assert.equal(archived.categoryId, category.id);
      assert.equal(archived.paymentMethodId, method.id);
      await assert.rejects(
        () => synchronizeNormalizedRows(tx, state([payloadA, payloadB]), context(ws.id, owner.id, 9), [legacyB]),
        /NORMALIZATION_ARCHIVED_EVENT_REQUIRES_RESTORE/,
      );

      // Cadastro de outro titular nunca pode ser ligado via payload do AppState.
      const foreignPayload = legacy('foreign-' + stamp, foreignAccount.id);
      await assert.rejects(
        () => synchronizeNormalizedRows(tx, state([payloadA, foreignPayload]), context(ws.id, owner.id, 10), [foreignPayload.id]),
        /NORMALIZATION_INVALID_ACCOUNT_SCOPE/,
      );
      assert.equal(await tx.financialEvent.count({ where: { legacyTransactionId: foreignPayload.id, workspaceId: ws.id } }), 0);

      // PUT completo deve ignorar registros arquivados e preservar o evento vinculado.
      const full = await synchronizeNormalizedRows(tx, state([payloadA]), context(ws.id, owner.id, 11));
      assert.equal(full.updated, 0);
      assert.equal(full.archived, 0);
      assert.equal((await tx.financialEvent.findUniqueOrThrow({ where: { id: original.id } })).id, original.id);

      // A mesma ID legado repetida deve ser recusada antes de qualquer alteracao.
      await assert.rejects(
        () => synchronizeNormalizedRows(tx, state([payloadA, payloadA]), context(ws.id, owner.id, 12)),
        /NORMALIZATION_DUPLICATE_LEGACY_ID/,
      );

      // Todas as fixtures e updates desta prova sao revertidos por design.
      throw new ExpectedRollback();
    }, { timeout: 60000 });
    throw new Error('QA_EXPECTED_ROLLBACK_NOT_CALLED');
  } catch (e) {
    if (!(e instanceof ExpectedRollback)) throw e;
  }
  assert.equal(await prisma.financialEvent.count({ where: { legacyTransactionId: { startsWith: 'a-' + stamp } } }), 0);
  assert.equal(await prisma.user.count({ where: { email: stamp + '@meg.test' } }), 0);
  console.log('MEG_STAGE10_QA_P0_ID_FKS_PRESERVED_LINKED_FAIL_CLOSED_ROLLBACK PASS');
}

main().catch(e => {
  console.error('MEG_STAGE10_QA_P0_FIX_FAIL', e);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
