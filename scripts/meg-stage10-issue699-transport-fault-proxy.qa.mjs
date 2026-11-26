/**
 * MEG Etapa 10 / #699: transporte descartavel para QA, NUNCA producao.
 * Interrompe o TCP antes de chegar a API, ou descarta o ACK depois
 * da resposta do servidor. Nenhuma resposta HTTP sintetica e devolvida.
 * Alvo e listener obrigatoriamente loopback, sem alterar Android instalado.
 */
import assert from 'node:assert/strict';
import {createServer as tcpServer, connect as tcpConnect} from 'node:net';
import {createServer as httpServer} from 'node:http';
import {once} from 'node:events';

export async function createLoopbackFaultProxy({targetPort,listenPort=0}){
  assert(Number.isInteger(targetPort)&&targetPort>0&&targetPort<65536);
  assert(Number.isInteger(listenPort)&&listenPort>=0&&listenPort<65536);
  const clients=new Set(), upstreams=new Set();
  let mode='online', blocked=0, droppedAck=0, forwarded=0;
  const listener=tcpServer(client=>{
    clients.add(client);
    client.on('error',()=>{});
    client.on('close',()=>clients.delete(client));
    client.setTimeout(15000,()=>client.destroy());
    if(mode==='offline'){
      blocked++;
      client.destroy();
      return;
    }
    forwarded++;
    const upstream=tcpConnect({host:'127.0.0.1',port:targetPort});
    upstreams.add(upstream);
    upstream.on('error',()=>client.destroy());
    upstream.on('close',()=>{upstreams.delete(upstream);client.destroy();});
    upstream.setTimeout(15000,()=>upstream.destroy());
    client.on('close',()=>upstream.destroy());
    client.pipe(upstream);
    if(mode==='lost-ack'){
      upstream.once('data',()=>{
        droppedAck++;
        client.destroy();
        upstream.destroy();
      });
    }else{
      upstream.pipe(client);
    }
  });
  listener.listen(listenPort,'127.0.0.1');
  await once(listener,'listening');
  return {
    port:listener.address().port,
    setMode(next){
      assert(['online','offline','lost-ack'].includes(next));
      mode=next;
      // Destroi canais keep-alive ja estabelecidos, que adb reverse
      // e a troca de modo airplane nao necessariamente encerram.
      for(const socket of clients)socket.destroy();
      for(const socket of upstreams)socket.destroy();
    },
    metrics:()=>({mode,blocked,droppedAck,forwarded,clients:clients.size,upstreams:upstreams.size}),
    async close(){
      for(const socket of clients)socket.destroy();
      for(const socket of upstreams)socket.destroy();
      await new Promise((resolve,reject)=>listener.close(err=>err?reject(err):resolve()));
    }
  };
}

async function selfTest(){
  // Fixture de instrumentacao, nao writer financeiro do MEG.
  const operations=new Map();
  let writes=0,requests=0;
  const api=httpServer(async(req,res)=>{
    requests++;
    if(req.method==='GET'&&req.url==='/health'){
      res.writeHead(200,{'Content-Type':'application/json'}).end('{"ok":true}');
      return;
    }
    if(req.method!=='POST'||req.url!=='/fixture'){
      res.writeHead(404).end();return;
    }
    try{
      const chunks=[];
      for await(const c of req)chunks.push(c);
      const data=JSON.parse(Buffer.concat(chunks).toString());
      assert.equal(typeof data.operationId,'string');
      const original=operations.get(data.operationId);
      if(original){
        const same=original.amount===data.amount;
        res.writeHead(same?200:409,{'Content-Type':'application/json','Connection':'close'});
        res.end(JSON.stringify({replay:same,error:same?undefined:'OPERATION_ID_REUSED'}));
      }else{
        operations.set(data.operationId,data);
        writes++;
        res.writeHead(201,{'Content-Type':'application/json','Connection':'close'});
        res.end(JSON.stringify({created:true}));
      }
    }catch{
      res.writeHead(400).end();
    }
  });
  api.listen(0,'127.0.0.1');
  await once(api,'listening');
  let proxy;
  try{
    proxy=await createLoopbackFaultProxy({targetPort:api.address().port});
    const base='http://127.0.0.1:'+proxy.port;
    const get=await fetch(base+'/health');
    assert.equal(get.status,200);
    const send=(operationId,amount=12.35)=>fetch(base+'/fixture',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({operationId,amount}),
      signal:AbortSignal.timeout(2000)
    });
    const operationId='g699-synthetic-operation';
    proxy.setMode('offline');
    await assert.rejects(send(operationId));
    assert.equal(writes,0);
    assert.equal(requests,1);
    assert(proxy.metrics().blocked>=1);
    console.log('G699_TCP_OFFLINE_NO_SERVER_REQUEST=PASS');
    proxy.setMode('lost-ack');
    await assert.rejects(send(operationId));
    assert.equal(writes,1);
    assert.equal(requests,2);
    assert.equal(proxy.metrics().droppedAck,1);
    console.log('G699_TCP_ACK_DROPPED_AFTER_FIXTURE_COMMIT=PASS');
    proxy.setMode('online');
    const replay=await send(operationId);
    assert.equal(replay.status,200);
    assert.equal((await replay.json()).replay,true);
    assert.equal(writes,1);
    console.log('G699_TCP_SAME_OPERATION_FIXTURE_REPLAY=PASS');
    const altered=await send(operationId,99.99);
    assert.equal(altered.status,409);
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
