/**
 * PT88 browser + HTTP QA sintético. IMPORTANTE:
 * Executar somente com PG17 efêmero em 127.0.0.1:55459,
 * banco meg_stage10_sandbox, usuário meg_stage10_ci.
 * Intencionalmente NÃO importa server.ts: sem rotinas de startup/cron.
 */
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import fastify from 'fastify';
import cors from '@fastify/cors';
import bcrypt from 'bcryptjs';
import {LicenseStatus,Prisma,UserRole,UserStatus,prisma} from '@meg/database';
import {registerAuth} from './plugins/auth';
import {authRoutes} from './modules/auth/routes';
import {financeRoutes} from './modules/finance/routes';
import {financeBulkMutationRoutes} from './modules/finance/event-bulk-routes';
import {financeCommitmentForecastRoutes} from './modules/finance/commitment-forecast-routes';
import {financeBenefitEventRoutes} from './modules/finance/benefit-event-routes';
import {cardRoutes} from './modules/cards/routes';
import {cardManagementRoutes} from './modules/cards/management-routes';
import {cardStatementLifecycleRoutes} from './modules/cards/statement-lifecycle-routes';
import {cardStatementReopenRoutes} from './modules/cards/statement-reopen-routes';
import {payableRoutes} from './modules/payables/routes';
import {receivableRoutes} from './modules/receivables/routes';
import {appStateRoutes} from './modules/app-state/routes';

const uri=new URL(process.env.DATABASE_URL || 'http://missing');
assert.equal(uri.protocol,'postgresql:');
assert.equal(uri.hostname,'127.0.0.1');
assert.equal(uri.port,'55459');
assert.equal(uri.pathname,'/meg_stage10_sandbox');
assert.equal(uri.username,'meg_stage10_ci');
assert.equal(process.env.MEG_STAGE10_WEB_WRITE_QA,'1');
assert.equal(process.env.MEG_STAGE10_ISOLATED_PG,'1');
assert.equal(process.env.NODE_ENV,'test');
assert.equal(process.env.HOST,'127.0.0.1');
assert.equal(process.env.PORT,'53393');
assert.match(process.env.SYNTHETIC_EMAIL||'',/\@example\.invalid$/);
assert.ok((process.env.JWT_SECRET||'').length>=40);
const user=await prisma.user.create({data:{
  name:'Titular fictício PT88',
  email:process.env.SYNTHETIC_EMAIL!,
  passwordHash:await bcrypt.hash(process.env.SYNTHETIC_PASSWORD!,10),
  role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true,approvedAt:new Date(),
}});
const plan=await prisma.plan.create({data:{
  code:'PT88-'+randomUUID(),name:'Plano sintético PT88',monthlyPrice:0,maxMembers:2,features:[],
}});
const workspace=await prisma.workspace.create({data:{
  ownerId:user.id,name:'PT88 Sandbox',slug:'pt88-'+randomUUID(),
  members:{create:{userId:user.id,role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true}},
  appState:{create:{userId:user.id,revision:1,state:{
    transactions:[],budgets:{},__megNormalization:{mode:'normalized-primary'},
  } as Prisma.InputJsonValue}},
  subscription:{create:{planId:plan.id,status:LicenseStatus.ACTIVE}},
}});
await prisma.account.create({data:{
  userId:user.id,name:'Conta fictícia PT88',type:'checking',openingBalance:900,
}});
await prisma.category.create({data:{
  userId:user.id,name:'Categoria sintética PT88',group:'CONTAS GERAIS',type:'expense',
}});
await prisma.paymentMethod.create({data:{
  userId:user.id,name:'PIX sintético PT88',type:'instant',
}});
const app=fastify({logger:false});
await app.register(cors,{origin:['http://127.0.0.1:53847'],credentials:true});
await registerAuth(app);
app.get('/health',async()=>({status:'ok',dataRepair:{status:'completed',scanned:0,repaired:0,issues:0},
  normalization:{status:'completed',primary:true,reconciled:true,count:0,reason:null}}));
app.get('/ready',async()=>{await prisma.$queryRawUnsafe('SELECT 1');return {status:'ready'};});
await app.register(authRoutes,{prefix:'/auth'});
await app.register(financeRoutes,{prefix:'/finance'});
await app.register(financeBulkMutationRoutes,{prefix:'/finance'});
await app.register(financeCommitmentForecastRoutes,{prefix:'/finance'});
await app.register(financeBenefitEventRoutes,{prefix:'/finance'});
await app.register(receivableRoutes,{prefix:'/receivables'});
await app.register(cardRoutes,{prefix:'/cards'});
await app.register(cardManagementRoutes,{prefix:'/cards-management'});
await app.register(cardStatementReopenRoutes,{prefix:'/cards'});
await app.register(cardStatementLifecycleRoutes,{prefix:'/cards'});
await app.register(payableRoutes,{prefix:'/payables'});
await app.register(appStateRoutes,{prefix:'/app-state'});
// A evidência não faz parte da API normal. Só existe neste runner fictício.
app.get('/__pt88/evidence',{preHandler:app.authorize(['ADMIN'])},async()=>{
  const events=await prisma.financialEvent.findMany({where:{
    workspaceId:workspace.id,description:{startsWith:'PT88'},
  },select:{id:true,legacyTransactionId:true}});
  const details=await Promise.all(events.map(async event=>({
    id:event.id,legacyTransactionId:event.legacyTransactionId,
    ledgerCount:await prisma.ledgerEntry.count({where:{eventId:event.id}}),
  })));
  return {eventCount:events.length,details};
});
const shutdown=async()=>{await app.close();await prisma.$disconnect();};
process.on('SIGTERM',()=>void shutdown().then(()=>process.exit(0)));
process.on('SIGINT',()=>void shutdown().then(()=>process.exit(0)));
await app.listen({port:53393,host:'127.0.0.1'});
console.log('PT88_REAL_HTTP_SYNTHETIC_API_READY=PASS');
