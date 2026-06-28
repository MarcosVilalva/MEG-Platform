export interface LedgerEntryProps {
  id?: string;
  eventId: string;
  date: string;
  accountId: string;
  debit: number;
  credit: number;
  memo?: string;
}

export class LedgerEntry {
  constructor(public readonly props: LedgerEntryProps) {
    if (!props.eventId) throw new Error('Evento obrigatório.');
    if (!props.accountId) throw new Error('Conta obrigatória.');

    if (props.debit < 0 || props.credit < 0) {
      throw new Error('Débito e crédito não podem ser negativos.');
    }

    if (props.debit > 0 && props.credit > 0) {
      throw new Error('Uma partida não pode ter débito e crédito ao mesmo tempo.');
    }
  }
}
