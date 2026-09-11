import { useEffect, useMemo, useState } from 'react';
import { normalizeEvents, type LegacyTransaction } from '@core/finance/events';
import { readCloudState, patchCloudTransactions } from '../../app/app-state-client';
import { invalidateFinanceSummary } from '../../app/use-finance-summary';
import { useAppStore } from '../../app/store';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const iso = (value: string) => String(value || '').slice(0, 10);
const today = () => new Date().toISOString().slice(0, 10);
const isBenefit = (item: { account?: string; group?: string; category?: string; paymentMethod?: string }) => /benef|aliment|vero/i.test(`${item.account || ''} ${item.group || ''} ${item.category || ''} ${item.paymentMethod || ''}`);

type Priority = 'all' | 'overdue' | 'today' | 'invoice' | 'upcoming';

export function Payables() {
  const selectedMonth = useAppStore((state) => state.selectedMonth);
  const periodMode = useAppStore((state) => state.periodMode);
  const periodEnd = useAppStore((state) => state.periodEnd);
  const [source, setSource] = useState<LegacyTransaction[]>([]);
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState<Priority>('all');
  const [order, setOrder] = useState<'urgent' | 'highest' | 'lowest'>('urgent');
  const [payingId, setPayingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true); setError('');
    try { setSource((await readCloudState()).state.transactions); }
    catch { setError('Não foi possível carregar as pendências da base compartilhada.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  const events = useMemo(() => normalizeEvents(source), [source]);
  const availableBalance = useMemo(() => events.filter((item) => !isBenefit(item) && (item.type === 'income' || ['paid', 'reconciled'].includes(item.status))).reduce((sum, item) => sum + item.signedAmount, 0), [events]);
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
  const canPay = Boolean(paying && (isBenefit(paying) || paying.amount <= availableBalance));

  async function confirmPayment() {
    if (!paying || !canPay) return;
    const current = source.find((item) => item.id === paying.id); if (!current) return;
    setBusy(true); setError('');
    try {
      await patchCloudTransactions([{ ...current, status: 'paid', situation: 'PAGO' }]);
      invalidateFinanceSummary(); setPayingId(null); await load();
    } catch { setError('A base não confirmou a baixa. Nenhum dado foi alterado.'); }
    finally { setBusy(false); }
  }

  const groups: Array<{ id: Exclude<Priority, 'all'>; label: string; hint: string }> = [
    { id: 'overdue', label: 'Vencidos', hint: 'Pendências anteriores' },
    { id: 'today', label: 'Hoje', hint: 'Ação imediata' },
    { id: 'invoice', label: 'Faturas', hint: 'Compras agrupadas por cartão' },
    { id: 'upcoming', label: 'Próximos', hint: 'Demais compromissos' }
  ];

  return <section className="meg-screen payables-screen" aria-busy={loading}>
    <header className="screen-heading"><div><span>PENDENTES</span><h1>Vencimentos agrupados</h1><p>Compromissos organizados por urgência, sem alterar o saldo antes da confirmação.</p></div><span className="pending-total-pill">{brl.format(totals.total)} em aberto</span></header>
    {error && <div className="notice danger">{error}</div>}
    <section className="pending-summary"><article><span>TOTAL PENDENTE</span><strong className="negative">{brl.format(totals.total)}</strong><small>{pending.length} compromisso(s)</small></article><article><span>VENCIDOS</span><strong>{brl.format(totals.overdue)}</strong><small>Prioridade máxima</small></article><article><span>VENCEM HOJE</span><strong>{brl.format(totals.today)}</strong><small>Confirmação obrigatória</small></article><article><span>PRÓXIMOS</span><strong>{brl.format(totals.upcoming)}</strong><small>Agenda ativa</small></article></section>
    <div className="pending-priorities">{(['all', 'overdue', 'today', 'invoice', 'upcoming'] as Priority[]).map((id) => <button key={id} className={priority === id ? 'active' : ''} onClick={() => setPriority(id)}>{id === 'all' ? 'Todos' : groups.find((group) => group.id === id)?.label}</button>)}</div>
    <div className="pending-toolbar"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar descrição, conta, cartão ou grupo"/><select value={order} onChange={(event) => setOrder(event.target.value as typeof order)}><option value="urgent">Mais urgente primeiro</option><option value="highest">Maior valor primeiro</option><option value="lowest">Menor valor primeiro</option></select></div>
    <div className="pending-groups">{groups.map((group) => { const items = visible.filter((item) => groupOf(item) === group.id); if (!items.length) return null; return <section key={group.id} className="pending-group meg-panel"><header><div><span>{group.label.toUpperCase()}</span><h2>{group.hint}</h2></div><strong>{brl.format(items.reduce((sum, item) => sum + item.amount, 0))}</strong></header>{items.map((item) => <article className="pending-row" key={item.id}><div><strong>{new Date(`${iso(item.date)}T12:00:00`).toLocaleDateString('pt-BR')}</strong><small>{group.label}</small></div><div><strong>{item.description}</strong><small>{item.account || 'Conta não informada'} · {item.group || item.category || 'Sem grupo'}</small></div><strong>{brl.format(item.amount)}</strong><span className={`status ${group.id === 'overdue' ? 'planned' : 'confirmed'}`}>{group.label}</span><button onClick={() => setPayingId(item.id)}>Baixar</button></article>)}</section>; })}{!loading && !visible.length && <div className="empty-state">Nenhuma pendência corresponde aos filtros.</div>}</div>
    {paying && <div className="payment-backdrop"><section className="payment-confirm"><header><div><span>CONFIRMAR BAIXA</span><h2>{paying.description}</h2></div><button onClick={() => setPayingId(null)} aria-label="Fechar">×</button></header><dl><div><dt>Valor</dt><dd>{brl.format(paying.amount)}</dd></div><div><dt>Saldo monetário disponível</dt><dd>{brl.format(availableBalance)}</dd></div></dl>{!canPay && <div className="notice danger">Pagamento bloqueado: o valor supera o saldo monetário disponível.</div>}<p>A baixa será gravada no lançamento original e confirmada pela base antes de atualizar a tela.</p><footer><button onClick={() => setPayingId(null)}>Cancelar</button><button className="confirm" disabled={!canPay || busy} onClick={() => void confirmPayment()}>{busy ? 'Confirmando...' : 'Confirmar pagamento'}</button></footer></section></div>}
  </section>;
}
