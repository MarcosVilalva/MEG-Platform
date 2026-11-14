import type {FastifyInstance} from 'fastify';
import {z} from 'zod';
import {getCanonicalFinancialSummary,getCanonicalFinancialCashflow} from './read-model';
import {withStage10ReadOnlyWorkspace} from './stage10-readonly-workspace';

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
  return withStage10ReadOnlyWorkspace(request.user.sub,async(tx,scope)=>{
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
     include:{importedRow:{select:{rowNumber:true}}},
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
    events:events.map(({importedRow,...item})=>({
     ...item,
     account:item.accountId?ownedAccounts.get(item.accountId)??null:null,
     category:item.categoryId?ownedCategories.get(item.categoryId)??null:null,
     paymentMethod:item.paymentMethodId?ownedMethods.get(item.paymentMethodId)??null:null,
     sourceRowNumber:importedRow?.rowNumber??null,
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
}
