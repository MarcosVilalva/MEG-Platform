import { authenticatedRequest } from './auth-client';
export type Payable = { id: string; description: string; totalAmount: string | number; openAmount: string | number; dueDate: string; status: string; installmentNo: number; installmentQty: number; category?: { id: string; name: string; group?: string | null } | null; payments: Array<{ id: string; amount: string | number; paidAt: string }> };
async function request<T>(path: string, init?: RequestInit): Promise<T> { return authenticatedRequest<T>(path, init); }
export const payablesClient = {
  list: (month: string) => request<Payable[]>(`/payables?month=${encodeURIComponent(month)}`),
  create: (data: { categoryId?: string; description: string; totalAmount: number; dueDate: string; installmentQty: number; notes?: string }) => request<{ created: number }>('/payables', { method: 'POST', body: JSON.stringify(data) }),
  createRecurring: (data: { categoryId?: string; description: string; amount: number; frequency: 'weekly' | 'monthly' | 'yearly'; nextDueDate: string; endDate?: string; occurrenceCount?: number; notes?: string }) => request('/payables/recurring', { method: 'POST', body: JSON.stringify(data) }),
  pay: (id: string, data: { amount: number; paidAt: string; interestAmount?: number; fineAmount?: number; accountId?: string; paymentMethodId?: string; notes?: string; operationId?: string }) => request(`/payables/${id}/payments`, { method: 'POST', body: JSON.stringify(data) }),
  cancel: async (id: string) => {
    if (!window.confirm('Tem certeza de que deseja cancelar e excluir esta conta?\n\nEsta acao nao pode ser desfeita.')) return null;
    return request(`/payables/${id}`, { method: 'DELETE' });
  }
};
