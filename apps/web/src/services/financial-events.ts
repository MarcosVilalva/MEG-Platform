import { apiGet } from './api';

export interface ApiFinancialEvent {
  id: string;
  description: string;
  type: string;
  status: string;
  date: string;
  competence: string;
  amount: string | number;
  signedAmount: string | number;
  account?: { name: string } | null;
  category?: { name: string; group?: string | null } | null;
  paymentMethod?: { name: string } | null;
}

export async function getFinancialEvents() {
  return apiGet<ApiFinancialEvent[]>('/finance/events');
}

export function toLegacyTransaction(event: ApiFinancialEvent) {
  return {
    id: event.id,
    type: event.type,
    status: event.status,
    date: event.date.slice(0, 10),
    description: event.description,
    amount: Number(event.amount),
    account: event.account?.name || 'Conta',
    group: event.category?.group || event.category?.name || 'Não informado',
    category: event.category?.name || '',
    paymentMethod: event.paymentMethod?.name || 'Não informado'
  };
}
