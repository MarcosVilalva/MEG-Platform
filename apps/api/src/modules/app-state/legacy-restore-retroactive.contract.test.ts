/**
 * PT107. Caracteriza a protecao contra saldo futuro negativo ao reativar
 * despesa antiga. Transacao Prisma simulada de leitura, sem banco/Android.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { Prisma } from '@meg/database';
import { monetaryAccountBalanceAt } from '../finance/monetary-protection';
import { assertLegacyRestoreDebitWindow, LegacyRestoreError } from './legacy-restore';

type Posted = { date: Date; signedAmount: number; status: string };
const account = { id: 'pt107-fictitious', openingBalance: 100 };
const ownerId = 'pt107-synthetic-user';

function fakeTransaction(posted: Posted[]) {
  let reads = 0;
  const tx = {
    financialEvent: {
      findFirst: async () => {
        reads++;
        return null; // nenhuma substituicao do saldo inicial via evento
      },
      findMany: async ({ where, select }: {
        where: { date: { gte?: Date; lt?: Date } };
        select: { date?: boolean; signedAmount?: boolean };
      }) => {
        reads++;
        const selected = posted
          .filter(item => where.date.gte === undefined || item.date >= where.date.gte)
          .filter(item => where.date.lt === undefined || item.date < where.date.lt)
          .sort((a, b) => a.date.getTime() - b.date.getTime());
        return select.date
          ? selected.map(item => ({ date: item.date }))
          : selected.map(item => ({ signedAmount: item.signedAmount, status: item.status }));
      },
    },
  } as unknown as Prisma.TransactionClient;
  return { tx, getReads: () => reads };
}

async function expectedFailure(
  tx: Prisma.TransactionClient, signedAmount: number, code: string, day = '2026-11-10',
) {
  await assert.rejects(
    () => assertLegacyRestoreDebitWindow(tx, ownerId, account, day, signedAmount),
    (error: unknown) => error instanceof LegacyRestoreError && error.code === code,
  );
}

const futureExpense: Posted = {
  date: new Date('2026-11-20T12:00:00.000Z'), signedAmount: -90, status: 'paid',
};
const { tx, getReads } = fakeTransaction([futureExpense]);
assert.equal(await monetaryAccountBalanceAt(tx, ownerId, account, '2026-11-10'), 100);
assert.equal(await monetaryAccountBalanceAt(tx, ownerId, account, '2026-11-20'), 10);

// Antes do guard PT107, a verificacao apenas da data 10/11 aceitaria -20.
// O saldo em 20/11 cairia de R$ 10 para R$ -10.
await expectedFailure(tx, -20, 'RESTORE_INSUFFICIENT_MONETARY_BALANCE');
assert.ok(getReads() > 2);
console.log('PT107_RETROACTIVE_RESTORE_FUTURE_OVERDRAFT_DENIED=PASS');

// Saldo final zero nao e insuficiente, e compra de R$ 5 deve ser aceita.
await assertLegacyRestoreDebitWindow(tx, ownerId, account, '2026-11-10', -10);
await assertLegacyRestoreDebitWindow(tx, ownerId, account, '2026-11-10', -5);
console.log('PT107_RETROACTIVE_RESTORE_WITHIN_BALANCE=PASS');

await expectedFailure(tx, Number.NaN, 'RESTORE_INVALID_DEBIT_AMOUNT');
await expectedFailure(tx, 20, 'RESTORE_INVALID_DEBIT_AMOUNT');
await expectedFailure(tx, -Number.MAX_SAFE_INTEGER, 'RESTORE_INVALID_DEBIT_AMOUNT');
console.log('PT107_INVALID_DEBIT_REJECTED=PASS');

// Um periodo amplo nao pode contornar o limite de 250 dias do motor canonico.
const dates: Posted[] = [];
for (let i = 0; i < 251; i++) {
  const day = new Date(Date.UTC(2026, 0, 1 + i, 12));
  dates.push({ date: day, signedAmount: 0, status: 'paid' });
}
const wide = fakeTransaction(dates);
await expectedFailure(wide.tx, -1, 'RESTORE_BALANCE_WINDOW_TOO_LARGE', '2026-01-01');
console.log('PT107_TOO_MANY_POSTED_DAYS_FAILS_CLOSED=PASS');

// Contrato estrutural: o writer QA deve consumir o guard ANTES da escrita.
const writer = readFileSync(new URL('./legacy-restore.ts', import.meta.url), 'utf8');
const beginning = writer.indexOf('export async function restoreLegacyFinancialEventQa');
const chunk = writer.slice(beginning);
const guard = chunk.indexOf('await assertLegacyRestoreDebitWindow(');
const firstWrite = chunk.indexOf('const updated = await tx.financialEvent.updateMany(');
assert.ok(guard >= 0 && firstWrite >= 0 && guard < firstWrite);
assert.ok(chunk.includes('serializableFinancialTransaction(async tx =>'));
console.log('PT107_GUARD_BEFORE_WRITES_SERIALIZABLE=PASS');
console.log('PT107_FINAL_RESTORE_GUARD=PASS');
