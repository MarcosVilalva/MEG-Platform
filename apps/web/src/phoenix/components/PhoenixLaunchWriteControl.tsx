import { useEffect, useMemo, useRef, useState } from 'react';
import type { FinancialEvent } from '../../app/finance-client';
import type { PhoenixReadModel } from '../contracts';
import {
  getPhoenixRuntimeWriteCapabilities,
  getPhoenixSimpleEventEligibility,
  phoenixWriteMessage,
  preparePhoenixSimpleEvent,
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
  onReview,
  onCommitted,
}: {
  reviewed: boolean;
  missing: string[];
  input: PhoenixSimpleEventInput | null;
  flow: PhoenixSimpleEventFlow;
  duplicateMessage?: string | null;
  onReview: () => void;
  onCommitted?: (snapshot: PhoenixReadModel, event: FinancialEvent) => void;
}) {
  const [runtimeState, setRuntimeState] = useState<RuntimeState>('idle');
  const [runtimeMessage, setRuntimeMessage] = useState('');
  const [commitState, setCommitState] = useState<CommitState>('idle');
  const [commitMessage, setCommitMessage] = useState('');
  const [duplicateAccepted, setDuplicateAccepted] = useState(false);
  const preparedRef = useRef<PreparedPhoenixSimpleEvent | null>(null);

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
  const inputKey = useMemo(() => JSON.stringify(input || null), [input]);

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
        setRuntimeMessage('Gravação simples liberada pelo ambiente. A confirmação será enviada uma única vez com proteção de reenvio.');
      } else {
        setRuntimeState('disabled');
        setRuntimeMessage('Este ambiente permanece protegido contra gravação financeira. A revisão pode ser validada sem alterar a base.');
      }
    });
    return () => { active = false; };
  }, [reviewed, eligibility.eligible, inputKey]);

  async function confirmLaunch() {
    if (!input || !eligibility.eligible || runtimeState !== 'enabled' || commitState === 'saving') return;
    if (duplicateMessage && !duplicateAccepted) return;

    setCommitState('saving');
    setCommitMessage('Enviando ao MEG e aguardando confirmação da leitura atualizada…');
    try {
      const prepared = preparedRef.current || preparePhoenixSimpleEvent(input);
      preparedRef.current = prepared;
      const result = await runPhoenixSimpleEventWrite(prepared, input.competence || input.date.slice(0, 7));
      if (result.status === 'confirmed') {
        preparedRef.current = null;
        setCommitState('confirmed');
        setCommitMessage('Lançamento confirmado no servidor e relido na base financeira.');
        onCommitted?.(result.snapshot, result.event);
        return;
      }
      setCommitState('error');
      setCommitMessage(result.message);
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
      <strong>{commitState === 'confirmed' ? 'Lançamento confirmado' : 'Revisão concluída'}</strong>
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
      {commitState === 'saving' ? 'Confirmando lançamento…' : commitState === 'confirmed' ? 'Confirmado e sincronizado' : runtimeState === 'checking' ? 'Verificando ambiente…' : runtimeState === 'disabled' ? 'Gravação protegida neste ambiente' : 'Confirmar lançamento'}
    </button>
  </div>;
}
