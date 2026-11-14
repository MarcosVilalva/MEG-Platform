import {createHash,timingSafeEqual} from 'node:crypto';

/**
 * Contrato sintético de troca HMAC -> RS256, sem rota ou consulta ao banco.
 * A prova opaca de refresh fica SOMENTE na API canônica, nunca no backend QA.
 * O chamador futuro deve validar JWT HMAC com auth guard e carregar User,
 * AuthSession e WorkspaceMember por SELECT em transação READ ONLY.
 */
export type Stage10ExchangeRole='ADMIN'|'MANAGER'|'OPERATOR'|'VIEWER';
export type Stage10ExchangeEvidence={
 enabled:boolean;
 transport:{method:string;path:string;origin:string|null;expectedOrigin:string;contentType:string};
 access:{signatureVerified:boolean;sub:string;role:Stage10ExchangeRole;iat:number;exp:number};
 refreshToken:string;
 user:{id:string;status:string;isActive:boolean;role:Stage10ExchangeRole};
 session:{id:string;userId:string;tokenHash:string;expiresAt:number;revokedAt:number|null};
 workspace:{id:string;isActive:boolean};
 membership:{workspaceId:string;userId:string;status:string;isActive:boolean};
 nowSeconds:number;
};
export type Stage10ApprovedExchange={
 sub:string;role:Stage10ExchangeRole;sessionId:string;workspaceId:string;ttlSeconds:number;
};
const roles=['ADMIN','MANAGER','OPERATOR','VIEWER'];
function validId(v:unknown):v is string{
 return typeof v==='string'&&v.length>0&&v.length<=256;
}
function exactHttpsOrigin(v:unknown):v is string{
 if(typeof v!=='string'||!v)return false;
 try{
  const u=new URL(v);
  return u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash&&
    u.pathname==='/'&&v===u.origin;
 }catch{return false;}
}
/** Rejeitar qualquer falta de evidência em vez de inventar sid no HMAC legado. */
export function authorizeStage10QaTokenExchange(e:Stage10ExchangeEvidence):Stage10ApprovedExchange{
 const deny=():never=>{throw new Error('STAGE10_QA_EXCHANGE_DENIED');};
 if(!e||e.enabled!==true||!e.transport||!e.access||!e.user||
  !e.session||!e.workspace||!e.membership)deny();
 const {transport:t,access:a,user:u,session:s,workspace:w,membership:m}=e;
 if(t.method!=='POST'||t.path!=='/auth/stage10-qa/exchange'||
  !exactHttpsOrigin(t.expectedOrigin)||t.origin!==t.expectedOrigin||
  !/^application\/json(?:\s*;|\s*$)/i.test(t.contentType))deny();
 if(a.signatureVerified!==true||!validId(a.sub)||!roles.includes(a.role)||
  !Number.isSafeInteger(e.nowSeconds)||e.nowSeconds<0||
  !Number.isSafeInteger(a.iat)||!Number.isSafeInteger(a.exp)||
  a.iat>e.nowSeconds||a.exp<=e.nowSeconds||
  a.exp-a.iat>900||a.exp<=a.iat)deny();
 if(!validId(u.id)||u.id!==a.sub||u.isActive!==true||
  u.status!=='ACTIVE'||u.role!==a.role)deny();
 if(!validId(s.id)||s.userId!==u.id||
  !Number.isSafeInteger(s.expiresAt)||s.expiresAt<=e.nowSeconds||
  s.revokedAt!==null)deny();
 if(typeof e.refreshToken!=='string'||!/^[A-Za-z0-9_-]{20,256}$/.test(e.refreshToken))deny();
 if(typeof s.tokenHash!=='string'||!/^[a-f0-9]{64}$/i.test(s.tokenHash))deny();
 const digest=createHash('sha256').update(e.refreshToken).digest();
 const stored=Buffer.from(s.tokenHash,'hex');
 if(stored.length!==digest.length||!timingSafeEqual(stored,digest))deny();
 if(!validId(w.id)||w.isActive!==true||m.workspaceId!==w.id||
  m.userId!==u.id||m.status!=='ACTIVE'||m.isActive!==true)deny();
 const ttlSeconds=Math.min(120,a.exp-e.nowSeconds,s.expiresAt-e.nowSeconds);
 if(!Number.isSafeInteger(ttlSeconds)||ttlSeconds<1)deny();
 return {sub:u.id,role:u.role,sessionId:s.id,workspaceId:w.id,ttlSeconds};
}
