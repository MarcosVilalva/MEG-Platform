import { useEffect, useMemo, useRef, useState } from 'react';
import type { FinancialEvent } from '../app/finance-client';
import type { PhoenixReadModel } from '../phoenix/contracts';
import { hydratePhoenixAvatarPreference, phoenixAvatarImage, readPhoenixAvatarPreference } from '../phoenix/profile-avatar';
import { MegMobileAnalytics, MegMobileCashflow, MegMobileHistory, MegMobileMovements } from './MegMobileCoreScreens';
import { MegMobileLaunchSheet } from './MegMobileLaunchSheet';
import { MegMobileCardCenter } from './MegMobileCardCenter';
import { MegMobileBenefitModal } from './MegMobileBenefitModal';
import { MegMobileSettings } from './MegMobileSettings';
import './meg-mobile-runtime.css';
import './meg-mobile-final.css';
import './meg-mobile-core-screens.css';

type MobileView = 'home' | 'movements' | 'cards' | 'payables' | 'history' | 'cashflow' | 'analytics' | 'settings';
type TargetView = 'home' | 'movements' | 'payables' | 'cards' | 'cashflow' | 'analytics' | 'history' | 'settings';
type LaunchPreset = 'expense' | 'income' | 'benefit';
type PeriodMode = 'month' | 'range' | 'all';
type MobileHomePeriodContext = {
  label: string;
  startDate: string;
  endDate: string;
  openingBalance: number;
  closingBalance: number;
  currentRealBalance: number;
  currentBenefitBalance?: number;
  projectionEvents?: PhoenixReadModel['events']['items'];
};

type Props = {
  data: PhoenixReadModel;
  view: MobileView;
  onNavigate: (view: TargetView) => void;
  onLaunch: (preset: LaunchPreset) => void;
  onEditEvent: (eventId: string) => void;
  periodMode: PeriodMode;
  periodLabel?: string;
  homePeriodContext?: MobileHomePeriodContext | null;
  periodLoading?: boolean;
  periodError?: string;
  onSelectMonth: (month: string) => Promise<void>;
  onSelectRange: (start: string, end: string) => Promise<void>;
  onSelectAll: () => Promise<void>;
  onLogout?: () => void;
  onClose?: () => void;
};

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const resultMoney = (value: number) => value > 0 ? '+' + money.format(value) : money.format(value);
const longMonth = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const shortDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });

function todayIso() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
}

function monthLabel(month: string) {
  const parts = month.split('-').map(Number);
  const value = longMonth.format(new Date(Date.UTC(parts[0], parts[1] - 1, 1)));
  return value.replace(/^./, (letter) => letter.toUpperCase());
}

function compactMonth(month: string) {
  const parts = month.split('-').map(Number);
  const value = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' })
    .format(new Date(Date.UTC(parts[0], parts[1] - 1, 1))).replace('.', '');
  return (value[0] || '').toUpperCase() + value.slice(1) + '/' + parts[0];
}

function openStatus(status: unknown) {
  return !['paid', 'cancelled', 'reconciled', 'confirmed'].includes(String(status || '').toLowerCase());
}

function asset(path: string) {
  const configuredBase = import.meta.env.BASE_URL || '/';
  const base = configuredBase.endsWith('/') ? configuredBase : configuredBase + '/';
  const relative = base + path.replace(/^\/+/, '');
  try {
    return typeof document !== 'undefined' ? new URL(relative, document.baseURI).href : relative;
  } catch {
    return relative;
  }
}

function cardArt(name: string) {
  const normalized = String(name || '').toLowerCase();
  if (normalized.includes('mercado') || normalized.includes('meli')) return asset('assets/cards/mercado-pago-visual.svg');
  if (normalized.includes('latam')) return asset('assets/cards/latam-pass-platinum.webp');
  if (normalized.includes('azul')) return asset('assets/cards/approved-v6/azul.webp');
  if (normalized.includes('riachuelo') || normalized.includes('midway')) return asset('assets/cards/riachuelo-mastercard-visual.svg');
  if (normalized.includes('nubank')) return asset('assets/cards/nubank-visual.svg');
  return '';
}

function cardName(name: string) {
  const normalized = String(name || '').toLowerCase();
  if (normalized.includes('mercado') || normalized.includes('meli')) return 'Mercado Pago Visa';
  if (normalized.includes('latam')) return 'LATAM PASS Itaú Mastercard';
  if (normalized.includes('azul')) return 'Azul Visa';
  if (normalized.includes('riachuelo') || normalized.includes('midway')) return 'Riachuelo Midway';
  if (normalized.includes('nubank')) return 'Nubank';
  return name || 'Cartão';
}

function cardRows(card: PhoenixReadModel['cards'][number] | undefined) {
  if (!card) return [];
  if (card.statement?.lines?.length) {
    return card.statement.lines.map((line) => ({
      id: line.id,
      description: line.description,
      date: line.purchaseDate || line.dueDate,
      amount: Math.abs(Number(line.effect || 0)),
      installmentNo: line.installmentNo,
      installmentQty: line.installmentQty
    }));
  }
  return (card.purchases || []).flatMap((purchase) => (purchase.entries || []).map((entry) => ({
    id: entry.id,
    description: purchase.description,
    date: purchase.purchaseDate,
    amount: Math.abs(Number(entry.amount || 0)),
    installmentNo: entry.number,
    installmentQty: purchase.installments
  })));
}

