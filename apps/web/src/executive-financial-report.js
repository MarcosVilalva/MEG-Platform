import { strToU8, zipSync } from 'fflate';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { buildExecutiveFinancialModel } from './executive-financial-report-core.js';

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const ReportExporter = registerPlugin('ReportExporter');
const CURRENCY_FORMAT = 'R$ #,##0.00;[Red](R$ #,##0.00);-';
const SHEETS = [
  'Resumo Executivo',
  'Plano de Ação',
  'Evolução Mensal',
  'Categorias e Metas',
  'Pendências',
  'Contas e Cartões',
  'Lançamentos',
  'Metodologia',
];

const STYLE = {
  base: 0,
  title: 1,
  subtitle: 2,
  section: 3,
  kpiLabel: 4,
  kpiPositive: 5,
  kpiNegative: 6,
  kpiNumber: 7,
  tableHeader: 8,
  currency: 9,
  percent: 10,
  date: 11,
  wrap: 12,
  positive: 13,
  warning: 14,
  danger: 15,
  integer: 16,
  muted: 17,
  scoreGood: 18,
  scoreWarn: 19,
  scoreRisk: 20,
  subheader: 21,
  currencyBold: 22,
  center: 23,
  kpiPercentPositive: 24,
  kpiPercentNegative: 25,
};

function xml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function columnName(index) {
  let value = Number(index);
  let name = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

function excelDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return 0;
  return Math.floor((Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) - Date.UTC(1899, 11, 30)) / 86400000);
}

function cell(column, value, style = STYLE.base, options = {}) {
  return { column, value, style, ...options };
}

function formulaCell(column, formula, cached, style = STYLE.base) {
  return cell(column, cached, style, { formula });
}

function dateCell(column, value, style = STYLE.date) {
  return cell(column, excelDate(value), style, { type: 'date' });
}

function cellXml(rowIndex, spec) {
  const reference = `${columnName(spec.column)}${rowIndex}`;
  const style = Number(spec.style || 0);
  const styleAttribute = style ? ` s="${style}"` : '';
  if (spec.formula) {
    const cached = Number.isFinite(Number(spec.value)) ? Number(spec.value) : 0;
    return `<c r="${reference}"${styleAttribute}><f>${xml(spec.formula)}</f><v>${cached}</v></c>`;
  }
  if (spec.type === 'date' || typeof spec.value === 'number') {
    const value = Number.isFinite(Number(spec.value)) ? Number(spec.value) : 0;
    return `<c r="${reference}"${styleAttribute}><v>${value}</v></c>`;
  }
  if (typeof spec.value === 'boolean') {
    return `<c r="${reference}" t="b"${styleAttribute}><v>${spec.value ? 1 : 0}</v></c>`;
  }
  return `<c r="${reference}" t="inlineStr"${styleAttribute}><is><t xml:space="preserve">${xml(spec.value)}</t></is></c>`;
}

function rowXml(row) {
  const height = row.height ? ` ht="${row.height}" customHeight="1"` : '';
  return `<row r="${row.index}"${height}>${row.cells.map((item) => cellXml(row.index, item)).join('')}</row>`;
}

