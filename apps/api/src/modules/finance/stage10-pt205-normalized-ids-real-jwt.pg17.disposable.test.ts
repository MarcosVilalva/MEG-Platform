/** PT205: identidade FK + AppState normalized-primary sob Fastify/JWT REAL. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fastify from 'fastify';
import bcrypt from 'bcryptjs';
import { prisma, Prisma, LicenseStatus, UserRole, UserStatus } from '@meg/database';
import { registerAuth } from '../../plugins/auth';
import { authRoutes } from '../auth/routes';
import { appStateRoutes } from '../app-state/routes';

const db = new URL(process.env.DATABASE_URL || 'http://invalid');
const localSandbox = db.port==='55579' && db.pathname==='/meg_stage10_pt205_sandbox';
const githubSandbox = process.env.GITHUB_ACTIONS==='true'
  && process.env.GITHUB_REPOSITORY==='MarcosVilalva/MEG-Platform'
  && process.env.MEG_STAGE10_QA_LOCAL_ONLY==='1'
  && db.port==='5432' && db.pathname==='/meg_stage10_sandbox';
if (!(db.protocol==='postgresql:' && db.hostname==='127.0.0.1'
  && db.username==='meg_stage10_ci' && (localSandbox || githubSandbox)
  && process.env.MEG_STAGE10_PT205_SYNTHETIC==='1'
  && process.env.MEG_STAGE10_ISOLATED_PG==='1'
  && process.env.MEG_STAGE10_WEB_WRITE_QA==='0' && process.env.NODE_ENV==='test')) {
  throw Error('PT205_SYNTHETIC_LOCAL_DATABASE_ONLY');
}
const PORT=33359;
const app=fastify({logger:false});
let listening=false;
try {
  const stamp=randomUUID();
  const pass='pt205-'+stamp;
  const newPerson=async (id:string)=>prisma.user.create({data:{
    email:'pt205-'+id+'-'+stamp+'@example.invalid',name:'PT205 ficticio '+id,
    passwordHash:await bcrypt.hash(pass,8),role:UserRole.ADMIN,
    status:UserStatus.ACTIVE,isActive:true,approvedAt:new Date(),
  }});
  const owner=await newPerson('owner');
  const other=await newPerson('other');
  const plan=await prisma.plan.create({data:{
    code:'PT205-'+stamp,name:'PT205 Synthetic Plan',monthlyPrice:0,maxMembers:3,features:[],
  }});
  const legacyId='pt205-legacy-'+stamp;
  const transaction={
    id:legacyId,date:'2026-11-11',description:'PT205 Despesa original',
    type:'expense',amount:12.35,expenseAmount:12.35,status:'paid',situation:'PAGO',
    category:'Mercado',group:'Mercado',expenseClass:'CONTAS GERAIS',
    paymentMethod:'PIX',modality:'À VISTA',
  };
  const state=(items:unknown[])=>({
    transactions:items,budgets:{},__megNormalization:{mode:'normalized-primary'},
  });
  const newWorkspace=async(userId:string,slug:string,items:unknown[])=>prisma.workspace.create({
    data:{
      ownerId:userId,name:'PT205 '+slug,slug:'pt205-'+slug+'-'+stamp,
      members:{create:[{userId,role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true}]},
      subscription:{create:{planId:plan.id,status:LicenseStatus.ACTIVE}},
      appState:{create:{userId,revision:1,state:state(items) as Prisma.InputJsonValue}},
    },
  });
  const ws=await newWorkspace(owner.id,'owner',[]);
  const wsOther=await newWorkspace(other.id,'other',[]);
  const account=await prisma.account.create({data:{
    userId:owner.id,name:'PT205 Conta',type:'checking',openingBalance:100,
  }});
  const category=await prisma.category.create({data:{
    userId:owner.id,name:'Mercado',group:'CONTAS GERAIS',type:'expense',
  }});
  const method=await prisma.paymentMethod.create({data:{
    userId:owner.id,name:'PIX',type:'instant',
  }});
  const payload={...transaction,financialAccountId:account.id};
  await prisma.appState.update({where:{workspaceId:ws.id},data:{
    state:state([payload]) as Prisma.InputJsonValue,
  }});
  const event=await prisma.financialEvent.create({data:{
    workspaceId:ws.id,userId:owner.id,legacyTransactionId:legacyId,
    description:payload.description,type:'expense',status:'paid',
    date:new Date('2026-11-11T12:00:00Z'),competence:'2026-11',
    amount:12.35,signedAmount:-12.35,
    accountId:account.id,categoryId:category.id,paymentMethodId:method.id,
    sourcePayload:payload as Prisma.InputJsonValue,
  }});
  await registerAuth(app);
  await app.register(authRoutes,{prefix:'/auth'});
  await app.register(appStateRoutes,{prefix:'/app-state'});
  await app.listen({host:'127.0.0.1',port:PORT});
  listening=true;
  const url='http://127.0.0.1:'+PORT;
  const token=async(email:string)=>{
    const response=await fetch(url+'/auth/login',{method:'POST',
      headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:pass})});
    assert.equal(response.status,200);
    return (await response.json() as {accessToken:string}).accessToken;
  };
  const head=(tokenValue:string)=>({'Authorization':'Bearer '+tokenValue,'Content-Type':'application/json'});
  const ownerHeader=head(await token(owner.email));
  const otherHeader=head(await token(other.email));
  const getState=async(header:Record<string,string>)=>{
    const r=await fetch(url+'/app-state',{headers:header});
    assert.equal(r.status,200,r.status===200?'':await r.clone().text());
    return r.json() as Promise<{revision:number,state:{transactions:{id:string}[]}}>;
  };
  const patch=async(header:Record<string,string>,revision:number,upserts:unknown[],deletes:string[]=[])=>
    fetch(url+'/app-state/transactions',{method:'PATCH',headers:header,
      body:JSON.stringify({operationId:randomUUID(),expectedRevision:revision,upserts,deletes})});
  const put=async(header:Record<string,string>,revision:number,items:unknown[])=>
    fetch(url+'/app-state',{method:'PUT',headers:header,
      body:JSON.stringify({expectedRevision:revision,state:state(items)})});

  const unauthorized=await fetch(url+'/app-state/transactions',{method:'PATCH',
    headers:{'Content-Type':'application/json'},body:'{}'});
  assert.equal(unauthorized.status,401);
  assert.equal((await getState(otherHeader)).state.transactions.length,0);
  assert.equal((await getState(ownerHeader)).state.transactions.length,1);
  console.log('PT205_REAL_JWT_TENANT_READ_ISOLATED=PASS');

  const edited={...payload,description:'PT205 Despesa editada'};
  const accepted=await patch(ownerHeader,1,[edited]);
  assert.equal(accepted.status,200,accepted.status===200?'':await accepted.clone().text());
  const preserved=await prisma.financialEvent.findUniqueOrThrow({where:{id:event.id}});
  assert.equal(preserved.id,event.id);
  assert.equal(preserved.legacyTransactionId,legacyId);
  assert.equal(preserved.categoryId,category.id);
  assert.equal(preserved.paymentMethodId,method.id);
  assert.equal(preserved.accountId,account.id);
  assert.equal(preserved.description,edited.description);
  assert.equal((await getState(ownerHeader)).revision,2);
  assert.equal((await getState(otherHeader)).revision,1);
  console.log('PT205_REAL_JWT_PATCH_PRESERVES_CANONICAL_IDS_FKS=PASS');

  const mismatch=await patch(ownerHeader,2,[{...edited,category:'Categoria falsa'}]);
  assert.equal(mismatch.status,409);
  const rejected=await mismatch.json() as {error:string,retryable:boolean};
  assert.equal(rejected.error,'NORMALIZATION_CANONICAL_CATEGORY_CONFLICT');
  assert.equal(rejected.retryable,false);
  assert.equal((await getState(ownerHeader)).revision,2);
  console.log('PT205_REAL_JWT_CANONICAL_CATEGORY_409_NO_WRITE=PASS');

  const intact=await put(ownerHeader,2,[edited]);
  assert.equal(intact.status,200,intact.status===200?'':await intact.clone().text());
  assert.equal((await prisma.financialEvent.findUniqueOrThrow({where:{id:event.id}})).id,event.id);
  assert.equal((await getState(ownerHeader)).revision,3);
  console.log('PT205_REAL_JWT_PUT_PRESERVES_EVENT_ID=PASS');

  // #698: sincronizações PUT concorrentes com a MESMA revisão devem gravar
  // uma única alteração, sem recriar FinancialEvent nem perder FKs.
  const intentA={...edited,description:'PT205 concorrente A'};
  const intentB={...edited,description:'PT205 concorrente B'};
  const concurrent=await Promise.all([
    put(ownerHeader,3,[intentA]),
    put(ownerHeader,3,[intentB]),
  ]);
  assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409],
    'PUT concorrente deve aceitar apenas uma revisão e retornar 409 na outra');
  const winner=concurrent[0].status===200?intentA:intentB;
  const afterRace=await prisma.financialEvent.findUniqueOrThrow({where:{id:event.id}});
  assert.equal(afterRace.description,winner.description);
  assert.equal(afterRace.id,event.id);
  assert.equal(afterRace.categoryId,category.id);
  assert.equal(afterRace.paymentMethodId,method.id);
  assert.equal(await prisma.financialEvent.count({where:{workspaceId:ws.id,legacyTransactionId:legacyId}}),1);
  assert.equal((await getState(ownerHeader)).revision,4);
  console.log('PT205_REAL_JWT_CONCURRENT_PUT_ONE_WINNER_NO_DUPLICATES=PASS');

  // #698: reexecutar a sincronização já aceita não pode tocar no evento.
  const repeat=await put(ownerHeader,4,[winner]);
  assert.equal(repeat.status,200,repeat.status===200?'':await repeat.clone().text());
  const repeatBody=await repeat.json() as {normalization:{updated:number;created:number;archived:number}};
  assert.equal(repeatBody.normalization.updated,0);
  assert.equal(repeatBody.normalization.created,0);
  assert.equal(repeatBody.normalization.archived,0);
  const afterRepeat=await prisma.financialEvent.findUniqueOrThrow({where:{id:event.id}});
  assert.equal(afterRepeat.updatedAt.getTime(),afterRace.updatedAt.getTime());
  assert.equal(afterRepeat.id,event.id);
  assert.equal(afterRepeat.categoryId,category.id);
  assert.equal(afterRepeat.paymentMethodId,method.id);
  assert.equal((await getState(ownerHeader)).revision,5);
  console.log('PT205_REAL_JWT_REEXECUTION_NO_FINANCIAL_EVENT_CHANGE=PASS');

  await prisma.ledgerEntry.create({data:{
    eventId:event.id,accountId:account.id,date:event.date,debit:0,credit:12.35,
    memo:'PT205 ledger ficcional',
  }});
  const linked=await patch(ownerHeader,5,[{...winner,description:'Nao alterar ledger'}]);
  assert.equal(linked.status,409);
  assert.equal((await linked.json() as {error:string}).error,
    'NORMALIZATION_LINKED_EVENT_REQUIRES_CANONICAL_WRITER');
  assert.equal((await getState(ownerHeader)).revision,5);
  assert.equal(await prisma.ledgerEntry.count({where:{eventId:event.id}}),1);
  const final=await prisma.financialEvent.findUniqueOrThrow({where:{id:event.id}});
  assert.equal(final.id,event.id);
  assert.equal(final.categoryId,category.id);
  assert.equal(final.paymentMethodId,method.id);
  console.log('PT205_REAL_JWT_LINKED_LEDGER_FAIL_CLOSED=PASS');

  // Outro workspace nao pode reclassificar o evento por meio de FK alheia.
  const cross=await patch(otherHeader,1,[{...payload,id:'other-qa-'+stamp}]);
  assert.ok(cross.status >= 400 && cross.status < 500,
    'Conta de outro workspace exige rejeicao explicita de cliente, nunca erro 5xx');
  const crossBody=await cross.json() as {error?:string};
  assert.ok(typeof crossBody.error==='string' && crossBody.error.length>0);
  assert.equal((await getState(otherHeader)).revision,1);
  assert.equal((await getState(otherHeader)).state.transactions.length,0);
  assert.equal((await prisma.financialEvent.findUniqueOrThrow({where:{id:event.id}})).workspaceId,ws.id);
  console.log('PT205_REAL_JWT_CROSS_WORKSPACE_ACCOUNT_BLOCKED=PASS');
  console.log('PT205_NORMALIZED_PRIMARY_REAL_HTTP_JWT_PG17_GATE=PASS');
} finally {
  if(listening)await app.close();
  await prisma.$disconnect();
  console.log('PT205_FASTIFY_STOPPED=PASS');
}
