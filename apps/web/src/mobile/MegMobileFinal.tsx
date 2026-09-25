import { useEffect, useMemo, useRef, useState } from 'react';
import type { PhoenixReadModel } from '../phoenix/contracts';
import './meg-mobile-final.css';

type MobileView = 'home' | 'cards' | 'payables';
type TargetView = 'home' | 'movements' | 'payables' | 'cards' | 'cashflow' | 'analytics' | 'history' | 'settings';
type LaunchPreset = 'expense' | 'income' | 'benefit';

type Props = {
  data: PhoenixReadModel;
  view: MobileView;
  onNavigate: (view: TargetView) => void;
  onLaunch: (preset: LaunchPreset) => void;
  onEditEvent: (eventId: string) => void;
  onOpenPeriod: () => void;
  onLogout?: () => void;
  onClose?: () => void;
};

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
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
  return base + path.replace(/^\/+/, '');
}

function cardArt(name: string) {
  const normalized = String(name || '').toLowerCase();
  if (normalized.includes('mercado')) return asset('assets/cards/approved-v6/mercado.webp');
  if (normalized.includes('latam')) return asset('assets/cards/approved-v6/latam.webp');
  if (normalized.includes('azul')) return asset('assets/cards/approved-v6/azul.webp');
  if (normalized.includes('riachuelo')) return asset('assets/cards/approved-v6/riachuelo.webp');
  return '';
}

function cardName(name: string) {
  const normalized = String(name || '').toLowerCase();
  if (normalized.includes('mercado')) return 'Mercado Pago Visa';
  if (normalized.includes('latam')) return 'LATAM PASS Itaú Mastercard';
  if (normalized.includes('azul')) return 'Azul Visa';
  if (normalized.includes('riachuelo')) return 'Riachuelo Midway';
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
  return <svg {...base}><circle cx="12" cy="12" r="8"/></svg>;
}

function Header({ data, onOpenPeriod, onOpenMenu }: { data: PhoenixReadModel; onOpenPeriod: () => void; onOpenMenu: () => void }) {
  const firstName = data.user.name.trim().split(/\s+/)[0] || 'MEG';
  return <header className="meg2-header">
    <div className="meg2-brand"><img src={asset('brand/meg-finance-system-mark.svg')} alt="MEG"/></div>
    <button className="meg2-period" type="button" onClick={onOpenPeriod}>
      <span className="meg2-period-icon"><Icon name="calendar" size={19}/></span>
      <span><strong>{compactMonth(data.month)}</strong><small>{data.month === todayIso().slice(0, 7) ? 'Mês atual' : 'Período selecionado'}</small></span>
      <b>⌄</b>
    </button>
    <button className="meg2-user" type="button" onClick={onOpenMenu}>
      <span className="meg2-avatar">{firstName.charAt(0).toUpperCase()}</span><strong>{firstName.toUpperCase()}</strong>
    </button>
  </header>;
}

function Dock({ view, pendingCount, onNavigate, onLaunch, onMenu }: { view: MobileView; pendingCount: number; onNavigate: Props['onNavigate']; onLaunch: Props['onLaunch']; onMenu: () => void }) {
  return <nav className="meg2-dock">
    <button className={view === 'home' ? 'active' : ''} onClick={() => onNavigate('home')}><Icon name="home"/><span>Início</span></button>
    <button onClick={() => onNavigate('movements')}><Icon name="file"/><span>Lançamentos</span></button>
    <button className="meg2-new" onClick={() => onLaunch('expense')}><span><Icon name="plus" size={27}/></span><small>Novo</small></button>
    <button className={view === 'payables' ? 'active' : ''} onClick={() => onNavigate('payables')}>
      <span className="meg2-badge-wrap"><Icon name="wallet"/>{pendingCount > 0 ? <b>{pendingCount > 9 ? '9+' : pendingCount}</b> : null}</span><span>Pendentes</span>
    </button>
    <button onClick={onMenu}><Icon name="menu"/><span>Menu</span></button>
  </nav>;
}

