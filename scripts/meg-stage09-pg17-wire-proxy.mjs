/**
 * Stage09: synthetic PostgreSQL17 TCP byte counter.
 * Exists only in CI with disposable localhost PostgreSQL.
 * No packet capture, logs of payloads, credentials or real data.
 */
import assert from 'node:assert/strict';
import net from 'node:net';
import http from 'node:http';

assert.equal(process.env.CI, 'true', 'CI-only proxy');
assert.equal(process.env.MEG_STAGE09_SYNTHETIC_ONLY, 'YES', 'Synthetic-only proxy');
assert.equal(process.env.MEG_STAGE09_PG17_WIRE_PROXY, 'YES', 'Explicit proxy opt-in');
assert.equal(
  process.env.DATABASE_URL,
  'postgresql://ci:ci@127.0.0.1:5433/meg_stage09_egress_synthetic?schema=public',
  'Proxy may only measure the disposable PostgreSQL17 database',
);

let toDatabase = 0;
let fromDatabase = 0;
let connections = 0;

const proxy = net.createServer((client) => {
  connections += 1;
  const upstream = net.createConnection({ host: '127.0.0.1', port: 5432 });
  client.on('data', (buffer) => {
    toDatabase += buffer.length;
    upstream.write(buffer);
  });
  upstream.on('data', (buffer) => {
    fromDatabase += buffer.length;
    client.write(buffer);
  });
  client.on('end', () => upstream.end());
  upstream.on('end', () => client.end());
  client.on('error', () => upstream.destroy());
  upstream.on('error', () => client.destroy());
  client.on('close', () => upstream.destroy());
  upstream.on('close', () => client.destroy());
});

const monitor = http.createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ ready: true, syntheticOnly: true }));
    return;
  }
  if (request.method === 'POST' && request.url === '/reset') {
    toDatabase = 0;
    fromDatabase = 0;
    connections = 0;
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ reset: true }));
    return;
  }
  if (request.method === 'GET' && request.url === '/stats') {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({
      serverToClientBytes: fromDatabase,
      clientToServerBytes: toDatabase,
      connections,
    }));
    return;
  }
  response.writeHead(404);
  response.end('not found');
});

proxy.listen(5433, '127.0.0.1', () => {
  monitor.listen(5434, '127.0.0.1', () => {
    process.stdout.write('STAGE09_DISPOSABLE_PG17_PROXY_READY\n');
  });
});

const close = () => {
  proxy.close();
  monitor.close();
};
process.on('SIGTERM', close);
process.on('SIGINT', close);
