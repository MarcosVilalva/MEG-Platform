import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';

const owner={id:'owner-ci',email:'owner@ci.invalid',name:'CI Owner',role:'ADMIN',status:'ACTIVE',isActive:true};
const outsider={...owner,id:'outsider-ci',email:'outsider@ci.invalid'};
const calls=[];
const fake=http.createServer(async(req,res)=>{
 let body='';
 for await(const chunk of req)body+=chunk;
 calls.push({method:req.method,url:req.url,origin:req.headers.origin??null,authorization:req.headers.authorization??null});
 res.setHeader('Content-Type','application/json');
 if(req.url==='/auth/me'){
  if(req.headers.authorization==='Bearer owner-token'){
   res.end(JSON.stringify({user:owner}));return;
  }
  if(req.headers.authorization==='Bearer outsider-token'){
   res.end(JSON.stringify({user:outsider}));return;
  }
  res.writeHead(401);res.end(JSON.stringify({error:'UNAUTHORIZED'}));return;
 }
 if(req.url==='/auth/login'&&req.method==='POST'){
  const input=JSON.parse(body);
  if(input.email!==owner.email){res.writeHead(401);res.end(JSON.stringify({error:'INVALID_CREDENTIALS'}));return;}
  res.end(JSON.stringify({user:owner,accessToken:'owner-token',refreshToken:'ci-refresh-token',refreshExpiresAt:'2099-01-01'}));return;
 }
 if(req.url==='/auth/refresh'&&req.method==='POST'){
  res.end(JSON.stringify({user:owner,accessToken:'owner-token',refreshToken:'ci-new-refresh-token',refreshExpiresAt:'2099-01-01'}));return;
 }
 if(req.url==='/auth/logout'&&req.method==='POST'){
  res.end(JSON.stringify({ok:true}));return;
 }
 if(req.url?.startsWith('/finance/accounts')&&req.method==='GET'){
  res.end(JSON.stringify([{id:'ci-account',name:'Synthetic account',type:'checking'}]));return;
 }
 if(req.url==='/cards?month=2026-11'&&req.method==='GET'){
  res.end(JSON.stringify([{id:'ci-card',name:'Synthetic card'}]));return;
 }
 res.writeHead(404);res.end(JSON.stringify({error:'UNKNOWN_ROUTE'}));
});
try{
 fake.listen(0,'127.0.0.1');await once(fake,'listening');
 const address=fake.address();
 assert(address&&typeof address!=='string');
 process.env.NODE_ENV='test';
 process.env.MEG_STAGE10_PROXY_TEST='1';
 process.env.MEG_STAGE10_PROXY_NO_LISTEN='1';
 process.env.MEG_STAGE10_TEST_UPSTREAM='http://127.0.0.1:'+address.port;
 process.env.MEG_PREVIEW_ALLOWED_EMAIL=owner.email;
 process.env.MEG_PREVIEW_ORIGIN='http://ci-preview.local';
 process.env.PORT='4176';
 const {server}=await import('./meg-stage10-prism-read-preview-server.mjs');
 try{
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const gateway=server.address();
  assert(gateway&&typeof gateway!=='string');
  const base='http://127.0.0.1:'+gateway.port;
  const read=(path,token)=>fetch(base+path,{
   headers:token?{Authorization:'Bearer '+token}:{}
  });
  const post=(path,body,origin='http://ci-preview.local')=>fetch(base+path,{
   method:'POST',
   headers:{Origin:origin,'Content-Type':'application/json'},
   body:JSON.stringify(body)
  });
  let response=await read('/health');assert.equal(response.status,200);
  response=await read('/finance/accounts');assert.equal(response.status,401);
  assert.equal(calls.length,0,'Unauthorized API must not be proxied');
  response=await post('/finance/accounts',{});assert.equal(response.status,405);
  assert.equal(calls.length,0,'Financial POST must not reach upstream');
  response=await read('/finance/accounts','owner-token');assert.equal(response.status,200);
  assert.equal((await response.json())[0].id,'ci-account');
  assert.deepEqual(calls.map(x=>x.url),['/auth/me','/finance/accounts']);
  assert.equal(calls.some(x=>x.origin!==null),false,'No Origin headers sent to existing API');
  const beforeOutsider=calls.filter(x=>x.url==='/finance/accounts').length;
  response=await read('/finance/accounts','outsider-token');assert.equal(response.status,403);
  assert.equal(calls.filter(x=>x.url==='/finance/accounts').length,beforeOutsider);
  response=await read('/finance/accounts','not-a-token');assert.equal(response.status,401);
  response=await read('/cards?month=2026-11','owner-token');assert.equal(response.status,200);
  assert.equal((await response.json())[0].id,'ci-card');
  response=await read('/finance/unlisted','owner-token');assert.equal(response.status,404);
  response=await post('/auth/login',{email:outsider.email,password:'synthetic'});
  assert.equal(response.status,403);
  response=await post('/auth/login',{email:owner.email,password:'synthetic'},'http://evil.invalid');
  assert.equal(response.status,403);
  response=await post('/auth/login',{email:owner.email,password:'synthetic'});
  assert.equal(response.status,200);
  assert.equal((await response.json()).accessToken,'owner-token');
  response=await post('/auth/refresh',{refreshToken:'ci-refresh-token'});
  assert.equal(response.status,200);
  assert.equal((await response.json()).user.id,owner.id);
  response=await post('/auth/logout',{refreshToken:'ci-new-refresh-token'});
  assert.equal(response.status,200);
  response=await read('/web-evolution.html');assert.equal(response.status,200);
  assert.match(await response.text(),/meg-web-evolution-root/);
  response=await read('/meg-web-evolution/visual-loading/logo-meg-oficial-recortada.webp');assert.equal(response.status,200);
  assert.equal(response.headers.get('content-type'),'image/webp');
  response=await read('/meg-web-evolution/fonts/InterVariable.woff2');assert.equal(response.status,200);
  assert.equal(response.headers.get('content-type'),'font/woff2');
  response=await read('/meg-unificado-qa.html');assert.equal(response.status,404);
  response=await read('/.env');assert.equal(response.status,404);
  assert.ok(calls.every(x=>x.origin===null),'Proxy must never forward browser Origin');
  assert.ok(calls.filter(x=>x.method==='POST').every(x=>x.url.startsWith('/auth/')),'No financial writes');
  console.log('MEG_STAGE10_PREVIEW_GATEWAY_AUTH_SCOPE_READ_ONLY_PASS');
 }finally{await new Promise(resolve=>server.close(resolve));}
}finally{await new Promise(resolve=>fake.close(resolve));}