function Home({ data, onNavigate }: { data: PhoenixReadModel; onNavigate: Props['onNavigate'] }) {
  const openPayables = data.payables.filter((item) => openStatus(item.status) && Number(item.openAmount || 0) > 0);
  const planned = data.events.items.filter((item) => item.type === 'expense' && item.status === 'planned');
  const paid = data.events.items.filter((item) => item.type === 'expense' && ['paid', 'reconciled', 'confirmed'].includes(String(item.status)));
  const cardOpen = data.cards.reduce((sum, card) => sum + Number(card.statement?.payableAmount ?? card.payableStatementAmount ?? card.statementAmount ?? 0), 0);
  const balance = Number(data.summary.availableBalance || 0) + Number(data.summary.realizedResult || 0);

  return <main className="meg2-main meg2-home">
    <section className="meg2-title">
      <span>Situação {data.month === todayIso().slice(0, 7) ? 'atual' : 'do período'}</span>
      <h1>{monthLabel(data.month)}</h1>
      <p>Acompanhe seu caixa e compromissos em tempo real.</p>
      <i><Icon name="trend"/></i>
    </section>

    <section className="meg2-balance">
      <span><Icon name="wallet" size={30}/></span>
      <div><small>Saldo disponível</small><strong>{money.format(balance)}</strong><p>Considerando apenas os lançamentos realizados.</p></div>
    </section>

    <section className="meg2-flow">
      <article><span className="up"><Icon name="up"/></span><div><small>Entradas no mês</small><strong>{money.format(Number(data.summary.realizedIncome || 0))}</strong></div></article>
      <article><span className="down"><Icon name="down"/></span><div><small>Saídas no mês</small><strong>{money.format(Number(data.summary.realizedExpense || 0))}</strong></div></article>
      <article className="result"><span><Icon name="trend"/></span><div><small>Resultado do mês</small><strong>{money.format(Number(data.summary.realizedResult || 0))}</strong></div></article>
    </section>

    <section className="meg2-summary">
      <article><span className="red"><Icon name="file"/></span><small>Contas a pagar</small><b>{openPayables.length}</b><em>{money.format(openPayables.reduce((s, item) => s + Number(item.openAmount || 0), 0))}</em></article>
      <article><span className="blue"><Icon name="wallet"/></span><small>Faturas de cartões</small><b>{data.cards.filter((card) => Number(card.statement?.payableAmount ?? card.statementAmount ?? 0) > 0).length}</b><em>{money.format(cardOpen)}</em></article>
      <article><span className="amber"><Icon name="file"/></span><small>Outras pendências</small><b>{planned.length}</b><em>{money.format(planned.reduce((s, item) => s + Math.abs(Number(item.signedAmount || item.amount || 0)), 0))}</em></article>
      <article><span className="green"><Icon name="check"/></span><small>Contas pagas</small><b>{paid.length}</b><em>{money.format(paid.reduce((s, item) => s + Math.abs(Number(item.signedAmount || item.amount || 0)), 0))}</em></article>
    </section>

    <button className="meg2-benefit" onClick={() => onNavigate('movements')}>
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

  return <>
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
  </>;
}

function Cards({ data }: { data: PhoenixReadModel }) {
  const cards = useMemo(() => data.cards.filter((card) => card.isActive !== false), [data.cards]);
  const [activeId, setActiveId] = useState(cards[0]?.id || '');
  useEffect(() => { if (!cards.some((card) => card.id === activeId)) setActiveId(cards[0]?.id || ''); }, [cards, activeId]);

  const card = cards.find((item) => item.id === activeId) || cards[0];
  const rows = useMemo(() => cardRows(card), [card]);
  const current = Number(card?.statement?.payableAmount ?? card?.payableStatementAmount ?? card?.statementAmount ?? 0);
  const limit = Number(card?.creditLimit || 0);
  const available = Number(card?.availableLimit ?? Math.max(0, limit - current));
  const due = card?.statement?.dueDate ? shortDate.format(new Date(card.statement.dueDate + 'T12:00:00Z')) : card?.dueDay ? 'Dia ' + card.dueDay : '—';

  return <main className="meg2-main meg2-cards">
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
      <div className="meg2-statement-list">
        {rows.slice(0, 5).map((row) => <button key={row.id}><span><Icon name="wallet" size={20}/></span><p><b>{row.description}</b><small>{row.installmentNo && row.installmentQty ? 'Parcela ' + row.installmentNo + '/' + row.installmentQty + ' • ' : ''}{String(row.date || '').slice(0, 10).split('-').reverse().join('/')}</small></p><strong>{money.format(row.amount)}</strong><i>›</i></button>)}
        {!rows.length ? <div className="meg2-empty">Nenhum lançamento nesta fatura.</div> : null}
      </div>
    </section>
    <button className="meg2-primary"><Icon name="wallet"/><strong>Abrir central do cartão</strong><span>›</span></button>
  </main>;
}

