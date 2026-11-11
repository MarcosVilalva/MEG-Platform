import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  decodeCommitmentPage,displayCommitmentAmount,loadCanonicalCommitments,
  type CanonicalCommitment,type CommitmentRequest,
} from './home-commitments-client';

const record=(id:string,dueDate='2026-07-12',dueState:'overdue'|'due_today'|'upcoming'='overdue'):CanonicalCommitment=>({
  id:'financialEvent:'+id,source:'financialEvent',sourceId:id,dueAt:dueDate+'T00:00:00.000Z',
  dueDate,description:'Pagamento previsto',amount:'1234.50',status:'planned',dueState,
});
const valid=(items:CanonicalCommitment[],hasMore:boolean,nextCursor:string|null)=>({
  asOf:'2026-11-11',items,hasMore,nextCursor,
});
assert.deepEqual(decodeCommitmentPage(valid([record('a')],false,null)).items.map(x=>x.id),['financialEvent:a']);
assert.equal(displayCommitmentAmount('1234567.89',false),'R$ 1.234.567,89');
assert.equal(displayCommitmentAmount('1234567.89',true),'R$ •••••');
assert.equal(displayCommitmentAmount('oops',false),'—');
assert.equal(displayCommitmentAmount('9007199254740993.11',false),'R$ 9.007.199.254.740.993,11',
  'Formatação monetária nunca deve converter Decimal em float');

for(const value of [
 null,{},[],valid([],true,null),valid([],false,'extra'),{...valid([],false,null),asOf:'x'},
 valid([{...record('a'),amount:'5.999'}],false,null),
 valid([record('a'),record('a')],false,null),
 valid([{...record('a'),dueState:'paid'} as unknown as CanonicalCommitment],false,null),
])assert.throws(()=>decodeCommitmentPage(value),'API malformada deve falhar, nunca virar saldo vazio');

let requests:string[]=[];
const request:CommitmentRequest=async(path,init)=>{
 assert.equal(init.cache,'no-store');
 requests.push(path);
 if(path==='/finance/home-commitments?limit=8')
  return valid([],true,'opaque1'); // página vazia com mais eventos ainda por ler
 if(path==='/finance/home-commitments?limit=8&cursor=opaque1')
  return valid([record('old','2026-06-01'),record('today','2026-11-11','due_today')],false,null);
 throw Error('PATH_NOT_EXPECTED: '+path);
};
const loaded=await loadCanonicalCommitments(request);
assert.deepEqual(loaded.items.map(x=>x.sourceId),['old','today']);
assert.equal(loaded.hasMore,false);
assert.equal(requests.length,2,'Deve avançar sobre páginas vazias com hasMore=true');

let visits=0;
const filtered:CommitmentRequest=async()=>{visits++;return valid([],true,'cursor'+visits)};
const limited=await loadCanonicalCommitments(filtered,null,8,4);
assert.equal(visits,4,'Limite de consultas por interação é obrigatório para proteger Egress');
assert.deepEqual(limited.items,[]);
assert.equal(limited.hasMore,true,'Página vazia não significa ausência de compromissos');
assert.equal(limited.nextCursor,'cursor4');

await assert.rejects(()=>loadCanonicalCommitments(async()=>{throw Error('API_UNAVAILABLE')}),/API_UNAVAILABLE/,
 'Erro da API não pode ser convertido em ausência de compromissos');
await assert.rejects(()=>loadCanonicalCommitments(async()=>valid([],true,'same'),'same'),/REPEATED_COMMITMENTS_CURSOR/);
await assert.rejects(()=>loadCanonicalCommitments(async()=>valid([],true,'same')), /REPEATED_COMMITMENTS_CURSOR/);
await assert.rejects(()=>loadCanonicalCommitments(async()=>valid([],false,null),null,51),/INVALID_COMMITMENT_CLIENT_LIMIT/);

let day=0;
await assert.rejects(()=>loadCanonicalCommitments(async()=>{
 day++;return {...valid(day===1?[]:[record('x')],day===1,'cursor'+day),asOf:day===1?'2026-11-11':'2026-11-12'};
}),/CHANGED_COMMITMENTS_REFERENCE_DAY/);

// Compatibilidade da prévia: somente dados fictícios podem usar composição antiga.
const home=readFileSync(new URL('./HomeDashboard.tsx',import.meta.url),'utf8');
assert.match(home,/if\(preview\)\{[\s\S]*?const planned=/);
assert.match(home,/return \(canonical\?\.items\|\|\[\]\)\.map/);
assert.match(home,/loadCanonicalCommitments\(\(path,init\)=>authenticatedRequest/);
assert.match(home,/!preview&&!canonical&&<div className="pano-commitments-warning" role="alert">/);
assert.match(home,/canonical\?\.hasMore&&<button className="pano-load-more-commitments"/);
assert.doesNotMatch(home,/authenticatedRequest<unknown>\('\/payables\/open'/);
assert.doesNotMatch(home,/authenticatedRequest<unknown>\('\/finance\/events\/month\?month='\+followingMonth/);
assert.match(home,/displayCommitmentAmount\(v,hidden\)/);
console.log('Home P0 consumer: paginação controlada, erros, fuso canônico e Decimal preservados.');
