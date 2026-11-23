/**
 * PT213 | Novo gate incremental #698: integridade de quatro dependencias
 * sob HTTP/Fastify/JWT reais e PostgreSQL 17 exclusivamente descartavel.
 * Nunca usa dados, credenciais ou bancos de producao.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fastify from 'fastify';
import bcrypt from 'bcryptjs';
import { prisma, Prisma, LicenseStatus, UserRole, UserStatus } from '@meg/database';
import { registerAuth } from '../../plugins/auth';
import { authRoutes } from '../auth/routes';
import { appStateRoutes } from '../app-state/routes';

const db = new URL(process.env.DATABASE_URL || 'https://invalid');
const localSandbox = db.port === '55581'
  && db.pathname === '/meg_stage10_pt213_sandbox';
const githubSandbox = process.env.GITHUB_ACTIONS === 'true'
  && process.env.GITHUB_REPOSITORY === 'MarcosVilalva/MEG-Platform'
  && process.env.MEG_STAGE10_QA_LOCAL_ONLY === '1'
  && db.port === '5432'
  && db.pathname === '/meg_stage10_sandbox';
const allowed = db.protocol === 'postgresql:'
  && db.hostname === '127.0.0.1'
  && db.username === 'meg_stage10_ci'
  && (localSandbox || githubSandbox)
  && process.env.MEG_STAGE10_PT213_SYNTHETIC === '1'
  && process.env.MEG_STAGE10_ISOLATED_PG === '1'
  && process.env.MEG_STAGE10_WEB_WRITE_QA === '0'
  && process.env.NODE_ENV === 'test';
if (!allowed) throw Error('PT213_ONLY_FRESH_PG17_LOOPBACK_SANDBOX');

const app = fastify({ logger: false });
const port = 33361;
let started = false;
try {
  const id = randomUUID();
  const password = 'pt213-only-' + id;
  const owner = await prisma.user.create({ data: {
    email: 'pt213-owner-' + id + '@example.invalid',
    name: 'PT213 fictitious', passwordHash: await bcrypt.hash(password, 8),
    role: UserRole.ADMIN, status: UserStatus.ACTIVE, isActive: true,
    approvedAt: new Date(),
  }});
  const plan = await prisma.plan.create({ data: {
    code: 'PT213-'+id, name: 'PT213 synthetic',
    monthlyPrice: 0, maxMembers: 2, features: [],
  }});
  const state = (items: unknown[]) => ({
    transactions: items, budgets: {}, __megNormalization: { mode: 'normalized-primary' },
  });
  const workspace = await prisma.workspace.create({ data: {
    ownerId: owner.id, name: 'PT213 synthetic workspace',
    slug: 'pt213-'+id,
    members: { create: [{userId:owner.id,role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true}] },
    subscription: { create: { planId:plan.id,status:LicenseStatus.ACTIVE } },
    appState: { create: { userId:owner.id, revision:1, state:state([]) as Prisma.InputJsonValue } },
  }});
  const account = await prisma.account.create({ data: {
    userId:owner.id,name:'PT213 checking',type:'checking',openingBalance:100,
  }});
  const labels = ['ledger', 'receipt', 'payable', 'imported', 'unlinked'] as const;
  type Label = typeof labels[number];
  const original = new Map<Label, { id:string; date:string; description:string;
    amount:number; expenseAmount?:number; incomeAmount?:number; type:'expense'|'income';
    status:string; financialAccountId:string; situation:string }>();
  const eventIds = new Map<Label,string>();
  const date = new Date('2026-11-11T12:00:00.000Z');
  for (const label of labels) {
    const income = label === 'receipt';
    const amount = 12.35;
    const transaction = {
      id:'pt213-'+label+'-'+id, date:'2026-11-11',
      description:'PT213 '+label+' original', amount,
      ...(income ? {incomeAmount:amount} : {expenseAmount:amount}),
      type:income?'income':'expense',status:'paid',situation:'PAGO',
      financialAccountId:account.id,
    } as const;
    original.set(label,transaction);
    const event = await prisma.financialEvent.create({ data: {
      workspaceId:workspace.id,userId:owner.id,legacyTransactionId:transaction.id,
      description:transaction.description,type:transaction.type,status:'paid',
      date,competence:'2026-11',amount,signedAmount:income?amount:-amount,
      accountId:account.id,sourcePayload:transaction as Prisma.InputJsonValue,
    }});
    eventIds.set(label,event.id);
  }
  await prisma.appState.update({where:{workspaceId:workspace.id},data:{
    state: state([...original.values()]) as Prisma.InputJsonValue,
  }});

  const ledger = await prisma.ledgerEntry.create({data:{
    eventId:eventIds.get('ledger')!,accountId:account.id,date,debit:0,credit:12.35,
    memo:'PT213 fictitious ledger',
  }});
  const receivable = await prisma.receivable.create({data:{
    userId:owner.id,description:'PT213 fictitious invoice',totalAmount:12.35,
    openAmount:0,dueDate:date,status:'paid',
  }});
  const receipt = await prisma.receipt.create({data:{
    receivableId:receivable.id,amount:12.35,receivedAt:date,
    accountId:account.id,financialEventId:eventIds.get('receipt')!,
  }});
  const payable = await prisma.payable.create({data:{
    userId:owner.id,description:'PT213 fictitious payable',totalAmount:12.35,
    openAmount:0,dueDate:date,status:'paid',
  }});
  const payablePayment = await prisma.payablePayment.create({data:{
    payableId:payable.id,amount:12.35,paidAt:date,
    accountId:account.id,financialEventId:eventIds.get('payable')!,
  }});
  const batch = await prisma.importBatch.create({data:{
    userId:owner.id,fileName:'pt213-fictitious.csv',fileHash:'pt213-'+id,
    rowCount:1,importedCount:1,status:'completed',
  }});
  const imported = await prisma.importedRow.create({data:{
    batchId:batch.id,rowNumber:1,eventId:eventIds.get('imported')!,
    status:'imported',rawData:{source:'pt213-fictitious'},
  }});
  console.log('PT213_FOUR_DISTINCT_FINANCIAL_FK_FIXTURES=PASS');

  await registerAuth(app);
  await app.register(authRoutes,{prefix:'/auth'});
  await app.register(appStateRoutes,{prefix:'/app-state'});
  await app.listen({host:'127.0.0.1',port});
  started = true;
  const base='http://127.0.0.1:'+port;
  const login=await fetch(base+'/auth/login',{method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({email:owner.email,password})});
  assert.equal(login.status,200);
  const bearer=(await login.json() as {accessToken:string}).accessToken;
  assert.ok(bearer && bearer.length > 30);
  const headers={Authorization:'Bearer '+bearer,'Content-Type':'application/json'};
  const get=async()=>{
    const r=await fetch(base+'/app-state',{headers});
    assert.equal(r.status,200);
    return r.json() as Promise<{revision:number,state:{transactions:unknown[]}}>;
  };
  const patch=async (revision:number,upserts:unknown[],deletes:string[]=[]) =>
    fetch(base+'/app-state/transactions',{method:'PATCH',headers,
      body:JSON.stringify({operationId:randomUUID(),expectedRevision:revision,upserts,deletes})});
  const put=async(revision:number,items:unknown[]) =>
    fetch(base+'/app-state',{method:'PUT',headers,
      body:JSON.stringify({expectedRevision:revision,state:state(items)})});
  const expectedDomainError = async (result:Response, action:string) => {
    assert.equal(result.status,409,action+' HTTP '+result.status+
      (result.status===409?'':(' '+await result.clone().text())));
    const json=await result.json() as {error:string;retryable?:boolean};
    assert.equal(json.error,'NORMALIZATION_LINKED_EVENT_REQUIRES_CANONICAL_WRITER',action);
    assert.equal(json.retryable,false,action);
  };
  const snapshot=async (revision:number, expectedItems:number)=>{
    const remote=await get();
    assert.equal(remote.revision,revision);
    assert.equal(remote.state.transactions.length,expectedItems);
    for (const label of labels) {
      const e=await prisma.financialEvent.findUniqueOrThrow({where:{id:eventIds.get(label)!}});
      assert.equal(e.legacyTransactionId,original.get(label)!.id);
      assert.equal(e.workspaceId,workspace.id);
      assert.equal(e.userId,owner.id);
      assert.equal(e.archivedAt,null);
    }
    assert.equal((await prisma.ledgerEntry.findUniqueOrThrow({where:{id:ledger.id}})).eventId,eventIds.get('ledger'));
    assert.equal((await prisma.receipt.findUniqueOrThrow({where:{id:receipt.id}})).financialEventId,eventIds.get('receipt'));
    assert.equal((await prisma.payablePayment.findUniqueOrThrow({where:{id:payablePayment.id}})).financialEventId,eventIds.get('payable'));
    assert.equal((await prisma.importedRow.findUniqueOrThrow({where:{id:imported.id}})).eventId,eventIds.get('imported'));
    assert.equal(await prisma.financialEvent.count({where:{workspaceId:workspace.id}}),labels.length);
  };
  await snapshot(1,5);
  const protectedKinds = ['ledger','receipt','payable','imported'] as const;
  for (const label of protectedKinds) {
    const transaction=original.get(label)!;
    const edit={...transaction,description:'PT213 forbidden modification '+label};
    await expectedDomainError(await patch(1,[edit]),'EDIT '+label);
    await snapshot(1,5);
    await expectedDomainError(await patch(1,[],[transaction.id]),'DELETE '+label);
    await snapshot(1,5);
    console.log('PT213_JWT_'+label.toUpperCase()+'_EDIT_DELETE_ROLLBACK=PASS');
  }
  let currentRevision = 1;
  for (const label of protectedKinds) {
    // Um PUT que omite evento vinculado NÃO pode arquivar ou apagar a ID.
    const omitted=[...original.entries()].filter(([name])=>name!==label).map(([,value])=>value);
    const untouched=await put(currentRevision,omitted);
    assert.equal(untouched.status,200, 'PUT omission '+label+' '+(await untouched.clone().text()));
    const response=await untouched.json() as {normalization:{archived:number;updated:number;created:number}};
    assert.equal(response.normalization.archived,0);
    assert.equal(response.normalization.created,0);
    currentRevision += 1;
    await snapshot(currentRevision,5);
    console.log('PT213_JWT_PUT_OMISSION_PRESERVES_'+label.toUpperCase()+'_FK=PASS');
  }
  console.log('PT213_REAL_JWT_PUT_OMISSION_ALL_FOUR_LINKED_DOMAINS=PASS');

  const unlinked = original.get('unlinked')!;
  const omitUnlinked=[...original.entries()].filter(([name])=>name!=='unlinked').map(([,value])=>value);
  const untouchedUnlinked=await put(currentRevision,omitUnlinked);
  assert.equal(untouchedUnlinked.status,200,'PUT omission unlinked '+(await untouchedUnlinked.clone().text()));
  currentRevision += 1;
  await snapshot(currentRevision,5);
  console.log('PT213_REAL_JWT_PUT_OMISSION_UNLINKED_NOT_ARCHIVED=PASS');

  const accepted=await patch(currentRevision,[{...unlinked,description:'PT213 safe unlinked edit'}]);
  assert.equal(accepted.status,200,
    accepted.status===200?'':await accepted.clone().text());
  assert.equal((await prisma.financialEvent.findUniqueOrThrow({
    where:{id:eventIds.get('unlinked')!},
  })).description,'PT213 safe unlinked edit');
  currentRevision += 1;
  await snapshot(currentRevision,5);
  console.log('PT213_REAL_JWT_UNLINKED_UPDATE_NOT_OVERBLOCKED=PASS');

  // Contraste: exclusão explícita por PATCH ainda arquiva APENAS o evento livre.
  const explicit=await patch(currentRevision,[],[unlinked.id]);
  assert.equal(explicit.status,200,'Explicit PATCH delete '+(await explicit.clone().text()));
  const afterExplicit=await prisma.financialEvent.findUniqueOrThrow({where:{id:eventIds.get('unlinked')!}});
  assert.ok(afterExplicit.archivedAt instanceof Date);
  assert.equal(afterExplicit.id,eventIds.get('unlinked'));
  assert.equal((await get()).state.transactions.length,4);
  for (const label of protectedKinds) {
    const e=await prisma.financialEvent.findUniqueOrThrow({where:{id:eventIds.get(label)!}});
    assert.equal(e.archivedAt,null);
    assert.equal(e.id,eventIds.get(label));
  }
  console.log('PT213_EXPLICIT_PATCH_ONLY_ARCHIVES_UNLINKED=PASS');
  console.log('PT213_ALL_FOUR_FK_DOMAINS_HTTP_JWT_PG17_GATE=PASS');
} finally {
  if (started) await app.close();
  await prisma.$disconnect();
  console.log('PT213_FASTIFY_DISPOSED=PASS');
}
