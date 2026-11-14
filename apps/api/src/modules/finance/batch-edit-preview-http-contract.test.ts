import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import Fastify from 'fastify';
import {registerAuth} from '../../plugins/auth';
import {BatchPreviewAccessError} from './batch-edit-preview-adapter';
import {
 registerStage10BatchPreviewReadContract,
} from './batch-edit-preview-http-contract';
import type {BatchPreviewResponse} from './batch-edit-preview-read';

const server=readFileSync(new URL('../../server.ts',import.meta.url),'utf8');
assert.doesNotMatch(server,/batch-edit-preview-http-contract|registerStage10BatchPreviewReadContract/,
 'Rota Stage10 deve permanecer SEM registro no servidor principal');

const app=Fastify({logger:false});
await registerAuth(app);
const calls:{actor:string;body:unknown}[]=[];
const fakeResult:BatchPreviewResponse={
 kind:'stage10-card-purchase-cycle-readonly-v1',canWrite:false,
 total:1,candidates:1,blocked:0,
 rows:[{source:'card-purchase',id:'purchase-qa-1',status:'candidate',
  reason:'READ_ONLY_PREVIEW_NOT_WRITE_AUTHORIZATION',canWrite:false,
  before:{cardId:'card-a',purchaseDate:'2026-11-14',entries:[{
   id:'e-1',number:1,amount:'10.00',statementMonth:'2026-11',dueDate:'2026-12-07',
  }]},
  after:{cardId:'card-b',purchaseDate:'2026-11-25',entries:[{
   id:'e-1',number:1,amount:'10.00',statementMonth:'2026-12',dueDate:'2027-01-11',
  }]},
 }],
};
await app.register(async scope=>{
 registerStage10BatchPreviewReadContract(scope,{
  preview:async(actor,body)=>{
   calls.push({actor,body});
   if(actor==='revoked')throw new BatchPreviewAccessError('BATCH_PREVIEW_ACCESS_DENIED');
   if(actor==='broken')throw new Error('DATABASE_PRIVATE_DETAIL');
   if(actor==='leaky')return {...fakeResult,internalDebug:'NEVER_EXPOSE_THIS'} as BatchPreviewResponse;
   return fakeResult;
  },
 });
},{prefix:'/finance'});
await app.ready();
const url='/finance/batch-edit/card-cycle/preview';
const stamp='2026-11-14T12:00:00.000Z';
const body={
 items:[{source:'card-purchase',id:'purchase-qa-1',expectedUpdatedAt:stamp}],
 changes:{cardId:'card-qa-b',purchaseDateMode:'common',commonPurchaseDate:'2026-11-25'},
};
const token=(sub:string,role:string)=>app.jwt.sign({sub,role:role as import('@meg/database').UserRole,email:'qa-only@meg.test'});
const request=async(payload:unknown,sub='viewer',role='VIEWER')=>await app.inject({
 method:'POST',url,
 headers:{authorization:'Bearer '+token(sub,role),'content-type':'application/json'},
 payload:JSON.stringify(payload),
});
const unauthorized=await app.inject({method:'POST',url,payload:body});
assert.equal(unauthorized.statusCode,401);
assert.deepEqual(unauthorized.json(),{error:'UNAUTHORIZED'});
assert.equal(calls.length,0);

const fakeJwt=await app.inject({
 method:'POST',url,headers:{authorization:'Bearer not-a-token'},payload:body,
});
assert.equal(fakeJwt.statusCode,401);
assert.equal(calls.length,0);
const invalidRole=await request(body,'guest','GUEST');
assert.equal(invalidRole.statusCode,403);
assert.deepEqual(invalidRole.json(),{error:'FORBIDDEN'});
assert.equal(calls.length,0);

const valid=await request(body);
assert.equal(valid.statusCode,200);
assert.equal(valid.headers['cache-control'],'no-store');
assert.equal(valid.headers.pragma,'no-cache');
assert.equal(valid.headers.vary,'Authorization');
assert.deepEqual(valid.json(),fakeResult);
assert.equal(calls.length,1);
assert.equal(calls[0].actor,'viewer');
assert.deepEqual(calls[0].body,body);
assert.equal(valid.json().canWrite,false);

const unsupported=await app.inject({method:'GET',url,headers:{authorization:'Bearer '+token('viewer','VIEWER')}});
assert.equal(unsupported.statusCode,404,'GET não pode expor lote em URL de consulta');
const forbidden=await request(body,'revoked','ADMIN');
assert.equal(forbidden.statusCode,403);
assert.deepEqual(forbidden.json(),{error:'BATCH_PREVIEW_ACCESS_DENIED'});
const unavailable=await request(body,'broken','OPERATOR');
assert.equal(unavailable.statusCode,503);
assert.deepEqual(unavailable.json(),{error:'BATCH_PREVIEW_UNAVAILABLE'});
assert.doesNotMatch(unavailable.body,/DATABASE_PRIVATE_DETAIL/);
const leaky=await request(body,'leaky','VIEWER');
assert.equal(leaky.statusCode,503);
assert.deepEqual(leaky.json(),{error:'BATCH_PREVIEW_UNAVAILABLE'});
assert.doesNotMatch(leaky.body,/NEVER_EXPOSE_THIS/);

const invalids=[
 {...body,userId:'forged'},
 {...body,dataOwnerId:'another-workspace'},
 {...body,items:[]},
 {...body,items:[body.items[0],body.items[0]]},
 {...body,changes:{...body.changes,cardId:''}},
 {...body,changes:{...body.changes,commonPurchaseDate:'2026-02-30'}},
 {...body,changes:{...body.changes,purchaseDateMode:'preserve'}},
 {...body,items:[{...body.items[0],expectedUpdatedAt:'not-a-version'}]},
 {...body,changes:{...body.changes,accountId:'unknown-injection'}},
 {...body,items:[{...body.items[0],workspaceId:'foreign'}]},
 {...body,items:Array.from({length:201},(_,index)=>({...body.items[0],id:'p-'+index}))},
];
for(const bad of invalids){
 const answer=await request(bad);
 assert.equal(answer.statusCode,400,JSON.stringify(bad).slice(0,300));
 assert.deepEqual(answer.json(),{error:'BATCH_PREVIEW_INVALID_SELECTION'});
}
assert.equal(calls.length,4,'Schema must reject invalid inputs before adapter call');
// O shape que inclui fonte não suportada continua na seleção mas bloqueado no serviço.
const mixed=await request({...body,items:[
 ...body.items,{source:'benefit',id:'meal-demo',expectedUpdatedAt:'no-version'},
]});
assert.equal(mixed.statusCode,200);
assert.equal(calls.length,5);
assert.equal((calls[4].body as {items:unknown[]}).items.length,2);
const veryLarge=await request({items:[{source:'card-purchase',id:'a'.repeat(70_000),expectedUpdatedAt:stamp}],changes:body.changes});
assert.equal(veryLarge.statusCode,413,'Limite por requisição deve ser aplicado antes do parse');

// Rate limiter deve proteger mesmo uma operação semanticamente read-only.
let limited=false;
for(let attempt=0;attempt<70;attempt++){
 const result=await request(body,'viewer','VIEWER');
 if(result.statusCode===429){
  assert.equal(result.json().error,'RATE_LIMITED');
  assert.ok(Number(result.headers['retry-after'])>=1);
  limited=true;
  break;
 }
 assert.equal(result.statusCode,200);
}
assert.equal(limited,true,'Limiter de 60 requisições por minuto deve atuar');
await app.close();
console.log('MEG_STAGE10_HTTP_PREVIEW_AUTH_ZOD_RATE_READONLY PASS');
