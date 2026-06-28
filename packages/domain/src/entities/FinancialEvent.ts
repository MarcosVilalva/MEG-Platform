import { Money } from '../value-objects/Money';
import { Competence } from '../value-objects/Competence';

export type FinancialEventType =
  | 'income'
  | 'expense'
  | 'transfer'
  | 'investment'
  | 'redemption'
  | 'adjustment';

export type FinancialEventStatus =
  | 'draft'
  | 'planned'
  | 'confirmed'
  | 'paid'
  | 'reconciled'
  | 'archived';

export interface FinancialEventProps {
  id?: string;
  description: string;
  type: FinancialEventType;
  status: FinancialEventStatus;
  date: string;
  amount: number;
  accountId?: string;
  categoryId?: string;
  paymentMethodId?: string;
  notes?: string;
}

export class FinancialEvent {
  constructor(public readonly props: FinancialEventProps) {
    if (!props.description.trim()) {
      throw new Error('Descrição obrigatória.');
    }

    if (props.amount <= 0) {
      throw new Error('Valor deve ser maior que zero.');
    }
  }

  get competence() {
    return Competence.fromDate(this.props.date).value;
  }

  get amount() {
    return Money.of(this.props.amount);
  }

  get signedAmount() {
    const amount = this.amount;

    if (this.props.type === 'income' || this.props.type === 'redemption') {
      return amount.positive().value;
    }

    if (this.props.type === 'adjustment') {
      return amount.value;
    }

    return amount.negative().value;
  }

  get isOpen() {
    return ['draft', 'planned', 'confirmed'].includes(this.props.status);
  }

  get isSettled() {
    return ['paid', 'reconciled'].includes(this.props.status);
  }
}
