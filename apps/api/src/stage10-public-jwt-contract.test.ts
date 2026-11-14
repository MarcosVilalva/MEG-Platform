import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {verifyStage10PublicJwt} from './stage10-public-jwt-contract';

const rsa=generateKeyPairSync('rsa',{modulusLength:2048,
 publicKeyEncoding:{type:'spki',format:'pem'},
 privateKeyEncoding:{type:'pkcs8',format:'pem'}});
const second=generateKeyPairSync('rsa',{modulusLength:2048,
 publicKeyEncoding:{type:'spki',format:'pem'},
 privateKeyEncoding:{type:'pkcs8',format:'pem'}});
const expected={issuer:'https://issuer.test.invalid',audience:'meg-stage10-readonly',
 nowSeconds:2000000000};
const good={
 sub:'synthetic-user',iss:expected.issuer,aud:expected.audience,
 scope:'stage10:finance:read',role:'VIEWER',iat:expected.nowSeconds,
 exp:expected.nowSeconds+300,
};
function token(payload:Record<string,unknown>=good,
 header:Record<string,unknown>={alg:'RS256',typ:'JWT'},
 key=rsa.privateKey){
 const a=Buffer.from(JSON.stringify(header)).toString('base64url');
 const b=Buffer.from(JSON.stringify(payload)).toString('base64url');
 const input=a+'.'+b;
 return input+'.'+sign('RSA-SHA256',Buffer.from(input),key).toString('base64url');
}
function deny(t:string,message:string,opts=expected){
 assert.throws(()=>verifyStage10PublicJwt(t,rsa.publicKey,opts),
  /STAGE10_JWT_INVALID/,message);
}
assert.deepEqual(verifyStage10PublicJwt(token(),rsa.publicKey,expected),good);
deny(token(good,{alg:'HS256',typ:'JWT'}),'alg confusion');
deny(token(good,{alg:'none',typ:'JWT'}),'unsigned JWT');
deny(token(good,{alg:'RS256',typ:'JWT',kid:'../secret'}),'unexpected key selector');
deny(token(good,{alg:'RS256',typ:'JWT',jku:'https://bad.invalid/key'}),'remote JWK selector');
deny(token({...good,aud:'unrelated-service'}),'wrong audience');
deny(token({...good,iss:'https://other.test.invalid'}),'wrong issuer');
deny(token({...good,scope:'admin:write'}),'wrong scope');
deny(token({...good,role:'OWNER'}),'unknown role');
deny(token({...good,sub:''}),'missing actor');
deny(token({...good,iat:expected.nowSeconds+5}),'issued in future');
deny(token({...good,exp:expected.nowSeconds-1}),'expired');
deny(token({...good,nbf:expected.nowSeconds+5}),'not yet valid');
deny(token({...good,exp:expected.nowSeconds+1800}),'excessive TTL');
deny(token(good,{alg:'RS256',typ:'JWT'},second.privateKey),'unknown signer');
deny(token().split('.').slice(0,2).join('.')+'.invalid','forged signature');
deny(token().split('.').slice(0,2).join('.')+'.','empty signature');
deny(token().replace(/\.[^.]+$/,'.../bad'),'malformed token');
deny(token({...good,exp:'2000000300'}),'exp must be numeric');
deny(token({...good,aud:['meg-stage10-readonly']}),'aud not exact string');
assert.throws(()=>verifyStage10PublicJwt(token(),rsa.privateKey,expected),
 /STAGE10_JWT_INVALID/,'private PEM rejected by public verifier');
console.log('STAGE10_PUBLIC_KEY_JWT_RS256_SYNTHETIC_CONTRACT PASS');
