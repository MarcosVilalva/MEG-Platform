import {createPublicKey,verify as verifySignature} from 'node:crypto';

/**
 * Caracterizacao isolada, ainda NAO conectada ao servidor QA.
 * Token dedicado com chave publica (RS256) e escopo explicito de leitura.
 * Sem acesso a JWT_SECRET, banco, API real, filesystem ou rede.
 */
export type Stage10PublicClaims={
 sub:string;aud:string;iss:string;scope:'stage10:finance:read';
 role:'ADMIN'|'MANAGER'|'OPERATOR'|'VIEWER';iat:number;exp:number;nbf?:number;
};
const base64Url=/^[A-Za-z0-9_-]+$/;
function decodeSegment(part:string):unknown{
 if(!base64Url.test(part)||part.length>8192)throw new Error('STAGE10_JWT_INVALID');
 const decoded=Buffer.from(part,'base64url');
 if(decoded.toString('base64url')!==part)throw new Error('STAGE10_JWT_INVALID');
 try{return JSON.parse(decoded.toString('utf8')) as unknown;}catch{throw new Error('STAGE10_JWT_INVALID');}
}
function record(value:unknown):value is Record<string,unknown>{
 return typeof value==='object'&&value!==null&&!Array.isArray(value);
}
function claimString(value:unknown,max:number):value is string{
 return typeof value==='string'&&value.length>0&&value.length<=max;
}
/**
 * Falha na montagem do app quando a chave publica nao esta apta.
 * Nada da chave privada ou de JWT_SECRET deve chegar ao backend QA.
 */
export function assertStage10PublicVerificationKey(publicKeyPem:string):void{
 if(typeof publicKeyPem!=='string'||!/^-----BEGIN PUBLIC KEY-----\n[\s\S]+\n-----END PUBLIC KEY-----\n?$/.test(publicKeyPem))
  throw new Error('STAGE10_PUBLIC_JWT_KEY_INVALID');
 try{
  const key=createPublicKey(publicKeyPem);
  if(key.asymmetricKeyType!=='rsa'||(key.asymmetricKeyDetails?.modulusLength??0)<2048)
   throw new Error('STAGE10_PUBLIC_JWT_KEY_INVALID');
 }catch{
  throw new Error('STAGE10_PUBLIC_JWT_KEY_INVALID');
 }
}
export function verifyStage10PublicJwt(
 token:string,publicKeyPem:string,
 expected:{issuer:string;audience:string;nowSeconds?:number},
):Stage10PublicClaims{
 const fail=():never=>{throw new Error('STAGE10_JWT_INVALID');};
 if(typeof token!=='string'||token.length>12000||typeof publicKeyPem!=='string'||
  !/^-----BEGIN PUBLIC KEY-----\n[\s\S]+\n-----END PUBLIC KEY-----\n?$/.test(publicKeyPem))fail();
 if(!claimString(expected.issuer,256)||!claimString(expected.audience,256))fail();
 const parts=token.split('.');
 if(parts.length!==3||parts.some(p=>!p))fail();
 const [head,payload,signature]=parts;
 const header=decodeSegment(head),body=decodeSegment(payload);
 if(!record(header)||header.alg!=='RS256'||header.typ!=='JWT'||Object.keys(header).some(
  k=>!['alg','typ'].includes(k)))fail();
 const claims:Record<string,unknown>=record(body)?body:fail();
 if(claims.iss!==expected.issuer||claims.aud!==expected.audience||
  claims.scope!=='stage10:finance:read'||!claimString(claims.sub,256)||
  !['ADMIN','MANAGER','OPERATOR','VIEWER'].includes(String(claims.role)))fail();
 const now=expected.nowSeconds??Math.floor(Date.now()/1000);
 if(!Number.isSafeInteger(now)||!Number.isSafeInteger(claims.exp)||
  !Number.isSafeInteger(claims.iat)||Number(claims.exp)<=now||
  Number(claims.iat)>now||Number(claims.exp)<=Number(claims.iat)||
  Number(claims.exp)-Number(claims.iat)>900)fail();
 if(claims.nbf!==undefined&&(!Number.isSafeInteger(claims.nbf)||Number(claims.nbf)>now))fail();
 if(!base64Url.test(signature)||signature.length>8192)fail();
 const bytes=Buffer.from(signature,'base64url');
 if(bytes.toString('base64url')!==signature)fail();
 let valid=false;
 try{
  const key=createPublicKey(publicKeyPem);
  if(key.asymmetricKeyType!=='rsa'||(key.asymmetricKeyDetails?.modulusLength??0)<2048)fail();
  valid=verifySignature('RSA-SHA256',Buffer.from(head+'.'+payload),key,bytes);
 }catch{fail();}
 if(!valid)fail();
 return claims as unknown as Stage10PublicClaims;
}
