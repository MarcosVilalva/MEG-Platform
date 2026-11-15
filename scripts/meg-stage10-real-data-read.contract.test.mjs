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
const stage10App=read('apps/api/src/stage10-readonly-app.ts');
const stage10Server=read('apps/api/src/stage10-readonly-server.ts');
const stage10Jwt=read('apps/api/src/stage10-public-jwt-contract.ts');

// A entrada original de QA permanece visual, ficticia e sem acesso a API.
assert.match(qa,/realRequested=params\.get\('dados'\)==='reais'/);
assert.match(qa,/readonlyApiUrl:import\.meta\.env\.VITE_MEG_STAGE10_READONLY_API_URL/);
assert.match(qa,/if\(!realEnabled\)window\.fetch=/);
assert.match(qa,/<UnifiedQA\/>/);
assert.match(qa,/<UnifiedRealReadQa enabled=\{realEnabled\}/);
// Opt-in isolado. Somente GET autenticado do snapshot de transacao READ ONLY.
assert.match(bridge,/env\.enabled!=='true'/);
assert.match(bridge,/api\.protocol!=='https:'/);
assert.match(bridge,/authOrigin===page\|\|dataOrigin===page/);
assert.match(bridge,/authOrigin===dataOrigin/);
assert.match(bridge,/credentials:'omit'/);
assert.match(bridge,/readStage10Snapshot/);
assert.doesNotMatch(bridge,/validateSession\(session\)/);
assert.match(bridge,/Nao chamar \/auth\/me canonico/);
assert.match(bridge,/refreshAuthSession\(\)/);
assert.match(bridge,/auth\/stage10-qa\/exchange/);
assert.match(bridge,/exchangeStage10QaToken/);
assert.match(bridge,/body:JSON\.stringify\(\{refreshToken:session\.refreshToken\}\)/);
assert.doesNotMatch(bridge,/send\((?:initial|refreshed)\.accessToken\)/);

assert.match(bridge,/stage10-readonly\/snapshot\?month=/);
assert.match(bridge,/data\.consistency!=='repeatable-read'/);
assert.match(bridge,/data\.actorId!==session\.user\.id/);
assert.match(bridge,/data\.total!==data\.events\.length/);
assert.match(bridge,/current\.user\.id!==session\.user\.id/);
assert.match(bridge,/history:\{protocol:'financial-history-v1',kind:'complete',items:data\.events\}/);
assert.match(bridge,/creditCards:cards\.filter\(item=>item\.isActive\)/);
assert.match(bridge,/\['checking','savings','cash'\]/);
assert.match(bridge,/verocard/i);
assert.doesNotMatch(bridge,/getSyncStatus|readHome|readSmartAuthorizedHistory|financeClient\.listEvents/);
assert.doesNotMatch(bridge,/homeP0QaPreviewFixture|QA_EDIT_EXPENSE_SNAPSHOT/);
assert.doesNotMatch(live,/homeP0QaPreviewFixture|QA_EDIT_EXPENSE_SNAPSHOT/);
assert.match(live,/VITE_MEG_STAGE10_REAL_WRITE_ENABLED/);
assert.match(live,/stage10RealMutationGate/);
assert.match(live,/Number\.isFinite\(event\.enteredAmount\)/);
assert.match(live,/amountDisplay:money\.format\(event\.enteredAmount\?\?Number\.NaN\)/);
assert.doesNotMatch(live,/Math\.abs\(row\.signedAmount\)/);

assert.match(live,/saveEnabled=\{writeEnabled&&!saving\}/);
assert.match(live,/financeClient\.createEvent/);
assert.match(live,/financeClient\.bulkUpdateEvents/);
assert.match(live,/financeClient\.bulkArchiveEvents/);
assert.match(live,/strictReferences:true/);
assert.match(live,/setData\(null\)/);
assert.match(live,/if\(!enabled\)return/);
assert.match(editor,/snapshot\.strictReferences/);
assert.match(editor,/a\.id===snapshot\.accountId/);
assert.match(editor,/m\.id===snapshot\.paymentMethodId/);
assert.match(editor,/saveEnabled=\{!readOnly&&Boolean\(onRequestSave\|\|onSimulatedSave\)\}/);
assert.match(live,/<EditExpensePreview snapshot=\{edit\} catalogs=\{data\.catalogs\}/);
assert.match(live,/readOnly=\{!writeEnabled\|\|saving\}/);
assert.match(operational,/type:accounts\.find\(account=>account\.id===id\)\?\.type/);
const liveLaunches=read('apps/web/src/meg-web-evolution/launches/LaunchesStage09.tsx');
assert.match(liveLaunches,/row\.status==='planned'&&!row\.accountId/);

