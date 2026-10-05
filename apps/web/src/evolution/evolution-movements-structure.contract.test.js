import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const screen = readFileSync(new URL('./screens/EvolutionSystem.tsx', import.meta.url), 'utf8');
const parity = readFileSync(new URL('./styles/evolution-parity.css', import.meta.url), 'utf8');
const smartGrid = readFileSync(new URL('./styles/smart-grid.css', import.meta.url), 'utf8');

assert.match(
  screen,
  /data-meg-movements-structure="smart-grid-v1"/,
  'Lançamentos deve declarar o contrato estrutural vigente.'
);

assert.match(
  screen,
  /data-smart-grid="movements"/,
  'Lançamentos deve continuar usando o MEG Smart Grid.'
);

assert.match(
  screen,
  /className="meg-scroll" data-meg-scroll-region="true"/,
  'A tabela deve rolar dentro da própria região, sem criar rolagem geral.'
);

for (const label of ['Data','Descrição','Categoria','Conta','Forma','Status','Valor']) {
  assert.ok(
    screen.includes(`EvolutionSmartGridFilter label="${label}"`),
    `Filtro de coluna ausente em Lançamentos: ${label}`
  );
}

for (const binding of [
  'event.description',
  'event.category?.name',
  'event.account?.name',
  'event.paymentMethod?.name',
  'posted(event.status)',
  'money(Math.abs(signed(event)))',
]) {
  assert.ok(screen.includes(binding), `Ligação real ausente em Lançamentos: ${binding}`);
}

assert.match(
  screen,
  /className="meg-row-edit"[^>]*onClick=\{\(\)=>onEdit\(event\)\}/,
  'A edição de lançamento deve continuar disponível por linha.'
);

assert.match(
  screen,
  /<span title=\{event\.description\}>\{event\.description\}<\/span>/,
  'Descrição truncável deve preservar o texto completo como dica.'
);

assert.match(
  smartGrid,
  /\.meg-excel-table td:nth-child\(7\)\{[^}]*white-space:nowrap/s,
  'Valores financeiros da grade não podem quebrar ou truncar.'
);

assert.match(
  parity,
  /@media\(max-width:1050px\)[\s\S]*\.meg-excel-table\{min-width:1050px\}/s,
  'Desktop reduzido deve preservar a densidade da grade dentro da rolagem interna.'
);

assert.match(
  parity,
  /@media\(max-width:720px\)[\s\S]*\.meg-excel-table\{min-width:980px\}/s,
  'Em 430 px a grade deve manter estrutura própria e rolagem interna, sem comprimir colunas críticas.'
);

assert.match(
  smartGrid,
  /@media\(max-width:720px\)[\s\S]*\.evo-smart-filter-popover\{[^}]*bottom:10px!important[^}]*width:auto!important/s,
  'Filtros do Smart Grid devem recompor como superfície móvel em 430 px.'
);

assert.ok(
  !/events\.reduce\([^\n]*category|groupByCategory|groupedByCategory/.test(screen),
  'Lançamentos não deve voltar a agrupar registros por categoria.'
);

console.log('Contrato estrutural Evolution: Lançamentos e Smart Grid validados.');
