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

const webInputs = process.env.CAPACITOR_BUILD
  ? { main: path.resolve(__dirname, 'index.html') }
  : {
      main: path.resolve(__dirname, 'index.html'),
      phoenix: path.resolve(__dirname, 'phoenix.html')
    };

export default defineConfig({
  base: process.env.CAPACITOR_BUILD
    ? './'
    : process.env.VITE_PUBLIC_BASE_PATH || (process.env.GITHUB_ACTIONS ? '/MEG-Platform/' : '/'),
  plugins: [react(), stripEmbeddedApkDownloads()],
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