function worksheetXml({ rows, widths, merges = [], freezeRows = 0, freezeColumns = 0, autoFilter = '', conditional = [], drawing = false, landscape = false }) {
  const activePane = freezeRows && freezeColumns
    ? 'bottomRight'
    : freezeRows
      ? 'bottomLeft'
      : freezeColumns
        ? 'topRight'
        : '';
  const pane = freezeRows || freezeColumns
    ? `<pane${freezeColumns ? ` xSplit="${freezeColumns}"` : ''}${freezeRows ? ` ySplit="${freezeRows}"` : ''} topLeftCell="${columnName(freezeColumns + 1)}${freezeRows + 1}" activePane="${activePane}" state="frozen"/>`
    : '';
  const selection = activePane
    ? `<selection pane="${activePane}" activeCell="${columnName(freezeColumns + 1)}${freezeRows + 1}" sqref="${columnName(freezeColumns + 1)}${freezeRows + 1}"/>`
    : '<selection activeCell="A1" sqref="A1"/>';
  const columns = widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join('');
  const mergeXml = merges.length ? `<mergeCells count="${merges.length}">${merges.map((range) => `<mergeCell ref="${range}"/>`).join('')}</mergeCells>` : '';
  const conditionalXml = conditional.join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetPr><outlinePr summaryBelow="1" summaryRight="1"/></sheetPr>
  <dimension ref="A1:${columnName(Math.max(widths.length, 1))}${Math.max(...rows.map((row) => row.index), 1)}"/>
  <sheetViews><sheetView showGridLines="0" tabSelected="0" workbookViewId="0">${pane}${selection}</sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>${columns}</cols>
  <sheetData>${rows.map(rowXml).join('')}</sheetData>
  ${autoFilter ? `<autoFilter ref="${autoFilter}"/>` : ''}
  ${mergeXml}
  ${conditionalXml}
  <pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>
  <pageSetup orientation="${landscape ? 'landscape' : 'portrait'}" fitToWidth="1" fitToHeight="0"/>
  ${drawing ? '<drawing r:id="rId1"/>' : ''}
</worksheet>`;
}

function stylesXml() {
  const fills = [
    '<fill><patternFill patternType="none"/></fill>',
    '<fill><patternFill patternType="gray125"/></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FF075E54"/><bgColor indexed="64"/></patternFill></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FFEAF6F2"/><bgColor indexed="64"/></patternFill></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F4"/><bgColor indexed="64"/></patternFill></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FFE8F7F0"/><bgColor indexed="64"/></patternFill></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFFF4DD"/><bgColor indexed="64"/></patternFill></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFFE8E6"/><bgColor indexed="64"/></patternFill></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FF123B36"/><bgColor indexed="64"/></patternFill></fill>',
  ];
  const fonts = [
    '<font><sz val="10"/><color rgb="FF18332E"/><name val="Aptos"/><family val="2"/></font>',
    '<font><b/><sz val="20"/><color rgb="FFFFFFFF"/><name val="Aptos Display"/><family val="2"/></font>',
    '<font><sz val="10"/><color rgb="FFD6FFF7"/><name val="Aptos"/><family val="2"/></font>',
    '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Aptos"/><family val="2"/></font>',
    '<font><b/><sz val="9"/><color rgb="FF58716B"/><name val="Aptos"/><family val="2"/></font>',
    '<font><b/><sz val="16"/><color rgb="FF047857"/><name val="Aptos Display"/><family val="2"/></font>',
    '<font><b/><sz val="16"/><color rgb="FFB42318"/><name val="Aptos Display"/><family val="2"/></font>',
    '<font><b/><sz val="16"/><color rgb="FF123B36"/><name val="Aptos Display"/><family val="2"/></font>',
    '<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Aptos"/><family val="2"/></font>',
    '<font><sz val="9"/><color rgb="FF6C7F7A"/><name val="Aptos"/><family val="2"/></font>',
    '<font><b/><sz val="11"/><color rgb="FF123B36"/><name val="Aptos"/><family val="2"/></font>',
  ];
  const border = '<border><left style="thin"><color rgb="FFD9E6E2"/></left><right style="thin"><color rgb="FFD9E6E2"/></right><top style="thin"><color rgb="FFD9E6E2"/></top><bottom style="thin"><color rgb="FFD9E6E2"/></bottom><diagonal/></border>';
  const noneBorder = '<border><left/><right/><top/><bottom/><diagonal/></border>';
  const xfs = [
    [0, 0, 0, 0, ''],
    [1, 2, 0, 0, 'applyAlignment="1"><alignment vertical="center"'],
    [2, 2, 0, 0, 'applyAlignment="1"><alignment vertical="center"'],
    [3, 2, 0, 0, 'applyAlignment="1"><alignment vertical="center"'],
    [4, 4, 1, 0, 'applyAlignment="1"><alignment horizontal="center" vertical="center"'],
    [5, 5, 1, 164, 'applyAlignment="1"><alignment horizontal="center" vertical="center"'],
    [6, 7, 1, 164, 'applyAlignment="1"><alignment horizontal="center" vertical="center"'],
    [7, 3, 1, 0, 'applyAlignment="1"><alignment horizontal="center" vertical="center"'],
    [8, 8, 1, 0, 'applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"'],
    [0, 0, 1, 164, 'applyAlignment="1"><alignment horizontal="right" vertical="center"'],
    [0, 0, 1, 165, 'applyAlignment="1"><alignment horizontal="right" vertical="center"'],
    [0, 0, 1, 166, 'applyAlignment="1"><alignment horizontal="center" vertical="center"'],
    [0, 0, 1, 0, 'applyAlignment="1"><alignment vertical="top" wrapText="1"'],
    [10, 5, 1, 0, 'applyAlignment="1"><alignment vertical="center" wrapText="1"'],
    [10, 6, 1, 0, 'applyAlignment="1"><alignment vertical="center" wrapText="1"'],
    [10, 7, 1, 0, 'applyAlignment="1"><alignment vertical="center" wrapText="1"'],
    [0, 0, 1, 167, 'applyAlignment="1"><alignment horizontal="right" vertical="center"'],
    [9, 0, 0, 0, 'applyAlignment="1"><alignment vertical="center" wrapText="1"'],
    [7, 5, 1, 167, 'applyAlignment="1"><alignment horizontal="center" vertical="center"'],
    [7, 6, 1, 167, 'applyAlignment="1"><alignment horizontal="center" vertical="center"'],
    [6, 7, 1, 167, 'applyAlignment="1"><alignment horizontal="center" vertical="center"'],
    [10, 3, 1, 0, 'applyAlignment="1"><alignment vertical="center"'],
    [10, 3, 1, 164, 'applyAlignment="1"><alignment horizontal="right" vertical="center"'],
    [0, 0, 1, 0, 'applyAlignment="1"><alignment horizontal="center" vertical="center"'],
    [5, 5, 1, 165, 'applyAlignment="1"><alignment horizontal="center" vertical="center"'],
    [6, 7, 1, 165, 'applyAlignment="1"><alignment horizontal="center" vertical="center"'],
  ];
  const cellXfs = xfs.map(([fontId, fillId, borderId, numFmtId, alignment]) => {
    const attributes = `numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0" applyFont="${fontId ? 1 : 0}" applyFill="${fillId ? 1 : 0}" applyBorder="${borderId ? 1 : 0}" applyNumberFormat="${numFmtId ? 1 : 0}"`;
    return alignment
      ? `<xf ${attributes} ${alignment}/></xf>`
      : `<xf ${attributes}/>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="4"><numFmt numFmtId="164" formatCode="${xml(CURRENCY_FORMAT)}"/><numFmt numFmtId="165" formatCode="0.0%;[Red](0.0%);-"/><numFmt numFmtId="166" formatCode="dd/mm/yyyy"/><numFmt numFmtId="167" formatCode="0"/></numFmts>
  <fonts count="${fonts.length}">${fonts.join('')}</fonts>
  <fills count="${fills.length}">${fills.join('')}</fills>
  <borders count="2">${noneBorder}${border}</borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="${xfs.length}">${cellXfs}</cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
  <dxfs count="3"><dxf><fill><patternFill patternType="solid"><fgColor rgb="FFE8F7F0"/><bgColor indexed="64"/></patternFill></fill></dxf><dxf><fill><patternFill patternType="solid"><fgColor rgb="FFFFF4DD"/><bgColor indexed="64"/></patternFill></fill></dxf><dxf><fill><patternFill patternType="solid"><fgColor rgb="FFFFE8E6"/><bgColor indexed="64"/></patternFill></fill></dxf></dxfs>
  <tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>`;
}

function baseHeader(title, subtitle, width = 12) {
  return {
    rows: [
      { index: 1, height: 30, cells: [cell(1, title, STYLE.title)] },
      { index: 2, height: 24, cells: [cell(1, subtitle, STYLE.subtitle)] },
    ],
    merges: [`A1:${columnName(width)}1`, `A2:${columnName(width)}2`],
  };
}

