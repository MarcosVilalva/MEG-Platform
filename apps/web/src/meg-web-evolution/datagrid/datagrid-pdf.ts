import { exportFilterLabels, exportPeriodLabel, officialLogo, timeInSaoPaulo } from './datagrid-export-header';
import type { DataGridColumn } from './types';

type Aggregate = { key: string; label: string; mode: 'sum' | 'avg' | 'count'; value: number; formatted: string };
type PdfInput<T extends Record<string, unknown>> = {
  jsPDF: typeof import('jspdf').jsPDF;
  autoTable: typeof import('jspdf-autotable').autoTable;
  rows: T[];
  totalCount: number;
  columns: DataGridColumn<T>[];
  filters: Array<{ label: string; summary: string }>;
  aggregates: Aggregate[];
  userName?: string;
  period?: string;
  maxRows: number;
};

function formatValue<T extends Record<string, unknown>>(value: unknown, column: DataGridColumn<T>): string {
  if (value == null) return '';
  if (column.type === 'boolean') return value ? 'Sim' : 'Não';
  const enumLabel = column.enumValues?.[String(value)]?.label;
  if (enumLabel) return enumLabel;
  if (column.type === 'currency' && typeof value === 'number')
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  if (column.type === 'number' && typeof value === 'number')
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4 }).format(value);
  if (column.type === 'date') {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
    if (match) return match[3] + '/' + match[2] + '/' + match[1];
  }
  return String(value);
}

export async function saveDataGridPdf<T extends Record<string, unknown>>({
  jsPDF, autoTable, rows, totalCount, columns, filters, aggregates,
  userName, period, maxRows,
}: PdfInput<T>): Promise<void> {
  if (rows.length > maxRows)
    throw new Error('Limite de ' + maxRows.toLocaleString('pt-BR') + ' linhas excedido. Refine os filtros.');

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  pdf.setFont('helvetica');
  const timestamp = timeInSaoPaulo(new Date());
  const user = userName?.trim() || 'Usuário não identificado';
  const reference = exportPeriodLabel(period);
  const extractionId = crypto.randomUUID().slice(0, 8).toUpperCase();
  const logo = await officialLogo();
  const sum = aggregates.find((item) => item.mode === 'sum');
  const avg = aggregates.find((item) => item.mode === 'avg');
  const cards = [
    ['Registros', rows.length.toLocaleString('pt-BR') + ' de ' + totalCount.toLocaleString('pt-BR')],
    ['Filtros ativos', String(filters.length)],
    ['Soma', sum?.formatted ?? 'Não configurada'],
    ['Média', avg?.formatted ?? 'Não configurada'],
  ];
  const filterLabels = exportFilterLabels(filters);
  const filterLines = pdf.splitTextToSize(filterLabels.join(' | '), 269) as string[];
  const firstTableY = Math.max(76, 66 + filterLines.length * 4.1);

  const drawLogo = (x: number, y: number, width: number, height: number) => {
    if (logo) {
      try {
        const h = Math.min(height, width / logo.aspect);
        pdf.addImage(logo.url, 'PNG', x, y + (height - h) / 2, h * logo.aspect, h, undefined, 'FAST');
        return;
      } catch { /* fallback textual */ }
    }
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text('MEG Finanças', x, y + height / 2 + 2);
  };
  const drawCompactHeader = () => {
    pdf.setFillColor(2, 34, 38);
    pdf.rect(0, 0, 297, 12, 'F');
    drawLogo(12, 2, 25, 8);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('Relatório DataGrid técnico', 148, 7.5, { align: 'center' });
  };
  const drawFirstHeader = () => {
    pdf.setFillColor(2, 34, 38);
    pdf.rect(0, 0, 297, 30, 'F');
    pdf.setFillColor(20, 227, 200);
    pdf.rect(0, 29, 297, 1, 'F');
    drawLogo(12, 5, 45, 19);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(17);
    pdf.text('Relatório DataGrid técnico', 148, 13, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(reference, 148, 20, { align: 'center', maxWidth: 125 });
    pdf.setFontSize(7.5);
    pdf.text('Exportado por: ' + user, 285, 10, { align: 'right', maxWidth: 76 });
    pdf.text(timestamp.label + ' (São Paulo)', 285, 16, { align: 'right' });
    pdf.text('ID da extração: ' + extractionId, 285, 22, { align: 'right' });
    cards.forEach(([label, value], index) => {
      const x = 12 + index * 69;
      pdf.setFillColor(244, 249, 249);
      pdf.roundedRect(x, 34, 65, 16, 2, 2, 'F');
      pdf.setTextColor(70, 84, 86);
      pdf.setFontSize(7.7);
      pdf.text(label, x + 3, 40);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(4, 46, 51);
      pdf.text((pdf.splitTextToSize(value, 59) as string[])[0], x + 3, 46.5);
      pdf.setFont('helvetica', 'normal');
    });
    pdf.setFontSize(7);
    pdf.setTextColor(105, 112, 116);
    const sha = import.meta.env.VITE_COMMIT_SHA || import.meta.env.VITE_GIT_SHA || 'não informado';
    pdf.text('MEG Web | SHA: ' + sha + ' | Referência: ' + reference, 12, 55);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(4, 46, 51);
    pdf.text('Filtros aplicados', 12, 61);
    pdf.setFont('helvetica', 'normal');
    pdf.text(filterLines, 12, 66);
  };

  autoTable(pdf, {
    head: [columns.map((column) => column.label)],
    body: rows.map((row) => columns.map((column) => formatValue(row[column.key], column))),
    startY: firstTableY,
    margin: { top: 20, bottom: 18, left: 12, right: 12 },
    theme: 'grid',
    showHead: 'everyPage',
    rowPageBreak: 'avoid',
    styles: { font: 'helvetica', fontSize: 7.4, cellPadding: 2.5, overflow: 'linebreak', lineColor: [218, 230, 231] },
    headStyles: { fillColor: [4, 65, 67], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [246, 250, 250] },
    didDrawPage: ({ pageNumber }) => { if (pageNumber === 1) drawFirstHeader(); else drawCompactHeader(); },
  });
  const lastY = (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 180;
  if (lastY > 185) pdf.addPage();
  const totalsY = lastY > 185 ? 27 : lastY + 8;
  const pages = pdf.getNumberOfPages();
  pdf.setPage(pages);
  if (lastY > 185) drawCompactHeader();
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(4, 46, 51);
  pdf.text('Soma: ' + (sum?.formatted ?? 'Não configurada') + '    Média: ' + (avg?.formatted ?? 'Não configurada'), 12, totalsY);
  for (let page = 1; page <= pages; page++) {
    pdf.setPage(page);
    pdf.setDrawColor(185, 207, 207);
    pdf.line(12, 196, 285, 196);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(98, 108, 110);
    pdf.text('Gerado em ' + timestamp.label + ' - ' + user, 12, 201);
    pdf.text('Página ' + page + ' de ' + pages, 285, 201, { align: 'right' });
  }
  pdf.save('datagrid-tecnico_' + timestamp.file + '.pdf');
}
