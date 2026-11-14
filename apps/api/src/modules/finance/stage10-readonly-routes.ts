import type {FastifyInstance} from 'fastify';
import {Prisma} from '@meg/database';
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
export function registerStage10ReadOnlyRoutes(app:FastifyInstance){
 app.get('/stage10-readonly/snapshot',{
  preHandler:app.authorize([...readRoles]),
 },async(request,reply)=>{
  reply.header('Cache-Control','private, no-store');
  return withStage10ReadOnlyWorkspace(request.user.sub,async(tx,scope)=>{
   const where={userId:scope.ownerId,archivedAt:null};
   const total=await tx.financialEvent.count({where});
   if(total>HISTORY_LIMIT) return {
    kind:'stage10-financial-history-limit-v1' as const,
    canWrite:false as const,limit:HISTORY_LIMIT,total,
   };
   const [events,accounts,categories,paymentMethods,cards]=await Promise.all([
    tx.financialEvent.findMany({
     where,orderBy:[{date:'desc'},{createdAt:'desc'},{id:'asc'}],
     include:{account:true,category:true,paymentMethod:true,
      importedRow:{select:{rowNumber:true,rawData:true}}},
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
   ]);
   if(events.length!==total)throw new Error('STAGE10_HISTORY_INCONSISTENT');
   return {
    kind:'stage10-financial-readonly-snapshot-v1' as const,
    canWrite:false as const,consistency:'repeatable-read' as const,
    actorId:scope.actorId,workspaceId:scope.workspaceId,dataOwnerId:scope.ownerId,
    total,
    events:events.map(({importedRow,...item})=>({
     ...item,sourceRowNumber:importedRow?.rowNumber??null,
     // Legacy labels remain raw source data; the Web only displays them.
     sourceRawData:importedRow?.rawData??null,
    })),
    accounts,categories,paymentMethods,cards,
   };
  });
 });
}