function conditionalForRange(range) {
  return `<conditionalFormatting sqref="${range}"><cfRule type="colorScale" priority="1"><colorScale><cfvo type="min"/><cfvo type="percentile" val="50"/><cfvo type="max"/><color rgb="FFFFE8E6"/><color rgb="FFFFF4DD"/><color rgb="FFE8F7F0"/></colorScale></cfRule></conditionalFormatting>`;
}

function conditionalRiskForRange(range) {
  return `<conditionalFormatting sqref="${range}"><cfRule type="colorScale" priority="1"><colorScale><cfvo type="min"/><cfvo type="percentile" val="50"/><cfvo type="max"/><color rgb="FFE8F7F0"/><color rgb="FFFFF4DD"/><color rgb="FFFFE8E6"/></colorScale></cfRule></conditionalFormatting>`;
}

function summarySheet(model) {
  const { metrics, metadata } = model;
  const base = baseHeader('MEG FINANÇAS | RELATÓRIO EXECUTIVO', `${metadata.periodLabel} | Emitido em ${new Date(metadata.generatedAt).toLocaleString('pt-BR')} | ${metadata.owner}`, 16);
  const rows = [...base.rows];
  const merges = [...base.merges];
  const card = (startColumn, label, value, negative = false, kind = 'currency') => {
    rows.push({ index: 5, height: 21, cells: [cell(startColumn, label, STYLE.kpiLabel)] });
    rows.push({
      index: 6,
      height: 34,
      cells: [cell(startColumn, value, kind === 'number' ? STYLE.kpiNumber : negative ? STYLE.kpiNegative : STYLE.kpiPositive)],
    });
    merges.push(`${columnName(startColumn)}5:${columnName(startColumn + 3)}5`, `${columnName(startColumn)}6:${columnName(startColumn + 3)}7`);
  };
  card(1, 'RECEITAS DO PERÍODO', metrics.income, false);
  card(5, 'DESPESAS DO PERÍODO', metrics.expense, true);
  card(9, 'RESULTADO OPERACIONAL', metrics.operatingResult, metrics.operatingResult < 0);
  card(13, 'SALDO APÓS PENDÊNCIAS', metrics.projectedBalance, metrics.projectedBalance < 0);

  const scoreStyle = metrics.healthScore >= 80 ? STYLE.scoreGood : metrics.healthScore >= 60 ? STYLE.scoreWarn : STYLE.scoreRisk;
  rows.push(
    { index: 9, height: 21, cells: [cell(1, 'SAÚDE FINANCEIRA', STYLE.kpiLabel), cell(5, 'TAXA DE POUPANÇA', STYLE.kpiLabel), cell(9, 'PENDÊNCIAS', STYLE.kpiLabel), cell(13, 'RESERVA A CONSTRUIR', STYLE.kpiLabel)] },
    { index: 10, height: 34, cells: [cell(1, metrics.healthScore, scoreStyle), cell(5, metrics.savingsRate, metrics.savingsRate >= 0.2 ? STYLE.kpiPercentPositive : STYLE.kpiPercentNegative), cell(9, metrics.pendingExpense, metrics.pendingExpense > 0 ? STYLE.kpiNegative : STYLE.kpiPositive), cell(13, metrics.emergencyGap, metrics.emergencyGap > 0 ? STYLE.kpiNegative : STYLE.kpiPositive)] },
    { index: 12, height: 22, cells: [cell(1, `STATUS: ${metrics.healthStatus}`, scoreStyle), cell(5, 'Meta recomendada: 20%', STYLE.muted), cell(9, `${metrics.pendingCount} conta(s), ${metrics.overdueCount} vencida(s)`, STYLE.muted), cell(13, `Meta de 6 meses: R$ ${metrics.emergencyGoal.toFixed(2)}`, STYLE.muted)] },
    { index: 14, height: 24, cells: [cell(1, 'EVOLUÇÃO MENSAL', STYLE.section), cell(7, 'MAIORES CATEGORIAS', STYLE.section), cell(12, 'FORMAS DE PAGAMENTO', STYLE.section)] },
  );
  merges.push('A9:D9', 'A10:D11', 'A12:D12', 'E9:H9', 'E10:H11', 'E12:H12', 'I9:L9', 'I10:L11', 'I12:L12', 'M9:P9', 'M10:P11', 'M12:P12', 'A14:E14', 'G14:J14', 'L14:P14');

  rows.push({ index: 15, cells: [cell(1, 'Mês', STYLE.tableHeader), cell(2, 'Receitas', STYLE.tableHeader), cell(3, 'Despesas', STYLE.tableHeader), cell(4, 'Resultado', STYLE.tableHeader), cell(5, 'Poupança', STYLE.tableHeader), cell(7, 'Categoria', STYLE.tableHeader), cell(8, 'Valor', STYLE.tableHeader), cell(9, '%', STYLE.tableHeader), cell(10, 'Tipo', STYLE.tableHeader), cell(12, 'Forma', STYLE.tableHeader), cell(13, 'Valor', STYLE.tableHeader), cell(14, '%', STYLE.tableHeader)] });
  const monthly = model.monthly.slice(-12);
  const categories = model.categories.slice(0, 10);
  const payments = model.paymentMethods.slice(0, 10);
  const previewRows = Math.max(monthly.length, categories.length, payments.length, 1);
  for (let index = 0; index < previewRows; index += 1) {
    const row = 16 + index;
    const month = monthly[index];
    const category = categories[index];
    const payment = payments[index];
    const cells = [];
    if (month) cells.push(cell(1, month.label), cell(2, month.income, STYLE.currency), cell(3, month.expense, STYLE.currency), formulaCell(4, `B${row}-C${row}`, month.result, STYLE.currency), formulaCell(5, `IF(B${row}>0,D${row}/B${row},0)`, month.savingsRate, STYLE.percent));
    if (category) cells.push(cell(7, category.category), cell(8, category.total, STYLE.currency), cell(9, category.share, STYLE.percent), cell(10, category.essential ? 'Essencial' : 'Flexível'));
    if (payment) cells.push(cell(12, payment.method), cell(13, payment.total, STYLE.currency), cell(14, payment.share, STYLE.percent));
    rows.push({ index: row, cells });
  }

  const chartStart = 16;
  const chartEnd = 15 + Math.max(monthly.length, 1);
  const categoryEnd = 15 + Math.max(categories.length, 1);
  rows.push({ index: 47, height: 24, cells: [cell(1, 'PRÓXIMAS AÇÕES RECOMENDADAS', STYLE.section)] });
  merges.push('A47:P47');
  model.recommendations.slice(0, 5).forEach((item, index) => {
    const row = 48 + index;
    const style = item.priority === 'CRÍTICA' ? STYLE.danger : item.priority === 'ALTA' ? STYLE.warning : STYLE.positive;
    rows.push({ index: row, height: 36, cells: [cell(1, item.priority, style), cell(3, item.title, STYLE.subheader), cell(7, item.action, STYLE.wrap), cell(14, item.impact, STYLE.currency)] });
    merges.push(`A${row}:B${row}`, `C${row}:F${row}`, `G${row}:M${row}`, `N${row}:P${row}`);
  });

  return {
    xml: worksheetXml({ rows, widths: [14, 14, 14, 14, 14, 3, 22, 14, 10, 12, 3, 22, 14, 10, 12, 12], merges, freezeRows: 2, drawing: true, landscape: true }),
    chartData: { monthly, categories, chartStart, chartEnd, categoryEnd },
  };
}

