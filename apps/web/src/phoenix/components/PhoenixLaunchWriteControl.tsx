import { useEffect, useMemo, useRef, useState } from 'react';
import type { FinancialEvent } from '../../app/finance-client';
import type { PhoenixReadModel } from '../contracts';
import {
  getPhoenixCardPurchaseEligibility,
  getPhoenixRuntimeWriteCapabilities,
  getPhoenixSimpleEventEligibility,
  phoenixWriteMessage,
  preparePhoenixCardPurchase,
  preparePhoenixSimpleEvent,
  runPhoenixCardPurchaseWrite,
  runPhoenixSimpleEventWrite,
  type PhoenixCardPurchaseInput,
  type PhoenixSimpleEventFlow,
  type PhoenixSimpleEventInput,
  type PreparedPhoenixCardPurchase,
  type PreparedPhoenixSimpleEvent,
} from '../data/phoenix-write-gateway';
import '../phoenix-launch-write.css';

type RuntimeState = 'idle' | 'checking' | 'enabled' | 'disabled';
type CommitState = 'idle' | 'saving' | 'confirmed' | 'error';
type EventWithSourcePayload = FinancialEvent & { sourcePayload?: unknown };

function projectedCardEvent(snapshot: PhoenixReadModel, purchaseId: string) {
  return snapshot.events.items.find((event) => {
    const payload = (event as EventWithSourcePayload).sourcePayload;
    return Boolean(payload && typeof payload === 'object' && !Array.isArray(payload)
      && String((payload as Record<string, unknown>).purchaseId || '') === purchaseId);
  });
}

