const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

export interface ApiFinancialEvent {
  id: string;
  description: string;
  type: string;
  status: string;
  date: string;
  competence: string;
  amount: string | number;
  signedAmount: string | number;
  notes?: string | null;
  account?: { id: string; name: string } | null;
  category?: { id: string; name: string; group?: string | null } | null;
  paymentMethod?: { id: string; name: string } | null;
}

export async function apiGetFinancialEvents(): Promise<ApiFinancialEvent[]> {
  const response = await fetch(`${API_URL}/finance/events`);
  if (!response.ok) throw new Error('Erro ao buscar eventos financeiros.');
  return response.json();
}

export function apiEventToLegacy(event: ApiFinancialEvent) {
  return {
    id: event.id,
    type: event.type,
    status: event.status,
    date: String(event.date).slice(0, 10),
    description: event.description,
    amount: Number(event.amount),
    account: event.account?.name || 'Conta',
    group: event.category?.group || event.category?.name || 'Não informado',
    category: event.category?.name || '',
    paymentMethod: event.paymentMethod?.name || 'Não informado',
    notes: event.notes || ''
  };
}
