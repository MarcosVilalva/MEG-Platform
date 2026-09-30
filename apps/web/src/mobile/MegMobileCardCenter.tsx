import { useMemo, useState } from 'react';
import type { PhoenixReadModel } from '../phoenix/contracts';
import { cardDueDateForStatement } from '../phoenix/data/card-dates';
import './meg-mobile-card-center.css';
import { MegIcon, resolveFinancialIcon } from './MegMobileIcon';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function shortDate(value: string) {
  const raw = String(value || '').slice(0,10);
  const [year,month,day] = raw.split('-');
  return year && month && day ? `${day}/${month}/${year}` : raw;
}

function monthLabel(value: string) {
  const [year, month] = String(value || '').split('-');
  return year && month ? `${month}/${year}` : value || '—';
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

export type MegMobileCardCenterRow = {
  id: string;
  eventId?: string;
  description: string;
  date: string;
  amount: number;
  installmentNo?: number;
  installmentQty?: number;
  category?: string;
  statementMonth?: string;
  dueDate?: string;
  status?: string;
};

type CreditTab = 'summary' | 'current' | 'upcoming' | 'installments' | 'history';

function transactionIcon(description: string, category?: string, kind?: 'credit' | 'debit') {
  if (kind === 'credit') return 'banknote';
  return resolveFinancialIcon({ description, categoryName: category });
}

function allCardRows(card: PhoenixReadModel['cards'][number]): MegMobileCardCenterRow[] {
  return (card.purchases || []).flatMap((purchase) => (purchase.entries || []).map((entry) => ({
    id: entry.id,
    description: purchase.description,
    date: purchase.purchaseDate,
    amount: Math.abs(Number(entry.amount || 0)),
    installmentNo: entry.number,
    installmentQty: purchase.installments,
    category: purchase.category?.name || undefined,
    statementMonth: entry.statementMonth,
    dueDate: cardDueDateForStatement(entry.statementMonth, Number(card.closingDay || 1), Number(card.dueDay || 1)),
    status: entry.status,
  })));
}

export function MegMobileCardCenter({
  card,
  cardLabel,
  artUrl,
  rows,
  currentMonth,
  onClose,
  onOpenRow,
}: {
  card: PhoenixReadModel['cards'][number];
  cardLabel: string;
  artUrl?: string;
  rows: MegMobileCardCenterRow[];
  currentMonth: string;
  onClose: () => void;
  onOpenRow?: (row: MegMobileCardCenterRow) => void;
}) {
  const [query,setQuery] = useState('');
  const [tab,setTab] = useState<CreditTab>('summary');
  const allRows = useMemo(() => allCardRows(card), [card]);
  const sourceRows = useMemo(() => {
    if (tab === 'current') return rows;
    if (tab === 'summary') {
      const currentIds = new Set(rows.map((row) => row.id));
      const upcoming = allRows.filter((row) => !currentIds.has(row.id) && (row.statementMonth || '') > currentMonth);
      return rows.concat(upcoming).slice(0, 6);
    }
    if (tab === 'upcoming') return allRows.filter((row) => (row.statementMonth || '') > currentMonth);
    if (tab === 'installments') return allRows.filter((row) => Number(row.installmentQty || 1) > 1);
    return allRows;
  }, [tab, rows, allRows, currentMonth]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    const items = sourceRows.filter((row) => !normalized || [row.description,row.category,row.statementMonth].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR').includes(normalized));
    return tab === 'summary' ? items.slice(0,6) : items;
  }, [sourceRows, query, tab]);

  const total = filtered.reduce((sum,row) => sum + Number(row.amount || 0), 0);
  const limit = Number(card.creditLimit || 0);
  const available = Number(card.availableLimit ?? Math.max(0, limit - Number(card.statementAmount || 0)));
  const current = Number(card.statement?.payableAmount ?? card.payableStatementAmount ?? card.statementAmount ?? 0);
  const used = Math.max(0, limit - available);
  const usage = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const due = card.statement?.dueDate || (card.statement?.month ? cardDueDateForStatement(card.statement.month, Number(card.closingDay || 1), Number(card.dueDay || 1)) : '');
  const bestDay = Number(card.closingDay || 1) >= 28 ? 1 : Number(card.closingDay || 1) + 1;

  const exportRows=[['Descrição','Data','Parcela','Valor'], ...filtered.map((row) => [
    row.description,
    shortDate(row.date),
    row.installmentNo && row.installmentQty ? `${row.installmentNo}/${row.installmentQty}` : '',
    row.amount.toFixed(2).replace('.',',')
  ])];

  return <div className="meg3-cardcenter-overlay" role="presentation">
    <section className="meg3-cardcenter" role="dialog" aria-modal="true" aria-label={`Central do cartão ${cardLabel}`}>
      <header>
        <div><small>CENTRAL DO CARTÃO</small><h2>{cardLabel}</h2><p>Fatura, limites e lançamentos em um só lugar.</p></div>
        <button type="button" onClick={onClose}><MegIcon name="x" size={18}/></button>
      </header>

      <div className="meg3-cardcenter-top">
        <section className="meg3-cardcenter-hero" style={!artUrl ? { background: card.color || '#073f82' } : undefined}>
          {artUrl ? <img src={artUrl} alt={cardLabel}/> : <div><strong>{cardLabel}</strong><small>•••• {card.lastFour || '0000'}</small></div>}
        </section>
        <section className="meg3-cardcenter-kpis">
          <article><MegIcon name="wallet" size={16}/><small>Limite total</small><strong>{money.format(limit)}</strong></article>
          <article><MegIcon name="trend" size={16}/><small>Disponível</small><strong>{money.format(available)}</strong></article>
          <article><MegIcon name="file" size={16}/><small>Fatura atual</small><strong>{money.format(current)}</strong></article>
          <article><MegIcon name="calendar" size={16}/><small>Vencimento</small><strong>{due ? shortDate(due) : `Dia ${card.dueDay || '—'}`}</strong></article>
          <article><MegIcon name="chart" size={16}/><small>Utilizado</small><strong>{usage}%</strong></article>
          <article><MegIcon name="card" size={16}/><small>Melhor dia</small><strong>Dia {bestDay}</strong></article>
        </section>
      </div>

      <div className="meg3-cardcenter-tabs" role="tablist" aria-label="Visões do cartão">
        <button className={tab==='summary'?'active':''} onClick={()=>setTab('summary')}>Resumo</button>
        <button className={tab==='current'?'active':''} onClick={()=>setTab('current')}>Atual</button>
        <button className={tab==='upcoming'?'active':''} onClick={()=>setTab('upcoming')}>Próximas</button>
        <button className={tab==='installments'?'active':''} onClick={()=>setTab('installments')}>Parcelas</button>
        <button className={tab==='history'?'active':''} onClick={()=>setTab('history')}>Histórico</button>
      </div>

      <section className="meg3-cardcenter-tools">
        <label><MegIcon name="search" size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar lançamentos..."/></label>
        <button type="button" className="icon-action" aria-label="Exportar Excel" title="Exportar Excel" onClick={() => exportExcel(`fatura-${cardLabel.toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g,'-')}.xls`,exportRows)}><MegIcon name="list" size={18}/></button>
        <button type="button" className="icon-action" aria-label="Exportar PDF" title="Exportar PDF" onClick={() => exportPdf(`fatura-${cardLabel.toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g,'-')}.pdf`,`Fatura - ${cardLabel}`,exportRows)}><MegIcon name="file" size={18}/></button>
      </section>

      <section className="meg3-cardcenter-list" data-meg-scroll-region="true">
        {tab === 'summary' && !rows.length && filtered.length ? <div className="meg3-cardcenter-context">Fatura atual sem lançamentos · exibindo próximas compras</div> : null}
        {filtered.map((row) => {
          const icon = transactionIcon(row.description, row.category);
          return <button type="button" key={row.id} onClick={() => onOpenRow?.(row)}>
            <span className={`meg3-cardcenter-row-icon icon-${icon}`}><MegIcon name={icon} size={18}/></span>
            <span className="meg3-cardcenter-row-copy"><strong>{row.description}</strong><small>{shortDate(row.date)}{row.statementMonth ? ` · fatura ${monthLabel(row.statementMonth)}` : ''}{row.installmentNo && row.installmentQty ? ` · parcela ${row.installmentNo}/${row.installmentQty}` : ''}</small></span>
            <b>{money.format(Number(row.amount || 0))}</b>
            {onOpenRow ? <i><MegIcon name="chevron-right" size={14}/></i> : null}
          </button>;
        })}
        {!filtered.length ? <div className="meg3-cardcenter-empty">{tab === 'upcoming' ? 'Nenhuma fatura futura projetada.' : tab === 'current' ? 'Nenhum lançamento na fatura atual.' : 'Nenhum lançamento encontrado.'}</div> : null}
      </section>

      <footer>
        <span className="meg3-cardcenter-total"><small>{filtered.length} lançamento(s)</small><strong>{money.format(total)}</strong></span>
        <button type="button" onClick={onClose}>Fechar</button>
      </footer>
    </section>
  </div>;
}

export type MegMobileBenefitRow = {
  id: string;
  eventId?: string;
  description: string;
  date: string;
  amount: number;
  category?: string;
  kind: 'credit' | 'debit';
};

export function MegMobileBenefitCardCenter({
  artUrl,
  balance,
  credits,
  used,
  rows,
  onClose,
  onOpenEvent,
}: {
  artUrl: string;
  balance: number;
  credits: number;
  used: number;
  rows: MegMobileBenefitRow[];
  onClose: () => void;
  onOpenEvent?: (eventId: string) => void;
}) {
  const [tab,setTab] = useState<'all'|'credits'|'debits'>('all');
  const [query,setQuery] = useState('');
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    return rows.filter((row) => tab === 'all' ? true : tab === 'credits' ? row.kind === 'credit' : row.kind === 'debit')
      .filter((row) => !normalized || [row.description,row.category].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR').includes(normalized));
  }, [rows,query,tab]);

  return <div className="meg3-cardcenter-overlay" role="presentation">
    <section className="meg3-cardcenter benefit" role="dialog" aria-modal="true" aria-label="Central do cartão Verocard Alimentação">
      <header>
        <div><small>BENEFÍCIO ALIMENTAÇÃO</small><h2>Verocard Alimentação</h2><p>Saldo, recargas e consumo do benefício.</p></div>
        <button type="button" onClick={onClose}><MegIcon name="x" size={18}/></button>
      </header>

      <div className="meg3-cardcenter-top">
        <section className="meg3-cardcenter-hero verocard"><img src={artUrl} alt="Verocard Alimentação"/></section>
        <section className="meg3-cardcenter-kpis benefit">
          <article><MegIcon name="wallet" size={16}/><small>Saldo disponível</small><strong>{money.format(balance)}</strong></article>
          <article><MegIcon name="arrow-up" size={16}/><small>Recargas no mês</small><strong>{money.format(credits)}</strong></article>
          <article><MegIcon name="food" size={16}/><small>Consumo no mês</small><strong>{money.format(used)}</strong></article>
          <article><MegIcon name="list" size={16}/><small>Movimentações</small><strong>{rows.length}</strong></article>
        </section>
      </div>

      <div className="meg3-cardcenter-tabs benefit" role="tablist" aria-label="Visões do Verocard">
        <button className={tab==='all'?'active':''} onClick={()=>setTab('all')}>Todas</button>
        <button className={tab==='credits'?'active':''} onClick={()=>setTab('credits')}>Entradas</button>
        <button className={tab==='debits'?'active':''} onClick={()=>setTab('debits')}>Saídas</button>
      </div>

      <section className="meg3-cardcenter-tools benefit">
        <label><MegIcon name="search" size={16}/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Buscar no extrato..."/></label>
      </section>

      <section className="meg3-cardcenter-list benefit" data-meg-scroll-region="true">
        {filtered.map((row)=>{
          const icon = transactionIcon(row.description, row.category, row.kind);
          return <button key={row.id} type="button" onClick={()=>row.eventId && onOpenEvent?.(row.eventId)}>
            <span className={`meg3-cardcenter-row-icon icon-${icon}`}><MegIcon name={icon} size={18}/></span>
            <span className="meg3-cardcenter-row-copy"><strong>{row.description}</strong><small>{shortDate(row.date)}{row.category ? ` · ${row.category}` : ''}</small></span>
            <b className={row.kind}>{row.kind==='credit'?'+':'−'}{money.format(Math.abs(row.amount))}</b>
            {row.eventId ? <i><MegIcon name="chevron-right" size={14}/></i> : null}
          </button>;
        })}
        {!filtered.length ? <div className="meg3-cardcenter-empty">Nenhuma movimentação neste filtro.</div> : null}
      </section>

      <footer>
        <span><small>Saldo disponível</small><strong>{money.format(balance)}</strong></span>
        <button type="button" onClick={onClose}>Fechar</button>
      </footer>
    </section>
  </div>;
}
