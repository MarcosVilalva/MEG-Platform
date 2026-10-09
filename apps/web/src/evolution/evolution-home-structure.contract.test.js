import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const screen = readFileSync(new URL('./screens/EvolutionSystem.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('./styles/evolution-parity.css', import.meta.url), 'utf8');

assert.match(
  screen,
  /data-meg-visual-rebuild="shell-home-v2"/,
  'Shell deve declarar explicitamente a reconstrução visual v2.'
);

assert.match(
  screen,
  /data-meg-home-structure="command-center-v2"/,
  'A Home mensal deve usar o command center visual v2.'
);

for (const required of [
  'data.summary.availableBalance',
  'data.summary.realizedIncome',
  'data.summary.realizedExpense',
  'data.summary.realizedResult',
  'openItems.filter',
  'paidItems.map',
  'data.benefit.balance',
]) {
  assert.ok(screen.includes(required), `A Home deve continuar ligada a dados financeiros reais: ${required}`);
}

for (const visualBlock of [
  'meg-home-heading-v2',
  'meg-home-hero-v2',
  'meg-home-balance-hero-v2',
  'meg-home-month-v2',
  'meg-home-kpi-rail-v2',
  'meg-home-bottom-v2',
  'meg-home-card-stage-v2',
  'meg-home-benefit-v2',
  'meg-home-quick-v2',
]) {
  assert.ok(screen.includes(visualBlock), `Bloco visual v2 ausente: ${visualBlock}`);
}

assert.match(
  screen,
  /\{\[-1,0,1\]\.map\(offset=>/,
  'O carrossel deve preservar vizinho anterior, cartão ativo e próximo cartão.'
);

assert.ok(!screen.includes('Plano Premium'), 'Plano Premium não deve reaparecer na Home.');

assert.match(
  css,
  /\.meg-home-grid\.meg-home-final\.meg-home-visual-v2\{[^}]*grid-template-rows:auto minmax\(235px,1\.22fr\) minmax\(88px,\.48fr\) minmax\(255px,1\.3fr\)/s,
  'Desktop deve ter nova hierarquia em quatro faixas, não a grade antiga.'
);

assert.match(
  css,
  /\.meg-home-hero-v2\{[^}]*grid-template-columns:minmax\(0,1\.58fr\) minmax\(300px,\.72fr\)/s,
  'Saldo principal e movimento do mês devem formar o novo hero assimétrico.'
);

assert.match(
  css,
  /\.meg-home-balance-copy-v2 strong\{[^}]*font-size:clamp\(39px,3\.4vw,62px\)/s,
  'Saldo disponível deve recuperar hierarquia visual forte.'
);

assert.match(
  css,
  /\.meg-home-bottom-v2\{[^}]*grid-template-columns:minmax\(0,1\.35fr\) minmax\(220px,\.62fr\) minmax\(250px,\.72fr\)/s,
  'Cartões, benefício e atalhos devem ter nova composição inferior.'
);

assert.match(
  css,
  /\.meg-home-card-carousel-v2 \.meg-card-art\.active\{[^}]*translateY\(-3px\) scale\(1\.02\)/s,
  'Cartão ativo deve ter profundidade e destaque perceptíveis.'
);

assert.match(
  css,
  /\.meg-system\[data-meg-visual-rebuild="shell-home-v2"\]\{[^}]*--meg-shell-sidebar:188px/s,
  'Shell desktop deve usar nova proporção lateral.'
);

assert.match(
  css,
  /@media\(max-width:720px\)[\s\S]*\.meg-home-grid\.meg-home-final\.meg-home-visual-v2\{[\s\S]*flex-direction:column[\s\S]*overflow:auto/s,
  'Em 430 px a nova Home deve recompor em coluna.'
);

console.log('Contrato Evolution: reconstrução visual real do Shell + Home v2 validada.');
