import { useMemo, useState } from 'react';
import type { PhoenixReadModel } from './contracts';
import './phoenix-mobile-reference.css';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const date = new Intl.DateTimeFormat('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', timeZone:'UTC' });

function compactMonth(month:string){ const [y,m]=month.split('-').map(Number); const x=new Intl.DateTimeFormat('pt-BR',{month:'short',timeZone:'UTC'}).format(new Date(Date.UTC(y,m-1,1))).replace('.',''); return x[0].toUpperCase()+x.slice(1)+'/'+y; }
function today(){ return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()); }
function openStatus(status:unknown){ return !['paid','cancelled','reconciled','confirmed'].includes(String(status||'').toLowerCase()); }
function cardName(card:any){ const n=String(card?.name||'Cartão'); const s=n.toLowerCase(); if(s.includes('mercado')) return 'Mercado Pago Visa'; if(s.includes('latam')) return 'LATAM PASS Itaú Mastercard'; if(s.includes('azul')) return 'Azul Visa'; if(s.includes('riachuelo')) return 'Riachuelo Midway'; return n; }
function cardArt(card:any){ const s=String(card?.name||'').toLowerCase(); const base=(import.meta.env.BASE_URL||'/').replace(/\/?$/,'/'); if(s.includes('mercado')) return base+'assets/cards/approved-v6/mercado.webp'; if(s.includes('latam')) return base+'assets/cards/approved-v6/latam.webp'; if(s.includes('azul')) return base+'assets/cards/approved-v6/azul.webp'; if(s.includes('riachuelo')) return base+'assets/cards/approved-v6/riachuelo.webp'; return ''; }
function cardRows(card:any){ if(!card) return []; if(card.statement?.lines?.length) return card.statement.lines.map((x:any)=>({id:x.id,description:x.description,date:x.purchaseDate||x.dueDate,amount:Number(x.effect||0),status:x.isOpen?'open':x.sourceStatus})); return (card.purchases||[]).flatMap((p:any)=>(p.entries||[]).filter((e:any)=>e.statementMonth===card.statement?.month||!card.statement?.month).map((e:any)=>({id:e.id,description:p.description,date:p.purchaseDate,amount:Number(e.amount||0),status:e.status}))); }
function Header({title,month,onPeriod,onMenu,filter=false}:{title?:string;month:string;onPeriod:()=>void;onMenu:()=>void;filter?:boolean}){ const base=(import.meta.env.BASE_URL||'/').replace(/\/?$/,'/'); return <header className="meg-r-head"><img className="meg-r-logo" src={base+'brand/meg-finance-system-mark.svg'} alt="MEG"/>{title?<strong className="meg-r-title">{title}</strong>:<span/>}<button className="meg-r-period" onClick={onPeriod}>▣ <b>{compactMonth(month)}</b></button><button className="meg-r-menu" onClick={onMenu} aria-label={filter?'Filtros':'Menu'}>{filter?'☷':'☰'}</button></header>; }

