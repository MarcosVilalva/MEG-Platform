import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readSmartAuthorizedHistory} from '../apps/web/src/meg-web-evolution/launches/authorized-history';

const service=readFileSync(new URL('../apps/api/src/modules/finance/service.ts',import.meta.url),'utf8');
const routes=readFileSync(new URL('../apps/api/src/modules/finance/routes.ts',import.meta.url),'utf8');
const gateway=readFileSync(new URL('./meg-stage09-readonly-gateway.mjs',import.meta.url),'utf8');
const operational=readFileSync(new URL('../apps/web/src/meg-web-evolution/launches/OperationalLaunches.tsx',import.meta.url),'utf8');
const snapshot=service.split('export async function getFinancialHistorySnapshot')[1]?.split('export async function createFinancialEvent')[0];
assert.ok(snapshot,'Snapshot precisa existir sem modificar o writer.');
assert.match(snapshot,/prisma\.\$transaction\(async \(tx\)/);
assert.match(snapshot,/isolationLevel:\s*Prisma\.TransactionIsolationLevel\.RepeatableRead/);
assert.match(snapshot,/archivedAt:\s*null/);
assert.match(snapshot,/FINANCIAL_HISTORY_SNAPSHOT_LIMIT/);
assert.match(snapshot,/if\s*\(total\s*>\s*FINANCIAL_HISTORY_SNAPSHOT_LIMIT\)/);
assert.match(snapshot,/importedRow:\s*\{\s*select:/);
assert.match(snapshot,/sourceDetails:\s*sourceDetails\(/);
assert.match(snapshot,/kind:\s*'limit-exceeded'/);
assert.doesNotMatch(snapshot,/\.(?:create|createMany|update|updateMany|delete|deleteMany|upsert)\s*\(/);
assert.match(routes,/app\.get\('\/events\/history-snapshot',\s*\{\s*preHandler:\s*app\.authorize\(\[\.\.\.readRoles\]\)/);
assert.match(routes,/getFinancialHistorySnapshot\(dataOwnerId\)/);
assert.match(routes,/capabilities:\s*\{\s*historySnapshotV1:\s*true,\s*filteredSummaryV1:\s*true\s*\}/);
assert.match(operational,/before\.capabilities\?\.historySnapshotV1===true/);
assert.match(operational,/readAuthorizedHistory\(fetchPage,signal/);
assert.match(operational,/readSmartAuthorizedHistory\(/);

assert.match(gateway,/events\\\/history-snapshot/);

function record(index:number){
 return {id:'s'+index,date:'2026-11-05',amount:'10.00',signedAmount:'-10.00',type:'expense',status:'planned'};
}
const rows=Array.from({length:101},(_,index)=>record(index));
const controller=new AbortController();
let calls=0;
let pages=0;
const takePage=async(page:number,pageSize:number)=>{
 pages++;
 return {page,pageSize,total:rows.length,items:rows.slice((page-1)*pageSize,page*pageSize)};
};
const complete={kind:'complete' as const,protocol:'financial-history-v1' as const,
 consistency:'repeatable-read' as const,total:rows.length,items:rows};

const fast=await readSmartAuthorizedHistory(async()=>{calls++;return complete as never;},takePage as never,controller.signal);
assert.equal(fast.length,101);
assert.equal(calls,1);
assert.equal(pages,0,'Snapshot deve dispensar a leitura repetida de páginas.');

const fallback=await readSmartAuthorizedHistory(async()=>{calls++;throw Object.assign(new Error('HTTP_404'),{status:404});},
 takePage as never,controller.signal);
assert.equal(fallback.length,101);
assert.equal(pages,4,'Fallback deve continuar conferindo as duas páginas em duas passagens.');

pages=0;
const transportFallback=await readSmartAuthorizedHistory(async()=>{
 throw new TypeError('Failed to fetch');
},takePage as never,controller.signal);
assert.equal(transportFallback.length,101);
assert.equal(pages,4,'Falha de rede do endpoint opcional deve recuperar as duas leituras existentes.');

pages=0;
await assert.rejects(readSmartAuthorizedHistory(async()=>{
 throw new TypeError('Failed to fetch');
},async()=>{throw new Error('Legacy API unavailable');},controller.signal),/Legacy API unavailable/);
assert.equal(pages,0,'Fallback nunca pode inventar dados quando a API antiga também falha.');

await assert.rejects(readSmartAuthorizedHistory(async()=>{
 throw new TypeError('Unexpected token in JSON');
},takePage as never,controller.signal),/Unexpected token/);
assert.equal(pages,0,'Erros de conteúdo inválido não podem disparar fallback silencioso.');

pages=0;
const tooLarge=await readSmartAuthorizedHistory(async()=>({
 kind:'limit-exceeded',protocol:'financial-history-v1',total:5100,limit:5000
}),takePage as never,controller.signal);
assert.equal(tooLarge.length,101);
assert.equal(pages,4,'Limite excedido deve ativar caminho anterior seguro.');

pages=0;
await assert.rejects(readSmartAuthorizedHistory(async()=>({
 ...complete,items:[...rows.slice(0,100),rows[0]]
}) as never,takePage as never,controller.signal),/repetidos/);
assert.equal(pages,0,'Não reconsultar dados quando o snapshot veio inconsistente.');

await assert.rejects(readSmartAuthorizedHistory(async()=>{
 throw Object.assign(new Error('API unavailable'),{status:503});
},takePage as never,controller.signal),/API unavailable/);
assert.equal(pages,0,'Erros da autoridade não podem ser ocultados por fallback.');
console.log('Etapa 09: snapshot read-only, consistência, auth e fallback seguro validados.');
