/**
 * Diagnóstico público sem credenciais e SEM acesso a lançamentos financeiros.
 * Valida apenas preflight, bloqueio sem autenticação e origem permitida.
 */
const base='https://dmrauztnozvxirbydtho.supabase.co/functions/v1/meg-stage09-readonly-preview';
const origin='https://meg-lancamentos-09-pr.onrender.com';
const path='/finance/events?page=1&pageSize=100';
const timeout=AbortSignal.timeout(25000);
const option=await fetch(base+path,{
 method:'OPTIONS',
 headers:{
  Origin:origin,
  'Access-Control-Request-Method':'GET',
  'Access-Control-Request-Headers':'authorization,content-type',
 },signal:timeout
});
if(option.status!==204||option.headers.get('Access-Control-Allow-Origin')!==origin){
 const diagnostic=(await option.text().catch(()=>'')).slice(0,500);
 throw new Error('STAGE09_EDGE_CORS_NOT_READY: '+option.status+
  ' sb-error-code='+(option.headers.get('sb-error-code')||'none')+
  ' response='+diagnostic);
}
const denied=await fetch(base+path,{headers:{Origin:origin},signal:AbortSignal.timeout(25000)});
if(denied.status!==401||denied.headers.get('Access-Control-Allow-Origin')!==origin){
 throw new Error('STAGE09_EDGE_UNAUTHENTICATED_GUARD_MISSING: '+denied.status);
}
const bad=await fetch(base+path,{headers:{Origin:'https://other.invalid'},signal:AbortSignal.timeout(25000)});
if(bad.status!==403||bad.headers.get('Access-Control-Allow-Origin')){
 throw new Error('STAGE09_EDGE_ORIGIN_GUARD_MISSING: '+bad.status);
}
console.log('STAGE09_EDGE_SAFE: preflight 204, sem token 401, origem externa 403; nenhuma consulta financeira autenticada executada.');
