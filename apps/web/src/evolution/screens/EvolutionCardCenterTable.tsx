import {useMemo,useState} from 'react';
import type {CreditCard} from '../../app/cards-client';
import {EvolutionFinancialIcon as Icon} from '../components/EvolutionFinancialIcon';
import {Panel} from '../components/SystemUI';
import {datePt,money,monthPt,normalize} from '../app/system-domain';
import {evolutionCardRowsForTab,exportCardRowsCsv,printCardRows,type EvolutionCardRow,type EvolutionCardTab} from '../app/android-parity';

const tabs:Array<[EvolutionCardTab,string]>=[
  ['summary','Resumo'],
  ['current','Atual'],
  ['upcoming','Próximas'],
  ['installments','Parcelas'],
  ['history','Histórico'],
];

export function EvolutionCardCenterTable({
  card,
  month,
  onEdit,
}:{
  card:CreditCard;
  month:string;
  onEdit:(row:EvolutionCardRow)=>void;
}){
  const [tab,setTab]=useState<EvolutionCardTab>('summary');
  const [query,setQuery]=useState('');
  const rows=useMemo(()=>{
    const source=evolutionCardRowsForTab(card,month,tab);
    const needle=normalize(query);
    return source.filter(row=>!needle||normalize([row.description,row.category,row.statementMonth].join(' ')).includes(needle));
  },[card,month,tab,query]);
  const total=rows.reduce((sum,row)=>sum+row.amount,0);
  const slug=normalize(card.name).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'cartao';

  return <Panel title="Central de lançamentos" icon="list" className="meg-table-panel meg-card-parity-panel">
    <div className="meg-card-center-toolbar">
      <div className="meg-tabs" role="tablist" aria-label="Visões da fatura">
        {tabs.map(([key,label])=><button type="button" role="tab" aria-selected={tab===key} className={tab===key?'active':''} key={key} onClick={()=>setTab(key)}>{label}</button>)}
      </div>
      <label className="meg-card-search"><Icon name="search"/><input placeholder="Buscar descrição, categoria ou fatura" value={query} onChange={event=>setQuery(event.target.value)}/></label>
      <div className="meg-card-export-actions">
        <button type="button" onClick={()=>exportCardRowsCsv(`fatura-${slug}.csv`,rows)}><Icon name="list" size={16}/>CSV</button>
        <button type="button" onClick={()=>printCardRows(`Fatura - ${card.name}`,rows)}><Icon name="receipt" size={16}/>PDF / imprimir</button>
      </div>
    </div>
    <div className="meg-card-center-context">
      <span><small>Visão</small><strong>{tabs.find(([key])=>key===tab)?.[1]}</strong></span>
      <span><small>Lançamentos</small><strong>{rows.length}</strong></span>
      <span><small>Total da visão</small><strong>{money(total)}</strong></span>
    </div>
    <div className="meg-scroll">
      <table className="meg-table">
        <thead><tr><th>Compra</th><th>Descrição</th><th>Fatura</th><th>Parcela</th><th>Categoria</th><th>Status</th><th>Valor</th><th>Ações</th></tr></thead>
        <tbody>{rows.map(row=><tr key={row.id}>
          <td>{datePt(row.purchaseDate)}</td>
          <td>{row.description}</td>
          <td>{row.statementMonth?monthPt(row.statementMonth):'—'}</td>
          <td>{row.installmentQty>1?`${row.installmentNo}/${row.installmentQty}`:'À vista'}</td>
          <td><span className="meg-pill">{row.category||'Sem categoria'}</span></td>
          <td><span className={'meg-pill '+(row.status==='open'?'yellow':'green')}>{row.status==='open'?'Na fatura':'Histórico'}</span></td>
          <td>{money(row.amount)}</td>
          <td><button className="meg-row-edit" type="button" aria-label={'Editar '+row.description} onClick={()=>onEdit(row)}><Icon name="note" size={17}/></button></td>
        </tr>)}</tbody>
      </table>
      {!rows.length&&<p className="meg-empty">{tab==='upcoming'?'Nenhuma fatura futura projetada.':'Nenhum lançamento encontrado nesta visão.'}</p>}
    </div>
  </Panel>;
}
