import { Prisma, prisma } from '@meg/database';
import { mutationRequestHash, receiptCreateData } from '../app-state/mutation-receipt';
import { resolveWorkspaceContext } from '../workspaces/service';
import { recordFinancialAudit } from './audit';
import { isMonetaryAccountType, isPostedFinancialStatus } from './financial-policy';
import { monetaryAccountDebitWindow, serializableFinancialTransaction, isFutureFinancialDay } from './monetary-protection';

type Tx = Prisma.TransactionClient;
type Decision = 'RESOLVED_DUPLICATE'|'RESOLVED_LEGITIMATE';
type Command = {peerEventId:string;suspicionGroupId:string;operationId:string;reason:string};
export type ResolveCommand = Command & {decision:Decision;correctionTargetEventId?:string;effectiveDate?:string};
export type UndoCommand = Command & {resolutionAuditId:string};
type EventRow = Prisma.FinancialEventGetPayload<{include:{account:true,receipt:true,payablePayment:true,importedRow:true}}>;
type History = {id:string;action:string;createdAt:Date;metadata:string|null};
export class A17ReviewError extends Error {constructor(public code:string){super(code);}}
const fail=(code:string):never=>{throw new A17ReviewError(code);};
const KIND='MEG_A17_COUNTERENTRY_V1';
const parse=(metadata:string|null):Record<string,unknown>=>{
  try {const value=JSON.parse(metadata||'{}') as {context?:Record<string,unknown>};
    return value.context&&typeof value.context==='object'?value.context:{};}catch{return {};}
};
const tagged=(value:unknown)=>Boolean(value&&typeof value==='object'&&!Array.isArray(value)
  &&(value as Record<string,unknown>).kind===KIND);
