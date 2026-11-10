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
  getCanonicalFilteredHistorySummary,
} from '../apps/api/src/modules/finance/service';
import {getActiveFinancialHistoryRevision} from '../apps/api/src/modules/finance/history-revision';

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
 // Replica apenas a DISTRIBUICAO estrutural previamente auditada do legado:
 // 3.626 registros sem categoryId, 3.512 sem paymentMethodId, de 3.731 ativos.
 // Nenhuma linha, descricao ou valor financeiro de producao e utilizado.
 const historicCategoryCount=3626;
 const historicMethodCount=3512;
 const row=(i:number)=>{
  const historicCategory=i>=1&&i<=historicCategoryCount;
  const historicMethod=i>=1&&i<=historicMethodCount;
  return {
   id:id(i),userId,description:'Lançamento sintético '+String(i),
   type:'expense',status:'planned',date:day,competence:'2026-11',
   amount:'7.35',signedAmount:'-7.35',createdAt,accountId:account.id,
   categoryId:historicCategory?null:category.id,
   paymentMethodId:historicMethod?null:method.id,
   ...(i===0||historicCategory||historicMethod?{
    sourcePayload:{
     category:'Categoria original CI',paymentMethod:'PIX CI',
     'DIA SEMANA':'QUINTA','CLASSIFICACAO DA DESPESA':'LEGADO CI',
    }
   }:{}),
  };
 };
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
 assert.equal(result.items.filter(item=>!item.categoryId).length,historicCategoryCount,
  'Distribuicao historica de categoria nao vinculada.');
 assert.equal(result.items.filter(item=>!item.paymentMethodId).length,historicMethodCount,
  'Distribuicao historica de forma de pagamento nao vinculada.');
 assert.equal(result.items[1]?.sourcePayload?.category,'Categoria original CI');
 assert.equal(result.items[1]?.sourcePayload?.paymentMethod,'PIX CI');
 const bytes=Buffer.byteLength(JSON.stringify(result));
 assert.ok(bytes<24*1024*1024,'Payload sintético excessivo para uma única consulta.');
 const after=await prisma.financialEvent.count({where:{userId,archivedAt:null}});
 assert.equal(after,3731,'Leitura nunca altera o número de lançamentos.');

 // Versao de leitura: o PATCH legado pode atualizar um evento SEM receipt.
 // Testes usam somente PostgreSQL efemero do CI, nunca o banco real.
 // Medicao descritiva: serve para estimar custo da leitura, NAO e SLA de producao.
 const revisionStart=performance.now();
 const revision0=await getActiveFinancialHistoryRevision(userId);
 const revision3731ms=Math.round((performance.now()-revisionStart)*100)/100;
 console.log('Token de leitura CI: 3.731 ativos em '+revision3731ms+' ms (dados sinteticos; sem SLA de producao).');
 await prisma.financialEvent.update({
  where:{id:id(42)},data:{description:'Lançamento alterado sem recibo CI'},
 });
 const revision1=await getActiveFinancialHistoryRevision(userId);
 assert.notEqual(revision1,revision0,'Edição de evento sem CloudMutationReceipt precisa invalidar o token.');
 await prisma.financialEvent.update({
  where:{id:'stage09-ci-other-event'},data:{description:'Outro usuário alterou registro'},
 });
 assert.equal(await getActiveFinancialHistoryRevision(userId),revision1,
  'Edição de outro titular não pode invalidar o token do proprietário.');
 await prisma.importedRow.update({
  where:{eventId:id(0)},data:{rawData:{DIASEMANA:'SEXTA',OBSERVACOES:'Mudança na importação'}},
 });
 const revision2=await getActiveFinancialHistoryRevision(userId);
 assert.notEqual(revision2,revision1,'Importação vinculada ao snapshot deve invalidar o token.');
 await prisma.financialEvent.update({
  where:{id:'stage09-ci-archived'},data:{archivedAt:null},
 });
 const revision3=await getActiveFinancialHistoryRevision(userId);
 assert.notEqual(revision3,revision2,'Desarquivar altera o conjunto ativo.');
 await prisma.financialEvent.update({
  where:{id:'stage09-ci-archived'},data:{archivedAt:day},
 });
 assert.equal(await getActiveFinancialHistoryRevision(userId),revision2,
  'Arquivar novamente restaura a assinatura do conjunto ativo sem incluir arquivados.');
 assert.equal(await prisma.financialEvent.count({where:{userId,archivedAt:null}}),3731);
 console.log('Revisão de histórico: edição, importação e arquivamento detectados por leitura sem writers.');
 console.log('Snapshot CI: 3.731 eventos em '+timeMs+' ms; '+bytes+' bytes JSON sintéticos (não é desempenho de produção).');
 const filters={
  criteria:{search:'',kind:'all',category:'all',account:'all',paymentMethod:'all',start:'2026-11-01',end:'2026-11-30'},
  grid:{}
 };
 const canonical=await getCanonicalFilteredHistorySummary(userId,filters);
 assert.equal(canonical.kind,'complete');
 if(canonical.kind!=='complete')throw new Error('Resumo filtrado não foi calculado pelo servidor.');
 assert.equal(canonical.total,3731);
 assert.equal(canonical.filteredCount,3731);
 assert.equal(canonical.income,0);
 assert.equal(canonical.expense,27422.85);
 assert.equal(canonical.projectedResult,-27422.85);
 assert.equal(canonical.realizedResult,0);
 // Indicadores sobre filtros historicos devem selecionar os mesmos IDs
 // que a grade e continuar somando exclusivamente pela autoridade financeira.
 const onlyLegacyCategory=await getCanonicalFilteredHistorySummary(userId,{
  ...filters,criteria:{...filters.criteria,category:'legacy:Categoria original CI'},
 });
 assert.equal(onlyLegacyCategory.kind,'complete');
 if(onlyLegacyCategory.kind==='complete'){
  assert.equal(onlyLegacyCategory.filteredCount,historicCategoryCount);
  assert.equal(onlyLegacyCategory.expense,Math.round(historicCategoryCount*735)/100);
 }
 const onlyLegacyMethod=await getCanonicalFilteredHistorySummary(userId,{
  ...filters,criteria:{...filters.criteria,paymentMethod:'PIX CI'},
 });
 assert.equal(onlyLegacyMethod.kind,'complete');
 if(onlyLegacyMethod.kind==='complete'){
  // Inclui os registros modernos com metodo vinculado de mesmo nome.
  assert.equal(onlyLegacyMethod.filteredCount,3731);
 }
 const onlyLegacyLabel=await getCanonicalFilteredHistorySummary(userId,{
  ...filters,criteria:{...filters.criteria,search:'LEGADO CI'},
 });
 assert.equal(onlyLegacyLabel.kind,'complete');
 if(onlyLegacyLabel.kind==='complete'){
  assert.equal(onlyLegacyLabel.filteredCount,historicCategoryCount);
 }
 console.log('Filtros historicos: 3.626 categorias e 3.512 metodos legados sinteticos validados.');
 const onlyPlanned=await getCanonicalFilteredHistorySummary(userId,{
  ...filters,grid:{statusLabel:{type:'enum',selected:['Planejado']}}
 });
 assert.equal(onlyPlanned.kind,'complete');
 if(onlyPlanned.kind==='complete')assert.equal(onlyPlanned.filteredCount,3731);
 const absent=await getCanonicalFilteredHistorySummary(userId,{
  ...filters,criteria:{...filters.criteria,kind:'income'}
 });
 assert.equal(absent.kind,'complete');
 if(absent.kind==='complete'){
  assert.equal(absent.filteredCount,0);
  assert.equal(absent.projectedResult,0);
 }
 console.log('Resumo filtrado canônico validado em 3.731 eventos, sem cálculo no frontend.');
 assert.equal(FINANCIAL_HISTORY_SNAPSHOT_LIMIT,5000);
 for(let start=3731;start<5001;start+=300){
  const count=Math.min(300,5001-start);
  await prisma.financialEvent.createMany({
   data:Array.from({length:count},(_,i)=>row(start+i)),
  });
 }
 // Mesmo acima do limite de snapshot, o pulso deve sinalizar alteracao;
 // nao consultar historico integral nem expor dados privados.
 const revisionLargeStart=performance.now();
 const revision5001=await getActiveFinancialHistoryRevision(userId);
 const revision5001ms=Math.round((performance.now()-revisionLargeStart)*100)/100;
 assert.match(revision5001,/^history-v1:5001:[a-f0-9]{32}$/);
 assert.equal(await getActiveFinancialHistoryRevision(userId),revision5001,
  'Duas leituras sem mutacao devem produzir o mesmo token.');
 console.log('Token de leitura CI: 5.001 ativos em '+revision5001ms+' ms (dados sinteticos; sem SLA de producao).');

 const filteredLimit=await getCanonicalFilteredHistorySummary(userId,filters);
 assert.deepEqual(filteredLimit,{
  kind:'limit-exceeded',protocol:'financial-filter-summary-v1',total:5001,limit:5000
 });
 const exceeded=await getFinancialHistorySnapshot(userId);
 assert.deepEqual(exceeded,{
  kind:'limit-exceeded',protocol:'financial-history-v1',
  total:5001,limit:5000,
 });
 console.log('Snapshot CI: limite de 5.000 eventos e isolamento por usuário confirmados.');
}finally{
 await prisma.$disconnect();
}
