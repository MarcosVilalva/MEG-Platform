import { useEffect, useMemo, useState } from 'react';
import { normalizeEvents, type LegacyTransaction } from '@core/finance/events';
import { readCloudState } from '../../app/app-state-client';
import { readSession } from '../../app/auth-client';
import { useAppStore } from '../../app/store';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const iso = (value: string) => String(value || '').slice(0, 10);
const statusLabel: Record<string, string> = { planned: 'Pendente', confirmed: 'Confirmado', paid: 'Pago', reconciled: 'Conciliado', archived: 'Arquivado' };
type NormalizedEvent = ReturnType<typeof normalizeEvents>[number];

export function History() {
  const selectedMonth = useAppStore((state) => state.selectedMonth);
  const periodMode = useAppStore((state) => state.periodMode);
  const periodStart = useAppStore((state) => state.periodStart);
  const periodEnd = useAppStore((state) => state.periodEnd);
  const [source, setSource] = useState<LegacyTransaction[]>([]);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState<NormalizedEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const userName = readSession()?.user.name || 'Usuário';

  useEffect(() => {
    let active = true; setLoading(true); setError('');
    void readCloudState().then((result) => { if (active) setSource(result.state.transactions); })
      .catch(() => { if (active) setError('Não foi possível carregar o histórico da base compartilhada.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const items = useMemo(() => normalizeEvents(source).filter((item) => {
    const date = iso(item.date);
    const inPeriod = periodMode === 'all' || (periodMode === 'range' ? date >= periodStart && date <= periodEnd : date.startsWith(selectedMonth));
    const matchesText = `${item.description} ${item.group || ''} ${item.category || ''} ${item.account || ''}`.toLowerCase().includes(search.trim().toLowerCase());
    return inPeriod && matchesText && (type === 'all' || item.type === type) && (status === 'all' || item.status === status);
  }).sort((a, b) => iso(b.date).localeCompare(iso(a.date))), [source, selectedMonth, periodMode, periodStart, periodEnd, search, type, status]);

  useEffect(() => { if (!selected || !items.some((item) => item.id === selected.id)) setSelected(items[0] || null); }, [items, selected]);

  return <section id="history" className="page meg-screen history-screen" aria-busy={loading}>
    <header className="page-head screen-heading"><div><span>HISTÓRICO</span><h1>Atividade dos lançamentos</h1><p>Consulta separada do formulário, do mais novo para o mais antigo.</p></div></header>
    {error && <div className="notice danger">{error}</div>}
    <section className="history-kpis history-summary"><article><span>ATIVIDADES NO PERÍODO</span><strong>{items.length}</strong></article><article><span>USUÁRIO ATIVO</span><strong>{userName}</strong></article><article><span>AGUARDANDO SINCRONIZAÇÃO</span><strong className="positive">0</strong></article></section>
    <div className="history-filters"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar descrição, grupo, conta ou usuário"/><select value={type} onChange={(event) => setType(event.target.value)}><option value="all">Todas as ações</option><option value="income">Receitas</option><option value="expense">Despesas</option></select><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Todas as situações</option><option value="planned">Pendentes</option><option value="paid">Pagos</option><option value="reconciled">Conciliados</option></select></div>
    <div className="history-layout"><article className="history-feed meg-panel"><header><div><span>MAIS RECENTES</span><h2>Ordem cronológica</h2></div></header>{items.map((item) => <button key={item.id} className={`history-event ${selected?.id === item.id ? 'active' : ''}`} onClick={() => setSelected(item)}><span className="history-event-icon">{item.type === 'income' ? '+' : item.status === 'paid' ? '✓' : '−'}</span><span><strong>{item.description}</strong><small>{userName} · {statusLabel[item.status] || item.status}</small></span><time>{new Date(`${iso(item.date)}T12:00:00`).toLocaleDateString('pt-BR')}</time></button>)}{!loading && !items.length && <p className="empty-state">Nenhuma atividade corresponde aos filtros.</p>}</article>
      <aside className="history-detail meg-panel"><header><div><span>DETALHES DA ATIVIDADE</span><h2>{selected?.description || 'Selecione um lançamento'}</h2></div>{selected && <span className={`status ${selected.status}`}>{statusLabel[selected.status] || selected.status}</span>}</header>{selected && <><div className="history-meta"><div><span>Usuário</span><strong>{userName}</strong></div><div><span>Data</span><strong>{new Date(`${iso(selected.date)}T12:00:00`).toLocaleDateString('pt-BR')}</strong></div><div><span>Conta</span><strong>{selected.account || 'Não informada'}</strong></div><div><span>Sincronização</span><strong className="positive">Confirmada</strong></div></div><div className="history-compare"><article><span>TIPO</span><strong>{selected.type === 'income' ? 'Receita' : 'Despesa'}</strong></article><article><span>VALOR PRESERVADO</span><strong>{money.format(selected.amount)}</strong></article></div><div className="notice">Este histórico é somente leitura. Correções geram uma nova alteração e preservam o registro anterior.</div></>}</aside>
    </div>
  </section>;
}
