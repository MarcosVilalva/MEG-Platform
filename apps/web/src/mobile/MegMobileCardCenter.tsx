import { useMemo, useState } from 'react';
import type { PhoenixReadModel } from '../phoenix/contracts';
import { cardsClient } from '../app/cards-client';
import './meg-mobile-card-center.css';
import { MegIcon } from './MegMobileIcon';

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
  initialView = 'center',
  onClose,
}: {
  card: PhoenixReadModel['cards'][number];
  cardLabel: string;
  artUrl?: string;
  rows: Array<{ id: string; description: string; date: string; amount: number; installmentNo?: number; installmentQty?: number }>;
  initialView?: 'center'|'statement';
  onClose: () => void;
}) {
  const [view,setView] = useState<'center'|'statement'>(initialView);
  const [query,setQuery] = useState('');
  const [statementFilter,setStatementFilter] = useState<'all'|'cash'|'installments'>('all');
  const [localLimit,setLocalLimit] = useState(Number(card.creditLimit || 0));
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('');

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    return rows.filter((row) => {
      const matchesText = !normalized || row.description.toLocaleLowerCase('pt-BR').includes(normalized);
      const installments = Number(row.installmentQty || 1);
      const matchesKind = statementFilter === 'all' || (statementFilter === 'installments' ? installments > 1 : installments <= 1);
      return matchesText && matchesKind;
    });
  }, [rows, query, statementFilter]);

  const total = rows.reduce((sum,row) => sum + Number(row.amount || 0), 0);
  const filteredTotal = filtered.reduce((sum,row) => sum + Number(row.amount || 0), 0);
  const statement = Number(card.statement?.payableAmount ?? card.statementAmount ?? total ?? 0);
  const available = Number(card.availableLimit ?? Math.max(0, localLimit - statement));
  const utilization = localLimit > 0 ? Math.min(100, Math.max(0, statement / localLimit * 100)) : 0;
  const dueDate = card.statement?.dueDate || '';

  function exportRows() {
    return [['Descrição','Data','Parcela','Valor'], ...filtered.map((row) => [
      row.description,
      shortDate(row.date),
      row.installmentNo && row.installmentQty ? `${row.installmentNo}/${row.installmentQty}` : '',
      row.amount.toFixed(2).replace('.',',')
    ])];
  }

  async function adjustLimit() {
    if (busy) return;
    const proposed = window.prompt('Informe o novo limite do cartão:', localLimit.toFixed(2).replace('.',','));
    if (!proposed) return;
    const value = Number(proposed.replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''));
    if (!Number.isFinite(value) || value <= 0) {
      setMessage('Informe um limite válido.');
      return;
    }
    setBusy(true);
    setMessage('Atualizando limite…');
    try {
      const updated = await cardsClient.update(card.id, {
        creditLimit: value,
        expectedUpdatedAt: card.updatedAt,
        operationId: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `limit-${Date.now()}`,
      });
      setLocalLimit(Number(updated.creditLimit || value));
      setMessage('Limite atualizado.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível atualizar o limite.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="meg3-cardcenter-overlay" role="presentation">
    <section className="meg3-cardcenter" role="dialog" aria-modal="true" aria-label={view === 'center' ? `Central do cartão ${cardLabel}` : `Fatura do cartão ${cardLabel}`}>
      <header>
        <div><small>{view === 'center' ? 'CENTRAL DO CARTÃO' : 'DETALHE DA FATURA'}</small><h2>{view === 'center' ? 'Central do cartão' : 'Fatura do cartão'}</h2><p>{cardLabel} · final {card.lastFour || '0000'}</p></div>
        <button type="button" onClick={onClose}><MegIcon name="x" size={18}/></button>
      </header>

      <section className="meg3-cardcenter-hero" style={!artUrl ? { background: card.color || '#073f82' } : undefined}>
        {artUrl ? <img src={artUrl} alt={cardLabel}/> : <div><strong>{cardLabel}</strong><small>•••• {card.lastFour || '0000'}</small></div>}
      </section>

      {view === 'center' ? <>
        <section className="meg3-cardcenter-kpis meg3-cardcenter-kpis-four">
          <article><small>Limite total</small><strong>{money.format(localLimit)}</strong></article>
          <article><small>Disponível</small><strong>{money.format(available)}</strong></article>
          <article><small>Fatura atual</small><strong>{money.format(statement)}</strong></article>
          <article><small>Vencimento</small><strong>{dueDate ? shortDate(dueDate) : String(card.dueDay || '--')}</strong></article>
        </section>

        <section className="meg3-cardcenter-actions" data-meg-scroll-region="true">
          <button type="button" onClick={() => { setStatementFilter('all'); setView('statement'); }}><MegIcon name="receipt"/><span><strong>Ver lançamentos da fatura</strong><small>Acompanhe todas as compras</small></span><MegIcon name="chevron-right" size={16}/></button>
          <button type="button" onClick={() => { setStatementFilter('installments'); setView('statement'); }}><MegIcon name="repeat"/><span><strong>Parcelamentos</strong><small>Veja e acompanhe compras parceladas</small></span><MegIcon name="chevron-right" size={16}/></button>
          <button type="button" disabled={busy} onClick={() => void adjustLimit()}><MegIcon name="sliders"/><span><strong>Ajustar limite</strong><small>Atualize o limite cadastrado no MEG</small></span><MegIcon name="chevron-right" size={16}/></button>
          <button type="button" aria-disabled="true"><MegIcon name="card"/><span><strong>Bloquear cartão</strong><small>Bloqueio temporário depende da instituição</small></span><MegIcon name="chevron-right" size={16}/></button>
          <button type="button" onClick={() => setView('statement')}><MegIcon name="menu"/><span><strong>Mais opções</strong><small>Busca, exportação e detalhes da fatura</small></span><MegIcon name="chevron-right" size={16}/></button>
        </section>
        {message ? <p className="meg3-cardcenter-message">{message}</p> : null}
      </> : <>
        <section className="meg3-statement-summary">
          <div><small>Fatura atual</small><strong>{money.format(statement)}</strong></div>
          <div><small>Vencimento</small><strong>{dueDate ? shortDate(dueDate) : `Dia ${card.dueDay || '--'}`}</strong></div>
          <span><i style={{width:`${utilization}%`}}/><b>{Math.round(utilization)}%</b></span>
          <em>Utilizado {money.format(statement)} · Limite {money.format(localLimit)}</em>
        </section>

        <nav className="meg3-statement-tabs" aria-label="Filtro da fatura">
          <button className={statementFilter==='all'?'active':''} onClick={()=>setStatementFilter('all')}>Todos ({rows.length})</button>
          <button className={statementFilter==='cash'?'active':''} onClick={()=>setStatementFilter('cash')}>À vista</button>
          <button className={statementFilter==='installments'?'active':''} onClick={()=>setStatementFilter('installments')}>Parcelados</button>
        </nav>

        <section className="meg3-cardcenter-tools">
          <label><MegIcon name="search" size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar lançamentos..."/></label>
          <button type="button" onClick={() => exportExcel(`fatura-${cardLabel.toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g,'-')}.xls`,exportRows())}>Excel</button>
          <button type="button" onClick={() => exportPdf(`fatura-${cardLabel.toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g,'-')}.pdf`,`Fatura - ${cardLabel}`,exportRows())}>PDF</button>
        </section>

        <section className="meg3-cardcenter-list" data-meg-scroll-region="true">
          {filtered.map((row) => <article key={row.id}>
            <span className="meg3-cardcenter-row-icon"><MegIcon name="cart" size={18}/></span>
            <span><strong>{row.description}</strong><small>{shortDate(row.date)}{row.installmentNo && row.installmentQty ? ` · parcela ${row.installmentNo}/${row.installmentQty}` : ''}</small></span>
            <b>{money.format(Number(row.amount || 0))}</b>
          </article>)}
          {!filtered.length ? <div className="meg3-cardcenter-empty">Nenhum lançamento encontrado.</div> : null}
        </section>

        <footer>
          <button className="secondary" type="button" onClick={() => setView('center')}>Central</button>
          <span><small>{filtered.length} lançamento(s)</small><strong>{money.format(filteredTotal)}</strong></span>
        </footer>
      </>}
    </section>
  </div>;
}

