import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const panel = readFileSync(new URL('./screens/EvolutionParityPanels.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('./styles/evolution-parity.css', import.meta.url), 'utf8');

assert.match(
  panel,
  /data-meg-reports-structure="dynamic-analysis-v1"/,
  'Relatórios deve declarar o contrato estrutural vigente.'
);

assert.match(
  panel,
  /data\.events\.filter\(event=>posted\(event\.status\)&&event\.type!=='transfer'&&!isBenefit\(event\)\)/,
  'Relatórios deve partir apenas de movimentos realizados, sem transferências e benefício.'
);

for (const tab of [
  "['expenses','Despesas']",
  "['income','Receitas']",
  "['cashflow','Fluxo de caixa']",
  "['categories','Categorias']",
]) {
  assert.ok(panel.includes(tab), `Aba de relatório ausente: ${tab}`);
}

for (const option of [
  '<option value="category">Categoria</option>',
  '<option value="account">Conta</option>',
  '<option value="method">Forma de pagamento</option>',
  '<option value="status">Status</option>',
  '<option value="type">Tipo</option>',
  '<option value="month">Competência</option>',
]) {
  assert.ok(panel.includes(option), `Dimensão analítica ausente: ${option}`);
}

for (const metric of [
  '<option value="total">Valor total</option>',
  '<option value="count">Quantidade</option>',
  '<option value="average">Média</option>',
]) {
  assert.ok(panel.includes(metric), `Métrica analítica ausente: ${metric}`);
}

assert.match(
  panel,
  /exportExcel\('meg-relatorio-'\+dimension\+'\.xls',exportRows\)/,
  'Exportação deve continuar usando o recorte corrente por dimensão.'
);

assert.match(
  panel,
  /label="Lançamentos analisados"[^>]*value=\{realized\.length\} format="integer"/,
  'Quantidade de lançamentos não pode voltar a ser formatada como moeda.'
);

assert.match(
  panel,
  /groups\.slice\(0,12\)\.map\(item=>/,
  'Visual analítico deve preservar os grupos dinâmicos do recorte atual.'
);

assert.match(
  panel,
  /Leitura automática do recorte atual\. Nenhuma movimentação é feita pelo Copilot\./,
  'Financial Copilot deve permanecer somente analítico, sem autoridade de movimentação.'
);

for (const heading of ['Grupo','Quantidade','Total','Média','Participação']) {
  assert.ok(panel.includes('<th>'+heading+'</th>'), `Coluna ausente na tabela dinâmica: ${heading}`);
}

assert.match(
  css,
  /\.evo-report-builder\{display:grid;grid-template-columns:/,
  'Construtor de relatório deve preservar composição em grade.'
);
assert.match(
  css,
  /\.evo-copilot-layout\{display:grid;grid-template-columns:minmax\(0,1\.65fr\) minmax\(280px,\.75fr\)/,
  'Desktop deve preservar análise e Copilot lado a lado.'
);
assert.match(
  css,
  /@media\(max-width:980px\)[\s\S]*\.evo-copilot-layout\{grid-template-columns:1fr\}[\s\S]*\.evo-financial-copilot\{display:none\}/s,
  'Em largura reduzida, o conteúdo analítico deve priorizar a leitura principal.'
);
assert.match(
  css,
  /@media\(max-width:720px\)[\s\S]*\.evo-report-builder\{grid-template-columns:1fr 1fr\}[\s\S]*\.evo-reports-copilot \.meg-module-metrics\{grid-template-columns:1fr 1fr\}/s,
  'Em 430 px, filtros e KPIs devem recompor sem espremimento.'
);

console.log('Contrato estrutural Evolution: Relatórios dinâmicos e Financial Copilot validados.');
