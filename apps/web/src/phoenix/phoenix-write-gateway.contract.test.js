import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const gateway = readFileSync(new URL('./data/phoenix-write-gateway.ts', import.meta.url), 'utf8');
const movements = readFileSync(new URL('./screens/PhoenixMovementsV15.tsx', import.meta.url), 'utf8');
const previewServer = readFileSync(new URL('../../phoenix-preview-server.mjs', import.meta.url), 'utf8');

assert.match(gateway, /simpleEvent:\s*false/,
  'Writer deve permanecer desabilitado por capacidade enquanto backend/proxy não forem liberados.');
assert.match(gateway, /existingOperationId\s*\|\|\s*operationId\(\)/,
  'Retry do mesmo comando deve poder reutilizar o mesmo operationId.');
assert.match(gateway, /operationId:\s*prepared\.operationId/,
  'Envio deve usar exatamente o operationId preparado antes da primeira tentativa.');
assert.match(gateway, /financeClient\.createEvent/,
  'Primeiro writer simples deve usar o domínio financeiro oficial.');
assert.match(gateway, /clearPhoenixReadModelCache\(\)/);
assert.match(gateway, /loadPhoenixReadModel\(refreshMonth,\s*\{ force: true \}\)/,
  'Snapshot só deve ser recarregado depois da confirmação do servidor.');
assert.match(gateway, /PHOENIX_POSITIVE_AMOUNT_REQUIRED/,
  'Estornos negativos continuam bloqueados no primeiro writer.');
assert.match(gateway, /type:\s*'income'\s*\|\s*'expense'/,
  'Gateway inicial deve aceitar somente receita/despesa simples.');

assert.doesNotMatch(movements, /submitPhoenixSimpleEvent|runPhoenixSimpleEventWrite/,
  'Tela de Lançamentos não pode acionar o writer antes da liberação explícita.');
assert.match(movements, /Revisar lançamento · sem gravar/,
  'CTA visual deve continuar sem gravação nesta fase.');

assert.match(previewServer, /const allowedAuthPosts = new Set/);
assert.doesNotMatch(previewServer, /allowedFinancialPosts|\/finance\/events['"`]/,
  'Proxy do preview deve continuar sem allowlist financeira de POST.');
assert.match(previewServer, /PREVIEW_READ_ONLY/,
  'Mutações não homologadas devem continuar bloqueadas pelo proxy.');

console.log('Gateway do primeiro writer Phoenix preparado e ainda bloqueado com segurança.');
