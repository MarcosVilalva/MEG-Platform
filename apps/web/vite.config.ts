import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { rmSync } from 'node:fs';

const stripEmbeddedApkDownloads = () => ({
  name: 'strip-embedded-apk-downloads',
  closeBundle() {
    if (process.env.CAPACITOR_BUILD) {
      rmSync(path.resolve(__dirname, 'dist/downloads'), { recursive: true, force: true });
    }
  }
});


function productionApiOrigin() {
  const configured = process.env.VITE_API_URL || 'https://meg-platform-api.onrender.com';
  try {
    return new URL(configured).origin;
  } catch {
    return 'https://meg-platform-api.onrender.com';
  }
}

const evolutionProductionCsp = () => {
  const apiOrigin = productionApiOrigin();
  const policy = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "media-src 'self' blob: https:",
    `connect-src 'self' ${apiOrigin}`,
    "worker-src 'self' blob:",
    "frame-src 'none'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ].join('; ');

  return {
    name: 'evolution-production-csp',
    apply: 'build' as const,
    transformIndexHtml: {
      order: 'pre' as const,
      handler(html: string, context: { path?: string }) {
        if (!context.path?.endsWith('/evolution.html') && !context.path?.endsWith('/web-evolution.html') && !context.path?.endsWith('/datagrid-harness.html')) return html;
        return {
          html,
          tags: [{
            tag: 'meta',
            attrs: {
              'http-equiv': 'Content-Security-Policy',
              content: policy
            },
            injectTo: 'head-prepend' as const
          }]
        };
      }
    }
  };
};

const webInputs = process.env.CAPACITOR_BUILD
  ? { main: path.resolve(__dirname, 'index.html') }
  : {
      main: path.resolve(__dirname, 'index.html'),
      phoenix: path.resolve(__dirname, 'phoenix.html'),
      evolution: path.resolve(__dirname, 'evolution.html'),
      webEvolution: path.resolve(__dirname, 'web-evolution.html'),
      dataGridHarness: path.resolve(__dirname, 'datagrid-harness.html')
    };

export default defineConfig({
  base: process.env.CAPACITOR_BUILD
    ? './'
    : process.env.VITE_PUBLIC_BASE_PATH || (process.env.GITHUB_ACTIONS ? '/MEG-Platform/' : '/'),
  plugins: [react(), evolutionProductionCsp(), stripEmbeddedApkDownloads()],
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, '../../packages/core/src'),
      '@ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@shared': path.resolve(__dirname, '../../packages/shared/src')
    }
  },
  build: {
    rollupOptions: {
      input: webInputs
    }
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: ['terminal.local'],
    proxy: {
      '/api': {
        target: 'https://meg-platform-api.onrender.com',
        changeOrigin: true,
        rewrite: (requestPath) => requestPath.replace(/^\/api/, '')
      }
    }
  }
});
