import {financeClient,type Account,type FinancialEvent,type FinancialEventPage,type FinancialAuditPage,type FinanceSummary,type FinancialAnalytics,type BenefitSummary,type FinancialCashflow,type Category,type PaymentMethod} from '../../app/finance-client';
import {cardsClient,type CreditCard} from '../../app/cards-client';
import {payablesClient,type Payable} from '../../app/payables-client';

export const normalize=(value:unknown)=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
export const money=(value:unknown)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(value||0));
export const today=()=>{const p=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());return ['year','month','day'].map(k=>p.find(x=>x.type===k)?.value).join('-')};
export const datePt=(value:string)=>/^\d{4}-\d{2}-\d{2}/.test(value)?value.slice(0,10).split('-').reverse().join('/'):value;
export const monthPt=(value:string)=>new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(new Date(value+'-02T12:00:00'));
export const posted=(status:string)=>['paid','confirmed','reconciled'].includes(status);
export const isBenefit=(event:FinancialEvent)=>normalize(event.account?.type)==='benefit'||normalize(event.paymentMethod?.name)==='verocard'||normalize(event.description).includes('verocard');
export const isBenefitAccount=(a:Account)=>normalize(a.type)==='benefit';
export const isMonetary=(a:Account)=>a.isActive&&['checking','savings','cash'].includes(normalize(a.type));
export const isSettlementMethod=(p:PaymentMethod)=>p.isActive&&/(^|\s)(pix|boleto|dinheiro|especie|cash|bill|ted|doc)(\s|$)|transferencia|transfer|bank transfer/.test(normalize(p.name+' '+(p.type||'')))&&!/benef|verocard|credito|credit/.test(normalize(p.name+' '+p.type));
export const signed=(e:FinancialEvent)=>Number(e.signedAmount??(e.type==='expense'?-Number(e.amount):Number(e.amount)));
export const cents=(v:unknown)=>Math.round(Number(v||0)*100);
export const sum=(items:number[])=>items.reduce((total,v)=>total+cents(v),0)/100;
export const amountInput=(s:string)=>new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(s.replace(/\D/g,'')||0)/100);
export const amountValue=(s:string)=>Number(s.replace(/\./g,'').replace(',','.'));
export const operationId=()=>crypto.randomUUID();
export function errorMessage(e:unknown){const x=e as {message?:string;missing?:number;details?:{missing?:number}};const missing=x.missing??x.details?.missing;if(/INSUFFICIENT/.test(x.message||''))return 'Saldo insuficiente.'+(missing!==undefined?' Faltam '+money(missing)+'.':' Escolha uma conta com saldo suficiente.');if(x.message==='POSSIBLE_DUPLICATE')return 'Possível duplicidade. Confira o histórico antes de tentar novamente.';if(x.message==='FINANCIAL_EVENT_STALE_VERSION')return 'Este lançamento mudou. Atualize os dados antes de editar.';return x.message||'Não foi possível concluir. Seus dados não foram confirmados.';}
export type SystemData={summary:FinanceSummary;analytics:FinancialAnalytics;benefit:BenefitSummary;cashflow:FinancialCashflow;events:FinancialEvent[];accounts:Account[];categories:Category[];methods:PaymentMethod[];allMethods:PaymentMethod[];cards:CreditCard[];managedCards:CreditCard[];payables:Payable[];audit:FinancialAuditPage};
export async function loadSystem(month:string):Promise<SystemData>{
  const [summary,analytics,benefit,cashflow,events,accounts,categories,methods,cards,managedCards,payables,audit]=await Promise.all([
    financeClient.getSummary(month),financeClient.getAnalytics(month),financeClient.getBenefitSummary(month),financeClient.getCashflow(month),financeClient.listEventsForMonth(month),financeClient.listAccounts(),financeClient.listCategories(),financeClient.listPaymentMethods(),cardsClient.list(month),cardsClient.listManagement(month).catch(()=>[]),payablesClient.list(month),financeClient.listAudit(1,250).catch(()=>({items:[],total:0,page:1,pageSize:250}))
  ]);
  return {summary,analytics,benefit,cashflow,events:events.items.filter(e=>e.status!=='archived'),accounts:accounts.filter(x=>x.isActive),categories:categories.filter(x=>x.isActive),methods:methods.filter(x=>x.isActive),allMethods:methods,cards:cards.filter(x=>x.isActive!==false),managedCards:managedCards.length?managedCards:cards,payables:payables.filter(x=>x.status!=='cancelled'),audit};
}
export type PendingItem={key:string;source:'event'|'payable'|'card';sourceId:string;statementMonth?:string;date:string;description:string;category:string;amount:number;paid:boolean;benefit:boolean};
export function pendingItems(data:SystemData,month:string):PendingItem[]{
  const cardEventIds=new Set(data.cards.flatMap(c=>(c.statement?.lines||[]).flatMap(line=>line.eventId?[line.eventId]:[])));
  const payableEventIds=new Set(data.payables.flatMap(p=>p.payments.flatMap(x=>{const id=(x as typeof x & {financialEventId?:string}).financialEventId;return id?[id]:[]})));
  const events=data.events.filter(e=>e.type==='expense'&&(e.status==='planned'||posted(e.status))&&!isBenefit(e)&&!cardEventIds.has(e.id)&&!e.sourcePayload?.cardId); // Vínculos canônicos excluem parcelas e pagamentos já representados.
  return [
    ...events.filter(e=>!payableEventIds.has(e.id)).map(e=>({key:'event:'+e.id,source:'event' as const,sourceId:e.id,date:e.date.slice(0,10),description:e.description,category:e.category?.name||'Outras pendências',amount:-signed(e),paid:posted(e.status),benefit:false})),
    ...data.payables.map(p=>({key:'payable:'+p.id,source:'payable' as const,sourceId:p.id,date:p.dueDate.slice(0,10),description:p.description,category:p.category?.name||'Contas a pagar',amount:Number(p.openAmount)>0?Number(p.openAmount):Number(p.totalAmount),paid:Number(p.openAmount)<=0,benefit:false})),
    ...data.cards.filter(c=>Number(c.statement?.payableAmount??c.payableStatementAmount??Math.max(0,c.statementAmount))>0).map(c=>({key:'card:'+c.id,source:'card' as const,sourceId:c.id,statementMonth:month,date:c.statement?.dueDate||month+'-'+String(Math.max(1,Math.min(28,c.dueDay))).padStart(2,'0'),description:'Fatura '+c.name,category:'Cartão de crédito',amount:Number(c.statement?.payableAmount??c.payableStatementAmount??Math.max(0,c.statementAmount)),paid:false,benefit:false}))
  ].sort((a,b)=>a.date.localeCompare(b.date)||a.key.localeCompare(b.key));
}
export function demoData(month:string):SystemData{
  const accounts:Account[]=[{id:'demo-main',name:'Conta Monetária Principal',type:'CHECKING',openingBalance:0,isActive:true},{id:'demo-bank',name:'Banco do Brasil',type:'CHECKING',openingBalance:0,isActive:true},{id:'demo-benefit',name:'Verocard Alimentação',type:'BENEFIT',openingBalance:0,isActive:true},{id:'demo-invest',name:'Investimentos',type:'INVESTMENT',openingBalance:0,isActive:true}];
  const categories:Category[]=['Salário','Supermercado','Comunicação','Moradia','Transporte','Saúde','Bebidas','Fast Food','Presentes'].map((name,i)=>({id:'demo-cat-'+i,name,type:i===0?'income':'expense',isActive:true}));
  const methods:PaymentMethod[]=[{id:'demo-pix',name:'Pix',type:'PIX',isActive:true},{id:'demo-bill',name:'Boleto',type:'BILL',isActive:true},{id:'demo-debit',name:'Débito',type:'DEBIT',isActive:true},{id:'demo-benefit',name:'VEROCARD',type:'BENEFIT',isActive:true}];
  const events:FinancialEvent[]=Array.from({length:18},(_,i)=>{const income=i%6===0,benefit=i%7===1;return {id:'demo-event-'+i,description:income?(benefit?'RECARGA VEROCARD':'Salário'):['Supermercado Extra','Internet Vivo','Energia elétrica','Posto Ipiranga','Farmácia','Restaurante'][i%6],type:income?'income':'expense',status:i%4===3?'planned':'paid',date:month+'-'+String(1+i).padStart(2,'0'),competence:month,amount:income?4850:99.9+i*18.25,signedAmount:income?4850:-(99.9+i*18.25),accountId:accounts[benefit?2:0].id,account:accounts[benefit?2:0],category:categories[income?0:(i%5+1)],categoryId:categories[income?0:(i%5+1)].id,paymentMethod:methods[benefit?3:0],paymentMethodId:methods[benefit?3:0].id}});
  const cards:CreditCard[]=['LATAM Pass','Mercado Pago','Riachuelo'].map((name,i)=>({id:'demo-card-'+i,name,lastFour:['5934','4021','8827'][i],brand:i===1?'Visa':'Mastercard',isActive:true,creditLimit:10000,usedLimit:3200,availableLimit:6800,statementAmount:[864.32,532.18,418.9][i],closingDay:2,dueDay:10+i,purchases:[]}));
  const summary:FinanceSummary={month,availableBalance:3049.15,income:9205.7,expense:6887.71,projectedResult:2317.99,realizedIncome:9205.7,realizedExpense:6887.71,realizedResult:2317.99,eventCount:events.length,pendingCount:4,pendingAmount:1245.8,topCategories:categories.slice(1,6).map((c,i)=>({name:c.name,amount:900-i*120}))};
  const analytics:FinancialAnalytics={month,summary,previous:{month,income:0,expense:0,result:0},delta:{income:12.4,expense:0,result:12.4},dailyAverageExpense:222,concentrationTop3:60,categories:summary.topCategories,monthlyTrend:[{month,income:summary.income,expense:summary.expense,result:summary.realizedResult}],paymentMethods:[{name:'Pix',amount:2200},{name:'Boleto',amount:1100}]};
  const audit:FinancialAuditPage={items:events.slice(0,8).map((event,index)=>({id:'demo-audit-'+index,at:event.date+'T12:00:00.000Z',actor:{id:'demo-user',name:'Usuário MEG',email:'preview@meg.local'},entity:'FinancialEvent',entityId:event.id,action:index%3===0?'FINANCIAL_EVENT_CREATED':index%3===1?'FINANCIAL_EVENT_UPDATED':'FINANCIAL_EVENT_SETTLED',schemaVersion:1,before:null,after:{description:event.description},context:{}})),total:Math.min(8,events.length),page:1,pageSize:250};
  return {accounts,categories,methods,allMethods:methods,events,cards,managedCards:cards,payables:[],audit,summary,analytics,benefit:{month,balance:1436.52,credits:2440,used:1003.48},cashflow:{month,openingBalance:731.16,projectedClosing:3049.15,realizedClosing:3049.15,totalIncome:9205.7,totalExpense:6887.71,days:Array.from({length:31},(_,i)=>({date:month+'-'+String(i+1).padStart(2,'0'),income:i%3===0?450+i*23:60,expense:100+i*7,net:0,projectedBalance:731+i*73,realizedBalance:731+i*73,eventCount:1}))}};
}

