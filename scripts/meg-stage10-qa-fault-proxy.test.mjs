import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { test } from 'node:test';
import { createQaFaultProxy } from './meg-stage10-qa-fault-proxy.mjs';

function listen(server) {
  server.listen(0, '127.0.0.1');
  return once(server, 'listening').then(() => server.address().port);
}

for (const path of ['/finance/events', '/finance/benefit-events']) {
  test(`QA: resposta perdida após commit e replay idempotente ${path}`, async () => {
    const events = new Map();
    let calls = 0;
    const api = createServer(async (request, response) => {
      if (request.method === 'GET' && request.url === '/ready') {
        response.writeHead(200).end('ready'); return;
      }
      let body = '';
      for await (const piece of request) body += piece;
      if (request.method !== 'POST' || request.url !== path) {
        response.writeHead(404).end(); return;
      }
      const payload = JSON.parse(body);
      if (payload.operationId === 'invalid') {
        response.writeHead(422).end('rejected'); return;
      }
      calls++;
      if (!events.has(payload.operationId)) events.set(payload.operationId, `fake-event-${events.size + 1}`);
      response.writeHead(201, { 'content-type': 'application/json' }).end(JSON.stringify({ id: events.get(payload.operationId) }));
    });
    const apiPort = await listen(api);
    const logs = [];
    const proxy = createQaFaultProxy({ upstreamPort: apiPort, listenPort: 0, dropPath: path, log: (message) => logs.push(message) });
    const proxyPort = await listen(proxy.server);
    try {
      const url = `http://127.0.0.1:${proxyPort}`;
      assert.equal((await fetch(`${url}/ready`)).status, 200);
      assert.equal((await fetch(`${url}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"operationId":"invalid"}' })).status, 422);
      assert.equal(proxy.wasDropped(), false);
      const attempt = () => fetch(`${url}${path}`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: '{"operationId":"fake-operation-1","amount":10.35}',
        signal: AbortSignal.timeout(3000),
      });
      await assert.rejects(attempt(), /fetch failed|terminated|aborted|socket/i);
      assert.equal(proxy.wasDropped(), true);
      const replay = await attempt();
      assert.equal(replay.status, 201);
      assert.deepEqual(await replay.json(), { id: 'fake-event-1' });
      assert.equal(events.size, 1);
      assert.equal(calls, 2);
      assert.match(logs.join('\n'), /QA_FAULT_DROP_AFTER_COMMIT/);
    } finally {
      proxy.server.closeAllConnections();
      proxy.server.close();
      api.closeAllConnections();
      api.close();
    }
  });
}

test('QA: recusa alvo fora dos writers autorizados', () => {
  assert.throws(() => createQaFaultProxy({ upstreamPort: 3334, dropPath: '/app-state/transactions' }), /apenas/);
});
