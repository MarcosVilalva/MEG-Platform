import { useMemo, useState, type CSSProperties } from 'react';
import type { PhoenixReadModel } from '../contracts';
import { resolvePhoenixCardIdentity } from '../card-identity';
import '../phoenix-screens.css';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

function isoDay(value: string | Date) {
  return new Date(value).toISOString().slice(0, 10);
}

function todaySaoPaulo() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const read = (type: string) => parts.find((item) => item.type === type)?.value || '';
  return `${read('year')}-${read('month')}-${read('day')}`;
}

function monthLabel(value: string) {
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
    .format(new Date(Date.UTC(year, month - 1, 1)))
    .replace(/^./, (letter) => letter.toUpperCase());
}

function PageIntro({ kicker, title, text, aside }: { kicker: string; title: string; text: string; aside?: React.ReactNode }) {
  return <header className="px-screen-head">
    <div><span className="px-kicker">{kicker}</span><h1>{title}</h1><p>{text}</p></div>
    {aside ? <div className="px-screen-head-aside">{aside}</div> : null}
  </header>;
}

export function PhoenixMovements({ data }: { data: PhoenixReadModel }) {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [account, setAccount] = useState('all');

  const monthEvents = useMemo(() => data.events.items.filter((event) => event.competence === data.month), [data]);
  const filtered = useMemo(() => monthEvents.filter((event) => {
    const haystack = `${event.description} ${event.category?.name || ''} ${event.category?.group || ''} ${event.account?.name || ''} ${event.paymentMethod?.name || ''}`.toLowerCase();
    return haystack.includes(search.trim().toLowerCase())
      && (type === 'all' || event.type === type)
      && (status === 'all' || event.status === status)
      && (account === 'all' || event.accountId === account);
  }), [monthEvents, search, type, status, account]);

  const income = monthEvents.filter((event) => event.type === 'income').reduce((sum, event) => sum + Number(event.amount || 0), 0);
  const expense = monthEvents.filter((event) => event.type === 'expense').reduce((sum, event) => sum + Math.abs(Number(event.amount || 0)), 0);
  const pending = monthEvents.filter((event) => event.status === 'planned').length;

  return <section className="px-screen px-movements-screen">
    <PageIntro kicker="Lançamentos" title="Controle financeiro" text="Inclua, consulte e edite eventos sem misturar o histórico de auditoria com o formulário." aside={
      <details className="px-column-chooser"><summary>Colunas</summary><div><span>Dia</span><span>Classificação</span><span>Grupo</span><span>Forma de pagamento</span><span>Modalidade</span></div></details>
    } />

    <section className="px-screen-kpis">
      <article><span>Receitas</span><strong>{money.format(income)}</strong><small>{monthLabel(data.month)}</small></article>
      <article><span>Despesas</span><strong>{money.format(expense)}</strong><small>Movimentação do período</small></article>
      <article><span>Pendentes</span><strong>{pending}</strong><small>Aguardando efetivação</small></article>
      <article><span>Aguardando sincronização</span><strong>0</strong><small>Leitura confirmada pelo backend</small></article>
    </section>

    <section className="px-card px-table-card">
      <div className="px-toolbar">
        <label className="px-search-field"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar descrição, grupo ou usuário" /></label>
        <select value={type} onChange={(event) => setType(event.target.value)}><option value="all">Todos os tipos</option><option value="income">Receitas</option><option value="expense">Despesas</option></select>
        <select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Todas as situações</option><option value="planned">Pendente</option><option value="confirmed">Confirmado</option><option value="paid">Pago</option><option value="reconciled">Conciliado</option></select>
        <select value={account} onChange={(event) => setAccount(event.target.value)}><option value="all">Todas as contas</option>{data.accounts.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      </div>

      <div className="px-table-scroll">
        <table className="px-data-table">
          <thead><tr><th>Vencimento</th><th>Data da compra</th><th>Dia</th><th>Tipo</th><th>Descrição</th><th>Receita</th><th>Classificação</th><th>Grupo</th><th>Despesa</th><th>Forma de pagamento</th><th>Situação</th><th>Modalidade</th><th>Detalhes</th></tr></thead>
          <tbody>{filtered.map((event) => {
            const source = event.sourceDetails;
            const isIncome = event.type === 'income';
            return <tr key={event.id}>
              <td>{date.format(new Date(event.date))}</td>
              <td>{date.format(new Date(event.date))}</td>
              <td>{source?.weekday || '—'}</td>
              <td><span className={`px-type-flag ${event.type}`}>{isIncome ? 'RECEITA' : 'DESPESA'}</span></td>
              <td><strong>{event.description}</strong></td>
              <td className="px-money positive">{isIncome ? money.format(Math.abs(Number(event.amount))) : '—'}</td>
              <td>{source?.expenseClass || event.category?.name || '—'}</td>
              <td>{source?.group || event.category?.group || '—'}</td>
              <td className="px-money negative">{!isIncome ? money.format(Math.abs(Number(event.amount))) : '—'}</td>
              <td>{source?.paymentMethod || event.paymentMethod?.name || '—'}</td>
              <td><span className={`px-status ${event.status}`}>{source?.situation || event.status}</span></td>
              <td>{source?.modality || '—'}</td>
              <td><button className="px-detail-btn" type="button" title="Somente leitura" aria-label={`Detalhes de ${event.description}`}>↘</button></td>
            </tr>;
          })}</tbody>
        </table>
        {!filtered.length ? <p className="px-empty">Nenhum lançamento corresponde aos filtros do período.</p> : null}
      </div>
    </section>

    <div className="px-rule-strip"><span>✓ Usuário, conta e sincronização permanecem vinculados.</span><span>✓ Benefício não compõe saldo monetário.</span><span>✓ Histórico de auditoria permanece separado.</span></div>
  </section>;
}

type Priority = 'all' | 'overdue' | 'today' | 'upcoming';

export function PhoenixPayables({ data }: { data: PhoenixReadModel }) {
  const today = todaySaoPaulo();
  const [priority, setPriority] = useState<Priority>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const open = data.payables.filter((item) => !['paid', 'cancelled'].includes(item.status) && Number(item.openAmount) > 0);
  const overdue = open.filter((item) => isoDay(item.dueDate) < today);
  const dueToday = open.filter((item) => isoDay(item.dueDate) === today);
  const upcoming = open.filter((item) => isoDay(item.dueDate) > today);
  const total = open.reduce((sum, item) => sum + Number(item.openAmount || 0), 0);

  const visible = open.filter((item) => {
    const due = isoDay(item.dueDate);
    const matchesPriority = priority === 'all' || (priority === 'overdue' && due < today) || (priority === 'today' && due === today) || (priority === 'upcoming' && due > today);
    return matchesPriority && `${item.description} ${item.category?.name || ''} ${item.category?.group || ''}`.toLowerCase().includes(search.trim().toLowerCase());
  });

  const grouped = visible.reduce<Record<string, typeof visible>>((acc, item) => {
    const group = item.category?.group || item.category?.name || 'Sem classificação';
    (acc[group] ||= []).push(item);
    return acc;
  }, {});
  const selectedTotal = open.filter((item) => selected.has(item.id)).reduce((sum, item) => sum + Number(item.openAmount || 0), 0);
  const available = data.summary.availableBalance + data.summary.realizedResult;

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return <section className="px-screen">
    <PageIntro kicker="Pendentes" title="Prioridades e compromissos" text="Organize o que precisa de ação agora e simule a baixa sem alterar a base." aside={<span className="px-total-pill">{money.format(total)} pendente</span>} />
    <section className="px-screen-kpis">
      <article><span>Total pendente</span><strong>{money.format(total)}</strong><small>{open.length} compromisso(s)</small></article>
      <article className="danger"><span>Vencidos</span><strong>{overdue.length}</strong><small>Prioridade máxima</small></article>
      <article className="warn"><span>Vencem hoje</span><strong>{dueToday.length}</strong><small>Ação imediata</small></article>
      <article><span>Próximos vencimentos</span><strong>{upcoming.length}</strong><small>Agenda ativa</small></article>
    </section>

    <div className="px-priority-tabs">{([['all','Todos'],['overdue','Vencidos'],['today','Hoje'],['upcoming','Próximos']] as const).map(([id,label]) => <button key={id} type="button" className={priority === id ? 'active' : ''} onClick={() => setPriority(id)}>{label}</button>)}</div>

    <div className="px-pending-layout">
      <section className="px-card px-pending-list">
        <div className="px-toolbar"><label className="px-search-field"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar compromisso" /></label><span className="px-toolbar-note">Ordenado por vencimento</span></div>
        {Object.entries(grouped).map(([group, items]) => <section className="px-pending-group" key={group}>
          <header><div><strong>{group}</strong><small>{items.length} item(ns)</small></div><strong>{money.format(items.reduce((sum, item) => sum + Number(item.openAmount || 0), 0))}</strong></header>
          {items.map((item) => {
            const due = isoDay(item.dueDate);
            const late = due < today ? Math.max(1, Math.floor((new Date(`${today}T12:00:00`).getTime() - new Date(`${due}T12:00:00`).getTime()) / 86400000)) : 0;
            return <label className="px-pending-row" key={item.id}>
              <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggle(item.id)} />
              <div className="px-pending-date"><strong>{date.format(new Date(item.dueDate))}</strong><small>{late ? `${late} dia(s) em atraso` : due === today ? 'Vence hoje' : 'Programado'}</small></div>
              <div className="px-pending-copy"><strong>{item.description}</strong><small>{item.installmentQty > 1 ? `Parcela ${item.installmentNo}/${item.installmentQty}` : 'Pagamento único'} · {item.category?.name || 'Sem classificação'}</small></div>
              <strong className="px-pending-amount">{money.format(Number(item.openAmount || 0))}</strong>
              <span className={`px-status ${late ? 'overdue' : 'planned'}`}>{late ? 'VENCIDO' : 'PENDENTE'}</span>
              <button type="button" className="px-detail-btn" aria-label={`Detalhes de ${item.description}`}>↘</button>
            </label>;
          })}
        </section>)}
        {!visible.length ? <p className="px-empty">Nenhum compromisso corresponde ao filtro.</p> : null}
      </section>

      <aside className="px-card px-payment-summary">
        <div className="px-panel-head"><div><span>Baixa protegida</span><h2>Simulação</h2></div><span className="px-status reconciled">ATIVA</span></div>
        <dl><div><dt>Saldo monetário disponível</dt><dd>{money.format(available)}</dd></div><div><dt>Total pendente</dt><dd>{money.format(total)}</dd></div><div><dt>Itens selecionados</dt><dd>{selected.size}</dd></div><div><dt>Valor selecionado</dt><dd>{money.format(selectedTotal)}</dd></div><div className="emphasis"><dt>Saldo previsto após a baixa</dt><dd>{money.format(available - selectedTotal)}</dd></div></dl>
        <div className={`px-protection-note ${selectedTotal > available ? 'danger' : ''}`}>{selectedTotal > available ? 'A seleção ultrapassa o saldo monetário disponível. A baixa deverá permanecer bloqueada.' : 'Simulação segura: nenhum valor foi gravado. Benefícios continuam fora do saldo monetário.'}</div>
        <button className="px-primary-action" type="button" disabled>Revisar e confirmar baixa</button>
        <small className="px-readonly-hint">Gravação desabilitada durante a fase de paridade Phoenix.</small>
      </aside>
    </div>
  </section>;
}

