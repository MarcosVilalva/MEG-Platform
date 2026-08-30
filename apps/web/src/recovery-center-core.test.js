import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildSelectiveRecovery, inspectRecoveryState } from './recovery-center-core.js';

const current = {
  transactions: [
    { id: 'conta-atual', date: '2026-08-29', description: 'Conta atual', type: 'expense', amount: 40 },
    { id: 'conflito', date: '2026-08-28', description: 'Valor atual', type: 'income', amount: 100 },
  ],
  budgets: { SAUDE: 500 },
  catalogs: { groups: ['SAÚDE'] },
};

const snapshot = {
  transactions: [
    { id: 'conta-atual', date: '2026-08-29', description: 'Conta atual', type: 'expense', amount: 40 },
    { id: 'conflito', date: '2026-08-28', description: 'Valor antigo', type: 'income', amount: 90 },
    { id: 'balbina', date: '2026-08-28', description: 'Paciente Dona Balbina', type: 'income', amount: 150, paymentMethod: 'PIX' },
    { id: 'outra', date: '2026-08-27', description: 'Outra receita', type: 'income', amount: 25 },
  ],
  budgets: {},
};

const inspection = inspectRecoveryState(snapshot, current);
assert.equal(inspection.recoverableCount, 2);
assert.equal(inspection.conflictCount, 1);
assert.equal(inspection.identicalCount, 1);
assert.equal(inspection.recoverable.find((item) => item.id === 'balbina').amount, 150);
assert.equal(inspection.conflicts[0].id, 'conflito');

const recovered = buildSelectiveRecovery(current, snapshot, ['balbina']);
assert.equal(recovered.restoredCount, 1);
assert.equal(recovered.restored[0].description, 'Paciente Dona Balbina');
assert.equal(recovered.state.transactions.length, 3);
assert.equal(recovered.state.transactions.find((item) => item.id === 'balbina').paymentMethod, 'PIX');
assert.deepEqual(recovered.state.budgets, current.budgets);
assert.deepEqual(recovered.state.catalogs, current.catalogs);
assert.equal(current.transactions.length, 2, 'o estado atual não deve ser mutado');

const safeDuplicate = buildSelectiveRecovery(current, snapshot, ['conta-atual', 'balbina', 'inexistente']);
assert.equal(safeDuplicate.restoredCount, 1);
assert.deepEqual(safeDuplicate.skippedExisting, ['conta-atual']);
assert.deepEqual(safeDuplicate.unknownSelected, ['inexistente']);
assert.equal(safeDuplicate.state.transactions.filter((item) => item.id === 'conta-atual').length, 1);

const source = readFileSync(new URL('./recovery-center.js', import.meta.url), 'utf8');
assert.match(source, /meg-financas-recovery/);
assert.match(source, /cloud-baseline/);
assert.match(source, /antes-de-recuperacao-seletiva/);
assert.match(source, /\/app-state\/transactions/);
assert.match(source, /expectedRevision: latest\.revision/);
assert.match(source, /upserts: recovery\.restored/);
assert.match(source, /response\.status === 409/);
assert.match(source, /latest = await readLatestCloudState\(\)/);
assert.match(source, /Já existe na base atual com o mesmo identificador e conteúdo diferente/);
assert.match(source, /A base atual não será substituída/);
assert.match(source, /querySelector\('#settings'\)/);
assert.doesNotMatch(source, /method:\s*'PUT'/);

console.log('selective recovery center core tests passed');
