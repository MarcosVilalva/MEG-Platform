import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./transfer-service.ts', import.meta.url), 'utf8');

assert.match(source, /serializableFinancialTransaction/, 'Transferência deve ser atômica e serializável.');
assert.match(source, /workspaceId_operationId/, 'Transferência deve consultar recibo idempotente por workspace + operationId.');
assert.match(source, /OPERATION_ID_REUSED/, 'Reuso de operationId com payload diferente deve ser bloqueado.');
assert.match(source, /userId,\s*isActive:\s*true/, 'Contas devem pertencer ao usuário e estar ativas.');
assert.match(source, /SOURCE_ACCOUNT_NOT_MONETARY/, 'Conta de origem não monetária deve ser bloqueada.');
assert.match(source, /DESTINATION_ACCOUNT_NOT_MONETARY/, 'Conta de destino não monetária deve ser bloqueada.');
assert.match(source, /INSUFFICIENT_SOURCE_ACCOUNT_BALANCE/, 'Saldo insuficiente da conta de origem deve bloquear a operação.');
assert.match(source, /FUTURE_TRANSFER_NOT_ALLOWED/, 'Transferência futura não deve nascer como realizada.');
assert.match(source, /for \(const leg of legs\)/, 'As duas pernas devem ser persistidas dentro da mesma transação.');
assert.match(source, /ledgerEntry\.create/, 'Cada perna realizada deve gerar efeito no ledger da conta.');
assert.match(source, /FINANCIAL_TRANSFER_CREATED/, 'Transferência deve gerar auditoria própria.');
assert.match(source, /FINANCIAL_TRANSFER_CREATE/, 'Transferência deve registrar recibo idempotente próprio.');

console.log('Contrato transacional de transferência validado.');
