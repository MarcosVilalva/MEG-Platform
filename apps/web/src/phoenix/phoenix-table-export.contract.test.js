import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const bridge = readFileSync(new URL('./phoenix-table-export-bridge.ts', import.meta.url), 'utf8');
const core = readFileSync(new URL('./table-export-core.ts', import.meta.url), 'utf8');
const styles = readFileSync(new URL('./phoenix-table-export.css', import.meta.url), 'utf8');
const main = readFileSync(new URL('../app/main.tsx', import.meta.url), 'utf8');
const preview = readFileSync(new URL('./preview-main.tsx', import.meta.url), 'utf8');

assert.match(main, /phoenix-table-export-bridge/,
  'Runtime Phoenix deve carregar a exportação global das tabelas');
assert.match(preview, /phoenix-table-export-bridge/,
  'Preview Phoenix deve carregar a mesma exportação global usada no runtime oficial');

assert.match(bridge, /\.phoenix-v15 table/,
  'Exportação deve cobrir tabelas da Phoenix sem exigir implementação individual por tela');
assert.match(bridge, /buildPhoenixXlsx/,
  'Exportação Excel deve gerar arquivo XLSX real');
assert.match(bridge, /buildPhoenixPdf/,
  'Exportação deve oferecer PDF');
assert.match(bridge, /collectFilters/,
  'Exportação deve registrar os filtros ativos da visão');
assert.match(bridge, /collectPeriod/,
  'Exportação deve registrar o período correspondente aos dados visíveis');
assert.match(bridge, /recordCount: rows\.length/,
  'Quantidade exportada deve refletir as linhas filtradas presentes na tabela');

assert.match(core, /openxmlformats-officedocument\.spreadsheetml\.sheet/,
  'Excel deve usar pacote OpenXML XLSX');
assert.match(core, /<autoFilter ref=/,
  'Planilha deve abrir com autofiltro habilitado');
assert.match(core, /SUBTOTAL\(109,/,
  'Totais do Excel devem recalcular ao filtrar a planilha');
assert.match(core, /totalsRowShown="1"/,
  'Tabela Excel deve possuir linha de totais');
assert.match(core, /MEG Finanças/,
  'Arquivos exportados devem manter identidade MEG');
assert.match(core, /Página \$\{pageIndex \+ 1\} de \$\{pages\.length\}/,
  'PDF deve possuir paginação com identidade MEG');

assert.match(styles, /px-export-icon\.excel/,
  'Botão Excel deve ter ícone visual próprio');
assert.match(styles, /px-export-icon\.pdf/,
  'Botão PDF deve ter identidade visual própria');

console.log('Phoenix table export contract: OK');
