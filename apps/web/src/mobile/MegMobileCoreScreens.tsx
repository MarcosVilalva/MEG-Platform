import { useMemo, useState } from 'react';
import type { FinancialEvent } from '../app/finance-client';
import type { PhoenixReadModel } from '../phoenix/contracts';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function signedAmount(event: FinancialEvent) {
  const signed = Number(event.signedAmount || 0);
  if (Number.isFinite(signed) && signed !== 0) return signed;
  const amount = Math.abs(Number(event.amount || 0));
  return event.type === 'income' || event.type === 'redemption' ? amount : -amount;
}

function statusLabel(status: string) {
  const value = String(status || '').toLowerCase();
  if (['paid','reconciled','confirmed'].includes(value)) return 'PAGO';
  if (value === 'planned') return 'PENDENTE';
  if (value === 'archived') return 'ARQUIVADO';
  return value.toUpperCase() || 'LANÇAMENTO';
}

function shortDate(value: string) {
  const raw = String(value || '').slice(0, 10);
  const [year, month, day] = raw.split('-');
  return year && month && day ? `${day}/${month}/${year}` : raw;
}

function EventGlyph({ positive }: { positive: boolean }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={positive ? 'M12 19V5M7 10l5-5 5 5' : 'M12 5v14M7 14l5 5 5-5'} /></svg>;
}

function SearchGlyph() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></svg>;
}

function FilterGlyph() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h8M16 7h4M4 17h4M12 17h8M4 12h12"/><circle cx="14" cy="7" r="2"/><circle cx="10" cy="17" r="2"/><circle cx="18" cy="12" r="2"/></svg>;
}

type MobileMovementKind = 'all' | 'income' | 'expense' | 'benefit';

function normalizeMovementText(value: unknown) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
}

function mobileMovementKind(event: FinancialEvent): Exclude<MobileMovementKind, 'all'> {
  const context = normalizeMovementText([
    event.description,
    event.category?.name,
    event.paymentMethod?.name,
    event.sourceDetails?.group,
    event.sourceDetails?.paymentMethod,
  ].filter(Boolean).join(' '));
  if (/aliment|verocard|beneficio/.test(context)) return 'benefit';
  return signedAmount(event) >= 0 ? 'income' : 'expense';
}

function EventContextGlyph({ event }: { event: FinancialEvent }) {
  const context = normalizeMovementText([
    event.description,
    event.category?.name,
    event.paymentMethod?.name,
    event.sourceDetails?.group,
    event.sourceDetails?.paymentMethod,
  ].filter(Boolean).join(' '));
  if (/aliment|verocard|fast food|restaurante|lanche|mercado/.test(context)) {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3v8M9 3v8M6 7h3M7.5 11v10M15 3v8c0 2 3 2 3 0V3M16.5 13v8"/></svg>;
  }
  if (/pix/.test(context)) {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 4 4-4 4-4-4 4-4ZM7 8l-4 4 4 4 4-4M17 8l4 4-4 4-4-4M12 13l4 4-4 4-4-4"/></svg>;
  }
  if (/cartao|credito|latam|itau|santander|bradesco|nubank|mercado pago/.test(context)) {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 9h18M7 15h4"/></svg>;
  }
  return <EventGlyph positive={signedAmount(event) >= 0}/>;
}

function movementTone(event: FinancialEvent) {
  return signedAmount(event) >= 0 ? 'income' : 'expense';
}

