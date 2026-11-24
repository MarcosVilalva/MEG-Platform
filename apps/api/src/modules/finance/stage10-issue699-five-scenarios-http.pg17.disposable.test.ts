/**
 * Issue #699: EXACT HTTP/JWT/PG17 acceptance. Five required scenarios
 * and operationId protection after a PHYSICAL receipt DELETE.
 * Only GitHub Actions disposable PG17; never protected databases.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import bcrypt from 'bcryptjs';
import { prisma, Prisma, LicenseStatus, UserRole, UserStatus } from '@meg/database';
import { registerAuth } from '../../plugins/auth';
import { authRoutes } from '../auth/routes';
import { appStateRoutes } from '../app-state/routes';
import { financeRoutes } from './routes';
import { decideLegacyOutboxRejection } from '../../../../web/src/cloud-outbox-conflict-policy.js';

const db = new URL(process.env.DATABASE_URL || 'https://invalid');
assert.ok(
  process.env.GITHUB_ACTIONS === 'true'
  && process.env.GITHUB_REPOSITORY === 'MarcosVilalva/MEG-Platform'
  && process.env.MEG_STAGE10_ISOLATED_PG === '1'
  && process.env.MEG_STAGE10_QA_LOCAL_ONLY === '1'
  && process.env.MEG_STAGE10_ISSUE699_SYNTHETIC === '1'
  && process.env.MEG_STAGE10_LEGACY_RESTORE_QA === '1'
  && process.env.MEG_STAGE10_WEB_WRITE_QA === '0'
  && process.env.NODE_ENV === 'test'
  && db.protocol === 'postgresql:' && db.hostname === '127.0.0.1'
  && db.port === '5432' && db.pathname === '/meg_stage10_sandbox'
  && db.username === 'meg_stage10_ci',
  'ISSUE699_HTTP_GUARD_REQUIRES_DISPOSABLE_PG17'
);
const TRIGGER='meg_stage10_receipt_purge_guard';
const installed=await prisma.$queryRaw<Array<{count:bigint}>>`
  SELECT count(*)::bigint AS count FROM pg_trigger
  WHERE tgname = ${TRIGGER} AND NOT tgisinternal
`;
assert.equal(Number(installed[0]?.count),1,'ISSUE699_PURGE_TRIGGER_NOT_INSTALLED');

const stamp=randomUUID();
const pass='issue699-'+stamp;
const user=await prisma.user.create({data:{
  email:'issue699-'+stamp+'@example.invalid',
  name:'issue699 fictitious only',
  passwordHash:await bcrypt.hash(pass,8),
  role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true,approvedAt:new Date(),
}});
const plan=await prisma.plan.create({data:{
  code:'ISSUE699-'+stamp,name:'issue699 fake plan',monthlyPrice:0,maxMembers:2,features:[],
}});
const workspace=await prisma.workspace.create({data:{
  ownerId:user.id,name:'issue699 fake workspace',slug:'issue699-'+stamp,
  members:{create:[{userId:user.id,role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true}]},
  subscription:{create:{planId:plan.id,status:LicenseStatus.ACTIVE}},
  appState:{create:{userId:user.id,revision:1,state:{
    transactions:[],budgets:{},__megNormalization:{mode:'normalized-primary'},
  } as Prisma.InputJsonValue}},
}});
const account=await prisma.account.create({data:{
  userId:user.id,name:'issue699 fake account',type:'checking',openingBalance:500,isActive:true,
}});
const category=await prisma.category.create({data:{
  userId:user.id,name:'Mercado',group:'CONTAS GERAIS',type:'expense',isActive:true,
}});
const method=await prisma.paymentMethod.create({data:{
  userId:user.id,name:'PIX',type:'instant',isActive:true,
}});
const api=Fastify({logger:false});
const port=33369;
let started=false;
try {
  await registerAuth(api);
  await api.register(authRoutes,{prefix:'/auth'});
  await api.register(appStateRoutes,{prefix:'/app-state'});
  await api.register(financeRoutes,{prefix:'/finance'});
  await api.listen({host:'127.0.0.1',port});
  started=true;
  const base='http://127.0.0.1:'+port;
  const login=await fetch(base+'/auth/login',{method:'POST',
    headers:{'Content-Type':'application/json'},body:JSON.stringify({email:user.email,password:pass})});
  assert.equal(login.status,200,await login.clone().text());
  const jwt=(await login.json() as {accessToken:string}).accessToken;
  assert.ok(jwt?.length>30);
  const headers={Authorization:'Bearer '+jwt,'Content-Type':'application/json'};
  const json=async (r:Response)=>({status:r.status,body:await r.json() as any});
  const read=async()=>json(await fetch(base+'/app-state',{headers}));
  const patch=async (payload:Record<string,unknown>)=>json(await fetch(
    base+'/app-state/transactions',{method:'PATCH',headers,body:JSON.stringify(payload)}));
  const legacyId='issue699-event-'+stamp;
  const tx={id:legacyId,date:'2026-11-23',description:'Fictitious expense',
    type:'expense',status:'planned',situation:'PENDENTE',amount:12.35,
    expenseAmount:12.35,financialAccountId:account.id,category:'Mercado',
    group:'Mercado',expenseClass:'CONTAS GERAIS',paymentMethod:'PIX',modality:'À VISTA'};

  // #699 network offline: pending payload is not sent; a failed loopback
  // connection cannot mutate the DB and does not discard the operation.
  const operationId=randomUUID();
  const pending={operationId,expectedRevision:1,upserts:[tx],deletes:[]};
  await assert.rejects(fetch('http://127.0.0.1:59999/app-state/transactions',
    {method:'PATCH',headers,body:JSON.stringify(pending),signal:AbortSignal.timeout(2000)}));
  assert.equal((await read()).body.revision,1);
  assert.equal(await prisma.financialEvent.count({where:{workspaceId:workspace.id}}),0);
  const queued=JSON.parse(JSON.stringify(pending));
  console.log('ISSUE699_HTTP_OFFLINE_QUEUE_NO_MUTATION=PASS');

  // Client restart simulation: reconstruct the pending envelope and resend
  // SAME operationId to the already-running authenticated backend.
  const accepted=await patch(queued);
  assert.equal(accepted.status,200,JSON.stringify(accepted.body));
  assert.equal(accepted.body.revision,2);
  const event=await prisma.financialEvent.findFirstOrThrow({where:{workspaceId:workspace.id,legacyTransactionId:legacyId}});
  const eventId=event.id;
  assert.equal(await prisma.financialEvent.count({where:{workspaceId:workspace.id}}),1);
  console.log('ISSUE699_HTTP_RESTART_RECOVERS_SAME_OPERATION=PASS');

  // Duplicate replay and conflicting content of same operationId.
  const replay=await patch(queued);
  assert.equal(replay.status,200);
  assert.equal(replay.body.replayed,true);
  const reused=await patch({...queued,expectedRevision:2,
    upserts:[{...tx,description:'different intent'}]});
  assert.equal(reused.status,409);
  assert.equal(reused.body.error,'OPERATION_ID_REUSED');
  assert.equal(decideLegacyOutboxRejection(409,reused.body).action,'manual-resolution-required');
  assert.equal(await prisma.financialEvent.count({where:{workspaceId:workspace.id}}),1);
  console.log('ISSUE699_HTTP_DUPLICATE_REPLAY_AND_409_PERMANENT=PASS');

  // The same receipt is still readable after expiresAt, until true purging.
  await prisma.cloudMutationReceipt.update({where:{workspaceId_operationId:{
    workspaceId:workspace.id,operationId}},data:{expiresAt:new Date('2020-01-01T00:00:00.000Z')}});
  assert.equal((await patch(queued)).body.replayed,true);

  // PHYSICAL DELETE of receipt in fake PG17. AFTER DELETE guard restores
  // minimal identity marker *in the same DB statement* without payload.
  const deleted=await prisma.$executeRaw`
    DELETE FROM "CloudMutationReceipt"
    WHERE "workspaceId"=${workspace.id} AND "operationId"=${operationId}
  `;
  assert.equal(deleted,1);
  const tombstone=await prisma.cloudMutationReceipt.findUniqueOrThrow({where:{
    workspaceId_operationId:{workspaceId:workspace.id,operationId},
  }});
  assert.equal(tombstone.requestHash,'__MEG_PURGED_OPERATION_ID__');
  assert.equal(tombstone.mutationType,'PURGED_OPERATION_ID');
  assert.deepEqual(tombstone.response,{});
  assert.equal(tombstone.revision,0);
  assert.equal(await prisma.cloudMutationReceipt.count({where:{workspaceId:workspace.id,operationId}}),1);

  const afterPurge=await patch({...queued,expectedRevision:2});
  assert.equal(afterPurge.status,409);
  assert.equal(afterPurge.body.error,'OPERATION_ID_REUSED');
  assert.equal(decideLegacyOutboxRejection(409,afterPurge.body).action,'manual-resolution-required');
  const afterPurgeChanged=await patch({...queued,expectedRevision:2,
    upserts:[{...tx,id:'new-event-'+stamp}]});
  assert.equal(afterPurgeChanged.status,409);
  assert.equal(afterPurgeChanged.body.error,'OPERATION_ID_REUSED');
  assert.equal(await prisma.financialEvent.count({where:{workspaceId:workspace.id}}),1);
  assert.equal((await read()).body.revision,2);
  console.log('ISSUE699_HTTP_OPERATION_ID_AFTER_PHYSICAL_PURGE_409_NO_DUPLICATE=PASS');

  // Explicit archive: only the delete command can archive.
  const opDelete=randomUUID();
  const archived=await patch({operationId:opDelete,expectedRevision:2,upserts:[],deletes:[legacyId]});
  assert.equal(archived.status,200,JSON.stringify(archived.body));
  assert.ok((await prisma.financialEvent.findUniqueOrThrow({where:{id:eventId}})).archivedAt);
  assert.equal((await read()).body.state.transactions.length,0);
  console.log('ISSUE699_HTTP_EXPLICIT_ARCHIVE_IDENTICAL_ID=PASS');

  // Old/out-of-order queued upsert can NEVER resurrect the archived entry.
  const stale=await patch({operationId:randomUUID(),expectedRevision:3,
    upserts:[tx],deletes:[]});
  assert.equal(stale.status,409,JSON.stringify(stale.body));
  assert.equal(stale.body.error,'NORMALIZATION_ARCHIVED_EVENT_REQUIRES_RESTORE');
  assert.equal(stale.body.retryable,false);
  assert.equal(decideLegacyOutboxRejection(409,stale.body).action,'manual-resolution-required');
  assert.equal((await read()).body.revision,3);
  assert.equal((await prisma.financialEvent.findUniqueOrThrow({where:{id:eventId}})).id,eventId);
  console.log('ISSUE699_HTTP_STALE_UPSERT_CANNOT_RESURRECT_ARCHIVED=PASS');

  // Legitimate restore is a separate authenticated and idempotent command.
  const info=await json(await fetch(base+'/app-state/legacy-restore/'+encodeURIComponent(legacyId),{headers}));
  assert.equal(info.status,200,JSON.stringify(info.body));
  assert.equal(info.body.eligible,true,JSON.stringify(info.body));
  const opRestore=randomUUID();
  const restore={operationId:opRestore,eventId,expectedRevision:info.body.expectedRevision,
    expectedArchivedAt:info.body.expectedArchivedAt,
    expectedUpdatedAt:info.body.expectedUpdatedAt,
    confirmation:'CONFIRMAR_RESTAURACAO_EXPLICITA'};
  const restoreUrl=base+'/app-state/legacy-restore/'+encodeURIComponent(legacyId);
  const postRestore=async()=>json(await fetch(restoreUrl,{
    method:'POST',headers,body:JSON.stringify(restore)}));
  const restored=await postRestore();
  assert.equal(restored.status,200,JSON.stringify(restored.body));
  assert.equal(restored.body.id,eventId);
  assert.equal((await prisma.financialEvent.findUniqueOrThrow({where:{id:eventId}})).archivedAt,null);
  assert.equal((await read()).body.state.transactions.length,1);
  const restoreReplay=await postRestore();
  assert.equal(restoreReplay.status,200,JSON.stringify(restoreReplay.body));
  assert.equal(restoreReplay.body.idempotentReplay,true);
  assert.equal(await prisma.financialEvent.count({where:{workspaceId:workspace.id}}),1);
  console.log('ISSUE699_HTTP_EXPLICIT_RESTORE_AUTH_IDEMPOTENT=PASS');

  // Purge of restore receipt also must block reinvocation of same operationId.
  await prisma.$executeRaw`
    DELETE FROM "CloudMutationReceipt"
    WHERE "workspaceId"=${workspace.id} AND "operationId"=${opRestore}
  `;
  const expiredRestore=await postRestore();
  assert.equal(expiredRestore.status,409,JSON.stringify(expiredRestore.body));
  assert.equal(expiredRestore.body.error,'OPERATION_ID_REUSED');
  assert.equal(await prisma.financialEvent.count({where:{workspaceId:workspace.id}}),1);
  console.log('ISSUE699_HTTP_RESTORE_OPERATION_ID_POST_PURGE_BLOCKED=PASS');

  // This contract also guards API writers beyond AppState: canonical CREATE.
  const finance=await json(await fetch(base+'/finance/events',{
    method:'POST',headers:{...headers,'X-MEG-Expected-Workspace-Id':workspace.id},
    body:JSON.stringify({operationId,description:'Not allowed post-purge',
      type:'expense',status:'planned',date:'2026-11-23',amount:8.25,
      accountId:account.id,categoryId:category.id,paymentMethodId:method.id}),
  }));
  assert.equal(finance.status,409,JSON.stringify(finance.body));
  assert.equal(finance.body.error,'OPERATION_ID_REUSED');
  assert.equal(await prisma.financialEvent.count({where:{workspaceId:workspace.id}}),1);
  console.log('ISSUE699_HTTP_CROSS_WRITER_GLOBAL_OPERATION_ID_GUARD=PASS');
  console.log('ISSUE699_HTTP_FIVE_SCENARIOS_AND_POST_PURGE_GATE=PASS');
} finally {
  if(started) await api.close();
  await prisma.$disconnect();
  console.log('ISSUE699_HTTP_SERVER_CLOSED=PASS');
}
