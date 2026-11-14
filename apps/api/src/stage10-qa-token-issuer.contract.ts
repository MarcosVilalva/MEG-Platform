import {createPrivateKey,sign as rsaSign} from 'node:crypto';

/**
 * Caracterizacao do emissor QA. NAO conectado ao login, refresh ou API canonica.
 * O chamador precisa ter autenticado e autorizado o usuario previamente.
 * Nunca transmitir a chave privada ao browser ou ao backend de leitura.
 */
export type Stage10IssueInput={
 sub:string;
 role:'ADMIN'|'MANAGER'|'OPERATOR'|'VIEWER';
};
export type Stage10IssuerConfig={
 privateKeyPem:string;
 issuer:string;
 audience:string;
 nowSeconds:number;
 ttlSeconds:number;
};
function requiredString(value:unknown,max:number):value is string{
 return typeof value==='string'&&value.length>0&&value.length<=max;
}
export function issueStage10QaReadToken(
 identity:Stage10IssueInput,settings:Stage10IssuerConfig,
):string{
 const fail=():never=>{throw new Error('STAGE10_QA_ISSUER_INVALID');};
 if(!identity||!requiredString(identity.sub,256)||
  !['ADMIN','MANAGER','OPERATOR','VIEWER'].includes(identity.role)||
  !settings||!requiredString(settings.issuer,256)||
  !requiredString(settings.audience,256)||
  !Number.isSafeInteger(settings.nowSeconds)||
  !Number.isSafeInteger(settings.ttlSeconds)||
  settings.ttlSeconds<1||settings.ttlSeconds>300||
  settings.nowSeconds<0||settings.nowSeconds+settings.ttlSeconds>Number.MAX_SAFE_INTEGER)fail();
 if(typeof settings.privateKeyPem!=='string'||
  !settings.privateKeyPem.startsWith('-----BEGIN PRIVATE KEY-----\n'))fail();
 let privateKey;
 try{
  privateKey=createPrivateKey(settings.privateKeyPem);
  if(privateKey.asymmetricKeyType!=='rsa'||
   (privateKey.asymmetricKeyDetails?.modulusLength??0)<2048)fail();
 }catch{fail();}
 const claims={
  sub:identity.sub,role:identity.role,iss:settings.issuer,
  aud:settings.audience,scope:'stage10:finance:read' as const,
  iat:settings.nowSeconds,nbf:settings.nowSeconds,
  exp:settings.nowSeconds+settings.ttlSeconds,
 };
 const header=Buffer.from(JSON.stringify({alg:'RS256',typ:'JWT'})).toString('base64url');
 const body=Buffer.from(JSON.stringify(claims)).toString('base64url');
 const signed=header+'.'+body;
 try{
  const signature=rsaSign('RSA-SHA256',Buffer.from(signed),privateKey).toString('base64url');
  return signed+'.'+signature;
 }catch{fail();}
}
