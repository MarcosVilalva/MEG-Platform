import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const control = readFileSync(new URL('./components/PhoenixLaunchWriteControl.tsx', import.meta.url), 'utf8');
const transferGateway = readFileSync(new URL('./data/phoenix-transfer-write-gateway.ts', import.meta.url), 'utf8');
const bridge = readFileSync(new URL('./simple-event-form-bridge.ts', import.meta.url), 'utf8');

assert.match(control, /runPhoenixTransferWrite/,
  'A confirmação React da Phoenix deve chamar o gateway protegido de transferência diretamente.');
assert.match(control, /preparedTransferRef/,
  'Retry de transferência deve preservar o comando preparado e o operationId.');
assert.match(control, /transferInput \|\| readTransferInputFromDrawer\(\)/,
  'O comando tipado deve ter prioridade, mantendo o leitor do drawer apenas como compatibilidade transitória.');
assert.match(control, /onCommitted\?\.\(result\.snapshot\)/,
  'A transferência só deve atualizar o shell com o snapshot relido após confirmação do servidor.');
assert.doesNotMatch(control, /data-phoenix-transfer-confirm/,
  'A confirmação de transferência não pode depender do marcador legado interceptado pelo bridge.');
assert.doesNotMatch(control, /px-review-launch\s+px-confirm-transfer/,
  'O botão final de transferência não pode reutilizar a classe de revisão do bridge legado.');

assert.match(transferGateway, /runtimeCapabilities\.transferWrite/,
  'O gateway deve falhar fechado sem a capacidade transferWrite do ambiente.');
assert.match(transferGateway, /authenticatedRequest<PhoenixTransferResult>\('\/finance\/transfers'/,
  'A transferência deve usar somente o endpoint atômico oficial.');
assert.match(transferGateway, /operationId:\s*prepared\.operationId/,
  'A requisição deve enviar exatamente o operationId preparado para retry idempotente.');
assert.match(transferGateway, /loadPhoenixReadModel\(refreshMonth,\s*\{ force: true \}\)/,
  'A conclusão deve depender de releitura forçada do snapshot financeiro.');

assert.doesNotMatch(bridge, /authenticatedRequest\('\/finance\/transfers'/,
  'O bridge visual não pode voltar a gravar transferência diretamente na API.');

console.log('Contrato de transferência direta da Phoenix validado sem dependência do bridge legado.');