function actionSheet(model) {
  const base = baseHeader('PLANO DE AÇÃO FINANCEIRA', 'Recomendações calculadas a partir do histórico e do período selecionado', 8);
  const rows = [...base.rows, { index: 4, height: 28, cells: [cell(1, 'Prioridade', STYLE.tableHeader), cell(2, 'Objetivo', STYLE.tableHeader), cell(4, 'Ação prática', STYLE.tableHeader), cell(7, 'Impacto estimado', STYLE.tableHeader)] }];
  const merges = [...base.merges, 'B4:C4', 'D4:F4', 'G4:H4'];
  model.recommendations.forEach((item, index) => {
    const row = 5 + index * 2;
    const style = item.priority === 'CRÍTICA' ? STYLE.danger : item.priority === 'ALTA' ? STYLE.warning : STYLE.positive;
    rows.push(
      { index: row, height: 34, cells: [cell(1, item.priority, style), cell(2, item.title, STYLE.subheader), cell(4, item.action, STYLE.wrap), cell(7, item.impact, STYLE.currencyBold)] },
      { index: row + 1, height: 28, cells: [cell(2, `Por quê: ${item.reason}`, STYLE.muted)] },
    );
    merges.push(`B${row}:C${row}`, `D${row}:F${row}`, `G${row}:H${row}`, `B${row + 1}:H${row + 1}`);
  });
  const guideRow = 7 + model.recommendations.length * 2;
  rows.push(
    { index: guideRow, height: 24, cells: [cell(1, 'ROTINA SUGERIDA', STYLE.section)] },
    { index: guideRow + 1, height: 44, cells: [cell(1, '1. Reserve primeiro as contas pendentes. 2. Transfira a poupança no dia da renda. 3. Revise os três maiores grupos. 4. Atualize as metas mensalmente. 5. Gere este relatório novamente no fechamento.', STYLE.wrap)] },
  );
  merges.push(`A${guideRow}:H${guideRow}`, `A${guideRow + 1}:H${guideRow + 1}`);
  return worksheetXml({ rows, widths: [14, 24, 18, 27, 22, 20, 18, 18], merges, freezeRows: 4, landscape: true });
}

function monthlySheet(model) {
  const base = baseHeader('EVOLUÇÃO MENSAL', 'Receitas, despesas, resultado e capacidade de poupança', 7);
  const rows = [...base.rows, { index: 4, cells: [cell(1, 'Competência', STYLE.tableHeader), cell(2, 'Receitas', STYLE.tableHeader), cell(3, 'Despesas', STYLE.tableHeader), cell(4, 'Resultado', STYLE.tableHeader), cell(5, 'Taxa de poupança', STYLE.tableHeader), cell(6, 'Variação da despesa', STYLE.tableHeader), cell(7, 'Situação', STYLE.tableHeader)] }];
  model.monthly.forEach((item, index) => {
    const row = 5 + index;
    const previousExpense = index ? model.monthly[index - 1].expense : 0;
    const expenseVariation = previousExpense ? (item.expense - previousExpense) / previousExpense : 0;
    const status = item.result >= 0 ? 'Superávit' : 'Déficit';
    rows.push({ index: row, cells: [cell(1, item.label), cell(2, item.income, STYLE.currency), cell(3, item.expense, STYLE.currency), formulaCell(4, `B${row}-C${row}`, item.result, STYLE.currency), formulaCell(5, `IF(B${row}>0,D${row}/B${row},0)`, item.savingsRate, STYLE.percent), cell(6, expenseVariation, STYLE.percent), cell(7, status, status === 'Superávit' ? STYLE.positive : STYLE.danger)] });
  });
  const end = Math.max(5, 4 + model.monthly.length);
  return worksheetXml({ rows, widths: [16, 17, 17, 17, 18, 19, 16], merges: base.merges, freezeRows: 4, autoFilter: `A4:G${end}`, conditional: [conditionalForRange(`D5:D${end}`)], landscape: true });
}

