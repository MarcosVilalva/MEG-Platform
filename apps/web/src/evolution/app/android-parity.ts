import type {CreditCard} from '../../app/cards-client';

export type EvolutionCardRow={
  id:string;
  purchaseId:string;
  eventId?:string;
  description:string;
  purchaseDate:string;
  statementMonth:string;
  amount:number;
  installmentNo:number;
  installmentQty:number;
  status:string;
  category?:string;
};

export type EvolutionCardTab='summary'|'current'|'upcoming'|'installments'|'history';

export function evolutionCardRows(card:CreditCard):EvolutionCardRow[]{
  return (card.purchases||[]).flatMap(purchase=>(purchase.entries||[]).map(entry=>({
    id:entry.id,
    purchaseId:purchase.id,
    eventId:entry.eventId,
    description:purchase.description,
    purchaseDate:purchase.purchaseDate,
    statementMonth:entry.statementMonth,
    amount:Math.abs(Number(entry.amount||0)),
    installmentNo:Number(entry.number||1),
    installmentQty:Number(purchase.installments||1),
    status:String(entry.status||'open'),
    category:purchase.category?.name||undefined,
  })));
}

export function evolutionCardRowsForTab(card:CreditCard,month:string,tab:EvolutionCardTab){
  const rows=evolutionCardRows(card);
  const current=rows.filter(row=>row.statementMonth===month);
  if(tab==='current')return current;
  if(tab==='upcoming')return rows.filter(row=>row.statementMonth>month);
  if(tab==='installments')return rows.filter(row=>row.installmentQty>1);
  if(tab==='history')return rows;
  const currentIds=new Set(current.map(row=>row.id));
  return current.concat(rows.filter(row=>!currentIds.has(row.id)&&row.statementMonth>month)).slice(0,8);
}

function download(filename:string,blob:Blob){
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');
  anchor.href=url;
  anchor.download=filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function exportCardRowsCsv(filename:string,rows:EvolutionCardRow[]){
  const quote=(value:unknown)=>'"'+String(value??'').replace(/"/g,'""')+'"';
  const body=[
    ['Descrição','Data','Fatura','Parcela','Categoria','Status','Valor'],
    ...rows.map(row=>[
      row.description,
      row.purchaseDate.slice(0,10),
      row.statementMonth,
      row.installmentQty>1?`${row.installmentNo}/${row.installmentQty}`:'',
      row.category||'',
      row.status,
      row.amount.toFixed(2).replace('.',','),
    ]),
  ].map(line=>line.map(quote).join(';')).join('\r\n');
  download(filename,new Blob(['\uFEFF'+body],{type:'text/csv;charset=utf-8'}));
}

export function printCardRows(title:string,rows:EvolutionCardRow[]){
  const safe=(value:unknown)=>String(value??'').replace(/[&<>"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]||char));
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>${safe(title)}</title><style>
    body{font-family:Arial,sans-serif;padding:24px;color:#10202c}h1{font-size:22px}table{width:100%;border-collapse:collapse}
    th,td{padding:8px;border-bottom:1px solid #ccd5db;text-align:left;font-size:12px}th{background:#eef3f5}
  </style></head><body><h1>${safe(title)}</h1><table><thead><tr><th>Descrição</th><th>Data</th><th>Fatura</th><th>Parcela</th><th>Categoria</th><th>Status</th><th>Valor</th></tr></thead><tbody>${rows.map(row=>`<tr><td>${safe(row.description)}</td><td>${safe(row.purchaseDate.slice(0,10))}</td><td>${safe(row.statementMonth)}</td><td>${safe(row.installmentQty>1?`${row.installmentNo}/${row.installmentQty}`:'')}</td><td>${safe(row.category||'')}</td><td>${safe(row.status)}</td><td>R$ ${safe(row.amount.toFixed(2).replace('.',','))}</td></tr>`).join('')}</tbody></table></body></html>`;
  const popup=window.open('','_blank','noopener,noreferrer,width=1100,height=780');
  if(!popup)return;
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  popup.print();
}
