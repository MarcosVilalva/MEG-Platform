import type { FinancialEvent } from '@shared';
import { calendarDayDifference, dateInSaoPaulo } from '../time/calendar';

export interface AgendaItem {
  event: FinancialEvent;
  priority: 'critical' | 'today' | 'upcoming' | 'normal';
  reason: string;
}

function dateOnly(value: string): string {
  return String(value || '').slice(0, 10);
}

export function buildFinancialAgenda(
  events: FinancialEvent[],
  today = dateInSaoPaulo()
): AgendaItem[] {
  return events
    .filter((event) => event.signedAmount < 0 && ['planned', 'confirmed'].includes(event.status))
    .map((event) => {
      const diff = calendarDayDifference(today, dateOnly(event.date));

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
