import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from '../shell/AppShell';
import '../styles/tokens.css';
import '../styles/base.css';
import { DataGrid } from './DataGrid';
import { createDataGridHarnessRows, dataGridHarnessColumns } from './harness-fixture';
import './datagrid.css';

function DataGridHarness() {
  const stateMode = new URLSearchParams(window.location.search).get('state') ?? 'default';
  const rows = useMemo(
    () => createDataGridHarnessRows(640, stateMode === 'visual' ? new Date('2026-10-08T12:00:00') : new Date()),
    [stateMode],
  );
  const sourceRows = stateMode === 'empty' ? [] : rows;
  const [filteredCount, setFilteredCount] = useState(sourceRows.length);

  return (
    <AppShell>
      <section className="meg-datagrid-harness" aria-label="Harness técnico do DataGrid">
        <header className="meg-datagrid-harness__head">
          <div>
            <h1>DataGrid técnico</h1>
            <p>Harness isolado da Etapa 04 · {filteredCount} de {sourceRows.length} registros técnicos</p>
          </div>
        </header>

        <DataGrid
          data={sourceRows}
          columns={dataGridHarnessColumns}
          pageSize={600}
          groupBy="segment"
          selectable
          footerAggregates
          rowKey="id"
          persistenceKey={stateMode === 'default' ? 'stage-04-harness' : `stage-04-harness-${stateMode}`}
          loading={stateMode === 'loading'}
          ariaLabel="DataGrid técnico da Etapa 04"
          onFilterChange={({ filteredCount: nextCount }) => setFilteredCount(nextCount)}
        />
      </section>
    </AppShell>
  );
}

const root = document.getElementById('meg-web-evolution-datagrid-root');
if (!root) throw new Error('MEG_WEB_EVOLUTION_DATAGRID_ROOT_NOT_FOUND');

createRoot(root).render(
  <React.StrictMode>
    <DataGridHarness />
  </React.StrictMode>,
);
