import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const root=dirname(fileURLToPath(import.meta.url));
// URL da API financeira oficial. Não existe token de servidor no navegador.
// O gateway browser-facing é acesso a dados somente após autenticação JWT.
const apiOrigin='https://meg-platform-api.onrender.com';
const readonlyAuthCsp={
 name:'stage09-authenticated-web-csp',
 transformIndexHtml:{
  order:'pre' as const,
  handler(html:string,context:{path?:string}){
   if(!context.path?.endsWith('web-evolution.html'))return html;
   return {
    html,
    tags:[{tag:'meta',attrs:{
     'http-equiv':'Content-Security-Policy',
     content:[
      "default-src 'self'","base-uri 'self'","object-src 'none'",
      "script-src 'self'","style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:","font-src 'self' data:",
      "media-src 'self' blob: https:",
      `connect-src 'self' ${apiOrigin}`,
      "worker-src 'self' blob:","frame-src 'none'","form-action 'self'",
      "upgrade-insecure-requests",
     ].join('; ')
    },injectTo:'head-prepend' as const}]
   };
  }
 }
};
export default defineConfig({
 root,publicDir:resolve(root,'public'),base:'/',
 plugins:[react(),readonlyAuthCsp],
 define:{
  // Somente a entrada Web Evolution usa o cliente autenticado.
  // A prévia fluxo-integrado-08.html permanece inteiramente com fixture.
  'import.meta.env.VITE_API_URL':JSON.stringify(apiOrigin),
 },
 build:{
  outDir:resolve(root,'dist-fluxo-integrado-08'),
  emptyOutDir:true,
  rollupOptions:{input:{
   visual:resolve(root,'fluxo-integrado-08.html'),
   authenticated:resolve(root,'web-evolution.html')
  }}
 }
});
