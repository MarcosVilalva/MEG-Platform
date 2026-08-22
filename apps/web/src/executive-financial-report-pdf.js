import { buildExecutiveFinancialModel } from './executive-financial-report-core.js';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 42;
const MIME_PDF = 'application/pdf';

const COLORS = {
  ink: '#16342f',
  muted: '#627873',
  border: '#d7e5e1',
  paper: '#ffffff',
  soft: '#f3f8f6',
  teal: '#075e54',
  tealDark: '#123b36',
  mint: '#55dbc5',
  green: '#047857',
  greenSoft: '#e7f7f0',
  red: '#b42318',
  redSoft: '#ffe8e6',
  amber: '#9a6700',
  amberSoft: '#fff4dd',
  blue: '#315efb',
};

const moneyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const numberFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

function money(value) {
  return moneyFormatter.format(Number(value) || 0).replace(/\u00a0/g, ' ');
}

function percent(value) {
  return `${((Number(value) || 0) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function compactMoney(value) {
  const amount = Number(value) || 0;
  const absolute = Math.abs(amount);
  if (absolute >= 1_000_000) return `R$ ${(amount / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  if (absolute >= 1_000) return `R$ ${(amount / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
  return money(amount);
}

function dateLabel(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value || '');
}

function hexColor(value) {
  const hex = String(value || '#000000').replace('#', '');
  return [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
}

function colorCommand(value, stroke = false) {
  return `${hexColor(value).map((item) => item.toFixed(3)).join(' ')} ${stroke ? 'RG' : 'rg'}`;
}

function winAnsiCode(character) {
  const code = character.codePointAt(0);
  if (code >= 32 && code <= 126) return code;
  if (code >= 160 && code <= 255) return code;
  const map = {
    0x20ac: 128,
    0x201a: 130,
    0x0192: 131,
    0x201e: 132,
    0x2026: 133,
    0x2020: 134,
    0x2021: 135,
    0x02c6: 136,
    0x2030: 137,
    0x0160: 138,
    0x2039: 139,
    0x0152: 140,
    0x017d: 142,
    0x2018: 145,
    0x2019: 146,
    0x201c: 147,
    0x201d: 148,
    0x2022: 149,
    0x2013: 150,
    0x2014: 151,
    0x02dc: 152,
    0x2122: 153,
    0x0161: 154,
    0x203a: 155,
    0x0153: 156,
    0x017e: 158,
    0x0178: 159,
  };
  return map[code] ?? 63;
}

function pdfText(value) {
  return [...String(value ?? '').replace(/[\r\n\t]+/g, ' ')].map((character) => {
    const code = winAnsiCode(character);
    if (code === 40 || code === 41 || code === 92) return `\\${String.fromCharCode(code)}`;
    if (code >= 32 && code <= 126) return String.fromCharCode(code);
    return `\\${code.toString(8).padStart(3, '0')}`;
  }).join('');
}

function approximateTextWidth(value, size, font = 'regular') {
  const factor = font === 'bold' ? 0.55 : 0.51;
  return [...String(value ?? '')].reduce((total, character) => total + (character === ' ' ? size * 0.27 : size * factor), 0);
}

function truncate(value, maxWidth, size, font = 'regular') {
  const source = String(value ?? '');
  if (approximateTextWidth(source, size, font) <= maxWidth) return source;
  let output = source;
  while (output.length > 1 && approximateTextWidth(`${output}...`, size, font) > maxWidth) output = output.slice(0, -1);
  return `${output.trim()}...`;
}

function wrapLines(value, maxWidth, size, font = 'regular', maxLines = Infinity) {
  const words = String(value ?? '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (!words.length) return [''];
  const lines = [];
  let current = '';
  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (!current || approximateTextWidth(candidate, size, font) <= maxWidth) {
      current = candidate;
      return;
    }
    lines.push(current);
    current = word;
  });
  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;
  const limited = lines.slice(0, maxLines);
  limited[maxLines - 1] = truncate(limited[maxLines - 1], maxWidth, size, font);
  return limited;
}

class PdfPage {
  constructor() {
    this.commands = [];
  }

  rect(x, top, width, height, { fill = null, stroke = null, lineWidth = 1 } = {}) {
    if (fill) this.commands.push(colorCommand(fill));
    if (stroke) this.commands.push(colorCommand(stroke, true), `${lineWidth} w`);
    const y = PAGE_HEIGHT - top - height;
    this.commands.push(`${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re ${fill && stroke ? 'B' : fill ? 'f' : 'S'}`);
  }

  line(x1, top1, x2, top2, { color = COLORS.border, lineWidth = 1 } = {}) {
    this.commands.push(colorCommand(color, true), `${lineWidth} w`, `${x1.toFixed(2)} ${(PAGE_HEIGHT - top1).toFixed(2)} m ${x2.toFixed(2)} ${(PAGE_HEIGHT - top2).toFixed(2)} l S`);
  }

  text(x, top, value, { size = 10, font = 'regular', color = COLORS.ink, align = 'left', width = 0 } = {}) {
    const clean = String(value ?? '');
    const measured = approximateTextWidth(clean, size, font);
    let textX = x;
    if (align === 'right') textX = x + width - measured;
    if (align === 'center') textX = x + (width - measured) / 2;
    const fontName = font === 'bold' ? 'F2' : font === 'italic' ? 'F3' : 'F1';
    const baseline = PAGE_HEIGHT - top - size;
    this.commands.push(`BT /${fontName} ${size.toFixed(2)} Tf ${colorCommand(color)} 1 0 0 1 ${textX.toFixed(2)} ${baseline.toFixed(2)} Tm (${pdfText(clean)}) Tj ET`);
  }

  wrappedText(x, top, value, { width, size = 10, lineHeight = size * 1.3, font = 'regular', color = COLORS.ink, maxLines = Infinity } = {}) {
    const lines = wrapLines(value, width, size, font, maxLines);
    lines.forEach((line, index) => this.text(x, top + index * lineHeight, line, { size, font, color }));
    return lines.length * lineHeight;
  }

  content() {
    return this.commands.join('\n');
  }
}

class PdfDocument {
  constructor({ title, author, generatedAt }) {
    this.title = title;
    this.author = author;
    this.generatedAt = generatedAt;
    this.pages = [];
  }

  addPage() {
    const page = new PdfPage();
    this.pages.push(page);
    return page;
  }

  bytes() {
    const objects = [];
    const firstPageId = 7;
    const pageIds = this.pages.map((_, index) => firstPageId + index * 2);
    objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objects[2] = `<< /Type /Pages /Count ${this.pages.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] >>`;
    objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
    objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
    objects[5] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>';
    const timestamp = this.generatedAt.toISOString().replace(/[-:T]/g, '').slice(0, 14);
    objects[6] = `<< /Title (${pdfText(this.title)}) /Author (${pdfText(this.author)}) /Creator (MEG Financas Web) /CreationDate (D:${timestamp}) >>`;
    this.pages.forEach((page, index) => {
      const pageId = firstPageId + index * 2;
      const contentId = pageId + 1;
      const content = page.content();
      objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${contentId} 0 R >>`;
      objects[contentId] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
    });

    let output = '%PDF-1.4\n% MEG Financial Report\n';
    const offsets = [0];
    for (let id = 1; id < objects.length; id += 1) {
      offsets[id] = output.length;
      output += `${id} 0 obj\n${objects[id]}\nendobj\n`;
    }
    const xrefOffset = output.length;
    output += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let id = 1; id < objects.length; id += 1) output += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
    output += `trailer\n<< /Size ${objects.length} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
    return new TextEncoder().encode(output);
  }
}

function reportHeader(page, title, subtitle) {
  page.rect(0, 0, PAGE_WIDTH, 88, { fill: COLORS.teal });
  page.rect(MARGIN, 21, 44, 44, { fill: COLORS.mint });
  page.text(MARGIN, 27, 'M', { size: 27, font: 'bold', color: COLORS.tealDark, align: 'center', width: 44 });
  page.text(MARGIN + 58, 20, title, { size: 20, font: 'bold', color: COLORS.paper });
  page.text(MARGIN + 58, 49, subtitle, { size: 9, color: '#d6fff7' });
}

function pageHeading(page, title, subtitle = '') {
  page.text(MARGIN, 108, title, { size: 17, font: 'bold', color: COLORS.tealDark });
  if (subtitle) page.text(MARGIN, 132, subtitle, { size: 9, color: COLORS.muted });
  page.line(MARGIN, 151, PAGE_WIDTH - MARGIN, 151, { color: COLORS.border });
}

function sectionLabel(page, x, top, width, title, subtitle = '') {
  page.rect(x, top, width, 28, { fill: COLORS.tealDark });
  page.text(x + 10, top + 7, title, { size: 10, font: 'bold', color: COLORS.paper });
  if (subtitle) page.text(x + width - 10 - approximateTextWidth(subtitle, 8), top + 8, subtitle, { size: 8, color: '#d6fff7' });
}

function toneForValue(negative, warning = false) {
  if (negative) return { fill: COLORS.redSoft, value: COLORS.red };
  if (warning) return { fill: COLORS.amberSoft, value: COLORS.amber };
  return { fill: COLORS.greenSoft, value: COLORS.green };
}

function kpiCard(page, x, top, width, label, value, tone) {
  page.rect(x, top, width, 59, { fill: tone.fill, stroke: COLORS.border, lineWidth: 0.6 });
  page.text(x + 10, top + 10, label.toUpperCase(), { size: 7.4, font: 'bold', color: COLORS.muted });
  page.text(x + 10, top + 28, value, { size: 15, font: 'bold', color: tone.value });
}

function legend(page, x, top, items) {
  let cursor = x;
  items.forEach((item) => {
    page.rect(cursor, top + 1, 7, 7, { fill: item.color });
    page.text(cursor + 11, top, item.label, { size: 7, color: COLORS.muted });
    cursor += 12 + approximateTextWidth(item.label, 7) + 16;
  });
}

function lineChart(page, { x, top, width, height, monthly }) {
  const plotX = x + 34;
  const plotTop = top + 24;
  const plotWidth = width - 44;
  const plotHeight = height - 54;
  const items = monthly.slice(-12);
  const series = [
    { key: 'income', label: 'Receitas', color: '#0a8f78' },
    { key: 'expense', label: 'Despesas', color: '#dc5145' },
    { key: 'result', label: 'Resultado', color: COLORS.blue },
  ];
  const values = items.flatMap((item) => series.map((entry) => Number(item[entry.key]) || 0));
  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  for (let step = 0; step <= 4; step += 1) {
    const gridTop = plotTop + (plotHeight * step) / 4;
    const value = max - ((max - min) * step) / 4;
    page.line(plotX, gridTop, plotX + plotWidth, gridTop, { color: '#e5eeeb', lineWidth: 0.5 });
    page.text(x, gridTop - 4, compactMoney(value).replace('R$ ', ''), { size: 6.5, color: COLORS.muted, align: 'right', width: 29 });
  }
  const pointX = (index) => plotX + (items.length <= 1 ? plotWidth / 2 : (plotWidth * index) / (items.length - 1));
  const pointTop = (value) => plotTop + plotHeight - ((value - min) / (max - min || 1)) * plotHeight;
  series.forEach((entry) => {
    for (let index = 1; index < items.length; index += 1) {
      page.line(pointX(index - 1), pointTop(items[index - 1][entry.key]), pointX(index), pointTop(items[index][entry.key]), { color: entry.color, lineWidth: 1.6 });
    }
    items.forEach((item, index) => page.rect(pointX(index) - 1.8, pointTop(item[entry.key]) - 1.8, 3.6, 3.6, { fill: entry.color }));
  });
  const labelStep = items.length > 6 ? 2 : 1;
  items.forEach((item, index) => {
    if (index % labelStep !== 0 && index !== items.length - 1) return;
    page.text(pointX(index) - 18, plotTop + plotHeight + 8, truncate(item.label, 36, 6.2), { size: 6.2, color: COLORS.muted, align: 'center', width: 36 });
  });
  legend(page, plotX, top + height - 14, series);
}

function categoryChart(page, { x, top, width, height, categories }) {
  const items = categories.slice(0, 6);
  const maximum = Math.max(1, ...items.map((item) => item.total));
  const labelWidth = 82;
  const rowHeight = (height - 28) / Math.max(items.length, 1);
  items.forEach((item, index) => {
    const rowTop = top + 21 + index * rowHeight;
    const barWidth = ((width - labelWidth - 18) * item.total) / maximum;
    page.text(x, rowTop + 2, truncate(item.category, labelWidth - 5, 7), { size: 7, color: COLORS.muted, align: 'right', width: labelWidth - 5 });
    page.rect(x + labelWidth, rowTop, Math.max(barWidth, 2), 10, { fill: '#0a8f78' });
    page.text(x + labelWidth + Math.max(barWidth, 2) + 4, rowTop + 1, compactMoney(item.total), { size: 6.5, color: COLORS.ink });
  });
  if (!items.length) page.text(x + 10, top + 44, 'Sem despesas para exibir.', { size: 8, color: COLORS.muted });
}

function table(page, { x, top, width, columns, rows, rowHeight = 21, headerHeight = 24 }) {
  page.rect(x, top, width, headerHeight, { fill: COLORS.tealDark });
  let cursorX = x;
  columns.forEach((column) => {
    page.text(cursorX + 6, top + 7, column.label, { size: 7.2, font: 'bold', color: COLORS.paper, align: column.align || 'left', width: column.width - 12 });
    cursorX += column.width;
  });
  rows.forEach((row, rowIndex) => {
    const rowTop = top + headerHeight + rowIndex * rowHeight;
    page.rect(x, rowTop, width, rowHeight, { fill: rowIndex % 2 ? COLORS.soft : COLORS.paper });
    page.line(x, rowTop + rowHeight, x + width, rowTop + rowHeight, { color: COLORS.border, lineWidth: 0.5 });
    let cellX = x;
    columns.forEach((column) => {
      const raw = typeof column.value === 'function' ? column.value(row) : row[column.key];
      const value = column.format ? column.format(raw, row) : raw;
      const cellColor = column.color ? column.color(raw, row) : COLORS.ink;
      page.text(cellX + 6, rowTop + 6.5, truncate(value, column.width - 12, 7.4, column.bold ? 'bold' : 'regular'), { size: 7.4, font: column.bold ? 'bold' : 'regular', color: cellColor, align: column.align || 'left', width: column.width - 12 });
      cellX += column.width;
    });
  });
  return top + headerHeight + rows.length * rowHeight;
}

function priorityTone(priority) {
  if (priority === 'CRÍTICA') return { fill: COLORS.redSoft, value: COLORS.red };
  if (priority === 'ALTA') return { fill: COLORS.amberSoft, value: COLORS.amber };
  return { fill: COLORS.greenSoft, value: COLORS.green };
}

function addExecutivePage(document, model) {
  const page = document.addPage();
  reportHeader(page, 'RELATÓRIO FINANCEIRO INTELIGENTE', `${model.metadata.periodLabel} | ${model.metadata.owner}`);
  const gap = 8;
  const cardWidth = (PAGE_WIDTH - MARGIN * 2 - gap * 3) / 4;
  const { metrics } = model;
  const first = [
    ['Receitas', money(metrics.income), toneForValue(false)],
    ['Despesas', money(metrics.expense), toneForValue(true)],
    ['Resultado', money(metrics.operatingResult), toneForValue(metrics.operatingResult < 0)],
    ['Saldo projetado', money(metrics.projectedBalance), toneForValue(metrics.projectedBalance < 0)],
  ];
  const second = [
    ['Saúde financeira', `${metrics.healthScore}/100`, toneForValue(metrics.healthScore < 60, metrics.healthScore >= 60 && metrics.healthScore < 80)],
    ['Taxa de poupança', percent(metrics.savingsRate), toneForValue(metrics.savingsRate < 0.1, metrics.savingsRate >= 0.1 && metrics.savingsRate < 0.2)],
    ['Pendências', money(metrics.pendingExpense), toneForValue(metrics.overdueCount > 0, metrics.pendingCount > 0 && !metrics.overdueCount)],
    ['Reserva a construir', money(metrics.emergencyGap), toneForValue(metrics.emergencyGap > 0, false)],
  ];
  first.forEach((item, index) => kpiCard(page, MARGIN + index * (cardWidth + gap), 108, cardWidth, ...item));
  second.forEach((item, index) => kpiCard(page, MARGIN + index * (cardWidth + gap), 177, cardWidth, ...item));

  const chartWidth = (PAGE_WIDTH - MARGIN * 2 - 12) / 2;
  sectionLabel(page, MARGIN, 252, chartWidth, 'EVOLUÇÃO DOS ÚLTIMOS 12 MESES');
  sectionLabel(page, MARGIN + chartWidth + 12, 252, chartWidth, 'MAIORES CATEGORIAS');
  lineChart(page, { x: MARGIN, top: 282, width: chartWidth, height: 186, monthly: model.monthly });
  categoryChart(page, { x: MARGIN + chartWidth + 12, top: 282, width: chartWidth, height: 186, categories: model.categories });

  sectionLabel(page, MARGIN, 482, PAGE_WIDTH - MARGIN * 2, 'PRÓXIMAS AÇÕES RECOMENDADAS', `Status: ${metrics.healthStatus}`);
  model.recommendations.slice(0, 3).forEach((item, index) => {
    const top = 518 + index * 82;
    const tone = priorityTone(item.priority);
    page.rect(MARGIN, top, PAGE_WIDTH - MARGIN * 2, 70, { fill: index % 2 ? COLORS.soft : COLORS.paper, stroke: COLORS.border, lineWidth: 0.6 });
    page.rect(MARGIN, top, 72, 70, { fill: tone.fill });
    page.text(MARGIN + 8, top + 12, item.priority, { size: 8, font: 'bold', color: tone.value });
    page.text(MARGIN + 8, top + 34, compactMoney(item.impact), { size: 8, color: tone.value });
    page.text(MARGIN + 84, top + 10, item.title, { size: 10, font: 'bold', color: COLORS.tealDark });
    page.wrappedText(MARGIN + 84, top + 29, item.action, { width: PAGE_WIDTH - MARGIN * 2 - 98, size: 8, lineHeight: 11, color: COLORS.ink, maxLines: 3 });
  });
}

function addDiagnosisPage(document, model) {
  const page = document.addPage();
  reportHeader(page, 'DIAGNÓSTICO FINANCEIRO', 'Comportamento mensal, categorias, metas e formas de pagamento');
  pageHeading(page, 'Como o dinheiro se movimenta', 'Os valores abaixo foram calculados diretamente a partir da base autenticada do MEG.');
  sectionLabel(page, MARGIN, 166, PAGE_WIDTH - MARGIN * 2, 'EVOLUÇÃO MENSAL');
  const monthly = model.monthly.slice(-12);
  table(page, {
    x: MARGIN,
    top: 196,
    width: PAGE_WIDTH - MARGIN * 2,
    rowHeight: 20,
    columns: [
      { label: 'Competência', key: 'label', width: 104 },
      { label: 'Receitas', key: 'income', width: 98, align: 'right', format: money },
      { label: 'Despesas', key: 'expense', width: 98, align: 'right', format: money },
      { label: 'Resultado', key: 'result', width: 102, align: 'right', format: money, color: (value) => value < 0 ? COLORS.red : COLORS.green },
      { label: 'Poupança', key: 'savingsRate', width: 109, align: 'right', format: percent },
    ],
    rows: monthly,
  });

  const lowerTop = 196 + 24 + monthly.length * 20 + 24;
  const categoryWidth = 342;
  const paymentWidth = PAGE_WIDTH - MARGIN * 2 - categoryWidth - 12;
  sectionLabel(page, MARGIN, lowerTop, categoryWidth, 'CATEGORIAS E METAS');
  sectionLabel(page, MARGIN + categoryWidth + 12, lowerTop, paymentWidth, 'FORMAS DE PAGAMENTO');
  table(page, {
    x: MARGIN,
    top: lowerTop + 30,
    width: categoryWidth,
    rowHeight: 19,
    columns: [
      { label: 'Categoria', key: 'category', width: 104 },
      { label: 'Gasto', key: 'total', width: 78, align: 'right', format: money },
      { label: '%', key: 'share', width: 38, align: 'right', format: percent },
      { label: 'Meta', key: 'budget', width: 78, align: 'right', format: (value) => value ? compactMoney(value) : 'Não definida' },
      { label: 'Uso', key: 'utilization', width: 44, align: 'right', format: (value, row) => row.budget ? `${Math.round(value * 100)}%` : '-' },
    ],
    rows: model.budgetRows.slice(0, 10),
  });
  table(page, {
    x: MARGIN + categoryWidth + 12,
    top: lowerTop + 30,
    width: paymentWidth,
    rowHeight: 19,
    columns: [
      { label: 'Forma', key: 'method', width: paymentWidth - 62 },
      { label: '%', key: 'share', width: 62, align: 'right', format: percent },
    ],
    rows: model.paymentMethods.slice(0, 10),
  });
}

function addActionPages(document, model) {
  const chunks = [];
  for (let index = 0; index < model.recommendations.length; index += 7) chunks.push(model.recommendations.slice(index, index + 7));
  (chunks.length ? chunks : [[]]).forEach((items, pageIndex) => {
    const page = document.addPage();
    reportHeader(page, 'PLANO DE AÇÃO FINANCEIRA', 'Sugestões calculadas a partir do histórico completo do usuário');
    pageHeading(page, pageIndex ? 'Continuação do plano de ação' : 'O que fazer para melhorar', 'Priorize as ações críticas e de alto impacto antes de assumir novos compromissos.');
    items.forEach((item, index) => {
      const top = 166 + index * 88;
      const tone = priorityTone(item.priority);
      page.rect(MARGIN, top, PAGE_WIDTH - MARGIN * 2, 76, { fill: COLORS.paper, stroke: COLORS.border, lineWidth: 0.7 });
      page.rect(MARGIN, top, 82, 76, { fill: tone.fill });
      page.text(MARGIN + 10, top + 13, item.priority, { size: 8, font: 'bold', color: tone.value });
      page.text(MARGIN + 10, top + 37, 'Impacto', { size: 7, color: COLORS.muted });
      page.text(MARGIN + 10, top + 51, compactMoney(item.impact), { size: 8, font: 'bold', color: tone.value });
      page.text(MARGIN + 94, top + 10, item.title, { size: 10, font: 'bold', color: COLORS.tealDark });
      page.wrappedText(MARGIN + 94, top + 27, item.action, { width: PAGE_WIDTH - MARGIN * 2 - 110, size: 8, lineHeight: 10.5, maxLines: 2 });
      page.wrappedText(MARGIN + 94, top + 51, `Por que: ${item.reason}`, { width: PAGE_WIDTH - MARGIN * 2 - 110, size: 7.2, lineHeight: 9, color: COLORS.muted, maxLines: 2 });
    });
    if (!items.length) page.text(MARGIN, 180, 'Nenhum alerta financeiro relevante foi identificado.', { size: 10, color: COLORS.green });
  });
}

function addPendingPages(document, model) {
  const pending = model.pending;
  if (!pending.length) return;
  for (let offset = 0; offset < pending.length; offset += 23) {
    const rows = pending.slice(offset, offset + 23);
    const page = document.addPage();
    reportHeader(page, 'CONTAS PENDENTES', 'Compromissos em aberto, ordenados por vencimento');
    pageHeading(page, offset ? 'Continuação das pendências' : 'Pendências que exigem atenção', `${model.metrics.overdueCount} vencida(s), total pendente de ${money(model.metrics.pendingExpense)}.`);
    table(page, {
      x: MARGIN,
      top: 166,
      width: PAGE_WIDTH - MARGIN * 2,
      rowHeight: 25,
      columns: [
        { label: 'Vencimento', key: 'date', width: 70, format: dateLabel },
        { label: 'Descrição', key: 'description', width: 174 },
        { label: 'Categoria', value: (row) => row.group || row.category || 'Sem categoria', width: 104 },
        { label: 'Situação', value: (row) => row.overdue ? 'Vencida' : 'A vencer', width: 70, color: (_, row) => row.overdue ? COLORS.red : COLORS.amber, bold: true },
        { label: 'Valor', key: 'value', width: 93, align: 'right', format: money },
      ],
      rows,
    });
  }
}

function addAccountsPage(document, model) {
  const page = document.addPage();
  reportHeader(page, 'CONTAS, CARTÕES E CONTROLES', 'Posição financeira estimada e metodologia do relatório');
  pageHeading(page, 'Estrutura financeira cadastrada', 'Saldos e limites refletem os lançamentos disponíveis até a data final do relatório.');
  sectionLabel(page, MARGIN, 166, PAGE_WIDTH - MARGIN * 2, 'CONTAS FINANCEIRAS');
  const accountEnd = table(page, {
    x: MARGIN,
    top: 196,
    width: PAGE_WIDTH - MARGIN * 2,
    rowHeight: 22,
    columns: [
      { label: 'Conta', key: 'name', width: 164 },
      { label: 'Tipo', key: 'type', width: 92 },
      { label: 'Saldo inicial', key: 'openingBalance', width: 108, align: 'right', format: money },
      { label: 'Saldo calculado', key: 'balance', width: 112, align: 'right', format: money, color: (value) => value < 0 ? COLORS.red : COLORS.green },
      { label: 'Ativa', key: 'active', width: 35, align: 'center', format: (value) => value ? 'Sim' : 'Não' },
    ],
    rows: model.accountRows.slice(0, 10),
  });
  const cardTitleTop = Math.max(accountEnd + 24, 310);
  sectionLabel(page, MARGIN, cardTitleTop, PAGE_WIDTH - MARGIN * 2, 'CARTÕES DE CRÉDITO');
  const cardEnd = table(page, {
    x: MARGIN,
    top: cardTitleTop + 30,
    width: PAGE_WIDTH - MARGIN * 2,
    rowHeight: 22,
    columns: [
      { label: 'Cartão', key: 'name', width: 148 },
      { label: 'Limite', key: 'limit', width: 93, align: 'right', format: money },
      { label: 'Em aberto', key: 'pending', width: 93, align: 'right', format: money },
      { label: 'Disponível', key: 'available', width: 93, align: 'right', format: money },
      { label: 'Utilização', key: 'usage', width: 84, align: 'right', format: percent, color: (value) => value >= 0.7 ? COLORS.red : COLORS.green },
    ],
    rows: model.cardRows.slice(0, 10),
  });
  const noteTop = Math.max(cardEnd + 26, 525);
  sectionLabel(page, MARGIN, noteTop, PAGE_WIDTH - MARGIN * 2, 'COMO INTERPRETAR');
  const notes = [
    `Índice de saúde: ${model.metrics.healthScore}/100. Combina poupança, despesas essenciais, saldo projetado e pontualidade.`,
    `Reserva de emergência: meta de ${money(model.metrics.emergencyGoal)}, equivalente a seis meses das despesas essenciais médias.`,
    'As recomendações são educativas e dependem da qualidade dos lançamentos, saldos e metas cadastrados no MEG.',
    'Este relatório não substitui orientação profissional individualizada para investimentos, crédito ou endividamento.',
  ];
  notes.forEach((note, index) => {
    page.rect(MARGIN, noteTop + 36 + index * 43, 4, 30, { fill: index < 2 ? COLORS.mint : COLORS.border });
    page.wrappedText(MARGIN + 12, noteTop + 35 + index * 43, note, { width: PAGE_WIDTH - MARGIN * 2 - 12, size: 8, lineHeight: 10.5, color: index < 2 ? COLORS.ink : COLORS.muted, maxLines: 3 });
  });
}

function addTransactionPages(document, model) {
  const transactions = model.transactions;
  for (let offset = 0; offset < transactions.length; offset += 25) {
    const rows = transactions.slice(offset, offset + 25);
    const page = document.addPage();
    reportHeader(page, 'LANÇAMENTOS DO HISTÓRICO', `Base detalhada, registros ${offset + 1} a ${offset + rows.length} de ${transactions.length}`);
    pageHeading(page, offset ? 'Continuação dos lançamentos' : 'Dados utilizados na análise', 'Transações de benefício não integram os indicadores monetários deste relatório.');
    table(page, {
      x: MARGIN,
      top: 166,
      width: PAGE_WIDTH - MARGIN * 2,
      rowHeight: 24,
      columns: [
        { label: 'Data', key: 'date', width: 58, format: dateLabel },
        { label: 'Tipo', key: 'type', width: 49, format: (value) => value === 'income' ? 'Receita' : 'Despesa' },
        { label: 'Descrição', key: 'description', width: 159 },
        { label: 'Categoria', value: (row) => row.group || row.category || '', width: 98 },
        { label: 'Situação', value: (row) => row.status === 'paid' || String(row.situation || '').toUpperCase() === 'PAGO' ? 'Pago' : 'Pendente', width: 66 },
        { label: 'Valor', value: (row) => Number(row.type === 'income' ? row.incomeAmount ?? row.amount : row.expenseAmount ?? row.amount) || 0, width: 81, align: 'right', format: money },
      ],
      rows,
    });
  }
}

function addFooters(document, generatedAt) {
  document.pages.forEach((page, index) => {
    page.line(MARGIN, 810, PAGE_WIDTH - MARGIN, 810, { color: COLORS.border, lineWidth: 0.6 });
    page.text(MARGIN, 817, `MEG Finanças | Gerado em ${generatedAt.toLocaleString('pt-BR')}`, { size: 7, color: COLORS.muted });
    page.text(PAGE_WIDTH - MARGIN - 100, 817, `Página ${index + 1} de ${document.pages.length}`, { size: 7, color: COLORS.muted, align: 'right', width: 100 });
  });
}

export function createExecutiveFinancialPdf({ state, start, end, owner, periodLabel, generatedAt = new Date() }) {
  const model = buildExecutiveFinancialModel({ state, start, end, owner, periodLabel, generatedAt });
  const document = new PdfDocument({
    title: 'Super relatório financeiro MEG',
    author: owner || 'MEG Finanças',
    generatedAt,
  });
  addExecutivePage(document, model);
  addDiagnosisPage(document, model);
  addActionPages(document, model);
  addPendingPages(document, model);
  addAccountsPage(document, model);
  addTransactionPages(document, model);
  addFooters(document, generatedAt);
  const bytes = document.bytes();
  return {
    bytes,
    blob: new Blob([bytes], { type: MIME_PDF }),
    filename: `super-relatorio-financeiro-meg-${generatedAt.toISOString().slice(0, 10)}.pdf`,
    mimeType: MIME_PDF,
    model,
    pageCount: document.pages.length,
  };
}

export const executivePdfInternals = {
  PdfDocument,
  PdfPage,
  pdfText,
  wrapLines,
};
