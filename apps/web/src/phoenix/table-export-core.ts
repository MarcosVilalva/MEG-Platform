export type PhoenixExportColumnKind = 'text' | 'date' | 'money' | 'number';

export type PhoenixExportReport = {
  systemName: string;
  title: string;
  period: string;
  filters: string[];
  generatedAt: string;
  recordCount: number;
  headers: string[];
  rows: string[][];
  kinds: PhoenixExportColumnKind[];
  sums: Array<number | null>;
};

const xmlEscapeMap: Record<string, string> = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'
};

function xml(value: unknown) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
    .replace(/[&<>"']/g, (char) => xmlEscapeMap[char]);
}

function fileSafe(value: string) {
  return value
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64) || 'Relatorio';
}

export function phoenixExportFilename(report: PhoenixExportReport, extension: 'xlsx' | 'pdf') {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
  return `MEG_${fileSafe(report.title)}_${date}.${extension}`;
}

function parseBrazilianNumber(value: string) {
  const source = String(value || '').trim();
  if (!source || source === '—' || source === '-') return null;
  const withoutCurrency = source.replace(/R\$/gi, '').trim();
  const candidate = withoutCurrency.replace(/^\((.*)\)$/, '$1').trim();
  if (!/^[−+-]?(?:\d{1,3}(?:\.\d{3})*|\d+)(?:,\d+)?%?$/.test(candidate)) return null;
  const negative = /^\s*[−-]/.test(candidate) || /^\(.*\)$/.test(withoutCurrency);
  const normalized = candidate
    .replace(/%$/, '')
    .replace(/−/g, '-')
    .replace(/\./g, '')
    .replace(',', '.');
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return negative && parsed > 0 ? -parsed : parsed;
}

function excelDateSerial(value: string) {
  const source = String(value || '').trim();
  let year = 0; let month = 0; let day = 0;
  let match = source.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    day = Number(match[1]); month = Number(match[2]); year = Number(match[3]);
  } else {
    match = source.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    year = Number(match[1]); month = Number(match[2]); day = Number(match[3]);
  }
  const time = Date.UTC(year, month - 1, day);
  if (!Number.isFinite(time)) return null;
  return (time - Date.UTC(1899, 11, 30)) / 86400000;
}

