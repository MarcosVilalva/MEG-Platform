import { defineConfig, mergeConfig, type Plugin, type ProxyOptions, type ViteDevServer } from 'vite';
import base from './vite.config';

// Exclusivo de homologação no Codespaces. A API de produção nunca é destino.
if (process.env.VITE_API_URL !== '/api') {
  throw new Error('Preview MEG bloqueado: VITE_API_URL deve ser /api');
}

const localApi = 'http://127.0.0.1:3334';

// CODESPACE_NAME e recebido do inicializador isolado da PR #648.
// O GitHub pode reescrever Host ou remover Sec-Fetch-Site ao encaminhar
// requisicoes. So a Origin EXATA do Codespace pode ser retirada do salto
// entre Vite e API local; outras origens continuam sob o CORS da API.
const codespaceName = process.env.CODESPACE_NAME || '';
const previewOrigin = /^[a-z0-9-]+$/.test(codespaceName)
  ? `https://${codespaceName}-5174.app.github.dev`
  : null;

if (!previewOrigin) {
  throw new Error('Preview MEG bloqueado: CODESPACE_NAME ausente/invalido no processo Vite.');
}

function isFirstPartyCodespaces(origin?: string) {
  return origin === previewOrigin;
}

const proxy: Record<string, ProxyOptions> = {
  '/api': {
    target: localApi,
    changeOrigin: true,
    rewrite: (url: string) => url.replace(/^\/api/, ''),
    configure(serverProxy) {
      serverProxy.on('proxyReq', (proxyRequest, request) => {
        if (isFirstPartyCodespaces(request.headers.origin)) {
          proxyRequest.removeHeader('origin');
        }
      });
      serverProxy.on('proxyRes', (response, request) => {
        if (request.method === 'POST'
          && request.url?.endsWith('/auth/login')
          && (response.statusCode || 0) >= 500) {
          console.error('[MEG preview] Login rejeitado pela API local', {
            status: response.statusCode,
            originAutorizada: request.headers.origin === previewOrigin,
            mesmaOrigemBrowser: request.headers['sec-fetch-site'] === 'same-origin',
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
    allowedHosts: ['.app.github.dev'],
    proxy,
  },
  preview: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,
    allowedHosts: ['.app.github.dev'],
    proxy,
  },
}));
