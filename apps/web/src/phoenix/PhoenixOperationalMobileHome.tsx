import { useEffect, useMemo, useState } from 'react';
import type { PhoenixReadModel } from './contracts';
import { buildPhoenixHomeAgenda } from './home-agenda';
import { isPhoenixBenefitEvent } from './home-period-summary';
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

export function PhoenixOperationalMobileHome({ data, onLaunch, onNavigate }: Props) {
  const [avatar, setAvatar] = useState<PhoenixAvatarPreference>(() => readPhoenixAvatarPreference(data.user.id));
  const [benefitOpen, setBenefitOpen] = useState(false);

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

  const today = todayIso();
  const agenda = buildPhoenixHomeAgenda(data, today);
  const displayName = String(data.user.name || 'MEG').trim() || 'MEG';
  const benefitEvents = useMemo(() => data.events.items.filter(isPhoenixBenefitEvent).filter((event) => ['paid', 'reconciled', 'confirmed'].includes(String(event.status))).sort((a,b) => String(a.date).localeCompare(String(b.date))), [data.events.items]);
  const benefitCredits = benefitEvents.reduce((sum,event) => sum + Math.max(0, Number(event.signedAmount || event.amount || 0)), 0);
  const benefitSpent = benefitEvents.reduce((sum,event) => sum + Math.max(0, -Number(event.signedAmount || 0)), 0);
  const benefitOpening = Number(data.summary.benefitBalance || 0) - benefitCredits + benefitSpent;
  const overdue = agenda.items.filter((item) => item.kind === 'VENCIDO');
  const upcoming = agenda.items.filter((item) => item.kind !== 'VENCIDO');
  const recent = [...data.events.items]
    .sort((left, right) => String(right.date).localeCompare(String(left.date)))
    .slice(0, 5);
  const currentBalance = Number(data.summary.availableBalance || 0) + Number(data.summary.realizedResult || 0);
  const pendingAmount = Number(data.summary.pendingAmount || 0);
  const freeAfterPending = currentBalance - pendingAmount;
  const nextDue = agenda.items.find((item) => String(item.dueDate || '').slice(0, 10) >= today) || agenda.items[0] || null;
  const nextDueDate = nextDue ? String(nextDue.dueDate || '').slice(0, 10).split('-').reverse().join('/') : '—';

  return <section className="px-operational-mobile-home px-operational-approved-home px-home-current-v9" aria-label="MEG Finanças">
    <header className="px-approved-mobile-head">
      <button className="px-approved-profile" type="button" onClick={() => onNavigate('settings')} aria-label="Abrir meu perfil">
        <PhoenixProfileAvatar name={data.user.name} preference={avatar} className="px-operational-home-avatar" />
        <span><small>MEG FINANÇAS</small><strong>{displayName}</strong></span>
      </button>
    </header>

    <section className="px-approved-launch-grid px-home-ref-actions-current" aria-label="Lançamento rápido">
      <button className="expense" type="button" onClick={() => onLaunch('expense')}><span>↘</span><strong>Despesa</strong></button>
      <button className="income" type="button" onClick={() => onLaunch('income')}><span>↗</span><strong>Receita</strong></button>
      <button className="benefit" type="button" onClick={() => onLaunch('benefit')}><span>◇</span><strong>Alimentação</strong></button>
    </section>

    <section className="px-approved-balance px-approved-balance-premium" aria-label="Resumo financeiro atual">
      <div className="px-approved-balance-hero">
        <div className="px-approved-balance-main"><span>SALDO ATUAL</span><strong>{money.format(currentBalance)}</strong><small>Caixa realizado · sem somar previsões futuras</small></div>
        <div className="px-approved-balance-art" aria-hidden="true">
          <svg viewBox="0 0 120 88" focusable="false">
            <rect className="bar bar-1" x="6" y="48" width="10" height="30" rx="3" />
            <rect className="bar bar-2" x="21" y="35" width="10" height="43" rx="3" />
            <rect className="bar bar-3" x="36" y="21" width="10" height="57" rx="3" />
            <g className="coins back"><ellipse cx="84" cy="31" rx="22" ry="8" /><path d="M62 31v26c0 4.5 9.8 8 22 8s22-3.5 22-8V31" /><ellipse cx="84" cy="44" rx="22" ry="8" /><ellipse cx="84" cy="57" rx="22" ry="8" /></g>
            <g className="coins front"><ellipse cx="63" cy="52" rx="17" ry="6.5" /><path d="M46 52v18c0 3.6 7.6 6.5 17 6.5s17-2.9 17-6.5V52" /><ellipse cx="63" cy="61" rx="17" ry="6.5" /><ellipse cx="63" cy="70" rx="17" ry="6.5" /></g>
          </svg>
        </div>
      </div>
      <div className="px-approved-summary">
        <div className="income"><span className="metric-icon" aria-hidden="true">↓</span><span className="metric-copy"><span>Entradas</span><strong>{money.format(Number(data.summary.realizedIncome || 0))}</strong></span></div>
        <div className="expense"><span className="metric-icon" aria-hidden="true">↑</span><span className="metric-copy"><span>Saídas</span><strong>{money.format(Number(data.summary.realizedExpense || 0))}</strong></span></div>
        <div className={Number(data.summary.realizedResult || 0) >= 0 ? 'result-positive' : 'result-negative'}><span className="metric-icon" aria-hidden="true">▥</span><span className="metric-copy"><span>Movimento líquido</span><strong>{Number(data.summary.realizedResult || 0) > 0 ? '+' : ''}{money.format(Number(data.summary.realizedResult || 0))}</strong></span></div>
      </div>
    </section>

    <section className="px-approved-position-strip" aria-label="Situação operacional">
      <div><span className="icon">▤</span><span><small>Em aberto agora</small><strong>{money.format(pendingAmount)}</strong></span></div>
      <button type="button" onClick={() => onNavigate('payables')}><span className="icon">◔</span><span><small>Saldo livre após pendências</small><strong className={freeAfterPending >= 0 ? 'positive' : 'negative'}>{money.format(freeAfterPending)}</strong></span><b>›</b></button>
    </section>

    <button className="px-approved-benefit" type="button" onClick={() => setBenefitOpen(true)}>
      <span className="icon">▣</span><span><small>BENEFÍCIO ALIMENTAÇÃO</small><strong>{money.format(Number(data.summary.benefitBalance || 0))}</strong><em>Saldo disponível · acompanhar evolução</em></span><b>›</b>
    </button>

    <button className="px-approved-next-due" type="button" onClick={() => onNavigate('payables')}>
      <span className="icon">▣</span>
      <span className="copy"><small>PRÓXIMO VENCIMENTO</small><strong>{nextDue ? `${nextDueDate} · ${nextDue.description}` : 'Nenhum vencimento futuro'}</strong></span>
      <b className={nextDue ? 'has-value' : ''}>{nextDue ? money.format(nextDue.amount) : '—'}</b>
      <em>›</em>
    </button>

    <section className="px-approved-commitments px-approved-open-expenses">
      <header><div><span>▤</span><div><small>DESPESAS EM ABERTO</small><strong>{agenda.items.length} lançamento(s)</strong></div></div><button type="button" onClick={() => onNavigate('payables')}>Ver todas ›</button></header>
      <div>{agenda.items.slice(0, 4).map((item) => <button type="button" key={item.id} onClick={() => onNavigate('payables')}><span className="date"><strong>{String(item.dueDate || '').slice(8,10)}</strong><small>{shortDate.format(new Date(`${String(item.dueDate || '').slice(0,10)}T12:00:00Z`)).replace(/^\\d{2} de /,'').slice(0,3).toUpperCase()}</small></span><span className="copy"><strong>{item.description}</strong><small>{item.kind === 'VENCIDO' ? 'Vencido' : 'Planejado'}</small></span><b>{money.format(item.amount)}</b><em>›</em></button>)}</div>
      {!agenda.items.length ? <p>Nenhuma despesa em aberto.</p> : null}
    </section>
    {benefitOpen ? <div className="px-approved-benefit-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setBenefitOpen(false); }}><section className="px-approved-benefit-modal" role="dialog" aria-modal="true" aria-label="Acompanhamento do benefício alimentação"><header><div><small>BENEFÍCIO ALIMENTAÇÃO</small><strong>Acompanhamento</strong></div><button type="button" aria-label="Fechar" onClick={() => setBenefitOpen(false)}>×</button></header><div className="px-approved-benefit-stats"><div><span>Saldo inicial</span><strong>{money.format(benefitOpening)}</strong></div><div><span>Créditos</span><strong>{money.format(benefitCredits)}</strong></div><div><span>Consumo</span><strong>{money.format(benefitSpent)}</strong></div><div><span>Saldo atual</span><strong>{money.format(Number(data.summary.benefitBalance || 0))}</strong></div></div><div className="px-approved-benefit-list">{[...benefitEvents].reverse().slice(0,12).map((event) => <div key={event.id}><span><strong>{event.description || 'Movimentação'}</strong><small>{String(event.date).slice(0,10).split('-').reverse().join('/')}</small></span><b>{money.format(Math.abs(Number(event.signedAmount || event.amount || 0)))}</b></div>)}</div><footer><button type="button" onClick={() => { setBenefitOpen(false); onNavigate('movements'); }}>Ver lançamentos</button><button type="button" onClick={() => setBenefitOpen(false)}>Fechar</button></footer></section></div> : null}
  </section>;
}
