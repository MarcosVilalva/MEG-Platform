import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const root = dirname(fileURLToPath(import.meta.url));
const arts = ['hero-mountains.webp', 'benefit-card-art.webp', 'benefit-neon.webp'];
for (const art of arts) {
  const file = resolve(root, 'public/meg-web-evolution/home', art);
  if (!existsSync(file)) throw new Error('Arte da Home não encontrada: ' + file);
}
export default defineConfig({
  root,
  publicDir: resolve(root, 'public'),
  plugins: [react()],
  base: '/',
  build: {
    outDir: resolve(root, 'dist-home-06'),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(root, 'home-visual.html'),
    },
  },
});
