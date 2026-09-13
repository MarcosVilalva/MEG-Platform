import { useMemo, useState } from 'react';
import type { PhoenixActivity, PhoenixFinancialAuditItem, PhoenixReadModel } from '../contracts';
import '../phoenix-history.css';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateTime = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
});

type PeriodFilter = 'today' | '7' | '30' | 'all';
type SourceFilter = 'all' | 'audit' | 'legacy';
type Snapshot = Record<string, unknown>;
type HistoryRow = {
  id: string;
  at: string;
  source: 'audit' | 'legacy';
  action: string;
  actor: string;
  entity: string;
  entityId: string;
  description: string;
  type?: string;
  amount?: number;
  paymentMethod?: string;
  group?: string;
  status?: string;
  before?: unknown;
  after?: unknown;
  context?: Record<string, unknown>;
  recovery?: PhoenixActivity['recovery'];
};

function localDay(value: string | Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date(value));
}

function record(value: unknown): Snapshot {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Snapshot : {};
}

function nestedName(value: unknown) {
  const item = record(value);
  return typeof item.name === 'string' ? item.name : '';
}

function actionLabel(action: string) {
  return ({
    CREATED: 'Inclusão',
    UPDATED: 'Alteração',
    DELETED: 'Exclusão',
    RECOVERED: 'Recuperação',
    FINANCIAL_EVENT_CREATED: 'Inclusão',
    FINANCIAL_EVENT_UPDATED: 'Alteração',
    FINANCIAL_EVENT_ARCHIVED: 'Arquivamento',
    PAYABLE_PAYMENT_CREATED: 'Baixa',
    RECURRING_EXPENSE_CREATED: 'Recorrência criada',
    CARD_PURCHASE_CREATED: 'Compra no cartão',
    CARD_PURCHASE_CANCELLED: 'Compra cancelada',
    CARD_STATEMENT_PAID: 'Fatura paga',
    RECEIVABLE_RECEIVED: 'Recebimento'
  } as Record<string, string>)[action] || action || 'Atualização';
}

function actionVerb(action: string) {
  return ({
    CREATED: 'incluiu', UPDATED: 'alterou', DELETED: 'excluiu', RECOVERED: 'recuperou',
    FINANCIAL_EVENT_CREATED: 'incluiu', FINANCIAL_EVENT_UPDATED: 'alterou', FINANCIAL_EVENT_ARCHIVED: 'arquivou',
    PAYABLE_PAYMENT_CREATED: 'baixou', RECURRING_EXPENSE_CREATED: 'criou', CARD_PURCHASE_CREATED: 'incluiu',
    CARD_PURCHASE_CANCELLED: 'cancelou', CARD_STATEMENT_PAID: 'pagou', RECEIVABLE_RECEIVED: 'recebeu'
  } as Record<string, string>)[action] || 'atualizou';
}

function auditRow(item: PhoenixFinancialAuditItem): HistoryRow {
  const after = record(item.after);
  const before = record(item.before);
  const context = item.context || {};
  const source = Object.keys(after).length ? after : before;
  const amount = Number(source.amount ?? source.totalAmount ?? context.principal ?? context.amount ?? 0);
  const description = String(source.description || source.name || context.description || `${item.entity} ${item.entityId.slice(0, 8)}`);
  return {
    id: `audit-${item.id}`,
    at: item.at,
    source: 'audit',
    action: item.action,
    actor: item.actor?.name || item.actor?.email || item.actor?.id || 'Usuário MEG',
    entity: item.entity,
    entityId: item.entityId,
    description,
    type: typeof source.type === 'string' ? source.type : undefined,
    amount: Number.isFinite(amount) && amount !== 0 ? amount : undefined,
    paymentMethod: nestedName(source.paymentMethod) || (typeof context.paymentMethod === 'string' ? context.paymentMethod : undefined),
    group: nestedName(source.category) || (typeof context.group === 'string' ? context.group : undefined),
    status: typeof source.status === 'string' ? source.status : undefined,
    before: item.before,
    after: item.after,
    context,
  };
}

function legacyRow(item: PhoenixActivity): HistoryRow {
  return {
    id: `legacy-${item.id}`,
    at: item.at,
    source: 'legacy',
    action: item.action,
    actor: item.userName || item.userId || 'Usuário MEG',
    entity: 'LegacyTransaction',
    entityId: item.transactionId || item.id,
    description: item.transaction?.description || 'Lançamento legado',
    type: item.transaction?.type,
    amount: Number(item.transaction?.amount || 0) || undefined,
    paymentMethod: item.transaction?.paymentMethod,
    group: item.transaction?.group,
    status: item.transaction?.status,
    after: item.transaction,
    recovery: item.recovery,
  };
}

