/**
 * PT215: caracterizacao REAL de receipt fora da transacao nos escritores
 * legados versus rollback QA atomico. Todos os dados/DB sao descartaveis.
 */
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import fastify from 'fastify';
import bcrypt from 'bcryptjs';
import {prisma, Prisma, LicenseStatus, UserRole, UserStatus} from '@meg/database';
import {registerAuth} from '../../plugins/auth';
import {authRoutes} from '../auth/routes';
import {appStateRoutes} from '../app-state/routes';

const db=new URL(process.env.DATABASE_URL||'https://invalid');
const localSandbox=db.port==='55585' && db.pathname==='/meg_stage10_sandbox';
const githubSandbox=process.env.GITHUB_ACTIONS==='true'
  && process.env.GITHUB_REPOSITORY==='MarcosVilalva/MEG-Platform'
  && process.env.MEG_STAGE10_QA_LOCAL_ONLY==='1'
  && db.port==='5432' && db.pathname==='/meg_stage10_sandbox';
if (!(db.protocol==='postgresql:' && db.hostname==='127.0.0.1'
  && db.username==='meg_stage10_ci' && (localSandbox || githubSandbox)
  && process.env.MEG_STAGE10_PT215_SYNTHETIC==='1'
  && process.env.MEG_STAGE10_ISOLATED_PG==='1'
  && process.env.MEG_STAGE10_WEB_WRITE_QA==='0'
  && process.env.NODE_ENV==='test')) {
  throw Error('PT215_FRESH_DISPOSABLE_PG17_ONLY');
}
const port=33365;
const app=fastify({logger:false});
let started=false;
try {
  const stamp=randomUUID();
  const pass='pt215-'+stamp;
  const owner=await prisma.user.create({data:{
    email:'pt215-'+stamp+'@example.invalid',name:'PT215 synthetic',
    passwordHash:await bcrypt.hash(pass,8),role:UserRole.ADMIN,
    status:UserStatus.ACTIVE,isActive:true,approvedAt:new Date(),
  }});
  const plan=await prisma.plan.create({data:{
    code:'PT215-'+stamp,name:'PT215 synthetic plan',monthlyPrice:0,maxMembers:2,features:[],
  }});
  const workspace=await prisma.workspace.create({data:{
    ownerId:owner.id,name:'PT215 synthetic workspace',slug:'pt215-'+stamp,
    members:{create:[{userId:owner.id,role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true}]},
    subscription:{create:{planId:plan.id,status:LicenseStatus.ACTIVE}},
    appState:{create:{userId:owner.id,revision:1,state:{
      transactions:[],budgets:{},
    } as Prisma.InputJsonValue}},
  }});
  // Injetar falha de escrita de RECIBO, nunca da operacao anterior.
  // Esta funcao e criada APENAS no banco novo e descartavel.
  await prisma.$executeRawUnsafe(`
CREATE FUNCTION pt215_reject_receipt_insert() RETURNS trigger AS $pt215$
BEGIN
  IF NEW."mutationType" IN ('transactions','state-properties') THEN
    RAISE EXCEPTION 'PT215_SYNTHETIC_RECEIPT_INSERT_REJECTED';
  END IF;
  RETURN NEW;
END;
$pt215$ LANGUAGE plpgsql
`);
  await prisma.$executeRawUnsafe(`
CREATE TRIGGER pt215_reject_receipt BEFORE INSERT ON "CloudMutationReceipt"
FOR EACH ROW EXECUTE FUNCTION pt215_reject_receipt_insert()
`);
  console.log('PT215_SYNTHETIC_DB_TRIGGER_ACTIVE=PASS');
  await registerAuth(app);
  await app.register(authRoutes,{prefix:'/auth'});
  await app.register(appStateRoutes,{prefix:'/app-state'});
  await app.listen({host:'127.0.0.1',port});
  started=true;
  const url='http://127.0.0.1:'+port;
  const auth=await fetch(url+'/auth/login',{method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({email:owner.email,password:pass})});
  assert.equal(auth.status,200);
  const jwt=(await auth.json() as {accessToken:string}).accessToken;
  assert.ok(jwt&&jwt.length>30);
  const headers={Authorization:'Bearer '+jwt,'Content-Type':'application/json'};
  const get=async()=>{
    const r=await fetch(url+'/app-state',{headers});
    assert.equal(r.status,200);
    return r.json() as Promise<{revision:number;state:{
      qaPreference?:{label:string};transactions:{id:string}[];
    }}>;
  };
  const properties=async (expectedRevision:number,operationId:string,label:string)=>
    fetch(url+'/app-state/properties',{method:'PATCH',headers,body:JSON.stringify({
      operationId,expectedRevision,properties:{qaPreference:{label}},
    })});
  const receiptCount=()=>prisma.cloudMutationReceipt.count({where:{workspaceId:workspace.id}});
  // Falha forçada de CloudMutationReceipt nao pode deixar AppState gravado.
  assert.equal((await get()).revision,1);
  const opProps=randomUUID();
  const rejectedProp=await properties(1,opProps,'pt215-retry-after-fault');
  assert.equal(rejectedProp.status,500);
  const afterRejectedProp=await get();
  assert.equal(afterRejectedProp.revision,1);
  assert.equal(afterRejectedProp.state.qaPreference,undefined);
  assert.equal(await receiptCount(),0);
  console.log('PT215_LEGACY_PROPERTIES_RECEIPT_FAULT_ROLLBACK=PASS');

  // Experimento QA existente deve preservar rollback e contrato.
  process.env.MEG_STAGE10_WEB_WRITE_QA='1';
  const atomicRejected=await properties(1,randomUUID(),'pt215-qa-rejected');
  assert.equal(atomicRejected.status,500);
  assert.equal((await get()).revision,1);
  assert.equal((await get()).state.qaPreference,undefined);
  assert.equal(await receiptCount(),0);
  process.env.MEG_STAGE10_WEB_WRITE_QA='0';
  console.log('PT215_QA_PROPERTIES_RECEIPT_FAULT_ROLLBACK=PASS');

  const transactionId='pt215-transaction-'+stamp;
  const txn={
    id:transactionId,type:'expense',status:'paid',situation:'PAGO',
    description:'PT215 synthetic expense',date:'2026-11-11',
    amount:18.35,expenseAmount:18.35,paymentMethod:'PIX',
  };
  const opTxn=randomUUID();
  const payload={operationId:opTxn,expectedRevision:1,upserts:[txn],deletes:[]};
  const rejectTxn=await fetch(url+'/app-state/transactions',{
    method:'PATCH',headers,body:JSON.stringify(payload),
  });
  assert.equal(rejectTxn.status,500);
  const afterRejectedTxn=await get();
  assert.equal(afterRejectedTxn.revision,1);
  assert.equal(afterRejectedTxn.state.transactions.length,0);
  assert.equal(await receiptCount(),0);
  console.log('PT215_LEGACY_TRANSACTIONS_RECEIPT_FAULT_ROLLBACK=PASS');

  const noOp=await fetch(url+'/app-state/transactions',{
    method:'PATCH',headers,body:JSON.stringify({
      operationId:randomUUID(),expectedRevision:1,upserts:[],deletes:[],
    }),
  });
  assert.equal(noOp.status,500);
  assert.equal((await get()).revision,1);
  assert.equal(await receiptCount(),0);
  console.log('PT215_EMPTY_PATCH_RECEIPT_FAULT_NO_FALSE_ACK=PASS');

  // Primeira escrita em workspace SEM AppState nao pode deixar estado sem
  // recibo. Dois usuarios independentes exercitam transactions e properties.
  const firstActor=async (label:string)=>{
    const user=await prisma.user.create({data:{
      email:'pt215-first-'+label+'-'+stamp+'@example.invalid',
      name:'PT215 first writer '+label,passwordHash:await bcrypt.hash(pass,8),
      role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true,approvedAt:new Date(),
    }});
    const isolated=await prisma.workspace.create({data:{
      ownerId:user.id,name:'PT215 '+label,slug:'pt215-'+label+'-'+stamp,
      members:{create:[{userId:user.id,role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true}]},
      subscription:{create:{planId:plan.id,status:LicenseStatus.ACTIVE}},
    }});
    const authFirst=await fetch(url+'/auth/login',{method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({email:user.email,password:pass}),
    });
    assert.equal(authFirst.status,200);
    const firstJwt=(await authFirst.json() as {accessToken:string}).accessToken;
    return {workspaceId:isolated.id,headers:{
      Authorization:'Bearer '+firstJwt,'Content-Type':'application/json',
    }};
  };
  const firstTxn=await firstActor('transaction');
  const firstProp=await firstActor('property');
  const firstTxnOp=randomUUID(),firstPropOp=randomUUID();
  const firstTxnPayload={
    operationId:firstTxnOp,expectedRevision:0,deletes:[],
    upserts:[{...txn,id:'pt215-first-transaction-'+stamp}],
  };
  const firstPropPayload={
    operationId:firstPropOp,expectedRevision:0,
    properties:{qaPreference:{label:'pt215-first-property'}},
  };
  const freshCall=(urlPath:string,firstHeaders:Record<string,string>,body:unknown)=>
    fetch(url+urlPath,{method:'PATCH',headers:firstHeaders,body:JSON.stringify(body)});
  const rejectedFirstTxn=await freshCall('/app-state/transactions',firstTxn.headers,firstTxnPayload);
  const rejectedFirstProp=await freshCall('/app-state/properties',firstProp.headers,firstPropPayload);
  assert.equal(rejectedFirstTxn.status,500);
  assert.equal(rejectedFirstProp.status,500);
  assert.equal(await prisma.appState.findUnique({where:{workspaceId:firstTxn.workspaceId}}),null);
  assert.equal(await prisma.appState.findUnique({where:{workspaceId:firstProp.workspaceId}}),null);
  assert.equal(await prisma.cloudMutationReceipt.count({where:{
    workspaceId:{in:[firstTxn.workspaceId,firstProp.workspaceId]},
  }}),0);
  console.log('PT215_FIRST_APPSTATE_CREATE_RECEIPT_FAILURE_ROLLBACK=PASS');

  // Retira a falha exclusivamente do banco ficticio, mantendo o mesmo processo.
  await prisma.$executeRawUnsafe('DROP TRIGGER pt215_reject_receipt ON "CloudMutationReceipt"');
  await prisma.$executeRawUnsafe('DROP FUNCTION pt215_reject_receipt_insert()');
  console.log('PT215_SYNTHETIC_FAULT_TRIGGER_REMOVED=PASS');

  const committedFirstTxn=await freshCall('/app-state/transactions',firstTxn.headers,firstTxnPayload);
  const committedFirstProp=await freshCall('/app-state/properties',firstProp.headers,firstPropPayload);
  assert.equal(committedFirstTxn.status,200,
    committedFirstTxn.status===200?'':await committedFirstTxn.clone().text());
  assert.equal(committedFirstProp.status,200,
    committedFirstProp.status===200?'':await committedFirstProp.clone().text());
  const stateFirstTxn=await prisma.appState.findUniqueOrThrow({where:{
    workspaceId:firstTxn.workspaceId,
  }});
  const stateFirstProp=await prisma.appState.findUniqueOrThrow({where:{
    workspaceId:firstProp.workspaceId,
  }});
  assert.equal(stateFirstTxn.revision,1);
  assert.equal(stateFirstProp.revision,1);
  assert.equal(await prisma.cloudMutationReceipt.count({where:{
    workspaceId:{in:[firstTxn.workspaceId,firstProp.workspaceId]},
  }}),2);
  const replayFirstTxn=await freshCall('/app-state/transactions',firstTxn.headers,firstTxnPayload);
  const replayFirstProp=await freshCall('/app-state/properties',firstProp.headers,firstPropPayload);
  assert.equal(replayFirstTxn.status,200);
  assert.equal(replayFirstProp.status,200);
  assert.equal((await replayFirstTxn.json() as {replayed?:boolean}).replayed,true);
  assert.equal((await replayFirstProp.json() as {replayed?:boolean}).replayed,true);
  assert.equal(await prisma.cloudMutationReceipt.count({where:{
    workspaceId:{in:[firstTxn.workspaceId,firstProp.workspaceId]},
  }}),2);
  console.log('PT215_FIRST_APPSTATE_CREATE_RETRY_AND_REPLAY=PASS');

  // OperationId cuja transacao ROLLOU BACK e reutilizavel com o corpo original.
  const createdProp=await properties(1,opProps,'pt215-retry-after-fault');
  assert.equal(createdProp.status,200,
    createdProp.status===200?'':await createdProp.clone().text());
  assert.equal((await get()).revision,2);
  assert.equal((await get()).state.qaPreference?.label,'pt215-retry-after-fault');
  assert.equal(await receiptCount(),1);
  const propReplay=await properties(1,opProps,'pt215-retry-after-fault');
  assert.equal(propReplay.status,200);
  assert.equal((await propReplay.json() as {replayed?:boolean}).replayed,true);
  assert.equal((await get()).revision,2);
  assert.equal(await receiptCount(),1);
  console.log('PT215_PROPERTIES_ATOMIC_SUCCESS_AND_REPLAY=PASS');

  // A mesma chave da transacao que teve rollback deve funcionar uma vez,
  // e o reenvio depois do commit deve recuperar o recibo sem duplicacao.
  const committedBody={...payload,expectedRevision:2};
  const txnCommit=await fetch(url+'/app-state/transactions',{
    method:'PATCH',headers,body:JSON.stringify(committedBody),
  });
  assert.equal(txnCommit.status,200,txnCommit.status===200?'':await txnCommit.clone().text());
  assert.equal((await get()).revision,3);
  assert.equal((await get()).state.transactions.length,1);
  assert.equal(await receiptCount(),2);
  const txnReplay=await fetch(url+'/app-state/transactions',{
    method:'PATCH',headers,body:JSON.stringify(committedBody),
  });
  assert.equal(txnReplay.status,200);
  assert.equal((await txnReplay.json() as {replayed?:boolean}).replayed,true);
  assert.equal((await get()).revision,3);
  assert.equal(await receiptCount(),2);
  console.log('PT215_TRANSACTIONS_ATOMIC_SUCCESS_AND_REPLAY=PASS');

  const changedPayload={...committedBody,expectedRevision:3,
    upserts:[{...txn,description:'PT215 changed content must reject'}]};
  const changed=await fetch(url+'/app-state/transactions',{
    method:'PATCH',headers,body:JSON.stringify(changedPayload),
  });
  assert.equal(changed.status,409);
  assert.equal((await changed.json() as {error:string}).error,'OPERATION_ID_REUSED');
  assert.equal((await get()).revision,3);
  console.log('PT215_SAME_OPERATION_CHANGED_PAYLOAD_REJECTED=PASS');

  // Dois escritores concorrentes com mesma revisao. Somente um commit.
  const rivals=['A','B'].map(label=>({
    operationId:randomUUID(),expectedRevision:3,deletes:[],
    upserts:[{...txn,description:'PT215 rival '+label}],
  }));
  const writes=await Promise.all(rivals.map(x=>fetch(url+'/app-state/transactions',{
    method:'PATCH',headers,body:JSON.stringify(x),
  })));
  assert.deepEqual(writes.map(x=>x.status).sort(),[200,409]);
  const afterRace=await get();
  assert.equal(afterRace.revision,4);
  assert.equal(afterRace.state.transactions.length,1);
  assert.equal(await receiptCount(),3);
  console.log('PT215_CONCURRENT_DISTINCT_OPERATIONS_SINGLE_COMMIT=PASS');

  console.log('PT215_LEGACY_ATOMIC_RECEIPT_FULL_HTTP_JWT_PG17_GATE=PASS');
} finally {
  process.env.MEG_STAGE10_WEB_WRITE_QA='0';
  if(started) await app.close();
  await prisma.$disconnect();
  console.log('PT215_FASTIFY_DISPOSED=PASS');
}
