import assert from 'node:assert/strict';
import {authorizeStage10QaTokenExchange,type Stage10ExchangeEvidence} from './stage10-qa-token-exchange.contract';

const now=2000000000;
const base:Stage10ExchangeEvidence={
 enabled:true,
 transport:{method:'POST',path:'/auth/stage10-qa/exchange',
  origin:'https://qa-auth.example.invalid',expectedOrigin:'https://qa-auth.example.invalid',
  contentType:'application/json'},
 access:{signatureVerified:true,sub:'synthetic-user',role:'VIEWER',
  sid:'synthetic-session',iat:now-50,exp:now+200},
 user:{id:'synthetic-user',status:'ACTIVE',isActive:true,role:'VIEWER'},
 session:{id:'synthetic-session',userId:'synthetic-user',expiresAt:now+1000,revokedAt:null},
 workspace:{id:'synthetic-workspace',isActive:true},
 membership:{workspaceId:'synthetic-workspace',userId:'synthetic-user',
  status:'ACTIVE',isActive:true},
 nowSeconds:now,
};
function check(update:(input:Stage10ExchangeEvidence)=>void){
 const value=structuredClone(base);
 update(value);
 assert.throws(()=>authorizeStage10QaTokenExchange(value),/STAGE10_QA_EXCHANGE_DENIED/);
}
const accepted=authorizeStage10QaTokenExchange(base);
assert.deepEqual(accepted,{sub:'synthetic-user',role:'VIEWER',
 sessionId:'synthetic-session',workspaceId:'synthetic-workspace',ttlSeconds:120});
const almostExpired=structuredClone(base);
almostExpired.access.exp=now+3;
assert.equal(authorizeStage10QaTokenExchange(almostExpired).ttlSeconds,3);
const sessionAlmostExpired=structuredClone(base);
sessionAlmostExpired.session.expiresAt=now+2;
assert.equal(authorizeStage10QaTokenExchange(sessionAlmostExpired).ttlSeconds,2);
// A sessao da API atual nao possui sid no JWT: NAO habilitar exchange real.
check(e=>{delete e.access.sid;});
check(e=>{e.enabled=false;});
check(e=>{e.transport.method='GET';});
check(e=>{e.transport.path='/auth/stage10-qa/exchange?token=secret';});
check(e=>{e.transport.origin='https://other.example.invalid';});
check(e=>{e.transport.origin=null;});
check(e=>{e.transport.expectedOrigin='http://qa-auth.example.invalid';});
check(e=>{e.transport.contentType='text/plain';});
check(e=>{e.access.signatureVerified=false;});
check(e=>{e.access.sub='other-user';});
check(e=>{e.access.role='ADMIN';});
check(e=>{e.access.iat=now+1;});
check(e=>{e.access.exp=now;});
check(e=>{e.access.exp=e.access.iat+901;});
check(e=>{e.user.isActive=false;});
check(e=>{e.user.status='BLOCKED';});
check(e=>{e.session.id='another-session';});
check(e=>{e.session.userId='another-user';});
check(e=>{e.session.revokedAt=now-1;});
check(e=>{e.session.expiresAt=now;});
check(e=>{e.workspace.isActive=false;});
check(e=>{e.membership.workspaceId='other-workspace';});
check(e=>{e.membership.userId='other-user';});
check(e=>{e.membership.status='PENDING';});
check(e=>{e.membership.isActive=false;});
check(e=>{e.nowSeconds=NaN;});
console.log('STAGE10_QA_EXCHANGE_SESSION_BOUND_SYNTHETIC_CONTRACT PASS');
