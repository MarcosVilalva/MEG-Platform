import {createHash} from 'node:crypto';
import type {FastifyInstance} from 'fastify';
import {Prisma,UserStatus,prisma} from '@meg/database';
import {z} from 'zod';
import {authRateLimiters} from '../../security';
import {config} from '../../config';
import {authorizeStage10QaTokenExchange} from '../../stage10-qa-token-exchange.contract';
import {issueStage10QaReadToken} from '../../stage10-qa-token-issuer.contract';

const bodySchema=z.object({
 refreshToken:z.string().min(20).max(256).regex(/^[A-Za-z0-9_-]+$/),
}).strict();

type Runtime={
 enabled:boolean;origin:string;issuer:string;audience:string;privateKeyPem:string;
};
/**
 * A habilitacao so ocorre por opt-in explicito e segredos presentes.
 * Ausencia de config deixa a rota inexistente, inclusive em producao.
 */
function environmentRuntime():Runtime{
 return {
  enabled:process.env.MEG_STAGE10_QA_EXCHANGE_ENABLED==='true',
  origin:process.env.MEG_STAGE10_QA_PREVIEW_ORIGIN||'',
  issuer:process.env.MEG_STAGE10_QA_JWT_ISSUER||'',
  audience:process.env.MEG_STAGE10_QA_JWT_AUDIENCE||'',
  privateKeyPem:process.env.MEG_STAGE10_QA_JWT_PRIVATE_KEY_PEM?.replace(/\\n/g,'\n')||'',
 };
}
function exactOrigin(input:string){
 try{
  const url=new URL(input);
  return url.protocol==='https:'&&url.origin===input&&!url.username&&!url.password&&
   url.pathname==='/'&&!url.search&&!url.hash;
 }catch{return false;}
}
export async function registerStage10QaExchangeRoutes(
 app:FastifyInstance,runtime:Runtime=environmentRuntime(),
){
 if(!runtime.enabled)return;
 // Se ativada de forma incompleta, a inicializacao falha sem aceitar trafego.
 if(!exactOrigin(runtime.origin)||!exactOrigin(runtime.issuer)||
  !runtime.audience||runtime.audience.length>256||
  !runtime.privateKeyPem||!config.corsOrigins.includes(runtime.origin))
  throw new Error('STAGE10_QA_EXCHANGE_CONFIGURATION_INVALID');

 // Falha antecipada de chave: nao permitir rota publicada mas incapaz de assinar.
 const {createPrivateKey}=await import('node:crypto');
 try{
  const key=createPrivateKey(runtime.privateKeyPem);
  if(key.asymmetricKeyType!=='rsa'||(key.asymmetricKeyDetails?.modulusLength??0)<2048)
   throw new Error('INVALID_RSA');
 }catch{throw new Error('STAGE10_QA_EXCHANGE_CONFIGURATION_INVALID');}

 app.post('/stage10-qa/exchange',{
  bodyLimit:1024,
  preHandler:[authRateLimiters.stage10QaExchangeIp,
   authRateLimiters.stage10QaExchangeToken,app.authenticate],
 },async(request,reply)=>{
  reply.header('Cache-Control','no-store');
  reply.header('Pragma','no-cache');
  const body=bodySchema.safeParse(request.body);
  if(!body.success)return reply.code(400).send({error:'STAGE10_QA_EXCHANGE_INVALID'});
  // Origin bloqueada mesmo para cliente com bearer/refresh validos.
  // CORS e Origin sao complementares ao JWT e a prova da sessao.
  const origin=request.headers.origin;
  if(typeof origin!=='string'||origin!==runtime.origin)
   return reply.code(403).send({error:'STAGE10_QA_EXCHANGE_DENIED'});
  const claims=request.user as typeof request.user&{iat?:number;exp?:number};
  const hash=createHash('sha256').update(body.data.refreshToken).digest('hex');
  try{
   const approved=await prisma.$transaction(async tx=>{
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    const user=await tx.user.findUnique({where:{id:claims.sub},
     select:{id:true,role:true,status:true,isActive:true}});
    const session=await tx.authSession.findUnique({where:{tokenHash:hash},
     select:{id:true,userId:true,tokenHash:true,expiresAt:true,revokedAt:true}});
    if(!user||!session||session.userId!==user.id||
      user.status!==UserStatus.ACTIVE||!user.isActive)
     throw new Error('STAGE10_QA_EXCHANGE_DENIED');
    const filters={userId:user.id,isActive:true,status:UserStatus.ACTIVE} as const;
    const owned=await tx.workspaceMember.findFirst({
     where:{...filters,workspace:{isActive:true,ownerId:user.id}},
     orderBy:{createdAt:'asc'},include:{workspace:true},
    });
    const member=owned??await tx.workspaceMember.findFirst({
     where:{...filters,workspace:{isActive:true}},
     orderBy:{createdAt:'asc'},include:{workspace:true},
    });
    if(!member)throw new Error('STAGE10_QA_EXCHANGE_DENIED');
    return authorizeStage10QaTokenExchange({
     enabled:runtime.enabled,
     transport:{method:request.method,path:'/auth/stage10-qa/exchange',
      origin,expectedOrigin:runtime.origin,
      contentType:request.headers['content-type']||''},
     access:{signatureVerified:true,sub:claims.sub,role:claims.role,
      iat:Number(claims.iat),exp:Number(claims.exp)},
     refreshToken:body.data.refreshToken,
     user:{id:user.id,status:user.status,isActive:user.isActive,role:user.role},
     session:{id:session.id,userId:session.userId,tokenHash:session.tokenHash,
      expiresAt:Math.floor(session.expiresAt.getTime()/1000),
      revokedAt:session.revokedAt?.getTime()??null},
     workspace:{id:member.workspace.id,isActive:member.workspace.isActive},
     membership:{workspaceId:member.workspaceId,userId:member.userId,
      status:member.status,isActive:member.isActive},
     nowSeconds:Math.floor(Date.now()/1000),
    });
   },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead,
       maxWait:5000,timeout:10000});
   const nowSeconds=Math.floor(Date.now()/1000);
   // A prova se refere a um snapshot recente. Backend QA revalida a sessao
   // na transacao SQL de cada GET, incluindo revogacoes apos emissao.
   const token=issueStage10QaReadToken({
    sub:approved.sub,role:approved.role,
    sessionId:approved.sessionId,workspaceId:approved.workspaceId,
   },{privateKeyPem:runtime.privateKeyPem,issuer:runtime.issuer,
    audience:runtime.audience,nowSeconds,ttlSeconds:Math.max(1,Math.min(approved.ttlSeconds,120))});
   return reply.send({kind:'stage10-qa-read-token-v1',canWrite:false,
    actorId:approved.sub,accessToken:token,expiresAt:nowSeconds+Math.max(1,Math.min(approved.ttlSeconds,120))});
  }catch(error){
   if(error instanceof Error&&
     (error.message==='STAGE10_QA_EXCHANGE_DENIED'||error.message==='STAGE10_QA_ISSUER_INVALID'))
    return reply.code(403).send({error:'STAGE10_QA_EXCHANGE_DENIED'});
   throw error;
  }
 });
}
