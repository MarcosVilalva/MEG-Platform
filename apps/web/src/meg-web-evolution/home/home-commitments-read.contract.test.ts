import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readCanonicalHomeCommitments,type CanonicalHomeCommitment} from './home-commitments-read';

const event=(id:string,day:string,dueState:CanonicalHomeCommitment['dueState']='overdue'):CanonicalHomeCommitment=>({
 id:'financialEvent:'+id,source:'financialEvent',sourceId:id,dueAt:day+'T00:00:00.000Z',
 dueDate:day,description:'Compromisso '+id,amount:'123.45',status:'planned',dueState,
});
const payable=(id:string,day:string,dueState:CanonicalHomeCommitment['dueState']='overdue'):CanonicalHomeCommitment=>({
 id:'payable:'+id,source:'payable',sourceId:id,dueAt:day+'T00:00:00.000Z',
 dueDate:day,description:'Conta '+id,amount:'34.20',status:'partial',dueState,
});
type Page={asOf:string;items:CanonicalHomeCommitment[];hasMore:boolean;nextCursor:string|null};
const make=(pages:Page[])=>{
 let requests=0;const urls:string[]=[];
 const request=async<T>(url:string):Promise<T>=>{
  urls.push(url);const page=pages[requests++];
  if(!page)throw Error('UNEXPECTED_REQUEST');
  return page as T;
 };
 return {request,urls,get count(){return requests}};
};
const asOf='2026-11-11';
const p1:Page={asOf,items:[],hasMore:true,nextCursor:'cursorA'};
const p2:Page={asOf,items:[event('older','2026-07-05'),payable('partial','2026-11-10')],hasMore:false,nextCursor:null};
const initial=make([p1,p2]);
const filled=await readCanonicalHomeCommitments(initial.request);
assert.equal(initial.count,2,'Página vazia com hasMore precisa buscar próxima página');
assert.deepEqual(filled.map(item=>item.id),['financialEvent:older','payable:partial']);
assert.equal(filled[0].dueState,'overdue');
assert.equal(filled[1].status,'partial');
assert.equal(filled[0].amount,'123.45','Precisão retornada como string');
assert.match(initial.urls[1],/cursor=cursorA/);

const eight:CanonicalHomeCommitment[]=[
 event('a','2026-07-01'),event('b','2026-07-02'),
 event('c','2026-07-03'),event('d','2026-07-04'),
 event('e','2026-07-05'),event('f','2026-07-06'),
 event('g','2026-07-07'),event('h','2026-07-08'),
];
const enough=make([{asOf,items:eight,hasMore:true,nextCursor:'cursorB'}]);
assert.equal((await readCanonicalHomeCommitments(enough.request)).length,8);
assert.equal(enough.count,1,'Não consultar páginas extras depois de 8 compromissos');

const empty=make([{asOf,items:[],hasMore:false,nextCursor:null}]);
assert.deepEqual(await readCanonicalHomeCommitments(empty.request),[],'Somente resposta completa pode ser vazia');

for(const pages of [
 [{asOf,items:[],hasMore:true,nextCursor:null}],
 [{asOf,items:[],hasMore:true,nextCursor:'loop'},{asOf,items:[],hasMore:true,nextCursor:'loop'}],
 [{asOf,items:[event('dup','2026-01-01')],hasMore:true,nextCursor:'next'},
  {asOf,items:[event('dup','2026-01-01')],hasMore:false,nextCursor:null}],
 [{asOf,items:[],hasMore:true,nextCursor:'cursor1'},
  {asOf:'2026-11-12',items:[],hasMore:false,nextCursor:null}],
 Array.from({length:4},(_,i)=>({asOf,items:[],hasMore:true,nextCursor:'cursor'+i})),
] as Page[][]){
 const stub=make(pages);
 await assert.rejects(readCanonicalHomeCommitments(stub.request));
 assert.ok(stub.count<=4,'Nunca fazer varredura de histórico');
}

const transient=async<T>():Promise<T>=>{throw new Error('HTTP_503')};
await assert.rejects(readCanonicalHomeCommitments(transient),/HTTP_503/);
const invalid=async<T>():Promise<T>=>({asOf,items:[{...event('bad','2026-10-01'),amount:19}],hasMore:false,nextCursor:null}) as T;
await assert.rejects(readCanonicalHomeCommitments(invalid),/INVALID_RESPONSE/);

const home=readFileSync(new URL('./HomeDashboard.tsx',import.meta.url),'utf8');
assert.match(home,/readCanonicalHomeCommitments\(authenticatedRequest\)/);
assert.match(home,/data\.canonicalCommitments/);
assert.match(home,/if\(!preview\)return \[\]/,'Sem fallback financeiro na sessão real');
assert.match(home,/dueState:item\.dueState/,'Urgência deve vir da API');
assert.match(home,/error\}&&<div className="pano-error"/);
assert.doesNotMatch(home,/readCanonicalHomeCommitments\(authenticatedRequest\)\.catch\(/,'Não silenciar erro de leitura');
const client=readFileSync(new URL('./home-commitments-read.ts',import.meta.url),'utf8');
assert.doesNotMatch(client,/dateNow\(|new Date\(|dueDate\s*[<>]/,'Não classificar vencimento no navegador');
assert.match(client,/MAX_PAGES=4/);
assert.match(client,/PAGE_LIMIT=16/);
console.log('Home P0 client: paginação limitada, fail-closed, erro e integração canônica validados.');
