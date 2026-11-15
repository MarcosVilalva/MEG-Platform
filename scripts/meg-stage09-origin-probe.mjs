/**
 * Diagnóstico APENAS de CORS, sem JWT, conta, credenciais nem dados pessoais.
 * Não executa gravações e não faz qualquer consulta financeira autenticada.
 */
const origin='https://meg-lancamentos-09-pr.onrender.com';
const upstream='https://meg-platform-api.onrender.com';
const checks=[
 {path:'/auth/login',method:'POST',headers:'content-type'},
 {path:'/auth/me',method:'GET',headers:'authorization,content-type'},
 {path:'/finance/events?page=1&pageSize=100',method:'GET',headers:'authorization,content-type'},
];
let denied=0;
for(const check of checks){
 try{
  const r=await fetch(upstream+check.path,{
   method:'OPTIONS',redirect:'error',
   headers:{
    Origin:origin,
    'Access-Control-Request-Method':check.method,
    'Access-Control-Request-Headers':check.headers
   },signal:AbortSignal.timeout(45_000)
  });
  const allow=r.headers.get('access-control-allow-origin');
  const methods=r.headers.get('access-control-allow-methods')||'';
  const ok=r.ok&&allow===origin&&methods.toUpperCase().includes(check.method);
  console.log(JSON.stringify({path:check.path,method:check.method,status:r.status,corsAllowed:ok,allowOrigin:allow||'none'}));
  if(!ok)denied++;
 }catch(e){
  denied++;
  console.log(JSON.stringify({path:check.path,method:check.method,corsAllowed:false,error:e instanceof Error?e.name:'UNKNOWN'}));
 }
}
if(denied){console.error('PREVIEW_STAGE09_REAL_DATA_BLOCKED_BY_CORS_OR_UPSTREAM: '+denied+' de '+checks.length);process.exitCode=2;}
else console.log('PREVIEW_STAGE09_API_CORS_OK_SEM_CREDENCIAIS');
