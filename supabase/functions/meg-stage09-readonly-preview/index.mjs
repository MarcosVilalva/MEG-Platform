/**
 * MEG Web Evolution / Etapa 09 - gateway autenticado somente leitura.
 * Supabase Edge Function isolada: NÃO acessa Supabase Database, Storage ou
 * secrets. Encaminha unicamente rotas permitidas à API oficial do MEG.
 *
 * Autenticação: JWT da própria API MEG, validado no backend existente.
 * verify_jwt=false para a plataforma Supabase pois este não é um JWT Supabase.
 * Nunca repassa cookies, não registra tokens ou dados, não executa mutações
 * financeiras. Não é uma API de produção nova.
 */
const FUNCTION_SLUG='meg-stage09-readonly-preview';
const UPSTREAM='https://meg-platform-api.onrender.com';
const ALLOWED_ORIGIN='https://meg-lancamentos-09-pr.onrender.com';
const SESSION_POSTS=new Set(['/auth/login','/auth/refresh','/auth/logout']);
const AUTH_GET=new Set(['/auth/me']);
const READ_GET=new Set([
 '/finance/events','/finance/events/month','/finance/summary',
 '/finance/accounts','/finance/categories','/finance/payment-methods',
 '/finance/cashflow','/finance/benefit-summary','/finance/home-available',
 '/finance/sync-status','/cards','/payables/open',
]);
const NO_STORE='private, no-store, max-age=0';
function headers(origin){
 const common={
  'Cache-Control':NO_STORE,
  'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'no-referrer',
  'Vary':'Origin, Authorization',
 };
 if(origin===ALLOWED_ORIGIN)return{
  ...common,
  'Access-Control-Allow-Origin':ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods':'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers':'Authorization, Content-Type',
  'Access-Control-Max-Age':'600',
 };
 return common;
}
function response(code,error,origin){
 return new Response(JSON.stringify({error}),{
  status:code,headers:{...headers(origin),'Content-Type':'application/json; charset=utf-8'}
 });
}
function relativePath(rawUrl){
 const url=new URL(rawUrl);
 const full=url.pathname;
 const mark='/'+FUNCTION_SLUG;
 const position=full.indexOf(mark);
 if(position<0)return null;
 const path=full.slice(position+mark.length);
 if(!path.startsWith('/')||path.startsWith('//')||path.length>128)return null;
 if(url.search.length>1024)return null;
 return path+url.search;
}
export function createStage09Handler(fetchUpstream=globalThis.fetch){
 return async function(req){
  const origin=req.headers.get('Origin');
  if(origin!==ALLOWED_ORIGIN)return response(403,'PREVIEW_ORIGIN_NOT_ALLOWED',origin);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:headers(origin)});
  const target=relativePath(req.url);
  if(!target)return response(404,'PREVIEW_ROUTE_NOT_FOUND',origin);
  const pathname=new URL(target,'https://stage09.invalid').pathname;
  const isRead=req.method==='GET'&&(AUTH_GET.has(pathname)||READ_GET.has(pathname));
  const isAuth=req.method==='POST'&&SESSION_POSTS.has(pathname);
  if(!isRead&&!isAuth)return response(405,'FINANCIAL_WRITES_DISABLED_IN_STAGE09',origin);
  const authorization=req.headers.get('Authorization');
  if(isRead&&(!authorization||!/^Bearer [A-Za-z0-9._~+\/-]+=*$/.test(authorization))){
   return response(401,'MEG_LOGIN_REQUIRED',origin);
  }
  let body;
  if(isAuth){
   if(!/^application\/json(?:\s*;|$)/i.test(req.headers.get('Content-Type')||'')){
    return response(415,'JSON_REQUIRED',origin);
   }
   const declared=Number(req.headers.get('Content-Length')||0);
   if(declared>8192)return response(413,'AUTH_PAYLOAD_TOO_LARGE',origin);
   body=await req.text();
   if(new TextEncoder().encode(body).byteLength>8192)
    return response(413,'AUTH_PAYLOAD_TOO_LARGE',origin);
   try{JSON.parse(body)}catch{return response(400,'INVALID_JSON',origin)}
  }
  const upstreamHeaders=new Headers({Accept:'application/json'});
  if(isRead)upstreamHeaders.set('Authorization',authorization);
  if(isAuth)upstreamHeaders.set('Content-Type','application/json');
  try{
   const upstream=await fetchUpstream(UPSTREAM+target,{
    method:req.method,
    headers:upstreamHeaders,
    body:isAuth?body:undefined,
    cache:'no-store',
    redirect:'error',
    signal:AbortSignal.timeout(80000),
   });
   const resultHeaders={
    ...headers(origin),
    'Content-Type':'application/json; charset=utf-8',
   };
   // Não retransmite Set-Cookie, Access-Control-* arbitrário nem cache da API.
   return new Response(upstream.body,{status:upstream.status,headers:resultHeaders});
  }catch{
   // Sem logs de sessão, URL completa, corpo da solicitação ou dados financeiros.
   return response(502,'MEG_API_TEMPORARILY_UNAVAILABLE',origin);
  }
 };
}
if(typeof Deno!=='undefined'&&typeof Deno.serve==='function'){
 Deno.serve(createStage09Handler());
}
