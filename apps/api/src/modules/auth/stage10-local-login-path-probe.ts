import assert from 'node:assert/strict';
import { randomBytes,createHash } from 'node:crypto';
assert.equal(process.env.MEG_STAGE10_LOCAL_REAL_PREVIEW, '1');
const u=new URL(process.env.DATABASE_URL||'postgresql://invalid/invalid');
assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55448');
assert.equal(u.pathname,'/meg_stage10_local_preview');
assert.equal(u.username,'meg_stage10_preview_runtime');
const {PrismaClient}=await import('@prisma/client');
const prisma=new PrismaClient({log:[{emit:'event',level:'query'}]});
prisma.$on('query',(event)=>{
  const sql=event.query.replace(/\s+/g,' ').trim();
  if(/UPDATE\s+.*\"User\"/i.test(sql)){
    const sets=sql.match(/\bSET\s+(.*?)\s+WHERE\b/i)?.[1]||'NOT_FOUND';
    console.log('PT52_PRISMA_USER_UPDATE_SET='+sets.slice(0,250));
    console.log('PT52_PRISMA_USER_UPDATE_HAS_RETURNING='+/RETURNING/i.test(sql));
  }
});
const ROLLBACK='STAGE10_LOGIN_PROBE_INTENTIONAL_ROLLBACK';
try {
 const statuses=await prisma.user.groupBy({by:['status','isActive'],_count:{_all:true}});
 for(const item of statuses)console.log('PT52_USERS_STATUS='+item.status+' ACTIVE='+item.isActive+' COUNT='+item._count._all);
 const owner=await prisma.workspace.findFirst({select:{ownerId:true}});
 assert.ok(owner?.ownerId,'WORKSPACE_OWNER_ABSENT');
 try {
  await prisma.$transaction(async tx=>{
   await tx.user.update({where:{id:owner.ownerId},data:{lastLoginAt:new Date()}});
   console.log('PT52_LAST_LOGIN_UPDATE=PASS_IN_TRANSACTION');
   const hash=createHash('sha256').update(randomBytes(48)).digest('hex');
   await tx.authSession.create({data:{userId:owner.ownerId,tokenHash:hash,expiresAt:new Date(Date.now()+3600000)}});
   console.log('PT52_AUTH_SESSION_CREATE=PASS_IN_TRANSACTION');
   throw new Error(ROLLBACK);
  });
 }catch(error){
  if(error instanceof Error && error.message===ROLLBACK){
   console.log('PT52_ROLLBACK_CONFIRMED=YES');
  }else{
   const category=(error&&typeof error==='object'&&'code' in error)?String(error.code):error instanceof Error?error.name:'UNKNOWN';
   console.log('PT52_LOGIN_PATH_FAILURE_CATEGORY='+category);
   const details=error instanceof Error?error.message:'';
   const reason=/permission denied|permissão negada/i.test(details)?'PERMISSION_DENIED':/transaction|transação/i.test(details)?'TRANSACTION_FAILED':/relation .* does not exist|tabela .* não existe/i.test(details)?'MISSING_RELATION':/column .* does not exist|coluna .* não existe/i.test(details)?'MISSING_COLUMN':/authentication|password/i.test(details)?'AUTH_ERROR':'OTHER';
   console.log('PT52_LOGIN_PATH_FAILURE_REASON='+reason);
   const object=details.match(/permission denied for (?:table|relation|sequence|schema)\\?"?([A-Za-z_]+)\\?"?/i);
   console.log('PT52_PERMISSION_OBJECT='+((object?.[1]||'UNIDENTIFIED').replace(/[^A-Za-z_]/g,'')));
   for(const n of ['User','AuthSession','Workspace','AuditLog','sequence','schema','table','transaction','permission denied'])console.log('PT52_ERROR_MENTIONS_'+n.toUpperCase()+'='+details.includes(n));
   process.exitCode=4;
  }
 }
}finally{await prisma.$disconnect();}
