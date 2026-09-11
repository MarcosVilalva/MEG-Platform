import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { normalizeEvents, type LegacyTransaction } from '@core/finance/events';
import { MEGCurrencyInput } from '@ui';
import { parseBRL } from '@shared/money';
import { readSession } from '../../app/auth-client';
import { readCloudState, patchCloudTransactions } from '../../app/app-state-client';
import { invalidateFinanceSummary } from '../../app/use-finance-summary';
import { dateInSaoPaulo } from '../../app/calendar';
import { useAppStore } from '../../app/store';
import { financeClient, type Account, type Category, type PaymentMethod } from '../../app/finance-client';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const isoDate = (value: string) => String(value || '').slice(0, 10);

export function PersistentTransactions() {
  const selectedMonth = useAppStore((state) => state.selectedMonth);
  const globalPeriodMode = useAppStore((state) => state.periodMode);
  const globalPeriodStart = useAppStore((state) => state.periodStart);
  const globalPeriodEnd = useAppStore((state) => state.periodEnd);
  const [transactions, setTransactions] = useState<LegacyTransaction[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
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
  const [status, setStatus] = useState<'planned' | 'paid'>('planned');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const descriptionRef = useRef<HTMLInputElement>(null);
  const role = readSession()?.user.role ?? 'VIEWER';
  const canWrite = role !== 'VIEWER';
  const canArchive = role === 'ADMIN' || role === 'MANAGER';

  async function load() {
    setLoading(true); setError('');
    try { setTransactions((await readCloudState()).state.transactions); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível ler a base financeira.'); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    void Promise.all([financeClient.listAccounts(), financeClient.listCategories(), financeClient.listPaymentMethods()])
      .then(([a, c, m]) => { setAccounts(a.filter((x) => x.isActive)); setCategories(c.filter((x) => x.isActive)); setMethods(m.filter((x) => x.isActive)); })
      .catch(() => undefined);
    void load();
  }, []);
  useEffect(() => {
    const open = () => { setShowForm(true); window.setTimeout(() => descriptionRef.current?.focus(), 0); };
    window.addEventListener('meg:open-transaction', open);
    return () => window.removeEventListener('meg:open-transaction', open);
  }, []);
  useEffect(() => {
    if (globalPeriodMode === 'range') {
      setPeriodMode('range'); setStartDate(globalPeriodStart); setEndDate(globalPeriodEnd);
    } else if (globalPeriodMode === 'month') {
      setPeriodMode('month'); setStartDate(`${selectedMonth}-01`); setEndDate(`${selectedMonth}-31`);
    }
  }, [selectedMonth, globalPeriodMode, globalPeriodStart, globalPeriodEnd]);
  useEffect(() => {
    setCategoryId('');
    if (type === 'income') {
      const pix = methods.find((item) => /pix/i.test(item.name));
      setPaymentMethodId(pix?.id || '');
      setStatus('paid');
    }
  }, [type, methods]);

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

  async function save(upserts: LegacyTransaction[], deletes: string[] = []) {
    setBusy(true); setError('');
    try { await patchCloudTransactions(upserts, deletes); invalidateFinanceSummary(); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'O banco não confirmou a operação.'); }
    finally { setBusy(false); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); if (!canWrite) return;
    const value = parseBRL(amount);
    if (!description.trim()) { setError('Informe a descrição.'); descriptionRef.current?.focus(); return; }
    if (!Number.isFinite(value) || value === 0) { setError('Informe um valor diferente de zero.'); return; }
    const account = accounts.find((x) => x.id === accountId)?.name || 'Não informada';
    const category = categories.find((x) => x.id === categoryId);
    const paymentMethod = methods.find((x) => x.id === paymentMethodId)?.name || (type === 'income' ? 'PIX' : 'Não informado');
    const payload: LegacyTransaction = { id: crypto.randomUUID(), type, launchType: type === 'income' ? 'RECEITA' : 'DESPESA', date, description: description.trim(), amount: value, incomeAmount: type === 'income' ? value : undefined, expenseAmount: type === 'expense' ? value : undefined, status: type === 'income' ? 'paid' : status, situation: type === 'income' ? 'PAGO' : status === 'paid' ? 'PAGO' : 'PENDENTE', account, category: category?.name || '', group: category?.group || category?.name || (type === 'income' ? 'Recebimentos' : 'Não informado'), paymentMethod };
    await save([payload]); setDescription(''); setAmount(''); setShowForm(false);
  }

  async function changeStatus(id: string, next: 'paid' | 'reconciled') {
    const current = transactions.find((item) => item.id === id); if (!current) return;
    await save([{ ...current, status: next, situation: next === 'paid' ? 'PAGO' : 'CONCILIADO' }]);
  }
  async function archive(id: string) { if (canArchive && confirm('Arquivar este lançamento?')) await save([], [id]); }
  const clearFilters = () => { setSearch(''); setFilterType('all'); setFilterStatus('all'); setFilterGroup('all'); setFilterAccount('all'); setOrder('newest'); setPeriodMode('month'); };

  return <section className="meg-screen transactions-screen">
    <header className="screen-heading"><div><span>LANÇAMENTOS</span><h1>Controle financeiro</h1><p>Dados carregados e confirmados diretamente na base compartilhada do MEG.</p></div></header>
    <section className="transaction-summary"><article><span>LANÇAMENTOS NO PERÍODO</span><strong>{filtered.length}</strong><small>Registros encontrados</small></article><article><span>RECEITAS</span><strong className="positive">{brl.format(totals.income)}</strong><small>Receitas do filtro atual</small></article><article><span>DESPESAS</span><strong className="negative">{brl.format(totals.expense)}</strong><small>Pagas e pendentes</small></article><article><span>PENDENTE</span><strong>{brl.format(totals.pending)}</strong><small>Aguardando baixa</small></article></section>
    <div className="transaction-workspace">
      <div className="transaction-actions">
        <div className="period-switch"><button className={periodMode === 'month' ? 'active' : ''} onClick={() => setPeriodMode('month')}>Mês</button><button className={periodMode === 'range' ? 'active' : ''} onClick={() => setPeriodMode('range')}>Intervalo</button></div>
        {periodMode === 'range' && <><label>De<input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label><label>Até<input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label></>}
        <button className="secondary-button" onClick={clearFilters}>Limpar filtros</button>
        {canWrite && <button className="header-primary compact-new" onClick={() => setShowForm((value) => !value)} aria-label="Novo lançamento">{showForm ? 'Fechar' : '+'}</button>}
      </div>
      {showForm && <><button className="launch-drawer-backdrop" type="button" onClick={() => setShowForm(false)} aria-label="Fechar novo lançamento"/><aside className="launch-drawer" aria-label="Novo lançamento"><header><div><span>NOVO EVENTO</span><h2>Lançamento</h2></div><button type="button" onClick={() => setShowForm(false)} aria-label="Fechar">×</button></header><form className="transaction-quick-form" onSubmit={submit}>
        <div className="launch-type-tabs" role="tablist"><button type="button" className={type === 'expense' ? 'active' : ''} onClick={() => { setType('expense'); setStatus('planned'); }}>Despesa</button><button type="button" className={type === 'income' ? 'active' : ''} onClick={() => setType('income')}>Receita</button><button type="button" disabled title="Disponível na etapa de transferências">Transferência</button></div>
        <label>Descrição *<input ref={descriptionRef} value={description} onChange={(e) => setDescription(e.target.value)} required autoComplete="off" /></label>
        <label>Conta financeira *<select value={accountId} onChange={(e) => setAccountId(e.target.value)} required><option value="">Selecione</option>{accounts.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <div className="launch-form-row"><label>Valor total *<MEGCurrencyInput value={amount} onValueChange={setAmount} allowNegative required /></label><label>Data *<input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></label></div>
        {type === 'expense' ? <label>Classificação e grupo *<select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required><option value="">Seleção da base</option>{categories.filter((x) => !x.type || x.type === 'expense').map((x) => <option key={x.id} value={x.id}>{x.name}{x.group ? ` · ${x.group}` : ''}</option>)}</select></label> : <label>Grupo de recebimento *<select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required><option value="">Selecione o grupo</option>{categories.filter((x) => x.type === 'income').map((x) => <option key={x.id} value={x.id}>{x.group || x.name}</option>)}</select><small>Configure novos grupos na guia Cadastros.</small></label>}
        <div className="launch-form-row"><label>Forma de pagamento *<select value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)} required={type === 'expense'}><option value="">{type === 'income' ? 'Pix, dinheiro ou depósito' : 'Selecione'}</option>{methods.filter((x) => type === 'expense' || /pix|dinheiro|dep[oó]sito/i.test(x.name)).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Situação<select value={type === 'income' ? 'paid' : status} onChange={(e) => setStatus(e.target.value as 'planned' | 'paid')} disabled={type === 'income'}><option value="planned">Pendente</option><option value="paid">{type === 'income' ? 'Recebido' : 'Pago'}</option></select></label></div>
        <div className="launch-preview"><div><span>Tipo</span><strong>{type === 'income' ? 'Receita' : 'Despesa'}</strong></div><div><span>Situação inicial</span><strong>{type === 'income' ? 'Recebido' : status === 'paid' ? 'Pago' : 'Pendente'}</strong></div><div><span>Sincronização</span><strong>Confirmação obrigatória</strong></div></div>
        <button className="auth-submit" disabled={busy}>{busy ? 'Confirmando na base...' : 'Confirmar e sincronizar'}</button>
      </form></aside></>}
      {error && <div className="notice danger">{error}</div>}
      <div className="transaction-filter-panel"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar descrição, grupo, conta ou pagamento"/><select value={filterType} onChange={(e) => setFilterType(e.target.value)}><option value="all">Todos os tipos</option><option value="income">Receitas</option><option value="expense">Despesas</option></select><select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}><option value="all">Todas as situações</option><option value="planned">Pendentes</option><option value="paid">Pagos/recebidos</option><option value="reconciled">Conciliados</option></select><select value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)}><option value="all">Todos os grupos</option>{groups.map((x) => <option key={x}>{x}</option>)}</select><select value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)}><option value="all">Todas as contas</option>{accountNames.map((x) => <option key={x}>{x}</option>)}</select><select value={order} onChange={(e) => setOrder(e.target.value as typeof order)}><option value="newest">Mais recentes</option><option value="oldest">Mais antigos</option><option value="highest">Maior valor</option></select></div>
      <div className="transaction-grid-scroll fixed-grid"><div className="transaction-grid"><div className="transaction-grid-head"><span>Vencimento</span><span>Data da compra</span><span>Dia</span><span>Tipo</span><span>Descrição</span><span>Receita</span><span>Classificação</span><span>Grupo</span><span>Conta</span><span>Despesa</span><span>Forma de pagamento</span><span>Situação</span><span>Detalhes</span></div>{filtered.map((item) => { const source = transactions.find((entry) => entry.id === item.id); const purchaseDate = isoDate(source?.purchaseDate || source?.date || item.date); const dueDate = isoDate(source?.dueDate || source?.date || item.date); return <article className="transaction-grid-row" key={item.id}><time>{new Date(`${dueDate}T12:00:00`).toLocaleDateString('pt-BR')}</time><time>{new Date(`${purchaseDate}T12:00:00`).toLocaleDateString('pt-BR')}</time><span>{new Date(`${purchaseDate}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short' })}</span><span className={`transaction-kind ${item.type}`}>{item.type === 'income' ? 'Receita' : 'Despesa'}</span><div className="transaction-description"><strong>{item.description}</strong>{item.notes && <small>{item.notes}</small>}</div><strong className="positive">{item.type === 'income' ? brl.format(item.amount) : '—'}</strong><span>{item.type === 'income' ? 'Não se aplica' : source?.classification || item.category || 'Não informada'}</span><span>{item.group || item.category || 'Não informado'}</span><span>{item.account || 'Não informada'}</span><strong className="negative">{item.type === 'expense' ? brl.format(item.amount) : '—'}</strong><span>{item.paymentMethod || 'Não informado'}</span><span className={`status-pill ${item.status !== 'planned' ? 'active' : ''}`}>{item.status === 'planned' ? 'Pendente' : item.status === 'paid' ? 'Pago' : 'Conciliado'}</span><div className="table-actions">{item.status === 'planned' && canWrite && <button onClick={() => void changeStatus(item.id, 'paid')} disabled={busy}>Baixar</button>}{item.status === 'paid' && canWrite && <button onClick={() => void changeStatus(item.id, 'reconciled')} disabled={busy}>Conciliar</button>}{canArchive && <button className="danger" onClick={() => void archive(item.id)} disabled={busy}>Arquivar</button>}</div></article>; })}{loading && <p className="catalog-empty">Carregando dados da base...</p>}{!loading && !filtered.length && <p className="catalog-empty">Nenhum lançamento encontrado para os filtros aplicados.</p>}</div></div>
    </div>
  </section>;
}
