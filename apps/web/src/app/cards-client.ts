import { readSession } from './auth-client';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

export type CardInstallment = { id: string; number: number; amount: string | number; statementMonth: string; status: string; paidAt?: string | null };
export type CardPurchase = { id: string; description: string; totalAmount: string | number; purchaseDate: string; installments: number; status: string; category?: { id: string; name: string } | null; entries: CardInstallment[] };
export type CreditCard = { id: string; name: string; issuer?: string | null; brand?: string | null; lastFour?: string | null; creditLimit: string | number; closingDay: number; dueDay: number; color?: string | null; isActive: boolean; usedLimit: number; availableLimit: number; statementAmount: number; purchases: CardPurchase[] };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const response = await fetch(`${API_URL}${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.accessToken}`, ...(init?.headers || {}) } });
  if (!response.ok) { const payload = await response.json().catch(() => ({})); throw new Error(payload.error || `HTTP_${response.status}`); }
  return response.json() as Promise<T>;
}

export const cardsClient = {
  list: (month: string) => request<CreditCard[]>(`/cards?month=${encodeURIComponent(month)}`),
  create: (data: { name: string; issuer?: string; brand?: string; lastFour?: string; creditLimit: number; closingDay: number; dueDay: number; color?: string }) => request<CreditCard>('/cards', { method: 'POST', body: JSON.stringify(data) }),
  createPurchase: (data: { cardId: string; categoryId?: string; description: string; totalAmount: number; purchaseDate: string; installments: number }) => request<CardPurchase>('/cards/purchases', { method: 'POST', body: JSON.stringify(data) }),
  cancelPurchase: (id: string) => request<CardPurchase>(`/cards/purchases/${id}`, { method: 'DELETE' }),
  payStatement: (id: string, month: string, data: { accountId?: string; paymentMethodId?: string; paidAt: string }) => request<{ paid: boolean; amount: number; eventId: string }>(`/cards/${id}/statements/${month}/pay`, { method: 'POST', body: JSON.stringify(data) }),
  deactivate: (id: string) => request<CreditCard>(`/cards/${id}`, { method: 'DELETE' })
};