import assert from 'node:assert/strict';
import {Prisma,UserRole,UserStatus,prisma} from '@meg/database';
import {updateFinancialEventsBulkProtected} from './event-bulk-mutation';
import {createCardPurchaseProtected} from '../cards/service';

/** E2E exclusivamente no PostgreSQL descartável do workflow Stage10. */
const url=new URL(process.env.DATABASE_URL||'http://invalid');
if(process.env.MEG_STAGE10_ISOLATED_PG!=='1'
 || !['localhost','127.0.0.1'].includes(url.hostname)
 || url.pathname!=='/meg_stage10_sandbox'){
 throw new Error('ISOLATED_POSTGRES_ONLY: sem execução contra bancos externos ou de produção');
}
function errorCode(e:unknown):string{
 if(e&&typeof e==='object'&&'code' in e)return String((e as {code:unknown}).code);
 if(e instanceof Error)return e.message;
 return String(e);
}
async function main(){
 const stamp='stage10-'+Date.now()+'-'+Math.random().toString(36).slice(2);
 const user=await prisma.user.create({data:{
  name:'Stage10 CI Isolado',email:stamp+'@meg.test',passwordHash:'ci-only',
  role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true,approvedAt:new Date(),
 }});
 const workspace=await prisma.workspace.create({data:{
  name:'Stage10 CI Postgres Descartável',slug:stamp,ownerId:user.id,
  members:{create:{userId:user.id,role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true}},
  appState:{create:{userId:user.id,state:{transactions:[],budgets:{}} as Prisma.InputJsonValue,revision:1}},
 }});
 const date=new Date('2026-11-14T12:00:00.000Z');
 const newEvent=(description:string)=>prisma.financialEvent.create({data:{
  userId:user.id,workspaceId:workspace.id,description,type:'expense',status:'planned',
  date,competence:'2026-11',amount:12,signedAmount:-12,
 }});
 const [a,b,linked]=await Promise.all([newEvent('Despesa A'),newEvent('Despesa B'),newEvent('Vínculo protegido')]);
 const payable=await prisma.payable.create({data:{
  userId:user.id,description:'Obrigação vinculada',totalAmount:12,openAmount:0,
  dueDate:date,status:'paid',
 }});
 await prisma.payablePayment.create({data:{
  payableId:payable.id,amount:12,paidAt:date,financialEventId:linked.id,
 }});
 const expectedUpdatedAtById={[a.id]:a.updatedAt.toISOString(),[b.id]:b.updatedAt.toISOString()};
 const operationId='stage10-bulk-success-'+stamp;
 const command={ids:[a.id,b.id],changes:{notes:'LOTE QA ISOLADO'},expectedUpdatedAtById,operationId};
 const first=await updateFinancialEventsBulkProtected(user.id,command) as {updated:number;idempotentReplay:boolean};
 assert.equal(first.updated,2);
 assert.equal(first.idempotentReplay,false);
 const rows=await prisma.financialEvent.findMany({where:{id:{in:[a.id,b.id]}}});
 assert.equal(rows.length,2);
 assert.ok(rows.every(r=>r.notes==='LOTE QA ISOLADO'));
 let audits=await prisma.auditLog.count({where:{userId:user.id,action:'FINANCIAL_EVENT_UPDATED',entityId:{in:[a.id,b.id]}}});
 assert.equal(audits,2,'auditoria por registro após commit');
 let receipts=await prisma.cloudMutationReceipt.count({where:{workspaceId:workspace.id,operationId}});
 assert.equal(receipts,1,'um recibo idempotente para o lote');
 const replay=await updateFinancialEventsBulkProtected(user.id,command) as {idempotentReplay:boolean};
 assert.equal(replay.idempotentReplay,true);
 assert.equal(await prisma.auditLog.count({where:{userId:user.id,action:'FINANCIAL_EVENT_UPDATED',entityId:{in:[a.id,b.id]}}}),audits);
 assert.equal(await prisma.cloudMutationReceipt.count({where:{workspaceId:workspace.id,operationId}}),1);
 await assert.rejects(
  ()=>updateFinancialEventsBulkProtected(user.id,{...command,changes:{notes:'MUDANÇA DIVERGENTE'}}),
  error=>errorCode(error).includes('OPERATION_ID_REUSED'),
 );
 const now=await prisma.financialEvent.findMany({where:{id:{in:[a.id,b.id]}}});
 assert.ok(now.every(r=>r.notes==='LOTE QA ISOLADO'));
 await assert.rejects(
  ()=>updateFinancialEventsBulkProtected(user.id,{...command,operationId:'stage10-stale-'+stamp,changes:{description:'INDEVIDO'}}),
  error=>errorCode(error).includes('FINANCIAL_EVENT_STALE_VERSION'),
 );
 await assert.rejects(
  ()=>updateFinancialEventsBulkProtected(user.id,{ids:[a.id,linked.id],changes:{notes:'NÃO GRAVAR'},operationId:'stage10-linked-'+stamp}),
  error=>errorCode(error).includes('FINANCIAL_EVENT_LINKED_DOMAIN'),
 );
 assert.equal((await prisma.financialEvent.findUniqueOrThrow({where:{id:a.id}})).notes,'LOTE QA ISOLADO','rollback de lote misto');
 assert.equal((await prisma.financialEvent.findUniqueOrThrow({where:{id:linked.id}})).notes,null,'registro vinculado não editado');
 assert.equal(await prisma.cloudMutationReceipt.count({where:{workspaceId:workspace.id}}),1,'falhas não deixam recibo');
 assert.equal(await prisma.auditLog.count({where:{userId:user.id,action:'FINANCIAL_EVENT_UPDATED'}}),2,'falhas não deixam auditoria');
 await assert.rejects(
  ()=>updateFinancialEventsBulkProtected(user.id,{ids:[a.id,'id-inexistente'],changes:{notes:'SEM PARCIAL'},operationId:'stage10-missing-'+stamp}),
  error=>errorCode(error).includes('FINANCIAL_EVENT_NOT_FOUND'),
 );
 assert.equal((await prisma.financialEvent.findUniqueOrThrow({where:{id:a.id}})).notes,'LOTE QA ISOLADO');
 
 // Concorrência real: versões iguais, requests distintos. Apenas um pode gravar.
 const updated=await prisma.financialEvent.findUniqueOrThrow({where:{id:a.id}});
 const sameVersion={[a.id]:updated.updatedAt.toISOString()};
 const outcomes=await Promise.allSettled([
  updateFinancialEventsBulkProtected(user.id,{ids:[a.id],changes:{notes:'CONCORRENTE A'},expectedUpdatedAtById:sameVersion,operationId:'stage10-race-a-'+stamp}),
  updateFinancialEventsBulkProtected(user.id,{ids:[a.id],changes:{notes:'CONCORRENTE B'},expectedUpdatedAtById:sameVersion,operationId:'stage10-race-b-'+stamp}),
 ]);
 const winners=outcomes.filter(x=>x.status==='fulfilled');
 const losers=outcomes.filter(x=>x.status==='rejected');
 assert.equal(winners.length,1,'uma operação serializável deve vencer o conflito de versão');
 assert.equal(losers.length,1,'a segunda deve ser rejeitada');
 assert.match((await prisma.financialEvent.findUniqueOrThrow({where:{id:a.id}})).notes||'',/^CONCORRENTE [AB]$/);
 receipts=await prisma.cloudMutationReceipt.count({where:{workspaceId:workspace.id}});
 assert.equal(receipts,2,'somente lote válido e um concorrente recebem recibo');
 audits=await prisma.auditLog.count({where:{userId:user.id,action:'FINANCIAL_EVENT_UPDATED'}});
 assert.equal(audits,3,'somente alterações confirmadas geram auditoria');
 // Regressão da autoridade de criação de cartão, no mesmo banco descartável.
 const card=await prisma.creditCard.create({data:{
  userId:user.id,name:'Cartão QA Stage10',creditLimit:3000,closingDay:25,dueDay:5,isActive:true,
 }});
 const cardOp='stage10-card-create-'+stamp;
 const cardCommand={cardId:card.id,description:'Compra parcelada QA',totalAmount:100,
  purchaseDate:'2026-11-26',installments:3,operationId:cardOp};
 const created=await createCardPurchaseProtected(user.id,cardCommand) as {id:string};
 const purchase=await prisma.cardPurchase.findUniqueOrThrow({where:{id:created.id},include:{entries:true}});
 const entries=[...purchase.entries].sort((left,right)=>left.number-right.number);
 assert.deepEqual(entries.map(x=>x.statementMonth),['2026-12','2027-01','2027-02'],
  'Compra continua respeitando competência pós-fechamento e virada anual');
 assert.deepEqual(entries.map(x=>Number(x.amount)),[33.34,33.33,33.33],
  'Parcelamento preserva centavos do writer original');
 assert.equal(entries.reduce((sum,x)=>sum+Math.round(Number(x.amount)*100),0),10000);
 assert.equal(await prisma.cloudMutationReceipt.count({where:{workspaceId:workspace.id,operationId:cardOp}}),1);
 const cardAudit=await prisma.auditLog.findFirstOrThrow({where:{
  userId:user.id,action:'CARD_PURCHASE_CREATED',entityId:created.id,
 }});
 const auditPayload=JSON.parse(cardAudit.metadata||'{}') as {context?:{firstStatementMonth?:string}};
 assert.equal(auditPayload.context?.firstStatementMonth,'2026-12','metadado histórico de auditoria preservado');
 const replayCard=await createCardPurchaseProtected(user.id,cardCommand) as {id:string};
 assert.equal(replayCard.id,created.id);
 assert.equal(await prisma.cardPurchase.count({where:{userId:user.id,cardId:card.id}}),1,
  'Reexecução idempotente não duplica a compra');
 console.log('MEG_STAGE10_ISOLATED_CARD_CREATE_CYCLE_CENTS_AUDIT PASS');
 console.log('MEG_STAGE10_ISOLATED_POSTGRES_ATOMICITY_IDEMPOTENCE_AUDIT PASS');
}
main().catch(e=>{console.error('MEG_STAGE10_ISOLATED_POSTGRES FAIL',e);process.exitCode=1;})
 .finally(async()=>{await prisma.$disconnect();});
