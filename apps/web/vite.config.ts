import { defineConfig } from 'vite';
import type { OutputBundle, OutputOptions } from 'rollup';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { copyFileSync, readFileSync, rmSync } from 'node:fs';

const publicBase = process.env.CAPACITOR_BUILD
  ? './'
  : process.env.VITE_PUBLIC_BASE_PATH || (process.env.GITHUB_ACTIONS ? '/MEG-Platform/' : '/');

const stripEmbeddedApkDownloads = () => ({
  name: 'strip-embedded-apk-downloads',
  closeBundle() {
    if (process.env.CAPACITOR_BUILD) {
      rmSync(path.resolve(__dirname, 'dist/downloads'), { recursive: true, force: true });
    }
  }
});

const stage05WebRoot = () => ({
  name: 'stage05-web-root',
  transformIndexHtml: {
    order: 'pre' as const,
    handler(html: string, context: { path?: string }) {
      if (process.env.CAPACITOR_BUILD || !context.path?.endsWith('/index.html')) return html;
      return readFileSync(path.resolve(__dirname, 'web-evolution.html'), 'utf8');
    }
  }
});

const pagesStage05Fallback = () => ({
  name: 'pages-stage05-fallback',
  apply: 'build' as const,
  closeBundle() {
    if (process.env.CAPACITOR_BUILD) return;
    const dist = path.resolve(__dirname, 'dist');
    copyFileSync(path.join(dist, 'index.html'), path.join(dist, '404.html'));
  }
});

const rewriteStage05PublicAssetBase = () => ({
  name: 'stage05-public-asset-base',
  apply: 'build' as const,
  generateBundle(_options: OutputOptions, bundle: OutputBundle) {
    if (process.env.CAPACITOR_BUILD) return;
    const base = publicBase.endsWith('/') ? publicBase : `${publicBase}/`;
    for (const output of Object.values(bundle)) {
      if (output.type !== 'asset' || !output.fileName.endsWith('.css') || typeof output.source !== 'string') continue;
      output.source = output.source.replace(/url\((['"]?)\/meg-web-evolution\//g, `url($1${base}meg-web-evolution/`);
    }
  }
});

const stripPhoenixPublicAssets = () => ({
  name: 'strip-phoenix-public-assets',
  apply: 'build' as const,
  closeBundle() {
    if (process.env.CAPACITOR_BUILD) return;
    for (const file of [
      'assets/phoenix-card-premium.css',
      'assets/phoenix-mobile-login-fix.css',
      'assets/phoenix-runtime-refinements.css',
      'assets/phoenix-v15-final-polish.css'
    ]) {
      rmSync(path.resolve(__dirname, 'dist', file), { force: true });
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
        if (process.env.CAPACITOR_BUILD && context.path?.endsWith('/index.html')) return html;
        if (!context.path?.endsWith('/index.html') && !context.path?.endsWith('/404.html') && !context.path?.endsWith('/evolution.html') && !context.path?.endsWith('/web-evolution.html') && !context.path?.endsWith('/datagrid-harness.html')) return html;
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
      evolution: path.resolve(__dirname, 'evolution.html'),
      webEvolution: path.resolve(__dirname, 'web-evolution.html'),
      dataGridHarness: path.resolve(__dirname, 'datagrid-harness.html')
    };

export default defineConfig({
  base: publicBase,
  plugins: [stage05WebRoot(), react(), evolutionProductionCsp(), rewriteStage05PublicAssetBase(), stripPhoenixPublicAssets(), stripEmbeddedApkDownloads(), pagesStage05Fallback()],
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
