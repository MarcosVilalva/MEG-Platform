import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {authorizeStage10QaTokenExchange,type Stage10ExchangeEvidence} from './stage10-qa-token-exchange.contract';

const now=2000000000;
const refreshToken='synthetic-refresh-token-proof-only-1234567890';
const base:Stage10ExchangeEvidence={
 enabled:true,
 transport:{method:'POST',path:'/auth/stage10-qa/exchange',
  origin:'https://qa-auth.example.invalid',expectedOrigin:'https://qa-auth.example.invalid',
  contentType:'application/json'},
 // HMAC canônico não contém sid. O token QA receberá AuthSession.id após prova opaca.
 access:{signatureVerified:true,sub:'synthetic-user',role:'VIEWER',iat:now-50,exp:now+200},
 refreshToken,
 user:{id:'synthetic-user',status:'ACTIVE',isActive:true,role:'VIEWER'},
 session:{id:'synthetic-session',userId:'synthetic-user',
  tokenHash:createHash('sha256').update(refreshToken).digest('hex'),
  expiresAt:now+1000,revokedAt:null},
 workspace:{id:'synthetic-workspace',isActive:true},
 membership:{workspaceId:'synthetic-workspace',userId:'synthetic-user',
  status:'ACTIVE',isActive:true},nowSeconds:now,
};
function deny(change:(e:Stage10ExchangeEvidence)=>void){
 const e=structuredClone(base);change(e);
 assert.throws(()=>authorizeStage10QaTokenExchange(e),/STAGE10_QA_EXCHANGE_DENIED/);
}
const allowed=authorizeStage10QaTokenExchange(base);
assert.deepEqual(allowed,{sub:'synthetic-user',role:'VIEWER',
 sessionId:'synthetic-session',workspaceId:'synthetic-workspace',ttlSeconds:120});
assert.ok(!JSON.stringify(allowed).includes(refreshToken),'Refresh proof cannot leave canonical issuer');
const expSoon=structuredClone(base);expSoon.access.exp=now+3;
assert.equal(authorizeStage10QaTokenExchange(expSoon).ttlSeconds,3);
const sessionSoon=structuredClone(base);sessionSoon.session.expiresAt=now+2;
assert.equal(authorizeStage10QaTokenExchange(sessionSoon).ttlSeconds,2);
deny(e=>{e.enabled=false;});
deny(e=>{e.transport.method='GET';});
deny(e=>{e.transport.path='/auth/stage10-qa/exchange?token=secret';});
deny(e=>{e.transport.origin=null;});
deny(e=>{e.transport.origin='https://other.example.invalid';});
deny(e=>{e.transport.expectedOrigin='http://qa-auth.example.invalid';});
deny(e=>{e.transport.contentType='text/plain';});
deny(e=>{e.access.signatureVerified=false;});
deny(e=>{e.access.sub='other-user';});
deny(e=>{e.access.role='ADMIN';});
deny(e=>{e.access.exp=now;});
deny(e=>{e.access.iat=now+1;});
deny(e=>{e.access.exp=e.access.iat+901;});
deny(e=>{e.refreshToken='wrong-refreshtoken-synthetic-99999';});
deny(e=>{e.refreshToken='';});
deny(e=>{e.session.tokenHash='';});
deny(e=>{e.session.tokenHash='a'.repeat(64);});
deny(e=>{e.session.userId='another-user';});
deny(e=>{e.session.revokedAt=now-1;});
deny(e=>{e.session.expiresAt=now;});
deny(e=>{e.user.isActive=false;});
deny(e=>{e.user.status='BLOCKED';});
deny(e=>{e.workspace.isActive=false;});
deny(e=>{e.membership.workspaceId='other-workspace';});
deny(e=>{e.membership.userId='other-user';});
deny(e=>{e.membership.status='PENDING';});
deny(e=>{e.membership.isActive=false;});
deny(e=>{e.nowSeconds=NaN;});
console.log('STAGE10_QA_EXCHANGE_REFRESH_PROOF_SYNTHETIC_CONTRACT PASS');
