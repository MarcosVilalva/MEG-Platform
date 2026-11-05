import assert from 'node:assert/strict';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { isAllowedOrigin, isStage09PreviewRequestAllowed, stage09PreviewOrigin } from './cors';

const webOrigins = ['https://marcosvilalva.github.io'];

assert.equal(isAllowedOrigin(undefined, webOrigins), true);
assert.equal(isAllowedOrigin('https://marcosvilalva.github.io', webOrigins), true);
assert.equal(isAllowedOrigin('https://localhost', webOrigins), true);
assert.equal(isAllowedOrigin('capacitor://localhost', webOrigins), true);
assert.equal(isAllowedOrigin(stage09PreviewOrigin, webOrigins), true);
assert.equal(isAllowedOrigin(stage09PreviewOrigin + '.evil.example', webOrigins), false);
assert.equal(isAllowedOrigin('https://site-malicioso.example', webOrigins), false);

assert.equal(isStage09PreviewRequestAllowed(stage09PreviewOrigin,'GET','/finance/events?page=1'),true);
assert.equal(isStage09PreviewRequestAllowed(stage09PreviewOrigin,'GET','/finance/summary?month=2026-11'),true);
assert.equal(isStage09PreviewRequestAllowed(stage09PreviewOrigin,'GET','/auth/me'),true);
assert.equal(isStage09PreviewRequestAllowed(stage09PreviewOrigin,'POST','/auth/login'),true);
assert.equal(isStage09PreviewRequestAllowed(stage09PreviewOrigin,'POST','/auth/refresh'),true);
assert.equal(isStage09PreviewRequestAllowed(stage09PreviewOrigin,'POST','/auth/logout'),true);
assert.equal(isStage09PreviewRequestAllowed(stage09PreviewOrigin,'OPTIONS','/finance/events'),true);
assert.equal(isStage09PreviewRequestAllowed(stage09PreviewOrigin,'POST','/finance/events'),false);
assert.equal(isStage09PreviewRequestAllowed(stage09PreviewOrigin,'PATCH','/finance/events/id'),false);
assert.equal(isStage09PreviewRequestAllowed(stage09PreviewOrigin,'DELETE','/finance/events/id'),false);
assert.equal(isStage09PreviewRequestAllowed(stage09PreviewOrigin,'POST','/finance/transfers'),false);
assert.equal(isStage09PreviewRequestAllowed(stage09PreviewOrigin,'POST','/auth/register'),false);
assert.equal(isStage09PreviewRequestAllowed(stage09PreviewOrigin,'GET','/platform-admin/users'),false);
assert.equal(isStage09PreviewRequestAllowed('https://marcosvilalva.github.io','POST','/finance/events'),true);
assert.equal(isStage09PreviewRequestAllowed(undefined,'POST','/finance/events'),true);

// Exercita o mesmo onRequest + @fastify/cors usados no servidor da API,
// sem banco, login real, escrita ou qualquer informação financeira.
const app=Fastify({logger:false});
app.addHook('onRequest',async(request,reply)=>{
 if(!isStage09PreviewRequestAllowed(request.headers.origin,request.method,request.url))
  return reply.code(405).send({error:'STAGE09_PREVIEW_READ_ONLY'});
});
await app.register(cors,{
 origin(origin,callback){
  if(isAllowedOrigin(origin,webOrigins))callback(null,true);
  else callback(new Error('Origin not allowed by CORS'),false);
 },
 credentials:true,
});
app.get('/finance/events',async()=>({read:true}));
app.post('/finance/events',async()=>({write:true}));
app.post('/auth/login',async()=>({session:true}));

const headers={origin:stage09PreviewOrigin};
const preflight=await app.inject({
 method:'OPTIONS',url:'/finance/events',
 headers:{...headers,'access-control-request-method':'GET'},
});
assert.equal(preflight.statusCode,204);
assert.equal(preflight.headers['access-control-allow-origin'],stage09PreviewOrigin);

const read=await app.inject({method:'GET',url:'/finance/events?page=1',headers});
assert.equal(read.statusCode,200);
assert.equal(read.json().read,true);
const denied=await app.inject({method:'POST',url:'/finance/events',headers});
assert.equal(denied.statusCode,405);
assert.equal(denied.json().error,'STAGE09_PREVIEW_READ_ONLY');
const session=await app.inject({method:'POST',url:'/auth/login',headers});
assert.equal(session.statusCode,200);
const production=await app.inject({method:'POST',url:'/finance/events',
 headers:{origin:'https://marcosvilalva.github.io'}});
assert.equal(production.statusCode,200);
await app.close();

console.log('MEG CORS tests passed.');
