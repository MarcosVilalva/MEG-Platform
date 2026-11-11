import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';

const root=dirname(fileURLToPath(import.meta.url));

/**
 * Build SOMENTE da prévia visual com dados fictícios.
 * Não publicar a entrada web-evolution.html: exige API real e autenticação.
 */
export default defineConfig({
 root,
 publicDir:resolve(root,'public'),
 base:'/',
 plugins:[react()],
 build:{
  outDir:resolve(root,'dist-home-p0-qa'),
  emptyOutDir:true,
  rollupOptions:{input:{preview:resolve(root,'fluxo-integrado-08.html')}},
 },
});
