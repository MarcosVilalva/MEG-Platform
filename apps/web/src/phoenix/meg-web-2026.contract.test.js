import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const styles = readFileSync(new URL('./PhoenixWebStyles.ts', import.meta.url), 'utf8');
const app = readFileSync(new URL('./PhoenixApp.tsx', import.meta.url), 'utf8');
const sidebar = readFileSync(new URL('./PhoenixSidebar.tsx', import.meta.url), 'utf8');
const catalogs = readFileSync(new URL('./screens/PhoenixCatalogsGrid.tsx', import.meta.url), 'utf8');
const reports = readFileSync(new URL('./screens/PhoenixReportsCenter.tsx', import.meta.url), 'utf8');
const command = readFileSync(new URL('./PhoenixCommandPalette.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('./meg-web-2026.css', import.meta.url), 'utf8');

assert.match(app, /className="phoenix-v15"[\s\S]*className="meg-web-2026"/,
  'Runtime Web deve preservar o boundary Phoenix usado pelo APK e montar a camada canônica em um wrapper desktop próprio.');
assert.match(app, /data-web-view=\{view\}/,
  'Shell Web deve expor contexto do módulo para composição responsiva.');
assert.match(app, /meg-web-quick-actions[\s\S]*requestLaunch\('expense'\)[\s\S]*requestLaunch\('income'\)[\s\S]*navigate\('decisions'\)/,
  'Topo Web deve concentrar despesa, receita e inteligência sem depender do menu lateral.');
assert.match(app, /view === 'reports'[\s\S]*PhoenixReportsCenter/,
  'Central de relatórios deve ser uma rota real do Web.');
assert.match(sidebar, /Relatórios e exportações/,
  'Navegação desktop deve expor a central de relatórios.');
assert.match(command, /route: 'reports'/,
  'Busca global deve localizar a central de relatórios.');

const lastImport = styles.trim().split('\n').filter((line) => line.trim().startsWith('import ')).at(-1) || '';
assert.equal(lastImport.includes("meg-web-2026.css"), true,
  'Camada Web canônica deve ser a última importação visual do runtime desktop.');

assert.match(catalogs, /meg-web-catalog-map/,
  'Cadastros deve possuir mapa visual próprio de contas, classificações, pagamentos e cartões.');
assert.match(catalogs, /catalogCounts/,
  'Cadastros deve mostrar ativos e total por domínio.');
assert.match(catalogs, /Central de configuração financeira/,
  'Cadastros deve assumir papel de central de configuração do sistema.');
assert.match(catalogs, /Base protegida e compartilhada/,
  'Cadastros deve comunicar a natureza compartilhada da base.');

assert.match(reports, /buildPhoenixXlsx/,
  'Central de relatórios deve gerar Excel real.');
assert.match(reports, /buildPhoenixPdf/,
  'Central de relatórios deve gerar PDF real.');
assert.match(reports, /Relatório executivo/,
  'Central deve incluir resumo executivo.');
assert.match(reports, /Lançamentos Financeiros/,
  'Central deve incluir exportação de lançamentos.');
assert.match(reports, /Pendências e Compromissos/,
  'Central deve incluir exportação de pendências.');
assert.match(reports, /Contas a Receber/,
  'Central deve incluir exportação de recebíveis.');
assert.match(reports, /Auditoria Financeira/,
  'Central deve incluir trilha de auditoria.');

assert.match(css, /max-width:1920px/,
  'Web deve aproveitar monitores largos sem deixar a leitura se perder em largura infinita.');
assert.match(css, /@media \(min-width:1680px\)/,
  'Web deve possuir composição explícita para telas wide.');
assert.match(css, /@media \(max-width:1080px\)/,
  'Web deve adaptar shell e navegação em resoluções menores.');
assert.match(css, /@media \(max-width:820px\)/,
  'Web deve possuir fallback para tablet/viewport estreito.');
assert.match(css, /meg-web-catalog-editor/,
  'Editor de cadastros deve receber tratamento desktop dedicado.');
assert.match(css, /px-table-export/,
  'Exportação automática das tabelas deve fazer parte do novo design system.');
assert.match(css, /px-meg-confirm-dialog/,
  'Alertas e confirmações devem seguir o mesmo padrão visual do Web.');

assert.doesNotMatch(css, /\.meg2-|\.meg3-|meg-cleanroom-mobile/,
  'Camada Web canônica não pode invadir os seletores do aplicativo móvel.');

console.log('Contrato MEG Web 2026 validado: shell, cadastros, responsividade, relatórios e isolamento mobile.');
