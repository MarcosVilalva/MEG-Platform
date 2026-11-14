import assert from 'node:assert/strict';
import {createHash,generateKeyPairSync} from 'node:crypto';
import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import {prisma,UserRole,UserStatus} from '@meg/database';
import {registerStage10QaExchangeRoutes} from './stage10-qa-exchange-routes';
import {verifyStage10PublicJwt} from '../../stage10-public-jwt-contract';
import {resetSecurityRateLimitersForTests} from '../../security';

/** PostgreSQL17 descartavel. Recusa execucao em qualquer outro banco. */
const url=process.env.DATABASE_URL||'';
if(process.env.MEG_STAGE10_SYNTHETIC_DB!=='true'||
 !/^postgresql:\/\/meg_test:meg_test@127\.0\.0\.1:5439\/meg_stage10_test(?:\?|$)/.test(url))
 throw new Error('STAGE10_SYNTHETIC_DATABASE_REQUIRED');

const origin='https://qa-auth.example.invalid';
const issuer='https://stage10-issuer.example.invalid';
const audience='stage10-finance-reader';
const pair=generateKeyPairSync('rsa',{modulusLength:2048,
 publicKeyEncoding:{type:'spki',format:'pem'},
 privateKeyEncoding:{type:'pkcs8',format:'pem'}});
const runtime={enabled:true,origin,issuer,audience,privateKeyPem:pair.privateKey};
const now=Math.floor(Date.now()/1000);
const suffix='stage10-exchange-'+process.pid;
const refreshToken='qa-exchange-valid-opaque-refresh-'+process.pid;
const tokenHash=createHash('sha256').update(refreshToken).digest('hex');
resetSecurityRateLimitersForTests();
const inactive=Fastify({logger:false});
try{
 await inactive.register(fastifyJwt,{secret:'stage10-synthetic-jwt-key-not-production-32-characters'});
 inactive.decorate('authenticate',async(_request,_reply)=>{});
 await inactive.register(async scope=>{
  await registerStage10QaExchangeRoutes(scope,{...runtime,enabled:false});
 },{prefix:'/auth'});
 await inactive.ready();
 assert.equal((await inactive.inject({method:'POST',url:'/auth/stage10-qa/exchange'})).statusCode,404,
  'Com flag desligada nao existe rota');
}finally{await inactive.close();}