function categorySheet(model) {
  const base = baseHeader('CATEGORIAS E METAS', 'Comparação entre gastos realizados, médias e limites definidos no MEG', 9);
  const rows = [...base.rows, { index: 4, cells: [cell(1, 'Categoria', STYLE.tableHeader), cell(2, 'Tipo', STYLE.tableHeader), cell(3, 'Gasto', STYLE.tableHeader), cell(4, '% das despesas', STYLE.tableHeader), cell(5, 'Média mensal', STYLE.tableHeader), cell(6, 'Meta mensal', STYLE.tableHeader), cell(7, 'Meta do período', STYLE.tableHeader), cell(8, 'Variação', STYLE.tableHeader), cell(9, 'Utilização', STYLE.tableHeader)] }];
  model.budgetRows.forEach((item, index) => {
    const row = 5 + index;
    const statusStyle = item.budget > 0 && item.variance > 0 ? STYLE.danger : STYLE.base;
    rows.push({ index: row, cells: [cell(1, item.category), cell(2, item.essential ? 'Essencial' : 'Flexível'), cell(3, item.total, STYLE.currency), formulaCell(4, `IF(SUM($C$5:$C$${Math.max(5, 4 + model.budgetRows.length)})>0,C${row}/SUM($C$5:$C$${Math.max(5, 4 + model.budgetRows.length)}),0)`, item.share, STYLE.percent), cell(5, item.monthlyAverage, STYLE.currency), cell(6, item.monthlyBudget, STYLE.currency), cell(7, item.budget, STYLE.currency), formulaCell(8, `C${row}-G${row}`, item.variance, statusStyle === STYLE.danger ? STYLE.kpiNegative : STYLE.currency), formulaCell(9, `IF(G${row}>0,C${row}/G${row},0)`, item.utilization, STYLE.percent)] });
  });
  const end = Math.max(5, 4 + model.budgetRows.length);
  return worksheetXml({ rows, widths: [26, 14, 16, 16, 17, 17, 17, 17, 15], merges: base.merges, freezeRows: 4, autoFilter: `A4:I${end}`, conditional: [conditionalRiskForRange(`H5:H${end}`), conditionalRiskForRange(`I5:I${end}`)], landscape: true });
}

function pendingSheet(model) {
  const base = baseHeader('CONTAS PENDENTES', 'Compromissos em aberto ordenados por vencimento', 10);
  const rows = [...base.rows, { index: 4, cells: [cell(1, 'Vencimento', STYLE.tableHeader), cell(2, 'Atraso (dias)', STYLE.tableHeader), cell(3, 'Descrição', STYLE.tableHeader), cell(5, 'Categoria', STYLE.tableHeader), cell(6, 'Forma de pagamento', STYLE.tableHeader), cell(8, 'Valor', STYLE.tableHeader), cell(9, 'Situação', STYLE.tableHeader), cell(10, 'Observações', STYLE.tableHeader)] }];
  const merges = [...base.merges, 'C4:D4', 'F4:G4'];
  model.pending.forEach((item, index) => {
    const row = 5 + index;
    const style = item.overdue ? STYLE.danger : STYLE.warning;
    rows.push({ index: row, height: 24, cells: [dateCell(1, item.date), cell(2, item.daysLate, STYLE.integer), cell(3, item.description || '', STYLE.wrap), cell(5, item.group || item.category || 'Sem categoria'), cell(6, item.paymentMethod || item.account || ''), cell(8, item.value, STYLE.currency), cell(9, item.overdue ? 'VENCIDA' : 'A VENCER', style), cell(10, item.notes || '', STYLE.wrap)] });
    merges.push(`C${row}:D${row}`, `F${row}:G${row}`);
  });
  if (!model.pending.length) {
    rows.push({ index: 5, height: 28, cells: [cell(1, 'Nenhuma conta pendente no período selecionado.', STYLE.positive)] });
    merges.push('A5:J5');
  }
  const end = Math.max(5, 4 + model.pending.length);
  return worksheetXml({ rows, widths: [14, 13, 24, 14, 20, 18, 14, 16, 14, 30], merges, freezeRows: 4, autoFilter: model.pending.length ? `A4:J${end}` : '', landscape: true });
}

function accountsSheet(model) {
  const base = baseHeader('CONTAS E CARTÕES', 'Posição estimada das contas e utilização dos limites cadastrados', 10);
  const rows = [...base.rows, { index: 4, cells: [cell(1, 'CONTAS FINANCEIRAS', STYLE.section)] }, { index: 5, cells: [cell(1, 'Conta', STYLE.tableHeader), cell(3, 'Tipo', STYLE.tableHeader), cell(4, 'Subtipo', STYLE.tableHeader), cell(5, 'Saldo inicial', STYLE.tableHeader), cell(6, 'Saldo calculado', STYLE.tableHeader), cell(7, 'Lançamentos', STYLE.tableHeader), cell(8, 'Ativa', STYLE.tableHeader)] }];
  const merges = [...base.merges, 'A4:H4', 'A5:B5'];
  model.accountRows.forEach((item, index) => {
    const row = 6 + index;
    rows.push({ index: row, cells: [cell(1, item.name), cell(3, item.type), cell(4, item.subtype), cell(5, item.openingBalance, STYLE.currency), cell(6, item.balance, STYLE.currency), cell(7, item.transactionCount, STYLE.integer), cell(8, item.active ? 'SIM' : 'NÃO', item.active ? STYLE.positive : STYLE.muted)] });
    merges.push(`A${row}:B${row}`);
  });
  const cardTitleRow = Math.max(8, 8 + model.accountRows.length);
  rows.push({ index: cardTitleRow, cells: [cell(1, 'CARTÕES DE CRÉDITO', STYLE.section)] }, { index: cardTitleRow + 1, cells: [cell(1, 'Cartão', STYLE.tableHeader), cell(3, 'Emissor', STYLE.tableHeader), cell(4, 'Final', STYLE.tableHeader), cell(5, 'Limite', STYLE.tableHeader), cell(6, 'Em aberto', STYLE.tableHeader), cell(7, 'Disponível', STYLE.tableHeader), cell(8, 'Utilização', STYLE.tableHeader), cell(9, 'Fecha', STYLE.tableHeader), cell(10, 'Vence', STYLE.tableHeader)] });
  merges.push(`A${cardTitleRow}:J${cardTitleRow}`, `A${cardTitleRow + 1}:B${cardTitleRow + 1}`);
  model.cardRows.forEach((item, index) => {
    const row = cardTitleRow + 2 + index;
    rows.push({ index: row, cells: [cell(1, item.name), cell(3, item.issuer), cell(4, item.lastFour), cell(5, item.limit, STYLE.currency), cell(6, item.pending, STYLE.currency), formulaCell(7, `MAX(E${row}-F${row},0)`, item.available, STYLE.currency), formulaCell(8, `IF(E${row}>0,F${row}/E${row},0)`, item.usage, STYLE.percent), cell(9, item.closingDay, STYLE.integer), cell(10, item.dueDay, STYLE.integer)] });
    merges.push(`A${row}:B${row}`);
  });
  return worksheetXml({ rows, widths: [22, 14, 16, 12, 16, 16, 16, 14, 11, 11], merges, freezeRows: 2, conditional: model.cardRows.length ? [conditionalRiskForRange(`H${cardTitleRow + 2}:H${cardTitleRow + 1 + model.cardRows.length}`)] : [], landscape: true });
}

