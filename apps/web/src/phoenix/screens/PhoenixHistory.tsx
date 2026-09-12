import { useMemo, useState } from 'react';
import type { PhoenixActivity, PhoenixReadModel } from '../contracts';
import '../phoenix-history.css';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateTime = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
});

type PeriodFilter = 'today' | '7' | '30' | 'all';

function localDay(value: string | Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date(value));
}

function actionLabel(action: string) {
  return ({
    CREATED: 'Inclusão',
    UPDATED: 'Alteração',
    DELETED: 'Exclusão',
    RECOVERED: 'Recuperação'
  } as Record<string, string>)[action] || action || 'Atualização';
}

function actionVerb(action: string) {
  return ({
    CREATED: 'incluiu',
    UPDATED: 'alterou',
    DELETED: 'excluiu',
    RECOVERED: 'recuperou'
  } as Record<string, string>)[action] || 'atualizou';
}

function amountText(item: PhoenixActivity) {
  const transaction = item.transaction;
  const amount = Math.abs(Number(transaction?.amount || 0));
  if (!amount) return '—';
  return `${transaction?.type === 'income' ? '+' : '−'} ${money.format(amount)}`;
}

function insidePeriod(item: PhoenixActivity, period: PeriodFilter) {
  if (period === 'all') return true;
  const now = new Date();
  if (period === 'today') return localDay(item.at) === localDay(now);
  const days = Number(period);
  const boundary = new Date(now.getTime() - days * 86400000);
  return new Date(item.at).getTime() >= boundary.getTime();
}

