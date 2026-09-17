import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const cardsGrid = readFileSync(new URL('./screens/PhoenixCardsGrid.tsx', import.meta.url), 'utf8');
const payables = readFileSync(new URL('./screens/PhoenixPayablesV15.tsx', import.meta.url), 'utf8');
const movements = readFileSync(new URL('./screens/PhoenixMovementsV15.tsx', import.meta.url), 'utf8');
const readScreens = readFileSync(new URL('./screens/PhoenixReadScreens.tsx', import.meta.url), 'utf8');

assert.match(cardsGrid, /tx\.amount !== undefined \? parseNumber\(tx\.amount\) : parseNumber\(tx\.expenseAmount\)/,
  'Cartões devem preservar o sinal do amount legado antes do expenseAmount absoluto');
assert.match(cardsGrid, /selected\.statement\.netAmount/,
  'Fatura atual deve preferir o total canônico devolvido pelo backend');
assert.match(cardsGrid, /selected\.statement\.charges/,
  'Compras da fatura devem vir do resumo canônico');
assert.match(cardsGrid, /selected\.statement\.credits/,
  'Créditos e estornos devem vir do resumo canônico');

assert.match(payables, /line\.source === 'card-installment'/,
  'Writer de fatura só pode ser usado quando todas as linhas forem do domínio oficial de cartões');
assert.match(payables, /representedEventIds/,
  'Eventos já representados pela fatura oficial não podem ser duplicados em Pendentes');
assert.match(payables, /openAmount: -Number\(event\.signedAmount \|\| 0\)/,
  'Pendentes legados devem usar signedAmount para preservar compras e estornos');

assert.match(movements, /const signed = Number\(event\.signedAmount \|\| 0\)/,
  'Lançamentos devem calcular o efeito visual a partir do mesmo signedAmount canônico');

assert.match(readScreens, /creditAwarePendingModel/,
  'Compatibilidade de crédito legado deve continuar ativa durante a transição');

console.log('Phoenix canonical card statement contract: OK');
