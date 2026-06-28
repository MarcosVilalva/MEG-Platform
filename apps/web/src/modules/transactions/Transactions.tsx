import { useMemo, useState } from 'react';
import { normalizeEvents } from '@core/finance/events';
import { statusLabel } from '@core/finance/lifecycle';
import { useAppStore } from '../../app/store';
import { MEGBadge, MEGButton, MEGCard } from '@ui';
import type { LegacyTransaction } from '@core/finance/events';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

interface TransactionsProps {
  onNewTransaction: () => void;
  onEditTransaction: (transaction: LegacyTransaction) => void;
}

export function Transactions({ onNewTransaction, onEditTransaction }: TransactionsProps) {
  const {
    transactions,
    markAsPaid,
    markAsReconciled,
    deleteTransaction,
    duplicateTransaction
  } = useAppStore();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');

  const events = useMemo(() => normalizeEvents(transactions), [transactions]);

  const groups = useMemo(() => {
    return ['all', ...Array.from(new Set(events.map((event) => event.group || 'Não informado'))).sort()];
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const text = [
        event.description,
        event.group,
        event.category,
        event.paymentMethod,
        event.account
      ].join(' ').toLowerCase();

      const matchesSearch = text.includes(search.toLowerCase());
      const matchesType = typeFilter === 'all' || event.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
      const matchesGroup = groupFilter === 'all' || (event.group || 'Não informado') === groupFilter;

      return matchesSearch && matchesType && matchesStatus && matchesGroup;
    });
  }, [events, search, typeFilter, statusFilter, groupFilter]);

  function confirmDelete(id: string) {
    const event = events.find((item) => item.id === id);
    const ok = confirm(`Excluir lançamento?\n\n${event?.description || 'Lançamento'}\nEsta ação não pode ser desfeita.`);
    if (ok) deleteTransaction(id);
  }

  function originalTransaction(id: string) {
    return transactions.find((transaction) => transaction.id === id);
  }

  return (
    <section className="page">
      <header className="page-header compact">
        <div>
          <span>Movimentações</span>
          <h1>Eventos financeiros</h1>
          <p>Busca, filtros, edição, duplicação e exclusão.</p>
        </div>
        <MEGButton onClick={onNewTransaction}>Novo lançamento</MEGButton>
      </header>

      <MEGCard>
        <div className="transactions-toolbar">
          <label>
            Buscar
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Digite descrição, grupo, forma..."
            />
          </label>

          <label>
            Tipo
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value="all">Todos</option>
              <option value="income">Receitas</option>
              <option value="expense">Despesas</option>
            </select>
          </label>

          <label>
            Status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">Todos</option>
              <option value="planned">Previsto</option>
              <option value="paid">Pago</option>
              <option value="reconciled">Conciliado</option>
            </select>
          </label>

          <label>
            Grupo
            <select value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)}>
              {groups.map((group) => (
                <option value={group} key={group}>{group === 'all' ? 'Todos' : group}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="table">
          <div className="table-row table-head">
            <span>Data</span>
            <span>Descrição</span>
            <span>Grupo</span>
            <span>Status</span>
            <span>Valor</span>
            <span>Ações</span>
          </div>
          {filteredEvents.map((event) => (
            <div
              className="table-row"
              key={event.id}
              onDoubleClick={() => {
                const original = originalTransaction(event.id);
                if (original) onEditTransaction(original);
              }}
            >
              <span>{event.date}</span>
              <strong>{event.description}</strong>
              <span>{event.group || '-'}</span>
              <MEGBadge tone={event.status === 'planned' ? 'warning' : event.status === 'paid' ? 'good' : 'info'}>
                {statusLabel(event.status)}
              </MEGBadge>
              <strong className={event.signedAmount >= 0 ? 'positive' : 'negative'}>
                {brl.format(Math.abs(event.signedAmount))}
              </strong>
              <div className="table-actions">
                {event.status === 'planned' && event.signedAmount < 0 && (
                  <button onClick={() => markAsPaid(event.id)}>Pagar</button>
                )}
                {event.status === 'paid' && (
                  <button onClick={() => markAsReconciled(event.id)}>Conciliar</button>
                )}
                <button onClick={() => {
                  const original = originalTransaction(event.id);
                  if (original) onEditTransaction(original);
                }}>Editar</button>
                <button onClick={() => duplicateTransaction(event.id)}>Duplicar</button>
                <button className="danger" onClick={() => confirmDelete(event.id)}>Excluir</button>
              </div>
            </div>
          ))}
        </div>

        {!filteredEvents.length && <div className="empty-state">Nenhum lançamento encontrado para os filtros aplicados.</div>}
      </MEGCard>
    </section>
  );
}
