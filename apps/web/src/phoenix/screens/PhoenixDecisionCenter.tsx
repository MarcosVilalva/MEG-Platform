import { useEffect, useMemo, useState } from 'react';
import type { FinancialEvent } from '../../app/finance-client';
import type { PhoenixReadModel } from '../contracts';
import { loadPhoenixAllEvents } from '../data/load-phoenix-read-model';
import '../phoenix-decision-center.css';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const monetaryAccountTypes = new Set(['checking', 'savings', 'cash']);
const postedStatuses = new Set(['confirmed', 'paid', 'reconciled']);

type DecisionTab = 'radar' | 'simulator' | 'assistant';
type ScenarioKind = 'expense' | 'income';
type RadarMonth = {
  month: string;
  income: number;
  expense: number;
  balance: number;
  eventCount: number;
};
type RadarSummary = {
  currentBalance: number;
  months: RadarMonth[];
  minimumBalance: number;
  minimumMonth: string;
  firstNegativeMonth: string | null;
  finalBalance: number;
};

function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('pt-BR');
}

function todaySaoPaulo() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const read = (type: string) => parts.find((item) => item.type === type)?.value || '';
  return `${read('year')}-${read('month')}-${read('day')}`;
}

function shiftMonth(value: string, offset: number) {
  const [year, month] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 7);
}

function monthLabel(value: string) {
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, 1)))
    .replace('.', '')
    .replace(/^./, (letter) => letter.toUpperCase());
}

function fullMonthLabel(value: string) {
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, 1)))
    .replace(/^./, (letter) => letter.toUpperCase());
}

function cardDueMonth(statementMonth: string, closingDay: number, dueDay: number) {
  return dueDay <= closingDay ? shiftMonth(statementMonth, 1) : statementMonth;
}

function isBenefitEvent(event: FinancialEvent) {
  const accountType = normalize(event.account?.type);
  const method = normalize(`${event.paymentMethod?.name || ''} ${event.sourceDetails?.paymentMethod || ''}`);
  const description = normalize(event.description);
  return accountType === 'benefit' || method.includes('verocard') || description.includes('verocard');
}

function isMonetaryEvent(event: FinancialEvent) {
  return event.type !== 'transfer' && !isBenefitEvent(event);
}

