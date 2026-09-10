import { useEffect, useMemo, useState } from 'react';
import { financeClient, type FinancialEvent } from '../../app/finance-client';
import { useAppStore } from '../../app/store';
import { useFinanceSummary } from '../../app/use-finance-summary';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
function monthTitle(value: string) { const [year, month] = value.split('-').map(Number); const label = new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); return label.charAt(0).toUpperCase() + label.slice(1); }

export function Dashboard({ onNewTransaction: _onNewTransaction }: { onNewTransaction: () => void }) {
  const selectedMonth = useAppStore((state) => state.selectedMonth);
  const { summary, loading, error } = useFinanceSummary(selectedMonth);
  const [events, setEvents] = useState<FinancialEvent[]>([]);
  useEffect(() => { void financeClient.listEvents(1, 200).then((data) => setEvents(data.items)).catch(() => undefined); }, [selectedMonth]);
  const monthEvents = useMemo(() => events.filter((event) => event.date.startsWith(selectedMonth)), [events, selectedMonth]);
  const benefit = monthEvents.filter((event) => /benef|aliment|vero/i.test(`${event.description} ${event.category?.name || ''} ${event.account?.name || ''}`)).reduce((sum, event) => sum + Math.abs(Number(event.amount)), 0);
  const recent = monthEvents.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  const gap = Math.min(0, summary?.projectedResult || 0);
  const realizedBalance = (summary?.availableBalance || 0) + (summary?.realizedResult || 0);
  return <section className="meg-screen dashboard-screen" aria-busy={loading}>
    <header className="screen-heading"><div><span>VISÃO GERAL</span><h1>{monthTitle(selectedMonth)}</h1><p>Leitura do mês com os dados preservados na base financeira do MEG.</p><small>Atualizado agora · dados sincronizados</small></div></header>
    {error && <div className="notice danger">Não foi possível carregar os indicadores financeiros.</div>}
    <section className="balance-card"><div><span>SALDO MONETÁRIO REALIZADO</span><strong>{money.format(realizedBalance)}</strong><p>Saldo anterior mais receitas recebidas, menos despesas efetivamente pagas.</p></div><dl><div><dt>Saldo anterior</dt><dd>{money.format(summary?.availableBalance || 0)}</dd></div><div><dt>Receitas do mês</dt><dd>{money.format(summary?.income || 0)}</dd></div><div><dt>Receita disponível</dt><dd>{money.format((summary?.availableBalance || 0) + (summary?.income || 0))}</dd></div></dl></section>
    <section className={`attention-card ${gap < 0 ? 'danger' : 'ok'}`}><div><span>{gap < 0 ? '!' : '✓'}</span><div><h2>{gap < 0 ? 'Mês exige atenção' : 'Mês sob controle'}</h2><p>O diagnóstico considera o mês corrente e não é mascarado pelos filtros analíticos.</p></div></div><div><small>{gap < 0 ? 'FALTA PROJETADA PARA FECHAR O MÊS' : 'RESULTADO PROJETADO'}</small><strong>{money.format(gap < 0 ? gap : summary?.projectedResult || 0)}</strong></div></section>
    <section className="dashboard-metrics"><article><span>DESPESAS PAGAS</span><strong>{money.format(summary?.realizedExpense || 0)}</strong><p>Reduzem o saldo realizado</p></article><article><span>DESPESAS PENDENTES</span><strong>{money.format(summary?.pendingAmount || 0)}</strong><p>Não reduzem o realizado até a baixa</p></article><article><span>BENEFÍCIO ALIMENTAÇÃO</span><strong>{money.format(benefit)}</strong><p>Conta separada da caixa monetária</p></article><article><span>CONSOLIDADO REALIZADO</span><strong>{money.format(realizedBalance + benefit)}</strong><p>Monetário + benefício do período</p></article></section>
    <section className="dashboard-lower"><article className="meg-panel"><header><div><span>HISTÓRICO RECENTE</span><h2>Últimos lançamentos</h2></div></header><div className="compact-list">{recent.map((event) => <div key={event.id}><div><strong>{event.description}</strong><small>{new Date(`${event.date}T12:00:00`).toLocaleDateString('pt-BR')} · {event.category?.name || 'Sem grupo'}</small></div><span className={`status ${event.status}`}>{event.status === 'paid' ? 'Pago' : event.status === 'confirmed' ? 'Confirmado' : 'Atualizado'}</span></div>)}{!recent.length && <p className="empty-state">Nenhum lançamento no período.</p>}</div></article>
      <article className="meg-panel due-agenda"><header><div><span>AGENDA FINANCEIRA</span><h2>Vencimentos agrupados</h2></div><strong>{money.format(summary?.pendingAmount || 0)}</strong></header><div className="due-row overdue"><b>Vencidos</b><span>Compromissos anteriores</span><button>Detalhes</button></div><div className="due-row"><b>Fatura</b><span>Compras do mesmo cartão</span><button>Detalhes</button></div><div className="due-row"><b>Próximos</b><span>Hoje, amanhã e próximos dias</span><button>Detalhes</button></div></article></section>
  </section>;
}
