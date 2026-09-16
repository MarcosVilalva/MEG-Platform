import { useMemo } from 'react';
import type { PhoenixReadModel } from '../contracts';
import { buildPhoenixHomeAgenda, type PhoenixHomeAgendaItem } from '../home-agenda';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const whole = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

type HomeRoute = 'home' | 'movements' | 'history' | 'payables' | 'cards' | 'catalogs' | 'users' | 'settings' | 'receivables' | 'revenues' | 'cashflow' | 'reconcile' | 'analytics' | 'budgets';
type AgendaDisplayGroup = {
  key: string;
  dueDate: string;
  title: string;
  subtitle: string;
  amount: number;
  items: PhoenixHomeAgendaItem[];
};

function todayIso() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const read = (type: string) => parts.find((item) => item.type === type)?.value || '';
  return `${read('year')}-${read('month')}-${read('day')}`;
}

function monthLabel(value: string) {
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, 1)))
    .replace(/^./, (letter) => letter.toUpperCase());
}

function shortDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}` : value;
}

function agendaDisplayGroups(items: PhoenixHomeAgendaItem[]) {
  const buckets = new Map<string, AgendaDisplayGroup>();
  items.forEach((item) => {
    const dueDate = item.dueDate.slice(0, 10);
    const isCard = item.kind === 'FATURA' || Boolean(item.cardLabel);
    const title = isCard ? `Fatura ${item.cardLabel || 'Cartão'}` : item.description;
    const key = isCard ? `card|${item.cardLabel || 'Cartão'}|${dueDate}` : `item|${item.id}`;
    const current = buckets.get(key) || {
      key,
      dueDate,
      title,
      subtitle: isCard ? 'Compras agrupadas por cartão e vencimento' : item.meta,
      amount: 0,
      items: []
    };
    current.amount += item.amount;
    current.items.push(item);
    buckets.set(key, current);
  });
  return [...buckets.values()].sort((left, right) => left.dueDate.localeCompare(right.dueDate) || left.title.localeCompare(right.title, 'pt-BR'));
}

function statusForDate(dueDate: string, today: string) {
  if (dueDate < today) return 'VENCIDO';
  if (dueDate === today) return 'HOJE';
  return 'PRÓXIMO';
}

export function PhoenixHomeDashboard({ data, month, onNavigate }: { data: PhoenixReadModel; month: string; onNavigate: (view: HomeRoute) => void }) {
  const today = todayIso();
  const agenda = useMemo(() => buildPhoenixHomeAgenda(data, today), [data, today]);
  const agendaRows = useMemo(() => agendaDisplayGroups(agenda.items), [agenda.items]);
  const visibleAgenda = agendaRows.slice(0, 5);
  const hiddenAgendaCount = Math.max(0, agendaRows.length - visibleAgenda.length);

  const pendingAmount = data.summary.pendingAmount || 0;
  const realizedBalance = data.summary.availableBalance + data.summary.realizedResult;
  const projectedClosing = data.cashflow.projectedClosing;
  const freeAfterCommitments = realizedBalance - pendingAmount;
  const nextDue = agendaRows.find((item) => item.dueDate >= today) || agendaRows[0];
  const coverageRaw = pendingAmount > 0 ? (realizedBalance / pendingAmount) * 100 : 100;
  const coverageBar = Math.max(0, Math.min(100, coverageRaw));
  const healthy = projectedClosing >= 0 && freeAfterCommitments >= 0;
  const heroStatus = healthy ? 'Mês sob controle' : projectedClosing >= 0 ? 'Fluxo apertado' : 'Atenção ao fluxo';

  return <>
    <div className="px-page-head">
      <div>
        <span className="px-kicker">Visão geral</span>
        <h1>{monthLabel(month)}</h1>
        <p>O essencial para decidir o que fazer agora, sem transformar a Home em um relatório completo.</p>
        <span className="px-updated">Atualizado agora · {data.normalization.primary && data.normalization.reconciled ? 'dados sincronizados' : 'integridade em verificação'}</span>
      </div>
    </div>

    <section className="px-dashboard-grid px-home-balance-grid">
      <article className={`px-card px-home-hero ${healthy ? 'is-healthy' : 'is-attention'}`}>
        <div className="px-home-hero-rings" aria-hidden="true"><i /><i /><i /></div>
        <div className="px-home-hero-primary">
          <div className="px-home-hero-status"><span className="px-home-hero-status-dot" />{heroStatus}</div>
          <span className="px-kicker">Saldo monetário atual</span>
          <h2>{money.format(realizedBalance)}</h2>
          <p>Valor efetivamente disponível agora. Receitas futuras só entram quando forem realizadas.</p>
          <div className="px-home-coverage">
            <div><span>Cobertura dos compromissos</span><strong>{whole.format(coverageRaw)}%</strong></div>
            <div className="px-home-coverage-track"><i style={{ width: `${coverageBar}%` }} /></div>
          </div>
        </div>

        <div className="px-home-hero-insights">
          <article className="px-home-insight is-free"><span>Dinheiro livre</span><strong className={freeAfterCommitments < 0 ? 'negative' : ''}>{money.format(freeAfterCommitments)}</strong><small>Saldo atual menos pendências</small></article>
          <article className="px-home-insight is-due"><span>Próximo vencimento</span><strong>{nextDue ? money.format(nextDue.amount) : '—'}</strong><small>{nextDue ? `${shortDate(nextDue.dueDate)} · ${nextDue.title}` : 'Nenhum vencimento no período'}</small></article>
          <article className={`px-home-insight ${projectedClosing < 0 ? 'is-negative' : 'is-projected'}`}><span>Fechamento projetado</span><strong>{money.format(projectedClosing)}</strong><small>{projectedClosing >= 0 ? 'Projeção positiva' : 'Projeção abaixo de zero'}</small></article>
        </div>

        <div className="px-home-hero-footer">
          <div><span>Receitas realizadas</span><strong>{money.format(data.summary.realizedIncome)}</strong></div>
          <div><span>Despesas pagas</span><strong>{money.format(data.summary.realizedExpense)}</strong></div>
          <div><span>Benefício disponível</span><strong>{money.format(data.summary.benefitBalance)}</strong></div>
        </div>
      </article>
    </section>

    <section className="px-metrics">
      <article className="px-card px-metric bad"><span>Pendências</span><strong>{money.format(pendingAmount)}</strong><small>{agenda.items.length} compromisso(s) acionável(is)</small></article>
      <article className="px-card px-metric info px-benefit-control"><span>Benefício alimentação</span><strong>{money.format(data.summary.benefitBalance)}</strong><div className="px-benefit-inline"><div><span>Créditos</span><b>{money.format(data.summary.benefitCredits)}</b></div><div><span>Utilizado</span><b>{money.format(data.summary.benefitUsed)}</b></div><button type="button" onClick={() => onNavigate('movements')}>Ver extrato</button></div></article>
      <article className={`px-card px-metric ${projectedClosing < 0 ? 'bad' : 'good'}`}><span>Fechamento projetado</span><strong>{money.format(projectedClosing)}</strong><small>{projectedClosing >= 0 ? 'Fluxo previsto positivo' : 'Exige atenção no período'}</small></article>
    </section>

    <section className="px-bottom-grid px-home-action-grid">
      <article className="px-card px-home-scroll-card px-home-agenda-card">
        <div className="px-panel-head">
          <div><span>Prioridades</span><h2>Próximos compromissos</h2></div>
          <div className="px-home-panel-actions"><strong>{money.format(agenda.actionableAmount)}</strong><button className="px-dashboard-row-action" type="button" onClick={() => onNavigate('payables')}>Abrir Pendentes</button></div>
        </div>
        <div className="px-home-scroll-list">
          {visibleAgenda.map((group) => {
            const status = statusForDate(group.dueDate, today);
            return <div className="px-dashboard-row px-home-agenda-row" key={group.key}>
              <div className={`px-home-due-date ${status === 'VENCIDO' ? 'danger' : status === 'HOJE' ? 'today' : ''}`}><strong>{shortDate(group.dueDate)}</strong><small>{status}</small></div>
              <div className="px-dashboard-row-copy"><strong>{group.title}</strong><small>{group.items.length > 1 ? `${group.items.length} lançamentos agrupados · ` : ''}{group.subtitle}</small></div>
              <strong className="px-home-row-value">{money.format(group.amount)}</strong>
              <button className="px-dashboard-row-action" type="button" onClick={() => onNavigate('payables')}>Ver</button>
            </div>;
          })}
          {!visibleAgenda.length ? <div className="px-home-empty-state"><strong>Nenhum vencimento acionável</strong><span>Não há compromissos em aberto no período selecionado.</span></div> : null}
        </div>
        {hiddenAgendaCount ? <div className="px-home-panel-actions"><span className="px-toolbar-note">+ {hiddenAgendaCount} compromisso(s) na agenda</span><button className="px-dashboard-row-action" type="button" onClick={() => onNavigate('payables')}>Ver todos</button></div> : null}
      </article>

      <article className="px-card px-home-scroll-card">
        <div className="px-panel-head"><div><span>Acesso rápido</span><h2>Continuar trabalhando</h2></div></div>
        <div className="px-home-scroll-list">
          <div className="px-dashboard-row"><div className="px-dashboard-row-copy"><strong>Lançamentos</strong><small>Incluir, editar, filtrar ou localizar movimentações.</small></div><button className="px-dashboard-row-action" type="button" onClick={() => onNavigate('movements')}>Abrir</button></div>
          <div className="px-dashboard-row"><div className="px-dashboard-row-copy"><strong>Pendentes</strong><small>Selecionar contas e organizar as próximas baixas.</small></div><button className="px-dashboard-row-action" type="button" onClick={() => onNavigate('payables')}>Abrir</button></div>
          <div className="px-dashboard-row"><div className="px-dashboard-row-copy"><strong>Cartões</strong><small>Conferir faturas, limites e compras agrupadas.</small></div><button className="px-dashboard-row-action" type="button" onClick={() => onNavigate('cards')}>Abrir</button></div>
          <div className="px-dashboard-row"><div className="px-dashboard-row-copy"><strong>Histórico</strong><small>Consultar auditoria e alterações sem ocupar a Home.</small></div><button className="px-dashboard-row-action" type="button" onClick={() => onNavigate('history')}>Abrir</button></div>
        </div>
      </article>
    </section>
  </>;
}