export function MegMobileMovements({
  data,
  onOpenEvent,
  onNew,
}: {
  data: PhoenixReadModel;
  onOpenEvent: (event: FinancialEvent) => void;
  onNew: () => void;
}) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<MobileMovementKind>('all');

  const posted = useMemo(() => data.events.items, [data.events.items]);
  const normalized = query.trim().toLocaleLowerCase('pt-BR');
  const rows = posted
    .filter((event) => !normalized || [
      event.description,
      event.category?.name,
      event.account?.name,
      event.paymentMethod?.name,
      event.sourceDetails?.group,
      event.sourceDetails?.paymentMethod,
    ].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR').includes(normalized))
    .filter((event) => kind === 'all' ? true : mobileMovementKind(event) === kind)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const totals = posted.reduce((summary, event) => {
    const value = signedAmount(event);
    if (value >= 0) summary.income += value;
    else summary.expense += Math.abs(value);
    return summary;
  }, { income: 0, expense: 0 });
  const result = totals.income - totals.expense;

  return <main className="meg3-screen meg3-movements" data-meg-fixed-screen="true">
    <header className="meg3-title-block meg3-movements-title">
      <span>CONTROLE FINANCEIRO</span>
      <h1>Lançamentos</h1>
      <p>Consulte cada lançamento com categoria, conta e forma de pagamento.</p>
    </header>

    <section className="meg3-movement-kpis" aria-label="Resumo dos lançamentos">
      <article className="income"><span aria-hidden="true">↑</span><small>Entradas</small><strong>{money.format(totals.income)}</strong></article>
      <article className="expense"><span aria-hidden="true">↓</span><small>Saídas</small><strong>{money.format(totals.expense)}</strong></article>
      <article className={result >= 0 ? 'result positive' : 'result negative'}><span aria-hidden="true">▥</span><small>Resultado</small><strong>{result >= 0 ? '+' : '-'}{money.format(Math.abs(result))}</strong></article>
    </section>

    <nav className="meg3-movement-tabs" aria-label="Tipo de lançamento">
      {([
        ['all','Todos'],
        ['income','Receitas'],
        ['expense','Despesas'],
        ['benefit','Alimentação'],
      ] as const).map(([value,label]) =>
        <button key={value} type="button" className={kind === value ? 'active' : ''} onClick={() => setKind(value)}>{label}</button>
      )}
    </nav>

    <section className="meg3-movement-toolbar">
      <label><SearchGlyph/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar lançamento..."/></label>
      <button type="button" aria-label="Limpar filtros" className={kind !== 'all' || query ? 'active' : ''} onClick={() => { setKind('all'); setQuery(''); }}><FilterGlyph/></button>
    </section>

    <header className="meg3-movement-list-head">
      <span><strong>{rows.length.toLocaleString('pt-BR')} lançamento{rows.length === 1 ? '' : 's'}</strong><small>{data.month.split('-').reverse().join('/')} · toque para abrir</small></span>
      <button type="button" onClick={onNew}><b aria-hidden="true">＋</b>Novo</button>
    </header>

    <section className="meg3-event-list" data-meg-scroll-region="true">
      {rows.map((event) => {
        const signed = signedAmount(event);
        const tone = movementTone(event);
        const category = event.category?.name || event.sourceDetails?.group || (signed >= 0 ? 'Receitas' : 'Despesas');
        const account = event.account?.name || '';
        const method = event.paymentMethod?.name || event.sourceDetails?.paymentMethod || '';
        const detail = [category, account].filter(Boolean).join(' · ');
        return <button className={`meg3-event-card ${tone} kind-${mobileMovementKind(event)}`} type="button" key={event.id} onClick={() => onOpenEvent(event)}>
          <span className="meg3-event-icon"><EventContextGlyph event={event}/></span>
          <span className="meg3-event-copy">
            <small>{shortDate(event.date)} · {statusLabel(event.status)}</small>
            <strong>{event.description}</strong>
            <em>{detail}</em>
            {method ? <i className="meg3-payment-chip">{method}</i> : <i className="meg3-payment-chip muted">Forma não informada</i>}
          </span>
          <span className="meg3-event-value">
            <b>{signed > 0 ? '+' : '-'}{money.format(Math.abs(signed))}</b>
            <i>›</i>
          </span>
        </button>;
      })}
      {!rows.length ? <div className="meg3-empty">Nenhum lançamento neste filtro.</div> : null}
    </section>
  </main>;
}