function csvCell(value: unknown) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function exportHistory(items: PhoenixActivity[]) {
  const rows = [
    ['Data/hora', 'Ação', 'Usuário', 'Descrição', 'Tipo', 'Valor', 'Forma de pagamento', 'Grupo', 'Situação', 'ID do registro'],
    ...items.map((item) => [
      dateTime.format(new Date(item.at)),
      actionLabel(item.action),
      item.userName || item.userId || 'Usuário MEG',
      item.transaction?.description || 'Lançamento',
      item.transaction?.type || '',
      Number(item.transaction?.amount || 0).toFixed(2).replace('.', ','),
      item.transaction?.paymentMethod || '',
      item.transaction?.group || '',
      item.transaction?.status || '',
      item.transactionId || item.id
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

export function PhoenixHistory({ data }: { data: PhoenixReadModel }) {
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<PeriodFilter>('30');
  const [action, setAction] = useState('all');
  const [user, setUser] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const users = useMemo(() => [...new Set(data.activities.map((item) => item.userName || item.userId || 'Usuário MEG'))].sort(), [data.activities]);
  const today = localDay(new Date());
  const todayCount = data.activities.filter((item) => localDay(item.at) === today).length;

  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('pt-BR');
    return data.activities.filter((item) => {
      const actor = item.userName || item.userId || 'Usuário MEG';
      const transaction = item.transaction;
      const haystack = [transaction?.description, actionLabel(item.action), actor, transaction?.paymentMethod, transaction?.group, item.transactionId]
        .filter(Boolean).join(' ').toLocaleLowerCase('pt-BR');
      return (!needle || haystack.includes(needle))
        && insidePeriod(item, period)
        && (action === 'all' || item.action === action)
        && (user === 'all' || actor === user);
    });
  }, [data.activities, search, period, action, user]);

  const selected = data.activities.find((item) => item.id === selectedId) || filtered[0] || null;

  return <section className="px-screen px-history-screen">
    <header className="px-screen-head">
      <div><span className="px-kicker">Histórico</span><h1>Auditoria operacional</h1><p>Consulte as ações registradas no activityLog real, do mais novo para o mais antigo.</p></div>
      <div className="px-screen-head-aside"><button className="px-history-export" type="button" disabled={!filtered.length} onClick={() => exportHistory(filtered)}>Exportar histórico filtrado</button></div>
    </header>

    <div className="px-history-source-note"><strong>Fonte confirmada:</strong> AppState.activityLog. Esta tela não apresenta “antes/depois” enquanto o AuditLog estrutural do banco não tiver um contrato de consulta financeira próprio.</div>

    <section className="px-screen-kpis">
      <article><span>Ações hoje</span><strong>{todayCount}</strong><small>Horário de Brasília</small></article>
      <article><span>Usuários ativos</span><strong>{users.length}</strong><small>Identificados no histórico disponível</small></article>
      <article><span>Registros disponíveis</span><strong>{data.activities.length}</strong><small>ActivityLog persistido</small></article>
      <article><span>Exibidos</span><strong>{filtered.length}</strong><small>Após os filtros atuais</small></article>
    </section>

    <section className="px-card px-history-panel">
      <div className="px-history-toolbar">
        <label className="px-search-field"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar descrição, ação ou usuário" /></label>
        <select value={period} onChange={(event) => setPeriod(event.target.value as PeriodFilter)}><option value="today">Hoje</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="all">Todo o histórico</option></select>
        <select value={action} onChange={(event) => setAction(event.target.value)}><option value="all">Todas as ações</option><option value="CREATED">Inclusão</option><option value="UPDATED">Alteração</option><option value="DELETED">Exclusão</option><option value="RECOVERED">Recuperação</option></select>
        <select value={user} onChange={(event) => setUser(event.target.value)}><option value="all">Todos os usuários</option>{users.map((name) => <option key={name} value={name}>{name}</option>)}</select>
      </div>

      <div className="px-history-layout">
        <div className="px-history-feed">
          {filtered.map((item) => {
            const actor = item.userName || item.userId || 'Usuário MEG';
            const description = item.transaction?.description || 'Lançamento';
            const income = item.transaction?.type === 'income';
            return <button key={item.id} type="button" className={`px-history-item ${selected?.id === item.id ? 'active' : ''}`} onClick={() => setSelectedId(item.id)}>
              <span className={`px-history-marker ${income ? 'income' : 'expense'}`}>{income ? '↗' : '↘'}</span>
              <span className="px-history-copy"><span className="px-history-title"><strong>{description}</strong><em>{actionLabel(item.action)}</em></span><span><b>{actor}</b> {actionVerb(item.action)} este registro</span><small>{dateTime.format(new Date(item.at))}{item.transaction?.paymentMethod ? ` · ${item.transaction.paymentMethod}` : ''}{item.transaction?.group ? ` · ${item.transaction.group}` : ''}</small></span>
              <strong className={`px-history-value ${income ? 'income' : 'expense'}`}>{amountText(item)}</strong>
            </button>;
          })}
          {!filtered.length ? <div className="px-empty px-history-empty">Nenhuma ação corresponde aos filtros selecionados.</div> : null}
        </div>

        <aside className="px-history-detail">
          {selected ? <>
            <div className="px-panel-head"><div><span>Detalhes do registro</span><h2>{actionLabel(selected.action)}</h2></div><span className="px-status reconciled">REGISTRADO</span></div>
            <dl>
              <div><dt>Data e hora</dt><dd>{dateTime.format(new Date(selected.at))}</dd></div>
              <div><dt>Usuário</dt><dd>{selected.userName || selected.userId || 'Usuário MEG'}</dd></div>
              <div><dt>Origem</dt><dd>AppState.activityLog</dd></div>
              <div><dt>ID do registro</dt><dd>{selected.transactionId || selected.id}</dd></div>
              <div><dt>Descrição</dt><dd>{selected.transaction?.description || '—'}</dd></div>
              <div><dt>Valor</dt><dd>{amountText(selected)}</dd></div>
              <div><dt>Forma de pagamento</dt><dd>{selected.transaction?.paymentMethod || '—'}</dd></div>
              <div><dt>Grupo</dt><dd>{selected.transaction?.group || '—'}</dd></div>
              <div><dt>Situação registrada</dt><dd>{selected.transaction?.status || '—'}</dd></div>
            </dl>
            {selected.recovery ? <div className="px-history-recovery"><strong>Recuperação de snapshot</strong><span>{selected.recovery.snapshotReason || 'Motivo não informado'}</span>{selected.recovery.snapshotCreatedAt ? <small>Snapshot de {dateTime.format(new Date(selected.recovery.snapshotCreatedAt))}</small> : null}</div> : null}
            <div className="px-history-integrity"><strong>Integridade da informação</strong><p>O activityLog preserva o snapshot operacional associado à ação, mas não contém um par completo e garantido de valores “antes” e “depois”. Por isso essa comparação permanece desabilitada.</p></div>
          </> : <div className="px-empty">Nenhum registro operacional está disponível no activityLog.</div>}
        </aside>
      </div>
    </section>
  </section>;
}
