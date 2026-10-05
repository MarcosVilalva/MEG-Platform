import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const screen = readFileSync(new URL('./screens/EvolutionSystem.tsx', import.meta.url), 'utf8');
const parityPanel = readFileSync(new URL('./screens/EvolutionParityPanels.tsx', import.meta.url), 'utf8');
const systemCss = readFileSync(new URL('./styles/system.css', import.meta.url), 'utf8');

assert.match(
  screen,
  /data-meg-benefit-structure="balance-ledger-v1"/,
  'Benefícios deve declarar o contrato estrutural vigente.'
);

assert.match(
  screen,
  /<h2>Benefícios Verocard<\/h2>/,
  'Hero do benefício deve preservar a identidade Verocard.'
);

assert.match(
  screen,
  /src="\.\/assets\/cards\/verocard-alimentacao-v659\.svg"/,
  'Arte oficial do Verocard deve permanecer no módulo.'
);

assert.match(
  screen,
  /value=\{data\.benefit\.balance\} detail="Separado do saldo monetário"/,
  'Saldo do benefício deve permanecer explicitamente separado do saldo monetário.'
);

assert.match(
  screen,
  /value=\{data\.benefit\.balance-data\.benefit\.credits\+data\.benefit\.used\}/,
  'Saldo inicial deve continuar derivado do saldo atual, recargas e consumo.'
);

assert.match(
  screen,
  /label="Recargas do período"[^>]*value=\{data\.benefit\.credits\}/,
  'Recargas do período devem continuar ligadas aos dados reais.'
);

assert.match(
  screen,
  /label="Compras do período"[^>]*value=\{data\.benefit\.used\}/,
  'Compras do período devem continuar ligadas aos dados reais.'
);

assert.match(
  screen,
  /setDialog\(\{kind:'benefit-recharge'\}\)/,
  'Fluxo de recarga deve permanecer disponível.'
);

assert.match(
  screen,
  /setLaunchMode\('benefit'\);setLaunch\(true\)/,
  'Compra com benefício deve continuar abrindo o lançamento no modo correto.'
);

assert.match(
  parityPanel,
  /data\.events\.filter\(isBenefit\)\.filter\(event=>posted\(event\.status\)\)/,
  'Histórico do benefício deve considerar somente movimentos de benefício efetivamente postados.'
);

for (const tab of [
  "['all','Todas']",
  "['credits','Entradas']",
  "['debits','Saídas']",
]) {
  assert.ok(parityPanel.includes(tab), `Filtro ausente no histórico do benefício: ${tab}`);
}

assert.match(
  parityPanel,
  /placeholder="Buscar no extrato do benefício"/,
  'Histórico do benefício deve manter busca própria.'
);

assert.match(
  parityPanel,
  /signed\(event\)>0\?'Recarga':'Consumo'/,
  'Tipo de movimento deve continuar distinguindo Recarga e Consumo.'
);

assert.match(
  parityPanel,
  /signed\(event\)>0\?'\+ ':'− '/,
  'Valores do benefício devem preservar sinal operacional.'
);

assert.match(
  systemCss,
  /@media\(max-width:720px\)[\s\S]*\.benefit \.meg-benefit-top\{[^}]*max-height:none/s,
  'Em 430 px o topo de Benefícios não pode recortar saldo ou arte.'
);

console.log('Contrato estrutural Evolution: Benefícios, saldo segregado e histórico validados.');