type PendingRow = { id: string; source: 'payable' | 'event'; sourceId: string; description: string; due: string; amount: number; paid: boolean };

function Payables({ data, onEditEvent }: { data: PhoenixReadModel; onEditEvent: Props['onEditEvent'] }) {
  const [tab, setTab] = useState<'all' | 'open' | 'paid' | 'overdue'>('all');
  const [search, setSearch] = useState('');
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
    .filter((item) => tab === 'all' ? true : tab === 'open' ? !item.paid : tab === 'paid' ? item.paid : !item.paid && item.due < today)
    .sort((left, right) => left.due.localeCompare(right.due));

  function dueLabel(item: PendingRow) {
    const date = item.due.split('-').reverse().join('/');
    if (item.paid) return 'Paga • ' + date;
    if (item.due < today) return 'Venceu • ' + date;
    if (item.due === today) return 'Vence hoje • ' + date;
    const diff = Math.max(1, Math.round((new Date(item.due + 'T12:00:00Z').getTime() - new Date(today + 'T12:00:00Z').getTime()) / 86400000));
    return 'Vence em ' + diff + (diff === 1 ? ' dia • ' : ' dias • ') + date;
  }

  return <main className="meg2-main meg2-payables">
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
    <section className="meg2-search"><label><Icon name="search" size={20}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar pendentes..."/></label><button><Icon name="list"/></button><button><Icon name="sliders"/></button></section>
    <section className="meg2-pending-list">
      {rows.slice(0, 20).map((item, index) => {
        const late = !item.paid && item.due < today;
        const rowClass = late ? 'late' : item.paid ? 'paid' : '';
        const icon = index % 3 === 0 ? 'bolt' : index % 3 === 1 ? 'wallet' : 'file';
        return <button key={item.id} className={rowClass} onClick={() => item.source === 'event' && onEditEvent(item.sourceId)}>
          <span className="meg2-pending-icon"><Icon name={icon}/></span>
          <p><b>{item.description}</b><small>{dueLabel(item)}</small></p>
          <span className="meg2-pending-value"><strong>{money.format(item.amount)}</strong><em>{item.paid ? 'Paga' : late ? 'Vencida' : 'A pagar'}</em></span><i>›</i>
        </button>;
      })}
      {!rows.length ? <div className="meg2-empty">Nenhum lançamento neste filtro.</div> : null}
    </section>
  </main>;
}

function MenuSheet({ onClose, onNavigate, onLogout, onCloseApp }: { onClose: () => void; onNavigate: Props['onNavigate']; onLogout?: () => void; onCloseApp?: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const go = (view: TargetView) => { onClose(); onNavigate(view); };
  return <div className="meg2-overlay" onClick={onClose}>
    <section className="meg2-menu-sheet" onClick={(event) => event.stopPropagation()}>
      <header><div><small>MEG FINANÇAS</small><h2>Menu</h2></div><button onClick={onClose}>×</button></header>
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

export function MegMobileFinal({ data, view, onNavigate, onLaunch, onEditEvent, onOpenPeriod, onLogout, onClose }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pendingCount = data.payables.filter((item) => openStatus(item.status) && Number(item.openAmount || 0) > 0).length
    + data.events.items.filter((item) => item.type === 'expense' && item.status === 'planned').length;

  return <div className="meg2-app" data-meg-mobile-final="true">
    <div className="meg2-shell">
      <Header data={data} onOpenPeriod={onOpenPeriod} onOpenMenu={() => setMenuOpen(true)}/>
      <div className="meg2-scroll">
        {view === 'home' ? <Home data={data} onNavigate={onNavigate}/> : null}
        {view === 'cards' ? <Cards data={data}/> : null}
        {view === 'payables' ? <Payables data={data} onEditEvent={onEditEvent}/> : null}
      </div>
      <Dock view={view} pendingCount={pendingCount} onNavigate={onNavigate} onLaunch={onLaunch} onMenu={() => setMenuOpen(true)}/>
    </div>
    {menuOpen ? <MenuSheet onClose={() => setMenuOpen(false)} onNavigate={onNavigate} onLogout={onLogout} onCloseApp={onClose}/> : null}
  </div>;
}
