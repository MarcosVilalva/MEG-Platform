import { useMemo, useState } from 'react';
import type { PhoenixReadModel } from './contracts';
import { buildPhoenixHomeAgenda } from './home-agenda';
import { isPhoenixBenefitEvent } from './home-period-summary';

type LaunchPreset = 'expense' | 'income' | 'benefit';

type Props = {
  data: PhoenixReadModel;
  onLaunch: (preset: LaunchPreset) => void;
  onNavigate: (view: 'movements' | 'history' | 'payables' | 'settings' | 'cards' | 'cashflow' | 'analytics') => void;
  onOpenPeriod?: () => void;
  onOpenMenu?: () => void;
};

type CurrentGlyphKind = 'trend' | 'wallet' | 'income' | 'expense' | 'result' | 'payable' | 'card' | 'pending' | 'paid' | 'benefit' | 'quick' | 'cashflow' | 'analytics';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function todayIso() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
}

function monthLabel(value: string) {
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, 1)))
    .replace(/^./, (letter) => letter.toUpperCase());
}

function realizedExpenseAmount(event: PhoenixReadModel['events']['items'][number]) {
  const signed = Number(event.signedAmount || 0);
  if (Number.isFinite(signed) && signed < 0) return Math.abs(signed);
  return Math.abs(Number(event.amount || 0));
}

function CurrentHomeGlyph({ kind }: { kind: CurrentGlyphKind }) {
  if (kind === 'trend') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 17 5-5 4 3 7-8" /><path d="M15.5 7H20v4.5" /></svg>;
  if (kind === 'wallet') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h12.2A2.8 2.8 0 0 1 20 9.8v8.4A2.8 2.8 0 0 1 17.2 21H5a2.8 2.8 0 0 1-2.8-2.8V6.5A2.5 2.5 0 0 1 4.7 4H16" /><path d="M15.2 11.2H21v4.6h-5.8a2.3 2.3 0 1 1 0-4.6Z" /></svg>;
  if (kind === 'income') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V6" /><path d="m7.8 10.2 4.2-4.2 4.2 4.2" /></svg>;
  if (kind === 'expense') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v13" /><path d="m7.8 13.8 4.2 4.2 4.2-4.2" /></svg>;
  if (kind === 'result') return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="13" width="3" height="7" rx="1" /><rect x="10.5" y="9" width="3" height="11" rx="1" /><rect x="17" y="4" width="3" height="16" rx="1" /></svg>;
  if (kind === 'payable') return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="16" rx="2" /><path d="M8 8h8M8 12h5M8 16h7" /></svg>;
  if (kind === 'card') return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3 9h18M7 15h4" /></svg>;
  if (kind === 'pending') return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="16" rx="2" /><path d="M9 8h6M9 12h6M9 16h3" /></svg>;
  if (kind === 'paid') return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="m8.5 12 2.2 2.3 4.9-5" /></svg>;
  if (kind === 'benefit') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 3v7.2M5.8 3v7.2M11.2 3v7.2M5.8 7.2h5.4M8.5 10.2V21M16 3v18M16 3c2.8 1.8 3.5 5.9 0 8.2" /></svg>;
  if (kind === 'quick') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13.5 2-7 11h5l-1 9 7-12h-5z" /></svg>;
  if (kind === 'cashflow') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h14" /><path d="m14 4 4 4-4 4" /><path d="M20 16H6" /><path d="m10 12-4 4 4 4" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="14" width="3" height="6" rx="1" /><rect x="10.5" y="10" width="3" height="10" rx="1" /><rect x="17" y="5" width="3" height="15" rx="1" /></svg>;
}

