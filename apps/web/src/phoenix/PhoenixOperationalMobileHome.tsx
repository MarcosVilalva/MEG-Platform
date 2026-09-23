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

export function PhoenixOperationalMobileHome({ data, onLaunch, onNavigate, onOpenPeriod }: Props) {
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

  const agenda = buildPhoenixHomeAgenda(data, todayIso());
  const displayName = (() => { const parts = String(data.user.name || 'MEG').trim().split(/\\s+/); return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]}` : parts[0]; })();
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
  const firstName = String(data.user.name || 'MEG').trim().split(/\s+/)[0] || 'MEG';
  const pendingAmount = agenda.items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const periodLabel = (() => {
    const [year, month] = String(data.month || '').split('-');
    return month && year ? `${month}/${year}` : data.month;
  })();

  return <section className="px-operational-mobile-home px-operational-approved-home" aria-label="MEG Finanças">
    <header className="px-approved-mobile-head">
      <button className="px-approved-profile" type="button" onClick={() => onNavigate('settings')} aria-label="Abrir meu perfil">
        <PhoenixProfileAvatar name={data.user.name} preference={avatar} className="px-operational-home-avatar" />
        <span><strong>{displayName}</strong><small>MEG Finanças</small></span>
      </button>
      {onOpenPeriod ? <button className="px-approved-period" type="button" onClick={onOpenPeriod}><span>▣</span><strong>{periodLabel}</strong><em>⌄</em></button> : null}
    </header>

    <section className="px-approved-launch-grid" aria-label="Lançamento rápido">
      <button className="expense" type="button" onClick={() => onLaunch('expense')}><span>↘</span><strong>Despesa</strong><small>Novo lançamento</small><b>›</b></button>
      <button className="income" type="button" onClick={() => onLaunch('income')}><span>↗</span><strong>Receita</strong><small>Novo lançamento</small><b>›</b></button>
      <button className="benefit" type="button" onClick={() => onLaunch('benefit')}><span>▣</span><strong>Alimentação</strong><small>Lançar no benefício</small><b>›</b></button>
    </section>

    <section className="px-approved-balance" aria-label="Resumo financeiro atual">
      <div className="px-approved-balance-main"><span>Saldo Atual</span><strong>{money.format(currentBalance)}</strong></div>
      <div className="px-approved-summary">
        <div><span>Receitas</span><strong>{money.format(Number(data.summary.realizedIncome || 0))}</strong></div>
        <div className="expense"><span>Despesas</span><strong>{money.format(Number(data.summary.realizedExpense || 0))}</strong></div>
        <div><span>Movimento líquido</span><strong>{Number(data.summary.realizedResult || 0) > 0 ? '+' : ''}{money.format(Number(data.summary.realizedResult || 0))}</strong></div>
      </div>
    </section>

    <button className="px-approved-benefit" type="button" onClick={() => setBenefitOpen(true)}>
      <span className="icon">▣</span><span><small>Benefício Alimentação</small><strong>{money.format(Number(data.summary.benefitBalance || 0))}</strong><em>Saldo disponível</em></span><b>›</b>
    </button>

    <section className="px-approved-commitments">
      <header><div><span>▣</span><strong>Próximos Compromissos</strong></div><button type="button" onClick={() => onNavigate('payables')}>Ver todos ›</button></header>
      <div>{agenda.items.slice(0,3).map((item) => <button type="button" key={item.id} onClick={() => onNavigate('payables')}><span className="date"><strong>{String(item.dueDate || '').slice(8,10)}</strong><small>{shortDate.format(new Date(`${String(item.dueDate || '').slice(0,10)}T12:00:00Z`)).replace(/^\\d{2} de /,'').slice(0,3).toUpperCase()}</small></span><span className="copy"><strong>{item.description}</strong><small>{item.kind === 'VENCIDO' ? 'Vencido' : 'A vencer'}</small></span><b>{money.format(item.amount)}</b><em>›</em></button>)}</div>
      {!agenda.items.length ? <p>Nenhum compromisso em aberto.</p> : null}
    </section>
    {benefitOpen ? <div className="px-approved-benefit-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setBenefitOpen(false); }}><section className="px-approved-benefit-modal" role="dialog" aria-modal="true" aria-label="Acompanhamento do benefício alimentação"><header><div><small>BENEFÍCIO ALIMENTAÇÃO</small><strong>Acompanhamento</strong></div><button type="button" aria-label="Fechar" onClick={() => setBenefitOpen(false)}>×</button></header><div className="px-approved-benefit-stats"><div><span>Saldo inicial</span><strong>{money.format(benefitOpening)}</strong></div><div><span>Créditos</span><strong>{money.format(benefitCredits)}</strong></div><div><span>Consumo</span><strong>{money.format(benefitSpent)}</strong></div><div><span>Saldo atual</span><strong>{money.format(Number(data.summary.benefitBalance || 0))}</strong></div></div><div className="px-approved-benefit-list">{[...benefitEvents].reverse().slice(0,12).map((event) => <div key={event.id}><span><strong>{event.description || 'Movimentação'}</strong><small>{String(event.date).slice(0,10).split('-').reverse().join('/')}</small></span><b>{money.format(Math.abs(Number(event.signedAmount || event.amount || 0)))}</b></div>)}</div><footer><button type="button" onClick={() => { setBenefitOpen(false); onNavigate('movements'); }}>Ver lançamentos</button><button type="button" onClick={() => setBenefitOpen(false)}>Fechar</button></footer></section></div> : null}
  </section>;
}
