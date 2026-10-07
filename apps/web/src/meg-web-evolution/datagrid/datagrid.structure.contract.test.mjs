import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const dataGridSource = readFileSync(join(here, 'DataGrid.tsx'), 'utf8');
const filterSource = readFileSync(join(here, 'FilterPanel.tsx'), 'utf8');
const coreSource = readFileSync(join(here, 'core.ts'), 'utf8');
const typeSource = readFileSync(join(here, 'types.ts'), 'utf8');
const css = readFileSync(join(here, 'datagrid.css'), 'utf8');
const fixtureSource = readFileSync(join(here, 'harness-fixture.ts'), 'utf8');
const harnessSource = readFileSync(join(here, 'harness-main.tsx'), 'utf8');

for (const prop of [
  'data:',
  'columns:',
  'pageSize?:',
  'groupBy?:',
  'selectable?:',
  'footerAggregates?:',
  'onFilterChange?:',
]) {
  assert.ok(typeSource.includes(prop), `Contrato DataGrid ausente: ${prop}`);
}
for (const columnProp of ['key:', 'label:', 'type:', 'width?:', 'minWidth?:', 'sortable?:', 'filterable?:', 'render?:', 'aggregate?:']) {
  assert.ok(typeSource.includes(columnProp), `Contrato de coluna ausente: ${columnProp}`);
}
assert.match(typeSource, /'text' \| 'number' \| 'currency' \| 'date' \| 'enum' \| 'boolean'/);
assert.match(typeSource, /'sum' \| 'count' \| 'avg'/);
assert.ok(typeSource.includes('persistenceKey?:'));
assert.ok(typeSource.includes('rowKey?:'));

for (const text of ['Contém', 'Não contém', 'Começa com', 'Termina com', 'É igual a', 'Está vazio']) {
  assert.ok(filterSource.includes(text), `Filtro TEXT não contém "${text}"`);
}
for (const text of ['=', '≠', '>', '≥', '<', '≤', 'Entre']) {
  assert.ok(filterSource.includes(text), `Filtro NUMBER/CURRENCY não contém "${text}"`);
}
for (const text of ['Está entre', 'Antes de', 'Depois de', 'Hoje', 'Esta semana', 'Este mês', 'Mês passado', 'Últimos 30 dias', 'Este ano']) {
  assert.ok(filterSource.includes(text), `Filtro DATE não contém "${text}"`);
}
for (const text of ['Selecionar tudo', 'Todos', 'Sim', 'Não', 'Limpar', 'Aplicar']) {
  assert.ok(filterSource.includes(text), `Filtro obrigatório não contém "${text}"`);
}
assert.ok(filterSource.includes('new Date()'), 'Atalhos de data devem usar new Date() em runtime.');

assert.match(coreSource, /Object\.entries\(filters\)\.every/);
assert.match(coreSource, /selected\.includes\(distinctKey\(value\)\)/);
assert.match(dataGridSource, /applyFilters\(data, columns, filters, column\.key\)/);

assert.ok(dataGridSource.includes('event.shiftKey'), 'Shift+clique para multi-sort ausente.');
assert.ok(dataGridSource.includes('aria-sort='));
assert.ok(dataGridSource.includes('Selecionar todos os itens filtrados'));
assert.ok(dataGridSource.includes('aria-expanded={expanded}'), 'aria-expanded de grupo ausente.');
assert.ok(dataGridSource.includes('aggregateRows('));
assert.ok(coreSource.includes("'\\uFEFF'"), 'CSV deve possuir BOM UTF-8.');
assert.ok(coreSource.includes("meg-web-evolution:datagrid:"));
assert.ok(coreSource.includes('total <= 500'));
assert.ok(dataGridSource.includes('data-virtualized='));
assert.ok(dataGridSource.includes('rowKey ??'), 'DataGrid precisa de chave estável de linha.');
assert.ok(dataGridSource.includes('data-row-key={key}'), 'Linha real precisa expor chave estável.');
assert.ok(dataGridSource.includes('key={key}'), 'Linha real precisa usar chave estável no React.');
assert.equal(/data-grid-row[\\s\\S]{0,240}key=\\{index\\}/.test(dataGridSource), false, 'Índice visual não pode ser chave de linha real.');

