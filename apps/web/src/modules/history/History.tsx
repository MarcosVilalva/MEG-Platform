import { useEffect, useMemo, useState } from 'react';
import { financeClient, type FinancialAuditEntry } from '../../app/finance-client';
import { readSession } from '../../app/auth-client';
import { useAppStore } from '../../app/store';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const entityLabels: Record<string, string> = {
  FinancialEvent: 'Lançamento',
  FinancialTransfer: 'Transferência',
  Payable: 'Conta a pagar',
  RecurringExpense: 'Despesa recorrente',
  CreditCard: 'Cartão',
  CardPurchase: 'Compra no cartão',
  Receivable: 'Conta a receber',
  Receipt: 'Recebimento',
  Account: 'Conta financeira',
  Category: 'Categoria',
  PaymentMethod: 'Forma de pagamento',
  Customer: 'Cliente',
};

const actionLabels: Record<string, string> = {
  FINANCIAL_EVENT_CREATED: 'Lançamento criado',
  BENEFIT_EVENT_CREATED: 'Benefício criado',
  BENEFIT_EVENT_UPDATED: 'Benefício atualizado',
  FINANCIAL_EVENT_UPDATED: 'Lançamento atualizado',
  FINANCIAL_EVENT_ARCHIVED: 'Lançamento arquivado',
  FINANCIAL_EVENT_SETTLED: 'Pagamento confirmado',
  FINANCIAL_EVENT_SETTLED_COMPAT: 'Pagamento confirmado',
  FINANCIAL_TRANSFER_CREATED: 'Transferência realizada',
  PAYABLE_CREATED: 'Conta a pagar criada',
  PAYABLE_PAYMENT_CREATED: 'Conta a pagar baixada',
  RECURRING_EXPENSE_CREATED: 'Recorrência criada',
  CARD_CREATED: 'Cartão criado',
  CARD_UPDATED: 'Cartão atualizado',
  CARD_DEACTIVATED: 'Cartão inativado',
  CARD_REACTIVATED: 'Cartão reativado',
  CARD_PURCHASE_CREATED: 'Compra no cartão criada',
  CARD_PURCHASE_UPDATED: 'Compra no cartão atualizada',
  CARD_PURCHASE_CANCELLED: 'Compra no cartão cancelada',
  CARD_STATEMENT_PAID: 'Fatura paga',
  CARD_STATEMENT_REOPENED: 'Fatura reaberta',
  RECEIVABLE_CREATED: 'Conta a receber criada',
  RECEIVABLE_RECEIVED: 'Recebimento confirmado',
  ACCOUNT_CREATED: 'Conta criada',
  ACCOUNT_UPDATED: 'Conta atualizada',
  ACCOUNT_DEACTIVATED: 'Conta inativada',
  ACCOUNT_REACTIVATED: 'Conta reativada',
  CATEGORY_CREATED: 'Categoria criada',
  CATEGORY_UPDATED: 'Categoria atualizada',
  CATEGORY_DEACTIVATED: 'Categoria inativada',
  CATEGORY_REACTIVATED: 'Categoria reativada',
  PAYMENT_METHOD_CREATED: 'Forma de pagamento criada',
  PAYMENT_METHOD_UPDATED: 'Forma de pagamento atualizada',
  PAYMENT_METHOD_DEACTIVATED: 'Forma de pagamento inativada',
  PAYMENT_METHOD_REACTIVATED: 'Forma de pagamento reativada',
  CUSTOMER_CREATED: 'Cliente criado',
  CUSTOMER_UPDATED: 'Cliente atualizado',
  CUSTOMER_DEACTIVATED: 'Cliente inativado',
  CUSTOMER_REACTIVATED: 'Cliente reativado',
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function firstText(entry: FinancialAuditEntry) {
  const after = record(entry.after);
  const before = record(entry.before);
  const context = record(entry.context);
  for (const value of [
    after.description, after.name, before.description, before.name,
    context.sourceAccountName && context.destinationAccountName
      ? `${String(context.sourceAccountName)} → ${String(context.destinationAccountName)}`
      : '',
  ]) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return entityLabels[entry.entity] || entry.entity;
}

function amountFrom(entry: FinancialAuditEntry) {
  const after = record(entry.after);
  const payment = record(after.payment);
  for (const value of [after.amount, after.totalAmount, payment.amount]) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed !== 0) return parsed;
  }
  return null;
}

function auditIcon(action: string) {
  if (/CREATED|TRANSFER|RECEIVED|SETTLED|PAYMENT/.test(action)) return '✓';
  if (/DEACTIVATED|ARCHIVED|CANCELLED/.test(action)) return '−';
  return '•';
}

