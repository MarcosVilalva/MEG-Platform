import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routes = readFileSync(new URL('./routes.ts', import.meta.url), 'utf8');
const service = readFileSync(new URL('./service.ts', import.meta.url), 'utf8');
const alternateMutation = readFileSync(new URL('./payment-mutation.ts', import.meta.url), 'utf8');

// Caracterização do caminho ATIVO em 06/10/2026.
// A rota pública de baixa usa payPayableProtected, não o writer alternativo
// createPayablePaymentProtected. Esta distinção é intencional nesta etapa:
// primeiro congelamos a realidade, depois consolidamos a autoridade.
assert.match(routes, /payPayableProtected/,
  'Rota ativa de baixa deve continuar apontando para payPayableProtected durante a caracterização.');
assert.doesNotMatch(routes, /createPayablePaymentProtected/,
  'Writer alternativo payment-mutation.ts não está ligado à rota ativa.');
assert.match(routes, /operationIdSchema/,
  'Baixa ativa aceita operationId para idempotência.');
assert.match(routes, /OPERATION_ID_REUSED/,
  'Reuso conflitante de operationId deve retornar conflito explícito.');

assert.match(service, /serializableFinancialTransaction/,
  'Baixa ativa deve executar em transação serializável.');
assert.match(service, /resolveWorkspaceContext/,
  'Baixa ativa deve resolver o workspace financeiro.');
assert.match(service, /monetaryAccountBalanceAt/,
  'Baixa ativa deve calcular saldo da conta escolhida na data efetiva.');
assert.match(service, /paymentBalanceDecision/,
  'Baixa ativa deve usar a decisão central de saldo.');
assert.match(service, /INSUFFICIENT_MONETARY_BALANCE/,
  'Baixa ativa deve bloquear falta de saldo antes da gravação.');
assert.match(service, /cloudMutationReceipt/,
  'Baixa ativa deve consultar/persistir recibo idempotente.');
assert.match(service, /mutationType: 'PAYABLE_PAYMENT'/,
  'Baixa ativa deve registrar mutationType próprio após sucesso.');
assert.match(service, /ledgerEntry\.create/,
  'Pagamento realizado deve gerar lançamento no ledger.');
assert.match(service, /PAYABLE_PAYMENT_CREATED/,
  'A própria baixa deve produzir auditoria estrutural.');
assert.match(service, /remaining === 0 \? 'paid' : 'partial'/,
  'Baixa parcial deve preservar saldo aberto e status parcial.');
assert.match(service, /AMOUNT_EXCEEDS_OPEN_BALANCE/,
  'Valor superior ao saldo aberto deve ser rejeitado.');

// O writer alternativo continua no repositório, porém NÃO é autoridade ativa.
// A divergência é mantida visível para a consolidação posterior.
assert.match(alternateMutation, /createPayablePaymentProtected/,
  'Writer alternativo deve permanecer identificável enquanto a divergência não for resolvida.');
assert.doesNotMatch(alternateMutation, /monetaryAccountBalanceAt|paymentBalanceDecision|INSUFFICIENT_MONETARY_BALANCE/,
  'Caracterização atual: writer alternativo não contém a mesma proteção monetária da rota ativa.');

console.log('Contrato caracterizado: baixa ativa usa payPayableProtected; writer alternativo permanece não conectado.');