function transactionsSheet(model) {
  const base = baseHeader('LANÇAMENTOS DO PERÍODO', 'Base detalhada usada nos indicadores e análises deste arquivo', 14);
  const headerRow = 4;
  const rows = [...base.rows, { index: headerRow, cells: [cell(1, 'Data', STYLE.tableHeader), cell(2, 'Data da compra', STYLE.tableHeader), cell(3, 'Tipo', STYLE.tableHeader), cell(4, 'Descrição', STYLE.tableHeader), cell(6, 'Categoria', STYLE.tableHeader), cell(7, 'Receita', STYLE.tableHeader), cell(8, 'Despesa', STYLE.tableHeader), cell(9, 'Forma de pagamento', STYLE.tableHeader), cell(11, 'Situação', STYLE.tableHeader), cell(12, 'Modalidade', STYLE.tableHeader), cell(13, 'Classificação', STYLE.tableHeader), cell(14, 'Observações', STYLE.tableHeader)] }];
  const merges = [...base.merges, 'D4:E4', 'I4:J4'];
  model.transactions.forEach((item, index) => {
    const row = headerRow + 1 + index;
    rows.push({ index: row, height: 22, cells: [dateCell(1, item.date), item.purchaseDate ? dateCell(2, item.purchaseDate) : cell(2, ''), cell(3, item.type === 'income' ? 'RECEITA' : 'DESPESA'), cell(4, item.description || '', STYLE.wrap), cell(6, item.group || item.category || ''), cell(7, transactionValueSafe(item, 'income'), STYLE.currency), cell(8, transactionValueSafe(item, 'expense'), STYLE.currency), cell(9, item.paymentMethod || item.account || ''), cell(11, item.status === 'paid' || String(item.situation || '').toUpperCase() === 'PAGO' ? 'PAGO' : 'PENDENTE', item.status === 'paid' ? STYLE.positive : STYLE.warning), cell(12, item.modality || ''), cell(13, item.expenseClass || ''), cell(14, item.notes || '', STYLE.wrap)] });
    merges.push(`D${row}:E${row}`, `I${row}:J${row}`);
  });
  const end = Math.max(5, headerRow + model.transactions.length);
  return worksheetXml({ rows, widths: [13, 15, 12, 24, 12, 23, 16, 16, 20, 14, 14, 16, 20, 34], merges, freezeRows: 4, autoFilter: `A4:N${end}`, landscape: true });
}

function transactionValueSafe(item, type) {
  if (item.type !== type) return 0;
  return Number(type === 'income' ? item.incomeAmount ?? item.amount : item.expenseAmount ?? item.amount) || 0;
}

function methodologySheet(model) {
  const base = baseHeader('METODOLOGIA E CONTROLES', 'Definições para interpretar e auditar o relatório', 8);
  const rows = [...base.rows,
    { index: 4, cells: [cell(1, 'Item', STYLE.tableHeader), cell(3, 'Definição', STYLE.tableHeader), cell(7, 'Status', STYLE.tableHeader)] },
    { index: 5, height: 38, cells: [cell(1, 'Fonte dos dados', STYLE.subheader), cell(3, model.metadata.source, STYLE.wrap), cell(7, 'OK', STYLE.positive)] },
    { index: 6, height: 38, cells: [cell(1, 'Período', STYLE.subheader), cell(3, `${model.metadata.start} a ${model.metadata.end}`, STYLE.wrap), cell(7, 'OK', STYLE.positive)] },
    { index: 7, height: 42, cells: [cell(1, 'Saldo projetado', STYLE.subheader), cell(3, 'Saldo disponível após considerar todas as despesas lançadas no período, inclusive pendências.', STYLE.wrap), cell(7, 'OK', STYLE.positive)] },
    { index: 8, height: 42, cells: [cell(1, 'Taxa de poupança', STYLE.subheader), cell(3, '(Renda média menos despesa média) dividida pela renda média. Referência recomendada: 20%.', STYLE.wrap), cell(7, 'OK', STYLE.positive)] },
    { index: 9, height: 42, cells: [cell(1, 'Reserva de emergência', STYLE.subheader), cell(3, 'Meta equivalente a seis meses da média das categorias consideradas essenciais.', STYLE.wrap), cell(7, 'OK', STYLE.positive)] },
    { index: 10, height: 54, cells: [cell(1, 'Índice de saúde', STYLE.subheader), cell(3, 'Pontuação de 0 a 100 que combina poupança, peso das despesas essenciais, cobertura do saldo projetado e pontualidade das contas.', STYLE.wrap), cell(7, `${model.metrics.healthScore}/100`, model.metrics.healthScore >= 80 ? STYLE.positive : model.metrics.healthScore >= 60 ? STYLE.warning : STYLE.danger)] },
    { index: 12, height: 24, cells: [cell(1, 'AVISO IMPORTANTE', STYLE.section)] },
    { index: 13, height: 58, cells: [cell(1, 'As recomendações são educativas e baseadas nos lançamentos registrados no MEG. Revise cadastros, datas, saldos e metas antes de tomar decisões financeiras. O relatório não substitui orientação profissional individualizada.', STYLE.wrap)] },
    { index: 15, cells: [cell(1, 'CONTROLES DE QUALIDADE', STYLE.section)] },
    { index: 16, cells: [cell(1, 'Lançamentos encontrados', STYLE.subheader), cell(3, model.metrics.transactionCount, STYLE.integer), cell(7, model.metrics.transactionCount ? 'PASS' : 'ATENÇÃO', model.metrics.transactionCount ? STYLE.positive : STYLE.warning)] },
    { index: 17, cells: [cell(1, 'Receitas conciliadas', STYLE.subheader), cell(3, model.metrics.income, STYLE.currency), cell(7, 'PASS', STYLE.positive)] },
    { index: 18, cells: [cell(1, 'Despesas conciliadas', STYLE.subheader), cell(3, model.metrics.expense, STYLE.currency), cell(7, 'PASS', STYLE.positive)] },
    { index: 19, cells: [cell(1, 'Versão da metodologia', STYLE.subheader), cell(3, model.metadata.methodologyVersion), cell(7, 'PASS', STYLE.positive)] },
  ];
  const merges = [...base.merges, 'A4:B4', 'C4:F4', 'G4:H4', 'A5:B5', 'C5:F5', 'G5:H5', 'A6:B6', 'C6:F6', 'G6:H6', 'A7:B7', 'C7:F7', 'G7:H7', 'A8:B8', 'C8:F8', 'G8:H8', 'A9:B9', 'C9:F9', 'G9:H9', 'A10:B10', 'C10:F10', 'G10:H10', 'A12:H12', 'A13:H13', 'A15:H15', 'A16:B16', 'C16:F16', 'G16:H16', 'A17:B17', 'C17:F17', 'G17:H17', 'A18:B18', 'C18:F18', 'G18:H18', 'A19:B19', 'C19:F19', 'G19:H19'];
  return worksheetXml({ rows, widths: [24, 14, 24, 20, 18, 18, 14, 14], merges, freezeRows: 2, landscape: true });
}

