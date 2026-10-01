import { useEffect, useMemo, useRef, useState } from 'react';
import { MegIcon, resolveFinancialIcon, type MegIconName } from './MegMobileIcon';
import { financeClient, type FinancialEvent } from '../app/finance-client';
import type { PhoenixReadModel } from '../phoenix/contracts';
import { hydratePhoenixAvatarPreference, phoenixAvatarImage, readPhoenixAvatarPreference } from '../phoenix/profile-avatar';
import { MegMobileAnalytics, MegMobileCashflow, MegMobileHistory, MegMobileMovements } from './MegMobileCoreScreens';
import { MegMobileLaunchSheet } from './MegMobileLaunchSheet';
import { MegMobileBenefitCardCenter, MegMobileCardCenter, type MegMobileBenefitRow, type MegMobileCardCenterRow } from './MegMobileCardCenter';
import { MegMobileBenefitModal } from './MegMobileBenefitModal';
import { MegMobileSettings } from './MegMobileSettings';
import { MegMobilePicker } from './MegMobilePicker';
import { preparePhoenixPendingBatchSettlement, runPhoenixPendingBatchSettlement } from '../phoenix/data/phoenix-pending-write-gateway';
import { cardDueDateForStatement } from '../phoenix/data/card-dates';
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

const VEROCARD_ART_URL = asset('assets/cards/verocard-alimentacao-v659.svg');

function normalizeCardText(value: unknown) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
}

function isBenefitAccount(account: PhoenixReadModel['accounts'][number]) {
  return account.isActive && (/benefit/.test(normalizeCardText(account.type)) || /benef|verocard|alimenta/.test(normalizeCardText(account.name)));
}

function isVerocardMethod(method: PhoenixReadModel['paymentMethods'][number]) {
  return method.isActive && /verocard/.test(normalizeCardText(method.name) + ' ' + normalizeCardText(method.type));
}

function isMonetaryAccount(account: PhoenixReadModel['accounts'][number]) {
  return account.isActive && ['checking', 'savings', 'cash'].includes(normalizeCardText(account.type));
}

function isSettlementPaymentMethod(method: PhoenixReadModel['paymentMethods'][number]) {
  const type = normalizeCardText(method.type);
  const identity = normalizeCardText(method.name) + ' ' + type;
  return method.isActive && type !== 'credit' && !/verocard/.test(identity);
}

function cardArt(name: string) {
  const normalized = normalizeCardText(name);
  if (normalized.includes('mercado') || normalized.includes('meli')) {
    return asset('assets/cards/mercado-pago-visa-v662.svg');
  }
  if (normalized.includes('latam')) {
    return asset('assets/cards/latam-user-model-v61.svg');
  }
  if (normalized.includes('azul')) {
    return asset('assets/cards/azul-itau-platinum-v659.svg');
  }
  if (normalized.includes('riachuelo') || normalized.includes('midway')) {
    return asset('assets/cards/riachuelo-mastercard-visual.svg');
  }
  if (normalized.includes('nubank')) return asset('assets/cards/nubank-visual.svg');
  return '';
}

function cardName(name: string) {
  const normalized = normalizeCardText(name);
  if (normalized.includes('mercado') || normalized.includes('meli')) return 'Mercado Pago Visa';
  if (normalized.includes('latam')) return 'LATAM PASS Itaú Mastercard Platinum';
  if (normalized.includes('azul')) return normalized.includes('infinite') ? 'Azul Itaú Visa Infinite' : 'Azul Itaú Visa';
  if (normalized.includes('riachuelo') || normalized.includes('midway')) return 'Riachuelo Midway Mastercard';
  if (normalized.includes('nubank')) return 'Nubank';
  return name || 'Cartão';
}

type MobileCardRow = MegMobileCardCenterRow;

function cardRows(card: PhoenixReadModel['cards'][number] | undefined): MobileCardRow[] {
  if (!card) return [];
  if (card.statement) {
    return (card.statement.lines || []).map((line) => {
      const purchase = line.purchaseId ? (card.purchases || []).find((item) => item.id === line.purchaseId) : undefined;
      return {
        id: line.id,
        eventId: line.eventId,
        description: line.description,
        date: line.purchaseDate || line.dueDate,
        amount: Math.abs(Number(line.effect || 0)),
        installmentNo: line.installmentNo,
        installmentQty: line.installmentQty,
        category: purchase?.category?.name || undefined,
        statementMonth: line.statementMonth,
        dueDate: line.dueDate,
        status: line.sourceStatus,
      };
    });
  }
  return (card.purchases || []).flatMap((purchase) => (purchase.entries || []).map((entry) => ({
    id: entry.id,
    description: purchase.description,
    date: purchase.purchaseDate,
    amount: Math.abs(Number(entry.amount || 0)),
    installmentNo: entry.number,
    installmentQty: purchase.installments,
    category: purchase.category?.name || undefined,
    statementMonth: entry.statementMonth,
    dueDate: cardDueDateForStatement(entry.statementMonth, Number(card.closingDay || 1), Number(card.dueDay || 1)),
    status: entry.status,
  })));
}

type CarouselCard = {
  id: string;
  kind: 'credit' | 'benefit';
  label: string;
  artUrl: string;
  color?: string | null;
  lastFour?: string | null;
};

function carouselCards(data: PhoenixReadModel): CarouselCard[] {
  const credit: CarouselCard[] = data.cards.filter((card) => card.isActive !== false).map((card) => ({
    id: card.id,
    kind: 'credit' as const,
    label: cardName(card.name),
    artUrl: cardArt(card.name),
    color: card.color,
    lastFour: card.lastFour,
  }));
  const benefitAccount = data.accounts.find(isBenefitAccount);
  const verocard = data.paymentMethods.find(isVerocardMethod);
  if (benefitAccount && verocard) {
    credit.push({
      id: 'benefit-verocard',
      kind: 'benefit',
      label: 'Verocard Alimentação',
      artUrl: VEROCARD_ART_URL,
      color: '#111111',
      lastFour: null,
    });
  }
  return credit;
}

function benefitRows(data: PhoenixReadModel): MegMobileBenefitRow[] {
  const benefitAccount = data.accounts.find(isBenefitAccount);
  const verocard = data.paymentMethods.find(isVerocardMethod);
  if (!benefitAccount && !verocard) return [];
  return data.events.items
    .filter((event) => {
      const accountId = event.accountId || event.account?.id;
      const methodId = event.paymentMethodId || event.paymentMethod?.id;
      return (benefitAccount && accountId === benefitAccount.id)
        || (verocard && methodId === verocard.id)
        || /verocard|benef|alimenta/.test(normalizeCardText(event.account?.name) + ' ' + normalizeCardText(event.paymentMethod?.name));
    })
    .map((event) => {
      const signed = Number(event.signedAmount ?? event.amount ?? 0);
      const credit = event.type === 'income' || event.type === 'redemption' || signed > 0;
      return {
        id: event.id,
        eventId: event.id,
        description: event.description,
        date: String(event.date).slice(0,10),
        amount: Math.abs(signed),
        category: event.category?.name || event.sourceDetails?.group || (credit ? 'Recarga' : 'Alimentação'),
        kind: credit ? 'credit' as const : 'debit' as const,
      };
    })
    .sort((a,b) => b.date.localeCompare(a.date));
}

