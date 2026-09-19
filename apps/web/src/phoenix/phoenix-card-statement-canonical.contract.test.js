import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const cardsGrid = readFileSync(new URL('./screens/PhoenixCardsGrid.tsx', import.meta.url), 'utf8');
const payables = readFileSync(new URL('./screens/PhoenixPayablesV15.tsx', import.meta.url), 'utf8');
const movements = readFileSync(new URL('./screens/PhoenixMovementsV15.tsx', import.meta.url), 'utf8');
const readScreens = readFileSync(new URL('./screens/PhoenixReadScreens.tsx', import.meta.url), 'utf8');
const cardProjection = readFileSync(new URL('./data/card-movement-projection.ts', import.meta.url), 'utf8');

assert.match(cardsGrid, /tx\.amount !== undefined \? parseNumber\(tx\.amount\) : parseNumber\(tx\.expenseAmount\)/,
  'Cartões devem preservar o sinal do amount legado antes do expenseAmount absoluto');
assert.match(cardsGrid, /hasCanonicalCurrent \? selected!\.statement!\.netAmount/,
  'Fatura atual deve preferir o total canônico devolvido pelo backend na competência efetiva do cartão');
assert.match(cardsGrid, /hasCanonicalCurrent[\s\S]*selected!\.statement!\.charges/,
  'Compras da fatura devem vir do resumo canônico quando a competência efetiva possui statement oficial');
assert.match(cardsGrid, /hasCanonicalCurrent[\s\S]*selected!\.statement!\.credits/,
  'Créditos e estornos devem vir do resumo canônico quando a competência efetiva possui statement oficial');
assert.match(cardsGrid, /const canonicalRows = useMemo<GridRow\[\]>/,
  'A grade da fatura atual deve ser materializada pelas mesmas linhas canônicas do resumo');
assert.match(cardsGrid, /amount: Number\(line\.effect \|\| 0\)/,
  'Linhas da fatura atual devem preservar o efeito financeiro canônico, inclusive estornos');
assert.match(cardsGrid, /currentRows = canonicalRows\.length && selected\?\.statement\?\.month === currentCardMonth/,
  'A fatura atual deve preferir linhas canônicas quando elas pertencem à competência efetiva do cartão');

assert.match(payables, /line\.source === 'card-installment'/,
  'Writer de fatura só pode ser usado quando todas as linhas forem do domínio oficial de cartões');
assert.match(payables, /const officialLines = card\.statement\.lines[\s\S]*line\.isOpen && line\.source === 'card-installment'/,
  'Pendentes deve separar parcelas oficiais de eventos canônicos antes de montar o writer da fatura');
assert.match(payables, /if \(!officialLines\.length\) return \[\];/,
  'Fatura canônica composta apenas por eventos não pode virar um item card duplicado em Pendentes');
assert.doesNotMatch(payables, /Number\(card\.statementAmount \?\? card\.payableStatementAmount/,
  'Fallback de Pendentes não pode transformar o total canônico inteiro em saldo oficial do cartão');
assert.match(payables, /representedEventIds/,
  'Eventos já representados pela fatura oficial não podem ser duplicados em Pendentes');
assert.match(payables, /const officialSignatures = new Set\(official\.map\(signature\)\)/,
  'Dedupe de Pendentes deve existir somente contra compromissos oficiais');
assert.doesNotMatch(payables, /seen\.add\(key\)/,
  'Pendentes não pode colapsar dois lançamentos reais só porque têm mesma descrição, data e valor');
assert.match(payables, /openAmount: -Number\(event\.signedAmount \|\| 0\)/,
  'Pendentes legados devem usar signedAmount para preservar compras e estornos');
assert.match(payables, /isBatchSelectable/,
  'Pendentes deve reconhecer créditos de cartão como parte do lote líquido');
assert.match(payables, /Selecionar fatura líquida/,
  'Agrupamento legado de cartão deve permitir selecionar a fatura líquida, incluindo estornos');
assert.match(payables, /function pendingObligationCount\(items: PendingItem\[\]\)/,
  'Pendentes deve contar faturas legadas como um compromisso, não como dezenas de parcelas');
assert.match(payables, /const legacyCards = new Set/,
  'Contagem de compromissos deve consolidar cartão legado por forma e vencimento');
assert.match(payables, /\{blocks\.length\} compromisso\(s\)/,
  'Cabeçalho por data deve mostrar quantidade de compromissos visuais consolidados');
assert.match(payables, /Fatura · \{block\.items\[0\]\.paymentMethod\}/,
  'Grupo legado deve ser identificado visualmente como fatura líquida');

assert.match(payables, /selectedTotal <= 0/,
  'Faturas zeradas ou credoras não podem gerar pagamento');

assert.match(movements, /const signed = Number\(event\.signedAmount \|\| 0\)/,
  'Lançamentos devem calcular o efeito visual a partir do mesmo signedAmount canônico');
assert.match(cardProjection, /const statementEffect = Number\(entry\.amount \|\| 0\)/,
  'Projeção de parcelas deve preservar o efeito assinado da linha da fatura');
assert.match(cardProjection, /signedAmount: -statementEffect/,
  'Créditos de cartão devem virar signedAmount positivo em Lançamentos');
assert.doesNotMatch(cardProjection, /const amount = Math\.abs\(Number\(entry\.amount/,
  'Projeção não pode destruir o sinal do estorno antes de montar signedAmount');

assert.match(readScreens, /creditAwarePendingModel/,
  'Compatibilidade de crédito legado deve continuar ativa durante a transição');

console.log('Phoenix canonical card statement contract: OK');
