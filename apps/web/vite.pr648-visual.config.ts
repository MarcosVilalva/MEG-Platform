import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const current = dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  root: resolve(current, 'pr648-visual'),
  plugins: [react()],
  base: '/',
  build: {
    outDir: resolve(current, 'dist-pr648-visual'),
    emptyOutDir: true,
    rollupOptions: { input: resolve(current, 'pr648-visual/index.html') },
  },
});
