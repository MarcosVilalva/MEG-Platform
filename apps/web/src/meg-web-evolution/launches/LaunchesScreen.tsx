import { useCallback, useEffect, useMemo, useState } from 'react';
import { financeClient, type FinancialEvent } from '../../app/finance-client';
import { DataGrid } from '../datagrid/DataGrid';
import type { DataGridColumn } from '../datagrid/types';
import { loadAuthorizedEventHistory, toEventGridRows, type EventGridRow, type LoadProgress } from './history';
import './launches.css';
import { NewLaunchForm } from './NewLaunchForm';

type Props = { userId: string; userName: string; canCreate?: boolean; newLaunchToken?: number };

const eventTypes = {
  income: { label: 'Receita' },
  expense: { label: 'Despesa' },
  transfer: { label: 'Transferência' },
  investment: { label: 'Investimento' },
  redemption: { label: 'Resgate' },
  adjustment: { label: 'Ajuste' },
};
const eventStatuses = {
  draft: { label: 'Rascunho' },
  planned: { label: 'Planejado' },
  confirmed: { label: 'Confirmado' },
  paid: { label: 'Pago' },
  reconciled: { label: 'Conciliado' },
  archived: { label: 'Arquivado' },
};

export function LaunchesScreen({ userId, userName, canCreate = false, newLaunchToken = 0 }: Props) {
  const [events, setEvents] = useState<FinancialEvent[] | null>(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState<LoadProgress>({ loaded: 0, total: 0 });
  const [reloadVersion, setReloadVersion] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');
  useEffect(() => { if (newLaunchToken > 0 && canCreate) setShowNew(true); }, [newLaunchToken, canCreate]);

  useEffect(() => {
    const controller = new AbortController();
    setEvents(null);
    setError('');
    setProgress({ loaded: 0, total: 0 });
    setDetailId(null);
    void loadAuthorizedEventHistory(
      (page, pageSize, search, signal) => financeClient.listEvents(page, pageSize, search, signal),
      controller.signal,
      status => { if (!controller.signal.aborted) setProgress(status); },
    ).then(items => {
      if (!controller.signal.aborted) setEvents(items);
    }).catch(cause => {
      if (!controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : 'Não foi possível consultar o histórico.');
      }
    });
    return () => controller.abort();
  }, [userId, reloadVersion]);

  const records = useMemo(() => events ? toEventGridRows(events) : [], [events]);
  const selected = events?.find(item => item.id === detailId);
  const columns = useMemo<DataGridColumn<EventGridRow>[]>(() => [
    { key: 'date', label: 'Data', type: 'date', width: 145, sortable: true, filterable: true },
    { key: 'description', label: 'Descrição', type: 'text', width: 280, sortable: true, filterable: true,
      render: (_value, row) => (
        <button
          className="meg-launches__detail-button"
          type="button"
          aria-label={'Ver detalhes: ' + row.description}
          onClick={() => setDetailId(row.id)}
        >{row.description}</button>
      ),
    },
    { key: 'type', label: 'Tipo', type: 'enum', width: 145, sortable: true, filterable: true, enumValues: eventTypes },
    { key: 'status', label: 'Situação', type: 'enum', width: 155, sortable: true, filterable: true, enumValues: eventStatuses },
    { key: 'account', label: 'Conta', type: 'text', width: 180, sortable: true, filterable: true },
    { key: 'category', label: 'Categoria', type: 'text', width: 180, sortable: true, filterable: true },
    { key: 'paymentMethod', label: 'Forma de pagamento', type: 'text', width: 180, sortable: true, filterable: true },
    { key: 'competence', label: 'Competência', type: 'text', width: 140, sortable: true, filterable: true },
    { key: 'amount', label: 'Valor (R$)', type: 'currency', width: 160, sortable: true, filterable: true },
    { key: 'signedAmount', label: 'Valor registrado (R$)', type: 'currency', width: 200, sortable: true, filterable: true },
  ], []);

  const refresh = useCallback(() => setReloadVersion(version => version + 1), []);

  return (
    <section className="meg-launches" aria-label="Lançamentos financeiros">
      <header className="meg-launches__header">
        <div>
          <h1>Lançamentos</h1>
          <p>Histórico financeiro autorizado, carregado da API. A busca, os filtros e as exportações abrangem todos os registros carregados.</p>
        </div>
        <div className="meg-launches__actions">
          {canCreate && <button type="button" className="meg-launches__refresh" onClick={() => setShowNew(true)}>+ Novo lançamento</button>}
          <button type="button" className="meg-launches__refresh" onClick={refresh} disabled={events === null && !error}>Atualizar consulta</button>
        </div>
      </header>

      {savedNotice && <p className="meg-launches__message" role="status">{savedNotice}</p>}
      {!canCreate && <p className="meg-launches__count">Acesso de consulta. Sua sessão não possui permissão de gravação.</p>}
      {showNew && canCreate && <NewLaunchForm history={events ?? []} onClose={() => setShowNew(false)} onSaved={event => {
        setShowNew(false);
        setSavedNotice('Gravação confirmada pelo servidor: ' + event.description + '. Atualizando histórico...');
        refresh();
      }} />}
      {events === null ? (
        <div className="meg-launches__message" role={error ? 'alert' : 'status'} aria-live="polite">
          {error ? (
            <>
              <p>{error}</p>
              <button type="button" onClick={refresh}>Tentar novamente</button>
            </>
          ) : <p>Carregando histórico autorizado: {progress.loaded.toLocaleString('pt-BR')} de {progress.total ? progress.total.toLocaleString('pt-BR') : '...'} registros. Filtros e exportações serão liberados após a consulta completa.</p>}
        </div>
      ) : (
        <>
          <p className="meg-launches__count" role="status">
            {filteredCount.toLocaleString('pt-BR')} de {records.length.toLocaleString('pt-BR')} registros no histórico completo.
            A coluna “Valor registrado” mostra o sinal armazenado pela API, não o saldo bancário.
          </p>
          <div className="meg-launches__grid">
            <DataGrid<EventGridRow>
              data={records}
              columns={columns}
              rowKey="id"
              pageSize={25}
              selectable
              footerAggregates={false}
              persistenceKey={'finance-events-' + userId}
              exportUserName={userName}
              exportPeriod="Histórico completo autorizado"
              pdfMaxRows={Math.max(1, records.length)}
              ariaLabel="Histórico completo de lançamentos financeiros"
              onFilterChange={({ filteredCount: count }) => setFilteredCount(count)}
            />
          </div>
          {selected && (
            <aside className="meg-launches__details" aria-label="Detalhes do lançamento">
              <div className="meg-launches__detail-heading">
                <h2>Detalhes do lançamento</h2>
                <button type="button" onClick={() => setDetailId(null)}>Fechar detalhes</button>
              </div>
              <dl>
                <div><dt>Descrição</dt><dd>{selected.description}</dd></div>
                <div><dt>Data</dt><dd>{selected.date.slice(0, 10)}</dd></div>
                <div><dt>Tipo</dt><dd>{eventTypes[selected.type as keyof typeof eventTypes]?.label ?? selected.type}</dd></div>
                <div><dt>Situação</dt><dd>{eventStatuses[selected.status as keyof typeof eventStatuses]?.label ?? selected.status}</dd></div>
                <div><dt>Conta</dt><dd>{selected.account?.name ?? 'Sem conta'}</dd></div>
                <div><dt>Categoria</dt><dd>{selected.category?.name ?? 'Sem categoria'}</dd></div>
                <div><dt>Forma de pagamento</dt><dd>{selected.paymentMethod?.name ?? 'Não informada'}</dd></div>
                <div><dt>Observações</dt><dd>{selected.notes || 'Não informadas'}</dd></div>
              </dl>
            </aside>
          )}
        </>
      )}
    </section>
  );
}
