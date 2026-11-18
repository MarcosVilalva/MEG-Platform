import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fastify from 'fastify';
import bcrypt from 'bcryptjs';
import { LicenseStatus, Prisma, prisma, UserRole, UserStatus } from '@meg/database';
import { registerAuth } from '../../plugins/auth';
import { authRoutes } from '../auth/routes';
import { appStateRoutes } from '../app-state/routes';
import { financeRoutes } from './routes';
import { buildNormalizationPreview } from '../app-state/normalization-migration-core';
import { normalizationPreview } from '../app-state/normalization-migration';
import { monetaryAccountBalanceAt, monetaryBalanceAt } from './monetary-protection';
import { readStage10HistoricalReview } from './stage10-historical-review-report';
import { readFileSync } from 'node:fs';

/**
 * Etapa 10: prova do contrato HTTP Web history-snapshot X Android historico app-state.
 * SEM dispositivo Android: homologacao no aparelho continua PENDENTE.
 * Fixtures 100% artificiais, modeladas pelas TRES combinacoes de catalogos
 * previamente encontradas na base, sem IDs reais, nomes pessoais ou valores privados.
 * NENHUM acesso ao Supabase/Render. Banco PG17 de runner descartavel.
 */
const url = new URL(process.env.DATABASE_URL || 'http://invalid');
if (process.env.MEG_STAGE10_ISOLATED_PG !== '1'
 || process.env.MEG_STAGE10_QA_LOCAL_ONLY !== '1'
 || url.hostname !== '127.0.0.1' || url.port !== '5432'
 || url.pathname !== '/meg_stage10_sandbox' || url.username !== 'meg_stage10_ci') {
 throw new Error('STAGE10_WEB_ANDROID_PARITY_LOCAL_PG17_ONLY');
}
const manifest = readFileSync('scripts/meg-stage10-reconciliation-map.readonly.sql','utf8').replace(/;\s*$/, '');
const tag = 'stage10-parity-' + randomUUID().slice(0,12);
let ownerId: string | undefined;
let workspaceId: string | undefined;
let planId: string | undefined;
let app: ReturnType<typeof fastify> | undefined;
const password = 'Fake-QA-Parity-Only-No-Prod-2026';
type LegacyLine = {
 id: string; type: string; date: string; description: string; amount: number;
 status: string; financialAccountId: string; category: string; expenseClass: string;
 paymentMethod: string; financialScope: string; modality: string; frequency: string;
 amountBehavior: string; necessity: string;
};
type MapRow = {
 event_id: string; grupo_financeiro: string; confianca: string; evidencia: string;
 category_proposed_id: string | null; payment_proposed_id: string | null;
 escrita_autorizada: boolean;
};
const fixtureDefinition = [
 { suffix:'debit', group:'TITULOS/PREVIDÊNCIA', method:'DÉBITO AUTOMÁTICO', amount:11.19, status:'paid' },
 { suffix:'pix', group:'LAZER', method:'PIX', amount:13.48, status:'paid' },
 { suffix:'bill', group:'MOTO', method:'BOLETO', amount:23.67, status:'planned' },
] as const;

