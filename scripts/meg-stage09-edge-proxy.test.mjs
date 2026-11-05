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