export function PhoenixCards({ data }: { data: PhoenixReadModel }) {
  const [selectedId, setSelectedId] = useState(data.cards[0]?.id || '');
  const [tab, setTab] = useState<'current' | 'future' | 'installments' | 'rules'>('current');
  const selected = data.cards.find((card) => card.id === selectedId) || data.cards[0] || null;
  if (!selected) return <section className="px-screen"><PageIntro kicker="Cartões de crédito" title="Faturas e compromissos" text="Nenhum cartão ativo foi localizado na base real." /><div className="px-card px-empty">Cadastre cartões no sistema atual antes da migração da escrita.</div></section>;

  const identity = resolvePhoenixCardIdentity(selected);
  const allEntries = selected.purchases.flatMap((purchase) => purchase.entries.map((entry) => ({ purchase, entry })));
  const currentEntries = allEntries.filter(({ entry }) => entry.statementMonth === data.month);
  const nextMonth = (() => { const [y,m] = data.month.split('-').map(Number); return new Date(Date.UTC(y,m,1)).toISOString().slice(0,7); })();
  const futureEntries = allEntries.filter(({ entry }) => entry.statementMonth > data.month && entry.status === 'open');
  const futureTotal = futureEntries.reduce((sum, row) => sum + Number(row.entry.amount || 0), 0);
  const nextStatement = allEntries.filter(({ entry }) => entry.statementMonth === nextMonth && entry.status === 'open').reduce((sum, row) => sum + Number(row.entry.amount || 0), 0);
  const usage = Number(selected.creditLimit) > 0 ? Math.min(100, Math.max(0, (Number(selected.usedLimit) / Number(selected.creditLimit)) * 100)) : 0;
  const legacyCurrent = selected.purchases.filter((purchase) => !purchase.entries.length && purchase.purchaseDate.startsWith(data.month));

  return <section className="px-screen">
    <PageIntro kicker="Cartões de crédito" title="Faturas e compromissos" text="Limites, faturas e compras usando o cadastro real de cada cartão." aside={<button className="px-secondary-action" type="button" disabled>Gerenciar cartões</button>} />
    <div className="px-cards-shell">
      <aside className="px-card px-card-picker">
        <div className="px-panel-head"><div><span>Meus cartões</span><h2>{data.cards.length} ativo(s)</h2></div></div>
        {data.cards.map((card) => { const id = resolvePhoenixCardIdentity(card); return <button key={card.id} type="button" className={`px-card-option ${selected.id === card.id ? 'active' : ''}`} onClick={() => setSelectedId(card.id)}><span className="px-mini-card" style={{ background: id.background }}>{id.miniLabel}</span><span><strong>{card.name}</strong><small>{card.issuer || card.brand || 'Cartão cadastrado'} · {money.format(Number(card.statementAmount || 0))}</small></span><span>›</span></button>; })}
      </aside>

      <div className="px-card-detail">
        <article className="px-card px-card-hero">
          <div className="px-card-hero-grid">
            <div className="px-physical-card" style={{ background: identity.background } as CSSProperties}>
              {identity.artwork ? <img src={`${import.meta.env.BASE_URL}${identity.artwork}`} alt={identity.label} /> : <><strong>{identity.label}</strong><span className="px-chip" /><small>{selected.issuer || selected.brand || 'MEG FINANÇAS'}</small>{identity.brandAsset ? <img className="px-brand-asset" src={`${import.meta.env.BASE_URL}assets/card-brands/${identity.brandAsset}.svg`} alt={selected.brand || identity.brandAsset} /> : null}</>}
            </div>
            <div className="px-card-account">
              <span className="px-kicker">Cartão selecionado</span><h2>{selected.name}</h2><p>{selected.issuer || 'Cartão cadastrado no MEG'}{selected.lastFour ? ` · final ${selected.lastFour}` : ''}</p>
              <div className="px-cycle-dates"><div><span>Fechamento</span><strong>dia {selected.closingDay}</strong></div><div><span>Vencimento</span><strong>dia {selected.dueDay}</strong></div><span className="px-status planned">EM ABERTO</span></div>
            </div>
          </div>
          <div className="px-card-metrics"><div><span>Fatura atual</span><strong>{money.format(Number(selected.statementAmount || 0))}</strong></div><div><span>Após fechamento</span><strong>{money.format(nextStatement)}</strong></div><div><span>Parcelas futuras</span><strong>{money.format(futureTotal)}</strong></div><div><span>Total comprometido</span><strong>{money.format(Number(selected.usedLimit || 0))}</strong></div></div>
          <div className="px-limit"><div><span>Uso do limite</span><strong>{usage.toFixed(0)}% · {money.format(Number(selected.availableLimit || 0))} disponível</strong></div><progress max="100" value={usage} /></div>
        </article>

        <section className="px-card px-card-movement">
          <div className="px-panel-head"><div><span>Movimentação do cartão</span><h2>{selected.name}</h2></div><button className="px-secondary-action" type="button" disabled>Revisar pagamento da fatura</button></div>
          <div className="px-tabbar"><button className={tab === 'current' ? 'active' : ''} onClick={() => setTab('current')}>Fatura atual</button><button className={tab === 'future' ? 'active' : ''} onClick={() => setTab('future')}>Próximas faturas</button><button className={tab === 'installments' ? 'active' : ''} onClick={() => setTab('installments')}>Parcelas futuras</button><button className={tab === 'rules' ? 'active' : ''} onClick={() => setTab('rules')}>Regras</button></div>
          {tab === 'current' ? <div className="px-table-scroll"><table className="px-data-table"><thead><tr><th>Compra</th><th>Data</th><th>Parcela</th><th>Grupo</th><th>Valor</th><th>Situação</th><th>Detalhes</th></tr></thead><tbody>{currentEntries.map(({ purchase, entry }) => <tr key={entry.id}><td><strong>{purchase.description}</strong></td><td>{date.format(new Date(purchase.purchaseDate))}</td><td>{entry.number}/{purchase.installments}</td><td>{purchase.category?.name || '—'}</td><td className="px-money">{money.format(Number(entry.amount))}</td><td><span className={`px-status ${entry.status}`}>{entry.status}</span></td><td><button className="px-detail-btn" type="button">↘</button></td></tr>)}{legacyCurrent.map((purchase) => <tr key={purchase.id}><td><strong>{purchase.description}</strong></td><td>{date.format(new Date(purchase.purchaseDate))}</td><td>Legado</td><td>{purchase.category?.name || '—'}</td><td className="px-money">{money.format(Number(purchase.totalAmount))}</td><td><span className="px-status planned">{purchase.legacyOpen ? 'aberto' : 'registrado'}</span></td><td><button className="px-detail-btn" type="button">↘</button></td></tr>)}</tbody></table>{!currentEntries.length && !legacyCurrent.length ? <p className="px-empty">Nenhuma compra nesta fatura.</p> : null}</div> : null}
          {tab === 'future' ? <div className="px-future-grid">{Array.from(new Set(futureEntries.map(({ entry }) => entry.statementMonth))).sort().slice(0,6).map((month) => { const value = futureEntries.filter(({ entry }) => entry.statementMonth === month).reduce((sum,row) => sum + Number(row.entry.amount),0); return <article key={month}><span>{monthLabel(month)}</span><strong>{money.format(value)}</strong></article>; })}{!futureEntries.length ? <p className="px-empty">Não há faturas futuras em aberto.</p> : null}</div> : null}
          {tab === 'installments' ? <div className="px-table-scroll"><table className="px-data-table"><thead><tr><th>Compra</th><th>Parcela</th><th>Fatura</th><th>Valor</th><th>Situação</th></tr></thead><tbody>{futureEntries.map(({ purchase, entry }) => <tr key={entry.id}><td>{purchase.description}</td><td>{entry.number}/{purchase.installments}</td><td>{monthLabel(entry.statementMonth)}</td><td className="px-money">{money.format(Number(entry.amount))}</td><td><span className={`px-status ${entry.status}`}>{entry.status}</span></td></tr>)}</tbody></table></div> : null}
          {tab === 'rules' ? <ol className="px-rules-list"><li>Compras após o dia de fechamento entram na fatura seguinte.</li><li>Parcelamentos são distribuídos em centavos para preservar exatamente o valor total.</li><li>O limite comprometido considera parcelas em aberto e compatibilidade com compras legadas ainda abertas.</li><li>Pagamento de fatura gera evento financeiro correspondente no backend.</li><li>A identidade visual é resolvida pelo produto e emissor reais; a bandeira é apenas auxiliar.</li></ol> : null}
        </section>
      </div>
    </div>
  </section>;
}

