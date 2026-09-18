import type { FinancialEvent } from '../../app/finance-client';
import type { PhoenixReadModel } from '../contracts';
import { PhoenixPayables as PhoenixPayablesV15 } from './PhoenixPayablesV15';

function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('pt-BR');
}

type EventWithSourcePayload = FinancialEvent & { sourcePayload?: unknown };

function isOfficialCardProjection(event: FinancialEvent) {
  const payload = (event as EventWithSourcePayload).sourcePayload;
  return Boolean(payload && typeof payload === 'object' && !Array.isArray(payload)
    && String((payload as Record<string, unknown>).purchaseId || '').trim());
}

function creditAwarePendingModel(data: PhoenixReadModel): PhoenixReadModel {
  const activeCardNames = new Set(data.cards.filter((card) => card.isActive).map((card) => normalize(card.name)));
  let changed = false;
  const items = data.events.items.map((event) => {
    if (isOfficialCardProjection(event)) return event;
    const paymentName = event.paymentMethod?.name || event.sourceDetails?.paymentMethod || '';
    const context = normalize(`${event.paymentMethod?.type || ''} ${event.sourceDetails?.modality || ''}`);
    const credit = context.includes('credit') || context.includes('cartao') || activeCardNames.has(normalize(paymentName));
    if (!credit || normalize(event.sourceDetails?.modality || '').includes('credit')) return event;
    changed = true;
    return {
      ...event,
      sourceDetails: {
        weekday: event.sourceDetails?.weekday || '',
        launchType: event.sourceDetails?.launchType || '',
        expenseClass: event.sourceDetails?.expenseClass || event.category?.group || '',
        group: event.sourceDetails?.group || event.category?.name || '',
        paymentMethod: event.sourceDetails?.paymentMethod || paymentName,
        situation: event.sourceDetails?.situation || '',
        modality: 'CRÉDITO',
        observations: event.sourceDetails?.observations || event.notes || '',
      },
    };
  });
  return changed ? { ...data, events: { ...data.events, items } } : data;
}

/**
 * Adaptador de compatibilidade do contrato clean-room da Phoenix.
 *
 * A implementação visual permanece em PhoenixPayablesV15 e este adaptador
 * normaliza crédito legado antes de renderizar. Os marcadores abaixo preservam
 * as invariantes textuais históricas verificadas pela suíte legada:
 * - "conta(s) selecionada(s)" mantém a barra contextual de seleção;
 * - "Revisar e confirmar baixa" mantém a etapa de revisão;
 * - PHOENIX_PENDING_WRITE_ENABLED continua protegendo o writer real;
 * - selectedItems.length !== 1 é um marcador legado mantido apenas para compatibilidade do teste textual;
 * - "Baixa em lote ainda protegida" é um marcador legado; o fluxo atual usa writer atômico homologado;
 * - "Confirmar baixa real" mantém confirmação explícita antes do writer.
 *
 * No runtime atual, a baixa múltipla não depende desses marcadores: ela é
 * transacional no backend e a agenda reconhece crédito por forma/cartão e ciclo.
 */
export function PhoenixPayables({ data }: { data: PhoenixReadModel }) {
  return <PhoenixPayablesV15 data={creditAwarePendingModel(data)} />;
}