function Icon({ name, size = 22 }: { name: string; size?: number }) {
  const base = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (name === 'home') return <svg {...base}><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M9.5 20v-6h5v6"/></svg>;
  if (name === 'plus') return <svg {...base}><path d="M12 5v14M5 12h14"/></svg>;
  if (name === 'wallet') return <svg {...base}><path d="M4 7.5h14a2 2 0 0 1 2 2v9H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h11"/><path d="M15 11h6v5h-6a2.5 2.5 0 0 1 0-5Z"/></svg>;
  if (name === 'calendar') return <svg {...base}><rect x="3.5" y="5.5" width="17" height="15" rx="2.5"/><path d="M8 3.5v4M16 3.5v4M3.5 10h17"/></svg>;
  if (name === 'trend') return <svg {...base}><path d="m4 17 5-5 4 3 7-8"/><path d="M15 7h5v5"/></svg>;
  if (name === 'up') return <svg {...base}><path d="M12 19V5M7 10l5-5 5 5"/></svg>;
  if (name === 'down') return <svg {...base}><path d="M12 5v14M7 14l5 5 5-5"/></svg>;
  if (name === 'file') return <svg {...base}><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>;
  if (name === 'check') return <svg {...base}><rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8.5 12 2.5 2.5 5-5"/></svg>;
  if (name === 'food') return <svg {...base}><path d="M6 3v8M9 3v8M6 7h3M7.5 11v10M15 3v8c0 2 3 2 3 0V3M16.5 13v8"/></svg>;
  if (name === 'bolt') return <svg {...base}><path d="m13 2-7 11h5l-1 9 8-12h-5z"/></svg>;
  if (name === 'search') return <svg {...base}><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></svg>;
  if (name === 'sliders') return <svg {...base}><path d="M4 7h8M16 7h4M4 17h4M12 17h8M4 12h12"/><circle cx="14" cy="7" r="2"/><circle cx="10" cy="17" r="2"/><circle cx="18" cy="12" r="2"/></svg>;
  if (name === 'list') return <svg {...base}><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/></svg>;
  if (name === 'menu') return <svg {...base}><path d="M4 7h16M4 12h16M4 17h16"/></svg>;
  if (name === 'cashflow') return <svg {...base}><path d="M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4"/></svg>;
  if (name === 'chart') return <svg {...base}><path d="M4 20V10M10 20V5M16 20v-7M22 20V3"/></svg>;
  if (name === 'cart') return <svg {...base}><path d="M3 5h2l2.2 10h9.9l2-7H6"/><circle cx="9" cy="19" r="1.3"/><circle cx="17" cy="19" r="1.3"/></svg>;
  if (name === 'car') return <svg {...base}><path d="m5 16 1.6-6.1A2.5 2.5 0 0 1 9 8h6a2.5 2.5 0 0 1 2.4 1.9L19 16"/><path d="M4 16h16v3H4z"/><path d="M7 19v2M17 19v2"/></svg>;
  if (name === 'wifi') return <svg {...base}><path d="M4 9a12 12 0 0 1 16 0M7 12.5a7.5 7.5 0 0 1 10 0M10 16a3 3 0 0 1 4 0"/><circle cx="12" cy="19" r=".8" fill="currentColor"/></svg>;
  if (name === 'phone') return <svg {...base}><path d="M7 3h3l1 5-2 1.5a13 13 0 0 0 5.5 5.5L16 13l5 1v3a3 3 0 0 1-3 3C10.3 20 4 13.7 4 6a3 3 0 0 1 3-3Z"/></svg>;
  if (name === 'building') return <svg {...base}><path d="M5 21V5l7-3 7 3v16M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01M10 21v-3h4v3"/></svg>;
  if (name === 'play') return <svg {...base}><circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4Z"/></svg>;
  if (name === 'card') return <svg {...base}><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 9h18M7 15h4"/></svg>;
  return <svg {...base}><circle cx="12" cy="12" r="8"/></svg>;
}

function semanticIcon(label: string) {
  const value = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
  if (/energia|eletric|cpfl|luz/.test(value)) return 'bolt';
  if (/internet|wifi|fibra/.test(value)) return 'wifi';
  if (/telefone|celular|movel/.test(value)) return 'phone';
  if (/condominio|predio|apartamento/.test(value)) return 'building';
  if (/stream|netflix|spotify|youtube|assinatura/.test(value)) return 'play';
  if (/uber|99|combust|posto|carro|veiculo/.test(value)) return 'car';
  if (/almoco|jantar|lanche|restaurante|food|ifood|mercado|supermercado/.test(value)) return 'food';
  if (/cartao|card|latam|mercado pago|itau|santander|bradesco|caixa|nubank/.test(value)) return 'card';
  if (/farmacia|remedio|saude|medic/.test(value)) return 'file';
  if (/compra|loja|cigarro/.test(value)) return 'cart';
  return 'file';
}

function Header({ data, periodMode, periodLabel, onOpenPeriod, onOpenMenu }: { data: PhoenixReadModel; periodMode: PeriodMode; periodLabel?: string; onOpenPeriod: () => void; onOpenMenu: () => void }) {
  const firstName = data.user.name.trim().split(/\s+/)[0] || 'MEG';
  const [avatar, setAvatar] = useState(() => readPhoenixAvatarPreference(data.user.id));
  useEffect(() => {
    let active = true;
    void hydratePhoenixAvatarPreference(data.user.id).then((preference) => { if (active) setAvatar(preference); });
    const sync = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string }>).detail;
      if (detail?.userId && detail.userId !== data.user.id) return;
      setAvatar(readPhoenixAvatarPreference(data.user.id));
    };
    window.addEventListener('meg:profile-avatar-changed', sync);
    return () => { active = false; window.removeEventListener('meg:profile-avatar-changed', sync); };
  }, [data.user.id]);
  const avatarUrl = phoenixAvatarImage(avatar);
  const mainLabel = periodMode === 'all' ? '∞' : periodMode === 'range' ? (periodLabel || 'Intervalo') : compactMonth(data.month);
  const subLabel = periodMode === 'all' ? 'Todos os períodos' : periodMode === 'range' ? 'Intervalo personalizado' : data.month === todayIso().slice(0, 7) ? 'Mês atual' : 'Período selecionado';
  return <header className="meg2-header">
    <div className="meg2-brand"><img src={asset('brand/meg-finance-system-mark.svg')} alt="MEG"/></div>
    <button className="meg2-period" type="button" onClick={onOpenPeriod}>
      <span className="meg2-period-icon">{periodMode === 'all' ? <b className="meg2-infinity">∞</b> : <Icon name="calendar" size={19}/>}</span>
      <span><strong>{mainLabel}</strong><small>{subLabel}</small></span>
      <b>⌄</b>
    </button>
    <button className="meg2-user" type="button" onClick={onOpenMenu}>
      <span className={`meg2-avatar ${avatarUrl ? 'has-image' : ''}`}>{avatarUrl ? <img src={avatarUrl} alt="" draggable={false}/> : firstName.charAt(0).toUpperCase()}</span>
      <strong>{firstName.toUpperCase()}</strong>
    </button>
  </header>;
}

