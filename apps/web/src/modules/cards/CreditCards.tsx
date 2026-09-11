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
  const [detailTab, setDetailTab] = useState<'current' | 'future' | 'installments' | 'rules'>('current');
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
  const selectedEntries = selectedCard?.purchases.flatMap((purchase) => purchase.entries.map((entry) => ({ purchase, entry }))) || [];
  const currentEntries = selectedEntries.filter(({ entry }) => entry.statementMonth === selectedMonth);
  const futureEntries = selectedEntries.filter(({ entry }) => entry.statementMonth > selectedMonth && entry.status === 'open');
  const futureTotal = futureEntries.reduce((sum, { entry }) => sum + Number(entry.amount), 0);

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
  const visualKey = `${selectedCard?.name || ''} ${selectedCard?.issuer || ''}`.toLowerCase();
  const cardVisual = visualKey.includes('latam') || visualKey.includes('azul') ? 'azul' : visualKey.includes('mercado') || /(^|\s)ml(\s|$)/.test(visualKey) ? 'ml' : 'generic';
  return <section id="cards" className="page cards-page">
    <header className="page-head"><div><span className="kicker">Cartões de crédito</span><h1>Faturas e compromissos</h1><p>Acompanhe cada cartão sem misturar fatura atual, compras após o fechamento e parcelas futuras.</p></div>{canWrite && <button className="btn secondary" onClick={() => setEditor('card')}>Gerenciar cartões</button>}</header>
    {error && <div className="auth-error">{error}</div>}
    {loading && !cards.length ? <div className="card empty-state">Carregando cartões da base...</div> : selectedCard ? <div className="cards-shell">
      <aside className="card cards-picker" aria-label="Seleção de cartão">
        <div className="cards-picker-head"><div><span className="kicker">Meus cartões</span><strong>{visibleCards.length} ativo(s)</strong></div></div>
        <label className="search-field"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filtrar cartões" /></label>
        {visibleCards.map((card, index) => <button key={card.id} className={`credit-card-option ${selectedCard.id === card.id ? 'active' : ''}`} onClick={() => setCardId(card.id)}><span className={`mini-card ${index % 2 ? 'ml' : ''}`}>{card.name.slice(0, 6).toUpperCase()}</span><span><strong>{card.name}</strong><small>{card.issuer || card.brand || 'Cartão cadastrado'} · {brl.format(card.statementAmount)}</small></span><span>›</span></button>)}
      </aside>
      <div className="cards-detail">
        <article className="card"><div className="card-hero-grid">
          <div className={`physical-card is-${cardVisual}`} style={cardVisual === 'generic' ? { background: `linear-gradient(135deg, ${selectedCard.color || '#0e6f68'}, #092338)` } as CSSProperties : undefined} aria-label={`Representação visual do ${selectedCard.name}`}>
            <div className="card-art card-art-azul"><img src={`${import.meta.env.BASE_URL}assets/cards/latam-pass-platinum.webp`} alt="LATAM PASS Platinum Visa Itaú" /></div>
            <div className="card-art card-art-ml"><div className="mp-brand"><span className="mp-mark">MP</span><span>Mercado Pago</span></div><span className="ml-chip"/><span className="ml-contactless">)))</span><span className="ml-label">CARTÃO DE CRÉDITO</span><img className="ml-visa" src={`${import.meta.env.BASE_URL}assets/card-brands/visa.svg`} alt="Visa" /></div>
            <div className="card-art card-art-generic"><strong className="generic-card-brand">{selectedCard.issuer || 'MEG'}</strong><span className="generic-card-chip"/><span className="generic-card-label">{selectedCard.brand || 'CARTÃO CADASTRADO'}</span>{selectedAsset && <img className="card-brand-logo" src={`${import.meta.env.BASE_URL}assets/card-brands/${selectedAsset}.svg`} alt={selectedCard.brand || selectedAsset}/>}</div>
          </div>
          <div><div className="card-account-head"><div className="card-account-title"><span className="card-chip">▣</span><div><h2>{selectedCard.name}</h2><small>{selectedCard.issuer || 'Cartão cadastrado no MEG'}{selectedCard.lastFour ? ` · final ${selectedCard.lastFour}` : ''}</small></div></div><div className="cycle-dates"><div className="cycle-date"><span>Fechamento</span><strong>{nextCycleDate(selectedCard.closingDay)}</strong></div><div className="cycle-date"><span>Vencimento</span><strong>{nextCycleDate(selectedCard.dueDay)}</strong></div><span className="pill warn">Em aberto</span></div></div>
          <div className="card-metrics" style={{ marginTop: 14 }}><div className="card-metric"><span>Fatura atual</span><strong>{brl.format(selectedCard.statementAmount)}</strong><small>Compras até o fechamento</small></div><div className="card-metric"><span>Após fechamento</span><strong>{brl.format(forecast[1]?.amount || 0)}</strong><small>Próxima fatura</small></div><div className="card-metric"><span>Parcelas futuras</span><strong>{brl.format(futureTotal)}</strong><small>Meses seguintes</small></div><div className="card-metric"><span>Total comprometido</span><strong>{brl.format(selectedCard.usedLimit)}</strong><small>Aberto + parcelas futuras</small></div></div>
          <div className="card-usage" style={{ marginTop: 14 }}><div className="card-usage-head"><span>Uso proporcional ao limite cadastrado</span><strong>{brl.format(selectedCard.availableLimit)} disponíveis</strong></div><div className="progress"><span style={{ width: `${Math.min(100, Number(selectedCard.creditLimit) ? selectedCard.usedLimit / Number(selectedCard.creditLimit) * 100 : 0)}%` }}/></div></div></div>
        </div></article>
        <article className="card"><div className="section-head"><div><span className="kicker">Detalhamento</span><h3>Movimentação do cartão</h3></div>{canWrite && <button className="btn" onClick={() => setEditor('purchase')}>Nova compra</button>}</div>
          <div className="invoice-tabs" role="tablist">{([['current','Fatura atual'],['future','Próximas faturas'],['installments','Parcelas futuras'],['rules','Regras']] as const).map(([key,label]) => <button key={key} className={`invoice-tab ${detailTab === key ? 'active' : ''}`} onClick={() => setDetailTab(key)}>{label}</button>)}</div>
          {detailTab === 'current' && <div className="card-tab-panel"><div className="invoice-summary"><div><span>Total da fatura</span><strong>{brl.format(selectedCard.statementAmount)}</strong></div><div><span>Situação</span><strong>Em aberto</strong></div><div><span>Itens</span><strong>{currentEntries.length} carregado(s) da base</strong></div></div><div className="invoice-toolbar"><div className="header-filter-note"><strong>⌄</strong><span>Filtre nos cabeçalhos e consulte os lançamentos da fatura.</span></div></div><div className="table-wrap card-table"><table><thead><tr><th>Compra</th><th>Data</th><th>Parcela</th><th>Grupo</th><th>Valor</th><th>Situação</th><th>Detalhes</th></tr></thead><tbody>{currentEntries.map(({purchase,entry}) => <tr key={entry.id}><td><strong>{purchase.description}</strong><small>Compra {purchase.installments > 1 ? 'parcelada' : 'única'}</small></td><td>{new Date(purchase.purchaseDate).toLocaleDateString('pt-BR')}</td><td>{entry.number}/{purchase.installments}</td><td>{purchase.category?.name || 'Sem grupo'}</td><td><strong>{brl.format(Number(entry.amount))}</strong></td><td><span className="pill warn">{entry.status === 'open' ? 'Pendente' : 'Pago'}</span></td><td>{canDelete && purchase.status !== 'legacy' && <button className="btn secondary" onClick={() => void cardsClient.cancelPurchase(purchase.id).then(load)}>Cancelar</button>}</td></tr>)}</tbody></table></div>{!currentEntries.length && <div className="empty">Nenhuma compra nesta fatura.</div>}</div>}
          {detailTab === 'future' && <div className="card-tab-panel"><div className="invoice-summary"><div><span>Próxima fatura prevista</span><strong>{brl.format(forecast[1]?.amount || 0)}</strong></div><div><span>Parcelas dos meses seguintes</span><strong>{brl.format(futureTotal)}</strong></div><div><span>Total comprometido</span><strong>{brl.format(selectedCard.usedLimit)}</strong></div></div><div className="projection-list">{forecast.slice(1).map((item) => <div className="projection-row" key={item.month}><strong>{shortMonth(item.month)}</strong><div><span>Compromissos projetados</span><div className="projection-bar"><i style={{ width: `${item.amount / forecastMax * 100}%` }}/></div></div><strong>{brl.format(item.amount)}</strong></div>)}</div></div>}
          {detailTab === 'installments' && <div className="card-tab-panel">{futureEntries.map(({purchase,entry}) => <div className="installment-row" key={entry.id}><div><strong>{purchase.description}</strong><small>{purchase.category?.name || 'Sem grupo'}</small></div><span>{entry.number}/{purchase.installments}</span><strong>{brl.format(Number(entry.amount))}</strong></div>)}{!futureEntries.length && <div className="empty">Nenhuma parcela futura.</div>}</div>}
          {detailTab === 'rules' && <div className="card-tab-panel"><div className="audit">{['Data da compra define a fatura conforme fechamento e vencimento cadastrados.','Parcelamento distribui os centavos sem perda por arredondamento.','Fim de semana avança o vencimento para o próximo dia útil.','Pagamento da fatura confirma uma única baixa agrupada.','Estorno preserva a compra original e registra o evento reverso.'].map((text,index) => <div className="audit-item" key={text}><div className="rail"/><div className="audit-body"><strong>{index + 1}. {text.split(' ')[0]}</strong><small>{text}</small></div></div>)}</div></div>}
        </article>
        <div className="card-safe-note"><span>✓</span><span>O limite disponível considera compras abertas e parcelas futuras. Pagar a fatura apenas confirma a baixa do compromisso já registrado.</span></div>
      </div>
    </div> : <div className="card empty-state">Nenhum cartão identificado na base. Use “Gerenciar cartões” para cadastrar.</div>}
    {editor && <><button className="launch-drawer-backdrop" aria-label="Fechar" onClick={() => setEditor(null)} /><aside className="launch-drawer card-editor" role="dialog" aria-modal="true"><header><div><span>{editor === 'card' ? 'Novo cartão' : 'Nova compra'}</span><h2>{editor === 'card' ? 'Cadastrar cartão' : 'Registrar compra'}</h2></div><button onClick={() => setEditor(null)} aria-label="Fechar">×</button></header>{editor === 'card' ? <form className="catalog-form" onSubmit={createCard}><label>Nome *<input autoFocus value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="Ex.: LATAM PASS Platinum" required /></label><div className="launch-form-row"><label>Emissor<input value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="Ex.: Itaú" /></label><label>Bandeira *<select value={brand} onChange={(e) => setBrand(e.target.value)} required>{brands.map((item) => <option key={item}>{item}</option>)}</select></label></div><div className="launch-form-row"><label>Final do cartão<input inputMode="numeric" maxLength={4} value={lastFour} onChange={(e) => setLastFour(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="0000" /></label><label>Limite *<MEGCurrencyInput value={limit} onValueChange={setLimit} required /></label></div><div className="launch-form-row"><label>Dia de fechamento *<input type="number" min="1" max="31" value={closingDay} onChange={(e) => setClosingDay(e.target.value)} required /></label><label>Dia de vencimento *<input type="number" min="1" max="31" value={dueDay} onChange={(e) => setDueDay(e.target.value)} required /></label></div><div className="cycle-preview"><span>Melhor dia estimado</span><strong>Dia {Number(closingDay) === 31 ? 1 : Number(closingDay) + 1}</strong><small>Primeiro dia após o fechamento cadastrado.</small></div><button className="auth-submit" disabled={busy}>Cadastrar cartão</button></form> : <form className="catalog-form" onSubmit={createPurchase}><label>Cartão *<select autoFocus value={cardId} onChange={(e) => setCardId(e.target.value)} required><option value="">Selecione</option>{cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</select></label><label>Descrição *<input value={description} onChange={(e) => setDescription(e.target.value)} required /></label><div className="launch-form-row"><label>Valor total *<MEGCurrencyInput value={amount} onValueChange={setAmount} required /></label><label>Data *<input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} required /></label></div><div className="launch-form-row"><label>Parcelas *<input type="number" min="1" max="48" value={installments} onChange={(e) => setInstallments(e.target.value)} required /></label><label>Grupo<select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}><option value="">Sem grupo</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label></div><p className="drawer-note">A fatura e o vencimento serão calculados automaticamente pelo ciclo do cartão escolhido.</p><button className="auth-submit" disabled={busy}>Registrar compra</button></form>}</aside></>}
  </section>;
}
