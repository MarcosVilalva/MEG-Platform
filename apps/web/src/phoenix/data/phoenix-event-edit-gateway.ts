import { financeClient as mutableFinanceClient, type FinancialEvent, type FinancialEventInput } from '../../app/finance-client';

/**
 * Gateway local da Phoenix para edição simples de lançamentos.
 * A tela Phoenix não acessa clientes mutáveis diretamente: somente este adaptador
 * conhece o financeClient legado enquanto o writer específico de edição não é
 * promovido para um contrato próprio da Phoenix.
 */
export type { FinancialEvent };

export const financeClient = {
  updateEvent: (id: string, data: Partial<FinancialEventInput>) => mutableFinanceClient.updateEvent(id, data),
};