function Dock({ view, pendingCount, menuOpen, onNavigate, onLaunch, onMenu }: { view: MobileView; pendingCount: number; menuOpen: boolean; onNavigate: Props['onNavigate']; onLaunch: Props['onLaunch']; onMenu: () => void }) {
  return <nav className="meg2-dock">
    <button className={view === 'home' ? 'active' : ''} onClick={() => onNavigate('home')}><Icon name="home"/><span>Início</span></button>
    <button className={view === 'movements' ? 'active' : ''} onClick={() => onNavigate('movements')}><Icon name="file"/><span>Lançamentos</span></button>
    <button className="meg2-new" onClick={() => onLaunch('expense')}><span><Icon name="plus" size={27}/></span><small>Novo</small></button>
    <button className={view === 'payables' ? 'active' : ''} onClick={() => onNavigate('payables')}>
      <span className="meg2-badge-wrap"><Icon name="wallet"/>{pendingCount > 0 ? <b>{pendingCount > 9 ? '9+' : pendingCount}</b> : null}</span><span>Pendentes</span>
    </button>
    <button className={menuOpen ? 'active' : ''} onClick={onMenu}><Icon name="menu"/><span>Menu</span></button>
  </nav>;
}

function signedEventAmount(event: PhoenixReadModel['events']['items'][number]) {
  const signed = Number(event.signedAmount || 0);
  if (Number.isFinite(signed) && signed !== 0) return signed;
  const amount = Math.abs(Number(event.amount || 0));
  return event.type === 'income' || event.type === 'redemption' ? amount : -amount;
}

function isPosted(status: unknown) {
  return ['paid', 'reconciled', 'confirmed'].includes(String(status || ''));
}

function PastHome({ data, context, onNavigate }: { data: PhoenixReadModel; context?: MobileHomePeriodContext | null; onNavigate: Props['onNavigate'] }) {
  const [benefitOpen, setBenefitOpen] = useState(false);
  const realized = data.events.items.filter((event) =>
    String(event.competence || String(event.date).slice(0, 7)) === data.month && isPosted(event.status)
  );
  let income = 0;
  let expense = 0;
  let paidCount = 0;
  let paidAmount = 0;
  realized.forEach((event) => {
    const signed = signedEventAmount(event);
    if (event.type === 'income' || event.type === 'redemption' || signed > 0) income += Math.max(0, signed);
    else {
      expense += Math.max(0, -signed);
      if (signed < 0) { paidCount += 1; paidAmount += -signed; }
    }
  });
  const opening = Number(context?.openingBalance ?? data.cashflow.openingBalance ?? 0);
  const result = income - expense;
  const closing = Number(context?.closingBalance ?? opening + result);

  return <main className="meg2-main meg2-period-home meg2-past-home">
    <section className="meg2-title">
      <span>Resumo do mês</span><h1>{monthLabel(data.month)}</h1><p>Veja como foi o período em uma visão simples.</p><i><Icon name="chart"/></i>
    </section>
    <section className="meg2-period-balance-grid">
      <article><span><Icon name="wallet"/></span><small>Saldo inicial</small><strong>{money.format(opening)}</strong></article>
      <article className="accent"><span><Icon name="wallet"/></span><small>Saldo final</small><strong>{money.format(closing)}</strong></article>
    </section>
    <section className="meg2-period-kpis">
      <article className="income"><Icon name="up"/><small>Receitas realizadas</small><strong>{money.format(income)}</strong></article>
      <article className="expense"><Icon name="down"/><small>Despesas realizadas</small><strong>{money.format(expense)}</strong></article>
      <article className={result >= 0 ? 'result positive' : 'result negative'}><Icon name="trend"/><small>Resultado do mês</small><strong>{resultMoney(result)}</strong></article>
      <article className="paid"><Icon name="check"/><small>Contas pagas</small><strong>{paidCount.toLocaleString('pt-BR')}</strong><em>{money.format(paidAmount)}</em></article>
    </section>
    <button className="meg2-benefit" type="button" onClick={() => setBenefitOpen(true)}>
      <span><Icon name="food"/></span><div><small>Benefício Alimentação</small><em>Saldo final do mês</em><strong>{money.format(Number(data.summary.benefitBalance || 0))}</strong></div><b>›</b>
    </button>
    <button className="meg2-period-action" onClick={() => onNavigate('movements')}><Icon name="file"/><span><strong>Ver lançamentos do mês</strong><small>Consulte os detalhes de {monthLabel(data.month)}</small></span><b>›</b></button>
    {benefitOpen ? <MegMobileBenefitModal data={data} onClose={() => setBenefitOpen(false)} onOpenMovements={() => { setBenefitOpen(false); onNavigate('movements'); }}/> : null}
  </main>;
}

