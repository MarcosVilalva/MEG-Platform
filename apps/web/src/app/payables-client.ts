import { readSession } from './auth-client';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';
export type Payable = { id: string; description: string; totalAmount: string | number; openAmount: string | number; dueDate: string; status: string; installmentNo: number; installmentQty: number; category?: { id: string; name: string; group?: string | null } | null; payments: Array<{ id: string; amount: string | number; paidAt: string }> };
async function request<T>(path: string, init?: RequestInit): Promise<T> { const session = readSession(); if (!session) throw new Error('UNAUTHORIZED'); const response = await fetch(`${API_URL}${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.accessToken}`, ...(init?.headers || {}) } }); if (!response.ok) { const payload = await response.json().catch(() => ({})); throw new Error(payload.error || `HTTP_${response.status}`); } return response.json() as Promise<T>; }
export const payablesClient = {
  list: (month: string) => request<Payable[]>(`/payables?month=${encodeURIComponent(month)}`),
  create: (data: { categoryId?: string; description: string; totalAmount: number; dueDate: string; installmentQty: number; notes?: string }) => request<{ created: number }>('/payables', { method: 'POST', body: JSON.stringify(data) }),
  createRecurring: (data: { categoryId?: string; description: string; amount: number; frequency: 'weekly' | 'monthly' | 'yearly'; nextDueDate: string; endDate?: string }) => request('/payables/recurring', { method: 'POST', body: JSON.stringify(data) }),
  pay: (id: string, data: { amount: number; paidAt: string; accountId?: string; paymentMethodId?: string }) => request(`/payables/${id}/payments`, { method: 'POST', body: JSON.stringify(data) }),
  cancel: async (id: string) => {
    if (!window.confirm('Tem certeza de que deseja cancelar e excluir esta conta?\n\nEsta acao nao pode ser desfeita.')) return null;
    return request(`/payables/${id}`, { method: 'DELETE' });
  }
};