async function main() {
 try {
  const user = await prisma.user.create({ data: {
   name:'Titular ficticio compatibilidade',email:tag+'@example.invalid',
   passwordHash:await bcrypt.hash(password,10),role:UserRole.ADMIN,
   status:UserStatus.ACTIVE,isActive:true,approvedAt:new Date(),
  } });
  ownerId = user.id;
  const account = await prisma.account.create({ data: {
   userId:user.id, name:'Conta ficticia',type:'checking',openingBalance:1000,
  } });
  const cats = new Map<string,string>();
  for (const group of ['TITULOS/PREVIDÊNCIA','LAZER','MOTO']) {
   const c = await prisma.category.create({ data: {
    userId:user.id,name:group,group:'CONTAS GERAIS',type:'expense',
   } });
   cats.set(group,c.id);
  }
  const payments = new Map<string,string>();
  for (const method of ['DÉBITO AUTOMÁTICO','PIX','BOLETO']) {
   const m = await prisma.paymentMethod.create({ data: {
    userId:user.id,name:method,type:method==='BOLETO'?'bill':method==='PIX'?'instant':'debit',
   } });
   payments.set(method,m.id);
  }
  const lines: LegacyLine[] = fixtureDefinition.map((def,i) => ({
   id:tag+'-legacy-'+def.suffix, type:'expense',date:'2026-06-'+String(i+1).padStart(2,'0'),
   description:'Operacao ficticia '+def.suffix, amount:def.amount,status:def.status,
   financialAccountId:account.id,category:def.group,expenseClass:'CONTAS GERAIS',
   paymentMethod:def.method,financialScope:'monetary',modality:'à vista',
   frequency:'ONE_OFF',amountBehavior:'VARIABLE',necessity:'REVIEW',
  }));
  const plan = await prisma.plan.create({ data: {
   code:tag,name:'Plano QA ficticio',monthlyPrice:0,maxMembers:2,features:[],
  } });
  planId=plan.id;
  const workspace = await prisma.workspace.create({ data: {
   name:'Workspace QA tres padroes',slug:tag,ownerId:user.id,
   members:{create:{userId:user.id,role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true}},
   appState:{create:{userId:user.id,revision:1,
    state:{transactions:lines,budgets:{},__megNormalization:{mode:'normalized-primary'}} as Prisma.InputJsonValue}},
   subscription:{create:{planId:plan.id,status:LicenseStatus.ACTIVE}},
  } });
  workspaceId=workspace.id;
  const projection=buildNormalizationPreview({transactions:lines},{
   workspaceId:workspace.id,userId:user.id,revision:1,
  });
  assert.equal(projection.events.length,3);
  for (const event of projection.events) {
   await prisma.financialEvent.create({data:{
    ...event,sourcePayload:event.sourcePayload as Prisma.InputJsonValue,
    // SQL migration has not yet been applied: both FKs are missing.
    categoryId:null,paymentMethodId:null,
   }});
  }
  assert.equal((await normalizationPreview(workspace.id,user.id)).reconciled,true);
  app=fastify();
  await registerAuth(app);
  await app.register(authRoutes,{prefix:'/auth'});
  await app.register(appStateRoutes,{prefix:'/app-state'});
  await app.register(financeRoutes,{prefix:'/finance'});
  await app.ready();
  const login=await app.inject({method:'POST',url:'/auth/login',
   payload:{email:user.email,password}});
  assert.equal(login.statusCode,200,login.body);
  const token=(JSON.parse(login.body) as {accessToken:string}).accessToken;
  assert.ok(token);
  const get=(endpoint:string)=>app!.inject({
   method:'GET',url:endpoint,headers:{authorization:'Bearer '+token},
  });
  const unauthorized=await app.inject({method:'GET',url:'/app-state'});
  assert.equal(unauthorized.statusCode,401);

  const readBoth=async()=>{
   const [web,android]=await Promise.all([
    get('/finance/events/history-snapshot'),get('/app-state'),
   ]);
   assert.equal(web.statusCode,200,web.body);
   assert.equal(android.statusCode,200,android.body);
   const webDto=JSON.parse(web.body) as {kind:string,items:any[],total:number};
   const androidDto=JSON.parse(android.body) as {dataSource:string,state:{transactions:LegacyLine[]},revision:number};
   assert.equal(webDto.kind,'complete');
   assert.equal(webDto.total,3);
   assert.equal(androidDto.dataSource,'normalized',android.body);
   assert.equal(androidDto.revision,1);
   assert.equal(androidDto.state.transactions.length,3);
   for(const line of lines) {
    const a=androidDto.state.transactions.find(x=>x.id===line.id);
    const w=webDto.items.find(x=>x.legacyTransactionId===line.id);
    assert.ok(a && w,'mesmo ID legado nos dois endpoints');
    assert.equal(w.description,a.description);
    assert.equal(Number(w.amount),Number(a.amount));
    assert.equal(w.type,a.type);
    assert.equal(w.status,a.status);
    assert.equal(w.date.slice(0,10),a.date);
    assert.equal(w.accountId,a.financialAccountId);
    assert.equal(w.sourcePayload.category,a.category);
    assert.equal(w.sourcePayload.expenseClass,a.expenseClass);
    assert.equal(w.sourcePayload.paymentMethod,a.paymentMethod);
   }
   return {webDto,androidDto};
  };
  const before = await readBoth();
  const beforeRows=await prisma.financialEvent.findMany({
   where:{workspaceId:workspace.id},orderBy:{id:'asc'},
  });
  const beforeIds=beforeRows.map(e=>e.id);
  const beforeCents=beforeRows.map(e=>Math.round(Number(e.signedAmount)*100));
  const beforeLedger=await prisma.ledgerEntry.count({where:{event:{workspaceId:workspace.id}}});
  const beforeBalance=await prisma.$transaction(async tx=>({
   account:await monetaryAccountBalanceAt(tx,user.id,account,'2026-06-30'),
   global:await monetaryBalanceAt(tx,user.id,'2026-06-30'),
  }));
  const mapped=await prisma.$queryRawUnsafe<MapRow[]>(manifest);
  const candidates=mapped.filter(r=>beforeIds.includes(r.event_id));
  assert.equal(candidates.length,3);
  assert.equal(new Set(candidates.map(r=>r.event_id)).size,3);
  for(const c of candidates) {
   assert.equal(c.grupo_financeiro,'DESPESA_COMUM');
   assert.equal(c.confianca,'ALTA_PARA_REVISAO');
   assert.equal(c.escrita_autorizada,false);
   assert.ok(c.category_proposed_id && c.payment_proposed_id);
   assert.equal(c.evidencia.includes('CAT_UNICA_NOME_GRUPO_TIPO'),true);
  }
  const reviews=await readStage10HistoricalReview(workspace.id);
  assert.equal(reviews.length,3);
  assert.ok(reviews.every(r=>r.classification==='eligible_for_explicit_review'));
  console.log('MEG_STAGE10_PARITY_QA_THREE_SOURCE_PATTERNS=PASS');

  // First attempt MUST roll back fully (only the disposable PG17 transaction).
  await assert.rejects(prisma.$transaction(async tx=>{
   for(const c of candidates) {
    const baseline=beforeRows.find(e=>e.id===c.event_id)!;
    const update=await tx.financialEvent.updateMany({where:{
     id:c.event_id,workspaceId:workspace.id,userId:user.id,archivedAt:null,
     categoryId:null,paymentMethodId:null,updatedAt:baseline.updatedAt,
    },data:{categoryId:c.category_proposed_id,paymentMethodId:c.payment_proposed_id}});
    assert.equal(update.count,1);
   }
   throw new Error('INTENTIONAL_QA_ROLLBACK');
  }),(e:unknown)=>e instanceof Error && e.message==='INTENTIONAL_QA_ROLLBACK');
  assert.equal((await prisma.financialEvent.count({where:{
   workspaceId:workspace.id,categoryId:null,paymentMethodId:null,
  }})),3);
  assert.equal((await normalizationPreview(workspace.id,user.id)).reconciled,true);
  console.log('MEG_STAGE10_PARITY_QA_BATCH_ROLLBACK=PASS');

  // Apply exact same proposed FKs in disposable PG17 and prove a second replay is noop.
  await prisma.$transaction(async tx=>{
   for(const c of candidates) {
    const baseline=beforeRows.find(e=>e.id===c.event_id)!;
    const updated=await tx.financialEvent.updateMany({where:{
     id:c.event_id,workspaceId:workspace.id,userId:user.id,archivedAt:null,
     categoryId:null,paymentMethodId:null,updatedAt:baseline.updatedAt,
    },data:{categoryId:c.category_proposed_id,paymentMethodId:c.payment_proposed_id}});
    assert.equal(updated.count,1);
   }
  });
  await prisma.$transaction(async tx=>{
   for(const c of candidates) {
    const repeated=await tx.financialEvent.updateMany({where:{
     id:c.event_id,workspaceId:workspace.id,userId:user.id,archivedAt:null,
     categoryId:null,paymentMethodId:null,
    },data:{categoryId:c.category_proposed_id,paymentMethodId:c.payment_proposed_id}});
    assert.equal(repeated.count,0);
   }
  });
  const afterRows=await prisma.financialEvent.findMany({
   where:{workspaceId:workspace.id},orderBy:{id:'asc'},
  });
  assert.deepEqual(afterRows.map(e=>e.id),beforeIds);
  assert.deepEqual(afterRows.map(e=>Math.round(Number(e.signedAmount)*100)),beforeCents);
  assert.deepEqual(afterRows.map(e=>e.legacyTransactionId),beforeRows.map(e=>e.legacyTransactionId));
  assert.deepEqual(afterRows.map(e=>e.status),beforeRows.map(e=>e.status));
  assert.deepEqual(afterRows.map(e=>e.date.toISOString()),beforeRows.map(e=>e.date.toISOString()));
  assert.equal(await prisma.ledgerEntry.count({where:{event:{workspaceId:workspace.id}}}),beforeLedger);
  const afterBalance=await prisma.$transaction(async tx=>({
   account:await monetaryAccountBalanceAt(tx,user.id,account,'2026-06-30'),
   global:await monetaryBalanceAt(tx,user.id,'2026-06-30'),
  }));
  assert.deepEqual(afterBalance,beforeBalance,'salda e patrimonio monetario canonicamente iguais');
  assert.equal((await normalizationPreview(workspace.id,user.id)).reconciled,true);
  console.log('MEG_STAGE10_PARITY_QA_IDS_AMOUNTS_BALANCES_LEDGER=PASS');

  const after=await readBoth();
  for(const entry of after.webDto.items) {
   const original=before.webDto.items.find(e=>e.id===entry.id);
   assert.ok(original);
   assert.equal(original.categoryId,null);
   assert.equal(original.paymentMethodId,null);
   assert.equal(entry.categoryId,cats.get(entry.sourcePayload.category));
   assert.equal(entry.paymentMethodId,payments.get(entry.sourcePayload.paymentMethod));
   assert.equal(entry.category.name,entry.sourcePayload.category);
   assert.equal(entry.category.group,entry.sourcePayload.expenseClass);
   assert.equal(entry.paymentMethod.name,entry.sourcePayload.paymentMethod);
  }
  assert.deepEqual(after.androidDto.state.transactions,before.androidDto.state.transactions);
  assert.equal((await prisma.appState.findUniqueOrThrow({where:{workspaceId:workspace.id}})).revision,1);
  console.log('MEG_STAGE10_PARITY_QA_WEB_HISTORY_ANDROID_APPSTATE_CONTRACT=PASS');
  console.log('MEG_STAGE10_PARITY_QA_NO_ANDROID_BINARY_EXECUTION=NOT_TESTED');
 } finally {
  if(app)await app.close();
  if(workspaceId) {
   await prisma.ledgerEntry.deleteMany({where:{event:{workspaceId}}});
   await prisma.workspace.delete({where:{id:workspaceId}});
  }
  if(planId)await prisma.plan.delete({where:{id:planId}});
  if(ownerId)await prisma.user.delete({where:{id:ownerId}});
  await prisma.$disconnect();
 }
}
main().catch(error=>{console.error('MEG_STAGE10_PARITY_QA_FAILED',error);process.exitCode=1;});
