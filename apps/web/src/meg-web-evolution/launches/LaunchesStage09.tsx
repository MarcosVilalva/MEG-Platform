import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {DataGrid} from '../datagrid/DataGrid';
import {applyFilters} from '../datagrid/core';
import type {DataGridColumn,DataGridFilterState} from '../datagrid/types';
import type {HomeFinancialData} from '../home/HomeDashboard';
import {LaunchIcon, type LaunchIconName} from './LaunchIcon';
import {launchCategoryIcon} from './category-icon';
import './launches-stage09.css';

/**
 * Etapa 09: tela somente de LEITURA para validação visual.
 * previewData é a fixture isolada já usada pela Home homologada.
 * Não contém criação, edição, exclusão, liquidação nem regra financeira.
 * Totais financeiros vêm apenas do read model (summary) e ficam ocultos
 * quando os filtros deixam de representar o conjunto canônico do mês.
 */
export type LaunchesFilterPreset={
 search:string;kind:string;category:string;account:string;start:string;end:string;
};
type Props={
 data:HomeFinancialData;onNew:()=>void;onHome:()=>void;
 mode?:'preview'|'live';periodMonth?:string;userId?:string;
 exportUserName?:string;onRefresh?:()=>void;
 rememberedFilters?:Partial<LaunchesFilterPreset>;
 onRememberFilters?:(value:LaunchesFilterPreset)=>void;
};
type Row=Record<string,unknown>&{
 id:string;date:string;description:string;category:string;account:string;
 paymentMethod:string;status:string;type:string;signedAmount:number;
 notes:string;categoryId:string;accountId:string;
 typeLabel:string;statusLabel:string;competence:string;
 weekday:string;launchType:string;expenseClass:string;group:string;
 situation:string;modality:string;historicalNotes:string;
};
type HistoryLabels={
 weekday?:string;launchType?:string;expenseClass?:string;
 group?:string;situation?:string;modality?:string;observations?:string;
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
  const original=item as typeof item & {
   notes?:string;legacyCategoryName?:string;paymentMethod?:{name?:string};
   paymentMethodName?:string;sourceDetails?:{paymentMethod?:string};
   competence?:string;sourceLabels?:HistoryLabels;
  };
  return {
   id:item.id,date:item.date.slice(0,10),description:item.description,
   category:categories.get(item.categoryId||'')||(original.legacyCategoryName?.trim()||'Sem categoria'),
   account:accounts.get(item.accountId||'')||'Sem conta',
   paymentMethod:readable(original.paymentMethod?.name||original.paymentMethodName||original.sourceDetails?.paymentMethod),
   status:item.status,type:item.type,signedAmount:item.signedAmount,
   notes:original.notes||'',categoryId:item.categoryId||'',accountId:item.accountId||'',
   typeLabel:shortType[item.type]||item.type,
   statusLabel:shortStatus[item.status]||item.status,
   competence:original.competence||'',
   weekday:original.sourceLabels?.weekday||'',
   launchType:original.sourceLabels?.launchType||'',
   expenseClass:original.sourceLabels?.expenseClass||'',
   group:original.sourceLabels?.group||'',
   situation:original.sourceLabels?.situation||'',
   modality:original.sourceLabels?.modality||'',
   historicalNotes:original.sourceLabels?.observations||''
  };
 }).sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
}
function DemoBreakdown({rows,mode}:{rows:Row[];mode:'preview'|'live'}){
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
 return <>
  <div className="meg-l09-distribution-body">
   <div className="meg-l09-donut" style={{background:image}} role="img" aria-label={segments.length?segments.map(s=>s.category+': '+s.count+' lançamento(s)').join('; '):'Sem despesas no filtro'}>
    <div className="meg-l09-donut-hole"><strong>{rows.filter(row=>row.type==='expense').length}</strong><small>despesas</small></div>
   </div>
   <div className="meg-l09-legend">
    {segments.length?segments.map(s=><div className="meg-l09-legend-item" key={s.category}><span className="meg-l09-swatch" style={{background:s.color}}/><span title={s.category}>{s.category}</span><strong>{s.count}</strong><small>{s.percent.toFixed(0)}%</small></div>):<p>Sem despesas nesta seleção.</p>}
   </div>
  </div>
  <p className="meg-l09-hint">{mode==='preview'?'Prévia: distribuição pela quantidade de registros. Valores financeiros dependem do read model canônico.':'Distribuição por quantidade de registros, não por valores ou saldo financeiro.'}</p>
 </>;
}

