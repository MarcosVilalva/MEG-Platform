/**
 * Etapa 10, integração REAL do write QA local com reserva durável de operação.
 * Somente DEV + API loopback + gate servidor. Nenhuma alteração Android/Phoenix.
 * Persiste apenas identificadores e SHA-256 do payload, nunca descrições/dados.
 */
import {readSession} from '../../app/auth-client';
import {financeClient, type FinancialEventInput} from '../../app/finance-client';
import {readSmartAuthorizedHistory} from '../launches/authorized-history';
import {
  runSafePhoenixWriteAttempt,
} from '../stage10/phoenix-safe-write-attempt';
import {
  reconcilePhoenixCanonicalHistory,
  type PhoenixAcceptedReceipt,
  type PhoenixCanonicalHistory,
  type PhoenixOperationIntent,
} from '../stage10/phoenix-readback-reconciliation';
import type {SafePhoenixAckState} from '../stage10/phoenix-safe-ack-state';
import {stage10LocalQaWriteOptIn} from './stage10-qa-monetary-create';

const PROTOCOL='meg-stage10-qa-create-durable-v1';

export type QaDurableCreateRecord=PhoenixOperationIntent & {
  protocol:typeof PROTOCOL;
  savedAt:string;
};
export type QaLocalStorage=Pick<Storage,'getItem'|'setItem'|'removeItem'>;

function storageKey(userId:string) {
  return PROTOCOL+':'+encodeURIComponent(userId);
}
function isRecord(value:unknown,userId:string):value is QaDurableCreateRecord {
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const row=value as Record<string,unknown>;
  return row.protocol===PROTOCOL&&row.userId===userId
    &&typeof row.operationId==='string'&&row.operationId.length>0
    &&typeof row.payloadFingerprint==='string'&&/^[a-f0-9]{64}$/.test(row.payloadFingerprint)
    &&typeof row.month==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(row.month)
    &&(row.eventId===undefined||(typeof row.eventId==='string'&&row.eventId.length>0))
    &&typeof row.savedAt==='string'&&!Number.isNaN(Date.parse(row.savedAt));
}

/** Leitura estrita: registro corrompido nunca é descartado silenciosamente. */
export function readQaDurableCreateRecord(storage:QaLocalStorage,userId:string):QaDurableCreateRecord|null {
  const text=storage.getItem(storageKey(userId));
  if(text===null)return null;
  let value:unknown;
  try{value=JSON.parse(text);}catch{throw new Error('QA_DURABLE_INTENT_CORRUPTED');}
  if(!isRecord(value,userId))throw new Error('QA_DURABLE_INTENT_CORRUPTED');
  return value;
}

/** Primeiro gravar, depois conferir persistência; falha impede POST. */
export function reserveQaDurableCreateRecord(
  storage:QaLocalStorage,intent:PhoenixOperationIntent
):QaDurableCreateRecord {
  const previous=readQaDurableCreateRecord(storage,intent.userId);
  if(previous){
    if(previous.operationId!==intent.operationId
      ||previous.payloadFingerprint!==intent.payloadFingerprint
      ||previous.month!==intent.month||previous.eventId!==intent.eventId){
      throw new Error('QA_PENDING_OPERATION_CONFLICT');
    }
    return previous;
  }
  const row:QaDurableCreateRecord={...intent,protocol:PROTOCOL,savedAt:new Date().toISOString()};
  storage.setItem(storageKey(intent.userId),JSON.stringify(row));
  const persisted=readQaDurableCreateRecord(storage,intent.userId);
  if(!persisted||persisted.operationId!==intent.operationId
    ||persisted.payloadFingerprint!==intent.payloadFingerprint) {
    throw new Error('QA_DURABLE_INTENT_SAVE_UNVERIFIED');
  }
  return persisted;
}

/** Conserva ID retornado antes de reler o banco; nunca troca o ID já salvo. */
export function attachQaDurableEventId(
  storage:QaLocalStorage,intent:PhoenixOperationIntent,eventId:string
) {
  const saved=readQaDurableCreateRecord(storage,intent.userId);
  if(!saved||saved.operationId!==intent.operationId
    ||saved.payloadFingerprint!==intent.payloadFingerprint
    ||(saved.eventId&&saved.eventId!==eventId)||!eventId){
    throw new Error('QA_DURABLE_EVENT_ID_MISMATCH');
  }
  storage.setItem(storageKey(intent.userId),JSON.stringify({...saved,eventId}));
  if(readQaDurableCreateRecord(storage,intent.userId)?.eventId!==eventId) {
    throw new Error('QA_DURABLE_EVENT_ID_SAVE_UNVERIFIED');
  }
}

