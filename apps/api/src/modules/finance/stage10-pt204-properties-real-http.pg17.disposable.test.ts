/** PT204: HTTP loopback + JWT verdadeiro + PostgreSQL 17 descartavel. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import fastify from 'fastify';
import bcrypt from 'bcryptjs';
import { LicenseStatus, Prisma, UserRole, UserStatus, prisma } from '@meg/database';
import { registerAuth } from '../../plugins/auth';
import { authRoutes } from '../auth/routes';
import { appStateRoutes } from '../app-state/routes';
import { decideLegacyOutboxRejection } from '../../../../web/src/cloud-outbox-conflict-policy.js';

const url = new URL(process.env.DATABASE_URL || 'https://invalid');
const localSandbox = url.port === '55577' && url.pathname === '/meg_stage10_pt204_sandbox';
const githubSandbox = process.env.GITHUB_ACTIONS === 'true'
  && process.env.GITHUB_REPOSITORY === 'MarcosVilalva/MEG-Platform'
  && process.env.MEG_STAGE10_QA_LOCAL_ONLY === '1'
  && url.port === '5432' && url.pathname === '/meg_stage10_sandbox';
const guards = url.protocol === 'postgresql:' && url.hostname === '127.0.0.1'
  && url.username === 'meg_stage10_ci' && (localSandbox || githubSandbox)
  && process.env.MEG_STAGE10_PT204_SYNTHETIC === '1'
  && process.env.MEG_STAGE10_ISOLATED_PG === '1'
  && process.env.MEG_STAGE10_WEB_WRITE_QA === '0' && process.env.NODE_ENV === 'test';
if (!guards) throw new Error('PT204_DISPOSABLE_LOCAL_DATABASE_ONLY');
const PORT = 33357;
const app = fastify({ logger: false });
let listening = false;
try {
  const stamp = randomUUID();
  const password = 'PT204-only-' + stamp;
  const actor = await prisma.user.create({data: {
    email:'pt204-' + stamp + '@example.invalid', name:'PT204 synthetic',
    passwordHash:await bcrypt.hash(password,8),role:UserRole.ADMIN,
    status:UserStatus.ACTIVE,isActive:true,approvedAt:new Date(),
  }});
  const plan = await prisma.plan.create({data: {
    code:'PT204-'+stamp,name:'PT204 Plan QA', monthlyPrice:0,maxMembers:2,features:[],
  }});
  const workspace = await prisma.workspace.create({data: {
    ownerId:actor.id,name:'PT204 disposable',slug:'pt204-'+stamp,
    members:{create:[{userId:actor.id,role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true}]},
    subscription:{create:{planId:plan.id,status:LicenseStatus.ACTIVE}},
    appState:{create:{userId:actor.id,revision:1,state:{
      transactions:[],budgets:{},__megNormalization:{mode:'normalized-primary'},
    } as Prisma.InputJsonValue}},
  }});
  await registerAuth(app);
  await app.register(authRoutes,{prefix:'/auth'});
  await app.register(appStateRoutes,{prefix:'/app-state'});
  await app.listen({host:'127.0.0.1',port:PORT});
  listening=true;
  const base='http://127.0.0.1:'+PORT;
  const login=await fetch(base+'/auth/login',{method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({email:actor.email,password})});
  assert.equal(login.status,200);
  const token=(await login.json() as {accessToken:string}).accessToken;
  assert.ok(token?.length>30);
  const headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'};

  const unauthorized=await fetch(base+'/app-state/properties',{method:'PATCH',
    headers:{'Content-Type':'application/json'},body:'{}'});
  assert.equal(unauthorized.status,401);
  console.log('PT204_REAL_HTTP_UNAUTHENTICATED_REJECTED=PASS');

  const revision=await fetch(base+'/app-state',{headers});
  assert.equal(revision.status,200);
  const before=(await revision.json() as {revision:number,state:unknown});
  assert.equal(before.revision,1);
  const operationId=randomUUID();
  const original={ operationId,expectedRevision:before.revision,
    properties:{qaPreference:{label:'PT204-synthetic-A'}}};
  const accepted=await fetch(base+'/app-state/properties',{method:'PATCH',headers,
    body:JSON.stringify(original)});
  assert.equal(accepted.status,200,accepted.status===200?'':await accepted.clone().text()); // real HTTP
  const afterResponse=await accepted.json() as {revision:number,operationId:string};
  assert.equal(afterResponse.operationId,operationId);
  assert.equal(afterResponse.revision,2);
  const replay=await fetch(base+'/app-state/properties',{method:'PATCH',headers,body:JSON.stringify(original)});
  assert.equal(replay.status,200);
  assert.equal((await replay.json() as {replayed:boolean}).replayed,true);
  console.log('PT204_REAL_HTTP_JWT_IDEMPOTENT_REPLAY=PASS');

  const changed={...original,expectedRevision:2,
    properties:{qaPreference:{label:'PT204-synthetic-B'}}};
  const raw=await fetch(base+'/app-state/properties',{method:'PATCH',headers,body:JSON.stringify(changed)});
  assert.equal(raw.status,409);
  assert.equal((await raw.json() as {error:string}).error,'OPERATION_ID_REUSED');
  console.log('PT204_REAL_HTTP_CHANGED_PAYLOAD_409=PASS');

  const source=readFileSync(path.resolve('apps/web/src/instant-persistence.js'),'utf8');
  function extract(a:string,b:string) {
    const start=source.indexOf(a), end=source.indexOf(b,start+a.length);
    assert.ok(start>=0 && end>start,'PT204_CLIENT_SOURCE_CHANGED_'+a);
    return source.slice(start,end);
  }
  const definitions=[
    extract('function readStateOutboxConflict(', '\nasync function parkStateOutboxConflict('),
    extract('async function parkStateOutboxConflict(', '\nfunction enqueueDurableWrite('),
    extract('async function ensureStateOutboxConfirmed(', '\nfunction scheduleOutboxRetry('),
  ].join('\n');
  const durable = new Map<string,unknown>();
  const local=new Map<string,string>();
  const markerKey='meg-cloud-state-properties-outbox-conflict-v1';
  const pending = {generation:17, operationId, properties:changed.properties};
  const persisted = { ...pending };
  let calls=0, cleared=0, generated=0;
  const localStorage={
    getItem:(k:string)=>local.get(k)??null,
    setItem:(k:string,v:string)=>{local.set(k,v)},
    removeItem:(k:string)=>{local.delete(k)},
  };
  const sdk={
    localStorage,
    globalThis:{localStorage},
    STATE_OUTBOX_CONFLICT_KEY:markerKey,
    STATE_OUTBOX_CONFLICT_KIND:'state-properties-conflict',
    readStateOutbox:()=>persisted,
    hasStateOutbox:(v:typeof pending=pending)=>Object.keys(v.properties).length>0,
    parseJson:(s:string)=>{try{return JSON.parse(s||'null')}catch{return null}},
    setSyncStatus:(_s:string)=>{},
    showPersistenceBlocker:(_s:string)=>{},
    parkedOutboxMessage:(s:string)=>s,
    window:{MEG_APP:{showToast:()=>{}},dispatchEvent:()=>{}},
    CustomEvent:class { constructor(_type:string,_options:unknown){} },
    protectOutbox:async(k:string,v:unknown)=>{durable.set(k,structuredClone(v));return {protected:true,unavailable:false}},
    awaitDurableProtection:async()=>{},
    isCloudSessionReady:()=>true,
    navigator:{onLine:true},
    ensureStateOutboxOperationId:(v:unknown)=>v,
    readRemoteState:async()=>{
      const result=await fetch(base+'/app-state',{headers});
      assert.equal(result.status,200);
      return result.json();
    },
    matchesStateProperties:(v:{qaPreference?:unknown},p:{qaPreference?:unknown})=>
      JSON.stringify(v.qaPreference)===JSON.stringify(p.qaPreference),
    publishStatePropertiesConfirmation:()=>{throw Error('PT204_FALSE_CONFIRMATION')},
    clearStateOutboxIfGeneration:(_n:number)=>{cleared++;return true},
    cloudRequest:async(p:string,req:{method:string,body:string})=>{
      assert.equal(p,'/app-state/properties');
      calls++;
      return fetch(base+p,{...req,headers});
    },
    decideLegacyOutboxRejection,
  };
  const keys=Object.keys(sdk);
  const mk = new Function('context',
    '"use strict"; let unpersistedStateOutboxConflict=null;'
    +'const {'+keys.join(',')+'}=context;'
    +definitions
    +'return {ensureStateOutboxConfirmed,readStateOutboxConflict};');
  const client=mk(sdk) as {ensureStateOutboxConfirmed:()=>Promise<boolean>,
    readStateOutboxConflict:()=>{code:string}|null};
  assert.equal(await client.ensureStateOutboxConfirmed(),false);
  assert.equal(calls,1);
  assert.equal(client.readStateOutboxConflict()?.code,'OPERATION_ID_REUSED');
  assert.equal((durable.get('state-properties-conflict') as {operationId:string}).operationId,operationId);
  assert.equal(await client.ensureStateOutboxConfirmed(),false);
  assert.equal(calls,1);
  assert.equal(cleared,0);
  assert.equal(generated,0);
  console.log('PT204_REAL_HTTP_CLIENT_409_PARKED_NO_RETRY=PASS');

  const current=await fetch(base+'/app-state',{headers});
  assert.equal(current.status,200);
  const final=(await current.json() as {revision:number,state:{qaPreference:{label:string}}});
  assert.equal(final.revision,2);
  assert.equal(final.state.qaPreference.label,'PT204-synthetic-A');
  const receipts=await prisma.cloudMutationReceipt.findMany({
    where:{workspaceId:workspace.id,operationId},
    select:{operationId:true},
  });
  assert.equal(receipts.length,1);
  console.log('PT204_REAL_PG17_STATE_RECEIPT_NO_DUPLICATE=PASS');
  console.log('PT204_FASTIFY_HTTP_JWT_PG17_PROPERTIES_GATE=PASS');
} finally {
  if(listening) await app.close();
  await prisma.$disconnect();
  console.log('PT204_FASTIFY_LISTENER_CLOSED=PASS');
}
