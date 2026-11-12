import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {copyFileSync} from 'node:fs';

const root=dirname(fileURLToPath(import.meta.url));
const page=resolve(root,'stage08-funcional-qa.html');
const output=resolve(root,'dist-stage08-funcional-qa');

// Somente um HTML público. Nada de proxy, login real, banco ou endpoint remoto.
export default defineConfig({
  root,publicDir:resolve(root,'public'),base:'/',
  plugins:[react(),{
    name:'stage08-qa-root',
    closeBundle(){copyFileSync(resolve(output,'stage08-funcional-qa.html'),resolve(output,'index.html'))},
  }],
  build:{
    outDir:output,emptyOutDir:true,
    rollupOptions:{input:{qa:page}},
  },
});