assert.ok(dataGridSource.includes('onPointerDown={(event) => beginResize(event, column)}'));
assert.ok(dataGridSource.includes('role="separator"'));
assert.ok(dataGridSource.includes('draggable'));
assert.ok(dataGridSource.includes('ColumnManager'));
assert.ok(dataGridSource.includes('Mover '));
assert.ok(dataGridSource.includes('hiddenColumns'));

for (const text of ['Carregando dados', 'Nenhum dado disponível', 'Nenhum resultado com os filtros atuais', 'Limpar tudo']) {
  assert.ok(dataGridSource.includes(text), `Estado obrigatório ausente: ${text}`);
}
assert.equal(dataGridSource.includes('>Limpar filtros</button>'), false, 'Estado vazio não deve duplicar a ação de limpeza.');

assert.ok(dataGridSource.includes('role="dialog"'));
assert.ok(dataGridSource.includes("event.key === 'Escape'"));
assert.ok(dataGridSource.includes('previous?.focus()'));
assert.ok(dataGridSource.includes("event.key !== 'Tab'"));
assert.ok(dataGridSource.includes('aria-modal="false"'));
assert.equal(dataGridSource.includes('data-datagrid-low-height-sheet'), false, 'Popover não pode voltar a usar bottom sheet por baixa altura.');
assert.ok(dataGridSource.includes('aria-expanded={mobileFiltersOpen}'));
assert.ok(dataGridSource.includes('aria-haspopup="dialog"'));
assert.ok(dataGridSource.includes("document.addEventListener('pointerdown'"), 'Popover deve fechar em clique fora.');
assert.ok(dataGridSource.includes("window.addEventListener('resize'"), 'Popover deve reposicionar em resize.');
assert.ok(dataGridSource.includes("window.addEventListener('scroll'"), 'Popover deve reposicionar em scroll.');
assert.ok(filterSource.includes("visible.slice(0, 200)"), 'Listas grandes devem limitar renderização.');
assert.ok(filterSource.includes("'1 selecionado'"), 'Resumo singular de seleção ausente.');

const minWidthBreakpoints = [...css.matchAll(/@media\s*\(min-width:\s*(\d+)px\)/g)].map((match) => Number(match[1]));
assert.deepEqual([...new Set(minWidthBreakpoints)].sort((a, b) => a - b), [640, 1024]);
assert.equal(/@media\s*\(max-width:/.test(css), false, 'DataGrid não deve criar breakpoints max-width paralelos.');
assert.ok(css.includes('.meg-datagrid-table {\n  display: none;'));
assert.ok(css.includes('@media (min-width: 1024px)'));
assert.ok(css.includes('.meg-datagrid-table {\n    width: 100%;\n    display: table;'));
assert.ok(css.includes('.meg-datagrid-cards {\n    display: none;'));
assert.ok(css.includes('position: sticky;'), 'Header/footer sticky ausente.');
assert.ok(css.includes('overflow-x: hidden;'), 'Rolagem horizontal deve permanecer confinada/oculta fora do desktop.');
assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'));

assert.ok(harnessSource.includes('<AppShell>'));
assert.ok(harnessSource.includes('<DataGrid'));
assert.ok(harnessSource.includes('pageSize={600}'));
assert.ok(harnessSource.includes("'stage-04-harness'"), 'Harness precisa de chave de persistência isolada.');
assert.ok(fixtureSource.includes('Fixture exclusivamente técnica'));
assert.equal(/Login|Loading|Home funcional|Novo Lançamento|Pendentes|Cartões/.test(harnessSource), false);

const combined = [dataGridSource, filterSource, coreSource, fixtureSource, harnessSource].join('\n');
for (const forbidden of [
  '/phoenix/',
  '/web-next/',
  '/mobile/',
  'legacy-finance',
  'financial-policy',
  'monetary-protection',
  'card-statement-canonical',
]) {
  assert.equal(combined.includes(forbidden), false, `Dependência proibida no DataGrid: ${forbidden}`);
}

for (const forbiddenName of [
  'availableBalance',
  'statementAmount',
  'creditLimit',
  'installmentAmount',
  'competence',
  'openingBalance',
]) {
  assert.equal(combined.includes(forbiddenName), false, `Regra financeira indevida no DataGrid: ${forbiddenName}`);
}

console.log('MEG Web Evolution DataGrid structural contract: OK');
