import Fastify from 'fastify';
import {registerAuth} from '../../plugins/auth';
import {registerSecurityHeaders} from '../../security';
import {registerStage10BatchPreviewReadContract} from './batch-edit-preview-http-contract';

/**
 * Host QA temporário que existe SOMENTE nos runners descartáveis do Stage10.
 * Não é uma rota de server.ts, não é um serviço Render e nunca recebe dados reais.
 * A função de escuta fixa o bind a 127.0.0.1 em porta efêmera.
 */
export function assertStage10DisposableHttpEnvironment(
 env:NodeJS.ProcessEnv=process.env,
):void{
 let database:URL;
 try{database=new URL(env.DATABASE_URL||'');}catch{
  throw new Error('STAGE10_QA_DISPOSABLE_ONLY');
 }
 if(env.MEG_STAGE10_ISOLATED_PG!=='1'
  ||env.MEG_STAGE10_QA_HTTP_ENABLED!=='1'
  ||env.NODE_ENV!=='test'
  ||database.protocol!=='postgresql:'
  ||database.hostname!=='127.0.0.1'
  ||database.pathname!=='/meg_stage10_sandbox'
  ||database.searchParams.get('schema')!=='public'
  ||(database.port!==''&&database.port!=='5432')){
  throw new Error('STAGE10_QA_DISPOSABLE_ONLY');
 }
}

export async function startStage10DisposablePreviewLoopback(){
 assertStage10DisposableHttpEnvironment();
 const app=Fastify({logger:false,bodyLimit:64*1024,trustProxy:false});
 try{
  registerSecurityHeaders(app);
  await registerAuth(app);
  await app.register(async scope=>{
   registerStage10BatchPreviewReadContract(scope);
  },{prefix:'/finance'});
  await app.ready();
  const address=await app.listen({host:'127.0.0.1',port:0});
  const actual=new URL(address);
  if(actual.hostname!=='127.0.0.1'){
   throw new Error('STAGE10_QA_BIND_NOT_LOOPBACK');
  }
  return {app,address};
 }catch(error){
  await app.close();
  throw error;
 }
}
