import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const screen = readFileSync(new URL('./screens/EvolutionSystem.tsx', import.meta.url), 'utf8');
const parity = readFileSync(new URL('./styles/evolution-parity.css', import.meta.url), 'utf8');

assert.match(
  screen,
  /data-meg-payables-structure="execution-list-v1"/,
  'Pendentes deve declarar o contrato estrutural orientado à execução.'
);

for (const tab of [
  "['all','Todas']",
  "['open','A pagar']",
  "['paid','Pagas']",
  "['overdue','Vencidas']",
]) {
  assert.ok(screen.includes(tab), `Filtro operacional ausente em Pendentes: ${tab}`);
}

assert.match(
  screen,
  /placeholder="Buscar pendentes…"/,
  'Pendentes deve manter busca própria.'
);

assert.match(
  screen,
  /\[\.\.\.new Set\(visiblePending\.map\(x=>x\.date\)\)\]\.map\(date=>/,
  'Pendentes deve permanecer agrupado por data.'
);

assert.match(
  screen,
  /money\(sum\(visiblePending\.filter\(x=>x\.date===date\)\.map\(x=>x\.amount\)\)\)/,
  'Cada cabeçalho de data deve continuar exibindo o total do grupo.'
);

assert.match(
  screen,
  /selectedItems\.length\?selectedItems\.length\+' selecionados · '\+money\(sum\(selectedItems\.map\(x=>x\.amount\)\)\)/,
  'A seleção deve continuar informando quantidade e valor total.'
);

assert.match(
  screen,
  /disabled=\{!selectedItems\.length\|\|qaMode\} onClick=\{\(\)=>setDialog\(\{kind:'settlement',items:selectedItems\}\)\}/,
  'Pagamento em lote deve usar somente os itens selecionados e permanecer bloqueado sem seleção.'
);

assert.match(
  screen,
  /disabled=\{x\.paid\} checked=\{selected\.has\(x\.key\)\}/,
  'Itens pagos não podem voltar a ser selecionáveis para baixa.'
);

assert.match(
  screen,
  /x\.paid\?'Pago':x\.date<today\(\)\?'Vencido':'A pagar'/,
  'Status operacional Pago/Vencido/A pagar deve permanecer visível.'
);

assert.match(
  screen,
  /className="meg-pending-list meg-scroll"/,
  'A lista de Pendentes deve rolar internamente.'
);

assert.ok(
  !screen.includes('data-smart-grid="payables"'),
  'Pendentes não deve ser convertido em Smart Grid analítico completo.'
);

assert.match(
  parity,
  /\.payables-final \.meg-pending-list\{[^}]*flex:1[^}]*min-height:0/s,
  'A lista deve consumir a área útil sem criar rolagem geral.'
);

assert.match(
  parity,
  /@media\(max-width:720px\)[\s\S]*\.meg-inline-search\{order:2;flex-basis:100%;max-width:none\}/s,
  'Em 430 px a busca deve recompor para a largura disponível.'
);

assert.match(
  parity,
  /@media\(max-width:720px\)[\s\S]*\.meg-selection-total\{order:3;margin-left:0;width:100%\}/s,
  'Em 430 px o resumo da seleção deve permanecer legível.'
);

console.log('Contrato estrutural Evolution: Pendentes, seleção e agrupamento por data validados.');