function FutureHome({ data, context, onNavigate }: { data: PhoenixReadModel; context?: MobileHomePeriodContext | null; onNavigate: Props['onNavigate'] }) {
  const [benefitOpen, setBenefitOpen] = useState(false);
  const target = data.month;
  const [year, month] = target.split('-').map(Number);
  const start = target + '-01';
  const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  const events = context?.projectionEvents || data.events.items;
  const planned = events.filter((event) => event.status === 'planned' && String(event.date).slice(0, 10) <= end);
  const before = planned.filter((event) => String(event.date).slice(0, 10) < start);
  const monthEvents = planned.filter((event) => {
    const date = String(event.date).slice(0, 10);
    return date >= start && date <= end;
  });
  const baseBalance = Number(context?.currentRealBalance ?? (Number(data.summary.availableBalance || 0) + Number(data.summary.realizedResult || 0)));
  const opening = baseBalance + before.reduce((sum, event) => sum + signedEventAmount(event), 0);
  const income = monthEvents.filter((event) => signedEventAmount(event) > 0).reduce((sum, event) => sum + Math.max(0, signedEventAmount(event)), 0);
  const expense = monthEvents.filter((event) => signedEventAmount(event) < 0).reduce((sum, event) => sum + Math.max(0, -signedEventAmount(event)), 0);
  const closing = opening + income - expense;
  const cardEvents = monthEvents.filter((event) => {
    const text = String(event.paymentMethod?.name || '') + ' ' + String(event.sourceDetails?.paymentMethod || '');
    return /cart[aã]o|cr[eé]dito/i.test(text);
  });
  const cardAmount = cardEvents.reduce((sum, event) => sum + Math.max(0, -signedEventAmount(event)), 0);
  const otherAmount = Math.max(0, expense - cardAmount);
  const benefit = Number(context?.currentBenefitBalance ?? data.summary.benefitBalance ?? 0);

  return <main className="meg2-main meg2-period-home meg2-future-home">
    <section className="meg2-title">
      <span>Projeção mensal</span><h1>{monthLabel(target)}</h1><p>O que já está previsto para comprometer ou reforçar seu caixa.</p><i><Icon name="calendar"/></i>
    </section>
    <section className="meg2-period-balance-grid">
      <article><span><Icon name="wallet"/></span><small>Saldo inicial projetado</small><strong>{money.format(opening)}</strong></article>
      <article className={closing >= 0 ? 'accent' : 'danger'}><span><Icon name="trend"/></span><small>Saldo após compromissos</small><strong>{money.format(closing)}</strong></article>
    </section>
    <section className="meg2-period-kpis">
      <article className="income"><Icon name="up"/><small>Receitas previstas</small><strong>{money.format(income)}</strong><em>{monthEvents.filter((event) => signedEventAmount(event) > 0).length} entrada(s)</em></article>
      <article className="expense"><Icon name="down"/><small>Total de compromissos</small><strong>{money.format(expense)}</strong><em>{monthEvents.filter((event) => signedEventAmount(event) < 0).length} item(ns)</em></article>
      <article><Icon name="wallet"/><small>Faturas de cartões</small><strong>{money.format(cardAmount)}</strong><em>{cardEvents.length} item(ns)</em></article>
      <article><Icon name="file"/><small>Outras pendências</small><strong>{money.format(otherAmount)}</strong></article>
    </section>
    <button className="meg2-benefit" type="button" onClick={() => setBenefitOpen(true)}>
      <span><Icon name="food"/></span><div><small>Benefício Alimentação</small><em>Fora do caixa monetário</em><strong>{money.format(benefit)}</strong></div><b>›</b>
    </button>
    <button className="meg2-period-action" onClick={() => onNavigate('payables')}><Icon name="file"/><span><strong>Principais pendências do mês</strong><small>{monthEvents.length} compromisso(s) previsto(s)</small></span><b>›</b></button>
    {benefitOpen ? <MegMobileBenefitModal data={data} onClose={() => setBenefitOpen(false)} onOpenMovements={() => { setBenefitOpen(false); onNavigate('movements'); }}/> : null}
  </main>;
}

function Home({ data, periodMode, periodLabel, homePeriodContext, onNavigate }: { data: PhoenixReadModel; periodMode: PeriodMode; periodLabel?: string; homePeriodContext?: MobileHomePeriodContext | null; onNavigate: Props['onNavigate'] }) {
  const [benefitOpen, setBenefitOpen] = useState(false);
  const nowMonth = todayIso().slice(0, 7);
  if (periodMode === 'month' && data.month < nowMonth) return <PastHome data={data} context={homePeriodContext} onNavigate={onNavigate}/>;
  if (periodMode === 'month' && data.month > nowMonth) return <FutureHome data={data} context={homePeriodContext} onNavigate={onNavigate}/>;
  const openPayables = data.payables.filter((item) => openStatus(item.status) && Number(item.openAmount || 0) > 0);
  const planned = data.events.items.filter((item) => item.type === 'expense' && item.status === 'planned');
  const paid = data.events.items.filter((item) => item.type === 'expense' && ['paid', 'reconciled', 'confirmed'].includes(String(item.status)));
  const cardOpen = data.cards.reduce((sum, card) => sum + Number(card.statement?.payableAmount ?? card.payableStatementAmount ?? card.statementAmount ?? 0), 0);
  const balance = Number(data.summary.availableBalance || 0) + Number(data.summary.realizedResult || 0);
  const posted = data.events.items.filter((item) => ['paid', 'reconciled', 'confirmed'].includes(String(item.status)));
  const specialIncome = posted.filter((item) => item.type === 'income').reduce((sum, item) => sum + Math.abs(Number(item.signedAmount || item.amount || 0)), 0);
  const specialExpense = posted.filter((item) => item.type === 'expense').reduce((sum, item) => sum + Math.abs(Number(item.signedAmount || item.amount || 0)), 0);
  const income = periodMode === 'month' ? Number(data.summary.realizedIncome || 0) : specialIncome;
  const expense = periodMode === 'month' ? Number(data.summary.realizedExpense || 0) : specialExpense;
  const result = periodMode === 'month' ? Number(data.summary.realizedResult || 0) : income - expense;
  const title = periodMode === 'all' ? 'Todo o histórico' : periodMode === 'range' ? (periodLabel || 'Intervalo selecionado') : monthLabel(data.month);

  return <main className="meg2-main meg2-home" data-meg-fixed-screen="true">
    <section className="meg2-title">
      <span>Situação {data.month === todayIso().slice(0, 7) && periodMode === 'month' ? 'atual' : 'do período'}</span>
      <h1>{title}</h1>
      <p>Acompanhe seu caixa e compromissos.</p>
      <i><Icon name="trend"/></i>
    </section>

    <section className="meg2-balance">
      <span><Icon name="wallet" size={30}/></span>
      <div><small>Saldo disponível</small><strong>{money.format(balance)}</strong><p>Considerando apenas os lançamentos realizados.</p></div>
    </section>

    <section className="meg2-flow">
      <article><span className="up"><Icon name="up"/></span><div><small>Entradas no mês</small><strong>{money.format(income)}</strong></div></article>
      <article><span className="down"><Icon name="down"/></span><div><small>Saídas no mês</small><strong>{money.format(expense)}</strong></div></article>
      <article className="result"><span><Icon name="trend"/></span><div><small>Resultado do mês</small><strong>{resultMoney(result)}</strong></div></article>
    </section>

    <section className="meg2-summary">
      <article><span className="red"><Icon name="file"/></span><small>Contas a pagar</small><b>{openPayables.length}</b><em>{money.format(openPayables.reduce((s, item) => s + Number(item.openAmount || 0), 0))}</em></article>
      <article><span className="blue"><Icon name="wallet"/></span><small>Faturas de cartões</small><b>{data.cards.filter((card) => Number(card.statement?.payableAmount ?? card.statementAmount ?? 0) > 0).length}</b><em>{money.format(cardOpen)}</em></article>
      <article><span className="amber"><Icon name="file"/></span><small>Outras pendências</small><b>{planned.length}</b><em>{money.format(planned.reduce((s, item) => s + Math.abs(Number(item.signedAmount || item.amount || 0)), 0))}</em></article>
      <article><span className="green"><Icon name="check"/></span><small>Contas pagas</small><b>{paid.length}</b><em>{money.format(paid.reduce((s, item) => s + Math.abs(Number(item.signedAmount || item.amount || 0)), 0))}</em></article>
    </section>

    <button className="meg2-benefit" type="button" onClick={() => setBenefitOpen(true)}>
      <span><Icon name="food"/></span><div><small>Benefício Alimentação</small><em>Saldo disponível</em><strong>{money.format(Number(data.summary.benefitBalance || 0))}</strong></div><b>›</b>
    </button>

    <section className="meg2-quick">
      <header><div><span><Icon name="bolt" size={18}/></span><p><b>Ações rápidas</b><small>Acesse as principais funcionalidades.</small></p></div><button onClick={() => onNavigate('movements')}>Ver todas ›</button></header>
      <div>
        <button onClick={() => onNavigate('cards')}><span><Icon name="wallet"/></span><small>Cartões</small></button>
        <button onClick={() => onNavigate('payables')}><span><Icon name="file"/></span><small>Pagar conta</small></button>
        <button onClick={() => onNavigate('cashflow')}><span><Icon name="cashflow"/></span><small>Fluxo de caixa</small></button>
        <button onClick={() => onNavigate('analytics')}><span><Icon name="chart"/></span><small>Ver relatórios</small></button>
      </div>
    </section>
    {benefitOpen ? <MegMobileBenefitModal data={data} onClose={() => setBenefitOpen(false)} onOpenMovements={() => { setBenefitOpen(false); onNavigate('movements'); }}/> : null}
  </main>;
}

