import { useMemo, useState } from 'react';
import type { PhoenixReadModel } from '../contracts';
import {
  buildPhoenixPdf,
  buildPhoenixXlsx,
  detectPhoenixColumnKinds,
  phoenixExportFilename,
  type PhoenixExportReport,
} from '../table-export-core';
import { megAlert } from '../meg-confirm';

type ReportKind = 'executive' | 'movements' | 'payables' | 'receivables' | 'audit';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' });
const dateTime = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

function monthLabel(value: string) {
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, 1)))
    .replace(/^./, (letter) => letter.toUpperCase());
}

function brDate(value: string) {
  const raw = String(value ?? '').trim();
  const isoDate = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
  if (isoDate) return `${isoDate[3]}/${isoDate[2]}/${isoDate[1]}`;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw.slice(0, 10) : date.format(parsed);
}

function brDateTime(value: string) {
  const raw = String(value ?? '').trim();
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(`${raw}T12:00:00-03:00`)
    : new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : dateTime.format(parsed);
}

function reportBase(data: PhoenixReadModel, title: string, headers: string[], rows: string[][]): PhoenixExportReport {
  const { kinds, sums } = detectPhoenixColumnKinds(headers, rows);
  return {
    systemName: 'MEG Finanças',
    title,
    period: monthLabel(data.month),
    filters: [],
    generatedAt: new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(new Date()),
    recordCount: rows.length,
    headers,
    rows,
    kinds,
    sums,
  };
}

function buildReport(data: PhoenixReadModel, kind: ReportKind): PhoenixExportReport {
  if (kind === 'executive') {
    const currentBalance = Number(data.summary.availableBalance || 0) + Number(data.summary.realizedResult || 0);
    const headers = ['Indicador', 'Valor'];
    const rows = [
      ['Saldo monetário atual', money.format(currentBalance)],
      ['Saldo benefício', money.format(Number(data.summary.benefitBalance || 0))],
      ['Receitas realizadas', money.format(Number(data.summary.realizedIncome || 0))],
      ['Despesas realizadas', money.format(Number(data.summary.realizedExpense || 0))],
      ['Pendências em aberto', money.format(Number(data.summary.pendingAmount || 0))],
      ['Quantidade de pendências', String(data.summary.pendingCount || 0)],
      ['Resultado projetado', money.format(Number(data.summary.projectedResult || 0))],
      ['Lançamentos no período', String(data.summary.eventCount || 0)],
      ['Contas ativas', String(data.accounts.filter((item) => item.isActive).length)],
      ['Cartões ativos', String(data.cards.filter((item) => item.isActive).length)],
    ];
    return reportBase(data, 'Relatório Executivo', headers, rows);
  }

  if (kind === 'movements') {
    const headers = ['Data', 'Descrição', 'Tipo', 'Situação', 'Conta', 'Classificação', 'Forma', 'Valor'];
    const rows = data.events.items.map((event) => [
      brDate(event.date),
      event.description,
      event.type,
      event.status,
      event.account?.name || '—',
      event.category?.name || '—',
      event.paymentMethod?.name || '—',
      money.format(Number(event.signedAmount || 0)),
    ]);
    return reportBase(data, 'Lançamentos Financeiros', headers, rows);
  }

  if (kind === 'payables') {
    const headers = ['Vencimento', 'Descrição', 'Parcela', 'Classificação', 'Total', 'Em aberto', 'Situação'];
    const rows = data.payables.map((item) => [
      brDate(item.dueDate),
      item.description,
      `${item.installmentNo}/${item.installmentQty}`,
      item.category?.name || '—',
      money.format(Number(item.totalAmount || 0)),
      money.format(Number(item.openAmount || 0)),
      item.status,
    ]);
    return reportBase(data, 'Pendências e Compromissos', headers, rows);
  }

  if (kind === 'receivables') {
    const headers = ['Vencimento', 'Descrição', 'Cliente', 'Parcela', 'Total', 'Em aberto', 'Situação'];
    const rows = data.receivables.map((item) => [
      brDate(item.dueDate),
      item.description,
      item.customer?.name || '—',
      `${item.installmentNo}/${item.installmentQty}`,
      money.format(Number(item.totalAmount || 0)),
      money.format(Number(item.openAmount || 0)),
      item.status,
    ]);
    return reportBase(data, 'Contas a Receber', headers, rows);
  }

  const headers = ['Data/hora', 'Usuário', 'Entidade', 'Ação', 'Identificador'];
  const rows = data.financialAudit.items.map((item) => [
    brDateTime(item.at),
    item.actor?.name || item.actor?.email || 'Sistema',
    item.entity,
    item.action,
    item.entityId,
  ]);
  return reportBase(data, 'Auditoria Financeira', headers, rows);
}

function download(bytes: Uint8Array, type: string, filename: string) {
  const payload = new Uint8Array(bytes.byteLength);
  payload.set(bytes);
  const blob = new Blob([payload.buffer], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 15000);
}

