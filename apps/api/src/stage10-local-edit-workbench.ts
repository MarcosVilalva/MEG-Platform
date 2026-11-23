/**
 * Stage 10 local financial edit workbench.
 *
 * Dedicated copied database only; never point to production, WebQA or
 * the 55448 reference preview. Only permitted financial write is guarded
 * historical expense PATCH, implemented by a canonical transaction.
 */
import assert from 'node:assert/strict';
import {z} from 'zod';
import {HistoricalTextEditError,assertIsolatedHistoricalWriteDestination,
 updateHistoricalExpenseInIsolatedQa} from './modules/finance/stage10-historical-text-edit';
import {resolveWorkspaceContext} from './modules/workspaces/service';
import {isNormalizedPrimary} from './modules/app-state/normalization-migration';

assert.equal(process.env.MEG_STAGE10_EDIT_WORKBENCH_WRITE,'1');
assert.equal(process.env.MEG_STAGE10_HISTORICAL_DISPOSABLE_WRITE_TEST,undefined);
assert.equal(process.env.NODE_ENV,'test');
assert.equal(process.env.HOST,'127.0.0.1');
assert.equal(process.env.PORT,'3334');
assert.ok((process.env.JWT_SECRET||'').length>=32);
assertIsolatedHistoricalWriteDestination();

const [{default:Fastify},{default:cors},{registerAuth},{authRoutes},
 {financeRoutes},{cardRoutes},{payableRoutes},{appStateRoutes},{prisma}]=
 await Promise.all([
  import('fastify'),import('@fastify/cors'),import('./plugins/auth'),
  import('./modules/auth/routes'),import('./modules/finance/routes'),
  import('./modules/cards/routes'),import('./modules/payables/routes'),
  import('./modules/app-state/routes'),import('@meg/database'),
 ]);

const app=Fastify({logger:false,bodyLimit:1024*1024});
const allowedGet=(path:string)=>
 path==='/health'||path==='/ready'||path==='/auth/me'||
 path==='/auth/sessions'||path.startsWith('/finance/')||
 path==='/cards'||path.startsWith('/cards/')||
 path==='/payables'||path.startsWith('/payables/')||
 path.startsWith('/app-state/');
const allowedPost=new Set(['/auth/login','/auth/refresh','/auth/logout']);
const writerPath=/^\/finance\/events\/[^/]+\/stage10-historical-edit$/;
app.addHook('onRequest',async(request,reply)=>{
 const path=new URL(request.url,'http://127.0.0.1').pathname;
 if(request.method==='OPTIONS')return;
 if(request.method==='GET'&&allowedGet(path))return;
 if(request.method==='POST'&&allowedPost.has(path))return;
 if(request.method==='PATCH'&&writerPath.test(path))return;
 return reply.code(404).send({error:'STAGE10_WORKBENCH_OTHER_WRITES_DISABLED'});
});
app.setErrorHandler((error,_request,reply)=>{
 const safe=error instanceof Error?error:new Error('UNKNOWN');
 const code='statusCode' in safe&&typeof safe.statusCode==='number'?safe.statusCode:503;
 if(code>=400&&code<500)return reply.code(code).send({error:'LOCAL_WORKBENCH_REQUEST_REJECTED'});
 console.error('WORKBENCH_ERROR_CLASS='+safe.name);
 return reply.code(503).send({error:'LOCAL_WORKBENCH_UNAVAILABLE'});
});
await app.register(cors,{
 origin(origin,done){
  const allowed=!origin||origin==='http://127.0.0.1:5174'||origin==='http://localhost:5174';
  done(allowed?null:new Error('WORKBENCH_CORS_DENIED'),allowed);
 },credentials:false,
});
await registerAuth(app);
app.get('/health',async()=>({status:'isolated-write-workbench',
 scope:'legacy-monetary-expense',sourceDate:'2026-11-14'}));
