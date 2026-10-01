import { useEffect, useMemo, useState } from 'react';
import { normalizeEvents, type LegacyTransaction } from '@core/finance/events';
import { invalidateAuthenticatedCache, readSession } from '../../app/auth-client';
import { readCloudState } from '../../app/app-state-client';
import { invalidateFinanceSummary } from '../../app/use-finance-summary';
import { dateInSaoPaulo } from '../../app/calendar';
import { financeClient, type Account, type FinancialEvent, type PaymentMethod } from '../../app/finance-client';
import { useAppStore } from '../../app/store';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const iso = (value: string) => String(value || '').slice(0, 10);
const today = () => dateInSaoPaulo();
const isBenefit = (item: { account?: string; group?: string; category?: string; paymentMethod?: string }) => /benef|aliment|vero/i.test(`${item.account || ''} ${item.group || ''} ${item.category || ''} ${item.paymentMethod || ''}`);
const isMonetaryAccount = (account: Account) => !['benefit', 'credit'].includes(String(account.type || '').toLowerCase());
const isBenefitMethod = (method: PaymentMethod) => /benef|aliment|vero/i.test(`${method.name} ${method.type || ''}`);
const isMonetaryMethod = (method: PaymentMethod) => !/credit|benef|aliment|vero/i.test(`${method.name} ${method.type || ''}`);

type Priority = 'all' | 'overdue' | 'today' | 'invoice' | 'upcoming';

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

