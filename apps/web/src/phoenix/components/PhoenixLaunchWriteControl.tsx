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
import {
  phoenixTransferWriteMessage,
  preparePhoenixTransfer,
  runPhoenixTransferWrite,
  type PhoenixTransferInput,
  type PreparedPhoenixTransfer,
} from '../data/phoenix-transfer-write-gateway';
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

function normalizeLabel(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('pt-BR');
}

function drawerField(prefix: string) {
  if (typeof document === 'undefined') return null;
  const root = document.querySelector<HTMLElement>('.px-launch-drawer');
  if (!root) return null;
  const target = normalizeLabel(prefix);
  return [...root.querySelectorAll<HTMLLabelElement>('label.px-field')]
    .find((label) => normalizeLabel(label.querySelector('span')?.textContent || '').startsWith(target)) || null;
}

function parseTransferAmount(value: string) {
  const normalized = String(value || '')
    .replace(/R\$/gi, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.abs(parsed) : 0;
}

function readTransferInputFromDrawer(): PhoenixTransferInput | null {
  if (typeof document === 'undefined') return null;
  const root = document.querySelector<HTMLElement>('.px-launch-drawer');
  if (!root) return null;
  const sourceAccountId = drawerField('Conta de origem')?.querySelector<HTMLSelectElement>('select')?.value || '';
  const destinationAccountId = drawerField('Conta de destino')?.querySelector<HTMLSelectElement>('select')?.value || '';
  const date = drawerField('Data do evento')?.querySelector<HTMLInputElement>('input')?.value || '';
  const description = drawerField('Descrição')?.querySelector<HTMLInputElement>('input')?.value.trim() || '';
  const notes = drawerField('Observações opcionais')?.querySelector<HTMLTextAreaElement>('textarea')?.value.trim() || undefined;
  const amount = parseTransferAmount(root.querySelector<HTMLInputElement>('.px-money-mask')?.value || '');
  if (!sourceAccountId || !destinationAccountId || !date || !description || !amount) return null;
  return { sourceAccountId, destinationAccountId, amount, date, description, notes };
}

export function PhoenixLaunchWriteControl({
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
}: {
  reviewed: boolean;
  missing: string[];
  input: PhoenixSimpleEventInput | null;
  cardInput?: PhoenixCardPurchaseInput | null;
  transferInput?: PhoenixTransferInput | null;
  flow: PhoenixSimpleEventFlow;
  refreshMonth?: string;
  duplicateMessage?: string | null;
  onReview: () => void;
  onBusyChange?: (busy: boolean) => void;
  onAccepted?: () => void;
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
  const preparedTransferRef = useRef<PreparedPhoenixTransfer | null>(null);
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
    () => JSON.stringify({ input: input || null, benefitInput: benefitInput || null, cardInput: cardInput || null, transferInput: transferInput || null, transferFlow, benefitFlow, cardFlow }),
    [input, benefitInput, cardInput, transferInput, transferFlow, benefitFlow, cardFlow],
  );

  useEffect(() => {
    preparedRef.current = null;
    preparedBenefitRef.current = null;
    preparedCardRef.current = null;
    preparedTransferRef.current = null;
    setCommitState('idle');
    setCommitMessage('');
    setDuplicateAccepted(false);
  }, [inputKey, reviewed]);

  useEffect(() => {
    onBusyChange?.(commitState === 'saving');
    return () => onBusyChange?.(false);
  }, [commitState, onBusyChange]);

  useEffect(() => {
    const hasInput = transferFlow ? missing.length === 0 : benefitFlow ? Boolean(benefitInput) : cardFlow ? Boolean(cardInput) : Boolean(input);
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
          ? 'Transferência liberada. Origem e destino serão gravados atomicamente; após o aceite do servidor, a tela será liberada enquanto os saldos são relidos.'
          : benefitFlow
            ? 'Writer de benefício liberado. A movimentação será gravada sem alterar o caixa monetário; a tela será liberada após o aceite do servidor.'
            : cardFlow
              ? 'Writer de cartão liberado. A compra será criada no domínio de cartões; a tela será liberada assim que a API aceitar a operação.'
              : 'Gravação simples liberada. Após o aceite do servidor, a interface fecha e a atualização continua em segundo plano, sem reenviar a operação.');
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
  }, [reviewed, eligibility.eligible, inputKey, transferFlow, benefitFlow, cardFlow, benefitInput, cardInput, transferInput, input, missing.length]);

  async function confirmLaunch() {
    if (!eligibility.eligible || runtimeState !== 'enabled' || commitState === 'saving') return;
    const missingNonTransferInput = benefitFlow ? !benefitInput : cardFlow ? !cardInput : !input;
    if (!transferFlow && missingNonTransferInput) return;
    if (duplicateMessage && !duplicateAccepted) return;

    setCommitState('saving');
    setCommitMessage(transferFlow
      ? 'Gravando origem e destino como uma única transferência e aguardando a releitura confirmada…'
      : benefitFlow
        ? 'Gravando no saldo do Benefício Alimentação e aguardando a releitura confirmada…'
        : cardFlow
          ? 'Gravando a compra no cartão e aguardando a releitura sincronizada das faturas…'
          : 'Enviando ao MEG e aguardando confirmação da leitura atualizada…');
    try {
      if (transferFlow) {
        const resolvedTransferInput = transferInput || readTransferInputFromDrawer();
        if (!resolvedTransferInput) throw new Error('PHOENIX_TRANSFER_FORM_NOT_READY');
        const prepared = preparedTransferRef.current || preparePhoenixTransfer(resolvedTransferInput);
        preparedTransferRef.current = prepared;
        const result = await runPhoenixTransferWrite(
          prepared,
          refreshMonth || resolvedTransferInput.date.slice(0, 7),
          (state) => {
            if (state.status !== 'accepted') return;
            preparedTransferRef.current = null;
            setCommitState('confirmed');
            setCommitMessage('Transferência salva. A atualização das contas continua em segundo plano.');
            onAccepted?.();
          },
        );
        if (result.status === 'confirmed') {
          preparedTransferRef.current = null;
          setCommitState('confirmed');
          setCommitMessage('Transferência confirmada. As duas contas foram relidas da base.');
          onCommitted?.(result.snapshot);
          return;
        }
        if (result.status === 'accepted') return;
        setCommitState('error');
        setCommitMessage(result.status === 'error' ? result.message : 'Não foi possível concluir a transferência.');
        return;
      }

      if (benefitFlow) {
        const prepared = preparedBenefitRef.current || preparePhoenixBenefitEvent(benefitInput!);
        preparedBenefitRef.current = prepared;
        const result = await runPhoenixBenefitEventWrite(
          prepared,
          refreshMonth || benefitInput!.date.slice(0, 7),
          (state) => {
            if (state.status !== 'accepted') return;
            preparedBenefitRef.current = null;
            setCommitState('confirmed');
            setCommitMessage('Movimentação do benefício salva. O saldo será atualizado em segundo plano.');
            onAccepted?.();
          },
        );
        if (result.status === 'confirmed') {
          preparedBenefitRef.current = null;
          setCommitState('confirmed');
          setCommitMessage('Movimentação do Benefício Alimentação confirmada e relida da base.');
          onCommitted?.(result.snapshot, result.event);
          return;
        }
        if (result.status === 'accepted') return;
        setCommitState('error');
        setCommitMessage(result.status === 'error' ? result.message : 'Não foi possível concluir a movimentação do benefício.');
        return;
      }

      if (cardFlow) {
        const prepared = preparedCardRef.current || preparePhoenixCardPurchase(cardInput!);
        preparedCardRef.current = prepared;
        const result = await runPhoenixCardPurchaseWrite(
          prepared,
          refreshMonth || cardInput!.purchaseDate.slice(0, 7),
          (state) => {
            if (state.status !== 'accepted') return;
            preparedCardRef.current = null;
            setCommitState('confirmed');
            setCommitMessage('Compra salva no cartão. O formulário pode ser fechado enquanto o MEG atualiza fatura e parcelas em segundo plano.');
            onAccepted?.();
          },
        );
        if (result.status === 'confirmed') {
          preparedCardRef.current = null;
          setCommitState('confirmed');
          setCommitMessage('Compra confirmada no cartão. Parcelas e fatura foram relidas da base antes da atualização da tela.');
          onCommitted?.(result.snapshot, projectedCardEvent(result.snapshot, result.purchase.id));
          return;
        }
        if (result.status === 'accepted') return;
        setCommitState('error');
        setCommitMessage(result.status === 'error'
          ? result.message
          : 'Não foi possível concluir a confirmação visual da compra. A operação não será reenviada automaticamente.');
        return;
      }

      const prepared = preparedRef.current || preparePhoenixSimpleEvent(input!);
      preparedRef.current = prepared;
      const result = await runPhoenixSimpleEventWrite(
        prepared,
        refreshMonth || input!.date.slice(0, 7),
        (state) => {
          if (state.status !== 'accepted') return;
          preparedRef.current = null;
          setCommitState('confirmed');
          setCommitMessage('Lançamento salvo. O MEG atualizará saldos e grade em segundo plano.');
          onAccepted?.();
        },
      );
      if (result.status === 'confirmed') {
        preparedRef.current = null;
        setCommitState('confirmed');
        setCommitMessage('Lançamento confirmado no servidor e relido na base financeira.');
        onCommitted?.(result.snapshot, result.event);
        return;
      }
      if (result.status === 'accepted') return;
      setCommitState('error');
      setCommitMessage(result.status === 'error' ? result.message : 'Não foi possível concluir o lançamento.');
    } catch (error) {
      const code = error instanceof Error ? error.message : 'PHOENIX_WRITE_FAILED';
      setCommitState('error');
      setCommitMessage(transferFlow ? phoenixTransferWriteMessage(code) : phoenixWriteMessage(code));
    }
  }

  if (!reviewed) {
    return <button className="px-primary-action px-review-launch" type="button" onClick={onReview}>
      Continuar
    </button>;
  }

  if (!eligibility.eligible) {
    const reason = eligibility.reasons[0] || 'PHOENIX_WRITE_NOT_ENABLED';
    return <div className="px-launch-write-panel is-protected" role="status">
      <div><strong>Revisão concluída.</strong><span>{phoenixWriteMessage(reason)}</span></div>
      <button className="px-primary-action" type="button" disabled>Confirmação ainda protegida</button>
    </div>;
  }

  const confirmedTitle = transferFlow ? 'Transferência confirmada' : benefitFlow ? 'Benefício Alimentação confirmado' : cardFlow ? 'Compra no cartão confirmada' : 'Lançamento confirmado';
  const confirmLabel = transferFlow ? 'Confirmar transferência' : benefitFlow ? 'Confirmar movimentação do benefício' : cardFlow ? 'Confirmar compra no cartão' : 'Confirmar lançamento';
  const savingLabel = transferFlow ? 'Confirmando transferência…' : benefitFlow ? 'Gravando Benefício Alimentação…' : cardFlow ? 'Gravando compra no cartão…' : 'Confirmando lançamento…';

  return <div className={`px-launch-write-panel ${commitState === 'confirmed' ? 'is-confirmed' : commitState === 'error' ? 'is-error' : ''}`} aria-live="polite">
    <div className="px-launch-write-status">
      <strong>{commitState === 'confirmed' ? confirmedTitle : 'Revisão concluída'}</strong>
      <span>{commitMessage || runtimeMessage || 'Aguardando verificação do ambiente.'}</span>
    </div>

    {transferFlow && commitState !== 'confirmed' ? <div className="px-notice ok">A transferência é atômica entre origem e destino. Após o aceite do servidor, este formulário fecha e a releitura continua sem bloquear o uso do MEG.</div> : null}

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