app.get('/ready',async(_req,reply)=>{
 try{
  const id=await prisma.$queryRaw<Array<{db:string;role:string}>>`
   SELECT current_database()::text AS db,current_user::text AS role`;
  if(id.length!==1||id[0].db!=='meg_stage10_edit_workbench'||
   id[0].role!=='meg_stage10_workbench_runtime'){
   return reply.code(503).send({status:'unavailable'});
  }
  return {status:'ready',scope:'historical-expense-edit'};
 }catch{return reply.code(503).send({status:'unavailable'});}
});
await app.register(authRoutes,{prefix:'/auth'});
await app.register(financeRoutes,{prefix:'/finance'});
await app.register(cardRoutes,{prefix:'/cards'});
await app.register(payableRoutes,{prefix:'/payables'});
await app.register(appStateRoutes,{prefix:'/app-state'});
app.get('/finance/stage10-historical-write-gate',{
 preHandler:app.authorize(['ADMIN','MANAGER']),
},async(request,reply)=>{
 const ctx=await resolveWorkspaceContext(request.user.sub);
 const state=await prisma.appState.findUnique({
  where:{workspaceId:ctx.workspaceId},select:{revision:true,state:true},
 });
 if(!state||!isNormalizedPrimary(state.state))
  return reply.code(409).send({allowed:false,code:'NORMALIZATION_PRIMARY_REQUIRED'});
 return {allowed:true,protocol:'stage10-historical-monetary-edit-v1',
  revision:state.revision,scope:'expense-monetary-historical'};
});
const patchSchema=z.object({
 operationId:z.string().uuid(),
 expectedUpdatedAt:z.string().datetime({offset:true}),
 expectedRevision:z.number().int().nonnegative(),
 description:z.string().trim().min(1).max(160),
 notes:z.string().max(1000),
 amount:z.number().finite().positive().optional(),
}).strict();
app.patch('/finance/events/:id/stage10-historical-edit',{
 preHandler:app.authorize(['ADMIN','MANAGER']),
},async(request,reply)=>{
 const parsed=patchSchema.safeParse(request.body);
 if(!parsed.success)return reply.code(400).send({error:'INVALID_HISTORICAL_EDIT_PAYLOAD'});
 const {id}=request.params as {id:string};
 try{
  return await updateHistoricalExpenseInIsolatedQa(request.user.sub,id,parsed.data);
 }catch(error){
  if(!(error instanceof HistoricalTextEditError))throw error;
  const code=error.code;
  const status=code==='EVENT_NOT_FOUND'?404:
   /STALE|OPERATION_ID_REUSED|BALANCE_WINDOW|INSUFFICIENT|DOMAIN|LEDGER|MIRROR|FINANCIAL_FIELDS|UNSUPPORTED/.test(code)?409:400;
  return reply.code(status).send({error:code,retryable:false});
 }
});
await app.ready();
if(process.argv.includes('--verify')){
 try{
  const owner=await prisma.workspace.findFirst({
   select:{owner:{select:{id:true,email:true,role:true}}},
  });
  assert.ok(owner?.owner);
  const token=app.jwt.sign({
   sub:owner.owner.id,email:owner.owner.email,role:owner.owner.role,
  });
  const auth={authorization:'Bearer '+token};
  for(const path of ['/health','/ready','/auth/me',
    '/finance/summary?month=2026-11',
    '/finance/events/month?month=2026-11',
    '/finance/stage10-historical-write-gate']){
   const r=await app.inject({method:'GET',url:path,headers:auth});
   assert.equal(r.statusCode,200,'WORKBENCH_READ_'+path);
   console.log('PT65_WORKBENCH_READ='+path.split('?')[0]+':200');
  }
  const noAuth=await app.inject({method:'PATCH',
   url:'/finance/events/id/stage10-historical-edit',payload:{}});
  assert.equal(noAuth.statusCode,401);
  const malformed=await app.inject({method:'PATCH',
   url:'/finance/events/id/stage10-historical-edit',headers:auth,payload:{}});
  assert.equal(malformed.statusCode,400);
  for(const method of ['POST','DELETE'] as const){
   const r=await app.inject({method,url:'/finance/events',headers:auth,payload:{}});
   assert.equal(r.statusCode,404);
  }
  console.log('PT65_WORKBENCH_WRITE_ROUTE_GUARDS=PASS');
  console.log('PT65_WORKBENCH_FASTIFY_INJECT=PASS');
 }finally{await app.close();await prisma.$disconnect();}
}else{
 await app.listen({host:'127.0.0.1',port:3334});
 console.log('MEG_STAGE10_WRITE_WORKBENCH=127.0.0.1:3334');
 console.log('WORKBENCH_ALLOWED_FINANCIAL_WRITE=HISTORICAL_EXPENSE_EDIT_ONLY');
 const close=async()=>{await app.close();await prisma.$disconnect();process.exit(0);};
 process.on('SIGINT',()=>void close());
 process.on('SIGTERM',()=>void close());
}
