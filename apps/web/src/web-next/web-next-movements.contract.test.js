import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const screen = readFileSync(join(here, 'screens/WebNextMovements.tsx'), 'utf8');
const model = readFileSync(join(here, 'data/movements-view-model.ts'), 'utf8');
const css = readFileSync(join(here, 'styles/movements.css'), 'utf8');
const app = readFileSync(join(here, '../phoenix/PhoenixApp.tsx'), 'utf8');
const legacy = readFileSync(join(here, '../phoenix/screens/PhoenixMovementsV15.tsx'), 'utf8');

assert.match(screen, /data-web-next-screen="movements"/);
assert.match(screen, /Seu movimento financeiro, sem ruído/);
assert.match(screen, /Receitas realizadas/);
assert.match(screen, /Despesas realizadas/);
assert.match(screen, /Movimento líquido/);
assert.match(screen, /Movimento em benefício/);
assert.match(screen, /Buscar descrição, grupo, conta ou forma de pagamento/);
assert.match(screen, /Duplo clique abre a edição/);
assert.match(screen, /Detalhes do lançamento/);
assert.match(screen, /onEditEvent\(row\.id\)/);
assert.match(screen, /onOpenPeriod/);
assert.match(screen, /onOpenHistory/);

assert.match(model, /import type \{ PhoenixReadModel \}/);
assert.match(model, /periodMode === 'month'/);
assert.match(model, /event\.competence === data\.month/);
assert.match(model, /status !== 'archived'/);
assert.match(model, /verocard/);
assert.match(model, /benefit/);
assert.match(model, /\['paid', 'reconciled', 'confirmed'\]/);
assert.match(model, /totals\.income - totals\.expense/);

assert.match(css, /\.mnx-movements[\s\S]*overflow:hidden/);
assert.match(css, /\.mnx-movement-grid-scroll[\s\S]*overflow-x:hidden[\s\S]*overflow-y:auto/);
assert.match(css, /scrollbar-color:rgba\(73,240,223/);
assert.match(css, /::-webkit-scrollbar-thumb/);
assert.match(css, /@container mnx-content \(max-width:980px\)/);
assert.match(css, /@container mnx-content \(max-width:760px\)/);
assert.match(css, /@container mnx-content \(max-width:560px\)/);

assert.match(legacy, /editorOnly = false/);
assert.match(legacy, /!editorOnly \? <section className="px-screen px-movements-v15"/);
assert.match(app, /WebNextMovements/);
assert.match(app, /buildWebNextMovementsModel/);
assert.match(app, /view === 'movements'/);
assert.match(app, /route=\{view === 'movements' \? 'movements' : 'home'\}/);
assert.match(app, /<PhoenixMovementsV15[\s\S]*editorOnly/);

const androidEntry = app.indexOf("if (nativeOperational && viewData");
const webNextEntry = app.indexOf("if (!nativeOperational && ((view === 'home'");
assert.ok(androidEntry >= 0 && webNextEntry > androidEntry,
  'Android deve continuar resolvido antes da rota Web Next.');

assert.doesNotMatch(screen + model + css, /\bpx-|phoenix-v|fidelity-v|revolution/i,
  'A tela clean-room de Lançamentos não pode herdar nomenclatura visual Phoenix.');

console.log('Web Next Movements contract: OK');
