import { useEffect, useMemo, useRef, useState } from 'react';
import type { FinancialEvent } from '../../app/finance-client';
import type { PhoenixReadModel } from '../contracts';
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
  const preparedBenefitRef = useRef<PreparedPhoenixBenefitEvent | null>(null);
  const preparedCardRef = useRef<PreparedPhoenixCardPurchase | null>(null);
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
  const inputKey = useMemo(
    () => JSON.stringify({ input: input || null, benefitInput: benefitInput || null, cardInput: cardInput || null, transferFlow, benefitFlow, cardFlow }),
    [input, benefitInput, cardInput, transferFlow, benefitFlow, cardFlow],
  );

  useEffect(() => {
    preparedRef.current = null;
    preparedBenefitRef.current = null;
    preparedCardRef.current = null;
    setCommitState('idle');
    setCommitMessage('');
    setDuplicateAccepted(false);
  }, [inputKey, reviewed]);

  useEffect(() => {
    const hasInput = transferFlow ? true : benefitFlow ? Boolean(benefitInput) : cardFlow ? Boolean(cardInput) : Boolean(input);
    if (!reviewed || !eligibility.eligible || !hasInput) {
      setRuntimeState('idle');
      setRuntimeMessage('');
      return;
    }
    let active = true;
    setRuntimeState('checking');
    setRuntimeMessage(transferFlow
      ? 'Verificando se este ambiente permite transferências reais entre contas…'
      : benefitFlow
        ? 'Verificando se este ambiente permite gravar o Benefício Alimentação…'
        : cardFlow
          ? 'Verificando se este ambiente permite gravar compras no cartão…'
          : 'Verificando se este ambiente permite gravação financeira…');
    void getPhoenixRuntimeWriteCapabilities(true).then((capabilities) => {
      if (!active) return;
      const enabled = transferFlow
        ? capabilities.transferWrite
        : benefitFlow
          ? capabilities.benefitWrite
          : cardFlow
            ? capabilities.cardPurchaseWrite
            : capabilities.simpleEvent;
      if (enabled) {
        setRuntimeState('enabled');
        setRuntimeMessage(transferFlow
          ? 'Transferência liberada. Origem e destino serão gravados atomicamente pelo domínio financeiro, com validação do saldo da conta de origem.'
          : benefitFlow
            ? 'Writer de benefício liberado. A movimentação será confirmada como paga/recebida, sem alterar o caixa monetário, e o saldo do benefício será relido antes de atualizar a tela.'
            : cardFlow
              ? 'Writer de cartão liberado. A compra será criada no domínio de cartões, parcelada pela API e relida no snapshot antes de aparecer no sistema.'
              : 'Gravação simples liberada pelo ambiente. A confirmação será enviada uma única vez com proteção de reenvio.');
      } else {
        setRuntimeState('disabled');
        setRuntimeMessage(transferFlow
          ? 'Este ambiente mantém transferências financeiras protegidas. A revisão pode ser validada sem alterar a base.'
          : benefitFlow
            ? 'Este ambiente mantém a gravação do Benefício Alimentação protegida. A revisão pode ser validada sem alterar a base.'
            : cardFlow
              ? 'Este ambiente mantém a gravação de cartão protegida. A revisão pode ser validada sem alterar a base.'
              : 'Este ambiente permanece protegido contra gravação financeira. A revisão pode ser validada sem alterar a base.');
      }
    });
    return () => { active = false; };
  }, [reviewed, eligibility.eligible, inputKey, transferFlow, benefitFlow, cardFlow, benefitInput, cardInput, input]);

  async function confirmLaunch() {
    if (transferFlow) return;
    if (!eligibility.eligible || runtimeState !== 'enabled' || commitState === 'saving') return;
    if (benefitFlow ? !benefitInput : cardFlow ? !cardInput : !input) return;
    if (duplicateMessage && !duplicateAccepted) return;

    setCommitState('saving');
    setCommitMessage(benefitFlow
      ? 'Gravando no saldo do Benefício Alimentação e aguardando a releitura confirmada…'
      : cardFlow
        ? 'Gravando a compra no cartão e aguardando a releitura sincronizada das faturas…'
        : 'Enviando ao MEG e aguardando confirmação da leitura atualizada…');
    try {
      if (benefitFlow) {
        const prepared = preparedBenefitRef.current || preparePhoenixBenefitEvent(benefitInput!);
        preparedBenefitRef.current = prepared;
        const result = await runPhoenixBenefitEventWrite(prepared, refreshMonth || benefitInput!.date.slice(0, 7));
        if (result.status === 'confirmed') {
          preparedBenefitRef.current = null;
          setCommitState('confirmed');
          setCommitMessage('Movimentação do Benefício Alimentação confirmada. O saldo do benefício foi relido sem alterar o caixa monetário.');
          onCommitted?.(result.snapshot, result.event);
          return;
        }
        setCommitState('error');
        setCommitMessage(result.status === 'error' ? result.message : 'Não foi possível confirmar a movimentação do benefício. Tente novamente sem alterar os dados.');
        return;
      }

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

  if (transferFlow) {
    return <div className="px-launch-write-panel" aria-live="polite">
      <div className="px-launch-write-status">
        <strong>Transferência revisada</strong>
        <span>{runtimeMessage || 'Aguardando verificação do ambiente.'}</span>
      </div>
      <div className="px-notice ok">Paridade do formulário validada. A transferência será gravada como uma operação atômica entre origem e destino.</div>
      <button
        className="px-primary-action px-review-launch px-confirm-transfer"
        type="button"
        disabled={runtimeState !== 'enabled'}
        data-phoenix-transfer-confirm="true"
      >
        {runtimeState === 'checking' ? 'Verificando ambiente…' : runtimeState === 'disabled' ? 'Transferência protegida neste ambiente' : 'Confirmar transferência'}
      </button>
    </div>;
  }

  const confirmedTitle = benefitFlow ? 'Benefício Alimentação confirmado' : cardFlow ? 'Compra no cartão confirmada' : 'Lançamento confirmado';
  const confirmLabel = benefitFlow ? 'Confirmar movimentação do benefício' : cardFlow ? 'Confirmar compra no cartão' : 'Confirmar lançamento';
  const savingLabel = benefitFlow ? 'Gravando Benefício Alimentação…' : cardFlow ? 'Gravando compra no cartão…' : 'Confirmando lançamento…';

  return <div className={`px-launch-write-panel ${commitState === 'confirmed' ? 'is-confirmed' : commitState === 'error' ? 'is-error' : ''}`} aria-live="polite">
    <div className="px-launch-write-status">
      <strong>{commitState === 'confirmed' ? confirmedTitle : 'Revisão concluída'}</strong>
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
        ? savingLabel
        : commitState === 'confirmed'
          ? 'Confirmado e sincronizado'
          : runtimeState === 'checking'
            ? 'Verificando ambiente…'
            : runtimeState === 'disabled'
              ? 'Gravação protegida neste ambiente'
              : confirmLabel}
    </button>
  </div>;
}
