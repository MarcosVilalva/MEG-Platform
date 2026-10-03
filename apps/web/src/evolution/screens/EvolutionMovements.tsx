import {useEffect,useMemo,useState} from 'react';
import {financeClient,type Account,type Category,type FinanceSummary,type FinancialEvent,type PaymentMethod} from '../../app/finance-client';
import {cardsClient} from '../../app/cards-client';
import {EvolutionFinancialIcon,type EvolutionFinancialIconName,resolveEvolutionFinancialIcon} from '../components/EvolutionFinancialIcon';
import '../styles/movements.css';

type MovementKind='all'|'income'|'expense'|'benefit';
type Props={month:string;qaMode?:boolean;onCreate:()=>void;refreshToken?:number};

const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2});
const dateFmt=new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'});
const normalize=(value:unknown)=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
const operationId=()=>globalThis.crypto?.randomUUID?.()||('evo-event-'+Date.now()+'-'+Math.random().toString(16).slice(2));
const fmtDate=(iso:string)=>dateFmt.format(new Date(String(iso).slice(0,10)+'T12:00:00'));
const monthStart=(month:string)=>month+'-01';
const monthEnd=(month:string)=>{const [y,m]=month.split('-').map(Number);return month+'-'+String(new Date(Date.UTC(y,m,0)).getUTCDate()).padStart(2,'0')};
const amountOf=(event:FinancialEvent)=>{const raw=Number(event.signedAmount??event.amount??0);if(event.type==='income')return Math.abs(raw);if(event.type==='expense')return-Math.abs(raw);return raw};
const isBenefitEvent=(event:FinancialEvent)=>/benef|verocard|alimenta|refeic/.test(normalize([event.account?.name,event.account?.type,event.paymentMethod?.name,event.paymentMethod?.type,event.sourceDetails?.paymentMethod].filter(Boolean).join(' ')));
const statusLabel=(status:string)=>{const key=normalize(status);if(key==='paid'||key==='reconciled'||key==='confirmed')return'Pago';if(key==='planned'||key==='draft')return'Pendente';if(key==='archived')return'Arquivado';return status||'—'};
const accountType=(account:Account|undefined|null)=>{if(!account)return'';const key=normalize(account.type+' '+account.name);if(/invest|aplic|cdb/.test(key))return'Investimentos';if(/benef|verocard/.test(key))return'Benefício';return'Contas gerais'};
const accountKind=(account:Account|undefined|null)=>{if(!account)return'';return /benef|verocard/.test(normalize(account.type+' '+account.name))?'Conta benefício':'Conta monetária'};
const categoryTone=(name:string)=>{const key=normalize(name);if(/receita/.test(key))return'green';if(/aliment|mercado/.test(key))return'amber';if(/casa|moradia/.test(key))return'gray';if(/transporte/.test(key))return'blue';if(/saude/.test(key))return'yellow';if(/compra/.test(key))return'purple';if(/entreten/.test(key))return'violet';if(/invest/.test(key))return'cyan';return'cyan'};

