import { useMemo, useState } from 'react';
import type { PhoenixActivity, PhoenixFinancialAuditItem, PhoenixReadModel } from '../contracts';
import '../phoenix-history.css';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateTime = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
});
const dateOnly = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo'
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

type SnapshotField = [string, string];

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

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
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
    CARD_CREATED: 'Cartão cadastrado',
    CARD_UPDATED: 'Cadastro do cartão alterado',
    CARD_DEACTIVATED: 'Cartão desativado',
    CARD_REACTIVATED: 'Cartão reativado',
    CARD_PURCHASE_CREATED: 'Compra criada',
    CARD_PURCHASE_UPDATED: 'Compra alterada',
    CARD_PURCHASE_CANCELLED: 'Compra cancelada',
    CARD_STATEMENT_PAID: 'Fatura paga',
    RECEIVABLE_RECEIVED: 'Recebimento'
  } as Record<string, string>)[action] || action || 'Atualização';
}

function actionVerb(action: string) {
  return ({
    CREATED: 'incluiu', UPDATED: 'alterou', DELETED: 'excluiu', RECOVERED: 'recuperou',
    FINANCIAL_EVENT_CREATED: 'incluiu', FINANCIAL_EVENT_UPDATED: 'alterou', FINANCIAL_EVENT_ARCHIVED: 'arquivou',
    PAYABLE_PAYMENT_CREATED: 'baixou', RECURRING_EXPENSE_CREATED: 'criou',
    CARD_CREATED: 'cadastrou', CARD_UPDATED: 'alterou', CARD_DEACTIVATED: 'desativou', CARD_REACTIVATED: 'reativou',
    CARD_PURCHASE_CREATED: 'incluiu', CARD_PURCHASE_UPDATED: 'alterou', CARD_PURCHASE_CANCELLED: 'cancelou', CARD_STATEMENT_PAID: 'pagou',
    RECEIVABLE_RECEIVED: 'recebeu'
  } as Record<string, string>)[action] || 'atualizou';
}

function entityLabel(entity: string) {
  return ({
    FinancialEvent: 'Lançamento',
    FinancialTransfer: 'Transferência',
    Payable: 'Conta a pagar',
    RecurringExpense: 'Recorrência',
    CreditCard: 'Cartão de crédito',
    CardPurchase: 'Compra no cartão',
    Receivable: 'Conta a receber',
    Receipt: 'Recebimento',
    LegacyTransaction: 'Lançamento legado'
  } as Record<string, string>)[entity] || entity;
}

function isCardAction(item: Pick<HistoryRow, 'action' | 'entity'>) {
  return item.action.startsWith('CARD_') || item.entity === 'CardPurchase' || item.entity === 'CreditCard';
}

function isCardMonetaryAction(action: string) {
  return action.startsWith('CARD_PURCHASE_') || action === 'CARD_STATEMENT_PAID';
}

function cardNameFrom(source: Snapshot, context: Record<string, unknown>, data: PhoenixReadModel) {
  const nested = nestedName(source.card);
  if (nested) return nested;
  if (typeof source.name === 'string' && source.name.trim()) return source.name.trim();
  const cardId = text(source.cardId) || text(context.cardId) || text(context.previousCardId);
  return data.cards.find((card) => card.id === cardId)?.name || '';
}

