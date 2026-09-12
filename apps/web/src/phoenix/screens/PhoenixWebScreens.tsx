import { useMemo, useState, type CSSProperties } from 'react';
import type { PhoenixReadModel } from '../contracts';
import '../phoenix-web-screens.css';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

function PageIntro({ kicker, title, text, aside }: { kicker: string; title: string; text: string; aside?: React.ReactNode }) {
  return <header className="px-screen-head"><div><span className="px-kicker">{kicker}</span><h1>{title}</h1><p>{text}</p></div>{aside ? <div className="px-screen-head-aside">{aside}</div> : null}</header>;
}

function isoDay(value: string | Date) {
  return new Date(value).toISOString().slice(0, 10);
}

function todaySaoPaulo() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const read = (type: string) => parts.find((item) => item.type === type)?.value || '';
  return `${read('year')}-${read('month')}-${read('day')}`;
}

function statusText(status: string) {
  return ({ open: 'Em aberto', partial: 'Parcial', paid: 'Recebido', overdue: 'Vencido' } as Record<string, string>)[status] || status;
}

export function PhoenixReceivables({ data }: { data: PhoenixReadModel }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const today = todaySaoPaulo();
  const open = data.receivables.filter((item) => item.status !== 'paid' && Number(item.openAmount) > 0);
  const overdue = open.filter((item) => isoDay(item.dueDate) < today);
  const totalOpen = open.reduce((sum, item) => sum + Number(item.openAmount || 0), 0);
  const totalReceived = data.receivables.reduce((sum, item) => sum + item.receipts.reduce((receiptSum, receipt) => receiptSum + Number(receipt.amount || 0), 0), 0);
  const filtered = useMemo(() => data.receivables.filter((item) => {
    const haystack = `${item.description} ${item.customer?.name || ''}`.toLocaleLowerCase('pt-BR');
    return haystack.includes(search.trim().toLocaleLowerCase('pt-BR')) && (status === 'all' || item.status === status);
  }), [data.receivables, search, status]);

  return <section className="px-screen">
    <PageIntro kicker="Contas a receber" title="Títulos e recebimentos em aberto" text="Leitura do domínio oficial de contas a receber, sem registrar recebimentos nesta fase." aside={<span className="px-total-pill">{money.format(totalOpen)} em aberto</span>} />
    <section className="px-screen-kpis"><article><span>Em aberto</span><strong>{money.format(totalOpen)}</strong><small>{open.length} título(s)</small></article><article className="danger"><span>Vencidos</span><strong>{overdue.length}</strong><small>{money.format(overdue.reduce((sum, item) => sum + Number(item.openAmount || 0), 0))}</small></article><article><span>Recebido</span><strong>{money.format(totalReceived)}</strong><small>Recebimentos registrados</small></article><article><span>Clientes</span><strong>{data.customers.filter((item) => item.isActive).length}</strong><small>Cadastros ativos</small></article></section>
    <section className="px-card px-table-card"><div className="px-toolbar"><label className="px-search-field"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar título ou cliente" /></label><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Todos os status</option><option value="open">Em aberto</option><option value="partial">Parcial</option><option value="overdue">Vencido</option><option value="paid">Recebido</option></select><span className="px-toolbar-note">Somente leitura</span></div><div className="px-table-scroll"><table className="px-data-table"><thead><tr><th>Vencimento</th><th>Descrição</th><th>Cliente</th><th>Parcela</th><th>Total</th><th>Em aberto</th><th>Status</th><th>Recebimentos</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td>{date.format(new Date(item.dueDate))}</td><td><strong>{item.description}</strong></td><td>{item.customer?.name || 'Não informado'}</td><td>{item.installmentQty > 1 ? `${item.installmentNo}/${item.installmentQty}` : 'Única'}</td><td className="px-money">{money.format(Number(item.totalAmount || 0))}</td><td className="px-money">{money.format(Number(item.openAmount || 0))}</td><td><span className={`px-status ${item.status}`}>{statusText(item.status)}</span></td><td>{item.receipts.length}</td></tr>)}</tbody></table>{!filtered.length ? <p className="px-empty">Nenhum título corresponde aos filtros.</p> : null}</div></section>
  </section>;
}

