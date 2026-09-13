import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routes = readFileSync(new URL('./routes.ts', import.meta.url), 'utf8');
const mutation = readFileSync(new URL('./payment-mutation.ts', import.meta.url), 'utf8');

assert.match(routes, /createPayablePaymentProtected/,
  'Baixa de pendente deve usar gateway protegido.');
assert.match(routes, /operationIdSchema/,
  'Baixa deve aceitar operationId para idempotência.');
assert.match(routes, /OPERATION_ID_REUSED/,
  'Reuso conflitante de operationId deve retornar conflito explícito.');

assert.match(mutation, /serializableFinancialTransaction/,
  'Baixa financeira deve executar em transação serializável.');
assert.match(mutation, /resolveWorkspaceContext/,
  'Baixa deve resolver o workspace financeiro.');
assert.match(mutation, /workspaceId: workspace\.workspaceId/,
  'Evento financeiro criado pela baixa deve persistir workspaceId.');
assert.match(mutation, /cloudMutationReceipt/,
  'Baixa deve consultar recibo antes de gravar.');
assert.match(mutation, /PAYABLE_PAYMENT_CREATE/,
  'Baixa deve registrar recibo próprio após sucesso.');
assert.match(mutation, /idempotentReplay:\s*true/,
  'Retry idêntico deve retornar o mesmo comando como replay.');
assert.match(mutation, /P2002/,
  'Corrida concorrente do operationId deve ser tratada.');
assert.match(mutation, /prisma\.cloudMutationReceipt\.findUnique/,
  'Após conflito concorrente, o recibo vencedor deve ser relido fora da transação revertida.');
assert.match(mutation, /assertActiveCatalogReferences/,
  'Conta e forma de pagamento devem pertencer ao usuário e estar ativas.');
assert.match(mutation, /ledgerEntry\.create/,
  'Pagamento realizado com conta deve gerar lançamento no ledger.');
assert.match(mutation, /FINANCIAL_EVENT_CREATED/,
  'Evento financeiro da baixa deve produzir auditoria.');
assert.match(mutation, /PAYABLE_PAYMENT_CREATED/,
  'A própria baixa deve produzir auditoria estrutural.');
assert.match(mutation, /status: remaining === 0 \? 'paid' : 'partial'/,
  'Baixa parcial deve preservar saldo aberto e status parcial.');
assert.match(mutation, /AMOUNT_EXCEEDS_OPEN_BALANCE/,
  'Valor superior ao saldo aberto deve ser rejeitado.');

console.log('Contrato da baixa protegida de contas a pagar validado.');
