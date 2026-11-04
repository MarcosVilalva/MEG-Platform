import {useCallback,useMemo,useState} from 'react';
import {DataGrid} from '../datagrid/DataGrid';
import {applyFilters} from '../datagrid/core';
import type {DataGridColumn,DataGridFilterState} from '../datagrid/types';
import type {HomeFinancialData} from '../home/HomeDashboard';
import {Icon} from '../components/Icon';
import './launches-stage09.css';

/**
 * Etapa 09: tela somente de LEITURA para validação visual.
 * previewData é a fixture isolada já usada pela Home homologada.
 * Não contém criação, edição, exclusão, liquidação nem regra financeira.
 * Totais financeiros vêm apenas do read model (summary) e ficam ocultos
 * quando os filtros deixam de representar o conjunto canônico do mês.
 */
type Props={data:HomeFinancialData;onNew:()=>void;onHome:()=>void};
type Row=Record<string,unknown>&{
 id:string;date:string;description:string;category:string;account:string;
 paymentMethod:string;status:string;type:string;signedAmount:number;
 notes:string;categoryId:string;accountId:string;
};
const fmt=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const dateFmt=(day:string)=>/^\d{4}-\d{2}-\d{2}$/.test(day)?day.slice(8)+'/'+day.slice(5,7)+'/'+day.slice(0,4):'—';
const shortType:Record<string,string>={income:'Receita',expense:'Despesa',transfer:'Transferência',investment:'Investimento',redemption:'Resgate',adjustment:'Ajuste'};
const shortStatus:Record<string,string>={paid:'Pago',planned:'Planejado',confirmed:'Confirmado',draft:'Rascunho',reconciled:'Conciliado',archived:'Arquivado'};
const palette=['#feb83e','#8194aa','#2f97e8','#b74aca','#f4d653','#23c9af','#807ab4','#35b982'];
function currency(value:number|null|undefined){return typeof value==='number'&&Number.isFinite(value)?fmt.format(value):'—'}
function readable(unknownValue:unknown){return typeof unknownValue==='string'&&unknownValue.trim()?unknownValue:'Não informado'}
function sourceRows(source:HomeFinancialData):Row[]{
 const categories=new Map(source.categories.map(entry=>[entry.id,entry.name]));
 const accounts=new Map(source.accounts.map(entry=>[entry.id,entry.name]));
 return source.transactions.map(item=>{
  const original=item as typeof item & {notes?:string;paymentMethod?:{name?:string};paymentMethodName?:string;sourceDetails?:{paymentMethod?:string};};
  return {
   id:item.id,date:item.date.slice(0,10),description:item.description,
   category:categories.get(item.categoryId||'')||'Sem categoria',
   account:accounts.get(item.accountId||'')||'Sem conta',
   paymentMethod:readable(original.paymentMethod?.name||original.paymentMethodName||original.sourceDetails?.paymentMethod),
   status:item.status,type:item.type,signedAmount:item.signedAmount,
   notes:original.notes||'',categoryId:item.categoryId||'',accountId:item.accountId||''
  };
 }).sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
}
function DemoBreakdown({rows}:{rows:Row[]}){
 // Contagem de itens de despesa, não cálculo de gasto nem saldo.
 const segments=useMemo(()=>{
  const counts=new Map<string,number>();
  for(const row of rows)if(row.type==='expense')counts.set(row.category,(counts.get(row.category)||0)+1);
  const total=[...counts.values()].reduce((a,b)=>a+b,0);
  let start=0;
  return [...counts].sort((a,b)=>b[1]-a[1]).map(([category,count],index)=>{
   const percent=total?count/total*100:0;
   const current={category,count,percent,start,color:palette[index%palette.length]};
   start+=percent;return current;
  });
 },[rows]);
 const image=segments.length?'conic-gradient('+segments.map(s=>`${s.color} ${s.start}% ${s.start+s.percent}%`).join(', ')+')':'conic-gradient(#12353d 0 100%)';
 return <section className="meg-l09-panel meg-l09-distribution" aria-label="Distribuição no período">
  <div className="meg-l09-panel-title"><h2><span aria-hidden="true">◫</span>Distribuição no período</h2><span className="meg-l09-mini">Por quantidade</span></div>
  <div className="meg-l09-distribution-body">
   <div className="meg-l09-donut" style={{background:image}} role="img" aria-label={segments.length?segments.map(s=>s.category+': '+s.count+' lançamento(s)').join('; '):'Sem despesas no filtro'}>
    <div className="meg-l09-donut-hole"><strong>{rows.filter(row=>row.type==='expense').length}</strong><small>despesas</small></div>
   </div>
   <div className="meg-l09-legend">
    {segments.length?segments.map(s=><div className="meg-l09-legend-item" key={s.category}><span className="meg-l09-swatch" style={{background:s.color}}/><span title={s.category}>{s.category}</span><strong>{s.count}</strong><small>{s.percent.toFixed(0)}%</small></div>):<p>Sem despesas nesta seleção.</p>}
   </div>
  </div>
  <p className="meg-l09-hint">Prévia: distribuição pela quantidade de registros. Valores financeiros dependem do read model canônico.</p>
 </section>;
}
export function LaunchesStage09({data,onNew,onHome}:Props){
 const [search,setSearch]=useState('');
 const [kind,setKind]=useState('all');
 const [category,setCategory]=useState('all');
 const [account,setAccount]=useState('all');
 const [start,setStart]=useState('2026-10-01');
 const [end,setEnd]=useState('2026-10-31');
 const [advanced,setAdvanced]=useState<DataGridFilterState>({});
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const [mobileDetails,setMobileDetails]=useState(false);
 const [showNotes,setShowNotes]=useState(false);
 const allRows=useMemo(()=>sourceRows(data),[data]);
 const rows=useMemo(()=>allRows.filter(row=>
   (!search||[row.description,row.category,row.account,row.paymentMethod].some(value=>value.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))))
   &&(kind==='all'||row.type===kind)
   &&(category==='all'||row.categoryId===category)
   &&(account==='all'||row.accountId===account)
   &&(!start||row.date>=start)&&(!end||row.date<=end)
 ),[allRows,search,kind,category,account,start,end]);
 const columns=useMemo<DataGridColumn<Row>[]>(()=>[
  {key:'date',label:'Data',type:'date',width:128,minWidth:100,sortable:true,filterable:true,render:(value)=>dateFmt(String(value))},
  {key:'description',label:'Descrição',type:'text',width:218,minWidth:160,sortable:true,filterable:true,
   render:(_value,row)=><button type="button" className="meg-l09-open-row" onClick={()=>{setSelectedId(row.id);setMobileDetails(true)}} title={'Abrir detalhes de '+row.description}>{row.description}</button>},
  {key:'category',label:'Categoria',type:'enum',width:160,minWidth:128,sortable:true,filterable:true,
   render:(_value,row)=><span className={'meg-l09-chip '+(row.type==='income'?'is-income':row.category==='Supermercado'?'is-food':'')}>{row.category}</span>},
  {key:'account',label:'Conta / Cartão',type:'enum',width:174,minWidth:135,sortable:true,filterable:true},
  {key:'paymentMethod',label:'Forma de pagamento',type:'enum',width:182,minWidth:155,sortable:true,filterable:true},
  {key:'signedAmount',label:'Valor',type:'currency',width:142,minWidth:125,sortable:true,filterable:true,
   render:(_value,row)=><strong className={'meg-l09-money '+(row.signedAmount>=0?'is-positive':'is-negative')}>{row.signedAmount>0?'+ ':''}{currency(row.signedAmount)}</strong>},
  {key:'id',label:'Ações',type:'text',width:84,minWidth:72,sortable:false,filterable:false,
   render:(_value,row)=><button className="meg-l09-row-menu" type="button" title="Ver lançamento" aria-label={'Detalhes de '+row.description} onClick={()=>{setSelectedId(row.id);setMobileDetails(true)}}>•••</button>},
 ],[]);
 const onGridFilter=useCallback(({filters}:{filters:DataGridFilterState})=>setAdvanced(filters),[]);
 const shownRows=useMemo(()=>applyFilters(rows,columns,advanced),[rows,columns,advanced]);
 const chosen=allRows.find(row=>row.id===selectedId)??shownRows[0]??null;
 const filtered=Boolean(search||kind!=='all'||category!=='all'||account!=='all'||start!=='2026-10-01'||end!=='2026-10-31'||Object.keys(advanced).some(key=>{const f=advanced[key];return Boolean(f?.selected?.length||f?.operator||f?.booleanValue!==undefined&&f?.booleanValue!==null)}));
 const summary=!filtered&&data.summary?.month==='2026-10'?data.summary:null;
 const blank=summary===null;
 const stats=[
  {name:'Total no período',value:summary?.projectedResult,tag:'Resultado canônico',variant:'total'},
  {name:'Entradas',value:summary?.income,tag:'Resumo da API / fixture',variant:'income'},
  {name:'Saídas',value:summary?.expense,tag:'Resumo da API / fixture',variant:'expense'},
  {name:'Saldo no período',value:summary?.projectedResult,tag:'Resultado do período',variant:'balance'}
 ];
 return <section className="meg-l09" aria-label="Lançamentos financeiros">
  <header className="meg-l09-hero">
   <div><h1>Lançamentos</h1><p>Visualize, filtre e gerencie todas as suas movimentações financeiras.</p></div>
   <button type="button" className="meg-l09-add" onClick={onNew}><Icon name="plus" width={19}/>Novo lançamento</button>
  </header>
  <div className="meg-l09-stats">{stats.map(s=><section key={s.name} className={'meg-l09-stat is-'+s.variant}>
   <span className="meg-l09-stat-icon" aria-hidden="true">{s.variant==='income'?'↓':s.variant==='expense'?'↑':s.variant==='balance'?'◉':'▣'}</span>
   <div><h2>{s.name}</h2><strong>{blank?'—':currency(s.value)}</strong><small>{blank?'Aguardando total da autoridade financeira':s.tag}</small></div>
  </section>)}</div>
  <p className="meg-l09-preview-warning" role="note">Prévia visual com dados de demonstração já existentes na Home. Não consulta, altera ou grava dados financeiros. Os totais canônicos são ocultados quando filtros personalizados são usados.</p>
  <div className="meg-l09-workspace">
   <div className="meg-l09-left">
    <form className="meg-l09-filters" onSubmit={event=>event.preventDefault()} role="search">
      <label className="meg-l09-search"><Icon name="search" width={20}/><span className="sr-only">Buscar lançamentos</span><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Buscar lançamentos..."/></label>
      <label><span className="sr-only">Tipo</span><select value={kind} onChange={event=>setKind(event.target.value)}><option value="all">Todos os tipos</option>{['income','expense','transfer','investment','redemption','adjustment'].map(k=><option key={k} value={k}>{shortType[k]}</option>)}</select></label>
      <label><span className="sr-only">Categoria</span><select value={category} onChange={event=>setCategory(event.target.value)}><option value="all">Todas as categorias</option>{data.categories.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <label><span className="sr-only">Conta</span><select value={account} onChange={event=>setAccount(event.target.value)}><option value="all">Todas as contas</option>{data.accounts.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <fieldset className="meg-l09-date-range"><legend className="sr-only">Intervalo de datas</legend><Icon name="calendar" width={16}/><input lang="pt-BR" type="date" value={start} onChange={event=>setStart(event.target.value)} aria-label="Data inicial"/><span aria-hidden="true">–</span><input lang="pt-BR" type="date" min={start||undefined} value={end} onChange={event=>setEnd(event.target.value)} aria-label="Data final"/></fieldset>
    </form>
    <section className="meg-l09-grid-panel" aria-label="Tabela de lançamentos">
     <DataGrid<Row> data={rows} columns={columns} pageSize={12} selectable
      rowKey="id" persistenceKey="stage09-launches-demo-only" ariaLabel="Lançamentos do período"
      footerAggregates={false} onFilterChange={onGridFilter} exportPeriod="Demonstração visual" />
    </section>
    <div className="meg-l09-grid-summary">{shownRows.length} de {allRows.length} registros da amostra de demonstração. Ordem cronológica, sem agrupamento por categoria.</div>
   </div>
   <aside className="meg-l09-right">
    <DemoBreakdown rows={shownRows}/>
    <section className={'meg-l09-panel meg-l09-details '+(mobileDetails?'is-mobile-open':'')} aria-label="Lançamento selecionado">
     <div className="meg-l09-panel-title"><h2><Icon name="list" width={20}/>Lançamento selecionado</h2><div className="meg-l09-detail-actions"><button type="button" onClick={()=>setShowNotes(v=>!v)} aria-label="Alternar observações">•••</button><button type="button" disabled title="Editar depende de integração financeira protegida" className="meg-l09-edit">Editar</button><button type="button" className="meg-l09-mobile-close" aria-label="Fechar detalhes" onClick={()=>setMobileDetails(false)}>×</button></div></div>
     {chosen?<div className="meg-l09-detail-body">
      <div className="meg-l09-selected-head"><span aria-hidden="true" className="meg-l09-detail-illustration"><Icon name="list" width={25}/></span><div><strong>{chosen.description}</strong><span>{chosen.category}</span></div><strong className={chosen.signedAmount>=0?'is-positive':'is-negative'}>{currency(chosen.signedAmount)}</strong></div>
      <dl>
       <div><dt>Data</dt><dd>{dateFmt(chosen.date)}</dd></div>
       <div><dt>Conta / Cartão</dt><dd>{chosen.account}</dd></div>
       <div><dt>Forma de pagamento</dt><dd>{chosen.paymentMethod}</dd></div>
       <div><dt>Categoria</dt><dd>{chosen.category}</dd></div>
       <div><dt>Tipo</dt><dd>{shortType[chosen.type]||chosen.type}</dd></div>
       <div><dt>Status</dt><dd>{shortStatus[chosen.status]||chosen.status}</dd></div>
       {showNotes&&<div><dt>Observações</dt><dd>{chosen.notes||'Sem observações cadastradas'}</dd></div>}
      </dl>
      <p className="meg-l09-hint">Edição, exclusão e baixa indisponíveis na prévia, sem acesso ao writer financeiro.</p>
     </div>:<p className="meg-l09-empty">Nenhum lançamento selecionado.</p>}
    </section>
   </aside>
  </div>
  <button type="button" className="meg-l09-back" onClick={onHome}><Icon name="chevronLeft" width={18}/>Voltar à Home</button>
  {mobileDetails&&<button type="button" aria-label="Fechar detalhes" className="meg-l09-mobile-scrim" onClick={()=>setMobileDetails(false)}/>}
 </section>;
}
