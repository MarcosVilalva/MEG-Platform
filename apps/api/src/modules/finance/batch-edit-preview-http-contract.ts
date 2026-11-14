import type {FastifyInstance,FastifyReply,FastifyRequest} from 'fastify';
import {z} from 'zod';
import {createRateLimitPreHandler} from '../../security';
import {
 BatchPreviewAccessError,
 previewBatchCardCycleForActor,
 type AuthenticatedBatchPreviewRequest,
} from './batch-edit-preview-adapter';
import type {BatchPreviewResponse} from './batch-edit-preview-read';

const readRoles=new Set(['ADMIN','MANAGER','OPERATOR','VIEWER']);

/** Estrito e isolado: não aceitar ator, proprietário ou workspace vindos do browser. */
const itemSchema=z.object({
 source:z.enum(['card-purchase','financial-event','payable','benefit']),
 id:z.string().trim().min(1).max(160),
 expectedUpdatedAt:z.string().trim().min(1).max(80),
}).strict();
const isoDaySchema=z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/).refine(value=>{
 const date=new Date(value+'T12:00:00.000Z');
 return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value;
},'INVALID_PURCHASE_DATE');
export const stage10BatchPreviewBodySchema=z.object({
 items:z.array(itemSchema).min(1).max(200).superRefine((items,ctx)=>{
  const keys=items.map(x=>x.source+':'+x.id);
  if(new Set(keys).size!==keys.length)
   ctx.addIssue({code:z.ZodIssueCode.custom,message:'DUPLICATE_ITEMS'});
  for(let i=0;i<items.length;i++){
   if(items[i].source==='card-purchase'
      &&!z.string().datetime({offset:true}).safeParse(items[i].expectedUpdatedAt).success)
    ctx.addIssue({code:z.ZodIssueCode.custom,path:[i,'expectedUpdatedAt'],message:'INVALID_VERSION'});
  }
 }),
 changes:z.object({
  cardId:z.string().trim().min(1).max(160).optional(),
  purchaseDateMode:z.enum(['preserve','common']),
  commonPurchaseDate:isoDaySchema.optional(),
  installments:z.number().int().min(1).max(48).optional(),
 }).strict().superRefine((changes,ctx)=>{
  if(changes.purchaseDateMode==='common'&&!changes.commonPurchaseDate)
   ctx.addIssue({code:z.ZodIssueCode.custom,path:['commonPurchaseDate'],message:'PURCHASE_DATE_REQUIRED'});
  if(changes.purchaseDateMode==='preserve'&&changes.commonPurchaseDate)
   ctx.addIssue({code:z.ZodIssueCode.custom,path:['commonPurchaseDate'],message:'PURCHASE_DATE_MODE_CONFLICT'});
 }),
}).strict();

type PreviewReader=(actorId:string,input:AuthenticatedBatchPreviewRequest)=>Promise<BatchPreviewResponse>;
type RouteDependencies={preview?:PreviewReader};

const throttle=createRateLimitPreHandler({
 scope:'stage10-readonly-card-cycle-preview',
 max:60,
 windowMs:60_000,
 key:(request)=>request.ip||'unknown',
});

function noCache(reply:FastifyReply){
 reply.header('Cache-Control','no-store');
 reply.header('Pragma','no-cache');
 reply.header('Vary','Authorization');
}

async function readOnlyAccess(request:FastifyRequest,reply:FastifyReply){
 // POST transporta até 200 itens. app.authorize exigiria permissão de WRITE
 // para qualquer POST; aqui verificamos JWT e papel READ, sem habilitar writer.
 await request.jwtVerify().catch(()=>undefined);
 if(!request.user?.sub){
  return reply.code(401).send({error:'UNAUTHORIZED'});
 }
 if(!readRoles.has(request.user.role)){
  return reply.code(403).send({error:'FORBIDDEN'});
 }
}

/**
 * Contrato HTTP para testes por Fastify.inject. NÃO registrar no server.ts,
 * router de produção ou QA sem autorização independente e gates específicos.
 * POST é somente consulta, sem DB writes ou operaçãoId/receipt.
 */
export function registerStage10BatchPreviewReadContract(
 app:FastifyInstance,{preview=previewBatchCardCycleForActor}:RouteDependencies={},
){
 app.post('/batch-edit/card-cycle/preview',{
  bodyLimit:64*1024,
  preHandler:[readOnlyAccess,throttle],
 },async(request,reply)=>{
  noCache(reply);
  const parsed=stage10BatchPreviewBodySchema.safeParse(request.body);
  if(!parsed.success)return reply.code(400).send({error:'BATCH_PREVIEW_INVALID_SELECTION'});
  try{
   const result=await preview(request.user.sub,parsed.data);
   return reply.code(200).send(result);
  }catch(error){
   if(error instanceof BatchPreviewAccessError){
    return reply.code(error.code==='BATCH_PREVIEW_ACCESS_DENIED'?403:400)
     .send({error:error.code});
   }
   // Não expor falhas de Prisma, snapshots ou detalhes de outro workspace.
   request.log.error({message:'stage10 preview query failed'},'Read-only preview unavailable');
   return reply.code(503).send({error:'BATCH_PREVIEW_UNAVAILABLE'});
  }
 });
}