function columnName(index: number) {
  let value = index + 1;
  let result = '';
  while (value > 0) {
    const mod = (value - 1) % 26;
    result = String.fromCharCode(65 + mod) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

function uniqueHeaders(headers: string[]) {
  const used = new Map<string, number>();
  return headers.map((header, index) => {
    const base = String(header || `Coluna ${index + 1}`).trim() || `Coluna ${index + 1}`;
    const count = used.get(base) || 0;
    used.set(base, count + 1);
    return count ? `${base} (${count + 1})` : base;
  });
}

type SharedStringCatalog = {
  values: string[];
  indexByValue: Map<string, number>;
};

function createSharedStrings(report: PhoenixExportReport): SharedStringCatalog {
  const values: string[] = [];
  const indexByValue = new Map<string, number>();
  const add = (value: unknown) => {
    const text = String(value ?? '');
    if (!indexByValue.has(text)) {
      indexByValue.set(text, values.length);
      values.push(text);
    }
  };
  add('');
  add(report.systemName);
  add(report.title);
  add('Período');
  add(report.period || 'Conforme a visão atual');
  add('Filtros');
  add(report.filters.length ? report.filters.join(' | ') : 'Sem filtros adicionais');
  add('Registros');
  add('Gerado em');
  add(report.generatedAt);
  add('TOTAL');
  uniqueHeaders(report.headers).forEach(add);
  report.rows.forEach((row) => row.forEach(add));
  return { values, indexByValue };
}

function sharedStringCell(ref: string, value: unknown, style: number, shared: SharedStringCatalog) {
  const text = String(value ?? '');
  const index = shared.indexByValue.get(text);
  if (index === undefined) throw new Error(`Shared string ausente para ${ref}`);
  return `<c r="${ref}" s="${style}" t="s"><v>${index}</v></c>`;
}

function buildSharedStringsXml(shared: SharedStringCatalog) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${shared.values.length}" uniqueCount="${shared.values.length}">
  ${shared.values.map((value) => `<si><t xml:space="preserve">${xml(value)}</t></si>`).join('')}
</sst>`;
}

function cellXml(ref: string, value: string, kind: PhoenixExportColumnKind, style: number, shared: SharedStringCatalog) {
  if (kind === 'date') {
    const serial = excelDateSerial(value);
    if (serial !== null) return `<c r="${ref}" s="${style}"><v>${serial}</v></c>`;
  }
  if (kind === 'money' || kind === 'number') {
    const numeric = parseBrazilianNumber(value);
    if (numeric !== null) return `<c r="${ref}" s="${style}"><v>${numeric}</v></c>`;
  }
  return sharedStringCell(ref, value, style, shared);
}

function excelStyles() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="2">
    <numFmt numFmtId="164" formatCode="R$ #,##0.00;[Red]-R$ #,##0.00"/>
    <numFmt numFmtId="165" formatCode="dd/mm/yyyy"/>
  </numFmts>
  <fonts count="4">
    <font><sz val="10"/><name val="Aptos"/></font>
    <font><b/><sz val="18"/><color rgb="FFFFFFFF"/><name val="Aptos Display"/></font>
    <font><b/><sz val="12"/><color rgb="FF0C3028"/><name val="Aptos Display"/></font>
    <font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font>
  </fonts>
  <fills count="5">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF087C69"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE9F8F3"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0B5F53"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFD7E6E1"/></left>
      <right style="thin"><color rgb="FFD7E6E1"/></right>
      <top style="thin"><color rgb="FFD7E6E1"/></top>
      <bottom style="thin"><color rgb="FFD7E6E1"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="10">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyFill="1" applyFont="1"/>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"><alignment wrapText="1" vertical="top"/></xf>
    <xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFill="1" applyFont="1" applyBorder="1"><alignment wrapText="1" vertical="center"/></xf>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
    <xf numFmtId="4" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFill="1" applyFont="1" applyBorder="1"/>
    <xf numFmtId="164" fontId="2" fillId="3" borderId="1" xfId="0" applyFill="1" applyFont="1" applyNumberFormat="1" applyBorder="1"/>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
}

function buildWorksheet(report: PhoenixExportReport, shared: SharedStringCatalog) {
  const headers = uniqueHeaders(report.headers);
  const columns = headers.length;
  const lastCol = columnName(columns - 1);
  const headerRow = 8;
  const firstDataRow = headerRow + 1;
  const lastDataRow = Math.max(firstDataRow, firstDataRow + report.rows.length - 1);
  const totalRow = firstDataRow + report.rows.length;

  const rows: string[] = [];
  rows.push(`<row r="1" ht="28" customHeight="1">${sharedStringCell('A1', report.systemName, 1, shared)}</row>`);
  rows.push(`<row r="2" ht="22" customHeight="1">${sharedStringCell('A2', report.title, 2, shared)}</row>`);
  rows.push(`<row r="3">${sharedStringCell('A3', 'Período', 3, shared)}${sharedStringCell('B3', report.period || 'Conforme a visão atual', 3, shared)}</row>`);
  rows.push(`<row r="4">${sharedStringCell('A4', 'Filtros', 3, shared)}${sharedStringCell('B4', report.filters.length ? report.filters.join(' | ') : 'Sem filtros adicionais', 3, shared)}</row>`);
  rows.push(`<row r="5">${sharedStringCell('A5', 'Registros', 3, shared)}<c r="B5" s="3"><v>${report.recordCount}</v></c></row>`);
  rows.push(`<row r="6">${sharedStringCell('A6', 'Gerado em', 3, shared)}${sharedStringCell('B6', report.generatedAt, 3, shared)}</row>`);

  rows.push(`<row r="${headerRow}" ht="24" customHeight="1">${headers.map((header, index) =>
    sharedStringCell(`${columnName(index)}${headerRow}`, header, 4, shared)
  ).join('')}</row>`);

  report.rows.forEach((row, rowIndex) => {
    const excelRow = firstDataRow + rowIndex;
    const cells = headers.map((_, colIndex) => {
      const kind = report.kinds[colIndex] || 'text';
      const style = kind === 'date' ? 5 : kind === 'money' ? 6 : kind === 'number' ? 7 : 3;
      return cellXml(`${columnName(colIndex)}${excelRow}`, row[colIndex] || '', kind, style, shared);
    }).join('');
    rows.push(`<row r="${excelRow}">${cells}</row>`);
  });

  const totalCells = headers.map((_, colIndex) => {
    const ref = `${columnName(colIndex)}${totalRow}`;
    if (colIndex === 0) return sharedStringCell(ref, 'TOTAL', 8, shared);
    if (report.sums[colIndex] !== null) {
      const first = `${columnName(colIndex)}${firstDataRow}`;
      const last = `${columnName(colIndex)}${lastDataRow}`;
      const style = report.kinds[colIndex] === 'money' ? 9 : 8;
      return `<c r="${ref}" s="${style}"><f>SUBTOTAL(109,${first}:${last})</f><v>${report.sums[colIndex] || 0}</v></c>`;
    }
    return sharedStringCell(ref, '', 8, shared);
  }).join('');
  rows.push(`<row r="${totalRow}">${totalCells}</row>`);

  const widths = headers.map((header, index) => {
    const sample = report.rows.slice(0, 120).reduce((max, row) => Math.max(max, String(row[index] || '').length), header.length);
    const width = Math.min(34, Math.max(11, sample + 2));
    return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`;
  }).join('');

  const mergeRefs = [1, 2].map((row) => `<mergeCell ref="A${row}:${lastCol}${row}"/>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:${lastCol}${totalRow}"/>
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="${headerRow}" topLeftCell="A${firstDataRow}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <cols>${widths}</cols>
  <sheetData>${rows.join('')}</sheetData>
  <mergeCells count="2">${mergeRefs}</mergeCells>
  <autoFilter ref="A${headerRow}:${lastCol}${lastDataRow}"/>
</worksheet>`;
}