export function MegMobileHistory({ data }: { data: PhoenixReadModel }) {
  const items = useMemo(() => [...data.financialAudit.items].sort((a,b) => String(b.at || '').localeCompare(String(a.at || ''))), [data.financialAudit.items]);
  return <main className="meg3-screen meg3-history" data-meg-fixed-screen="true">
    <header className="meg3-title-block"><span>HISTÓRICO</span><h1>Atividades</h1><p>Alterações e confirmações registradas no MEG.</p></header>
    <section className="meg3-history-summary"><article><small>Registros</small><strong>{items.length.toLocaleString('pt-BR')}</strong></article><article><small>Período</small><strong>{data.month.split('-').reverse().join('/')}</strong></article></section>
    <section className="meg3-timeline" data-meg-scroll-region="true">
      {items.map((item) => <article key={item.id} className="meg3-timeline-item">
        <span className="meg3-timeline-dot"/>
        <div><small>{item.at ? new Date(item.at).toLocaleString('pt-BR') : 'Registro'}</small><strong>{String(item.action || 'ATUALIZAÇÃO').replace(/_/g,' ')}</strong><p>{item.entity}{item.entityId ? ` · ${item.entityId}` : ''}</p></div>
      </article>)}
      {!items.length ? <div className="meg3-empty">Nenhuma atividade encontrada.</div> : null}
    </section>
  </main>;
}

export function MegMobileCashflow({ data }: { data: PhoenixReadModel }) {
  const days = data.cashflow.days || [];
  return <main className="meg3-screen meg3-cashflow" data-meg-fixed-screen="true">
    <header className="meg3-title-block"><span>FLUXO DE CAIXA</span><h1>Movimento do mês</h1><p>Realizado e projetado no mesmo painel.</p></header>
    <section className="meg3-kpis meg3-kpis-2">
      <article><small>Saldo inicial</small><strong>{money.format(Number(data.cashflow.openingBalance || 0))}</strong></article>
      <article className="accent"><small>Fechamento realizado</small><strong>{money.format(Number(data.cashflow.realizedClosing || 0))}</strong></article>
      <article className="income"><small>Entradas</small><strong>{money.format(Number(data.cashflow.totalIncome || 0))}</strong></article>
      <article className="expense"><small>Saídas</small><strong>{money.format(Number(data.cashflow.totalExpense || 0))}</strong></article>
    </section>
    <section className="meg3-cashflow-list" data-meg-scroll-region="true">
      {days.map((day) => <article key={day.date}>
        <span><strong>{shortDate(day.date)}</strong><small>{day.eventCount} lançamento(s)</small></span>
        <span className="income">+{money.format(Number(day.income || 0))}</span>
        <span className="expense">-{money.format(Number(day.expense || 0))}</span>
        <b>{money.format(Number(day.realizedBalance || day.projectedBalance || 0))}</b>
      </article>)}
      {!days.length ? <div className="meg3-empty">Nenhum movimento diário neste período.</div> : null}
    </section>
  </main>;
}

export function MegMobileAnalytics({ data }: { data: PhoenixReadModel }) {
  const categories = data.analytics.categories || [];
  const max = Math.max(1, ...categories.map((item) => Number(item.amount || 0)));
  return <main className="meg3-screen meg3-analytics" data-meg-fixed-screen="true">
    <header className="meg3-title-block"><span>RELATÓRIOS</span><h1>Visão financeira</h1><p>Leitura objetiva do comportamento do período.</p></header>
    <section className="meg3-kpis meg3-kpis-2">
      <article className="income"><small>Receitas</small><strong>{money.format(Number(data.analytics.summary.realizedIncome || 0))}</strong></article>
      <article className="expense"><small>Despesas</small><strong>{money.format(Number(data.analytics.summary.realizedExpense || 0))}</strong></article>
      <article><small>Média diária</small><strong>{money.format(Number(data.analytics.dailyAverageExpense || 0))}</strong></article>
      <article className="accent"><small>Concentração Top 3</small><strong>{Number(data.analytics.concentrationTop3 || 0).toLocaleString('pt-BR',{maximumFractionDigits:1})}%</strong></article>
    </section>
    <section className="meg3-analytics-list" data-meg-scroll-region="true">
      <header><strong>Despesas por categoria</strong><small>Distribuição do período</small></header>
      {categories.map((item) => <article key={item.name}>
        <div><span><strong>{item.name}</strong><small>{money.format(Number(item.amount || 0))}</small></span><div><i style={{width:`${Math.max(3, Math.min(100, Number(item.amount || 0) / max * 100))}%`}}/></div></div>
      </article>)}
      {!categories.length ? <div className="meg3-empty">Sem dados suficientes para o período.</div> : null}
    </section>
  </main>;
}
