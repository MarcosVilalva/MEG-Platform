import assert from 'node:assert/strict';
import {generateKeyPairSync,sign as signBytes,createHmac} from 'node:crypto';
import {prisma,PrismaClient,UserRole,UserStatus} from '@meg/database';
import {createStage10ReadOnlyApp} from '../../stage10-readonly-app';
import {assertStage10ReadOnlyDatabaseRole} from '../../stage10-readonly-db-guard';
import {withStage10ReadOnlyWorkspace} from './stage10-readonly-workspace';

/**
 * HTTP/JWT/PostgreSQL 17 descartavel da Etapa 10.
 * Nunca executar com DATABASE_URL de producao.
 * O workflow injeta uma URL exclusiva local e nao exporta dados reais.
 */
const dbUrl=process.env.DATABASE_URL||'';
if(process.env.MEG_STAGE10_SYNTHETIC_DB!=='true'
 || !/^postgresql:\/\/meg_test:meg_test@127\.0\.0\.1:5439\/meg_stage10_test(?:\?|$)/.test(dbUrl))
 throw new Error('STAGE10_SYNTHETIC_DATABASE_REQUIRED');

const previewOrigin='https://meg-stage08-alerta-prism-pr685.onrender.com';
const issuer='https://stage10-issuer.example.invalid';
const audience='stage10-finance-reader';
const rsa=generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{
 type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});
const otherRsa=generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{
 type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});
