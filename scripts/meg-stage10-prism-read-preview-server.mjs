/**
 * Stage 10 private read-only Prism preview gateway.
 *
 * This entrypoint is deliberately separate from apps/api/src/server.ts:
 * no Prisma connection, no normalization or maintenance startup, no writer routes.
 * All financial reads are delegated to the existing authenticated API.
 * The upstream's user and workspace authorization remain mandatory.
 *
 * Production must define MEG_PREVIEW_ALLOWED_EMAIL and MEG_PREVIEW_ORIGIN.
 * Neither value is embedded into a browser bundle.
 */
import http from 'node:http';
import {createHash} from 'node:crypto';
import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const testMode=process.env.NODE_ENV==='test'&&process.env.MEG_STAGE10_PROXY_TEST==='1';
const officialUpstream='https://meg-platform-api.onrender.com';
const upstreamUrl=testMode?process.env.MEG_STAGE10_TEST_UPSTREAM:officialUpstream;
const allowedEmail=String(process.env.MEG_PREVIEW_ALLOWED_EMAIL||'').trim().toLowerCase();
const configuredOrigin=String(process.env.MEG_PREVIEW_ORIGIN||'').trim().replace(/\/$/,'');
const port=Number(process.env.PORT||4176);
const staticRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../apps/web/dist');
const MAX_AUTH_BODY=16*1024;
const MAX_UPSTREAM_BODY=16*1024*1024;
const allowedGet=new Set([
 '/auth/me',
 '/finance/sync-status',
 '/finance/events',
 '/finance/events/month',
 '/finance/events/history-snapshot',
 '/finance/events/filtered-summary',
 '/finance/summary',
 '/finance/cashflow',
 '/finance/benefit-summary',
 '/finance/home-available',
 '/finance/home-commitments',
 '/finance/accounts',
 '/finance/categories',
 '/finance/payment-methods',
 '/cards'
]);
const allowedPostAuth=new Set(['/auth/login','/auth/refresh','/auth/logout']);
const authCache=new Map();

if(!allowedEmail||!configuredOrigin||!Number.isInteger(port)||port<1||port>65535){
 throw new Error('PREVIEW_REQUIRED_CONFIGURATION_MISSING');
}
if(!upstreamUrl||!/^https?:\/\//.test(upstreamUrl)){
 throw new Error('PREVIEW_UPSTREAM_INVALID');
}
if(!testMode&&upstreamUrl!==officialUpstream){
 throw new Error('PREVIEW_UPSTREAM_NOT_AUTHORIZED');
}

