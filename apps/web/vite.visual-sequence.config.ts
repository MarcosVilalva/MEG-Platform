import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const current = dirname(fileURLToPath(import.meta.url));
for (const name of ['ambient', 'hologram', 'logo']) {
  const file = resolve(current, 'public/meg-web-evolution/visual-loading', name + '.webp');
  if (!existsSync(file)) throw new Error('Falta arte oficial da Tela 01: ' + file);
}
export default defineConfig({
  root: resolve(current, 'visual-sequence'),
  publicDir: resolve(current, 'public'),
  plugins: [react()],
  base: '/',
  build: {
    outDir: resolve(current, 'dist-visual-sequence'),
    emptyOutDir: true,
    rollupOptions: { input: resolve(current, 'visual-sequence/index.html') },
  },
});