export function History() {
  const selectedMonth = useAppStore((state) => state.selectedMonth);
  const periodMode = useAppStore((state) => state.periodMode);
  const periodStart = useAppStore((state) => state.periodStart);
  const periodEnd = useAppStore((state) => state.periodEnd);
  const [source, setSource] = useState<FinancialAuditEntry[]>([]);
  const [search, setSearch] = useState('');
  const [entity, setEntity] = useState('all');
  const [action, setAction] = useState('all');
  const [selected, setSelected] = useState<FinancialAuditEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const userName = readSession()?.user.name || 'Usuário';

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void financeClient.listAudit(1, 100)
      .then((result) => { if (active) setSource(result.items); })
      .catch(() => { if (active) setError('Não foi possível carregar a auditoria financeira.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const items = useMemo(() => source.filter((item) => {
    const day = String(item.at).slice(0, 10);
    const inPeriod = periodMode === 'all'
      || (periodMode === 'range' ? day >= periodStart && day <= periodEnd : day.startsWith(selectedMonth));
    const label = firstText(item);
    const text = `${label} ${item.actor.name} ${item.actor.email} ${entityLabels[item.entity] || item.entity} ${actionLabels[item.action] || item.action}`.toLowerCase();
    return inPeriod
      && text.includes(search.trim().toLowerCase())
      && (entity === 'all' || item.entity === entity)
      && (action === 'all' || item.action === action);
  }), [source, selectedMonth, periodMode, periodStart, periodEnd, search, entity, action]);

  useEffect(() => {
    if (!selected || !items.some((item) => item.id === selected.id)) setSelected(items[0] || null);
  }, [items, selected]);

  const entities = useMemo(() => [...new Set(source.map((item) => item.entity))].sort(), [source]);
  const actions = useMemo(() => [...new Set(source.map((item) => item.action))].sort(), [source]);
  const uniqueActors = useMemo(() => new Set(items.map((item) => item.actor.id)).size, [items]);
  const selectedAmount = selected ? amountFrom(selected) : null;

  return <section id="history" className="page meg-screen history-screen" aria-busy={loading}>
    <header className="page-head screen-heading">
      <div>
        <span>HISTÓRICO</span>
        <h1>Auditoria financeira</h1>
        <p>Registro real das alterações confirmadas no MEG, com usuário, data, entidade e ação preservados.</p>
      </div>
    </header>

    {error && <div className="notice danger">{error}</div>}

    <section className="history-kpis history-summary">
      <article><span>ATIVIDADES NO PERÍODO</span><strong>{items.length}</strong></article>
      <article><span>USUÁRIOS COM ATIVIDADE</span><strong>{uniqueActors}</strong></article>
      <article><span>USUÁRIO ATIVO</span><strong>{userName}</strong></article>
    </section>

    <div className="history-filters">
      <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar atividade, usuário ou entidade"/>
      <select value={entity} onChange={(event) => setEntity(event.target.value)}>
        <option value="all">Todas as entidades</option>
        {entities.map((item) => <option key={item} value={item}>{entityLabels[item] || item}</option>)}
      </select>
      <select value={action} onChange={(event) => setAction(event.target.value)}>
        <option value="all">Todas as ações</option>
        {actions.map((item) => <option key={item} value={item}>{actionLabels[item] || item}</option>)}
      </select>
    </div>

    <div className="history-layout">
      <article className="history-feed meg-panel">
        <header><div><span>MAIS RECENTES</span><h2>Ordem cronológica</h2></div></header>
        {items.map((item) => <button key={item.id} className={`history-event ${selected?.id === item.id ? 'active' : ''}`} onClick={() => setSelected(item)}>
          <span className="history-event-icon">{auditIcon(item.action)}</span>
          <span>
            <strong>{firstText(item)}</strong>
            <small>{item.actor.name} · {actionLabels[item.action] || item.action}</small>
          </span>
          <time>{new Date(item.at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</time>
        </button>)}
        {!loading && !items.length && <p className="empty-state">Nenhuma atividade corresponde aos filtros.</p>}
      </article>

      <aside className="history-detail meg-panel">
        <header>
          <div><span>DETALHES DA ATIVIDADE</span><h2>{selected ? firstText(selected) : 'Selecione uma atividade'}</h2></div>
          {selected && <span className="status active">Auditado</span>}
        </header>

        {selected && <>
          <div className="history-meta">
            <div><span>Usuário</span><strong>{selected.actor.name}</strong></div>
            <div><span>Data e hora</span><strong>{new Date(selected.at).toLocaleString('pt-BR')}</strong></div>
            <div><span>Entidade</span><strong>{entityLabels[selected.entity] || selected.entity}</strong></div>
            <div><span>Registro</span><strong>{selected.entityId}</strong></div>
          </div>

          <div className="history-compare">
            <article><span>AÇÃO</span><strong>{actionLabels[selected.action] || selected.action}</strong></article>
            <article><span>VALOR</span><strong>{selectedAmount === null ? 'Não se aplica' : money.format(Math.abs(selectedAmount))}</strong></article>
          </div>

          <div className="notice">Registro somente leitura. Alterações posteriores geram novos eventos de auditoria e preservam o histórico anterior.</div>
        </>}
      </aside>
    </div>
  </section>;
}
