import assert from 'node:assert/strict';
import { calculateBestPurchaseDay, calculateCardPurchaseCycle } from './card-cycle-core.js';

assert.equal(calculateBestPurchaseDay(10), 11);
assert.equal(calculateBestPurchaseDay(31), 1);
assert.equal(calculateBestPurchaseDay(0), null);

assert.deepEqual(calculateCardPurchaseCycle({ purchaseDate: '2026-09-09', closingDay: 10, dueDay: 17 }), {
  bestPurchaseDay: 11,
  closingDate: '2026-09-10',
  dueDate: '2026-09-17',
  isClosingDay: false,
});
assert.deepEqual(calculateCardPurchaseCycle({ purchaseDate: '2026-09-11', closingDay: 10, dueDay: 17 }), {
  bestPurchaseDay: 11,
  closingDate: '2026-10-10',
  dueDate: '2026-10-17',
  isClosingDay: false,
});
assert.equal(calculateCardPurchaseCycle({ purchaseDate: '2026-09-10', closingDay: 10, dueDay: 17 }).isClosingDay, true);
assert.equal(calculateCardPurchaseCycle({ purchaseDate: 'invalida', closingDay: 10, dueDay: 17 }), null);

console.log('Ciclo do cartão: melhor dia, fechamento e vencimento validados.');
