import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { PhoenixReadModel } from '../contracts';
import { preparePhoenixReconciliationAdjustment, readPhoenixReconciliationBalance, runPhoenixReconciliationAdjustment } from '../reconciliation-bridge';
import { megConfirm } from '../meg-confirm';

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

function normalize(value: unknown) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('pt-BR');
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
  const classifications = useMemo(() => {
    const totals = new Map<string, number>();
    data.events.items
      .filter((event) => event.competence === data.month)
      .filter((event) => !['income', 'redemption', 'transfer'].includes(event.type))
      .filter((event) => {
        const accountType = normalize(event.account?.type);
        const payment = normalize(`${event.paymentMethod?.name || ''} ${event.sourceDetails?.paymentMethod || ''}`);
        const description = normalize(event.description);
        return accountType !== 'benefit' && !payment.includes('verocard') && !description.includes('verocard');
      })
      .forEach((event) => {
        const amount = -Number(event.signedAmount || 0);
        if (!Number.isFinite(amount) || amount === 0) return;
        const classification = event.sourceDetails?.expenseClass || event.category?.group || event.category?.name || 'Sem classificação';
        totals.set(classification, (totals.get(classification) || 0) + amount);
      });
    return [...totals.entries()]
      .map(([name, amount]) => ({ name, amount: Math.round(amount * 100) / 100 }))
      .filter((item) => Math.abs(item.amount) >= 0.005)
      .sort((left, right) => right.amount - left.amount)
      .slice(0, 10);
  }, [data.events.items, data.month]);

  const categories = classifications.length ? classifications : analytics.categories;
  const classificationTotal = categories.reduce((sum, item) => sum + item.amount, 0);
  const concentrationTop3 = classificationTotal > 0
    ? Math.min(100, Math.max(0, categories.slice(0, 3).reduce((sum, item) => sum + item.amount, 0) / classificationTotal * 100))
    : analytics.concentrationTop3;
  const maxCategory = Math.max(1, ...categories.map((item) => Math.abs(item.amount)));
  const maxPayment = Math.max(1, ...analytics.paymentMethods.map((item) => Math.abs(item.amount)));
  const projectedResult = Number(analytics.summary.projectedResult || 0);
  const realizedResult = Number(analytics.summary.realizedResult || 0);
  const realizedIncome = Number(analytics.summary.realizedIncome || 0);
  const realizedRate = realizedIncome > 0 ? realizedResult / realizedIncome * 100 : 0;
  const projectedClosing = Number(data.cashflow.projectedClosing || 0);
  const topClassification = categories[0];
  const expenseDelta = Number(analytics.delta.expense || 0);
  const resultDelta = Number(analytics.delta.result || 0);
  const previousMonth = analytics.previous.month || 'mês anterior';
  const deltaLabel = (value: number) => `${value > 0 ? '+' : ''}${money.format(value)}`;
  const monthLabel = (value: string) => {
    const [year, month] = value.split('-').map(Number);
    return Number.isFinite(year) && Number.isFinite(month)
      ? new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1))).replace('.', '')
      : value;
  };

  return <section className="px-screen px-analytics-screen">
    <PageIntro kicker="Análises" title="Tendências e comparações históricas" text="A análise aprofunda tendências sem substituir o diagnóstico imediato da Home. Déficits e compromissos continuam visíveis na visão principal." aside={<span className={`px-total-pill ${projectedClosing < 0 ? 'is-danger' : 'is-ok'}`}>Fechamento {money.format(projectedClosing)}</span>} />

    <section className="px-screen-kpis px-analytics-kpis">
      <article><span>Receitas</span><strong>{money.format(analytics.summary.income)}</strong><small>Δ {deltaLabel(Number(analytics.delta.income || 0))}</small></article>
      <article className="danger"><span>Despesas</span><strong>{money.format(analytics.summary.expense)}</strong><small>Δ {deltaLabel(expenseDelta)}</small></article>
      <article className={projectedResult < 0 ? 'danger' : ''}><span>Resultado projetado</span><strong>{money.format(projectedResult)}</strong><small>Δ {deltaLabel(resultDelta)}</small></article>
      <article><span>Resultado realizado</span><strong>{money.format(realizedResult)}</strong><small>{realizedIncome > 0 ? `${realizedRate.toFixed(1)}% da receita realizada` : 'Sem receita realizada no período'}</small></article>
      <article><span>Média diária</span><strong>{money.format(analytics.dailyAverageExpense)}</strong><small>Despesa diária média</small></article>
      <article><span>Concentração Top 3</span><strong>{concentrationTop3.toFixed(1)}%</strong><small>Das maiores classificações</small></article>
    </section>

    <section className="px-analytics-reference" aria-label="Referências de planejamento 50 30 20">
      <article className="px-card"><span className="px-kicker">Referência</span><strong>50%</strong><h3>Essenciais</h3><p>Teto de referência sobre a renda histórica. Ainda não é tratado como meta automática sem mapear quais grupos são essenciais.</p></article>
      <article className="px-card"><span className="px-kicker">Referência</span><strong>30%</strong><h3>Flexíveis</h3><p>Faixa de referência para gastos flexíveis. O MEG não classifica despesas sozinho sem uma regra validada por você.</p></article>
      <article className="px-card"><span className="px-kicker">Meta</span><strong>20%</strong><h3>Poupança</h3><p>Referência mínima de formação de reserva. O resultado real continua vindo exclusivamente dos eventos financeiros.</p></article>
    </section>

    <div className="px-web-two-columns px-analytics-main-grid">
      <section className="px-card"><div className="px-panel-head"><div><span>Despesas</span><h2>Principais classificações</h2></div><small>{money.format(classificationTotal)} distribuídos</small></div><div className="px-analytics-bars">{categories.map((item) => <div className="px-analytics-bar" key={item.name}><div><strong>{item.name}</strong><span>{money.format(item.amount)}</span></div><div className="px-progress"><span style={{ '--px-progress': `${Math.min(100, Math.abs(item.amount) / maxCategory * 100)}%` } as CSSProperties} /></div></div>)}{!categories.length ? <p className="px-empty">Sem classificações para o período.</p> : null}</div></section>

      <section className="px-card"><div className="px-panel-head"><div><span>Comparação</span><h2>Período atual x anterior</h2></div><small>{monthLabel(previousMonth)}</small></div><div className="px-analytics-comparison"><div><span>Receitas anteriores</span><strong>{money.format(analytics.previous.income)}</strong><em className={Number(analytics.delta.income || 0) >= 0 ? 'positive' : 'negative'}>{deltaLabel(Number(analytics.delta.income || 0))}</em></div><div><span>Despesas anteriores</span><strong>{money.format(analytics.previous.expense)}</strong><em className={expenseDelta <= 0 ? 'positive' : 'negative'}>{deltaLabel(expenseDelta)}</em></div><div><span>Resultado anterior</span><strong>{money.format(analytics.previous.result)}</strong><em className={resultDelta >= 0 ? 'positive' : 'negative'}>{deltaLabel(resultDelta)}</em></div></div></section>
    </div>

    <div className="px-web-two-columns px-analytics-secondary-grid">
      <section className="px-card"><div className="px-panel-head"><div><span>Histórico</span><h2>Evolução mensal</h2></div><small>{analytics.monthlyTrend.length} competência(s)</small></div><div className="px-analytics-trend">{analytics.monthlyTrend.map((item) => <div className="px-trend-row" key={item.month}><strong>{monthLabel(item.month)}</strong><span>Entradas {money.format(item.income)}</span><span>Saídas {money.format(item.expense)}</span><em className={item.result >= 0 ? 'positive' : 'negative'}>{money.format(item.result)}</em></div>)}{!analytics.monthlyTrend.length ? <p className="px-empty">Sem série histórica disponível.</p> : null}</div></section>

      <section className="px-card"><div className="px-panel-head"><div><span>Composição</span><h2>Formas de pagamento</h2></div></div><div className="px-analytics-bars">{analytics.paymentMethods.map((item) => <div className="px-analytics-bar" key={item.name}><div><strong>{item.name}</strong><span>{money.format(item.amount)}</span></div><div className="px-progress"><span style={{ '--px-progress': `${Math.min(100, Math.abs(item.amount) / maxPayment * 100)}%` } as CSSProperties} /></div></div>)}{!analytics.paymentMethods.length ? <p className="px-empty">Sem composição por forma de pagamento.</p> : null}</div></section>
    </div>

    <section className="px-card px-analytics-insights"><div className="px-panel-head"><div><span>Leitura MEG</span><h2>O que merece atenção</h2></div><small>Derivado somente dos dados reais do período</small></div><div className="px-analytics-insight-grid"><article><span>Maior classificação</span><strong>{topClassification?.name || 'Sem dados'}</strong><small>{topClassification ? `${money.format(topClassification.amount)} no período` : 'Nenhuma despesa classificada'}</small></article><article><span>Variação das despesas</span><strong className={expenseDelta <= 0 ? 'positive' : 'negative'}>{deltaLabel(expenseDelta)}</strong><small>{expenseDelta > 0 ? 'Despesas acima do mês anterior' : expenseDelta < 0 ? 'Despesas abaixo do mês anterior' : 'Sem variação monetária'}</small></article><article><span>Fechamento projetado</span><strong className={projectedClosing >= 0 ? 'positive' : 'negative'}>{money.format(projectedClosing)}</strong><small>{projectedClosing >= 0 ? 'Projeção permanece positiva' : 'A Home deve continuar sinalizando o déficit'}</small></article><article><span>Índice MEG</span><strong>Em calibração</strong><small>A V15 prevê escala de 0 a 100, mas a nota só será liberada quando critérios e pesos forem transparentes e validados.</small></article></div></section>
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

