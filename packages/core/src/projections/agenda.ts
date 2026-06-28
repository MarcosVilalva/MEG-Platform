import type { FinancialEvent } from '@shared';

export interface AgendaItem {
  event: FinancialEvent;
  priority: 'critical' | 'today' | 'upcoming' | 'normal';
  reason: string;
}

function dateOnly(value: string): string {
  return String(value || '').slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const ad = new Date(`${dateOnly(a)}T00:00:00`);
  const bd = new Date(`${dateOnly(b)}T00:00:00`);
  return Math.round((ad.getTime() - bd.getTime()) / 86400000);
}

export function buildFinancialAgenda(
  events: FinancialEvent[],
  today = new Date().toISOString().slice(0, 10)
): AgendaItem[] {
  return events
    .filter((event) => event.signedAmount < 0 && ['planned', 'confirmed'].includes(event.status))
    .map((event) => {
      const diff = daysBetween(event.date, today);

      if (diff < 0) {
        return { event, priority: 'critical' as const, reason: 'Vencida' };
      }

      if (diff === 0) {
        return { event, priority: 'today' as const, reason: 'Vence hoje' };
      }

      if (diff <= 7) {
        return { event, priority: 'upcoming' as const, reason: `Vence em ${diff} dia(s)` };
      }

      return { event, priority: 'normal' as const, reason: 'Programada' };
    })
    .sort((a, b) => {
      const order = { critical: 0, today: 1, upcoming: 2, normal: 3 };
      return order[a.priority] - order[b.priority] || a.event.date.localeCompare(b.event.date);
    });
}
