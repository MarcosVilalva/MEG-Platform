import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routes = readFileSync(new URL('./routes.ts', import.meta.url), 'utf8');
const mutation = readFileSync(new URL('./event-mutation.ts', import.meta.url), 'utf8');
const protection = readFileSync(new URL('./monetary-protection.ts', import.meta.url), 'utf8');

assert.match(routes, /createFinancialEventProtected/,
  'Criação de evento deve passar pelo gateway transacional idempotente.');
assert.match(routes, /operationIdSchema/,
  'Criação de evento deve aceitar chave de idempotência.');
assert.match(routes, /\/sync-status/,
  'API financeira deve expor pulso leve para detectar alterações em outros dispositivos.');
assert.match(routes, /cloudMutationReceipt\.findFirst/,
  'Pulso de sincronização deve usar recibos autoritativos do workspace.');
assert.match(routes, /orderBy:\s*\[\{ createdAt: 'desc' \}, \{ id: 'desc' \}\]/,
  'Pulso deve apontar sempre para a mutação confirmada mais recente.');
assert.match(mutation, /serializableFinancialTransaction/,
  'Criação de evento deve executar em transação serializável.');
assert.match(mutation, /cloudMutationReceipt/,
  'Criação de evento deve consultar recibo de mutação.');
assert.match(mutation, /FINANCIAL_EVENT_CREATE/,
  'Criação de evento deve registrar recibo de idempotência próprio.');
assert.match(mutation, /FINANCIAL_EVENT_CREATED/,
  'Criação de evento deve registrar auditoria financeira estrutural.');
assert.match(mutation, /const workspace = await resolveWorkspaceContext\(userId\)/,
  'Todo novo evento deve resolver o workspace mesmo sem operationId.');
assert.match(mutation, /workspaceId: workspace\.workspaceId/,
  'Todo novo evento deve persistir o workspace financeiro resolvido.');
assert.match(mutation, /TRANSFER_CONTRACT_NOT_READY/,
  'Transferência não pode usar o contrato de evento de uma única perna.');
assert.match(mutation, /INVALID_ACCOUNT/);
assert.match(mutation, /INVALID_CATEGORY/);
assert.match(mutation, /INVALID_PAYMENT_METHOD/);

console.log('Contrato de criação idempotente de eventos financeiros validado.');
assert.match(routes, /allowDuplicate:\s*z\.boolean\(\)\.optional\(\)/,
  'Criação deve exigir override explícito para aceitar uma duplicidade suspeita.');
assert.match(routes, /POSSIBLE_DUPLICATE/,
  'Possível duplicidade deve responder como conflito, sem criar silenciosamente outro evento.');
assert.match(mutation, /findRecentFinancialEventDuplicate/,
  'Writer deve consultar duplicidade semântica dentro da mesma transação serializável.');
assert.match(mutation, /allowDuplicate:\s*undefined/,
  'Override de duplicidade não pode alterar o hash idempotente da operação original.');
assert.match(mutation, /duplicateOverride:\s*Boolean\(input\.allowDuplicate\)/,
  'Override consciente deve permanecer registrado na auditoria financeira.');
assert.match(protection, /SEMANTIC_DUPLICATE_WINDOW_MS\s*=\s*10 \* 60_000/,
  'Janela de proteção multiplataforma deve permanecer curta e explícita.');
assert.match(protection, /findRecentFinancialEventDuplicate[\s\S]*workspaceId:[\s\S]*createdAt: \{ gte: duplicateWindowStart\(\) \}/,
  'Detector deve limitar a comparação ao workspace e às gravações realmente recentes.');

assert.match(mutation, /resolveCanonicalFinancialStatus/,
  'Writer geral deve resolver status no domínio, sem delegar a regra à tela.');
assert.match(mutation, /BENEFIT_CONTRACT_REQUIRED/,
  'Movimentação de benefício deve permanecer no writer protegido próprio.');
assert.match(mutation, /requestedStatus:\s*input\.status[\s\S]*resolvedStatus/,
  'Auditoria deve registrar o status pedido e o status efetivamente aplicado.');
