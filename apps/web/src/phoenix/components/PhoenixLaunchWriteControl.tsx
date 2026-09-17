import { useEffect, useMemo, useRef, useState } from 'react';
import type { FinancialEvent } from '../../app/finance-client';
import type { PhoenixReadModel } from '../contracts';
import {
  getPhoenixRuntimeWriteCapabilities,
  getPhoenixSimpleEventEligibility,
  phoenixWriteMessage,
  preparePhoenixSimpleEvent,
  runPhoenixSimpleEventUpdate,
  runPhoenixSimpleEventWrite,
  type PhoenixSimpleEventFlow,
  type PhoenixSimpleEventInput,
  type PreparedPhoenixSimpleEvent,
} from '../data/phoenix-write-gateway';
import '../phoenix-launch-write.css';

type RuntimeState = 'idle' | 'checking' | 'enabled' | 'disabled';
type CommitState = 'idle' | 'saving' | 'confirmed' | 'error';

export function PhoenixLaunchWriteControl({
  reviewed,
  missing,
  input,
  flow,
  duplicateMessage,
  editEventId,
  onReview,
  onCommitted,
}: {
  reviewed: boolean;
  missing: string[];
  input: PhoenixSimpleEventInput | null;
  flow: PhoenixSimpleEventFlow;
  duplicateMessage?: string | null;
  editEventId?: string | null;
  onReview: () => void;
  onCommitted?: (snapshot: PhoenixReadModel, event: FinancialEvent) => void;
}) {
  const [runtimeState, setRuntimeState] = useState<RuntimeState>('idle');
  const [runtimeMessage, setRuntimeMessage] = useState('');
  const [commitState, setCommitState] = useState<CommitState>('idle');
  const [commitMessage, setCommitMessage] = useState('');
  const [duplicateAccepted, setDuplicateAccepted] = useState(false);
  const preparedRef = useRef<PreparedPhoenixSimpleEvent | null>(null);
  const editing = Boolean(editEventId);

  const eligibility = useMemo(() => getPhoenixSimpleEventEligibility(flow), [
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
  const inputKey = useMemo(() => JSON.stringify({ input: input || null, editEventId: editEventId || null }), [input, editEventId]);

  useEffect(() => {
    preparedRef.current = null;
    setCommitState('idle');
    setCommitMessage('');
    setDuplicateAccepted(false);
  }, [inputKey, reviewed]);

  useEffect(() => {
    if (!reviewed || !eligibility.eligible || !input) {
      setRuntimeState('idle');
      setRuntimeMessage('');
      return;
    }
    let active = true;
    setRuntimeState('checking');
    setRuntimeMessage('Verificando se este ambiente permite gravação financeira…');
    void getPhoenixRuntimeWriteCapabilities(true).then((capabilities) => {
      if (!active) return;
      if (capabilities.simpleEvent) {
        setRuntimeState('enabled');
        setRuntimeMessage(editing
          ? 'Edição liberada. A alteração só será refletida depois da confirmação do servidor e da releitura financeira.'
          : 'Gravação simples liberada pelo ambiente. A confirmação será enviada uma única vez com proteção de reenvio.');
      } else {
        setRuntimeState('disabled');
        setRuntimeMessage('Este ambiente permanece protegido contra gravação financeira. A revisão pode ser validada sem alterar a base.');
      }
    });
    return () => { active = false; };
  }, [reviewed, eligibility.eligible, inputKey, editing]);

  async function confirmLaunch() {
    if (!input || !eligibility.eligible || runtimeState !== 'enabled' || commitState === 'saving') return;
    if (!editing && duplicateMessage && !duplicateAccepted) return;

    setCommitState('saving');
    setCommitMessage(editing
      ? 'Salvando alteração e atualizando a fotografia financeira…'
      : 'Enviando ao MEG e aguardando confirmação da leitura atualizada…');
    try {
      const result = editing && editEventId
        ? await runPhoenixSimpleEventUpdate(editEventId, input, input.date.slice(0, 7))
        : await runPhoenixSimpleEventWrite(
            preparedRef.current || (preparedRef.current = preparePhoenixSimpleEvent(input)),
            input.date.slice(0, 7),
          );
      if (result.status === 'confirmed') {
        preparedRef.current = null;
        setCommitState('confirmed');
        setCommitMessage(editing
          ? 'Alteração confirmada no servidor e refletida na leitura financeira.'
          : 'Lançamento confirmado no servidor e relido na base financeira.');
        onCommitted?.(result.snapshot, result.event);
        return;
      }
      setCommitState('error');
      setCommitMessage(result.status === 'error' ? result.message : 'Não foi possível confirmar a operação. Tente novamente sem alterar os dados.');
    } catch (error) {
      const code = error instanceof Error ? error.message : 'PHOENIX_WRITE_FAILED';
      setCommitState('error');
      setCommitMessage(phoenixWriteMessage(code));
    }
  }

  if (!reviewed) {
    return <button className="px-primary-action px-review-launch" type="button" disabled={missing.length > 0} onClick={onReview}>
      {missing.length ? 'Revisar campos obrigatórios' : editing ? 'Revisar alterações' : 'Revisar lançamento'}
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
      <strong>{commitState === 'confirmed' ? (editing ? 'Alteração confirmada' : 'Lançamento confirmado') : 'Revisão concluída'}</strong>
      <span>{commitMessage || runtimeMessage || 'Aguardando verificação do ambiente.'}</span>
    </div>

    {!editing && duplicateMessage && commitState !== 'confirmed' ? <label className="px-launch-duplicate-confirm">
      <input type="checkbox" checked={duplicateAccepted} onChange={(event) => setDuplicateAccepted(event.target.checked)} />
      <span><strong>Confirmar possível duplicidade</strong><small>{duplicateMessage}</small></span>
    </label> : null}

    <button
      className="px-primary-action px-confirm-launch"
      type="button"
      disabled={runtimeState !== 'enabled' || commitState === 'saving' || commitState === 'confirmed' || Boolean(!editing && duplicateMessage && !duplicateAccepted)}
      onClick={() => { void confirmLaunch(); }}
      aria-busy={commitState === 'saving'}
    >
      {commitState === 'saving'
        ? (editing ? 'Salvando alteração…' : 'Confirmando lançamento…')
        : commitState === 'confirmed'
          ? (editing ? 'Alterado e sincronizado' : 'Confirmado e sincronizado')
          : runtimeState === 'checking'
            ? 'Verificando ambiente…'
            : runtimeState === 'disabled'
              ? 'Gravação protegida neste ambiente'
              : editing ? 'Salvar alterações' : 'Confirmar lançamento'}
    </button>
  </div>;
}
