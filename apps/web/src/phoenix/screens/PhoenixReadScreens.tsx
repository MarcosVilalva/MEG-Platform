import { useEffect, useMemo, useState } from 'react';
import type { Payable } from '../../app/payables-client';
import type { PhoenixReadModel } from '../contracts';
import {
  PHOENIX_PENDING_WRITE_ENABLED,
  preparePhoenixPendingSettlement,
  runPhoenixPendingSettlement,
  type PreparedPhoenixPendingSettlement,
  type PhoenixPendingWriteState,
} from '../data/phoenix-pending-write-gateway';
import '../phoenix-screens.css';
import '../phoenix-pending-write.css';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });

type Priority = 'all' | 'overdue' | 'today' | 'upcoming';
type PendingItem = {
  id: string;
  sourceId: string;
  source: 'payable' | 'event';
  description: string;
  dueDate: string;
  openAmount: number;
  installmentNo: number;
  installmentQty: number;
  categoryName: string;
  group: string;
  paymentMethod: string;
  modality: string;
  accountId?: string | null;
  paymentMethodId?: string | null;
};

function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('pt-BR');
}

function isoDay(value: string | Date) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
}

function todaySaoPaulo() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const read = (type: string) => parts.find((item) => item.type === type)?.value || '';
  return `${read('year')}-${read('month')}-${read('day')}`;
}

function installmentFromDescription(description: string) {
  const match = description.match(/(?:^|\s)(\d+)\s*\/\s*(\d+)\s*$/);
  if (!match) return { no: 1, qty: 1 };
  return { no: Number(match[1]) || 1, qty: Number(match[2]) || 1 };
}

function payableItem(item: Payable): PendingItem {
  return {
    id: `payable-${item.id}`,
    sourceId: item.id,
    source: 'payable',
    description: item.description,
    dueDate: isoDay(item.dueDate),
    openAmount: Number(item.openAmount || 0),
    installmentNo: item.installmentNo || 1,
    installmentQty: item.installmentQty || 1,
    categoryName: item.category?.group || item.category?.name || 'Sem classificação',
    group: item.category?.name || 'Sem grupo',
    paymentMethod: 'Não informada',
    modality: '—'
  };
}

function eventItems(data: PhoenixReadModel): PendingItem[] {
  return data.events.items
    .filter((event) => event.competence === data.month)
    .filter((event) => event.type === 'expense' && event.status === 'planned')
    .filter((event) => normalize(event.account?.type) !== 'benefit')
    .filter((event) => !normalize(`${event.paymentMethod?.name || ''} ${event.sourceDetails?.paymentMethod || ''} ${event.description}`).includes('verocard'))
    .map((event) => {
      const installment = installmentFromDescription(event.description);
      return {
        id: `event-${event.id}`,
        sourceId: event.id,
        source: 'event' as const,
        description: event.description,
        dueDate: isoDay(event.date),
        openAmount: -Number(event.signedAmount || 0),
        installmentNo: installment.no,
        installmentQty: installment.qty,
        categoryName: event.sourceDetails?.expenseClass || event.category?.group || event.category?.name || 'Sem classificação',
        group: event.sourceDetails?.group || event.category?.name || 'Sem grupo',
        paymentMethod: event.sourceDetails?.paymentMethod || event.paymentMethod?.name || 'Não informada',
        modality: event.sourceDetails?.modality || '—',
        accountId: event.accountId,
        paymentMethodId: event.paymentMethodId,
      };
    });
}

function signature(item: PendingItem) {
  return `${normalize(item.description)}|${item.dueDate}|${Math.abs(item.openAmount).toFixed(2)}`;
}

