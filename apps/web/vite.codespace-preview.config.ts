import { defineConfig, mergeConfig, type Plugin, type ProxyOptions, type ViteDevServer } from 'vite';
import base from './vite.config';

// Exclusivo de homologação no Codespaces. A API de produção nunca é destino.
if (process.env.VITE_API_URL !== '/api') {
  throw new Error('Preview MEG bloqueado: VITE_API_URL deve ser /api');
}

const localApi = 'http://127.0.0.1:3334';

// Vite atende o navegador na mesma origem publica e encaminha /api para
// uma API privada (127.0.0.1). O tunel do Codespaces pode reescrever Origin.
// Para requests que o proprio navegador classifica como same-origin, nao
// repassar esse Origin no salto interno Vite -> API: CORS entre esses dois
// processos nao se aplica. Origens cross-site continuam sob o CORS da API.
// Sec-Fetch-Site e controlado pelo navegador; nao substitui autenticacao.
const codespaceName = process.env.CODESPACE_NAME || '';
const previewOrigin = /^[a-z0-9-]+$/.test(codespaceName)
  ? `https://${codespaceName}-5174.app.github.dev`
  : null;

if (!previewOrigin) {
  throw new Error('Preview MEG bloqueado: CODESPACE_NAME ausente/invalido no processo Vite.');
}

function isFirstPartyRequest(origin?: string, fetchSite?: string) {
  return Boolean(origin && (origin === previewOrigin || fetchSite === 'same-origin'));
}

const proxy: Record<string, ProxyOptions> = {
  '/api': {
    target: localApi,
    changeOrigin: true,
    rewrite: (url: string) => url.replace(/^\/api/, ''),
    configure(serverProxy) {
      serverProxy.on('proxyReq', (proxyRequest, request) => {
        if (isFirstPartyRequest(
          request.headers.origin,
          request.headers['sec-fetch-site'],
        )) {
          proxyRequest.removeHeader('origin');
        }
      });
      serverProxy.on('proxyRes', (response, request) => {
        if (request.method === 'POST'
          && request.url?.endsWith('/auth/login')
          && (response.statusCode || 0) >= 500) {
          console.error('[MEG preview] Login rejeitado pela API local', {
            status: response.statusCode,
            origemIgualAoCodespace: request.headers.origin === previewOrigin,
            mesmaOrigemBrowser: request.headers['sec-fetch-site'] === 'same-origin',
            origemRemovivelNoProxy: isFirstPartyRequest(
              request.headers.origin,
              request.headers['sec-fetch-site'],
            ),
          });
        }
      });
    },
  },
};

// O Codespaces abre a raiz "/" ao clicar em Ports > Open in Browser.
// No Vite de desenvolvimento essa raiz era o Phoenix legado (index.html).
// Redirecionar SOMENTE a raiz do preview local para a Web Evolution.
const codespaceLanding: Plugin = {
  name: 'meg-pr648-codespace-landing',
  apply: 'serve',
  configureServer(server: ViteDevServer) {
    server.middlewares.use((request, response, next) => {
      const url = request.url || '/';
      if (request.method !== 'GET' || (url !== '/' && !url.startsWith('/?'))) {
        next();
        return;
      }
      response.statusCode = 302;
      response.setHeader('Cache-Control', 'no-store, max-age=0');
      response.setHeader('Location', '/web-evolution.html?v=pr648&nocache=' + Date.now());
      response.end();
    });
  },
};

export default defineConfig(mergeConfig(base, {
  plugins: [codespaceLanding],
  server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,
// A resposta CORS do Vite nao pode permitir origens arbitrarias.
    allowedHosts: ['.app.github.dev'],
    cors: { origin: previewOrigin },
    proxy,
  },
  preview: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,
// A resposta CORS do Vite nao pode permitir origens arbitrarias.
    allowedHosts: ['.app.github.dev'],
    cors: { origin: previewOrigin },
    proxy,
  },
}));
