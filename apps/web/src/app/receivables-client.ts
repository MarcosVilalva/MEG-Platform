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
  notes?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Receipt = {
  id: string;
  amount: string | number;
  receivedAt: string;
  interestAmount: string | number;
  fineAmount: string | number;
  financialEventId?: string | null;
  remaining?: number;
  receivableStatus?: string;
  idempotentReplay?: boolean;
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
  idempotentReplay?: boolean;
};

export type CreateReceivableInput = {
  customerId?: string | null;
  description: string;
  totalAmount: number;
  dueDate: string;
  installmentNo?: number;
  installmentQty?: number;
  interestRate?: number;
  fineRate?: number;
  notes?: string | null;
  operationId?: string;
};

export type ReceiveReceivableInput = {
  amount: number;
  receivedAt: string;
  interestAmount?: number;
  fineAmount?: number;
  accountId?: string | null;
  paymentMethodId?: string | null;
  notes?: string | null;
  operationId?: string;
};

export const receivablesClient = {
  listCustomers: () => request<Customer[]>('/receivables/customers'),
  createCustomer: (data: Pick<Customer, 'name'> & Partial<Pick<Customer, 'email' | 'phone' | 'document' | 'notes'>>) => request<Customer>('/receivables/customers', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateCustomer: (id: string, data: Partial<Pick<Customer, 'name' | 'email' | 'phone' | 'document' | 'notes' | 'isActive'>>) => request<Customer>(`/receivables/customers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  deactivateCustomer: (id: string) => request<Customer>(`/receivables/customers/${id}`, { method: 'DELETE' }),
  listReceivables: () => request<Receivable[]>('/receivables/receivables'),
  createReceivable: (data: CreateReceivableInput) => request<Receivable>('/receivables/receivables', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  receive: (id: string, data: ReceiveReceivableInput) => request<Receipt>(`/receivables/receivables/${id}/receipts`, {
    method: 'POST',
    body: JSON.stringify(data)
  })
};
