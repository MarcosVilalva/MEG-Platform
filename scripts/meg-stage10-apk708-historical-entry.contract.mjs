/**
 * Stage10: prova de origem do APK 708 por fonte versionada (somente leitura).
 * Commit exato do build-android-apk.yml run #708: 36c886b...
 * Nao compila, executa, modifica ou autentica a APK, Android ou API produtiva.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const SOURCE_SHA = '36c886b9597be95a28eb2add00f073e5f43f6fe0';

function atRelease(path) {
  return execFileSync('git', ['show', SOURCE_SHA + ':' + path],
    { encoding: 'utf8', maxBuffer: 3 * 1024 * 1024, timeout: 20_000 });
}
function contains(source, term, reason) {
  assert.ok(source.includes(term), reason + ': ' + term);
}

const workflow = atRelease('.github/workflows/build-android-apk.yml');
contains(workflow, 'VITE_MOBILE_APP:', 'Build mobile');
contains(workflow, 'CAPACITOR_BUILD:', 'Build APK Capacitor');
contains(workflow, 'VITE_API_URL:', 'API do build');
contains(workflow, 'npm run build:web', 'Build JS antes de sincronizar');

const html = atRelease('apps/web/index.html');
contains(html, 'src="/src/app/main.tsx"', 'Entrada do Android');
const main = atRelease('apps/web/src/app/main.tsx');
contains(main, "await import('../phoenix/preview-main')", 'Bootstrap Phoenix');
assert.ok(!main.includes('instant-persistence.js')
  && !main.includes('legacy-cloud.js'),
  'Entrada principal nao importa modulos legados diretamente');
const preview = atRelease('apps/web/src/phoenix/preview-main.tsx');
contains(preview, "import { PhoenixApp } from './PhoenixApp'", 'React Phoenix');

const gateway = atRelease('apps/web/src/phoenix/data/phoenix-write-gateway.ts');
const finance = atRelease('apps/web/src/app/finance-client.ts');
const cards = atRelease('apps/web/src/app/cards-client.ts');
contains(gateway, 'financeClient.createEvent(', 'Novo evento Phoenix');
contains(finance, "'/finance/events'", 'Endpoint canonical novo evento');
contains(gateway, "'/finance/benefit-events'", 'Endpoint beneficio');
contains(gateway, 'cardsClient.createPurchase(', 'Compra cartao');
contains(cards, "'/cards/purchases'", 'Endpoint compra cartao');
contains(gateway, 'financeClient.bulkUpdateEvents(', 'Edicao evento');
contains(finance, "'/finance/events/bulk/update'", 'Endpoint edicao protegida');
contains(gateway, 'financeClient.bulkArchiveEvents(', 'Arquivo evento');
contains(finance, "'/finance/events/bulk/archive'", 'Endpoint arquivamento protegido');

contains(gateway, 'const pendingEditOperations = new Map', 'Operacoes em memoria');
contains(gateway, 'const pendingArchiveOperations = new Map', 'Arquivamento em memoria');
assert.ok(!gateway.includes('indexedDB') && !gateway.includes('localStorage'),
  'Gateway financeiro nao apresenta fila local persistente neste arquivo');

const old = atRelease('apps/web/src/instant-persistence.js');
contains(old, 'meg-cloud-transaction-outbox-v1', 'Codigo legado no repo antigo');
contains(old, '/app-state/transactions', 'Codigo legado no repo antigo');
assert.ok(!main.includes('instant-persistence'), 'Nao confundir fonte legado com entrypoint');

console.log('MEG_STAGE10_APK708_HISTORICAL_PHOENIX_ENTRYPOINT=PASS');
console.log('MEG_STAGE10_APK708_CANONICAL_FINANCE_CARD_BENEFIT_ROUTES=PASS');
console.log('MEG_STAGE10_APK708_LEGACY_SOURCE_NOT_DIRECT_ENTRYPOINT=PASS');
console.log('MEG_STAGE10_APK708_GATEWAY_LOCAL_DURABILITY_NOT_PROVEN=PASS');
