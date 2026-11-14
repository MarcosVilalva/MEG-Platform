import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {copyFileSync,cpSync,readdirSync} from 'node:fs';

const root=dirname(fileURLToPath(import.meta.url));
const page=resolve(root,'stage08-funcional-qa.html');
const unifiedPage=resolve(root,'meg-unificado-qa.html');
const output=resolve(root,'dist-stage08-funcional-qa');

// A QA visual padrao permanece sem rede. Em build opt-in isolada,
// conectar apenas a origem HTTPS autenticada declarada explicitamente.
function stage10CspApiOrigin():string|null{
 if(process.env.VITE_MEG_STAGE10_REAL_READ_ENABLED!=='true')return null;
 const input=process.env.VITE_API_URL;
 if(!input)throw new Error('STAGE10_CSP_API_ORIGIN_REQUIRED');
 const api=new URL(input);
 if(api.protocol!=='https:'||api.username||api.password||api.search||api.hash||api.pathname!=='/')
  throw new Error('STAGE10_CSP_API_ORIGIN_INVALID');
 return api.origin;
}
const stage10ApiOrigin=stage10CspApiOrigin();

// Somente um HTML publico; gate real isolada por build e desativada por padrao.
export default defineConfig({
  root,publicDir:false,base:'/',
  plugins:[react(),{
    name:'stage10-opt-in-csp-origin',
    transformIndexHtml(html,context){
      if(!stage10ApiOrigin||!context.path.endsWith('/meg-unificado-qa.html'))return html;
      const original="connect-src 'self';";
      if(!html.includes(original))throw new Error('STAGE10_CSP_CONNECT_SRC_MISSING');
      return html.replace(original,`connect-src 'self' ${stage10ApiOrigin};`);
    },
  },{
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