const jwtConfig={publicKeyPem:rsa.publicKey,issuer,audience};
const now=Math.floor(Date.now()/1000);
function signToken(sub:string,role:string='VIEWER',options:{
 exp?:number;iat?:number;scope?:string;aud?:string;iss?:string;sid?:string;
 privateKey?:string;alg?:string;
}={}){
 const header={alg:options.alg||'RS256',typ:'JWT'};
 const payload={sub,sid:options.sid??sessions.get(sub),role,
  iss:options.iss||issuer,aud:options.aud||audience,
  scope:options.scope||'stage10:finance:read',iat:options.iat??now,
  exp:options.exp??now+300};
 const a=Buffer.from(JSON.stringify(header)).toString('base64url');
 const b=Buffer.from(JSON.stringify(payload)).toString('base64url');
 const input=a+'.'+b;
 const signature=header.alg==='HS256'
  ?createHmac('sha256','synthetic-legacy-hmac').update(input).digest('base64url')
  :signBytes('RSA-SHA256',Buffer.from(input),options.privateKey||rsa.privateKey).toString('base64url');
 return input+'.'+signature;
}
await assert.rejects(createStage10ReadOnlyApp(previewOrigin,{
 publicKeyPem:'',issuer,audience,
}),/STAGE10_PUBLIC_JWT_CONFIGURATION_REQUIRED/);
await assert.rejects(createStage10ReadOnlyApp(previewOrigin,{
 publicKeyPem:'not-a-public-key',issuer,audience,
}),/STAGE10_PUBLIC_JWT_KEY_INVALID/);
const server=await createStage10ReadOnlyApp(previewOrigin,jwtConfig);
const suffix='stage10-'+process.pid;
const accountId='acct-'+suffix;
const secondAccountId='acct-b-'+suffix;
let ownerId='',otherId='',workspaceId='',otherWorkspaceId='';
const sessions=new Map<string,string>();
async function makeSession(userId:string){
 const session=await prisma.authSession.create({data:{
  userId,tokenHash:'stage10-synthetic-'+suffix+'-'+userId,
  expiresAt:new Date(Date.now()+3600000),
 }});
 sessions.set(userId,session.id);
 return session;
}
try{
 await server.ready();
 const health=await server.inject({method:'GET',url:'/health'});
 assert.equal(health.statusCode,200);
 assert.equal(health.json().mode,'stage10-readonly');
 for(const url of ['/auth/login','/auth/refresh','/auth/register','/finance/events','/finance/transfers']){
  const forbidden=await server.inject({method:'POST',url,
   payload:{email:'test@example.invalid',password:'synthetic-password'}});
  assert.equal(forbidden.statusCode,404,'Rota de escrita nao registrada: '+url);
 }


 const owner=await prisma.user.create({data:{
  name:'Fixture Owner A',email:suffix+'-a@example.invalid',
  role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true,
 }});
 const other=await prisma.user.create({data:{
  name:'Fixture Owner B',email:suffix+'-b@example.invalid',
  role:UserRole.VIEWER,status:UserStatus.ACTIVE,isActive:true,
 }});
 ownerId=owner.id;otherId=other.id;
 const workspace=await prisma.workspace.create({data:{
  name:'Fixture Workspace A',slug:suffix+'-a',ownerId,
 }});
 const otherWorkspace=await prisma.workspace.create({data:{
  name:'Fixture Workspace B',slug:suffix+'-b',ownerId:otherId,
 }});
 workspaceId=workspace.id;otherWorkspaceId=otherWorkspace.id;
 const ownerSession=await makeSession(ownerId);
 const otherSession=await makeSession(otherId);
 await prisma.workspaceMember.createMany({data:[
  {workspaceId,userId:ownerId,role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true},
  {workspaceId:otherWorkspaceId,userId:otherId,role:UserRole.VIEWER,status:UserStatus.ACTIVE,isActive:true},
 ]});
 const account=await prisma.account.create({data:{
  id:accountId,userId:ownerId,name:'Fixture Conta A',type:'checking',openingBalance:'0',
 }});
 const category=await prisma.category.create({data:{
  userId:ownerId,name:'Fixture Categoria A',type:'expense',
 }});
 const method=await prisma.paymentMethod.create({data:{
  userId:ownerId,name:'Fixture PIX A',type:'ordinary',
 }});
 const original=await prisma.financialEvent.create({data:{
  userId:ownerId,workspaceId,description:'Despesa sintetica A',
  type:'expense',status:'paid',date:new Date('2026-11-10T12:00:00Z'),
  competence:'2026-11',amount:'10.50',signedAmount:'-10.50',
  accountId:account.id,categoryId:category.id,paymentMethodId:method.id,
  sourcePayload:{'GRUPO':'Grupo historico','FORMA DE PAGAMENTO':'PIX historico',
   'CATEGORY':'Categoria antiga','secretaChaveTecnica':'DO_NOT_EXPOSE_SYNTHETIC_SECRET',
   'nested':{'token':'NESTED_DO_NOT_EXPOSE'}},
 }});
 const foreign=await prisma.financialEvent.create({data:{
  userId:otherId,workspaceId:otherWorkspaceId,description:'Despesa sintetica B',
  type:'expense',status:'planned',date:new Date('2026-11-11T12:00:00Z'),
  competence:'2026-11',amount:'20',signedAmount:'-20',
 }});
 const tokenA=signToken(ownerId,'ADMIN');
 const tokenB=signToken(otherId);
 const endpoint='/finance/stage10-readonly/snapshot?month=2026-11';
 const get=(token?:string,url=endpoint)=>server.inject({
  method:'GET',url,headers:token?{authorization:'Bearer '+token}:{},
 });

 const allowedPreflight=await server.inject({
  method:'OPTIONS',url:endpoint,
  headers:{origin:previewOrigin,'access-control-request-method':'GET',
   'access-control-request-headers':'authorization'},
 });
 assert.equal(allowedPreflight.statusCode,204,'origem unica deve aceitar preflight');
 assert.equal(allowedPreflight.headers['access-control-allow-origin'],previewOrigin);
 const deniedPreflight=await server.inject({
  method:'OPTIONS',url:endpoint,
  headers:{origin:'https://other-origin.example.invalid',
   'access-control-request-method':'GET',
   'access-control-request-headers':'authorization'},
 });
 assert.notEqual(deniedPreflight.headers['access-control-allow-origin'],
  'https://other-origin.example.invalid','CORS nao pode autorizar origem divergente');
 const unauthenticated=await get();
 assert.equal((await get(signToken(ownerId,'ADMIN',{sid:''}))).statusCode,401,
  'token QA sem sid deve ser recusado');
 assert.equal((await get(signToken(ownerId,'ADMIN',{sid:otherSession.id}))).statusCode,403,
  'sessao pertence a outro usuario');
 assert.equal(unauthenticated.statusCode,401,'sem JWT deve ser recusado');

 const invalidSignature=await get(signToken(ownerId,'ADMIN',{privateKey:otherRsa.privateKey}));
 assert.equal(invalidSignature.statusCode,401,'assinatura de outro emissor');
 assert.equal((await get(signToken(ownerId,'ADMIN',{alg:'HS256'}))).statusCode,401,
  'JWT HMAC legado nao pode acessar a API QA');
 assert.equal((await get(signToken(ownerId,'ADMIN',{scope:'finance:write'}))).statusCode,401,
  'scope de escrita deve ser recusado');
 assert.equal((await get(signToken(ownerId,'ADMIN',{aud:'another-app'}))).statusCode,401,
  'audience de outro servico');
 assert.equal((await get(signToken(ownerId,'ADMIN',{iss:'https://unknown.invalid'}))).statusCode,401,
  'emissor nao autorizado');
 assert.equal((await get(signToken(ownerId,'ADMIN',{exp:now-10,iat:now-300}))).statusCode,401,
  'JWT expirado');
 assert.equal((await get(signToken(ownerId,'UNKNOWN'))).statusCode,401,
  'perfil desconhecido deve ser recusado');

 const invalidMonth=await get(tokenA,'/finance/stage10-readonly/snapshot?month=2026-13');
 assert.equal(invalidMonth.statusCode,400,'periodo invalido deve ser recusado');
 const me=await server.inject({method:'GET',url:'/auth/me',headers:{authorization:'Bearer '+tokenA}});
 assert.equal(me.statusCode,200);
 assert.equal(me.json().user.id,ownerId);
 assert.ok(!me.body.includes('passwordHash'));
 const response=await get(tokenA);
 assert.equal(response.statusCode,200,response.body.slice(0,500));
 const payload=response.json();
 assert.equal(payload.kind,'stage10-financial-readonly-snapshot-v1');
 assert.equal(payload.canWrite,false);
 assert.equal(payload.consistency,'repeatable-read');
 assert.equal(payload.actorId,ownerId);
 assert.equal(payload.workspaceId,workspaceId);
 assert.equal(payload.dataOwnerId,ownerId);
 assert.equal(payload.total,1);
 assert.deepEqual(payload.events.map((e:{id:string})=>e.id),[original.id]);
 assert.equal(payload.events[0].paymentMethod.name,'Fixture PIX A');
 assert.equal(payload.events[0].sourceDetails.group,'Grupo historico');
 assert.equal(payload.events[0].sourceDetails.paymentMethod,'PIX historico');
 assert.deepEqual(payload.events[0].sourcePayload,{category:'Categoria antiga',paymentMethod:'PIX historico'});
 assert.ok(!response.body.includes('DO_NOT_EXPOSE_SYNTHETIC_SECRET'));
 assert.ok(!response.body.includes('NESTED_DO_NOT_EXPOSE'));
 assert.ok(!response.body.includes('secretaChaveTecnica'));

 assert.equal(payload.summary.month,'2026-11');
 assert.equal(payload.cashflow.month,'2026-11');
 assert.equal(response.headers['cache-control'],'private, no-store');
 assert.ok(!response.body.includes('Despesa sintetica B'));
 // Um token QA ja emitido nao deve passar na proxima transacao apos logout.
 await prisma.authSession.update({where:{id:ownerSession.id},
  data:{revokedAt:new Date()}});
 assert.equal((await get(tokenA)).statusCode,403,'sessao revogada bloqueia token QA');
 await prisma.authSession.update({where:{id:ownerSession.id},
  data:{revokedAt:null,expiresAt:new Date(Date.now()-1000)}});
 assert.equal((await get(tokenA)).statusCode,403,'sessao expirada bloqueia QA');
 await prisma.authSession.update({where:{id:ownerSession.id},
  data:{expiresAt:new Date(Date.now()+3600000)}});
 assert.equal((await get(tokenA)).statusCode,200,'sessao revalidada no banco');

 const foreignResponse=await get(tokenB);
 assert.equal(foreignResponse.statusCode,200,foreignResponse.body.slice(0,500));
 const foreignPayload=foreignResponse.json();
 assert.equal(foreignPayload.workspaceId,otherWorkspaceId);
 assert.equal(foreignPayload.total,1);
 assert.equal(foreignPayload.events[0].id,foreign.id);
 assert.ok(!foreignResponse.body.includes('Despesa sintetica A'));

 // Um membro de workspace ativo enxerga a base do proprietario,
 // mas nao a base de outro workspace. Role vem do JWT; membership, do banco.
 const shared=await prisma.user.create({data:{
  name:'Fixture Workspace Member',email:suffix+'-shared@example.invalid',
  role:UserRole.VIEWER,status:UserStatus.ACTIVE,isActive:true,
 }});
 const sharedMember=await prisma.workspaceMember.create({data:{
  workspaceId,userId:shared.id,role:UserRole.VIEWER,
  status:UserStatus.ACTIVE,isActive:true,
 }});
 await makeSession(shared.id);
 const sharedToken=signToken(shared.id);
 const sharedMe=await server.inject({method:'GET',url:'/auth/me',headers:{authorization:'Bearer '+sharedToken}});
 assert.equal(sharedMe.statusCode,200);
 assert.equal(sharedMe.json().user.id,shared.id);
 const sharedResponse=await get(sharedToken);
 assert.equal(sharedResponse.statusCode,200,sharedResponse.body.slice(0,500));
 assert.equal(sharedResponse.json().actorId,shared.id);
 assert.equal(sharedResponse.json().dataOwnerId,ownerId);
 assert.equal(sharedResponse.json().workspaceId,workspaceId);
 assert.deepEqual(sharedResponse.json().events.map((e:{id:string})=>e.id),[original.id]);
 assert.ok(!sharedResponse.body.includes('Despesa sintetica B'));
 await prisma.workspaceMember.update({where:{id:sharedMember.id},data:{isActive:false}});
 const sharedDenied=await get(sharedToken);
 assert.equal(sharedDenied.statusCode,403,'membro com vinculo revogado recebe 403');
 assert.ok(!sharedDenied.body.includes('Despesa sintetica A'));
 const outsider=await prisma.user.create({data:{
  name:'Fixture Without Membership',email:suffix+'-outsider@example.invalid',
  role:UserRole.VIEWER,status:UserStatus.ACTIVE,isActive:true,
 }});
 await makeSession(outsider.id);
 const outsiderResponse=await get(signToken(outsider.id));
 assert.equal(outsiderResponse.statusCode,403,'sem membership deve falhar fechado');
 assert.ok(!outsiderResponse.body.includes('Despesa sintetica A'));

 await assert.rejects(
  withStage10ReadOnlyWorkspace(ownerId,async tx=>{
   await tx.account.create({data:{
    userId:ownerId,name:'Prohibited insert',type:'checking',
   }});
  }),
  'PostgreSQL deve recusar a tentativa de INSERT em transacao READ ONLY',
 );
 assert.equal(await prisma.account.count({where:{name:'Prohibited insert'}}),0);
 assert.equal(await prisma.financialEvent.count({where:{workspaceId}}),1);

 const inactive=await prisma.user.create({data:{
  name:'Fixture Inactive',email:suffix+'-inactive@example.invalid',
  role:UserRole.VIEWER,status:UserStatus.ACTIVE,isActive:false,
 }});
 await makeSession(inactive.id);
 const denied=await get(signToken(inactive.id));
 assert.equal(denied.statusCode,403,'ator inativo nao pode acessar dados');
 assert.ok(!denied.body.includes('Despesa sintetica A'));

 // Um evento com ownership divergente jamais pode ser agregado ao
 // resumo financeiro canonico que ainda opera pelo userId.
 const misplaced=await prisma.financialEvent.create({data:{
  userId:ownerId,workspaceId:otherWorkspaceId,
  description:'Fixture de escopo divergente',type:'expense',status:'planned',
  date:new Date('2026-11-12T12:00:00Z'),competence:'2026-11',
  amount:'30',signedAmount:'-30',
 }});
 const mixed=await get(tokenA);
 assert.equal(mixed.statusCode,409,'escopo misto deve falhar fechado');
 assert.equal(mixed.json().error,'STAGE10_WORKSPACE_FINANCIAL_SCOPE_NOT_EXCLUSIVE');
 assert.ok(!mixed.body.includes('Despesa sintetica A'));
 await prisma.financialEvent.delete({where:{id:misplaced.id}});

 // A resposta nao deve truncar o historico: excedeu o limite,
 // devolve somente um aviso seguro, sem eventos ou resumo parcial.
 const extraEvents=Array.from({length:5000},(_,index)=>({
  userId:ownerId,workspaceId,description:'Fixture volume '+index,
  type:'expense',status:'planned',date:new Date('2026-11-13T12:00:00Z'),
  competence:'2026-11',amount:'1',signedAmount:'-1',
 }));
 // Caracterizacao do volume ativo observado na base real (3.731),
 // mas usando somente linhas sinteticas no container CI.
 for(let index=0;index<3730;index+=500){
  await prisma.financialEvent.createMany({data:extraEvents.slice(index,Math.min(index+500,3730))});
 }
 const fullVolume=await get(tokenA);
 assert.equal(fullVolume.statusCode,200,fullVolume.body.slice(0,500));
 const fullVolumePayload=fullVolume.json();
 assert.equal(fullVolumePayload.kind,'stage10-financial-readonly-snapshot-v1');
 assert.equal(fullVolumePayload.total,3731);
 assert.equal(fullVolumePayload.events.length,3731);
 assert.equal(new Set(fullVolumePayload.events.map((event:{id:string})=>event.id)).size,3731);
 assert.equal(fullVolumePayload.summary.month,'2026-11');
 assert.equal(fullVolumePayload.cashflow.month,'2026-11');
 assert.ok(fullVolume.body.includes('Despesa sintetica A'));
 assert.ok(!fullVolume.body.includes('Despesa sintetica B'));
 for(let index=3730;index<extraEvents.length;index+=500){
  await prisma.financialEvent.createMany({data:extraEvents.slice(index,Math.min(index+500,extraEvents.length))});
 }
 const capped=await get(tokenA);
 assert.equal(capped.statusCode,200,capped.body.slice(0,500));
 assert.deepEqual(capped.json(),{
  kind:'stage10-financial-history-limit-v1',canWrite:false,limit:5000,total:5001,
 });
 assert.ok(!capped.body.includes('Fixture volume'));
 assert.ok(!capped.body.includes('summary'));

 // Provar a barreira de permissao do banco sem qualquer conexao real.
 // A credencial de teste e descartada junto com o container PostgreSQL do CI.
 await assert.rejects(assertStage10ReadOnlyDatabaseRole(prisma),
  /STAGE10_DATABASE_ROLE_NOT_READ_ONLY/);
 // A guarda deve falhar quando o schema ativo parece seguro mas ha
 // grants efetivos de escrita em outro schema, testados no DB descartavel.
 await prisma.$executeRawUnsafe('CREATE SCHEMA meg_stage10_foreign_fixture');
 await prisma.$executeRawUnsafe('CREATE TABLE meg_stage10_foreign_fixture.prohibited_table (id INTEGER)');
 await prisma.$executeRawUnsafe('CREATE SEQUENCE meg_stage10_foreign_fixture.prohibited_sequence');

 await prisma.$executeRawUnsafe("CREATE ROLE meg_stage10_ci_reader LOGIN PASSWORD 'meg_stage10_ci_reader'");
 await prisma.$executeRawUnsafe('REVOKE TEMPORARY ON DATABASE meg_stage10_test FROM PUBLIC');
 await prisma.$executeRawUnsafe('ALTER ROLE meg_stage10_ci_reader SET default_transaction_read_only = on');
 await prisma.$executeRawUnsafe('GRANT CONNECT ON DATABASE meg_stage10_test TO meg_stage10_ci_reader');
 await prisma.$executeRawUnsafe('GRANT USAGE ON SCHEMA public TO meg_stage10_ci_reader');
 await prisma.$executeRawUnsafe('GRANT SELECT ON ALL TABLES IN SCHEMA public TO meg_stage10_ci_reader');
 const reader=new PrismaClient({datasources:{db:{
  url:'postgresql://meg_stage10_ci_reader:meg_stage10_ci_reader@127.0.0.1:5439/meg_stage10_test?schema=public',
 }}});
 try{
  await assertStage10ReadOnlyDatabaseRole(reader);
  await prisma.$executeRawUnsafe('GRANT USAGE ON SCHEMA meg_stage10_foreign_fixture TO meg_stage10_ci_reader');
  await prisma.$executeRawUnsafe('GRANT INSERT ON TABLE meg_stage10_foreign_fixture.prohibited_table TO meg_stage10_ci_reader');
  await assert.rejects(assertStage10ReadOnlyDatabaseRole(reader),
   /STAGE10_DATABASE_ROLE_NOT_READ_ONLY/,'write grant in another schema must block QA startup');
  await prisma.$executeRawUnsafe('REVOKE INSERT ON TABLE meg_stage10_foreign_fixture.prohibited_table FROM meg_stage10_ci_reader');
  await prisma.$executeRawUnsafe('GRANT UPDATE ON SEQUENCE meg_stage10_foreign_fixture.prohibited_sequence TO meg_stage10_ci_reader');
  await assert.rejects(assertStage10ReadOnlyDatabaseRole(reader),
   /STAGE10_DATABASE_ROLE_NOT_READ_ONLY/,'sequence write grant must block QA startup');
  await prisma.$executeRawUnsafe('REVOKE UPDATE ON SEQUENCE meg_stage10_foreign_fixture.prohibited_sequence FROM meg_stage10_ci_reader');
  await assertStage10ReadOnlyDatabaseRole(reader);
  assert.equal(await reader.financialEvent.count({where:{workspaceId}}),5001);
  await assert.rejects(reader.account.create({data:{
   userId:ownerId,name:'Role cannot insert',type:'checking',
  }}),'Role sem INSERT deve impedir escrita mesmo fora da transacao');
 }finally{
  await reader.$disconnect();
 }
 console.log('STAGE10_POSTGRES_JWT_HTTP_READ_ONLY_ISOLATION PASS');
}finally{
 await server.close();
 await prisma.$disconnect();
}