function InfiniteCarousel({ data, activeId, onActiveId }: { data: PhoenixReadModel; activeId: string; onActiveId: (id: string) => void }) {
  const cards = useMemo(() => data.cards.filter((card) => card.isActive !== false), [data.cards]);
  const repeated = useMemo(() => cards.length > 1 ? cards.concat(cards, cards) : cards, [cards]);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = track.current;
    if (!el || cards.length <= 1) return;
    const nodes = Array.from(el.querySelectorAll<HTMLElement>('[data-copy]'));
    const firstMiddle = nodes[cards.length];
    if (firstMiddle) el.scrollLeft = firstMiddle.offsetLeft - (el.clientWidth - firstMiddle.clientWidth) / 2;
  }, [cards.length]);

  useEffect(() => {
    const el = track.current;
    if (!el || cards.length <= 1) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const nodes = Array.from(el.querySelectorAll<HTMLElement>('[data-copy]'));
        const center = el.scrollLeft + el.clientWidth / 2;
        let nearest = nodes[0];
        let distance = Number.POSITIVE_INFINITY;
        nodes.forEach((node) => {
          const next = Math.abs(center - (node.offsetLeft + node.clientWidth / 2));
          if (next < distance) { distance = next; nearest = node; }
        });
        if (!nearest) return;
        const index = Number(nearest.dataset.copy || 0);
        const logical = ((index % cards.length) + cards.length) % cards.length;
        onActiveId(cards[logical]?.id || '');
        if (index < cards.length) {
          const target = nodes[index + cards.length];
          if (target) el.scrollLeft += target.offsetLeft - nearest.offsetLeft;
        } else if (index >= cards.length * 2) {
          const target = nodes[index - cards.length];
          if (target) el.scrollLeft += target.offsetLeft - nearest.offsetLeft;
        }
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => { cancelAnimationFrame(frame); el.removeEventListener('scroll', onScroll); };
  }, [cards, onActiveId]);

  if (!cards.length) return <div className="meg2-empty-card">Nenhum cartão cadastrado.</div>;

  return <div className="meg2-carousel-stack" data-meg-scroll-axis="x">
    <div className="meg2-carousel" ref={track}>
      {repeated.map((card, index) => {
        const art = cardArt(card.name);
        const className = 'meg2-card-art ' + (card.id === activeId ? 'active' : '');
        return <button
          key={card.id + '-' + index}
          className={className}
          data-copy={index}
          style={art ? { backgroundImage: 'url("' + art + '")' } : { background: card.color || '#073f82' }}
          onClick={(event) => {
            onActiveId(card.id);
            event.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          }}
        >{art ? null : <><strong>{cardName(card.name)}</strong><small>•••• {card.lastFour || '0000'}</small></>}</button>;
      })}
    </div>
    <div className="meg2-dots">{cards.map((card) => <span key={card.id} className={card.id === activeId ? 'active' : ''}/>)}</div>
  </div>;
}

