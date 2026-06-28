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

export interface FinancialEvent {
  id: string;
  type: FinancialEventType;
  status: FinancialEventStatus;
  date: string;
  competence: string;
  description: string;
  amount: number;
  signedAmount: number;
  account?: string;
  paymentMethod?: string;
  group?: string;
  category?: string;
  tags?: string[];
  notes?: string;
}

export interface MonthProjection {
  month: string;
  openingBalance: number;
  income: number;
  expense: number;
  closingBalance: number;
  eventCount: number;
}