function Icon({ name, size = 22 }: { name: string; size?: number }) {
  return <MegIcon name={name as MegIconName} size={size}/>;
}

function semanticIcon(label: string, category?: string, group?: string) {
  return resolveFinancialIcon({ description: label, categoryName: category, categoryGroup: group });
}

function Header({ data, periodMode, periodLabel, onHome, onOpenPeriod, onOpenMenu }: { data: PhoenixReadModel; periodMode: PeriodMode; periodLabel?: string; onHome: () => void; onOpenPeriod: () => void; onOpenMenu: () => void }) {
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
    <button className="meg2-brand" type="button" onClick={onHome} aria-label="Voltar para a Home"><img src={asset('brand/meg-finance-system-mark-transparent.svg')} alt="MEG"/></button>
    <button className="meg2-period" type="button" onClick={onOpenPeriod}>
      <span className="meg2-period-icon">{periodMode === 'all' ? <b className="meg2-infinity">∞</b> : <Icon name="calendar" size={19}/>}</span>
      <span><strong>{mainLabel}</strong><small>{subLabel}</small></span>
      <b><Icon name="chevron-down" size={15}/></b>
    </button>
    <button className="meg2-user" type="button" onClick={onOpenMenu}>
      <span className={`meg2-avatar ${avatarUrl ? 'has-image' : ''}`}>{avatarUrl ? <img src={avatarUrl} alt="" draggable={false}/> : firstName.charAt(0).toUpperCase()}</span>
      <strong>{firstName.toUpperCase()}</strong>
    </button>
  </header>;
}

function Dock({ view, pendingCount, menuOpen, onNavigate, onLaunch, onMenu }: { view: MobileView; pendingCount: number; menuOpen: boolean; onNavigate: Props['onNavigate']; onLaunch: Props['onLaunch']; onMenu: () => void }) {
  return <nav className="meg2-dock">
    <button className={!menuOpen && view === 'home' ? 'active' : ''} onClick={() => onNavigate('home')}><Icon name="home"/><span>Início</span></button>
    <button className={!menuOpen && view === 'movements' ? 'active' : ''} onClick={() => onNavigate('movements')}><Icon name="file"/><span>Lançamentos</span></button>
    <button className="meg2-new" onClick={() => onLaunch('expense')}><span><Icon name="plus" size={27}/></span><small>Novo</small></button>
    <button className={!menuOpen && view === 'payables' ? 'active' : ''} onClick={() => onNavigate('payables')}>
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
      <span><Icon name="food"/></span><div><small>Benefício Alimentação</small><em>Saldo final do mês</em><strong>{money.format(Number(data.summary.benefitBalance || 0))}</strong></div><b><Icon name="chevron-right" size={16}/></b>
    </button>
    <button className="meg2-period-action" onClick={() => onNavigate('movements')}><Icon name="file"/><span><strong>Ver lançamentos do mês</strong><small>Consulte os detalhes de {monthLabel(data.month)}</small></span><b><Icon name="chevron-right" size={16}/></b></button>
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
      <span><Icon name="food"/></span><div><small>Benefício Alimentação</small><em>Fora do caixa monetário</em><strong>{money.format(benefit)}</strong></div><b><Icon name="chevron-right" size={16}/></b>
    </button>
    <button className="meg2-period-action" onClick={() => onNavigate('payables')}><Icon name="file"/><span><strong>Principais pendências do mês</strong><small>{monthEvents.length} compromisso(s) previsto(s)</small></span><b><Icon name="chevron-right" size={16}/></b></button>
    {benefitOpen ? <MegMobileBenefitModal data={data} onClose={() => setBenefitOpen(false)} onOpenMovements={() => { setBenefitOpen(false); onNavigate('movements'); }}/> : null}
  </main>;
}

function AllHistoryHome({ data, onNavigate }: { data: PhoenixReadModel; onNavigate: Props['onNavigate'] }) {
  const [benefitOpen, setBenefitOpen] = useState(false);
  const posted = data.events.items.filter((item) => isPosted(item.status));
  const income = posted.filter((item) => signedEventAmount(item) > 0).reduce((sum, item) => sum + Math.max(0, signedEventAmount(item)), 0);
  const expense = posted.filter((item) => signedEventAmount(item) < 0).reduce((sum, item) => sum + Math.max(0, -signedEventAmount(item)), 0);
  const result = income - expense;
  const months = new Set(posted.map((item) => String(item.competence || item.date || '').slice(0, 7)).filter(Boolean));
  const monthCount = Math.max(1, months.size);
  const balance = Number(data.summary.availableBalance || 0) + Number(data.summary.realizedResult || 0);

  return <main className="meg2-main meg2-period-home meg2-all-home" data-meg-fixed-screen="true">
    <section className="meg2-title">
      <span>Visão geral</span><h1>Histórico completo</h1><p>Consolidado de todos os períodos registrados.</p><i><Icon name="chart"/></i>
    </section>
    <section className="meg2-all-balance">
      <span><Icon name="wallet"/></span><div><small>Saldo atual consolidado</small><strong>{money.format(balance)}</strong><em>Posição atual considerando os lançamentos realizados.</em></div>
    </section>
    <section className="meg2-all-kpis">
      <article className="income"><Icon name="up"/><small>Total de receitas</small><strong>{money.format(income)}</strong></article>
      <article className="expense"><Icon name="down"/><small>Total de despesas</small><strong>{money.format(expense)}</strong></article>
      <article className={result >= 0 ? 'result positive' : 'result negative'}><Icon name="trend"/><small>Resultado consolidado</small><strong>{resultMoney(result)}</strong></article>
      <article><Icon name="file"/><small>Total de lançamentos</small><strong>{posted.length.toLocaleString('pt-BR')}</strong></article>
      <article><Icon name="up"/><small>Média mensal de receita</small><strong>{money.format(income / monthCount)}</strong></article>
      <article><Icon name="down"/><small>Média mensal de despesa</small><strong>{money.format(expense / monthCount)}</strong></article>
    </section>
    <button className="meg2-period-action" onClick={() => onNavigate('movements')}><Icon name="file"/><span><strong>Ver detalhamento do histórico</strong><small>Consulte todos os lançamentos registrados</small></span><b><Icon name="chevron-right" size={16}/></b></button>
    <button className="meg2-benefit" type="button" onClick={() => setBenefitOpen(true)}>
      <span><Icon name="food"/></span><div><small>Benefício Alimentação</small><em>Saldo disponível</em><strong>{money.format(Number(data.summary.benefitBalance || 0))}</strong></div><b><Icon name="chevron-right" size={16}/></b>
    </button>
    {benefitOpen ? <MegMobileBenefitModal data={data} onClose={() => setBenefitOpen(false)} onOpenMovements={() => { setBenefitOpen(false); onNavigate('movements'); }}/> : null}
  </main>;
}