function Cards({ data }: { data: PhoenixReadModel }) {
  const cards = useMemo(() => data.cards.filter((card) => card.isActive !== false), [data.cards]);
  const [activeId, setActiveId] = useState(cards[0]?.id || '');
  const [centerOpen, setCenterOpen] = useState(false);
  useEffect(() => { if (!cards.some((card) => card.id === activeId)) setActiveId(cards[0]?.id || ''); }, [cards, activeId]);

  const card = cards.find((item) => item.id === activeId) || cards[0];
  const rows = useMemo(() => cardRows(card), [card]);
  const current = Number(card?.statement?.payableAmount ?? card?.payableStatementAmount ?? card?.statementAmount ?? 0);
  const limit = Number(card?.creditLimit || 0);
  const available = Number(card?.availableLimit ?? Math.max(0, limit - current));
  const due = card?.statement?.dueDate ? shortDate.format(new Date(card.statement.dueDate + 'T12:00:00Z')) : card?.dueDay ? 'Dia ' + card.dueDay : '—';

  return <main className="meg2-main meg2-cards" data-meg-fixed-screen="true">
    <section className="meg2-page-title"><div><h1>Cartões</h1><p>Seus principais meios de pagamento.</p></div><span><Icon name="wallet"/></span></section>
    <InfiniteCarousel data={data} activeId={activeId} onActiveId={setActiveId}/>
    <section className="meg2-card-metrics">
      <article><Icon name="wallet"/><small>Limite total</small><strong>{money.format(limit)}</strong></article>
      <article><Icon name="trend"/><small>Disponível</small><strong>{money.format(available)}</strong></article>
      <article><Icon name="file"/><small>Fatura atual</small><strong>{money.format(current)}</strong></article>
      <article><Icon name="calendar"/><small>Vencimento</small><strong>{due}</strong></article>
    </section>
    <section className="meg2-statement">
      <header><div><h2>Lançamentos da fatura</h2><small>{card ? cardName(card.name) : 'Cartão'}</small></div><button>Ver todos ›</button></header>
      <div className="meg2-statement-list" data-meg-scroll-region="true">
        {rows.map((row) => <button key={row.id}><span className={'icon-' + semanticIcon(row.description)}><Icon name={semanticIcon(row.description)} size={20}/></span><p><b>{row.description}</b><small>{row.installmentNo && row.installmentQty ? 'Parcela ' + row.installmentNo + '/' + row.installmentQty + ' • ' : ''}{String(row.date || '').slice(0, 10).split('-').reverse().join('/')}</small></p><strong>{money.format(row.amount)}</strong><i>›</i></button>)}
        {!rows.length ? <div className="meg2-empty">Nenhum lançamento nesta fatura.</div> : null}
      </div>
    </section>
    <button className="meg2-primary" type="button" onClick={() => card && setCenterOpen(true)}><Icon name="wallet"/><strong>Abrir central do cartão</strong><span>›</span></button>
    {centerOpen && card ? <MegMobileCardCenter card={card} cardLabel={cardName(card.name)} rows={rows} onClose={() => setCenterOpen(false)}/> : null}
  </main>;
}

type PendingRow = { id: string; source: 'payable' | 'event'; sourceId: string; description: string; due: string; amount: number; paid: boolean };

function Payables({ data, onEditEvent }: { data: PhoenixReadModel; onEditEvent: Props['onEditEvent'] }) {
  const [tab, setTab] = useState<'all' | 'open' | 'paid' | 'overdue'>('all');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState<PendingRow | null>(null);
  const [descending, setDescending] = useState(false);
  const today = todayIso();

  const openPay = data.payables.filter((item) => openStatus(item.status) && Number(item.openAmount || 0) > 0).map<PendingRow>((item) => ({
    id: 'p-' + item.id, source: 'payable', sourceId: item.id, description: item.description, due: String(item.dueDate).slice(0, 10), amount: Number(item.openAmount || 0), paid: false
  }));
  const openEvents = data.events.items.filter((item) => item.type === 'expense' && item.status === 'planned').map<PendingRow>((item) => ({
    id: 'e-' + item.id, source: 'event', sourceId: item.id, description: item.description, due: String(item.date).slice(0, 10), amount: Math.abs(Number(item.signedAmount || item.amount || 0)), paid: false
  }));
  const paidEvents = data.events.items.filter((item) => item.type === 'expense' && ['paid', 'reconciled', 'confirmed'].includes(String(item.status))).map<PendingRow>((item) => ({
    id: 'e-' + item.id, source: 'event', sourceId: item.id, description: item.description, due: String(item.date).slice(0, 10), amount: Math.abs(Number(item.signedAmount || item.amount || 0)), paid: true
  }));

  const opens = openPay.concat(openEvents);
  const overdue = opens.filter((item) => item.due < today);
  const total = opens.reduce((sum, item) => sum + item.amount, 0);
  const query = search.trim().toLocaleLowerCase('pt-BR');
  const rows = opens.concat(paidEvents)
    .filter((item) => item.description.toLocaleLowerCase('pt-BR').includes(query))
    .filter((item) => !fromDate || item.due >= fromDate)
    .filter((item) => !toDate || item.due <= toDate)
    .filter((item) => tab === 'all' ? true : tab === 'open' ? !item.paid : tab === 'paid' ? item.paid : !item.paid && item.due < today)
    .sort((left, right) => descending ? right.due.localeCompare(left.due) : left.due.localeCompare(right.due));

  function dueLabel(item: PendingRow) {
    const date = item.due.split('-').reverse().join('/');
    if (item.paid) return 'Paga • ' + date;
    if (item.due < today) return 'Venceu • ' + date;
    if (item.due === today) return 'Vence hoje • ' + date;
    const diff = Math.max(1, Math.round((new Date(item.due + 'T12:00:00Z').getTime() - new Date(today + 'T12:00:00Z').getTime()) / 86400000));
    return 'Vence em ' + diff + (diff === 1 ? ' dia • ' : ' dias • ') + date;
  }

  return <main className="meg2-main meg2-payables" data-meg-fixed-screen="true">
    <section className="meg2-page-title"><div><h1>Pendentes</h1><p>Suas contas e compromissos.</p></div><span><Icon name="sliders"/></span></section>
    <div className="meg2-tabs">
      <button className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>Todas</button>
      <button className={tab === 'open' ? 'active' : ''} onClick={() => setTab('open')}>A pagar {opens.length ? <b>{opens.length}</b> : null}</button>
      <button className={tab === 'paid' ? 'active' : ''} onClick={() => setTab('paid')}>Pagas</button>
      <button className={tab === 'overdue' ? 'active' : ''} onClick={() => setTab('overdue')}>Vencidas {overdue.length ? <b>{overdue.length}</b> : null}</button>
    </div>
    <section className="meg2-pending-metrics">
      <article><small>Total</small><strong>{money.format(total)}</strong></article>
      <article><small>A pagar</small><strong>{money.format(total)}</strong><span>◷</span></article>
      <article className="late"><small>Vencidas</small><strong>{money.format(overdue.reduce((s, item) => s + item.amount, 0))}</strong><span>!</span></article>
    </section>
    <section className="meg2-search"><label><Icon name="search" size={20}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar pendentes..."/></label><button className={descending ? 'active' : ''} type="button" aria-label="Alternar ordem" onClick={() => setDescending((value) => !value)}><Icon name="list"/></button><button className={fromDate || toDate ? 'active' : ''} type="button" aria-label="Filtrar por data" onClick={() => setFilterOpen(true)}><Icon name="sliders"/></button></section>
    <section className="meg2-pending-list" data-meg-scroll-region="true">
      {rows.map((item, index) => {
        const late = !item.paid && item.due < today;
        const rowClass = late ? 'late' : item.paid ? 'paid' : '';
        const icon = semanticIcon(item.description);
        return <button key={item.id} className={rowClass} onClick={() => setSelected(item)}>
          <span className={'meg2-pending-icon icon-' + icon}><Icon name={icon}/></span>
          <p><b>{item.description}</b><small>{dueLabel(item)}</small></p>
          <span className="meg2-pending-value"><strong>{money.format(item.amount)}</strong><em>{item.paid ? 'Paga' : late ? 'Vencida' : 'A pagar'}</em></span><i>›</i>
        </button>;
      })}
      {!rows.length ? <div className="meg2-empty">Nenhum lançamento neste filtro.</div> : null}
    </section>
    {filterOpen ? <div className="meg2-pending-filter-overlay" role="presentation" onClick={() => setFilterOpen(false)}>
      <section className="meg2-pending-filter-sheet" role="dialog" aria-modal="true" aria-label="Filtrar pendentes por data" onClick={(event) => event.stopPropagation()}>
        <header><div><small>FILTRO DE DATA</small><h2>Período dos pendentes</h2></div><button type="button" onClick={() => setFilterOpen(false)}>×</button></header>
        <div className="meg2-pending-filter-fields">
          <label><span>Data inicial</span><input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)}/></label>
          <label><span>Data final</span><input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)}/></label>
        </div>
        <footer><button type="button" className="secondary" onClick={() => { setFromDate(''); setToDate(''); }}>Limpar</button><button type="button" className="apply" onClick={() => setFilterOpen(false)}>Aplicar filtro</button></footer>
      </section>
    </div> : null}
    {selected ? <div className="meg2-pending-detail-overlay" role="presentation" onClick={() => setSelected(null)}>
      <section className="meg2-pending-detail" role="dialog" aria-modal="true" aria-label="Detalhes do compromisso" onClick={(event) => event.stopPropagation()}>
        <header><div><small>DETALHES DO COMPROMISSO</small><h2>{selected.description}</h2></div><button type="button" onClick={() => setSelected(null)}>×</button></header>
        <div className="meg2-pending-detail-amount"><small>Valor</small><strong>{money.format(selected.amount)}</strong><em className={selected.paid ? 'paid' : selected.due < today ? 'late' : 'open'}>{selected.paid ? 'Paga' : selected.due < today ? 'Vencida' : 'A pagar'}</em></div>
        <dl>
          <div><dt>Data</dt><dd>{selected.due.split('-').reverse().join('/')}</dd></div>
          <div><dt>Situação</dt><dd>{dueLabel(selected)}</dd></div>
          <div><dt>Origem</dt><dd>{selected.source === 'event' ? 'Lançamento financeiro' : 'Conta a pagar'}</dd></div>
        </dl>
        <footer><button type="button" className="secondary" onClick={() => setSelected(null)}>Fechar</button>{selected.source === 'event' ? <button type="button" className="apply" onClick={() => { const id=selected.sourceId; setSelected(null); onEditEvent(id); }}>Editar lançamento</button> : <button type="button" className="apply" onClick={() => setSelected(null)}>Entendi</button>}</footer>
      </section>
    </div> : null}
  </main>;
}

