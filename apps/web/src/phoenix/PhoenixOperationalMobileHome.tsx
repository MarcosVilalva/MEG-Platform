import type { PhoenixReadModel } from './contracts';
import { buildPhoenixHomeAgenda } from './home-agenda';

type LaunchPreset = 'expense' | 'income' | 'benefit';

type Props = {
  data: PhoenixReadModel;
  onLaunch: (preset: LaunchPreset) => void;
  onNavigate: (view: 'movements' | 'history' | 'payables') => void;
};

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const shortDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' });

function todayIso() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
}

function eventTypeLabel(type: string) {
  return type === 'income' || type === 'redemption' ? 'Receita' : type === 'transfer' ? 'Transferência' : 'Despesa';
}

function eventAmount(event: PhoenixReadModel['events']['items'][number]) {
  const signed = Number(event.signedAmount || 0);
  if (event.type === 'income' || event.type === 'redemption') return Math.abs(signed || Number(event.amount || 0));
  return -Math.abs(signed || Number(event.amount || 0));
}

export function PhoenixOperationalMobileHome({ data, onLaunch, onNavigate }: Props) {
  const agenda = buildPhoenixHomeAgenda(data, todayIso());
  const overdue = agenda.items.filter((item) => item.kind === 'VENCIDO');
  const upcoming = agenda.items.filter((item) => item.kind !== 'VENCIDO');
  const recent = [...data.events.items]
    .sort((left, right) => String(right.date).localeCompare(String(left.date)))
    .slice(0, 6);

  return <section className="px-operational-mobile-home" aria-label="MEG Operacional">
    <header className="px-operational-hero">
      <div>
        <span className="px-kicker">MEG OPERACIONAL</span>
        <h1>Lançar ficou simples.</h1>
        <p>Receitas, despesas e Benefício Alimentação com as mesmas regras da sua base financeira.</p>
      </div>
      <span className="px-operational-sync" title={`Dados carregados em ${data.loadedAt}`}><i />Sincronizado</span>
    </header>

    <div className="px-operational-launch-grid">
      <button className="px-operational-launch expense" type="button" onClick={() => onLaunch('expense')}>
        <span className="px-operational-launch-icon" aria-hidden="true">↘</span>
        <span><small>NOVO LANÇAMENTO</small><strong>Despesa</strong><em>À vista, crédito, crediário ou recorrente</em></span>
        <b aria-hidden="true">＋</b>
      </button>
      <button className="px-operational-launch income" type="button" onClick={() => onLaunch('income')}>
        <span className="px-operational-launch-icon" aria-hidden="true">↗</span>
        <span><small>NOVO LANÇAMENTO</small><strong>Receita</strong><em>Recebimento rápido e já confirmado</em></span>
        <b aria-hidden="true">＋</b>
      </button>
      <button className="px-operational-launch benefit" type="button" onClick={() => onLaunch('benefit')}>
        <span className="px-operational-launch-icon" aria-hidden="true">◈</span>
        <span><small>ATALHO PROTEGIDO</small><strong>Alimentação</strong><em>Benefício + VEROCARD automáticos e travados</em></span>
        <b aria-hidden="true">＋</b>
      </button>
    </div>

    <div className="px-operational-status-grid">
      <button type="button" className={overdue.length ? 'danger' : ''} onClick={() => onNavigate('payables')}>
        <span>Vencidas</span><strong>{overdue.length}</strong><em>{money.format(overdue.reduce((sum, item) => sum + item.amount, 0))}</em>
      </button>
      <button type="button" onClick={() => onNavigate('payables')}>
        <span>A vencer</span><strong>{upcoming.length}</strong><em>{money.format(upcoming.reduce((sum, item) => sum + item.amount, 0))}</em>
      </button>
      <button type="button" onClick={() => onNavigate('movements')}>
        <span>Lançamentos</span><strong>{data.events.total}</strong><em>{data.month}</em>
      </button>
    </div>

    <section className="px-operational-recent">
      <header>
        <div><span className="px-kicker">ATIVIDADE</span><h2>Últimos lançamentos</h2></div>
        <button type="button" onClick={() => onNavigate('history')}>Ver histórico</button>
      </header>
      <div className="px-operational-recent-list">
        {recent.length ? recent.map((event) => {
          const amount = eventAmount(event);
          return <button key={event.id} type="button" onClick={() => onNavigate('movements')}>
            <span className={amount >= 0 ? 'income' : 'expense'} aria-hidden="true">{amount >= 0 ? '↗' : '↘'}</span>
            <span><strong>{event.description}</strong><small>{eventTypeLabel(event.type)} · {shortDate.format(new Date(`${event.date.slice(0,10)}T12:00:00Z`))}</small></span>
            <b className={amount >= 0 ? 'income' : 'expense'}>{money.format(amount)}</b>
          </button>;
        }) : <p>Nenhum lançamento disponível nesta competência.</p>}
      </div>
    </section>
  </section>;
}