const qaAccounts:Account[]=[
 {id:'qa-main',name:'Conta Principal',type:'monetary',institution:'MEG Finanças',openingBalance:0,isActive:true},
 {id:'qa-invest',name:'Conta Investimento',type:'investment',institution:'MEG Finanças',openingBalance:0,isActive:true},
 {id:'qa-benefit',name:'Verocard Alimentação',type:'benefit',institution:'Verocard',openingBalance:0,isActive:true}
];
const qaCategories:Category[]=[
 {id:'qa-food',name:'Alimentação',group:'Alimentação',type:'expense',isActive:true},
 {id:'qa-home',name:'Casa',group:'Casa',type:'expense',isActive:true},
 {id:'qa-transport',name:'Transporte',group:'Transporte',type:'expense',isActive:true},
 {id:'qa-health',name:'Saúde',group:'Saúde',type:'expense',isActive:true},
 {id:'qa-buy',name:'Compras',group:'Compras',type:'expense',isActive:true},
 {id:'qa-fun',name:'Entretenimento',group:'Entretenimento',type:'expense',isActive:true},
 {id:'qa-income',name:'Receita',group:'Receita',type:'income',isActive:true},
 {id:'qa-investment',name:'Investimentos',group:'Investimentos',type:'income',isActive:true}
];
const qaMethods:PaymentMethod[]=[
 {id:'qa-pix',name:'PIX',type:'cash',isActive:true},
 {id:'qa-credit',name:'Cartão de crédito',type:'credit',isActive:true},
 {id:'qa-debit',name:'Débito automático',type:'debit',isActive:true}
];
const qaEvents:FinancialEvent[]=[
 {id:'e1',description:'Supermercado Extra',type:'expense',status:'paid',date:'2026-10-03',competence:'2026-10',amount:342.50,signedAmount:-342.50,accountId:'qa-main',categoryId:'qa-food',paymentMethodId:'qa-credit',account:qaAccounts[0],category:qaCategories[0],paymentMethod:qaMethods[1]},
 {id:'e2',description:'Salário',type:'income',status:'paid',date:'2026-10-02',competence:'2026-10',amount:4850,signedAmount:4850,accountId:'qa-main',categoryId:'qa-income',paymentMethodId:'qa-pix',account:qaAccounts[0],category:qaCategories[6],paymentMethod:qaMethods[0]},
 {id:'e3',description:'Netflix',type:'expense',status:'paid',date:'2026-10-01',competence:'2026-10',amount:55.90,signedAmount:-55.90,accountId:'qa-main',categoryId:'qa-fun',paymentMethodId:'qa-credit',account:qaAccounts[0],category:qaCategories[5],paymentMethod:qaMethods[1]},
 {id:'e4',description:'Posto Ipiranga',type:'expense',status:'paid',date:'2026-09-30',competence:'2026-10',amount:180,signedAmount:-180,accountId:'qa-main',categoryId:'qa-transport',paymentMethodId:'qa-credit',account:qaAccounts[0],category:qaCategories[2],paymentMethod:qaMethods[1]},
 {id:'e5',description:'Transferência Nubank',type:'expense',status:'paid',date:'2026-09-29',competence:'2026-10',amount:500,signedAmount:-500,accountId:'qa-main',categoryId:'qa-buy',paymentMethodId:'qa-pix',account:qaAccounts[0],category:qaCategories[4],paymentMethod:qaMethods[0]},
 {id:'e6',description:'Academia Smart Fit',type:'expense',status:'paid',date:'2026-09-28',competence:'2026-10',amount:99.90,signedAmount:-99.90,accountId:'qa-main',categoryId:'qa-health',paymentMethodId:'qa-credit',account:qaAccounts[0],category:qaCategories[3],paymentMethod:qaMethods[1]},
 {id:'e7',description:'Internet Vivo',type:'expense',status:'paid',date:'2026-09-27',competence:'2026-10',amount:129.90,signedAmount:-129.90,accountId:'qa-main',categoryId:'qa-home',paymentMethodId:'qa-debit',account:qaAccounts[0],category:qaCategories[1],paymentMethod:qaMethods[2]},
 {id:'e8',description:'Freelance Design',type:'income',status:'paid',date:'2026-09-26',competence:'2026-10',amount:1200,signedAmount:1200,accountId:'qa-main',categoryId:'qa-income',paymentMethodId:'qa-pix',account:qaAccounts[0],category:qaCategories[6],paymentMethod:qaMethods[0]},
 {id:'e9',description:'Energia Elétrica',type:'expense',status:'paid',date:'2026-09-25',competence:'2026-10',amount:214.85,signedAmount:-214.85,accountId:'qa-main',categoryId:'qa-home',paymentMethodId:'qa-debit',account:qaAccounts[0],category:qaCategories[1],paymentMethod:qaMethods[2]},
 {id:'e10',description:'Mercado Livre',type:'expense',status:'paid',date:'2026-09-24',competence:'2026-10',amount:299,signedAmount:-299,accountId:'qa-main',categoryId:'qa-buy',paymentMethodId:'qa-credit',account:qaAccounts[0],category:qaCategories[4],paymentMethod:qaMethods[1]},
 {id:'e11',description:'Restaurante Outback',type:'expense',status:'paid',date:'2026-09-22',competence:'2026-10',amount:198.70,signedAmount:-198.70,accountId:'qa-main',categoryId:'qa-food',paymentMethodId:'qa-credit',account:qaAccounts[0],category:qaCategories[0],paymentMethod:qaMethods[1]},
 {id:'e12',description:'Rendimento CDB',type:'income',status:'paid',date:'2026-09-20',competence:'2026-10',amount:356.12,signedAmount:356.12,accountId:'qa-invest',categoryId:'qa-investment',paymentMethodId:'qa-pix',account:qaAccounts[1],category:qaCategories[7],paymentMethod:qaMethods[0]}
];
const qaSummary:FinanceSummary={month:'2026-10',availableBalance:3049.15,income:9205.70,expense:6887.71,projectedResult:2317.99,realizedIncome:9205.70,realizedExpense:6887.71,realizedResult:2317.99,eventCount:22,pendingCount:5,pendingAmount:532.18,nextDue:null,topCategories:[]};