function MenuSheet({ onClose, onNavigate, onLogout, onCloseApp }: { onClose: () => void; onNavigate: Props['onNavigate']; onLogout?: () => void; onCloseApp?: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const go = (view: TargetView) => { onClose(); onNavigate(view); };
  return <div className="meg2-overlay" onClick={onClose}>
    <section className="meg2-menu-sheet" onClick={(event) => event.stopPropagation()}>
      <div className="meg2-menu-aura" aria-hidden="true"/>
      <header><div className="meg2-menu-brand"><img src={asset('brand/meg-finance-system-mark.svg')} alt=""/><span><small>MEG FINANÇAS</small><h2>Menu</h2></span></div><button onClick={onClose}>×</button></header>
      <div className="meg2-menu-grid">
        <button onClick={() => go('home')}><Icon name="home"/><span>Início</span></button>
        <button onClick={() => go('movements')}><Icon name="file"/><span>Lançamentos</span></button>
        <button onClick={() => go('payables')}><Icon name="wallet"/><span>Pendentes</span></button>
        <button onClick={() => go('cards')}><Icon name="wallet"/><span>Cartões</span></button>
        <button onClick={() => go('cashflow')}><Icon name="cashflow"/><span>Fluxo de caixa</span></button>
        <button onClick={() => go('analytics')}><Icon name="chart"/><span>Relatórios</span></button>
        <button onClick={() => go('history')}><Icon name="file"/><span>Histórico</span></button>
        <button onClick={() => go('settings')}><Icon name="sliders"/><span>Configurações</span></button>
      </div>
      <footer>{onLogout ? <button onClick={onLogout}>Sair da conta</button> : null}{onCloseApp ? <button className="danger" onClick={() => setConfirm(true)}>Fechar o MEG</button> : null}</footer>
      {confirm ? <div className="meg2-confirm"><div><h3>Deseja fechar o aplicativo?</h3><p>Seus dados já salvos serão preservados.</p><span><button onClick={() => setConfirm(false)}>Não</button><button className="danger" onClick={onCloseApp}>Sim, fechar</button></span></div></div> : null}
    </section>
  </div>;
}

function PeriodSheet({ data, initialMode, loading = false, error = '', onClose, onSelectMonth, onSelectRange, onSelectAll }: {
  data: PhoenixReadModel;
  initialMode: PeriodMode;
  loading?: boolean;
  error?: string;
  onClose: () => void;
  onSelectMonth: Props['onSelectMonth'];
  onSelectRange: Props['onSelectRange'];
  onSelectAll: Props['onSelectAll'];
}) {
  const [mode, setMode] = useState<PeriodMode>(initialMode);
  const [month, setMonth] = useState(data.month);
  const [start, setStart] = useState(todayIso());
  const [end, setEnd] = useState(todayIso());

  function shift(offset: number) {
    const parts = month.split('-').map(Number);
    setMonth(new Date(Date.UTC(parts[0], parts[1] - 1 + offset, 1)).toISOString().slice(0, 7));
  }

  async function apply() {
    if (loading) return;
    if (mode === 'month') await onSelectMonth(month);
    else if (mode === 'range') await onSelectRange(start, end);
    else await onSelectAll();
    onClose();
  }

  return <div className="meg2-overlay meg2-period-overlay" onClick={loading ? undefined : onClose}>
    <section className="meg2-period-sheet" role="dialog" aria-modal="true" aria-label="Selecionar período" onClick={(event) => event.stopPropagation()}>
      <header>
        <span><Icon name="calendar" size={22}/></span>
        <div><h2>Selecionar período</h2><small>Escolha como deseja visualizar seus dados.</small></div>
        <button type="button" aria-label="Fechar" disabled={loading} onClick={onClose}>×</button>
      </header>
      <div className="meg2-period-modes">
        <button className={mode === 'month' ? 'active' : ''} onClick={() => setMode('month')} disabled={loading}><Icon name="calendar"/><b>Mês</b><small>Competência</small></button>
        <button className={mode === 'range' ? 'active' : ''} onClick={() => setMode('range')} disabled={loading}><Icon name="calendar"/><b>Intervalo</b><small>Datas livres</small></button>
        <button className={mode === 'all' ? 'active' : ''} onClick={() => setMode('all')} disabled={loading}><span>∞</span><b>Tudo</b><small>Base completa</small></button>
      </div>
      {mode === 'month' ? <div className="meg2-period-month">
        <small>Competência selecionada</small>
        <div className="meg2-month-stepper">
          <button onClick={() => shift(-1)} disabled={loading}>‹</button>
          <strong>{monthLabel(month)}</strong>
          <button onClick={() => shift(1)} disabled={loading}>›</button>
        </div>
        <label><span>Escolher outro mês</span><input type="month" value={month} disabled={loading} onChange={(event) => setMonth(event.target.value)}/></label>
      </div> : null}
      {mode === 'range' ? <div className="meg2-period-range">
        <label><span>Data inicial</span><input type="date" value={start} disabled={loading} onChange={(event) => setStart(event.target.value)}/></label>
        <i>→</i>
        <label><span>Data final</span><input type="date" value={end} disabled={loading} onChange={(event) => setEnd(event.target.value)}/></label>
      </div> : null}
      {mode === 'all' ? <div className="meg2-period-all"><span>∞</span><div><strong>Todo o histórico</strong><small>Exibe a base completa do MEG, sem limitar por mês.</small></div></div> : null}
      {error ? <div className="meg2-period-error">{error}</div> : null}
      <footer>
        <button className="secondary" disabled={loading} onClick={onClose}>Cancelar</button>
        <button className="apply" disabled={loading} onClick={() => void apply()}>{loading ? 'Carregando…' : 'Aplicar filtro'}</button>
      </footer>
    </section>
  </div>;
}

export function MegMobileFinal({ data, view, onNavigate, onLaunch: _legacyOnLaunch, onEditEvent: _legacyOnEditEvent, periodMode, periodLabel, homePeriodContext, periodLoading, periodError, onSelectMonth, onSelectRange, onSelectAll, onLogout, onClose }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [launchSheet, setLaunchSheet] = useState<{ preset: LaunchPreset; event?: FinancialEvent | null } | null>(null);
  useEffect(() => {
    void hydratePhoenixAvatarPreference(data.user.id);
  }, [data.user.id]);
  const pendingCount = data.payables.filter((item) => openStatus(item.status) && Number(item.openAmount || 0) > 0).length
    + data.events.items.filter((item) => item.type === 'expense' && item.status === 'planned').length;

  return <div className="meg2-app" data-meg-mobile-final="true">
    <div className={'meg2-shell meg2-view-' + view}>
      <Header data={data} periodMode={periodMode} periodLabel={periodLabel} onOpenPeriod={() => setPeriodOpen(true)} onOpenMenu={() => setMenuOpen(true)}/>
      <div className="meg2-scroll">
        {view === 'home' ? <Home data={data} periodMode={periodMode} periodLabel={periodLabel} homePeriodContext={homePeriodContext} onNavigate={onNavigate}/> : null}
        {view === 'movements' ? <MegMobileMovements data={data} onOpenEvent={(event) => setLaunchSheet({ preset: event.type === 'income' ? 'income' : 'expense', event })} onNew={() => setLaunchSheet({ preset: 'expense' })}/> : null}
        {view === 'cards' ? <Cards data={data}/> : null}
        {view === 'payables' ? <Payables data={data} onEditEvent={(eventId) => {
          const event = data.events.items.find((item) => item.id === eventId) || null;
          if (event) setLaunchSheet({ preset: event.type === 'income' ? 'income' : 'expense', event });
        }}/> : null}
        {view === 'history' ? <MegMobileHistory data={data}/> : null}
        {view === 'cashflow' ? <MegMobileCashflow data={data}/> : null}
        {view === 'analytics' ? <MegMobileAnalytics data={data}/> : null}
        {view === 'settings' ? <MegMobileSettings data={data} onLogout={onLogout}/> : null}
      </div>
      <Dock view={view} pendingCount={pendingCount} menuOpen={menuOpen} onNavigate={onNavigate} onLaunch={(preset) => setLaunchSheet({ preset })} onMenu={() => setMenuOpen(true)}/>
    </div>
    {menuOpen ? <MenuSheet onClose={() => setMenuOpen(false)} onNavigate={onNavigate} onLogout={onLogout} onCloseApp={onClose}/> : null}
    {periodOpen ? <PeriodSheet data={data} initialMode={periodMode} loading={periodLoading} error={periodError} onClose={() => setPeriodOpen(false)} onSelectMonth={onSelectMonth} onSelectRange={onSelectRange} onSelectAll={onSelectAll}/> : null}
    {launchSheet ? <MegMobileLaunchSheet data={data} preset={launchSheet.preset} event={launchSheet.event} onClose={() => setLaunchSheet(null)}/> : null}
  </div>;
}
