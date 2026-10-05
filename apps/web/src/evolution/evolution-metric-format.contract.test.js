import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ui = readFileSync(new URL('./components/SystemUI.tsx', import.meta.url), 'utf8');
const panels = readFileSync(new URL('./screens/EvolutionParityPanels.tsx', import.meta.url), 'utf8');

assert.match(
  ui,
  /format\?:'currency'\|'integer'/,
  'Metric deve suportar formatação explícita para contadores.'
);
assert.match(
  ui,
  /format==='integer'.*Intl\.NumberFormat/s,
  'Metric inteiro não pode usar formatação monetária.'
);

for (const label of [
  'Registros encontrados',
  'Total carregado',
  'Lançamentos analisados',
  'Meses com movimentos',
]) {
  const escaped = label.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
  assert.match(
    panels,
    new RegExp(`label="${escaped}"[^>]*format="integer"`),
    `${label} deve permanecer como contador, não como moeda.`
  );
}

console.log('Contrato de métricas: contadores inteiros validados.');
