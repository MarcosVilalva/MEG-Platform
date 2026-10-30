import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {authenticatedRequest} from '../../app/auth-client';
// @ts-expect-error Adaptador JavaScript da fonte única já validada na Etapa 02
import {composeMegApiSnapshot,fromCanonicalReadModels,fromFinancialEvents,fromPayables,fromCards,fromFinanceCatalogs} from '../../evolution/data/api-adapter.js';
import {DataGrid} from '../datagrid/DataGrid';
import type {DataGridColumn} from '../datagrid/types';
import {HomeChart,type CashflowDay} from './HomeChart';
import {HomeGlyph,type HomeIconName} from './HomeGlyph';
import './home-dashboard.css';

export type HomeFinancialData={
 summary:{month:string;income:number;expense:number;projectedResult:number;realizedResult:number;pendingCount:number;pendingAmount:number}|null;
 cashflow:{month:string;days:CashflowDay[]}|null;
 benefit:{month:string;balance:number;credits:number;used:number}|null;
 available:{date:string;available:number;scope:'monetary'}|null;
 transactions:Array<{id:string;date:string;description:string;status:string;type:string;amount:number;signedAmount:number;categoryId?:string|null;accountId?:string|null}>;
 payables:Array<{id:string;description:string;dueDate:string;status:string;openAmount:number;categoryId?:string|null}>;
 accounts:Array<{id:string;name:string;type?:string}>;
 categories:Array<{id:string;name:string}>;
 cards:Array<{id:string;name:string;statementAmount?:number;payableStatementAmount?:number}>;
};
type Action='novo'|'transferencia'|'pendentes'|'cartoes'|'lancamentos'|'beneficios'|'relatorios'|'metas';
type Props={previewData?:HomeFinancialData;onNavigate?:(target:Action)=>void;month?:string};
const currency=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const monthFmt=new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'});
function dateNow(){const v=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const get=(k:string)=>v.find(i=>i.type===k)?.value||'00';return get('year')+'-'+get('month')+'-'+get('day')}
const format=(n:number|null|undefined,hidden:boolean)=>hidden?'R$ •••••':n==null||!Number.isFinite(n)?'—':currency.format(n);
const dateString=(s:string)=>/^\d{4}-\d{2}-\d{2}/.test(s)?s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4):'—';
const emptyState:HomeFinancialData={summary:null,cashflow:null,benefit:null,available:null,transactions:[],payables:[],accounts:[],categories:[],cards:[]};
async function readHome(month:string):Promise<HomeFinancialData>{
 const [summary,cashflow,benefit,events,payables,cards,accounts,categories,available]=await Promise.all([
  authenticatedRequest<NonNullable<HomeFinancialData['summary']>>('/finance/summary?month='+month,{cache:'no-store'}),
  authenticatedRequest<NonNullable<HomeFinancialData['cashflow']>>('/finance/cashflow?month='+month,{cache:'no-store'}),
  authenticatedRequest<NonNullable<HomeFinancialData['benefit']>>('/finance/benefit-summary?month='+month,{cache:'no-store'}),
  authenticatedRequest<unknown>('/finance/events/month?month='+month,{cache:'no-store'}),
  authenticatedRequest<unknown>('/payables/open',{cache:'no-store'}),
  authenticatedRequest<unknown>('/cards?month='+month,{cache:'no-store'}),
  authenticatedRequest<unknown>('/finance/accounts',{cache:'no-store'}),
  authenticatedRequest<unknown>('/finance/categories',{cache:'no-store'}),
  // Rota nova, canônica; até ser implantada na API retorna ausente, nunca estimado.
  authenticatedRequest<HomeFinancialData['available']>('/finance/home-available?date='+dateNow(),{cache:'no-store'}).catch(()=>null)
 ]);
 const adapted=composeMegApiSnapshot([
  fromCanonicalReadModels({summary,cashflow,benefitSummary:benefit}),
  fromFinancialEvents(events),
  fromPayables(payables),
  fromCards(cards),
  fromFinanceCatalogs({accounts,categories})
 ]) as HomeFinancialData & {readModels?:unknown};
 return {
  summary,cashflow,benefit,available,
  transactions:adapted.transactions||[],
  payables:adapted.payables||[],
  accounts:adapted.accounts||[],
  categories:adapted.categories||[],
  cards:adapted.cards||[]
 };
}
function PanelTitle({icon,title,meta}:{icon:HomeIconName;title:string;meta?:string}){
 return <div className="pano-panel-title"><h2><HomeGlyph name={icon} size={19}/>{title}</h2>{meta&&<span>{meta}</span>}</div>;
}
function Money({value,hidden,className=''}:{value:number|null|undefined;hidden:boolean;className?:string}){
 return <span className={className}>{format(value,hidden)}</span>;
}
function HomeContent({data,month,preview,onNavigate}:{data:HomeFinancialData;month:string;preview:boolean;onNavigate?:Props['onNavigate']}){
 const [hidden,setHidden]=useState(false);
 const [notice,setNotice]=useState<string|null>(null);
 const move=(target:Action)=>{
  if(onNavigate)onNavigate(target);
  else setNotice('A navegação para esta função será ativada quando a tela correspondente for implementada.');
 };
 const categories=useMemo(()=>new Map(data.categories.map(c=>[c.id,c.name])),[data.categories]);
 const accounts=useMemo(()=>new Map(data.accounts.map(a=>[a.id,a.name])),[data.accounts]);
 const movements=useMemo<Record<string,unknown>[]>(()=>data.transactions
  .filter(t=>t.status!=='cancelled')
  .slice().sort((a,b)=>b.date.localeCompare(a.date))
  .slice(0,8).map(t=>({id:t.id,date:t.date,description:t.description,
   category:t.categoryId?categories.get(t.categoryId)||'Sem categoria':'Sem categoria',
   account:t.accountId?accounts.get(t.accountId)||'—':'—',
   value:t.amount,amount:t.signedAmount,status:t.status})),[data.transactions,categories,accounts]);
 const commitments=useMemo<Record<string,unknown>[]>(()=>{
  const planned=data.transactions.filter(t=>t.status==='planned'&&t.date>=dateNow()&&t.signedAmount<0)
   .map(t=>({id:'event:'+t.id,date:t.date,description:t.description,
    source:'Lançamento previsto',value:t.amount,status:'Previsto'}));
  const payables=data.payables.filter(p=>p.status!=='paid'&&p.status!=='cancelled'&&p.openAmount>0)
   .map(p=>({id:'payable:'+p.id,date:p.dueDate,description:p.description,
    source:'Conta a pagar',value:p.openAmount,status:p.status==='partial'?'Parcial':'A pagar'}));
  return [...planned,...payables].sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id)).slice(0,8);
 },[data.transactions,data.payables]);
 const movementColumns:DataGridColumn<Record<string,unknown>>[]=[
  {key:'date',label:'Data',type:'date',width:98,sortable:true,filterable:true},
  {key:'description',label:'Descrição',type:'text',width:165,sortable:true,filterable:true},
  {key:'category',label:'Categoria',type:'text',width:112,sortable:true,filterable:true},
  {key:'account',label:'Conta',type:'text',width:112,sortable:true,filterable:true},
  {key:'value',label:'Valor',type:'currency',width:114,sortable:true,filterable:true,
   render:(v,row)=><strong className={Number(row.amount)<0?'pano-negative':'pano-positive'}>{Number(row.amount)<0?'− ':'+ '}{format(Number(v),hidden)}</strong>}
 ];
 const dueColumns:DataGridColumn<Record<string,unknown>>[]=[
  {key:'date',label:'Vencimento',type:'date',width:106,sortable:true,filterable:true},
  {key:'description',label:'Descrição',type:'text',width:160,sortable:true,filterable:true},
  {key:'source',label:'Origem',type:'text',width:130,sortable:true,filterable:true},
  {key:'value',label:'Valor',type:'currency',width:112,sortable:true,filterable:true,render:v=><strong>{format(Number(v),hidden)}</strong>},
  {key:'status',label:'Situação',type:'text',width:94,sortable:true,filterable:true,
   render:v=><span className="pano-status">{String(v??'—')}</span>}
 ];
 const period=monthFmt.format(new Date(month+'-01T12:00:00Z')).replace(/^./,s=>s.toLocaleUpperCase('pt-BR'));
 const stats:{label:string;value:number|null|undefined;note:string;icon:HomeIconName;kind:string;action:Action}[]=[
  {label:'Receitas',value:data.summary?.income,note:'Total no período',icon:'income',kind:'income',action:'lancamentos'},
  {label:'Despesas',value:data.summary?.expense,note:'Total no período',icon:'expense',kind:'expense',action:'lancamentos'},
  {label:'Pendências previstas',value:data.summary?.pendingAmount,note:data.summary?.pendingCount==null?'Sem leitura disponível':String(data.summary.pendingCount)+' registros',icon:'clock',kind:'pending',action:'pendentes'},
  {label:'Cartões',value:null,note:String(data.cards.length)+' cadastrados · consultar faturas',icon:'card',kind:'cards',action:'cartoes'}
 ];
 const quick:{title:string;desc:string;icon:HomeIconName;action:Action;kind:string}[]=[
  {title:'Novo lançamento',desc:'Registrar movimentação',icon:'plus',action:'novo',kind:'mint'},
  {title:'Transferência',desc:'Entre suas contas',icon:'transfer',action:'transferencia',kind:'blue'},
  {title:'Pagar conta',desc:'Consultar compromissos',icon:'receipt',action:'pendentes',kind:'violet'},
  {title:'Relatórios',desc:'Análises financeiras',icon:'chart',action:'relatorios',kind:'amber'},
  {title:'Configurações',desc:'Preferências do MEG',icon:'settings',action:'metas',kind:'slate'}
 ];
 return <div className="pano-root">
  {preview&&<div className="pano-preview-banner" role="note">PRÉVIA VISUAL · Dados fictícios de demonstração · Sem acesso ao banco de produção</div>}
  {notice&&<div className="pano-notice" role="status"><HomeGlyph name="alert" size={18}/><span>{notice}</span><button type="button" onClick={()=>setNotice(null)} aria-label="Fechar aviso">×</button></div>}
  <section className="pano-hero" aria-label="Visão financeira">
   <div className="pano-hero-intro"><span className="pano-eyebrow">SEU PANORAMA FINANCEIRO</span><h1>O controle começa com uma boa visão.</h1><p>Veja o que importa e decida seu próximo passo.</p></div>
   <div className="pano-balance" aria-label="Saldo disponível monetário">
    <div className="pano-balance-top"><span><HomeGlyph name="wallet" size={19}/> Saldo disponível</span><button type="button" onClick={()=>setHidden(v=>!v)} aria-label={hidden?'Exibir valores':'Ocultar valores'} aria-pressed={hidden}><HomeGlyph name={hidden?'eyeOff':'eye'} size={18}/></button></div>
    <strong><Money hidden={hidden} value={data.available?.available}/></strong>
    <div className="pano-balance-bottom"><span>{data.available?'Saldo monetário em '+dateString(data.available.date):'Saldo atual indisponível até ativação da leitura canônica'}</span><button type="button" onClick={()=>move('lancamentos')}>Ver detalhes <HomeGlyph name="arrow" size={15}/></button></div>
   </div>
  </section>
  <section className="pano-finance-block" aria-label="Leitura gerencial do mês">
   <section className="pano-panel pano-flow">
    <PanelTitle icon="chart" title="Fluxo financeiro" meta={period}/>
    <div className="pano-flow-summary">
     <div><span><i className="pano-dot is-income"/> Entradas</span><Money value={data.summary?.income} hidden={hidden}/></div>
     <div><span><i className="pano-dot is-expense"/> Saídas</span><Money value={data.summary?.expense} hidden={hidden}/></div>
     <div><span><i className="pano-dot is-result"/> Resultado projetado</span><Money value={data.summary?.projectedResult} hidden={hidden}/></div>
    </div>
    <HomeChart days={data.cashflow?.days||[]} hidden={hidden}/>
    <p className="pano-flow-footnote">Comparação diária fornecida pela camada financeira do MEG. Linha: resultado líquido do dia.</p>
   </section>
   <div className="pano-stats">
    {stats.map(s=><button key={s.label} className={'pano-stat is-'+s.kind} type="button" onClick={()=>move(s.action)}>
     <span className="pano-stat-icon"><HomeGlyph name={s.icon} size={23}/></span>
     <span className="pano-stat-label">{s.label}</span>
     <strong>{s.value==null&&s.kind==='cards'?String(data.cards.length):format(s.value,hidden)}</strong>
     <small>{s.note}</small>
    </button>)}
   </div>
  </section>
  <div className="pano-mid">
   <section className="pano-panel pano-benefits">
    <PanelTitle icon="gift" title="Benefícios" meta="Saldo separado das contas monetárias"/>
    <div className="pano-benefit-card">
     <div className="pano-benefit-card-copy"><span className="pano-eyebrow">BENEFÍCIO</span><h3>Alimentação</h3><span>Saldo do benefício</span><strong><Money hidden={hidden} value={data.benefit?.balance}/></strong><button type="button" onClick={()=>move('beneficios')}>Acessar benefícios <HomeGlyph name="arrow" size={15}/></button></div>
     <div className="pano-benefit-visual" aria-hidden="true"/>
    </div>
    <div className="pano-benefit-details"><span>Créditos no mês <strong><Money value={data.benefit?.credits} hidden={hidden}/></strong></span><span>Utilizado no mês <strong><Money value={data.benefit?.used} hidden={hidden}/></strong></span></div>
   </section>
   <section className="pano-panel pano-actions">
    <PanelTitle icon="sparkle" title="Ações rápidas"/>
    <div className="pano-action-list">{quick.map(a=><button className={'pano-action is-'+a.kind} key={a.title} type="button" onClick={()=>move(a.action)}>
      <span className="pano-action-icon"><HomeGlyph name={a.icon} size={22}/></span><strong>{a.title}</strong><small>{a.desc}</small>
     </button>)}</div>
   </section>
  </div>
  <div className="pano-tables">
   <section className="pano-panel pano-grid"><div className="pano-grid-heading"><PanelTitle icon="layers" title="Últimas movimentações"/><button type="button" onClick={()=>move('lancamentos')}>Ver todas <HomeGlyph name="arrow" size={15}/></button></div><DataGrid data={movements} columns={movementColumns} pageSize={5} rowKey="id" persistenceKey="meg-panorama-06-movements" ariaLabel="Últimas movimentações"/></section>
   <section className="pano-panel pano-grid"><div className="pano-grid-heading"><PanelTitle icon="calendar" title="Próximos compromissos"/><button type="button" onClick={()=>move('pendentes')}>Ver todos <HomeGlyph name="arrow" size={15}/></button></div><DataGrid data={commitments} columns={dueColumns} pageSize={5} rowKey="id" persistenceKey="meg-panorama-06-due" ariaLabel="Próximos compromissos"/></section>
  </div>
 </div>;
}
export function HomeDashboard({previewData,onNavigate,month:providedMonth}:Props){
 const current=providedMonth&&/^\d{4}-(0[1-9]|1[0-2])$/.test(providedMonth)?providedMonth:dateNow().slice(0,7);
 const [data,setData]=useState<HomeFinancialData|null>(previewData||null);
 const [error,setError]=useState<string|null>(null);
 const [loading,setLoading]=useState(!previewData);
 const serial=useRef(0);
 const reload=useCallback(async()=>{
  if(previewData)return;
  const id=++serial.current;setLoading(true);setError(null);
  try{const result=await readHome(current);if(serial.current===id)setData(result)}
  catch{if(serial.current===id){setData(null);setError('Não foi possível consultar a API financeira. Nenhum saldo foi estimado.')}}
  finally{if(serial.current===id)setLoading(false)}
 },[current,previewData]);
 useEffect(()=>{if(previewData){setData(previewData);return}void reload();const onRefresh=()=>void reload();window.addEventListener('meg:data-invalidated',onRefresh);window.addEventListener('focus',onRefresh);return()=>{serial.current++;window.removeEventListener('meg:data-invalidated',onRefresh);window.removeEventListener('focus',onRefresh)}},[previewData,reload]);
 return <>{error&&<div className="pano-error" role="alert">{error}<button type="button" onClick={()=>void reload()}><HomeGlyph name="reload" size={16}/> Tentar novamente</button></div>}
 {loading&&!data?<div className="pano-loading" role="status">Consultando seus dados financeiros...</div>:<HomeContent data={data||emptyState} month={current} preview={Boolean(previewData)} onNavigate={onNavigate}/>}</>;
}
