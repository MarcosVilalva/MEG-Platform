import Fastify from 'fastify';
import cors from '@fastify/cors';
import {registerAuth} from './plugins/auth';
import {registerStage10ReadOnlyRoutes} from './modules/finance/stage10-readonly-routes';
import {withStage10ReadOnlyWorkspace} from './modules/finance/stage10-readonly-workspace';

/**
 * Etapa 10: app Fastify *separado* do servidor de producao.
 * Nenhuma importacao de server.ts: nao inicia reconciliacao, cron,
 * cadastro, migracao, API legada, escritor ou tarefas de startup.
 * JWT existente e validado; este servidor NAO emite nem atualiza tokens.
 */
export async function createStage10ReadOnlyApp(allowedOrigin:string){
 const parsed=new URL(allowedOrigin);
 if(parsed.protocol!=='https:'||parsed.origin!==allowedOrigin||parsed.username||
    parsed.password||parsed.hash||parsed.search||parsed.pathname!=='/'||
    parsed.hostname==='localhost')
  throw new Error('STAGE10_READONLY_CORS_ORIGIN_INVALID');
 const app=Fastify({logger:false,bodyLimit:1024});
 await app.register(cors,{
  origin(origin,callback){
   callback(null,!origin||origin===allowedOrigin);
  },
  credentials:false,
  methods:['GET','HEAD','OPTIONS'],
  allowedHeaders:['Authorization','Content-Type'],
 });
 await registerAuth(app);
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
