import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const cardsGrid = readFileSync(new URL('./screens/PhoenixCardsGrid.tsx', import.meta.url), 'utf8');
const payables = readFileSync(new URL('./screens/PhoenixPayablesV15.tsx', import.meta.url), 'utf8');
const movements = readFileSync(new URL('./screens/PhoenixMovementsV15.tsx', import.meta.url), 'utf8');
const readScreens = readFileSync(new URL('./screens/PhoenixReadScreens.tsx', import.meta.url), 'utf8');
const cardProjection = readFileSync(new URL('./data/card-movement-projection.ts', import.meta.url), 'utf8');
const cardDates = readFileSync(new URL('./data/card-dates.ts', import.meta.url), 'utf8');
const cardsMobileV7 = readFileSync(new URL('./phoenix-cards-mobile-v7.css', import.meta.url), 'utf8');
const cardsMobileV8 = readFileSync(new URL('./phoenix-cards-mobile-v8.css', import.meta.url), 'utf8');

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
assert.match(payables, /const rawSigned = Number\(event\.signedAmount\);/,
  'Pendentes legados devem ler o signedAmount canônico antes do fallback');
assert.match(payables, /rawSigned !== 0/,
  'Pendentes legados devem detectar signedAmount zerado como dado legado incompleto');
assert.match(payables, /-Math\.abs\(Number\(event\.amount \|\| 0\)\)/,
  'Pendentes legados devem recuperar despesas antigas pelo amount quando signedAmount estiver zerado');
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

assert.match(movements, /const rawSigned = Number\(event\.signedAmount\);/,
  'Lançamentos devem ler o signedAmount canônico antes do fallback');
assert.match(movements, /rawSigned !== 0/,
  'Lançamentos devem detectar signedAmount zerado como dado legado incompleto');
assert.match(movements, /visualType === 'expense' \? -amount/,
  'Lançamentos devem recuperar o sinal da despesa legada pelo amount');
assert.match(cardProjection, /const statementEffect = Number\(entry\.amount \|\| 0\)/,
  'Projeção de parcelas deve preservar o efeito assinado da linha da fatura');
assert.match(cardProjection, /signedAmount: -statementEffect/,
  'Créditos de cartão devem virar signedAmount positivo em Lançamentos');
assert.doesNotMatch(cardProjection, /const amount = Math\.abs\(Number\(entry\.amount/,
  'Projeção não pode destruir o sinal do estorno antes de montar signedAmount');
assert.match(cardProjection, /const dueDate = cardDueDateForStatement\(entry\.statementMonth, card\.closingDay, card\.dueDay\)/,
  'Projeção deve calcular o vencimento final de cada parcela antes de decidir em qual mês ela aparece.');
assert.match(cardProjection, /const dueCompetence = cardCompetenceFromDueDate\(dueDate\)[\s\S]*if \(dueCompetence !== month\) continue/,
  'Grade de Lançamentos deve filtrar cartão pela competência do vencimento, não pelo statementMonth.');
assert.match(cardProjection, /competence: dueCompetence/,
  'Evento projetado do cartão deve carregar a competência do vencimento final.');
assert.doesNotMatch(cardProjection, /if \(entry\.statementMonth !== month\) continue/,
  'Fatura interna não pode voltar a determinar diretamente a competência visual.');
assert.match(cardDates, /weekday === 6[\s\S]*setUTCDate\(date\.getUTCDate\(\) \+ 2\)[\s\S]*weekday === 0[\s\S]*\+ 1/,
  'Regra compartilhada deve prorrogar sábado e domingo para a segunda-feira seguinte.');
assert.match(cardDates, /cardCompetenceFromDueDate[\s\S]*dueDate\.slice\(0, 7\)/,
  'Competência visual deve ser derivada do vencimento final já ajustado.');


assert.match(cardsGrid, /px-cards-native-v8/,
  'APK deve usar a composição Cartões V8 sem alterar a visão desktop.');
assert.match(cardsGrid, /px-cards-v8-carousel-shell[\s\S]*focusNativeCard/,
  'Tela móvel deve oferecer carrossel de cartões com seleção explícita.');
assert.match(cardsGrid, /px-cards-v8-kpis[\s\S]*Limite total[\s\S]*Disponível[\s\S]*Fatura atual[\s\S]*Vencimento/,
  'Cockpit móvel deve mostrar somente os quatro KPIs essenciais sob o cartão.');
assert.match(cardsGrid, /px-cards-v8-recent[\s\S]*Lançamentos da fatura[\s\S]*cardRowPresentation/,
  'Tela principal deve agrupar lançamentos por contexto visual em vez de expor classificação genérica.');
assert.match(cardsGrid, /function cardRowPresentation[\s\S]*Internet[\s\S]*Viagem[\s\S]*Streaming[\s\S]*Mercado[\s\S]*Farmácia/,
  'Apresentação dos lançamentos deve reconhecer categorias amigáveis e ícones contextuais.');
assert.match(cardsGrid, /name === 'wifi'/,
  'Internet deve possuir ícone próprio no agrupamento móvel.');
assert.match(cardsGrid, /px-cards-v8-command-recent[\s\S]*Lançamentos recentes/,
  'Resumo da Central móvel deve priorizar lançamentos recentes, como no mock aprovado.');
assert.match(cardsMobileV8, /\.px-main-cards>\.px-content-cards\{[\s\S]*overflow:hidden!important/,
  'Tela principal de Cartões V8 não deve possuir rolagem externa.');
assert.match(cardsMobileV8, /\.px-cards-v8-carousel\{[\s\S]*scroll-snap-type:x mandatory!important/,
  'Carrossel móvel deve usar snap central para experiência de app bancário.');
assert.match(cardsMobileV8, /\.px-cards-v8-art>img:not\(\.px-brand-asset\)\{[\s\S]*object-fit:contain!important/,
  'Arte dos cartões deve permanecer inteira no enquadramento, sem corte.');
assert.match(cardsMobileV8, /\.px-cards-v8-kpis\{[\s\S]*grid-template-columns:repeat\(4,minmax\(0,1fr\)\)!important/,
  'Quatro KPIs devem caber em uma única faixa compacta.');
assert.match(cardsMobileV8, /\.px-card-command-approved-cardbox\{[\s\S]*display:block!important/,
  'Central móvel deve exibir o cartão protagonista.');
assert.match(cardsMobileV8, /\.px-card-command-approved-kpis>\.icon-kpi:nth-child\(2\)[\s\S]*nth-child\(4\)[\s\S]*nth-child\(5\)/,
  'Central móvel deve reduzir KPIs aos três principais da referência aprovada.');
assert.match(cardsMobileV8, /\.px-card-command-approved-data\{[\s\S]*overflow:hidden!important/,
  'Central do Cartão não deve rolar como um todo.');
assert.match(cardsMobileV8, /\.px-card-command-approved-table-wrap\{[\s\S]*overflow-y:auto!important/,
  'Somente a lista detalhada de lançamentos da Central pode rolar verticalmente.');
assert.match(cardsMobileV8, /\.px-card-command-approved-tabs\{[\s\S]*grid-template-columns:repeat\(5,minmax\(0,1fr\)\)!important/,
  'As cinco abas da Central devem permanecer visíveis simultaneamente.');

assert.match(readScreens, /creditAwarePendingModel/,
  'Compatibilidade de crédito legado deve continuar ativa durante a transição');

console.log('Phoenix canonical card statement contract: OK');