export function PhoenixLaunchWriteControl({
  reviewed,
  missing,
  input,
  cardInput,
  flow,
  refreshMonth,
  duplicateMessage,
  onReview,
  onCommitted,
}: {
  reviewed: boolean;
  missing: string[];
  input: PhoenixSimpleEventInput | null;
  cardInput?: PhoenixCardPurchaseInput | null;
  flow: PhoenixSimpleEventFlow;
  refreshMonth?: string;
  duplicateMessage?: string | null;
  onReview: () => void;
  onCommitted?: (snapshot: PhoenixReadModel, event?: FinancialEvent) => void;
}) {
  const [runtimeState, setRuntimeState] = useState<RuntimeState>('idle');
  const [runtimeMessage, setRuntimeMessage] = useState('');
  const [commitState, setCommitState] = useState<CommitState>('idle');
  const [commitMessage, setCommitMessage] = useState('');
  const [duplicateAccepted, setDuplicateAccepted] = useState(false);
  const preparedRef = useRef<PreparedPhoenixSimpleEvent | null>(null);
  const preparedCardRef = useRef<PreparedPhoenixCardPurchase | null>(null);
  const cardFlow = Boolean(flow.credit);

  const eligibility = useMemo(() => cardFlow
    ? getPhoenixCardPurchaseEligibility(flow)
    : getPhoenixSimpleEventEligibility(flow), [
    cardFlow,
    flow.type,
    flow.negative,
    flow.benefit,
    flow.credit,
    flow.crediario,
    flow.recurring,
    flow.saveTemplate,
    flow.installments,
    flow.manualDue,
  ]);
  const inputKey = useMemo(() => JSON.stringify({ input: input || null, cardInput: cardInput || null, cardFlow }), [input, cardInput, cardFlow]);

  useEffect(() => {
    preparedRef.current = null;
    preparedCardRef.current = null;
    setCommitState('idle');
    setCommitMessage('');
    setDuplicateAccepted(false);
  }, [inputKey, reviewed]);

  useEffect(() => {
    const hasInput = cardFlow ? Boolean(cardInput) : Boolean(input);
    if (!reviewed || !eligibility.eligible || !hasInput) {
      setRuntimeState('idle');
      setRuntimeMessage('');
      return;
    }
    let active = true;
    setRuntimeState('checking');
    setRuntimeMessage(cardFlow
      ? 'Verificando se este ambiente permite gravar compras no cartão…'
      : 'Verificando se este ambiente permite gravação financeira…');
    void getPhoenixRuntimeWriteCapabilities(true).then((capabilities) => {
      if (!active) return;
      const enabled = cardFlow ? capabilities.cardPurchaseWrite : capabilities.simpleEvent;
      if (enabled) {
        setRuntimeState('enabled');
        setRuntimeMessage(cardFlow
          ? 'Writer de cartão liberado. A compra será criada no domínio de cartões, parcelada pela API e relida no snapshot antes de aparecer no sistema.'
          : 'Gravação simples liberada pelo ambiente. A confirmação será enviada uma única vez com proteção de reenvio.');
      } else {
        setRuntimeState('disabled');
        setRuntimeMessage(cardFlow
          ? 'Este ambiente mantém a gravação de cartão protegida. A revisão pode ser validada sem alterar a base.'
          : 'Este ambiente permanece protegido contra gravação financeira. A revisão pode ser validada sem alterar a base.');
      }
    });
    return () => { active = false; };
  }, [reviewed, eligibility.eligible, inputKey, cardFlow, cardInput, input]);

  async function confirmLaunch() {
    if (!eligibility.eligible || runtimeState !== 'enabled' || commitState === 'saving') return;
    if (cardFlow ? !cardInput : !input) return;
    if (duplicateMessage && !duplicateAccepted) return;

    setCommitState('saving');
    setCommitMessage(cardFlow
      ? 'Gravando a compra no cartão e aguardando a releitura sincronizada das faturas…'
      : 'Enviando ao MEG e aguardando confirmação da leitura atualizada…');
    try {
      if (cardFlow) {
        const prepared = preparedCardRef.current || preparePhoenixCardPurchase(cardInput!);
        preparedCardRef.current = prepared;
        const result = await runPhoenixCardPurchaseWrite(prepared, refreshMonth || cardInput!.purchaseDate.slice(0, 7));
        if (result.status === 'confirmed') {
          preparedCardRef.current = null;
          setCommitState('confirmed');
          setCommitMessage('Compra confirmada no cartão. Parcelas e fatura foram relidas da base antes da atualização da tela.');
          onCommitted?.(result.snapshot, projectedCardEvent(result.snapshot, result.purchase.id));
          return;
        }
        setCommitState('error');
        setCommitMessage(result.status === 'error' ? result.message : 'Não foi possível confirmar a compra no cartão. Tente novamente sem alterar os dados.');
        return;
      }

      const prepared = preparedRef.current || preparePhoenixSimpleEvent(input!);
      preparedRef.current = prepared;
      const result = await runPhoenixSimpleEventWrite(prepared, refreshMonth || input!.date.slice(0, 7));
      if (result.status === 'confirmed') {
        preparedRef.current = null;
        setCommitState('confirmed');
        setCommitMessage('Lançamento confirmado no servidor e relido na base financeira.');
        onCommitted?.(result.snapshot, result.event);
        return;
      }
      setCommitState('error');
      setCommitMessage(result.status === 'error' ? result.message : 'Não foi possível confirmar o lançamento. Tente novamente sem alterar os dados.');
    } catch (error) {
      const code = error instanceof Error ? error.message : 'PHOENIX_WRITE_FAILED';
      setCommitState('error');
      setCommitMessage(phoenixWriteMessage(code));
    }
  }

  if (!reviewed) {
    return <button className="px-primary-action px-review-launch" type="button" disabled={missing.length > 0} onClick={onReview}>
      {missing.length ? 'Revisar campos obrigatórios' : 'Revisar lançamento'}
    </button>;
  }

  if (!eligibility.eligible) {
    const reason = eligibility.reasons[0] || 'PHOENIX_WRITE_NOT_ENABLED';
    return <div className="px-launch-write-panel is-protected" role="status">
      <div><strong>Revisão concluída.</strong><span>{phoenixWriteMessage(reason)}</span></div>
      <button className="px-primary-action" type="button" disabled>Confirmação ainda protegida</button>
    </div>;
  }

  return <div className={`px-launch-write-panel ${commitState === 'confirmed' ? 'is-confirmed' : commitState === 'error' ? 'is-error' : ''}`} aria-live="polite">
    <div className="px-launch-write-status">
      <strong>{commitState === 'confirmed' ? (cardFlow ? 'Compra no cartão confirmada' : 'Lançamento confirmado') : 'Revisão concluída'}</strong>
      <span>{commitMessage || runtimeMessage || 'Aguardando verificação do ambiente.'}</span>
    </div>

    {duplicateMessage && commitState !== 'confirmed' ? <label className="px-launch-duplicate-confirm">
      <input type="checkbox" checked={duplicateAccepted} onChange={(event) => setDuplicateAccepted(event.target.checked)} />
      <span><strong>Confirmar possível duplicidade</strong><small>{duplicateMessage}</small></span>
    </label> : null}

    <button
      className="px-primary-action px-confirm-launch"
      type="button"
      disabled={runtimeState !== 'enabled' || commitState === 'saving' || commitState === 'confirmed' || Boolean(duplicateMessage && !duplicateAccepted)}
      onClick={() => { void confirmLaunch(); }}
      aria-busy={commitState === 'saving'}
    >
      {commitState === 'saving'
        ? cardFlow ? 'Gravando compra no cartão…' : 'Confirmando lançamento…'
        : commitState === 'confirmed'
          ? 'Confirmado e sincronizado'
          : runtimeState === 'checking'
            ? 'Verificando ambiente…'
            : runtimeState === 'disabled'
              ? 'Gravação protegida neste ambiente'
              : cardFlow ? 'Confirmar compra no cartão' : 'Confirmar lançamento'}
    </button>
  </div>;
}
