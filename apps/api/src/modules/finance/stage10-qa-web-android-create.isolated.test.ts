import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fastify from 'fastify';
import bcrypt from 'bcryptjs';
import { registerAuth } from '../../plugins/auth';
import { authRoutes } from '../auth/routes';
import { LicenseStatus, Prisma, prisma, UserRole, UserStatus } from '@meg/database';
import { appStateRoutes } from '../app-state/routes';
import { financeBenefitEventRoutes } from './benefit-event-routes';
import { financeRoutes } from './routes';
import { createFinancialEventSchema, updateFinancialEventSchema } from './schemas';
import { normalizationPreview } from '../app-state/normalization-migration';

/**
 * Um fluxo integrado real com Fastify.inject e PG17 descartavel.
 * Criar na nova Web -> FinancialEvent + ledger + AppState no mesmo commit.
 * NUNCA conecta a producao e nunca usa uma APK real.
 */
const url=new URL(process.env.DATABASE_URL || 'http://invalid');
if(process.env.MEG_STAGE10_ISOLATED_PG!=='1'
 || url.hostname!=='127.0.0.1' || url.pathname!=='/meg_stage10_sandbox'
 || url.username!=='meg_stage10_ci')throw new Error('STAGE10_TEST_QA_ONLY');

const stamp='stage10-qa-bridge-'+Date.now()+'-'+Math.random().toString(36).slice(2);
let ownerId:string|null=null,workspaceId:string|null=null,planId:string|null=null;
let app:ReturnType<typeof fastify>|null=null;
const fixturePassword='Stage10QAOnly-Password-NotProduction-2026';