export function clearQaConfirmedCreateRecord(
  storage:QaLocalStorage,intent:PhoenixOperationIntent,eventId:string
) {
  const saved=readQaDurableCreateRecord(storage,intent.userId);
  if(!saved||saved.operationId!==intent.operationId
    ||saved.payloadFingerprint!==intent.payloadFingerprint||saved.eventId!==eventId) {
    throw new Error('QA_DURABLE_CONFIRMATION_MISMATCH');
  }
  storage.removeItem(storageKey(intent.userId));
  if(storage.getItem(storageKey(intent.userId))!==null)throw new Error('QA_DURABLE_CLEAR_UNVERIFIED');
}

export async function qaPayloadFingerprint(payload:FinancialEventInput):Promise<string>{
  if(!globalThis.crypto?.subtle)throw new Error('QA_CRYPTO_UNAVAILABLE');
  const bytes=new TextEncoder().encode(JSON.stringify(payload));
  const digest=await globalThis.crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
}

function sessionMatches(userId:string) {
  return Boolean(userId&&readSession()?.user?.id===userId);
}

async function createWithLock(
  payload:FinancialEventInput,userId:string,storage:QaLocalStorage
):Promise<SafePhoenixAckState>{
  const fingerprint=await qaPayloadFingerprint(payload);
  const month=payload.date.slice(0,7);
  const previous=readQaDurableCreateRecord(storage,userId);
  if(previous&&(previous.payloadFingerprint!==fingerprint||previous.month!==month)){
    return {phase:'blocked',intent:previous,reason:'QA_PREVIOUS_OPERATION_NOT_RECONCILED'};
  }
  if(!previous&&!globalThis.crypto?.randomUUID) {
    return {phase:'blocked',reason:'QA_CRYPTO_UNAVAILABLE'};
  }
  const intent:PhoenixOperationIntent=previous??{
    operationId:globalThis.crypto.randomUUID(),userId,month,payloadFingerprint:fingerprint,
  };

  const state=await runSafePhoenixWriteAttempt(intent,userId,{
    reserveIntent:async row=>reserveQaDurableCreateRecord(storage,row),
    submitOnce:async row=>{
      if(!stage10LocalQaWriteOptIn()||!sessionMatches(userId)) {
        return {status:'error',code:'QA_SESSION_OR_GATE_INVALID',operationId:row.operationId};
      }
      const saved=await financeClient.createEvent({...payload,operationId:row.operationId});
      if(!saved?.id||saved.legacyTransactionId!==saved.id){
        return {status:'error',code:'QA_MIRROR_NOT_CONFIRMED',operationId:row.operationId};
      }
      attachQaDurableEventId(storage,row,saved.id);
      return {status:'accepted',operationId:row.operationId,event:{id:saved.id,date:saved.date}};
    },
    loadCanonicalHistory:async()=>{
      if(!sessionMatches(userId))throw new Error('QA_SESSION_CHANGED_DURING_READ');
      const abort=new AbortController();
      const timeout=setTimeout(()=>abort.abort(),15000);
      try {
        const items=await readSmartAuthorizedHistory(
          signal=>financeClient.getHistorySnapshot(signal),
          (page,size,signal)=>financeClient.listEvents(page,size,'',signal),
          abort.signal,
        );
        return {kind:'complete',items:items.map(x=>({id:x.id,date:x.date}))};
      } finally {
        clearTimeout(timeout);
      }
    },
  });

  if(state.phase==='confirmed'){
    try{
      clearQaConfirmedCreateRecord(storage,intent,state.eventId);
    }catch {
      return {phase:'pending',intent,receipt:state.receipt,
        reason:'QA_CONFIRMED_BUT_LOCAL_CLEANUP_PENDING'};
    }
  }
  return state;
}

/** Executável somente no QA local explicitamente habilitado; bloqueia abas concorrentes. */
export async function createStage10QaExpenseWithDurableReadback(
  payload:FinancialEventInput,userId:string
):Promise<SafePhoenixAckState>{
  if(!stage10LocalQaWriteOptIn()||!sessionMatches(userId)) {
    return {phase:'blocked',reason:'QA_LOCAL_WRITE_GATE_CLOSED'};
  }
  if(typeof window==='undefined'||!window.navigator.locks) {
    return {phase:'blocked',reason:'QA_CROSS_TAB_LOCK_UNAVAILABLE'};
  }
  let storage:QaLocalStorage;
  try{storage=window.localStorage;}catch{
    return {phase:'blocked',reason:'QA_DURABLE_STORAGE_UNAVAILABLE'};
  }
  return window.navigator.locks.request(PROTOCOL+':'+encodeURIComponent(userId),
    {mode:'exclusive'},()=>createWithLock(payload,userId,storage));
}

