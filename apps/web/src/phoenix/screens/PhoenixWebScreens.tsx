import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { PhoenixReadModel } from '../contracts';
import { preparePhoenixReconciliationAdjustment, readPhoenixReconciliationBalance, runPhoenixReconciliationAdjustment } from '../reconciliation-bridge';
import { megConfirm } from '../meg-confirm';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function PageIntro({ kicker, title, text, aside }: { kicker: string; title: string; text: string; aside?: React.ReactNode }) {
  return <header className="px-screen-head"><div><span className="px-kicker">{kicker}</span><h1>{title}</h1><p>{text}</p></div>{aside ? <div className="px-screen-head-aside">{aside}</div> : null}</header>;
}

function todaySaoPaulo() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const read = (type: string) => parts.find((item) => item.type === type)?.value || '';
  return `${read('year')}-${read('month')}-${read('day')}`;
}

function normalize(value: unknown) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('pt-BR');
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
      <article><span>Resultado realizado</span><strong>{money.format(realizedResult)}</strong><small>{realizedIncome > 0 ? `Receitas realizadas ${money.format(realizedIncome)}` : 'Sem receita realizada no período'}</small></article>
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

    <section className="px-card px-analytics-insights"><div className="px-panel-head"><div><span>Leitura MEG</span><h2>O que merece atenção</h2></div><small>Derivado somente dos dados reais do período</small></div><div className="px-analytics-insight-grid"><article><span>Maior classificação</span><strong>{topClassification?.name || 'Sem dados'}</strong><small>{topClassification ? `${money.format(topClassification.amount)} no período` : 'Nenhuma despesa classificada'}</small></article><article><span>Variação das despesas</span><strong className={expenseDelta <= 0 ? 'positive' : 'negative'}>{deltaLabel(expenseDelta)}</strong><small>{expenseDelta > 0 ? 'Despesas acima do mês anterior' : expenseDelta < 0 ? 'Despesas abaixo do mês anterior' : 'Sem variação monetária'}</small></article><article><span>Fechamento projetado</span><strong className={projectedClosing >= 0 ? 'positive' : 'negative'}>{money.format(projectedClosing)}</strong><small>{projectedClosing >= 0 ? 'Projeção permanece positiva' : 'A Home deve continuar sinalizando o déficit'}</small></article><article><span>Margem realizada</span><strong className={realizedRate >= 0 ? 'positive' : 'negative'}>{realizedIncome > 0 ? `${realizedRate.toFixed(1)}%` : '—'}</strong><small>{realizedIncome > 0 ? 'Resultado realizado ÷ receitas realizadas' : 'Sem base de receita realizada para calcular a margem'}</small></article></div></section>
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
