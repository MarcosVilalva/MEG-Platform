import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {test} from 'node:test';
import {setTimeout as sleep} from 'node:timers/promises';

async function temporaryPort(){
 const s=createServer();
 s.listen(0,'127.0.0.1');
 await once(s,'listening');
 const port=s.address().port;
 s.close();
 await once(s,'close');
 return port;
}
const upstreamPort=await temporaryPort();
const gatewayPort=await temporaryPort();
let apiCalls=[];
const backend=createServer(async(req,res)=>{
 let body='';
 for await(const part of req)body+=part.toString();
 apiCalls.push({method:req.method,url:req.url,body,authorization:req.headers.authorization});
 res.setHeader('Content-Type','application/json');
 if(req.url==='/ready')return res.end(JSON.stringify({status:'ready'}));
 if(req.url==='/auth/login'&&req.method==='POST')return res.end(JSON.stringify({user:{id:'test',name:'Tester'},accessToken:'test-token'}));
 if(req.url?.startsWith('/finance/events')){
  if(!req.headers.authorization){res.writeHead(401);return res.end(JSON.stringify({error:'UNAUTHORIZED'}))}
  return res.end(JSON.stringify({items:[],page:1,pageSize:100,total:0}));
 }
 res.writeHead(404);res.end(JSON.stringify({error:'NOT_FOUND'}));
});
backend.listen(upstreamPort,'127.0.0.1');
await once(backend,'listening');
const previewOrigin='http://127.0.0.1:'+gatewayPort;
const proc=spawn(process.execPath,['scripts/meg-stage09-readonly-gateway.mjs'],{
 cwd:process.cwd(),env:{...process.env,NODE_ENV:'test',
  MEG_STAGE09_UPSTREAM_API:'http://127.0.0.1:'+upstreamPort,PORT:String(gatewayPort)},
 stdio:['ignore','pipe','pipe'],
});
let output='';
proc.stderr.on('data',d=>{output+=String(d)});
proc.stdout.on('data',d=>{output+=String(d)});
let attempts=0;
while(attempts++<60){
 if(proc.exitCode!==null)throw new Error('Gateway exited: '+output);
 try{const res=await fetch(previewOrigin+'/health');if(res.ok)break;}catch{}
 await sleep(100);
}
try{
 await test('Gateway publica apenas entrada autenticada, sem tela legacy',async()=>{
  const html=await fetch(previewOrigin+'/web-evolution.html');
  assert.equal(html.status,200);
  assert.match(await html.text(),/meg-web-evolution-root/);
  const legacy=await fetch(previewOrigin+'/phoenix.html');
  assert.equal(legacy.status,404);
 });
 await test('Gateway não produz demonstração e exige Bearer real',async()=>{
  const unauth=await fetch(previewOrigin+'/finance/events?page=1&pageSize=100');
  assert.equal(unauth.status,401);
  const auth=await fetch(previewOrigin+'/finance/events?page=1&pageSize=100',{
   headers:{Authorization:'Bearer test-token'}
  });
  assert.equal(auth.status,200);
  assert.deepEqual(await auth.json(),{items:[],page:1,pageSize:100,total:0});
  assert.equal(auth.headers.get('cache-control'),'private, no-store, max-age=0');
 });
 await test('Autenticação existente pode iniciar sessão; nenhum cadastro ou writer',async()=>{
  const signIn=await fetch(previewOrigin+'/auth/login',{
   method:'POST',
   headers:{'Content-Type':'application/json',Origin:previewOrigin},
   body:JSON.stringify({email:'teste@meg.invalid',password:'segredo-ficticio'}),
  });
  assert.equal(signIn.status,200);
  const deny=await fetch(previewOrigin+'/finance/events',{
   method:'POST',
   headers:{'Content-Type':'application/json',Origin:previewOrigin},
   body:JSON.stringify({type:'income',amount:100}),
  });
  assert.equal(deny.status,405);
  assert.equal((await deny.json()).error,'FINANCIAL_WRITES_DISABLED_IN_STAGE09');
  const denyRegister=await fetch(previewOrigin+'/auth/register',{
   method:'POST',headers:{'Content-Type':'application/json',Origin:previewOrigin},
   body:JSON.stringify({email:'teste@meg.invalid'}),
  });
  assert.equal(denyRegister.status,405);
  const csrf=await fetch(previewOrigin+'/auth/login',{
   method:'POST',
   headers:{'Content-Type':'application/json',Origin:'https://example.org'},
   body:'{}',
  });
  assert.equal(csrf.status,403);
  assert.equal(apiCalls.filter(c=>c.method==='POST'&&c.url!=='/auth/login').length,0);
 });
 await test('Saúde confirma o upstream real sem divulgar conteúdo protegido',async()=>{
  const response=await fetch(previewOrigin+'/gateway-status');
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),{status:'ready',mode:'finance-read-only-preview'});
  assert.equal((await fetch(previewOrigin+'/auth/me',{method:'PATCH'})).status,405);
 });
}finally{
 proc.kill('SIGTERM');
 await new Promise(done=>backend.close(done));
}
