import {useEffect,useMemo,useState} from 'react';
import {financeClient,type FinancialEvent} from '../../app/finance-client';
import {EvolutionFinancialIcon as Icon} from '../components/EvolutionFinancialIcon';
import {Button,EventsTable,Metric,Panel} from '../components/SystemUI';
import {errorMessage,normalize,signed,sum} from '../app/system-domain';

export function EvolutionHistory({onEdit}:{onEdit:(event:FinancialEvent)=>void}){
  const [items,setItems]=useState<FinancialEvent[]>([]);
  const [total,setTotal]=useState(0);
  const [page,setPage]=useState(1);
  const [pageSize,setPageSize]=useState(50);
  const [search,setSearch]=useState('');
  const [type,setType]=useState('all');
  const [status,setStatus]=useState('all');
  const [busy,setBusy]=useState(true);
  const [error,setError]=useState('');

  useEffect(()=>{
    let alive=true;
    setBusy(true);setError('');
    const timer=window.setTimeout(()=>{
      financeClient.listEvents(page,pageSize,search.trim()).then(result=>{
        if(!alive)return;
        setItems(result.items.filter(item=>item.status!=='archived'));
        setTotal(result.total);
      }).catch(cause=>alive&&setError(errorMessage(cause))).finally(()=>alive&&setBusy(false));
    },search?220:0);
    return()=>{alive=false;window.clearTimeout(timer)};
  },[page,pageSize,search]);

  useEffect(()=>setPage(1),[search,type,status,pageSize]);

  const visible=useMemo(()=>items.filter(item=>
    (type==='all'||item.type===type)&&
    (status==='all'||status==='realized'&&['paid','confirmed','reconciled'].includes(item.status)||status==='planned'&&item.status==='planned')
  ).sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id)),[items,type,status]);

  const income=sum(visible.filter(x=>x.type==='income').map(x=>Math.max(0,signed(x))));
  const expense=sum(visible.filter(x=>x.type==='expense').map(x=>Math.abs(signed(x))));
  const pages=Math.max(1,Math.ceil(total/pageSize));

  return <div className="meg-module-grid meg-history-view">
    <header className="meg-page-head"><div><h1>Histórico</h1><p>Todos os lançamentos, sem ficar preso à competência atual.</p></div></header>
    <div className="meg-module-metrics">
      <Metric label="Registros nesta página" icon="list" value={visible.length} detail={total+' registros encontrados'}/>
      <Metric label="Receitas visíveis" icon="banknote" tone="green" value={income}/>
      <Metric label="Despesas visíveis" icon="receipt" tone="red" value={expense}/>
      <Metric label="Resultado visível" icon="chart" value={income-expense}/>
    </div>
    <Panel title="Histórico financeiro" icon="clock" className="meg-table-panel">
      <div className="meg-history-toolbar">
        <label className="meg-card-search"><Icon name="search"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar em todo o histórico"/></label>
        <select aria-label="Tipo" value={type} onChange={e=>setType(e.target.value)}><option value="all">Todos os tipos</option><option value="income">Receitas</option><option value="expense">Despesas</option><option value="transfer">Transferências</option><option value="investment">Investimentos</option><option value="redemption">Resgates</option><option value="adjustment">Ajustes</option></select>
        <select aria-label="Situação" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">Todas as situações</option><option value="realized">Realizados</option><option value="planned">Pendentes</option></select>
        <select aria-label="Itens por página" value={pageSize} onChange={e=>setPageSize(Number(e.target.value))}><option value={20}>20 por página</option><option value={50}>50 por página</option><option value={100}>100 por página</option></select>
      </div>
      {error?<div className="meg-error-inline">{error}</div>:null}
      {busy?<div className="meg-fetching inline"><span/><strong>Carregando histórico…</strong></div>:<EventsTable events={visible} onEdit={onEdit}/>}
      <footer className="meg-history-pagination"><span>Página {page} de {pages}</span><div><Button disabled={page<=1||busy} onClick={()=>setPage(x=>Math.max(1,x-1))} icon="chevron-left">Anterior</Button><Button disabled={page>=pages||busy} onClick={()=>setPage(x=>Math.min(pages,x+1))}>Próxima</Button></div></footer>
    </Panel>
  </div>;
}
