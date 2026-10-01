import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./transfer-service.ts', import.meta.url), 'utf8');
const routes = readFileSync(new URL('./routes.ts', import.meta.url), 'utf8');

assert.match(source, /serializableFinancialTransaction/, 'Transferência deve ser atômica e serializável.');
assert.match(source, /workspaceId_operationId/, 'Transferência deve consultar recibo idempotente por workspace + operationId.');
assert.match(source, /OPERATION_ID_REUSED/, 'Reuso de operationId com payload diferente deve ser bloqueado.');
assert.match(source, /userId:\s*dataOwnerId,\s*isActive:\s*true/, 'Contas devem pertencer à base financeira compartilhada do workspace e estar ativas.');
assert.match(source, /SOURCE_ACCOUNT_NOT_MONETARY/, 'Conta de origem não monetária deve ser bloqueada.');
assert.match(source, /DESTINATION_ACCOUNT_NOT_MONETARY/, 'Conta de destino não monetária deve ser bloqueada.');
assert.match(source, /INSUFFICIENT_SOURCE_ACCOUNT_BALANCE/, 'Saldo insuficiente da conta de origem deve bloquear a operação.');
assert.match(source, /FUTURE_TRANSFER_NOT_ALLOWED/, 'Transferência futura não deve nascer como realizada.');
assert.match(source, /for \(const leg of legs\)/, 'As duas pernas devem ser persistidas dentro da mesma transação.');
assert.match(source, /ledgerEntry\.create/, 'Cada perna realizada deve gerar efeito no ledger da conta.');
assert.match(source, /FINANCIAL_TRANSFER_CREATED/, 'Transferência deve gerar auditoria própria.');
assert.match(source, /FINANCIAL_TRANSFER_CREATE/, 'Transferência deve registrar recibo idempotente próprio.');
assert.match(routes, /app\.post\('\/transfers'/, 'A rota de transferência deve existir somente no domínio financeiro autenticado.');
assert.match(routes, /transferRequestSchema/, 'A rota deve validar o payload antes de executar a transferência.');
assert.match(routes, /createFinancialTransfer\(request\.user\.sub/, 'A rota deve preservar o usuário autenticado como ator; o serviço resolve o proprietário financeiro do workspace.');

console.log('Contrato transacional de transferência validado.');

assert.match(routes, /allowDuplicate:\s*z\.boolean\(\)\.optional\(\)/,
  'Transferência deve aceitar override explícito somente após alerta de duplicidade.');
assert.match(routes, /POSSIBLE_DUPLICATE/,
  'Possível transferência duplicada deve responder como conflito.');
assert.match(source, /SEMANTIC_DUPLICATE_WINDOW_MS/,
  'Transferência deve compartilhar a janela curta de proteção multiplataforma.');
assert.match(source, /createdAt:\s*\{ gte:\s*new Date\(Date\.now\(\) - SEMANTIC_DUPLICATE_WINDOW_MS\) \}/,
  'Detector deve olhar apenas transferências realmente recentes.');
assert.match(source, /allowDuplicate:\s*undefined/,
  'Override de duplicidade não pode alterar o hash idempotente da transferência.');
assert.match(source, /duplicateOverride:\s*Boolean\(input\.allowDuplicate\)/,
  'Override consciente deve permanecer registrado na auditoria da transferência.');