// Transacao sem qualquer reparo de usuario/workspace e sem writer.
assert.match(workspace,/SET TRANSACTION READ ONLY/);
assert.match(workspace,/TransactionIsolationLevel.RepeatableRead/);
assert.match(workspace,/workspace:\{isActive:true,ownerId:actorId\}/);
assert.doesNotMatch(workspace,/\b(?:ensurePrimaryWorkspace|resolveWorkspaceContext)\s*\(/);
assert.doesNotMatch(workspace,/\b(?:create|update|delete|upsert|createMany|updateMany|deleteMany)\s*\(/);
// Escopo deve conter OS DOIS vinculos. Resumos userId-only apenas no
// caso conservador em que uma unica base e os eventos do owner coincidem.
assert.match(routes,/app\.get\('\/stage10-readonly\/snapshot'/);
assert.match(routes,/app\.get\('\/stage10-readonly\/card-preview'/);
assert.match(routes,/cardPurchaseCyclePreview/);
assert.match(bridge,/loadStage10CardPreview/);
assert.match(live,/onRequestSchedule/);
assert.doesNotMatch(live,/cardPurchaseCyclePreview/);
assert.match(routes,/preHandler:app\.authorize/);
assert.match(routes,/withStage10ReadOnlySessionWorkspace\(request\.user\.sub/);
assert.match(routes,/stage10SessionId/);
assert.match(workspace,/tx\.authSession\.findUnique/);
assert.match(workspace,/session\.revokedAt!==null/);
assert.match(workspace,/scope\.workspaceId!==workspaceId/);
assert.match(workspace,/session\.expiresAt\.getTime\(\)<=Date\.now\(\)/);
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
// A API Fastify QA nunca deve aceitar o HMAC de login da API canonica.
assert.match(stage10App,/verifyStage10PublicJwt/);
assert.match(stage10App,/assertStage10PublicVerificationKey/);
for(const forbidden of ["from './plugins/auth'","await registerAuth(",".jwtVerify(",".jwtSign(","config.jwtSecret"]){
 assert.ok(!stage10App.includes(forbidden),'Auth canonica indevida no QA: '+forbidden);
}
assert.match(stage10Server,/MEG_STAGE10_QA_JWT_PUBLIC_KEY_PEM/);
assert.match(stage10Server,/MEG_STAGE10_QA_JWT_ISSUER/);
assert.match(stage10Server,/MEG_STAGE10_QA_JWT_AUDIENCE/);
for(const forbidden of ["from './plugins/auth'","await registerAuth(",".jwtSign(","config.jwtSecret"]){
 assert.ok(!stage10Server.includes(forbidden),'Auth canonica indevida no servidor QA: '+forbidden);
}
assert.match(stage10Jwt,/stage10:finance:read/);
assert.match(stage10Jwt,/RSA-SHA256/);
assert.match(stage10Jwt,/RS256/);
assert.match(stage10Jwt,/claimString\(claims\.sid,256\)/);
assert.match(stage10Jwt,/claimString\(claims\.wid,256\)/);
assert.match(stage10App,/stage10SessionId=claims\.sid/);
assert.match(stage10App,/stage10WorkspaceId=claims\.wid/);
// Proibir qualquer escritor financeiro no bridge, na tela e na rota.
for(const source of [bridge,routes]){
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

// Writers reais somente na origem canonica e com opt-in de build, nao no snapshot QA.
assert.match(live,/writeEnabled\|\|!data/);
assert.match(live,/financeClient\.createBenefitEvent/);
assert.match(live,/financeClient\.updateBenefitEvent/);
assert.match(live,/edit\.financialScope==='benefit'/);
assert.doesNotMatch(live,/financeClient\.createTransfer|financeClient\.createCardPurchase/);
assert.doesNotMatch(bridge,/financeClient\.createBenefitEvent/);
