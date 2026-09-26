import { useMemo, useState } from 'react';
import type { PhoenixReadModel } from '../phoenix/contracts';
import './meg-mobile-card-center.css';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function shortDate(value: string) {
  const raw = String(value || '').slice(0,10);
  const [year,month,day] = raw.split('-');
  return year && month && day ? `${day}/${month}/${year}` : raw;
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function exportExcel(filename: string, rows: string[][]) {
  const escape = (value: string) => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const html = '<html><head><meta charset="utf-8"></head><body><table border="1">'
    + rows.map((row,index) => '<tr>' + row.map((cell) => `<${index===0?'th':'td'}>${escape(cell)}</${index===0?'th':'td'}>`).join('') + '</tr>').join('')
    + '</table></body></html>';
  downloadBlob(filename, new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8' }));
}

function pdfSafe(value: string) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^\x20-\x7E]/g,' ')
    .replace(/\\/g,'\\\\')
    .replace(/\(/g,'\\(')
    .replace(/\)/g,'\\)');
}

function exportPdf(filename: string, title: string, rows: string[][]) {
  const lines = [
    title,
    '',
    ...rows.slice(1).map((row) => `${row[1]}  ${row[0]}  ${row[2] ? 'Parc. '+row[2]+'  ' : ''}R$ ${row[3]}`)
  ].map(pdfSafe);
  const perPage = 48;
  const pageLines: string[][] = [];
  for (let index=0; index<lines.length; index+=perPage) pageLines.push(lines.slice(index,index+perPage));
  if (!pageLines.length) pageLines.push([pdfSafe(title)]);

  const objects: string[] = [];
  const kids: string[] = [];
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

  pageLines.forEach((page,index) => {
    const pageObj = 4 + index * 2;
    const contentObj = pageObj + 1;
    kids.push(`${pageObj} 0 R`);
    const commands = page.map((line,lineIndex) => `BT /F1 ${lineIndex===0?14:9} Tf 40 ${800-lineIndex*15} Td (${line}) Tj ET`).join('\n');
    objects[pageObj] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObj} 0 R >>`;
    objects[contentObj] = `<< /Length ${commands.length} >>\nstream\n${commands}\nendstream`;
  });
  objects[2] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pageLines.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (let id=1; id<objects.length; id+=1) {
    offsets[id] = pdf.length;
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id=1; id<objects.length; id+=1) pdf += String(offsets[id]).padStart(10,'0') + ' 00000 n \n';
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  downloadBlob(filename, new Blob([pdf], { type:'application/pdf' }));
}

export function MegMobileCardCenter({
  card,
  cardLabel,
  artUrl,
  rows,
  onClose,
}: {
  card: PhoenixReadModel['cards'][number];
  cardLabel: string;
  artUrl?: string;
  rows: Array<{ id: string; description: string; date: string; amount: number; installmentNo?: number; installmentQty?: number }>;
  onClose: () => void;
}) {
  const [query,setQuery] = useState('');
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    return rows.filter((row) => !normalized || row.description.toLocaleLowerCase('pt-BR').includes(normalized));
  }, [rows, query]);
  const total = filtered.reduce((sum,row) => sum + Number(row.amount || 0), 0);
  const limit = Number(card.creditLimit || 0);
  const available = Number(card.availableLimit ?? Math.max(0, limit - Number(card.statementAmount || 0)));

  return <div className="meg3-cardcenter-overlay" role="presentation">
    <section className="meg3-cardcenter" role="dialog" aria-modal="true" aria-label={`Central do cartão ${cardLabel}`}>
      <header>
        <div><small>CENTRAL DO CARTÃO</small><h2>{cardLabel}</h2><p>Fatura, limites e lançamentos em um só lugar.</p></div>
        <button type="button" onClick={onClose}>×</button>
      </header>

      <section className="meg3-cardcenter-hero" style={!artUrl ? { background: card.color || '#073f82' } : undefined}>
        {artUrl ? <img src={artUrl} alt={cardLabel}/> : <div><strong>{cardLabel}</strong><small>•••• {card.lastFour || '0000'}</small></div>}
      </section>

      <section className="meg3-cardcenter-kpis">
        <article><small>Limite</small><strong>{money.format(limit)}</strong></article>
        <article><small>Disponível</small><strong>{money.format(available)}</strong></article>
        <article><small>Fatura</small><strong>{money.format(Number(card.statement?.payableAmount ?? card.statementAmount ?? 0))}</strong></article>
      </section>

      <section className="meg3-cardcenter-tools">
        <label><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar na fatura..."/></label>
        <button type="button" onClick={() => {
          const exportRows=[['Descrição','Data','Parcela','Valor'], ...filtered.map((row) => [row.description,shortDate(row.date),row.installmentNo && row.installmentQty ? `${row.installmentNo}/${row.installmentQty}` : '',row.amount.toFixed(2).replace('.',',')])];
          exportExcel(`fatura-${cardLabel.toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g,'-')}.xls`,exportRows);
        }}>Excel</button>
        <button type="button" onClick={() => {
          const exportRows=[['Descrição','Data','Parcela','Valor'], ...filtered.map((row) => [row.description,shortDate(row.date),row.installmentNo && row.installmentQty ? `${row.installmentNo}/${row.installmentQty}` : '',row.amount.toFixed(2).replace('.',',')])];
          exportPdf(`fatura-${cardLabel.toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g,'-')}.pdf`,`Fatura - ${cardLabel}`,exportRows);
        }}>PDF</button>
      </section>

      <section className="meg3-cardcenter-list" data-meg-scroll-region="true">
        {filtered.map((row) => <article key={row.id}>
          <span><strong>{row.description}</strong><small>{shortDate(row.date)}{row.installmentNo && row.installmentQty ? ` · parcela ${row.installmentNo}/${row.installmentQty}` : ''}</small></span>
          <b>{money.format(Number(row.amount || 0))}</b>
        </article>)}
        {!filtered.length ? <div className="meg3-cardcenter-empty">Nenhum lançamento encontrado.</div> : null}
      </section>

      <footer>
        <span><small>{filtered.length} lançamento(s)</small><strong>{money.format(total)}</strong></span>
        <button type="button" onClick={onClose}>Fechar</button>
      </footer>
    </section>
  </div>;
}