export function PhoenixOperationalMobileHome({ data, onNavigate, onOpenMenu }: Props) {
  const [benefitOpen, setBenefitOpen] = useState(false);
  const today = todayIso();
  const agenda = buildPhoenixHomeAgenda(data, today);
  const currentBalance = Number(data.summary.availableBalance || 0) + Number(data.summary.realizedResult || 0);

  const openPayables = data.payables.filter((item) => !['paid', 'cancelled'].includes(String(item.status)) && Number(item.openAmount || 0) > 0);
  const payableAmount = openPayables.reduce((sum, item) => sum + Number(item.openAmount || 0), 0);
  const cardItems = agenda.items.filter((item) => item.kind === 'FATURA' || Boolean(item.cardLabel));
  const cardAmount = cardItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const otherItems = agenda.items.filter((item) => item.source === 'event' && item.kind !== 'FATURA' && !item.cardLabel);
  const otherAmount = otherItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const paidExpenses = data.events.items.filter((event) =>
    !isPhoenixBenefitEvent(event)
    && event.type === 'expense'
    && ['paid', 'reconciled', 'confirmed'].includes(String(event.status))
  );
  const paidAmount = paidExpenses.reduce((sum, event) => sum + realizedExpenseAmount(event), 0);

  const benefitEvents = useMemo(() => data.events.items
    .filter(isPhoenixBenefitEvent)
    .filter((event) => ['paid', 'reconciled', 'confirmed'].includes(String(event.status)))
    .sort((left, right) => String(left.date).localeCompare(String(right.date))), [data.events.items]);
  const benefitCredits = benefitEvents.reduce((sum, event) => sum + Math.max(0, Number(event.signedAmount || event.amount || 0)), 0);
  const benefitSpent = benefitEvents.reduce((sum, event) => sum + Math.max(0, -Number(event.signedAmount || 0)), 0);
  const benefitOpening = Number(data.summary.benefitBalance || 0) - benefitCredits + benefitSpent;

  const income = Number(data.summary.realizedIncome || 0);
  const expense = Number(data.summary.realizedExpense || 0);
  const result = Number(data.summary.realizedResult || 0);
  const totalBills = openPayables.length + paidExpenses.length;
  const todayItems = agenda.items.filter((item) => String(item.dueDate || '').slice(0, 10) <= today).slice(0, 3);
  const primaryCard = cardItems[0];

  const compactMonth = (() => {
    const [year, month] = data.month.split('-').map(Number);
    const label = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' })
      .format(new Date(Date.UTC(year, month - 1, 1))).replace('.', '');
    return `${label.charAt(0).toUpperCase() + label.slice(1)}/${year}`;
  })();

  return <>
    <section className="meg-reference-home" data-home-fidelity="reference-v14" aria-label="Resumo financeiro">
      <header className="meg-ref-home-head">
        <div><small>Olá, Marcos</small><strong>Seu resumo financeiro</strong></div>
        <button type="button" className="meg-ref-period" aria-label="Selecionar período">{compactMonth}</button>
        <button type="button" className="meg-ref-profile" onClick={onOpenMenu} aria-label="Abrir perfil">M</button>
      </header>

      <section className="meg-ref-balance-row">
        <article className="meg-ref-balance">
          <span>Saldo atual</span><strong>{money.format(currentBalance)}</strong><small>Atualizado agora</small>
        </article>
        <button className="meg-ref-benefit-mini" type="button" onClick={() => setBenefitOpen(true)}>
          <span>Benefício Alimentação</span><strong>{money.format(Number(data.summary.benefitBalance || 0))}</strong>
        </button>
      </section>

      <section className="meg-ref-flow">
        <article><span>Receitas</span><strong>{money.format(income)}</strong></article>
        <article><span>Despesas</span><strong>{money.format(expense)}</strong></article>
        <article><span>Resultado</span><strong>{result > 0 ? '+' : ''}{money.format(result)}</strong></article>
      </section>

      <section className="meg-ref-month-bills">
        <header><strong>Contas do mês</strong><button type="button" onClick={() => onNavigate('payables')}>Ver todas</button></header>
        <div className="meg-ref-bill-grid">
          <span><b>{totalBills}</b><small>Total</small></span>
          <span><b>{paidExpenses.length}</b><small>Pagas</small></span>
          <span><b>{openPayables.length}</b><small>Pendentes</small></span>
          <span><b>{money.format(payableAmount)}</b><small>Em aberto</small></span>
        </div>
      </section>

      <section className="meg-ref-cards">
        <header><strong>Meus cartões</strong><button type="button" onClick={() => onNavigate('cards')}>Ver todos</button></header>
        <button type="button" className="meg-ref-card-preview" onClick={() => onNavigate('cards')}>
          <span>{primaryCard?.cardLabel || 'Cartões'}</span>
          <strong>{primaryCard ? money.format(Number(primaryCard.amount || 0)) : 'Nenhuma fatura pendente'}</strong>
          <small>{primaryCard ? 'Fatura atual' : 'Toque para abrir a central de cartões'}</small>
        </button>
      </section>

      <section className="meg-ref-today">
        <header><strong>Pendentes de hoje</strong><button type="button" onClick={() => onNavigate('payables')}>Ver pendentes</button></header>
        {todayItems.length ? todayItems.map((item) => <button type="button" key={item.id} onClick={() => onNavigate('payables')} className="meg-ref-today-row">
          <span><strong>{item.description}</strong><small>{String(item.dueDate || '').slice(0,10).split('-').reverse().join('/')}</small></span>
          <b>{money.format(Number(item.amount || 0))}</b>
        </button>) : <div className="meg-ref-empty">Nenhuma pendência para hoje.</div>}
      </section>
    </section>

    {benefitOpen ? <div className="px-approved-benefit-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setBenefitOpen(false); }}>
      <section className="px-approved-benefit-modal" role="dialog" aria-modal="true" aria-label="Acompanhamento do benefício alimentação">
        <header><div><small>BENEFÍCIO ALIMENTAÇÃO</small><strong>Acompanhamento</strong></div><button type="button" aria-label="Fechar" onClick={() => setBenefitOpen(false)}>×</button></header>
        <div className="px-approved-benefit-stats">
          <div><span>Saldo inicial</span><strong>{money.format(benefitOpening)}</strong></div>
          <div><span>Créditos</span><strong>{money.format(benefitCredits)}</strong></div>
          <div><span>Consumo</span><strong>{money.format(benefitSpent)}</strong></div>
          <div><span>Saldo atual</span><strong>{money.format(Number(data.summary.benefitBalance || 0))}</strong></div>
        </div>
        <div className="px-approved-benefit-list">{[...benefitEvents].reverse().slice(0, 12).map((event) => <div key={event.id}><span><strong>{event.description || 'Movimentação'}</strong><small>{String(event.date).slice(0, 10).split('-').reverse().join('/')}</small></span><b>{money.format(Math.abs(Number(event.signedAmount || event.amount || 0)))}</b></div>)}</div>
        <footer><button type="button" onClick={() => { setBenefitOpen(false); onNavigate('movements'); }}>Ver lançamentos</button><button type="button" onClick={() => setBenefitOpen(false)}>Fechar</button></footer>
      </section>
    </div> : null}
  </>;
}