async function main(){
 try {
  const eventWithoutStatus = { description: 'Evento QA', type: 'expense', date: '2026-11-11', amount: 12.35 };
  assert.equal(createFinancialEventSchema.parse(eventWithoutStatus).status, 'planned');
  assert.deepEqual(updateFinancialEventSchema.parse({ description: 'Descrição alterada' }), {
   description: 'Descrição alterada',
  });
  assert.equal(updateFinancialEventSchema.parse({ status: 'paid' }).status, 'paid');
  process.env.MEG_STAGE10_WEB_WRITE_QA='1';
  const user=await prisma.user.create({data:{
   email:stamp+'@meg.test',name:'Operador QA Web/Android',
   passwordHash:await bcrypt.hash(fixturePassword,10),
   role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true,approvedAt:new Date(),
  }});
  ownerId=user.id;
  const plan=await prisma.plan.create({data:{
   code:stamp,name:'Plano QA isolado',monthlyPrice:0,maxMembers:2,features:[],
  }});
  planId=plan.id;
  const workspace=await prisma.workspace.create({data:{
   name:'Web/Android write QA',slug:stamp,ownerId:user.id,
   members:{create:{userId:user.id,role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true}},
   appState:{create:{userId:user.id,revision:1,
    state:{transactions:[],budgets:{},__megNormalization:{mode:'normalized-primary'}} as Prisma.InputJsonValue,
   }},
   subscription:{create:{planId:plan.id,status:LicenseStatus.ACTIVE}},
  }});
  workspaceId=workspace.id;
  const account=await prisma.account.create({data:{
   userId:user.id,name:'Conta monetaria QA',type:'checking',openingBalance:100,
  }});
  const category=await prisma.category.create({data:{
   userId:user.id,name:'Mercado ficticio QA',group:'ALIMENTACAO',type:'expense',
  }});
  const method=await prisma.paymentMethod.create({data:{
   userId:user.id,name:'PIX',type:'instant',
  }});

  app=fastify();
  // JWT REAL, senha bcrypt e rota de login real; usuario e banco sao descartaveis.
  await registerAuth(app);
  await app.register(authRoutes,{prefix:'/auth'});
  await app.register(appStateRoutes,{prefix:'/app-state'});
  await app.register(financeRoutes,{prefix:'/finance'});
  await app.register(financeBenefitEventRoutes,{prefix:'/finance'});
  await app.ready();


  const denied=await app.inject({method:'GET',url:'/app-state/stage10-qa-write-gate'});
  assert.equal(denied.statusCode,401,'Sem Bearer a rota e privada');
  const forged=await app.inject({
   method:'GET',url:'/app-state/stage10-qa-write-gate',
   headers:{authorization:'Bearer invalido.sem.assinatura'},
  });
  assert.equal(forged.statusCode,401,'JWT falso deve ser recusado');
  const wrongPassword=await app.inject({
   method:'POST',url:'/auth/login',
   payload:{email:user.email,password:'SenhaQA-Incorreta-2026'},
  });
  assert.equal(wrongPassword.statusCode,401);
  const login=await app.inject({
   method:'POST',url:'/auth/login',
   payload:{email:user.email,password:fixturePassword},
  });
  assert.equal(login.statusCode,200,login.body);
  const accessToken=JSON.parse(login.body).accessToken as string;
  assert.ok(accessToken && accessToken.split('.').length===3);
  const withAuth=(request:{method:'GET'|'POST'|'PATCH';url:string;payload?:unknown})=>
   app!.inject({...request,headers:{authorization:'Bearer '+accessToken}});
  const viewerToken=await app.jwt.sign({sub:user.id,role:UserRole.VIEWER,email:user.email});
  const unauthorizedRole=await app.inject({
   method:'GET',url:'/app-state/stage10-qa-write-gate',
   headers:{authorization:'Bearer '+viewerToken},
  });
  assert.equal(unauthorizedRole.statusCode,403,'VIEWER nao pode abrir gate de escrita');
  console.log('MEG_STAGE10_REAL_JWT_LOGIN_ACCESS_ROLE_GATE_PASS');

  const gate=await withAuth({method:'GET',url:'/app-state/stage10-qa-write-gate'});
  assert.equal(gate.statusCode,200,gate.body);
  assert.equal(JSON.parse(gate.body).allowed,true);

  const payload={
   operationId:randomUUID(),description:'Despesa QA integrada',
   type:'expense',status:'paid',date:'2026-11-11',amount:12.35,
   accountId:account.id,categoryId:category.id,paymentMethodId:method.id,
   notes:'Somente QA descartavel',
  };
  const write=async(input:typeof payload)=>withAuth({
   method:'POST',url:'/finance/events',payload:input,
  });
  const responseLost = new Error('QA_RESPONSE_LOST_AFTER_COMMIT');
  await assert.rejects(async () => {
   const response = await write(payload);
   assert.equal(response.statusCode,201,response.body);
   // The server has handled the request, but the caller loses the response.
   throw responseLost;
  }, error => error === responseLost);
  const committed = await prisma.financialEvent.findMany({where:{workspaceId:workspace.id}});
  assert.equal(committed.length,1);
  assert.equal(await prisma.ledgerEntry.count({where:{eventId:committed[0].id}}),1);

  const created=await write(payload);
  assert.equal(created.statusCode,201,created.body);
  const response=JSON.parse(created.body);
  assert.equal(response.id,committed[0].id);
  assert.equal(response.idempotentReplay,true);
  console.log('MEG_STAGE10_RESPONSE_LOST_AFTER_COMMIT_SAME_ID_REPLAY_PASS');
  assert.equal(response.legacyTransactionId,response.id);
  assert.equal(response.appStateRevision,2);
  const row=await prisma.financialEvent.findUniqueOrThrow({
   where:{id:response.id},include:{ledgerEntries:true},
  });
  assert.equal(row.accountId,account.id);
  assert.equal(row.categoryId,category.id);
  assert.equal(row.paymentMethodId,method.id);
  assert.equal(row.legacyTransactionId,row.id);
  assert.equal(row.ledgerEntries.length,1);
  assert.equal(Number(row.signedAmount),-12.35);
  const mirrored=await prisma.appState.findUniqueOrThrow({where:{workspaceId:workspace.id}});
  assert.equal(mirrored.revision,2);
  const transactions=(mirrored.state as {transactions:{id:string;financialAccountId:string}[]}).transactions;
  assert.equal(transactions.length,1);
  assert.equal(transactions[0].id,row.id);
  assert.equal(transactions[0].financialAccountId,account.id);

  const integrity=await normalizationPreview(workspace.id,user.id);
  assert.equal(integrity.primary,true);
  assert.equal(integrity.reconciled,true);
  assert.equal(integrity.source.invalidCount,0);
  assert.equal(integrity.source.validCount,1);

  const read=await withAuth({method:'GET',url:'/finance/events?page=1&pageSize=50'});
  assert.equal(read.statusCode,200,read.body);
  const listed=JSON.parse(read.body);
  assert.ok(listed.items.some((x:{id:string})=>x.id===row.id));

  const replay=await write(payload);
  assert.equal(replay.statusCode,201,replay.body);
  assert.equal(JSON.parse(replay.body).idempotentReplay,true);
  assert.equal((await prisma.appState.findUniqueOrThrow({where:{workspaceId:workspace.id}})).revision,2);
  assert.equal(await prisma.financialEvent.count({where:{workspaceId:workspace.id}}),1);
  assert.equal(await prisma.ledgerEntry.count({where:{eventId:row.id}}),1);

  const mismatched=await write({...payload,amount:10});
  assert.equal(mismatched.statusCode,409);
  assert.equal(JSON.parse(mismatched.body).error,'OPERATION_ID_REUSED');

  const missingAccount=await write({...payload,operationId:randomUUID(),accountId:''});
  assert.ok(missingAccount.statusCode>=400);
  assert.equal(await prisma.financialEvent.count({where:{workspaceId:workspace.id}}),1,
   'Sem conta, criacao e espelho falham juntos sem evento orfao');


  // Fluxo editavel: Web QA -> mesmo FinancialEvent -> ledger -> AppState
  // lido pelo contrato legado, sem criar ID nem evento adicional.
  const gateEdit=await withAuth({method:'GET',url:'/app-state/stage10-qa-write-gate'});
  assert.equal(gateEdit.statusCode,200,gateEdit.body);
  assert.equal(JSON.parse(gateEdit.body).editSupported,true);
  assert.equal(JSON.parse(gateEdit.body).revision,2);

  const editPayload={
   operationId:randomUUID(),expectedUpdatedAt:row.updatedAt.toISOString(),
   expectedRevision:2,description:'Despesa QA alterada pela Web',
   date:payload.date,status:'paid',amount:10.35,
   accountId:account.id,categoryId:category.id,paymentMethodId:method.id,
   notes:'Edicao canonica QA',
  };
  const edit=(changes:typeof editPayload)=>withAuth({
   method:'PATCH',url:'/finance/events/'+row.id+'/stage10-qa-edit',
   payload:changes,
  });
  const updated=await edit(editPayload);
  assert.equal(updated.statusCode,200,updated.body);
  assert.equal(JSON.parse(updated.body).id,row.id);
  assert.equal(JSON.parse(updated.body).legacyTransactionId,row.id);
  assert.equal(JSON.parse(updated.body).revision,3);
  assert.equal(JSON.parse(updated.body).idempotentReplay,false);
  const changed=await prisma.financialEvent.findUniqueOrThrow({
   where:{id:row.id},include:{ledgerEntries:true},
  });
  assert.equal(changed.id,row.id);
  assert.equal(changed.description,editPayload.description);
  assert.equal(Number(changed.amount),10.35);
  assert.equal(Number(changed.signedAmount),-10.35);
  assert.equal(changed.accountId,account.id);
  assert.equal(changed.categoryId,category.id);
  assert.equal(changed.paymentMethodId,method.id);
  assert.equal(changed.ledgerEntries.length,1);
  assert.equal(Number(changed.ledgerEntries[0].credit),10.35);
  assert.equal(await prisma.financialEvent.count({where:{workspaceId:workspace.id}}),1);

  const androidRead=await withAuth({method:'GET',url:'/app-state'});
  assert.equal(androidRead.statusCode,200,androidRead.body);
  const androidDto=JSON.parse(androidRead.body);
  assert.equal(androidDto.revision,3);
  assert.equal(androidDto.dataSource,'normalized',androidRead.body);
  const androidItems=androidDto.state.transactions.filter((x:{id:string})=>x.id===row.id);
  assert.equal(androidItems.length,1);
  assert.equal(androidItems[0].description,editPayload.description);
  assert.equal(Number(androidItems[0].amount),10.35);
  assert.equal(androidItems[0].financialAccountId,account.id);
  const canonicalRead=await withAuth({method:'GET',url:'/finance/events?page=1&pageSize=50'});
  assert.equal(canonicalRead.statusCode,200,canonicalRead.body);
  const readChanged=JSON.parse(canonicalRead.body).items.find((x:{id:string})=>x.id===row.id);
  assert.equal(readChanged.description,editPayload.description);
  assert.equal(Number(readChanged.amount),10.35);

  const replayEdit=await edit(editPayload);
  assert.equal(replayEdit.statusCode,200,replayEdit.body);
  assert.equal(JSON.parse(replayEdit.body).idempotentReplay,true);
  const reusedId=await edit({...editPayload,amount:10.34});
  assert.equal(reusedId.statusCode,409,reusedId.body);
  assert.equal(JSON.parse(reusedId.body).error,'OPERATION_ID_REUSED');

  const rejectedStale=await edit({
   ...editPayload,operationId:randomUUID(),expectedRevision:2,
  });
  assert.equal(rejectedStale.statusCode,409,rejectedStale.body);
  assert.equal(JSON.parse(rejectedStale.body).error,'STAGE10_QA_REVISION_CONFLICT');

  const rejectedStatus=await edit({
   ...editPayload,operationId:randomUUID(),expectedRevision:3,
   expectedUpdatedAt:changed.updatedAt.toISOString(),status:'planned',
  });
  assert.equal(rejectedStatus.statusCode,409,rejectedStatus.body);
  assert.equal(JSON.parse(rejectedStatus.body).error,'STAGE10_QA_SCOPE_ACCOUNT_DATE_STATUS_LOCKED');

  const insufficient=await edit({
   ...editPayload,operationId:randomUUID(),expectedRevision:3,
   expectedUpdatedAt:changed.updatedAt.toISOString(),amount:200,
  });
  assert.equal(insufficient.statusCode,409,insufficient.body);
  assert.equal(JSON.parse(insufficient.body).error,'STAGE10_QA_INSUFFICIENT_ACCOUNT_BALANCE');
  const afterReject=await prisma.financialEvent.findUniqueOrThrow({
   where:{id:row.id},include:{ledgerEntries:true},
  });
  assert.equal(Number(afterReject.amount),10.35);
  assert.equal(afterReject.ledgerEntries.length,1);
  assert.equal((await prisma.appState.findUniqueOrThrow({where:{workspaceId:workspace.id}})).revision,3);
  console.log('MEG_STAGE10_WEB_EDIT_ANDROID_READBACK_ATOMIC_QA_PASS');

  process.env.MEG_STAGE10_WEB_WRITE_QA='0';
  const disabled=await withAuth({method:'GET',url:'/app-state/stage10-qa-write-gate'});
  assert.equal(disabled.statusCode,403);

  const benefitAccount = await prisma.account.create({
   data: { userId: user.id, name: 'Conta Benefício QA', type: 'benefit', openingBalance: 0 },
  });
  const verocard = await prisma.paymentMethod.create({
   data: { userId: user.id, name: 'Verocard', type: 'other' },
  });
  const creditPayload = {
   operationId: `phoenix-benefit-${randomUUID()}`,
   type: 'income', date: payload.date, amount: 25, description: 'Crédito fictício de benefício',
   accountId: benefitAccount.id, paymentMethodId: verocard.id,
  };
  const writeBenefit = (input: typeof creditPayload) =>
   withAuth({ method: 'POST', url: '/finance/benefit-events', payload: input });
  const firstCredit = await writeBenefit(creditPayload);
  assert.equal(firstCredit.statusCode, 201, firstCredit.body);
  // The transport discards firstCredit.body. Reconcile using only the original request.
  const benefitReplay = await writeBenefit(creditPayload);
  assert.equal(benefitReplay.statusCode, 201, benefitReplay.body);
  const benefitEvent = JSON.parse(benefitReplay.body);
  assert.equal(benefitEvent.idempotentReplay, true);
  assert.equal(benefitEvent.status, 'paid');
  assert.equal(await prisma.financialEvent.count({ where: { workspaceId, accountId: benefitAccount.id } }), 1);
  const benefitLedger = await prisma.ledgerEntry.findMany({ where: { eventId: benefitEvent.id } });
  assert.equal(benefitLedger.length, 1);
  assert.equal(benefitLedger[0].accountId, benefitAccount.id);
  assert.equal(Number(benefitLedger[0].debit), 25);
  const changedCredit = await writeBenefit({ ...creditPayload, amount: 30 });
  assert.equal(changedCredit.statusCode, 409, changedCredit.body);
  assert.equal(JSON.parse(changedCredit.body).error, 'OPERATION_ID_REUSED');
  console.log('MEG_STAGE10_BENEFIT_RESPONSE_LOST_SAME_ID_REPLAY_PASS');

  console.log('MEG_STAGE10_WEB_CREATE_CANONICAL_AND_ANDROID_MIRROR_QA_PASS');
  console.log('MEG_STAGE10_WEB_CREATE_EDIT_REAL_JWT_QA_PASS');
 } finally {
  delete process.env.MEG_STAGE10_WEB_WRITE_QA;
  if(app)await app.close();
  if(workspaceId)await prisma.ledgerEntry.deleteMany({where:{event:{workspaceId}}});
  if(workspaceId)await prisma.workspace.delete({where:{id:workspaceId}});
  if(planId)await prisma.plan.delete({where:{id:planId}});
  if(ownerId)await prisma.user.delete({where:{id:ownerId}});
  await prisma.$disconnect();
 }
}
main().catch(e=>{console.error('MEG_STAGE10_WEB_ANDROID_CREATE_QA_FAILED',e);process.exitCode=1;});
