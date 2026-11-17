import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import fastify from 'fastify';
import { LicenseStatus, Prisma, prisma, UserRole, UserStatus } from '@meg/database';
import { appStateRoutes } from '../app-state/routes';

/**
 * Processo API QA isolado por credencial/Prisma datasource em Postgres17.
 * Um processo e executado para a coorte "android" e outro para "web".
 * Ambos usam classes de schema identicas, mas credenciais distintas.
 * NAO e APK real nem deploy de API externa.
 */
const mode = process.env.MEG_STAGE10_COHORT;
if (mode !== 'android' && mode !== 'web') throw new Error('STAGE10_COHORT_MODE_REQUIRED');
const schema = 'stage10_cohort_' + mode;
const role = 'stage10_cohort_' + mode + '_login';
const url = new URL(process.env.DATABASE_URL || 'http://invalid');
if (process.env.MEG_STAGE10_ISOLATED_PG !== '1'
  || !['127.0.0.1', 'localhost'].includes(url.hostname)
  || url.pathname !== '/meg_stage10_sandbox'
  || url.username !== role
  || url.searchParams.get('schema') !== schema) {
  throw new Error('STAGE10_DISPOSABLE_COHORT_ONLY');
}

const stamp = 'stage10-cohort-' + mode + '-' + Date.now() + '-' + Math.random().toString(36).slice(2);
let userId: string | null = null;
let workspaceId: string | null = null;
let planId: string | null = null;
// Barreira local: garante duas instancias vivas antes e durante os PATCHs.
// O diretório é criado pelo runner efêmero, nunca em instalação Android.
const barrierDir = process.env.MEG_STAGE10_CONCURRENT_BARRIER_DIR || '';
if (!barrierDir || !isAbsolute(barrierDir) || !barrierDir.startsWith('/tmp/meg-stage10-cohorts.')) {
  throw new Error('STAGE10_QA_CONCURRENT_BARRIER_REQUIRED');
}
const otherMode = mode === 'android' ? 'web' : 'android';
async function cohortBarrier(phase: 'ready' | 'inserted' | 'updated') {
  writeFileSync(join(barrierDir, phase + '-' + mode), String(process.pid));
  const peer = join(barrierDir, phase + '-' + otherMode);
  const deadline = Date.now() + 40_000;
  while (!existsSync(peer)) {
    if (Date.now() > deadline) throw new Error('STAGE10_QA_CONCURRENT_PEER_TIMEOUT_' + phase);
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}
const app = fastify();
try {
  const user = await prisma.user.create({data: {
    name: 'QA Cohort ' + mode, email: stamp + '@meg.test', passwordHash: 'QA_ONLY',
    role: UserRole.ADMIN, status: UserStatus.ACTIVE, isActive: true, approvedAt: new Date(),
  }});
  userId = user.id;
  const plan = await prisma.plan.create({data: {
    code: stamp, name: 'Plano ficticio QA', monthlyPrice: 0, maxMembers: 2, features: [],
  }});
  planId = plan.id;
  const workspace = await prisma.workspace.create({data: {
    ownerId: user.id, slug: stamp, name: 'Cohort QA ' + mode,
    members: {create: { userId: user.id, role: UserRole.ADMIN, status: UserStatus.ACTIVE, isActive: true }},
    subscription: {create: {planId: plan.id, status: LicenseStatus.ACTIVE }},
    appState: {create: {
      userId: user.id, revision: 1,
      state: {transactions: [], budgets: {}, __megNormalization: {mode: 'normalized-primary'}} as Prisma.InputJsonValue,
    }},
  }});
  workspaceId = workspace.id;
  const account = await prisma.account.create({data: {
    userId: user.id, name: 'QA Conta ' + mode, type: 'checking',
  }});
  const payload = {
    id: 'qa-legacy-' + stamp, type: 'expense', status: 'paid', situation: 'PAGO',
    date: '2026-11-11', description: 'QA despesa inicial',
    amount: 42.37, expenseAmount: 42.37, financialAccountId: account.id,
    category: 'Mercado', expenseClass: 'CONTAS GERAIS', paymentMethod: 'PIX', modality: 'À VISTA',
  };
  const asAuth = (request: unknown) => {
    (request as {user:unknown}).user = {sub:user.id, role:UserRole.ADMIN};
  };
  app.decorate('authenticate', async (request: unknown) => { asAuth(request); });
  app.decorate('authorize', (_roles:unknown) => async (request:unknown) => { asAuth(request); });
  await app.register(appStateRoutes, {prefix: '/app-state'});
  // Servidor de loopback real em porta efemera, sem interface publica.
  // Cada processo Fastify tem seu proprio listener e credencial Prisma.
  const origin = await app.listen({host:'127.0.0.1',port:0});
  if (new URL(origin).hostname !== '127.0.0.1') throw new Error('STAGE10_LOOPBACK_ONLY');
  await cohortBarrier('ready');
  const request = async (revision: number, data:typeof payload) => {
    const response = await fetch(origin+'app-state/transactions', {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({operationId:randomUUID(),expectedRevision:revision,upserts:[data],deletes:[]}),
    });
    return {statusCode:response.status,body:await response.text()};
  };
  const first = await request(1,payload);
  assert.equal(first.statusCode,200,first.body);
  const original = await prisma.financialEvent.findFirstOrThrow({where: {
    workspaceId: workspace.id,legacyTransactionId:payload.id,
  }});
  assert.equal(original.accountId,account.id);
  assert.equal(original.amount.toString(),'42.37');
  await cohortBarrier('inserted');
  const second = await request(2,{...payload,description:'QA descricao editada'});
  assert.equal(second.statusCode,200,second.body);
  const updated = await prisma.financialEvent.findFirstOrThrow({where: {
    workspaceId:workspace.id,legacyTransactionId:payload.id,
  }});
  assert.equal(updated.id,original.id);
  assert.equal(updated.description,'QA descricao editada');
  assert.equal(await prisma.financialEvent.count({where:{workspaceId:workspace.id,legacyTransactionId:payload.id}}),1);
  const read = await fetch(origin+'app-state');
  const readBody = await read.json() as {dataSource: string};
  assert.equal(read.status,200);
  assert.equal(readBody.dataSource,'normalized');
  await cohortBarrier('updated');

  // Duas solicitações simultâneas para o MESMO lançamento e revisão. Apenas
  // uma pode avançar AppState e FinancialEvent, sem perda de identidade.
  // É concorrência HTTP simulada por Fastify.inject, não dois dispositivos.
  const [raceA, raceB] = await Promise.all([
    request(3, {...payload,description:'QA concorrente A'}),
    request(3, {...payload,description:'QA concorrente B'}),
  ]);
  assert.deepEqual([raceA.statusCode,raceB.statusCode].sort((a,b)=>a-b),[200,409],
    'CAS da mesma revisão deve aceitar exatamente uma alteração');
  const rejected = raceA.statusCode === 409 ? raceA : raceB;
  assert.equal(JSON.parse(rejected.body).error, 'STATE_CONFLICT', rejected.body);
  const winner = raceA.statusCode === 200 ? 'QA concorrente A' : 'QA concorrente B';
  const afterRace = await prisma.financialEvent.findUniqueOrThrow({where:{id:original.id}});
  assert.equal(afterRace.description,winner);
  assert.equal(afterRace.id,original.id);
  assert.equal(afterRace.amount.toString(),'42.37');
  assert.equal(await prisma.financialEvent.count({where:{
    workspaceId:workspace.id,legacyTransactionId:payload.id,
  }}),1);
  const currentState = await prisma.appState.findUniqueOrThrow({where:{workspaceId:workspace.id}});
  assert.equal(currentState.revision,4);
  const expectedState = currentState.state as { transactions?: Array<{id:string;description:string}> };
  assert.equal(expectedState.transactions?.find(item=>item.id===payload.id)?.description,winner);
  console.log('MEG_STAGE10_QA_SAME_REVISION_CONCURRENT_CAS_' + mode.toUpperCase() + ' PASS');


  // A credencial real de cada processo (sem superuser) nao pode ler o outro
  // schema, mesmo que os IDs/entidades sejam equivalentes.
  const other = mode === 'android' ? 'stage10_cohort_web' : 'stage10_cohort_android';
  let denied = false;
  try {
    await prisma.$queryRawUnsafe('SELECT count(*) FROM "' + other + '"."FinancialEvent"');
  } catch (error) {
    const pgError = error as {code?:string;meta?:{code?:string}};
    denied = pgError.code === 'P2010' && pgError.meta?.code === '42501'
      || /permission denied|permissao negada/i.test(String(error));
  }
  assert.equal(denied,true,'Proibido ler evento da outra coorte');
  // Confirmar que a role tampouco pode alterar o registro que a outra
  // instancia acabou de gravar, enquanto ambas estao vivas.
  let writeDenied = false;
  try {
    await prisma.$executeRawUnsafe('UPDATE "' + other + '"."FinancialEvent" SET description = $1',
      'QA MODIFICACAO CRUZADA PROIBIDA');
  } catch (error) {
    const pgError = error as {code?: string; meta?: {code?: string}};
    writeDenied = pgError.code === 'P2010' && pgError.meta?.code === '42501'
      || /permission denied|permissao negada/i.test(String(error));
  }
  assert.equal(writeDenied, true, 'Proibido alterar registros da outra coorte');
  assert.equal((await prisma.financialEvent.findUniqueOrThrow({where:{id:original.id}})).description,
    winner);
  console.log('MEG_STAGE10_TWO_CONCURRENT_LOOPBACK_HTTP_SERVERS_' + mode.toUpperCase() + ' PASS');
} finally {
  await app.close();
  if (workspaceId) await prisma.workspace.delete({where:{id:workspaceId}});
  if (planId) await prisma.plan.delete({where:{id:planId}});
  if (userId) await prisma.user.delete({where:{id:userId}});
  assert.equal(await prisma.user.count({where:{email:stamp+'@meg.test'}}),0);
  await prisma.$disconnect();
}
