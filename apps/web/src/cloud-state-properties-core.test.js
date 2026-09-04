import assert from 'node:assert/strict';
import {
  applyStateProperties,
  changedStateProperties,
  matchesStateProperties,
  sameStateProperties,
  stateProperties,
} from './cloud-state-properties-core.js';

const state = {
  transactions: [{ id: 'a' }],
  activityLog: [{ id: 'log-a' }],
  budgets: { Casa: 100 },
  catalogs: { groups: ['CASA'] },
};

assert.deepEqual(stateProperties(state), {
  budgets: { Casa: 100 },
  catalogs: { groups: ['CASA'] },
});
assert.equal(sameStateProperties(state, { ...state, transactions: [{ id: 'b' }] }), true);
assert.equal(sameStateProperties(state, { catalogs: { groups: ['CASA'] }, budgets: { Casa: 100 }, transactions: [] }), true);
assert.equal(sameStateProperties(state, { ...state, budgets: { Casa: 200 } }), false);
assert.deepEqual(changedStateProperties(state, {
  ...state,
  budgets: { Casa: 200 },
  transactions: [{ id: 'ignored' }],
}), { budgets: { Casa: 200 } });
assert.equal(matchesStateProperties({ ...state, catalogs: { groups: ['CASA', 'LAZER'] } }, { budgets: { Casa: 100 } }), true);
assert.equal(matchesStateProperties(state, { budgets: { Casa: 200 } }), false);
assert.deepEqual(applyStateProperties({ transactions: [{ id: 'remote' }], budgets: {} }, state), {
  transactions: [{ id: 'remote' }],
  budgets: { Casa: 100 },
  catalogs: { groups: ['CASA'] },
});

console.log('cloud state properties tests passed');