/** Expande a fatura canônica em fontes reais; estornos reduzem o lote. */
export function settlementSources(items:PendingItem[],data:SystemData){
  const sources:Array<{source:'event'|'payable'|'card';sourceId:string;statementMonth?:string}>=[];
  for(const item of items){
    if(item.source!=='card'){sources.push({source:item.source,sourceId:item.sourceId});continue;}
    const card=data.cards.find(c=>c.id===item.sourceId),lines=card?.statement?.lines.filter(l=>l.isOpen)||[];
    if(!card?.statement){sources.push({source:'card',sourceId:item.sourceId,statementMonth:item.statementMonth});continue;}
    if(lines.some(l=>l.source==='card-installment'))sources.push({source:'card',sourceId:item.sourceId,statementMonth:item.statementMonth});
    for(const line of lines.filter(l=>l.source==='financial-event')){
      if(!line.eventId)throw Error('Fatura sem vínculo de origem. Atualize os dados antes de pagar.');
      sources.push({source:'event',sourceId:line.eventId});
    }
  }
  const keys=sources.map(s=>s.source+':'+s.sourceId+':'+(s.statementMonth||''));
  if(new Set(keys).size!==keys.length)throw Error('A seleção contém a mesma obrigação mais de uma vez.');
  if(!sources.length||sources.length>100)throw Error('Selecione entre 1 e 100 obrigações por pagamento.');
  return sources;
}


