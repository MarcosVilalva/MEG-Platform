import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(process.cwd()+'/'+path,'utf8');
const qa=read('apps/web/src/meg-web-evolution/integrated-qa/unified-preview.tsx');
const bridge=read('apps/web/src/meg-web-evolution/stage10/real-data-read.ts');
const live=read('apps/web/src/meg-web-evolution/stage10/UnifiedRealReadQa.tsx');
const editor=read('apps/web/src/meg-web-evolution/stage10/EditExpensePreview.tsx');
const operational=read('apps/web/src/meg-web-evolution/launches/OperationalLaunches.tsx');
const workspace=read('apps/api/src/modules/finance/stage10-readonly-workspace.ts');
const routes=read('apps/api/src/modules/finance/stage10-readonly-routes.ts');
const financeRoutes=read('apps/api/src/modules/finance/routes.ts');
const canonical=read('apps/api/src/modules/finance/read-model.ts');
const cors=read('apps/api/src/cors.ts');
// A entrada original de QA permanece visual, ficticia e sem acesso a API.
assert.match(qa,/realRequested=params\.get\('dados'\)==='reais'/);
assert.match(qa,/if\(!realEnabled\)window\.fetch=/);
assert.match(qa,/<UnifiedQA\/>/);
assert.match(qa,/<UnifiedRealReadQa enabled=\{realEnabled\}/);
// Opt-in isolado. Somente GET autenticado do snapshot de transacao READ ONLY.
assert.match(bridge,/env\.enabled!=='true'/);
assert.match(bridge,/api\.protocol!=='https:'/);
assert.match(bridge,/api\.origin===page\.origin/);
assert.match(bridge,/validateSession\(session\)/);
assert.match(bridge,/stage10-readonly\/snapshot\?month=/);
assert.match(bridge,/data\.consistency!=='repeatable-read'/);
assert.match(bridge,/data\.actorId!==session\.user\.id/);
assert.match(bridge,/data\.total!==data\.events\.length/);
assert.match(bridge,/current\.accessToken!==session\.accessToken/);
assert.match(bridge,/history:\{protocol:'financial-history-v1',kind:'complete',items:data\.events\}/);
assert.match(bridge,/creditCards:\[\]/);
assert.match(bridge,/verocard/i);
assert.doesNotMatch(bridge,/getSyncStatus|readHome|readSmartAuthorizedHistory|financeClient\.listEvents/);
assert.doesNotMatch(bridge,/homeP0QaPreviewFixture|QA_EDIT_EXPENSE_SNAPSHOT/);
assert.doesNotMatch(live,/homeP0QaPreviewFixture|QA_EDIT_EXPENSE_SNAPSHOT/);
assert.match(live,/saveEnabled=\{false\}/);
assert.match(live,/strictReferences:true/);
assert.match(live,/setData\(null\)/);
assert.match(live,/if\(!enabled\)return/);
assert.match(editor,/snapshot\.strictReferences/);
assert.match(editor,/a\.id===snapshot\.accountId/);
assert.match(editor,/m\.id===snapshot\.paymentMethodId/);
assert.match(operational,/type:accounts\.find\(account=>account\.id===id\)\?\.type/);
// Transacao sem qualquer reparo de usuario/workspace e sem writer.
assert.match(workspace,/SET TRANSACTION READ ONLY/);
assert.match(workspace,/TransactionIsolationLevel.RepeatableRead/);
assert.match(workspace,/workspace:\{isActive:true,ownerId:actorId\}/);
assert.doesNotMatch(workspace,/\b(?:ensurePrimaryWorkspace|resolveWorkspaceContext)\s*\(/);
assert.doesNotMatch(workspace,/\b(?:create|update|delete|upsert|createMany|updateMany|deleteMany)\s*\(/);
// Escopo deve conter OS DOIS vinculos. Resumos userId-only apenas no
// caso conservador em que uma unica base e os eventos do owner coincidem.
assert.match(routes,/app\.get\('\/stage10-readonly\/snapshot'/);
assert.match(routes,/preHandler:app\.authorize/);
assert.match(routes,/withStage10ReadOnlyWorkspace\(request\.user\.sub/);
assert.match(routes,/userId:scope\.ownerId,workspaceId:scope\.workspaceId,archivedAt:null/);
assert.match(routes,/ownerWorkspaceCount!==1\|\|foreignOwnerEvents!==0\|\|workspaceEventCount!==total/);
assert.match(routes,/getCanonicalFinancialSummary\(scope\.ownerId,parsed\.data\.month,tx\)/);
assert.match(routes,/getCanonicalFinancialCashflow\(scope\.ownerId,parsed\.data\.month,tx\)/);
assert.match(routes,/new Map\(accounts\.map/);
assert.match(routes,/canWrite:false/);
assert.match(routes,/Cache-Control','private, no-store'/);
assert.match(routes,/rawData:true/);
assert.match(routes,/stage10HistoricLabels/);
assert.match(routes,/events:events\.map\(\(\{importedRow,sourcePayload,\.\.\.item\}\)/);
assert.doesNotMatch(routes,/sourceRawData/);
assert.match(canonical,/getCanonicalFinancialSummary\(userId: string, month: string, db: Prisma.TransactionClient/);
assert.match(canonical,/getCanonicalFinancialCashflow\(userId: string, month: string, db: Prisma.TransactionClient/);
assert.match(financeRoutes,/MEG_STAGE10_REAL_READ_API_ENABLED/);
assert.match(cors,/configuredOrigins\.includes\(origin\)/);
// Proibir qualquer escritor financeiro no bridge, na tela e na rota.
for(const source of [bridge,live,routes]){
 for(const writer of ['financeClient.createEvent','financeClient.updateEvent',
  'financeClient.bulkUpdateEvents','financeClient.archiveEvent',
  'financeClient.settleEvent','financeClient.createTransfer',
  'tx.financialEvent.create','tx.financialEvent.update','tx.financialEvent.delete']){
  assert.ok(!source.includes(writer),'Writer indevido: '+writer);
 }
}
console.log('MEG_STAGE10_REAL_READ_AUTH_SNAPSHOT_READ_ONLY PASS');
console.log('MEG_STAGE10_WORKSPACE_EXCLUSIVITY_AND_NO_MOCK_FALLBACK PASS');
console.log('MEG_STAGE10_DEFAULT_QA_NO_NETWORK PASS');
