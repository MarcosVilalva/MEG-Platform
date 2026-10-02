import { useEffect, useMemo, useRef, useState } from 'react';
import type { FinancialEvent } from '../../app/finance-client';
import type { PhoenixReadModel } from '../../phoenix/contracts';
import {
  getPhoenixBenefitEventEligibility,
  getPhoenixCardPurchaseEligibility,
  getPhoenixRuntimeWriteCapabilities,
  getPhoenixSimpleEventEligibility,
  getPhoenixTransferEligibility,
  phoenixWriteMessage,
  preparePhoenixBenefitEvent,
  preparePhoenixCardPurchase,
  preparePhoenixSimpleEvent,
  runPhoenixBenefitEventWrite,
  runPhoenixCardPurchaseWrite,
  runPhoenixSimpleEventWrite,
  type PhoenixBenefitEventInput,
  type PhoenixCardPurchaseInput,
  type PhoenixSimpleEventFlow,
  type PhoenixSimpleEventInput,
  type PreparedPhoenixBenefitEvent,
  type PreparedPhoenixCardPurchase,
  type PreparedPhoenixSimpleEvent,
} from '../../phoenix/data/phoenix-write-gateway';
import {
  phoenixTransferWriteMessage,
  preparePhoenixTransfer,
  runPhoenixTransferWrite,
  type PhoenixTransferInput,
  type PreparedPhoenixTransfer,
} from '../../phoenix/data/phoenix-transfer-write-gateway';

type RuntimeState = 'idle' | 'checking' | 'enabled' | 'disabled';
type CommitState = 'idle' | 'saving' | 'accepted' | 'confirmed' | 'error';

type WebNextLaunchWriteControlProps = {
  reviewed: boolean;
  missing: string[];
  input: PhoenixSimpleEventInput | null;
  cardInput?: PhoenixCardPurchaseInput | null;
  transferInput?: PhoenixTransferInput | null;
  flow: PhoenixSimpleEventFlow;
  refreshMonth: string;
  duplicateMessage?: string | null;
  onReview: () => void;
  onBusyChange?: (busy: boolean) => void;
  onAccepted?: () => void;
  onCommitted?: (snapshot: PhoenixReadModel, event?: FinancialEvent) => void;
};

function projectedCardEvent(snapshot: PhoenixReadModel, purchaseId: string) {
  return snapshot.events.items.find((event) => {
    const payload = event.sourcePayload;
    return Boolean(payload && typeof payload === 'object'
      && String(payload.purchaseId || '') === purchaseId);
  });
}