export function PhoenixRevenues({ data }: { data: PhoenixReadModel }) {
  const [search, setSearch] = useState('');
  const revenues = useMemo(() => data.events.items.filter((event) => event.competence === data.month && event.type === 'income'), [data]);
  const filtered = revenues.filter((event) => `${event.description} ${event.category?.name || ''} ${event.paymentMethod?.name || ''}`.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR')));
  const total = revenues.reduce((sum, item) => sum + Math.abs(Number(item.amount || 0)), 0);
  const realized = revenues.filter((item) => ['confirmed', 'paid', 'reconciled'].includes(item.status)).reduce((sum, item) => sum + Math.abs(Number(item.amount || 0)), 0);

  return <section className="px-screen"><PageIntro kicker="Receitas" title="Origem e evolução das entradas" text="Entradas financeiras do período carregadas do domínio oficial de eventos." />
    <section className="px-screen-kpis"><article><span>Receitas do período</span><strong>{money.format(total)}</strong><small>{revenues.length} evento(s)</small></article><article><span>Realizadas</span><strong>{money.format(realized)}</strong><small>Confirmadas, pagas ou conciliadas</small></article><article><span>Resultado realizado</span><strong>{money.format(data.summary.realizedResult)}</strong><small>Receitas menos despesas realizadas</small></article><article><span>Ticket médio</span><strong>{money.format(revenues.length ? total / revenues.length : 0)}</strong><small>Média das entradas</small></article></section>
    <section className="px-card px-table-card"><div className="px-toolbar"><label className="px-search-field"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar receita, classificação ou forma" /></label><span className="px-toolbar-note">Receita não exige grupo na camada Phoenix</span></div><div className="px-table-scroll"><table className="px-data-table"><thead><tr><th>Data</th><th>Descrição</th><th>Classificação</th><th>Conta</th><th>Forma</th><th>Situação</th><th>Valor</th></tr></thead><tbody>{filtered.map((event) => <tr key={event.id}><td>{date.format(new Date(event.date))}</td><td><strong>{event.description}</strong></td><td>{event.category?.name || 'Sem classificação'}</td><td>{event.account?.name || 'Não informada'}</td><td>{event.paymentMethod?.name || 'Não informada'}</td><td><span className={`px-status ${event.status}`}>{event.status}</span></td><td className="px-money positive">{money.format(Math.abs(Number(event.amount || 0)))}</td></tr>)}</tbody></table>{!filtered.length ? <p className="px-empty">Nenhuma receita localizada no período.</p> : null}</div></section>
  </section>;
}

export function PhoenixCashflow({ data }: { data: PhoenixReadModel }) {
  const cashflow = data.cashflow;
  return <section className="px-screen"><PageIntro kicker="Fluxo de caixa" title="Fechamento realizado e projetado" text="Saldos e movimentos diários fornecidos pelo serviço oficial de fluxo de caixa." />
    <section className="px-screen-kpis"><article><span>Saldo inicial</span><strong>{money.format(cashflow.openingBalance)}</strong><small>Antes do período</small></article><article><span>Entradas</span><strong>{money.format(cashflow.totalIncome)}</strong><small>Total do período</small></article><article className="danger"><span>Saídas</span><strong>{money.format(cashflow.totalExpense)}</strong><small>Total do período</small></article><article><span>Fechamento projetado</span><strong>{money.format(cashflow.projectedClosing)}</strong><small>Realizado: {money.format(cashflow.realizedClosing)}</small></article></section>
    <section className="px-card px-table-card"><div className="px-panel-head"><div><span>Movimentação diária</span><h2>Realizado x projetado</h2></div><strong>{cashflow.days.length} dia(s) com movimento</strong></div><div className="px-table-scroll"><table className="px-data-table"><thead><tr><th>Data</th><th>Entradas</th><th>Saídas</th><th>Líquido</th><th>Saldo realizado</th><th>Saldo projetado</th><th>Eventos</th></tr></thead><tbody>{cashflow.days.map((day) => <tr key={day.date}><td>{date.format(new Date(`${day.date}T12:00:00`))}</td><td className="px-money positive">{money.format(day.income)}</td><td className="px-money negative">{money.format(day.expense)}</td><td className="px-money">{money.format(day.net)}</td><td className="px-money">{money.format(day.realizedBalance)}</td><td className="px-money">{money.format(day.projectedBalance)}</td><td>{day.eventCount}</td></tr>)}</tbody></table>{!cashflow.days.length ? <p className="px-empty">Nenhuma movimentação localizada no período.</p> : null}</div></section>
  </section>;
}

export function PhoenixAnalytics({ data }: { data: PhoenixReadModel }) {
  const analytics = data.analytics;
  const maxCategory = Math.max(1, ...analytics.categories.map((item) => Math.abs(item.amount)));
  return <section className="px-screen"><PageIntro kicker="Análises" title="Tendências e comparações históricas" text="Indicadores calculados pelo backend financeiro; a Phoenix apenas apresenta os resultados." />
    <section className="px-screen-kpis"><article><span>Receitas</span><strong>{money.format(analytics.summary.income)}</strong><small>Δ {money.format(analytics.delta.income)}</small></article><article className="danger"><span>Despesas</span><strong>{money.format(analytics.summary.expense)}</strong><small>Δ {money.format(analytics.delta.expense)}</small></article><article><span>Média diária</span><strong>{money.format(analytics.dailyAverageExpense)}</strong><small>Despesa diária média</small></article><article><span>Concentração Top 3</span><strong>{analytics.concentrationTop3.toFixed(1)}%</strong><small>Participação das maiores categorias</small></article></section>
    <div className="px-web-two-columns"><section className="px-card"><div className="px-panel-head"><div><span>Despesas</span><h2>Principais categorias</h2></div></div><div className="px-analytics-bars">{analytics.categories.map((item) => <div className="px-analytics-bar" key={item.name}><div><strong>{item.name}</strong><span>{money.format(item.amount)}</span></div><div className="px-progress"><span style={{ '--px-progress': `${Math.min(100, Math.abs(item.amount) / maxCategory * 100)}%` } as CSSProperties} /></div></div>)}{!analytics.categories.length ? <p className="px-empty">Sem categorias para o período.</p> : null}</div></section>
      <section className="px-card"><div className="px-panel-head"><div><span>Histórico</span><h2>Evolução mensal</h2></div></div><div className="px-analytics-trend">{analytics.monthlyTrend.map((item) => <div className="px-trend-row" key={item.month}><strong>{item.month}</strong><span>Entradas {money.format(item.income)}</span><span>Saídas {money.format(item.expense)}</span><em>{money.format(item.result)}</em></div>)}{!analytics.monthlyTrend.length ? <p className="px-empty">Sem série histórica disponível.</p> : null}</div></section></div>
  </section>;
}

export function PhoenixBudgets({ data }: { data: PhoenixReadModel }) {
  const total = data.budgets.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const used = data.budgets.reduce((sum, item) => sum + Number(item.used || 0), 0);
  const danger = data.budgets.filter((item) => item.status === 'danger').length;
  return <section className="px-screen"><PageIntro kicker="Orçamentos e metas" title="Planejamento financeiro" text="Acompanhamento dos orçamentos oficiais do período, com edição bloqueada nesta fase." aside={<span className="px-users-readonly">Somente leitura</span>} />
    <section className="px-screen-kpis"><article><span>Orçado</span><strong>{money.format(total)}</strong><small>{data.budgets.length} grupo(s)</small></article><article><span>Utilizado</span><strong>{money.format(used)}</strong><small>{total ? `${(used / total * 100).toFixed(1)}% do orçamento` : 'Sem orçamento'}</small></article><article><span>Disponível</span><strong>{money.format(total - used)}</strong><small>Saldo planejado</small></article><article className={danger ? 'danger' : ''}><span>Acima do limite</span><strong>{danger}</strong><small>Grupo(s) em alerta</small></article></section>
    <section className="px-budget-grid">{data.budgets.map((item) => <article className="px-card px-budget-card" key={item.id}><div className="px-panel-head"><div><span>Grupo</span><h2>{item.group}</h2></div><span className={`px-status ${item.status}`}>{item.percent.toFixed(0)}%</span></div><div className="px-progress"><span style={{ '--px-progress': `${Math.min(100, Math.max(0, item.percent))}%` } as CSSProperties} /></div><dl><div><dt>Orçado</dt><dd>{money.format(item.amount)}</dd></div><div><dt>Utilizado</dt><dd>{money.format(item.used)}</dd></div><div><dt>Disponível</dt><dd>{money.format(item.available)}</dd></div></dl><button type="button" disabled>Editar orçamento</button></article>)}{!data.budgets.length ? <div className="px-card px-empty">Nenhum orçamento cadastrado para o período.</div> : null}</section>
  </section>;
}

export function PhoenixReconciliation({ data }: { data: PhoenixReadModel }) {
  return <section className="px-screen"><PageIntro kicker="Conciliação" title="Compare o MEG com o saldo real" text="A V15 preserva esta área, mas nenhum status bancário será inferido sem uma fonte oficial de conciliação." />
    <section className="px-card px-reconcile-locked"><span className="px-kicker">Contrato em auditoria</span><h2>Conciliação ainda não liberada na Phoenix</h2><p>As {data.accounts.filter((item) => item.isActive).length} conta(s) financeira(s) ativa(s) estão disponíveis no cadastro, porém os endpoints financeiros atuais não fornecem um contrato de leitura de conciliação bancária equivalente ao desenho V15. Mostrar “conciliado”, “diferença” ou saldo de extrato aqui seria inventar informação.</p><div className="px-rule-strip"><span>✓ Nenhum saldo bancário é estimado.</span><span>✓ Nenhuma baixa é executada.</span><span>✓ A tela será ligada quando a fonte oficial for confirmada.</span></div></section>
  </section>;
}
