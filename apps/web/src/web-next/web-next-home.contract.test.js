import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const home = readFileSync(join(here, 'screens/WebNextHome.tsx'), 'utf8');
const model = readFileSync(join(here, 'data/home-view-model.ts'), 'utf8');
const css = readFileSync(join(here, 'styles/home.css'), 'utf8');
const period = readFileSync(join(here, 'components/WebNextPeriodPopover.tsx'), 'utf8');
const periodCss = readFileSync(join(here, 'styles/period.css'), 'utf8');
const app = readFileSync(join(here, '../phoenix/PhoenixApp.tsx'), 'utf8');

assert.match(home, /data-reference="web-board-1-approved"/);
assert.match(home, /Receitas[\s\S]*Despesas[\s\S]*Saldo do mês[\s\S]*Metas/);
assert.match(home, /Saldo total[\s\S]*Contas e cartões[\s\S]*Evolução financeira[\s\S]*Lançamentos recentes[\s\S]*Pendências e alertas/);
assert.match(home, /onNavigate\('cashflow'\)/);
assert.match(home, /onNavigate\('movements'\)/);
assert.match(home, /onNavigate\('payables'\)/);

assert.match(model, /buildPhoenixHomeAgenda/);
assert.match(model, /data\.summary\.realizedIncome/);
assert.match(model, /data\.summary\.realizedExpense/);
assert.match(model, /data\.summary\.realizedResult/);
assert.match(model, /data\.budgets\.reduce/);
assert.match(model, /data\.analytics\.monthlyTrend\.slice\(-6\)/);
assert.match(model, /data\.cards/);
assert.match(model, /data\.events\.items/);
assert.match(model, /normalization\.primary/);
assert.match(model, /possível\(is\) duplicidade/);

assert.match(css, /grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
assert.match(css, /grid-template-columns:repeat\(12,minmax\(0,1fr\)\)/);
assert.match(css, /mnx-chart-panel \{ grid-column:1\/7/);
assert.match(css, /mnx-recent-panel \{ grid-column:7\/10/);
assert.match(css, /mnx-alerts-panel \{ grid-column:10\/13/);
assert.match(css, /perspective\(900px\)/);
assert.match(css, /@container mnx-content \(max-width:1220px\)/);
assert.match(css, /@container mnx-content \(max-width:760px\)/);

assert.match(period, /Mês[\s\S]*Intervalo[\s\S]*Tudo/);
assert.match(period, /type="month"/);
assert.match(period, /type="date"/);
assert.match(periodCss, /mnx-period-popover/);

assert.match(app, /WebNextShell/);
assert.match(app, /WebNextHome/);
assert.match(app, /buildWebNextHomeModel/);
assert.match(app, /WebNextPeriodPopover/);
assert.match(app, /!nativeOperational && view === 'home' && periodMode === 'month'/);
assert.match(app, /brandSrc=\{phoenixBrandAsset\('brand\/meg-finance-system-mark\.svg'\)\}/);
assert.match(app, /searchOpen && viewData[\s\S]*PhoenixCommandPalette/);

const androidEntry = app.indexOf("if (nativeOperational && viewData");
const webNextEntry = app.indexOf("if (!nativeOperational && view === 'home' && periodMode === 'month')");
assert.ok(androidEntry >= 0 && webNextEntry > androidEntry,
  'Android deve continuar resolvido antes da nova rota Web.');

assert.doesNotMatch(home + css + period + periodCss, /\bpx-|phoenix-v|fidelity-v|revolution/i,
  'Tela Home Web Next não pode herdar nomenclatura visual Phoenix.');

console.log('Web Next Home contract: OK');
