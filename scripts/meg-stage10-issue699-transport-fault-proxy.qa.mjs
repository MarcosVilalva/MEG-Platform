/**
 * MEG Etapa 10, issue #699: proxy de falha de transporte SO em loopback.
 * Usar apenas no emulador stage10Qa com PostgreSQL descartavel.
 * CORS OPTIONS deve atravessar normalmente. A conexao do POST financeiro
 * so e interrompida apos uma resposta 201 REAL do backend; nunca fabrica ACK.
 */
import assert from 'node:assert/strict';
import {createServer as httpServer, request as httpRequest} from 'node:http';
import {once} from 'node:events';

export async function createLoopbackFaultProxy({targetPort,listenPort=0}){
  assert(Number.isInteger(targetPort)&&targetPort>0&&targetPort<65536);
  assert(Number.isInteger(listenPort)&&listenPort>=0&&listenPort<65536);
  const clients=new Set(),upstreams=new Set();
  let mode='online',blocked=0,droppedAck=0,forwarded=0,preflights=0;
  const server=httpServer((req,res)=>{
    res.on('error',()=>{});
    const path=(req.url||'').split('?')[0];
    if(mode==='offline'){
      blocked++;
      req.socket.destroy();
      return;
    }
    forwarded++;
    if(req.method==='OPTIONS')preflights++;
    const shouldDrop=mode==='lost-ack'
      &&req.method==='POST'
      &&(path==='/finance/events'||path==='/fixture');
    const upstream=httpRequest({
      hostname:'127.0.0.1',port:targetPort,method:req.method,
      path:req.url,headers:req.headers,
    },response=>{
      // The server already committed by the time a canonical 201 exists.
      // A 4xx/5xx response must reach the test, never masquerade as lost ACK.
      if(shouldDrop&&response.statusCode===201){
        droppedAck++;
        req.socket.destroy();
        response.destroy();
        return;
      }
      res.writeHead(response.statusCode||502,response.headers);
      response.pipe(res);
    });
    upstream.on('socket',socket=>{
      upstreams.add(socket);
      socket.on('close',()=>upstreams.delete(socket));
      socket.setTimeout(15000,()=>socket.destroy());
    });
    upstream.on('error',()=>req.socket.destroy());
    req.on('error',()=>upstream.destroy());
    req.pipe(upstream);
  });
  server.on('connection',socket=>{
    clients.add(socket);
    socket.on('close',()=>clients.delete(socket));
    socket.setTimeout(15000,()=>socket.destroy());
  });
  server.listen(listenPort,'127.0.0.1');
  await once(server,'listening');
  return {
    port:server.address().port,
    setMode(next){
      assert(['online','offline','lost-ack'].includes(next));
      mode=next;
      // Remove conexoes keep-alive ja abertas, inclusive via adb reverse.
      for(const socket of clients)socket.destroy();
      for(const socket of upstreams)socket.destroy();
    },
    metrics:()=>({mode,blocked,droppedAck,forwarded,preflights,
      clients:clients.size,upstreams:upstreams.size}),
    async close(){
      for(const socket of clients)socket.destroy();
      for(const socket of upstreams)socket.destroy();
      await new Promise((resolve,reject)=>
        server.close(err=>err?reject(err):resolve()));
    },
  };
}

async function selfTest(){
  const ops=new Map();
  let writes=0,requests=0;
  const api=httpServer(async(req,res)=>{
    requests++;
    if(req.method==='OPTIONS'){
      res.writeHead(204,{
        'Access-Control-Allow-Origin':'https://localhost',
        'Access-Control-Allow-Methods':'POST,OPTIONS',
        'Access-Control-Allow-Headers':'Authorization,Content-Type',
      }).end();return;
    }
    if(req.method==='GET'&&req.url==='/health'){
      res.writeHead(200,{'Content-Type':'application/json'}).end('{"ok":true}');
      return;
    }
    if(req.method!=='POST'||req.url!=='/fixture'){
      res.writeHead(404).end();return;
    }
    const chunks=[];
    for await(const c of req)chunks.push(c);
    const data=JSON.parse(Buffer.concat(chunks).toString());
    assert.equal(typeof data.operationId,'string');
    const before=ops.get(data.operationId);
    if(before){
      const same=before.amount===data.amount;
      res.writeHead(same?200:409,{'Content-Type':'application/json'});
      res.end(JSON.stringify({replay:same,error:same?undefined:'OPERATION_ID_REUSED'}));
    }else{
      ops.set(data.operationId,data);
      writes++;
      res.writeHead(201,{'Content-Type':'application/json'});
      res.end(JSON.stringify({created:true}));
    }
  });
  api.listen(0,'127.0.0.1');
  await once(api,'listening');
  let proxy;
  try{
    proxy=await createLoopbackFaultProxy({targetPort:api.address().port});
    const base='http://127.0.0.1:'+proxy.port;
    assert.equal((await fetch(base+'/health')).status,200);
    const send=(operationId,amount=12.35)=>fetch(base+'/fixture',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({operationId,amount}),signal:AbortSignal.timeout(3000),
    });
    const id='g699-synthetic-operation';
    proxy.setMode('offline');
    await assert.rejects(send(id));
    assert.equal(writes,0);
    assert.equal(requests,1);
    assert(proxy.metrics().blocked>0);
    console.log('G699_TCP_OFFLINE_NO_SERVER_REQUEST=PASS');

    proxy.setMode('lost-ack');
    const preflight=await fetch(base+'/fixture',{
      method:'OPTIONS',
      headers:{Origin:'https://localhost',
        'Access-Control-Request-Method':'POST',
        'Access-Control-Request-Headers':'Authorization,Content-Type'},
    });
    assert.equal(preflight.status,204);
    assert.equal(writes,0);
    assert.equal(proxy.metrics().droppedAck,0);
    assert.equal(proxy.metrics().preflights,1);
    console.log('G699_TCP_CORS_PREFLIGHT_PRESERVED=PASS');

    await assert.rejects(send(id));
    assert.equal(writes,1);
    assert.equal(proxy.metrics().droppedAck,1);
    console.log('G699_TCP_ACK_DROPPED_AFTER_FIXTURE_COMMIT=PASS');

    proxy.setMode('online');
    const replay=await send(id);
    assert.equal(replay.status,200);
    assert.equal((await replay.json()).replay,true);
    assert.equal(writes,1);
    console.log('G699_TCP_SAME_OPERATION_FIXTURE_REPLAY=PASS');

    const different=await send(id,99.99);
    assert.equal(different.status,409);
    assert.equal(writes,1);
    console.log('G699_TCP_CHANGED_PAYLOAD_FIXTURE_409=PASS');
    console.log('G699_ANDROID_WEBVIEW_FINANCIAL_WRITER_PG17=NOT_EXECUTED');
  }finally{
    await proxy?.close();
    await new Promise(resolve=>api.close(()=>resolve()));
    console.log('G699_TCP_QA_LOOPBACK_CLEANUP=PASS');
  }
}
if(process.argv.includes('--self-test'))selfTest().catch(err=>{
  console.error('G699_TCP_QA_DIAGNOSTIC=FAIL',err.message);
  process.exitCode=1;
});
