import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=process.cwd();
const read=p=>readFileSync(root+'/'+p,'utf8');
const qa=read('apps/web/src/meg-web-evolution/integrated-qa/unified-preview.tsx');
const bridge=read('apps/web/src/meg-web-evolution/stage10/real-data-read.ts');
const live=read('apps/web/src/meg-web-evolution/stage10/UnifiedRealReadQa.tsx');
const edit=read('apps/web/src/meg-web-evolution/stage10/EditExpensePreview.tsx');
const operational=read('apps/web/src/meg-web-evolution/launches/OperationalLaunches.tsx');
const workspace=read('apps/api/src/modules/workspaces/service.ts');
const isolatedWorkspace=read('apps/api/src/modules/finance/stage10-readonly-workspace.ts');
const stage10Routes=read('apps/api/src/modules/finance/stage10-readonly-routes.ts');
const financeRoutes=read('apps/api/src/modules/finance/routes.ts');
const cors=read('apps/api/src/cors.ts');
const readonlyRoutes=read('apps/api/src/modules/finance/stage10-readonly-routes.ts');
const legacyFinanceRoutes=read('apps/api/src/modules/finance/routes.ts');
assert.match(qa,/realRequested=params\.get\('dados'\)==='reais'/);
assert.match(qa,/if\(!realEnabled\)window\.fetch=/);
assert.match(qa,/<UnifiedQA\/>/);
assert.match(qa,/<UnifiedRealReadQa enabled=\{realEnabled\}/);
assert.match(bridge,/env\.enabled!=='true'/);
assert.match(bridge,/api\.protocol!=='https:'/);
assert.match(bridge,/api\.origin===page\.origin/);
assert.match(bridge,/validateSession\(session\)/);
assert.match(bridge,/stage10-readonly\\/snapshot\\?month/);
assert.match(bridge,/data\\.consistency!=='repeatable-read'/);
assert.match(bridge,/data\\.actorId!==session\\.user\\.id/);
assert.match(bridge,/data\\.total!==data\\.events\\.length/);
assert.match(bridge,/current\\.accessToken!==session\\.accessToken/);
assert.match(bridge,/supportsFilteredSummary:false/);
assert.match(bridge,/home:null/);
assert.doesNotMatch(bridge,/financeClient\\.|readHome\\(|readSmartAuthorizedHistory\\(/);
assert.match(bridge,/history:\\{protocol:'financial-history-v1',kind:'complete',items:data\\.events\\}/);
assert.match(bridge,/creditCards:\[\]/);
assert.match(bridge,/verocard/i);
assert.match(live,/saveEnabled=\{false\}/);
assert.match(live,/strictReferences:true/);
assert.match(live,/setData\(null\)/);
assert.match(live,/if\(!enabled\)return/);
assert.match(edit,/snapshot\.strictReferences/);
assert.match(edit,/a\.id===snapshot\.accountId/);
assert.match(edit,/m\.id===snapshot\.paymentMethodId/);
assert.match(operational,/type:accounts\.find\(account=>account\.id===id\)\?\.type/);
assert.match(workspace,/await ensurePrimaryWorkspace\(\)/);
assert.match(isolatedWorkspace,/SET TRANSACTION READ ONLY/);
assert.match(isolatedWorkspace,/withStage10ReadOnlyWorkspace/);
assert.match(stage10Routes,/app\.get\('\/stage10-readonly\/snapshot'/);
assert.match(stage10Routes,/preHandler:app\.authorize/);
assert.match(stage10Routes,/withStage10ReadOnlyWorkspace\(request\.user\.sub/);
assert.match(stage10Routes,/workspaceId:scope\.workspaceId,archivedAt:null/);
assert.match(stage10Routes,/canWrite:false/);
assert.match(stage10Routes,/Cache-Control','private, no-store'/);
assert.doesNotMatch(stage10Routes,/sourceRawData/);
assert.match(financeRoutes,/registerStage10ReadOnlyRoutes\(app\)/);
assert.match(isolatedWorkspace,/TransactionIsolationLevel.RepeatableRead/);
assert.match(isolatedWorkspace,/workspace:\{isActive:true,ownerId:actorId\}/);
assert.doesNotMatch(isolatedWorkspace,/\b(?:ensurePrimaryWorkspace|resolveWorkspaceContext)\s*\(/);
assert.doesNotMatch(isolatedWorkspace,/\b(?:create|update|delete|upsert|createMany|updateMany|deleteMany)\s*\(/);
assert.match(cors,/configuredOrigins\.includes\(origin\)/);
assert.match(readonlyRoutes,/workspaceId:scope\.workspaceId/);
assert.match(readonlyRoutes,/withStage10ReadOnlyWorkspace/);
assert.match(readonlyRoutes,/getCanonicalFinancialSummary\(scope\.ownerId,parsed\.data\.month,tx\)/);
assert.match(readonlyRoutes,/getCanonicalFinancialCashflow\(scope\.ownerId,parsed\.data\.month,tx\)/);
assert.match(live,/A Home real permanece bloqueada/);
assert.doesNotMatch(live,/financeClient\.getSyncStatus|financeClient\.getFilteredHistorySummary/);
assert.match(readonlyRoutes,/new Map\(accounts\.map/);
assert.doesNotMatch(readonlyRoutes,/rawData:true/);
assert.match(legacyFinanceRoutes,/MEG_STAGE10_REAL_READ_API_ENABLED/);
// O codigo de integracao tem somente chamadas a leitores; o componente
// de edicao simula salvamento e nao chama nenhum writer financeiro.
for(const s of [bridge,live]){
 for(const forbidden of ['financeClient.createEvent','financeClient.updateEvent',
  'financeClient.bulkUpdateEvents','financeClient.archiveEvent',
  'financeClient.settleEvent','financeClient.createTransfer']){
  assert.ok(!s.includes(forbidden),'Writer indevido: '+forbidden);
 }
}
assert.ok(!live.includes('homeP0QaPreviewFixture')&&!bridge.includes('homeP0QaPreviewFixture'));
assert.ok(!live.includes('QA_EDIT_EXPENSE_SNAPSHOT')&&!bridge.includes('QA_EDIT_EXPENSE_SNAPSHOT'));
console.log('MEG_STAGE10_REAL_DATA_READ_OPT_IN_FAIL_CLOSED PASS');
console.log('MEG_STAGE10_NO_MOCK_FALLBACK_NO_WRITERS PASS');
console.log('MEG_STAGE10_BACKEND_READ_SIDE_EFFECT_GAP_DOCUMENTED');