function headers(res,status=200,type='application/json'){
 res.writeHead(status,{
  'Content-Type':type,
  'Cache-Control':'no-store, max-age=0',
  'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'no-referrer',
  'X-Frame-Options':'DENY',
  'Cross-Origin-Resource-Policy':'same-origin',
  'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security':'max-age=31536000; includeSubDomains',
  'Content-Security-Policy':"default-src 'self'; base-uri 'self'; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self'; frame-ancestors 'none'; form-action 'self'",
 });
}
function fail(res,status,code){
 headers(res,status);
 res.end(JSON.stringify({error:code}));
}
function bearerOf(req){
 const value=req.headers.authorization||'';
 return typeof value==='string'&&/^Bearer [A-Za-z0-9._~+\/=-]+$/.test(value)?value:'';
}
function cacheKey(bearer){
 return createHash('sha256').update(bearer).digest('hex');
}
async function fetchAllowed(url,init={}){
 const response=await fetch(url,{...init,redirect:'manual',signal:AbortSignal.timeout(45000)});
 if(response.status>=300&&response.status<400)throw new Error('PREVIEW_UPSTREAM_REDIRECT_BLOCKED');
 const data=await response.arrayBuffer();
 if(data.byteLength>MAX_UPSTREAM_BODY)throw new Error('PREVIEW_UPSTREAM_RESPONSE_TOO_LARGE');
 return {status:response.status,contentType:response.headers.get('content-type')||'application/json',text:Buffer.from(data).toString('utf8')};
}
function relay(res,result){
 headers(res,result.status,result.contentType.startsWith('application/json')?'application/json; charset=utf-8':'text/plain; charset=utf-8');
 res.end(result.text);
}
function emailOfUser(body){
 try {
  const record=typeof body==='string'?JSON.parse(body):body;
  const user=record?.user;
  return user?.isActive===true&&user?.status==='ACTIVE'&&typeof user?.email==='string'
   ?user.email.trim().toLowerCase():'';
 }catch{return ''}
}
async function assertAuthorizedUser(bearer){
 const key=cacheKey(bearer);
 const cached=authCache.get(key);
 if(cached&&cached>Date.now())return 200;
 const reply=await fetchAllowed(new URL('/auth/me',upstreamUrl),{
  method:'GET',headers:{Authorization:bearer,Accept:'application/json'}
 });
 if(reply.status!==200)return reply.status===401?401:403;
 if(emailOfUser(reply.text)!==allowedEmail)return 403;
 if(authCache.size>128)authCache.clear();
 authCache.set(key,Date.now()+25000);
 return 200;
}
async function readBody(req){
 let length=0;
 const buffers=[];
 for await (const chunk of req){
  const data=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);
  length+=data.length;
  if(length>MAX_AUTH_BODY)throw new Error('PREVIEW_AUTH_PAYLOAD_TOO_LARGE');
  buffers.push(data);
 }
 return Buffer.concat(buffers).toString('utf8');
}
async function apiRequest(req,res,url){
 const method=req.method||'GET';
 const pathname=url.pathname;
 const postAllowed=allowedPostAuth.has(pathname);
 const getAllowed=allowedGet.has(pathname);
 if(!postAllowed&&!getAllowed)return fail(res,404,'PREVIEW_ROUTE_NOT_AVAILABLE');
 if((postAllowed&&method!=='POST')||(getAllowed&&method!=='GET'))return fail(res,405,'PREVIEW_READ_ONLY');
 if(method==='POST'){
  if(req.headers.origin!==configuredOrigin)return fail(res,403,'PREVIEW_CROSS_ORIGIN_BLOCKED');
  if(!/^application\/json(?:\s*;|$)/i.test(String(req.headers['content-type']||''))){
   return fail(res,415,'PREVIEW_JSON_REQUIRED');
  }
 }
 const bearer=bearerOf(req);
 if(method==='GET'){
  if(!bearer)return fail(res,401,'UNAUTHORIZED');
  const code=await assertAuthorizedUser(bearer);
  if(code!==200)return fail(res,code,code===401?'UNAUTHORIZED':'PREVIEW_OWNER_ONLY');
 }
 let body;
 if(method==='POST'){
  body=await readBody(req);
  let parsed;
  try{parsed=JSON.parse(body)}catch{return fail(res,400,'PREVIEW_INVALID_JSON')}
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return fail(res,400,'PREVIEW_INVALID_JSON');
  if(pathname==='/auth/login'&&
    (typeof parsed.email!=='string'||parsed.email.trim().toLowerCase()!==allowedEmail)){
   return fail(res,403,'PREVIEW_OWNER_ONLY');
  }
  if(pathname==='/auth/refresh'&&!parsed.refreshToken)return fail(res,400,'PREVIEW_REFRESH_TOKEN_REQUIRED');
  if(pathname==='/auth/logout'&&!parsed.refreshToken)return fail(res,400,'PREVIEW_REFRESH_TOKEN_REQUIRED');
 }
 const target=new URL(pathname+url.search,upstreamUrl);
 const upstream=await fetchAllowed(target,{
  method,
  headers:{
   Accept:'application/json',
   ...(method==='POST'?{'Content-Type':'application/json'}:{}),
   ...(bearer?{Authorization:bearer}:{}),
  },
  ...(method==='POST'?{body}:{}),
 });
 if(method==='POST'&&pathname!=='/auth/logout'&&upstream.status>=200&&upstream.status<300){
  if(emailOfUser(upstream.text)!==allowedEmail)return fail(res,403,'PREVIEW_OWNER_ONLY');
 }
 relay(res,upstream);
}
const mime={
 '.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
 '.html':'text/html; charset=utf-8','.json':'application/json; charset=utf-8',
 '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp',
 '.svg':'image/svg+xml','.woff2':'font/woff2','.woff':'font/woff',
 '.ico':'image/x-icon','.txt':'text/plain; charset=utf-8'
};
async function staticRequest(req,res,url){
 if(req.method!=='GET'&&req.method!=='HEAD')return fail(res,405,'PREVIEW_READ_ONLY');
 let asset=url.pathname;
 if(asset==='/'||asset==='/index.html')asset='/web-evolution.html';
 if(asset!=='/web-evolution.html'&&!/^\/(?:assets|brand|fonts|images)\//.test(asset)&&asset!=='/favicon.ico'){
  return fail(res,404,'PREVIEW_ROUTE_NOT_AVAILABLE');
 }
 let filename;
 try{filename=path.resolve(staticRoot,'.'+decodeURIComponent(asset))}catch{
  return fail(res,400,'PREVIEW_INVALID_PATH');
 }
 if(!filename.startsWith(staticRoot+path.sep))return fail(res,403,'PREVIEW_INVALID_PATH');
 const type=mime[path.extname(filename).toLowerCase()];
 if(!type)return fail(res,415,'PREVIEW_STATIC_EXTENSION_BLOCKED');
 try{
  const detail=await stat(filename);
  if(!detail.isFile())return fail(res,404,'PREVIEW_ASSET_MISSING');
  const data=await readFile(filename);
  headers(res,200,type);
  res.end(req.method==='HEAD'?undefined:data);
 }catch(e){
  if(e?.code==='ENOENT')return fail(res,404,'PREVIEW_ASSET_MISSING');
  return fail(res,500,'PREVIEW_STATIC_ERROR');
 }
}
export const server=http.createServer(async(req,res)=>{
 let url;
 try{url=new URL(req.url||'/',configuredOrigin)}catch{return fail(res,400,'PREVIEW_INVALID_URL')}
 if(url.pathname==='/health'&&req.method==='GET'){
  headers(res);res.end(JSON.stringify({status:'ok',type:'read-only-prism-preview'}));return;
 }
 try{
  if(url.pathname.startsWith('/auth/')||url.pathname.startsWith('/finance/')||url.pathname==='/cards'){
   await apiRequest(req,res,url);
  }else await staticRequest(req,res,url);
 }catch(e){
  // Fail closed; avoid logging tokens, paths with private query parameters or request bodies.
  const code=e?.message==='PREVIEW_AUTH_PAYLOAD_TOO_LARGE'?413:502;
  fail(res,code,code===413?'PREVIEW_AUTH_PAYLOAD_TOO_LARGE':'PREVIEW_UPSTREAM_UNAVAILABLE');
 }
});
if(process.env.MEG_STAGE10_PROXY_NO_LISTEN!=='1'){
 server.listen(port,'0.0.0.0',()=>console.log('MEG_STAGE10_PRISM_READ_PREVIEW_LISTENING'));
}