type CatalogTab = 'accounts' | 'categories' | 'payments' | 'cards';

export function PhoenixCatalogs({ data }: { data: PhoenixReadModel }) {
  const [tab, setTab] = useState<CatalogTab>('accounts');
  const activeAccounts = data.accounts.filter((item) => item.isActive);
  const activeCategories = data.categories.filter((item) => item.isActive);
  const activePayments = data.paymentMethods.filter((item) => item.isActive);
  return <section className="px-screen">
    <PageIntro kicker="Cadastros" title="Base operacional" text="Contas, classificações, grupos, formas de pagamento e cartões usados pelas regras financeiras." aside={<span className="px-status reconciled">Histórico protegido</span>} />
    <section className="px-screen-kpis"><article><span>Contas ativas</span><strong>{activeAccounts.length}</strong></article><article><span>Classificações</span><strong>{activeCategories.length}</strong></article><article><span>Formas de pagamento</span><strong>{activePayments.length}</strong></article><article><span>Cartões ativos</span><strong>{data.cards.length}</strong></article></section>
    <div className="px-tabbar px-catalog-tabs"><button className={tab === 'accounts' ? 'active' : ''} onClick={() => setTab('accounts')}>Contas</button><button className={tab === 'categories' ? 'active' : ''} onClick={() => setTab('categories')}>Classificações</button><button className={tab === 'payments' ? 'active' : ''} onClick={() => setTab('payments')}>Formas de pagamento</button><button className={tab === 'cards' ? 'active' : ''} onClick={() => setTab('cards')}>Cartões</button></div>
    <section className="px-card px-catalog-panel">
      <div className="px-panel-head"><div><span>Base real</span><h2>{tab === 'accounts' ? 'Contas' : tab === 'categories' ? 'Classificações' : tab === 'payments' ? 'Formas de pagamento' : 'Cartões'}</h2></div><button className="px-secondary-action" type="button" disabled>Novo cadastro</button></div>
      <div className="px-table-scroll"><table className="px-data-table"><thead><tr>{tab === 'accounts' ? <><th>Conta</th><th>Tipo</th><th>Instituição</th><th>Saldo inicial</th><th>Status</th></> : tab === 'categories' ? <><th>Classificação</th><th>Grupo</th><th>Tipo</th><th>Status</th></> : tab === 'payments' ? <><th>Forma</th><th>Tipo</th><th>Status</th></> : <><th>Cartão</th><th>Emissor</th><th>Bandeira</th><th>Limite</th><th>Fechamento</th><th>Vencimento</th></>}</tr></thead><tbody>
        {tab === 'accounts' ? data.accounts.map((item) => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.type}</td><td>{item.institution || '—'}</td><td className="px-money">{money.format(Number(item.openingBalance || 0))}</td><td><span className={`px-status ${item.isActive ? 'reconciled' : 'archived'}`}>{item.isActive ? 'Ativa' : 'Inativa'}</span></td></tr>) : null}
        {tab === 'categories' ? data.categories.map((item) => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.group || '—'}</td><td>{item.type || '—'}</td><td><span className={`px-status ${item.isActive ? 'reconciled' : 'archived'}`}>{item.isActive ? 'Ativa' : 'Inativa'}</span></td></tr>) : null}
        {tab === 'payments' ? data.paymentMethods.map((item) => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.type || '—'}</td><td><span className={`px-status ${item.isActive ? 'reconciled' : 'archived'}`}>{item.isActive ? 'Ativa' : 'Inativa'}</span></td></tr>) : null}
        {tab === 'cards' ? data.cards.map((item) => { const identity = resolvePhoenixCardIdentity(item); return <tr key={item.id}><td><span className="px-catalog-card-name"><span className="px-mini-card" style={{ background: identity.background }}>{identity.miniLabel}</span><strong>{item.name}</strong></span></td><td>{item.issuer || '—'}</td><td>{item.brand || '—'}</td><td className="px-money">{money.format(Number(item.creditLimit || 0))}</td><td>dia {item.closingDay}</td><td>dia {item.dueDay}</td></tr>; }) : null}
      </tbody></table></div>
    </section>
  </section>;
}

export function PhoenixPlaceholder({ kicker, title, text }: { kicker: string; title: string; text: string }) {
  return <section className="px-screen"><PageIntro kicker={kicker} title={title} text={text} /><div className="px-card px-placeholder"><span className="px-kicker">Phoenix V15 · próxima etapa</span><h2>Contrato funcional em auditoria</h2><p>Esta área permanece isolada até termos a fonte oficial e os comportamentos confirmados. Nenhuma implementação antiga será copiada apenas para preencher a tela.</p></div></section>;
}
