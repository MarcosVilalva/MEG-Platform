import { defineConfig, mergeConfig } from 'vite';
import base from './vite.config';

// Exclusivo de homologação no Codespaces. A API de produção nunca é destino.
if (process.env.VITE_API_URL !== '/api') {
  throw new Error('Preview MEG bloqueado: VITE_API_URL deve ser /api');
}

const localApi = 'http://127.0.0.1:3334';
const proxy = {
  '/api': {
    target: localApi,
    changeOrigin: true,
    rewrite: (url: string) => url.replace(/^\/api/, ''),
  },
};

export default defineConfig(mergeConfig(base, {
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
