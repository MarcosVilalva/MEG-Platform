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
function stage10CspOrigins():string[]{
 if(process.env.VITE_MEG_STAGE10_REAL_READ_ENABLED!=='true')return [];
 const values=[process.env.VITE_API_URL,process.env.VITE_MEG_STAGE10_READONLY_API_URL];
 if(values.some(v=>!v))throw new Error('STAGE10_CSP_DUAL_API_ORIGINS_REQUIRED');
 const origins=values.map(input=>{
  const api=new URL(input!);
  if(api.protocol!=='https:'||api.username||api.password||api.search||api.hash||
     api.pathname!=='/'||api.href!==api.origin+'/')
   throw new Error('STAGE10_CSP_API_ORIGIN_INVALID');
  return api.origin;
 });
 if(origins[0]===origins[1])throw new Error('STAGE10_CSP_DISTINCT_ORIGINS_REQUIRED');
 return origins;
}
const stage10ApiOrigins=stage10CspOrigins();

// Somente um HTML publico; gate real isolada por build e desativada por padrao.
export default defineConfig({
  root,publicDir:false,base:'/',
  plugins:[react(),{
    name:'stage10-opt-in-csp-origin',
    transformIndexHtml(html,context){
      if(!stage10ApiOrigins.length||!context.path.endsWith('/meg-unificado-qa.html'))return html;
      const original="connect-src 'self';";
      if(!html.includes(original))throw new Error('STAGE10_CSP_CONNECT_SRC_MISSING');
      return html.replace(original,`connect-src 'self' ${stage10ApiOrigins.join(' ')};`);
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
