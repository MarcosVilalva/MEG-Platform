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
  customerId?: string;
  description: string;
  totalAmount: number;
  dueDate: string;
  installmentNo?: number;
  installmentQty?: number;
  interestRate?: number;
  fineRate?: number;
  notes?: string;
  operationId?: string;
};

export type ReceiveReceivableInput = {
  amount: number;
  receivedAt: string;
  interestAmount?: number;
  fineAmount?: number;
  accountId?: string;
  paymentMethodId?: string;
  notes?: string;
  operationId?: string;
};

export const receivablesClient = {
  listCustomers: () => request<Customer[]>('/receivables/customers'),
  createCustomer: (data: Partial<Customer>) => request<Customer>('/receivables/customers', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
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
