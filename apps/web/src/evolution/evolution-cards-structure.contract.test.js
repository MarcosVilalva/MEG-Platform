import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const screen = readFileSync(new URL('./screens/EvolutionSystem.tsx', import.meta.url), 'utf8');
const parity = readFileSync(new URL('./styles/evolution-parity.css', import.meta.url), 'utf8');
const system = readFileSync(new URL('./styles/system.css', import.meta.url), 'utf8');

assert.match(
  screen,
  /data-meg-cards-structure="carousel-invoice-v1"/,
  'Cartões deve declarar o contrato estrutural vigente.'
);

for (const asset of [
  './assets/cards/latam-user-model-v61.svg',
  './assets/cards/mercado-pago-visa-v662.svg',
  './assets/cards/riachuelo-mastercard-visual.svg',
]) {
  assert.ok(screen.includes(asset), `Arte oficial de cartão ausente: ${asset}`);
}

assert.match(
  screen,
  /className="meg-card-carousel" aria-label="Carrossel cíclico de cartões"/,
  'Cartões deve preservar o carrossel cíclico.'
);

assert.match(
  screen,
  /\{\[-1,0,1\]\.map\(offset=>/,
  'O carrossel deve preservar cartão anterior, ativo e próximo.'
);

assert.match(
  screen,
  /setCardIndex\(i=>i-1\)/,
  'Navegação para o cartão anterior deve permanecer funcional.'
);

assert.match(
  screen,
  /setCardIndex\(i=>i\+1\)/,
  'Navegação para o próximo cartão deve permanecer funcional.'
);

assert.match(
  screen,
  /activeCard\.statement\?\.payableAmount\?\?activeCard\.payableStatementAmount\?\?Math\.max\(0,activeCard\.statementAmount\)/,
  'Fatura atual deve continuar usando o valor canônico pagável.'
);

assert.match(
  screen,
  /activeCard\.statement\?\.dueDate\?datePt\(activeCard\.statement\.dueDate\):'dia '\+activeCard\.dueDay/,
  'Vencimento da fatura deve continuar vindo dos dados reais do cartão.'
);

assert.match(
  screen,
  /<progress max=\{Math\.max\(1,Number\(activeCard\.creditLimit\|\|1\)\)\} value=\{Math\.max\(0,Number\(activeCard\.usedLimit\|\|0\)\)\}\/>/,
  'Uso de limite deve permanecer ligado ao limite e consumo reais.'
);

assert.match(
  screen,
  /filter\(e=>e\.statementMonth===m&&e\.status==='open'\)/,
  'Próximas faturas devem considerar somente parcelas abertas da competência.'
);

assert.match(
  screen,
  /onClick=\{\(\)=>setCardCenter\(true\)\}>Ver detalhes da fatura/,
  'A fatura atual deve continuar abrindo a Central do cartão.'
);

assert.match(
  parity,
  /\.meg-cards-showcase\{[^}]*flex:0 0 220px[^}]*min-height:0/s,
  'Showcase de cartões deve preservar proporção no desktop.'
);

assert.match(
  system,
  /\.meg-card-art\.active\{[^}]*transform:scale\(1\)[^}]*opacity:1/s,
  'Cartão ativo deve manter destaque visual.'
);

assert.match(
  system,
  /\.meg-card-art>img\{[^}]*object-fit:contain[^}]*border-radius:12px/s,
  'Artes reais dos cartões não podem ser deformadas.'
);

console.log('Contrato estrutural Evolution: Cartões, carrossel e faturas validados.');