function signedValue(event: FinancialEvent) {
  const value = Number(event.signedAmount || 0);
  return Number.isFinite(value) ? value : 0;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function buildRadar(data: PhoenixReadModel, events: FinancialEvent[], today: string): RadarSummary {
  const startMonth = today.slice(0, 7);
  const months = Array.from({ length: 12 }, (_, index) => shiftMonth(startMonth, index));
  const openingBalance = data.accounts
    .filter((account) => account.isActive && monetaryAccountTypes.has(normalize(account.type)))
    .reduce((sum, account) => sum + Number(account.openingBalance || 0), 0);
  const realizedUntilToday = events
    .filter(isMonetaryEvent)
    .filter((event) => postedStatuses.has(normalize(event.status)) && String(event.date).slice(0, 10) <= today)
    .reduce((sum, event) => sum + signedValue(event), 0);
  const currentBalance = round(openingBalance + realizedUntilToday);
  const planned = events
    .filter(isMonetaryEvent)
    .filter((event) => normalize(event.status) === 'planned');

  const cardByMonth = new Map<string, { expense: number; count: number }>();
  for (const card of data.cards) {
    for (const purchase of card.purchases || []) {
      if (normalize(purchase.status) === 'cancelled') continue;
      for (const entry of purchase.entries || []) {
        if (normalize(entry.status) !== 'open') continue;
        const month = cardDueMonth(entry.statementMonth, Number(card.closingDay || 1), Number(card.dueDay || 1));
        if (!months.includes(month)) continue;
        const current = cardByMonth.get(month) || { expense: 0, count: 0 };
        current.expense += Math.abs(Number(entry.amount || 0));
        current.count += 1;
        cardByMonth.set(month, current);
      }
    }
  }

  let balance = currentBalance;
  const rows = months.map((month, index) => {
    const monthEvents = planned.filter((event) => {
      const eventDay = String(event.date).slice(0, 10);
      const eventMonth = eventDay.slice(0, 7);
      return index === 0 ? eventMonth <= month : eventMonth === month;
    });
    const income = monthEvents
      .filter((event) => ['income', 'redemption'].includes(event.type))
      .reduce((sum, event) => sum + Math.max(0, signedValue(event)), 0);
    const eventExpense = monthEvents
      .filter((event) => !['income', 'redemption'].includes(event.type))
      .reduce((sum, event) => sum + Math.abs(Math.min(0, signedValue(event))), 0);
    const card = cardByMonth.get(month) || { expense: 0, count: 0 };
    const expense = eventExpense + card.expense;
    balance = round(balance + income - expense);
    return {
      month,
      income: round(income),
      expense: round(expense),
      balance,
      eventCount: monthEvents.length + card.count,
    };
  });

  const minimum = rows.reduce((current, item) => item.balance < current.balance ? item : current, rows[0]);
  return {
    currentBalance,
    months: rows,
    minimumBalance: minimum?.balance ?? currentBalance,
    minimumMonth: minimum?.month ?? startMonth,
    firstNegativeMonth: rows.find((item) => item.balance < 0)?.month || null,
    finalBalance: rows.at(-1)?.balance ?? currentBalance,
  };
}

function simulateRadar(base: RadarSummary, kind: ScenarioKind, amount: number, startMonth: string, repeats: number): RadarSummary {
  let balance = base.currentBalance;
  const months = base.months.map((item, index) => {
    const startIndex = base.months.findIndex((month) => month.month === startMonth);
    const affected = amount > 0 && startIndex >= 0 && index >= startIndex && index < startIndex + repeats;
    const income = item.income + (affected && kind === 'income' ? amount : 0);
    const expense = item.expense + (affected && kind === 'expense' ? amount : 0);
    balance = round(balance + income - expense);
    return { ...item, income: round(income), expense: round(expense), balance };
  });
  const minimum = months.reduce((current, item) => item.balance < current.balance ? item : current, months[0]);
  return {
    currentBalance: base.currentBalance,
    months,
    minimumBalance: minimum?.balance ?? base.currentBalance,
    minimumMonth: minimum?.month ?? base.months[0]?.month ?? startMonth,
    firstNegativeMonth: months.find((item) => item.balance < 0)?.month || null,
    finalBalance: months.at(-1)?.balance ?? base.currentBalance,
  };
}

function parseAmount(value: string) {
  const normalized = value.trim().replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function PhoenixDecisionCenter({ data }: { data: PhoenixReadModel }) {
  const today = todaySaoPaulo();
  const startMonth = today.slice(0, 7);
  const [tab, setTab] = useState<DecisionTab>('radar');
  const [allEvents, setAllEvents] = useState<FinancialEvent[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [scenarioKind, setScenarioKind] = useState<ScenarioKind>('expense');
  const [scenarioAmount, setScenarioAmount] = useState('');
  const [scenarioStart, setScenarioStart] = useState(startMonth);
  const [scenarioRepeats, setScenarioRepeats] = useState(1);

  useEffect(() => {
    let active = true;
    setLoadError('');
    void loadPhoenixAllEvents()
      .then((result) => { if (active) setAllEvents(result.items); })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : 'Não foi possível carregar o histórico completo.');
      });
    return () => { active = false; };
  }, []);

  const events = allEvents || data.events.items;
  const radar = useMemo(() => buildRadar(data, events, today), [data, events, today]);
  const amount = parseAmount(scenarioAmount);
  const simulated = useMemo(
    () => simulateRadar(radar, scenarioKind, amount, scenarioStart, scenarioRepeats),
    [radar, scenarioKind, amount, scenarioStart, scenarioRepeats]
  );
  const scenarioActive = amount > 0;
  const maxMagnitude = Math.max(1, ...radar.months.map((item) => Math.max(Math.abs(item.income), Math.abs(item.expense))));
  const finalImpact = simulated.finalBalance - radar.finalBalance;
  const minImpact = simulated.minimumBalance - radar.minimumBalance;
  const currentMonthRows = radar.months[0];

  const assistantTitle = scenarioActive
    ? simulated.firstNegativeMonth
      ? `A simulação cruza abaixo de zero em ${fullMonthLabel(simulated.firstNegativeMonth)}`
      : 'A simulação não cria saldo negativo nos 12 meses'
    : radar.firstNegativeMonth
      ? `O radar cruza abaixo de zero em ${fullMonthLabel(radar.firstNegativeMonth)}`
      : 'Não há saldo negativo projetado nos próximos 12 meses';

  const assistantText = scenarioActive
    ? simulated.firstNegativeMonth
      ? `No ponto mais baixo, a projeção chega a ${money.format(simulated.minimumBalance)}. O impacto acumulado da decisão no fechamento é ${money.format(finalImpact)}.`
      : `O menor saldo projetado depois da decisão é ${money.format(simulated.minimumBalance)} em ${fullMonthLabel(simulated.minimumMonth)}. O fechamento muda em ${money.format(finalImpact)}.`
    : radar.firstNegativeMonth
      ? `O menor saldo projetado é ${money.format(radar.minimumBalance)} em ${fullMonthLabel(radar.minimumMonth)}. Revise primeiro os compromissos anteriores a esse período.`
      : `A menor margem projetada é ${money.format(radar.minimumBalance)} em ${fullMonthLabel(radar.minimumMonth)}. Use o simulador antes de assumir um novo compromisso.`;

  return <section className="px-screen px-decision-center">
    <header className="px-screen-head">
      <div>
        <span className="px-kicker">Decisões</span>
        <h1>Planeje antes de lançar</h1>
        <p>Radar, simulação e leitura de impacto ficam fora da Home e são carregados somente quando você abre esta área.</p>
      </div>
      <div className="px-screen-head-aside"><span className="px-total-pill">Base atual {money.format(radar.currentBalance)}</span></div>
    </header>

    <nav className="px-decision-tabs" aria-label="Ferramentas de decisão">
      <button type="button" className={tab === 'radar' ? 'active' : ''} onClick={() => setTab('radar')}>Radar financeiro</button>
      <button type="button" className={tab === 'simulator' ? 'active' : ''} onClick={() => setTab('simulator')}>Simulador preditivo</button>
      <button type="button" className={tab === 'assistant' ? 'active' : ''} onClick={() => setTab('assistant')}>Assistente de decisão</button>
    </nav>

    {loadError ? <div className="px-decision-note is-warning"><strong>Leitura parcial</strong><span>O histórico completo não carregou; a tela está usando o período já disponível. {loadError}</span></div> : null}
    {!allEvents && !loadError ? <div className="px-decision-note"><span className="px-decision-spinner" aria-hidden="true" /><span>Carregando o histórico somente para esta área de planejamento…</span></div> : null}

    {tab === 'radar' ? <>
      <section className="px-screen-kpis px-decision-kpis">
        <article><span>Saldo monetário atual</span><strong>{money.format(radar.currentBalance)}</strong><small>Ponto de partida realizado</small></article>
        <article className={radar.minimumBalance < 0 ? 'danger' : ''}><span>Menor saldo projetado</span><strong>{money.format(radar.minimumBalance)}</strong><small>{fullMonthLabel(radar.minimumMonth)}</small></article>
        <article className={radar.firstNegativeMonth ? 'danger' : ''}><span>Primeiro mês negativo</span><strong>{radar.firstNegativeMonth ? monthLabel(radar.firstNegativeMonth) : 'Nenhum'}</strong><small>Horizonte de 12 meses</small></article>
        <article><span>Fechamento em 12 meses</span><strong>{money.format(radar.finalBalance)}</strong><small>Com o que já está cadastrado</small></article>
      </section>

      <section className="px-card px-decision-radar">
        <div className="px-panel-head"><div><span>Radar financeiro · 12 meses</span><h2>Onde o caixa aperta antes de acontecer</h2></div><small>Receitas e compromissos já cadastrados</small></div>
        <div className="px-decision-radar-grid">
          {radar.months.map((item) => <article className={`px-decision-month ${item.balance < 0 ? 'is-danger' : ''}`} key={item.month}>
            <header><strong>{monthLabel(item.month)}</strong><span>{item.eventCount} evento(s)</span></header>
            <div className="px-decision-bars">
              <span title={`Entradas ${money.format(item.income)}`}><i className="income" style={{ width: `${Math.min(100, item.income / maxMagnitude * 100)}%` }} /></span>
              <span title={`Saídas ${money.format(item.expense)}`}><i className="expense" style={{ width: `${Math.min(100, item.expense / maxMagnitude * 100)}%` }} /></span>
            </div>
            <dl><div><dt>Entradas</dt><dd>{money.format(item.income)}</dd></div><div><dt>Saídas</dt><dd>{money.format(item.expense)}</dd></div><div><dt>Saldo projetado</dt><dd>{money.format(item.balance)}</dd></div></dl>
          </article>)}
        </div>
      </section>
    </> : null}

    {tab === 'simulator' ? <div className="px-decision-two-columns">
      <section className="px-card px-decision-simulator">
        <div className="px-panel-head"><div><span>Simulador preditivo · 12 meses</span><h2>Teste uma decisão antes de lançar</h2></div><small>Nenhuma gravação é feita</small></div>
        <div className="px-decision-form">
          <label><span>Tipo de decisão</span><select value={scenarioKind} onChange={(event) => setScenarioKind(event.target.value as ScenarioKind)}><option value="expense">Nova despesa</option><option value="income">Nova receita</option></select></label>
          <label><span>Valor por mês</span><input inputMode="decimal" value={scenarioAmount} onChange={(event) => setScenarioAmount(event.target.value)} placeholder="0,00" /></label>
          <label><span>Começando em</span><select value={scenarioStart} onChange={(event) => setScenarioStart(event.target.value)}>{radar.months.map((item) => <option value={item.month} key={item.month}>{fullMonthLabel(item.month)}</option>)}</select></label>
          <label><span>Repetir por</span><select value={scenarioRepeats} onChange={(event) => setScenarioRepeats(Number(event.target.value))}>{Array.from({ length: 12 }, (_, index) => index + 1).map((count) => <option value={count} key={count}>{count} mês(es)</option>)}</select></label>
        </div>
        <div className="px-decision-sim-summary">
          <div><span>Impacto no fechamento</span><strong className={finalImpact < 0 ? 'negative' : finalImpact > 0 ? 'positive' : ''}>{money.format(finalImpact)}</strong></div>
          <div><span>Menor saldo depois da decisão</span><strong className={simulated.minimumBalance < 0 ? 'negative' : ''}>{money.format(simulated.minimumBalance)}</strong></div>
          <div><span>Primeiro mês negativo</span><strong>{simulated.firstNegativeMonth ? fullMonthLabel(simulated.firstNegativeMonth) : 'Nenhum'}</strong></div>
        </div>
      </section>

      <section className="px-card px-decision-impact">
        <div className="px-panel-head"><div><span>Antes x depois</span><h2>Impacto mensal da decisão</h2></div></div>
        <div className="px-decision-impact-list">{radar.months.map((item, index) => {
          const changed = Math.abs(simulated.months[index].balance - item.balance) >= 0.005;
          return <div key={item.month} className={changed ? 'is-changed' : ''}><strong>{monthLabel(item.month)}</strong><span>{money.format(item.balance)}</span><span>→</span><strong className={simulated.months[index].balance < 0 ? 'negative' : ''}>{money.format(simulated.months[index].balance)}</strong></div>;
        })}</div>
      </section>
    </div> : null}

    {tab === 'assistant' ? <div className="px-decision-two-columns">
      <section className={`px-card px-decision-assistant ${scenarioActive && simulated.firstNegativeMonth ? 'is-danger' : ''}`}>
        <span className="px-kicker">Assistente de decisão</span>
        <h2>{assistantTitle}</h2>
        <p>{assistantText}</p>
        <div className="px-decision-assistant-stats">
          <div><span>Margem mínima</span><strong>{money.format(scenarioActive ? simulated.minimumBalance : radar.minimumBalance)}</strong></div>
          <div><span>Impacto da simulação</span><strong className={finalImpact < 0 ? 'negative' : finalImpact > 0 ? 'positive' : ''}>{scenarioActive ? money.format(finalImpact) : '—'}</strong></div>
          <div><span>Variação do ponto mínimo</span><strong className={minImpact < 0 ? 'negative' : minImpact > 0 ? 'positive' : ''}>{scenarioActive ? money.format(minImpact) : '—'}</strong></div>
        </div>
        <small>Leitura determinística baseada apenas nos lançamentos, contas e parcelas de cartão carregados no MEG. Não grava nem altera dados.</small>
      </section>

      <section className="px-card px-decision-assistant">
        <span className="px-kicker">Agora</span>
        <h2>O que merece atenção primeiro</h2>
        <div className="px-decision-action-list">
          <div><span>Compromissos deste mês</span><strong>{money.format(currentMonthRows?.expense || 0)}</strong></div>
          <div><span>Receitas previstas deste mês</span><strong>{money.format(currentMonthRows?.income || 0)}</strong></div>
          <div><span>Saldo ao fim deste mês</span><strong className={(currentMonthRows?.balance || 0) < 0 ? 'negative' : ''}>{money.format(currentMonthRows?.balance || radar.currentBalance)}</strong></div>
          <div><span>Pior ponto dos 12 meses</span><strong className={radar.minimumBalance < 0 ? 'negative' : ''}>{money.format(radar.minimumBalance)}</strong></div>
        </div>
      </section>
    </div> : null}
  </section>;
}
