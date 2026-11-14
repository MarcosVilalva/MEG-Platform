import Fastify from 'fastify';
import cors from '@fastify/cors';
import type {UserRole} from '@meg/database';
import type {FastifyReply,FastifyRequest} from 'fastify';
import {verifyStage10PublicJwt} from './stage10-public-jwt-contract';
import {registerStage10ReadOnlyRoutes} from './modules/finance/stage10-readonly-routes';
import {withStage10ReadOnlyWorkspace} from './modules/finance/stage10-readonly-workspace';

/**
 * Etapa 10: API de leitura isolada. NAO importa server.ts, authRoutes ou
 * registerAuth. Sem JWT_SECRET e sem emissao de tokens, sessions ou writers.
 * So aceita token dedicado RS256 com scope stage10:finance:read.
 */
export type Stage10ReadOnlyAuthConfig={
 publicKeyPem:string;
 issuer:string;
 audience:string;
};
export async function createStage10ReadOnlyApp(
 allowedOrigin:string,auth:Stage10ReadOnlyAuthConfig,
){
 const parsed=new URL(allowedOrigin);
 if(parsed.protocol!=='https:'||parsed.origin!==allowedOrigin||parsed.username||
    parsed.password||parsed.hash||parsed.search||parsed.pathname!=='/'||
    parsed.hostname==='localhost')
  throw new Error('STAGE10_READONLY_CORS_ORIGIN_INVALID');
 if(!auth||typeof auth.publicKeyPem!=='string'||!auth.publicKeyPem.trim()||
    typeof auth.issuer!=='string'||!auth.issuer.trim()||
    typeof auth.audience!=='string'||!auth.audience.trim())
  throw new Error('STAGE10_PUBLIC_JWT_CONFIGURATION_REQUIRED');
 const app=Fastify({logger:false,bodyLimit:1024});
 await app.register(cors,{
  origin(origin,callback){callback(null,!origin||origin===allowedOrigin);},
  credentials:false,
  methods:['GET','HEAD','OPTIONS'],
  allowedHeaders:['Authorization','Content-Type'],
 });
 const authenticate=async(request:FastifyRequest,reply:FastifyReply)=>{
  const header=request.headers.authorization;
  if(typeof header!=='string'||!/^Bearer [A-Za-z0-9._-]+$/.test(header))
   return reply.status(401).send({error:'UNAUTHORIZED'});
  try{
   const claims=verifyStage10PublicJwt(header.slice(7),auth.publicKeyPem,{
    issuer:auth.issuer,audience:auth.audience,
   });
   request.user={sub:claims.sub,role:claims.role,email:''};
  }catch{
   return reply.status(401).send({error:'UNAUTHORIZED'});
  }
 };
 app.decorate('authenticate',authenticate);
 app.decorate('authorize',function authorize(roles:UserRole[]){
  return async(request:FastifyRequest,reply:FastifyReply)=>{
   await authenticate(request,reply);
   if(reply.sent)return;
   if(!roles.includes(request.user.role))
    return reply.status(403).send({error:'FORBIDDEN'});
  };
 });
 app.get('/health',async(_request,reply)=>{
  reply.header('Cache-Control','no-store');
  return {status:'ok',mode:'stage10-readonly'};
 });
 app.get('/auth/me',{preHandler:app.authenticate},async(request,reply)=>{
  reply.header('Cache-Control','private, no-store');
  try{
   return await withStage10ReadOnlyWorkspace(request.user.sub,async(tx,scope)=>{
    const user=await tx.user.findUnique({
     where:{id:scope.actorId},
     select:{id:true,name:true,email:true,phone:true,role:true,status:true,isActive:true},
    });
    if(!user)throw new Error('STAGE10_READ_ACCESS_DENIED');
    return {user};
   });
  }catch(error){
   if(error instanceof Error&&error.message==='STAGE10_READ_ACCESS_DENIED')
    return reply.status(403).send({error:'STAGE10_READ_ACCESS_DENIED'});
   throw error;
  }
 });
 await app.register(registerStage10ReadOnlyRoutes,{prefix:'/finance'});
 return app;
}