function parseReconciliationMoney(value: string) {
  const normalized = value.trim().replace(/\s/g, '').replace(/R\$/gi, '').replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export function PhoenixReconciliation({ data, onDataCommitted }: { data: PhoenixReadModel; onDataCommitted: (snapshot: PhoenixReadModel) => void }) {
  const monetaryAccounts = useMemo(() => data.accounts.filter((item) =>
    item.isActive && ['checking', 'savings', 'cash'].includes(String(item.type || '').toLowerCase())
  ), [data.accounts]);
  const canWrite = data.user.role !== 'VIEWER';
  const [accountId, setAccountId] = useState(monetaryAccounts[0]?.id || '');
  const [effectiveDate, setEffectiveDate] = useState(todaySaoPaulo());
  const [bankBalanceInput, setBankBalanceInput] = useState('');
  const [megBalance, setMegBalance] = useState<number | null>(null);
  const [difference, setDifference] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [retryOperationId, setRetryOperationId] = useState('');

  const selectedAccount = monetaryAccounts.find((item) => item.id === accountId) || null;
  const bankBalance = parseReconciliationMoney(bankBalanceInput);
  const validBankBalance = Number.isFinite(bankBalance);

  useEffect(() => {
    if (accountId && monetaryAccounts.some((item) => item.id === accountId)) return;
    setAccountId(monetaryAccounts[0]?.id || '');
  }, [accountId, monetaryAccounts]);

  useEffect(() => {
    setMegBalance(null);
    setDifference(null);
    setMessage('');
    setError('');
    setRetryOperationId('');
  }, [accountId, effectiveDate]);

  async function compareBalances() {
    if (!accountId) {
      setError('Selecione uma conta monetária.');
      return;
    }
    if (!validBankBalance) {
      setError('Informe o saldo real exibido pelo banco.');
      return;
    }
    setLoadingBalance(true);
    setError('');
    setMessage('');
    try {
      const result = await readPhoenixReconciliationBalance(accountId, effectiveDate);
      const officialBalance = Number(result.available || 0);
      setMegBalance(officialBalance);
      setDifference(Math.round((bankBalance - officialBalance) * 100) / 100);
    } catch (cause) {
      setMegBalance(null);
      setDifference(null);
      setError(cause instanceof Error ? cause.message : 'Não foi possível consultar o saldo oficial da conta.');
    } finally {
      setLoadingBalance(false);
    }
  }

  async function registerAdjustment() {
    if (!selectedAccount || difference === null || Math.abs(difference) < 0.005 || !canWrite) return;
    const adjustment = Math.round(Math.abs(difference) * 100) / 100;
    const direction = difference > 0 ? 'income' : 'expense';
    const confirmed = await megConfirm({
      kicker: 'Conciliação financeira',
      title: 'Registrar este ajuste?',
      message: `Ajuste de ${money.format(adjustment)} na conta ${selectedAccount.name}. Saldo MEG: ${money.format(megBalance || 0)}. Saldo informado do banco: ${money.format(bankBalance)}. O ajuste será gravado como um novo evento financeiro auditável e o lançamento anterior será preservado.`,
      confirmLabel: direction === 'income' ? 'Registrar entrada' : 'Registrar saída',
      cancelLabel: 'Cancelar',
      danger: false,
    });
    if (!confirmed) return;

    setBusy(true);
    setError('');
    setMessage('');
    try {
      const prepared = preparePhoenixReconciliationAdjustment({
        refreshMonth: data.month,
        accountId: selectedAccount.id,
        date: effectiveDate,
        difference,
        megBalance: megBalance || 0,
        bankBalance,
        existingOperationId: retryOperationId || undefined,
      });
      const result = await runPhoenixReconciliationAdjustment(prepared);
      if (result.status === 'error') {
        setRetryOperationId(result.operationId);
        setError(result.message);
        return;
      }
      setRetryOperationId('');
      onDataCommitted(result.snapshot);
      const refreshed = await readPhoenixReconciliationBalance(selectedAccount.id, effectiveDate);
      setMegBalance(Number(refreshed.available || 0));
      setDifference(Math.round((bankBalance - Number(refreshed.available || 0)) * 100) / 100);
      setMessage('Ajuste registrado, auditado e confirmado na base financeira.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'A base não confirmou o ajuste de conciliação.');
    } finally {
      setBusy(false);
    }
  }

  const diffTone = difference === null ? '' : Math.abs(difference) < 0.005 ? 'positive' : 'negative';

  return <section className="px-screen px-reconcile-screen">
    <PageIntro kicker="Conciliação" title="Compare o MEG com o saldo real" text="Informe o saldo exibido pelo banco. O MEG consulta o saldo oficial da conta na mesma data e só registra ajuste após sua confirmação." aside={<span className="px-total-pill">{monetaryAccounts.length} conta(s) monetária(s)</span>} />

    {error ? <div className="px-settings-avatar-error">{error}</div> : null}
    {message ? <div className="px-settings-profile-note">{message}</div> : null}

    <section className="px-card px-settings-card">
      <div className="px-settings-card-head"><div><span className="px-kicker">Conferência manual</span><h2>Saldo do banco x saldo MEG</h2><p>Nenhum saldo bancário é estimado ou importado sem fonte. O valor real é sempre informado por você.</p></div></div>
      <div className="px-settings-control-row">
        <div><strong>Conta financeira</strong><small>Somente contas monetárias ativas.</small></div>
        <select value={accountId} onChange={(event) => setAccountId(event.target.value)} disabled={busy || loadingBalance}>
          <option value="">Selecione</option>
          {monetaryAccounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </div>
      <div className="px-settings-control-row">
        <div><strong>Data da conferência</strong><small>O saldo MEG será calculado até esta data.</small></div>
        <input type="date" max={todaySaoPaulo()} value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} disabled={busy || loadingBalance} />
      </div>
      <div className="px-settings-control-row">
        <div><strong>Saldo real no banco</strong><small>Digite exatamente o valor exibido no extrato bancário.</small></div>
        <input inputMode="decimal" placeholder="0,00" value={bankBalanceInput} onChange={(event) => { setBankBalanceInput(event.target.value); setDifference(null); setMessage(''); setRetryOperationId(''); }} disabled={busy || loadingBalance} />
      </div>
      <div className="px-settings-actions">
        <button type="button" onClick={() => void compareBalances()} disabled={busy || loadingBalance || !accountId || !validBankBalance}>{loadingBalance ? 'Consultando…' : 'Comparar saldos'}</button>
      </div>
    </section>

    <section className="px-screen-kpis px-reconcile-kpis">
      <article><span>Saldo MEG</span><strong>{megBalance === null ? '—' : money.format(megBalance)}</strong><small>{selectedAccount?.name || 'Selecione uma conta'}</small></article>
      <article><span>Saldo do banco</span><strong>{validBankBalance ? money.format(bankBalance) : '—'}</strong><small>Valor informado manualmente</small></article>
      <article className={difference !== null && Math.abs(difference) >= 0.005 ? 'danger' : ''}><span>Diferença</span><strong className={diffTone}>{difference === null ? '—' : money.format(difference)}</strong><small>{difference === null ? 'Compare os saldos' : Math.abs(difference) < 0.005 ? 'Conta fechada' : difference > 0 ? 'Banco acima do MEG' : 'MEG acima do banco'}</small></article>
      <article><span>Data</span><strong>{new Date(`${effectiveDate}T12:00:00`).toLocaleDateString('pt-BR')}</strong><small>Base da comparação</small></article>
    </section>

    <section className="px-card px-settings-card">
      <div className="px-settings-card-head"><div><span className="px-kicker">Ajuste auditável</span><h2>{difference !== null && Math.abs(difference) < 0.005 ? 'Nenhum ajuste necessário' : 'Regularizar diferença'}</h2><p>{difference === null ? 'Primeiro compare os saldos.' : Math.abs(difference) < 0.005 ? 'O saldo informado coincide com o saldo oficial do MEG.' : 'O ajuste cria um novo evento financeiro confirmado. Nenhum lançamento anterior é apagado ou sobrescrito.'}</p></div></div>
      <div className="px-rule-strip"><span>✓ Saldo MEG consultado por conta e data.</span><span>✓ Ajuste passa pelo writer protegido da API.</span><span>✓ Histórico e auditoria preservados.</span></div>
      <div className="px-settings-actions">
        <button type="button" onClick={() => void registerAdjustment()} disabled={!canWrite || busy || difference === null || Math.abs(difference) < 0.005 || !selectedAccount}>{busy ? 'Confirmando na base…' : 'Registrar ajuste'}</button>
      </div>
      {!canWrite ? <small className="px-settings-warning">Seu perfil é somente leitura e não pode registrar ajustes.</small> : null}
    </section>
  </section>;
}
