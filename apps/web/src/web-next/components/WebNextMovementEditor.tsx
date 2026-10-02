import { useEffect, useMemo, useRef, useState } from 'react';
import type { PhoenixReadModel } from '../../phoenix/contracts';
import { WebNextIcon } from './WebNextIcon';
import {
  blankWebNextEditorDraft,
  buildWebNextEditorContext,
  deleteWebNextMovement,
  draftFromWebNextTarget,
  isCreditPayment,
  resolveWebNextEditorTarget,
  saveEditedWebNextMovement,
  saveNewWebNextMovement,
  validateWebNextEditorDraft,
  webNextEditorDueDate,
  type WebNextEditorDraft,
  type WebNextEditorMode,
  type WebNextEditorTarget,
} from '../data/movement-editor-gateway';
import '../styles/movement-editor.css';

const brl = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export type WebNextMovementEditRequest = { token: number; eventId: string };

function parseMoney(value: string) {
  const raw = value.trim();
  if (!raw) return 0;
  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw;
  const parsed = Number(normalized.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? Math.abs(parsed) : 0;
}

function moneyInput(value: number) {
  return value ? brl.format(value) : '';
}

function modeLabel(draft: WebNextEditorDraft) {
  if (draft.mode === 'transfer') return 'Transferência';
  if (draft.mode === 'benefit') return draft.benefitType === 'income' ? 'Crédito alimentação' : 'Compra alimentação';
  return draft.mode === 'income' ? 'Receita' : 'Despesa';
}

export function WebNextMovementEditor({
  data,
  launchRequest,
  launchPreset,
  editRequest,
  onSnapshot,
}: {
  data: PhoenixReadModel;
  launchRequest: number;
  launchPreset: 'expense' | 'income' | 'benefit' | 'transfer';
  editRequest?: WebNextMovementEditRequest | null;
  onSnapshot?: (snapshot: PhoenixReadModel) => void;
}) {
  const context = useMemo(() => buildWebNextEditorContext(data), [data]);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<WebNextEditorTarget | null>(null);
  const [draft, setDraft] = useState<WebNextEditorDraft>(() => blankWebNextEditorDraft('expense', context));
  const [amountText, setAmountText] = useState('');
  const [categoryGroup, setCategoryGroup] = useState('');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'ok' | 'warn' | 'error'>('ok');
  const [duplicatePending, setDuplicatePending] = useState(false);
  const [closeConfirm, setCloseConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const launchTokenRef = useRef(0);
  const editTokenRef = useRef(0);

  const editing = Boolean(target);
  const payment = context.paymentMethods.find((item) => item.id === draft.paymentMethodId) || null;
  const credit = draft.mode === 'expense' && isCreditPayment(payment?.name, payment?.type);
  const categoryType = draft.mode === 'income' || (draft.mode === 'benefit' && draft.benefitType === 'income') ? 'income' : 'expense';
  const categories = context.categories.filter((item) => !item.type || item.type === categoryType);
  const categoryGroups = [...new Set(categories.map((item) => item.group).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const visibleCategories = categoryGroup ? categories.filter((item) => item.group === categoryGroup) : categories;
  const dueDate = credit ? webNextEditorDueDate(draft, context) : '';
  const validation = validateWebNextEditorDraft(draft, context);
  const transferLocked = editing && draft.mode === 'transfer';

  function initialize(nextDraft: WebNextEditorDraft, nextTarget: WebNextEditorTarget | null) {
    const selectedCategory = context.categories.find((item) => item.id === nextDraft.categoryId);
    setTarget(nextTarget);
    setDraft(nextDraft);
    setAmountText(moneyInput(nextDraft.amount));
    setCategoryGroup(selectedCategory?.group || '');
    setDirty(false);
    setBusy(false);
    setMessage('');
    setMessageTone('ok');
    setDuplicatePending(false);
    setCloseConfirm(false);
    setDeleteConfirm(false);
    setOpen(true);
  }

  useEffect(() => {
    if (launchRequest <= 0 || launchRequest === launchTokenRef.current) return;
    launchTokenRef.current = launchRequest;
    initialize(blankWebNextEditorDraft(launchPreset as WebNextEditorMode, context), null);
  }, [launchRequest, launchPreset, context]);

  useEffect(() => {
    if (!editRequest || editRequest.token === editTokenRef.current) return;
    editTokenRef.current = editRequest.token;
    const nextTarget = resolveWebNextEditorTarget(data, editRequest.eventId);
    if (!nextTarget) return;
    initialize(draftFromWebNextTarget(nextTarget, context), nextTarget);
  }, [editRequest, data, context]);

  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (deleteConfirm) setDeleteConfirm(false);
      else if (closeConfirm) setCloseConfirm(false);
      else requestClose();
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [open, dirty, closeConfirm, deleteConfirm]);

  function change<K extends keyof WebNextEditorDraft>(key: K, value: WebNextEditorDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setDirty(true);
    setMessage('');
    setDuplicatePending(false);
  }

  function changeMode(mode: WebNextEditorMode) {
    if (editing) return;
    const next = blankWebNextEditorDraft(mode, context);
    next.description = draft.description;
    next.date = draft.date;
    next.amount = draft.amount;
    next.notes = draft.notes;
    initialize(next, null);
    setDirty(true);
  }

  function changeBenefitType(value: 'expense' | 'income') {
    setDraft((current) => ({
      ...current,
      benefitType: value,
      status: 'paid',
      categoryId: '',
      accountId: context.canonicalBenefitAccountId,
      paymentMethodId: context.canonicalBenefitPaymentId,
    }));
    setCategoryGroup('');
    setDirty(true);
    setMessage('');
  }

  function requestClose() {
    if (busy) return;
    if (dirty) {
      setCloseConfirm(true);
      return;
    }
    setOpen(false);
  }

  function hardClose() {
    setOpen(false);
    setCloseConfirm(false);
    setDeleteConfirm(false);
    setDirty(false);
  }

  async function save(allowDuplicate = false) {
    if (busy || transferLocked) return;
    const errors = validateWebNextEditorDraft(draft, context);
    if (errors.length) {
      setMessage(errors.join(' '));
      setMessageTone('error');
      return;
    }
    setBusy(true);
    setMessage(editing ? 'Salvando alterações…' : 'Confirmando lançamento…');
    setMessageTone('warn');
    try {
      const result = target
        ? await saveEditedWebNextMovement(target, draft, context)
        : await saveNewWebNextMovement(draft, context, allowDuplicate);
      if (result.status === 'duplicate') {
        setDuplicatePending(true);
        setMessage(result.message);
        setMessageTone('warn');
        return;
      }
      setMessage(result.message);
      setMessageTone(result.status === 'error' ? 'error' : 'ok');
      if (result.status === 'error') return;
      if (result.snapshot) onSnapshot?.(result.snapshot);
      setDirty(false);
      window.setTimeout(() => setOpen(false), 280);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!target || busy) return;
    setBusy(true);
    setMessage('Excluindo lançamento…');
    setMessageTone('warn');
    try {
      const result = await deleteWebNextMovement(target, context);
      setMessage(result.message);
      setMessageTone(result.status === 'error' ? 'error' : 'ok');
      if (result.status !== 'error') {
        setDirty(false);
        setDeleteConfirm(false);
        window.setTimeout(() => setOpen(false), 280);
      }
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return <div className="mnx-editor-overlay" data-web-next-overlay="movement-editor">
    <button className="mnx-editor-backdrop" type="button" aria-label="Fechar lançamento" onClick={requestClose} />
    <section className="mnx-editor" role="dialog" aria-modal="true" aria-labelledby="mnx-editor-title">
      <header className="mnx-editor-head">
        <div className="mnx-editor-heading">
          <span className="mnx-editor-mark"><WebNextIcon name={draft.mode === 'benefit' ? 'food' : draft.mode === 'income' ? 'receivables' : draft.mode === 'transfer' ? 'cashflow' : 'payables'} /></span>
          <div>
            <small>{editing ? 'EDITAR MOVIMENTO' : 'NOVO MOVIMENTO'}</small>
            <h2 id="mnx-editor-title">{modeLabel(draft)}</h2>
            <p>{editing ? 'Atualize os dados preservando as regras financeiras já registradas.' : 'Preencha o essencial. O MEG cuida das regras do fluxo escolhido.'}</p>
          </div>
        </div>
        <button className="mnx-editor-close" type="button" aria-label="Fechar" onClick={requestClose}>×</button>
      </header>

      <div className="mnx-editor-body" data-meg-scroll-region="true">
        {!editing ? <div className="mnx-editor-mode" role="group" aria-label="Tipo de movimento">
          <button type="button" className={draft.mode === 'expense' ? 'is-active' : ''} onClick={() => changeMode('expense')}><WebNextIcon name="payables" /><span>Despesa</span></button>
          <button type="button" className={draft.mode === 'income' ? 'is-active' : ''} onClick={() => changeMode('income')}><WebNextIcon name="receivables" /><span>Receita</span></button>
          <button type="button" className={draft.mode === 'benefit' ? 'is-active' : ''} onClick={() => changeMode('benefit')}><WebNextIcon name="food" /><span>Alimentação</span></button>
          <button type="button" className={draft.mode === 'transfer' ? 'is-active' : ''} onClick={() => changeMode('transfer')}><WebNextIcon name="cashflow" /><span>Transferência</span></button>
        </div> : null}

        {draft.mode === 'benefit' ? <div className="mnx-editor-benefit-switch">
          <button type="button" className={draft.benefitType === 'expense' ? 'is-active' : ''} onClick={() => changeBenefitType('expense')}>Compra com benefício</button>
          <button type="button" className={draft.benefitType === 'income' ? 'is-active' : ''} onClick={() => changeBenefitType('income')}>Crédito / recarga</button>
        </div> : null}

        {transferLocked ? <div className="mnx-editor-notice is-warn"><strong>Transferência protegida</strong><span>Uma transferência existente não é convertida nem regravada por aqui. Isso preserva a dupla partida entre as contas.</span></div> : null}

        <div className="mnx-editor-grid">
          <label className="mnx-editor-field is-wide">
            <span>Descrição *</span>
            <input value={draft.description} maxLength={120} autoFocus onChange={(event) => change('description', event.target.value)} placeholder="Ex.: supermercado, salário, combustível" />
          </label>

          <label className="mnx-editor-field">
            <span>{credit ? 'Data da compra *' : 'Data *'}</span>
            <input type="date" value={draft.date} onChange={(event) => change('date', event.target.value)} />
          </label>

          <label className="mnx-editor-field">
            <span>Valor *</span>
            <div className="mnx-editor-money"><b>R$</b><input inputMode="decimal" value={amountText} onChange={(event) => { setAmountText(event.target.value); change('amount', parseMoney(event.target.value)); }} onBlur={() => setAmountText(moneyInput(draft.amount))} placeholder="0,00" /></div>
          </label>

          {draft.mode === 'transfer' ? <>
            <label className="mnx-editor-field">
              <span>Conta de origem *</span>
              <select value={draft.accountId} disabled={editing} onChange={(event) => change('accountId', event.target.value)}>
                <option value="">Selecione</option>
                {context.accounts.filter((item) => item.type !== 'benefit').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label className="mnx-editor-field">
              <span>Conta de destino *</span>
              <select value={draft.destinationAccountId} disabled={editing} onChange={(event) => change('destinationAccountId', event.target.value)}>
                <option value="">Selecione</option>
                {context.accounts.filter((item) => item.type !== 'benefit' && item.id !== draft.accountId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
          </> : <>
            {!credit ? <label className="mnx-editor-field">
              <span>Conta *</span>
              <select value={draft.accountId} disabled={draft.mode === 'benefit'} onChange={(event) => change('accountId', event.target.value)}>
                <option value="">Selecione</option>
                {context.accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label> : <div className="mnx-editor-scope"><span>Impacto no caixa</span><strong>Na baixa da fatura</strong><small>A compra não reduz uma conta monetária agora.</small></div>}

            {(draft.mode === 'expense' || (draft.mode === 'benefit' && draft.benefitType === 'expense')) ? <>
              <label className="mnx-editor-field">
                <span>Classificação</span>
                <select value={categoryGroup} onChange={(event) => { setCategoryGroup(event.target.value); change('categoryId', ''); }}>
                  <option value="">Todas</option>
                  {categoryGroups.map((group) => <option key={group} value={group}>{group}</option>)}
                </select>
              </label>
              <label className="mnx-editor-field">
                <span>Categoria *</span>
                <select value={draft.categoryId} onChange={(event) => change('categoryId', event.target.value)}>
                  <option value="">Selecione</option>
                  {visibleCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
            </> : <label className="mnx-editor-field is-wide">
              <span>Categoria da receita</span>
              <select value={draft.categoryId} onChange={(event) => change('categoryId', event.target.value)}>
                <option value="">Sem categoria</option>
                {visibleCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>}

            <label className="mnx-editor-field">
              <span>{draft.mode === 'income' || (draft.mode === 'benefit' && draft.benefitType === 'income') ? 'Forma de recebimento *' : 'Forma de pagamento *'}</span>
              <select value={draft.paymentMethodId} disabled={draft.mode === 'benefit'} onChange={(event) => { change('paymentMethodId', event.target.value); change('cardId', ''); }}>
                <option value="">Selecione</option>
                {context.paymentMethods.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>

            {draft.mode === 'expense' && !credit ? <label className="mnx-editor-field">
              <span>Situação</span>
              <select value={draft.status} disabled={isCreditPayment(payment?.name, payment?.type)} onChange={(event) => change('status', event.target.value as 'planned' | 'paid')}>
                <option value="planned">Pendente</option>
                <option value="paid">Pago</option>
              </select>
            </label> : null}

            {credit ? <>
              <label className="mnx-editor-field">
                <span>Cartão *</span>
                <select value={draft.cardId} onChange={(event) => change('cardId', event.target.value)}>
                  <option value="">Selecione</option>
                  {context.cards.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label className="mnx-editor-field">
                <span>Parcelas *</span>
                <div className="mnx-editor-stepper">
                  <button type="button" disabled={draft.installments <= 1} onClick={() => change('installments', Math.max(1, draft.installments - 1))}>−</button>
                  <input type="number" min={1} max={48} value={draft.installments} onChange={(event) => change('installments', Math.min(48, Math.max(1, Number(event.target.value) || 1)))} />
                  <button type="button" disabled={draft.installments >= 48} onClick={() => change('installments', Math.min(48, draft.installments + 1))}>+</button>
                </div>
              </label>
              <div className="mnx-editor-due"><span>Vencimento calculado</span><strong>{dueDate ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${dueDate}T12:00:00Z`)) : 'Selecione o cartão'}</strong><small>{draft.installments}x · a competência segue o vencimento da parcela.</small></div>
            </> : null}
          </>}

          {draft.mode !== 'transfer' && draft.mode !== 'benefit' && !credit ? <label className="mnx-editor-check">
            <input type="checkbox" checked={draft.negative} onChange={(event) => change('negative', event.target.checked)} />
            <span><strong>Estorno / reversão</strong><small>Preserva o sinal negativo sem inverter o tipo do lançamento.</small></span>
          </label> : null}

          <label className="mnx-editor-field is-wide">
            <span>Observações</span>
            <textarea value={draft.notes} maxLength={500} onChange={(event) => change('notes', event.target.value)} placeholder="Informações úteis para consulta futura" />
          </label>
        </div>

        {draft.mode === 'benefit' ? <div className="mnx-editor-notice is-benefit"><WebNextIcon name="food" /><span><strong>Benefício Alimentação</strong><small>Conta benefício e Verocard ficam travados. Esse movimento não compõe o caixa monetário.</small></span></div> : null}

        <section className="mnx-editor-review">
          <span>RESUMO</span>
          <div><small>Tipo</small><strong>{modeLabel(draft)}</strong></div>
          <div><small>Valor</small><strong>{draft.negative ? '− ' : ''}{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(draft.amount || 0)}</strong></div>
          <div><small>Data</small><strong>{draft.date ? draft.date.split('-').reverse().join('/') : '—'}</strong></div>
          <div><small>Validação</small><strong className={validation.length ? 'is-warn' : 'is-ok'}>{validation.length ? `${validation.length} ponto(s) a revisar` : 'Pronto para confirmar'}</strong></div>
        </section>

        {message ? <div className={`mnx-editor-message is-${messageTone}`} role="status">{message}</div> : null}
        {duplicatePending ? <div className="mnx-editor-duplicate">
          <span><strong>Possível duplicidade</strong><small>O servidor encontrou um lançamento semelhante. Confirme apenas se este novo registro é realmente intencional.</small></span>
          <button type="button" disabled={busy} onClick={() => void save(true)}>Confirmar mesmo assim</button>
        </div> : null}
      </div>

      <footer className="mnx-editor-footer">
        <div className="mnx-editor-footer-copy"><span>{editing ? 'ALTERAÇÃO CONTROLADA' : 'GRAVAÇÃO FINANCEIRA'}</span><small>{editing ? 'A auditoria existente será preservada.' : 'A tela libera após o aceite e sincroniza em segundo plano.'}</small></div>
        <div className="mnx-editor-footer-actions">
          {editing && !transferLocked ? <button className="mnx-editor-delete" type="button" disabled={busy} onClick={() => setDeleteConfirm(true)}>Excluir</button> : null}
          <button className="mnx-editor-cancel" type="button" disabled={busy} onClick={requestClose}>Cancelar</button>
          <button className="mnx-editor-save" type="button" disabled={busy || transferLocked} onClick={() => void save(false)}>{busy ? 'Processando…' : editing ? 'Salvar alterações' : 'Confirmar lançamento'}</button>
        </div>
      </footer>
    </section>

    {closeConfirm ? <div className="mnx-editor-confirm" role="alertdialog" aria-modal="true">
      <div><span>ALTERAÇÕES NÃO SALVAS</span><h3>Descartar alterações?</h3><p>Os dados deste formulário ainda não foram gravados.</p><div><button type="button" onClick={() => setCloseConfirm(false)}>Continuar editando</button><button className="is-danger" type="button" onClick={hardClose}>Descartar</button></div></div>
    </div> : null}

    {deleteConfirm ? <div className="mnx-editor-confirm" role="alertdialog" aria-modal="true">
      <div><span>EXCLUIR LANÇAMENTO</span><h3>Confirmar exclusão?</h3><p>O lançamento sai dos saldos e da listagem, mantendo o registro de auditoria.</p><div><button type="button" disabled={busy} onClick={() => setDeleteConfirm(false)}>Cancelar</button><button className="is-danger" type="button" disabled={busy} onClick={() => void remove()}>Sim, excluir</button></div></div>
    </div> : null}
  </div>;
}