type ZipEntry = { name: string; data: Uint8Array };

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value: number) {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
}

function u32(value: number) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value >>> 0, true);
  return bytes;
}

function concat(parts: Uint8Array[]) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  parts.forEach((part) => { result.set(part, offset); offset += part.length; });
  return result;
}

function dosTimeDate(now = new Date()) {
  const time = ((now.getHours() & 31) << 11) | ((now.getMinutes() & 63) << 5) | ((Math.floor(now.getSeconds() / 2)) & 31);
  const year = Math.max(1980, now.getFullYear());
  const date = (((year - 1980) & 127) << 9) | (((now.getMonth() + 1) & 15) << 5) | (now.getDate() & 31);
  return { time, date };
}

function zipStore(entries: ZipEntry[]) {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  const stamp = dosTimeDate();

  entries.forEach((entry) => {
    const name = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const local = concat([
      u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(stamp.time), u16(stamp.date),
      u32(crc), u32(entry.data.length), u32(entry.data.length), u16(name.length), u16(0), name, entry.data
    ]);
    localParts.push(local);

    const central = concat([
      u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(stamp.time), u16(stamp.date),
      u32(crc), u32(entry.data.length), u32(entry.data.length), u16(name.length), u16(0), u16(0),
      u16(0), u16(0), u32(0), u32(offset), name
    ]);
    centralParts.push(central);
    offset += local.length;
  });

  const central = concat(centralParts);
  const end = concat([
    u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length),
    u32(central.length), u32(offset), u16(0)
  ]);
  return concat([...localParts, central, end]);
}

export function buildPhoenixXlsx(report: PhoenixExportReport) {
  const encoder = new TextEncoder();
  const shared = createSharedStrings(report);
  const worksheet = buildWorksheet(report, shared);
  const sharedStrings = buildSharedStringsXml(shared);
  const entries: ZipEntry[] = [
    { name: '[Content_Types].xml', data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`) },
    { name: '_rels/.rels', data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`) },
    { name: 'docProps/core.xml', data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${xml(report.title)}</dc:title><dc:creator>MEG Finanças</dc:creator><cp:lastModifiedBy>MEG Finanças</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>
</cp:coreProperties>`) },
    { name: 'docProps/app.xml', data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>MEG Finanças</Application></Properties>`) },
    { name: 'xl/workbook.xml', data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <bookViews><workbookView/></bookViews><sheets><sheet name="Relatório MEG" sheetId="1" r:id="rId1"/></sheets><calcPr calcId="191029" fullCalcOnLoad="1"/>
</workbook>`) },
    { name: 'xl/_rels/workbook.xml.rels', data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`) },
    { name: 'xl/styles.xml', data: encoder.encode(excelStyles()) },
    { name: 'xl/sharedStrings.xml', data: encoder.encode(sharedStrings) },
    { name: 'xl/worksheets/sheet1.xml', data: encoder.encode(worksheet) }
  ];
  return zipStore(entries);
}

