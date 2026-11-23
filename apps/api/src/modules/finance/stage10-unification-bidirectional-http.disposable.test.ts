/**
 * Etapa 10 PT74: HTTP bidirecional em PostgreSQL 17 inteiramente sintético.
 * Autenticação JWT real no Fastify e usuários fictícios; não valida APK,
 * conexão externa, dispositivo físico ou comportamento offline do Android.
 * Run only in freshly initialized ephemeral DB on 127.0.0.1:55459.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fastify from 'fastify';
import bcrypt from 'bcryptjs';
import { registerAuth } from '../../plugins/auth';
import { authRoutes } from '../auth/routes';
import { LicenseStatus, Prisma, UserRole, UserStatus, prisma } from '@meg/database';
import { appStateRoutes } from '../app-state/routes';
import { financeRoutes } from './routes';
import { financeBenefitEventRoutes } from './benefit-event-routes';
import { stage10UnificationSyntheticMirrorEnabled } from '../app-state/stage10-qa-write-gate';
import { archiveMonetaryExpenseInSyntheticQa,Stage10SyntheticArchiveError } from './stage10-synthetic-archive';

const db = new URL(process.env.DATABASE_URL || 'http://invalid');
assert.equal(db.protocol,'postgresql:');
assert.equal(db.hostname,'127.0.0.1');
assert.equal(db.port,'55459');
assert.equal(db.pathname,'/meg_stage10_pt63_disposable');
assert.equal(db.username,'meg_stage10_pt63_writer');
assert.equal(process.env.MEG_STAGE10_HISTORICAL_DISPOSABLE_WRITE_TEST,'1');
assert.equal(process.env.MEG_STAGE10_UNIFICATION_SYNTHETIC_MIRROR,'1');
assert.equal(stage10UnificationSyntheticMirrorEnabled(),true);

let app:ReturnType<typeof fastify>|undefined;
try{
 const tag='pt74-'+randomUUID();
 const password='Synthetic-Only-PT74-'+randomUUID();
 const user=await prisma.user.create({data:{
  email:tag+'@example.invalid',name:'Titular ficticio PT74',
  passwordHash:await bcrypt.hash(password,10),role:UserRole.ADMIN,
  status:UserStatus.ACTIVE,isActive:true,approvedAt:new Date(),
 }});
 const plan=await prisma.plan.create({data:{
  code:tag,name:'Plano ficticio PT74',monthlyPrice:0,maxMembers:2,features:[],
 }});
 const workspace=await prisma.workspace.create({data:{
  ownerId:user.id,name:'Workspace PT74 sintético',slug:tag,
  members:{create:{userId:user.id,role:UserRole.ADMIN,
   status:UserStatus.ACTIVE,isActive:true}},
  appState:{create:{userId:user.id,revision:1,state:{
   transactions:[],budgets:{},__megNormalization:{mode:'normalized-primary'}
  } as Prisma.InputJsonValue}},
  subscription:{create:{planId:plan.id,status:LicenseStatus.ACTIVE}},
 }});
 const account=await prisma.account.create({data:{
  userId:user.id,name:'Conta corrente PT74',type:'checking',openingBalance:100,
 }});
 const category=await prisma.category.create({data:{
  userId:user.id,name:'Mercado PT74',group:'CONTAS GERAIS',type:'expense',
 }});
 const method=await prisma.paymentMethod.create({data:{
  userId:user.id,name:'PIX PT74',type:'instant',
 }});
 app=fastify({logger:false});
 await registerAuth(app);
 await app.register(authRoutes,{prefix:'/auth'});
 await app.register(appStateRoutes,{prefix:'/app-state'});
 await app.register(financeRoutes,{prefix:'/finance'});
 await app.register(financeBenefitEventRoutes,{prefix:'/finance'});
 await app.ready();
 const denied=await app.inject({method:'GET',url:'/app-state'});
 assert.equal(denied.statusCode,401,'UNAUTHENTICATED_REQUEST_NOT_REJECTED');
 const login=await app.inject({method:'POST',url:'/auth/login',
  payload:{email:user.email,password}});
 assert.equal(login.statusCode,200,'SYNTHETIC_JWT_LOGIN_FAILED');
 const token=(login.json() as {accessToken?:string}).accessToken;
 assert.ok(token,'SYNTHETIC_ACCESS_TOKEN_ABSENT');
 const api=(args:{method:'GET'|'POST'|'PATCH'|'DELETE';url:string;payload?:unknown})=>
  app!.inject({...args,headers:{authorization:'Bearer '+token}});
 console.log('PT74_AUTH_MODE=REAL_JWT_SYNTHETIC');

 console.log('PT74_STEP=WEB_CREATE');
 const postBody={
  description:'Despesa criada na Web PT74',type:'expense',status:'paid',
  date:'2026-11-19',amount:12.34,accountId:account.id,
  categoryId:category.id,paymentMethodId:method.id,operationId:randomUUID(),
 };
 const created=await api({method:'POST',url:'/finance/events',payload:postBody});
 assert.equal(created.statusCode,201,'WEB_CREATE_REJECTED_'+created.statusCode);
 const canonical=created.json() as {id:string;legacyTransactionId?:string;appStateRevision?:number};
 assert.ok(canonical.id);
 assert.equal(canonical.legacyTransactionId,canonical.id);
 const repeated=await api({method:'POST',url:'/finance/events',payload:postBody});
 assert.equal(repeated.statusCode,201);
 assert.equal((repeated.json() as {id:string}).id,canonical.id);
 assert.equal(await prisma.financialEvent.count({where:{workspaceId:workspace.id,legacyTransactionId:canonical.id}}),1);
 assert.equal(await prisma.ledgerEntry.count({where:{eventId:canonical.id}}),1);
 const androidRead=await api({method:'GET',url:'/app-state'});
 assert.equal(androidRead.statusCode,200);
 const androidPayload=androidRead.json() as {revision:number;state:{transactions:Array<{id:string;description:string}>}};
 assert.equal(androidPayload.state.transactions.filter(x=>x.id===canonical.id).length,1);
 assert.equal(androidPayload.state.transactions.find(x=>x.id===canonical.id)?.description,postBody.description);
 const webRead=await api({method:'GET',url:'/finance/events/history-snapshot'});
 assert.equal(webRead.statusCode,200);
 const webPayload=webRead.json() as {kind:string;items:Array<{id:string;legacyTransactionId?:string}>};
 assert.equal(webPayload.kind,'complete');
 assert.equal(webPayload.items.filter(x=>x.id===canonical.id).length,1);
 console.log('PT74_HTTP_WEB_TO_LEGACY=PASS');
 console.log('PT74_HTTP_WEB_REPLAY_IDEMPOTENT=PASS');

 console.log('PT74_STEP=ANDROID_PATCH');
 const legacyId='android-pt74-'+randomUUID();
 const legacy={
  id:legacyId,date:'2026-11-20',description:'Pendente sintético Android PT74',
  type:'expense',status:'pending',amount:5.43,expenseAmount:5.43,
  financialAccountId:account.id,category:category.name,group:category.group,
  paymentMethod:method.name,notes:'',
 };
 const patchBody={
  operationId:randomUUID(),expectedRevision:androidPayload.revision,
  upserts:[legacy],deletes:[],activities:[],
 };
 const patched=await api({method:'PATCH',url:'/app-state/transactions',payload:patchBody});
 assert.equal(patched.statusCode,200,'LEGACY_PATCH_REJECTED_'+patched.statusCode);
 const patchResult=patched.json() as {revision:number;changed:boolean;normalization?:{active:boolean}};
 assert.equal(patchResult.normalization?.active,true);
 const mapped=await prisma.financialEvent.findFirstOrThrow({
  where:{workspaceId:workspace.id,legacyTransactionId:legacyId},
 });
 assert.equal(mapped.status,'planned');
 assert.equal(mapped.accountId,account.id);
 assert.equal(await prisma.ledgerEntry.count({where:{eventId:mapped.id}}),0);
 const webFromAndroid=await api({method:'GET',url:'/finance/events/history-snapshot'});
 assert.equal(webFromAndroid.statusCode,200);
 const rows=(webFromAndroid.json() as {kind:string;items:Array<{id:string;legacyTransactionId?:string}>}).items;
 assert.equal(rows.filter(x=>x.legacyTransactionId===legacyId).length,1);
 assert.equal(rows.find(x=>x.legacyTransactionId===legacyId)?.id,mapped.id);
 console.log('PT74_HTTP_LEGACY_TO_WEB_PENDING=PASS');

 console.log('PT74_STEP=REPLAY');
 const repeatPatch=await api({method:'PATCH',url:'/app-state/transactions',payload:patchBody});
 assert.equal(repeatPatch.statusCode,200);
 assert.equal(await prisma.financialEvent.count({
  where:{workspaceId:workspace.id,legacyTransactionId:legacyId}
 }),1);
 assert.equal((await prisma.appState.findUniqueOrThrow({where:{workspaceId:workspace.id}})).revision,
  patchResult.revision);
 console.log('PT74_HTTP_LEGACY_REPLAY_IDEMPOTENT=PASS');

 console.log('PT74_STEP=CONFLICT');
 const stale=await api({method:'PATCH',url:'/app-state/transactions',payload:{
  ...patchBody,operationId:randomUUID(),
 }});
 assert.equal(stale.statusCode,409);
 assert.equal((stale.json() as {error:string}).error,'STATE_CONFLICT');
 const latest=await prisma.appState.findUniqueOrThrow({where:{workspaceId:workspace.id}});
 const webLine=(latest.state as {transactions:Array<Record<string,unknown>>}).transactions
  .find(x=>x.id===canonical.id);
 assert.ok(webLine);
 const illicit=await api({method:'PATCH',url:'/app-state/transactions',payload:{
  operationId:randomUUID(),expectedRevision:patchResult.revision,
  upserts:[{...webLine,description:'Android sobrescreveu Web'}],deletes:[],
 }});
 assert.equal(illicit.statusCode,409);
 const refusal=illicit.json() as {error:string;retryable:boolean};
 assert.equal(refusal.error,'NORMALIZATION_LINKED_EVENT_REQUIRES_CANONICAL_WRITER');
 assert.equal(refusal.retryable,false);
 assert.equal((await prisma.appState.findUniqueOrThrow({where:{workspaceId:workspace.id}})).revision,
  patchResult.revision);
 assert.equal((await prisma.financialEvent.findUniqueOrThrow({where:{id:canonical.id}})).description,
  postBody.description);
 console.log('PT74_HTTP_409_PERMANENT_ROLLBACK=PASS');

 console.log('PT74_STEP=ARCHIVE');
 const deleted=await api({method:'PATCH',url:'/app-state/transactions',payload:{
  operationId:randomUUID(),expectedRevision:patchResult.revision,
  upserts:[],deletes:[legacyId],
 }});
 assert.equal(deleted.statusCode,200);
 const afterDelete=deleted.json() as {revision:number};
 const archived=await prisma.financialEvent.findUniqueOrThrow({where:{id:mapped.id}});
 assert.ok(archived.archivedAt);
 assert.equal(archived.legacyTransactionId,legacyId);
 const restore=await api({method:'PATCH',url:'/app-state/transactions',payload:{
  operationId:randomUUID(),expectedRevision:afterDelete.revision,
  upserts:[legacy],deletes:[],
 }});
 assert.equal(restore.statusCode,409);
 assert.equal((restore.json() as {error:string;retryable:boolean}).error,
  'NORMALIZATION_ARCHIVED_EVENT_REQUIRES_RESTORE');
 assert.equal((restore.json() as {retryable:boolean}).retryable,false);
 assert.equal((await prisma.financialEvent.findUniqueOrThrow({where:{id:mapped.id}})).archivedAt?.toISOString(),
  archived.archivedAt?.toISOString());
 console.log('PT74_HTTP_ARCHIVE_RESTORE_GUARD=PASS');

 // PT74 financeiro: baixa de pendente mantendo ID e preservando todos os saldos.
 console.log('PT74_STEP=SETTLEMENT_FUTURE_BALANCE');
 const futureCharge=await api({method:'POST',url:'/finance/events',payload:{
  ...postBody,operationId:randomUUID(),description:'Gasto futuro sintético PT74',
  date:'2026-11-20',amount:70,
 }});
 assert.equal(futureCharge.statusCode,201);
 const fresh=await prisma.appState.findUniqueOrThrow({where:{workspaceId:workspace.id}});
 const pendingLegacyId='android-settlement-'+randomUUID();
 const pendingLegacy={...legacy,id:pendingLegacyId,
  description:'Conta pendente sintética para baixa',date:'2026-11-18',
  amount:20,expenseAmount:20,
 };
 const pendingPatch=await api({method:'PATCH',url:'/app-state/transactions',payload:{
  operationId:randomUUID(),expectedRevision:fresh.revision,upserts:[pendingLegacy],deletes:[],
 }});
 assert.equal(pendingPatch.statusCode,200,'PENDING_FOR_SETTLEMENT_NOT_CREATED');
 const pendingEvent=await prisma.financialEvent.findFirstOrThrow({where:{
  workspaceId:workspace.id,legacyTransactionId:pendingLegacyId,
 }});
 assert.equal(pendingEvent.status,'planned');
 assert.equal(await prisma.ledgerEntry.count({where:{eventId:pendingEvent.id}}),0);
 const rejectId=randomUUID();
 const rejectedPayment=await api({method:'POST',url:'/finance/events/'+pendingEvent.id+'/settle',payload:{
  operationId:rejectId,paidAt:'2026-11-19',
  accountId:account.id,paymentMethodId:method.id,
 }});
 assert.equal(rejectedPayment.statusCode,400);
 const refusalDetails=rejectedPayment.json() as {error:string;insufficientDay?:string};
 assert.equal(refusalDetails.error,'INSUFFICIENT_MONETARY_BALANCE');
 assert.equal(refusalDetails.insufficientDay,'2026-11-20');
 assert.equal((await prisma.financialEvent.findUniqueOrThrow({where:{id:pendingEvent.id}})).status,'planned');
 assert.equal(await prisma.ledgerEntry.count({where:{eventId:pendingEvent.id}}),0);
 assert.equal(await prisma.cloudMutationReceipt.findUnique({where:{workspaceId_operationId:{
  workspaceId:workspace.id,operationId:rejectId,
 }}}),null);
 console.log('PT74_FINANCE_RETROACTIVE_OVERDRAFT_BLOCKED=PASS');

 console.log('PT74_STEP=SETTLEMENT_VALID');
 const settlementAccount=await prisma.account.create({data:{
  userId:user.id,name:'Conta pagamento PT74',type:'checking',openingBalance:100,
 }});
 const settleReq={
  operationId:randomUUID(),paidAt:'2026-11-19',
  accountId:settlementAccount.id,paymentMethodId:method.id,
 };
 const paid=await api({method:'POST',url:'/finance/events/'+pendingEvent.id+'/settle',payload:settleReq});
 assert.equal(paid.statusCode,201,'LEGACY_SETTLEMENT_REJECTED');
 const paidBody=paid.json() as {event:{id:string;status:string;accountId:string};idempotentReplay:boolean};
 assert.equal(paidBody.event.id,pendingEvent.id);
 assert.equal(paidBody.event.status,'paid');
 assert.equal(paidBody.event.accountId,settlementAccount.id);
 assert.equal(paidBody.idempotentReplay,false);
 const afterPaid=await prisma.financialEvent.findUniqueOrThrow({where:{id:pendingEvent.id}});
 assert.equal(afterPaid.legacyTransactionId,pendingLegacyId);
 assert.equal(await prisma.ledgerEntry.count({where:{eventId:pendingEvent.id}}),1);
 const settledState=await api({method:'GET',url:'/app-state'});
 assert.equal(settledState.statusCode,200);
 const synced=(settledState.json() as {state:{transactions:Array<{
  id:string;status:string;financialAccountId:string;date:string;
 }>}}).state.transactions.find(x=>x.id===pendingLegacyId);
 assert.ok(synced);
 assert.equal(synced.status,'paid');
 assert.equal(synced.financialAccountId,settlementAccount.id);
 assert.equal(synced.date,'2026-11-19');
 const paidAgain=await api({method:'POST',url:'/finance/events/'+pendingEvent.id+'/settle',payload:settleReq});
 assert.equal(paidAgain.statusCode,201);
 assert.equal((paidAgain.json() as {idempotentReplay:boolean}).idempotentReplay,true);
 assert.equal(await prisma.ledgerEntry.count({where:{eventId:pendingEvent.id}}),1);
 console.log('PT74_FINANCE_SETTLEMENT_MIRROR_REPLAY=PASS');

 // PT75: fail closed instead of inventing a reversal via generic PATCH.
 const beforeReverseState=await prisma.appState.findUniqueOrThrow({
  where:{workspaceId:workspace.id},select:{revision:true},
 });
 const beforeReverseAudit=await prisma.auditLog.count({
  where:{entity:'FinancialEvent',entityId:pendingEvent.id},
 });
 const illegalReverse=await api({method:'PATCH',
  url:'/finance/events/'+pendingEvent.id,payload:{status:'planned'},
 });
 assert.equal(illegalReverse.statusCode,409,'GENERIC_REVERSE_NOT_BLOCKED');
 const illegalPayload=illegalReverse.json() as {error:string;retryable:boolean};
 assert.equal(illegalPayload.error,'FINANCIAL_EVENT_REVERSAL_REQUIRES_CANONICAL_WRITER');
 assert.equal(illegalPayload.retryable,false);
 assert.equal((await prisma.financialEvent.findUniqueOrThrow({
  where:{id:pendingEvent.id},
 })).status,'paid');
 assert.equal(await prisma.ledgerEntry.count({
  where:{eventId:pendingEvent.id},
 }),1);
 assert.equal((await prisma.appState.findUniqueOrThrow({
  where:{workspaceId:workspace.id},
 })).revision,beforeReverseState.revision);
 assert.equal(await prisma.auditLog.count({
  where:{entity:'FinancialEvent',entityId:pendingEvent.id},
 }),beforeReverseAudit);
 console.log('PT75_GENERIC_PAID_TO_PLANNED_BLOCKED=PASS');

 // PT76 characterization: archived Web expense must vanish from both reads,
 // keep the original event identity and forbid legacy implicit restore.
 const disposablePostedId=(futureCharge.json() as {id:string}).id;
 const beforeDeleteBalance=await api({method:'GET',url:
  '/finance/monetary-balance?accountId='+account.id+'&date=2026-11-20'});
 assert.equal(beforeDeleteBalance.statusCode,200);
 const beforeDeleteAmount=(beforeDeleteBalance.json() as {available:number}).available;
 const deleteEvent=await api({method:'DELETE',url:'/finance/events/'+disposablePostedId});
 assert.equal(deleteEvent.statusCode,200,'CANONICAL_ARCHIVE_FAILED');
 assert.equal((deleteEvent.json() as {archived:boolean}).archived,true);
 const archivedWeb=await prisma.financialEvent.findUniqueOrThrow({where:{id:disposablePostedId}});
 assert.ok(archivedWeb.archivedAt);
 assert.equal(archivedWeb.legacyTransactionId,disposablePostedId);
 assert.equal(await prisma.ledgerEntry.count({where:{eventId:disposablePostedId}}),0);
 const afterDeleteBalance=await api({method:'GET',url:
  '/finance/monetary-balance?accountId='+account.id+'&date=2026-11-20'});
 assert.equal(afterDeleteBalance.statusCode,200);
 assert.equal(Math.round(((afterDeleteBalance.json() as {available:number}).available-beforeDeleteAmount)*100),7000);
 const afterDeleteState=await api({method:'GET',url:'/app-state'});
 assert.equal(afterDeleteState.statusCode,200);
 const postDeleteState=afterDeleteState.json() as {revision:number;state:{
  transactions:Array<{id:string}>}};
 assert.equal(postDeleteState.state.transactions.filter(x=>x.id===disposablePostedId).length,0);
 const webAfterArchive=await api({method:'GET',url:'/finance/events/history-snapshot'});
 assert.equal(webAfterArchive.statusCode,200);
 assert.equal((webAfterArchive.json() as {items:Array<{id:string}>}).items
  .filter(x=>x.id===disposablePostedId).length,0);
 const secondDelete=await api({method:'DELETE',url:'/finance/events/'+disposablePostedId});
 assert.equal(secondDelete.statusCode,404);
 assert.ok(archivedWeb.sourcePayload && typeof archivedWeb.sourcePayload==='object');
 const legacyAttempt=await api({method:'PATCH',url:'/app-state/transactions',payload:{
  operationId:randomUUID(),expectedRevision:postDeleteState.revision,
  upserts:[archivedWeb.sourcePayload],deletes:[],
 }});
 assert.equal(legacyAttempt.statusCode,409);
 assert.equal((legacyAttempt.json() as {error:string}).error,
  'NORMALIZATION_ARCHIVED_EVENT_REQUIRES_RESTORE');
 assert.equal((await prisma.financialEvent.findUniqueOrThrow({where:{id:disposablePostedId}}))
  .archivedAt?.toISOString(),archivedWeb.archivedAt?.toISOString());
 console.log('PT76_CANONICAL_ARCHIVE_CROSS_CLIENT=PASS');
 console.log('PT76_ARCHIVE_REPLAY_CONTRACT=HTTP_404_NON_IDEMPOTENT');

 // PT77: keep the old DELETE unchanged, characterize a versioned idempotent
 // archive writer exclusively in the synthetic database, not a public route.
 console.log('PT77_STEP=ARCHIVE_V2');
 const nextEvent=await api({method:'POST',url:'/finance/events',payload:{
  ...postBody,operationId:randomUUID(),
  description:'Despesa arquivável PT77',date:'2026-11-20',amount:6.66,
 }});
 assert.equal(nextEvent.statusCode,201,'PT77_SETUP_CREATE_FAILED');
 const archiveId=(nextEvent.json() as {id:string}).id;
 const originalArchive=await prisma.financialEvent.findUniqueOrThrow({where:{id:archiveId}});
 const beforeArchiveApp=await prisma.appState.findUniqueOrThrow({where:{workspaceId:workspace.id}});
 const beforeArchiveLedger=await prisma.ledgerEntry.count({where:{eventId:archiveId}});
 assert.equal(beforeArchiveLedger,1);
 const beforeArchiveAudit=await prisma.auditLog.count({where:{
  entity:'FinancialEvent',entityId:archiveId,
 }});
 const beforeArchiveReceipts=await prisma.cloudMutationReceipt.count({where:{workspaceId:workspace.id}});
 const archiveOp=randomUUID();
 const archiveReq={
  operationId:archiveOp,expectedUpdatedAt:originalArchive.updatedAt.toISOString(),
  expectedRevision:beforeArchiveApp.revision,
 };
 await assert.rejects(()=>archiveMonetaryExpenseInSyntheticQa(user.id,archiveId,{
  ...archiveReq,operationId:randomUUID(),expectedRevision:beforeArchiveApp.revision-1,
 }),error=>error instanceof Stage10SyntheticArchiveError&&
  error.code==='ARCHIVE_STALE_APPSTATE_REVISION');
 assert.equal(await prisma.ledgerEntry.count({where:{eventId:archiveId}}),1);
 const originalBalance=await api({method:'GET',url:
  '/finance/monetary-balance?accountId='+account.id+'&date=2026-11-20'});
 assert.equal(originalBalance.statusCode,200);
 const archiveRoute='/finance/events/'+archiveId+'/stage10-synthetic-archive-v2';
 const unauthorizedV2=await app.inject({method:'POST',url:archiveRoute,payload:archiveReq});
 assert.equal(unauthorizedV2.statusCode,401);

 // PT78: global ADMIN is NOT authorization to mutate a shared workspace
 // when its effective membership is VIEWER.
 const outsiderPassword='Synthetic-PT78-'+randomUUID();
 const outsider=await prisma.user.create({data:{
  email:tag+'-outsider@example.invalid',name:'Viewer synthetic PT78',
  passwordHash:await bcrypt.hash(outsiderPassword,10),
  role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true,approvedAt:new Date(),
 }});
 await prisma.workspaceMember.create({data:{
  userId:outsider.id,workspaceId:workspace.id,role:UserRole.VIEWER,
  status:UserStatus.ACTIVE,isActive:true,
 }});
 const outsiderLogin=await app.inject({method:'POST',url:'/auth/login',
  payload:{email:outsider.email,password:outsiderPassword}});
 assert.equal(outsiderLogin.statusCode,200,'PT78_OUTSIDER_LOGIN_FAILED');
 const outsiderToken=(outsiderLogin.json() as {accessToken:string}).accessToken;
 assert.ok(outsiderToken);
 const forbiddenViewer=await app.inject({method:'POST',url:archiveRoute,
  headers:{authorization:'Bearer '+outsiderToken},payload:archiveReq});
 assert.equal(forbiddenViewer.statusCode,403,'PT78_VIEWER_WRITER_WAS_ALLOWED');
 assert.equal((forbiddenViewer.json() as {error:string}).error,
  'ARCHIVE_WORKSPACE_ROLE_REQUIRED');
 assert.equal((await prisma.financialEvent.findUniqueOrThrow({
  where:{id:archiveId},
 })).archivedAt,null);
 assert.equal(await prisma.ledgerEntry.count({where:{eventId:archiveId}}),1);
 console.log('PT78_GLOBAL_ADMIN_WORKSPACE_VIEWER_DENIED=PASS');

 const viewerTransfer=await app.inject({method:'POST',url:'/finance/transfers',
  headers:{authorization:'Bearer '+outsiderToken},
  payload:{operationId:randomUUID(),sourceAccountId:account.id,
   destinationAccountId:settlementAccount.id,date:'2026-11-19',amount:1},
 });
 assert.equal(viewerTransfer.statusCode,403,'PT79_TRANSFER_VIEWER_ALLOWED');
 assert.equal((viewerTransfer.json() as {error:string}).error,
  'TRANSFER_WORKSPACE_WRITE_REQUIRED');
 console.log('PT79_TRANSFER_WORKSPACE_VIEWER_DENIED=PASS');

 // With a separate owned workspace, the same token must never reach the
 // first workspace event even though the global role remains ADMIN.
 await prisma.workspace.create({data:{
  ownerId:outsider.id,name:'Isolated workspace PT78',slug:tag+'-outsider',
  members:{create:{userId:outsider.id,role:UserRole.ADMIN,
   status:UserStatus.ACTIVE,isActive:true}},
  appState:{create:{userId:outsider.id,revision:1,state:{
   transactions:[],budgets:{},__megNormalization:{mode:'normalized-primary'},
  } as Prisma.InputJsonValue}},
  subscription:{create:{planId:plan.id,status:LicenseStatus.ACTIVE}},
 }});
 const crossWorkspace=await app.inject({method:'POST',url:archiveRoute,
  headers:{authorization:'Bearer '+outsiderToken},payload:archiveReq});
 assert.equal(crossWorkspace.statusCode,404,'PT78_CROSS_WORKSPACE_EVENT_ACCESSIBLE');
 assert.equal((crossWorkspace.json() as {error:string}).error,
  'ARCHIVE_EVENT_NOT_FOUND_OR_ARCHIVED');
 assert.equal(await prisma.ledgerEntry.count({where:{eventId:archiveId}}),1);
 console.log('PT78_CROSS_WORKSPACE_OWNER_ISOLATION=PASS');

 const wrongTransfer=await app.inject({method:'POST',url:'/finance/transfers',
  headers:{authorization:'Bearer '+outsiderToken},
  payload:{operationId:randomUUID(),sourceAccountId:account.id,
   destinationAccountId:settlementAccount.id,date:'2026-11-19',amount:1},
 });
 assert.equal(wrongTransfer.statusCode,400,'PT79_FOREIGN_TRANSFER_ACCOUNTS_ACCEPTED');
 assert.equal((wrongTransfer.json() as {error:string}).error,'INVALID_SOURCE_ACCOUNT');
 assert.equal(await prisma.financialEvent.count({where:{type:'transfer',workspaceId:workspace.id}}),0);
 console.log('PT79_TRANSFER_CROSS_WORKSPACE_ACCOUNT_DENIED=PASS');

 const archivedViaHttp=await api({method:'POST',url:archiveRoute,payload:archiveReq});
 assert.equal(archivedViaHttp.statusCode,200,'PT77_ARCHIVE_HTTP_REJECTED');
 const archivedV2=archivedViaHttp.json() as {
  id:string;legacyTransactionId:string;archivedAt:string;
  revision:number;idempotentReplay:boolean;
 };
 assert.equal(archivedV2.id,archiveId);
 assert.equal(archivedV2.idempotentReplay,false);
 assert.equal(archivedV2.revision,beforeArchiveApp.revision+1);
 const eventAfterV2=await prisma.financialEvent.findUniqueOrThrow({where:{id:archiveId}});
 assert.ok(eventAfterV2.archivedAt);
 assert.equal(eventAfterV2.legacyTransactionId,archiveId);
 assert.equal(await prisma.ledgerEntry.count({where:{eventId:archiveId}}),0);
 const stateAfterV2=await prisma.appState.findUniqueOrThrow({where:{workspaceId:workspace.id}});
 assert.equal(stateAfterV2.revision,beforeArchiveApp.revision+1);
 const v2Rows=(stateAfterV2.state as {transactions:Array<{id:string}>}).transactions;
 assert.equal(v2Rows.filter(x=>x.id===archiveId).length,0);
 const newBalance=await api({method:'GET',url:
  '/finance/monetary-balance?accountId='+account.id+'&date=2026-11-20'});
 assert.equal(newBalance.statusCode,200);
 assert.equal(Math.round(((newBalance.json() as {available:number}).available-
  (originalBalance.json() as {available:number}).available)*100),666);
 assert.equal(await prisma.auditLog.count({where:{entity:'FinancialEvent',entityId:archiveId}}),
  beforeArchiveAudit+1);
 assert.equal(await prisma.cloudMutationReceipt.count({where:{workspaceId:workspace.id}}),
  beforeArchiveReceipts+1);
 const replayV2=await api({method:'POST',url:archiveRoute,payload:archiveReq});
 assert.equal(replayV2.statusCode,200);
 const receiptReplay=replayV2.json() as {id:string;idempotentReplay:boolean};
 assert.equal(receiptReplay.idempotentReplay,true);
 assert.equal(receiptReplay.id,archiveId);
 assert.equal((await prisma.appState.findUniqueOrThrow({where:{workspaceId:workspace.id}}))
  .revision,stateAfterV2.revision);
 assert.equal(await prisma.cloudMutationReceipt.count({where:{workspaceId:workspace.id}}),
  beforeArchiveReceipts+1);

 // Permission is rechecked even on a receipt replay, so a revoked
 // workspace writer cannot retrieve or replay a previous privileged action.
 await prisma.workspaceMember.update({where:{workspaceId_userId:{
  workspaceId:workspace.id,userId:user.id,
 }},data:{role:UserRole.VIEWER}});
 const revokedReplay=await api({method:'POST',url:archiveRoute,payload:archiveReq});
 assert.equal(revokedReplay.statusCode,403,'PT78_REVOKED_REPLAY_NOT_DENIED');
 assert.equal((revokedReplay.json() as {error:string}).error,'ARCHIVE_WORKSPACE_ROLE_REQUIRED');
 await prisma.workspaceMember.update({where:{workspaceId_userId:{
  workspaceId:workspace.id,userId:user.id,
 }},data:{role:UserRole.ADMIN}});
 console.log('PT78_REPLAY_PERMISSION_RECHECK=PASS');

 const conflictingV2=await api({method:'POST',url:archiveRoute,payload:{
  ...archiveReq,expectedRevision:archiveReq.expectedRevision+1,
 }});
 assert.equal(conflictingV2.statusCode,409);
 assert.equal((conflictingV2.json() as {error:string;retryable:boolean}).error,'OPERATION_ID_REUSED');
 assert.equal((conflictingV2.json() as {retryable:boolean}).retryable,false);
 console.log('PT77_SYNTHETIC_ARCHIVE_V2_IDEMPOTENT=PASS');
 console.log('PT77_HTTP_JWT_ARCHIVE_V2=PASS');

 // PT78: The receipt TTL is a 45-day retention boundary, not a guarantee
 // of forever-replay. Before purge, even an expired row replays safely;
 // after purge the archived tombstone must fail closed without re-mutation.
 await prisma.cloudMutationReceipt.update({
  where:{workspaceId_operationId:{workspaceId:workspace.id,operationId:archiveOp}},
  data:{expiresAt:new Date('2000-01-01T00:00:00.000Z')},
 });
 const expiredStillStored=await api({method:'POST',url:archiveRoute,payload:archiveReq});
 assert.equal(expiredStillStored.statusCode,200);
 assert.equal((expiredStillStored.json() as {idempotentReplay:boolean}).idempotentReplay,true);
 await prisma.cloudMutationReceipt.delete({where:{
  workspaceId_operationId:{workspaceId:workspace.id,operationId:archiveOp},
 }});
 const afterReceiptPurge=await api({method:'POST',url:archiveRoute,payload:archiveReq});
 assert.equal(afterReceiptPurge.statusCode,404);
 assert.equal((afterReceiptPurge.json() as {error:string}).error,
  'ARCHIVE_EVENT_NOT_FOUND_OR_ARCHIVED');
 assert.equal((await prisma.appState.findUniqueOrThrow({where:{workspaceId:workspace.id}}))
  .revision,stateAfterV2.revision);
 assert.equal(await prisma.ledgerEntry.count({where:{eventId:archiveId}}),0);
 console.log('PT78_RECEIPT_TTL_FAILS_CLOSED=PASS');

 // Concurrent distinct operations with the same stale version should
 // archive once only. The loser must receive a controlled conflict/not found,
 // not an extra ledger/audit/receipt or an internal 500 error.
 const concurrentCreate=await api({method:'POST',url:'/finance/events',payload:{
  ...postBody,operationId:randomUUID(),date:'2026-11-20',
  amount:4.44,description:'Concurrencia sintetica PT78',
 }});
 assert.equal(concurrentCreate.statusCode,201,'PT78_CONCURRENT_FIXTURE_FAILED');
 const concurrentId=(concurrentCreate.json() as {id:string}).id;
 const concurrentEvent=await prisma.financialEvent.findUniqueOrThrow({
  where:{id:concurrentId},
 });
 const concurrentState=await prisma.appState.findUniqueOrThrow({
  where:{workspaceId:workspace.id},
 });
 const concurrentBase={
  expectedUpdatedAt:concurrentEvent.updatedAt.toISOString(),
  expectedRevision:concurrentState.revision,
 };
 const concurrentUrl='/finance/events/'+concurrentId+'/stage10-synthetic-archive-v2';
 const [attemptA,attemptB]=await Promise.all([
  api({method:'POST',url:concurrentUrl,payload:{
   ...concurrentBase,operationId:randomUUID(),
  }}),
  api({method:'POST',url:concurrentUrl,payload:{
   ...concurrentBase,operationId:randomUUID(),
  }}),
 ]);
 const raceStatuses=[attemptA.statusCode,attemptB.statusCode];
 assert.equal(raceStatuses.filter(code=>code===200).length,1,
  'PT78_CONCURRENT_MUST_HAVE_ONE_SUCCESS');
 assert.equal(raceStatuses.filter(code=>code===404||code===409).length,1,
  'PT78_CONCURRENT_MUST_REJECT_LOSER');
 assert.ok((await prisma.financialEvent.findUniqueOrThrow({
  where:{id:concurrentId},
 })).archivedAt);
 assert.equal(await prisma.ledgerEntry.count({where:{eventId:concurrentId}}),0);
 const raceAudit=await prisma.auditLog.count({where:{
  entity:'FinancialEvent',entityId:concurrentId,action:'FINANCIAL_EVENT_ARCHIVED',
 }});
 assert.equal(raceAudit,1);
 const raceReceipts=await prisma.cloudMutationReceipt.count({where:{
  workspaceId:workspace.id,mutationType:'STAGE10_SYNTHETIC_MONETARY_ARCHIVE_V2',
 }});
 assert.equal(raceReceipts,1);
 const raceApp=await prisma.appState.findUniqueOrThrow({
  where:{workspaceId:workspace.id},
 });
 assert.equal(raceApp.revision,concurrentState.revision+1);
 console.log('PT78_CONCURRENT_ARCHIVE_SINGLE_COMMIT=PASS');

 // PT79: transfer is two conservative legs and must never overdraw the
 // source account at a later day following a retroactive posting.
 console.log('PT79_STEP=TRANSFER_DATE_BALANCE');
 const transferSource=await prisma.account.create({data:{
  userId:user.id,name:'Origem transfer PT79',type:'checking',
  openingBalance:100,isActive:true,
 }});
 const transferDestination=await prisma.account.create({data:{
  userId:user.id,name:'Destino transfer PT79',type:'savings',
  openingBalance:10,isActive:true,
 }});
 const futureSourceExpense=await api({method:'POST',url:'/finance/events',payload:{
  ...postBody,operationId:randomUUID(),description:'Gasto futuro fonte PT79',
  date:'2026-11-20',amount:90,accountId:transferSource.id,
 }});
 assert.equal(futureSourceExpense.statusCode,201,'PT79_SOURCE_FIXTURE_FAILED');
 const countBeforeTransfers=await prisma.financialEvent.count({where:{
  workspaceId:workspace.id,type:'transfer',
 }});
 const badTransferOperation=randomUUID();
 const deniedTransfer=await api({method:'POST',url:'/finance/transfers',payload:{
  operationId:badTransferOperation,sourceAccountId:transferSource.id,
  destinationAccountId:transferDestination.id,amount:20,
  date:'2026-11-19',description:'Transferencia retroativa sem saldo',
 }});
 assert.equal(deniedTransfer.statusCode,409,'PT79_TRANSFER_FUTURE_NEGATIVE_NOT_BLOCKED');
 const rejectedTransfer=deniedTransfer.json() as {
  error:string;insufficientDay?:string;
 };
 assert.equal(rejectedTransfer.error,'INSUFFICIENT_SOURCE_ACCOUNT_BALANCE');
 assert.equal(rejectedTransfer.insufficientDay,'2026-11-20');
 assert.equal(await prisma.financialEvent.count({where:{
  workspaceId:workspace.id,type:'transfer',
 }}),countBeforeTransfers);
 assert.equal(await prisma.cloudMutationReceipt.findUnique({where:{
  workspaceId_operationId:{
   workspaceId:workspace.id,operationId:badTransferOperation,
  },
 }}),null);
 console.log('PT79_TRANSFER_RETROACTIVE_OVERDRAFT_BLOCKED=PASS');

 console.log('PT79_STEP=TRANSFER_CONSERVATIVE');
 const transferStateBefore=await prisma.appState.findUniqueOrThrow({where:{
  workspaceId:workspace.id,
 }});
 const validTransferReq={
  operationId:randomUUID(),sourceAccountId:transferSource.id,
  destinationAccountId:transferDestination.id,amount:5,
  date:'2026-11-19',description:'Transferencia valida PT79',
 };
 const validTransfer=await api({method:'POST',url:'/finance/transfers',payload:validTransferReq});
 assert.equal(validTransfer.statusCode,201,'PT79_VALID_TRANSFER_REJECTED');
 const transferData=validTransfer.json() as {
  transferId:string;sourceEventId:string;destinationEventId:string;
  idempotentReplay:boolean;
 };
 assert.equal(transferData.transferId,validTransferReq.operationId);
 assert.equal(transferData.idempotentReplay,false);
 const transferLegs=await prisma.financialEvent.findMany({
  where:{id:{in:[transferData.sourceEventId,transferData.destinationEventId]}},
 });
 assert.equal(transferLegs.length,2);
 assert.equal(transferLegs.reduce((sum,x)=>sum+Math.round(Number(x.signedAmount)*100),0),0);
 assert.equal(await prisma.ledgerEntry.count({where:{
  eventId:{in:[transferData.sourceEventId,transferData.destinationEventId]},
 }}),2);
 const repeatTransfer=await api({method:'POST',url:'/finance/transfers',payload:validTransferReq});
 assert.equal(repeatTransfer.statusCode,201);
 assert.equal((repeatTransfer.json() as {idempotentReplay:boolean}).idempotentReplay,true);
 assert.equal(await prisma.financialEvent.count({where:{
  workspaceId:workspace.id,type:'transfer',
 }}),countBeforeTransfers+2);
 const sourceAtFuture=await api({method:'GET',url:
  '/finance/monetary-balance?accountId='+transferSource.id+'&date=2026-11-20'});
 const destinationAtFuture=await api({method:'GET',url:
  '/finance/monetary-balance?accountId='+transferDestination.id+'&date=2026-11-20'});
 assert.equal(sourceAtFuture.statusCode,200);
 assert.equal(destinationAtFuture.statusCode,200);
 assert.equal(Math.round((sourceAtFuture.json() as {available:number}).available*100),500);
 assert.equal(Math.round((destinationAtFuture.json() as {available:number}).available*100),1500);
 console.log('PT79_TRANSFER_TWO_LEG_LEDGER_REPLAY=PASS');

 const transferStateAfter=await prisma.appState.findUniqueOrThrow({where:{
  workspaceId:workspace.id,
 }});
 assert.equal(transferStateAfter.revision,transferStateBefore.revision,
  'PT79_LEGACY_TRANSFER_PROJECTION_UNEXPECTEDLY_CHANGED');
 console.log('PT79_TRANSFER_ANDROID_LEGACY_MIRROR=NOT_IMPLEMENTED');

 // PT80: distinct BENEFIT/VEROCARD authority, never the monetary writer.
 console.log('PT80_STEP=BENEFIT_DOMAIN');
 const benefitAccount=await prisma.account.create({data:{
  userId:user.id,name:'Alimentacao sintetica PT80',
  type:'benefit',openingBalance:100,isActive:true,
 }});
 const verocard=await prisma.paymentMethod.create({data:{
  userId:user.id,name:'VEROCARD',type:'debit',isActive:true,
 }});
 const benefitInitialState=await prisma.appState.findUniqueOrThrow({
  where:{workspaceId:workspace.id},
 });
 const benefitTemplate={
  type:'expense',date:'2026-11-20',amount:90,
  description:'Consumo futuro Verocard PT80',
  accountId:benefitAccount.id,paymentMethodId:verocard.id,
  categoryId:category.id,operationId:randomUUID(),
 };
 const futureBenefit=await api({method:'POST',url:'/finance/benefit-events',
  payload:benefitTemplate,
 });
 assert.equal(futureBenefit.statusCode,201,'PT80_FUTURE_BENEFIT_FIXTURE_FAILED');
 const futureBenefitRow=futureBenefit.json() as {
  id:string;status:string;accountId:string;paymentMethodId:string;
  idempotentReplay:boolean;
 };
 assert.equal(futureBenefitRow.status,'paid');
 assert.equal(futureBenefitRow.accountId,benefitAccount.id);
 assert.equal(futureBenefitRow.paymentMethodId,verocard.id);
 assert.equal(await prisma.ledgerEntry.count({
  where:{eventId:futureBenefitRow.id},
 }),1);
 const futureBenefitReplay=await api({method:'POST',url:'/finance/benefit-events',
  payload:benefitTemplate,
 });
 assert.equal(futureBenefitReplay.statusCode,201);
 assert.equal((futureBenefitReplay.json() as {idempotentReplay:boolean}).idempotentReplay,true);
 assert.equal(await prisma.financialEvent.count({where:{
  id:futureBenefitRow.id,
 }}),1);
 console.log('PT80_BENEFIT_FUTURE_CREATE_REPLAY=PASS');

 const badBenefitId=randomUUID();
 const badBenefit=await api({method:'POST',url:'/finance/benefit-events',payload:{
  ...benefitTemplate,
  description:'Despesa retroativa sem saldo Verocard PT80',
  date:'2026-11-19',amount:20,operationId:badBenefitId,
 }});
 assert.equal(badBenefit.statusCode,409,'PT80_BENEFIT_OVERDRAFT_NOT_BLOCKED');
 assert.equal((badBenefit.json() as {error:string}).error,'INSUFFICIENT_BENEFIT_BALANCE');
 assert.equal((badBenefit.json() as {insufficientDay?:string}).insufficientDay,'2026-11-20');
 assert.equal(await prisma.cloudMutationReceipt.findUnique({where:{
  workspaceId_operationId:{workspaceId:workspace.id,operationId:badBenefitId},
 }}),null);
 console.log('PT80_BENEFIT_RETROACTIVE_OVERDRAFT_BLOCKED=PASS');

 const validBenefitPayload={
  ...benefitTemplate,operationId:randomUUID(),date:'2026-11-19',
  amount:5,description:'Consumo retroativo valido Verocard PT80',
 };
 const validBenefit=await api({method:'POST',url:'/finance/benefit-events',
  payload:validBenefitPayload,
 });
 assert.equal(validBenefit.statusCode,201);
 const validBenefitId=(validBenefit.json() as {id:string}).id;
 assert.ok(validBenefitId);
 const benefitEvent=await prisma.financialEvent.findUniqueOrThrow({where:{id:validBenefitId}});
 assert.equal(benefitEvent.status,'paid');
 assert.equal(benefitEvent.type,'expense');
 assert.equal(benefitEvent.accountId,benefitAccount.id);
 assert.equal(benefitEvent.paymentMethodId,verocard.id);
 assert.equal(Math.round(Number(benefitEvent.signedAmount)*100),-500);
 assert.equal(await prisma.ledgerEntry.count({where:{eventId:validBenefitId}}),1);
 const validBenefitAgain=await api({method:'POST',url:'/finance/benefit-events',
  payload:validBenefitPayload,
 });
 assert.equal(validBenefitAgain.statusCode,201);
 assert.equal((validBenefitAgain.json() as {idempotentReplay:boolean}).idempotentReplay,true);
 console.log('PT80_BENEFIT_VALID_CREATE_IDEMPOTENT=PASS');

 const editAttempt=await api({method:'PATCH',
  url:'/finance/benefit-events/'+validBenefitId,
  payload:{
   ...validBenefitPayload,amount:20,
   operationId:randomUUID(),
   expectedUpdatedAt:benefitEvent.updatedAt.toISOString(),
  },
 });
 assert.equal(editAttempt.statusCode,409,'PT80_EDIT_OVERDRAFT_NOT_BLOCKED');
 assert.equal((editAttempt.json() as {error:string}).error,'INSUFFICIENT_BENEFIT_BALANCE');
 assert.equal((editAttempt.json() as {insufficientDay?:string}).insufficientDay,'2026-11-20');
 assert.equal((await prisma.financialEvent.findUniqueOrThrow({where:{id:validBenefitId}}))
  .signedAmount.toString(),benefitEvent.signedAmount.toString());
 assert.equal(await prisma.ledgerEntry.count({where:{eventId:validBenefitId}}),1);
 console.log('PT80_BENEFIT_UPDATE_RETROACTIVE_BLOCKED=PASS');

 const benefitStateAfter=await prisma.appState.findUniqueOrThrow({where:{
  workspaceId:workspace.id,
 }});
 assert.equal(benefitStateAfter.revision,benefitInitialState.revision);
 assert.equal(benefitEvent.legacyTransactionId,null);
 console.log('PT80_BENEFIT_ANDROID_LEGACY_CREATE_MIRROR=NOT_IMPLEMENTED');

 await prisma.workspaceMember.update({where:{workspaceId_userId:{
  workspaceId:workspace.id,userId:user.id,
 }},data:{role:UserRole.VIEWER}});
 const blockedBenefit=await api({method:'POST',url:'/finance/benefit-events',
  payload:{...validBenefitPayload,operationId:randomUUID(),
   description:'Viewer nao pode debitar Verocard'},
 });
 assert.equal(blockedBenefit.statusCode,403,'PT80_BENEFIT_VIEWER_CREATION_ALLOWED');
 assert.equal((blockedBenefit.json() as {error:string}).error,'BENEFIT_WORKSPACE_WRITE_REQUIRED');
 const blockedBenefitUpdate=await api({method:'PATCH',
  url:'/finance/benefit-events/'+validBenefitId,
  payload:{...validBenefitPayload,operationId:randomUUID(),
   expectedUpdatedAt:benefitEvent.updatedAt.toISOString()},
 });
 assert.equal(blockedBenefitUpdate.statusCode,403,'PT80_BENEFIT_VIEWER_EDIT_ALLOWED');
 await prisma.workspaceMember.update({where:{workspaceId_userId:{
  workspaceId:workspace.id,userId:user.id,
 }},data:{role:UserRole.ADMIN}});
 console.log('PT80_BENEFIT_WORKSPACE_VIEWER_DENIED=PASS');

 // PT81: a top-up is a positive BENEFIT event, not ordinary money.
 // Reducing/moving it must not invalidate later Verocard purchases.
 console.log('PT81_STEP=HISTORICAL_TOPUP_EDIT');
 const topUpPayload={
  type:'income',date:'2026-11-20',amount:100,
  description:'Recarga historica Verocard PT81',
  accountId:benefitAccount.id,paymentMethodId:verocard.id,
  operationId:randomUUID(),
 };
 const topUpCreated=await api({method:'POST',url:'/finance/benefit-events',
  payload:topUpPayload,
 });
 assert.equal(topUpCreated.statusCode,201,'PT81_TOPUP_CREATE_FAILED');
 const topUpId=(topUpCreated.json() as {id:string}).id;
 const benefitSpendLater=await api({method:'POST',url:'/finance/benefit-events',
  payload:{
   ...benefitTemplate,description:'Consumo apos recarga PT81',
   date:'2026-11-21',amount:80,operationId:randomUUID(),
  },
 });
 assert.equal(benefitSpendLater.statusCode,201,'PT81_SPEND_LATER_FAILED');
 const spendId=(benefitSpendLater.json() as {id:string}).id;
 const topUpBefore=await prisma.financialEvent.findUniqueOrThrow({where:{id:topUpId}});
 assert.equal(topUpBefore.type,'income');
 assert.equal(topUpBefore.status,'paid');
 assert.equal(Math.round(Number(topUpBefore.signedAmount)*100),10000);
 const topUpLedgerBefore=await prisma.ledgerEntry.findMany({where:{eventId:topUpId}});
 assert.equal(topUpLedgerBefore.length,1);
 const benefitStateBeforeCredit=await prisma.appState.findUniqueOrThrow({
  where:{workspaceId:workspace.id},
 });
 const benefitAuditBeforeCredit=await prisma.auditLog.count({where:{
  entity:'FinancialEvent',entityId:topUpId,
 }});
 const topUpUrl='/finance/benefit-events/'+topUpId;
 const topUpBase={...topUpPayload,expectedUpdatedAt:topUpBefore.updatedAt.toISOString()};
 const invalidCreditOperation=randomUUID();
 const reducedTopUp=await api({method:'PATCH',url:topUpUrl,payload:{
  ...topUpBase,amount:50,operationId:invalidCreditOperation,
 }});
 assert.equal(reducedTopUp.statusCode,409,'PT81_TOPUP_REDUCTION_WAS_ALLOWED');
 assert.equal((reducedTopUp.json() as {error:string}).error,'INSUFFICIENT_BENEFIT_BALANCE');
 assert.equal((reducedTopUp.json() as {insufficientDay:string}).insufficientDay,'2026-11-21');
 assert.equal((await prisma.financialEvent.findUniqueOrThrow({where:{id:topUpId}}))
  .signedAmount.toString(),topUpBefore.signedAmount.toString());
 assert.equal((await prisma.ledgerEntry.findMany({where:{eventId:topUpId}})).length,1);
 assert.equal(await prisma.cloudMutationReceipt.findUnique({where:{
  workspaceId_operationId:{
   workspaceId:workspace.id,operationId:invalidCreditOperation,
  },
 }}),null);
 assert.equal(await prisma.auditLog.count({where:{
  entity:'FinancialEvent',entityId:topUpId,
 }}),benefitAuditBeforeCredit);
 console.log('PT81_TOPUP_REDUCTION_FUTURE_BALANCE_BLOCKED=PASS');

 const movedTopUp=await api({method:'PATCH',url:topUpUrl,payload:{
  ...topUpBase,date:'2026-11-22',operationId:randomUUID(),
 }});
 assert.equal(movedTopUp.statusCode,409,'PT81_TOPUP_DELAY_WAS_ALLOWED');
 assert.equal((movedTopUp.json() as {error:string}).error,'INSUFFICIENT_BENEFIT_BALANCE');
 assert.equal((movedTopUp.json() as {insufficientDay:string}).insufficientDay,'2026-11-21');
 assert.equal((await prisma.financialEvent.findUniqueOrThrow({where:{id:topUpId}}))
  .date.toISOString(),topUpBefore.date.toISOString());
 assert.equal(await prisma.ledgerEntry.count({where:{eventId:spendId}}),1);
 assert.equal((await prisma.appState.findUniqueOrThrow({
  where:{workspaceId:workspace.id},
 })).revision,benefitStateBeforeCredit.revision);
 console.log('PT81_TOPUP_DELAY_FUTURE_BALANCE_BLOCKED=PASS');

 const validCreditOperation=randomUUID();
 const validTopUpChange={...topUpBase,amount:110,operationId:validCreditOperation};
 const upgradedTopUp=await api({method:'PATCH',url:topUpUrl,payload:validTopUpChange});
 assert.equal(upgradedTopUp.statusCode,200,'PT81_TOPUP_VALID_EDIT_FAILED');
 const upgradedTopUpData=upgradedTopUp.json() as {id:string;idempotentReplay:boolean};
 assert.equal(upgradedTopUpData.id,topUpId);
 assert.equal(upgradedTopUpData.idempotentReplay,false);
 assert.equal(Math.round(Number((await prisma.financialEvent.findUniqueOrThrow({
  where:{id:topUpId},
 })).signedAmount)*100),11000);
 assert.equal(await prisma.ledgerEntry.count({where:{eventId:topUpId}}),1);
 const topUpReplayResult=await api({method:'PATCH',url:topUpUrl,payload:validTopUpChange});
 assert.equal(topUpReplayResult.statusCode,200);
 assert.equal((topUpReplayResult.json() as {idempotentReplay:boolean}).idempotentReplay,true);
 assert.equal(await prisma.cloudMutationReceipt.count({where:{
  workspaceId:workspace.id,operationId:validCreditOperation,
 }}),1);
 assert.equal(await prisma.auditLog.count({where:{
  entity:'FinancialEvent',entityId:topUpId,
 }}),benefitAuditBeforeCredit+1);
 const staleChange=await api({method:'PATCH',url:topUpUrl,payload:{
  ...validTopUpChange,operationId:randomUUID(),amount:105,
 }});
 assert.equal(staleChange.statusCode,409);
 assert.equal((staleChange.json() as {error:string}).error,
  'FINANCIAL_EVENT_STALE_VERSION');
 console.log('PT81_TOPUP_VALID_CHANGE_IDEMPOTENT=PASS');

 console.log('PT74_SYNTHETIC_BIDIRECTIONAL_HTTP=PASS');
}catch(error){
 const code=error instanceof Error&&/^[A-Z][A-Z0-9_]+$/.test(error.message)?
  error.message:error instanceof Error?error.name:'UNKNOWN';
 console.log('PT74_HTTP_FAILURE_CATEGORY='+code);
 process.exitCode=1;
}finally{
 if(app)await app.close();
 await prisma.$disconnect();
}