export type PeriodMode='month'|'range'|'all';

export function monthsBetween(start:string,end:string){
  const result:string[]=[];
  let cursor=start.slice(0,7),finish=end.slice(0,7);
  for(let guard=0;guard<36&&cursor<=finish;guard+=1){
    result.push(cursor);
    const [year,month]=cursor.split('-').map(Number);
    cursor=new Date(Date.UTC(year,month,1)).toISOString().slice(0,7);
  }
  return result;
}

export async function loadAllEvents(pageSize=250):Promise<FinancialEventPage>{
  const unique=new Map<string,FinancialEvent>();
  let page=1,total=Infinity;
  while(unique.size<total&&page<=200){
    const result=await financeClient.listEvents(page,pageSize,'');
    total=Number(result.total||0);
    for(const event of result.items||[]) if(event.status!=='archived')unique.set(event.id,event);
    if(!result.items?.length||result.items.length<pageSize)break;
    page+=1;
  }
  const items=[...unique.values()].sort((a,b)=>String(b.date).localeCompare(String(a.date))||b.id.localeCompare(a.id));
  return {items,total:items.length,page:1,pageSize:items.length};
}

export function isMonetaryEvent(event:FinancialEvent){
  return !isBenefit(event)&&event.type!=='transfer';
}

export function canonicalCurrentBalance(data:SystemData){
  return Number(data.summary.availableBalance||0)+Number(data.summary.realizedResult||0);
}

export function realizedPeriodBounds(currentRealBalance:number,events:FinancialEvent[],startDate:string,endDate:string){
  const todayDate=today(),realizedEnd=endDate<todayDate?endDate:todayDate;
  const realized=events.filter(event=>isMonetaryEvent(event)&&posted(event.status));
  if(startDate>todayDate)return {openingBalance:currentRealBalance,closingBalance:currentRealBalance};
  const afterPeriod=realized.filter(event=>{const date=String(event.date).slice(0,10);return date>realizedEnd&&date<=todayDate}).reduce((total,event)=>total+signed(event),0);
  const closingBalance=currentRealBalance-afterPeriod;
  const delta=realized.filter(event=>{const date=String(event.date).slice(0,10);return date>=startDate&&date<=realizedEnd}).reduce((total,event)=>total+signed(event),0);
  return {openingBalance:closingBalance-delta,closingBalance};
}

export function eventsInRange(events:FinancialEvent[],startDate:string,endDate:string){
  return events.filter(event=>{const date=String(event.date).slice(0,10);return date>=startDate&&date<=endDate});
}
