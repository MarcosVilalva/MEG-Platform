/**
 * MEG Web Evolution / Etapa 09
 *
 * Gateway ISOLADO de revisão autenticada de Lançamentos. Serve somente a
 * entrada Web Evolution e repassa leituras à API financeira existente,
 * SEM replicar banco de dados, sem segredo de API e sem escritor financeiro.
 *
 * Não modificar nem reutilizar como gateway de produção geral.
 */
import {createServer} from 'node:http';
import {createReadStream, statSync} from 'node:fs';
import {resolve, relative, extname, sep} from 'node:path';
import {Readable} from 'node:stream';

const dist=resolve(process.cwd(),'apps/web/dist');
const upstream=(process.env.MEG_STAGE09_UPSTREAM_API || 'https://meg-platform-api.onrender.com').replace(/\/+$/,'');
const port=Number(process.env.PORT||4178);
if(!/^https:\/\/[^/]+$/.test(upstream)&&!(process.env.NODE_ENV==='test'&&/^http:\/\/127\.0\.0\.1:\d+$/.test(upstream))) {
 throw new Error('MEG_STAGE09_UPSTREAM_API_INVALID');
}

const readEndpoints=[
 /^\/auth\/me$/,
 /^\/finance\/(?:events|events\/month|summary|accounts|categories|payment-methods|cashflow|benefit-summary|home-available|sync-status)$/,
 /^\/cards$/,
 /^\/payables\/open$/,
];
const sessionWriteEndpoints=new Set(['/auth/login','/auth/refresh','/auth/logout']);
const contentTypes={
 '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8',
 '.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg',
 '.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon',
 '.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf',
};
const securityHeaders={
 'Cache-Control':'private, no-store, max-age=0',
 'X-Content-Type-Options':'nosniff',
 'X-Frame-Options':'DENY',
 'Referrer-Policy':'no-referrer',
 'Cross-Origin-Resource-Policy':'same-origin',
};

function json(res,status,payload){
 res.writeHead(status,{'Content-Type':'application/json; charset=utf-8',...securityHeaders});
 res.end(JSON.stringify(payload));
}
function allowOrigin(req){
 const origin=req.headers.origin;
 if(!origin) return true;
 try{
  const parsed=new URL(origin);
  const local=process.env.NODE_ENV==='test';
  return parsed.host===req.headers.host&&(parsed.protocol==='https:'||(local&&parsed.protocol==='http:'));
 }catch{return false}
}
async function postBody(req){
 let total=0;
 const parts=[];
 for await(const chunk of req){
  total+=chunk.length;
  if(total>16_384)throw Object.assign(new Error('PAYLOAD_TOO_LARGE'),{status:413});
  parts.push(chunk);
 }
 return Buffer.concat(parts);
}
async function relay(req,res,path){
 const isGet=req.method==='GET';
 if(!isGet&&!allowOrigin(req))return json(res,403,{error:'PREVIEW_ORIGIN_FORBIDDEN'});
 if(!isGet&&!String(req.headers['content-type']||'').startsWith('application/json'))
  return json(res,415,{error:'PREVIEW_JSON_REQUIRED'});
 const body=isGet?undefined:await postBody(req);
 const headers={Accept:'application/json'};
 if(req.headers.authorization&&typeof req.headers.authorization==='string')
  headers.Authorization=req.headers.authorization;
 if(body) headers['Content-Type']='application/json';
 // Nenhum cookie, credencial de sistema ou Origin do cliente atravessa o gateway.
 const ctrl=AbortSignal.timeout(80_000);
 let result;
 try{
  result=await fetch(upstream+path,{method:req.method,headers,body,signal:ctrl,redirect:'error',cache:'no-store'});
 }catch{
  return json(res,502,{error:'REAL_FINANCE_API_UNAVAILABLE'});
 }
 res.writeHead(result.status,{
  'Content-Type':'application/json; charset=utf-8',
  ...securityHeaders,
  'Vary':'Authorization',
 });
 if(!result.body){res.end();return;}
 try{
  await new Promise((done,fail)=>{
   const stream=Readable.fromWeb(result.body);
   stream.once('error',fail);
   res.once('error',fail);
   res.once('close',done);
   stream.pipe(res);
  });
 }catch{
  if(!res.headersSent)json(res,502,{error:'REAL_FINANCE_API_STREAM_FAILED'});
  else res.destroy();
 }
}
function sendAsset(req,res,path){
 if(req.method!=='GET'&&req.method!=='HEAD')return json(res,405,{error:'PREVIEW_READ_ONLY'});
 // Apenas o frontend Web Evolution; outras entradas/fluxos não são publicados.
 const safe=path==='/'?'/web-evolution.html':path;
 if(!(safe==='/web-evolution.html'||safe.startsWith('/assets/')||
      safe.startsWith('/meg-web-evolution/')||safe==='/favicon.ico'))
  return json(res,404,{error:'PREVIEW_ROUTE_NOT_FOUND'});
 let decoded;
 try{decoded=decodeURIComponent(safe)}catch{return json(res,400,{error:'BAD_PATH'})}
 const filename=resolve(dist,'.'+decoded);
 const rel=relative(dist,filename);
 if(!rel||rel.startsWith('..'+sep)||rel==='..'||rel.startsWith(sep))
  return json(res,404,{error:'PREVIEW_ASSET_BLOCKED'});
 try{
  const stat=statSync(filename);
  if(!stat.isFile())throw new Error('NOT_A_FILE');
  res.writeHead(200,{
   'Content-Type':contentTypes[extname(filename).toLowerCase()]||'application/octet-stream',
   ...securityHeaders,
  });
  if(req.method==='HEAD'){res.end();return}
  createReadStream(filename).pipe(res);
 }catch{return json(res,404,{error:'PREVIEW_ASSET_NOT_FOUND'})}
}
const server=createServer(async(req,res)=>{
 const requestUrl=new URL(req.url||'/', 'http://localhost');
 const pathname=requestUrl.pathname;
 try{
  if(pathname==='/health'&&req.method==='GET')return json(res,200,{status:'ok',mode:'finance-read-only-preview'});
  if(pathname==='/gateway-status'&&req.method==='GET'){
   try{
    const response=await fetch(upstream+'/ready',{signal:AbortSignal.timeout(12_000),cache:'no-store',redirect:'error'});
    return json(res,response.ok?200:503,{status:response.ok?'ready':'unavailable',mode:'finance-read-only-preview'});
   }catch{return json(res,503,{status:'unavailable',mode:'finance-read-only-preview'})}
  }
  if(pathname.startsWith('/auth/')||pathname.startsWith('/finance/')||
      pathname==='/cards'||pathname.startsWith('/payables/')){
   if(req.method==='GET'&&readEndpoints.some(rule=>rule.test(pathname)))
    return await relay(req,res,pathname+requestUrl.search);
   if(req.method==='POST'&&sessionWriteEndpoints.has(pathname))
    return await relay(req,res,pathname);
   return json(res,405,{error:'FINANCIAL_WRITES_DISABLED_IN_STAGE09'});
  }
  return sendAsset(req,res,pathname);
 }catch(err){
  // Não registrar Authorization, body, query ou valores bancários em logs.
  if(!res.headersSent)json(res,err?.status===413?413:500,{error:err?.status===413?'PAYLOAD_TOO_LARGE':'PREVIEW_GATEWAY_ERROR'});
  else res.destroy();
 }
});
server.listen(port,'0.0.0.0',()=>console.log('MEG Stage09 read-only gateway online'));