const unique=(e:unknown)=>Boolean(e&&typeof e==='object'&&'code'in e&&(e as {code?:string}).code==='P2002');
const anchorOf=(a:string,b:string)=>[a,b].sort()[0];
function checkDay(day:string) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day+'T00:00:00Z'))
    ||new Date(day+'T00:00:00Z').toISOString().slice(0,10)!==day
    ||isFutureFinancialDay(day))fail('A17_INVALID_EFFECTIVE_DATE');
}
function active(rows:History[],group:string) {
  const relevant=rows.map(row=>({...row,context:parse(row.metadata)}))
    .filter(row=>row.context.suspicionGroupId===group);
  const undone=new Set(relevant.filter(row=>row.action==='FINANCIAL_EVENT_SUSPICION_REVERSED')
    .map(row=>row.context.resolutionAuditId));
  const current=relevant.filter(row=>row.action==='FINANCIAL_EVENT_SUSPICION_RESOLVED'&&!undone.has(row.id));
  if(current.length>1)fail('A17_MULTIPLE_ACTIVE_RESOLUTIONS');
  return {current:current[0]??null,relevant};
}
async function history(tx:Tx,id:string) {
  return tx.auditLog.findMany({where:{entity:'FinancialEvent',entityId:id,action:{in:[
    'FINANCIAL_EVENT_SUSPICION_RESOLVED','FINANCIAL_EVENT_SUSPICION_REVERSED']}},
    select:{id:true,action:true,createdAt:true,metadata:true}});
}
async function pair(tx:Tx,actor:string,id:string,peerId:string,group:string){
  if(id===peerId)fail('A17_PAIR_IDENTICAL');
  const workspace=await resolveWorkspaceContext(actor,{allowLegacyBootstrap:false});
  if(!['ADMIN','MANAGER'].includes(workspace.membership.role))fail('A17_ROLE_DENIED');
  const ids=[id,peerId].sort();
  for(const key of ids){
    const locked=await tx.$queryRawUnsafe<Array<{id:string}>>(
      'SELECT id FROM "FinancialEvent" WHERE id=$1 AND "workspaceId"=$2 AND "userId"=$3 FOR UPDATE',
      key,workspace.workspaceId,workspace.workspace.ownerId);
    if(locked.length!==1)fail('A17_PAIR_NOT_FOUND');
  }
  const events=await tx.financialEvent.findMany({where:{
    id:{in:ids},workspaceId:workspace.workspaceId,userId:workspace.workspace.ownerId,
  },include:{account:true,receipt:true,payablePayment:true,importedRow:true}});
  if(events.length!==2)fail('A17_PAIR_NOT_FOUND');
  const markers=await tx.auditLog.findMany({where:{entity:'FinancialEvent',
    action:'FINANCIAL_EVENT_DUPLICATE_SUSPECTED',entityId:{in:ids}},
    select:{entityId:true,metadata:true}});
  const matching=markers.filter(row=>{
    const c=parse(row.metadata);
    return c.suspicionGroupId===group&&c.workspaceId===workspace.workspaceId
      &&c.peerEventId===(row.entityId===id?peerId:id);
  });
  if(matching.length!==2||new Set(matching.map(x=>x.entityId)).size!==2)
    fail('A17_SUSPICION_NOT_VERIFIED');
  return {workspace,events,anchor:ids[0],other:ids[1]};
}
function eligible(event:EventRow){
  if(event.type!=='expense'||!isPostedFinancialStatus(event.status)||event.archivedAt
    ||!event.account||!isMonetaryAccountType(event.account.type)
    ||event.receipt||event.payablePayment||event.importedRow||tagged(event.sourcePayload)
    ||!event.signedAmount.isNegative()||!event.amount.isPositive())
    fail('A17_NONCANONICAL_SOURCE');
}
async function guardSource(tx:Tx,id:string){
  const logs=await tx.auditLog.findMany({where:{entity:'FinancialEvent',entityId:id,
    action:{in:['FINANCIAL_EVENT_REVIEW_COUNTERENTRY','FINANCIAL_EVENT_REVIEW_COUNTERENTRY_UNDONE']}},
    select:{action:true,metadata:true}});
  const undone=new Set(logs.filter(x=>x.action==='FINANCIAL_EVENT_REVIEW_COUNTERENTRY_UNDONE')
    .map(x=>parse(x.metadata).counterentryId));
  if(logs.some(x=>x.action==='FINANCIAL_EVENT_REVIEW_COUNTERENTRY'
    &&!undone.has(parse(x.metadata).counterentryId)))fail('A17_ACTIVE_CORRECTION_PROTECTED');
}
async function counterentry(tx:Tx,source:EventRow,signed:Prisma.Decimal,day:string,
  context:{groupId:string;operationId:string;phase:'CORRECTION'|'UNDO';reversesId?:string}){
  const date=new Date(day+'T00:00:00.000Z');
  const event=await tx.financialEvent.create({data:{
    userId:source.userId,workspaceId:source.workspaceId,
    description:(context.phase==='CORRECTION'?'Estorno revisado: ':'Desfazer estorno: ')+source.description,
    type:'expense',status:'paid',date,competence:day.slice(0,7),
    amount:source.amount,signedAmount:signed,accountId:source.accountId,
    categoryId:source.categoryId,paymentMethodId:source.paymentMethodId,
    sourcePayload:{kind:KIND,sourceEventId:source.id,...context},
    notes:'Contrapartida identificada em revisão humana',
  }});
  await tx.ledgerEntry.create({data:{eventId:event.id,date,accountId:source.accountId!,
    debit:signed.isPositive()?source.amount:new Prisma.Decimal(0),
    credit:signed.isNegative()?source.amount:new Prisma.Decimal(0),
    memo:event.description}});
  return event;
}
async function receipt(tx:Tx,ws:string,op:string,hash:string,mutationType:string,response:unknown){
  const state=await tx.appState.findUnique({where:{workspaceId:ws},select:{revision:true}});
  await tx.cloudMutationReceipt.create({data:receiptCreateData({
    workspaceId:ws,operationId:op,requestHash:hash,mutationType,
    revision:state?.revision??0,response,
  })});
}
async function execute(actor:string,eventId:string,request:ResolveCommand|UndoCommand,undo:boolean){
  const hash=mutationRequestHash({eventId,...request,kind:undo?'UNDO':'RESOLVE'});
  const mutationType=undo?'A17_REVIEW_UNDO':'A17_REVIEW_RESOLVE';
  const ws=await resolveWorkspaceContext(actor,{allowLegacyBootstrap:false});
  if(!['ADMIN','MANAGER'].includes(ws.membership.role))fail('A17_ROLE_DENIED');
  try{return await serializableFinancialTransaction(async tx=>{
    const old=await tx.cloudMutationReceipt.findUnique({where:{
      workspaceId_operationId:{workspaceId:ws.workspaceId,operationId:request.operationId}}});
    if(old){
      if(old.requestHash!==hash||old.mutationType!==mutationType)fail('OPERATION_ID_REUSED');
      return {...(old.response as Record<string,unknown>),idempotentReplay:true};
    }
    const p=await pair(tx,actor,eventId,request.peerEventId,request.suspicionGroupId);
    const state=active(await history(tx,p.anchor),request.suspicionGroupId);
    // Durable tombstone prevents operationId reuse even if the receipt was purged.
    if(state.relevant.some(x=>x.context.operationId===request.operationId))
      fail('A17_OPERATION_HISTORY_RETAINED');
    let result:Record<string,unknown>;
    if(!undo){
      const input=request as ResolveCommand;
      if(state.current)fail('A17_ALREADY_RESOLVED');
      let compensationEventId:string|null=null;
      if(input.decision==='RESOLVED_DUPLICATE'){
        const targetId=input.correctionTargetEventId;
        const day=input.effectiveDate;
        if(typeof targetId!=='string'||typeof day!=='string')
          throw new A17ReviewError('A17_CORRECTION_DETAILS_REQUIRED');
        if(![eventId,request.peerEventId].includes(targetId))
          throw new A17ReviewError('A17_TARGET_OUTSIDE_PAIR');
        checkDay(day);
        const source=p.events.find(x=>x.id===targetId)!;
        eligible(source);
        await guardSource(tx,source.id);
        compensationEventId=(await counterentry(tx,source,source.signedAmount.negated(),
          day,{groupId:request.suspicionGroupId,operationId:request.operationId,
            phase:'CORRECTION'})).id;
      }else if(input.correctionTargetEventId||input.effectiveDate)fail('A17_UNEXPECTED_CORRECTION');
      const audit=await recordFinancialAudit(tx,{actorId:actor,entity:'FinancialEvent',
        entityId:p.anchor,action:'FINANCIAL_EVENT_SUSPICION_RESOLVED',
        context:{workspaceId:ws.workspaceId,suspicionGroupId:request.suspicionGroupId,
          peerEventId:p.other,operationId:request.operationId,reason:request.reason,
          decision:input.decision,correctionTargetEventId:input.correctionTargetEventId??null,
          compensationEventId,effectiveDate:input.effectiveDate??null}});
      if(compensationEventId){
        await recordFinancialAudit(tx,{actorId:actor,entity:'FinancialEvent',
          entityId:input.correctionTargetEventId!,action:'FINANCIAL_EVENT_REVIEW_COUNTERENTRY',
          context:{workspaceId:ws.workspaceId,reviewAuditId:audit.id,operationId:request.operationId,
            suspicionGroupId:request.suspicionGroupId,counterentryId:compensationEventId}});
      }
      result={reviewStatus:input.decision,resolutionAuditId:audit.id,compensationEventId,
        sourceEventId:input.correctionTargetEventId??null,idempotentReplay:false};
    }else{
      const input=request as UndoCommand;
      if(!state.current||state.current.id!==input.resolutionAuditId)
        fail('A17_NO_ACTIVE_RESOLUTION');
      let inverseEventId:string|null=null;
      const ctx=state.current.context;
      if(ctx.decision==='RESOLVED_DUPLICATE'){
        const sourceId=ctx.correctionTargetEventId;
        const correctionId=ctx.compensationEventId;
        if(typeof sourceId!=='string'||typeof correctionId!=='string')
          throw new A17ReviewError('A17_SOURCE_REFERENCE_INVALID');
        const source=p.events.find(x=>x.id===sourceId);
        if(!source)throw new A17ReviewError('A17_SOURCE_REFERENCE_INVALID');
        eligible(source);
        const correction=await tx.financialEvent.findFirst({where:{
          id:correctionId,workspaceId:ws.workspaceId,userId:ws.workspace.ownerId,
          archivedAt:null}});
        const payload=correction?.sourcePayload as Record<string,unknown>|undefined;
        if(!correction||!tagged(payload)||payload?.sourceEventId!==source.id
          ||payload?.groupId!==request.suspicionGroupId
          ||!correction.signedAmount.equals(source.signedAmount.negated()))
          throw new A17ReviewError('A17_COUNTERENTRY_STALE');
        const day=correction.date.toISOString().slice(0,10);
        checkDay(day);
        const window=await monetaryAccountDebitWindow(tx,ws.workspace.ownerId,source.account!,day,
          Math.round(Number(source.amount)*100));
        if(!window.allowed)fail('A17_UNDO_INSUFFICIENT_BALANCE');
        inverseEventId=(await counterentry(tx,source,source.signedAmount,day,{
          groupId:request.suspicionGroupId,operationId:request.operationId,phase:'UNDO',
          reversesId:correction.id})).id;
      }
      const audit=await recordFinancialAudit(tx,{actorId:actor,entity:'FinancialEvent',
        entityId:p.anchor,action:'FINANCIAL_EVENT_SUSPICION_REVERSED',
        context:{workspaceId:ws.workspaceId,suspicionGroupId:request.suspicionGroupId,
          operationId:request.operationId,resolutionAuditId:input.resolutionAuditId,
          reason:request.reason,inverseEventId}});
      if(inverseEventId){
        await recordFinancialAudit(tx,{actorId:actor,entity:'FinancialEvent',
          entityId:ctx.correctionTargetEventId as string,action:'FINANCIAL_EVENT_REVIEW_COUNTERENTRY_UNDONE',
          context:{workspaceId:ws.workspaceId,operationId:request.operationId,
            resolutionAuditId:input.resolutionAuditId,counterentryId:ctx.compensationEventId,
            inverseEventId,undoAuditId:audit.id}});
      }
      result={reviewStatus:'SUSPECTED',reversedResolutionAuditId:input.resolutionAuditId,
        inverseEventId,idempotentReplay:false};
    }
    await receipt(tx,ws.workspaceId,request.operationId,hash,mutationType,result);
    return result;
  },{maxAttempts:12,retryDelayMs:35});}
  catch(e){
    if(unique(e)){
      const saved=await prisma.cloudMutationReceipt.findUnique({where:{
        workspaceId_operationId:{workspaceId:ws.workspaceId,operationId:request.operationId}}});
      if(saved){
        if(saved.requestHash!==hash||saved.mutationType!==mutationType)fail('OPERATION_ID_REUSED');
        return {...(saved.response as Record<string,unknown>),idempotentReplay:true};
      }
    }
    throw e;
  }
}
export function resolveSuspectedFinancialEvent(actor:string,id:string,input:ResolveCommand){
  return execute(actor,id,input,false);
}
export function undoSuspectedFinancialEventResolution(actor:string,id:string,input:UndoCommand){
  return execute(actor,id,input,true);
}
export async function assertA17GenericMutationAllowed(tx:Tx,event:{
  id:string;sourcePayload:Prisma.JsonValue|null;
}){
  if(tagged(event.sourcePayload))fail('A17_COUNTERENTRY_IMMUTABLE');
  await guardSource(tx,event.id);
}
export async function reviewStatusForSuspicions(
  actor:string,pairs:Array<{eventId:string;peerId:string;groupId:string|null}>,
){
  const ws=await resolveWorkspaceContext(actor,{allowLegacyBootstrap:false});
  const anchors=[...new Set(pairs.filter(p=>p.groupId&&p.peerId)
    .map(p=>anchorOf(p.eventId,p.peerId)))];
  const rows=anchors.length?await prisma.auditLog.findMany({where:{
    entity:'FinancialEvent',entityId:{in:anchors},
    action:{in:['FINANCIAL_EVENT_SUSPICION_RESOLVED','FINANCIAL_EVENT_SUSPICION_REVERSED']}},
    select:{id:true,action:true,createdAt:true,metadata:true,entityId:true}}):[];
  const statuses=new Map<string,{reviewStatus:string;resolutionAuditId:string|null;reviewedAt:Date|null}>();
  for(const p of pairs){
    if(!p.groupId||!p.peerId)continue;
    const h=rows.filter(x=>x.entityId===anchorOf(p.eventId,p.peerId)
      &&parse(x.metadata).workspaceId===ws.workspaceId);
    const current=active(h,p.groupId).current;
    statuses.set(p.groupId,current?{reviewStatus:String(current.context.decision),
      resolutionAuditId:current.id,reviewedAt:current.createdAt}
      :{reviewStatus:'SUSPECTED',resolutionAuditId:null,reviewedAt:null});
  }
  return statuses;
}
