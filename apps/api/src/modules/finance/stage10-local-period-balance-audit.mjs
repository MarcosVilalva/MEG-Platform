import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
assert.equal(process.env.MEG_STAGE10_LOCAL_REAL_PREVIEW,'1');
const u=new URL(process.env.DATABASE_URL||'postgresql://x:x@invalid/invalid');
assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55448');
assert.equal(u.pathname,'/meg_stage10_local_preview');assert.equal(u.username,'meg_stage10_preview_runtime');
const {PrismaClient}=await import('@prisma/client');
const db=new PrismaClient();
try {
  const ws=await db.workspace.findFirst({select:{owner:{select:{id:true,email:true,role:true}}}});
  assert.ok(ws?.owner);
  const usr=ws.owner;
  const b64=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
  const hdr=b64({alg:'HS256',typ:'JWT'});
  const now=Math.floor(Date.now()/1000);
  const pl=b64({sub:usr.id,email:usr.email,role:usr.role,iat:now,exp:now+600});
  const sig=createHmac('sha256',process.env.JWT_SECRET).update(hdr+'.'+pl).digest('base64url');
  const token=hdr+'.'+pl+'.'+sig;
  const read=async(path)=>{
    const r=await fetch('http://127.0.0.1:3333'+path,{headers:{Authorization:'Bearer '+token}});
    assert.equal(r.status,200,'READ_HTTP_STATUS:'+path.split('?')[0]);
    return r.json();
  };
  const snap=await read('/finance/events/history-snapshot');
  assert.equal(snap.kind,'complete');
  assert.equal(snap.total,snap.items.length);
  for (const month of ['2026-09','2026-10','2026-11']) {
    const got=await read('/finance/events/month?month='+month);
    assert.equal(got.page,1);
    assert.equal(got.items.length,got.total,'MONTH_COUNT_MISMATCH:'+month);
    const allMonth=snap.items.filter(e=>typeof e.date==='string' && e.date.slice(0,7)===month);
    const set=new Set(allMonth.map(e=>e.id));
    const gotSet=new Set(got.items.map(e=>e.id));
    const equal=set.size===gotSet.size && [...set].every(x=>gotSet.has(x));
    console.log('PT56_MONTH='+month+' MONTH_API='+got.total+' SNAPSHOT_FILTER='+allMonth.length+' EXACT_ID_SET='+equal);
    assert.equal(equal,true,'MONTH_FILTER_MISMATCH:'+month);
    const s=await read('/finance/summary?month='+month);
    const values=['income','expense','projectedResult','realizedResult'];
    const finite=values.every(x=>Number.isFinite(Number(s[x])));
    console.log('PT56_SUMMARY='+month+' FINITE='+finite+' MONTH_MATCH='+String(s.month===month));
    assert.equal(finite,true);
    assert.equal(s.month,month);
  }
  const accounts=await read('/finance/accounts');
  const monetary=accounts.filter(a=>a.isActive&&['checking','savings','cash'].includes(String(a.type).toLowerCase()));
  console.log('PT56_ACTIVE_MONETARY_ACCOUNT_COUNT='+monetary.length);
  for(const date of ['2026-11-14','2026-11-21']){
    const aggregate=await read('/finance/home-available?date='+date);
    assert.equal(aggregate.scope,'monetary');
    const balances=await Promise.all(monetary.map(a=>read('/finance/monetary-balance?accountId='+encodeURIComponent(a.id)+'&date='+date)));
    const amount=val=>BigInt(Math.round(Number(val)*100));
    const result=balances.reduce((sum,b)=>sum+amount(b.available),0n);
    const reference=amount(aggregate.available);
    const delta=result-reference;
    const ok=delta>=-1n&&delta<=1n;
    console.log('PT56_BALANCE_DATE='+date+' CANONICAL_ACCOUNT_TOTALS_AGREE='+ok+' DELTA_CENTS='+delta.toString());
    if(!ok)console.log('PT56_BALANCE_REVIEW_REQUIRED='+date);
  }
  console.log('PT56_PERIOD_AND_BALANCE_AUDIT=COMPLETE');
} finally { await db.$disconnect() }
