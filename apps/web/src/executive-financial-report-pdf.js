import { buildExecutiveFinancialModel, buildMonthlyExpenseModel } from './executive-financial-report-core.js';
import { REPORT_FONT_FAMILY, REPORT_FONTS } from './executive-financial-report-fonts.js';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 34;
const MIME_PDF = 'application/pdf';

const COLORS = {
  bg: '#050f1b', surface: '#0b1d2b', surfaceAlt: '#102839', surfaceLight: '#17384a',
  border: '#285061', white: '#f1fbff', muted: '#91a9ba', mutedDark: '#688493',
  teal: '#56ebc9', tealDark: '#176b70', blue: '#4db8ff', purple: '#9a8cff',
  orange: '#ffc166', red: '#ff6f7b', green: '#30d59a',
};

const moneyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function money(value) {
  return moneyFormatter.format(Number(value) || 0).replace(/\u00a0/g, ' ');
}

function signedMoney(value) {
  const amount = Number(value) || 0;
  return `${amount >= 0 ? '+' : '-'}${money(Math.abs(amount))}`;
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
    0x20ac: 128, 0x201a: 130, 0x0192: 131, 0x201e: 132, 0x2026: 133,
    0x2020: 134, 0x2021: 135, 0x02c6: 136, 0x2030: 137, 0x0160: 138,
    0x2039: 139, 0x0152: 140, 0x017d: 142, 0x2018: 145, 0x2019: 146,
    0x201c: 147, 0x201d: 148, 0x2022: 149, 0x2013: 150, 0x02dc: 152,
    0x2122: 153, 0x0161: 154, 0x203a: 155, 0x0153: 156, 0x017e: 158, 0x0178: 159,
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

function fontMetrics(font = 'regular') {
  return font === 'bold' ? REPORT_FONTS.bold : REPORT_FONTS.regular;
}

function measureTextWidth(value, size, font = 'regular') {
  const metrics = fontMetrics(font);
  return [...String(value ?? '')].reduce((total, character) => {
    const code = winAnsiCode(character);
    const width = metrics.widths[code - metrics.firstChar] ?? metrics.widths[63 - metrics.firstChar];
    return total + width * size / 1000;
  }, 0);
}

function truncate(value, maxWidth, size, font = 'regular') {
  const source = String(value ?? '');
  if (measureTextWidth(source, size, font) <= maxWidth) return source;
  let output = source;
  while (output.length > 1 && measureTextWidth(`${output}…`, size, font) > maxWidth) output = output.slice(0, -1);
  return `${output.trim()}…`;
}

function wrapLines(value, maxWidth, size, font = 'regular', maxLines = Infinity) {
  const words = String(value ?? '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (!words.length) return [''];
  const lines = [];
  let current = '';
  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (!current || measureTextWidth(candidate, size, font) <= maxWidth) current = candidate;
    else {
      lines.push(current);
      current = word;
    }
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

  paintPath(path, { fill = null, stroke = null, lineWidth = 1 } = {}) {
    if (fill) this.commands.push(colorCommand(fill));
    if (stroke) this.commands.push(colorCommand(stroke, true), `${lineWidth} w`);
    this.commands.push(`${path} ${fill && stroke ? 'B' : fill ? 'f' : 'S'}`);
  }

  rect(x, top, width, height, options = {}) {
    const y = PAGE_HEIGHT - top - height;
    this.paintPath(`${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re`, options);
  }

  roundedRect(x, top, width, height, radius, options = {}) {
    const r = Math.min(radius, width / 2, height / 2);
    const k = r * 0.5522847498;
    const left = x;
    const right = x + width;
    const bottom = PAGE_HEIGHT - top - height;
    const upper = PAGE_HEIGHT - top;
    const path = [
      `${(left + r).toFixed(2)} ${bottom.toFixed(2)} m`,
      `${(right - r).toFixed(2)} ${bottom.toFixed(2)} l`,
      `${(right - r + k).toFixed(2)} ${bottom.toFixed(2)} ${right.toFixed(2)} ${(bottom + r - k).toFixed(2)} ${right.toFixed(2)} ${(bottom + r).toFixed(2)} c`,
      `${right.toFixed(2)} ${(upper - r).toFixed(2)} l`,
      `${right.toFixed(2)} ${(upper - r + k).toFixed(2)} ${(right - r + k).toFixed(2)} ${upper.toFixed(2)} ${(right - r).toFixed(2)} ${upper.toFixed(2)} c`,
      `${(left + r).toFixed(2)} ${upper.toFixed(2)} l`,
      `${(left + r - k).toFixed(2)} ${upper.toFixed(2)} ${left.toFixed(2)} ${(upper - r + k).toFixed(2)} ${left.toFixed(2)} ${(upper - r).toFixed(2)} c`,
      `${left.toFixed(2)} ${(bottom + r).toFixed(2)} l`,
      `${left.toFixed(2)} ${(bottom + r - k).toFixed(2)} ${(left + r - k).toFixed(2)} ${bottom.toFixed(2)} ${(left + r).toFixed(2)} ${bottom.toFixed(2)} c h`,
    ].join(' ');
    this.paintPath(path, options);
  }

  circle(cx, centerTop, radius, options = {}) {
    const cy = PAGE_HEIGHT - centerTop;
    const k = radius * 0.5522847498;
    const path = [
      `${(cx + radius).toFixed(2)} ${cy.toFixed(2)} m`,
      `${(cx + radius).toFixed(2)} ${(cy + k).toFixed(2)} ${(cx + k).toFixed(2)} ${(cy + radius).toFixed(2)} ${cx.toFixed(2)} ${(cy + radius).toFixed(2)} c`,
      `${(cx - k).toFixed(2)} ${(cy + radius).toFixed(2)} ${(cx - radius).toFixed(2)} ${(cy + k).toFixed(2)} ${(cx - radius).toFixed(2)} ${cy.toFixed(2)} c`,
      `${(cx - radius).toFixed(2)} ${(cy - k).toFixed(2)} ${(cx - k).toFixed(2)} ${(cy - radius).toFixed(2)} ${cx.toFixed(2)} ${(cy - radius).toFixed(2)} c`,
      `${(cx + k).toFixed(2)} ${(cy - radius).toFixed(2)} ${(cx + radius).toFixed(2)} ${(cy - k).toFixed(2)} ${(cx + radius).toFixed(2)} ${cy.toFixed(2)} c h`,
    ].join(' ');
    this.paintPath(path, options);
  }

  line(x1, top1, x2, top2, { color = COLORS.border, lineWidth = 1 } = {}) {
    this.commands.push(colorCommand(color, true), `${lineWidth} w`, `${x1.toFixed(2)} ${(PAGE_HEIGHT - top1).toFixed(2)} m ${x2.toFixed(2)} ${(PAGE_HEIGHT - top2).toFixed(2)} l S`);
  }

  polyline(points, { color = COLORS.teal, lineWidth = 1 } = {}) {
    if (!points.length) return;
    const path = points.map((point, index) => `${point.x.toFixed(2)} ${(PAGE_HEIGHT - point.top).toFixed(2)} ${index ? 'l' : 'm'}`).join(' ');
    this.commands.push(colorCommand(color, true), `${lineWidth} w`, `${path} S`);
  }

  arc(cx, centerTop, radius, startDegrees, endDegrees, { color = COLORS.teal, lineWidth = 5 } = {}) {
    const steps = Math.max(8, Math.ceil(Math.abs(endDegrees - startDegrees) / 6));
    const points = Array.from({ length: steps + 1 }, (_, index) => {
      const angle = (startDegrees + ((endDegrees - startDegrees) * index) / steps) * Math.PI / 180;
      return { x: cx + Math.cos(angle) * radius, top: centerTop + Math.sin(angle) * radius };
    });
    this.polyline(points, { color, lineWidth });
    const cap = lineWidth / 2;
    this.circle(points[0].x, points[0].top, cap, { fill: color });
    this.circle(points.at(-1).x, points.at(-1).top, cap, { fill: color });
  }

  text(x, top, value, { size = 10, font = 'regular', color = COLORS.white, align = 'left', width = 0 } = {}) {
    const clean = String(value ?? '');
    const measured = measureTextWidth(clean, size, font);
    let textX = x;
    if (align === 'right') textX = x + width - measured;
    if (align === 'center') textX = x + (width - measured) / 2;
    const fontName = font === 'bold' ? 'F2' : font === 'italic' ? 'F3' : 'F1';
    const baseline = PAGE_HEIGHT - top - size;
    this.commands.push(`BT /${fontName} ${size.toFixed(2)} Tf ${colorCommand(color)} 1 0 0 1 ${textX.toFixed(2)} ${baseline.toFixed(2)} Tm (${pdfText(clean)}) Tj ET`);
  }

  wrappedText(x, top, value, { width, size = 10, lineHeight = size * 1.3, font = 'regular', color = COLORS.white, align = 'left', maxLines = Infinity } = {}) {
    const lines = wrapLines(value, width, size, font, maxLines);
    lines.forEach((line, index) => this.text(x, top + index * lineHeight, line, { size, font, color, align, width }));
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
    const infoId = 9;
    const firstPageId = 10;
    const pageIds = this.pages.map((_, index) => firstPageId + index * 2);
    objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objects[2] = `<< /Type /Pages /Count ${this.pages.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] >>`;
    const regularBinary = globalThis.atob(REPORT_FONTS.regular.base64);
    const boldBinary = globalThis.atob(REPORT_FONTS.bold.base64);
    objects[3] = this.fontObject(REPORT_FONTS.regular, 'MEGREG', 4);
    objects[4] = this.fontDescriptorObject(REPORT_FONTS.regular, 'MEGREG', 5, 80);
    objects[5] = `<< /Length ${regularBinary.length} /Length1 ${regularBinary.length} >>\nstream\n${regularBinary}\nendstream`;
    objects[6] = this.fontObject(REPORT_FONTS.bold, 'MEGBLD', 7);
    objects[7] = this.fontDescriptorObject(REPORT_FONTS.bold, 'MEGBLD', 8, 120);
    objects[8] = `<< /Length ${boldBinary.length} /Length1 ${boldBinary.length} >>\nstream\n${boldBinary}\nendstream`;
    const timestamp = this.generatedAt.toISOString().replace(/[-:T]/g, '').slice(0, 14);
    objects[infoId] = `<< /Title (${pdfText(this.title)}) /Author (${pdfText(this.author)}) /Creator (MEG Finance System Web) /Producer (MEG Finance System PDF Engine, ${REPORT_FONT_FAMILY}) /CreationDate (D:${timestamp}) >>`;
    this.pages.forEach((page, index) => {
      const pageId = firstPageId + index * 2;
      const contentId = pageId + 1;
      const content = page.content();
      objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 6 0 R /F3 3 0 R >> >> /Contents ${contentId} 0 R >>`;
      objects[contentId] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
    });
    let output = '%PDF-1.4\n% MEG Premium Financial Report\n';
    const offsets = [0];
    for (let id = 1; id < objects.length; id += 1) {
      offsets[id] = output.length;
      output += `${id} 0 obj\n${objects[id]}\nendobj\n`;
    }
    const xrefOffset = output.length;
    output += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let id = 1; id < objects.length; id += 1) output += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
    output += `trailer\n<< /Size ${objects.length} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
    return Uint8Array.from(output, (character) => character.charCodeAt(0) & 0xff);
  }

  fontObject(font, subsetTag, descriptorId) {
    const baseFont = `${subsetTag}+${font.postScriptName}`;
    return `<< /Type /Font /Subtype /TrueType /BaseFont /${baseFont} /FirstChar ${font.firstChar} /LastChar ${font.lastChar} /Widths [${font.widths.join(' ')}] /FontDescriptor ${descriptorId} 0 R /Encoding /WinAnsiEncoding >>`;
  }

  fontDescriptorObject(font, subsetTag, fontFileId, stemV) {
    const baseFont = `${subsetTag}+${font.postScriptName}`;
    return `<< /Type /FontDescriptor /FontName /${baseFont} /Flags 32 /FontBBox [${font.bbox.join(' ')}] /ItalicAngle 0 /Ascent ${font.ascent} /Descent ${font.descent} /CapHeight ${font.capHeight} /StemV ${stemV} /FontFile2 ${fontFileId} 0 R >>`;
  }
}

function addBackground(page) {
  page.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, { fill: COLORS.bg });
  page.circle(PAGE_WIDTH - 28, 10, 92, { fill: '#0a2734' });
  page.circle(18, PAGE_HEIGHT - 5, 78, { fill: '#081e2d' });
  const circuits = [
    [[0, 118], [62, 118], [88, 144], [136, 144]],
    [[PAGE_WIDTH, 166], [542, 166], [520, 188], [482, 188]],
    [[0, 704], [52, 704], [78, 678], [118, 678]],
    [[PAGE_WIDTH, 742], [548, 742], [520, 714], [472, 714]],
  ];
  circuits.forEach((points) => {
    page.polyline(points.map(([x, top]) => ({ x, top })), { color: '#123b4a', lineWidth: 0.65 });
    const [x, top] = points.at(-1);
    page.circle(x, top, 2.1, { fill: '#1c5d66' });
  });
}

function addBrandMark(page, x, top, size = 42) {
  page.roundedRect(x, top, size, size, 11, { fill: '#0d3443', stroke: COLORS.teal, lineWidth: 1.2 });
  const scale = size / 42;
  page.rect(x + 20 * scale, top + 8 * scale, 4 * scale, 10 * scale, { fill: COLORS.blue });
  page.rect(x + 26 * scale, top + 5 * scale, 4 * scale, 13 * scale, { fill: '#39c8d2' });
  page.rect(x + 32 * scale, top + 2 * scale, 4 * scale, 16 * scale, { fill: COLORS.green });
  page.polyline([
    { x: x + 18 * scale, top: top + 21 * scale },
    { x: x + 25 * scale, top: top + 18 * scale },
    { x: x + 31 * scale, top: top + 12 * scale },
    { x: x + 36 * scale, top: top + 8 * scale },
  ], { color: COLORS.teal, lineWidth: 2.3 * scale });
  page.text(x + 2 * scale, top + 22 * scale, 'MEG', { size: 10.2 * scale, font: 'bold', color: COLORS.white, align: 'center', width: 38 * scale });
}

function addHeader(page, title, subtitle, pageNumber) {
  addBrandMark(page, MARGIN, 19, 44);
  page.text(MARGIN + 56, 20, 'MEG FINANCE SYSTEM', { size: 7.2, font: 'bold', color: COLORS.teal });
  page.text(MARGIN + 56, 34, title, { size: 13.2, font: 'bold' });
  page.text(MARGIN + 56, 53, subtitle, { size: 6.8, color: COLORS.muted });
  page.roundedRect(PAGE_WIDTH - MARGIN - 60, 29, 60, 23, 11, { fill: COLORS.surfaceAlt, stroke: COLORS.border, lineWidth: 0.6 });
  page.text(PAGE_WIDTH - MARGIN - 60, 35, `PÁGINA ${pageNumber}`, { size: 6.6, font: 'bold', color: COLORS.teal, align: 'center', width: 60 });
  page.line(MARGIN, 78, PAGE_WIDTH - MARGIN, 78, { color: COLORS.border, lineWidth: 0.7 });
}

function sectionTitle(page, x, top, title, subtitle = '', width = PAGE_WIDTH - MARGIN * 2) {
  page.text(x, top, title.toUpperCase(), { size: 9, font: 'bold', color: COLORS.white });
  if (subtitle) page.text(x, top + 15, truncate(subtitle, width, 7), { size: 7, color: COLORS.muted });
}

function chip(page, x, top, label, color = COLORS.teal, width = 74) {
  page.roundedRect(x, top, width, 18, 9, { fill: COLORS.surfaceLight, stroke: color, lineWidth: 0.6 });
  page.text(x, top + 5, label, { size: 6.2, font: 'bold', color, align: 'center', width });
}

function scoreGauge(page, cx, centerTop, score, radius = 48) {
  page.arc(cx, centerTop, radius, -215, 35, { color: COLORS.surfaceLight, lineWidth: 11 });
  const end = -215 + 250 * Math.max(0, Math.min(score, 100)) / 100;
  const tone = score >= 80 ? COLORS.green : score >= 60 ? COLORS.orange : COLORS.teal;
  page.arc(cx, centerTop, radius, -215, end, { color: tone, lineWidth: 11 });
  page.text(cx - radius, centerTop - 17, String(score), { size: 29, font: 'bold', align: 'center', width: radius * 2 });
  page.text(cx - radius, centerTop + 17, 'DE 100', { size: 6.5, font: 'bold', color: COLORS.muted, align: 'center', width: radius * 2 });
}

function progressBar(page, x, top, width, value, color, height = 7) {
  const ratio = Math.max(0, Math.min(Number(value) || 0, 1));
  page.roundedRect(x, top, width, height, height / 2, { fill: COLORS.surfaceLight });
  if (ratio > 0) page.roundedRect(x, top, Math.max(height, width * ratio), height, height / 2, { fill: color });
}

function scenarioCard(page, { x, top, width, title, accent, main, subtitle, result, recommended = false }) {
  page.roundedRect(x, top, width, 104, 14, { fill: recommended ? '#10372f' : COLORS.surface, stroke: recommended ? COLORS.teal : COLORS.border, lineWidth: recommended ? 1.2 : 0.7 });
  page.rect(x, top + 17, 4, 33, { fill: accent });
  page.text(x + 13, top + 12, title.toUpperCase(), { size: 7.2, font: 'bold', color: accent });
  page.text(x + 13, top + 31, main, { size: 13, font: 'bold' });
  page.wrappedText(x + 13, top + 53, subtitle, { width: width - 26, size: 6.5, lineHeight: 8, color: COLORS.muted, maxLines: 2 });
  page.line(x + 13, top + 76, x + width - 13, top + 76, { color: COLORS.border, lineWidth: 0.5 });
  page.text(x + 13, top + 84, result, { size: 7.2, font: 'bold', color: recommended ? COLORS.teal : COLORS.white });
  if (recommended) chip(page, x + width - 80, top + 8, 'RECOMENDADO', COLORS.teal, 68);
}

function addFooter(document, generatedAt) {
  document.pages.forEach((page, index) => {
    page.line(MARGIN, 810, PAGE_WIDTH - MARGIN, 810, { color: COLORS.border, lineWidth: 0.6 });
    page.text(MARGIN, 817, 'MEG FINANCE SYSTEM', { size: 6.2, font: 'bold', color: COLORS.teal });
    page.text(MARGIN + 101, 817, 'Inteligência financeira para decisões melhores.', { size: 5.9, color: COLORS.mutedDark });
    page.text(PAGE_WIDTH - MARGIN - 182, 817, `Gerado em ${generatedAt.toLocaleString('pt-BR')}`, { size: 5.9, color: COLORS.mutedDark, align: 'right', width: 138 });
    page.text(PAGE_WIDTH - MARGIN - 36, 817, `${index + 1} / ${document.pages.length}`, { size: 6.2, font: 'bold', color: COLORS.muted, align: 'right', width: 36 });
  });
}

function addExecutivePage(document, model) {
  const page = document.addPage();
  const { metrics } = model;
  addBackground(page);
  addHeader(page, 'PAINEL FINANCEIRO PREMIUM', `${model.metadata.periodLabel}  |  ${model.metadata.owner}`, 1);
  page.roundedRect(MARGIN, 94, PAGE_WIDTH - MARGIN * 2, 151, 18, { fill: COLORS.surface, stroke: COLORS.border, lineWidth: 0.8 });
  scoreGauge(page, MARGIN + 80, 170, metrics.healthScore, 50);
  page.text(MARGIN + 28, 222, metrics.healthStatus, { size: 6.5, font: 'bold', color: metrics.healthScore >= 60 ? COLORS.orange : COLORS.teal, align: 'center', width: 104 });
  page.line(MARGIN + 160, 112, MARGIN + 160, 226, { color: COLORS.border, lineWidth: 0.7 });
  chip(page, MARGIN + 181, 112, 'DECISÃO DO MÊS', COLORS.teal, 90);
  page.text(MARGIN + 181, 141, metrics.monthlyGap > 0 ? 'Reequilibrar para criar margem' : 'Proteger a margem conquistada', { size: 15, font: 'bold' });
  const decision = metrics.monthlyGap > 0
    ? `Hoje sobram ${money(metrics.savingsCapacity)} por mês. Para atingir uma margem saudável de 20%, a melhor rota é combinar receita e redução seletiva de gastos.`
    : `A margem atual já alcança a meta de 20%. Preserve o padrão, automatize a reserva e monitore os compromissos dos próximos 30 dias.`;
  page.wrappedText(MARGIN + 181, 167, decision, { width: 310, size: 8, lineHeight: 11, color: COLORS.muted, maxLines: 3 });
  page.text(MARGIN + 181, 211, `MARGEM ATUAL  ${percent(metrics.actualMarginRate)}    META  20,0%`, { size: 7.3, font: 'bold', color: COLORS.teal });

  sectionTitle(page, MARGIN, 264, 'Três caminhos para a meta', 'Escolha uma rota mensal e acompanhe a evolução da margem.');
  const scenarioWidth = (PAGE_WIDTH - MARGIN * 2 - 16) / 3;
  scenarioCard(page, { x: MARGIN, top: 297, width: scenarioWidth, title: 'Receita', accent: COLORS.blue, main: signedMoney(metrics.incomeIncreaseRequired), subtitle: `Nova receita mensal: ${money(metrics.healthyIncome)}`, result: 'Mantém as despesas atuais' });
  scenarioCard(page, { x: MARGIN + scenarioWidth + 8, top: 297, width: scenarioWidth, title: 'Despesas', accent: COLORS.purple, main: signedMoney(-metrics.expenseReductionRequired), subtitle: `Novo teto mensal: ${money(metrics.healthyExpenseCeiling)}`, result: 'Mantém a receita atual' });
  scenarioCard(page, { x: MARGIN + (scenarioWidth + 8) * 2, top: 297, width: scenarioWidth, title: 'Plano híbrido', accent: COLORS.teal, main: `${signedMoney(metrics.hybridIncomeIncrease)} receita`, subtitle: `${signedMoney(-metrics.hybridExpenseReduction)} em despesas por mês`, result: `Margem projetada: ${percent(metrics.hybridSavingsRate)}`, recommended: metrics.monthlyGap > 0 });

  const half = (PAGE_WIDTH - MARGIN * 2 - 10) / 2;
  page.roundedRect(MARGIN, 420, half, 113, 15, { fill: COLORS.surface, stroke: COLORS.border, lineWidth: 0.7 });
  sectionTitle(page, MARGIN + 14, 435, 'Composição mensal');
  const totalComposition = Math.max(metrics.averageIncome, metrics.averageExpense, 1);
  progressBar(page, MARGIN + 14, 463, half - 28, metrics.essentialAverage / totalComposition, COLORS.blue, 10);
  progressBar(page, MARGIN + 14, 481, half - 28, metrics.otherExpenseAverage / totalComposition, COLORS.purple, 10);
  progressBar(page, MARGIN + 14, 499, half - 28, Math.max(0, metrics.savingsCapacity) / totalComposition, COLORS.teal, 10);
  page.text(MARGIN + 14, 516, `Essenciais ${compactMoney(metrics.essentialAverage)}   Outros ${compactMoney(metrics.otherExpenseAverage)}   Margem ${compactMoney(metrics.savingsCapacity)}`, { size: 6.3, color: COLORS.muted });

  const liquidityX = MARGIN + half + 10;
  page.roundedRect(liquidityX, 420, half, 113, 15, { fill: COLORS.surface, stroke: COLORS.border, lineWidth: 0.7 });
  sectionTitle(page, liquidityX + 14, 435, 'Liquidez dos próximos 30 dias');
  page.text(liquidityX + 14, 463, money(metrics.currentBalance), { size: 16, font: 'bold', color: metrics.currentBalance >= 0 ? COLORS.teal : COLORS.red });
  page.text(liquidityX + 14, 484, `Saldo atual para ${money(metrics.next30Value)} em compromissos`, { size: 6.8, color: COLORS.muted });
  progressBar(page, liquidityX + 14, 503, half - 92, metrics.cashCoverage30, metrics.cashCoverage30 >= 1 ? COLORS.green : COLORS.orange, 9);
  page.text(liquidityX + half - 68, 500, percent(metrics.cashCoverage30), { size: 10, font: 'bold', color: metrics.cashCoverage30 >= 1 ? COLORS.green : COLORS.orange, align: 'right', width: 54 });

  page.roundedRect(MARGIN, 550, PAGE_WIDTH - MARGIN * 2, 127, 15, { fill: COLORS.surface, stroke: COLORS.border, lineWidth: 0.7 });
  sectionTitle(page, MARGIN + 14, 564, 'Onde agir primeiro', 'Maiores desvios mensais em relação às metas cadastradas.');
  const opportunities = model.budgetOpportunities.slice(0, 4);
  if (!opportunities.length) page.text(MARGIN + 14, 614, 'Não há categorias acima da meta mensal cadastrada.', { size: 8, color: COLORS.muted });
  else {
    const rowWidth = (PAGE_WIDTH - MARGIN * 2 - 28) / 2;
    opportunities.forEach((item, index) => {
      const x = MARGIN + 14 + (index % 2) * (rowWidth + 8);
      const top = 602 + Math.floor(index / 2) * 31;
      page.text(x, top, truncate(item.category, rowWidth - 100, 7.3, 'bold'), { size: 7.3, font: 'bold' });
      page.text(x + rowWidth - 92, top, `+${money(item.variance)}`, { size: 7.3, font: 'bold', color: COLORS.orange, align: 'right', width: 92 });
      progressBar(page, x, top + 14, rowWidth, Math.min(item.utilization / 3, 1), item.utilization > 2 ? COLORS.red : COLORS.orange, 5);
    });
  }

  sectionTitle(page, MARGIN, 696, 'Plano de virada em 90 dias');
  const timeline = [
    ['30 DIAS', 'Proteger caixa', `Cobrir ${compactMoney(metrics.next30Value)} em compromissos`],
    ['60 DIAS', 'Executar o híbrido', `${signedMoney(metrics.hybridIncomeIncrease)} receita, ${signedMoney(-metrics.hybridExpenseReduction)} gastos`],
    ['90 DIAS', 'Consolidar 20%', `Reservar ${compactMoney(metrics.hybridSavings)} por mês`],
  ];
  const timelineWidth = (PAGE_WIDTH - MARGIN * 2 - 16) / 3;
  timeline.forEach((item, index) => {
    const x = MARGIN + index * (timelineWidth + 8);
    page.roundedRect(x, 724, timelineWidth, 62, 12, { fill: index === 1 ? '#10372f' : COLORS.surfaceAlt, stroke: index === 1 ? COLORS.teal : COLORS.border, lineWidth: 0.7 });
    page.text(x + 10, 735, item[0], { size: 6.5, font: 'bold', color: index === 1 ? COLORS.teal : COLORS.muted });
    page.text(x + 10, 750, item[1], { size: 8, font: 'bold' });
    page.text(x + 10, 766, truncate(item[2], timelineWidth - 20, 6.2), { size: 6.2, color: COLORS.muted });
  });
}

function addAnalysisPage(document, model) {
  const page = document.addPage();
  const { metrics } = model;
  addBackground(page);
  addHeader(page, 'ANÁLISE INTELIGENTE', 'Os indicadores que explicam a saúde financeira atual', 2);
  const kpis = [
    ['MARGEM REAL', percent(metrics.actualMarginRate), metrics.actualMarginRate >= 0.2 ? COLORS.green : COLORS.orange],
    ['RECEITA SAUDÁVEL', money(metrics.healthyIncome), COLORS.blue],
    ['TETO DE DESPESAS', money(metrics.healthyExpenseCeiling), COLORS.purple],
    ['RESERVA A CONSTRUIR', money(metrics.emergencyGap), COLORS.teal],
  ];
  const kpiWidth = (PAGE_WIDTH - MARGIN * 2 - 18) / 4;
  kpis.forEach((item, index) => {
    const x = MARGIN + index * (kpiWidth + 6);
    page.roundedRect(x, 96, kpiWidth, 68, 12, { fill: COLORS.surface, stroke: COLORS.border, lineWidth: 0.7 });
    page.text(x + 10, 109, item[0], { size: 6.2, font: 'bold', color: COLORS.muted });
    page.text(x + 10, 132, truncate(item[1], kpiWidth - 20, 12, 'bold'), { size: 12, font: 'bold', color: item[2] });
  });

  const panelWidth = (PAGE_WIDTH - MARGIN * 2 - 10) / 2;
  page.roundedRect(MARGIN, 183, panelWidth, 230, 15, { fill: COLORS.surface, stroke: COLORS.border, lineWidth: 0.7 });
  sectionTitle(page, MARGIN + 14, 198, 'Gastos agrupados para decisão', 'Visão gerencial, sem detalhar cada lançamento.');
  const groupColors = [COLORS.blue, COLORS.purple, COLORS.orange, COLORS.teal, COLORS.green, COLORS.red];
  const maximumGroup = Math.max(1, ...model.managerialGroups.map((item) => item.monthlyAverage));
  model.managerialGroups.slice(0, 6).forEach((item, index) => {
    const top = 240 + index * 27;
    page.text(MARGIN + 14, top, truncate(item.group, 110, 6.8, 'bold'), { size: 6.8, font: 'bold' });
    page.text(MARGIN + panelWidth - 96, top, money(item.monthlyAverage), { size: 6.8, font: 'bold', align: 'right', width: 82 });
    progressBar(page, MARGIN + 14, top + 12, panelWidth - 28, item.monthlyAverage / maximumGroup, groupColors[index % groupColors.length], 6);
  });
  if (!model.managerialGroups.length) page.text(MARGIN + 14, 256, 'Sem despesas realizadas no período.', { size: 8, color: COLORS.muted });

  const scoreX = MARGIN + panelWidth + 10;
  page.roundedRect(scoreX, 183, panelWidth, 230, 15, { fill: COLORS.surface, stroke: COLORS.border, lineWidth: 0.7 });
  sectionTitle(page, scoreX + 14, 198, 'Como o índice foi formado', 'Cada componente possui um peso diferente.');
  scoreGauge(page, scoreX + panelWidth / 2, 284, metrics.healthScore, 45);
  model.scoreComponents.forEach((item, index) => {
    const top = 345 + index * 16;
    page.text(scoreX + 14, top, item.label, { size: 6.7, color: COLORS.muted });
    progressBar(page, scoreX + 82, top + 1, panelWidth - 145, item.score / item.max, index === 0 ? COLORS.teal : groupColors[index], 6);
    page.text(scoreX + panelWidth - 52, top - 1, `${item.score}/${item.max}`, { size: 6.7, font: 'bold', align: 'right', width: 38 });
  });

  page.roundedRect(MARGIN, 432, PAGE_WIDTH - MARGIN * 2, 174, 15, { fill: COLORS.surface, stroke: COLORS.border, lineWidth: 0.7 });
  sectionTitle(page, MARGIN + 14, 447, 'Desvios que pressionam o orçamento', 'Quanto a média mensal ultrapassa a meta, em reais e percentual.');
  const deviations = model.budgetOpportunities.slice(0, 5);
  const maximumVariance = Math.max(1, ...deviations.map((item) => item.variance));
  deviations.forEach((item, index) => {
    const top = 488 + index * 22;
    page.text(MARGIN + 14, top, truncate(item.category, 126, 7, 'bold'), { size: 7, font: 'bold' });
    progressBar(page, MARGIN + 150, top + 1, 255, item.variance / maximumVariance, item.utilization > 2 ? COLORS.red : COLORS.orange, 8);
    page.text(MARGIN + 418, top - 1, `+${money(item.variance)}`, { size: 7, font: 'bold', color: item.utilization > 2 ? COLORS.red : COLORS.orange, align: 'right', width: 72 });
    page.text(MARGIN + 496, top - 1, `${Math.round(item.utilization * 100)}%`, { size: 7, color: COLORS.muted, align: 'right', width: 18 });
  });
  if (!deviations.length) page.text(MARGIN + 14, 492, 'Nenhum desvio positivo encontrado nas metas cadastradas.', { size: 8, color: COLORS.muted });

  page.roundedRect(MARGIN, 625, PAGE_WIDTH - MARGIN * 2, 165, 15, { fill: COLORS.surfaceAlt, stroke: COLORS.border, lineWidth: 0.7 });
  sectionTitle(page, MARGIN + 14, 640, 'Leitura executiva');
  const highestDeviation = deviations[0];
  const insights = [
    `1. A margem real é ${percent(metrics.actualMarginRate)}. Para chegar a 20%, faltam ${money(metrics.monthlyGap)} em receita ou ${money(metrics.expenseReductionRequired)} em redução mensal de despesas.`,
    `2. As despesas essenciais representam ${percent(metrics.averageIncome > 0 ? metrics.essentialAverage / metrics.averageIncome : 0)} da receita média. A referência gerencial usada no índice é até 50%.`,
    highestDeviation ? `3. ${highestDeviation.category} é o maior desvio controlável, com ${money(highestDeviation.variance)} acima da meta mensal e utilização de ${Math.round(highestDeviation.utilization * 100)}%.` : '3. Não há metas ultrapassadas. O próximo ganho de qualidade depende de manter os orçamentos atualizados.',
  ];
  insights.forEach((insight, index) => {
    page.circle(MARGIN + 20, 680 + index * 31, 3, { fill: [COLORS.teal, COLORS.blue, COLORS.orange][index] });
    page.wrappedText(MARGIN + 31, 670 + index * 31, insight, { width: PAGE_WIDTH - MARGIN * 2 - 47, size: 7.4, lineHeight: 9.4, color: index === 0 ? COLORS.white : COLORS.muted, maxLines: 2 });
  });
}

function addProjectionPage(document, model) {
  const page = document.addPage();
  const { metrics } = model;
  addBackground(page);
  addHeader(page, 'PROJEÇÃO E RISCO', 'Compromissos futuros sem confundir previsão com gasto realizado', 3);
  page.roundedRect(MARGIN, 96, PAGE_WIDTH - MARGIN * 2, 144, 17, { fill: COLORS.surface, stroke: COLORS.border, lineWidth: 0.8 });
  sectionTitle(page, MARGIN + 16, 111, 'Cobertura dos próximos 30 dias', 'O cálculo usa apenas o saldo realizado atual.');
  scoreGauge(page, MARGIN + 90, 177, Math.round(Math.min(metrics.cashCoverage30, 1) * 100), 42);
  page.text(MARGIN + 151, 143, `${money(metrics.currentBalance)} disponíveis`, { size: 14, font: 'bold', color: metrics.currentBalance >= 0 ? COLORS.teal : COLORS.red });
  page.text(MARGIN + 151, 168, `${money(metrics.next30Value)} vencem em até 30 dias`, { size: 9 });
  page.text(MARGIN + 151, 190, metrics.unfunded30 > 0 ? `Lacuna sem cobertura: ${money(metrics.unfunded30)}` : 'Os compromissos estão cobertos pelo saldo atual.', { size: 8, font: 'bold', color: metrics.unfunded30 > 0 ? COLORS.orange : COLORS.green });
  page.wrappedText(MARGIN + 151, 211, 'Receitas futuras só entram no cenário abaixo como hipótese gerencial, nunca como valor realizado.', { width: 340, size: 6.7, color: COLORS.muted, maxLines: 2 });

  const half = (PAGE_WIDTH - MARGIN * 2 - 10) / 2;
  page.roundedRect(MARGIN, 259, half, 156, 15, { fill: COLORS.surface, stroke: COLORS.border, lineWidth: 0.7 });
  sectionTitle(page, MARGIN + 14, 274, 'Compromissos por mês');
  const futureMax = Math.max(1, ...model.futureMonthly.map((item) => item.total));
  model.futureMonthly.slice(0, 6).forEach((item, index) => {
    const top = 306 + index * 17;
    page.text(MARGIN + 14, top, item.label, { size: 6.5, color: COLORS.muted });
    progressBar(page, MARGIN + 74, top + 1, half - 144, item.total / futureMax, COLORS.blue, 6);
    page.text(MARGIN + half - 65, top - 1, compactMoney(item.total), { size: 6.5, font: 'bold', align: 'right', width: 51 });
  });

  const cardX = MARGIN + half + 10;
  page.roundedRect(cardX, 259, half, 156, 15, { fill: COLORS.surface, stroke: COLORS.border, lineWidth: 0.7 });
  sectionTitle(page, cardX + 14, 274, 'Risco nos cartões');
  const cards = model.cardRows.slice(0, 5);
  cards.forEach((item, index) => {
    const top = 308 + index * 21;
    page.text(cardX + 14, top, truncate(item.name, 90, 6.5, 'bold'), { size: 6.5, font: 'bold' });
    progressBar(page, cardX + 104, top + 1, half - 168, item.usage, item.usage >= 0.9 ? COLORS.red : item.usage >= 0.7 ? COLORS.orange : COLORS.teal, 7);
    page.text(cardX + half - 53, top - 1, item.limit > 0 ? percent(item.usage) : compactMoney(item.pending), { size: 6.5, font: 'bold', align: 'right', width: 39 });
  });
  if (!cards.length) page.text(cardX + 14, 313, 'Nenhum cartão cadastrado.', { size: 8, color: COLORS.muted });

  page.roundedRect(MARGIN, 435, PAGE_WIDTH - MARGIN * 2, 214, 15, { fill: COLORS.surface, stroke: COLORS.border, lineWidth: 0.7 });
  sectionTitle(page, MARGIN + 14, 450, 'Próximos vencimentos', `Até ${Math.min(model.upcoming.length, 6)} compromissos relevantes, ordenados por data.`);
  page.text(MARGIN + 14, 486, 'DATA', { size: 6.2, font: 'bold', color: COLORS.muted });
  page.text(MARGIN + 77, 486, 'COMPROMISSO', { size: 6.2, font: 'bold', color: COLORS.muted });
  page.text(PAGE_WIDTH - MARGIN - 107, 486, 'GRUPO', { size: 6.2, font: 'bold', color: COLORS.muted });
  page.text(PAGE_WIDTH - MARGIN - 74, 486, 'VALOR', { size: 6.2, font: 'bold', color: COLORS.muted, align: 'right', width: 74 });
  model.upcoming.slice(0, 6).forEach((item, index) => {
    const top = 508 + index * 22;
    if (index) page.line(MARGIN + 14, top - 7, PAGE_WIDTH - MARGIN - 14, top - 7, { color: COLORS.border, lineWidth: 0.4 });
    page.text(MARGIN + 14, top, dateLabel(item.date), { size: 6.8, color: COLORS.muted });
    page.text(MARGIN + 77, top, truncate(item.description, 226, 6.8), { size: 6.8, font: 'bold' });
    page.text(PAGE_WIDTH - MARGIN - 107, top, truncate(item.group || item.category || 'Sem grupo', 68, 6.5), { size: 6.5, color: COLORS.muted });
    page.text(PAGE_WIDTH - MARGIN - 74, top, money(item.value), { size: 6.8, font: 'bold', color: COLORS.orange, align: 'right', width: 74 });
  });
  if (!model.upcoming.length) page.text(MARGIN + 14, 522, 'Nenhum compromisso futuro encontrado no período disponível.', { size: 8, color: COLORS.muted });

  page.roundedRect(MARGIN, 669, PAGE_WIDTH - MARGIN * 2, 121, 15, { fill: COLORS.surfaceAlt, stroke: COLORS.border, lineWidth: 0.7 });
  sectionTitle(page, MARGIN + 14, 684, 'Teste de caixa');
  const scenarioWidth = (PAGE_WIDTH - MARGIN * 2 - 36) / 2;
  page.text(MARGIN + 14, 719, 'SEM NOVA RECEITA', { size: 6.5, font: 'bold', color: COLORS.orange });
  page.text(MARGIN + 14, 739, metrics.unfunded30 > 0 ? signedMoney(-metrics.unfunded30) : signedMoney(metrics.currentBalance - metrics.next30Value), { size: 14, font: 'bold', color: metrics.unfunded30 > 0 ? COLORS.red : COLORS.green });
  page.text(MARGIN + 14, 761, 'Saldo após reservar os próximos vencimentos', { size: 6.5, color: COLORS.muted });
  page.line(MARGIN + scenarioWidth + 18, 706, MARGIN + scenarioWidth + 18, 774, { color: COLORS.border, lineWidth: 0.7 });
  const secondX = MARGIN + scenarioWidth + 36;
  page.text(secondX, 719, 'COM UMA RECEITA MÉDIA', { size: 6.5, font: 'bold', color: COLORS.teal });
  page.text(secondX, 739, signedMoney(metrics.afterAverageIncome30), { size: 14, font: 'bold', color: metrics.afterAverageIncome30 >= 0 ? COLORS.green : COLORS.red });
  page.text(secondX, 761, 'Cenário ilustrativo, sujeito à confirmação da entrada', { size: 6.5, color: COLORS.muted });
}

function addActionPage(document, model) {
  const page = document.addPage();
  const { metrics } = model;
  addBackground(page);
  addHeader(page, 'PLANO DE AÇÃO EM 90 DIAS', 'Poucas ações, responsáveis claros e indicadores mensais', 4);
  page.roundedRect(MARGIN, 96, PAGE_WIDTH - MARGIN * 2, 103, 17, { fill: '#10372f', stroke: COLORS.teal, lineWidth: 1 });
  chip(page, MARGIN + 16, 111, 'OBJETIVO CENTRAL', COLORS.teal, 91);
  page.text(MARGIN + 16, 143, 'Construir uma margem financeira sustentável de 20%', { size: 14, font: 'bold' });
  page.wrappedText(MARGIN + 16, 169, metrics.monthlyGap > 0 ? `Meta recomendada: receita de ${money(metrics.hybridIncome)}, despesas de até ${money(metrics.hybridExpense)} e reserva mensal de ${money(metrics.hybridSavings)}.` : `A margem já está saudável. Automatize uma reserva mensal de ${money(metrics.savingsCapacity)} e preserve o teto de despesas de ${money(metrics.healthyExpenseCeiling)}.`, { width: PAGE_WIDTH - MARGIN * 2 - 32, size: 7.5, color: COLORS.muted, maxLines: 2 });

  sectionTitle(page, MARGIN, 220, 'Roteiro de execução');
  const phases = [
    { day: '30', color: COLORS.orange, title: 'Proteger o caixa imediato', actions: [`Reservar ${money(metrics.next30Value)} para vencimentos próximos.`, `Regularizar ${metrics.overdueCount} conta(s) vencida(s), total de ${money(metrics.overdueValue)}.`, 'Validar metas das categorias com maior desvio.'] },
    { day: '60', color: COLORS.blue, title: 'Executar o plano híbrido', actions: [`Elevar a receita mensal em ${money(metrics.hybridIncomeIncrease)}.`, `Reduzir despesas em ${money(metrics.hybridExpenseReduction)} por mês.`, 'Revisar semanalmente os gastos de estilo de vida.'] },
    { day: '90', color: COLORS.teal, title: 'Consolidar a margem de 20%', actions: [`Automatizar uma reserva de ${money(metrics.hybridSavings)} por mês.`, `Construir a reserva até ${money(metrics.emergencyGoal)}.`, 'Recalibrar metas usando a média dos três meses.'] },
  ];
  phases.forEach((phase, index) => {
    const top = 250 + index * 101;
    page.roundedRect(MARGIN, top, PAGE_WIDTH - MARGIN * 2, 88, 14, { fill: COLORS.surface, stroke: COLORS.border, lineWidth: 0.7 });
    page.circle(MARGIN + 43, top + 44, 27, { fill: COLORS.surfaceAlt, stroke: phase.color, lineWidth: 1.4 });
    page.text(MARGIN + 16, top + 20, phase.day, { size: 18, font: 'bold', color: phase.color, align: 'center', width: 54 });
    page.text(MARGIN + 16, top + 48, 'DIAS', { size: 5.8, font: 'bold', color: COLORS.muted, align: 'center', width: 54 });
    page.text(MARGIN + 85, top + 13, phase.title, { size: 10, font: 'bold' });
    phase.actions.forEach((action, actionIndex) => {
      page.circle(MARGIN + 91, top + 40 + actionIndex * 14, 2, { fill: phase.color });
      page.text(MARGIN + 99, top + 35 + actionIndex * 14, truncate(action, PAGE_WIDTH - MARGIN * 2 - 116, 7), { size: 7, color: actionIndex === 0 ? COLORS.white : COLORS.muted });
    });
  });

  sectionTitle(page, MARGIN, 563, 'Recomendações priorizadas');
  model.recommendations.slice(0, 4).forEach((item, index) => {
    const top = 589 + index * 30;
    const color = item.priority === 'CRÍTICA' ? COLORS.red : item.priority === 'ALTA' ? COLORS.orange : COLORS.teal;
    page.roundedRect(MARGIN, top, PAGE_WIDTH - MARGIN * 2, 24, 8, { fill: COLORS.surface });
    page.roundedRect(MARGIN + 7, top + 5, 49, 14, 7, { fill: COLORS.surfaceLight });
    page.text(MARGIN + 7, top + 8, item.priority, { size: 5.7, font: 'bold', color, align: 'center', width: 49 });
    page.text(MARGIN + 66, top + 7, truncate(`${item.title}: ${item.action}`, PAGE_WIDTH - MARGIN * 2 - 78, 6.8), { size: 6.8 });
  });

  page.roundedRect(MARGIN, 727, PAGE_WIDTH - MARGIN * 2, 63, 13, { fill: COLORS.surfaceAlt, stroke: COLORS.border, lineWidth: 0.7 });
  sectionTitle(page, MARGIN + 14, 740, 'Indicadores para acompanhar todo mês');
  const indicators = [`Margem ${percent(metrics.actualMarginRate)} de 20%`, `Despesas ${money(metrics.averageExpense)} de ${money(metrics.healthyExpenseCeiling)}`, `Cobertura 30 dias ${percent(metrics.cashCoverage30)}`, `Reserva ${money(metrics.currentReserve)} de ${money(metrics.emergencyGoal)}`];
  indicators.forEach((item, index) => page.text(MARGIN + 14 + (index % 2) * 255, 766 + Math.floor(index / 2) * 12, truncate(item, 238, 6.4), { size: 6.4, color: index < 2 ? COLORS.white : COLORS.muted }));
}

function monthlyTone(metrics) {
  if (!metrics.hasSufficientData) return COLORS.muted;
  if (metrics.projectedExpenseRatio <= 0.8) return COLORS.green;
  if (metrics.projectedExpenseRatio <= 1) return COLORS.orange;
  return COLORS.red;
}

function monthlyDecision(metrics) {
  if (!metrics.hasSufficientData) return 'Registrar o movimento do mês';
  if (metrics.overdueCount > 0) return 'Regularizar pendências e proteger o caixa';
  if (metrics.projectedExpenseRatio > 1) return 'Reduzir despesas e reforçar a receita';
  if (metrics.projectedExpenseRatio > 0.8) return 'Conter o ritmo para recuperar a margem';
  return 'Preservar o fechamento saudável';
}

function addMonthlyOverviewPage(document, model) {
  const page = document.addPage();
  const { metrics } = model;
  const tone = monthlyTone(metrics);
  addBackground(page);
  addHeader(page, 'PAINEL DE DESPESAS DO MÊS', `${model.metadata.periodLabel}  |  ${model.metadata.owner}`, 1);

  page.roundedRect(MARGIN, 96, PAGE_WIDTH - MARGIN * 2, 150, 18, { fill: COLORS.surface, stroke: COLORS.border, lineWidth: 0.8 });
  scoreGauge(page, MARGIN + 80, 170, metrics.controlScore, 49);
  page.text(MARGIN + 25, 220, metrics.healthStatus, { size: 6.3, font: 'bold', color: tone, align: 'center', width: 110 });
  page.line(MARGIN + 160, 113, MARGIN + 160, 226, { color: COLORS.border, lineWidth: 0.7 });
  chip(page, MARGIN + 181, 112, 'DECISÃO DO MÊS', tone, 90);
  page.text(MARGIN + 181, 142, monthlyDecision(metrics), { size: 14, font: 'bold' });
  const decisionText = metrics.projectedExpense > 0
    ? `O mês projeta ${money(metrics.projectedExpense)} em despesas. Com receita realizada de ${money(metrics.income)}, o fechamento estimado é ${signedMoney(metrics.projectedClosing)}.`
    : 'Não existem despesas monetárias cadastradas para o mês selecionado.';
  page.wrappedText(MARGIN + 181, 169, decisionText, { width: 310, size: 8, lineHeight: 11, color: COLORS.muted, maxLines: 3 });
  page.text(MARGIN + 181, 214, `REALIZADO  ${money(metrics.paidExpense)}    EM ABERTO  ${money(metrics.pendingValue)}`, { size: 7, font: 'bold', color: COLORS.teal });

  const kpis = [
    ['DESPESAS PAGAS', money(metrics.paidExpense), COLORS.blue],
    ['EM ABERTO', money(metrics.pendingValue), metrics.overdueCount ? COLORS.red : COLORS.orange],
    ['PROJEÇÃO DO MÊS', money(metrics.projectedExpense), COLORS.purple],
    ['FECHAMENTO', signedMoney(metrics.projectedClosing), metrics.projectedClosing >= 0 ? COLORS.green : COLORS.red],
  ];
  const kpiWidth = (PAGE_WIDTH - MARGIN * 2 - 18) / 4;
  kpis.forEach((item, index) => {
    const x = MARGIN + index * (kpiWidth + 6);
    page.roundedRect(x, 266, kpiWidth, 70, 12, { fill: COLORS.surface, stroke: COLORS.border, lineWidth: 0.7 });
    page.text(x + 10, 279, item[0], { size: 6.1, font: 'bold', color: COLORS.muted });
    page.text(x + 10, 303, truncate(item[1], kpiWidth - 20, 11.5, 'bold'), { size: 11.5, font: 'bold', color: item[2] });
  });

  const half = (PAGE_WIDTH - MARGIN * 2 - 10) / 2;
  page.roundedRect(MARGIN, 356, half, 205, 15, { fill: COLORS.surface, stroke: COLORS.border, lineWidth: 0.7 });
  sectionTitle(page, MARGIN + 14, 371, 'Composição gerencial', 'Pago e pendente agrupados por tipo de necessidade.');
  const groupColors = [COLORS.blue, COLORS.purple, COLORS.orange, COLORS.teal, COLORS.green, COLORS.red];
  const groupMaximum = Math.max(1, ...model.managerialGroups.map((item) => item.total));
  model.managerialGroups.slice(0, 6).forEach((item, index) => {
    const top = 416 + index * 24;
    page.text(MARGIN + 14, top, truncate(item.group, 105, 6.5, 'bold'), { size: 6.5, font: 'bold' });
    page.text(MARGIN + half - 79, top, compactMoney(item.total), { size: 6.5, font: 'bold', align: 'right', width: 65 });
    progressBar(page, MARGIN + 14, top + 12, half - 28, item.total / groupMaximum, groupColors[index % groupColors.length], 6);
  });
  if (!model.managerialGroups.length) page.text(MARGIN + 14, 430, 'Sem despesas no mês selecionado.', { size: 8, color: COLORS.muted });

  const impactX = MARGIN + half + 10;
  page.roundedRect(impactX, 356, half, 205, 15, { fill: COLORS.surface, stroke: COLORS.border, lineWidth: 0.7 });
  sectionTitle(page, impactX + 14, 371, 'O que mais impactou', 'Categorias com maior peso no fechamento mensal.');
  const categoryMaximum = Math.max(1, ...model.categories.map((item) => item.total));
  model.categories.slice(0, 5).forEach((item, index) => {
    const top = 419 + index * 28;
    page.text(impactX + 14, top, truncate(item.category, 115, 6.8, 'bold'), { size: 6.8, font: 'bold' });
    page.text(impactX + half - 82, top, `${percent(item.share)}  ${compactMoney(item.total)}`, { size: 6.3, font: 'bold', color: index === 0 ? COLORS.orange : COLORS.white, align: 'right', width: 68 });
    progressBar(page, impactX + 14, top + 13, half - 28, item.total / categoryMaximum, index === 0 ? COLORS.orange : COLORS.teal, 6);
  });
  if (!model.categories.length) page.text(impactX + 14, 430, 'Sem categorias para analisar.', { size: 8, color: COLORS.muted });

  page.roundedRect(MARGIN, 581, PAGE_WIDTH - MARGIN * 2, 199, 16, { fill: COLORS.surfaceAlt, stroke: COLORS.border, lineWidth: 0.7 });
  sectionTitle(page, MARGIN + 16, 597, 'Leitura rápida do fechamento', model.metadata.projectionMethod);
  const bridge = [
    ['RECEITA REALIZADA', metrics.income, COLORS.teal],
    ['DESPESA PAGA', -metrics.paidExpense, COLORS.blue],
    ['COMPROMISSOS ABERTOS', -metrics.pendingValue, COLORS.orange],
    ['RITMO ADICIONAL', -Math.max(metrics.projectedExpense - metrics.committedExpense, 0), COLORS.purple],
    ['SALDO PROJETADO', metrics.projectedClosing, metrics.projectedClosing >= 0 ? COLORS.green : COLORS.red],
  ];
  const bridgeWidth = (PAGE_WIDTH - MARGIN * 2 - 32) / 5;
  bridge.forEach((item, index) => {
    const x = MARGIN + 16 + index * (bridgeWidth + 4);
    page.roundedRect(x, 641, bridgeWidth, 71, 11, { fill: COLORS.surface, stroke: index === 4 ? item[2] : COLORS.border, lineWidth: index === 4 ? 1 : 0.5 });
    page.text(x + 7, 652, item[0], { size: 5.5, font: 'bold', color: COLORS.muted });
    page.text(x + 7, 677, truncate(signedMoney(item[1]), bridgeWidth - 14, 9, 'bold'), { size: 9, font: 'bold', color: item[2] });
  });
  page.wrappedText(MARGIN + 16, 732, metrics.incomeIncreaseRequired > 0
    ? `Para uma margem saudável de 20%, a receita necessária é ${money(metrics.requiredHealthyIncome)}. Alternativamente, reduza ${money(metrics.expenseReductionRequired)} da projeção atual.`
    : `A projeção está dentro do teto saudável de ${money(metrics.healthyExpenseCeiling)}. Preserve a diferença e transforme o saldo em reserva.`,
  { width: PAGE_WIDTH - MARGIN * 2 - 32, size: 7.2, lineHeight: 9.4, color: COLORS.muted, maxLines: 3 });
}

function addMonthlyImpactPage(document, model) {
  const page = document.addPage();
  const { metrics } = model;
  addBackground(page);
  addHeader(page, 'O QUE MAIS IMPACTOU', 'Categorias, lançamentos e meios de pagamento que explicam o mês', 2);
  const kpis = [
    ['MAIOR CATEGORIA', model.categories[0]?.category || 'Sem dados', COLORS.orange],
    ['PESO NO MÊS', percent(metrics.topCategoryShare), COLORS.purple],
    ['MÊS ANTERIOR', money(metrics.previousExpense), COLORS.blue],
    ['VARIAÇÃO PROJETADA', signedMoney(metrics.trendValue), metrics.trendValue <= 0 ? COLORS.green : COLORS.red],
  ];
  const kpiWidth = (PAGE_WIDTH - MARGIN * 2 - 18) / 4;
  kpis.forEach((item, index) => {
    const x = MARGIN + index * (kpiWidth + 6);
    page.roundedRect(x, 96, kpiWidth, 72, 12, { fill: COLORS.surface, stroke: COLORS.border, lineWidth: 0.7 });
    page.text(x + 10, 109, item[0], { size: 6, font: 'bold', color: COLORS.muted });
    page.text(x + 10, 133, truncate(item[1], kpiWidth - 20, index === 0 ? 8.5 : 11, 'bold'), { size: index === 0 ? 8.5 : 11, font: 'bold', color: item[2] });
  });

  page.roundedRect(MARGIN, 188, PAGE_WIDTH - MARGIN * 2, 276, 16, { fill: COLORS.surface, stroke: COLORS.border, lineWidth: 0.7 });
  sectionTitle(page, MARGIN + 16, 203, 'Ranking das categorias', 'O total combina valores pagos e compromissos em aberto no mês.');
  const maximum = Math.max(1, ...model.categories.map((item) => item.total));
  model.categories.slice(0, 7).forEach((item, index) => {
    const top = 247 + index * 29;
    page.text(MARGIN + 16, top, `${String(index + 1).padStart(2, '0')}  ${truncate(item.category, 126, 7, 'bold')}`, { size: 7, font: 'bold' });
    progressBar(page, MARGIN + 163, top + 1, 252, item.total / maximum, index === 0 ? COLORS.orange : index < 3 ? COLORS.teal : COLORS.blue, 9);
    page.text(MARGIN + 428, top - 1, money(item.total), { size: 7, font: 'bold', align: 'right', width: 77 });
    page.text(PAGE_WIDTH - MARGIN - 28, top - 1, percent(item.share), { size: 6.5, color: COLORS.muted, align: 'right', width: 28 });
  });
  if (!model.categories.length) page.text(MARGIN + 16, 257, 'Nenhuma categoria encontrada.', { size: 8, color: COLORS.muted });

  const half = (PAGE_WIDTH - MARGIN * 2 - 10) / 2;
  page.roundedRect(MARGIN, 484, half, 193, 15, { fill: COLORS.surface, stroke: COLORS.border, lineWidth: 0.7 });
  sectionTitle(page, MARGIN + 14, 499, 'Maiores despesas individuais');
  model.topExpenses.slice(0, 6).forEach((item, index) => {
    const top = 536 + index * 23;
    if (index) page.line(MARGIN + 14, top - 7, MARGIN + half - 14, top - 7, { color: COLORS.border, lineWidth: 0.4 });
    page.text(MARGIN + 14, top, truncate(item.description, 121, 6.6, 'bold'), { size: 6.6, font: 'bold' });
    page.text(MARGIN + half - 85, top, money(item.value), { size: 6.6, font: 'bold', color: item.status === 'EM ABERTO' ? COLORS.orange : COLORS.white, align: 'right', width: 71 });
    page.text(MARGIN + 14, top + 10, `${dateLabel(item.date)}  |  ${item.status}`, { size: 5.5, color: COLORS.muted });
  });
  if (!model.topExpenses.length) page.text(MARGIN + 14, 546, 'Sem despesas individuais.', { size: 8, color: COLORS.muted });

  const paymentX = MARGIN + half + 10;
  page.roundedRect(paymentX, 484, half, 193, 15, { fill: COLORS.surface, stroke: COLORS.border, lineWidth: 0.7 });
  sectionTitle(page, paymentX + 14, 499, 'Meios de pagamento');
  const paymentMaximum = Math.max(1, ...model.paymentMethods.map((item) => item.total));
  model.paymentMethods.slice(0, 6).forEach((item, index) => {
    const top = 539 + index * 23;
    page.text(paymentX + 14, top, truncate(item.method, 98, 6.5, 'bold'), { size: 6.5, font: 'bold' });
    page.text(paymentX + half - 80, top, compactMoney(item.total), { size: 6.5, font: 'bold', align: 'right', width: 66 });
    progressBar(page, paymentX + 14, top + 11, half - 28, item.total / paymentMaximum, [COLORS.purple, COLORS.blue, COLORS.teal][index % 3], 5);
  });
  if (!model.paymentMethods.length) page.text(paymentX + 14, 546, 'Sem meios de pagamento.', { size: 8, color: COLORS.muted });

  page.roundedRect(MARGIN, 697, PAGE_WIDTH - MARGIN * 2, 83, 14, { fill: COLORS.surfaceAlt, stroke: COLORS.border, lineWidth: 0.7 });
  sectionTitle(page, MARGIN + 14, 711, 'Leitura gerencial');
  const topCategory = model.categories[0];
  const budget = model.budgetOpportunities[0];
  page.wrappedText(MARGIN + 14, 741, topCategory
    ? `${topCategory.category} concentra ${percent(topCategory.share)} do mês, total de ${money(topCategory.total)}. ${budget ? `${budget.category} é o maior desvio de orçamento, com ${money(budget.variance)} acima da meta.` : 'Nenhum desvio positivo foi encontrado nas metas cadastradas.'}`
    : 'Ainda não há dados suficientes para identificar os principais impactos.',
  { width: PAGE_WIDTH - MARGIN * 2 - 28, size: 7.2, lineHeight: 9.5, color: COLORS.muted, maxLines: 3 });
}

function addMonthlyOpenProjectionPage(document, model) {
  const page = document.addPage();
  const { metrics } = model;
  addBackground(page);
  addHeader(page, 'EM ABERTO E PROJEÇÕES', 'Compromissos pendentes, riscos de atraso e fechamento esperado', 3);

  page.roundedRect(MARGIN, 96, PAGE_WIDTH - MARGIN * 2, 112, 17, { fill: metrics.overdueCount ? '#2c2026' : COLORS.surface, stroke: metrics.overdueCount ? COLORS.red : COLORS.border, lineWidth: 0.9 });
  chip(page, MARGIN + 16, 112, metrics.overdueCount ? 'ATENÇÃO IMEDIATA' : 'COMPROMISSOS DO MÊS', metrics.overdueCount ? COLORS.red : COLORS.teal, 104);
  page.text(MARGIN + 16, 145, money(metrics.pendingValue), { size: 22, font: 'bold', color: metrics.overdueCount ? COLORS.red : COLORS.orange });
  page.text(MARGIN + 16, 177, `${metrics.openCount} item(ns) em aberto, ${metrics.overdueCount} vencido(s)`, { size: 8, font: 'bold' });
  page.line(MARGIN + 235, 115, MARGIN + 235, 190, { color: COLORS.border, lineWidth: 0.7 });
  page.text(MARGIN + 257, 119, 'VALOR VENCIDO', { size: 6.5, font: 'bold', color: COLORS.muted });
  page.text(MARGIN + 257, 143, money(metrics.overdueValue), { size: 15, font: 'bold', color: metrics.overdueValue ? COLORS.red : COLORS.green });
  page.wrappedText(MARGIN + 257, 170, metrics.overdueCount ? 'Regularize primeiro os itens com juros, bloqueio ou impacto no crédito.' : 'Nenhum compromisso vencido foi encontrado no mês.', { width: 250, size: 6.8, lineHeight: 9, color: COLORS.muted, maxLines: 2 });

  page.roundedRect(MARGIN, 228, PAGE_WIDTH - MARGIN * 2, 253, 15, { fill: COLORS.surface, stroke: COLORS.border, lineWidth: 0.7 });
  sectionTitle(page, MARGIN + 14, 243, 'Compromissos em aberto', `Até ${Math.min(model.openItems.length, 8)} itens, priorizados por atraso e data.`);
  page.text(MARGIN + 14, 281, 'DATA', { size: 6, font: 'bold', color: COLORS.muted });
  page.text(MARGIN + 78, 281, 'COMPROMISSO', { size: 6, font: 'bold', color: COLORS.muted });
  page.text(PAGE_WIDTH - MARGIN - 135, 281, 'STATUS', { size: 6, font: 'bold', color: COLORS.muted });
  page.text(PAGE_WIDTH - MARGIN - 76, 281, 'VALOR', { size: 6, font: 'bold', color: COLORS.muted, align: 'right', width: 76 });
  model.openItems.slice(0, 8).forEach((item, index) => {
    const top = 307 + index * 21;
    if (index) page.line(MARGIN + 14, top - 7, PAGE_WIDTH - MARGIN - 14, top - 7, { color: COLORS.border, lineWidth: 0.4 });
    page.text(MARGIN + 14, top, dateLabel(item.date), { size: 6.6, color: item.overdue ? COLORS.red : COLORS.muted });
    page.text(MARGIN + 78, top, truncate(item.description || 'Despesa sem descrição', 245, 6.6, 'bold'), { size: 6.6, font: 'bold' });
    page.text(PAGE_WIDTH - MARGIN - 135, top, item.overdue ? `${item.daysLate} DIA(S)` : item.dueToday ? 'HOJE' : 'A VENCER', { size: 5.8, font: 'bold', color: item.overdue ? COLORS.red : COLORS.orange });
    page.text(PAGE_WIDTH - MARGIN - 76, top, money(item.value), { size: 6.6, font: 'bold', align: 'right', width: 76 });
  });
  if (!model.openItems.length) page.text(MARGIN + 14, 320, 'Nenhum compromisso em aberto no mês selecionado.', { size: 8, color: COLORS.muted });

  sectionTitle(page, MARGIN, 506, 'Cenários de fechamento', 'A receita futura não é presumida, somente valores realizados entram no cálculo.');
  const cardWidth = (PAGE_WIDTH - MARGIN * 2 - 16) / 3;
  scenarioCard(page, { x: MARGIN, top: 542, width: cardWidth, title: 'Comprometido', accent: COLORS.orange, main: money(metrics.committedExpense), subtitle: 'Pago mais compromissos em aberto', result: `Saldo: ${signedMoney(metrics.income - metrics.committedExpense)}` });
  scenarioCard(page, { x: MARGIN + cardWidth + 8, top: 542, width: cardWidth, title: 'Ritmo do mês', accent: COLORS.purple, main: money(metrics.paceProjection), subtitle: `${metrics.daysElapsed} de ${metrics.daysInMonth} dias considerados`, result: 'Projeção por ritmo realizado' });
  scenarioCard(page, { x: MARGIN + (cardWidth + 8) * 2, top: 542, width: cardWidth, title: 'Fechamento', accent: monthlyTone(metrics), main: signedMoney(metrics.projectedClosing), subtitle: `Despesa projetada: ${money(metrics.projectedExpense)}`, result: metrics.healthStatus, recommended: metrics.projectedExpenseRatio <= 0.8 });

  page.roundedRect(MARGIN, 668, PAGE_WIDTH - MARGIN * 2, 112, 15, { fill: '#10372f', stroke: COLORS.teal, lineWidth: 0.9 });
  sectionTitle(page, MARGIN + 16, 684, 'Receita necessária para saúde financeira');
  page.text(MARGIN + 16, 718, money(metrics.requiredHealthyIncome), { size: 19, font: 'bold', color: COLORS.teal });
  page.text(MARGIN + 203, 719, `Teto saudável de despesas: ${money(metrics.healthyExpenseCeiling)}`, { size: 8, font: 'bold' });
  page.wrappedText(MARGIN + 203, 743, metrics.incomeIncreaseRequired > 0
    ? `Faltam ${money(metrics.incomeIncreaseRequired)} em receita para que a projeção represente no máximo 80% da renda.`
    : 'A receita realizada já sustenta uma margem de pelo menos 20% no cenário projetado.',
  { width: 330, size: 7, lineHeight: 9, color: COLORS.muted, maxLines: 3 });
}

function addMonthlyImprovementPage(document, model) {
  const page = document.addPage();
  const { metrics } = model;
  addBackground(page);
  addHeader(page, 'PLANO DE MELHORIA', 'Ações objetivas para reduzir pressão e preparar o próximo mês', 4);

  page.roundedRect(MARGIN, 96, PAGE_WIDTH - MARGIN * 2, 105, 17, { fill: '#10372f', stroke: COLORS.teal, lineWidth: 1 });
  chip(page, MARGIN + 16, 112, 'META DO PRÓXIMO MÊS', COLORS.teal, 106);
  page.text(MARGIN + 16, 145, `Limitar despesas a ${money(Math.max(metrics.projectedExpense - metrics.suggestedSavings, 0))}`, { size: 14, font: 'bold' });
  page.wrappedText(MARGIN + 16, 173, metrics.suggestedSavings > 0
    ? `As oportunidades identificadas podem liberar ${money(metrics.suggestedSavings)}. Depois desse ajuste, a receita adicional estimada para manter 20% de margem seria ${money(metrics.incomeNeededAfterSavings)}.`
    : 'Não foram encontradas categorias controláveis suficientes. Revise metas e confirme a receita do próximo mês.',
  { width: PAGE_WIDTH - MARGIN * 2 - 32, size: 7.2, lineHeight: 9.5, color: COLORS.muted, maxLines: 2 });

  page.roundedRect(MARGIN, 222, PAGE_WIDTH - MARGIN * 2, 218, 15, { fill: COLORS.surface, stroke: COLORS.border, lineWidth: 0.7 });
  sectionTitle(page, MARGIN + 14, 237, 'Onde melhorar primeiro', 'Sugestões aplicadas somente a categorias flexíveis e controláveis.');
  page.text(MARGIN + 14, 276, 'CATEGORIA', { size: 6, font: 'bold', color: COLORS.muted });
  page.text(MARGIN + 260, 276, 'ATUAL', { size: 6, font: 'bold', color: COLORS.muted, align: 'right', width: 70 });
  page.text(MARGIN + 344, 276, 'NOVO LIMITE', { size: 6, font: 'bold', color: COLORS.muted, align: 'right', width: 82 });
  page.text(PAGE_WIDTH - MARGIN - 76, 276, 'ECONOMIA', { size: 6, font: 'bold', color: COLORS.muted, align: 'right', width: 76 });
  model.savingsOpportunities.slice(0, 5).forEach((item, index) => {
    const top = 307 + index * 25;
    if (index) page.line(MARGIN + 14, top - 8, PAGE_WIDTH - MARGIN - 14, top - 8, { color: COLORS.border, lineWidth: 0.4 });
    page.text(MARGIN + 14, top, truncate(item.category, 195, 7, 'bold'), { size: 7, font: 'bold' });
    page.text(MARGIN + 260, top, money(item.current), { size: 7, color: COLORS.muted, align: 'right', width: 70 });
    page.text(MARGIN + 344, top, money(item.newLimit), { size: 7, font: 'bold', align: 'right', width: 82 });
    page.text(PAGE_WIDTH - MARGIN - 76, top, `-${money(item.saving)}`, { size: 7, font: 'bold', color: COLORS.green, align: 'right', width: 76 });
  });
  if (!model.savingsOpportunities.length) page.text(MARGIN + 14, 312, 'Nenhuma categoria flexível com valor relevante foi encontrada.', { size: 8, color: COLORS.muted });
  page.text(MARGIN + 14, 417, `ECONOMIA POTENCIAL  ${money(metrics.suggestedSavings)}`, { size: 7.3, font: 'bold', color: COLORS.teal });

  page.roundedRect(MARGIN, 460, PAGE_WIDTH - MARGIN * 2, 185, 15, { fill: COLORS.surface, stroke: COLORS.border, lineWidth: 0.7 });
  sectionTitle(page, MARGIN + 14, 475, 'Ações priorizadas');
  model.recommendations.slice(0, 5).forEach((item, index) => {
    const top = 512 + index * 25;
    const color = item.priority === 'CRÍTICA' ? COLORS.red : item.priority === 'ALTA' ? COLORS.orange : item.priority === 'MANTER' ? COLORS.green : COLORS.teal;
    page.roundedRect(MARGIN + 14, top, 52, 17, 8, { fill: COLORS.surfaceLight });
    page.text(MARGIN + 14, top + 5, item.priority, { size: 5.5, font: 'bold', color, align: 'center', width: 52 });
    page.text(MARGIN + 77, top + 4, truncate(`${item.title}: ${item.action}`, PAGE_WIDTH - MARGIN * 2 - 105, 6.7), { size: 6.7, color: index === 0 ? COLORS.white : COLORS.muted });
  });

  page.roundedRect(MARGIN, 665, PAGE_WIDTH - MARGIN * 2, 115, 15, { fill: COLORS.surfaceAlt, stroke: COLORS.border, lineWidth: 0.7 });
  sectionTitle(page, MARGIN + 14, 680, 'Checklist de decisão gerencial');
  const checklist = [
    `1. Reservar ${money(metrics.pendingValue)} para compromissos em aberto.`,
    `2. Trabalhar com teto de ${money(Math.max(metrics.projectedExpense - metrics.suggestedSavings, 0))} em despesas.`,
    `3. Buscar receita mínima de ${money(Math.max(metrics.requiredHealthyIncome - metrics.suggestedSavings / 0.8, 0))}.`,
    `4. Acompanhar semanalmente ${model.categories[0]?.category || 'a categoria de maior impacto'}.`,
  ];
  checklist.forEach((item, index) => {
    const x = MARGIN + 14 + (index % 2) * 257;
    const top = 718 + Math.floor(index / 2) * 28;
    page.circle(x + 3, top + 5, 3, { fill: index < 2 ? COLORS.teal : COLORS.blue });
    page.text(x + 12, top, truncate(item, 235, 6.6), { size: 6.6, color: index < 2 ? COLORS.white : COLORS.muted });
  });
}

export function createExecutiveFinancialPdf({ state, start, end, owner, generatedAt = new Date() }) {
  const model = buildExecutiveFinancialModel({ state, start, end, owner, generatedAt });
  const document = new PdfDocument({ title: 'MEG Finance System | Relatório financeiro premium', author: owner || 'MEG Finance System', generatedAt });
  addExecutivePage(document, model);
  addAnalysisPage(document, model);
  addProjectionPage(document, model);
  addActionPage(document, model);
  addFooter(document, generatedAt);
  const bytes = document.bytes();
  return { bytes, blob: new Blob([bytes], { type: MIME_PDF }), filename: `relatorio-financeiro-premium-meg-${model.metadata.referenceDate}.pdf`, mimeType: MIME_PDF, model, pageCount: document.pages.length };
}

export function createMonthlyExpensePdf({ state, start, end, owner, generatedAt = new Date() }) {
  const model = buildMonthlyExpenseModel({ state, start, end, owner, generatedAt });
  const document = new PdfDocument({ title: `MEG Finance System | Despesas de ${model.metadata.periodLabel}`, author: owner || 'MEG Finance System', generatedAt });
  addMonthlyOverviewPage(document, model);
  addMonthlyImpactPage(document, model);
  addMonthlyOpenProjectionPage(document, model);
  addMonthlyImprovementPage(document, model);
  addFooter(document, generatedAt);
  const bytes = document.bytes();
  return { bytes, blob: new Blob([bytes], { type: MIME_PDF }), filename: `relatorio-mensal-despesas-meg-${model.metadata.month}.pdf`, mimeType: MIME_PDF, model, pageCount: document.pages.length };
}

export const executivePdfInternals = { PdfDocument, PdfPage, measureTextWidth, pdfText, wrapLines };
