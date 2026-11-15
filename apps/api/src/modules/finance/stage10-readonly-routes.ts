import type {FastifyInstance} from 'fastify';
import {z} from 'zod';
import {getCanonicalFinancialSummary,getCanonicalFinancialCashflow} from './read-model';
import {withStage10ReadOnlySessionWorkspace} from './stage10-readonly-workspace';
import {stage10HistoricLabels} from './stage10-source-details';
import {enteredAmountFromStored} from './amount-sign';
import {cardPurchaseCyclePreview} from '../cards/purchase-cycle-canonical';

/**
 * Endpoint isolado da Etapa 10. SOMENTE GET e consulta em transação SQL
 * READ ONLY, inclusive a resolução de membership e a leitura dos dados.
 * Não calcular saldos ou faturas na camada de transporte.
 * Não é a autorização para os GETs legados; integração da Home depende
 * dos read models canônicos sob o mesmo contrato transacional.
 */
const HISTORY_LIMIT=5000;
const readRoles=['ADMIN','MANAGER','OPERATOR','VIEWER'] as const;
const monthSchema=z.object({month:z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)});
export function registerStage10ReadOnlyRoutes(app:FastifyInstance){
 app.get('/stage10-readonly/snapshot',{
  preHandler:app.authorize([...readRoles]),
 },async(request,reply)=>{
  const parsed=monthSchema.safeParse(request.query);
  if(!parsed.success)return reply.code(400).send({error:'INVALID_STAGE10_READ_MONTH'});
  reply.header('Cache-Control','private, no-store');
  return withStage10ReadOnlySessionWorkspace(request.user.sub,
   (request as typeof request & {stage10SessionId?:string}).stage10SessionId??'',
   (request as typeof request & {stage10WorkspaceId?:string}).stage10WorkspaceId??'',async(tx,scope)=>{
   const where={userId:scope.ownerId,workspaceId:scope.workspaceId,archivedAt:null};
   const total=await tx.financialEvent.count({where});
   // Os read models canonicos ainda agregam por userId. So podem ser
   // reutilizados quando ha exclusividade comprovada de workspace,
   // sem eventos ativos de outra base ou registros sem proprietario.
   const [ownerWorkspaceCount,foreignOwnerEvents,workspaceEventCount]=await Promise.all([
    tx.workspace.count({where:{ownerId:scope.ownerId,isActive:true}}),
    tx.financialEvent.count({where:{
     userId:scope.ownerId,archivedAt:null,
     OR:[{workspaceId:null},{workspaceId:{not:scope.workspaceId}}],
    }}),
    tx.financialEvent.count({where:{workspaceId:scope.workspaceId,archivedAt:null}}),
   ]);
   if(ownerWorkspaceCount!==1||foreignOwnerEvents!==0||workspaceEventCount!==total)
    throw new Error('STAGE10_WORKSPACE_FINANCIAL_SCOPE_NOT_EXCLUSIVE');
   if(total>HISTORY_LIMIT) return {
    kind:'stage10-financial-history-limit-v1' as const,
    canWrite:false as const,limit:HISTORY_LIMIT,total,
   };
   const [events,accounts,categories,paymentMethods,cards,summary,cashflow]=await Promise.all([
    tx.financialEvent.findMany({
     where,orderBy:[{date:'desc'},{createdAt:'desc'},{id:'asc'}],
     include:{importedRow:{select:{rowNumber:true,rawData:true}}},
    }),
    tx.account.findMany({where:{userId:scope.ownerId},
      orderBy:[{isActive:'desc'},{name:'asc'}]}),
    tx.category.findMany({where:{userId:scope.ownerId},
      orderBy:[{isActive:'desc'},{name:'asc'}]}),
    tx.paymentMethod.findMany({where:{userId:scope.ownerId},
      orderBy:[{isActive:'desc'},{name:'asc'}]}),
    tx.creditCard.findMany({where:{userId:scope.ownerId},
      select:{id:true,name:true,isActive:true,closingDay:true,dueDay:true},
      orderBy:[{isActive:'desc'},{name:'asc'}]}),
    getCanonicalFinancialSummary(scope.ownerId,parsed.data.month,tx),
    getCanonicalFinancialCashflow(scope.ownerId,parsed.data.month,tx),
   ]);
   if(events.length!==total)throw new Error('STAGE10_HISTORY_INCONSISTENT');
   const ownedAccounts=new Map(accounts.map(item=>[item.id,item]));
   const ownedCategories=new Map(categories.map(item=>[item.id,item]));
   const ownedMethods=new Map(paymentMethods.map(item=>[item.id,item]));
   return {
    kind:'stage10-financial-readonly-snapshot-v1' as const,
    canWrite:false as const,consistency:'repeatable-read' as const,
    actorId:scope.actorId,workspaceId:scope.workspaceId,dataOwnerId:scope.ownerId,
    total,
    events:events.map(({importedRow,sourcePayload,...item})=>({
     ...item,
     enteredAmount:enteredAmountFromStored(item.type,Number(item.signedAmount)),
     account:item.accountId?ownedAccounts.get(item.accountId)??null:null,
     category:item.categoryId?ownedCategories.get(item.categoryId)??null:null,
     paymentMethod:item.paymentMethodId?ownedMethods.get(item.paymentMethodId)??null:null,
     sourceRowNumber:importedRow?.rowNumber??null,
     ...stage10HistoricLabels(importedRow?.rawData,sourcePayload),
    })),
    accounts,categories,paymentMethods,cards,summary,cashflow,
   };
  }).catch(error=>{
   const code=error instanceof Error?error.message:'';
   if(code==='STAGE10_READ_ACCESS_DENIED')
    return reply.code(403).send({error:code});
   if(code==='STAGE10_WORKSPACE_FINANCIAL_SCOPE_NOT_EXCLUSIVE')
    return reply.code(409).send({error:code});
   throw error;
  });
 });
 const cardPreviewQuery=z.object({
  cardId:z.string().trim().min(1).max(256),
  purchaseDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value=>{
   const date=new Date(value+'T12:00:00.000Z');
   return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value;
  }),
  amountDecimal:z.string().regex(/^(?:0|[1-9]\d{0,10})\.\d{2}$/),
  installments:z.coerce.number().int().min(1).max(48),
 });
 app.get('/stage10-readonly/card-preview',{
  preHandler:app.authorize([...readRoles]),
 },async(request,reply)=>{
  const parsed=cardPreviewQuery.safeParse(request.query);
  if(!parsed.success)return reply.code(400).send({error:'INVALID_STAGE10_CARD_PREVIEW'});
  const q=parsed.data,amount=Number(q.amountDecimal);
  if(!Number.isFinite(amount)||amount<=0||
   !Number.isSafeInteger(Math.round(amount*100)))
   return reply.code(400).send({error:'INVALID_STAGE10_CARD_PREVIEW'});
  reply.header('Cache-Control','private, no-store');
  return withStage10ReadOnlySessionWorkspace(request.user.sub,
   (request as typeof request & {stage10SessionId?:string}).stage10SessionId??'',
   (request as typeof request & {stage10WorkspaceId?:string}).stage10WorkspaceId??'',
   async(tx,scope)=>{
    // Cartao legado e vinculado ao owner por userId, nao ao workspace.
    // Com mais de um workspace do mesmo owner, negar em vez de adivinhar.
    const workspaces=await tx.workspace.count({
     where:{ownerId:scope.ownerId,isActive:true},
    });
    if(workspaces!==1)throw new Error('STAGE10_CARD_SCOPE_NOT_EXCLUSIVE');
    const card=await tx.creditCard.findFirst({
     where:{id:q.cardId,userId:scope.ownerId,isActive:true},
     select:{id:true,closingDay:true,dueDay:true},
    });
    if(!card)throw new Error('STAGE10_CARD_NOT_FOUND');
    const rows=cardPurchaseCyclePreview({
     purchaseDate:q.purchaseDate,totalAmount:amount,installments:q.installments,
     closingDay:card.closingDay,dueDay:card.dueDay,
    });
    return {
     kind:'stage10-card-installments-preview-v1' as const,canWrite:false as const,
     source:'canonical' as const,cardId:card.id,purchaseDate:q.purchaseDate,
     amountDecimal:q.amountDecimal,installments:q.installments,
     rows:rows.map(row=>({
      sequence:row.number,dueDate:row.dueDate,competence:row.statementMonth,
      amountDecimal:row.amount.toFixed(2),
     })),
    };
   }).catch(error=>{
    const code=error instanceof Error?error.message:'';
    if(code==='STAGE10_READ_ACCESS_DENIED')
     return reply.code(403).send({error:code});
    if(code==='STAGE10_CARD_SCOPE_NOT_EXCLUSIVE')
     return reply.code(409).send({error:code});
    if(code==='STAGE10_CARD_NOT_FOUND')
     return reply.code(404).send({error:code});
    throw error;
   });
 });

 /**
  * Leitura isolada do agregado CardPurchase/CardInstallment. Nao mistura
  * este agregado a FinancialEvent, pois pode haver representacoes legadas.
  * A reconciliacao de duplicidades e a UI permanecem bloqueadas.
  */
 app.get('/stage10-readonly/card-purchases',{
  preHandler:app.authorize([...readRoles]),
 },async(request,reply)=>{
  const parsed=monthSchema.safeParse(request.query);
  if(!parsed.success)return reply.code(400).send({error:'INVALID_STAGE10_READ_MONTH'});
  reply.header('Cache-Control','private, no-store');
  return withStage10ReadOnlySessionWorkspace(request.user.sub,
   (request as typeof request & {stage10SessionId?:string}).stage10SessionId??'',
   (request as typeof request & {stage10WorkspaceId?:string}).stage10WorkspaceId??'',
   async(tx,scope)=>{
    // CardPurchase nao tem workspaceId na modelagem existente.
    // Autorizar somente owner com UMA base ativa e evento sem escopo estranho.
    const [ownerWorkspaceCount,foreignOwnerEvents]=await Promise.all([
     tx.workspace.count({where:{ownerId:scope.ownerId,isActive:true}}),
     tx.financialEvent.count({where:{userId:scope.ownerId,archivedAt:null,
      OR:[{workspaceId:null},{workspaceId:{not:scope.workspaceId}}]}}),
    ]);
    if(ownerWorkspaceCount!==1||foreignOwnerEvents!==0)
     throw new Error('STAGE10_CARD_SCOPE_NOT_EXCLUSIVE');
    const year=Number(parsed.data.month.slice(0,4));
    const month=Number(parsed.data.month.slice(5,7));
    const start=new Date(Date.UTC(year,month-1,1));
    const end=new Date(Date.UTC(year,month,1));
    const where={
     userId:scope.ownerId,status:'active',
     card:{userId:scope.ownerId},
     OR:[
      {purchaseDate:{gte:start,lt:end}},
      {entries:{some:{statementMonth:parsed.data.month}}},
     ],
    } as const;
    const total=await tx.cardPurchase.count({where});
    if(total>HISTORY_LIMIT)return {
     kind:'stage10-card-purchase-history-limit-v1' as const,
     canWrite:false as const,limit:HISTORY_LIMIT,total,
    };
    const purchases=await tx.cardPurchase.findMany({
     where,orderBy:[{purchaseDate:'desc'},{id:'asc'}],
     select:{
      id:true,cardId:true,categoryId:true,description:true,totalAmount:true,
      purchaseDate:true,installments:true,status:true,createdAt:true,updatedAt:true,
      entries:{orderBy:{number:'asc'},select:{
       id:true,number:true,amount:true,partialPaidAmount:true,
       statementMonth:true,status:true,paidAt:true,
      }},
     },
    });
    if(purchases.length!==total)throw new Error('STAGE10_CARD_HISTORY_INCONSISTENT');
    return {
     kind:'stage10-card-purchase-history-v1' as const,canWrite:false as const,
     source:'canonical-card-purchases' as const,
     actorId:scope.actorId,workspaceId:scope.workspaceId,
     dataOwnerId:scope.ownerId,month:parsed.data.month,total,
     purchases,
    };
   }).catch(error=>{
    const code=error instanceof Error?error.message:'';
    if(code==='STAGE10_READ_ACCESS_DENIED')
     return reply.code(403).send({error:code});
    if(code==='STAGE10_CARD_SCOPE_NOT_EXCLUSIVE')
     return reply.code(409).send({error:code});
    throw error;
   });
 });

}
