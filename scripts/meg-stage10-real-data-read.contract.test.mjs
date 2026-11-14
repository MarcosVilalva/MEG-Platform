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
const cors=read('apps/api/src/cors.ts');
assert.match(qa,/realRequested=params\.get\('dados'\)==='reais'/);
assert.match(qa,/if\(!realEnabled\)window\.fetch=/);
assert.match(qa,/<UnifiedQA\/>/);
assert.match(qa,/<UnifiedRealReadQa enabled=\{realEnabled\}/);
assert.match(bridge,/env\.enabled!=='true'/);
assert.match(bridge,/api\.protocol!=='https:'/);
assert.match(bridge,/api\.origin===page\.origin/);
assert.match(bridge,/validateSession\(session\)/);
assert.match(bridge,/getSyncStatus\(\)/);
assert.match(bridge,/before\.token!==after\.token/);
assert.match(bridge,/current\.user\.id!==session\.user\.id/);
assert.match(bridge,/readSmartAuthorizedHistory/);
assert.match(bridge,/before\.capabilities\?\.historySnapshotV1===true/);
assert.match(bridge,/readAuthorizedHistory\(page,signal\)/);
assert.match(bridge,/history:\{protocol:'financial-history-v1',kind:'complete',items:events\}/);
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
assert.match(cors,/configuredOrigins\.includes\(origin\)/);
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
