import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const screen = readFileSync(join(here, 'screens/WebNextMovements.tsx'), 'utf8');
const model = readFileSync(join(here, 'data/movements-view-model.ts'), 'utf8');
const css = readFileSync(join(here, 'styles/movements.css'), 'utf8');
const app = readFileSync(join(here, '../phoenix/PhoenixApp.tsx'), 'utf8');
const legacyEditor = readFileSync(join(here, '../phoenix/screens/PhoenixMovementsV15.tsx'), 'utf8');

assert.match(screen, /data-web-next-screen="movements"/);
assert.match(screen, /data-reference="web-board-2-approved"/);
assert.match(screen, /CONTROLE FINANCEIRO[\s\S]*Lançamentos/);
assert.match(screen, /Nova despesa[\s\S]*Nova receita[\s\S]*Transferência/);
assert.match(screen, /Receitas realizadas[\s\S]*Despesas realizadas[\s\S]*Resultado[\s\S]*Pendentes/);
assert.match(screen, /Buscar descrição, categoria, conta ou forma de pagamento/);
assert.match(screen, /Todos[\s\S]*Receitas[\s\S]*Despesas[\s\S]*Transferências/);
assert.match(screen, /paymentMethod/);
assert.match(screen, /onEditEvent\(item\.id\)/);
assert.match(screen, /periodLabel/);
assert.match(screen, /model\.accounts/);
assert.match(screen, /data-mnx-event-id/);
assert.doesNotMatch(screen, /groupBy|reduce\([^\n]*category/i,
  'Lançamentos Web Next não deve agrupar a lista por categoria.');

assert.match(model, /data\.events\.items/);
assert.match(model, /data\.summary\.realizedIncome/);
assert.match(model, /data\.summary\.realizedExpense/);
assert.match(model, /data\.summary\.realizedResult/);
assert.match(model, /event\.paymentMethod\?\.name/);
assert.match(model, /event\.account\?\.name/);
assert.match(model, /purchaseDate/);
assert.match(model, /isBenefit/);

assert.match(css, /\.mnx-movements[\s\S]*overflow:hidden/);
assert.match(css, /\.mnx-movement-table-scroll[\s\S]*overflow-x:hidden[\s\S]*overflow-y:auto/);
assert.match(css, /scrollbar-color:rgba\(73,240,223/);
assert.match(css, /@container mnx-content \(max-width:1250px\)/);
assert.match(css, /@container mnx-content \(max-width:980px\)/);
assert.match(css, /@container mnx-content \(max-width:720px\)/);
assert.doesNotMatch(css, /overflow-x:\s*auto/,
  'Lançamentos não pode criar rolagem horizontal.');

assert.match(app, /WebNextMovements/);
assert.match(app, /buildWebNextMovementsModel/);
assert.match(app, /!nativeOperational && view === 'movements'/);
assert.match(app, /route="movements"/);
assert.match(app, /<WebNextMovementEditor[\s\S]*launchRequest=\{launchRequest\}[\s\S]*editRequest=\{webNextEditRequest\}/,
  'Novo/Editar deve usar o editor clean-room Web Next.');
assert.doesNotMatch(app, /<PhoenixMovementsV15[\s\S]{0,900}editorOnly/,
  'A rota oficial de Lançamentos não deve mais montar o editor visual Phoenix.');
assert.match(app, /type LaunchPreset = 'expense' \| 'income' \| 'benefit' \| 'transfer'/);

assert.match(legacyEditor, /editorOnly\?: boolean/);
assert.match(legacyEditor, /\{!editorOnly \? <>/);
assert.match(legacyEditor, /launchPreset === 'transfer'/);
assert.match(legacyEditor, /PhoenixLaunchWriteControl/,
  'O editor Phoenix permanece no repositório somente como legado até a validação e limpeza segura.');

const combined = screen + model + css;
assert.doesNotMatch(combined, /\bpx-|phoenix-v|fidelity-v|revolution/i,
  'Tela Lançamentos Web Next não pode herdar nomenclatura visual Phoenix.');

const androidEntry = app.indexOf("if (nativeOperational && viewData");
const movementsEntry = app.indexOf("if (!nativeOperational && view === 'movements')");
assert.ok(androidEntry >= 0 && movementsEntry > androidEntry,
  'Android deve continuar resolvido antes da rota Web Next de Lançamentos.');

console.log('Web Next movements contract: OK');