function chartSeries(index, name, categoryFormula, categories, valueFormula, values, color) {
  return `<c:ser><c:idx val="${index}"/><c:order val="${index}"/><c:tx><c:v>${xml(name)}</c:v></c:tx><c:spPr><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:ln><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></a:ln></c:spPr><c:marker><c:symbol val="circle"/><c:size val="5"/></c:marker><c:cat><c:strRef><c:f>${xml(categoryFormula)}</c:f><c:strCache><c:ptCount val="${categories.length}"/>${categories.map((value, point) => `<c:pt idx="${point}"><c:v>${xml(value)}</c:v></c:pt>`).join('')}</c:strCache></c:strRef></c:cat><c:val><c:numRef><c:f>${xml(valueFormula)}</c:f><c:numCache><c:formatCode>${xml(CURRENCY_FORMAT)}</c:formatCode><c:ptCount val="${values.length}"/>${values.map((value, point) => `<c:pt idx="${point}"><c:v>${Number(value) || 0}</c:v></c:pt>`).join('')}</c:numCache></c:numRef></c:val><c:smooth val="0"/></c:ser>`;
}

function chartTitle(title) {
  return `<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="pt-BR" sz="1200" b="1"/><a:t>${xml(title)}</a:t></a:r></a:p></c:rich></c:tx><c:layout/><c:overlay val="0"/></c:title>`;
}

function lineChartXml(data) {
  const categories = data.monthly.map((item) => item.label);
  const start = data.chartStart;
  const end = data.chartEnd;
  const categoryFormula = `'Resumo Executivo'!$A$${start}:$A$${end}`;
  const series = [
    chartSeries(0, 'Receitas', categoryFormula, categories, `'Resumo Executivo'!$B$${start}:$B$${end}`, data.monthly.map((item) => item.income), '0A8F78'),
    chartSeries(1, 'Despesas', categoryFormula, categories, `'Resumo Executivo'!$C$${start}:$C$${end}`, data.monthly.map((item) => item.expense), 'DC5145'),
    chartSeries(2, 'Resultado', categoryFormula, categories, `'Resumo Executivo'!$D$${start}:$D$${end}`, data.monthly.map((item) => item.result), '315EFB'),
  ].join('');
  return chartSpace(`${chartTitle('Receitas, despesas e resultado mensal')}<c:plotArea><c:layout/><c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>${series}<c:axId val="710001"/><c:axId val="710002"/></c:lineChart>${axes('710001', '710002')}</c:plotArea><c:legend><c:legendPos val="b"/><c:layout/></c:legend><c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/>`);
}

function barChartXml(data) {
  const categories = data.categories.map((item) => item.category);
  const start = data.chartStart;
  const end = data.categoryEnd;
  const series = barSeries(0, 'Despesas', `'Resumo Executivo'!$G$${start}:$G$${end}`, categories, `'Resumo Executivo'!$H$${start}:$H$${end}`, data.categories.map((item) => item.total), '0A8F78');
  return chartSpace(`${chartTitle('Maiores categorias de despesas')}<c:plotArea><c:layout/><c:barChart><c:barDir val="bar"/><c:grouping val="clustered"/><c:varyColors val="0"/>${series}<c:gapWidth val="65"/><c:axId val="720001"/><c:axId val="720002"/></c:barChart>${barAxes('720001', '720002')}</c:plotArea><c:legend><c:delete val="1"/></c:legend><c:plotVisOnly val="1"/>`);
}

function barSeries(index, name, categoryFormula, categories, valueFormula, values, color) {
  return `<c:ser><c:idx val="${index}"/><c:order val="${index}"/><c:tx><c:v>${xml(name)}</c:v></c:tx><c:spPr><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:ln><a:noFill/></a:ln></c:spPr><c:cat><c:strRef><c:f>${xml(categoryFormula)}</c:f><c:strCache><c:ptCount val="${categories.length}"/>${categories.map((value, point) => `<c:pt idx="${point}"><c:v>${xml(value)}</c:v></c:pt>`).join('')}</c:strCache></c:strRef></c:cat><c:val><c:numRef><c:f>${xml(valueFormula)}</c:f><c:numCache><c:formatCode>${xml(CURRENCY_FORMAT)}</c:formatCode><c:ptCount val="${values.length}"/>${values.map((value, point) => `<c:pt idx="${point}"><c:v>${Number(value) || 0}</c:v></c:pt>`).join('')}</c:numCache></c:numRef></c:val></c:ser>`;
}

