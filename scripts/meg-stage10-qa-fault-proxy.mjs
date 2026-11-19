import { createServer, request as httpRequest } from 'node:http';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ALLOWED_PATHS = new Set(['/finance/events', '/finance/benefit-events']);

export function createQaFaultProxy({ upstreamPort, listenPort = 3333, dropPath, log = () => {} }) {
  if (!Number.isInteger(upstreamPort) || upstreamPort < 1 || upstreamPort > 65535) {
    throw new Error('Porta da API QA inválida.');
  }
  if (!Number.isInteger(listenPort) || listenPort < 0 || listenPort > 65535) {
    throw new Error('Porta do proxy QA inválida.');
  }
  if (!ALLOWED_PATHS.has(dropPath)) {
    throw new Error('Falha controlada permitida apenas para os writers monetário e benefício.');
  }
  let dropped = false;
  const server = createServer((clientRequest, clientResponse) => {
    const pathname = new URL(clientRequest.url || '/', 'http://127.0.0.1').pathname;
    const upstream = httpRequest({
      hostname: '127.0.0.1',
      port: upstreamPort,
      method: clientRequest.method,
      path: clientRequest.url,
      headers: { ...clientRequest.headers, host: `127.0.0.1:${upstreamPort}` },
    }, (upstreamResponse) => {
      const status = upstreamResponse.statusCode || 502;
      const mustDrop = !dropped && clientRequest.method === 'POST'
        && pathname === dropPath && status >= 200 && status < 300;
      if (mustDrop) {
        dropped = true;
        // A API já processou a requisição e emitiu 2xx. Descartamos somente a resposta.
        upstreamResponse.resume();
        upstreamResponse.once('end', () => {
          log(`QA_FAULT_DROP_AFTER_COMMIT route=${pathname} status=${status}`);
          clientResponse.destroy();
        });
        return;
      }
      clientResponse.writeHead(status, upstreamResponse.headers);
      upstreamResponse.pipe(clientResponse);
    });
    upstream.on('error', () => {
      if (!clientResponse.headersSent && !clientResponse.destroyed) {
        clientResponse.writeHead(502, { 'content-type': 'application/json' });
        clientResponse.end('{"error":"QA_UPSTREAM_UNAVAILABLE"}');
      } else clientResponse.destroy();
    });
    clientRequest.pipe(upstream);
  });
  server.on('clientError', (_error, socket) => socket.destroy());
  return { server, wasDropped: () => dropped };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.env.MEG_STAGE10_ISOLATED_PG !== '1'
    || process.env.MEG_STAGE10_QA_LOCAL_ONLY !== '1') {
    console.error('REFUSADO: exigidos MEG_STAGE10_ISOLATED_PG=1 e MEG_STAGE10_QA_LOCAL_ONLY=1.');
    process.exitCode = 2;
  } else {
    const dropPath = process.env.MEG_STAGE10_QA_DROP_PATH || '';
    try {
      const proxy = createQaFaultProxy({
        upstreamPort: 3334,
        listenPort: 3333,
        dropPath,
        log: (line) => console.log(line),
      });
      proxy.server.on('error', (error) => {
        console.error(`PROXY_QA_NAO_INICIADO=${error.code || 'UNKNOWN'}`);
        process.exitCode = 2;
      });
      proxy.server.listen(3333, '127.0.0.1', () => {
        console.log(`PROXY_QA_LOCAL_ONLY=127.0.0.1:3333 FORWARD=127.0.0.1:3334 DROP_ONCE=${dropPath}`);
      });
      const shutdown = () => proxy.server.close();
      process.once('SIGTERM', shutdown);
      process.once('SIGINT', shutdown);
    } catch (error) {
      console.error(`REFUSADO=${error.message}`);
      process.exitCode = 2;
    }
  }
}
