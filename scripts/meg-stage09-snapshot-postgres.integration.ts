/**
 * Ensaio transacional da Etapa 09: SOMENTE PostgreSQL descartável no CI.
 * Não executar contra banco existente nem exportar dados reais.
 */
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {prisma} from '@meg/database';
import {
  FINANCIAL_HISTORY_SNAPSHOT_LIMIT,
  getFinancialHistorySnapshot,
} from '../apps/api/src/modules/finance/service';

const url=process.env.DATABASE_URL||'';
if(!/\bmeg_stage09_ci\b/.test(url)||!/(?:localhost|127\.0\.0\.1):5432/.test(url)){
 throw new Error('STAGE09_CI_DATABASE_REQUIRED: somente banco local efêmero meg_stage09_ci.');
}
const day=new Date('2026-11-05T00:00:00.000Z');
const createdAt=new Date('2026-11-04T10:00:00.000Z');
const userId='stage09-ci-owner';
const externalUserId='stage09-ci-other';
const id=(i:number)=>'stage09-ci-event-'+String(i).padStart(6,'0');
try{
 const owner=await prisma.user.create({
  data:{id:userId,name:'Conta sintética CI',email:'stage09-owner@test.invalid'},
 });
 await prisma.user.create({
  data:{id:externalUserId,name:'Outra conta sintética',email:'stage09-other@test.invalid'},
 });
 const [account,category,method]=await Promise.all([
  prisma.account.create({data:{userId:owner.id,name:'Conta CI',type:'checking',openingBalance:'0.00'}}),
  prisma.category.create({data:{userId:owner.id,name:'Categoria CI',type:'expense'}}),
  prisma.paymentMethod.create({data:{userId:owner.id,name:'PIX CI',type:'instant'}}),
 ]);
 const row=(i:number)=>({
  id:id(i),userId,description:'Lançamento sintético '+String(i),
  type:'expense',status:'planned',date:day,competence:'2026-11',
  amount:'7.35',signedAmount:'-7.35',createdAt,accountId:account.id,
  categoryId:category.id,paymentMethodId:method.id,
  ...(i===0?{sourcePayload:{category:'Categoria original CI'}}:{}),
 });
 // Grava SOMENTE no banco descartável iniciado pelo serviço do GitHub Actions.
 for(let start=0;start<3731;start+=300){
  const count=Math.min(300,3731-start);
  await prisma.financialEvent.createMany({
   data:Array.from({length:count},(_,i)=>row(start+i)),
  });
 }
 await prisma.financialEvent.create({data:{...row(3731),id:'stage09-ci-archived',archivedAt:day}});
 await prisma.financialEvent.create({
  data:{...row(3732),id:'stage09-ci-other-event',userId:externalUserId},
 });
 const batch=await prisma.importBatch.create({
  data:{userId,fileName:'somente-ci.csv',fileHash:'stage09-ci-file',rowCount:1},
 });
 await prisma.importedRow.create({
  data:{batchId:batch.id,rowNumber:1,eventId:id(0),status:'imported',
   rawData:{DIASEMANA:'QUINTA',TPLANCAMENTO:'DESPESA',
    CLASSIFICAODADESPESA:'FIXO',OBSERVACOES:'IMPORTAÇÃO DE TESTE'}},
 });
 const start=performance.now();
 const result=await getFinancialHistorySnapshot(userId);
 const timeMs=Math.round(performance.now()-start);
 assert.equal(result.kind,'complete');
 if(result.kind!=='complete')throw new Error('Snapshot do teste inesperadamente limitado.');
 assert.equal(result.consistency,'repeatable-read');
 assert.equal(result.items.length,3731);
 assert.equal(result.total,3731);
 assert.equal(new Set(result.items.map(x=>x.id)).size,3731);
 assert.equal(result.items[0]?.id,id(0),'Ordenação deve desempatar por ID.');
 assert.equal(result.items.at(-1)?.id,id(3730));
 assert.ok(result.items.every(x=>x.userId===userId&&!x.archivedAt));
 assert.equal(result.items[0]?.amount.toString(),'7.35');
 assert.equal(result.items[0]?.signedAmount.toString(),'-7.35');
 assert.equal(result.items[0]?.sourceDetails?.weekday,'QUINTA');
 assert.equal(result.items[0]?.sourceDetails?.observations,'IMPORTAÇÃO DE TESTE');
 assert.equal(result.items[0]?.account?.name,'Conta CI');
 assert.equal(result.items[0]?.category?.name,'Categoria CI');
 assert.equal(result.items[0]?.paymentMethod?.name,'PIX CI');
 const bytes=Buffer.byteLength(JSON.stringify(result));
 assert.ok(bytes<24*1024*1024,'Payload sintético excessivo para uma única consulta.');
 const after=await prisma.financialEvent.count({where:{userId,archivedAt:null}});
 assert.equal(after,3731,'Leitura nunca altera o número de lançamentos.');
 console.log('Snapshot CI: 3.731 eventos em '+timeMs+' ms; '+bytes+' bytes JSON sintéticos (não é desempenho de produção).');
 assert.equal(FINANCIAL_HISTORY_SNAPSHOT_LIMIT,5000);
 for(let start=3731;start<5001;start+=300){
  const count=Math.min(300,5001-start);
  await prisma.financialEvent.createMany({
   data:Array.from({length:count},(_,i)=>row(start+i)),
  });
 }
 const exceeded=await getFinancialHistorySnapshot(userId);
 assert.deepEqual(exceeded,{
  kind:'limit-exceeded',protocol:'financial-history-v1',
  total:5001,limit:5000,
 });
 console.log('Snapshot CI: limite de 5.000 eventos e isolamento por usuário confirmados.');
}finally{
 await prisma.$disconnect();
}
