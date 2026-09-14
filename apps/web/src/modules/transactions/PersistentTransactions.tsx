import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { normalizeEvents, type LegacyTransaction } from '@core/finance/events';
import { MEGCurrencyInput } from '@ui';
import { parseBRL } from '@shared/money';
import { readSession } from '../../app/auth-client';
import { readCloudState, patchCloudTransactions } from '../../app/app-state-client';
import { invalidateFinanceSummary } from '../../app/use-finance-summary';
import { dateInSaoPaulo } from '../../app/calendar';
import { useAppStore } from '../../app/store';
import { cardsClient, type CreditCard } from '../../app/cards-client';
import { financeClient, type Account, type Category, type FinancialEvent, type PaymentMethod } from '../../app/finance-client';
import {
  compatibleAccounts,
  compatiblePaymentMethods,
  enteredLegacyAmount,
  findSimilarTransaction,
  inferLaunchModality,
  modalityLabel,
  pickDefaultAccount,
  type LaunchModality,
} from '../../transaction-launch-flow';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const isoDate = (value: string) => String(value || '').slice(0, 10);
const amountForInput = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type EditableStatus = 'planned' | 'paid' | 'reconciled';

function situationFor(status: EditableStatus, type: 'income' | 'expense') {
  if (status === 'reconciled') return 'CONCILIADO';
  if (status === 'paid') return type === 'income' ? 'RECEBIDO' : 'PAGO';
  return 'PENDENTE';
}

async function listAllNormalizedEvents() {
  const items: FinancialEvent[] = [];
  let page = 1;
  let total = 0;
  do {
    const response = await financeClient.listEvents(page, 100);
    items.push(...response.items);
    total = response.total;
    page += 1;
  } while (items.length < total && page <= 100);
  return items;
}

