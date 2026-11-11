import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  afterCommitmentCursor,
  compareCommitmentKeys,
  decodeCommitmentCursor,
  dueStateForDay,
  encodeCommitmentCursor,
  mergeCommitmentPage,
  saoPauloDay,
  type CommitmentCandidate,
} from './home-commitments-core';

const day = '2026-11-10';
const event = (sourceId: string, date: string, eligible = true): CommitmentCandidate => ({
  source: 'financialEvent', sourceId, dueAt: date + 'T00:00:00.000Z',
  description: 'Despesa prevista', amount: '110.35', status: 'planned', eligible,
});
const payable = (sourceId: string, date: string, status = 'open'): CommitmentCandidate => ({
  source: 'payable', sourceId, dueAt: date + 'T00:00:00.000Z',
  description: 'Conta aberta', amount: '58.40', status, eligible: true,
});

// Início do dia de São Paulo, sem conversão errada do vencimento civil.
assert.equal(saoPauloDay(new Date('2026-11-10T02:59:59.000Z')), '2026-11-09');
assert.equal(saoPauloDay(new Date('2026-11-10T03:00:00.000Z')), '2026-11-10');
assert.equal(dueStateForDay('2026-07-05T00:00:00.000Z', day), 'overdue');
assert.equal(dueStateForDay('2026-11-10T00:00:00.000Z', day), 'due_today');
assert.equal(dueStateForDay('2026-12-01T00:00:00.000Z', day), 'upcoming');

const sample = [
  event('future', '2026-12-01'),
  payable('partial', '2026-11-09', 'partial'),
  event('old', '2026-07-05'),
  event('today', '2026-11-10'),
  payable('today-payable', '2026-11-10'),
  event('other-old', '2026-07-05'),
];
const first = mergeCommitmentPage(sample, day, 3);
assert.deepEqual(first.items.map((item) => item.id), [
  'financialEvent:old', 'financialEvent:other-old', 'payable:partial',
]);
assert.deepEqual(first.items.map((item) => item.dueState), ['overdue','overdue','overdue']);
assert.equal(first.hasMore, true);
assert.ok(first.nextCursor);
const after = decodeCommitmentCursor(first.nextCursor!);
assert.deepEqual(after, {dueAt:'2026-11-09T00:00:00.000Z',source:'payable',sourceId:'partial'});
const second = mergeCommitmentPage(sample.filter((item) => compareCommitmentKeys(item, after!) > 0), day, 3);
assert.deepEqual(second.items.map((item) => item.id), [
  'financialEvent:today','payable:today-payable','financialEvent:future',
]);
assert.equal(second.hasMore, false);
assert.equal(second.nextCursor, null);
assert.deepEqual(second.items.map((item) => item.dueState), ['due_today','due_today','upcoming']);

// Vínculo por identidade: duas despesas iguais permanecem independentes.
const duplicates = mergeCommitmentPage([
  event('a',day),event('b',day),payable('c',day),
],day,8);
assert.equal(duplicates.items.length,3);
assert.equal(new Set(duplicates.items.map((x)=>x.id)).size,3);
assert.equal(duplicates.items[0].amount,'110.35');

// Excluído não deve vazar nem prender o cursor; próxima página ainda existe.
const skipped = mergeCommitmentPage([event('credit',day,false),payable('p',day)],day,1);
assert.equal(skipped.items.length,0);
assert.equal(skipped.hasMore,true);
assert.equal(decodeCommitmentCursor(skipped.nextCursor!)?.sourceId,'credit');
const resumed = mergeCommitmentPage(
  [payable('p',day)].filter(x=>compareCommitmentKeys(x,decodeCommitmentCursor(skipped.nextCursor!)!)>0),
  day,1);
assert.deepEqual(resumed.items.map(x=>x.id),['payable:p']);

// Mesma data, empate determinístico por origem e ID; filtros Prisma consistentes.
const cursor = {dueAt:'2026-11-10T00:00:00.000Z',source:'financialEvent' as const,sourceId:'x'};
assert.deepEqual(decodeCommitmentCursor(encodeCommitmentCursor(cursor)),cursor);
assert.deepEqual(afterCommitmentCursor('payable',cursor),{date:{gte:new Date(cursor.dueAt)}});
assert.deepEqual(afterCommitmentCursor('financialEvent',cursor),{
  OR:[{date:{gt:new Date(cursor.dueAt)}},{date:new Date(cursor.dueAt),id:{gt:'x'}}],
});
assert.deepEqual(afterCommitmentCursor('financialEvent',{
  dueAt:cursor.dueAt,source:'payable',sourceId:'p',
}),{date:{gt:new Date(cursor.dueAt)}});
for(const invalid of ['', '#', '!!', Buffer.from('[]').toString('base64url'),
 Buffer.from(JSON.stringify(['2026-01-01T00:00:00.000Z','invalid','1'])).toString('base64url'),
 'a'.repeat(513)])assert.equal(decodeCommitmentCursor(invalid),null);

// Contrato estrutural do serviço e rota: sem writer, sem varredura integral.
const service=readFileSync(new URL('./home-commitments-read.ts',import.meta.url),'utf8');
const routes=readFileSync(new URL('./routes.ts',import.meta.url),'utf8');
const policy=readFileSync(new URL('./financial-policy.ts',import.meta.url),'utf8');
assert.match(service,/resolveWorkspaceContext\(userId\)/);
assert.match(service,/const ownerId = workspace\.workspace\.ownerId/);
assert.equal((service.match(/userId: ownerId/g)||[]).length,2,'Cada origem deve ser isolada pelo mesmo proprietário');
assert.equal((service.match(/take: options\.limit \+ 1/g)||[]).length,2,'Limite rigoroso em ambas as origens');
assert.match(service,/archivedAt: null/);
assert.match(service,/status: 'planned'/);
assert.match(service,/type: 'expense'/);
assert.match(service,/signedAmount: \{ lt: 0 \}/);
assert.match(service,/status: \{ notIn: \['paid', 'cancelled'\] \}/);
assert.match(service,/openAmount: \{ gt: 0 \}/);
assert.match(service,/payablePayment: \{ select: \{ id: true \} \}/);
assert.match(service,/!event\.payablePayment/);
assert.match(service,/isMonetaryFinancialEvent\(event\)/);
assert.match(service,/paymentMethod\?\.type\?\.toLowerCase\(\) !== 'credit'/);
assert.match(policy,/export function isBenefitFinancialEvent/);
assert.match(service,/signedAmount\.abs\(\)\.toFixed\(2\)/);
assert.match(service,/openAmount\.toFixed\(2\)/);
assert.doesNotMatch(service,/\b(create|update|delete|upsert|createMany|updateMany|deleteMany|\$executeRaw|\$queryRaw|materialize)\s*\(/);
const routeStart=routes.indexOf("app.get('/home-commitments'");
const routeEnd=routes.indexOf("app.get('/events/month'",routeStart);
assert.ok(routeStart>0&&routeEnd>routeStart,'Rota de leitura ausente');
const route=routes.slice(routeStart,routeEnd);
assert.match(route,/app\.authorize\(\[\.\.\.readRoles\]\)/);
assert.match(route,/request\.user\.sub/);
assert.match(route,/private, no-store/);
assert.match(route,/\.max\(50\)/);
assert.match(route,/INVALID_HOME_COMMITMENTS_CURSOR/);
assert.doesNotMatch(route,/post\(|put\(|patch\(|delete\(/);

console.log('Home P0: paginação, estados, isolamento, precisão e read-only caracterizados.');
