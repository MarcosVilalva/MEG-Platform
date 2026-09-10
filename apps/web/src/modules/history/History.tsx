import { useEffect, useMemo, useState } from 'react';
import { financeClient, type FinancialEvent } from '../../app/finance-client';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const statusLabel: Record<string, string> = { draft: 'Rascunho', planned: 'Pendente', confirmed: 'Confirmado', paid: 'Pago', reconciled: 'Conciliado', archived: 'Arquivado' };

export function History() {
  const [items, setItems] = useState<FinancialEvent[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => { void financeClient.listEvents(1, 500).then((result) => setItems(result.items)).finally(() => setLoading(false)); }, []);
  const visible = useMemo(() => items.filter((item) => `${item.description} ${item.category?.name || ''} ${item.account?.name || ''}`.toLowerCase().includes(search.toLowerCase())), [items, search]);
  return <section className="meg-screen">
    <header className="screen-heading"><div><span>RASTREABILIDADE</span><h1>Histórico financeiro</h1><p>Consulte os eventos registrados sem alterar a origem dos dados.</p></div></header>
    <div className="meg-panel"><div className="filter-row"><label className="search-field">⌕<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar no histórico" /></label><span className="filter-count">{visible.length} registro(s)</span></div>
      <div className="table-scroll"><table className="meg-table"><thead><tr><th>Data</th><th>Descrição</th><th>Tipo</th><th>Grupo</th><th>Conta</th><th>Situação</th><th>Valor</th></tr></thead><tbody>{visible.map((item) => <tr key={item.id}><td>{new Date(`${item.date}T12:00:00`).toLocaleDateString('pt-BR')}</td><td><strong>{item.description}</strong><small>Evento preservado na base</small></td><td>{item.type === 'income' ? 'Receita' : 'Despesa'}</td><td>{item.category?.name || item.sourceDetails?.group || 'Sem grupo'}</td><td>{item.account?.name || 'Não informada'}</td><td><span className={`status ${item.status}`}>{statusLabel[item.status] || item.status}</span></td><td className={item.type === 'income' ? 'positive' : 'negative'}>{money.format(Math.abs(Number(item.amount)))}</td></tr>)}</tbody></table>{!loading && !visible.length && <div className="empty-state">Nenhum registro encontrado.</div>}</div>
    </div>
  </section>;
}