function auditRow(item: PhoenixFinancialAuditItem, data: PhoenixReadModel): HistoryRow {
  const after = record(item.after);
  const before = record(item.before);
  const context = item.context || {};
  const source = Object.keys(after).length ? after : before;
  const amount = Number(source.amount ?? source.totalAmount ?? context.principal ?? context.amount ?? 0);
  const cardName = cardNameFrom(source, context, data) || cardNameFrom(before, context, data);
  const month = text(source.month) || text(context.month);
  const description = item.action === 'CARD_STATEMENT_PAID'
    ? `Fatura ${cardName || 'do cartão'}${month ? ` ${month}` : ''}`
    : String(source.description || source.name || context.description || `${entityLabel(item.entity)} ${item.entityId.slice(0, 8)}`);
  const type = typeof source.type === 'string'
    ? source.type
    : isCardMonetaryAction(item.action) ? 'expense' : undefined;
  return {
    id: `audit-${item.id}`,
    at: item.at,
    source: 'audit',
    action: item.action,
    actor: item.actor?.name || item.actor?.email || item.actor?.id || 'Usuário MEG',
    entity: item.entity,
    entityId: item.entityId,
    description,
    type,
    amount: Number.isFinite(amount) && amount !== 0 ? amount : undefined,
    paymentMethod: cardName || nestedName(source.paymentMethod) || (typeof context.paymentMethod === 'string' ? context.paymentMethod : undefined),
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
    ['Data/hora', 'Fonte', 'Ação', 'Usuário', 'Domínio', 'Descrição', 'Tipo', 'Valor', 'Cartão/Forma', 'Grupo', 'Situação', 'ID do registro'],
    ...items.map((item) => [
      dateTime.format(new Date(item.at)), item.source === 'audit' ? 'Auditoria financeira' : 'Histórico legado',
      actionLabel(item.action), item.actor, entityLabel(item.entity), item.description, item.type || '',
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

function formatDateValue(value: unknown) {
  if (!value) return '';
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? String(value) : dateOnly.format(parsed);
}

function snapshotFields(value: unknown, context: Record<string, unknown>, data: PhoenixReadModel): SnapshotField[] {
  const item = record(value);
  const fields: SnapshotField[] = [];
  const add = (label: string, raw: unknown) => {
    if (raw === null || raw === undefined || raw === '') return;
    fields.push([label, String(raw)]);
  };
  const addMoney = (label: string, raw: unknown) => {
    if (raw === null || raw === undefined || raw === '') return;
    const amount = Number(raw);
    if (!Number.isFinite(amount)) return;
    fields.push([label, money.format(Math.abs(amount))]);
  };

  add('Descrição', item.description);
  add('Nome do cartão', item.name);
  add('Emissor / banco', item.issuer);
  add('Bandeira', item.brand);
  add('Final do cartão', item.lastFour);
  addMoney('Limite', item.creditLimit);
  add('Dia do fechamento', item.closingDay);
  add('Dia do vencimento', item.dueDay);
  if (typeof item.isActive === 'boolean') add('Situação do cartão', item.isActive ? 'Ativo' : 'Inativo');
  add('Tipo', item.type);
  add('Situação', item.status);
  if (item.purchaseDate) add('Data da compra', formatDateValue(item.purchaseDate));
  else if (item.date) add('Data', formatDateValue(item.date));
  add('Competência', item.competence);
  add('Fatura', item.statementMonth || item.month);
  addMoney('Valor', item.amount);
  addMoney('Valor total', item.totalAmount);
  if (item.openAmount !== undefined) addMoney('Saldo aberto', item.openAmount);
  add('Parcelas', item.installments);
  add('Cartão', cardNameFrom(item, context, data));
  add('Conta', nestedName(item.account));
  add('Classificação', nestedName(item.category));
  add('Forma de pagamento', nestedName(item.paymentMethod));
  return fields;
}

function changedSnapshotFields(beforeFields: SnapshotField[], afterFields: SnapshotField[]) {
  const before = new Map(beforeFields);
  const after = new Map(afterFields);
  const labels = [...new Set([...before.keys(), ...after.keys()])];
  return labels
    .map((label) => ({ label, before: before.get(label) || '—', after: after.get(label) || '—' }))
    .filter((item) => item.before !== item.after);
}

export function PhoenixHistory({ data }: { data: PhoenixReadModel }) {
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<PeriodFilter>('30');
  const [action, setAction] = useState('all');
  const [user, setUser] = useState('all');
  const [source, setSource] = useState<SourceFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows = useMemo(() => [
    ...data.financialAudit.items.map((item) => auditRow(item, data)),
    ...data.activities.map(legacyRow),
  ].sort((left, right) => String(right.at).localeCompare(String(left.at))), [data]);
  const users = useMemo(() => [...new Set(rows.map((item) => item.actor))].sort(), [rows]);
  const today = localDay(new Date());
  const todayCount = rows.filter((item) => localDay(item.at) === today).length;
  const cardActionCount = rows.filter((item) => item.source === 'audit' && isCardAction(item)).length;
  const actions = useMemo(() => [...new Set(rows.map((item) => item.action))].sort(), [rows]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('pt-BR');
    return rows.filter((item) => {
      const haystack = [item.description, actionLabel(item.action), item.actor, entityLabel(item.entity), item.paymentMethod, item.group, item.entityId]
        .filter(Boolean).join(' ').toLocaleLowerCase('pt-BR');
      return (!needle || haystack.includes(needle))
        && insidePeriod(item, period)
        && (action === 'all' || item.action === action)
        && (user === 'all' || item.actor === user)
        && (source === 'all' || item.source === source);
    });
  }, [rows, search, period, action, user, source]);

  const selected = rows.find((item) => item.id === selectedId) || filtered[0] || null;
  const selectedContext = selected?.context || {};
  const beforeFields = selected?.source === 'audit' ? snapshotFields(selected.before, selectedContext, data) : [];
  const afterFields = selected?.source === 'audit' ? snapshotFields(selected.after, selectedContext, data) : [];
  const changeTitle = selected?.action === 'CARD_PURCHASE_UPDATED'
    ? 'O que mudou nesta compra'
    : selected?.action === 'CARD_UPDATED'
      ? 'O que mudou no cadastro do cartão'
      : selected?.action === 'CARD_DEACTIVATED' || selected?.action === 'CARD_REACTIVATED'
        ? 'Mudança de situação do cartão'
        : '';
  const changedFields = changeTitle ? changedSnapshotFields(beforeFields, afterFields) : [];

  return <section className="px-screen px-history-screen">
    <header className="px-screen-head">
      <div><span className="px-kicker">Histórico</span><h1>Auditoria financeira</h1><p>Ações novas usam a trilha normalizada do backend; registros anteriores permanecem disponíveis como histórico legado.</p></div>
      <div className="px-screen-head-aside"><button className="px-history-export" type="button" disabled={!filtered.length} onClick={() => exportHistory(filtered)}>Exportar histórico filtrado</button></div>
    </header>

    <div className="px-history-source-note"><strong>Fonte principal:</strong> `/finance/audit`, com usuário, ação e snapshots antes/depois. <strong>Cartões:</strong> cadastro, alteração, desativação, reativação, compras e pagamento de faturas ficam identificados separadamente. <strong>Compatibilidade:</strong> `AppState.activityLog` permanece somente para preservar ações anteriores à nova auditoria.</div>

    <section className="px-screen-kpis">
      <article><span>Ações hoje</span><strong>{todayCount}</strong><small>Horário de Brasília</small></article>
      <article><span>Usuários identificados</span><strong>{users.length}</strong><small>Auditoria + legado</small></article>
      <article><span>Auditoria normalizada</span><strong>{data.financialAudit.total}</strong><small>{cardActionCount} ações de cartões/faturas</small></article>
      <article><span>Histórico legado</span><strong>{data.activities.length}</strong><small>Preservado para continuidade</small></article>
    </section>

    <section className="px-card px-history-panel">
      <div className="px-history-toolbar">
        <label className="px-search-field"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar descrição, ação, cartão ou usuário" /></label>
        <select value={period} onChange={(event) => setPeriod(event.target.value as PeriodFilter)}><option value="today">Hoje</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="all">Todo o histórico</option></select>
        <select value={source} onChange={(event) => setSource(event.target.value as SourceFilter)}><option value="all">Todas as fontes</option><option value="audit">Auditoria financeira</option><option value="legacy">Histórico legado</option></select>
        <select value={action} onChange={(event) => setAction(event.target.value)}><option value="all">Todas as ações</option>{actions.map((name) => <option key={name} value={name}>{actionLabel(name)}</option>)}</select>
        <select value={user} onChange={(event) => setUser(event.target.value)}><option value="all">Todos os usuários</option>{users.map((name) => <option key={name} value={name}>{name}</option>)}</select>
      </div>

      <div className="px-history-layout">
        <div className="px-history-feed">
          {filtered.map((item) => {
            const income = item.type === 'income';
            const cardAudit = item.source === 'audit' && isCardAction(item);
            return <button key={item.id} type="button" className={`px-history-item ${selected?.id === item.id ? 'active' : ''}`} onClick={() => setSelectedId(item.id)}>
              <span className={`px-history-marker ${income ? 'income' : 'expense'}`}>{income ? '↗' : cardAudit ? '▣' : item.source === 'audit' ? '✓' : '↘'}</span>
              <span className="px-history-copy"><span className="px-history-title"><strong>{item.description}</strong><em>{actionLabel(item.action)}</em></span><span><b>{item.actor}</b> {actionVerb(item.action)} este registro</span><small>{dateTime.format(new Date(item.at))} · {item.source === 'audit' ? entityLabel(item.entity) : 'Histórico legado'}{item.paymentMethod ? ` · ${item.paymentMethod}` : ''}</small></span>
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
              <div><dt>Domínio</dt><dd>{entityLabel(selected.entity)}</dd></div>
              <div><dt>ID do registro</dt><dd>{selected.entityId}</dd></div>
              <div><dt>Descrição</dt><dd>{selected.description}</dd></div>
              <div><dt>Valor</dt><dd>{amountText(selected)}</dd></div>
              {selected.paymentMethod ? <div><dt>{isCardAction(selected) ? 'Cartão' : 'Forma'}</dt><dd>{selected.paymentMethod}</dd></div> : null}
              {selected.group ? <div><dt>Classificação</dt><dd>{selected.group}</dd></div> : null}
            </dl>

            {changedFields.length ? <div className="px-history-integrity"><strong>{changeTitle}</strong>
              <div className="px-history-snapshot-grid">
                <div><b>Antes</b>{changedFields.map((item) => <span key={`change-before-${item.label}`}><small>{item.label}</small><strong>{item.before}</strong></span>)}</div>
                <div><b>Depois</b>{changedFields.map((item) => <span key={`change-after-${item.label}`}><small>{item.label}</small><strong>{item.after}</strong></span>)}</div>
              </div>
            </div> : null}

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
