import { FormEvent, useEffect, useMemo, useState } from 'react';
import { MEGMetric } from '@ui';
import { readSession } from '../../app/auth-client';
import { cardsClient, type CreditCard } from '../../app/cards-client';
import { financeClient, type Category } from '../../app/finance-client';
import { useAppStore } from '../../app/store';
import { invalidateFinanceSummary } from '../../app/use-finance-summary';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function CreditCards() {
  const selectedMonth = useAppStore((state) => state.selectedMonth);
  const setSelectedMonth = useAppStore((state) => state.setSelectedMonth);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cardName, setCardName] = useState('');
  const [issuer, setIssuer] = useState('');
  const [limit, setLimit] = useState('');
  const [closingDay, setClosingDay] = useState('5');
  const [dueDay, setDueDay] = useState('12');
  const [cardId, setCardId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [installments, setInstallments] = useState('1');
  const [categoryId, setCategoryId] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const role = readSession()?.user.role || 'VIEWER';
  const canWrite = role !== 'VIEWER';
  const canDelete = role === 'ADMIN' || role === 'MANAGER';

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

  const totals = useMemo(() => ({
    limit: cards.reduce((sum, card) => sum + Number(card.creditLimit), 0),
    used: cards.reduce((sum, card) => sum + card.usedLimit, 0),
    statement: cards.reduce((sum, card) => sum + card.statementAmount, 0)
  }), [cards]);

  async function createCard(event: FormEvent) {
    event.preventDefault(); const value = Number(limit.replace(',', '.'));
    if (!canWrite || !cardName.trim() || value <= 0) return;
    setBusy(true);
    try { await cardsClient.create({ name: cardName.trim(), issuer: issuer.trim() || undefined, creditLimit: value, closingDay: Number(closingDay), dueDay: Number(dueDay) }); setCardName(''); setIssuer(''); setLimit(''); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'CARD_SAVE_ERROR'); }
    finally { setBusy(false); }
  }

  async function createPurchase(event: FormEvent) {
    event.preventDefault(); const value = Number(amount.replace(',', '.'));
    if (!canWrite || !cardId || !description.trim() || value <= 0) return;
    setBusy(true);
    try { await cardsClient.createPurchase({ cardId, categoryId: categoryId || undefined, description: description.trim(), totalAmount: value, purchaseDate, installments: Number(installments) }); setDescription(''); setAmount(''); setInstallments('1'); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'PURCHASE_SAVE_ERROR'); }
    finally { setBusy(false); }
  }

  async function pay(card: CreditCard) {
    if (!canWrite || card.statementAmount <= 0 || !confirm(`Pagar fatura de ${brl.format(card.statementAmount)}?`)) return;
    setBusy(true);
    try { await cardsClient.payStatement(card.id, selectedMonth, { paidAt: new Date().toISOString().slice(0, 10) }); invalidateFinanceSummary(); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'STATEMENT_PAYMENT_ERROR'); }
    finally { setBusy(false); }
  }

  return <section className="page">
    <header className="page-header compact"><div><span>Cartões de crédito</span><h1>Limites, compras e faturas</h1><p>Compras parceladas e faturas integradas ao seu fluxo financeiro.</p></div><label className="catalog-role">Mês<input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} /></label></header>
    {error && <div className="auth-error">{error}</div>}
    <section className="metric-grid"><MEGMetric label="Limite total" value={brl.format(totals.limit)} hint={`${cards.length} cartão(ões)`} /><MEGMetric label="Limite utilizado" value={brl.format(totals.used)} hint={`${totals.limit ? (totals.used / totals.limit * 100).toFixed(1) : '0,0'}% do limite`} tone="warning" /><MEGMetric label="Limite disponível" value={brl.format(totals.limit - totals.used)} hint="Compras ainda em aberto" tone="good" /><MEGMetric label="Fatura do mês" value={brl.format(totals.statement)} hint={selectedMonth} tone="danger" /></section>
    <div className="catalog-layout"><div>
      <form className="meg-card catalog-form" onSubmit={createCard}><span className="meg-eyebrow">Novo cartão</span><h3>Dados do cartão</h3><label>Nome<input value={cardName} onChange={(e) => setCardName(e.target.value)} disabled={!canWrite} required /></label><label>Emissor<input value={issuer} onChange={(e) => setIssuer(e.target.value)} disabled={!canWrite} /></label><label>Limite<input value={limit} onChange={(e) => setLimit(e.target.value)} inputMode="decimal" disabled={!canWrite} required /></label><label>Dia de fechamento<input type="number" min="1" max="31" value={closingDay} onChange={(e) => setClosingDay(e.target.value)} disabled={!canWrite} /></label><label>Dia de vencimento<input type="number" min="1" max="31" value={dueDay} onChange={(e) => setDueDay(e.target.value)} disabled={!canWrite} /></label><button className="auth-submit" disabled={!canWrite || busy}>Cadastrar cartão</button></form>
      <form className="meg-card catalog-form" onSubmit={createPurchase}><span className="meg-eyebrow">Nova compra</span><h3>Compra no cartão</h3><label>Cartão<select value={cardId} onChange={(e) => setCardId(e.target.value)} disabled={!canWrite}><option value="">Selecione</option>{cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</select></label><label>Descrição<input value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canWrite} required /></label><label>Valor total<input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" disabled={!canWrite} required /></label><label>Data<input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} disabled={!canWrite} /></label><label>Parcelas<input type="number" min="1" max="48" value={installments} onChange={(e) => setInstallments(e.target.value)} disabled={!canWrite} /></label><label>Categoria<select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} disabled={!canWrite}><option value="">Sem categoria</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><button className="auth-submit" disabled={!canWrite || busy || !cards.length}>Registrar compra</button></form>
    </div><div className="card-grid" aria-busy={loading}>{loading && <div className="meg-card empty-state">Carregando cartões...</div>}{cards.map((card) => <article className="meg-card credit-card-panel" key={card.id} style={{ borderTopColor: card.color || '#0f766e' }}><header><div><span>{card.issuer || 'Cartão'}</span><h3>{card.name}</h3></div><strong>{card.lastFour ? `•••• ${card.lastFour}` : ''}</strong></header><div className="credit-card-limit"><span>Disponível {brl.format(card.availableLimit)}</span><progress max={Number(card.creditLimit)} value={Math.min(card.usedLimit, Number(card.creditLimit))} /></div><div className="card-statement"><span>Fatura {selectedMonth}</span><strong>{brl.format(card.statementAmount)}</strong>{canWrite && card.statementAmount > 0 && <button onClick={() => void pay(card)} disabled={busy}>Pagar fatura</button>}</div><div className="card-purchases">{card.purchases.slice(0, 8).map((purchase) => <div key={purchase.id}><span>{purchase.description}<small>{purchase.installments}x • {new Date(purchase.purchaseDate).toLocaleDateString('pt-BR')}</small></span><strong>{brl.format(Number(purchase.totalAmount))}</strong>{canDelete && <button className="danger" onClick={() => void cardsClient.cancelPurchase(purchase.id).then(load)}>Cancelar</button>}</div>)}{!card.purchases.length && <div className="empty-state">Nenhuma compra registrada.</div>}</div></article>)}{!loading && !cards.length && <div className="meg-card empty-state">Cadastre seu primeiro cartão.</div>}</div></div>
  </section>;
}