const cp1252: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a,
  0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92,
  0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c,
  0x017e: 0x9e, 0x0178: 0x9f
};

function winAnsiHex(value: string) {
  let out = '';
  for (const char of String(value || '')) {
    const code = char.codePointAt(0) || 63;
    const byte = code <= 255 ? code : cp1252[code] ?? 63;
    out += byte.toString(16).padStart(2, '0').toUpperCase();
  }
  return `<${out}>`;
}

function pdfText(text: string, x: number, y: number, size: number, bold = false) {
  return `BT /${bold ? 'F2' : 'F1'} ${size.toFixed(2)} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm ${winAnsiHex(text)} Tj ET\n`;
}

function pdfFill(r: number, g: number, b: number) {
  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg\n`;
}

function pdfStroke(r: number, g: number, b: number) {
  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG\n`;
}

function truncate(value: string, width: number, fontSize: number) {
  const max = Math.max(4, Math.floor(width / (fontSize * 0.52)));
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length <= max ? text : `${text.slice(0, Math.max(1, max - 1))}…`;
}

function pdfColumnWidths(report: PhoenixExportReport, usable: number) {
  const weights = report.headers.map((header, index) => {
    const content = report.rows.slice(0, 100).reduce((max, row) => Math.max(max, String(row[index] || '').length), header.length);
    const kind = report.kinds[index];
    const cap = kind === 'money' || kind === 'number' || kind === 'date' ? 13 : 28;
    return Math.min(cap, Math.max(7, content));
  });
  const total = weights.reduce((sum, value) => sum + value, 0) || 1;
  return weights.map((value) => usable * value / total);
}

type PdfPageRows = string[][];

