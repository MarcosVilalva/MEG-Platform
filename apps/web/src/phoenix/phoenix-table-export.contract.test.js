import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';
import readXlsxFile from 'read-excel-file/node';

const bridge = readFileSync(new URL('./phoenix-table-export-bridge.ts', import.meta.url), 'utf8');
const core = readFileSync(new URL('./table-export-core.ts', import.meta.url), 'utf8');
const styles = readFileSync(new URL('./phoenix-table-export.css', import.meta.url), 'utf8');
const main = readFileSync(new URL('../app/main.tsx', import.meta.url), 'utf8');

assert.match(main, /phoenix-table-export-bridge/,
  'Runtime Phoenix deve carregar a exportação global das tabelas');

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
assert.doesNotMatch(core, /xl\/tables\/table1\.xml/,
  'XLSX compatível não deve depender do relacionamento de tabela que o Excel estava reparando');
assert.match(core, /\\u0000-\\u0008/,
  'Conteúdo exportado deve remover caracteres de controle inválidos para XML');
assert.match(core, /MEG Finanças/,
  'Arquivos exportados devem manter identidade MEG');
assert.match(core, /Página \$\{pageIndex \+ 1\} de \$\{pages\.length\}/,
  'PDF deve possuir paginação com identidade MEG');

assert.match(styles, /px-export-icon\.excel/,
  'Botão Excel deve ter ícone visual próprio');
assert.match(styles, /px-export-icon\.pdf/,
  'Botão PDF deve ter identidade visual própria');

const transpiled = ts.transpileModule(core, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 }
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`;
const exportCore = await import(moduleUrl);
const sample = {
  systemName: 'MEG Finanças',
  title: 'Controle financeiro',
  period: '01/09/2026 a 30/09/2026',
  filters: ['Situação: Pendente'],
  generatedAt: '18/09/2026 21:10',
  recordCount: 2,
  headers: ['Vencimento', 'Descrição', 'Despesa'],
  rows: [
    ['20/09/2026', 'TV E STREAMING', 'R$ 67,50'],
    ['28/09/2026', 'BV SOLAR\u000B', 'R$ 82,83']
  ],
  kinds: ['date', 'text', 'money'],
  sums: [null, null, 150.33]
};
const bytes = exportCore.buildPhoenixXlsx(sample);
assert.equal(bytes[0], 0x50, 'XLSX deve iniciar como pacote ZIP PK');
assert.equal(bytes[1], 0x4b, 'XLSX deve iniciar como pacote ZIP PK');

const temp = mkdtempSync(join(tmpdir(), 'meg-xlsx-'));
const filename = join(temp, 'controle-financeiro.xlsx');
try {
  writeFileSync(filename, Buffer.from(bytes));
  const workbookRows = await readXlsxFile(filename);
  console.log('Phoenix XLSX smoke rows:', JSON.stringify(workbookRows));
  const workbookValues = workbookRows.flat().filter((value) => value !== null && value !== undefined);
  assert.ok(workbookRows.length > 0, 'Excel gerado deve conter linhas legíveis');
  assert.ok(workbookValues.includes('Vencimento'),
    'Excel gerado deve preservar o cabeçalho da tabela');
  assert.ok(workbookValues.includes('TV E STREAMING'),
    'Excel gerado deve preservar os dados reais da tabela');
} finally {
  rmSync(temp, { recursive: true, force: true });
}

console.log('Phoenix table export contract: OK');