export function WebNextLaunchWriteControl({
  reviewed,
  missing,
  input,
  cardInput,
  transferInput,
  flow,
  refreshMonth,
  duplicateMessage,
  onReview,
  onBusyChange,
  onAccepted,
  onCommitted,
}: WebNextLaunchWriteControlProps) {
  const [runtimeState, setRuntimeState] = useState<RuntimeState>('idle');
  const [runtimeMessage, setRuntimeMessage] = useState('');
  const [commitState, setCommitState] = useState<CommitState>('idle');
  const [commitMessage, setCommitMessage] = useState('');
  const [serverDuplicate, setServerDuplicate] = useState('');
  const [duplicateAccepted, setDuplicateAccepted] = useState(false);

  const simplePrepared = useRef<PreparedPhoenixSimpleEvent | null>(null);
  const benefitPrepared = useRef<PreparedPhoenixBenefitEvent | null>(null);
  const cardPrepared = useRef<PreparedPhoenixCardPurchase | null>(null);
  const transferPrepared = useRef<PreparedPhoenixTransfer | null>(null);

  const transferFlow = flow.type === 'transfer';
  const benefitFlow = Boolean(flow.benefit && !transferFlow);
  const cardFlow = Boolean(flow.credit && !benefitFlow && !transferFlow);
  const benefitInput = useMemo<PhoenixBenefitEventInput | null>(() => {
    if (!benefitFlow || !input || input.status !== 'paid') return null;
    return { ...input, status: 'paid' };
  }, [benefitFlow, input]);

  const eligibility = useMemo(() => transferFlow
    ? getPhoenixTransferEligibility(flow)
    : benefitFlow
      ? getPhoenixBenefitEventEligibility(flow)
      : cardFlow
        ? getPhoenixCardPurchaseEligibility(flow)
        : getPhoenixSimpleEventEligibility(flow), [
    transferFlow,
    benefitFlow,
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

  const inputKey = useMemo(() => JSON.stringify({
    input,
    benefitInput,
    cardInput,
    transferInput,
    transferFlow,
    benefitFlow,
    cardFlow,
  }), [input, benefitInput, cardInput, transferInput, transferFlow, benefitFlow, cardFlow]);

  useEffect(() => {
    simplePrepared.current = null;
    benefitPrepared.current = null;
    cardPrepared.current = null;
    transferPrepared.current = null;
    setCommitState('idle');
    setCommitMessage('');
    setServerDuplicate('');
    setDuplicateAccepted(false);
  }, [inputKey, reviewed]);

  useEffect(() => {
    onBusyChange?.(commitState === 'saving');
    return () => onBusyChange?.(false);
  }, [commitState, onBusyChange]);

  useEffect(() => {
    const hasInput = transferFlow
      ? Boolean(transferInput)
      : benefitFlow
        ? Boolean(benefitInput)
        : cardFlow
          ? Boolean(cardInput)
          : Boolean(input);

    if (!reviewed || !eligibility.eligible || !hasInput || missing.length) {
      setRuntimeState('idle');
      setRuntimeMessage('');
      return;
    }

    let active = true;
    setRuntimeState('checking');
    setRuntimeMessage('Validando o ambiente financeiro antes da gravação…');

    void getPhoenixRuntimeWriteCapabilities(true).then((capabilities) => {
      if (!active) return;
      const enabled = transferFlow
        ? capabilities.transferWrite
        : benefitFlow
          ? capabilities.benefitWrite
          : cardFlow
            ? capabilities.cardPurchaseWrite
            : capabilities.simpleEvent;

      setRuntimeState(enabled ? 'enabled' : 'disabled');
      setRuntimeMessage(enabled
        ? transferFlow
          ? 'Transferência validada. Origem e destino serão gravados de forma atômica.'
          : benefitFlow
            ? 'Movimentação do benefício validada. Ela afeta apenas o saldo do benefício.'
            : cardFlow
              ? 'Compra no cartão validada. Fatura, vencimento e parcelas serão calculados pelo MEG.'
              : 'Lançamento validado e pronto para gravação.'
        : 'Este fluxo está protegido neste ambiente e não pode ser gravado.');
    });

    return () => { active = false; };
  }, [reviewed, eligibility.eligible, inputKey, transferFlow, benefitFlow, cardFlow, input, benefitInput, cardInput, transferInput, missing.length]);

  const effectiveDuplicate = duplicateMessage || serverDuplicate;

  async function confirm() {
    if (!eligibility.eligible || runtimeState !== 'enabled' || commitState === 'saving') return;
    if (effectiveDuplicate && !duplicateAccepted) return;

    setCommitState('saving');
    setCommitMessage('Gravando e aguardando a confirmação do servidor…');

    try {
      if (transferFlow) {
        if (!transferInput) return;
        const prepared = transferPrepared.current
          ? (duplicateAccepted
              ? preparePhoenixTransfer({ ...transferInput, allowDuplicate:true }, transferPrepared.current.operationId)
              : transferPrepared.current)
          : preparePhoenixTransfer({ ...transferInput, allowDuplicate:duplicateAccepted || undefined });
        transferPrepared.current = prepared;

        const result = await runPhoenixTransferWrite(prepared, refreshMonth, (state) => {
          if (state.status === 'accepted') {
            setCommitState('accepted');
            setCommitMessage('Transferência aceita. Atualizando os saldos em segundo plano.');
            onAccepted?.();
          }
          if (state.status === 'confirmed') {
            setCommitState('confirmed');
            setCommitMessage('Transferência confirmada.');
            onCommitted?.(state.snapshot);
          }
        });

        if (result.status === 'error') {
          if (result.code === 'POSSIBLE_DUPLICATE') {
            setCommitState('idle');
            setServerDuplicate(result.message);
            setDuplicateAccepted(false);
            return;
          }
          setCommitState('error');
          setCommitMessage(result.message);
        }
        return;
      }

      if (benefitFlow) {
        if (!benefitInput) return;
        const prepared = benefitPrepared.current
          ? (duplicateAccepted
              ? preparePhoenixBenefitEvent({ ...benefitInput, allowDuplicate:true }, benefitPrepared.current.operationId)
              : benefitPrepared.current)
          : preparePhoenixBenefitEvent({ ...benefitInput, allowDuplicate:duplicateAccepted || undefined });
        benefitPrepared.current = prepared;

        const result = await runPhoenixBenefitEventWrite(prepared, refreshMonth, (state) => {
          if (state.status === 'accepted') {
            setCommitState('accepted');
            setCommitMessage('Movimentação do benefício aceita. Atualizando o saldo.');
            onAccepted?.();
          }
          if (state.status === 'confirmed') {
            setCommitState('confirmed');
            setCommitMessage('Movimentação do benefício confirmada.');
            onCommitted?.(state.snapshot, state.event);
          }
        });

        if (result.status === 'error') {
          if (result.code === 'POSSIBLE_DUPLICATE') {
            setCommitState('idle');
            setServerDuplicate(result.message);
            setDuplicateAccepted(false);
            return;
          }
          setCommitState('error');
          setCommitMessage(result.message);
        }
        return;
      }

      if (cardFlow) {
        if (!cardInput) return;
        const prepared = cardPrepared.current
          ? (duplicateAccepted
              ? preparePhoenixCardPurchase({ ...cardInput, allowDuplicate:true }, cardPrepared.current.operationId)
              : cardPrepared.current)
          : preparePhoenixCardPurchase({ ...cardInput, allowDuplicate:duplicateAccepted || undefined });
        cardPrepared.current = prepared;

        const result = await runPhoenixCardPurchaseWrite(prepared, refreshMonth, (state) => {
          if (state.status === 'accepted') {
            setCommitState('accepted');
            setCommitMessage('Compra aceita. Atualizando fatura e parcelas.');
            onAccepted?.();
          }
          if (state.status === 'confirmed') {
            setCommitState('confirmed');
            setCommitMessage('Compra no cartão confirmada.');
            onCommitted?.(state.snapshot, projectedCardEvent(state.snapshot, state.purchase.id));
          }
        });

        if (result.status === 'error') {
          if (result.code === 'POSSIBLE_DUPLICATE') {
            setCommitState('idle');
            setServerDuplicate(result.message);
            setDuplicateAccepted(false);
            return;
          }
          setCommitState('error');
          setCommitMessage(result.message);
        }
        return;
      }

      if (!input) return;
      const prepared = simplePrepared.current
        ? (duplicateAccepted
            ? preparePhoenixSimpleEvent({ ...input, allowDuplicate:true }, simplePrepared.current.operationId)
            : simplePrepared.current)
        : preparePhoenixSimpleEvent({ ...input, allowDuplicate:duplicateAccepted || undefined });
      simplePrepared.current = prepared;

      const result = await runPhoenixSimpleEventWrite(prepared, refreshMonth, (state) => {
        if (state.status === 'accepted') {
          setCommitState('accepted');
          setCommitMessage('Lançamento aceito. Atualizando a visão financeira.');
          onAccepted?.();
        }
        if (state.status === 'confirmed') {
          setCommitState('confirmed');
          setCommitMessage('Lançamento confirmado.');
          onCommitted?.(state.snapshot, state.event);
        }
      });

      if (result.status === 'error') {
        if (result.code === 'POSSIBLE_DUPLICATE') {
          setCommitState('idle');
          setServerDuplicate(result.message);
          setDuplicateAccepted(false);
          return;
        }
        setCommitState('error');
        setCommitMessage(result.message);
      }
    } catch (error) {
      const code = error instanceof Error ? error.message : 'PHOENIX_WRITE_FAILED';
      setCommitState('error');
      setCommitMessage(transferFlow ? phoenixTransferWriteMessage(code) : phoenixWriteMessage(code));
    }
  }

  if (!reviewed) {
    return <button className="mnx-editor-primary" type="button" onClick={onReview}>Continuar</button>;
  }

  if (!eligibility.eligible) {
    const reason = eligibility.reasons[0] || 'PHOENIX_WRITE_NOT_ENABLED';
    return <div className="mnx-editor-write-status is-protected" role="status">
      <div><strong>Fluxo protegido</strong><span>{transferFlow ? phoenixTransferWriteMessage(reason) : phoenixWriteMessage(reason)}</span></div>
      <button type="button" disabled>Confirmação indisponível</button>
    </div>;
  }

  return <div className={`mnx-editor-write-status is-${commitState}`} aria-live="polite">
    <div>
      <strong>{commitState === 'error' ? 'Não foi possível concluir' : commitState === 'confirmed' ? 'Operação confirmada' : 'Revisão concluída'}</strong>
      <span>{commitMessage || runtimeMessage || 'Validando o ambiente…'}</span>
    </div>

    {effectiveDuplicate && commitState !== 'confirmed' ? <label className="mnx-editor-duplicate">
      <input type="checkbox" checked={duplicateAccepted} onChange={(event) => setDuplicateAccepted(event.target.checked)} />
      <span><strong>Confirmar possível duplicidade</strong><small>{effectiveDuplicate}</small></span>
    </label> : null}

    <button
      className="mnx-editor-primary"
      type="button"
      disabled={runtimeState !== 'enabled' || commitState === 'saving' || Boolean(effectiveDuplicate && !duplicateAccepted)}
      onClick={() => void confirm()}
    >
      {commitState === 'saving'
        ? 'Confirmando…'
        : transferFlow
          ? 'Confirmar transferência'
          : benefitFlow
            ? 'Confirmar benefício'
            : cardFlow
              ? 'Confirmar compra'
              : 'Confirmar lançamento'}
    </button>
  </div>;
}
