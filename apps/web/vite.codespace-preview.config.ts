import { defineConfig, mergeConfig, type Plugin, type ProxyOptions, type ViteDevServer } from 'vite';
import base from './vite.config';

// Exclusivo de homologação no Codespaces. A API de produção nunca é destino.
if (process.env.VITE_API_URL !== '/api') {
  throw new Error('Preview MEG bloqueado: VITE_API_URL deve ser /api');
}

const localApi = 'http://127.0.0.1:3334';

// O navegador chama o Vite pela mesma origem pública. O salto Vite -> API
// é interno: não deve herdar Origin, desde que origem e Host coincidam com
// o endereço HTTPS de homologação do Codespaces nesta porta específica.
// Origens diferentes continuam sujeitas ao CORS restritivo da API.
function isFirstPartyCodespaces(origin?: string, host?: string) {
  if (!origin || !host || !/^[a-z0-9-]+-5174\.app\.github\.dev$/.test(host)) return false;
  try {
    return new URL(origin).origin === `https://${host}`;
  } catch {
    return false;
  }
}

const proxy: Record<string, ProxyOptions> = {
  '/api': {
    target: localApi,
    changeOrigin: true,
    rewrite: (url: string) => url.replace(/^\/api/, ''),
    configure(serverProxy) {
      serverProxy.on('proxyReq', (proxyRequest, request) => {
        if (isFirstPartyCodespaces(request.headers.origin, request.headers.host)) {
          proxyRequest.removeHeader('origin');
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
