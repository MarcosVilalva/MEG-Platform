import { authenticatedRequest } from './auth-client';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  return authenticatedRequest<T>(path, init);
}

export type Customer = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  document?: string | null;
  isActive: boolean;
};

export type Receipt = {
  id: string;
  amount: string | number;
  receivedAt: string;
  interestAmount: string | number;
  fineAmount: string | number;
};

export type Receivable = {
  id: string;
  description: string;
  totalAmount: string | number;
  openAmount: string | number;
  dueDate: string;
  status: 'open' | 'partial' | 'paid' | 'overdue';
  installmentNo: number;
  installmentQty: number;
  customer?: Customer | null;
  receipts: Receipt[];
};

export const receivablesClient = {
  listCustomers: () => request<Customer[]>('/receivables/customers'),
  createCustomer: (data: Partial<Customer>) => request<Customer>('/receivables/customers', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  listReceivables: () => request<Receivable[]>('/receivables/receivables'),
  createReceivable: (data: Record<string, unknown>) => request<Receivable>('/receivables/receivables', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  receive: (id: string, data: Record<string, unknown>) => request<Receipt>(`/receivables/receivables/${id}/receipts`, {
    method: 'POST',
    body: JSON.stringify(data)
  })
};
