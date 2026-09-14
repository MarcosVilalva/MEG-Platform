import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const gateway = readFileSync(new URL('./data/phoenix-write-gateway.ts', import.meta.url), 'utf8');
const movements = readFileSync(new URL('./screens/PhoenixMovementsV15.tsx', import.meta.url), 'utf8');
const bridge = readFileSync(new URL('./simple-event-form-bridge.ts', import.meta.url), 'utf8');
const previewServer = readFileSync(new URL('../../phoenix-preview-server.mjs', import.meta.url), 'utf8');

assert.match(gateway, /simpleEvent:\s*true/,
  'Writer frontend de receita/despesa simples deve refletir a capacidade já liberada no fluxo Phoenix.');
assert.match(gateway, /existingOperationId\s*\|\|\s*operationId\(\)/,
  'Retry do mesmo comando deve poder reutilizar o mesmo operationId.');
assert.match(gateway, /operationId:\s*prepared\.operationId/,
  'Envio deve usar exatamente o operationId preparado antes da primeira tentativa.');
assert.match(gateway, /financeClient\.createEvent/,
  'Writer simples deve usar o domínio financeiro oficial.');
assert.match(gateway, /clearPhoenixReadModelCache\(\)/);
assert.match(gateway, /loadPhoenixReadModel\(refreshMonth,\s*\{ force: true \}\)/,
  'Snapshot só deve ser recarregado depois da confirmação do servidor.');
assert.match(gateway, /PHOENIX_POSITIVE_AMOUNT_REQUIRED/,
  'Estornos negativos continuam bloqueados no writer simples.');
assert.match(gateway, /type:\s*'income'\s*\|\s*'expense'/,
  'Gateway simples deve aceitar somente receita/despesa.');
assert.match(gateway, /status:\s*'planned'\s*\|\s*'paid'/,
  'Writer simples deve limitar a situação ao contrato explicitamente homologado.');
assert.match(gateway, /if \(!PHOENIX_WRITE_CAPABILITIES\.simpleEvent\)/,
  'Gateway deve continuar falhando fechado se a capacidade frontend for revogada.');

assert.doesNotMatch(movements, /submitPhoenixSimpleEvent|runPhoenixSimpleEventWrite/,
  'Tela React base não deve acionar escrita diretamente; a liberação fica isolada no bridge protegido.');
assert.match(movements, /Revisar lançamento · sem gravar/,
  'Primeira etapa do drawer deve permanecer revisão antes da gravação.');

assert.match(bridge, /preparePhoenixSimpleEvent/,
  'Bridge homologado deve preparar o comando antes do envio.');
assert.match(bridge, /runPhoenixSimpleEventWrite/,
  'Bridge homologado deve executar o gateway oficial e aguardar confirmação.');
assert.match(bridge, /state\.operationId\s*=\s*prepared\.operationId/,
  'Bridge deve preservar operationId para retry idempotente.');
assert.match(bridge, /result\.status !== 'confirmed'/,
  'Bridge não pode tratar a gravação como concluída sem confirmação do servidor.');
assert.match(bridge, /Transferências continuam bloqueadas/,
  'Transferência deve permanecer fora do writer simples.');
assert.match(bridge, /Estornos e valores negativos continuam bloqueados/,
  'Estornos devem permanecer fora do writer simples.');
assert.match(bridge, /Recorrência continua em simulação/,
  'Recorrência não pode ser gravada acidentalmente pelo writer simples.');
assert.match(bridge, /Cartão e crediário continuam bloqueados/,
  'Cartão e crediário devem permanecer nos writers específicos de seus domínios.');

assert.match(previewServer, /simpleEventWriteEnabled\s*=\s*process\.env\.PHOENIX_SIMPLE_EVENT_WRITE\s*===\s*'enabled'/,
  'Proxy deve exigir flag explícita além da capacidade frontend.');
assert.match(previewServer, /allowedFinancialPosts\s*=\s*new Set\(\['\/finance\/events'\]\)/,
  'Proxy do writer simples deve aceitar somente o endpoint exato de criação.');
assert.match(previewServer, /simpleEventWriteEnabled\s*&&\s*allowedFinancialPosts\.has\(pathname\)/,
  'Allowlist financeira simples não pode funcionar com a flag do ambiente desligada.');
assert.match(previewServer, /PREVIEW_READ_ONLY/,
  'Mutações não homologadas devem continuar bloqueadas pelo proxy.');

console.log('Gateway do writer simples Phoenix validado sob capacidade frontend, idempotência e gate de ambiente.');
