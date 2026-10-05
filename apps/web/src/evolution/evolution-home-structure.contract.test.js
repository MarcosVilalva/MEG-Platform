import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const screen = readFileSync(new URL('./screens/EvolutionSystem.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('./styles/evolution-parity.css', import.meta.url), 'utf8');

assert.match(
  screen,
  /data-meg-home-structure="command-center-v1"/,
  'A Home mensal deve declarar explicitamente o contrato estrutural do command center.'
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

assert.match(
  screen,
  /\{\[-1,0,1\]\.map\(offset=>/,
  'O carrossel da Home deve preservar vizinho anterior, cartão ativo e próximo cartão.'
);

assert.ok(!screen.includes('Plano Premium'), 'Plano Premium não deve reaparecer na Home.');

const desktopHomeRule=css.match(/\\.meg-home-grid\\.meg-home-final\\{([^}]*)\\}/)?.[1]||'';
assert.match(
  desktopHomeRule,
  /display:grid/,
  'A composição desktop da Home deve permanecer em grid.'
);
assert.doesNotMatch(
  desktopHomeRule,
  /overflow\\s*:\\s*auto/,
  'A composição desktop da Home não pode depender de rolagem geral.'
);

assert.match(
  css,
  /\.meg-home-status\{[^}]*grid-template-columns:1\.36fr repeat\(3,minmax\(0,1fr\)\)/s,
  'Saldo, Entradas, Saídas e Resultado devem permanecer na faixa superior em desktop amplo.'
);

assert.match(
  css,
  /\.meg-home-bottom\{[^}]*grid-template-columns:1\.35fr \.72fr \.92fr/s,
  'Cartões, Benefício e Ações rápidas devem preservar a composição inferior aprovada.'
);

assert.match(
  css,
  /@media\(max-width:720px\)[\s\S]*\.meg-home-grid\.meg-home-final\{display:flex;flex-direction:column;overflow:auto/s,
  'Em 430 px a Home deve recompor a hierarquia em coluna, sem espremer o desktop.'
);

assert.match(
  css,
  /@media\(max-width:720px\)[\s\S]*\.meg-home-status\{grid-template-columns:1fr 1fr/s,
  'Em 430 px os KPIs superiores devem reorganizar-se em duas colunas.'
);

console.log('Contrato estrutural Evolution: Home command center e responsividade validados.');