export function buildPhoenixPdf(report: PhoenixExportReport) {
  const width = 841.89;
  const height = 595.28;
  const margin = 28;
  const usable = width - margin * 2;
  const columns = report.headers.length;
  const fontSize = columns > 10 ? 5.6 : columns > 7 ? 6.4 : 7.2;
  const rowHeight = columns > 10 ? 14 : 16;
  const headerTop = height - 28;
  const tableTop = height - 122;
  const footerY = 18;
  const availableHeight = tableTop - footerY - 24;
  const rowsPerPage = Math.max(6, Math.floor(availableHeight / rowHeight) - 2);
  const pages: PdfPageRows[] = [];
  for (let index = 0; index < report.rows.length; index += rowsPerPage) pages.push(report.rows.slice(index, index + rowsPerPage));
  if (!pages.length) pages.push([]);
  const colWidths = pdfColumnWidths(report, usable);

  const pageStreams = pages.map((pageRows, pageIndex) => {
    let stream = '';
    stream += pdfFill(0.031, 0.486, 0.412);
    stream += `${margin} ${height - 58} ${usable} 34 re f\n`;
    stream += pdfFill(1, 1, 1);
    stream += pdfText(report.systemName.toUpperCase(), margin + 12, headerTop - 8, 16, true);
    stream += pdfText(report.title, margin + 12, headerTop - 25, 9, false);

    stream += pdfFill(0.10, 0.16, 0.14);
    stream += pdfText(`Período: ${report.period || 'Conforme a visão atual'}`, margin, height - 78, 7.5, true);
    stream += pdfText(truncate(`Filtros: ${report.filters.length ? report.filters.join(' | ') : 'Sem filtros adicionais'}`, usable, 7), margin, height - 91, 7, false);
    stream += pdfText(`Registros: ${report.recordCount}   |   Gerado em: ${report.generatedAt}`, margin, height - 104, 7, false);

    let x = margin;
    let y = tableTop;
    stream += pdfFill(0.043, 0.373, 0.325);
    stream += `${margin} ${y - rowHeight + 3} ${usable} ${rowHeight} re f\n`;
    report.headers.forEach((header, index) => {
      stream += pdfFill(1, 1, 1);
      stream += pdfText(truncate(header, colWidths[index] - 6, fontSize), x + 3, y - rowHeight + 7, fontSize, true);
      x += colWidths[index];
    });
    y -= rowHeight;

    pageRows.forEach((row, rowIndex) => {
      if (rowIndex % 2 === 1) {
        stream += pdfFill(0.965, 0.984, 0.978);
        stream += `${margin} ${y - rowHeight + 3} ${usable} ${rowHeight} re f\n`;
      }
      x = margin;
      row.forEach((value, colIndex) => {
        if (colIndex >= colWidths.length) return;
        stream += pdfFill(0.07, 0.16, 0.13);
        stream += pdfText(truncate(value, colWidths[colIndex] - 6, fontSize), x + 3, y - rowHeight + 7, fontSize, false);
        x += colWidths[colIndex];
      });
      stream += pdfStroke(0.84, 0.90, 0.88);
      stream += `${margin} ${y - rowHeight + 3} m ${margin + usable} ${y - rowHeight + 3} l S\n`;
      y -= rowHeight;
    });

    const isLast = pageIndex === pages.length - 1;
    if (isLast && report.sums.some((value) => value !== null)) {
      stream += pdfFill(0.91, 0.97, 0.95);
      stream += `${margin} ${y - rowHeight + 3} ${usable} ${rowHeight} re f\n`;
      x = margin;
      report.headers.forEach((_, colIndex) => {
        const value = colIndex === 0
          ? 'TOTAL'
          : report.sums[colIndex] === null
            ? ''
            : report.kinds[colIndex] === 'money'
              ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(report.sums[colIndex] || 0)
              : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(report.sums[colIndex] || 0);
        stream += pdfFill(0.04, 0.29, 0.25);
        stream += pdfText(truncate(value, colWidths[colIndex] - 6, fontSize), x + 3, y - rowHeight + 7, fontSize, true);
        x += colWidths[colIndex];
      });
    }

    stream += pdfFill(0.35, 0.43, 0.40);
    stream += pdfText(`MEG Finanças · Página ${pageIndex + 1} de ${pages.length}`, margin, footerY, 7, false);
    return stream;
  });

  const objects: string[] = ['', '', '', ''];
  objects[0] = '<< /Type /Catalog /Pages 2 0 R >>';
  const pageIds = pageStreams.map((_, index) => 5 + index * 2);
  objects[1] = `<< /Type /Pages /Count ${pageStreams.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] >>`;
  objects[2] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';

  pageStreams.forEach((stream, index) => {
    const pageObject = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + index * 2} 0 R >>`;
    const contentObject = `<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}endstream`;
    objects.push(pageObject, contentObject);
  });

  let pdf = '%PDF-1.4\n%MEG\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets[index + 1] = new TextEncoder().encode(pdf).length;
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

export function detectPhoenixColumnKinds(headers: string[], rows: string[][]) {
  const kinds: PhoenixExportColumnKind[] = headers.map((header, index) => {
    const values = rows.map((row) => String(row[index] || '').trim()).filter(Boolean).slice(0, 120);
    const label = header.toLocaleLowerCase('pt-BR');
    if (/data|vencimento|compra|pagamento/.test(label) && values.length && values.every((value) => excelDateSerial(value) !== null)) return 'date';
    const numericCount = values.filter((value) => parseBrazilianNumber(value) !== null).length;
    if (values.length && numericCount / values.length >= 0.85) {
      if (/valor|receita|despesa|saldo|fatura|limite|total|aberto|pago|pagamento/.test(label) || values.some((value) => /R\$/.test(value))) return 'money';
      return 'number';
    }
    return 'text';
  });
  const sums = kinds.map((kind, index) => {
    if (kind !== 'money' && kind !== 'number') return null;
    return rows.reduce((total, row) => total + (parseBrazilianNumber(row[index] || '') || 0), 0);
  });
  return { kinds, sums };
}