function Home({ data, periodMode, periodLabel, homePeriodContext, onNavigate }: { data: PhoenixReadModel; periodMode: PeriodMode; periodLabel?: string; homePeriodContext?: MobileHomePeriodContext | null; onNavigate: Props['onNavigate'] }) {
  const [benefitOpen, setBenefitOpen] = useState(false);
  const nowMonth = todayIso().slice(0, 7);
  if (periodMode === 'month' && data.month < nowMonth) return <PastHome data={data} context={homePeriodContext} onNavigate={onNavigate}/>;
  if (periodMode === 'month' && data.month > nowMonth) return <FutureHome data={data} context={homePeriodContext} onNavigate={onNavigate}/>;
  if (periodMode === 'all') return <AllHistoryHome data={data} onNavigate={onNavigate}/>;
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
  const title = periodMode === 'range' ? (periodLabel || 'Intervalo selecionado') : monthLabel(data.month);

  return <main className="meg2-main meg2-home" data-meg-fixed-screen="true">
    <section className="meg2-title">
      <span>Situação {data.month === nowMonth && periodMode === 'month' ? 'atual' : 'do período'}</span>
      <h1>{title}</h1>
      <p>Acompanhe seu caixa e compromissos.</p>
      <i><Icon name="trend"/></i>
    </section>
    <section className="meg2-balance">
      <span><Icon name="circle-dollar" size={30}/></span>
      <div><small>Saldo disponível</small><strong>{money.format(balance)}</strong><p>Considerando apenas os lançamentos realizados.</p></div>
    </section>
    <section className="meg2-flow">
      <article><span className="up"><Icon name="banknote"/></span><div><small>Entradas no mês</small><strong>{money.format(income)}</strong></div></article>
      <article><span className="down"><Icon name="receipt"/></span><div><small>Saídas no mês</small><strong>{money.format(expense)}</strong></div></article>
      <article className="result"><span><Icon name="trend"/></span><div><small>Resultado do mês</small><strong>{resultMoney(result)}</strong></div></article>
    </section>
    <section className="meg2-summary">
      <article><span className="red"><Icon name="receipt"/></span><small>Contas a pagar</small><b>{openPayables.length}</b><em>{money.format(openPayables.reduce((s, item) => s + Number(item.openAmount || 0), 0))}</em></article>
      <article><span className="blue"><Icon name="card"/></span><small>Faturas de cartões</small><b>{data.cards.filter((card) => Number(card.statement?.payableAmount ?? card.statementAmount ?? 0) > 0).length}</b><em>{money.format(cardOpen)}</em></article>
      <article><span className="amber"><Icon name="list"/></span><small>Outras pendências</small><b>{planned.length}</b><em>{money.format(planned.reduce((s, item) => s + Math.abs(Number(item.signedAmount || item.amount || 0)), 0))}</em></article>
      <article><span className="green"><Icon name="check-line"/></span><small>Contas pagas</small><b>{paid.length}</b><em>{money.format(paid.reduce((s, item) => s + Math.abs(Number(item.signedAmount || item.amount || 0)), 0))}</em></article>
    </section>
    <button className="meg2-benefit" type="button" onClick={() => setBenefitOpen(true)}>
      <span><Icon name="food"/></span><div><small>Benefício Alimentação</small><em>Saldo disponível</em><strong>{money.format(Number(data.summary.benefitBalance || 0))}</strong></div><b><Icon name="chevron-right" size={16}/></b>
    </button>
    <section className="meg2-quick">
      <header><div><span><Icon name="bolt" size={18}/></span><p><b>Ações rápidas</b><small>Acesse as principais funcionalidades.</small></p></div><button onClick={() => onNavigate('movements')}>Ver todas <Icon name="chevron-right" size={14}/></button></header>
      <div>
        <button onClick={() => onNavigate('cards')}><span><Icon name="card"/></span><small>Cartões</small></button>
        <button onClick={() => onNavigate('payables')}><span><Icon name="receipt"/></span><small>Pagar conta</small></button>
        <button onClick={() => onNavigate('cashflow')}><span><Icon name="cashflow"/></span><small>Fluxo de caixa</small></button>
        <button onClick={() => onNavigate('analytics')}><span><Icon name="chart"/></span><small>Ver relatórios</small></button>
      </div>
    </section>
    {benefitOpen ? <MegMobileBenefitModal data={data} onClose={() => setBenefitOpen(false)} onOpenMovements={() => { setBenefitOpen(false); onNavigate('movements'); }}/> : null}
  </main>;
}

function InfiniteCarousel({ items, activeId, onActiveId }: { items: CarouselCard[]; activeId: string; onActiveId: (id: string) => void }) {
  const repeated = useMemo(() => items.length > 1 ? items.concat(items, items) : items, [items]);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = track.current;
    if (!el || items.length <= 1) return;
    const nodes = Array.from(el.querySelectorAll<HTMLElement>('[data-copy]'));
    const firstMiddle = nodes[items.length];
    if (firstMiddle) el.scrollLeft = firstMiddle.offsetLeft - (el.clientWidth - firstMiddle.clientWidth) / 2;
  }, [items.length]);

  useEffect(() => {
    const el = track.current;
    if (!el || items.length <= 1) return;
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
        const logical = ((index % items.length) + items.length) % items.length;
        onActiveId(items[logical]?.id || '');
        if (index < items.length) {
          const target = nodes[index + items.length];
          if (target) el.scrollLeft += target.offsetLeft - nearest.offsetLeft;
        } else if (index >= items.length * 2) {
          const target = nodes[index - items.length];
          if (target) el.scrollLeft += target.offsetLeft - nearest.offsetLeft;
        }
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => { cancelAnimationFrame(frame); el.removeEventListener('scroll', onScroll); };
  }, [items, onActiveId]);

  if (!items.length) return <div className="meg2-empty-card">Nenhum cartão ou benefício ativo.</div>;

  return <div className="meg2-carousel-stack" data-meg-scroll-axis="x">
    <div className="meg2-carousel" ref={track}>
      {repeated.map((item, index) => {
        const className = 'meg2-card-art ' + (item.id === activeId ? 'active ' : '') + (item.kind === 'benefit' ? 'benefit' : '');
        return <button
          key={item.id + '-' + index}
          className={className}
          data-copy={index}
          data-card-identity={item.label}
          style={!item.artUrl ? { background: item.color || '#073f82' } : undefined}
          onClick={(event) => {
            onActiveId(item.id);
            event.currentTarget.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
          }}
        >
          <span className="meg2-card-art-fallback" aria-hidden={Boolean(item.artUrl)}>
            <strong>{item.label}</strong>
            <small>{item.kind === 'benefit' ? 'Benefício Alimentação' : '•••• ' + (item.lastFour || '0000')}</small>
          </span>
          {item.artUrl ? <img
            src={item.artUrl}
            alt={item.label}
            loading="eager"
            decoding="async"
            onError={(event) => {
              event.currentTarget.hidden = true;
              event.currentTarget.parentElement?.classList.add('asset-failed');
            }}
          /> : null}
          {item.kind === 'benefit' ? <span className="meg2-benefit-card-tag">BENEFÍCIO</span> : null}
        </button>;
      })}
    </div>
    <div className="meg2-dots">{items.map((item) => <span key={item.id} className={item.id === activeId ? 'active' : ''}/>)}</div>
  </div>;
}

