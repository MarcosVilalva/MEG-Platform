import assert from 'node:assert/strict';
import { filterOptionEntries, normalizeOptionText, optionSignature } from './transaction-editor.js';

assert.equal(normalizeOptionText('Cartão Débito'), 'CARTAO DEBITO');
assert.equal(normalizeOptionText('  alimentação  '), 'ALIMENTACAO');

const entries = [
  { value: 'PIX', label: 'Pix' },
  { value: 'CARD-BB', label: 'Cartão BB' },
  { value: 'CARD-NUBANK', label: 'Cartão Nubank' },
  { value: 'FOOD', label: 'Alimentação' },
];

assert.deepEqual(filterOptionEntries(entries, 'cartao').map((entry) => entry.value), ['CARD-BB', 'CARD-NUBANK']);
assert.deepEqual(filterOptionEntries(entries, 'alimentacao').map((entry) => entry.value), ['FOOD']);
assert.deepEqual(filterOptionEntries(entries, '', 2).map((entry) => entry.value), ['PIX', 'CARD-BB']);
assert.equal(optionSignature(entries), optionSignature(entries.map((entry) => ({ ...entry }))));
assert.notEqual(optionSignature(entries), optionSignature([...entries].reverse()));

const largeEntries = Array.from({ length: 5000 }, (_, index) => ({ value: String(index), label: `Opção ${index}` }));
const limited = filterOptionEntries(largeEntries, 'opcao', 60);
assert.equal(limited.length, 60);
assert.equal(limited[0].value, '0');
assert.equal(limited.at(-1).value, '59');

console.log('transaction-editor tests passed');
