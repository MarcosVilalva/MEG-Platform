/**
 * MEG Stage10 isolated LOCAL preview, real snapshot in dedicated PostgreSQL clone.
 * Never import server.ts. Financial writers are blocked by both HTTP allowlist
 * and PostgreSQL least-privilege grants. No production or protected QA access.
 */
import assert from 'node:assert/strict';

assert.equal(process.env.MEG_STAGE10_LOCAL_REAL_PREVIEW, '1', 'LOCAL_PREVIEW_FLAG_REQUIRED');
assert.equal(process.env.NODE_ENV, 'test', 'LOCAL_PREVIEW_TEST_MODE_REQUIRED');
const uri = new URL(process.env.DATABASE_URL || 'postgresql://missing:missing@invalid/invalid');
assert.equal(uri.protocol, 'postgresql:');
assert.equal(uri.hostname, '127.0.0.1');
assert.equal(uri.port, '55448');
assert.equal(uri.pathname, '/meg_stage10_local_preview');
assert.equal(decodeURIComponent(uri.username), 'meg_stage10_preview_runtime');
assert.ok(uri.password.length >= 30);
assert.equal(uri.searchParams.get('schema'), 'public');
assert.ok(!uri.searchParams.has('host') && !uri.searchParams.has('sslmode'));
assert.equal(process.env.HOST, '127.0.0.1');
assert.equal(process.env.PORT, '3333');

const [{ default:Fastify },{ default:cors },{ registerAuth },
  { authRoutes },{ financeRoutes },{ cardRoutes },{ payableRoutes },{ appStateRoutes },
  { prisma }] = await Promise.all([
  import('fastify'),
  import('@fastify/cors'),
  import('./plugins/auth'),
  import('./modules/auth/routes'),
  import('./modules/finance/routes'),
  import('./modules/cards/routes'),
  import('./modules/payables/routes'),
  import('./modules/app-state/routes'),
  import('@meg/database'),
]);

const app=Fastify({logger:false,bodyLimit:1024*1024});
const allowedGet=(path:string)=>
  path==='/health' || path==='/ready' || path==='/auth/me' ||
  path==='/auth/sessions' || path.startsWith('/finance/') ||
  path==='/cards' || path.startsWith('/cards/') ||
  path==='/payables' || path.startsWith('/payables/') ||
  path.startsWith('/app-state/');
const allowedPost=new Set(['/auth/login','/auth/refresh','/auth/logout']);

app.addHook('onRequest',async(request,reply)=>{
  const path=new URL(request.url,'http://127.0.0.1').pathname;
  if(request.method==='OPTIONS')return;
  if(request.method==='GET' && allowedGet(path))return;
  if(request.method==='POST' && allowedPost.has(path))return;
  return reply.status(404).send({error:'STAGE10_LOCAL_PREVIEW_WRITE_BLOCKED'});
});
app.setErrorHandler((error,request,reply)=>{
  const safeError=error instanceof Error?error:new Error('LOCAL_PREVIEW_UNKNOWN_ERROR');
  const status='statusCode' in safeError && typeof safeError.statusCode==='number'?safeError.statusCode:503;
  if(status>=400 && status<500){
    return reply.status(status).send({error:'LOCAL_PREVIEW_REQUEST_REJECTED'});
  }
  console.error('LOCAL_PREVIEW_HANDLED_ERROR='+safeError.name);
  return reply.status(503).send({error:'LOCAL_PREVIEW_READ_UNAVAILABLE'});
});
await app.register(cors,{
  origin(origin,callback){
    const allowed=!origin || origin==='http://127.0.0.1:5173' || origin==='http://localhost:5173';
    callback(allowed?null:new Error('LOCAL_PREVIEW_CORS_DENIED'),allowed);
  },
  credentials:false
});
await registerAuth(app);
app.get('/health',async()=>({status:'local-preview',financialWrites:false,sourceDate:'2026-11-14'}));
app.get('/ready',async(_request,reply)=>{
  try{
    const id=await prisma.$queryRaw<Array<{db:string;role:string}>>`
      SELECT current_database() AS db,current_user AS role
    `;
    if(id.length!==1||id[0].db!=='meg_stage10_local_preview'||id[0].role!=='meg_stage10_preview_runtime'){
      return reply.status(503).send({status:'unavailable'});
    }
    return {status:'ready',financialWrites:false};
  }catch{return reply.status(503).send({status:'unavailable'});}
});
await app.register(authRoutes,{prefix:'/auth'});
await app.register(financeRoutes,{prefix:'/finance'});
await app.register(cardRoutes,{prefix:'/cards'});
await app.register(payableRoutes,{prefix:'/payables'});
await app.register(appStateRoutes,{prefix:'/app-state'});
await app.ready();

if(process.argv.includes('--verify')){
  try{
    const owner=await prisma.workspace.findFirst({
      select:{owner:{select:{id:true,email:true,role:true}}}
    });
    assert.ok(owner?.owner?.id,'REAL_PREVIEW_OWNER_REQUIRED');
    const token=app.jwt.sign({
      sub:owner.owner.id,email:owner.owner.email,role:owner.owner.role
    });
    const request=(path:string,authorized=true)=>
      app.inject({method:'GET',url:path,headers:authorized?{authorization:'Bearer '+token}:{}});
    const health=await request('/health',false);
    assert.equal(health.statusCode,200);
    const ready=await request('/ready',false);
    assert.equal(ready.statusCode,200);
    console.log('PT50_LOCAL_HEALTH_READY=PASS');
    const unauth=await request('/finance/summary?month=2026-11',false);
    assert.equal(unauth.statusCode,401);
    console.log('PT50_UNAUTHORIZED_READ_REJECTED=PASS');
    const paths=[
      '/auth/me',
      '/finance/summary?month=2026-11',
      '/finance/cashflow?month=2026-11',
      '/finance/benefit-summary?month=2026-11',
      '/finance/events/month?month=2026-11',
      '/finance/accounts',
      '/finance/categories',
      '/cards?month=2026-11',
      '/finance/home-available?date=2026-11-21',
      '/app-state/revision',
    ];
    for(const path of paths){
      const result=await request(path);
      console.log('PT50_HTTP_READ_STATUS='+path.split('?')[0]+':'+result.statusCode);
      assert.equal(result.statusCode,200,'LOCAL_PREVIEW_GET_FAIL_'+path);
    }
    console.log('PT50_CANONICAL_READS=PASS');
    for(const path of ['/finance/events','/app-state','/payables','/cards']){
      const result=await app.inject({method:'POST',url:path,
        headers:{authorization:'Bearer '+token},payload:{}});
      assert.equal(result.statusCode,404);
    }
    console.log('PT50_FINANCIAL_WRITES_HTTP_BLOCKED=PASS');
    const malformedLogin=await app.inject({method:'POST',url:'/auth/login',
      payload:{email:'invalid',password:'invalid'}});
    assert.equal(malformedLogin.statusCode,400);
    console.log('PT50_LOGIN_ROUTE_VALIDATION=PASS');
    console.log('PT50_LOCAL_REAL_PREVIEW_GATE=PASS');
  }finally{await app.close();await prisma.$disconnect();}
}else{
  const port=3333;
  await app.listen({port,host:'127.0.0.1'});
  console.log('MEG_STAGE10_LOCAL_API_LISTEN=127.0.0.1:3333');
  console.log('MEG_STAGE10_FINANCIAL_WRITES=BLOCKED');
  const close=async()=>{
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGTERM',()=>void close());
  process.on('SIGINT',()=>void close());
}