/** Utilizado só para alertar sobre tentativas não reconciliadas após reload. */
export function pendingQaCreateForUser(userId:string):boolean {
  if(!stage10LocalQaWriteOptIn())return false;
  try{return Boolean(readQaDurableCreateRecord(window.localStorage,userId));}
  catch{return true;} // inválido também bloqueia e exige revisão
}

/**
 * PT90: recuperação read-only após reload, sem reconstituir nem armazenar
 * descrição, valor, conta ou payload original. Ausência de recibo é pendência,
 * nunca permissão para descartar a chave ou gerar outro POST.
 */
export async function recoverStage10QaCreateWithoutPayload(
  userId:string,
):Promise<SafePhoenixAckState>{
  if(!stage10LocalQaWriteOptIn()||!sessionMatches(userId)){
    return {phase:'blocked',reason:'QA_LOCAL_WRITE_GATE_CLOSED'};
  }
  if(typeof window==='undefined'||!window.navigator.locks){
    return {phase:'blocked',reason:'QA_CROSS_TAB_LOCK_UNAVAILABLE'};
  }
  let storage:QaLocalStorage;
  try{storage=window.localStorage;}catch{
    return {phase:'blocked',reason:'QA_DURABLE_STORAGE_UNAVAILABLE'};
  }
  return window.navigator.locks.request(PROTOCOL+':'+encodeURIComponent(userId),
    {mode:'exclusive'},async()=>{
      let intent:QaDurableCreateRecord|null;
      try{intent=readQaDurableCreateRecord(storage,userId);}
      catch{return {phase:'blocked',reason:'QA_DURABLE_INTENT_CORRUPTED'};}
      if(!intent)return {phase:'ready'};
      if(!sessionMatches(userId))return {phase:'blocked',intent,reason:'QA_SESSION_CHANGED_DURING_READ'};
      let lookup:Awaited<ReturnType<typeof financeClient.getStage10QaCreateOperation>>;
      try{
        lookup=await financeClient.getStage10QaCreateOperation(intent.operationId,intent.month);
      }catch{
        return {phase:'pending',intent,reason:'QA_RECOVERY_READ_UNAVAILABLE'};
      }
      if(!sessionMatches(userId))return {phase:'blocked',intent,reason:'QA_SESSION_CHANGED_DURING_READ'};
      if(lookup.status==='pending'){
        return {phase:'pending',intent,reason:'QA_RECEIPT_NOT_FOUND_PRESERVE_OPERATION_ID'};
      }
      if(lookup.status!=='found'){
        return {phase:'blocked',intent,reason:'QA_RECOVERY_SERVER_INCONSISTENT'};
      }
      if(lookup.operationId!==intent.operationId
        ||lookup.date.slice(0,7)!==intent.month
        ||(intent.eventId&&intent.eventId!==lookup.eventId)){
        return {phase:'blocked',intent,reason:'QA_RECOVERY_IDENTITY_MISMATCH'};
      }
      const receipt:PhoenixAcceptedReceipt={
        operationId:lookup.operationId,event:{id:lookup.eventId,date:lookup.date},
      };
      let history:PhoenixCanonicalHistory;
      try{
        const abort=new AbortController();
        const timeout=setTimeout(()=>abort.abort(),15000);
        try{
          const items=await readSmartAuthorizedHistory(
            signal=>financeClient.getHistorySnapshot(signal),
            (page,size,signal)=>financeClient.listEvents(page,size,'',signal),
            abort.signal,
          );
          history={kind:'complete',items:items.map(x=>({id:x.id,date:x.date}))};
        }finally{clearTimeout(timeout);}
      }catch{
        return {phase:'pending',intent,receipt,reason:'QA_CANONICAL_READ_UNAVAILABLE'};
      }
      if(!sessionMatches(userId))return {phase:'blocked',intent,receipt,reason:'QA_SESSION_CHANGED_DURING_READ'};
      const checked=reconcilePhoenixCanonicalHistory(intent,receipt,history,userId);
      if(checked.status==='blocked')return {phase:'blocked',intent,receipt,reason:checked.reason};
      if(checked.status==='pending')return {phase:'pending',intent,receipt,reason:checked.reason};
      try{
        attachQaDurableEventId(storage,intent,checked.eventId);
        clearQaConfirmedCreateRecord(storage,intent,checked.eventId);
      }catch{
        return {phase:'pending',intent,receipt,reason:'QA_CONFIRMED_BUT_LOCAL_CLEANUP_PENDING'};
      }
      return {phase:'confirmed',intent,receipt,eventId:checked.eventId};
    });
}
