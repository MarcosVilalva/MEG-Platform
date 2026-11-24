/**
 * Issue #699 Fase A | Acceptance suite on disposable PostgreSQL 17.
 * Hard guard prevents any connection to protected/user production databases.
 * ALL routes run through real Fastify HTTP, auth/login and signed JWT.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import bcrypt from 'bcryptjs';
import { prisma, Prisma, LicenseStatus, UserRole, UserStatus } from '@meg/database';
import { registerAuth } from '../../plugins/auth';
import { authRoutes } from '../auth/routes';
import { financeRoutes } from './routes';
import { financialEventSuspicionFingerprint } from './monetary-protection';

const target = new URL(process.env.DATABASE_URL || 'https://invalid');
assert.ok(
  process.env.GITHUB_ACTIONS === 'true'
  && process.env.GITHUB_REPOSITORY === 'MarcosVilalva/MEG-Platform'
  && process.env.MEG_STAGE10_ISOLATED_PG === '1'
  && process.env.MEG_STAGE10_ISSUE699_PHASE_A_SYNTHETIC === '1'
  && process.env.NODE_ENV === 'test'
  && target.protocol === 'postgresql:'
  && target.hostname === '127.0.0.1'
  && target.port === '5432'
  && target.pathname === '/meg_stage10_phase_a_sandbox'
  && target.username === 'meg_stage10_ci',
  'ISSUE699_PHASE_A_PROTECTED_DATABASE_BLOCKED'
);

const tag = randomUUID();
const password = 'phase-a-fictitious-' + tag;
async function makeWorkspace(name: string) {
  const user = await prisma.user.create({data:{
    email: ('phase-a-' + name + '-' + tag + '@example.invalid').toLowerCase(),
    name: 'PHASE_A_FAKE_' + name,
    passwordHash: await bcrypt.hash(password, 8),
    role: UserRole.ADMIN, status: UserStatus.ACTIVE, isActive: true,
    approvedAt: new Date(),
  }});
  const plan = await prisma.plan.create({data:{
    code: 'PHASE-A-' + name + '-' + tag,
    name: 'phase A synthetic plan', monthlyPrice: 0, maxMembers: 5, features: [],
  }});
  const workspace = await prisma.workspace.create({data:{
    ownerId: user.id, name: 'phase-a-fake-' + name,
    slug: 'phase-a-' + name + '-' + tag,
    members: {create:[{userId:user.id,role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true}]},
    subscription: {create:{planId:plan.id,status:LicenseStatus.ACTIVE}},
    appState: {create:{userId:user.id,revision:1,
      state:{transactions:[],budgets:{},__megNormalization:{mode:'normalized-primary'}} as Prisma.InputJsonValue}},
  }});
  const account = await prisma.account.create({data:{
    userId:user.id,name:'PHASE A TEST ACCOUNT',type:'checking',
    openingBalance:20000,isActive:true,
  }});
  const account2 = await prisma.account.create({data:{
    userId:user.id,name:'PHASE A ALT ACCOUNT',type:'checking',
    openingBalance:20000,isActive:true,
  }});
  const category = await prisma.category.create({data:{
    userId:user.id,name:'PHASE A CATEGORY',type:'expense',group:'TEST',isActive:true,
  }});
  const category2 = await prisma.category.create({data:{
    userId:user.id,name:'PHASE A ALT CATEGORY',type:'expense',group:'TEST',isActive:true,
  }});
  const method = await prisma.paymentMethod.create({data:{
    userId:user.id,name:'PIX PHASE A',type:'instant',isActive:true,
  }});
  const method2 = await prisma.paymentMethod.create({data:{
    userId:user.id,name:'CASH PHASE A',type:'cash',isActive:true,
  }});
  return {user,workspace,account,account2,category,category2,method,method2};
}

const app = Fastify({logger:false});
const port = 33469;
let listening = false;
let triggerCreated = false;
try {
  const a = await makeWorkspace('A');
  const b = await makeWorkspace('B');
  await registerAuth(app);
  await app.register(authRoutes,{prefix:'/auth'});
  await app.register(financeRoutes,{prefix:'/finance'});
  await app.listen({host:'127.0.0.1',port});
  listening = true;
  const base = 'http://127.0.0.1:' + port;
  const parse = async (r:Response) => ({status:r.status, body:await r.json() as any});
  async function login(email:string) {
    const reply = await parse(await fetch(base+'/auth/login',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({email,password}),
    }));
    assert.equal(reply.status,200,JSON.stringify(reply.body));
    return reply.body.accessToken as string;
  }
  const jwtA = await login(a.user.email);
  const jwtB = await login(b.user.email);
  const auth = (token:string, ws?:string) => ({
    Authorization:'Bearer '+token,
    'Content-Type':'application/json',
    ...(ws?{'X-MEG-Expected-Workspace-Id':ws}:{}),
  });
  const expense=(operationId:string, description:string, overrides:Record<string,unknown>={}) => ({
    operationId,description,type:'expense',status:'paid',
    date:'2026-11-24',competence:'2026-11',amount:12.35,
    accountId:a.account.id,categoryId:a.category.id,paymentMethodId:a.method.id,
    notes:'PHASE_A_FICTITIOUS',...overrides,
  });
  const create = async (input:Record<string,unknown>, token=jwtA, ws=a.workspace.id) =>
    parse(await fetch(base+'/finance/events',{method:'POST',
      headers:auth(token,ws),body:JSON.stringify(input)}));
  const getSuspects = async (token=jwtA) =>
    parse(await fetch(base+'/finance/events/suspected-duplicates?page=1&pageSize=100',
      {headers:auth(token)}));
  const stats = async(ws=a.workspace.id) => ({
    events:await prisma.financialEvent.count({where:{workspaceId:ws}}),
    ledger:await prisma.ledgerEntry.count({where:{event:{workspaceId:ws}}}),
    receipts:await prisma.cloudMutationReceipt.count({where:{workspaceId:ws,mutationType:'FINANCIAL_EVENT_CREATE'}}),
    suspects:await prisma.auditLog.count({where:{
      entity:'FinancialEvent',action:'FINANCIAL_EVENT_DUPLICATE_SUSPECTED',
      entityId:{in:(await prisma.financialEvent.findMany({where:{workspaceId:ws},select:{id:true}})).map(x=>x.id)},
    }}),
  });
  function gate(name:string, details:Record<string,unknown>={}) {
    console.log('ISSUE699_PHASE_A_' + name + '=PASS ' + JSON.stringify(details));
  }

  const original = expense(randomUUID(),'PHASE A01 expenses');
  const rA1 = await create(original);
  assert.equal(rA1.status,201,JSON.stringify(rA1.body));
  assert.ok(rA1.body.id);
  const originalId = rA1.body.id as string;
  assert.deepEqual(await stats(),{events:1,ledger:1,receipts:1,suspects:0});
  gate('A01',{eventId:originalId,counts:await stats()});

  // A02: simulate a lost ACK by ignoring rA1 and resending identical request.
  const replay = await create(original);
  assert.equal(replay.status,201);
  assert.equal(replay.body.id,originalId);
  assert.equal(replay.body.idempotentReplay,true);
  assert.deepEqual(await stats(),{events:1,ledger:1,receipts:1,suspects:0});
  gate('A02',{eventId:originalId,counts:await stats()});

  const changed = await create({...original,amount:21.73});
  assert.equal(changed.status,409,JSON.stringify(changed.body));
  assert.equal(changed.body.error,'OPERATION_ID_REUSED');
  assert.equal((await stats()).events,1);
  gate('A03',{status:changed.status,counts:await stats()});

  // A04: same financial payload, DIFFERENT operationId, lost ACK.
  const secondOperation = randomUUID();
  const rA4 = await create({...original,operationId:secondOperation});
  assert.equal(rA4.status,201,JSON.stringify(rA4.body));
  assert.notEqual(rA4.body.id,originalId);
  assert.deepEqual(await stats(),{events:2,ledger:2,receipts:2,suspects:2});
  const suspectRows = await prisma.auditLog.findMany({where:{
    action:'FINANCIAL_EVENT_DUPLICATE_SUSPECTED',
    entityId:{in:[originalId,rA4.body.id]},
  }});
  assert.equal(suspectRows.length,2);
  for (const row of suspectRows) {
    const parsed = JSON.parse(row.metadata || '{}');
    assert.equal(parsed.context.suspicionGroupId,
      'financial-event-suspected-v1:'+originalId+':'+rA4.body.id);
    assert.ok([originalId,rA4.body.id].includes(parsed.context.peerEventId));
  }
  gate('A04',{events:2,ledger:2,audits:2,secondEvent:rA4.body.id});

  // A05: two legitimate identical purchases, distinct IDs: no false 409.
  const before05 = await stats();
  const realOne = await create(expense(randomUUID(),'PHASE A05 two genuine identical purchases'));
  const realTwo = await create(expense(randomUUID(),'PHASE A05 two genuine identical purchases'));
  assert.equal(realOne.status,201);
  assert.equal(realTwo.status,201);
  assert.notEqual(realOne.body.id,realTwo.body.id);
  const after05=await stats();
  assert.equal(after05.events-before05.events,2);
  assert.equal(after05.ledger-before05.ledger,2);
  assert.equal(after05.suspects-before05.suspects,2);
  gate('A05',{first:realOne.body.id,second:realTwo.body.id,deltaEvents:2,deltaSuspicions:2});

  // A06: the server never distinguishes the unobservable client intent.
  assert.equal(rA4.status,realTwo.status);
  assert.equal((await stats()).events,4);
  gate('A06',{ambiguousCase:'CREATED_AND_AUDITED',genuineCase:'CREATED_AND_AUDITED'});

  // A07: fingerprint must include context, identifiers and decimal precision.
  const fingerprintArgs={
    workspaceId:a.workspace.id,userId:a.user.id,description:'A07',
    type:'expense',status:'paid',date:'2026-11-24',competence:'2026-11',
    notes:'X',amount:12.35,signedAmount:-12.35,
    accountId:a.account.id,categoryId:a.category.id,paymentMethodId:a.method.id,
  };
  const fp=financialEventSuspicionFingerprint(fingerprintArgs);
  for(const diff of [
    {description:'A07 DIFFERENT'},
    {status:'planned'}, {date:'2026-11-23'},
    {competence:'2026-10'}, {notes:'Y'},
    {amount:12.36,signedAmount:-12.36},
    {accountId:a.account2.id}, {categoryId:a.category2.id},
    {paymentMethodId:a.method2.id}, {workspaceId:b.workspace.id},
    {userId:b.user.id},
  ]) {
    assert.notEqual(financialEventSuspicionFingerprint({...fingerprintArgs,...diff}),fp,
      'A07 fingerprint collision on '+JSON.stringify(diff));
  }
  const first07=await create(expense(randomUUID(),'PHASE A07 baseline'));
  const other07=await create(expense(randomUUID(),'PHASE A07 baseline',{notes:'DIFFERENT NOTES'}));
  assert.equal(first07.status,201);
  assert.equal(other07.status,201);
  const noFalsePair=await prisma.auditLog.count({where:{
    action:'FINANCIAL_EVENT_DUPLICATE_SUSPECTED',entityId:first07.body.id,
  }});
  assert.equal(noFalsePair,0);
  gate('A07',{fingerprintDifferenceChecks:11,notesDistinctCreated:true});

  // A08: a second workspace cannot see or affect A's audit links.
  const crossRead=await getSuspects(jwtB);
  assert.equal(crossRead.status,200,JSON.stringify(crossRead.body));
  assert.equal(crossRead.body.total,0);
  const crossWrite=await create(expense(randomUUID(),'PHASE A08 forbidden workspace'),
    jwtA,b.workspace.id);
  assert.equal(crossWrite.status,409);
  assert.equal((await stats(b.workspace.id)).events,0);
  const noToken=await parse(await fetch(base+'/finance/events/suspected-duplicates'));
  assert.equal(noToken.status,401);
  gate('A08',{otherWorkspaceSuspicions:0,crossWriteStatus:409,anonymousRead:401});

  // A09: same operationId with concurrent HTTP posts must remain single-write.
  const op09=randomUUID();
  const payload09=expense(op09,'PHASE A09 single intent concurrent');
  const before09=await stats();
  const responses09=await Promise.all(Array.from({length:5},()=>create(payload09)));
  assert.ok(responses09.every(x=>x.status===201),JSON.stringify(responses09.map(x=>x.status)));
  assert.equal(new Set(responses09.map(x=>x.body.id)).size,1);
  const after09=await stats();
  assert.equal(after09.events-before09.events,1);
  assert.equal(after09.ledger-before09.ledger,1);
  assert.equal(after09.receipts-before09.receipts,1);
  gate('A09',{requests:5,createdEvents:1,createdLedgers:1});

  // A10: different operationIds are distinct even in a concurrent burst.
  const before10=await stats();
  const responses10=await Promise.all(Array.from({length:4},()=>
    create(expense(randomUUID(),'PHASE A10 concurrent four actual expenses'))));
  assert.ok(responses10.every(x=>x.status===201),JSON.stringify(responses10.map(x=>({status:x.status,error:x.body.error,id:x.body.id}))));
  assert.equal(new Set(responses10.map(x=>x.body.id)).size,4);
  const after10=await stats();
  assert.equal(after10.events-before10.events,4);
  assert.equal(after10.ledger-before10.ledger,4);
  assert.equal(after10.receipts-before10.receipts,4);
  assert.equal(after10.suspects-before10.suspects,6,
    'A10 must link every concurrent distinct event by bilateral suspicion');
  gate('A10',{requests:4,events:4,ledgers:4,bilateralAuditRows:6});

  // A11: the authenticated support channel returns BOTH sides of a suspicion.
  const view=await getSuspects();
  assert.equal(view.status,200,JSON.stringify(view.body));
  const pair=view.body.items.filter((x:any)=>
    x.event.id===originalId || x.event.id===rA4.body.id);
  assert.equal(pair.length,2);
  assert.equal(new Set(pair.map((x:any)=>x.event.id)).size,2);
  for(const item of pair) {
    assert.ok(item.peer?.id);
    assert.ok(item.suspicionGroupId);
    assert.equal(item.reviewStatus,'SUSPECTED');
  }
  assert.ok(view.body.total>=4);
  gate('A11',{path:'/finance/events/suspected-duplicates',total:view.body.total,
    pairLinks:pair.map((x:any)=>x.event.id+':'+x.peer.id)});

  // A12: induced failure of the second suspicious-audit INSERT rolls
  // back the entire FinancialEvent, ledger and receipt of that attempt.
  const triggerFn=[
    'CREATE OR REPLACE FUNCTION meg_phasea_fail_suspect() RETURNS trigger',
    'LANGUAGE plpgsql AS $$ BEGIN',
    "IF NEW.action = 'FINANCIAL_EVENT_DUPLICATE_SUSPECTED' THEN",
    "RAISE EXCEPTION 'PHASE_A_SYNTHETIC_AUDIT_FAILURE';",
    'END IF; RETURN NEW; END; $$',
  ].join(' ');
  await prisma.$executeRawUnsafe(triggerFn);
  await prisma.$executeRawUnsafe(
    'CREATE TRIGGER meg_phasea_fail_suspect BEFORE INSERT ON "AuditLog" '+
    'FOR EACH ROW EXECUTE FUNCTION meg_phasea_fail_suspect()');
  triggerCreated=true;
  const seed12=await create(expense(randomUUID(),'PHASE A12 audit fault'));
  assert.equal(seed12.status,201);
  const before12=await stats();
  const fault12=await create(expense(randomUUID(),'PHASE A12 audit fault'));
  assert.ok(fault12.status>=500,'A12 must propagate synthetic server failure');
  assert.deepEqual(await stats(),before12);
  await prisma.$executeRawUnsafe('DROP TRIGGER meg_phasea_fail_suspect ON "AuditLog"');
  await prisma.$executeRawUnsafe('DROP FUNCTION meg_phasea_fail_suspect()');
  triggerCreated=false;
  gate('A12',{syntheticFailureStatus:fault12.status,financialCountsPreserved:true});

  // A13: an archived predecessor is not auto-resurrected or returned as B.
  const archivedOne=await create(expense(randomUUID(),'PHASE A13 archived distinct intent'));
  assert.equal(archivedOne.status,201);
  await prisma.financialEvent.update({where:{id:archivedOne.body.id},
    data:{archivedAt:new Date(),status:'archived'}});
  const archivedNew=await create(expense(randomUUID(),'PHASE A13 archived distinct intent'));
  assert.equal(archivedNew.status,201);
  assert.notEqual(archivedNew.body.id,archivedOne.body.id);
  assert.ok((await prisma.financialEvent.findUniqueOrThrow({
    where:{id:archivedOne.body.id}})).archivedAt);
  gate('A13',{archivedOriginal:archivedOne.body.id,newEvent:archivedNew.body.id});

  // A14: the installed disposable-DB-only tombstone guard prevents
  // reuse after physical receipt purge.
  const deleted = await prisma.$executeRawUnsafe(
    'DELETE FROM "CloudMutationReceipt" WHERE "workspaceId"=$1 AND "operationId"=$2',
    a.workspace.id, original.operationId);
  assert.equal(deleted,1);
  const tombstone=await prisma.cloudMutationReceipt.findUniqueOrThrow({where:{
    workspaceId_operationId:{workspaceId:a.workspace.id,operationId:original.operationId},
  }});
  assert.equal(tombstone.mutationType,'PURGED_OPERATION_ID');
  const before14=await stats();
  const replayAfterPurge=await create(original);
  assert.equal(replayAfterPurge.status,409);
  assert.equal(replayAfterPurge.body.error,'OPERATION_ID_REUSED');
  assert.deepEqual(await stats(),before14);
  gate('A14',{tombstone:true,status:replayAfterPurge.status});

  // A18 explicitly covers absent/false allowDuplicate on the legacy APK.
  const before18=await stats();
  const first18=await create(expense(randomUUID(),'PHASE A18 legacy no override'));
  const second18=await create(expense(randomUUID(),'PHASE A18 legacy no override',
    {allowDuplicate:false}));
  assert.equal(first18.status,201);
  assert.equal(second18.status,201);
  assert.notEqual(first18.body.id,second18.body.id);
  const after18=await stats();
  assert.equal(after18.events-before18.events,2);
  assert.equal(after18.ledger-before18.ledger,2);
  assert.equal(after18.receipts-before18.receipts,2);
  assert.equal(after18.suspects-before18.suspects,2);
  const again18=await create(expense(randomUUID(),'PHASE A18 no override'))
  assert.equal(again18.status,201);
  gate('A18',{twoDifferentIDsCreate:true,ledgerDelta:2,auditDelta:2,
    possibleDuplicate409:false});

  console.log('ISSUE699_PHASE_A_HTTP_PG17_TEST_EXECUTION=COMPLETED');
  console.log('ISSUE699_PHASE_A_APK_NATIVE_A15_A16=NOT_EXECUTED_BY_THIS_SUITE');
  console.log('ISSUE699_PHASE_A_FULL_REGRESSION_A17=NOT_EXECUTED_BY_THIS_SUITE');
} finally {
  if (triggerCreated) {
    await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS meg_phasea_fail_suspect ON "AuditLog"');
    await prisma.$executeRawUnsafe('DROP FUNCTION IF EXISTS meg_phasea_fail_suspect()');
  }
  if (listening) await app.close();
  await prisma.$disconnect();
  console.log('ISSUE699_PHASE_A_TEST_CLIENT_DISCONNECTED=PASS');
}
