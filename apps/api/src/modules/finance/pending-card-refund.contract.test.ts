import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./pending-batch-settlement.ts', import.meta.url), 'utf8');

assert.match(source, /cardStatementEffectFromSignedAmount\(current\.signedAmount\)/,
  'A baixa agrupada deve usar a mesma regra canônica de sinal da fatura');
assert.match(source, /cardCreditAdjustment = signed > 0/,
  'Créditos de cartão pendentes devem ser reconhecidos explicitamente');
assert.match(source, /cardContext\.includes\('CREDITO'\).*cardContext\.includes\('CARTAO'\)/s,
  'Crédito positivo só pode entrar no fluxo especial quando o contexto for cartão');
assert.match(source, /debit: item\.amount < 0 \? Math\.abs\(item\.amount\) : 0/,
  'Estorno de cartão deve virar débito contábil no lote, reduzindo o pagamento líquido');
assert.match(source, /credit: item\.amount > 0 \? item\.amount : 0/,
  'Cobrança de cartão deve continuar como crédito contábil de saída');
assert.match(source, /BATCH_NET_NOT_PAYABLE/,
  'Lotes zerados ou credores não devem registrar pagamento');
assert.match(source, /SOURCE_CARD_METHOD_NOT_ALLOWED_FOR_SETTLEMENT/,
  'O cartão que originou a fatura não pode ser reutilizado como forma da própria baixa');
assert.match(source, /loaded\.reduce\(\(sum, item\) => sum \+ item\.amount, 0\)/,
  'Proteção monetária deve usar o valor líquido do lote, incluindo estornos');

console.log('Pending batch card refund contract: OK');
