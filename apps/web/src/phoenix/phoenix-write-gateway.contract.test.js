import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const gateway = readFileSync(new URL('./data/phoenix-write-gateway.ts', import.meta.url), 'utf8');
const movements = readFileSync(new URL('./screens/PhoenixMovementsV15.tsx', import.meta.url), 'utf8');
const bridge = readFileSync(new URL('./simple-event-form-bridge.ts', import.meta.url), 'utf8');
const previewServer = readFileSync(new URL('../../phoenix-preview-server.mjs', import.meta.url), 'utf8');

assert.match(gateway, /simpleEvent:\s*true/,
  'Writer frontend de receita/despesa simples deve refletir a capacidade liberada no fluxo Phoenix.');
assert.match(gateway, /existingOperationId\s*\|\|\s*operationId\(\)/,
  'Retry do mesmo comando deve poder reutilizar o mesmo operationId.');
assert.match(gateway, /operationId:\s*prepared\.operationId/,
  'Envio deve usar exatamente o operationId preparado antes da primeira tentativa.');
assert.match(gateway, /financeClient\.createEvent/,
  'Writer simples deve usar o domínio financeiro oficial.');
assert.match(gateway, /clearPhoenixReadModelCache\(\)/);
assert.match(gateway, /loadPhoenixReadModel\(refreshMonth,\s*\{ force: true \}\)/,
  'Snapshot só deve ser recarregado depois da confirmação do servidor.');
assert.match(gateway, /input\.amount\s*===\s*0/,
  'Writer simples deve rejeitar zero e preservar valores negativos usados para estorno/reversão.');
assert.doesNotMatch(gateway, /input\.amount\s*<=\s*0/,
  'Writer simples não pode voltar a bloquear estornos negativos.');
assert.match(gateway, /type:\s*'income'\s*\|\s*'expense'/,
  'Gateway simples deve continuar restrito a receita/despesa; transferência usa contrato atômico próprio.');
assert.match(gateway, /status:\s*'planned'\s*\|\s*'paid'/,
  'Writer simples deve limitar a situação ao contrato explicitamente homologado.');
assert.match(gateway, /if \(!PHOENIX_WRITE_CAPABILITIES\.simpleEvent\)/,
  'Gateway deve continuar falhando fechado se a capacidade frontend for revogada.');

assert.doesNotMatch(movements, /submitPhoenixSimpleEvent|runPhoenixSimpleEventWrite/,
  'Tela React base não deve acionar escrita diretamente; a liberação fica isolada no bridge protegido.');
assert.match(movements, /Revisar lançamento · sem gravar/,
  'Primeira etapa visual do drawer permanece revisão; o bridge promove a segunda ação para gravação confirmada.');

assert.match(bridge, /preparePhoenixSimpleEvent/,
  'Bridge homologado deve preparar o comando antes do envio.');
assert.match(bridge, /runPhoenixSimpleEventWrite/,
  'Bridge homologado deve executar o gateway oficial e aguardar confirmação.');
assert.match(bridge, /state\.operationId\s*=\s*prepared\.operationId/,
  'Bridge deve preservar operationId para retry idempotente.');
assert.match(bridge, /result\.status !== 'confirmed'/,
  'Bridge não pode tratar a gravação simples como concluída sem confirmação do servidor.');
assert.match(bridge, /authenticatedRequest\('\/finance\/transfers'/,
  'Transferência deve usar o endpoint atômico oficial, fora do writer simples.');
assert.match(bridge, /payablesClient\.createRecurring/,
  'Recorrência de despesa deve usar o domínio oficial de contas a pagar.');
assert.match(bridge, /const amount = parseMoney/,
  'Receita/despesa simples deve preservar o sinal digitado para estornos.');
assert.doesNotMatch(bridge, /Estornos e valores negativos continuam bloqueados/,
  'Estornos negativos homologados não podem voltar a ser bloqueados no bridge.');
assert.match(bridge, /Cartão e crediário usam o writer específico do domínio de faturas/,
  'Cartão e crediário devem permanecer nos writers específicos de seus domínios.');
assert.match(bridge, /SALVAR COMO MODELO/);
assert.match(bridge, /label\.hidden\s*=\s*true/,
  'Função sem contrato backend não deve ser oferecida como gravação disponível.');

assert.match(previewServer, /simpleEventWriteEnabled\s*=\s*process\.env\.PHOENIX_SIMPLE_EVENT_WRITE\s*===\s*'enabled'/,
  'Proxy deve exigir flag explícita além da capacidade frontend.');
assert.match(previewServer, /allowedFinancialPosts\s*=\s*new Set\(\['\/finance\/events'\]\)/,
  'Proxy isolado do writer simples deve aceitar somente o endpoint exato de criação quando a flag estiver ligada.');
assert.match(previewServer, /simpleEventWriteEnabled\s*&&\s*allowedFinancialPosts\.has\(pathname\)/,
  'Allowlist financeira simples não pode funcionar com a flag do ambiente desligada.');
assert.match(previewServer, /PREVIEW_READ_ONLY/,
  'Mutações não habilitadas no ambiente isolado devem continuar bloqueadas pelo proxy.');

console.log('Writers Phoenix validados: simples assinado, transferência/recorrência por domínios próprios e preview protegido.');