function axes(categoryId, valueId) {
  return `<c:catAx><c:axId val="${categoryId}"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:numFmt formatCode="General" sourceLinked="1"/><c:tickLblPos val="nextTo"/><c:crossAx val="${valueId}"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/></c:catAx><c:valAx><c:axId val="${valueId}"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:majorGridlines/><c:numFmt formatCode="${xml(CURRENCY_FORMAT)}" sourceLinked="0"/><c:tickLblPos val="nextTo"/><c:crossAx val="${categoryId}"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx>`;
}

function barAxes(categoryId, valueId) {
  return `<c:catAx><c:axId val="${categoryId}"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:tickLblPos val="nextTo"/><c:crossAx val="${valueId}"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/></c:catAx><c:valAx><c:axId val="${valueId}"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:majorGridlines/><c:numFmt formatCode="${xml(CURRENCY_FORMAT)}" sourceLinked="0"/><c:tickLblPos val="nextTo"/><c:crossAx val="${categoryId}"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx>`;
}

function chartSpace(chartContent) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><c:date1904 val="0"/><c:lang val="pt-BR"/><c:roundedCorners val="0"/><c:chart>${chartContent}</c:chart><c:printSettings><c:headerFooter/><c:pageMargins b="0.75" l="0.7" r="0.7" t="0.75" header="0.3" footer="0.3"/><c:pageSetup/></c:printSettings></c:chartSpace>`;
}

function drawingXml() {
  const anchor = (id, name, fromColumn, fromRow, toColumn, toRow) => `<xdr:twoCellAnchor><xdr:from><xdr:col>${fromColumn}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${fromRow}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>${toColumn}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${toRow}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${id}" name="${xml(name)}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId${id}"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">${anchor(1, 'Evolução mensal', 0, 28, 8, 45)}${anchor(2, 'Categorias de despesas', 8, 28, 16, 45)}</xdr:wsDr>`;
}

function workbookXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><fileVersion appName="xl" lastEdited="7" lowestEdited="7" rupBuild="28326"/><workbookPr date1904="0"/><bookViews><workbookView xWindow="0" yWindow="0" windowWidth="28800" windowHeight="16680" activeTab="0"/></bookViews><sheets>${SHEETS.map((name, index) => `<sheet name="${xml(name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join('')}</sheets><calcPr calcId="191029" calcMode="auto" fullCalcOnLoad="1" forceFullCalc="1"/></workbook>`;
}

function workbookRelationships() {
  const sheetRels = SHEETS.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheetRels}<Relationship Id="rId${SHEETS.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
}

function contentTypes() {
  const sheets = SHEETS.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets}<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/><Override PartName="/xl/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/><Override PartName="/xl/charts/chart2.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`;
}

function zipText(files) {
  return Object.fromEntries(Object.entries(files).map(([name, contents]) => [name, strToU8(contents)]));
}

export function createExecutiveFinancialWorkbook({ state, start, end, owner, periodLabel, generatedAt = new Date() }) {
  const model = buildExecutiveFinancialModel({ state, start, end, owner, periodLabel, generatedAt });
  const summary = summarySheet(model);
  const sheetXml = [
    summary.xml,
    actionSheet(model),
    monthlySheet(model),
    categorySheet(model),
    pendingSheet(model),
    accountsSheet(model),
    transactionsSheet(model),
    methodologySheet(model),
  ];
  const rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>';
  const summaryRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>';
  const drawingRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart2.xml"/></Relationships>';
  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Relatório Executivo MEG Finanças</dc:title><dc:subject>Saúde financeira e plano de ação</dc:subject><dc:creator>${xml(owner || 'MEG Finanças')}</dc:creator><cp:lastModifiedBy>MEG Finanças</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${generatedAt.toISOString()}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${generatedAt.toISOString()}</dcterms:modified></cp:coreProperties>`;
  const app = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>MEG Finanças</Application><DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop><HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Planilhas</vt:lpstr></vt:variant><vt:variant><vt:i4>${SHEETS.length}</vt:i4></vt:variant></vt:vector></HeadingPairs><TitlesOfParts><vt:vector size="${SHEETS.length}" baseType="lpstr">${SHEETS.map((name) => `<vt:lpstr>${xml(name)}</vt:lpstr>`).join('')}</vt:vector></TitlesOfParts><Company>MEG Platform</Company><AppVersion>1.0</AppVersion></Properties>`;
  const files = {
    '[Content_Types].xml': contentTypes(),
    '_rels/.rels': rootRels,
    'docProps/core.xml': core,
    'docProps/app.xml': app,
    'xl/workbook.xml': workbookXml(),
    'xl/_rels/workbook.xml.rels': workbookRelationships(),
    'xl/styles.xml': stylesXml(),
    'xl/worksheets/_rels/sheet1.xml.rels': summaryRels,
    'xl/drawings/drawing1.xml': drawingXml(),
    'xl/drawings/_rels/drawing1.xml.rels': drawingRels,
    'xl/charts/chart1.xml': lineChartXml(summary.chartData),
    'xl/charts/chart2.xml': barChartXml(summary.chartData),
  };
  sheetXml.forEach((contents, index) => { files[`xl/worksheets/sheet${index + 1}.xml`] = contents; });
  const bytes = zipSync(zipText(files), { level: 6 });
  const date = generatedAt.toISOString().slice(0, 10);
  return {
    bytes,
    blob: new Blob([bytes], { type: MIME_XLSX }),
    filename: `relatorio-executivo-meg-${date}.xlsx`,
    mimeType: MIME_XLSX,
    model,
  };
}

function bytesToBase64(bytes) {
  let binary = '';
  const chunkSize = 32768;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return globalThis.btoa(binary);
}

export async function shareExecutiveFinancialWorkbook(report, {
  capacitor = Capacitor,
  exporter = ReportExporter,
} = {}) {
  if (capacitor?.getPlatform?.() !== 'android' || capacitor?.isNativePlatform?.() !== true) return false;
  try {
    await exporter.share({
      base64: bytesToBase64(report.bytes),
      filename: report.filename,
      mimeType: report.mimeType,
    });
    return true;
  } catch (cause) {
    console.warn('MEG native report sharing unavailable, using browser download', cause);
    return false;
  }
}

export const executiveWorkbookInternals = {
  SHEETS,
  bytesToBase64,
  stylesXml,
  worksheetXml,
};
