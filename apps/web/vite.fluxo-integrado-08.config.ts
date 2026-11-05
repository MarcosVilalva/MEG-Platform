import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const root=dirname(fileURLToPath(import.meta.url));
// Somente a prévia operacional isolada da Etapa 09. Nunca colocar no bundle
// uma chave privada, token de banco, senha de usuário ou credencial Supabase.
const edgeBase='https://dmrauztnozvxirbydtho.supabase.co/functions/v1/meg-stage09-readonly-preview';
const edgeOrigin=new URL(edgeBase).origin;
const stage09Csp={
 name:'stage09-read-only-csp',
 transformIndexHtml:{
  order:'pre' as const,
  handler(html:string,context:{path?:string}){
   if(!context.path?.endsWith('/web-evolution.html'))return html;
   return {html,tags:[{tag:'meta',attrs:{
    'http-equiv':'Content-Security-Policy',
    content:[
     "default-src 'self'","base-uri 'self'","object-src 'none'",
     "script-src 'self'","style-src 'self' 'unsafe-inline'",
     "img-src 'self' data: blob: https:","font-src 'self' data:",
     "media-src 'self' blob: https:",
     `connect-src 'self' ${edgeOrigin}`,
     "worker-src 'self' blob:","frame-src 'none'",
     "form-action 'self'","upgrade-insecure-requests",
    ].join('; ')
   },injectTo:'head-prepend' as const}]};
  }
 }
};
export default defineConfig({
 root,publicDir:resolve(root,'public'),base:'/',
 plugins:[react(),stage09Csp],
 // O cliente financeiro existente usa a API MEG normal, por trás do
 // proxy de leitura autenticado em Supabase Edge. Sem acesso direto ao DB.
 define:{'import.meta.env.VITE_API_URL':JSON.stringify(edgeBase)},
 build:{
  outDir:resolve(root,'dist-fluxo-integrado-08'),
  emptyOutDir:true,
  rollupOptions:{input:{
   visual:resolve(root,'fluxo-integrado-08.html'),
   operational:resolve(root,'web-evolution.html')
  }}
 }
});
