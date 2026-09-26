import { useMemo, useState } from 'react';
import type { PhoenixReadModel } from '../phoenix/contracts';
import './meg-mobile-card-center.css';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function shortDate(value: string) {
  const raw = String(value || '').slice(0,10);
  const [year,month,day] = raw.split('-');
  return year && month && day ? `${day}/${month}/${year}` : raw;
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((cell) => {
    const value = String(cell ?? '');
    return /[;"\n"]/.test(value) ? '"' + value.replace(/"/g,'""') + '"' : value;
  }).join(';')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function MegMobileCardCenter({
  card,
  cardLabel,
  rows,
  onClose,
}: {
  card: PhoenixReadModel['cards'][number];
  cardLabel: string;
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

      <section className="meg3-cardcenter-kpis">
        <article><small>Limite</small><strong>{money.format(limit)}</strong></article>
        <article><small>Disponível</small><strong>{money.format(available)}</strong></article>
        <article><small>Fatura</small><strong>{money.format(Number(card.statement?.payableAmount ?? card.statementAmount ?? 0))}</strong></article>
      </section>

      <section className="meg3-cardcenter-tools">
        <label><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar na fatura..."/></label>
        <button type="button" onClick={() => downloadCsv(
          `fatura-${cardLabel.toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g,'-')}.csv`,
          [['Descrição','Data','Parcela','Valor'], ...filtered.map((row) => [row.description,shortDate(row.date),row.installmentNo && row.installmentQty ? `${row.installmentNo}/${row.installmentQty}` : '',row.amount.toFixed(2).replace('.',',')])]
        )}>Exportar</button>
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
