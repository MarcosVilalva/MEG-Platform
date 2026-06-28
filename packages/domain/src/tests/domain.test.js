import assert from 'node:assert/strict';

function signedAmount(type, amount) {
  if (type === 'income' || type === 'redemption') return Math.abs(amount);
  if (type === 'adjustment') return amount;
  return -Math.abs(amount);
}

function isLedgerBalanced(entries) {
  const debit = entries.reduce((sum, entry) => sum + entry.debit, 0);
  const credit = entries.reduce((sum, entry) => sum + entry.credit, 0);
  return Math.round((debit - credit) * 100) === 0;
}

assert.equal(signedAmount('income', 1000), 1000);
assert.equal(signedAmount('expense', 1000), -1000);
assert.equal(signedAmount('redemption', 500), 500);

assert.equal(
  isLedgerBalanced([
    { debit: 100, credit: 0 },
    { debit: 0, credit: 100 }
  ]),
  true
);

console.log('MEG Domain tests passed.');
