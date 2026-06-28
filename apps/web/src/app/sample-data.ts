import type { LegacyTransaction } from '@core/finance/events';

export const sampleTransactions: LegacyTransaction[] = [
  {
    id: '1',
    type: 'income',
    date: '2026-06-05',
    description: 'Receita principal',
    amount: 9000,
    account: 'Santander',
    paymentMethod: 'Transferência',
    status: 'paid',
    group: 'Renda'
  },
  {
    id: '2',
    type: 'expense',
    date: '2026-06-07',
    description: 'Mercado Rede Pas',
    amount: 486.7,
    account: 'Santander',
    paymentMethod: 'PIX',
    status: 'paid',
    group: 'Alimentação',
    category: 'Supermercado'
  },
  {
    id: '3',
    type: 'expense',
    date: '2026-06-12',
    description: 'Fatura Verocard',
    amount: 1820.45,
    account: 'Santander',
    paymentMethod: 'Cartão de crédito',
    status: 'planned',
    group: 'Cartão',
    category: 'Fatura'
  },
  {
    id: '4',
    type: 'expense',
    date: '2026-06-18',
    description: 'Energia elétrica',
    amount: 214.9,
    account: 'Santander',
    paymentMethod: 'Boleto',
    status: 'planned',
    group: 'Moradia',
    category: 'Energia'
  },
  {
    id: '5',
    type: 'expense',
    date: '2026-05-20',
    description: 'Despesa mês anterior',
    amount: 1200,
    account: 'Santander',
    paymentMethod: 'PIX',
    status: 'paid',
    group: 'Base'
  }
];
