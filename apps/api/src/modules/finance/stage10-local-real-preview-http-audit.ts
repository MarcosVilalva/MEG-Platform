/**
 * Stage10 local preview: end-to-end HTTP metadata checks, no secrets nor
 * financial rows printed. Only loopback clone. No data mutation.
 */
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
assert.equal(process.env.MEG_STAGE10_LOCAL_REAL_PREVIEW,'1');
assert.equal(process.env.NODE_ENV,'test');
const u=new URL(process.env.DATABASE_URL||'postgresql://x:x@invalid/invalid');
assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55448');
assert.equal(u.username,'meg_stage10_preview_runtime');
assert.equal(u.pathname,'/meg_stage10_local_preview');
assert.equal(process.env.JWT_SECRET?.length!>=32,true);
const {PrismaClient}=await import('@prisma/client');
const db=new PrismaClient();
try{
 const workspaces=await db.workspace.findMany({select:{owner:{select:{id:true,email:true,role:true}},id:true},take:2});
 assert.equal(workspaces.length,1);
 const user=workspaces[0].owner;
 assert.ok(user);
 const b64=(o:object)=>Buffer.from(JSON.stringify(o)).toString('base64url');
 const header=b64({alg:'HS256',typ:'JWT'});
 const payload=b64({sub:user.id,email:user.email,role:user.role,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+300});
 const mac=createHmac('sha256',process.env.JWT_SECRET!).update(header+'.'+payload).digest('base64url');
 const token=header+'.'+payload+'.'+mac;
 const get=async(path:string,authorized=true)=>{
   const r=await fetch('http://127.0.0.1:3333'+path,{headers:authorized?{Authorization:'Bearer '+token}:{}});
   const body=await r.json().catch(()=>({}));
   return {status:r.status,body};
 };
 const core=[
  '/auth/me','/finance/sync-status',
  '/finance/summary?month=2026-11','/finance/cashflow?month=2026-11',
  '/finance/benefit-summary?month=2026-11','/finance/events/month?month=2026-11',
  '/finance/accounts','/finance/categories','/finance/payment-methods',
  '/cards?month=2026-11','/finance/home-available?date=2026-11-21',
  '/finance/home-commitments?month=2026-11',
  '/finance/events?page=1&pageSize=50',
  '/finance/events/history-snapshot',
 ];
 for(const path of core){
   const {status,body}=await get(path);
   const name=path.split('?')[0];
   let detail='';
   if(name==='/finance/events/history-snapshot'){
     detail=' kind='+String(body.kind)+' total='+String(body.total)+' limit='+String(body.limit??'none');
     assert.ok(['complete','limit-exceeded'].includes(body.kind));
     if(body.kind==='complete')assert.equal(body.items?.length,body.total);
   }else if(name==='/finance/events/month'){
     detail=' items='+String(body.items?.length??'unknown')+' total='+String(body.total??'unknown');
   }else if(name==='/finance/events'){
     detail=' items='+String(body.items?.length??'unknown')+' total='+String(body.total??'unknown');
   }else if(Array.isArray(body))detail=' records='+body.length;
   else if(name==='/finance/sync-status')detail=' hasToken='+Boolean(body.token)+' snapshotCapability='+Boolean(body.capabilities?.historySnapshotV1);
   console.log('PT53_HTTP '+name+' status='+status+detail);
   assert.equal(status,200,'HTTP_READ_FAILED:'+name);
 }
 const dbTotal=await db.financialEvent.count();
 const activeCount=await db.financialEvent.count({where:{userId:user.id,archivedAt:null}});
 console.log('PT53_DB_COUNTS_ALL='+dbTotal+' ACTIVE_OWNER='+activeCount);
 const anon=await get('/finance/summary?month=2026-11',false);
 assert.equal(anon.status,401);
 console.log('PT53_ANONYMOUS=401_PASS');
 const res=await fetch('http://127.0.0.1:3333/finance/events',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{}'});
 assert.equal(res.status,404);
 console.log('PT53_WRITE_BLOCKED=404_PASS');
 console.log('PT53_HTTP_AUDIT=PASS');
}finally{await db.$disconnect();}