function EditEventModal({event,accounts,categories,methods,month,onClose,onSaved}:{event:FinancialEvent;accounts:Account[];categories:Category[];methods:PaymentMethod[];month:string;onClose:()=>void;onSaved:()=>void}){
 const [description,setDescription]=useState(event.description);
 const [date,setDate]=useState(String(event.date).slice(0,10));
 const [value,setValue]=useState(String(Math.abs(Number(event.amount||event.signedAmount||0))).replace('.',','));
 const [categoryId,setCategoryId]=useState(event.categoryId||event.category?.id||'');
 const [accountId,setAccountId]=useState(event.accountId||event.account?.id||'');
 const [methodId,setMethodId]=useState(event.paymentMethodId||event.paymentMethod?.id||'');
 const [status,setStatus]=useState<'paid'|'planned'>(event.status==='planned'?'planned':'paid');
 const [notes,setNotes]=useState(event.notes||'');
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const selectedCategory=categories.find(item=>item.id===categoryId);
 const selectedAccount=accounts.find(item=>item.id===accountId);
 const selectedMethod=methods.find(item=>item.id===methodId);
 const numeric=Math.abs(Number(value.replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''))||0);
 const payload=event.sourcePayload&&typeof event.sourcePayload==='object'?event.sourcePayload as Record<string,unknown>:null;
 const cardId=payload?.cardDomain===true?String(payload.cardId||''):'';
 const purchaseId=payload?.cardDomain===true?String(payload.purchaseId||''):'';

 async function save(){
  if(!description.trim()||!date||!numeric||busy)return;
  setBusy(true);setMessage('');
  try{
   if(cardId&&purchaseId){
    const cards=await cardsClient.list(month);
    const card=cards.find(item=>item.id===cardId);
    const purchase=card?.purchases.find(item=>item.id===purchaseId);
    await cardsClient.updatePurchase(purchaseId,{cardId,categoryId:categoryId||undefined,description:description.trim().toLocaleUpperCase('pt-BR'),totalAmount:numeric,purchaseDate:date,installments:purchase?.installments||1,operationId:operationId()});
   }else{
    await financeClient.updateEvent(event.id,{description:description.trim().toLocaleUpperCase('pt-BR'),date,amount:numeric,type:event.type==='income'?'income':'expense',status,categoryId:categoryId||undefined,accountId:accountId||undefined,paymentMethodId:methodId||undefined,notes:notes.trim().toLocaleUpperCase('pt-BR')||undefined});
   }
   onSaved();
  }catch(error){setMessage(error instanceof Error?error.message:'Não foi possível salvar as alterações.')}
  finally{setBusy(false)}
 }
 async function remove(){
  if(busy)return;
  setBusy(true);setMessage('');
  try{
   if(cardId&&purchaseId)await cardsClient.cancelPurchaseProtected(purchaseId,operationId());
   else await financeClient.archiveEvent(event.id);
   onSaved();
  }catch(error){setMessage(error instanceof Error?error.message:'Não foi possível excluir o lançamento.')}
  finally{setBusy(false)}
 }
 const icon=resolveEvolutionFinancialIcon({type:event.type,signedAmount:amountOf(event),categoryName:selectedCategory?.name,categoryGroup:selectedCategory?.group,description});
 return <div className="evo-edit-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onClose()}}>
  <section className="evo-edit-modal" role="dialog" aria-modal="true" aria-label="Editar lançamento">
   <header><button type="button" onClick={onClose}><EvolutionFinancialIcon name="chevron-left" size={24}/></button><div><h2>Editar lançamento</h2><span className={event.type==='income'?'income':'expense'}>{event.type==='income'?'Receita':'Despesa'}</span></div><button type="button" onClick={onClose}><EvolutionFinancialIcon name="x" size={23}/></button></header>
   <div className="body"><section className="form">
    <label><span>Descrição</span><input value={description} onChange={e=>setDescription(e.target.value)}/></label>
    <label><span>Categoria</span><select value={categoryId} onChange={e=>setCategoryId(e.target.value)}>{categories.filter(item=>!item.type||item.type===(event.type==='income'?'income':'expense')).map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
    <div className="grid2"><label><span><EvolutionFinancialIcon name="calendar" size={17}/>Data do lançamento</span><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label><span><EvolutionFinancialIcon name="banknote" size={17}/>Valor do lançamento</span><div className="money"><b>R$</b><input value={value} onChange={e=>setValue(e.target.value)}/></div></label></div>
    <div className="grid2"><label><span><EvolutionFinancialIcon name="card" size={17}/>Conta / Cartão</span><select value={accountId} onChange={e=>setAccountId(e.target.value)} disabled={Boolean(cardId)}>{accounts.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label><span><EvolutionFinancialIcon name="card" size={17}/>Forma de pagamento</span><select value={methodId} onChange={e=>setMethodId(e.target.value)} disabled={Boolean(cardId)}>{methods.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label></div>
    {!cardId&&<label><span><EvolutionFinancialIcon name="check" size={17}/>Status do lançamento</span><div className="status"><button type="button" className={status==='paid'?'active':''} onClick={()=>setStatus('paid')}><EvolutionFinancialIcon name="check-line" size={18}/>Pago</button><button type="button" className={status==='planned'?'active pending':''} onClick={()=>setStatus('planned')}><EvolutionFinancialIcon name="clock" size={18}/>Pendente</button></div></label>}
    <label className="notes"><span>Observações <small>(opcional)</small></span><textarea maxLength={300} value={notes} onChange={e=>setNotes(e.target.value)}/><em>{notes.length}/300</em></label>
   </section><aside className="summary"><h3>Resumo do lançamento</h3><article><span><EvolutionFinancialIcon name={icon} size={26}/></span><div><small>Total da {event.type==='income'?'receita':'despesa'}</small><strong className={event.type==='income'?'positive':'negative'}>{money.format(numeric)}</strong></div></article><dl><div><dt>Descrição</dt><dd>{description||'—'}</dd></div><div><dt>Categoria</dt><dd>{selectedCategory?.name||'—'}</dd></div><div><dt>Data do lançamento</dt><dd>{fmtDate(date)}</dd></div><div><dt>Conta / Cartão</dt><dd>{cardId?'Compra vinculada ao cartão':selectedAccount?.name||'—'}</dd></div><div><dt>Forma de pagamento</dt><dd>{cardId?'Cartão de crédito':selectedMethod?.name||'—'}</dd></div><div><dt>Status</dt><dd>{cardId?'Pago':status==='paid'?'Pago':'Pendente'}</dd></div></dl></aside></div>
   {message&&<div className="message">{message}</div>}
   <footer><button className="delete" type="button" disabled={busy} onClick={()=>void remove()}><EvolutionFinancialIcon name="trash" size={19}/>Excluir lançamento</button><button className="back" type="button" onClick={onClose}><EvolutionFinancialIcon name="chevron-left" size={19}/>Voltar</button><button className="save" type="button" disabled={busy||!numeric} onClick={()=>void save()}><EvolutionFinancialIcon name="check-line" size={20}/>{busy?'Salvando…':'Salvar alterações'}</button></footer>
  </section>
 </div>;
}

export function EvolutionMovements({month,qaMode=false,onCreate,refreshToken=0}:Props){
 const [events,setEvents]=useState<FinancialEvent[]>(qaMode?qaEvents:[]);
 const [summary,setSummary]=useState<FinanceSummary>(qaSummary);
 const [accounts,setAccounts]=useState<Account[]>(qaMode?qaAccounts:[]);
 const [categories,setCategories]=useState<Category[]>(qaMode?qaCategories:[]);
 const [methods,setMethods]=useState<PaymentMethod[]>(qaMode?qaMethods:[]);
 const [kind,setKind]=useState<MovementKind>('all');
 const [query,setQuery]=useState('');
 const [categoryId,setCategoryId]=useState('');
 const [accountId,setAccountId]=useState('');
 const [startDate,setStartDate]=useState(monthStart(month));
 const [endDate,setEndDate]=useState(monthEnd(month));
 const [selected,setSelected]=useState<FinancialEvent|null>(null);
 const [editOpen,setEditOpen]=useState(false);
 const [page,setPage]=useState(1);
 const [busy,setBusy]=useState(!qaMode);
 const [localRefresh,setLocalRefresh]=useState(0);

 useEffect(()=>{setStartDate(monthStart(month));setEndDate(monthEnd(month));setPage(1)},[month]);
 useEffect(()=>{
  if(qaMode){setEvents(qaEvents);setSummary(qaSummary);setBusy(false);return}
  let active=true;setBusy(true);
  void Promise.all([financeClient.listEventsForMonth(month),financeClient.getSummary(month),financeClient.listAccounts(),financeClient.listCategories(),financeClient.listPaymentMethods()])
   .then(([pageData,nextSummary,nextAccounts,nextCategories,nextMethods])=>{if(!active)return;setEvents(pageData.items);setSummary(nextSummary);setAccounts(nextAccounts.filter(i=>i.isActive));setCategories(nextCategories.filter(i=>i.isActive));setMethods(nextMethods.filter(i=>i.isActive))})
   .finally(()=>{if(active)setBusy(false)});
  return()=>{active=false};
 },[month,qaMode,refreshToken,localRefresh]);

 const needle=normalize(query.trim());
 const filtered=useMemo(()=>events.filter(event=>{
  const signed=amountOf(event),benefit=isBenefitEvent(event);
  if(kind==='income'&&signed<=0)return false;
  if(kind==='expense'&&(signed>=0||benefit))return false;
  if(kind==='benefit'&&!benefit)return false;
  if(categoryId&&String(event.categoryId||event.category?.id||'')!==categoryId)return false;
  if(accountId&&String(event.accountId||event.account?.id||'')!==accountId)return false;
  const day=String(event.date).slice(0,10);if(startDate&&day<startDate)return false;if(endDate&&day>endDate)return false;
  if(needle&&!normalize([event.description,event.category?.name,event.account?.name,event.paymentMethod?.name,event.sourceDetails?.group,event.sourceDetails?.paymentMethod].filter(Boolean).join(' ')).includes(needle))return false;
  return true;
 }).sort((a,b)=>String(b.date).localeCompare(String(a.date))),[events,kind,categoryId,accountId,startDate,endDate,needle]);

 const income=filtered.filter(e=>amountOf(e)>0&&!isBenefitEvent(e)).reduce((s,e)=>s+amountOf(e),0);
 const expense=filtered.filter(e=>amountOf(e)<0&&!isBenefitEvent(e)).reduce((s,e)=>s+Math.abs(amountOf(e)),0);
 const result=income-expense;
 const pageSize=12,totalPages=Math.max(1,Math.ceil(filtered.length/pageSize));
 const pageRows=filtered.slice((page-1)*pageSize,page*pageSize);
 useEffect(()=>{if(page>totalPages)setPage(totalPages)},[page,totalPages]);
 useEffect(()=>{if(!selected||!filtered.some(e=>e.id===selected.id))setSelected(filtered[0]||null)},[filtered,selected?.id]);

 const distribution=useMemo(()=>{
  const map=new Map<string,number>();
  filtered.filter(e=>amountOf(e)<0&&!isBenefitEvent(e)).forEach(e=>{const key=e.category?.name||e.category?.group||e.sourceDetails?.group||'Outros';map.set(key,(map.get(key)||0)+Math.abs(amountOf(e)))});
  return [...map.entries()].map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value).slice(0,6);
 },[filtered]);
 const distTotal=Math.max(1,distribution.reduce((s,i)=>s+i.value,0));
 const palette=['#f4b83f','#6b91b5','#579de2','#bb4acf','#f2ce43','#728997'];
 let acc=0;const donutStops=distribution.map((item,index)=>{const start=acc;acc+=item.value/distTotal*100;return palette[index%palette.length]+' '+start.toFixed(1)+'% '+acc.toFixed(1)+'%'});const donut='conic-gradient('+donutStops.join(',')+')';

 return <section className="evo-movements approved" data-evolution-screen="movements">
  <header className="evo-movements-hero"><div><h1>Lançamentos</h1><p>Visualize, filtre e gerencie todas as suas movimentações financeiras.</p></div><button type="button" onClick={onCreate}><EvolutionFinancialIcon name="plus" size={20}/>Novo lançamento</button></header>
  <section className="evo-movement-kpis-approved">
   <article><span><EvolutionFinancialIcon name="wallet" size={24}/></span><div><small>Total no período</small><strong>{money.format(result)}</strong><p className={result>=0?'positive':'negative'}>{result>=0?'↗':'↘'} {Math.abs(Number(summary.realizedResult||0)/Math.max(1,Number(summary.realizedIncome||1))*100).toFixed(1).replace('.',',')}%</p></div></article>
   <article className="income"><span><EvolutionFinancialIcon name="down" size={24}/></span><div><small>Entradas</small><strong>{money.format(income)}</strong><p>{filtered.filter(e=>amountOf(e)>0).length} lançamentos</p></div></article>
   <article className="expense"><span><EvolutionFinancialIcon name="up" size={24}/></span><div><small>Saídas</small><strong>{money.format(expense)}</strong><p>{filtered.filter(e=>amountOf(e)<0).length} lançamentos</p></div></article>
   <article className="result"><span><EvolutionFinancialIcon name="repeat" size={24}/></span><div><small>Saldo do período</small><strong>{money.format(result)}</strong></div></article>
  </section>
  <section className="evo-movement-toolbar-approved">
   <label className="search"><EvolutionFinancialIcon name="search" size={18}/><input value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}} placeholder="Buscar lançamentos..."/></label>
   <select value={kind} onChange={e=>{setKind(e.target.value as MovementKind);setPage(1)}}><option value="all">Todos os tipos</option><option value="income">Receitas</option><option value="expense">Despesas</option><option value="benefit">Benefício</option></select>
   <select value={categoryId} onChange={e=>{setCategoryId(e.target.value);setPage(1)}}><option value="">Todas as categorias</option>{categories.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select>
   <select value={accountId} onChange={e=>{setAccountId(e.target.value);setPage(1)}}><option value="">Todas as contas</option>{accounts.map(a=><option value={a.id} key={a.id}>{a.name}</option>)}</select>
   <div className="range"><EvolutionFinancialIcon name="calendar" size={17}/><input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}/><span>–</span><input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}/></div>
  </section>
  <div className="evo-movement-layout-approved">
   <section className="evo-movement-table-approved">
    <div className="table head"><span/> <span>Data</span><span>Descrição</span><span>Categoria</span><span>Conta / Cartão</span><span>Forma de pagamento</span><span>Valor</span><span/></div>
    <div className="rows" data-meg-scroll-region="true">
     {pageRows.map(event=>{const signed=amountOf(event),category=event.category?.name||event.category?.group||event.sourceDetails?.group||'—';const icon=resolveEvolutionFinancialIcon({type:event.type,signedAmount:signed,categoryName:event.category?.name,categoryGroup:event.category?.group,description:event.description,paymentName:event.paymentMethod?.name});return <button type="button" className={'table row '+(selected?.id===event.id?'selected':'')} key={event.id} onClick={()=>setSelected(event)}><input type="checkbox" onClick={e=>e.stopPropagation()}/><time>{fmtDate(event.date)}</time><span className="description"><EvolutionFinancialIcon name={icon} size={18}/><b>{event.description}</b></span><em className={categoryTone(category)}>{category}</em><span>{event.account?.name||'—'}</span><span className="method"><EvolutionFinancialIcon name={/pix/.test(normalize(event.paymentMethod?.name))?'arrows-right-left':/cartao|credito/.test(normalize(event.paymentMethod?.name))?'card':'wallet'} size={16}/>{event.paymentMethod?.name||event.sourceDetails?.paymentMethod||'—'}</span><strong className={signed>=0?'positive':'negative'}>{signed>=0?'+ ':'- '}{money.format(Math.abs(signed))}</strong><b className="more">⋯</b></button>})}
     {!pageRows.length&&!busy&&<div className="empty">Nenhum lançamento encontrado com esses filtros.</div>}
    </div>
    <footer><span>{filtered.length?((page-1)*pageSize+1):0}–{Math.min(page*pageSize,filtered.length)} de {filtered.length} lançamentos</span><div><button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>‹</button>{Array.from({length:Math.min(4,totalPages)},(_,i)=>i+1).map(n=><button className={page===n?'active':''} onClick={()=>setPage(n)} key={n}>{n}</button>)}<button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>›</button></div><span>Mostrar <b>{pageSize}⌄</b> por página</span></footer>
   </section>
   <aside className="evo-movement-side-approved">
    <section className="distribution"><header><div><EvolutionFinancialIcon name="chart" size={21}/><h2>Distribuição no período</h2></div><button>Ver detalhes</button></header><div className="donut-wrap"><div className="donut" style={{background:donut}}><span><strong>{money.format(expense)}</strong><small>Saídas</small></span></div><div className="legend">{distribution.map((item,index)=><div key={item.name}><i style={{background:palette[index%palette.length]}}/><span>{item.name}</span><em>{(item.value/distTotal*100).toFixed(0)}%</em><b>{money.format(item.value)}</b></div>)}</div></div></section>
    <section className="selected-detail"><header><div><EvolutionFinancialIcon name="receipt" size={21}/><h2>Lançamento selecionado</h2></div>{selected&&<button className="edit" onClick={()=>setEditOpen(true)}><EvolutionFinancialIcon name="note" size={17}/>Editar</button>}</header>{selected?<><article><span><EvolutionFinancialIcon name={resolveEvolutionFinancialIcon({type:selected.type,signedAmount:amountOf(selected),categoryName:selected.category?.name,description:selected.description})} size={25}/></span><div><strong>{selected.description}</strong><em className={categoryTone(selected.category?.name||'')}>{selected.category?.name||selected.category?.group||'—'}</em></div><b className={amountOf(selected)>=0?'positive':'negative'}>{amountOf(selected)>=0?'+ ':'- '}{money.format(Math.abs(amountOf(selected)))}</b><small>{fmtDate(selected.date)}</small></article><dl><div><dt><EvolutionFinancialIcon name="card" size={16}/>Conta / Cartão</dt><dd>{selected.account?.name||'—'}</dd></div><div><dt><EvolutionFinancialIcon name="arrows-right-left" size={16}/>Forma de pagamento</dt><dd>{selected.paymentMethod?.name||selected.sourceDetails?.paymentMethod||'—'}</dd></div><div><dt><EvolutionFinancialIcon name="tag" size={16}/>Categoria</dt><dd>{selected.category?.name||selected.category?.group||'—'}</dd></div><div><dt><EvolutionFinancialIcon name="check" size={16}/>Status</dt><dd>{statusLabel(selected.status)}</dd></div><div><dt><EvolutionFinancialIcon name="note" size={16}/>Descrição</dt><dd>{selected.notes||'Sem observações'}</dd></div><div><dt><EvolutionFinancialIcon name="landmark" size={16}/>Classificação</dt><dd>{accountType(selected.account)}</dd></div><div><dt><EvolutionFinancialIcon name="wallet" size={16}/>Tipo de conta</dt><dd>{accountKind(selected.account)}</dd></div></dl></>:<p className="empty">Selecione um lançamento na tabela.</p>}</section>
   </aside>
  </div>
  {editOpen&&selected&&<EditEventModal event={selected} accounts={accounts} categories={categories} methods={methods} month={month} onClose={()=>setEditOpen(false)} onSaved={()=>{setEditOpen(false);setLocalRefresh(v=>v+1)}}/>}
 </section>;
}