export function PhoenixReferenceHome({data,onNavigate,onOpenPeriod,onOpenMenu}:{data:PhoenixReadModel;onNavigate:(v:any)=>void;onOpenPeriod:()=>void;onOpenMenu:()=>void}){
 const open=data.payables.filter((p:any)=>openStatus(p.status)&&Number(p.openAmount||0)>0);
 const paid=data.events.items.filter((e:any)=>e.type==='expense'&&['paid','reconciled','confirmed'].includes(String(e.status)));
 const balance=Number(data.summary.availableBalance||0)+Number(data.summary.realizedResult||0);
 const cards=data.cards||[]; const primary=cards[0]; const rows=cardRows(primary); const invoice=primary?.statement?Number(primary.statement.payableAmount??primary.statement.netAmount??0):rows.filter((r:any)=>openStatus(r.status)).reduce((a:number,r:any)=>a+Math.abs(r.amount),0);
 const dueToday=data.events.items.filter((e:any)=>e.type==='expense'&&e.status==='planned'&&String(e.date).slice(0,10)===today()).slice(0,2);
 return <div className="meg-r-screen meg-r-home" data-reference-screen="home">
  <Header month={data.month} onPeriod={onOpenPeriod} onMenu={onOpenMenu}/>
  <div className="meg-r-hello"><span>Olá, {data.user.name.split(/\s+/)[0]}</span><strong>Seu resumo financeiro</strong></div>
  <section className="meg-r-balance"><div><span>Saldo atual</span><strong>{money.format(balance)}</strong><small>Atualizado agora</small></div><button onClick={()=>onNavigate('movements')}><span>Benefício Alimentação</span><b>{money.format(Number(data.summary.benefitBalance||0))}</b></button></section>
  <section className="meg-r-flow"><article><span>Receitas</span><b>{money.format(Number(data.summary.realizedIncome||0))}</b></article><article><span>Despesas</span><b>{money.format(Number(data.summary.realizedExpense||0))}</b></article><article><span>Resultado</span><b>{money.format(Number(data.summary.realizedResult||0))}</b></article></section>
  <section className="meg-r-panel"><header><b>Contas do mês</b><button onClick={()=>onNavigate('payables')}>Ver todas</button></header><div className="meg-r-bills"><span><b>{open.length+paid.length}</b><small>Total</small></span><span><b>{paid.length}</b><small>Pagas</small></span><span><b>{open.length}</b><small>Pendentes</small></span><span><b>{money.format(open.reduce((a,p:any)=>a+Number(p.openAmount||0),0))}</b><small>Em aberto</small></span></div></section>
  <section className="meg-r-panel"><header><b>Meus cartões</b><button onClick={()=>onNavigate('cards')}>Ver todos</button></header>{primary?<button className="meg-r-card" onClick={()=>onNavigate('cards')} style={cardArt(primary)?{backgroundImage:`url("${cardArt(primary)}")`}:undefined}><span>{cardName(primary)}</span><b>{money.format(invoice)}</b><small>Fatura atual</small></button>:<div className="meg-r-empty">Nenhum cartão cadastrado.</div>}</section>
  <section className="meg-r-panel meg-r-today"><header><b>Pendentes de hoje</b><button onClick={()=>onNavigate('payables')}>Ver pendentes</button></header>{dueToday.length?dueToday.map((e:any)=><button key={e.id} onClick={()=>onNavigate('payables')}><span><b>{e.description}</b><small>Vence hoje</small></span><strong>{money.format(Math.abs(Number(e.signedAmount||e.amount||0)))}</strong></button>):<div className="meg-r-empty">Nenhuma pendência para hoje.</div>}</section>
 </div>;
}

export function PhoenixReferenceCards({data,onOpenPeriod,onOpenMenu}:{data:PhoenixReadModel;onOpenPeriod:()=>void;onOpenMenu:()=>void}){
 const [id,setId]=useState(data.cards[0]?.id||''); const card=data.cards.find((c:any)=>c.id===id)||data.cards[0]; const rows=useMemo(()=>cardRows(card),[card]);
 const current=card?.statement?Number(card.statement.payableAmount??card.statement.netAmount??0):rows.filter((r:any)=>openStatus(r.status)).reduce((a:number,r:any)=>a+Math.abs(r.amount),0);
 const limit=Number(card?.creditLimit||0); const available=Math.max(0,limit-current); const due=card?.statement?.dueDate?date.format(new Date(card.statement.dueDate+'T12:00:00Z')):(card?.dueDay?`Dia ${card.dueDay}`:'—');
 return <div className="meg-r-screen meg-r-cards" data-reference-screen="cards"><Header title="Cartões" month={data.month} onPeriod={onOpenPeriod} onMenu={onOpenMenu}/>
  <div className="meg-r-page-title"><strong>Cartões</strong><span>Seus principais meios de pagamento</span></div>
  <div className="meg-r-carousel">{data.cards.map((c:any)=><button key={c.id} className={c.id===card?.id?'active':''} onClick={()=>setId(c.id)} style={cardArt(c)?{backgroundImage:`url("${cardArt(c)}")`}:undefined}><span>{cardName(c)}</span></button>)}</div>
  <section className="meg-r-card-metrics"><article><span>Limite total</span><b>{money.format(limit)}</b></article><article><span>Disponível</span><b>{money.format(available)}</b></article><article><span>Fatura atual</span><b>{money.format(current)}</b></article><article><span>Vencimento</span><b>{due}</b></article></section>
  <section className="meg-r-panel meg-r-invoice"><header><span><b>Lançamentos da fatura</b><small>{card?cardName(card):'Cartão'}</small></span></header>{rows.slice(0,6).map((r:any)=><div className="meg-r-invoice-row" key={r.id}><span><b>{r.description}</b><small>{String(r.date||'').slice(0,10).split('-').reverse().join('/')}</small></span><strong>{money.format(Math.abs(r.amount))}</strong></div>)}{!rows.length?<div className="meg-r-empty">Nenhum lançamento nesta fatura.</div>:null}</section>
  <button className="meg-r-primary">Abrir central do cartão</button>
 </div>;
}