const app=Fastify({logger:false,bodyLimit:2048});
let ownerId='',otherId='',workspaceId='',sessionId='';
try{
 await app.register(fastifyJwt,{secret:'stage10-synthetic-jwt-key-not-production-32-characters'});
 app.decorate('authenticate',async(request,reply)=>{
  try{await request.jwtVerify();}catch{return reply.status(401).send({error:'UNAUTHORIZED'});}
 });
 await app.register(async scope=>{
  await registerStage10QaExchangeRoutes(scope,runtime);
 },{prefix:'/auth'});
 await app.ready();

 const owner=await prisma.user.create({data:{name:'Synthetic exchange owner',
  email:suffix+'-owner@example.invalid',role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true}});
 const other=await prisma.user.create({data:{name:'Synthetic exchange outsider',
  email:suffix+'-other@example.invalid',role:UserRole.VIEWER,status:UserStatus.ACTIVE,isActive:true}});
 ownerId=owner.id;otherId=other.id;
 const workspace=await prisma.workspace.create({data:{
  name:'Synthetic exchange workspace',slug:suffix,ownerId}});
 workspaceId=workspace.id;
 await prisma.workspaceMember.create({data:{userId:ownerId,workspaceId,
  status:UserStatus.ACTIVE,isActive:true,role:UserRole.ADMIN}});
 const session=await prisma.authSession.create({data:{
  userId:ownerId,tokenHash,expiresAt:new Date(Date.now()+3600000)}});
 sessionId=session.id;
 const bearer=app.jwt.sign({sub:ownerId,role:'ADMIN',email:owner.email},{expiresIn:'5m'});
 const anotherBearer=app.jwt.sign({sub:otherId,role:'VIEWER',email:other.email},{expiresIn:'5m'});
 const wrongRole=app.jwt.sign({sub:ownerId,role:'VIEWER',email:owner.email},{expiresIn:'5m'});
 const post=async(token:string,proof:string=refreshToken,requestOrigin:string|null=origin)=>
   app.inject({method:'POST',url:'/auth/stage10-qa/exchange',
    headers:{...(requestOrigin?{origin:requestOrigin}:{}),
     authorization:'Bearer '+token,'content-type':'application/json'},
    payload:{refreshToken:proof}});
 const countBefore=await prisma.authSession.count({where:{userId:ownerId}});
 const ok=await post(bearer);
 assert.equal(ok.statusCode,200,ok.body);
 assert.match(ok.headers['cache-control']??'',/no-store/);
 const body=ok.json();
 assert.equal(body.kind,'stage10-qa-read-token-v1');
 assert.equal(body.canWrite,false);
 assert.equal(body.actorId,ownerId);
 const claims=verifyStage10PublicJwt(body.accessToken,pair.publicKey,{
  issuer,audience,nowSeconds:now});
 assert.equal(claims.sub,ownerId);
 assert.equal(claims.sid,sessionId);
 assert.equal(claims.wid,workspaceId);
 assert.equal(body.expiresAt,claims.exp);
 assert.equal(await prisma.authSession.count({where:{userId:ownerId}}),countBefore,
  'Troca nao pode consumir ou recriar sessao');
 assert.equal((await post('invalid.jwt.token')).statusCode,401,'HMAC sem assinatura');
 assert.equal((await post(anotherBearer)).statusCode,403,'refresh de outro usuario');
 assert.equal((await post(wrongRole)).statusCode,403,'JWT role divergente do usuario');
 assert.equal((await post(bearer,refreshToken,'https://other.example.invalid')).statusCode,403);
 assert.equal((await post(bearer,refreshToken,null)).statusCode,403);
 assert.equal((await post(bearer,'wrong-opaque-proof-twenty-characters-123')).statusCode,403);
 const missing=await app.inject({method:'POST',url:'/auth/stage10-qa/exchange',
  headers:{origin,authorization:'Bearer '+bearer,'content-type':'application/json'},
  payload:{refreshToken:'short'}});
 assert.equal(missing.statusCode,400);
 // Em todos os casos, a rota nao deve modificar valores de fundos nem sessions.
 await prisma.authSession.update({where:{id:sessionId},data:{revokedAt:new Date()}});
 assert.equal((await post(bearer)).statusCode,403,'Logout revoga novas trocas');
 await prisma.authSession.update({where:{id:sessionId},
  data:{revokedAt:null,expiresAt:new Date(Date.now()-1000)}});
 assert.equal((await post(bearer)).statusCode,403,'Expiracao da sessao');
 await prisma.authSession.update({where:{id:sessionId},
  data:{expiresAt:new Date(Date.now()+3600000)}});
 await prisma.workspaceMember.update({where:{workspaceId_userId:{workspaceId,userId:ownerId}},
  data:{isActive:false}});
 assert.equal((await post(bearer)).statusCode,403,'Membership bloqueado');
 await prisma.workspaceMember.update({where:{workspaceId_userId:{workspaceId,userId:ownerId}},
  data:{isActive:true}});
 await prisma.user.update({where:{id:ownerId},data:{isActive:false}});
 assert.equal((await post(bearer)).statusCode,403,'Usuario bloqueado');
 assert.equal(await prisma.authSession.count({where:{userId:ownerId}}),countBefore);
 console.log('STAGE10_CANONICAL_QA_EXCHANGE_POSTGRES17_NO_WRITES PASS');
}finally{
 await app.close();
 // Fixtures descartadas com container PG17. Nada se conecta a producao.
 await prisma.$disconnect();
}
