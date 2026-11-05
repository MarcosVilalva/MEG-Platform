import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createStage09Handler} from '../supabase/functions/meg-stage09-readonly-preview/index.mjs';
const origin='https://meg-lancamentos-09-pr.onrender.com';
const base='https://example.invalid/functions/v1/meg-stage09-readonly-preview';
test('origem e métodos bloqueados',async()=>{
 const calls=[];
 const h=createStage09Handler(async()=>{calls.push(1);return new Response('{}',{status:200})});
 const method=async(path,m)=>h(new Request(base+path,{method:m,headers:{Origin:origin}}));
 assert.equal((await method('/finance/events','OPTIONS')).status,204);
 assert.equal((await method('/finance/events','POST')).status,405);
 assert.equal((await method('/auth/register','POST')).status,405);
 assert.equal((await method('/finance/events','GET')).status,401);
 assert.equal(calls.length,0);
});

test('GET autorizado e origem estranha',async()=>{
 const urls=[];
 const h=createStage09Handler(async(url,options)=>{
  urls.push({url,method:options.method});
  return new Response(JSON.stringify({items:[],total:0}),{status:200});
 });
 const res=await h(new Request(base+'/finance/events?page=1&pageSize=100',{
  headers:{Origin:origin,Authorization:'Bearer example-token'}
 }));
 assert.equal(res.status,200);
 assert.equal(res.headers.get('Cache-Control'),'private, no-store, max-age=0');
 assert.equal(urls.length,1);
 assert.equal(urls[0].method,'GET');
 assert.ok(urls[0].url.endsWith('/finance/events?page=1&pageSize=100'));
 const denied=await h(new Request(base+'/finance/events',{headers:{
  Origin:'https://other.invalid',Authorization:'Bearer example-token'
 }}));
 assert.equal(denied.status,403);
 assert.equal(denied.headers.get('Access-Control-Allow-Origin'),null);
 assert.equal(urls.length,1);
});
