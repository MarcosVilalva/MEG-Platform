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
assert.match(home, /SEU DINHEIRO AGORA/);
assert.match(home, /Liquidez após compromissos/);
assert.match(home, /Receitas[\s\S]*Despesas[\s\S]*Resultado do mês[\s\S]*Metas/);
assert.match(home, /CARTEIRA[\s\S]*Contas e cartões/);
assert.match(home, /MEG PULSE[\s\S]*O movimento do seu dinheiro/);
assert.match(home, /O que pede atenção[\s\S]*Atividade recente/);
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

assert.match(home, /liquidityPercent/);
assert.match(home, /freeAfterCommitments/);
assert.match(home, /activeTrendIndex/);
assert.match(home, /onMouseEnter=\{\(\)=>setActiveTrendIndex\(index\)\}/);
assert.match(home, /mnx-flow-crosshair/);
assert.match(home, /mnx-flow-area/);
assert.match(home, /Passe o mouse pelos meses/);
assert.match(home, /walletIndex/);
assert.match(home, /mnx-wallet-carousel/);
assert.match(home, /rotateWallet\(-1\)/);
assert.match(home, /rotateWallet\(1\)/);
assert.match(css, /mnx-wallet-dots/);
assert.doesNotMatch(css, /\.mnx-wallet-strip[\s\S]*overflow-x:\s*auto/,
  'Carrossel da Home não pode depender de rolagem horizontal.');
assert.match(css, /mnx-attention-list[\s\S]*overflow-y:auto/);
assert.match(css, /scrollbar-color:rgba\(73,240,223/);
assert.match(css, /mnx-command-hero/);
assert.match(css, /mnx-money-stage/);
assert.match(css, /mnx-liquidity-ring/);
assert.match(css, /mnx-command-metrics/);
assert.match(css, /mnx-wallet-ribbon/);
assert.match(css, /mnx-cockpit/);
assert.match(css, /grid-template-columns:minmax\(0,1\.75fr\) minmax\(300px,\.85fr\)/);
assert.match(css, /mnx-flow-console/);
assert.match(css, /mnx-action-console/);
assert.match(css, /mnx-flow-line/);
assert.match(css, /mnx-flow-crosshair/);
assert.match(css, /@container mnx-content \(max-width:900px\)/);
assert.match(css, /@container mnx-content \(max-width:760px\)/);
assert.match(css, /@container mnx-content \(max-width:620px\)/);

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
assert.match(app, /WebNextSearchDialog[\s\S]*results=\{webNextSearchCatalog\}/,
  'Home Web Next deve usar a busca global clean-room.');

const androidEntry = app.indexOf("if (nativeOperational && viewData");
const webNextEntry = app.indexOf("if (!nativeOperational && view === 'home' && periodMode === 'month')");
assert.ok(androidEntry >= 0 && webNextEntry > androidEntry,
  'Android deve continuar resolvido antes da nova rota Web.');

assert.doesNotMatch(home + css + period + periodCss, /\bpx-|phoenix-v|fidelity-v|revolution/i,
  'Tela Home Web Next não pode herdar nomenclatura visual Phoenix.');

console.log('Web Next Home contract: OK');
