import { FormEvent, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { MEGCurrencyInput, MEGMetric } from '@ui';
import { parseBRL } from '@shared/money';
import { readSession } from '../../app/auth-client';
import { cardsClient, type CreditCard } from '../../app/cards-client';
import { financeClient, type Category } from '../../app/finance-client';
import { useAppStore } from '../../app/store';
import { invalidateFinanceSummary } from '../../app/use-finance-summary';
import { dateInSaoPaulo } from '../../app/calendar';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const brands = ['Visa', 'Mastercard', 'Elo', 'American Express', 'Hipercard'];

function brandAsset(card: CreditCard) {
  const value = `${card.brand || ''} ${card.name}`.toLowerCase();
  if (value.includes('master')) return 'mastercard';
  if (value.includes('amex') || value.includes('american')) return 'amex';
  if (value.includes('hiper')) return 'hipercard';
  if (value.includes('elo')) return 'elo';
  if (value.includes('visa')) return 'visa';
  return '';
}

function nextCycleDate(day: number) {
  const today = new Date(`${dateInSaoPaulo()}T12:00:00`);
  let year = today.getFullYear(); let month = today.getMonth();
  let value = new Date(year, month, Math.min(Math.max(day, 1), new Date(year, month + 1, 0).getDate()), 12);
  if (value < today) {
    month += 1; year += Math.floor(month / 12); month %= 12;
    value = new Date(year, month, Math.min(day, new Date(year, month + 1, 0).getDate()), 12);
  }
  return value.toLocaleDateString('pt-BR');
}

export function CreditCards() {
  const selectedMonth = useAppStore((state) => state.selectedMonth);
  const setSelectedMonth = useAppStore((state) => state.setSelectedMonth);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editor, setEditor] = useState<'card' | 'purchase' | null>(null);
  const [query, setQuery] = useState('');
  const [cardName, setCardName] = useState(''); const [issuer, setIssuer] = useState('');
  const [brand, setBrand] = useState('Visa'); const [lastFour, setLastFour] = useState('');
  const [limit, setLimit] = useState(''); const [closingDay, setClosingDay] = useState('5'); const [dueDay, setDueDay] = useState('12');
  const [cardId, setCardId] = useState(''); const [description, setDescription] = useState(''); const [amount, setAmount] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => dateInSaoPaulo()); const [installments, setInstallments] = useState('1'); const [categoryId, setCategoryId] = useState('');
  const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const role = readSession()?.user.role || 'VIEWER'; const canWrite = role !== 'VIEWER'; const canDelete = role === 'ADMIN' || role === 'MANAGER';

  async function load() {
    setLoading(true); setError('');
    try {
      const [cardData, categoryData] = await Promise.all([cardsClient.list(selectedMonth), financeClient.listCategories()]);
      setCards(cardData); setCategories(categoryData.filter((item) => item.isActive && item.type !== 'income'));
      if (!cardId && cardData[0]) setCardId(cardData[0].id);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'CARDS_LOAD_ERROR'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [selectedMonth]);
  const totals = useMemo(() => ({ limit: cards.reduce((sum, card) => sum + Number(card.creditLimit), 0), used: cards.reduce((sum, card) => sum + card.usedLimit, 0), statement: cards.reduce((sum, card) => sum + card.statementAmount, 0) }), [cards]);
  const visibleCards = useMemo(() => cards.filter((card) => `${card.name} ${card.issuer || ''} ${card.brand || ''}`.toLowerCase().includes(query.trim().toLowerCase())), [cards, query]);

  async function createCard(event: FormEvent) {
    event.preventDefault(); const value = parseBRL(limit); if (!canWrite || !cardName.trim() || !Number.isFinite(value) || value <= 0) return;
    setBusy(true);
    try { await cardsClient.create({ name: cardName.trim(), issuer: issuer.trim() || undefined, brand, lastFour: lastFour || undefined, creditLimit: value, closingDay: Number(closingDay), dueDay: Number(dueDay) }); setCardName(''); setIssuer(''); setLastFour(''); setLimit(''); setEditor(null); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'CARD_SAVE_ERROR'); } finally { setBusy(false); }
  }
  async function createPurchase(event: FormEvent) {
    event.preventDefault(); const value = parseBRL(amount); if (!canWrite || !cardId || !description.trim() || !Number.isFinite(value) || value <= 0) return;
    setBusy(true);
    try { await cardsClient.createPurchase({ cardId, categoryId: categoryId || undefined, description: description.trim(), totalAmount: value, purchaseDate, installments: Number(installments) }); setDescription(''); setAmount(''); setInstallments('1'); setEditor(null); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'PURCHASE_SAVE_ERROR'); } finally { setBusy(false); }
  }
  async function pay(card: CreditCard) {
    if (!canWrite || card.statementAmount <= 0 || !confirm(`Pagar fatura de ${brl.format(card.statementAmount)}?`)) return;
    setBusy(true); try { await cardsClient.payStatement(card.id, selectedMonth, { paidAt: dateInSaoPaulo() }); invalidateFinanceSummary(); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'STATEMENT_PAYMENT_ERROR'); } finally { setBusy(false); }
  }

  return <section className="page cards-page">
    <header className="page-header compact"><div><span>Cartões de crédito</span><h1>Limites, compras e faturas</h1><p>Ciclo calculado automaticamente pelas datas de fechamento e vencimento.</p></div><div className="cards-head-actions"><label className="catalog-role">Mês<input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} /></label>{canWrite && <><button className="meg-icon-action" title="Cadastrar cartão" aria-label="Cadastrar cartão" onClick={() => setEditor('card')}>＋</button><button className="header-primary" onClick={() => setEditor('purchase')} disabled={!cards.length}>＋ Compra</button></>}</div></header>
    {error && <div className="auth-error">{error}</div>}
    <section className="metric-grid"><MEGMetric label="Limite total" value={brl.format(totals.limit)} hint={`${cards.length} cartão(ões)`} /><MEGMetric label="Limite utilizado" value={brl.format(totals.used)} hint={`${totals.limit ? (totals.used / totals.limit * 100).toFixed(1) : '0,0'}% do limite`} tone="warning" /><MEGMetric label="Limite disponível" value={brl.format(totals.limit - totals.used)} hint="Compras ainda em aberto" tone="good" /><MEGMetric label="Fatura do mês" value={brl.format(totals.statement)} hint={selectedMonth} tone="danger" /></section>
    <section className="cards-workspace"><div className="filter-row"><label className="search-field"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filtrar cartão, emissor ou bandeira" /></label><span className="filter-count">{visibleCards.length} de {cards.length} cartões</span></div><div className="card-grid" aria-busy={loading}>{loading && <div className="meg-card empty-state">Carregando cartões...</div>}{visibleCards.map((card) => { const asset = brandAsset(card); return <article className="meg-card credit-card-panel" key={card.id} style={{ '--card-accent': card.color || '#88796c' } as CSSProperties}><div className="credit-card-face"><header><div><span>{card.issuer || 'Emissor'}</span><h3>{card.name}</h3></div>{asset ? <img src={`${import.meta.env.BASE_URL}assets/card-brands/${asset}.svg`} alt={card.brand || asset} /> : <strong>{card.brand || 'MEG'}</strong>}</header><div className="card-chip" aria-hidden="true" /><footer><span>{card.lastFour ? `•••• ${card.lastFour}` : 'Cartão cadastrado'}</span><strong>Melhor compra: dia {card.closingDay === 31 ? 1 : card.closingDay + 1}</strong></footer></div><div className="card-cycle"><div><span>Próximo fechamento</span><strong>{nextCycleDate(card.closingDay)}</strong></div><div><span>Próximo vencimento</span><strong>{nextCycleDate(card.dueDay)}</strong></div></div><div className="credit-card-limit"><span>Disponível {brl.format(card.availableLimit)}</span><progress max={Number(card.creditLimit)} value={Math.min(card.usedLimit, Number(card.creditLimit))} /></div><div className="card-statement"><span>Fatura de {selectedMonth}</span><strong>{brl.format(card.statementAmount)}</strong>{canWrite && card.statementAmount > 0 && <button onClick={() => void pay(card)} disabled={busy}>Pagar fatura</button>}</div><div className="card-purchases">{card.purchases.slice(0, 8).map((purchase) => <div key={purchase.id}><span><strong>{purchase.description}</strong><small>{purchase.installments}x · {new Date(purchase.purchaseDate).toLocaleDateString('pt-BR')}</small></span><strong>{brl.format(Number(purchase.totalAmount))}</strong>{canDelete && <button className="danger" onClick={() => void cardsClient.cancelPurchase(purchase.id).then(load)}>Cancelar</button>}</div>)}{!card.purchases.length && <div className="empty-state">Nenhuma compra registrada.</div>}</div></article>; })}{!loading && !visibleCards.length && <div className="meg-card empty-state">{cards.length ? 'Nenhum cartão corresponde ao filtro.' : 'Cadastre seu primeiro cartão.'}</div>}</div></section>
    {editor && <><button className="launch-drawer-backdrop" aria-label="Fechar" onClick={() => setEditor(null)} /><aside className="launch-drawer card-editor" role="dialog" aria-modal="true"><header><div><span>{editor === 'card' ? 'Novo cartão' : 'Nova compra'}</span><h2>{editor === 'card' ? 'Cadastrar cartão' : 'Registrar compra'}</h2></div><button onClick={() => setEditor(null)} aria-label="Fechar">×</button></header>{editor === 'card' ? <form className="catalog-form" onSubmit={createCard}><label>Nome *<input autoFocus value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="Ex.: LATAM PASS Platinum" required /></label><div className="launch-form-row"><label>Emissor<input value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="Ex.: Itaú" /></label><label>Bandeira *<select value={brand} onChange={(e) => setBrand(e.target.value)} required>{brands.map((item) => <option key={item}>{item}</option>)}</select></label></div><div className="launch-form-row"><label>Final do cartão<input inputMode="numeric" maxLength={4} value={lastFour} onChange={(e) => setLastFour(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="0000" /></label><label>Limite *<MEGCurrencyInput value={limit} onValueChange={setLimit} required /></label></div><div className="launch-form-row"><label>Dia de fechamento *<input type="number" min="1" max="31" value={closingDay} onChange={(e) => setClosingDay(e.target.value)} required /></label><label>Dia de vencimento *<input type="number" min="1" max="31" value={dueDay} onChange={(e) => setDueDay(e.target.value)} required /></label></div><div className="cycle-preview"><span>Melhor dia estimado</span><strong>Dia {Number(closingDay) === 31 ? 1 : Number(closingDay) + 1}</strong><small>Primeiro dia após o fechamento cadastrado.</small></div><button className="auth-submit" disabled={busy}>Cadastrar cartão</button></form> : <form className="catalog-form" onSubmit={createPurchase}><label>Cartão *<select autoFocus value={cardId} onChange={(e) => setCardId(e.target.value)} required><option value="">Selecione</option>{cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</select></label><label>Descrição *<input value={description} onChange={(e) => setDescription(e.target.value)} required /></label><div className="launch-form-row"><label>Valor total *<MEGCurrencyInput value={amount} onValueChange={setAmount} required /></label><label>Data *<input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} required /></label></div><div className="launch-form-row"><label>Parcelas *<input type="number" min="1" max="48" value={installments} onChange={(e) => setInstallments(e.target.value)} required /></label><label>Grupo<select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}><option value="">Sem grupo</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label></div><p className="drawer-note">A fatura e o vencimento serão calculados automaticamente pelo ciclo do cartão escolhido.</p><button className="auth-submit" disabled={busy}>Registrar compra</button></form>}</aside></>}
  </section>;
}
