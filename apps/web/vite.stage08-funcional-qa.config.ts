import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {copyFileSync,cpSync,readdirSync} from 'node:fs';

const root=dirname(fileURLToPath(import.meta.url));
const page=resolve(root,'stage08-funcional-qa.html');
const unifiedPage=resolve(root,'meg-unificado-qa.html');
const output=resolve(root,'dist-stage08-funcional-qa');

// Somente um HTML público. Nada de proxy, login real, banco ou endpoint remoto.
export default defineConfig({
  root,publicDir:false,base:'/',
  plugins:[react(),{
    name:'stage08-qa-root',
    closeBundle(){
      const publicDir=resolve(root,'public');
      for(const entry of readdirSync(publicDir)){
        // Downloads de APK/instaladores não pertencem à QA e incham o artefato.
        if(entry==='downloads')continue;
        cpSync(resolve(publicDir,entry),resolve(output,entry),{recursive:true,force:true});
      }
      copyFileSync(resolve(output,'stage08-funcional-qa.html'),resolve(output,'index.html'));
    },
  }],
  build:{
    outDir:output,emptyOutDir:true,
    rollupOptions:{input:{qa:page,unified:unifiedPage}},
  },
});
