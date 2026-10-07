import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from '../shell/AppShell';
import '../styles/tokens.css';
import '../styles/base.css';
import { DataGrid } from './DataGrid';
import { createDataGridHarnessRows, dataGridHarnessColumns } from './harness-fixture';
import './datagrid.css';

function DataGridHarness() {
  const rows = useMemo(() => createDataGridHarnessRows(640, new Date()), []);
  const [filteredCount, setFilteredCount] = useState(rows.length);

  return (
    <AppShell>
      <section className="meg-datagrid-harness" aria-label="Harness técnico do DataGrid">
        <header className="meg-datagrid-harness__head">
          <div>
            <h1>DataGrid técnico</h1>
            <p>Harness isolado da Etapa 04 · {filteredCount} de {rows.length} registros técnicos</p>
          </div>
        </header>

        <DataGrid
          data={rows}
          columns={dataGridHarnessColumns}
          pageSize={600}
          groupBy="segment"
          selectable
          footerAggregates
          rowKey="id"
          persistenceKey="stage-04-harness"
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