export function Payables() {
  const selectedMonth = useAppStore((state) => state.selectedMonth);
  const periodMode = useAppStore((state) => state.periodMode);
  const periodEnd = useAppStore((state) => state.periodEnd);
  const [source, setSource] = useState<LegacyTransaction[]>([]);
  const [normalized, setNormalized] = useState<FinancialEvent[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState<Priority>('all');
  const [order, setOrder] = useState<'urgent' | 'highest' | 'lowest'>('urgent');
  const [payingId, setPayingId] = useState<string | null>(null);
  const [paidAt, setPaidAt] = useState(today());
  const [accountId, setAccountId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [accountBalance, setAccountBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const role = readSession()?.user.role ?? 'VIEWER';
  const canWrite = role !== 'VIEWER';

  async function load() {
    setLoading(true); setError('');
    try {
      invalidateAuthenticatedCache('/app-state');
      const [cloud, events, accountRows, methodRows] = await Promise.all([
        readCloudState(),
        listAllNormalizedEvents(),
        financeClient.listAccounts(),
        financeClient.listPaymentMethods(),
      ]);
      const byLegacyId = new Map(events.filter((item) => item.legacyTransactionId).map((item) => [String(item.legacyTransactionId), item]));
      setSource(cloud.state.transactions.map((item) => {
        const linked = byLegacyId.get(item.id);
        return linked ? {
          ...item,
          financialEventId: linked.id,
          financialAccountId: item.financialAccountId || linked.accountId || undefined,
          categoryId: item.categoryId || linked.categoryId || undefined,
          paymentMethodId: item.paymentMethodId || linked.paymentMethodId || undefined,
        } : item;
      }));
      setNormalized(events);
      setAccounts(accountRows.filter((item) => item.isActive));
      setMethods(methodRows.filter((item) => item.isActive));
    } catch {
      setError('Não foi possível carregar as pendências e os dados de baixa da base compartilhada.');
    } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  const events = useMemo(() => normalizeEvents(source), [source]);
  const pending = useMemo(() => events.filter((item) => {
    const date = iso(item.date);
    const inPeriod = periodMode === 'all' || (periodMode === 'range' ? date <= periodEnd : date <= `${selectedMonth}-31`);
    return inPeriod && item.type === 'expense' && item.status === 'planned';
  }), [events, selectedMonth, periodMode, periodEnd]);

  const groupOf = (item: (typeof pending)[number]): Exclude<Priority, 'all'> => {
    const date = iso(item.date);
    if (/cart[aã]o|cr[eé]dito|fatura/i.test(`${item.paymentMethod || ''} ${item.notes || ''}`)) return 'invoice';
    if (date < today()) return 'overdue';
    if (date === today()) return 'today';
    return 'upcoming';
  };
  const visible = useMemo(() => pending.filter((item) => {
    const text = `${item.description} ${item.account || ''} ${item.group || ''} ${item.paymentMethod || ''}`.toLowerCase();
    return text.includes(search.trim().toLowerCase()) && (priority === 'all' || groupOf(item) === priority);
  }).sort((a, b) => order === 'highest' ? b.amount - a.amount : order === 'lowest' ? a.amount - b.amount : iso(a.date).localeCompare(iso(b.date))), [pending, search, priority, order]);
  const totals = useMemo(() => ({
    total: pending.reduce((sum, item) => sum + item.amount, 0),
    overdue: pending.filter((item) => groupOf(item) === 'overdue').reduce((sum, item) => sum + item.amount, 0),
    today: pending.filter((item) => groupOf(item) === 'today').reduce((sum, item) => sum + item.amount, 0),
    upcoming: pending.filter((item) => ['invoice', 'upcoming'].includes(groupOf(item))).reduce((sum, item) => sum + item.amount, 0)
  }), [pending]);

  const paying = payingId ? pending.find((item) => item.id === payingId) || null : null;
  const payingSource = paying ? source.find((item) => item.id === paying.id) || null : null;
  const payingEvent = payingSource?.financialEventId ? normalized.find((item) => item.id === payingSource.financialEventId) || null : null;
  const benefitPayment = Boolean(paying && isBenefit(paying));
  const accountOptions = useMemo(() => accounts.filter((item) => benefitPayment ? String(item.type).toLowerCase() === 'benefit' : isMonetaryAccount(item)), [accounts, benefitPayment]);
  const methodOptions = useMemo(() => methods.filter((item) => benefitPayment ? isBenefitMethod(item) : isMonetaryMethod(item)), [methods, benefitPayment]);

  useEffect(() => {
    if (!paying || benefitPayment || !accountId || !paidAt) {
      setAccountBalance(null);
      return;
    }
    let active = true;
    setBalanceLoading(true);
    void financeClient.getMonetaryBalance(accountId, paidAt)
      .then((result) => { if (active) setAccountBalance(result.available); })
      .catch(() => { if (active) setAccountBalance(null); })
      .finally(() => { if (active) setBalanceLoading(false); });
    return () => { active = false; };
  }, [paying?.id, benefitPayment, accountId, paidAt]);

  function openPayment(id: string) {
    const item = pending.find((row) => row.id === id);
    const original = source.find((row) => row.id === id);
    if (!item || !original) return;
    const benefit = isBenefit(item);
    const availableAccounts = accounts.filter((account) => benefit ? String(account.type).toLowerCase() === 'benefit' : isMonetaryAccount(account));
    const availableMethods = methods.filter((method) => benefit ? isBenefitMethod(method) : isMonetaryMethod(method));
    const preferredAccount = availableAccounts.find((account) => account.id === original.financialAccountId)
      || availableAccounts.find((account) => account.name === item.account)
      || availableAccounts[0];
    const preferredMethod = availableMethods.find((method) => method.id === original.paymentMethodId)
      || availableMethods.find((method) => method.name.toLowerCase() === String(item.paymentMethod || '').toLowerCase())
      || availableMethods[0];

    setPaidAt(today());
    setAccountId(preferredAccount?.id || '');
    setPaymentMethodId(preferredMethod?.id || '');
    setAccountBalance(null);
    setError('');
    setPayingId(id);
  }

  const canPay = Boolean(
    paying
    && payingEvent
    && accountId
    && paymentMethodId
    && canWrite
    && (benefitPayment || (accountBalance !== null && paying.amount <= accountBalance))
  );

  async function confirmPayment() {
    if (!paying || !payingSource || !payingEvent || !canPay) return;
    setBusy(true); setError('');
    try {
      const operationId = `web-settle:${crypto.randomUUID()}`;
      if (benefitPayment) {
        await financeClient.updateBenefitEvent(payingEvent.id, {
          description: paying.description,
          type: 'expense',
          date: paidAt,
          amount: paying.amount,
          accountId,
          categoryId: payingSource.categoryId || payingEvent.categoryId || undefined,
          paymentMethodId,
          notes: paying.notes || undefined,
          operationId,
          expectedUpdatedAt: payingEvent.updatedAt,
        });
      } else {
        await financeClient.settleEvent(payingEvent.id, { paidAt, accountId, paymentMethodId, operationId });
      }
      invalidateFinanceSummary();
      setPayingId(null);
      await load();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '';
      if (/INSUFFICIENT_MONETARY_BALANCE|INSUFFICIENT_BENEFIT_BALANCE/i.test(message)) setError('Pagamento bloqueado: o saldo da conta escolhida não é suficiente na data informada.');
      else if (/FINANCIAL_EVENT_NOT_FOUND|FINANCIAL_EVENT_NOT_PENDING|BENEFIT_EVENT_NOT_FOUND/i.test(message)) setError('A pendência mudou na base. Atualize a tela antes de tentar novamente.');
      else setError('A base não confirmou a baixa. Nenhum dado foi alterado.');
    } finally { setBusy(false); }
  }

  const groups: Array<{ id: Exclude<Priority, 'all'>; label: string; hint: string }> = [
    { id: 'overdue', label: 'Vencidos', hint: 'Pendências anteriores' },
    { id: 'today', label: 'Hoje', hint: 'Ação imediata' },
    { id: 'invoice', label: 'Faturas', hint: 'Compras agrupadas por cartão' },
    { id: 'upcoming', label: 'Próximos', hint: 'Demais compromissos' }
  ];

  return <section id="payables" className="page meg-screen payables-screen" aria-busy={loading}>
    <header className="page-head screen-heading"><div><span>PENDENTES</span><h1>Vencimentos agrupados</h1><p>Compromissos organizados por urgência. A baixa só é concluída depois da validação da conta, forma de pagamento e saldo na base oficial.</p></div><span className="pending-total-pill">{brl.format(totals.total)} em aberto</span></header>
    {error && <div className="notice danger">{error}</div>}
    <section className="pending-kpis pending-summary"><article><span>TOTAL PENDENTE</span><strong className="negative">{brl.format(totals.total)}</strong><small>{pending.length} compromisso(s)</small></article><article><span>VENCIDOS</span><strong>{brl.format(totals.overdue)}</strong><small>Prioridade máxima</small></article><article><span>VENCEM HOJE</span><strong>{brl.format(totals.today)}</strong><small>Confirmação obrigatória</small></article><article><span>PRÓXIMOS</span><strong>{brl.format(totals.upcoming)}</strong><small>Agenda ativa</small></article></section>
    <div className="pending-priorities">{(['all', 'overdue', 'today', 'invoice', 'upcoming'] as Priority[]).map((id) => <button key={id} className={priority === id ? 'active' : ''} onClick={() => setPriority(id)}>{id === 'all' ? 'Todos' : groups.find((group) => group.id === id)?.label}</button>)}</div>
    <div className="pending-toolbar"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar descrição, conta, cartão ou grupo"/><select value={order} onChange={(event) => setOrder(event.target.value as typeof order)}><option value="urgent">Mais urgente primeiro</option><option value="highest">Maior valor primeiro</option><option value="lowest">Menor valor primeiro</option></select></div>
    <div className="pending-groups">{groups.map((group) => { const items = visible.filter((item) => groupOf(item) === group.id); if (!items.length) return null; return <section key={group.id} className="pending-group meg-panel"><header><div><span>{group.label.toUpperCase()}</span><h2>{group.hint}</h2></div><strong>{brl.format(items.reduce((sum, item) => sum + item.amount, 0))}</strong></header>{items.map((item) => <article className="pending-row" key={item.id}><div><strong>{new Date(`${iso(item.date)}T12:00:00`).toLocaleDateString('pt-BR')}</strong><small>{group.label}</small></div><div><strong>{item.description}</strong><small>{item.account || 'Conta não informada'} · {item.group || item.category || 'Sem grupo'}</small></div><strong>{brl.format(item.amount)}</strong><span className={`status ${group.id === 'overdue' ? 'planned' : 'confirmed'}`}>{group.label}</span><button disabled={!canWrite} onClick={() => openPayment(item.id)}>Baixar</button></article>)}</section>; })}{!loading && !visible.length && <div className="empty-state">Nenhuma pendência corresponde aos filtros.</div>}</div>

    {paying && <div className="payment-backdrop"><section className="payment-confirm"><header><div><span>CONFIRMAR BAIXA</span><h2>{paying.description}</h2></div><button onClick={() => setPayingId(null)} aria-label="Fechar">×</button></header>
      <dl><div><dt>Valor</dt><dd>{brl.format(paying.amount)}</dd></div><div><dt>Vencimento original</dt><dd>{new Date(`${iso(paying.date)}T12:00:00`).toLocaleDateString('pt-BR')}</dd></div></dl>
      {!payingEvent && <div className="notice danger">Esta pendência ainda não está vinculada ao registro auditável. Atualize a tela antes da baixa.</div>}
      <div className="form-row">
        <label className="field"><span>Data do pagamento</span><input type="date" max={today()} value={paidAt} onChange={(event) => setPaidAt(event.target.value)} /></label>
        <label className="field"><span>{benefitPayment ? 'Conta de benefício' : 'Conta de pagamento'}</span><select value={accountId} onChange={(event) => setAccountId(event.target.value)}><option value="">Selecione</option>{accountOptions.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
      </div>
      <label className="field"><span>Forma de pagamento</span><select value={paymentMethodId} onChange={(event) => setPaymentMethodId(event.target.value)}><option value="">Selecione</option>{methodOptions.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}</select></label>
      {!benefitPayment && <dl><div><dt>Saldo disponível na conta</dt><dd>{balanceLoading ? 'Consultando...' : accountBalance === null ? 'Selecione conta e data' : brl.format(accountBalance)}</dd></div><div><dt>Saldo após a baixa</dt><dd>{accountBalance === null ? '—' : brl.format(accountBalance - paying.amount)}</dd></div></dl>}
      {!benefitPayment && accountBalance !== null && paying.amount > accountBalance && <div className="notice danger">Pagamento bloqueado: o valor supera o saldo disponível da conta escolhida.</div>}
      <p>{benefitPayment ? 'A baixa do benefício será validada contra o saldo específico da conta de benefício.' : 'A baixa será validada pelo saldo monetário da conta escolhida, gravada no evento original e refletida no histórico auditável.'}</p>
      <footer><button onClick={() => setPayingId(null)}>Cancelar</button><button className="confirm" disabled={!canPay || busy || balanceLoading} onClick={() => void confirmPayment()}>{busy ? 'Confirmando...' : 'Confirmar pagamento'}</button></footer>
    </section></div>}
  </section>;
}
