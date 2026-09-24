import { useMemo, useState } from 'react';
import type { PhoenixReadModel } from './contracts';
import { buildPhoenixHomeAgenda } from './home-agenda';
import { isPhoenixBenefitEvent } from './home-period-summary';

type LaunchPreset = 'expense' | 'income' | 'benefit';

type Props = {
  data: PhoenixReadModel;
  onLaunch: (preset: LaunchPreset) => void;
  onNavigate: (view: 'movements' | 'history' | 'payables' | 'settings') => void;
  onOpenPeriod?: () => void;
};

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

export function PhoenixOperationalMobileHome({ data, onNavigate }: Props) {
  const [benefitOpen, setBenefitOpen] = useState(false);
  const today = todayIso();
  const agenda = buildPhoenixHomeAgenda(data, today);
  const currentBalance = Number(data.summary.availableBalance || 0) + Number(data.summary.realizedResult || 0);

  const cardItems = agenda.items.filter((item) => item.kind === 'FATURA' || Boolean(item.cardLabel));
  const otherItems = agenda.items.filter((item) => item.kind !== 'FATURA' && !item.cardLabel);
  const cardAmount = cardItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const otherAmount = otherItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const pendingAmount = Number(data.summary.pendingAmount || 0);

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

  return <>
    <section className="meg-home-v12 meg-home-v12-current" data-home-fidelity="approved-v12" aria-label="Situação financeira atual">
      <header className="meg-home-v12-heading">
        <span>SITUAÇÃO ATUAL</span>
        <h1>{monthLabel(data.month)}</h1>
        <p>Acompanhe seu caixa e compromissos em tempo real.</p>
      </header>

      <article className="meg-home-v12-current-balance">
        <span>Saldo disponível</span>
        <strong>{money.format(currentBalance)}</strong>
        <small>Considerando apenas lançamentos realizados.</small>
      </article>

      <section className="meg-home-v12-current-flow">
        <article className="income"><span>Entradas no mês</span><strong>{money.format(Number(data.summary.realizedIncome || 0))}</strong></article>
        <article className="expense"><span>Saídas no mês</span><strong>{money.format(Number(data.summary.realizedExpense || 0))}</strong></article>
      </section>

      <article className={`meg-home-v12-current-result ${Number(data.summary.realizedResult || 0) >= 0 ? 'positive' : 'negative'}`}>
        <span>Resultado do mês</span>
        <strong>{Number(data.summary.realizedResult || 0) > 0 ? '+' : ''}{money.format(Number(data.summary.realizedResult || 0))}</strong>
      </article>

      <section className="meg-home-v12-grid meg-home-v12-current-grid" aria-label="Compromissos do mês">
        <article className="meg-home-v12-metric pending"><span>Contas a pagar</span><strong>{money.format(pendingAmount)}</strong><small>{agenda.items.length.toLocaleString('pt-BR')} compromisso(s)</small></article>
        <article className="meg-home-v12-metric card"><span>Faturas de cartões</span><strong>{money.format(cardAmount)}</strong><small>{cardItems.length.toLocaleString('pt-BR')} fatura(s)</small></article>
        <article className="meg-home-v12-metric warning"><span>Outras pendências</span><strong>{money.format(otherAmount)}</strong><small>{otherItems.length.toLocaleString('pt-BR')} item(ns)</small></article>
        <article className="meg-home-v12-metric paid"><span>Contas pagas</span><strong>{paidExpenses.length.toLocaleString('pt-BR')}</strong><small>{money.format(paidAmount)}</small></article>
      </section>

      <button className="meg-home-v12-benefit" type="button" onClick={() => setBenefitOpen(true)}>
        <span><small>BENEFÍCIO ALIMENTAÇÃO</small><strong>Saldo disponível</strong></span>
        <b>{money.format(Number(data.summary.benefitBalance || 0))}</b>
        <em aria-hidden="true">›</em>
      </button>

      <button className="meg-home-v12-wide-action" type="button" onClick={() => onNavigate('payables')}>
        <span>Ver todos os compromissos</span><b aria-hidden="true">›</b>
      </button>
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