export function PhoenixReferencePayables({data,onOpenPeriod,onOpenMenu,onEditEvent}:{data:PhoenixReadModel;onOpenPeriod:()=>void;onOpenMenu:()=>void;onEditEvent:(id:string)=>void}){
 const [tab,setTab]=useState<'all'|'open'|'paid'|'overdue'>('all'); const [search,setSearch]=useState(''); const t=today();
 const openPay=data.payables.filter((p:any)=>openStatus(p.status)&&Number(p.openAmount||0)>0).map((p:any)=>({id:'p-'+p.id,source:'payable',sourceId:p.id,description:p.description,due:String(p.dueDate).slice(0,10),amount:Number(p.openAmount||0),paid:false}));
 const openEv=data.events.items.filter((e:any)=>e.type==='expense'&&e.status==='planned').map((e:any)=>({id:'e-'+e.id,source:'event',sourceId:e.id,description:e.description,due:String(e.date).slice(0,10),amount:Math.abs(Number(e.signedAmount||e.amount||0)),paid:false}));
 const paid=data.events.items.filter((e:any)=>e.type==='expense'&&['paid','reconciled','confirmed'].includes(String(e.status))).map((e:any)=>({id:'e-'+e.id,source:'event',sourceId:e.id,description:e.description,due:String(e.date).slice(0,10),amount:Math.abs(Number(e.signedAmount||e.amount||0)),paid:true}));
 const all=[...openPay,...openEv,...paid].filter((x:any)=>x.description.toLowerCase().includes(search.toLowerCase())).filter((x:any)=>tab==='all'||tab==='open'?!x.paid:tab==='paid'?x.paid:!x.paid&&x.due<t).sort((a:any,b:any)=>a.due.localeCompare(b.due));
 const opens=[...openPay,...openEv]; const overdue=opens.filter((x:any)=>x.due<t); const total=opens.reduce((a:number,x:any)=>a+x.amount,0);
 return <div className="meg-r-screen meg-r-payables" data-reference-screen="payables"><Header title="Pendentes" month={data.month} onPeriod={onOpenPeriod} onMenu={onOpenMenu} filter/>
  <div className="meg-r-tabs"><button className={tab==='all'?'active':''} onClick={()=>setTab('all')}>Todas</button><button className={tab==='open'?'active':''} onClick={()=>setTab('open')}>A pagar <b>{opens.length}</b></button><button className={tab==='paid'?'active':''} onClick={()=>setTab('paid')}>Pagas</button><button className={tab==='overdue'?'active':''} onClick={()=>setTab('overdue')}>Vencidas <b>{overdue.length}</b></button></div>
  <section className="meg-r-pending-metrics"><article><span>Total</span><b>{money.format(total)}</b></article><article><span>A pagar</span><b>{money.format(total)}</b></article><article><span>Vencidas</span><b>{money.format(overdue.reduce((a:number,x:any)=>a+x.amount,0))}</b></article></section>
  <div className="meg-r-search"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar pendentes..."/><button>☷</button></div>
  <section className="meg-r-pending-list">{all.slice(0,20).map((x:any)=><button key={x.id} onClick={()=>x.source==='event'&&onEditEvent(x.sourceId)}><span className="meg-r-due-icon">▣</span><span><b>{x.description}</b><small>{x.paid?'Paga':x.due<t?'Vencida':x.due===t?'Vence hoje':`Vence ${x.due.split('-').reverse().join('/')}`}</small></span><strong>{money.format(x.amount)}</strong><em className={x.paid?'paid':x.due<t?'late':''}>{x.paid?'Paga':'A pagar'}</em></button>)}{!all.length?<div className="meg-r-empty">Nenhum lançamento neste filtro.</div>:null}</section>
 </div>;
}
