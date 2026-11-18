import { buildNormalizationPreview, normalizationFingerprint } from './normalization-migration-core';
import { isNormalizedPrimary } from './normalization-migration';
import { writeBackNormalizedEventsToAppState } from './normalized-primary-writeback';
import { Prisma } from '@meg/database';

type Tx = Prisma.TransactionClient;

/**
 * Completa a escrita de uma despesa monetaria no banco QA com o espelho Android
 * NA MESMA transacao que criou FinancialEvent. Se nao for reconciliavel, rollback.
 */
export async function mirrorNewMonetaryExpenseToLegacyQa(
  tx: Tx, workspaceId: string, ownerId: string, eventId: string, enteredAmount: number,
) {
  const state = await tx.appState.findUnique({
    where: { workspaceId },
    select: { revision: true, state: true },
  });
  if (!state || !isNormalizedPrimary(state.state)) throw new Error('STAGE10_QA_MIRROR_PRIMARY_REQUIRED');
  const base = state.state;
  if (!base || typeof base !== 'object' || Array.isArray(base)
    || !Array.isArray((base as Record<string,unknown>).transactions)) {
    throw new Error('STAGE10_QA_MIRROR_STATE_INVALID');
  }
  const existing = (base as Record<string,unknown>).transactions as unknown[];
  const event = await tx.financialEvent.findUnique({
    where: { id: eventId },
    include: { account: true, category: true, paymentMethod: true, ledgerEntries: true },
  });
  if (!event || event.workspaceId !== workspaceId || event.userId !== ownerId
      || event.legacyTransactionId || event.type !== 'expense'
      || !['paid','planned','reconciled'].includes(event.status)
      || !event.account || !['checking','savings','cash'].includes(event.account.type.toLowerCase())
      || !event.paymentMethod
      || event.paymentMethod.type === 'credit'
      || event.paymentMethod.name.trim().toUpperCase().includes('VEROCARD')) {
    throw new Error('STAGE10_QA_MIRROR_UNSUPPORTED_DOMAIN');
  }
  // Nao inferir classificacao de compras de credito, beneficios e outros dominios.
  const uppercase = String(event.paymentMethod.name).normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
  if (/CREDITO|CARTAO|VEROCARD/.test(uppercase)) {
    throw new Error('STAGE10_QA_MIRROR_UNSUPPORTED_DOMAIN');
  }
  const payload = {
    id:event.id,
    __megStage10QaSource:'web-monetary-create-v1',
    date:event.date.toISOString().slice(0,10),
    description:event.description,
    type:'expense',
    status:event.status === 'paid' ? 'paid' : event.status === 'reconciled' ? 'reconciled' : 'pending',
    situation:event.status === 'paid' ? 'PAGO' : event.status === 'reconciled' ? 'CONCILIADO' : 'PENDENTE',
    amount:enteredAmount,
    expenseAmount:Math.abs(enteredAmount),
    financialAccountId:event.accountId,
    category:event.category?.name || '',
    group:event.category?.group || '',
    paymentMethod:event.paymentMethod.name,
    notes:event.notes || '',
  };
  const proposedState = {...base,transactions:[...existing,payload]};
  const preview = buildNormalizationPreview(proposedState, {
    workspaceId,userId:ownerId,revision:state.revision+1,
  });
  if (preview.summary.invalidCount !== 0) throw new Error('STAGE10_QA_MIRROR_INVALID_PREVIEW');
  const projection = preview.events.find(x=>x.legacyTransactionId===event.id);
  if (!projection
    || projection.type !== event.type
    || projection.status !== event.status
    || projection.date.toISOString().slice(0,10)!==payload.date
    || Number(projection.signedAmount)!==Number(event.signedAmount)
    || Number(projection.amount)!==Number(event.amount)) {
    throw new Error('STAGE10_QA_MIRROR_FINANCIAL_MISMATCH');
  }

  // SourcePayload, identity and classification match the existing normalization
  // projection; category and payment foreign keys stay exactly as they were.
  await tx.financialEvent.update({
    where:{id:event.id},
    data:{
      legacyTransactionId:event.id,
      sourcePayload:payload as unknown as Prisma.InputJsonValue,
      sourceRevision:state.revision+1,
      amountBehavior:projection.amountBehavior,
      necessity:projection.necessity,
      frequency:projection.frequency,
      classificationConfidence:projection.classificationConfidence,
      classificationSource:projection.classificationSource,
    },
  });
  const forMirror=await tx.financialEvent.findUniqueOrThrow({
    where:{id:event.id},
    include:{account:true,category:true,paymentMethod:true,ledgerEntries:true},
  });
  const result=await writeBackNormalizedEventsToAppState(tx,workspaceId,[forMirror]);
  if (!result.active || !result.changed || result.revision!==state.revision+1) {
    throw new Error('STAGE10_QA_MIRROR_UNCONFIRMED');
  }
  const synced=await tx.appState.findUniqueOrThrow({where:{workspaceId},select:{state:true}});
  const finalPreview=buildNormalizationPreview(synced.state,{
    workspaceId,userId:ownerId,revision:result.revision,
  });
  const rows=await tx.financialEvent.findMany({
    where:{workspaceId,legacyTransactionId:{not:null},archivedAt:null},
    select:{
      legacyTransactionId:true,date:true,description:true,type:true,status:true,
      amount:true,signedAmount:true,notes:true,sourcePayload:true,
      amountBehavior:true,necessity:true,frequency:true,
      classificationConfidence:true,classificationSource:true,
    },
  });
  if (finalPreview.summary.invalidCount !== 0
    || finalPreview.summary.validCount !== rows.length
    || finalPreview.summary.fingerprint !== normalizationFingerprint(rows)) {
    throw new Error('STAGE10_QA_MIRROR_FINGERPRINT_DIVERGENCE');
  }
  return {legacyTransactionId:event.id,revision:result.revision};
}
