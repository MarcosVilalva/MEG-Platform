import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const port = Number(process.env.PORT || 4173);
const apiOrigin = process.env.PHOENIX_API_ORIGIN || 'https://meg-platform-api.onrender.com';
const distDir = fileURLToPath(new URL('./dist/', import.meta.url));

const readPrefixes = [
  '/health',
  '/ready',
  '/auth/me',
  '/auth/users',
  '/finance/',
  '/app-state',
  '/receivables',
  '/cards',
  '/payables',
  '/notifications',
  '/platform-admin',
  '/integrations'
];
const allowedAuthPosts = new Set(['/auth/login', '/auth/refresh', '/auth/logout']);
const hopByHopHeaders = new Set(['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailers', 'transfer-encoding', 'upgrade', 'host', 'origin', 'referer', 'content-length']);

function isApiPath(pathname) {
  return readPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`))
    || allowedAuthPosts.has(pathname);
}

function isAllowedApiRequest(method, pathname) {
  if (method === 'GET' || method === 'HEAD') {
    return readPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`));
  }
  return method === 'POST' && allowedAuthPosts.has(pathname);
}

function mimeType(pathname) {
  switch (extname(pathname).toLowerCase()) {
    case '.html': return 'text/html; charset=utf-8';
    case '.js': return 'text/javascript; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.svg': return 'image/svg+xml';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.webp': return 'image/webp';
    case '.woff2': return 'font/woff2';
    default: return 'application/octet-stream';
  }
}

async function readBody(request) {
  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > 1_000_000) throw new Error('PREVIEW_REQUEST_TOO_LARGE');
    chunks.push(chunk);
  }
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

async function proxyApi(request, response, url) {
  if (!isAllowedApiRequest(request.method || 'GET', url.pathname)) {
    response.writeHead(405, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    response.end(JSON.stringify({ error: 'PREVIEW_READ_ONLY' }));
    return;
  }

  const target = new URL(`${url.pathname}${url.search}`, apiOrigin);
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (value === undefined || hopByHopHeaders.has(name.toLowerCase())) continue;
    if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
    else headers.set(name, value);
  }
  const method = request.method || 'GET';
  const body = method === 'GET' || method === 'HEAD' ? undefined : await readBody(request);
  const upstream = await fetch(target, { method, headers, body, redirect: 'manual', signal: AbortSignal.timeout(45_000) });
  const responseHeaders = {};
  upstream.headers.forEach((value, name) => {
    const lower = name.toLowerCase();
    if (hopByHopHeaders.has(lower) || lower.startsWith('access-control-')) return;
    responseHeaders[name] = value;
  });
  responseHeaders['cache-control'] = 'no-store';
  response.writeHead(upstream.status, responseHeaders);
  if (method === 'HEAD' || upstream.status === 204) {
    response.end();
    return;
  }
  response.end(Buffer.from(await upstream.arrayBuffer()));
}

function serveStatic(response, pathname) {
  const requested = pathname === '/' ? '/phoenix.html' : pathname;
  let decoded;
  try {
    decoded = decodeURIComponent(requested);
  } catch {
    response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Bad Request');
    return;
  }
  const filePath = resolve(distDir, `.${decoded}`);
  if (!filePath.startsWith(resolve(distDir)) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
    response.end('Not Found');
    return;
  }
  response.writeHead(200, {
    'content-type': mimeType(filePath),
    'cache-control': decoded === '/phoenix.html' ? 'no-store' : 'public, max-age=31536000, immutable',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer'
  });
  createReadStream(filePath).pipe(response);
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', 'http://phoenix-preview.local');
    if (url.pathname === '/preview-health') {
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      response.end(JSON.stringify({ status: 'ok', mode: 'phoenix-read-only-preview' }));
      return;
    }
    if (isApiPath(url.pathname)) {
      await proxyApi(request, response, url);
      return;
    }
    if (!['GET', 'HEAD'].includes(request.method || 'GET')) {
      response.writeHead(405, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      response.end(JSON.stringify({ error: 'PREVIEW_READ_ONLY' }));
      return;
    }
    serveStatic(response, url.pathname);
  } catch (error) {
    console.error('Phoenix preview request failed:', error instanceof Error ? error.message : 'UNKNOWN');
    if (!response.headersSent) response.writeHead(502, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    response.end(JSON.stringify({ error: 'PREVIEW_PROXY_FAILED' }));
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Phoenix read-only preview listening on :${port}`);
});
