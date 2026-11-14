import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {issueStage10QaReadToken} from './stage10-qa-token-issuer.contract';
import {verifyStage10PublicJwt} from './stage10-public-jwt-contract';

const key=generateKeyPairSync('rsa',{modulusLength:2048,
 publicKeyEncoding:{type:'spki',format:'pem'},
 privateKeyEncoding:{type:'pkcs8',format:'pem'}});
const outsider=generateKeyPairSync('rsa',{modulusLength:2048,
 publicKeyEncoding:{type:'spki',format:'pem'},
 privateKeyEncoding:{type:'pkcs8',format:'pem'}});
const now=2000000000;
const identity={sub:'synthetic-approved-account',sessionId:'synthetic-active-session',role:'VIEWER' as const};
const config={privateKeyPem:key.privateKey,issuer:'https://qa-issuer.example.invalid',
 audience:'meg-stage10-only',nowSeconds:now,ttlSeconds:120};
const expect={issuer:config.issuer,audience:config.audience,nowSeconds:now};
const token=issueStage10QaReadToken(identity,config);
const verified=verifyStage10PublicJwt(token,key.publicKey,expect);
assert.equal(verified.sub,identity.sub);
assert.equal(verified.sid,identity.sessionId);
assert.equal(verified.role,identity.role);
assert.equal(verified.scope,'stage10:finance:read');
assert.equal(verified.exp-verified.iat,120);
assert.ok(!token.includes('PRIVATE KEY'));
assert.throws(()=>verifyStage10PublicJwt(token,outsider.publicKey,expect),/STAGE10_JWT_INVALID/);
assert.throws(()=>verifyStage10PublicJwt(token,key.publicKey,{...expect,nowSeconds:now+120}),
 /STAGE10_JWT_INVALID/,'token precisa expirar no instante correto');
const invalid=[
 [{...identity,sub:''},config],
 [{...identity,sessionId:''},config],
 [{...identity,role:'OWNER'},config],
 [identity,{...config,ttlSeconds:0}],
 [identity,{...config,ttlSeconds:301}],
 [identity,{...config,nowSeconds:NaN}],
 [identity,{...config,privateKeyPem:key.publicKey}],
 [identity,{...config,issuer:''}],
 [identity,{...config,audience:''}],
 [identity,{...config,privateKeyPem:'not-a-key'}],
] as const;
for(const [id,settings] of invalid){
 assert.throws(()=>issueStage10QaReadToken(
  id as typeof identity,settings as typeof config),/STAGE10_QA_ISSUER_INVALID/);
}
console.log('STAGE10_QA_RS256_ISSUER_VERIFIER_SYNTHETIC_CONTRACT PASS');
