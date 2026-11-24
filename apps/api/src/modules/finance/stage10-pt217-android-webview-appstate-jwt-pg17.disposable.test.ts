/**
 * PT217: UMA MESMA EXECUCAO WebView QA + HTTP Fastify + JWT real + PG17 ficticio.
 * Nao constitui homologacao financeira completa nem altera APK708 ou producao.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import bcrypt from 'bcryptjs';
import { prisma, Prisma, LicenseStatus, UserRole, UserStatus } from '@meg/database';
import { isAllowedOrigin } from '../../cors';
import { registerAuth } from '../../plugins/auth';
import { authRoutes } from '../auth/routes';
import { appStateRoutes } from '../app-state/routes';

const db = new URL(process.env.DATABASE_URL || 'https://invalid');
assert.ok(
  process.env.GITHUB_ACTIONS === 'true' &&
  process.env.GITHUB_REPOSITORY === 'MarcosVilalva/MEG-Platform' &&
  process.env.ANDROID_SERIAL === 'emulator-5554' &&
  process.env.MEG_STAGE10_ISOLATED_PG === '1' &&
  process.env.MEG_STAGE10_PT217_SYNTHETIC === '1' &&
  process.env.MEG_STAGE10_WEB_WRITE_QA === '0' &&
  process.env.NODE_ENV === 'test' &&
  db.protocol === 'postgresql:' &&
  db.hostname === '127.0.0.1' &&
  db.port === '5432' &&
  db.pathname === '/meg_stage10_sandbox' &&
  db.username === 'meg_stage10_ci',
  'PT217_ONLY_GITHUB_EMULATOR_AND_DISPOSABLE_PG17'
);
assert.equal(isAllowedOrigin('https://localhost', []), true);
const pkg = 'br.com.megfinancas.app.stage10qa';
const api = Fastify({ logger: false });
const port = 3333;
let ws: WebSocket | undefined;
let forwardPort = '';
let httpStarted = false;
let reverseStarted = false;
let requestId = 0;
function adb(...args: string[]) {
  return execFileSync('adb', args, { encoding: 'utf8', timeout: 15_000 }).trim();
}
async function until<T>(fn: () => T | Promise<T>, label: string): Promise<T> {
  for (let i = 0; i < 45; i++) {
    try { const result = await fn(); if (result) return result; } catch {}
    await delay(700);
  }
  throw new Error('PT217_TIMEOUT_' + label);
}
async function evaluate(expression: string) {
  assert.ok(ws, 'PT217_CDP_DISCONNECTED');
  const id = ++requestId;
  return new Promise<any>((resolve, reject) => {
    const timeout = setTimeout(() => end(new Error('PT217_CDP_TIMEOUT')), 30_000);
    const receive = ({ data }: MessageEvent) => {
      const response = JSON.parse(String(data));
      if (response.id !== id) return;
      if (response.error || response.result?.exceptionDetails)
        return end(new Error('PT217_CDP_ERROR:' + JSON.stringify(response.error || response.result?.exceptionDetails).slice(0, 400)));
      end(null, response.result?.result?.value);
    };
    function end(error: Error | null, result?: unknown) {
      clearTimeout(timeout);
      ws?.removeEventListener('message', receive);
      if (error) reject(error); else resolve(result);
    }
    ws!.addEventListener('message', receive);
    ws!.send(JSON.stringify({ id, method: 'Runtime.evaluate',
      params: { expression, awaitPromise: true, returnByValue: true } }));
  });
}
try {
  const stamp = randomUUID();
  const pass = 'pt217-' + stamp;
  const owner = await prisma.user.create({ data: {
    email: 'pt217-' + stamp + '@example.invalid', name: 'PT217 synthetic only',
    passwordHash: await bcrypt.hash(pass, 8), role: UserRole.ADMIN,
    status: UserStatus.ACTIVE, isActive: true, approvedAt: new Date(),
  } });
  const plan = await prisma.plan.create({ data: {
    code: 'PT217-' + stamp, name: 'PT217 disposable', monthlyPrice: 0,
    maxMembers: 2, features: [],
  } });
  const workspace = await prisma.workspace.create({ data: {
    ownerId: owner.id, name: 'PT217 disposable', slug: 'pt217-' + stamp,
    members: { create: [{ userId: owner.id, role: UserRole.ADMIN,
      status: UserStatus.ACTIVE, isActive: true }] },
    subscription: { create: { planId: plan.id, status: LicenseStatus.ACTIVE } },
    appState: { create: { userId: owner.id, revision: 1,
      state: { transactions: [], budgets: {} } as Prisma.InputJsonValue } },
  } });
  await api.register(cors, {
    origin(origin, cb) { cb(null, isAllowedOrigin(origin, [])); },
    credentials: true,
  });
  await registerAuth(api);
  await api.register(authRoutes, { prefix: '/auth' });
  await api.register(appStateRoutes, { prefix: '/app-state' });
  await api.listen({ host: '127.0.0.1', port });
  httpStarted = true;
  adb('reverse', 'tcp:3333', 'tcp:3333');
  reverseStarted = true;
  adb('shell', 'am', 'force-stop', pkg);
  adb('shell', 'am', 'start', '-n', pkg + '/br.com.megfinancas.app.MainActivity');
  const pid = await until(() => adb('shell', 'pidof', pkg), 'APP_PID');
  forwardPort = adb('forward', 'tcp:0', 'localabstract:webview_devtools_remote_' + pid);
  const target = await until(async () => {
    const r = await fetch('http://127.0.0.1:' + forwardPort + '/json/list',
      { signal: AbortSignal.timeout(2_000) });
    return (await r.json() as Array<{ url: string; webSocketDebuggerUrl: string }>)
      .find(x => x.url.startsWith('https://localhost/'));
  }, 'QA_WEBVIEW');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await once(ws, 'open');
  await until(() => evaluate("Boolean(document.querySelector('input[autocomplete=current-password]'))"),
    'QA_LOGIN_FORM');
  assert.equal(await evaluate('location.origin'), 'https://localhost');
  console.log('PT217_ANDROID_WEBVIEW_REAL_ORIGIN=PASS');

  // Aciona a tela REAL de login, que utiliza o fetch do aplicativo.
  await evaluate(`(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
    for(const [name,value] of Object.entries({username:${JSON.stringify(owner.email)},
      'current-password':${JSON.stringify(pass)}})){
      const element=document.querySelector('input[autocomplete='+name+']');
      if(!element)throw Error('PT217_LOGIN_FIELD_MISSING_'+name);
      setter.call(element,value);
      element.dispatchEvent(new Event('input',{bubbles:true}));
    }
    const button=document.querySelector('.px-preview-submit');
    if(!button || button.disabled)throw Error('PT217_LOGIN_BUTTON_NOT_READY');
    button.click();
  })()`);
  await until(() => evaluate(`(() => {
    for(let i=0;i<sessionStorage.length;i++){
      try{
        const v=JSON.parse(sessionStorage.getItem(sessionStorage.key(i)));
        if(v?.accessToken && v?.user?.id===${JSON.stringify(owner.id)})return true;
      }catch{}
    }
    return false;
  })()`), 'JWT_SESSION_IN_REAL_WEBVIEW');
  console.log('PT217_ANDROID_WEBVIEW_REAL_LOGIN_JWT=PASS');

  const op = randomUUID();
  const transaction = {
    id: 'pt217-legacy-' + stamp, type: 'expense', status: 'paid', situation: 'PAGO',
    description: 'PT217 fictitious expense', date: '2026-11-23',
    amount: 13.47, expenseAmount: 13.47, paymentMethod: 'PIX',
  };
  // Exige que o browser realmente alcance Fastify usando JWT da sua sessao.
  // O mesmo operationId deve recuperar recibo; novo payload deve ser bloqueado.
  const result = await evaluate(`(async()=>{
    let jwt;
    for(let i=0;i<sessionStorage.length;i++){
      try{
        const session=JSON.parse(sessionStorage.getItem(sessionStorage.key(i)));
        if(session?.accessToken && session?.user?.id===${JSON.stringify(owner.id)})
          jwt=session.accessToken;
      }catch{}
    }
    if(!jwt)throw Error('PT217_NO_JWT');
    const root='http://127.0.0.1:3333';
    const headers={Authorization:'Bearer '+jwt,'Content-Type':'application/json'};
    const unauth=await fetch(root+'/app-state',{cache:'no-store'});
    const before=await fetch(root+'/app-state',{headers,cache:'no-store'});
    const state=await before.json();
    const payload={operationId:${JSON.stringify(op)},expectedRevision:state.revision,
      upserts:[${JSON.stringify(transaction)}],deletes:[]};
    const send=(body)=>fetch(root+'/app-state/transactions',{method:'PATCH',headers,
      cache:'no-store',body:JSON.stringify(body)});
    const first=await send(payload);const firstBody=await first.json();
    const replay=await send(payload);const replayBody=await replay.json();
    const changed=await send({...payload,expectedRevision:state.revision+1,
      upserts:[{...payload.upserts[0],description:'PT217 mutated request'}]});
    const changedBody=await changed.json();
    const after=await fetch(root+'/app-state',{headers,cache:'no-store'});
    const stateAfter=await after.json();
    return {unauth:unauth.status,before:before.status,first:first.status,
      replay:replay.status,replayed:replayBody.replayed===true,
      changed:changed.status,changedCode:changedBody.error,
      revBefore:state.revision,revAfter:stateAfter.revision,
      count:stateAfter.state?.transactions?.length,
      storedId:stateAfter.state?.transactions?.[0]?.id,
      firstRevision:firstBody.revision};
  })()`);
  assert.equal(result.unauth, 401);
  assert.equal(result.before, 200);
  assert.equal(result.first, 200);
  assert.equal(result.replay, 200);
  assert.equal(result.replayed, true);
  assert.equal(result.changed, 409);
  assert.equal(result.changedCode, 'OPERATION_ID_REUSED');
  assert.equal(result.revBefore, 1);
  assert.equal(result.revAfter, 2);
  assert.equal(result.count, 1);
  assert.equal(result.storedId, transaction.id);
  assert.equal(await prisma.cloudMutationReceipt.count({
    where: { workspaceId: workspace.id, operationId: op },
  }), 1);
  assert.equal((await prisma.appState.findUniqueOrThrow({
    where: { workspaceId: workspace.id },
  })).revision, 2);
  console.log('PT217_WEBVIEW_FASTIFY_JWT_PG17_SINGLE_PATH=PASS');
  console.log('PT217_REAL_RECEIPT_REPLAY_AND_REUSE_409=PASS');
  console.log('PT217_SYNTHETIC_ONLY_NO_PRODUCTION_ACCESS=PASS');
} finally {
  ws?.close();
  if (forwardPort) { try { adb('forward','--remove','tcp:' + forwardPort); } catch {} }
  if (reverseStarted) { try { adb('reverse','--remove','tcp:3333'); } catch {} }
  if (httpStarted) await api.close();
  await prisma.$disconnect();
  console.log('PT217_API_CDP_ADB_RELEASED=PASS');
}
