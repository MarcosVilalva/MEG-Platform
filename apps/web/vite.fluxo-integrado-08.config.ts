import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const root=dirname(fileURLToPath(import.meta.url));
const financialApi='https://meg-platform-api.onrender.com';

// A API oficial mantém JWT + isolamento por workspace; nenhum segredo
// de servidor ou dado financeiro é incluído no bundle público.
const stage09AuthenticatedCsp={
 name:'meg-stage09-authenticated-only-csp',
 transformIndexHtml:{
  order:'pre' as const,
  handler(html:string,context:{path?:string}){
   if(!context.path?.endsWith('/web-evolution.html'))return html;
   return {html,tags:[{
    tag:'meta',attrs:{
     'http-equiv':'Content-Security-Policy',
     content:[
      "default-src 'self'","base-uri 'self'","object-src 'none'",
      "script-src 'self'","style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' "+financialApi,
      "worker-src 'self' blob:","frame-src 'none'","form-action 'self'",
      "upgrade-insecure-requests"
     ].join('; ')
    },
    injectTo:'head-prepend' as const
   }]};
  }
 }
};
export default defineConfig({
 root,publicDir:resolve(root,'public'),base:'/',
 plugins:[react(),stage09AuthenticatedCsp],
 define:{'import.meta.env.VITE_API_URL':JSON.stringify(financialApi)},
 build:{
  outDir:resolve(root,'dist-fluxo-integrado-08'),
  emptyOutDir:true,
  rollupOptions:{input:{
   visual:resolve(root,'fluxo-integrado-08.html'),
   authenticated:resolve(root,'web-evolution.html')
  }}
 }
});
