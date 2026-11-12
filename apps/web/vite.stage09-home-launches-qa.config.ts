import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const root=dirname(fileURLToPath(import.meta.url));
// Prévia de homologação SOMENTE fictícia; não publicar web-evolution.html.
export default defineConfig({
  root, publicDir:resolve(root,'public'), base:'/',
  plugins:[react()],
  build:{
    outDir:resolve(root,'dist-stage09-home-launches-qa'),
    emptyOutDir:true,
    rollupOptions:{input:resolve(root,'fluxo-integrado-08.html')}
  }
});
