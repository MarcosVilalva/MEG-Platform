import { financialAmountValues } from './amount-sign';

export type TransferStatus = 'draft' | 'planned' | 'confirmed' | 'paid' | 'reconciled';
export type TransferLeg = 'source' | 'destination';

export type TransferInput = {
  transferId: string;
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
  date: string;
  competence?: string;
  description?: string;
  status?: TransferStatus;
  notes?: string;
};

export type TransferLegDraft = {
  transferId: string;
  leg: TransferLeg;
  counterpartyAccountId: string;
  accountId: string;
  description: string;
  type: 'transfer';
  status: TransferStatus;
  date: string;
  competence: string;
  amount: number;
  signedAmount: number;
  notes?: string;
  sourcePayload: {
    transferId: string;
    transferLeg: TransferLeg;
    counterpartyAccountId: string;
  };
};

function cents(value: number) {
  return Math.round(value * 100);
}

function assertIsoDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) throw new Error('INVALID_TRANSFER_DATE');
}

export function buildTransferLegs(input: TransferInput): [TransferLegDraft, TransferLegDraft] {
  const transferId = input.transferId.trim();
  const sourceAccountId = input.sourceAccountId.trim();
  const destinationAccountId = input.destinationAccountId.trim();
  const enteredAmount = Number(input.amount);

  if (transferId.length < 8) throw new Error('INVALID_TRANSFER_ID');
  if (!sourceAccountId || !destinationAccountId) throw new Error('TRANSFER_ACCOUNT_REQUIRED');
  if (sourceAccountId === destinationAccountId) throw new Error('TRANSFER_ACCOUNTS_MUST_DIFFER');
  if (!Number.isFinite(enteredAmount) || cents(enteredAmount) <= 0) throw new Error('INVALID_TRANSFER_AMOUNT');
  assertIsoDay(input.date);

  const amount = cents(enteredAmount) / 100;
  const sourceValues = financialAmountValues('transfer', amount);
  const destinationValues = financialAmountValues('transfer', -amount);
  const competence = input.competence || input.date.slice(0, 7);
  const status = input.status || 'planned';
  const description = input.description?.trim() || 'Transferência entre contas';
  const notes = input.notes?.trim() || undefined;

  const source: TransferLegDraft = {
    transferId,
    leg: 'source',
    counterpartyAccountId: destinationAccountId,
    accountId: sourceAccountId,
    description,
    type: 'transfer',
    status,
    date: input.date,
    competence,
    amount: sourceValues.amount,
    signedAmount: sourceValues.signedAmount,
    notes,
    sourcePayload: {
      transferId,
      transferLeg: 'source',
      counterpartyAccountId: destinationAccountId,
    },
  };

  const destination: TransferLegDraft = {
    transferId,
    leg: 'destination',
    counterpartyAccountId: sourceAccountId,
    accountId: destinationAccountId,
    description,
    type: 'transfer',
    status,
    date: input.date,
    competence,
    amount: destinationValues.amount,
    signedAmount: destinationValues.signedAmount,
    notes,
    sourcePayload: {
      transferId,
      transferLeg: 'destination',
      counterpartyAccountId: sourceAccountId,
    },
  };

  if (cents(source.signedAmount + destination.signedAmount) !== 0) {
    throw new Error('TRANSFER_NOT_CONSERVATIVE');
  }

  return [source, destination];
}
