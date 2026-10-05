import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const panel = readFileSync(new URL('./screens/EvolutionParityPanels.tsx', import.meta.url), 'utf8');
const parityCss = readFileSync(new URL('./styles/evolution-parity.css', import.meta.url), 'utf8');
const systemCss = readFileSync(new URL('./styles/system.css', import.meta.url), 'utf8');

assert.match(
  panel,
  /data-meg-cashflow-structure="daily-position-v1"/,
  'Fluxo de Caixa deve declarar o contrato estrutural vigente.'
);

for (const tab of [
  "['summary','Resumo']",
  "['income','Entradas']",
  "['expense','Saídas']",
]) {
  assert.ok(panel.includes(tab), `Aba ausente no Fluxo de Caixa: ${tab}`);
}

assert.match(
  panel,
  /visible=days\.filter\(day=>tab==='summary'\|\|tab==='income'&&Number\(day\.income\)>0\|\|tab==='expense'&&Number\(day\.expense\)>0\)/,
  'Abas devem filtrar os dias pelos dados reais de entradas e saídas.'
);

assert.match(panel,/value=\{data\.cashflow\.totalIncome\}/,'Entradas devem usar o total real do fluxo.');
assert.match(panel,/value=\{data\.cashflow\.totalExpense\}/,'Saídas devem usar o total real do fluxo.');
assert.match(panel,/value=\{result\}/,'Resultado deve permanecer derivado de entradas menos saídas.');
assert.match(panel,/value=\{data\.cashflow\.realizedClosing\}/,'Fechamento realizado deve vir do domínio financeiro.');

assert.match(
  panel,
  /days\.slice\(-31\)\.map\(day=>/,
  'Evolução diária deve preservar até 31 dias do período.'
);
assert.match(
  panel,
  /Number\(day\.income\|\|0\)\/max\*100/,
  'Barras de entrada devem manter escala calculada a partir dos dados.'
);
assert.match(
  panel,
  /Number\(day\.expense\|\|0\)\/max\*100/,
  'Barras de saída devem manter escala calculada a partir dos dados.'
);

for (const heading of ['Data','Entradas','Saídas','Saldo realizado','Projetado']) {
  assert.ok(panel.includes('<th>'+heading+'</th>'), `Coluna ausente no Fluxo de Caixa: ${heading}`);
}

assert.match(
  panel,
  /money\(day\.realizedBalance\)/,
  'Tabela deve preservar saldo realizado por dia.'
);
assert.match(
  panel,
  /money\(day\.projectedBalance\)/,
  'Tabela deve preservar saldo projetado por dia.'
);
assert.match(
  panel,
  /money\(data\.cashflow\.openingBalance\)/,
  'Posição do período deve preservar saldo inicial.'
);
assert.match(
  panel,
  /money\(data\.cashflow\.projectedClosing\)/,
  'Posição do período deve preservar fechamento projetado.'
);

assert.match(
  panel,
  /<div className="meg-scroll"><table className="meg-table">/,
  'Tabela diária deve rolar internamente, sem depender de scroll global.'
);

assert.match(
  parityCss,
  /\.evo-daily-bars,.evo-trend-chart\{height:150px;display:flex;align-items:flex-end;/,
  'Gráfico diário deve manter composição compacta e previsível.'
);

assert.match(
  systemCss,
  /@media\(max-width:720px\)[\s\S]*\.meg-data-with-summary\{display:flex;flex-direction:column;gap:7px\}/s,
  'Em 430 px, áreas densas devem recompor em coluna.'
);

console.log('Contrato estrutural Evolution: Fluxo de Caixa, posição diária e projeção validados.');
