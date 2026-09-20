import { useEffect, useState } from 'react';
import type { PhoenixReadModel } from './contracts';
import { buildPhoenixHomeAgenda } from './home-agenda';
import { PhoenixProfileAvatar, hydratePhoenixAvatarPreference, readPhoenixAvatarPreference, type PhoenixAvatarPreference } from './profile-avatar';

type LaunchPreset = 'expense' | 'income' | 'benefit';

type Props = {
  data: PhoenixReadModel;
  onLaunch: (preset: LaunchPreset) => void;
  onNavigate: (view: 'movements' | 'history' | 'payables' | 'settings') => void;
  onOpenPeriod?: () => void;
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

export function PhoenixOperationalMobileHome({ data, onLaunch, onNavigate, onOpenPeriod }: Props) {
  const [avatar, setAvatar] = useState<PhoenixAvatarPreference>(() => readPhoenixAvatarPreference(data.user.id));

  useEffect(() => {
    let active = true;
    const syncAvatar = () => setAvatar(readPhoenixAvatarPreference(data.user.id));
    void hydratePhoenixAvatarPreference(data.user.id).then((preference) => {
      if (active) setAvatar(preference);
    });
    window.addEventListener('meg:profile-avatar-changed', syncAvatar);
    return () => {
      active = false;
      window.removeEventListener('meg:profile-avatar-changed', syncAvatar);
    };
  }, [data.user.id]);

  const agenda = buildPhoenixHomeAgenda(data, todayIso());
  const overdue = agenda.items.filter((item) => item.kind === 'VENCIDO');
  const upcoming = agenda.items.filter((item) => item.kind !== 'VENCIDO');
  const recent = [...data.events.items]
    .sort((left, right) => String(right.date).localeCompare(String(left.date)))
    .slice(0, 5);
  const currentBalance = Number(data.summary.availableBalance || 0) + Number(data.summary.realizedResult || 0);
  const firstName = String(data.user.name || 'MEG').trim().split(/\s+/)[0] || 'MEG';
  const pendingAmount = agenda.items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const periodLabel = (() => {
    const [year, month] = String(data.month || '').split('-');
    return month && year ? `${month}/${year}` : data.month;
  })();

  return <section className="px-operational-mobile-home" aria-label="MEG Operacional">
    <header className="px-operational-hero px-operational-hero-v2">
      <div className="px-operational-hero-copy">
        <span className="px-kicker">MEG OPERACIONAL</span>
        <div className="px-operational-greeting">
          <button className="px-operational-avatar-button" type="button" aria-label="Abrir meu perfil" onClick={() => onNavigate('settings')}>
            <PhoenixProfileAvatar name={data.user.name} preference={avatar} className="px-operational-home-avatar" />
          </button>
          <div><h1>Olá, {firstName}.</h1><small>{data.user.name}</small></div>
        </div>
        <p>Seu financeiro de hoje, com acesso rápido ao que precisa ser lançado ou resolvido.</p>
        {onOpenPeriod ? <button className="px-operational-period-chip" type="button" onClick={onOpenPeriod} aria-label={`Alterar período atual ${periodLabel}`}><span aria-hidden="true">▣</span><strong>Período</strong><em>{periodLabel}</em></button> : null}
      </div>
      <span className="px-operational-sync" title={`Dados carregados em ${data.loadedAt}`}><i />Atualizado</span>
    </header>

    <section className="px-operational-balance" aria-label="Resumo financeiro atual">
      <div className="px-operational-balance-main">
        <span>Saldo disponível hoje</span>
        <strong>{money.format(currentBalance)}</strong>
        <small>Saldo monetário realizado. Benefício Alimentação é acompanhado separadamente.</small>
      </div>
      <div className="px-operational-balance-meta">
        <div><span>Entradas realizadas</span><strong>{money.format(Number(data.summary.realizedIncome || 0))}</strong></div>
        <div><span>Saídas realizadas</span><strong>{money.format(Number(data.summary.realizedExpense || 0))}</strong></div>
      </div>
    </section>

    <section className="px-operational-section">
      <header className="px-operational-section-head"><div><span className="px-kicker">LANÇAMENTO RÁPIDO</span><h2>O que você quer registrar?</h2></div></header>
      <div className="px-operational-launch-grid px-operational-launch-grid-v2">
        <button className="px-operational-launch expense" type="button" onClick={() => onLaunch('expense')}>
          <span className="px-operational-launch-icon" aria-hidden="true">↘</span>
          <span><strong>Despesa</strong><em>Pagamento, crédito ou recorrente</em></span>
          <b aria-hidden="true">＋</b>
        </button>
        <button className="px-operational-launch income" type="button" onClick={() => onLaunch('income')}>
          <span className="px-operational-launch-icon" aria-hidden="true">↗</span>
          <span><strong>Receita</strong><em>Entrada recebida ou a receber</em></span>
          <b aria-hidden="true">＋</b>
        </button>
        <button className="px-operational-launch benefit" type="button" onClick={() => onLaunch('benefit')}>
          <span className="px-operational-launch-icon" aria-hidden="true">◈</span>
          <span><strong>Alimentação</strong><em>Benefício + VEROCARD automáticos</em></span>
          <b aria-hidden="true">＋</b>
        </button>
      </div>
    </section>

    <section className="px-operational-section">
      <header className="px-operational-section-head"><div><span className="px-kicker">PRIORIDADES</span><h2>O que precisa de atenção</h2></div></header>
      <div className="px-operational-status-grid px-operational-status-grid-v2">
        <button type="button" className={overdue.length ? 'danger priority' : 'priority'} onClick={() => onNavigate('payables')}>
          <span>Pendentes</span><strong>{agenda.items.length}</strong><em>{money.format(pendingAmount)}</em><small>{overdue.length ? `${overdue.length} vencida(s)` : 'Nenhuma vencida'}</small>
        </button>
        <button type="button" onClick={() => onNavigate('payables')}>
          <span>A vencer</span><strong>{upcoming.length}</strong><em>{money.format(upcoming.reduce((sum, item) => sum + item.amount, 0))}</em><small>Ver compromissos</small>
        </button>
        <button type="button" className="benefit" onClick={() => onLaunch('benefit')}>
          <span>Benefício</span><strong>{money.format(Number(data.summary.benefitBalance || 0))}</strong><em>saldo atual</em><small>Registrar alimentação</small>
        </button>
      </div>
    </section>

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