export function PhoenixPayables({ data }: { data: PhoenixReadModel }) {
  const [model, setModel] = useState(data);
  const today = todaySaoPaulo();
  const [priority, setPriority] = useState<Priority>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [detailItem, setDetailItem] = useState<PendingItem | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [paidAt, setPaidAt] = useState(today);
  const [accountId, setAccountId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [prepared, setPrepared] = useState<PreparedPhoenixPendingSettlement | null>(null);
  const [writeState, setWriteState] = useState<PhoenixPendingWriteState>({ status: 'idle' });
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    setModel(data);
  }, [data]);

  const open = useMemo(() => {
    const official = model.payables
      .filter((item) => !['paid', 'cancelled'].includes(item.status) && Number(item.openAmount) > 0)
      .map(payableItem);
    const seen = new Set(official.map(signature));
    const compatibility = eventItems(model).filter((item) => {
      const key = signature(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return [...official, ...compatibility].sort((left, right) => left.dueDate.localeCompare(right.dueDate) || left.description.localeCompare(right.description, 'pt-BR'));
  }, [model]);

  const actionable = open.filter((item) => item.openAmount > 0);
  const overdue = actionable.filter((item) => item.dueDate < today);
  const dueToday = actionable.filter((item) => item.dueDate === today);
  const upcoming = actionable.filter((item) => item.dueDate > today);
  const total = open.reduce((sum, item) => sum + item.openAmount, 0);

  const visible = useMemo(() => open.filter((item) => {
    const actionableItem = item.openAmount > 0;
    const matchesPriority = priority === 'all'
      || (priority === 'overdue' && actionableItem && item.dueDate < today)
      || (priority === 'today' && actionableItem && item.dueDate === today)
      || (priority === 'upcoming' && actionableItem && item.dueDate > today);
    const haystack = normalize(`${item.description} ${item.categoryName} ${item.group} ${item.paymentMethod} ${item.modality}`);
    return matchesPriority && haystack.includes(normalize(search));
  }), [open, priority, search, today]);

  const grouped = visible.reduce<Record<string, PendingItem[]>>((acc, item) => {
    (acc[item.group] ||= []).push(item);
    return acc;
  }, {});

  const selectedItems = actionable.filter((item) => selected.has(item.id));
  const selectedTotal = selectedItems.reduce((sum, item) => sum + item.openAmount, 0);
  const selectedItem = selectedItems.length === 1 ? selectedItems[0] : null;
  const available = model.summary.availableBalance + model.summary.realizedResult;
  const compatibilityCount = open.filter((item) => item.source === 'event').length;
  const adjustmentCount = open.filter((item) => item.openAmount < 0).length;
  const activeAccounts = model.accounts.filter((item) => item.isActive && !['benefit', 'credit'].includes(normalize(item.type)));
  const activeMethods = model.paymentMethods.filter((item) => item.isActive);
  const canWrite = PHOENIX_PENDING_WRITE_ENABLED && ['ADMIN', 'MANAGER', 'OPERATOR'].includes(model.user.role);
  const saving = writeState.status === 'saving';

  function resetPrepared() {
    setPrepared(null);
    if (writeState.status !== 'saving') setWriteState({ status: 'idle' });
  }

  function toggle(id: string) {
    setSuccessMessage('');
    resetPrepared();
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    if (saving) return;
    setSelected(new Set());
    setReviewOpen(false);
    setPrepared(null);
    setWriteState({ status: 'idle' });
  }

  function suggestedAccount(item: PendingItem | null) {
    if (item?.accountId && activeAccounts.some((account) => account.id === item.accountId)) return item.accountId;
    return activeAccounts[0]?.id || '';
  }

  function suggestedMethod(item: PendingItem | null) {
    if (item?.paymentMethodId && activeMethods.some((method) => method.id === item.paymentMethodId)) return item.paymentMethodId;
    if (!item) return '';
    const wanted = normalize(item.paymentMethod);
    return activeMethods.find((method) => normalize(method.name) === wanted)?.id || '';
  }

  function openReview() {
    setSuccessMessage('');
    setPaidAt(today);
    setAccountId(suggestedAccount(selectedItem));
    setPaymentMethodId(suggestedMethod(selectedItem));
    setWriteState({ status: 'idle' });
    setPrepared(null);
    setReviewOpen(true);
  }

  function updatePaidAt(value: string) {
    setPaidAt(value);
    resetPrepared();
  }

  function updateAccount(value: string) {
    setAccountId(value);
    resetPrepared();
  }

  function updatePaymentMethod(value: string) {
    setPaymentMethodId(value);
    resetPrepared();
  }

  async function confirmSettlement() {
    if (!selectedItem || saving || !canWrite) return;
    const account = activeAccounts.find((item) => item.id === accountId);
    const method = activeMethods.find((item) => item.id === paymentMethodId);
    if (!account || !method || !paidAt) {
      setWriteState({ status: 'error', operationId: prepared?.operationId || '', code: 'PHOENIX_PENDING_FORM_INCOMPLETE', message: 'Informe data, conta e forma de pagamento antes de confirmar.' });
      return;
    }

    const confirmed = window.confirm(
      `CONFIRMAR BAIXA REAL\n\n${selectedItem.description}\nValor: ${money.format(selectedItem.openAmount)}\nVencimento: ${date.format(new Date(`${selectedItem.dueDate}T12:00:00Z`))}\nData da baixa: ${date.format(new Date(`${paidAt}T12:00:00Z`))}\nConta: ${account.name}\nForma: ${method.name}\n\nDeseja registrar esta baixa?`
    );
    if (!confirmed) return;

    try {
      const nextPrepared = preparePhoenixPendingSettlement({
        source: selectedItem.source,
        sourceId: selectedItem.sourceId,
        amount: selectedItem.openAmount,
        paidAt,
        accountId,
        paymentMethodId,
      }, prepared);
      setPrepared(nextPrepared);
      const result = await runPhoenixPendingSettlement(nextPrepared, model.month, setWriteState);
      if (result.status !== 'confirmed') return;

      setModel(result.snapshot);
      setSelected(new Set());
      setReviewOpen(false);
      setPrepared(null);
      setSuccessMessage(`${selectedItem.description} baixado em ${date.format(new Date(`${paidAt}T12:00:00Z`))} por ${method.name}.`);
      window.dispatchEvent(new Event('focus'));
    } catch (error) {
      setWriteState({
        status: 'error',
        operationId: prepared?.operationId || '',
        code: error instanceof Error ? error.message : 'PHOENIX_PENDING_WRITE_FAILED',
        message: 'Não foi possível preparar a baixa. Revise os dados e tente novamente.'
      });
    }
  }

  return <section className="px-screen">
    <header className="px-screen-head">
      <div><span className="px-kicker">Pendentes</span><h1>Prioridades e compromissos</h1><p>Organize os compromissos e confirme baixas reais com validação de conta, forma de pagamento, idempotência e auditoria.</p></div>
      <div className="px-screen-head-aside"><span className="px-total-pill">{money.format(total)} pendente</span></div>
    </header>

    {successMessage ? <div className="px-pending-write-banner" role="status"><strong>Baixa confirmada</strong><span>{successMessage}</span></div> : null}

    <section className="px-screen-kpis">
      <article><span>Total pendente líquido</span><strong>{money.format(total)}</strong><small>{actionable.length} compromisso(s){adjustmentCount ? ` · ${adjustmentCount} ajuste(s)` : ''}</small></article>
      <article className="danger"><span>Vencidos</span><strong>{overdue.length}</strong><small>Prioridade máxima</small></article>
      <article className="warn"><span>Vencem hoje</span><strong>{dueToday.length}</strong><small>Ação imediata</small></article>
      <article><span>Próximos vencimentos</span><strong>{upcoming.length}</strong><small>Agenda ativa</small></article>
    </section>

    <div className="px-priority-tabs">{([['all','Todos'],['overdue','Vencidos'],['today','Hoje'],['upcoming','Próximos']] as const).map(([id,label]) => <button key={id} type="button" className={priority === id ? 'active' : ''} onClick={() => setPriority(id)}>{label}</button>)}</div>

    <div className="px-pending-layout">
      <section className="px-card px-pending-list">
        <div className="px-toolbar">
          <label className="px-search-field"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar compromisso, grupo ou forma de pagamento" /></label>
          <span className="px-toolbar-note">{visible.length} de {open.length} exibido(s)</span>
        </div>
        {selectedItems.length ? <div className="px-bulk-action-bar"><div><strong>{selectedItems.length} conta(s) selecionada(s)</strong><span>Total {money.format(selectedTotal)} · saldo após baixa {money.format(available - selectedTotal)}</span></div><button type="button" onClick={clearSelection}>Limpar</button><button type="button" className="primary" disabled={selectedTotal > available} onClick={openReview}>Revisar baixa</button></div> : null}
        {compatibilityCount > 0 ? <div className="px-history-source-note"><strong>Leitura consolidada:</strong> o MEG escolhe automaticamente o writer correto: domínio novo de Contas a Pagar ou baixa compatível do FinancialEvent legado. Estornos continuam fora da baixa.</div> : null}
        {Object.entries(grouped).map(([group, items]) => <section className="px-pending-group" key={group}>
          <header><div><strong>{group}</strong><small>{items.length} item(ns)</small></div><strong>{money.format(items.reduce((sum, item) => sum + item.openAmount, 0))}</strong></header>
          {items.map((item) => {
            const adjustment = item.openAmount < 0;
            const late = adjustment ? 0 : item.dueDate < today ? Math.max(1, Math.floor((new Date(`${today}T12:00:00Z`).getTime() - new Date(`${item.dueDate}T12:00:00Z`).getTime()) / 86400000)) : 0;
            const credit = normalize(item.modality).includes('credito') || normalize(item.paymentMethod).includes('cartao');
            return <div className={`px-pending-row ${adjustment ? 'is-adjustment' : ''}`} key={item.id}>
              <input type="checkbox" aria-label={`Selecionar ${item.description}`} disabled={adjustment || saving} checked={!adjustment && selected.has(item.id)} onChange={() => toggle(item.id)} />
              <div className="px-pending-date"><strong>{date.format(new Date(`${item.dueDate}T12:00:00Z`))}</strong><small>{adjustment ? 'Ajuste de estorno' : late ? `${late} dia(s) em atraso` : item.dueDate === today ? 'Vence hoje' : 'Programado'}</small></div>
              <div className="px-pending-copy"><strong>{item.description}</strong><small>{item.installmentQty > 1 ? `Parcela ${item.installmentNo}/${item.installmentQty}` : 'Pagamento único'} · {item.categoryName} · {item.paymentMethod}</small></div>
              <strong className={`px-pending-amount ${adjustment ? 'positive' : ''}`}>{money.format(item.openAmount)}</strong>
              <span className={`px-status ${adjustment ? 'reconciled' : late ? 'overdue' : 'planned'}`}>{adjustment ? 'ESTORNO' : credit ? 'CARTÃO' : late ? 'VENCIDO' : 'PENDENTE'}</span>
              <button type="button" className="px-detail-btn" aria-label={`Detalhes de ${item.description}`} onClick={() => setDetailItem(item)}>↘</button>
            </div>;
          })}
        </section>)}
        {!visible.length ? <p className="px-empty">Nenhum compromisso corresponde ao filtro.</p> : null}
      </section>

      <aside className="px-card px-payment-summary">
        <div className="px-panel-head"><div><span>Baixa protegida</span><h2>Seleção atual</h2></div><span className={`px-status ${canWrite ? 'reconciled' : 'planned'}`}>{canWrite ? 'ATIVA' : 'LEITURA'}</span></div>
        <dl>
          <div><dt>Saldo monetário disponível</dt><dd>{money.format(available)}</dd></div>
          <div><dt>Total pendente líquido</dt><dd>{money.format(total)}</dd></div>
          <div><dt>Itens selecionados</dt><dd>{selectedItems.length}</dd></div>
          <div><dt>Valor selecionado</dt><dd>{money.format(selectedTotal)}</dd></div>
          <div className="emphasis"><dt>Saldo previsto após a baixa</dt><dd>{money.format(available - selectedTotal)}</dd></div>
        </dl>
        <div className={`px-protection-note ${selectedTotal > available ? 'danger' : ''}`}>{selectedTotal > available ? 'A seleção ultrapassa o saldo monetário disponível. A baixa permanece bloqueada.' : selectedItems.length > 1 ? 'A seleção múltipla continua disponível para análise. Nesta primeira liberação do writer, a confirmação real é feita uma conta por vez para evitar baixa parcial em lote.' : canWrite ? 'Selecione uma conta, revise data, conta financeira e forma de pagamento e confirme a baixa.' : 'Seu perfil está em modo de leitura para este fluxo.'}</div>
        <button className="px-primary-action" type="button" disabled={!selectedItems.length || selectedTotal > available} onClick={openReview}>Revisar e confirmar baixa</button>
        <small className="px-readonly-hint">A gravação real exige exatamente um compromisso por confirmação nesta fase.</small>
      </aside>
    </div>

    {detailItem ? <div className="px-pending-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetailItem(null); }}><aside className="px-pending-drawer" role="dialog" aria-modal="true" aria-label={`Detalhes de ${detailItem.description}`}><header><div><span className="px-kicker">Detalhes do compromisso</span><h2>{detailItem.description}</h2><p>{date.format(new Date(`${detailItem.dueDate}T12:00:00Z`))}</p></div><button type="button" aria-label="Fechar" onClick={() => setDetailItem(null)}>×</button></header><dl><div><dt>Valor</dt><dd>{money.format(detailItem.openAmount)}</dd></div><div><dt>Classificação</dt><dd>{detailItem.categoryName}</dd></div><div><dt>Grupo</dt><dd>{detailItem.group}</dd></div><div><dt>Forma prevista</dt><dd>{detailItem.paymentMethod}</dd></div><div><dt>Modalidade</dt><dd>{detailItem.modality}</dd></div><div><dt>Parcela</dt><dd>{detailItem.installmentQty > 1 ? `${detailItem.installmentNo}/${detailItem.installmentQty}` : 'Pagamento único'}</dd></div></dl><footer><button type="button" className="px-secondary-action" onClick={() => setDetailItem(null)}>Fechar</button><button type="button" className="px-primary-action" onClick={() => { toggle(detailItem.id); setDetailItem(null); }}>{selected.has(detailItem.id) ? 'Remover da baixa' : 'Selecionar para baixa'}</button></footer></aside></div> : null}

    {reviewOpen ? <div className="px-pending-overlay" role="presentation" onMouseDown={(event) => { if (!saving && event.target === event.currentTarget) setReviewOpen(false); }}><aside className="px-pending-drawer px-pending-review" role="dialog" aria-modal="true" aria-label="Revisar baixa"><header><div><span className="px-kicker">Baixa protegida</span><h2>{selectedItems.length === 1 ? `Revisar ${selectedItems[0].description}` : `Revisar ${selectedItems.length} conta(s)`}</h2><p>Confirme os dados efetivos do pagamento antes de gravar.</p></div><button type="button" aria-label="Fechar" disabled={saving} onClick={() => setReviewOpen(false)}>×</button></header><div className="px-pending-review-list">{selectedItems.map((item) => <div key={item.id}><span><strong>{item.description}</strong><small>{date.format(new Date(`${item.dueDate}T12:00:00Z`))} · previsto: {item.paymentMethod}</small></span><strong>{money.format(item.openAmount)}</strong></div>)}</div><dl><div><dt>Total selecionado</dt><dd>{money.format(selectedTotal)}</dd></div><div><dt>Saldo antes</dt><dd>{money.format(available)}</dd></div><div><dt>Saldo depois</dt><dd>{money.format(available - selectedTotal)}</dd></div></dl><div className="px-pending-payment-fields"><label><span>Data da baixa</span><input type="date" value={paidAt} max={today} disabled={saving} onChange={(event) => updatePaidAt(event.target.value)} /></label><label><span>Conta financeira</span><select value={accountId} disabled={saving} onChange={(event) => updateAccount(event.target.value)}><option value="">Selecione</option>{activeAccounts.map((account) => <option value={account.id} key={account.id}>{account.name}</option>)}</select></label><label><span>Forma de pagamento</span><select value={paymentMethodId} disabled={saving} onChange={(event) => updatePaymentMethod(event.target.value)}><option value="">Selecione</option>{activeMethods.map((method) => <option value={method.id} key={method.id}>{method.name}</option>)}</select></label></div>{selectedItems.length > 1 ? <div className="px-pending-write-warning"><strong>Baixa em lote ainda protegida.</strong><span>Remova itens até restar apenas uma conta. O próximo gate será um endpoint atômico de lote.</span></div> : null}{writeState.status === 'error' ? <div className="px-pending-write-error" role="alert"><strong>Baixa não confirmada</strong><span>{writeState.message}</span></div> : null}<footer><button type="button" className="px-secondary-action" disabled={saving} onClick={() => setReviewOpen(false)}>Voltar</button><button type="button" className="px-primary-action" disabled={!canWrite || saving || selectedItems.length !== 1 || !paidAt || !accountId || !paymentMethodId || selectedTotal > available} onClick={() => { void confirmSettlement(); }}>{saving ? 'Confirmando no servidor…' : 'Confirmar baixa real'}</button><small>{selectedItems.length === 1 ? 'O botão só conclui após confirmação do servidor. Reenvios usam o mesmo operationId enquanto os dados não mudarem.' : 'Para segurança financeira, esta fase grava uma baixa por vez.'}</small></footer></aside></div> : null}
  </section>;
}
