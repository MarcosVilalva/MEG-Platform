import { FormEvent, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { MEGCurrencyInput } from '@ui';
import { parseBRL } from '@shared/money';
import { readSession } from '../../app/auth-client';
import { cardsClient, type CreditCard } from '../../app/cards-client';
import { financeClient, type Category } from '../../app/finance-client';
import { useAppStore } from '../../app/store';
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

function addMonth(month: string, offset: number) {
  const [year, value] = month.split('-').map(Number);
  return new Date(Date.UTC(year, value - 1 + offset, 1)).toISOString().slice(0, 7);
}

function shortMonth(month: string) {
  return new Date(`${month}-02T12:00:00`).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
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
  const visibleCards = useMemo(() => cards.filter((card) => `${card.name} ${card.issuer || ''} ${card.brand || ''}`.toLowerCase().includes(query.trim().toLowerCase())), [cards, query]);
  const selectedCard = visibleCards.find((card) => card.id === cardId) || visibleCards[0] || null;
  const forecast = useMemo(() => Array.from({ length: 6 }, (_, index) => {
    const month = addMonth(selectedMonth, index);
    const amount = cards.flatMap((card) => card.purchases).flatMap((purchase) => purchase.entries).filter((entry) => entry.statementMonth === month && entry.status === 'open').reduce((sum, entry) => sum + Number(entry.amount), 0);
    return { month, amount };
  }), [cards, selectedMonth]);
  const forecastMax = Math.max(1, ...forecast.map((item) => item.amount));

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
  const selectedAsset = selectedCard ? brandAsset(selectedCard) : '';
  return <section className="page cards-page validated-cards">
    <header className="page-header compact"><div><span>Cartões de crédito</span><h1>Limite, faturas e compras</h1><p>Fechamento e vencimento determinam a fatura. O limite comprometido inclui despesas de crédito ainda não pagas, inclusive parcelas futuras.</p></div><div className="cards-head-actions"><label className="catalog-role">Mês<input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} /></label>{canWrite && <><button className="meg-icon-action" title="Cadastrar cartão" aria-label="Cadastrar cartão" onClick={() => setEditor('card')}>＋</button><button className="header-primary" onClick={() => setEditor('purchase')} disabled={!cards.length}>＋ Compra</button></>}</div></header>
    {error && <div className="auth-error">{error}</div>}
    <div className="cards-commandbar"><label className="search-field"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filtrar cartão, emissor ou bandeira" /></label><div className="cards-selector">{visibleCards.map((card) => <button key={card.id} className={selectedCard?.id === card.id ? 'active' : ''} onClick={() => setCardId(card.id)}>{card.name}</button>)}</div></div>
    {loading && !cards.length ? <div className="meg-card empty-state">Carregando cartões da base...</div> : selectedCard ? <>
      <div className="validated-card-grid"><article className="meg-card card-portfolio"><div className="card-visual validated-card-face" style={{ '--card-accent': selectedCard.color || '#174a54' } as CSSProperties}><header><small>{selectedCard.issuer || 'Emissor cadastrado'}</small>{selectedAsset ? <img src={`${import.meta.env.BASE_URL}assets/card-brands/${selectedAsset}.svg`} alt={selectedCard.brand || selectedAsset} /> : <b>{selectedCard.brand || 'MEG'}</b>}</header><strong className="card-name">{selectedCard.name}</strong><span className="last4">•••• {selectedCard.lastFour || '0000'}</span><span className="card-cycle-label">Fecha dia {selectedCard.closingDay} · vence dia {selectedCard.dueDay} · melhor compra dia {selectedCard.closingDay === 31 ? 1 : selectedCard.closingDay + 1}</span></div><div className="summary-lines card-summary"><div><span>Limite total</span><strong>{brl.format(Number(selectedCard.creditLimit))}</strong></div><div><span>Limite utilizado</span><strong>{brl.format(selectedCard.usedLimit)}</strong></div><div><span>Disponível</span><strong>{brl.format(selectedCard.availableLimit)}</strong></div><div><span>Fatura de {shortMonth(selectedMonth)}</span><strong>{brl.format(selectedCard.statementAmount)}</strong></div></div><progress className="card-limit-progress" max={Math.max(Number(selectedCard.creditLimit), 1)} value={Math.min(selectedCard.usedLimit, Number(selectedCard.creditLimit))} /></article>
      <article className="meg-card card-rules"><header><span>REGRAS DA COMPRA</span><h3>Ciclo automático e auditável</h3></header><div className="audit"><div><b>1</b><span><strong>Data da compra</strong><small>Define a fatura conforme fechamento e vencimento cadastrados.</small></span></div><div><b>2</b><span><strong>Parcelamento</strong><small>Gera todas as parcelas e distribui os centavos sem perda.</small></span></div><div><b>3</b><span><strong>Vencimentos</strong><small>Fim de semana passa para segunda-feira; mês curto usa o último dia válido.</small></span></div><div><b>4</b><span><strong>Estorno</strong><small>Preserva a compra original e registra o evento reverso.</small></span></div></div><div className="card-cycle"><div><span>Próximo fechamento</span><strong>{nextCycleDate(selectedCard.closingDay)}</strong></div><div><span>Próximo vencimento</span><strong>{nextCycleDate(selectedCard.dueDay)}</strong></div></div></article></div>
      <article className="meg-card card-forecast"><header><div><span>PROJEÇÃO</span><h3>Próximos seis meses</h3></div><strong>{brl.format(forecast.reduce((sum, item) => sum + item.amount, 0))}</strong></header><div className="forecast-bars">{forecast.map((item) => <div key={item.month}><strong>{brl.format(item.amount)}</strong><span><i style={{ height: `${Math.max(item.amount ? 8 : 2, item.amount / forecastMax * 100)}%` }} /></span><small>{shortMonth(item.month)}</small></div>)}</div></article>
      <article className="meg-card card-purchase-ledger"><header><div><span>COMPRAS DO PERÍODO</span><h3>{selectedCard.name}</h3></div><strong>{selectedCard.purchases.length} compra(s)</strong></header><div className="card-purchases">{selectedCard.purchases.slice(0, 20).map((purchase) => <div key={purchase.id}><span><strong>{purchase.description}</strong><small>{purchase.installments}x · {new Date(purchase.purchaseDate).toLocaleDateString('pt-BR')}</small></span><strong>{brl.format(Number(purchase.totalAmount))}</strong>{canDelete && purchase.status !== 'legacy' && <button className="danger" onClick={() => void cardsClient.cancelPurchase(purchase.id).then(load)}>Cancelar</button>}</div>)}{!selectedCard.purchases.length && <div className="empty-state">Nenhuma compra neste período.</div>}</div></article>
    </> : <div className="meg-card empty-state">Nenhum cartão identificado na base. Use o ícone ＋ para cadastrar.</div>}
    {editor && <><button className="launch-drawer-backdrop" aria-label="Fechar" onClick={() => setEditor(null)} /><aside className="launch-drawer card-editor" role="dialog" aria-modal="true"><header><div><span>{editor === 'card' ? 'Novo cartão' : 'Nova compra'}</span><h2>{editor === 'card' ? 'Cadastrar cartão' : 'Registrar compra'}</h2></div><button onClick={() => setEditor(null)} aria-label="Fechar">×</button></header>{editor === 'card' ? <form className="catalog-form" onSubmit={createCard}><label>Nome *<input autoFocus value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="Ex.: LATAM PASS Platinum" required /></label><div className="launch-form-row"><label>Emissor<input value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="Ex.: Itaú" /></label><label>Bandeira *<select value={brand} onChange={(e) => setBrand(e.target.value)} required>{brands.map((item) => <option key={item}>{item}</option>)}</select></label></div><div className="launch-form-row"><label>Final do cartão<input inputMode="numeric" maxLength={4} value={lastFour} onChange={(e) => setLastFour(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="0000" /></label><label>Limite *<MEGCurrencyInput value={limit} onValueChange={setLimit} required /></label></div><div className="launch-form-row"><label>Dia de fechamento *<input type="number" min="1" max="31" value={closingDay} onChange={(e) => setClosingDay(e.target.value)} required /></label><label>Dia de vencimento *<input type="number" min="1" max="31" value={dueDay} onChange={(e) => setDueDay(e.target.value)} required /></label></div><div className="cycle-preview"><span>Melhor dia estimado</span><strong>Dia {Number(closingDay) === 31 ? 1 : Number(closingDay) + 1}</strong><small>Primeiro dia após o fechamento cadastrado.</small></div><button className="auth-submit" disabled={busy}>Cadastrar cartão</button></form> : <form className="catalog-form" onSubmit={createPurchase}><label>Cartão *<select autoFocus value={cardId} onChange={(e) => setCardId(e.target.value)} required><option value="">Selecione</option>{cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</select></label><label>Descrição *<input value={description} onChange={(e) => setDescription(e.target.value)} required /></label><div className="launch-form-row"><label>Valor total *<MEGCurrencyInput value={amount} onValueChange={setAmount} required /></label><label>Data *<input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} required /></label></div><div className="launch-form-row"><label>Parcelas *<input type="number" min="1" max="48" value={installments} onChange={(e) => setInstallments(e.target.value)} required /></label><label>Grupo<select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}><option value="">Sem grupo</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label></div><p className="drawer-note">A fatura e o vencimento serão calculados automaticamente pelo ciclo do cartão escolhido.</p><button className="auth-submit" disabled={busy}>Registrar compra</button></form>}</aside></>}
  </section>;
}