function Cards({ data, onEditEvent }: { data: PhoenixReadModel; onEditEvent: Props['onEditEvent'] }) {
  const items = useMemo(() => carouselCards(data), [data.cards, data.accounts, data.paymentMethods]);
  const [activeId, setActiveId] = useState(items[0]?.id || '');
  const [centerOpen, setCenterOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<MobileCardRow | null>(null);
  useEffect(() => { if (!items.some((item) => item.id === activeId)) setActiveId(items[0]?.id || ''); }, [items, activeId]);

  const active = items.find((item) => item.id === activeId) || items[0];
  const isBenefit = active?.kind === 'benefit';
  const card = !isBenefit ? data.cards.find((item) => item.id === active?.id) : undefined;
  const rows = useMemo(() => cardRows(card), [card]);
  const benefit = useMemo(() => benefitRows(data), [data.events.items, data.accounts, data.paymentMethods]);
  const current = Number(card?.statement?.netAmount ?? card?.statementAmount ?? 0);
  const limit = Number(card?.creditLimit || 0);
  const available = Number(card?.availableLimit ?? Math.max(0, limit - current));
  const due = card?.statement?.dueDate ? shortDate.format(new Date(card.statement.dueDate + 'T12:00:00Z')) : card?.dueDay ? 'Dia ' + card.dueDay : '—';
  const bestDay = card ? (Number(card.closingDay || 1) >= 28 ? 1 : Number(card.closingDay || 1) + 1) : 0;
  const usage = limit > 0 ? Math.min(100, Math.round(((limit - available) / limit) * 100)) : 0;
  const benefitBalance = Number(data.summary.benefitBalance || 0);
  const benefitCredits = Number(data.summary.benefitCredits || 0);
  const benefitUsed = Number(data.summary.benefitUsed || 0);
  const visibleRows = isBenefit ? benefit.slice(0,10) : rows;

  function openActiveCenter() {
    if (!active) return;
    setCenterOpen(true);
  }

  return <main className="meg2-main meg2-cards meg2-cards-v9" data-meg-fixed-screen="true">
    <section className="meg2-page-title"><div><h1>Cartões</h1><p>Crédito e benefício em uma visão única.</p></div><span><Icon name="card"/></span></section>
    <InfiniteCarousel items={items} activeId={activeId} onActiveId={(id) => { setActiveId(id); setCenterOpen(false); setSelectedRow(null); }}/>

    <section className={'meg2-card-snapshot ' + (isBenefit ? 'benefit' : 'credit')} role="button" tabIndex={0} onClick={openActiveCenter} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') openActiveCenter(); }}>
      <header>
        <span><strong>{active?.label || 'Cartão'}</strong><small>{isBenefit ? 'Saldo carregado · consumo imediato' : `Fatura ${data.month.split('-').reverse().join('/')}`}</small></span>
        <b>Abrir central <Icon name="chevron-right" size={13}/></b>
      </header>
      {isBenefit ? <div className="meg2-card-metrics benefit">
        <article><Icon name="wallet"/><small>Saldo disponível</small><strong>{money.format(benefitBalance)}</strong></article>
        <article><Icon name="arrow-up"/><small>Recargas</small><strong>{money.format(benefitCredits)}</strong></article>
        <article><Icon name="food"/><small>Consumido</small><strong>{money.format(benefitUsed)}</strong></article>
        <article><Icon name="list"/><small>Movimentos</small><strong>{benefit.length}</strong></article>
      </div> : <div className="meg2-card-metrics">
        <article><Icon name="wallet"/><small>Limite total</small><strong>{money.format(limit)}</strong></article>
        <article><Icon name="trend"/><small>Disponível</small><strong>{money.format(available)}</strong></article>
        <article><Icon name="file"/><small>Fatura atual</small><strong>{money.format(current)}</strong></article>
        <article><Icon name="calendar"/><small>Vencimento</small><strong>{due}</strong></article>
      </div>}
      {!isBenefit && card ? <div className="meg2-card-usage"><span><i style={{ width: usage + '%' }}/></span><small>{usage}% utilizado · melhor dia para compra: {bestDay}</small></div> : null}
      {isBenefit ? <div className="meg2-card-usage benefit"><span><i style={{ width: benefitCredits > 0 ? Math.min(100,(benefitUsed/benefitCredits)*100) + '%' : '0%' }}/></span><small>O saldo remanescente continua disponível após a próxima recarga.</small></div> : null}
    </section>

    <section className="meg2-statement">
      <header><div><h2>{isBenefit ? 'Movimentações do benefício' : 'Lançamentos da fatura'}</h2><small>{active?.label || 'Cartão'}</small></div><button type="button" onClick={openActiveCenter}>Ver todos <Icon name="chevron-right" size={14}/></button></header>
      <div className="meg2-statement-list" data-meg-scroll-region="true">
        {visibleRows.map((row) => {
          if (isBenefit) {
            const benefitRow = row as MegMobileBenefitRow;
            const icon = semanticIcon(benefitRow.description, benefitRow.category);
            return <button key={benefitRow.id} type="button" onClick={() => benefitRow.eventId && onEditEvent(benefitRow.eventId)}>
              <span className={'icon-' + icon}><Icon name={icon} size={20}/></span>
              <p><b>{benefitRow.description}</b><small>{benefitRow.date.split('-').reverse().join('/')} · {benefitRow.category || 'Alimentação'}</small></p>
              <strong className={benefitRow.kind}>{benefitRow.kind === 'credit' ? '+' : '−'}{money.format(benefitRow.amount)}</strong><i><Icon name="chevron-right" size={15}/></i>
            </button>;
          }
          const creditRow = row as MobileCardRow;
          const icon = semanticIcon(creditRow.description, creditRow.category);
          return <button key={creditRow.id} type="button" onClick={() => setSelectedRow(creditRow)}><span className={'icon-' + icon}><Icon name={icon} size={20}/></span><p><b>{creditRow.description}</b><small>{creditRow.installmentNo && creditRow.installmentQty ? 'Parcela ' + creditRow.installmentNo + '/' + creditRow.installmentQty + ' • ' : ''}{String(creditRow.date || '').slice(0, 10).split('-').reverse().join('/')}</small></p><strong>{money.format(creditRow.amount)}</strong><i><Icon name="chevron-right" size={15}/></i></button>;
        })}
        {!visibleRows.length ? <div className="meg2-empty">{isBenefit ? 'Nenhuma movimentação de benefício neste período.' : 'Nenhum lançamento nesta fatura.'}</div> : null}
      </div>
    </section>

    <button className="meg2-primary" type="button" onClick={openActiveCenter}><Icon name={isBenefit ? 'food' : 'card'}/><strong>{isBenefit ? 'Abrir extrato do Verocard' : 'Abrir central do cartão'}</strong><span><Icon name="chevron-right" size={16}/></span></button>

    {centerOpen && card && !isBenefit ? <MegMobileCardCenter card={card} cardLabel={cardName(card.name)} artUrl={cardArt(card.name)} rows={rows} currentMonth={data.month} onOpenRow={(row) => { setCenterOpen(false); setSelectedRow(row); }} onClose={() => setCenterOpen(false)}/> : null}
    {centerOpen && isBenefit ? <MegMobileBenefitCardCenter artUrl={VEROCARD_ART_URL} balance={benefitBalance} credits={benefitCredits} used={benefitUsed} rows={benefit} onOpenEvent={(eventId) => { setCenterOpen(false); onEditEvent(eventId); }} onClose={() => setCenterOpen(false)}/> : null}

    {selectedRow && card ? <div className="meg2-card-detail-overlay" role="presentation" onClick={() => setSelectedRow(null)}>
      <section className="meg2-card-detail" role="dialog" aria-modal="true" aria-label="Detalhe da compra" onClick={(event) => event.stopPropagation()}>
        <header><div><small>DETALHE DA COMPRA</small><h2>{selectedRow.description}</h2></div><button type="button" onClick={() => setSelectedRow(null)}><Icon name="x" size={18}/></button></header>
        <div className="meg2-card-detail-value"><span className={'icon-' + semanticIcon(selectedRow.description, selectedRow.category)}><Icon name={semanticIcon(selectedRow.description, selectedRow.category)}/></span><div><small>{cardName(card.name)}</small><strong>{money.format(selectedRow.amount)}</strong></div></div>
        <dl>
          <div><dt>Data da compra</dt><dd>{String(selectedRow.date).slice(0,10).split('-').reverse().join('/')}</dd></div>
          <div><dt>Categoria</dt><dd>{selectedRow.category || 'Outros'}</dd></div>
          <div><dt>Cartão</dt><dd>{cardName(card.name)}{card.lastFour ? ` ·•••• ${card.lastFour}` : ''}</dd></div>
          <div><dt>Fatura / competência</dt><dd>{selectedRow.statementMonth ? selectedRow.statementMonth.split('-').reverse().join('/') : data.month.split('-').reverse().join('/')}</dd></div>
          <div><dt>Vencimento</dt><dd>{selectedRow.dueDate ? selectedRow.dueDate.split('-').reverse().join('/') : due}</dd></div>
          <div><dt>Parcelamento</dt><dd>{selectedRow.installmentNo && selectedRow.installmentQty ? `${selectedRow.installmentNo} de ${selectedRow.installmentQty}` : 'À vista'}</dd></div>
        </dl>
        <footer><button type="button" className="secondary" onClick={() => setSelectedRow(null)}>Fechar</button><button type="button" className="apply" onClick={() => { const eventId=selectedRow.eventId; setSelectedRow(null); if (eventId) onEditEvent(eventId); else setCenterOpen(true); }}>{selectedRow.eventId ? 'Editar lançamento' : 'Abrir central'}</button></footer>
      </section>
    </div> : null}
  </main>;
}

type PendingCardLine = { id:string; description:string; amount:number; purchaseDate:string; category?:string; installment?:string; credit?:boolean };
type PendingRow = { id: string; source: 'payable' | 'event' | 'card'; sourceId: string; statementMonth?: string; description: string; due: string; amount: number; paid: boolean; category?: string; account?: string; payment?: string; installment?: string; notes?: string; itemCount?: number; cardLines?: PendingCardLine[]; searchText?: string };
type PendingSettlementBalance = { status: 'idle' | 'loading' | 'ready' | 'error'; available: number; accountName: string; message?: string };
type PendingSettlementSuccess = { description:string; amount:number; paidAt:string; account:string; payment:string; balanceBefore:number; balanceAfter:number; count:number };

function pendingSourcePayload(event: FinancialEvent) {
  const payload = (event as FinancialEvent & { sourcePayload?: unknown }).sourcePayload;
  return payload && typeof payload === 'object' && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : null;
}

function isProjectedCardPending(event: FinancialEvent) {
  return pendingSourcePayload(event)?.cardDomain === true;
}

function Payables({ data, onEditEvent }: { data: PhoenixReadModel; onEditEvent: Props['onEditEvent'] }) {
  const [tab, setTab] = useState<'all' | 'open' | 'paid' | 'overdue'>('all');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState<PendingRow | null>(null);
  const [descending, setDescending] = useState(false);
  const [batchSelected, setBatchSelected] = useState<string[]>([]);
  const [settlementItems, setSettlementItems] = useState<PendingRow[]>([]);
  const [settlementStep, setSettlementStep] = useState<'form' | 'confirm'>('form');
  const [settlementBusy, setSettlementBusy] = useState(false);
  const [settlementMessage, setSettlementMessage] = useState('');
  const [settlementBalance, setSettlementBalance] = useState<PendingSettlementBalance>({ status:'idle', available:0, accountName:'' });
  const [settlementSuccess, setSettlementSuccess] = useState<PendingSettlementSuccess | null>(null);
  const [paidAt, setPaidAt] = useState(todayIso());
  const monetaryAccounts = data.accounts.filter(isMonetaryAccount);
  const activeMethods = data.paymentMethods.filter(isSettlementPaymentMethod);
  const [settlementAccountId, setSettlementAccountId] = useState(monetaryAccounts[0]?.id || '');
  const [settlementMethodId, setSettlementMethodId] = useState('');
  const today = todayIso();

  const settlementTotal = settlementItems.reduce((sum, item) => sum + item.amount, 0);
  const settlementMissing = settlementItems.length && settlementBalance.status === 'ready'
    ? Math.max(0, Math.round((settlementTotal - settlementBalance.available) * 100) / 100)
    : 0;
  const settlementAfter = settlementItems.length && settlementBalance.status === 'ready'
    ? Math.round((settlementBalance.available - settlementTotal) * 100) / 100
    : 0;
  const settlementCanReview = Boolean(
    settlementItems.length
    && settlementItems.every((item) => !item.paid)
    && paidAt
    && settlementAccountId
    && settlementMethodId
    && settlementBalance.status === 'ready'
    && settlementMissing <= 0
    && !settlementBusy
  );

  useEffect(() => {
    if (!settlementItems.length || !settlementAccountId || !paidAt) {
      setSettlementBalance({ status:'idle', available:0, accountName:'' });
      return;
    }
    let cancelled = false;
    setSettlementBalance((current) => ({ ...current, status:'loading', message:undefined }));
    void financeClient.getMonetaryBalance(settlementAccountId, paidAt)
      .then((balance) => {
        if (cancelled) return;
        setSettlementBalance({
          status:'ready',
          available:Number(balance.available || 0),
          accountName:balance.accountName || monetaryAccounts.find((item) => item.id === settlementAccountId)?.name || 'Conta monetária',
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setSettlementBalance({
          status:'error',
          available:0,
          accountName:monetaryAccounts.find((item) => item.id === settlementAccountId)?.name || 'Conta monetária',
          message:error instanceof Error ? error.message : 'Não foi possível consultar o saldo da conta.',
        });
      });
    return () => { cancelled = true; };
  }, [settlementItems.map((item) => item.id).join('|'), settlementAccountId, paidAt]);

  function openSettlement(itemOrItems: PendingRow | PendingRow[]) {
    const items = (Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems]).filter((item) => !item.paid);
    if (!items.length) return;
    setSelected(null);
    setSettlementItems(items);
    setPaidAt(todayIso());
    setSettlementAccountId(monetaryAccounts[0]?.id || '');
    setSettlementMethodId('');
    setSettlementMessage('');
    setSettlementBalance({ status:'idle', available:0, accountName:'' });
    setSettlementStep('form');
  }

  function closeSettlement() {
    if (settlementBusy) return;
    setSettlementItems([]);
    setSettlementStep('form');
    setSettlementMessage('');
  }

  function reviewSettlement() {
    if (!settlementCanReview) return;
    setSettlementMessage('');
    setSettlementStep('confirm');
  }

  async function confirmSettlement() {
    if (!settlementItems.length || settlementBusy || settlementStep !== 'confirm') return;
    try {
      setSettlementBusy(true);
      setSettlementMessage('Confirmando o lote no servidor…');
      const prepared = preparePhoenixPendingBatchSettlement({
        items: settlementItems.map((item) => ({
          source: item.source,
          sourceId: item.sourceId,
          amount: item.amount,
          statementMonth: item.statementMonth,
        })),
        paidAt,
        accountId: settlementAccountId,
        paymentMethodId: settlementMethodId,
      });
      const result = await runPhoenixPendingBatchSettlement(prepared, data.month, (state) => {
        if (state.status === 'saving') setSettlementMessage('Confirmando o lote no servidor…');
        if (state.status === 'error') setSettlementMessage(state.message);
      });
      if (result.status !== 'confirmed') return;
      const account = monetaryAccounts.find((item) => item.id === settlementAccountId)?.name || settlementBalance.accountName || 'Conta monetária';
      const payment = activeMethods.find((item) => item.id === settlementMethodId)?.name || 'Forma de pagamento';
      const response = result.result && typeof result.result === 'object' ? result.result as Record<string, unknown> : {};
      const protection = response.protection && typeof response.protection === 'object' ? response.protection as Record<string, unknown> : {};
      const serverBefore = Number(response.accountBalanceBefore ?? protection.available);
      const serverAfter = Number(response.accountBalanceAfter);
      const balanceBefore = Number.isFinite(serverBefore) ? serverBefore : settlementBalance.available;
      const balanceAfter = Number.isFinite(serverAfter) ? serverAfter : Math.round((balanceBefore - settlementTotal) * 100) / 100;
      setSettlementSuccess({
        description: settlementItems.length === 1 ? settlementItems[0].description : 'Lote com ' + settlementItems.length + ' compromissos',
        amount:settlementTotal,
        paidAt,
        account,
        payment,
        balanceBefore,
        balanceAfter,
        count:settlementItems.length,
      });
      setBatchSelected([]);
      setSettlementItems([]);
      setSettlementMessage('');
      setSettlementStep('form');
    } catch (error) {
      setSettlementMessage(error instanceof Error ? error.message : 'Não foi possível confirmar a baixa.');
    } finally {
      setSettlementBusy(false);
    }
  }

  const openPay = data.payables.filter((item) => openStatus(item.status) && Number(item.openAmount || 0) > 0).map<PendingRow>((item) => ({
    id: 'p-' + item.id, source: 'payable', sourceId: item.id, description: item.description, due: String(item.dueDate).slice(0, 10), amount: Number(item.openAmount || 0), paid: false,
    category: item.category?.name || item.category?.group || 'Contas a pagar', account: 'Conta principal', payment: 'Boleto / compromisso', installment: item.installmentQty > 1 ? `${item.installmentNo} de ${item.installmentQty}` : 'Única'
  }));
  const openEvents = data.events.items.filter((item) => item.type === 'expense' && item.status === 'planned').map<PendingRow>((item) => ({
    id: 'e-' + item.id, source: 'event', sourceId: item.id, description: item.description, due: String(item.date).slice(0, 10), amount: Math.abs(Number(item.signedAmount || item.amount || 0)), paid: false,
    category: item.category?.name || item.sourceDetails?.group || 'Despesas', account: item.account?.name || 'Conta não informada', payment: item.paymentMethod?.name || item.sourceDetails?.paymentMethod || 'Forma não informada', notes: item.notes || item.sourceDetails?.observations || undefined
  }));
  const paidEvents = data.events.items.filter((item) => item.type === 'expense' && ['paid', 'reconciled', 'confirmed'].includes(String(item.status))).map<PendingRow>((item) => ({
    id: 'e-' + item.id, source: 'event', sourceId: item.id, description: item.description, due: String(item.date).slice(0, 10), amount: Math.abs(Number(item.signedAmount || item.amount || 0)), paid: true,
    category: item.category?.name || item.sourceDetails?.group || 'Despesas', account: item.account?.name || 'Conta não informada', payment: item.paymentMethod?.name || item.sourceDetails?.paymentMethod || 'Forma não informada', notes: item.notes || item.sourceDetails?.observations || undefined
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
        const icon = semanticIcon(item.description, item.category);
        return <button key={item.id} className={rowClass} onClick={() => setSelected(item)}>
          <span className={'meg2-pending-icon icon-' + icon}><Icon name={icon}/></span>
          <p><b>{item.description}</b><small>{dueLabel(item)}</small></p>
          <span className="meg2-pending-value"><strong>{money.format(item.amount)}</strong><em>{item.paid ? 'Paga' : late ? 'Vencida' : 'A pagar'}</em></span><i><Icon name="chevron-right" size={15}/></i>
        </button>;
      })}
      {!rows.length ? <div className="meg2-empty">Nenhum lançamento neste filtro.</div> : null}
    </section>
    {filterOpen ? <div className="meg2-pending-filter-overlay" role="presentation" onClick={() => setFilterOpen(false)}>
      <section className="meg2-pending-filter-sheet" role="dialog" aria-modal="true" aria-label="Filtrar pendentes por data" onClick={(event) => event.stopPropagation()}>
        <header><div><small>FILTRO DE DATA</small><h2>Período dos pendentes</h2></div><button type="button" onClick={() => setFilterOpen(false)}><Icon name="x" size={18}/></button></header>
        <div className="meg2-pending-filter-fields">
          <label><span>Data inicial</span><input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)}/></label>
          <label><span>Data final</span><input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)}/></label>
        </div>
        <footer><button type="button" className="secondary" onClick={() => { setFromDate(''); setToDate(''); }}>Limpar</button><button type="button" className="apply" onClick={() => setFilterOpen(false)}>Aplicar filtro</button></footer>
      </section>
    </div> : null}
    {selected ? <div className="meg2-pending-detail-overlay" role="presentation" onClick={() => setSelected(null)}>
      <section className="meg2-pending-detail" role="dialog" aria-modal="true" aria-label="Detalhes do compromisso" onClick={(event) => event.stopPropagation()}>
        <header><div><small>DETALHES DO COMPROMISSO</small><h2>{selected.description}</h2></div><button type="button" onClick={() => setSelected(null)}><Icon name="x" size={18}/></button></header>
        <div className="meg2-pending-detail-amount"><small>Valor</small><strong>{money.format(selected.amount)}</strong><em className={selected.paid ? 'paid' : selected.due < today ? 'late' : 'open'}>{selected.paid ? 'Paga' : selected.due < today ? 'Vencida' : 'A pagar'}</em></div>
        <dl>
          <div><dt>Data</dt><dd>{selected.due.split('-').reverse().join('/')}</dd></div>
          <div><dt>Situação</dt><dd>{dueLabel(selected)}</dd></div>
          <div><dt>Categoria</dt><dd>{selected.category || 'Não informada'}</dd></div>
          <div><dt>Conta</dt><dd>{selected.account || 'Não informada'}</dd></div>
          <div><dt>Pagamento</dt><dd>{selected.payment || 'Não informado'}</dd></div>
          {selected.installment ? <div><dt>Parcelamento</dt><dd>{selected.installment}</dd></div> : null}
          {selected.notes ? <div><dt>Observações</dt><dd>{selected.notes}</dd></div> : null}
          <div><dt>Origem</dt><dd>{selected.source === 'event' ? 'Lançamento financeiro' : 'Conta a pagar'}</dd></div>
        </dl>
        <footer className="meg2-pending-detail-actions"><button type="button" className="secondary" onClick={() => setSelected(null)}>Fechar</button>{selected.source === 'event' ? <button type="button" className="secondary" onClick={() => { const id=selected.sourceId; setSelected(null); onEditEvent(id); }}>Editar</button> : null}{!selected.paid ? <button type="button" className="apply" onClick={() => openSettlement(selected)}>Dar baixa</button> : null}</footer>
      </section>
    </div> : null}
    {settlementItem ? <div className="meg2-pending-settle-overlay" role="presentation">
      <section className="meg2-pending-settle" role="dialog" aria-modal="true" aria-label="Dar baixa no compromisso">
        <header>
          <div><small>{settlementStep === 'form' ? 'REVISAR BAIXA' : 'CONFIRMAÇÃO FINAL'}</small><h2>{settlementItem.description}</h2><p>{money.format(settlementItem.amount)}</p></div>
          <button type="button" disabled={settlementBusy} onClick={() => { setSettlementItem(null); setSettlementStep('form'); setSettlementMessage(''); }}><Icon name="x" size={18}/></button>
        </header>
        {settlementStep === 'form' ? <>
          <div className="meg2-pending-settle-fields" data-meg-scroll-region="true">
            <label className="meg2-pending-date-field"><span>Data efetiva do pagamento</span><input type="date" max={today} value={paidAt} disabled={settlementBusy} onChange={(event) => { setPaidAt(event.target.value); setSettlementMessage(''); }}/></label>
            <MegMobilePicker label="Conta monetária" value={settlementAccountId} disabled={settlementBusy} placeholder="Selecione a conta" options={monetaryAccounts.map((item) => ({ id:item.id, label:item.name, subtitle:item.type ? String(item.type) : undefined, icon:'wallet', tone:'cyan' }))} onChange={(value) => { setSettlementAccountId(value); setSettlementMessage(''); }}/>
            <MegMobilePicker label="Forma de pagamento" value={settlementMethodId} disabled={settlementBusy} placeholder="Selecione a forma" options={activeMethods.map((item) => ({ id:item.id, label:item.name, subtitle:item.type ? String(item.type) : undefined, icon:'wallet', tone:'cyan' }))} onChange={(value) => { setSettlementMethodId(value); setSettlementMessage(''); }}/>

            <section className={'meg2-pending-balance-card ' + (settlementMissing > 0 ? 'danger' : settlementBalance.status === 'ready' ? 'ok' : '')}>
              <header><span><Icon name="wallet" size={17}/></span><div><small>PROTEÇÃO DE SALDO</small><strong>{settlementBalance.status === 'loading' ? 'Consultando saldo…' : settlementBalance.status === 'error' ? 'Saldo indisponível' : settlementBalance.status === 'ready' ? settlementBalance.accountName : 'Selecione a conta e a data'}</strong></div></header>
              {settlementBalance.status === 'ready' ? <div className="meg2-pending-balance-grid">
                <span><small>Saldo disponível</small><b>{money.format(settlementBalance.available)}</b></span>
                <span><small>Após a baixa</small><b className={settlementMissing > 0 ? 'negative' : ''}>{money.format(settlementAfter)}</b></span>
                {settlementMissing > 0 ? <span className="missing"><small>Falta para baixar</small><b>{money.format(settlementMissing)}</b></span> : null}
              </div> : null}
              {settlementBalance.status === 'error' ? <p>Não foi possível validar o saldo desta conta. A baixa permanece bloqueada.</p> : null}
              {settlementMissing > 0 ? <p>Saldo insuficiente. A baixa não pode ser confirmada até haver saldo monetário suficiente na conta selecionada.</p> : null}
            </section>
            {!monetaryAccounts.length ? <p className="meg2-pending-settle-message danger">Nenhuma conta monetária ativa disponível. Cadastre ou ative uma conta corrente, poupança ou caixa antes de dar baixa.</p> : null}
            {settlementMessage ? <p className="meg2-pending-settle-message">{settlementMessage}</p> : null}
          </div>
          <footer>
            <button type="button" className="secondary" disabled={settlementBusy} onClick={() => { setSettlementItem(null); setSettlementMessage(''); }}>Cancelar</button>
            <button type="button" className="apply" disabled={!settlementCanReview} onClick={reviewSettlement}>Revisar baixa</button>
          </footer>
        </> : <>
          <div className="meg2-pending-confirm">
            <div className="meg2-pending-confirm-icon"><Icon name="check-line" size={22}/></div>
            <h3>Confirme antes de movimentar o saldo</h3>
            <p>A baixa só será concluída depois da confirmação real do servidor. Confira os dados abaixo.</p>
            <dl>
              <div><dt>Data da baixa</dt><dd>{paidAt.split('-').reverse().join('/')}</dd></div>
              <div><dt>Conta</dt><dd>{monetaryAccounts.find((item) => item.id === settlementAccountId)?.name || settlementBalance.accountName}</dd></div>
              <div><dt>Pagamento</dt><dd>{activeMethods.find((item) => item.id === settlementMethodId)?.name || 'Não informado'}</dd></div>
              <div><dt>Valor</dt><dd>{money.format(settlementItem.amount)}</dd></div>
              <div><dt>Saldo antes</dt><dd>{money.format(settlementBalance.available)}</dd></div>
              <div className="after"><dt>Saldo após</dt><dd>{money.format(settlementAfter)}</dd></div>
            </dl>
            {settlementMessage ? <p className="meg2-pending-settle-message">{settlementMessage}</p> : null}
          </div>
          <footer>
            <button type="button" className="secondary" disabled={settlementBusy} onClick={() => { setSettlementStep('form'); setSettlementMessage(''); }}>Voltar</button>
            <button type="button" className="apply" disabled={settlementBusy || settlementMissing > 0 || settlementBalance.status !== 'ready'} onClick={() => void confirmSettlement()}>{settlementBusy ? 'Confirmando…' : 'Confirmar e dar baixa'}</button>
          </footer>
        </>}
      </section>
    </div> : null}
    {settlementSuccess ? <div className="meg2-pending-success-overlay" role="presentation">
      <section className="meg2-pending-success" role="dialog" aria-modal="true" aria-label="Baixa confirmada">
        <span className="meg2-pending-success-icon"><Icon name="check-line" size={24}/></span><small>BAIXA CONFIRMADA</small><h2>{settlementSuccess.description}</h2><strong>{money.format(settlementSuccess.amount)}</strong>
        <dl><div><dt>Data</dt><dd>{settlementSuccess.paidAt.split('-').reverse().join('/')}</dd></div><div><dt>Conta</dt><dd>{settlementSuccess.account}</dd></div><div><dt>Pagamento</dt><dd>{settlementSuccess.payment}</dd></div><div><dt>Saldo antes</dt><dd>{money.format(settlementSuccess.balanceBefore)}</dd></div><div><dt>Saldo após</dt><dd>{money.format(settlementSuccess.balanceAfter)}</dd></div></dl>
        <button type="button" className="apply" onClick={() => setSettlementSuccess(null)}>Concluir</button>
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
      <header><div className="meg2-menu-brand"><img src={asset('brand/meg-finance-system-mark.svg')} alt=""/><span><small>MEG FINANÇAS</small><h2>Menu</h2></span></div><button onClick={onClose}><Icon name="x" size={18}/></button></header>
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
        <button type="button" aria-label="Fechar" disabled={loading} onClick={onClose}><Icon name="x" size={18}/></button>
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
          <button onClick={() => shift(1)} disabled={loading}><Icon name="chevron-right" size={18}/></button>
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
  const appRef = useRef<HTMLDivElement>(null);
  /* viewport mobile medido em tempo real */
  useEffect(() => {
    const app = appRef.current;
    if (!app || typeof window === 'undefined') return;

    const viewport = window.visualViewport;
    let frame = 0;
    let observer: ResizeObserver | null = null;

    const syncViewport = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const shell = app.querySelector<HTMLElement>('.meg2-shell');
        const header = shell?.querySelector<HTMLElement>('.meg2-header') || null;
        const dock = shell?.querySelector<HTMLElement>('.meg2-dock') || null;
        const viewportHeight = Math.max(0, Math.round(viewport?.height || window.innerHeight || document.documentElement.clientHeight || 0));
        const headerHeight = Math.max(0, Math.ceil(header?.getBoundingClientRect().height || 0));
        const dockHeight = Math.max(0, Math.ceil(dock?.getBoundingClientRect().height || 0));

        if (viewportHeight) app.style.setProperty('--meg-app-height', `${viewportHeight}px`);
        if (headerHeight) app.style.setProperty('--meg-header-height', `${headerHeight}px`);
        if (dockHeight) app.style.setProperty('--meg-dock-height', `${dockHeight}px`);
      });
    };

    syncViewport();
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(syncViewport);
      const shell = app.querySelector<HTMLElement>('.meg2-shell');
      const header = shell?.querySelector<HTMLElement>('.meg2-header') || null;
      const dock = shell?.querySelector<HTMLElement>('.meg2-dock') || null;
      if (shell) observer.observe(shell);
      if (header) observer.observe(header);
      if (dock) observer.observe(dock);
    }
    viewport?.addEventListener('resize', syncViewport);
    viewport?.addEventListener('scroll', syncViewport);
    window.addEventListener('resize', syncViewport);
    window.addEventListener('orientationchange', syncViewport);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer?.disconnect();
      viewport?.removeEventListener('resize', syncViewport);
      viewport?.removeEventListener('scroll', syncViewport);
      window.removeEventListener('resize', syncViewport);
      window.removeEventListener('orientationchange', syncViewport);
    };
  }, [view, menuOpen, periodOpen, launchSheet]);
  useEffect(() => {
    void hydratePhoenixAvatarPreference(data.user.id);
  }, [data.user.id]);
  const pendingCount = data.payables.filter((item) => openStatus(item.status) && Number(item.openAmount || 0) > 0).length
    + data.events.items.filter((item) => item.type === 'expense' && item.status === 'planned').length;

  const navigateMobile = (next: TargetView) => {
    setMenuOpen(false);
    setPeriodOpen(false);
    onNavigate(next);
  };
  const toggleMenu = () => {
    setPeriodOpen(false);
    setMenuOpen((value) => !value);
  };
  const openMenu = () => {
    setPeriodOpen(false);
    setMenuOpen(true);
  };
  const openPeriod = () => {
    setMenuOpen(false);
    setPeriodOpen(true);
  };

  return <div ref={appRef} className="meg2-app" data-meg-mobile-final="true">
    <div className={'meg2-shell meg2-view-' + view}>
      <Header data={data} periodMode={periodMode} periodLabel={periodLabel} onHome={() => navigateMobile('home')} onOpenPeriod={openPeriod} onOpenMenu={toggleMenu}/>
      <div className="meg2-scroll">
        {view === 'home' ? <Home data={data} periodMode={periodMode} periodLabel={periodLabel} homePeriodContext={homePeriodContext} onNavigate={onNavigate}/> : null}
        {view === 'movements' ? <MegMobileMovements data={data} onOpenEvent={(event) => setLaunchSheet({ preset: event.type === 'income' ? 'income' : 'expense', event })} onOpenPeriod={openPeriod} onCreate={() => setLaunchSheet({ preset: 'expense' })}/> : null}
        {view === 'cards' ? <Cards data={data} onEditEvent={(eventId) => {
          const event = data.events.items.find((item) => item.id === eventId) || null;
          if (event) setLaunchSheet({ preset: event.type === 'income' ? 'income' : 'expense', event });
        }}/> : null}
        {view === 'payables' ? <Payables data={data} onEditEvent={(eventId) => {
          const event = data.events.items.find((item) => item.id === eventId) || null;
          if (event) setLaunchSheet({ preset: event.type === 'income' ? 'income' : 'expense', event });
        }}/> : null}
        {view === 'history' ? <MegMobileHistory data={data}/> : null}
        {view === 'cashflow' ? <MegMobileCashflow data={data}/> : null}
        {view === 'analytics' ? <MegMobileAnalytics data={data}/> : null}
        {view === 'settings' ? <MegMobileSettings data={data} onLogout={onLogout}/> : null}
      </div>
      <Dock view={view} pendingCount={pendingCount} menuOpen={menuOpen} onNavigate={navigateMobile} onLaunch={(preset) => setLaunchSheet({ preset })} onMenu={toggleMenu}/>
      {menuOpen ? <MenuSheet onClose={() => setMenuOpen(false)} onNavigate={navigateMobile} onLogout={onLogout} onCloseApp={onClose}/> : null}
      {periodOpen ? <PeriodSheet data={data} initialMode={periodMode} loading={periodLoading} error={periodError} onClose={() => setPeriodOpen(false)} onSelectMonth={onSelectMonth} onSelectRange={onSelectRange} onSelectAll={onSelectAll}/> : null}
    </div>
    {launchSheet ? <MegMobileLaunchSheet
      data={data}
      preset={launchSheet.preset}
      event={launchSheet.event}
      onClose={() => setLaunchSheet(null)}
      appHeader={<Header data={data} periodMode={periodMode} periodLabel={periodLabel} onHome={() => { setLaunchSheet(null); navigateMobile('home'); }} onOpenPeriod={() => { setLaunchSheet(null); openPeriod(); }} onOpenMenu={() => { setLaunchSheet(null); openMenu(); }}/>}
      appDock={<Dock view={view} pendingCount={pendingCount} menuOpen={menuOpen} onNavigate={(next) => { setLaunchSheet(null); navigateMobile(next); }} onLaunch={() => setLaunchSheet({ preset: 'expense' })} onMenu={() => { setLaunchSheet(null); openMenu(); }}/>}
    /> : null}
  </div>;
}
