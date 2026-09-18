import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const preview = readFileSync(new URL('./preview-main.tsx', import.meta.url), 'utf8');
const main = readFileSync(new URL('../app/main.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('./phoenix-contrast-hardening.css', import.meta.url), 'utf8');

assert.match(preview, /phoenix-contrast-hardening\.css/,
  'Preview deve carregar a camada global de contraste');
assert.match(main, /phoenix-contrast-hardening\.css/,
  'Runtime oficial deve carregar a mesma camada global de contraste');
assert.match(preview, /phoenix-table-export-bridge/,
  'Preview deve carregar exportação de tabelas');
assert.match(preview, /phoenix-keyboard-grid-bridge/,
  'Preview deve manter navegação de grades por teclado');

assert.match(styles, /data-theme="light"/,
  'Hardening deve possuir regras explícitas para tema claro');
assert.match(styles, /data-theme="dark"/,
  'Hardening deve possuir regras explícitas para tema escuro');
assert.match(styles, /\.px-data-table th/,
  'Cabeçalhos das tabelas devem receber reforço de legibilidade');
assert.match(styles, /button:disabled/,
  'Controles desabilitados devem permanecer visualmente identificáveis');
assert.match(styles, /\[data-preview-edit\]/,
  'A ação Prévia deve possuir contraste próprio');
assert.match(styles, /\[data-do-edit\]/,
  'A ação Alterar deve possuir contraste próprio');
assert.match(styles, /\[data-do-delete\]/,
  'A ação Excluir deve possuir contraste próprio');
assert.match(styles, /\.px-decision-safe-margin/,
  'Centro de decisões deve ser harmonizado no tema claro');
assert.match(styles, /\.px-meg-now/,
  'Home inteligente deve ser harmonizada no tema claro');
assert.match(styles, /\.px-card-statement-projection/,
  'Projeção de cartões deve ser harmonizada no tema claro');
assert.match(styles, /\.px-pending-side/,
  'Resumo operacional de Pendentes deve ser harmonizado no tema claro');
assert.match(styles, /\.px-table-export/,
  'Controles de exportação devem usar contraste reforçado');

console.log('Phoenix global contrast and export visibility contract: OK');
