import type { FinancialEventStatus } from '@shared';

export const lifecycleOrder: FinancialEventStatus[] = [
  'draft',
  'planned',
  'confirmed',
  'paid',
  'reconciled',
  'archived'
];

export function canMoveTo(current: FinancialEventStatus, next: FinancialEventStatus): boolean {
  const currentIndex = lifecycleOrder.indexOf(current);
  const nextIndex = lifecycleOrder.indexOf(next);

  if (currentIndex === -1 || nextIndex === -1) return false;
  return nextIndex === currentIndex + 1 || next === 'archived';
}

export function statusLabel(status: FinancialEventStatus): string {
  return {
    draft: 'Rascunho',
    planned: 'Previsto',
    confirmed: 'Confirmado',
    paid: 'Pago',
    reconciled: 'Conciliado',
    archived: 'Arquivado'
  }[status];
}
