/**
 * Caracterizacao isolada da pre-condicao de troca HMAC -> RS256 da Etapa 10.
 * NAO e rota, NAO valida criptografia e NAO consulta banco. O chamador futuro
 * deve fornecer JWT previamente verificado e dados atuais obtidos por SELECT.
 * A API canonica atual NAO inclui sid no access token: falha fechada por desenho.
 */
export type Stage10ExchangeRole='ADMIN'|'MANAGER'|'OPERATOR'|'VIEWER';
export type Stage10ExchangeEvidence={
 enabled:boolean;
 transport:{method:string;path:string;origin:string|null;expectedOrigin:string;contentType:string};
 access:{signatureVerified:boolean;sub:string;role:Stage10ExchangeRole;sid?:string;iat:number;exp:number};
 user:{id:string;status:string;isActive:boolean;role:Stage10ExchangeRole};
 session:{id:string;userId:string;expiresAt:number;revokedAt:number|null};
 workspace:{id:string;isActive:boolean};
 membership:{workspaceId:string;userId:string;status:string;isActive:boolean};
 nowSeconds:number;
};
export type Stage10ApprovedExchange={
 sub:string;role:Stage10ExchangeRole;sessionId:string;workspaceId:string;ttlSeconds:number;
};
const validRoles=['ADMIN','MANAGER','OPERATOR','VIEWER'];
function validId(value:unknown):value is string{
 return typeof value==='string'&&value.length>0&&value.length<=256;
}
function exactHttpsOrigin(value:unknown):value is string{
 if(typeof value!=='string'||!value)return false;
 try{
  const url=new URL(value);
  return url.protocol==='https:'&&url.username===''&&url.password===''&&
   url.pathname==='/'&&url.search===''&&url.hash===''&&value===url.origin;
 }catch{return false;}
}
/**
 * A evidência de sessao ativa e obrigatoria. CORS/Origin NAO substituem
 * assinatura, estado de usuario, vinculo workspace ou sessao vigente.
 * Nunca emitir um token com TTL maior que o acesso e a sessao de origem.
 */
export function authorizeStage10QaTokenExchange(e:Stage10ExchangeEvidence):Stage10ApprovedExchange{
 const deny=():never=>{throw new Error('STAGE10_QA_EXCHANGE_DENIED');};
 if(!e||e.enabled!==true||!e.transport||!e.access||!e.user||
  !e.session||!e.workspace||!e.membership)deny();
 const {transport:t,access:a,user:u,session:s,workspace:w,membership:m}=e;
 if(t.method!=='POST'||t.path!=='/auth/stage10-qa/exchange'||
  !exactHttpsOrigin(t.expectedOrigin)||t.origin!==t.expectedOrigin||
  !/^application\/json(?:\s*;|\s*$)/i.test(t.contentType))deny();
 if(a.signatureVerified!==true||!validId(a.sub)||!validId(a.sid)||
  !validRoles.includes(a.role)||!Number.isSafeInteger(e.nowSeconds)||
  !Number.isSafeInteger(a.iat)||!Number.isSafeInteger(a.exp)||
  a.iat>e.nowSeconds||a.exp<=e.nowSeconds||
  a.exp-a.iat>900||a.exp<=a.iat)deny();
 if(!validId(u.id)||u.id!==a.sub||u.isActive!==true||
  u.status!=='ACTIVE'||u.role!==a.role)deny();
 if(!validId(s.id)||s.id!==a.sid||s.userId!==u.id||
  !Number.isSafeInteger(s.expiresAt)||s.expiresAt<=e.nowSeconds||
  s.revokedAt!==null)deny();
 if(!validId(w.id)||w.isActive!==true||m.workspaceId!==w.id||
  m.userId!==u.id||m.status!=='ACTIVE'||m.isActive!==true)deny();
 const ttlSeconds=Math.min(120,a.exp-e.nowSeconds,s.expiresAt-e.nowSeconds);
 if(!Number.isSafeInteger(ttlSeconds)||ttlSeconds<1)deny();
 return {sub:u.id,role:u.role,sessionId:s.id,workspaceId:w.id,ttlSeconds};
}
