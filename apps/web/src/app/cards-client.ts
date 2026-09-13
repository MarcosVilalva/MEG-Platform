import { authenticatedRequest } from './auth-client';

export type CardInstallment = { id: string; number: number; amount: string | number; statementMonth: string; status: string; paidAt?: string | null };
export type CardPurchase = { id: string; description: string; totalAmount: string | number; purchaseDate: string; installments: number; status: string; category?: { id: string; name: string } | null; entries: CardInstallment[]; legacyOpen?: boolean; idempotentReplay?: boolean };
export type CreditCard = { id: string; name: string; issuer?: string | null; brand?: string | null; lastFour?: string | null; creditLimit: string | number; closingDay: number; dueDay: number; color?: string | null; isActive: boolean; usedLimit: number; availableLimit: number; statementAmount: number; payableStatementAmount?: number; purchases: CardPurchase[] };
export type CardStatementPaymentResult = { paid: boolean; amount: number; eventId: string; protection?: { monetary?: boolean; allowed?: boolean; available?: number; requested?: number; missing?: number; at?: string }; idempotentReplay?: boolean };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  return authenticatedRequest<T>(path, init);
}

export const cardsClient = {
  list: (month: string) => request<CreditCard[]>(`/cards?month=${encodeURIComponent(month)}`),
  create: (data: { name: string; issuer?: string; brand?: string; lastFour?: string; creditLimit: number; closingDay: number; dueDay: number; color?: string }) => request<CreditCard>('/cards', { method: 'POST', body: JSON.stringify(data) }),
  createPurchase: (data: { cardId: string; categoryId?: string; description: string; totalAmount: number; purchaseDate: string; installments: number; operationId?: string }) => request<CardPurchase>('/cards/purchases', { method: 'POST', body: JSON.stringify(data) }),
  cancelPurchase: async (id: string) => {
    if (id.startsWith('legacy-')) return null;
    if (!window.confirm('Tem certeza de que deseja excluir esta compra do cartao?\n\nEsta acao nao pode ser desfeita.')) return null;
    return request<CardPurchase>(`/cards/purchases/${id}`, { method: 'DELETE' });
  },
  payStatement: (id: string, month: string, data: { accountId?: string; paymentMethodId?: string; paidAt: string; operationId?: string }) => request<CardStatementPaymentResult>(`/cards/${id}/statements/${month}/pay`, { method: 'POST', body: JSON.stringify(data) }),
  deactivate: (id: string) => request<CreditCard>(`/cards/${id}`, { method: 'DELETE' })
};
