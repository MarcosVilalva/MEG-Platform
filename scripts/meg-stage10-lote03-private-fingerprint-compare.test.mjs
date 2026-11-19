import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { compareStage10Lote03Private } from './meg-stage10-lote03-private-fingerprint-compare.mjs';

const hashes = ['a', 'b', 'c', 'd', 'e'].map((x) => x.repeat(32));
const patterns = ['A', 'B', 'C'];
const row = (padrao) => ({
  padrao, elegibilidade: 'PASS', categorias_unicas: 1, meios_unicos: '1', espelhos_exatos: 1,
  ledger: 0, recibos: 0, baixas: 0, importacoes: 0,
  event_fingerprint: hashes[0], account_fingerprint: hashes[1],
  category_fingerprint: hashes[2], payment_fingerprint: hashes[3], source_fingerprint: hashes[4],
});
const input = () => ({current:patterns.map(row),local:patterns.map(row)});

test('accepts identical A/B/C fingerprint sets with valid isolated semantics', () => {
  assert.deepEqual(compareStage10Lote03Private(input()), {
    ok:true,result:'THREE_PATTERNS_FIVE_FINGERPRINTS_MATCH',patterns:3,fieldsPerPattern:5
  });
});
test('rejects changed event fingerprint without leaking private bytes', () => {
  const x=input();x.local[1].event_fingerprint='f'.repeat(32);
  const result=compareStage10Lote03Private(x);
  assert.deepEqual(result,{ok:false,reason:'FINGERPRINT_MISMATCH',pattern:'B',field:'event_fingerprint'});
  assert.doesNotMatch(JSON.stringify(result),/ffffffffffff/);
});
test('rejects changed reference relation, flags and foreign-key counts', () => {
  for(const key of ['account_fingerprint','category_fingerprint','payment_fingerprint','source_fingerprint']){
    const x=input();x.local[2][key]='f'.repeat(32);
    assert.equal(compareStage10Lote03Private(x).reason,'FINGERPRINT_MISMATCH');
  }
  const cases=[['elegibilidade','FAIL','LOCAL_PATTERN_NOT_ELIGIBLE'],['categorias_unicas',2,'LOCAL_INVARIANT_COUNTER_MISMATCH'],['ledger',1,'LOCAL_INVARIANT_COUNTER_MISMATCH']];
  for(const [key,value,expected] of cases){const x=input();x.local[0][key]=value;assert.equal(compareStage10Lote03Private(x).reason,expected);}
});
test('rejects duplicated/missing patterns, stale empty inputs and surplus sensitive keys',()=>{
  const bad=[
    (()=>{const x=input(); x.local[2].padrao='B';return x;})(),
    (()=>{const x=input(); x.current.pop();return x;})(),
    (()=>{const x=input(); x.current[0].event_id='private-id';return x;})(),
    (()=>{const x=input(); delete x.current[0].source_fingerprint;return x;})(),
    (()=>{const x=input();x.extra='secret';return x;})()
  ];
  bad.forEach((x)=>assert.equal(compareStage10Lote03Private(x).ok,false));
});
test('CLI fail-closed in CI, unapproved and invalid private input',()=>{
  const cli=join(dirname(fileURLToPath(import.meta.url)),'meg-stage10-lote03-private-fingerprint-compare.mjs');
  for(const envDelta of [{}, {MEG_STAGE10_PRIVATE_OFFLINE_ACK:'1',CI:'true'}]){
    const r=spawnSync(process.execPath,[cli],{input:JSON.stringify(input()),encoding:'utf8',env:{...process.env,MEG_STAGE10_PRIVATE_OFFLINE_ACK:'0',CI:'',GITHUB_ACTIONS:'',...envDelta}});
    assert.equal(r.status,3);
    assert.match(r.stdout,/MEG_STAGE10_LOTE03_PRIVATE_GATE1=BLOCKED/);
    assert.doesNotMatch(r.stdout,/aaaaaaaaaaaaaaaa|private-id/);
  }
  const inv=spawnSync(process.execPath,[cli],{input:'{malformed private payload',encoding:'utf8',env:{...process.env,MEG_STAGE10_PRIVATE_OFFLINE_ACK:'1',CI:'',GITHUB_ACTIONS:''}});
  assert.equal(inv.status,3);assert.match(inv.stdout,/PRIVATE_INPUT_UNREADABLE/);assert.doesNotMatch(inv.stdout,/malformed/);
});
