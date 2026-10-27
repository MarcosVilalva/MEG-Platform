import { defineConfig } from 'vite';
import { existsSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const current = dirname(fileURLToPath(import.meta.url));
// O Vite usa uma raiz exclusiva para o preview, mas as imagens oficiais
// permanecem versionadas no diretório público da Web atual.
for (const name of ['hero','expense','income','transfer','benefit']) {
  const asset = resolve(current,'public/meg-assets',name + '.webp');
  if (!existsSync(asset)) {
    throw new Error('Preview visual sem imagem obrigatória: ' + asset);
  }
}
export default defineConfig({
  root: resolve(current, 'pr648-visual'),
  plugins: [react()],
  publicDir: resolve(current, 'public'),
  base: '/',
  build: {
    outDir: resolve(current, 'dist-pr648-visual'),
    emptyOutDir: true,
    rollupOptions: { input: resolve(current, 'pr648-visual/index.html') },
  },
});