export function PersistentTransactions() {
  const selectedMonth = useAppStore((state) => state.selectedMonth);
  const globalPeriodMode = useAppStore((state) => state.periodMode);
  const globalPeriodStart = useAppStore((state) => state.periodStart);
  const globalPeriodEnd = useAppStore((state) => state.periodEnd);
  const [transactions, setTransactions] = useState<LegacyTransaction[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [search, setSearch] = useState('');
  const [periodMode, setPeriodMode] = useState<'month' | 'range'>('month');
  const [startDate, setStartDate] = useState(`${selectedMonth}-01`);
  const [endDate, setEndDate] = useState(`${selectedMonth}-31`);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterGroup, setFilterGroup] = useState('all');
  const [filterAccount, setFilterAccount] = useState('all');
  const [order, setOrder] = useState<'newest' | 'oldest' | 'highest'>('newest');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => dateInSaoPaulo());
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<EditableStatus>('planned');
  const [modality, setModality] = useState<LaunchModality>('cash');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [creditCardId, setCreditCardId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const descriptionRef = useRef<HTMLInputElement>(null);
  const role = readSession()?.user.role ?? 'VIEWER';
  const canWrite = role !== 'VIEWER';
  const canArchive = role === 'ADMIN' || role === 'MANAGER';

  async function load(silent = false) {
    if (!silent) { setLoading(true); setError(''); }
    try {
      const cloud = await readCloudState();
      let normalized: FinancialEvent[] = [];
      try { normalized = await listAllNormalizedEvents(); } catch { normalized = []; }
      const byLegacyId = new Map(normalized.filter((item) => item.legacyTransactionId).map((item) => [String(item.legacyTransactionId), item]));
      setTransactions(cloud.state.transactions.map((item) => {
        const linked = byLegacyId.get(item.id);
        if (!linked) return item;
        return {
          ...item,
          financialEventId: linked.id,
          financialAccountId: item.financialAccountId || linked.accountId || undefined,
          categoryId: item.categoryId || linked.categoryId || undefined,
          paymentMethodId: item.paymentMethodId || linked.paymentMethodId || undefined,
        };
      }));
    } catch (cause) {
      if (!silent) setError(cause instanceof Error ? cause.message : 'Não foi possível ler a base financeira.');
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.all([financeClient.listAccounts(), financeClient.listCategories(), financeClient.listPaymentMethods()])
      .then(([a, c, m]) => {
        setAccounts(a.filter((x) => x.isActive));
        setCategories(c.filter((x) => x.isActive));
        setMethods(m.filter((x) => x.isActive));
      })
      .catch(() => undefined);
    void load();
  }, []);
  useEffect(() => {
    void cardsClient.list(selectedMonth)
      .then((items) => setCards(items.filter((item) => item.isActive)))
      .catch(() => setCards([]));
  }, [selectedMonth]);
  useEffect(() => {
    const open = () => openNew();
    window.addEventListener('meg:open-transaction', open);
    return () => window.removeEventListener('meg:open-transaction', open);
  }, [accounts, methods]);
  useEffect(() => {
    if (globalPeriodMode === 'range') {
      setPeriodMode('range'); setStartDate(globalPeriodStart); setEndDate(globalPeriodEnd);
    } else if (globalPeriodMode === 'month') {
      setPeriodMode('month'); setStartDate(`${selectedMonth}-01`); setEndDate(`${selectedMonth}-31`);
    }
  }, [selectedMonth, globalPeriodMode, globalPeriodStart, globalPeriodEnd]);

  const accountOptions = useMemo(() => compatibleAccounts(accounts, modality), [accounts, modality]);
  const paymentOptions = useMemo<PaymentMethod[]>(() => {
    const compatible = compatiblePaymentMethods(methods, type, modality);
    if (compatible.length) return compatible;
    if (modality === 'benefit') return [{ id: 'legacy:verocard', name: 'Verocard', type: 'other', isActive: true }];
    if (type === 'income' && modality === 'cash') return [{ id: 'legacy:pix', name: 'PIX', type: 'instant', isActive: true }];
    return compatible;
  }, [methods, type, modality]);

  useEffect(() => {
    if (!accountOptions.some((item) => item.id === accountId)) {
      setAccountId(pickDefaultAccount(accounts, modality));
    }
  }, [accountId, accountOptions, accounts, modality]);
  useEffect(() => {
    if (modality === 'credit') {
      if (paymentMethodId) setPaymentMethodId('');
      return;
    }
    if (!paymentOptions.some((item) => item.id === paymentMethodId)) {
      const preferred = type === 'income'
        ? paymentOptions.find((item) => /pix/i.test(item.name)) || paymentOptions[0]
        : paymentOptions[0];
      setPaymentMethodId(preferred?.id || '');
    }
  }, [modality, paymentMethodId, paymentOptions, type]);

  const events = useMemo(() => normalizeEvents(transactions), [transactions]);
  const groups = useMemo(() => [...new Set(events.map((x) => x.group || x.category || 'Não informado'))].sort(), [events]);
  const accountNames = useMemo(() => [...new Set(events.map((x) => x.account || 'Não informada'))].sort(), [events]);
  const filtered = useMemo(() => events.filter((item) => {
    const day = isoDate(item.date);
    const inPeriod = globalPeriodMode === 'all' ? true : periodMode === 'month' ? day.startsWith(selectedMonth) : day >= startDate && day <= endDate;
    const text = `${item.description} ${item.group || ''} ${item.category || ''} ${item.paymentMethod || ''} ${item.account || ''}`.toLowerCase();
    return inPeriod && text.includes(search.trim().toLowerCase())
      && (filterType === 'all' || item.type === filterType)
      && (filterStatus === 'all' || item.status === filterStatus || (filterStatus === 'paid' && item.status === 'reconciled'))
      && (filterGroup === 'all' || (item.group || item.category || 'Não informado') === filterGroup)
      && (filterAccount === 'all' || (item.account || 'Não informada') === filterAccount);
  }).sort((a, b) => order === 'highest' ? Math.abs(b.signedAmount) - Math.abs(a.signedAmount) : order === 'oldest' ? isoDate(a.date).localeCompare(isoDate(b.date)) : isoDate(b.date).localeCompare(isoDate(a.date))), [events, globalPeriodMode, periodMode, selectedMonth, startDate, endDate, search, filterType, filterStatus, filterGroup, filterAccount, order]);

  const totals = useMemo(() => filtered.reduce((acc, item) => {
    if (item.signedAmount >= 0) acc.income += item.signedAmount;
    else { acc.expense += Math.abs(item.signedAmount); if (item.status === 'planned') acc.pending += Math.abs(item.signedAmount); }
    return acc;
  }, { income: 0, expense: 0, pending: 0 }), [filtered]);

  function focusDescription() {
    window.setTimeout(() => descriptionRef.current?.focus(), 0);
  }

  function openNew() {
    setEditingId(null);
    setType('expense');
    setDescription('');
    setDate(dateInSaoPaulo());
    setAmount('');
    setStatus('planned');
    setModality('cash');
    setAccountId(pickDefaultAccount(accounts, 'cash'));
    setCategoryId('');
    setPaymentMethodId(methods.find((item) => !/credit|benef|aliment|verocard/i.test(`${item.name} ${item.type || ''}`))?.id || '');
    setCreditCardId('');
    setError('');
    setShowForm(true);
    focusDescription();
  }

  function closeForm() {
    if (busy) return;
    setShowForm(false);
    setEditingId(null);
  }

  function changeType(next: 'income' | 'expense') {
    setType(next);
    setCategoryId('');
    if (next === 'income') {
      if (modality === 'credit') setModality('cash');
      if (status === 'planned') setStatus('paid');
    } else if (!editingId) {
      setStatus('planned');
    }
  }

  function changeModality(next: LaunchModality) {
    setModality(next);
    setPaymentMethodId('');
    setCreditCardId('');
    setAccountId(pickDefaultAccount(accounts, next));
  }

  function openEdit(source: LegacyTransaction) {
    const nextType = source.type === 'income' || String(source.launchType || '').toUpperCase() === 'RECEITA' ? 'income' : 'expense';
    const nextModality = inferLaunchModality(source, cards);
    const nextStatus: EditableStatus = String(source.status || source.situation || '').toLowerCase().includes('concili')
      ? 'reconciled'
      : String(source.status || source.situation || '').toLowerCase().match(/paid|pago|receb/)
        ? 'paid'
        : 'planned';
    const matchingAccount = accounts.find((item) => item.id === source.financialAccountId)
      || accounts.find((item) => item.name === source.account);
    const matchingCategory = categories.find((item) => item.id === source.categoryId)
      || categories.find((item) => item.name === source.category || item.group === source.group);
    const matchingMethod = methods.find((item) => item.id === source.paymentMethodId)
      || methods.find((item) => item.name.toLowerCase() === String(source.paymentMethod || '').toLowerCase());
    const matchingCard = cards.find((item) => item.name.toLowerCase() === String(source.paymentMethod || '').toLowerCase());

    setEditingId(source.id);
    setType(nextType);
    setDescription(source.description || '');
    setDate(isoDate(source.date));
    setAmount(amountForInput(enteredLegacyAmount(source)));
    setStatus(nextType === 'income' && nextStatus === 'planned' ? 'paid' : nextStatus);
    setModality(nextModality);
    setAccountId(matchingAccount?.id || pickDefaultAccount(accounts, nextModality));
    setCategoryId(matchingCategory?.id || '');
    setPaymentMethodId(nextModality === 'credit' ? '' : matchingMethod?.id || '');
    setCreditCardId(nextModality === 'credit' ? matchingCard?.id || '' : '');
    setError('');
    setShowForm(true);
    focusDescription();
  }

  function draftPayment() {
    if (modality === 'credit') {
      const card = cards.find((item) => item.id === creditCardId);
      return { name: card?.name || '', normalizedId: null as string | null };
    }
    const method = paymentOptions.find((item) => item.id === paymentMethodId);
    return {
      name: method?.name || '',
      normalizedId: method && !method.id.startsWith('legacy:') ? method.id : null,
    };
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); if (!canWrite) return;
    const value = parseBRL(amount);
    if (!description.trim()) { setError('Informe a descrição.'); descriptionRef.current?.focus(); return; }
    if (!Number.isFinite(value) || value === 0) { setError('Informe um valor diferente de zero.'); return; }
    const account = accounts.find((item) => item.id === accountId);
    if (!account) { setError(modality === 'benefit' ? 'Cadastre ou selecione uma conta de benefícios compatível.' : 'Selecione uma conta financeira compatível.'); return; }
    const category = categories.find((item) => item.id === categoryId);
    if (!category) { setError(type === 'income' ? 'Selecione o grupo de recebimento.' : 'Selecione a classificação e o grupo.'); return; }
    const payment = draftPayment();
    if (!payment.name) { setError(modality === 'credit' ? 'Selecione o cartão de crédito.' : 'Selecione a forma de pagamento/recebimento.'); return; }

    const nextStatus: EditableStatus = type === 'income' && status === 'planned' ? 'paid' : status;
    const situation = situationFor(nextStatus, type);
    const group = category.group || category.name || (type === 'income' ? 'Recebimentos' : 'Não informado');
    const current = editingId ? transactions.find((item) => item.id === editingId) : undefined;
    const legacyId = editingId || crypto.randomUUID();
    const payload: LegacyTransaction = {
      ...(current || {}),
      id: legacyId,
      type,
      launchType: type === 'income' ? 'RECEITA' : 'DESPESA',
      date,
      dueDate: current?.dueDate || date,
      purchaseDate: current?.purchaseDate || date,
      description: description.trim(),
      amount: value,
      incomeAmount: type === 'income' ? value : 0,
      expenseAmount: type === 'expense' ? value : 0,
      status: nextStatus,
      situation,
      account: account.name,
      financialAccountId: account.id,
      category: category.name,
      categoryId: category.id,
      group,
      classification: type === 'expense' ? category.name : current?.classification,
      paymentMethod: payment.name,
      paymentMethodId: payment.normalizedId || undefined,
      modality: modalityLabel(modality),
    };

    const similar = findSimilarTransaction(transactions, payload, editingId || '');
    if (similar && !confirm(`Já existe outro lançamento semelhante: “${similar.description || 'sem descrição'}”. Deseja continuar mesmo assim?`)) return;

    const snapshot = transactions;
    setError('');
    setBusy(true);
    setTransactions((items) => editingId
      ? items.map((item) => item.id === editingId ? payload : item)
      : [...items, payload]);

    try {
      if (editingId) {
        if (!current?.financialEventId) throw new Error('A edição auditável deste lançamento ainda não está vinculada à base normalizada. Atualize a tela e tente novamente.');
        await financeClient.bulkUpdateEvents({
          ids: [current.financialEventId],
          operationId: `phoenix-edit:${crypto.randomUUID()}`,
          changes: {
            date,
            description: description.trim(),
            type,
            status: nextStatus,
            amount: value,
            accountId: account.id,
            categoryId: category.id,
            paymentMethodId: payment.normalizedId,
            legacy: {
              launchType: type === 'income' ? 'RECEITA' : 'DESPESA',
              situation,
              account: account.name,
              financialAccountId: account.id,
              category: category.name,
              categoryId: category.id,
              group,
              classification: type === 'expense' ? category.name : '',
              paymentMethod: payment.name,
              paymentMethodId: payment.normalizedId || '',
              modality: modalityLabel(modality),
              amount: value,
              incomeAmount: type === 'income' ? value : 0,
              expenseAmount: type === 'expense' ? value : 0,
            },
          },
        });
      } else {
        const { financialEventId: _financialEventId, ...newPayload } = payload;
        await patchCloudTransactions([newPayload], []);
      }
      invalidateFinanceSummary();
      setShowForm(false);
      setEditingId(null);
      setDescription('');
      setAmount('');
      void load(true);
    } catch (cause) {
      setTransactions(snapshot);
      setError(cause instanceof Error ? cause.message : 'O banco não confirmou a operação.');
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(id: string, next: 'paid' | 'reconciled') {
    const current = transactions.find((item) => item.id === id); if (!current) return;
    if (!current.financialEventId) { setError('Este lançamento ainda não está vinculado à edição auditável. Atualize a tela e tente novamente.'); return; }
    const snapshot = transactions;
    const nextSituation = situationFor(next, current.type === 'income' ? 'income' : 'expense');
    setError(''); setBusy(true);
    setTransactions((items) => items.map((item) => item.id === id ? { ...item, status: next, situation: nextSituation } : item));
    try {
      await financeClient.bulkUpdateEvents({
        ids: [current.financialEventId],
        operationId: `phoenix-status:${crypto.randomUUID()}`,
        changes: { status: next, legacy: { situation: nextSituation } },
      });
      invalidateFinanceSummary();
      void load(true);
    } catch (cause) {
      setTransactions(snapshot);
      setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar a situação.');
    } finally { setBusy(false); }
  }

  async function archive(id: string) {
    if (!canArchive) return;
    const current = transactions.find((item) => item.id === id); if (!current) return;
    if (!current.financialEventId) { setError('Este lançamento ainda não está vinculado à Lixeira auditável. Atualize a tela e tente novamente.'); return; }
    if (!confirm('Excluir este lançamento? Ele será enviado para a Lixeira auditável e poderá ser rastreado pelo histórico.')) return;
    const snapshot = transactions;
    setError(''); setBusy(true);
    setTransactions((items) => items.filter((item) => item.id !== id));
    if (editingId === id) { setShowForm(false); setEditingId(null); }
    try {
      await financeClient.bulkArchiveEvents({ ids: [current.financialEventId], operationId: `phoenix-delete:${crypto.randomUUID()}` });
      invalidateFinanceSummary();
      void load(true);
    } catch (cause) {
      setTransactions(snapshot);
      setError(cause instanceof Error ? cause.message : 'Não foi possível enviar o lançamento para a Lixeira.');
    } finally { setBusy(false); }
  }

  const clearFilters = () => { setSearch(''); setFilterType('all'); setFilterStatus('all'); setFilterGroup('all'); setFilterAccount('all'); setOrder('newest'); setPeriodMode('month'); };

  return <section id="movements" className="page meg-screen transactions-screen">
    <header className="page-head screen-heading"><div><span>LANÇAMENTOS</span><h1>Controle financeiro</h1><p>Dados carregados e confirmados diretamente na base compartilhada do MEG.</p></div></header>
    <section className="launch-kpis transaction-summary"><article><span>LANÇAMENTOS NO PERÍODO</span><strong>{filtered.length}</strong><small>Registros encontrados</small></article><article><span>RECEITAS</span><strong className="positive">{brl.format(totals.income)}</strong><small>Receitas do filtro atual</small></article><article><span>DESPESAS</span><strong className="negative">{brl.format(totals.expense)}</strong><small>Pagas e pendentes</small></article><article><span>PENDENTE</span><strong>{brl.format(totals.pending)}</strong><small>Aguardando baixa</small></article></section>
    <article className="card movement-card transaction-workspace">
      <div className="transaction-actions">
        <div className="period-switch"><button className={periodMode === 'month' ? 'active' : ''} onClick={() => setPeriodMode('month')}>Mês</button><button className={periodMode === 'range' ? 'active' : ''} onClick={() => setPeriodMode('range')}>Intervalo</button></div>
        {periodMode === 'range' && <><label>De<input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label><label>Até<input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label></>}
        <button className="secondary-button" onClick={clearFilters}>Limpar filtros</button>
        {canWrite && <button className="header-primary compact-new" onClick={() => showForm ? closeForm() : openNew()} aria-label="Novo lançamento">{showForm ? 'Fechar' : '+'}</button>}
      </div>
      {showForm && <><button className="launch-drawer-backdrop" type="button" onClick={closeForm} aria-label="Fechar lançamento"/><aside className="launch-drawer" aria-label={editingId ? 'Editar lançamento' : 'Novo lançamento'}><header><div><span>{editingId ? 'EDITAR EVENTO' : 'NOVO EVENTO'}</span><h2>{editingId ? 'Editar lançamento' : 'Lançamento'}</h2></div><button type="button" onClick={closeForm} aria-label="Fechar">×</button></header><form className="transaction-quick-form" onSubmit={submit}>
        <div className="launch-type-tabs" role="tablist"><button type="button" className={type === 'expense' ? 'active' : ''} onClick={() => changeType('expense')}>Despesa</button><button type="button" className={type === 'income' ? 'active' : ''} onClick={() => changeType('income')}>Receita</button><button type="button" disabled title="Disponível na etapa de transferências">Transferência</button></div>
        <label>Descrição *<input ref={descriptionRef} value={description} onChange={(e) => setDescription(e.target.value)} required autoComplete="off" /></label>
        <label>Modalidade *<select value={modality} onChange={(e) => changeModality(e.target.value as LaunchModality)}><option value="cash">À vista</option>{type === 'expense' && <option value="credit">Crédito</option>}<option value="benefit">Alimentação</option></select><small>A modalidade limita automaticamente as combinações compatíveis.</small></label>
        {modality === 'credit'
          ? <label>Cartão de crédito *<select value={creditCardId} onChange={(e) => setCreditCardId(e.target.value)} required><option value="">Selecione o cartão</option>{cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</select>{!cards.length && <small>Cadastre um cartão ativo na guia Cartões.</small>}</label>
          : <label>{type === 'income' ? 'Forma de recebimento *' : 'Forma de pagamento *'}<select value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)} required><option value="">Selecione</option>{paymentOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
        <label>Conta financeira *<select value={accountId} onChange={(e) => setAccountId(e.target.value)} required><option value="">Selecione</option>{accountOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{!accountOptions.length && <small>{modality === 'benefit' ? 'Nenhuma conta de benefícios compatível encontrada.' : 'Nenhuma conta monetária compatível encontrada.'}</small>}</label>
        <div className="launch-form-row"><label>Valor total *<MEGCurrencyInput value={amount} onValueChange={setAmount} allowNegative required /></label><label>Data *<input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></label></div>
        {type === 'expense' ? <label>Classificação e grupo *<select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required><option value="">Seleção da base</option>{categories.filter((item) => !item.type || item.type === 'expense').map((item) => <option key={item.id} value={item.id}>{item.name}{item.group ? ` · ${item.group}` : ''}</option>)}</select></label> : <label>Grupo de recebimento *<select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required><option value="">Selecione o grupo</option>{categories.filter((item) => item.type === 'income').map((item) => <option key={item.id} value={item.id}>{item.group || item.name}</option>)}</select><small>Configure novos grupos na guia Cadastros.</small></label>}
        <label>Situação<select value={type === 'income' && status === 'planned' ? 'paid' : status} onChange={(e) => setStatus(e.target.value as EditableStatus)}><option value="planned" disabled={type === 'income'}>Pendente</option><option value="paid">{type === 'income' ? 'Recebido' : 'Pago'}</option><option value="reconciled">Conciliado</option></select></label>
        <div className="launch-preview"><div><span>Modalidade</span><strong>{modalityLabel(modality)}</strong></div><div><span>Situação</span><strong>{status === 'reconciled' ? 'Conciliado' : type === 'income' || status === 'paid' ? type === 'income' ? 'Recebido' : 'Pago' : 'Pendente'}</strong></div><div><span>Sincronização</span><strong>{editingId ? 'Edição auditável' : 'Confirmação obrigatória'}</strong></div></div>
        <div className="launch-form-actions">{editingId && canArchive && <button type="button" className="secondary-button launch-delete" onClick={() => void archive(editingId)} disabled={busy}>Excluir lançamento</button>}<button className="auth-submit" disabled={busy}>{busy ? 'Confirmando na base...' : editingId ? 'Salvar alterações' : 'Confirmar e sincronizar'}</button></div>
      </form></aside></>}
      {error && <div className="notice danger">{error}</div>}
      <div className="launch-toolbar transaction-filter-panel"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar descrição, grupo, conta ou pagamento"/><select value={filterType} onChange={(e) => setFilterType(e.target.value)}><option value="all">Todos os tipos</option><option value="income">Receitas</option><option value="expense">Despesas</option></select><select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}><option value="all">Todas as situações</option><option value="planned">Pendentes</option><option value="paid">Pagos/recebidos</option><option value="reconciled">Conciliados</option></select><select value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)}><option value="all">Todos os grupos</option>{groups.map((item) => <option key={item}>{item}</option>)}</select><select value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)}><option value="all">Todas as contas</option>{accountNames.map((item) => <option key={item}>{item}</option>)}</select><select value={order} onChange={(e) => setOrder(e.target.value as typeof order)}><option value="newest">Mais recentes</option><option value="oldest">Mais antigos</option><option value="highest">Maior valor</option></select></div>
      <div className="transaction-grid-scroll fixed-grid"><div className="transaction-grid"><div className="transaction-grid-head"><span>Vencimento</span><span>Data da compra</span><span>Dia</span><span>Tipo</span><span>Descrição</span><span>Receita</span><span>Classificação</span><span>Grupo</span><span>Conta</span><span>Despesa</span><span>Forma de pagamento</span><span>Situação</span><span>Detalhes</span></div>{filtered.map((item) => { const source = transactions.find((entry) => entry.id === item.id); const purchaseDate = isoDate(source?.purchaseDate || source?.date || item.date); const dueDate = isoDate(source?.dueDate || source?.date || item.date); return <article className="transaction-grid-row" key={item.id}><time>{new Date(`${dueDate}T12:00:00`).toLocaleDateString('pt-BR')}</time><time>{new Date(`${purchaseDate}T12:00:00`).toLocaleDateString('pt-BR')}</time><span>{new Date(`${purchaseDate}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short' })}</span><span className={`transaction-kind ${item.type}`}>{item.type === 'income' ? 'Receita' : 'Despesa'}</span><div className="transaction-description"><strong>{item.description}</strong>{item.notes && <small>{item.notes}</small>}</div><strong className="positive">{item.type === 'income' ? brl.format(item.amount) : '—'}</strong><span>{item.type === 'income' ? 'Não se aplica' : source?.classification || item.category || 'Não informada'}</span><span>{item.group || item.category || 'Não informado'}</span><span>{item.account || 'Não informada'}</span><strong className="negative">{item.type === 'expense' ? brl.format(item.amount) : '—'}</strong><span>{item.paymentMethod || 'Não informado'}</span><span className={`status-pill ${item.status !== 'planned' ? 'active' : ''}`}>{item.status === 'planned' ? 'Pendente' : item.status === 'paid' ? item.type === 'income' ? 'Recebido' : 'Pago' : 'Conciliado'}</span><div className="table-actions">{canWrite && source && <button onClick={() => openEdit(source)} disabled={busy}>Editar</button>}{item.status === 'planned' && canWrite && <button onClick={() => void changeStatus(item.id, 'paid')} disabled={busy}>Baixar</button>}{item.status === 'paid' && canWrite && <button onClick={() => void changeStatus(item.id, 'reconciled')} disabled={busy}>Conciliar</button>}{canArchive && <button className="danger" onClick={() => void archive(item.id)} disabled={busy}>Excluir</button>}</div></article>; })}{loading && <p className="catalog-empty">Carregando dados da base...</p>}{!loading && !filtered.length && <p className="catalog-empty">Nenhum lançamento encontrado para os filtros aplicados.</p>}</div></div>
    </article>
  </section>;
}