function amountText(item: HistoryRow) {
  const amount = Math.abs(Number(item.amount || 0));
  if (!amount) return '—';
  return `${item.type === 'income' ? '+' : '−'} ${money.format(amount)}`;
}

function insidePeriod(item: HistoryRow, period: PeriodFilter) {
  if (period === 'all') return true;
  const now = new Date();
  if (period === 'today') return localDay(item.at) === localDay(now);
  const days = Number(period);
  const boundary = new Date(now.getTime() - days * 86400000);
  return new Date(item.at).getTime() >= boundary.getTime();
}

function csvCell(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function exportHistory(items: HistoryRow[]) {
  const rows = [
    ['Data/hora', 'Fonte', 'Ação', 'Usuário', 'Entidade', 'Descrição', 'Tipo', 'Valor', 'Forma de pagamento', 'Grupo', 'Situação', 'ID do registro'],
    ...items.map((item) => [
      dateTime.format(new Date(item.at)), item.source === 'audit' ? 'Auditoria financeira' : 'Histórico legado',
      actionLabel(item.action), item.actor, item.entity, item.description, item.type || '',
      Number(item.amount || 0).toFixed(2).replace('.', ','), item.paymentMethod || '', item.group || '', item.status || '', item.entityId
    ])
  ];
  const content = `\uFEFF${rows.map((row) => row.map(csvCell).join(';')).join('\r\n')}`;
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `meg-historico-${localDay(new Date())}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function snapshotFields(value: unknown) {
  const item = record(value);
  const fields: Array<[string, string]> = [];
  const add = (label: string, raw: unknown) => {
    if (raw === null || raw === undefined || raw === '') return;
    fields.push([label, String(raw)]);
  };
  add('Descrição', item.description);
  add('Tipo', item.type);
  add('Situação', item.status);
  add('Data', item.date);
  add('Competência', item.competence);
  if (item.amount !== undefined) add('Valor', money.format(Math.abs(Number(item.amount || 0))));
  if (item.openAmount !== undefined) add('Saldo aberto', money.format(Number(item.openAmount || 0)));
  add('Conta', nestedName(item.account));
  add('Classificação', nestedName(item.category));
  add('Forma de pagamento', nestedName(item.paymentMethod));
  return fields;
}

export function PhoenixHistory({ data }: { data: PhoenixReadModel }) {
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<PeriodFilter>('30');
  const [action, setAction] = useState('all');
  const [user, setUser] = useState('all');
  const [source, setSource] = useState<SourceFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows = useMemo(() => [
    ...data.financialAudit.items.map(auditRow),
    ...data.activities.map(legacyRow),
  ].sort((left, right) => String(right.at).localeCompare(String(left.at))), [data.financialAudit.items, data.activities]);
  const users = useMemo(() => [...new Set(rows.map((item) => item.actor))].sort(), [rows]);
  const today = localDay(new Date());
  const todayCount = rows.filter((item) => localDay(item.at) === today).length;
  const actions = useMemo(() => [...new Set(rows.map((item) => item.action))].sort(), [rows]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('pt-BR');
    return rows.filter((item) => {
      const haystack = [item.description, actionLabel(item.action), item.actor, item.entity, item.paymentMethod, item.group, item.entityId]
        .filter(Boolean).join(' ').toLocaleLowerCase('pt-BR');
      return (!needle || haystack.includes(needle))
        && insidePeriod(item, period)
        && (action === 'all' || item.action === action)
        && (user === 'all' || item.actor === user)
        && (source === 'all' || item.source === source);
    });
  }, [rows, search, period, action, user, source]);

  const selected = rows.find((item) => item.id === selectedId) || filtered[0] || null;
  const beforeFields = selected?.source === 'audit' ? snapshotFields(selected.before) : [];
  const afterFields = selected?.source === 'audit' ? snapshotFields(selected.after) : [];

  return <section className="px-screen px-history-screen">
    <header className="px-screen-head">
      <div><span className="px-kicker">Histórico</span><h1>Auditoria financeira</h1><p>Ações novas usam a trilha normalizada do backend; registros anteriores permanecem disponíveis como histórico legado.</p></div>
      <div className="px-screen-head-aside"><button className="px-history-export" type="button" disabled={!filtered.length} onClick={() => exportHistory(filtered)}>Exportar histórico filtrado</button></div>
    </header>

    <div className="px-history-source-note"><strong>Fonte principal:</strong> `/finance/audit`, com usuário, ação e snapshots antes/depois. <strong>Compatibilidade:</strong> `AppState.activityLog` permanece somente para preservar ações anteriores à nova auditoria.</div>

    <section className="px-screen-kpis">
      <article><span>Ações hoje</span><strong>{todayCount}</strong><small>Horário de Brasília</small></article>
      <article><span>Usuários identificados</span><strong>{users.length}</strong><small>Auditoria + legado</small></article>
      <article><span>Auditoria normalizada</span><strong>{data.financialAudit.total}</strong><small>Registros estruturais</small></article>
      <article><span>Histórico legado</span><strong>{data.activities.length}</strong><small>Preservado para continuidade</small></article>
    </section>

    <section className="px-card px-history-panel">
      <div className="px-history-toolbar">
        <label className="px-search-field"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar descrição, ação ou usuário" /></label>
        <select value={period} onChange={(event) => setPeriod(event.target.value as PeriodFilter)}><option value="today">Hoje</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="all">Todo o histórico</option></select>
        <select value={source} onChange={(event) => setSource(event.target.value as SourceFilter)}><option value="all">Todas as fontes</option><option value="audit">Auditoria financeira</option><option value="legacy">Histórico legado</option></select>
        <select value={action} onChange={(event) => setAction(event.target.value)}><option value="all">Todas as ações</option>{actions.map((name) => <option key={name} value={name}>{actionLabel(name)}</option>)}</select>
        <select value={user} onChange={(event) => setUser(event.target.value)}><option value="all">Todos os usuários</option>{users.map((name) => <option key={name} value={name}>{name}</option>)}</select>
      </div>

      <div className="px-history-layout">
        <div className="px-history-feed">
          {filtered.map((item) => {
            const income = item.type === 'income';
            return <button key={item.id} type="button" className={`px-history-item ${selected?.id === item.id ? 'active' : ''}`} onClick={() => setSelectedId(item.id)}>
              <span className={`px-history-marker ${income ? 'income' : 'expense'}`}>{income ? '↗' : item.source === 'audit' ? '✓' : '↘'}</span>
              <span className="px-history-copy"><span className="px-history-title"><strong>{item.description}</strong><em>{actionLabel(item.action)}</em></span><span><b>{item.actor}</b> {actionVerb(item.action)} este registro</span><small>{dateTime.format(new Date(item.at))} · {item.source === 'audit' ? 'Auditoria financeira' : 'Histórico legado'}{item.paymentMethod ? ` · ${item.paymentMethod}` : ''}</small></span>
              <strong className={`px-history-value ${income ? 'income' : 'expense'}`}>{amountText(item)}</strong>
            </button>;
          })}
          {!filtered.length ? <div className="px-empty px-history-empty">Nenhuma ação corresponde aos filtros selecionados.</div> : null}
        </div>

        <aside className="px-history-detail">
          {selected ? <>
            <div className="px-panel-head"><div><span>Detalhes do registro</span><h2>{actionLabel(selected.action)}</h2></div><span className="px-status reconciled">{selected.source === 'audit' ? 'AUDITADO' : 'LEGADO'}</span></div>
            <dl>
              <div><dt>Data e hora</dt><dd>{dateTime.format(new Date(selected.at))}</dd></div>
              <div><dt>Usuário</dt><dd>{selected.actor}</dd></div>
              <div><dt>Origem</dt><dd>{selected.source === 'audit' ? 'Finance AuditLog' : 'AppState.activityLog'}</dd></div>
              <div><dt>Entidade</dt><dd>{selected.entity}</dd></div>
              <div><dt>ID do registro</dt><dd>{selected.entityId}</dd></div>
              <div><dt>Descrição</dt><dd>{selected.description}</dd></div>
              <div><dt>Valor</dt><dd>{amountText(selected)}</dd></div>
            </dl>

            {selected.source === 'audit' ? <div className="px-history-integrity"><strong>Antes / depois confirmado pelo backend</strong>
              <div className="px-history-snapshot-grid">
                <div><b>Antes</b>{beforeFields.length ? beforeFields.map(([label, value]) => <span key={`b-${label}`}><small>{label}</small><strong>{value}</strong></span>) : <span><small>Estado anterior</small><strong>Não aplicável</strong></span>}</div>
                <div><b>Depois</b>{afterFields.length ? afterFields.map(([label, value]) => <span key={`a-${label}`}><small>{label}</small><strong>{value}</strong></span>) : <span><small>Estado posterior</small><strong>Não aplicável</strong></span>}</div>
              </div>
            </div> : <div className="px-history-integrity"><strong>Registro legado preservado</strong><p>Este item antecede o contrato normalizado de auditoria. O snapshot operacional continua disponível, mas não é apresentado como um par estrutural garantido de “antes/depois”.</p></div>}

            {selected.recovery ? <div className="px-history-recovery"><strong>Recuperação de snapshot</strong><span>{selected.recovery.snapshotReason || 'Motivo não informado'}</span>{selected.recovery.snapshotCreatedAt ? <small>Snapshot de {dateTime.format(new Date(selected.recovery.snapshotCreatedAt))}</small> : null}</div> : null}
          </> : <div className="px-empty">Nenhum registro de histórico está disponível.</div>}
        </aside>
      </div>
    </section>
  </section>;
}