const cards: Array<{ id: ReportKind; title: string; description: string; accent: string }> = [
  { id: 'executive', title: 'Relatório executivo', description: 'Resumo gerencial do período, saldos, realizado, projetado e indicadores operacionais.', accent: 'executive' },
  { id: 'movements', title: 'Lançamentos', description: 'Base financeira do período com conta, classificação, forma, situação e valor.', accent: 'movements' },
  { id: 'payables', title: 'Pendências', description: 'Compromissos, vencimentos, parcelas, valores em aberto e situação atual.', accent: 'payables' },
  { id: 'receivables', title: 'Contas a receber', description: 'Títulos, clientes, vencimentos, recebimentos e saldos ainda em aberto.', accent: 'receivables' },
  { id: 'audit', title: 'Auditoria financeira', description: 'Rastro das principais mutações financeiras confirmadas no ambiente compartilhado.', accent: 'audit' },
];

export function PhoenixReportsCenter({ data }: { data: PhoenixReadModel }) {
  const [selected, setSelected] = useState<ReportKind>('executive');
  const [busy, setBusy] = useState<'xlsx' | 'pdf' | ''>('');
  const report = useMemo(() => buildReport(data, selected), [data, selected]);
  const current = cards.find((item) => item.id === selected) || cards[0];

  function exportReport(format: 'xlsx' | 'pdf') {
    if (busy || !report.rows.length) return;
    setBusy(format);
    try {
      const bytes = format === 'xlsx' ? buildPhoenixXlsx(report) : buildPhoenixPdf(report);
      if (!bytes.byteLength) throw new Error('EXPORT_EMPTY');
      download(
        bytes,
        format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf',
        phoenixExportFilename(report, format),
      );
    } catch {
      void megAlert({
        kicker: 'Exportação',
        title: 'Não foi possível gerar o arquivo',
        message: `O MEG não confirmou a geração do ${format === 'xlsx' ? 'Excel' : 'PDF'}. Nenhum arquivo incompleto foi baixado.`,
        danger: true,
        buttonLabel: 'Fechar',
      });
    } finally {
      window.setTimeout(() => setBusy(''), 240);
    }
  }

  return <section className="px-screen meg-web-reports meg-web-reports-revolution">
    <header className="px-screen-head">
      <div><span className="px-kicker">Relatórios e exportações</span><h1>Central de saída e análise</h1><p>Transforme os dados confirmados do MEG em relatórios de apoio, planilhas de trabalho e documentos para conferência. A exportação respeita o período financeiro carregado.</p></div>
      <div className="px-screen-head-aside"><span className="px-status reconciled">Período · {monthLabel(data.month)}</span></div>
    </header>

    <section className="meg-web-report-grid">
      {cards.map((item) => {
        const candidate = buildReport(data, item.id);
        return <button type="button" key={item.id} className={`meg-web-report-card ${selected === item.id ? 'active' : ''} ${item.accent}`} onClick={() => setSelected(item.id)}>
          <span className="meg-web-report-card-mark" aria-hidden="true">{item.id === 'executive' ? '◆' : item.id === 'audit' ? '✓' : '▦'}</span>
          <span><small>RELATÓRIO</small><strong>{item.title}</strong><em>{item.description}</em></span>
          <b>{candidate.recordCount}</b>
        </button>;
      })}
    </section>

    <section className="px-card meg-web-report-workspace">
      <header className="meg-web-report-head">
        <div><span className="px-kicker">Prévia</span><h2>{current.title}</h2><p>{current.description}</p></div>
        <div className="meg-web-report-actions">
          <button type="button" className="excel" disabled={busy !== '' || !report.rows.length} onClick={() => exportReport('xlsx')}>{busy === 'xlsx' ? 'Gerando…' : 'Exportar Excel'}</button>
          <button type="button" className="pdf" disabled={busy !== '' || !report.rows.length} onClick={() => exportReport('pdf')}>{busy === 'pdf' ? 'Gerando…' : 'Exportar PDF'}</button>
          <button type="button" disabled={!report.rows.length} onClick={() => window.print()}>Imprimir</button>
        </div>
      </header>

      <div className="meg-web-report-meta">
        <span><small>Período</small><strong>{report.period}</strong></span>
        <span><small>Registros</small><strong>{report.recordCount}</strong></span>
        <span><small>Fonte</small><strong>Base financeira confirmada</strong></span>
        <span><small>Formato</small><strong>Excel · PDF · Impressão</strong></span>
      </div>

      <div className="px-table-scroll meg-web-report-preview">
        <table className="px-data-table">
          <thead><tr>{report.headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
          <tbody>{report.rows.map((row, index) => <tr key={index} className={index >= 12 ? 'meg-web-report-print-extra' : undefined}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
        </table>
        {!report.rows.length ? <p className="px-empty">Não há registros para este relatório no período atual.</p> : null}
      </div>
      {report.rows.length > 12 ? <footer className="meg-web-report-foot">Prévia de 12 registros. A exportação inclui todos os {report.recordCount} registros do relatório.</footer> : null}
    </section>
  </section>;
}
