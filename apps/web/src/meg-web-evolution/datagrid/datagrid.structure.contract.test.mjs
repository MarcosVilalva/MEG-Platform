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
assert.ok(filterSource.includes('visible.slice(0, visibleLimit)'), 'Listas grandes devem limitar a primeira renderização.');
assert.ok(filterSource.includes('useState(200)'), 'Janela inicial de valores não pode ultrapassar 200.');
assert.ok(filterSource.includes('setVisibleLimit((current) => current + 200)'), 'Todos os distintos devem permanecer alcançáveis por paginação incremental.');
assert.ok(filterSource.includes('visible.map((option) => option.key)'), 'Selecionar tudo deve operar sobre todos os valores pesquisados, não só sobre a janela renderizada.');
assert.ok(filterSource.includes("'1 selecionado'"), 'Resumo singular de seleção ausente.');
assert.ok(filterSource.includes('Selecionar tudo ({visible.length})'), 'Selecionar tudo deve exibir a contagem filtrada.');
assert.ok(filterSource.includes('data-filter-scroll-region="values"'), 'Lista de valores deve expor a região rolável única.');
assert.ok(css.includes('background: #031c1f;'), 'thead sticky precisa de fundo opaco.');

const minWidthBreakpoints = [...css.matchAll(/@media\s*\(min-width:\s*(\d+)px\)/g)].map((match) => Number(match[1]));
assert.deepEqual([...new Set(minWidthBreakpoints)].sort((a, b) => a - b), [640, 900, 1024], '900px é a única exceção técnica autorizada para tabela compacta.');
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

assert.ok(filterSource.includes('meg-datagrid-date-year__toggle'));
assert.ok(filterSource.includes('aria-expanded={expanded}'));
assert.ok(filterSource.includes("{expanded ? '−' : '+'}"));
assert.ok(css.includes('.meg-datagrid-mobile-filter-column select option'));
assert.ok(css.includes('color-scheme: dark'));

assert.ok(dataGridSource.includes('meg-datagrid-toolbar__filters'), 'Filtros ativos devem ficar dentro da toolbar.');
assert.ok(dataGridSource.includes('activeFilterItems.slice(0, visibleChipLimit)'), 'Toolbar deve limitar chips pelo espaço responsivo.');
assert.ok(dataGridSource.includes('const visibleChipLimit = compactToolbar || compactMobileChips ? 1 : 2;'), 'Desktop conserva dois chips; em larguras até 760px a toolbar exibe um chip e mantém +N filtros.');
assert.ok(dataGridSource.includes("window.matchMedia('(max-width: 599px)')"), 'Tela móvel abaixo de 600px deve limitar chips e manter texto legível.');
assert.ok(dataGridSource.includes('meg-datagrid-more-filters'), 'Overflow de filtros deve usar botão +N filtros.');
assert.ok(dataGridSource.includes('data-datagrid-active-filters-popover'), 'Popover de todos os filtros ativos ausente.');
assert.ok(filterSource.includes('formatDateSummaryValue'), 'Resumo de data deve usar dd/mm/aaaa.');
assert.ok(filterSource.includes('filterOperatorLabel'), 'Resumo de filtro deve preservar o operador.');
assert.ok(filterSource.includes('operatorLabel ? \`${operatorLabel} ${value}\` : value'), 'Filtros por operador devem exibir operador + valor.');
assert.ok(dataGridSource.includes('filterTooltipSummary'), 'Tooltip deve expandir valores selecionados.');
assert.ok(dataGridSource.includes('values.slice(0, 5)'), 'Tooltip deve limitar valores selecionados aos cinco primeiros.');
assert.ok(dataGridSource.includes('hiddenFiltersTooltip'), 'Botão +N filtros deve listar filtros ocultos no tooltip.');
assert.ok(dataGridSource.includes('onFocus={(event) => showTooltip'), 'Tooltips devem abrir por foco de teclado.');
assert.ok(dataGridSource.includes('data-datagrid-tooltip'), 'Tooltip acessível do DataGrid ausente.');
assert.ok(dataGridSource.includes('useLayoutEffect'), 'Tooltip deve medir a largura real antes do posicionamento.');
assert.ok(dataGridSource.includes('tooltip.getBoundingClientRect()'), 'Tooltip deve usar sua geometria real para centralização.');
assert.ok(dataGridSource.includes('triggerCenter - tooltipWidth / 2'), 'Tooltip deve centralizar pela largura renderizada.');
assert.ok(dataGridSource.includes('window.innerWidth - tooltipWidth - margin'), 'Tooltip deve ser limitado à viewport.');
assert.ok(dataGridSource.includes('meg-datagrid-active-filter-row__summary'), 'Popover de filtros ativos deve usar linhas de lista.');
assert.equal(dataGridSource.includes('meg-datagrid-filter-chip--popover'), false, 'Popover não pode voltar ao formato pílula.');
assert.ok(css.includes('.meg-datagrid-active-filter-row') && css.includes('border-radius: .5rem;'), 'Linha do popover deve usar raio de 8px.');
assert.ok(css.includes('.meg-datagrid-active-filter-row__summary') && css.includes('white-space: normal;'), 'Resumo do popover não pode truncar.');
assert.ok(css.includes('min-height: 3rem') && css.includes('.meg-datagrid-table thead'), 'Cabeçalho sticky precisa de altura mínima.');

assert.ok(dataGridSource.includes('meg-datagrid-filtered-empty'), 'Estado vazio filtrado deve preservar o corpo responsivo.');
assert.ok(css.includes('@media (min-width: 900px) and (width < 1024px) and (max-height: 500px)'), 'Exceção de tabela compacta deve iniciar em 900px.');
assert.equal(css.includes('@media (min-width: 640px) and (width < 1024px) and (max-height: 500px)'), false, 'Tabela compacta não pode ser ativada em 640–899px.');
assert.ok(css.includes('@media (min-width: 640px) and (width < 900px)'), 'Toolbar responsiva de cards 640–899px ausente.');
assert.ok(dataGridSource.includes('name="meg-datagrid-page-size"'), 'Seletor Mostrar deve possuir name.');
assert.ok(dataGridSource.includes('name="meg-datagrid-select-all-table"'), 'Checkbox de seleção da tabela deve possuir name.');
assert.ok(dataGridSource.includes('renderPaginationFooter'), 'Rodapé de paginação deve ser reutilizado também no vazio filtrado.');
assert.ok(dataGridSource.includes('{renderPaginationFooter()}'), 'Estado vazio filtrado deve renderizar o rodapé.');
assert.ok(css.includes('.meg-datagrid-footer {\n  flex: 0 0 auto;'), 'Rodapé deve permanecer fora da área flexível do corpo.');
assert.ok(dataGridSource.includes('Filtros ({activeFilterKeys.length})'), 'Botão Filtros (N) deve exibir contagem inclusive zero.');
assert.ok(css.includes('.meg-datagrid-filtered-empty .meg-datagrid-table'), 'Tabela do estado vazio filtrado deve permanecer visível.');
assert.ok(css.includes('@media (max-height: 640px)') && css.includes('.meg-datagrid-footer'), 'Baixa altura deve compactar o rodapé.');