/** Detalhes exclusivos da leitura operacional. Não oferece writers financeiros. */
function LaunchDetailModal({row,onClose}:{row:Row;onClose:()=>void}){
 const surfaceRef=useRef<HTMLElement|null>(null);
 const closeRef=useRef<HTMLButtonElement|null>(null);
 useEffect(()=>{
  const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
  const previousOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  closeRef.current?.focus();
  const onKey=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();onClose();return;}
   if(event.key!=='Tab')return;
   const focusable=[...(surfaceRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])')??[])].filter(node=>node.getClientRects().length>0);
   if(!focusable.length){event.preventDefault();surfaceRef.current?.focus();return;}
   const first=focusable[0],last=focusable[focusable.length-1];
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  };
  document.addEventListener('keydown',onKey);
  return ()=>{document.removeEventListener('keydown',onKey);document.body.style.overflow=previousOverflow;previous?.focus();};
 },[onClose]);

 const main:[string,string][]=[
  ['Data',dateFmt(row.date)],['Competência',/^\d{4}-\d{2}$/.test(row.competence)?row.competence.slice(5,7)+'/'+row.competence.slice(0,4):readable(row.competence)],
  ['Tipo',row.typeLabel],['Status',row.statusLabel],['Categoria',row.category],
  ['Conta / Cartão',row.account],['Forma de pagamento',row.paymentMethod],
 ];
 const original:[string,string][]=[
  ['Tipo de lançamento original',row.launchType],['Classificação original',row.expenseClass],
  ['Grupo original',row.group],['Situação original',row.situation],
  ['Modalidade original',row.modality],['Dia da semana original',row.weekday],
  ['Observações originais',row.historicalNotes]
 ].filter(([,value])=>Boolean(value.trim()));
 return createPortal(
  <div className="meg-l09-modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}>
   <section className="meg-l09-modal" role="dialog" aria-modal="true" aria-labelledby="meg-l09-dialog-title" aria-describedby="meg-l09-dialog-description" ref={surfaceRef} tabIndex={-1}>
    <header className="meg-l09-modal-header">
     <div><span className="meg-l09-modal-eyebrow">CONSULTA DE LANÇAMENTO</span><h2 id="meg-l09-dialog-title">{row.description}</h2><p id="meg-l09-dialog-description">Dados autenticados da API financeira. Somente leitura.</p></div>
     <button ref={closeRef} type="button" className="meg-l09-modal-close" onClick={onClose} aria-label="Fechar detalhes">×</button>
    </header>
    <div className="meg-l09-modal-scroll">
     <div className="meg-l09-modal-amount">
      <span>Valor do lançamento</span><strong className={row.signedAmount>=0?'is-positive':'is-negative'}>{row.signedAmount>0?'+ ':''}{currency(row.signedAmount)}</strong>
     </div>
     <dl className="meg-l09-modal-fields">{main.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
     {row.notes.trim()&&<div className="meg-l09-modal-note"><strong>Observações</strong><p>{row.notes}</p></div>}
     {original.length>0&&<details className="meg-l09-modal-history"><summary>Dados originais do histórico <span>{original.length}</span></summary>
      <p>Rótulos preservados da importação, sem alterar as classificações atuais.</p>
      <dl className="meg-l09-modal-fields">{original.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
     </details>}
    </div>
    <footer className="meg-l09-modal-footer"><span>Edição, exclusão e baixa permanecem indisponíveis nesta etapa.</span><button type="button" onClick={onClose}>Fechar</button></footer>
   </section>
  </div>,document.body
 );
}
export function LaunchesStage09({data,onNew,onHome,mode='preview',periodMonth='2026-10',userId,exportUserName,onRefresh,rememberedFilters,onRememberFilters}:Props){
 const startOfMonth=periodMonth+'-01';
 const endOfMonth=new Date(Date.UTC(Number(periodMonth.slice(0,4)),Number(periodMonth.slice(5,7)),0)).toISOString().slice(0,10);
 const [search,setSearch]=useState(rememberedFilters?.search??'');
 const [kind,setKind]=useState(rememberedFilters?.kind??'all');
 const [category,setCategory]=useState(rememberedFilters?.category??'all');
 const [account,setAccount]=useState(rememberedFilters?.account??'all');
 const [start,setStart]=useState(rememberedFilters?.start??startOfMonth);
 const [end,setEnd]=useState(rememberedFilters?.end??endOfMonth);
 useEffect(()=>{
  if(mode==='live')onRememberFilters?.({search,kind,category,account,start,end});
 },[search,kind,category,account,start,end,mode,onRememberFilters]);
 const [advanced,setAdvanced]=useState<DataGridFilterState>({});
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const [modalId,setModalId]=useState<string|null>(null);
 const [distributionOpen,setDistributionOpen]=useState(false);
 const [detailsOpen,setDetailsOpen]=useState(false);
 const detailsPanelRef=useRef<HTMLElement|null>(null);
 const closeModal=useCallback(()=>setModalId(null),[]);
 const openDetails=useCallback((id:string)=>{
  if(mode==='live'){setModalId(id);return;}
  setSelectedId(id);
  setDetailsOpen(true);
  window.requestAnimationFrame(()=>detailsPanelRef.current?.scrollIntoView({block:'nearest',behavior:'smooth'}));
 },[mode]);
 const [showNotes,setShowNotes]=useState(false);
 const allRows=useMemo(()=>sourceRows(data),[data]);
 const legacyCategoryOptions=useMemo(()=>[...new Set(
  allRows.filter(row=>!row.categoryId && row.category!=='Sem categoria').map(row=>row.category)
 )].sort((left,right)=>left.localeCompare(right,'pt-BR')),[allRows]);
 const rows=useMemo(()=>allRows.filter(row=>
   (!search||[row.description,row.category,row.account,row.paymentMethod,row.typeLabel,row.statusLabel,row.competence,
    row.weekday,row.launchType,row.expenseClass,row.group,row.situation,row.modality,row.notes,row.historicalNotes]
    .some(value=>value.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))))
   &&(kind==='all'||row.type===kind)
   &&(category==='all'||row.categoryId===category
    ||(category.startsWith('legacy:')&&!row.categoryId&&row.category===category.slice(7)))
   &&(account==='all'||row.accountId===account)
   &&(!start||row.date>=start)&&(!end||row.date<=end)
 ),[allRows,search,kind,category,account,start,end]);
 const columns=useMemo<DataGridColumn<Row>[]>(()=>{
 const extraColumns:DataGridColumn<Row>[]=[
  // Somente campos financeiros canônicos no grid principal. Campos legados
  // permanecem íntegros no modal, sem duplicar colunas com semântica distinta.
  {key:'typeLabel',label:'Tipo',type:'enum',width:145,minWidth:110,sortable:true,filterable:true},
  {key:'statusLabel',label:'Status',type:'enum',width:138,minWidth:105,sortable:true,filterable:true},
  {key:'competence',label:'Competência',type:'text',width:144,minWidth:120,sortable:true,filterable:true,
   render:(value)=>/^\d{4}-\d{2}$/.test(String(value))?String(value).slice(5,7)+'/'+String(value).slice(0,4):readable(value)},
 ];
 return [
  ...(mode==='live'?[{key:'id',label:'Ações',type:'text',width:104,minWidth:94,sortable:false,filterable:false,
   render:(_value:unknown,row:Row)=><button className="meg-l09-row-menu meg-l09-row-view" type="button" title="Abrir detalhes do lançamento" aria-label={'Ver detalhes de '+row.description} onClick={()=>openDetails(row.id)}><LaunchIcon name="list" width={16} height={16}/><span>Ver</span></button>} as DataGridColumn<Row>]:[]),
  {key:'date',label:'Data',type:'date',width:128,minWidth:100,sortable:true,filterable:true,render:(value)=>dateFmt(String(value))},
  {key:'description',label:'Descrição',type:'text',width:218,minWidth:160,sortable:true,filterable:true,
   render:(_value,row)=><button type="button" className="meg-l09-open-row" onClick={()=>openDetails(row.id)} title={'Abrir detalhes de '+row.description}>{row.description}</button>},
  {key:'category',label:'Categoria',type:'enum',width:160,minWidth:128,sortable:true,filterable:true,
   render:(_value,row)=><span className={'meg-l09-chip '+(row.type==='income'?'is-income':row.category==='Supermercado'?'is-food':'')} title={row.category}>
    <LaunchIcon name={launchCategoryIcon(row.category)} width={17} height={17} strokeWidth={1.9}/>
    <span className="meg-l09-chip-label">{row.category}</span>
   </span>},
  {key:'account',label:'Conta / Cartão',type:'enum',width:174,minWidth:135,sortable:true,filterable:true},
  {key:'paymentMethod',label:'Forma de pagamento',type:'enum',width:182,minWidth:155,sortable:true,filterable:true},
  {key:'signedAmount',label:'Valor',type:'currency',width:142,minWidth:125,sortable:true,filterable:true,
   render:(_value,row)=><strong className={'meg-l09-money '+(row.signedAmount>=0?'is-positive':'is-negative')}>{row.signedAmount>0?'+ ':''}{currency(row.signedAmount)}</strong>},
  ...(mode==='preview'?[{key:'id',label:'Ações',type:'text',width:84,minWidth:72,sortable:false,filterable:false,
   render:(_value:unknown,row:Row)=><button className="meg-l09-row-menu" type="button" title="Ver lançamento" aria-label={'Detalhes de '+row.description} onClick={()=>openDetails(row.id)}>•••</button>} as DataGridColumn<Row>]:[]),
  ...(mode==='live'?extraColumns:[]),
 ];},[openDetails,mode]);
 const onGridFilter=useCallback(({filters}:{filters:DataGridFilterState})=>setAdvanced(filters),[]);
 const shownRows=useMemo(()=>applyFilters(rows,columns,advanced),[rows,columns,advanced]);
 const chosen=allRows.find(row=>row.id===selectedId)??shownRows[0]??null;
 const modalRow=mode==='live'?allRows.find(row=>row.id===modalId)??null:null;
 const filtered=Boolean(search||kind!=='all'||category!=='all'||account!=='all'||start!==startOfMonth||end!==endOfMonth||Object.keys(advanced).some(key=>{const f=advanced[key];return Boolean(f?.selected?.length||f?.operator||f?.booleanValue!==undefined&&f?.booleanValue!==null)}));
 const summary=!filtered&&data.summary?.month===periodMonth?data.summary:null;
 const blank=summary===null;
 const stats=[
  {name:mode==='live'?'Resultado projetado':'Total no período',value:summary?.projectedResult,tag:'Resultado canônico',variant:'total'},
  {name:'Entradas',value:summary?.income,tag:mode==='live'?'Resumo da API':'Resumo da API / fixture',variant:'income'},
  {name:'Saídas',value:summary?.expense,tag:mode==='live'?'Resumo da API':'Resumo da API / fixture',variant:'expense'},
  {name:mode==='live'?'Resultado realizado':'Saldo no período',value:mode==='live'?summary?.realizedResult:summary?.projectedResult,tag:mode==='live'?'Consolidado pela API':'Resultado do período',variant:'balance'}
 ];
 return <section className="meg-l09" aria-label="Lançamentos financeiros" data-icon-pack="phosphor">
  <header className="meg-l09-hero">
   <div><h1>Lançamentos</h1><p>Visualize, filtre e gerencie todas as suas movimentações financeiras.</p></div>
   <button type="button" className="meg-l09-add" onClick={onNew} disabled={mode==='live'} title={mode==='live'?'Formulário de criação protegido será integrado na etapa própria':undefined}><LaunchIcon name="plus" width={19} height={19}/>Novo lançamento</button>
  </header>
  <div className="meg-l09-stats">{stats.map(s=><section key={s.name} className={'meg-l09-stat is-'+s.variant}>
   <span className="meg-l09-stat-icon" aria-hidden="true"><LaunchIcon name={({income:'trendUp',expense:'trendDown',balance:'wallet',total:'chart'} as Record<string,LaunchIconName>)[s.variant]||'chart'} width={25} height={25} strokeWidth={1.9}/></span>
   <div><h2>{s.name}</h2><strong>{blank?'—':currency(s.value)}</strong><small>{blank?'Aguardando total da autoridade financeira':s.tag}</small></div>
  </section>)}</div>
  <p className="meg-l09-preview-warning" role="note">{mode==='live'?'Histórico autenticado e conferido em duas leituras. Use Ver na primeira coluna para consultar os detalhes e rótulos originais. Indicadores financeiros vêm da API e ficam indisponíveis com filtros personalizados. Nenhum lançamento é alterado.':'Prévia visual com dados de demonstração já existentes na Home. Não consulta, altera ou grava dados financeiros. Os totais canônicos são ocultados quando filtros personalizados são usados.'}
   {mode==='live'&&onRefresh&&<button type="button" className="meg-l09-refresh" onClick={onRefresh}>Atualizar consulta</button>}
  </p>
  <div className="meg-l09-workspace">
   <div className="meg-l09-left">
    <form className="meg-l09-filters" onSubmit={event=>event.preventDefault()} role="search">
      <label className="meg-l09-search"><LaunchIcon name="search" width={20} height={20}/><span className="sr-only">Buscar lançamentos</span><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Buscar lançamentos..."/></label>
      <label><span className="sr-only">Tipo</span><select value={kind} onChange={event=>setKind(event.target.value)}><option value="all">Todos os tipos</option>{['income','expense','transfer','investment','redemption','adjustment'].map(k=><option key={k} value={k}>{shortType[k]}</option>)}</select></label>
      <label><span className="sr-only">Categoria</span><select value={category} onChange={event=>setCategory(event.target.value)}><option value="all">Todas as categorias</option>{data.categories.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}{legacyCategoryOptions.length>0&&<optgroup label="Categorias do histórico">{legacyCategoryOptions.map(name=><option key={'legacy:'+name} value={'legacy:'+name}>{name}</option>)}</optgroup>}</select></label>
      <label><span className="sr-only">Conta</span><select value={account} onChange={event=>setAccount(event.target.value)}><option value="all">Todas as contas</option>{data.accounts.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <fieldset className="meg-l09-date-range"><legend className="sr-only">Intervalo de datas</legend><LaunchIcon name="calendar" width={16} height={16}/><input lang="pt-BR" type="date" value={start} onChange={event=>setStart(event.target.value)} aria-label="Data inicial"/><span aria-hidden="true">–</span><input lang="pt-BR" type="date" min={start||undefined} value={end} onChange={event=>setEnd(event.target.value)} aria-label="Data final"/></fieldset>
    </form>
    <aside className={'meg-l09-right '+(mode==='live'?'is-operational':'')} aria-label="Painéis complementares da grade">
     <section className={'meg-l09-panel meg-l09-distribution '+(distributionOpen?'is-open':'is-collapsed')} aria-label="Distribuição no período">
      <div className="meg-l09-panel-title">
       <button type="button" className="meg-l09-panel-toggle" aria-controls="meg-l09-distribution-content" aria-expanded={distributionOpen} aria-label={distributionOpen?'Recolher gráfico de distribuição':'Expandir gráfico de distribuição'} onClick={()=>setDistributionOpen(open=>!open)}>
        <LaunchIcon name="chart" width={19} height={19}/><span className="meg-l09-toggle-title">Distribuição no período</span><span className="meg-l09-mini">Por quantidade</span><LaunchIcon name="chevronDown" width={19} height={19} className="meg-l09-panel-chevron"/>
       </button>
      </div>
      <div id="meg-l09-distribution-content" className="meg-l09-panel-content" hidden={!distributionOpen}>{distributionOpen&&<DemoBreakdown rows={shownRows} mode={mode}/>}</div>
     </section>
     {mode==='preview'&&<section ref={detailsPanelRef} className={'meg-l09-panel meg-l09-details '+(detailsOpen?'is-open':'is-collapsed')} aria-label="Lançamento selecionado">
      <div className="meg-l09-panel-title">
       <button type="button" className="meg-l09-panel-toggle" aria-controls="meg-l09-details-content" aria-expanded={detailsOpen} aria-label={detailsOpen?'Recolher detalhes do lançamento':'Expandir detalhes do lançamento'} onClick={()=>setDetailsOpen(open=>!open)}>
        <LaunchIcon name="list" width={19} height={19}/><span className="meg-l09-toggle-title">Lançamento selecionado</span><LaunchIcon name="chevronDown" width={19} height={19} className="meg-l09-panel-chevron"/>
       </button>
      </div>
      <div id="meg-l09-details-content" className="meg-l09-panel-content" hidden={!detailsOpen}>
       <div className="meg-l09-detail-actions"><button type="button" onClick={()=>setShowNotes(value=>!value)} aria-pressed={showNotes}>{showNotes?'Ocultar observações':'Mostrar observações'}</button><button type="button" disabled title="Editar depende de integração financeira protegida" className="meg-l09-edit">Editar</button></div>
       {chosen?<div className="meg-l09-detail-body">
        <div className="meg-l09-selected-head"><span aria-hidden="true" className="meg-l09-detail-illustration"><LaunchIcon name="list" width={25} height={25}/></span><div><strong>{chosen.description}</strong><span>{chosen.category}</span></div><strong className={chosen.signedAmount>=0?'is-positive':'is-negative'}>{currency(chosen.signedAmount)}</strong></div>
        <dl>
         <div><dt>Data</dt><dd>{dateFmt(chosen.date)}</dd></div>
         <div><dt>Conta / Cartão</dt><dd>{chosen.account}</dd></div>
         <div><dt>Forma de pagamento</dt><dd>{chosen.paymentMethod}</dd></div>
         <div><dt>Categoria</dt><dd>{chosen.category}</dd></div>
         <div><dt>Tipo</dt><dd>{shortType[chosen.type]||chosen.type}</dd></div>
         <div><dt>Status</dt><dd>{shortStatus[chosen.status]||chosen.status}</dd></div>
         {showNotes&&<div><dt>Observações</dt><dd>{chosen.notes||'Sem observações cadastradas'}</dd></div>}
        </dl>
        <p className="meg-l09-hint">{mode==='preview'?'Edição, exclusão e baixa indisponíveis na prévia, sem acesso ao writer financeiro.':'Edição, exclusão e baixa indisponíveis nesta etapa; nenhuma operação financeira é executada.'}</p>
       </div>:<p className="meg-l09-empty">Nenhum lançamento selecionado.</p>}
      </div>
     </section>}
    </aside>
    <section className="meg-l09-grid-panel" aria-label="Tabela de lançamentos">
     <DataGrid<Row> data={rows} columns={columns} pageSize={25} selectable
      rowKey="id" persistenceKey={mode==='live'?'stage09-launches-live-v2-'+(userId||'user'):'stage09-launches-demo-only'} ariaLabel="Lançamentos do período"
      footerAggregates={false} onFilterChange={onGridFilter} exportUserName={mode==='live'?exportUserName:undefined}
      exportPeriod={mode==='live'?'Histórico autorizado — '+periodMonth:'Demonstração visual'} />
    </section>
    <div className="meg-l09-grid-summary">{shownRows.length.toLocaleString('pt-BR')} de {allRows.length.toLocaleString('pt-BR')} registros {mode==='live'?'do histórico autorizado':'da amostra de demonstração'}. Ordem cronológica, sem agrupamento por categoria.</div>
   </div>
  </div>
  <button type="button" className="meg-l09-back" onClick={onHome}><LaunchIcon name="chevronLeft" width={18} height={18}/>Voltar à Home</button>
  {modalRow&&<LaunchDetailModal row={modalRow} onClose={closeModal}/>}
 </section>;
}
