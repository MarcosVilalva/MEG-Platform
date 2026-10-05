import {useEffect,useMemo,useRef,useState} from 'react';
import {authenticatedRequest,type AuthSession} from '../../app/auth-client';
import {readCloudState,patchCloudStateProperties} from '../../app/app-state-client';
import {cardsClient,type CreditCard} from '../../app/cards-client';
import {financeClient,type Account,type Category,type FinancialEvent,type PaymentMethod} from '../../app/finance-client';
import {EvolutionFinancialIcon as Icon,resolveEvolutionFinancialIcon} from '../components/EvolutionFinancialIcon';
import {EvolutionSmartGridFilter} from '../components/EvolutionSmartGridFilter';
import {Button,CategorySummary,Metric,Panel} from '../components/SystemUI';
import {datePt,isBenefit,money,monthPt,normalize,posted,signed,sum,type SystemData} from '../app/system-domain';
import '../styles/evolution-parity.css';

export type EvolutionHomePrefs={balance:boolean;flow:boolean;summary:boolean;benefit:boolean;history:boolean;agenda:boolean};
const PREF_KEY='meg.dashboard.preferences';
const DEFAULT_PREFS:EvolutionHomePrefs={balance:true,flow:true,summary:true,benefit:true,history:true,agenda:true};

export function readEvolutionHomePrefs():EvolutionHomePrefs{
  try{return {...DEFAULT_PREFS,...JSON.parse(localStorage.getItem(PREF_KEY)||'{}')}}catch{return DEFAULT_PREFS}
}
export function applyEvolutionHomePrefs(value:EvolutionHomePrefs){
  try{localStorage.setItem(PREF_KEY,JSON.stringify(value))}catch{}
  const root=document.documentElement;
  Object.entries(value).forEach(([key,enabled])=>root.dataset['megEvolutionHome'+key.slice(0,1).toUpperCase()+key.slice(1)]=enabled?'on':'off');
  window.dispatchEvent(new CustomEvent('meg:evolution-home-prefs',{detail:value}));
}

function downloadBlob(filename:string,blob:Blob){
  const url=URL.createObjectURL(blob),anchor=document.createElement('a');
  anchor.href=url;anchor.download=filename;document.body.appendChild(anchor);anchor.click();anchor.remove();URL.revokeObjectURL(url);
}
function exportExcel(filename:string,rows:string[][]){
  const esc=(value:string)=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const html='<html><head><meta charset="utf-8"></head><body><table border="1">'+rows.map((row,index)=>'<tr>'+row.map(cell=>`<${index===0?'th':'td'}>${esc(cell)}</${index===0?'th':'td'}>`).join('')+'</tr>').join('')+'</table></body></html>';
  downloadBlob(filename,new Blob(['\uFEFF'+html],{type:'application/vnd.ms-excel;charset=utf-8'}));
}
function pdfSafe(value:string){return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E]/g,' ').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)')}
function exportPdf(filename:string,title:string,rows:string[][]){
  const lines=[title,'',...rows.slice(1).map(row=>`${row[1]}  ${row[0]}  ${row[2]?'Parc. '+row[2]+'  ':''}R$ ${row[3]}`)].map(pdfSafe),perPage=48,pages:string[][]=[];
  for(let index=0;index<lines.length;index+=perPage)pages.push(lines.slice(index,index+perPage));if(!pages.length)pages.push([pdfSafe(title)]);
  const objects:string[]=[];const kids:string[]=[];objects[1]='<< /Type /Catalog /Pages 2 0 R >>';objects[3]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  pages.forEach((page,index)=>{const pageObj=4+index*2,contentObj=pageObj+1;kids.push(`${pageObj} 0 R`);const commands=page.map((line,lineIndex)=>`BT /F1 ${lineIndex===0?14:9} Tf 40 ${800-lineIndex*15} Td (${line}) Tj ET`).join('\n');objects[pageObj]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObj} 0 R >>`;objects[contentObj]=`<< /Length ${commands.length} >>\nstream\n${commands}\nendstream`});
  objects[2]=`<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pages.length} >>`;let pdf='%PDF-1.4\n';const offsets:number[]=[0];
  for(let id=1;id<objects.length;id+=1){offsets[id]=pdf.length;pdf+=`${id} 0 obj\n${objects[id]}\nendobj\n`}const xref=pdf.length;pdf+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;for(let id=1;id<objects.length;id+=1)pdf+=String(offsets[id]).padStart(10,'0')+' 00000 n \n';pdf+=`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;downloadBlob(filename,new Blob([pdf],{type:'application/pdf'}));
}

type CardTab='summary'|'current'|'upcoming'|'installments'|'history';
type CardRow={id:string;eventId?:string;purchaseId?:string;description:string;date:string;amount:number;installmentNo?:number;installmentQty?:number;statementMonth?:string;category?:string;status?:string};
function purchaseRows(card:CreditCard):CardRow[]{
  return (card.purchases||[]).flatMap(purchase=>(purchase.entries||[]).map(entry=>({id:entry.id,purchaseId:purchase.id,description:purchase.description,date:purchase.purchaseDate,amount:Math.abs(Number(entry.amount||0)),installmentNo:entry.number,installmentQty:purchase.installments,statementMonth:entry.statementMonth,category:purchase.category?.name,status:entry.status})));
}
function statementRows(card:CreditCard):CardRow[]{
  const purchases=new Map((card.purchases||[]).map(purchase=>[purchase.id,purchase]));
  return (card.statement?.lines||[]).map(line=>({id:line.id,eventId:line.eventId||undefined,purchaseId:line.purchaseId||undefined,description:line.description,date:line.purchaseDate,amount:Math.abs(Number(line.effect||0)),installmentNo:line.installmentNo,installmentQty:line.installmentQty,statementMonth:line.statementMonth,category:line.purchaseId?purchases.get(line.purchaseId)?.category?.name:undefined,status:line.isOpen?'open':'paid'}));
}
export function EvolutionCardCenter({card,month,onPay,onOpenPurchase,onOpenEvent,disabled}:{card:CreditCard;month:string;onPay:()=>void;onOpenPurchase:(purchaseId:string)=>void;onOpenEvent:(eventId:string)=>void;disabled:boolean}){
  type SortKey='date'|'description'|'category'|'installment'|'statement'|'status'|'amount';
  const [tab,setTab]=useState<CardTab>('summary'),[query,setQuery]=useState('');
  const [description,setDescription]=useState(''),[fromDate,setFromDate]=useState(''),[toDate,setToDate]=useState(''),[categories,setCategories]=useState<string[]>([]),[installmentFilters,setInstallmentFilters]=useState<string[]>([]),[statements,setStatements]=useState<string[]>([]),[statuses,setStatuses]=useState<string[]>([]),[minAmount,setMinAmount]=useState(''),[maxAmount,setMaxAmount]=useState('');
  const [sort,setSort]=useState<{key:SortKey;direction:'asc'|'desc'}|null>({key:'date',direction:'desc'});
  const all=useMemo(()=>purchaseRows(card),[card]),current=useMemo(()=>statementRows(card),[card]);
  const source=useMemo(()=>{if(tab==='current')return current;if(tab==='upcoming')return all.filter(row=>(row.statementMonth||'')>month);if(tab==='installments')return all.filter(row=>Number(row.installmentQty||1)>1);if(tab==='history')return all;const currentIds=new Set(current.map(row=>row.id));return current.concat(all.filter(row=>!currentIds.has(row.id)&&(row.statementMonth||'')>month)).slice(0,8)},[tab,current,all,month]);
  const optionCounts=(items:Array<{value:string;label:string}>)=>{const map=new Map<string,{value:string;label:string;count:number}>();for(const item of items){const found=map.get(item.value);found?found.count+=1:map.set(item.value,{...item,count:1})}return [...map.values()]};
  const categoryValue=(row:CardRow)=>row.category||'__none__',categoryLabel=(row:CardRow)=>row.category||'Sem categoria';
  const installmentValue=(row:CardRow)=>row.installmentNo&&row.installmentQty?row.installmentNo+'/'+row.installmentQty:'cash',installmentLabel=(row:CardRow)=>row.installmentNo&&row.installmentQty?row.installmentNo+'/'+row.installmentQty:'À vista';
  const statementValue=(row:CardRow)=>row.statementMonth||month,statusValue=(row:CardRow)=>row.status==='paid'?'paid':'open';
  const categoryOptions=useMemo(()=>optionCounts(source.map(row=>({value:categoryValue(row),label:categoryLabel(row)}))),[source]);
  const installmentOptions=useMemo(()=>optionCounts(source.map(row=>({value:installmentValue(row),label:installmentLabel(row)}))),[source]);
  const statementOptions=useMemo(()=>optionCounts(source.map(row=>({value:statementValue(row),label:monthPt(statementValue(row))}))),[source,month]);
  const statusOptions=useMemo(()=>optionCounts(source.map(row=>({value:statusValue(row),label:statusValue(row)==='paid'?'Pago':'Na fatura'}))),[source]);
  const parse=(value:string)=>{if(!value.trim())return null;const number=Number(value.replace(/R\$/gi,'').replace(/\s/g,'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''));return Number.isFinite(number)?number:null};
  const min=parse(minAmount),max=parse(maxAmount),needle=normalize(query),descriptionNeedle=normalize(description);
  const filtered=useMemo(()=>{
    const rows=source.filter(row=>{
      if(needle&&!normalize([row.description,row.category,row.statementMonth].filter(Boolean).join(' ')).includes(needle))return false;
      if(descriptionNeedle&&!normalize(row.description).includes(descriptionNeedle))return false;
      if(fromDate&&row.date.slice(0,10)<fromDate)return false;
      if(toDate&&row.date.slice(0,10)>toDate)return false;
      if(categories.length&&!categories.includes(categoryValue(row)))return false;
      if(installmentFilters.length&&!installmentFilters.includes(installmentValue(row)))return false;
      if(statements.length&&!statements.includes(statementValue(row)))return false;
      if(statuses.length&&!statuses.includes(statusValue(row)))return false;
      if(min!==null&&row.amount<min)return false;
      if(max!==null&&row.amount>max)return false;
      return true;
    });
    if(!sort)return rows;
    return [...rows].sort((a,b)=>{
      let result=0;
      if(sort.key==='date')result=a.date.localeCompare(b.date);
      else if(sort.key==='amount')result=a.amount-b.amount;
      else if(sort.key==='description')result=a.description.localeCompare(b.description,'pt-BR',{numeric:true,sensitivity:'base'});
      else if(sort.key==='category')result=categoryLabel(a).localeCompare(categoryLabel(b),'pt-BR',{sensitivity:'base'});
      else if(sort.key==='installment')result=installmentLabel(a).localeCompare(installmentLabel(b),'pt-BR',{numeric:true});
      else if(sort.key==='statement')result=statementValue(a).localeCompare(statementValue(b));
      else result=statusValue(a).localeCompare(statusValue(b));
      if(result===0)result=a.id.localeCompare(b.id);
      return sort.direction==='asc'?result:-result;
    });
  },[source,needle,descriptionNeedle,fromDate,toDate,categories,installmentFilters,statements,statuses,min,max,sort,month]);
  const direction=(key:SortKey)=>sort?.key===key?sort.direction:null,updateSort=(key:SortKey,next:'asc'|'desc'|null)=>setSort(next?{key,direction:next}:null);
  const clear=()=>{setDescription('');setFromDate('');setToDate('');setCategories([]);setInstallmentFilters([]);setStatements([]);setStatuses([]);setMinAmount('');setMaxAmount('')};
  const hasFilters=Boolean(description||fromDate||toDate||categories.length||installmentFilters.length||statements.length||statuses.length||minAmount||maxAmount);
  const payable=Number(card.statement?.payableAmount??card.payableStatementAmount??Math.max(0,card.statementAmount)),limit=Number(card.creditLimit||0),used=Number(card.usedLimit||0),available=Number(card.availableLimit??Math.max(0,limit-used)),usage=limit?Math.min(100,Math.max(0,used/limit*100)):0,bestDay=Number(card.closingDay||1)>=28?1:Number(card.closingDay||1)+1;
  const exportRows=[['Descrição','Data','Parcela','Valor'],...filtered.map(row=>[row.description,datePt(row.date),row.installmentNo&&row.installmentQty?row.installmentNo+'/'+row.installmentQty:'',row.amount.toFixed(2).replace('.',',')])];
  return <div className="evo-card-center-full">
    <div className="evo-card-center-kpis">
      <Metric label="Limite total" icon="card" value={limit}/><Metric label="Disponível" icon="check-line" tone="green" value={available}/><Metric label="Fatura atual" icon="receipt" tone="yellow" value={payable}/><Metric label="Utilizado" icon="chart" value={used} detail={usage.toFixed(0)+'% do limite'}/>
    </div>
    <Panel title="Central da fatura" icon="card" className="evo-card-ledger" action={<Button primary icon="wallet" disabled={disabled||payable<=0} onClick={onPay}>Pagar fatura</Button>}>
      <div className="evo-card-facts"><span>Fechamento<strong>Dia {card.closingDay||'—'}</strong></span><span>Vencimento<strong>{card.statement?.dueDate?datePt(card.statement.dueDate):'Dia '+(card.dueDay||'—')}</strong></span><span>Melhor dia<strong>Dia {bestDay}</strong></span><span>Competência<strong>{monthPt(month)}</strong></span></div>
      <div className="evo-subtabs">{([['summary','Resumo'],['current','Atual'],['upcoming','Próximas'],['installments','Parcelas'],['history','Histórico']] as Array<[CardTab,string]>).map(([key,label])=><button key={key} className={tab===key?'active':''} onClick={()=>setTab(key)}>{label}</button>)}</div>
      <div className="evo-table-tools"><label><Icon name="search"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Busca rápida na fatura"/></label><button title="Exportar Excel" aria-label="Exportar Excel" onClick={()=>exportExcel('fatura-'+normalize(card.name).replace(/\s+/g,'-')+'.xls',exportRows)}><Icon name="list"/></button><button title="Exportar PDF" aria-label="Exportar PDF" onClick={()=>exportPdf('fatura-'+normalize(card.name).replace(/\s+/g,'-')+'.pdf','Fatura - '+card.name,exportRows)}><Icon name="note"/></button></div>
      <div className="meg-smart-grid-meta"><span><b>{filtered.length}</b> de {source.length} lançamento(s)</span>{hasFilters&&<button type="button" onClick={clear}><Icon name="x" size={14}/>Limpar filtros</button>}</div>
      <div className="meg-scroll"><table className="meg-table meg-excel-table" data-smart-grid="card-center"><thead><tr>
        <th><EvolutionSmartGridFilter label="Data" value={{kind:'date',from:fromDate,to:toDate}} sortDirection={direction('date')} onSort={next=>updateSort('date',next)} onApply={value=>{if(value.kind==='date'){setFromDate(value.from);setToDate(value.to)}}}/></th>
        <th><EvolutionSmartGridFilter label="Descrição" value={{kind:'text',text:description}} sortDirection={direction('description')} onSort={next=>updateSort('description',next)} onApply={value=>{if(value.kind==='text')setDescription(value.text)}}/></th>
        <th><EvolutionSmartGridFilter label="Categoria" value={{kind:'multi',values:categories}} options={categoryOptions} sortDirection={direction('category')} onSort={next=>updateSort('category',next)} onApply={value=>{if(value.kind==='multi')setCategories(value.values)}}/></th>
        <th><EvolutionSmartGridFilter label="Parcela" value={{kind:'multi',values:installmentFilters}} options={installmentOptions} sortDirection={direction('installment')} onSort={next=>updateSort('installment',next)} onApply={value=>{if(value.kind==='multi')setInstallmentFilters(value.values)}}/></th>
        <th><EvolutionSmartGridFilter label="Fatura" value={{kind:'multi',values:statements}} options={statementOptions} sortDirection={direction('statement')} onSort={next=>updateSort('statement',next)} onApply={value=>{if(value.kind==='multi')setStatements(value.values)}}/></th>
        <th><EvolutionSmartGridFilter label="Status" value={{kind:'multi',values:statuses}} options={statusOptions} sortDirection={direction('status')} onSort={next=>updateSort('status',next)} onApply={value=>{if(value.kind==='multi')setStatuses(value.values)}}/></th>
        <th><EvolutionSmartGridFilter label="Valor" value={{kind:'number',min:minAmount,max:maxAmount}} sortDirection={direction('amount')} onSort={next=>updateSort('amount',next)} onApply={value=>{if(value.kind==='number'){setMinAmount(value.min);setMaxAmount(value.max)}}}/></th>
        <th><button type="button" className={'meg-smart-grid-clear '+(hasFilters?'active':'')} onClick={clear} aria-label="Limpar filtros da fatura"><Icon name="x" size={16}/></button></th>
      </tr></thead><tbody>{filtered.map(row=><tr key={row.id}><td>{datePt(row.date)}</td><td><div className="meg-event-desc"><i className="meg-event-icon"><Icon name={resolveEvolutionFinancialIcon({description:row.description,categoryName:row.category})}/></i><span title={row.description}>{row.description}</span></div></td><td><span className="meg-pill category">{categoryLabel(row)}</span></td><td>{installmentLabel(row)}</td><td>{monthPt(statementValue(row))}</td><td><span className={'meg-pill '+(row.status==='paid'?'green':'yellow')}>{row.status==='paid'?'Pago':'Na fatura'}</span></td><td>{money(row.amount)}</td><td>{row.purchaseId||row.eventId?<button className="meg-row-edit" onClick={()=>row.purchaseId?onOpenPurchase(row.purchaseId):row.eventId&&onOpenEvent(row.eventId)}><Icon name="note" size={17}/></button>:null}</td></tr>)}</tbody></table>{!filtered.length?<p className="meg-empty">Nenhum lançamento neste filtro.</p>:null}</div>
    </Panel>
  </div>
}

function auditActionLabel(action:string){
  const key=String(action||'').toUpperCase();
  if(key.includes('CARD_STATEMENT_PAID'))return 'Fatura paga';
  if(key.includes('PAYABLE_PAYMENT'))return 'Conta paga';
  if(key.includes('SETTLED')||key.includes('PAYMENT'))return 'Pagamento confirmado';
  if(key.includes('CREATED'))return key.includes('TRANSFER')?'Transferência registrada':'Lançamento criado';
  if(key.includes('UPDATED'))return 'Lançamento alterado';
  if(key.includes('ARCHIVED')||key.includes('DELETED'))return 'Lançamento excluído';
  if(key.includes('REOPEN'))return 'Fatura reaberta';
  return key.toLocaleLowerCase('pt-BR').replace(/_/g,' ').replace(/(^|\s)\S/g,letter=>letter.toLocaleUpperCase('pt-BR'));
}
function auditEntityLabel(entity:string){
  const key=String(entity||'').toLowerCase();
  if(key==='financialevent')return 'Lançamento';
  if(key==='payable')return 'Conta a pagar';
  if(key==='creditcard')return 'Cartão';
  if(key.includes('paymentmethod'))return 'Forma de pagamento';
  if(key.includes('category'))return 'Categoria';
  if(key.includes('account'))return 'Conta';
  return entity||'Sistema';
}

export function EvolutionHistory({data}:{data:SystemData}){
  type SortKey='date'|'action'|'entity'|'actor'|'reference';
  const [query,setQuery]=useState(''),[fromDate,setFromDate]=useState(''),[toDate,setToDate]=useState(''),[actions,setActions]=useState<string[]>([]),[entities,setEntities]=useState<string[]>([]),[actors,setActors]=useState<string[]>([]),[reference,setReference]=useState('');
  const [sort,setSort]=useState<{key:SortKey;direction:'asc'|'desc'}|null>({key:'date',direction:'desc'});
  const source=data.audit.items;
  const countOptions=(items:Array<{value:string;label:string}>)=>{const map=new Map<string,{value:string;label:string;count:number}>();for(const item of items){const found=map.get(item.value);found?found.count+=1:map.set(item.value,{...item,count:1})}return [...map.values()]};
  const actionOptions=useMemo(()=>countOptions(source.map(item=>({value:item.action||'',label:auditActionLabel(item.action)}))),[source]);
  const entityOptions=useMemo(()=>countOptions(source.map(item=>({value:item.entity||'',label:auditEntityLabel(item.entity)}))),[source]);
  const actorOptions=useMemo(()=>countOptions(source.map(item=>({value:item.actor?.id||'system',label:item.actor?.name||'Sistema'}))),[source]);
  const needle=normalize(query),referenceNeedle=normalize(reference);
  const items=useMemo(()=>{
    const rows=source.filter(item=>{
      const date=String(item.at||'').slice(0,10),actor=item.actor?.id||'system';
      if(needle&&!normalize([auditActionLabel(item.action),auditEntityLabel(item.entity),item.entityId,item.actor?.name].join(' ')).includes(needle))return false;
      if(referenceNeedle&&!normalize(item.entityId).includes(referenceNeedle))return false;
      if(fromDate&&date<fromDate)return false;
      if(toDate&&date>toDate)return false;
      if(actions.length&&!actions.includes(item.action||''))return false;
      if(entities.length&&!entities.includes(item.entity||''))return false;
      if(actors.length&&!actors.includes(actor))return false;
      return true;
    });
    if(!sort)return rows;
    return [...rows].sort((a,b)=>{
      let result=0;
      if(sort.key==='date')result=String(a.at).localeCompare(String(b.at));
      else if(sort.key==='action')result=auditActionLabel(a.action).localeCompare(auditActionLabel(b.action),'pt-BR',{sensitivity:'base'});
      else if(sort.key==='entity')result=auditEntityLabel(a.entity).localeCompare(auditEntityLabel(b.entity),'pt-BR',{sensitivity:'base'});
      else if(sort.key==='actor')result=String(a.actor?.name||'Sistema').localeCompare(String(b.actor?.name||'Sistema'),'pt-BR',{sensitivity:'base'});
      else result=String(a.entityId||'').localeCompare(String(b.entityId||''),'pt-BR',{numeric:true});
      if(result===0)result=a.id.localeCompare(b.id);
      return sort.direction==='asc'?result:-result;
    });
  },[source,needle,referenceNeedle,fromDate,toDate,actions,entities,actors,sort]);
  const direction=(key:SortKey)=>sort?.key===key?sort.direction:null,updateSort=(key:SortKey,next:'asc'|'desc'|null)=>setSort(next?{key,direction:next}:null);
  const clear=()=>{setFromDate('');setToDate('');setActions([]);setEntities([]);setActors([]);setReference('')};
  const hasFilters=Boolean(fromDate||toDate||actions.length||entities.length||actors.length||reference);
  return <div className="meg-module-grid evo-history"><header className="meg-page-head"><div><h1>Histórico</h1><p>Alterações e confirmações registradas no MEG.</p></div></header><div className="meg-module-metrics"><Metric label="Registros encontrados" icon="clock" value={items.length}/><Metric label="Total carregado" icon="list" value={source.length}/></div><Panel title="Atividades" icon="clock" className="meg-table-panel"><div className="evo-table-tools"><label><Icon name="search"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Busca rápida no histórico"/></label></div><div className="meg-smart-grid-meta"><span><b>{items.length}</b> de {source.length} registro(s)</span>{hasFilters&&<button type="button" onClick={clear}><Icon name="x" size={14}/>Limpar filtros</button>}</div><div className="meg-scroll"><table className="meg-table meg-excel-table evo-history-grid" data-smart-grid="history"><thead><tr>
    <th><EvolutionSmartGridFilter label="Data / hora" value={{kind:'date',from:fromDate,to:toDate}} sortDirection={direction('date')} onSort={next=>updateSort('date',next)} onApply={value=>{if(value.kind==='date'){setFromDate(value.from);setToDate(value.to)}}}/></th>
    <th><EvolutionSmartGridFilter label="Operação" value={{kind:'multi',values:actions}} options={actionOptions} sortDirection={direction('action')} onSort={next=>updateSort('action',next)} onApply={value=>{if(value.kind==='multi')setActions(value.values)}}/></th>
    <th><EvolutionSmartGridFilter label="Origem" value={{kind:'multi',values:entities}} options={entityOptions} sortDirection={direction('entity')} onSort={next=>updateSort('entity',next)} onApply={value=>{if(value.kind==='multi')setEntities(value.values)}}/></th>
    <th><EvolutionSmartGridFilter label="Usuário" value={{kind:'multi',values:actors}} options={actorOptions} sortDirection={direction('actor')} onSort={next=>updateSort('actor',next)} onApply={value=>{if(value.kind==='multi')setActors(value.values)}}/></th>
    <th><EvolutionSmartGridFilter label="Referência" value={{kind:'text',text:reference}} sortDirection={direction('reference')} onSort={next=>updateSort('reference',next)} onApply={value=>{if(value.kind==='text')setReference(value.text)}}/></th>
    <th><button type="button" className={'meg-smart-grid-clear '+(hasFilters?'active':'')} onClick={clear} aria-label="Limpar filtros do histórico"><Icon name="x" size={16}/></button></th>
  </tr></thead><tbody>{items.map(item=><tr key={item.id}><td>{item.at?new Date(item.at).toLocaleString('pt-BR'):'Registro'}</td><td><span className={'meg-pill '+(/settle|paid|payment/i.test(item.action)?'green':/delete|archive/i.test(item.action)?'red':'')}>{auditActionLabel(item.action)}</span></td><td>{auditEntityLabel(item.entity)}</td><td>{item.actor?.name||'Sistema'}</td><td><span className="evo-audit-reference" title={item.entityId||''}>{item.entityId||'—'}</span></td><td><i className="meg-event-icon"><Icon name={/settle|paid|payment/i.test(item.action)?'check-line':/delete|archive/i.test(item.action)?'x':'note'} size={17}/></i></td></tr>)}</tbody></table>{!items.length?<p className="meg-empty">Nenhuma atividade encontrada.</p>:null}</div></Panel></div>
}

export function EvolutionCashflow({data}:{data:SystemData}){
  const [tab,setTab]=useState<'summary'|'income'|'expense'>('summary'),days=data.cashflow.days||[],visible=days.filter(day=>tab==='summary'||tab==='income'&&Number(day.income)>0||tab==='expense'&&Number(day.expense)>0),result=Number(data.cashflow.totalIncome||0)-Number(data.cashflow.totalExpense||0),max=Math.max(1,...days.flatMap(day=>[Number(day.income||0),Number(day.expense||0)]));
  return <div className="meg-module-grid evo-analysis"><header className="meg-page-head"><div><h1>Fluxo de caixa</h1><p>Entradas, saídas e evolução do saldo no período.</p></div></header><div className="evo-subtabs">{[['summary','Resumo'],['income','Entradas'],['expense','Saídas']].map(([key,label])=><button key={key} className={tab===key?'active':''} onClick={()=>setTab(key as typeof tab)}>{label}</button>)}</div><div className="meg-module-metrics"><Metric label="Entradas" icon="up" tone="green" value={data.cashflow.totalIncome}/><Metric label="Saídas" icon="down" tone="red" value={data.cashflow.totalExpense}/><Metric label="Resultado" icon="trend" value={result}/><Metric label="Fechamento realizado" icon="wallet" value={data.cashflow.realizedClosing}/></div><div className="meg-data-with-summary"><Panel title="Evolução diária" icon="chart" className="meg-table-panel"><div className="evo-daily-bars" aria-label="Evolução diária">{days.slice(-31).map(day=><span key={day.date} title={datePt(day.date)}><i className="income" style={{height:Math.max(3,Number(day.income||0)/max*100)+'%'}}/><i className="expense" style={{height:Math.max(3,Number(day.expense||0)/max*100)+'%'}}/></span>)}</div><div className="meg-scroll"><table className="meg-table"><thead><tr><th>Data</th><th>Entradas</th><th>Saídas</th><th>Saldo realizado</th><th>Projetado</th></tr></thead><tbody>{visible.map(day=><tr key={day.date}><td>{datePt(day.date)}</td><td className="green">{money(day.income)}</td><td className="red">{money(day.expense)}</td><td>{money(day.realizedBalance)}</td><td>{money(day.projectedBalance)}</td></tr>)}</tbody></table></div></Panel><Panel title="Posição do período" icon="wallet" className="meg-summary-panel"><div className="meg-result-card"><small>Saldo inicial</small><strong>{money(data.cashflow.openingBalance)}</strong><span>Fechamento projetado {money(data.cashflow.projectedClosing)}</span></div></Panel></div></div>
}

export function EvolutionAnalytics({data}:{data:SystemData}){
  type Dimension='category'|'account'|'method'|'status'|'type'|'month';
  type MetricKey='total'|'count'|'average';
  const [dimension,setDimension]=useState<Dimension>('category'),[metric,setMetric]=useState<MetricKey>('total'),[focus,setFocus]=useState<'expenses'|'income'|'cashflow'|'categories'>('expenses'),[query,setQuery]=useState(''),[selected,setSelected]=useState<string|null>(null);
  const baseRealized=useMemo(()=>data.events.filter(event=>posted(event.status)&&event.type!=='transfer'&&!isBenefit(event)),[data.events]);
  const realized=useMemo(()=>focus==='income'?baseRealized.filter(event=>signed(event)>0):focus==='expenses'||focus==='categories'?baseRealized.filter(event=>signed(event)<0):baseRealized,[baseRealized,focus]);
  const expenseEvents=useMemo(()=>realized.filter(event=>signed(event)<0),[realized]);
  const dimensionLabel=(event:FinancialEvent)=>{
    if(dimension==='category')return event.category?.name||event.sourceDetails?.group||'Sem categoria';
    if(dimension==='account')return event.account?.name||'Conta não informada';
    if(dimension==='method')return event.paymentMethod?.name||event.sourceDetails?.paymentMethod||'Forma não informada';
    if(dimension==='status')return posted(event.status)?'Pago':'Pendente';
    if(dimension==='type')return signed(event)>=0?'Receita':'Despesa';
    return monthPt(String(event.competence||event.date).slice(0,7));
  };
  const groups=useMemo(()=>{
    const map=new Map<string,{label:string;total:number;count:number}>();
    for(const event of realized){
      const label=dimensionLabel(event),key=normalize(label)||'sem-grupo',current=map.get(key)||{label,total:0,count:0};
      current.total+=Math.abs(signed(event));current.count+=1;map.set(key,current);
    }
    return [...map.entries()].map(([key,item])=>({key,...item,average:item.count?item.total/item.count:0}))
      .filter(item=>!normalize(query)||normalize(item.label).includes(normalize(query)))
      .sort((a,b)=>{const av=metric==='count'?a.count:metric==='average'?a.average:a.total,bv=metric==='count'?b.count:metric==='average'?b.average:b.total;return bv-av||a.label.localeCompare(b.label,'pt-BR')});
  },[realized,dimension,metric,query]);
  const valueOf=(item:(typeof groups)[number])=>metric==='count'?item.count:metric==='average'?item.average:item.total;
  const max=Math.max(1,...groups.map(valueOf)),grandTotal=sum(realized.map(event=>Math.abs(signed(event)))),expenseTotal=sum(expenseEvents.map(event=>Math.abs(signed(event)))),incomeTotal=sum(realized.filter(event=>signed(event)>0).map(event=>signed(event)));
  const top=groups[0],second=groups[1],topShare=top&&grandTotal?top.total/grandTotal*100:0;
  const insights=[
    top?{title:'Maior concentração',text:`${top.label} representa ${topShare.toFixed(1).replace('.',',')}% do valor analisado (${money(top.total)}).`}:null,
    second?{title:'Comparação',text:`${top?.label||'O primeiro grupo'} está ${money(Math.abs((top?.total||0)-second.total))} acima de ${second.label}.`}:null,
    expenseTotal>incomeTotal?{title:'Atenção ao resultado',text:`As despesas realizadas superam as receitas em ${money(expenseTotal-incomeTotal)} neste recorte.`}:{title:'Resultado do recorte',text:`As receitas realizadas superam as despesas em ${money(Math.max(0,incomeTotal-expenseTotal))}.`}
  ].filter(Boolean) as Array<{title:string;text:string}>;
  const exportRows=[['Grupo','Quantidade','Total','Média'],...groups.map(item=>[item.label,String(item.count),item.total.toFixed(2).replace('.',','),item.average.toFixed(2).replace('.',',')])];
  return <div className="meg-module-grid evo-analysis evo-reports-copilot">
    <header className="meg-page-head"><div><h1>Relatórios</h1><p>Análise dinâmica com dados reais e apoio à decisão financeira.</p></div><div className="evo-report-export"><Button icon="list" onClick={()=>exportExcel('meg-relatorio-'+dimension+'.xls',exportRows)}>Excel</Button></div></header>
    <div className="evo-report-tabs">{([['expenses','Despesas'],['income','Receitas'],['cashflow','Fluxo de caixa'],['categories','Categorias']] as Array<[typeof focus,string]>).map(([key,label])=><button key={key} className={focus===key?'active':''} onClick={()=>{setFocus(key);if(key==='categories')setDimension('category');if(key==='cashflow')setDimension('month');setSelected(null)}}>{label}</button>)}</div>
    <div className="evo-report-builder">
      <label><span>Dimensão</span><select value={dimension} onChange={e=>{setDimension(e.target.value as Dimension);setSelected(null)}}><option value="category">Categoria</option><option value="account">Conta</option><option value="method">Forma de pagamento</option><option value="status">Status</option><option value="type">Tipo</option><option value="month">Competência</option></select></label>
      <label><span>Métrica</span><select value={metric} onChange={e=>setMetric(e.target.value as MetricKey)}><option value="total">Valor total</option><option value="count">Quantidade</option><option value="average">Média</option></select></label>
      <label className="search"><span>Filtrar</span><div><Icon name="search" size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Pesquisar grupos"/></div></label>
    </div>
    <div className="meg-module-metrics"><Metric label="Receitas realizadas" icon="banknote" tone="green" value={incomeTotal}/><Metric label="Despesas realizadas" icon="receipt" tone="red" value={expenseTotal}/><Metric label="Resultado" icon="chart" tone={incomeTotal-expenseTotal>=0?'green':'red'} value={incomeTotal-expenseTotal}/><Metric label="Lançamentos analisados" icon="list" value={realized.length}/></div>
    <div className="evo-copilot-layout">
      <Panel title="Análise por dimensão" icon="chart" className="evo-dynamic-chart"><div className="evo-report-bars evo-dynamic-bars">{groups.slice(0,12).map(item=><button key={item.key} className={selected===item.key?'active':''} onClick={()=>setSelected(current=>current===item.key?null:item.key)} title={item.label}><span><i style={{width:Math.max(2,valueOf(item)/max*100)+'%'}}/></span><b>{item.label}</b><strong>{metric==='count'?item.count:money(valueOf(item))}</strong></button>)}</div>{!groups.length?<p className="meg-empty">Nenhum dado para este filtro.</p>:null}</Panel>
      <Panel title="Financial Copilot" icon="trend" className="evo-financial-copilot"><p className="evo-copilot-intro">Leitura automática do recorte atual. Nenhuma movimentação é feita pelo Copilot.</p><div>{insights.map((insight,index)=><article key={index}><i><Icon name={index===0?'chart':index===1?'repeat':'wallet'} size={18}/></i><span><strong>{insight.title}</strong><p>{insight.text}</p></span></article>)}</div></Panel>
    </div>
    <Panel title="Tabela dinâmica" icon="list" className="meg-table-panel"><div className="meg-scroll"><table className="meg-table meg-excel-table"><thead><tr><th>Grupo</th><th>Quantidade</th><th>Total</th><th>Média</th><th>Participação</th></tr></thead><tbody>{groups.map(item=><tr key={item.key} className={selected===item.key?'selected':''} onClick={()=>setSelected(item.key)}><td>{item.label}</td><td>{item.count}</td><td>{money(item.total)}</td><td>{money(item.average)}</td><td>{grandTotal?(item.total/grandTotal*100).toFixed(1).replace('.',',')+'%':'0,0%'}</td></tr>)}</tbody></table></div></Panel>
  </div>
}

type AvatarPreference={kind:'initials'}|{kind:'preset';presetId:string}|{kind:'photo';dataUrl:string};
const AVATARS=Array.from({length:18},(_,index)=>({id:'people-'+String(index+1).padStart(2,'0'),label:'Avatar '+String(index+1)}));
function avatarKey(userId:string){return 'meg.profile.avatar.'+userId}
function avatarAsset(id:string){const base=(import.meta.env.BASE_URL||'/').replace(/\/?$/,'/');return new URL(base+'brand/avatars/meg-user-base-v2/'+id+'.webp',document.baseURI).href}
function readAvatar(userId:string):AvatarPreference{try{const value=JSON.parse(localStorage.getItem(avatarKey(userId))||'null');if(value?.kind==='photo'&&String(value.dataUrl).startsWith('data:image/'))return value;if(value?.kind==='preset'&&AVATARS.some(item=>item.id===value.presetId))return value;if(value?.kind==='initials')return value}catch{}return {kind:'preset',presetId:'people-01'}}
function avatarImage(value:AvatarPreference){return value.kind==='photo'?value.dataUrl:value.kind==='preset'?avatarAsset(value.presetId):''}
async function saveAvatarCloud(userId:string,value:AvatarPreference){localStorage.setItem(avatarKey(userId),JSON.stringify(value));window.dispatchEvent(new CustomEvent('meg:profile-avatar-changed',{detail:{userId,preference:value}}));for(let attempt=0;attempt<3;attempt+=1){try{const cloud=await readCloudState(),current=(cloud.state.profileAvatars&&typeof cloud.state.profileAvatars==='object'&&!Array.isArray(cloud.state.profileAvatars)?cloud.state.profileAvatars:{}) as Record<string,unknown>;await patchCloudStateProperties({profileAvatars:{...current,[userId]:value}},cloud.revision);return true}catch(error){if((error as {status?:number}).status!==409||attempt===2)return false}}return false}

export function EvolutionSettings({data,session,onChanged}:{data:SystemData;session:AuthSession|null;onChanged:()=>void}){
  type Tab='profile'|'home'|'catalogs'|'security'|'notifications'|'system';
  type Catalog='categories'|'accounts'|'methods'|'cards';
  const [tab,setTab]=useState<Tab>(()=>{const value=new URLSearchParams(location.search).get('settingsTab') as Tab;return ['profile','home','catalogs','security','notifications','system'].includes(value)?value:'profile'}),[catalog,setCatalog]=useState<Catalog>(()=>{const value=new URLSearchParams(location.search).get('catalog') as Catalog;return ['categories','accounts','methods','cards'].includes(value)?value:'categories'}),[prefs,setPrefs]=useState(readEvolutionHomePrefs);
  const [methods,setMethods]=useState<PaymentMethod[]>(data.allMethods),[cards,setCards]=useState<CreditCard[]>(data.managedCards),[categories,setCategories]=useState<Category[]>(data.categories),[accounts,setAccounts]=useState<Account[]>(data.accounts);
  const [busy,setBusy]=useState(''),[message,setMessage]=useState(''),[notifications,setNotifications]=useState<Record<string,unknown>|null>(null),[avatar,setAvatar]=useState<AvatarPreference>(()=>readAvatar(session?.user.id||'preview')),[syncStatus,setSyncStatus]=useState<{token:string;changedAt:string|null;mutationType:string|null}|null>(null);
  const [editor,setEditor]=useState<{kind:Catalog;id?:string}|null>(null);
  const [form,setForm]=useState<Record<string,string>>({});
  const fileRef=useRef<HTMLInputElement>(null),userId=session?.user.id||'preview';
  useEffect(()=>{applyEvolutionHomePrefs(prefs)},[prefs]);
  useEffect(()=>{setMethods(data.allMethods);setCards(data.managedCards);setCategories(data.categories);setAccounts(data.accounts)},[data.allMethods,data.managedCards,data.categories,data.accounts]);
  useEffect(()=>{if(tab==='notifications'&&session)void authenticatedRequest<Record<string,unknown>>('/notifications/status',{cache:'no-store'}).then(setNotifications).catch(()=>setNotifications(null));if(tab==='system'&&session)void financeClient.getSyncStatus().then(setSyncStatus).catch(()=>setSyncStatus(null))},[tab,session]);
  const disabled=!session||Boolean(busy);
  const startCreate=(kind:Catalog)=>{setEditor({kind});setForm(kind==='categories'?{name:'',group:'',type:'expense'}:kind==='accounts'?{name:'',institution:'',type:'checking',openingBalance:'0'}:kind==='methods'?{name:'',type:'instant'}:{name:'',issuer:'',brand:'',lastFour:'',creditLimit:'0',closingDay:'1',dueDay:'10',color:'#0b7777'})};
  const startEdit=(kind:Catalog,item:Category|Account|PaymentMethod|CreditCard)=>{
    setEditor({kind,id:item.id});
    if(kind==='categories'){const x=item as Category;setForm({name:x.name,group:x.group||'',type:x.type||'expense'});}
    else if(kind==='accounts'){const x=item as Account;setForm({name:x.name,institution:x.institution||'',type:x.type||'checking',openingBalance:String(x.openingBalance||0)});}
    else if(kind==='methods'){const x=item as PaymentMethod;setForm({name:x.name,type:x.type||'instant'});}
    else {const x=item as CreditCard;setForm({name:x.name,issuer:x.issuer||'',brand:x.brand||'',lastFour:x.lastFour||'',creditLimit:String(x.creditLimit||0),closingDay:String(x.closingDay||1),dueDay:String(x.dueDay||10),color:x.color||'#0b7777'});}
  };
  const setField=(key:string,value:string)=>setForm(current=>({...current,[key]:value}));
  async function saveCatalog(){
    if(!session||!editor||busy)return;
    setBusy('catalog-save');setMessage('');
    try{
      if(!form.name?.trim())throw new Error('Informe um nome.');
      const operationId=crypto.randomUUID();
      if(editor.kind==='categories'){
        const current=categories.find(x=>x.id===editor.id);
        const updated=editor.id
          ?await financeClient.updateCategory(editor.id,{name:form.name.trim(),group:form.group?.trim()||null,operationId,expectedUpdatedAt:current?.updatedAt})
          :await financeClient.createCategory({name:form.name.trim(),group:form.group?.trim()||null,type:(form.type==='income'?'income':'expense'),operationId});
        setCategories(items=>editor.id?items.map(x=>x.id===updated.id?updated:x):[...items,updated]);
      }else if(editor.kind==='accounts'){
        const current=accounts.find(x=>x.id===editor.id);
        const updated=editor.id
          ?await financeClient.updateAccount(editor.id,{name:form.name.trim(),institution:form.institution?.trim()||null,operationId,expectedUpdatedAt:current?.updatedAt})
          :await financeClient.createAccount({name:form.name.trim(),institution:form.institution?.trim()||null,type:form.type||'checking',openingBalance:Number(String(form.openingBalance||'0').replace(',','.'))||0,operationId});
        setAccounts(items=>editor.id?items.map(x=>x.id===updated.id?updated:x):[...items,updated]);
      }else if(editor.kind==='methods'){
        const current=methods.find(x=>x.id===editor.id);
        const updated=editor.id
          ?await financeClient.updatePaymentMethod(editor.id,{name:form.name.trim(),operationId,expectedUpdatedAt:current?.updatedAt})
          :await financeClient.createPaymentMethod({name:form.name.trim(),type:form.type||'instant',operationId});
        setMethods(items=>editor.id?items.map(x=>x.id===updated.id?updated:x):[...items,updated]);
      }else{
        const current=cards.find(x=>x.id===editor.id);
        const payload={name:form.name.trim(),issuer:form.issuer?.trim()||undefined,brand:form.brand?.trim()||undefined,lastFour:form.lastFour?.replace(/\D/g,'').slice(-4)||undefined,creditLimit:Number(String(form.creditLimit||'0').replace(',','.'))||0,closingDay:Math.min(31,Math.max(1,Number(form.closingDay)||1)),dueDay:Math.min(31,Math.max(1,Number(form.dueDay)||10)),color:form.color||undefined,operationId,expectedUpdatedAt:current?.updatedAt};
        const updated=editor.id?await cardsClient.update(editor.id,payload):await cardsClient.create(payload);
        setCards(items=>editor.id?items.map(x=>x.id===updated.id?updated:x):[...items,updated]);
      }
      setEditor(null);setForm({});setMessage('Cadastro salvo e sincronizado.');onChanged();
    }catch(error){setMessage(error instanceof Error?error.message:'Não foi possível salvar o cadastro.')}finally{setBusy('')}
  }
  async function toggleMethod(method:PaymentMethod){if(disabled)return;setBusy('method:'+method.id);setMessage('');try{const operationId=crypto.randomUUID(),updated=method.isActive?await financeClient.deactivatePaymentMethod(method.id,{operationId,expectedUpdatedAt:method.updatedAt}):await financeClient.updatePaymentMethod(method.id,{isActive:true,operationId,expectedUpdatedAt:method.updatedAt});setMethods(items=>items.map(item=>item.id===method.id?{...item,...updated}:item));setMessage(method.name+': '+(updated.isActive?'ativado':'desativado')+'.');onChanged()}catch(error){setMessage(error instanceof Error?error.message:'Não foi possível alterar a forma de pagamento.')}finally{setBusy('')}}
  async function toggleCategory(item:Category){if(disabled)return;setBusy('category:'+item.id);setMessage('');try{const operationId=crypto.randomUUID(),updated=item.isActive?await financeClient.deactivateCategory(item.id,{operationId,expectedUpdatedAt:item.updatedAt}):await financeClient.updateCategory(item.id,{isActive:true,operationId,expectedUpdatedAt:item.updatedAt});setCategories(items=>items.map(x=>x.id===item.id?updated:x));setMessage(item.name+': '+(updated.isActive?'ativada':'desativada')+'.');onChanged()}catch(error){setMessage(error instanceof Error?error.message:'Não foi possível alterar a categoria.')}finally{setBusy('')}}
  async function toggleAccount(item:Account){if(disabled)return;setBusy('account:'+item.id);setMessage('');try{const operationId=crypto.randomUUID(),updated=item.isActive?await financeClient.deactivateAccount(item.id,{operationId,expectedUpdatedAt:item.updatedAt}):await financeClient.updateAccount(item.id,{isActive:true,operationId,expectedUpdatedAt:item.updatedAt});setAccounts(items=>items.map(x=>x.id===item.id?updated:x));setMessage(item.name+': '+(updated.isActive?'ativada':'desativada')+'.');onChanged()}catch(error){setMessage(error instanceof Error?error.message:'Não foi possível alterar a conta.')}finally{setBusy('')}}
  async function toggleCard(card:CreditCard){if(disabled)return;setBusy('card:'+card.id);setMessage('');try{const meta={operationId:crypto.randomUUID(),expectedUpdatedAt:card.updatedAt},updated=card.isActive?await cardsClient.deactivate(card.id,meta):(await cardsClient.reactivate(card.id,meta)).card;setCards(items=>items.map(item=>item.id===card.id?{...item,...updated}:item));setMessage(card.name+': '+(updated.isActive?'ativado':'desativado')+'.');onChanged()}catch(error){setMessage(error instanceof Error?error.message:'Não foi possível alterar o cartão.')}finally{setBusy('')}}
  async function testNotifications(){if(!session||busy)return;setBusy('notifications');setMessage('');try{const result=await authenticatedRequest<Record<string,{status?:string}>>('/notifications/test-channels',{method:'POST'}),ok=Object.values(result||{}).filter(item=>item?.status==='sent'||item?.status==='ok').length;setMessage(ok?`Teste enviado para ${ok} canal(is).`:'Teste concluído. Verifique o diagnóstico dos canais.');setNotifications(await authenticatedRequest<Record<string,unknown>>('/notifications/status',{cache:'no-store'}))}catch(error){setMessage(error instanceof Error?error.message:'Não foi possível testar os canais.')}finally{setBusy('')}}
  async function chooseAvatar(next:AvatarPreference){setAvatar(next);setMessage(session?await saveAvatarCloud(userId,next)?'Avatar sincronizado.':'Avatar aplicado localmente. A nuvem será tentada novamente depois.':'Prévia visual: avatar não foi gravado.')}
  async function choosePhoto(file?:File){if(!file)return;const allowedTypes=new Set(['image/png','image/jpeg','image/webp']);if(!allowedTypes.has(file.type)){setMessage('Use uma imagem PNG, JPG ou WEBP.');return}if(file.size>450000){setMessage('A foto precisa ter até 450 KB.');return}const reader=new FileReader();reader.onload=()=>{const value=String(reader.result||'');const expectedPrefix=file.type==='image/png'?'data:image/png;base64,':file.type==='image/webp'?'data:image/webp;base64,':'data:image/jpeg;base64,';if(value.startsWith(expectedPrefix))void chooseAvatar({kind:'photo',dataUrl:value});else setMessage('O arquivo de imagem não passou na validação.');};reader.readAsDataURL(file)}
  const image=avatarImage(avatar);
  const catalogItems=catalog==='categories'?categories:catalog==='accounts'?accounts:catalog==='methods'?methods:cards;
  return <div className="meg-module-grid evo-settings evo-settings-master"><header className="meg-page-head"><div><h1>Configurações</h1><p>Centro de comando do MEG Web.</p></div></header><nav className="evo-settings-tabs">{([['profile','Perfil'],['home','Home'],['catalogs','Cadastros'],['security','Segurança'],['notifications','Avisos'],['system','Sistema']] as Array<[Tab,string]>).map(([key,label])=><button key={key} className={tab===key?'active':''} onClick={()=>{setTab(key);setMessage('');setEditor(null)}}>{label}</button>)}</nav><div className="evo-settings-body meg-scroll">
    {tab==='profile'?<div className="evo-settings-columns"><Panel title="Meu perfil" icon="settings"><div className="evo-profile"><span className={image?'has-image':''}>{image?<img src={image} alt=""/>:(session?.user.name||'M').slice(0,1).toUpperCase()}</span><div><strong>{session?.user.name||'Prévia visual'}</strong><small>{session?.user.email||'Dados ilustrativos'}</small><em>{session?.user.role||'preview'}</em></div></div><input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e=>{void choosePhoto(e.target.files?.[0]);e.currentTarget.value=''}}/><div className="evo-profile-actions"><Button disabled={!session} onClick={()=>fileRef.current?.click()}>Escolher foto</Button><Button disabled={!session} onClick={()=>void chooseAvatar({kind:'initials'})}>Usar iniciais</Button></div></Panel><Panel title="Avatares MEG" icon="settings"><div className="evo-avatar-grid">{AVATARS.map(item=><button disabled={!session} key={item.id} className={avatar.kind==='preset'&&avatar.presetId===item.id?'active':''} onClick={()=>void chooseAvatar({kind:'preset',presetId:item.id})}><img src={avatarAsset(item.id)} alt=""/><small>{item.label}</small></button>)}</div></Panel></div>:null}
    {tab==='home'?<Panel title="Monte sua Home" icon="home"><p>Os blocos continuam no layout validado; você escolhe quais ficam visíveis.</p><div className="evo-switch-list">{([['balance','Saldo monetário'],['flow','Fluxo do mês'],['summary','Resumo financeiro'],['benefit','Benefício Alimentação'],['history','Histórico recente'],['agenda','Agenda financeira']] as Array<[keyof EvolutionHomePrefs,string]>).map(([key,label])=><button key={key} className={prefs[key]?'on':''} onClick={()=>setPrefs(current=>({...current,[key]:!current[key]}))}><span><strong>{label}</strong><small>{prefs[key]?'Visível':'Oculto'}</small></span><i><b/></i></button>)}</div><Button onClick={()=>setPrefs(DEFAULT_PREFS)}>Restaurar padrão</Button></Panel>:null}
    {tab==='catalogs'?<div className={'evo-catalog-master '+(editor?'editing':'')}>
      <aside className="evo-catalog-nav">{([['categories','Categorias'],['accounts','Contas'],['methods','Formas de pagamento'],['cards','Cartões']] as Array<[Catalog,string]>).map(([key,label])=><button key={key} className={catalog===key?'active':''} onClick={()=>{setCatalog(key);setEditor(null);setMessage('')}}><Icon name={key==='categories'?'list':key==='accounts'?'wallet':key==='methods'?'banknote':'card'} size={18}/><span><strong>{label}</strong><small>{key==='categories'?categories.length:key==='accounts'?accounts.length:key==='methods'?methods.length:cards.length} cadastro(s)</small></span></button>)}</aside>
      <Panel title={catalog==='categories'?'Categorias':catalog==='accounts'?'Contas':catalog==='methods'?'Formas de pagamento':'Cartões'} icon={catalog==='cards'?'card':'settings'} className="evo-catalog-panel" action={<Button primary disabled={!session} onClick={()=>startCreate(catalog)}>Novo cadastro</Button>}>
        <div className="evo-catalog-list">
          {(catalogItems as Array<Category|Account|PaymentMethod|CreditCard>).map(item=><article key={item.id}><span className="evo-catalog-icon"><Icon name={catalog==='cards'?'card':catalog==='accounts'?'wallet':catalog==='categories'?'list':'banknote'} size={20}/></span><div><strong>{item.name}</strong><small>{catalog==='categories'?((item as Category).group||'Sem grupo')+' · '+((item as Category).type==='income'?'Receita':'Despesa'):catalog==='accounts'?((item as Account).institution||'Sem instituição')+' · '+(item as Account).type:catalog==='methods'?((item as PaymentMethod).type||'Forma de pagamento'):`${(item as CreditCard).brand||'Cartão'} · final ${(item as CreditCard).lastFour||'••••'}`}</small></div><span className={'evo-catalog-status '+(item.isActive?'on':'')}>{item.isActive?'Ativo':'Inativo'}</span><button className="evo-catalog-edit" disabled={!session||Boolean(busy)} onClick={()=>startEdit(catalog,item)} aria-label={'Editar '+item.name}><Icon name="note" size={16}/></button><button className={'evo-catalog-toggle '+(item.isActive?'on':'')} disabled={!session||Boolean(busy)} onClick={()=>void(catalog==='categories'?toggleCategory(item as Category):catalog==='accounts'?toggleAccount(item as Account):catalog==='methods'?toggleMethod(item as PaymentMethod):toggleCard(item as CreditCard))} aria-label={(item.isActive?'Desativar ':'Ativar ')+item.name}><i><b/></i></button></article>)}
        </div>
      </Panel>
      {editor?<Panel title={editor.id?'Editar cadastro':'Novo cadastro'} icon="note" className="evo-catalog-editor"><div className="evo-catalog-form"><label><span>Nome</span><input value={form.name||''} onChange={e=>setField('name',e.target.value)} autoFocus/></label>
        {editor.kind==='categories'?<><label><span>Grupo</span><input value={form.group||''} onChange={e=>setField('group',e.target.value)}/></label><label><span>Tipo</span><select value={form.type||'expense'} onChange={e=>setField('type',e.target.value)}><option value="expense">Despesa</option><option value="income">Receita</option></select></label></>:null}
        {editor.kind==='accounts'?<><label><span>Instituição</span><input value={form.institution||''} onChange={e=>setField('institution',e.target.value)}/></label>{!editor.id?<><label><span>Tipo</span><select value={form.type||'checking'} onChange={e=>setField('type',e.target.value)}><option value="checking">Conta monetária</option><option value="investment">Investimento</option><option value="benefit">Benefício</option><option value="cash">Dinheiro</option></select></label><label><span>Saldo inicial</span><input inputMode="decimal" value={form.openingBalance||'0'} onChange={e=>setField('openingBalance',e.target.value)}/></label></>:null}</>:null}
        {editor.kind==='methods'&&!editor.id?<label><span>Tipo</span><select value={form.type||'instant'} onChange={e=>setField('type',e.target.value)}><option value="instant">Instantâneo</option><option value="debit">Débito</option><option value="bank_slip">Boleto</option><option value="cash">Dinheiro</option></select></label>:null}
        {editor.kind==='cards'?<><label><span>Emissor</span><input value={form.issuer||''} onChange={e=>setField('issuer',e.target.value)}/></label><label><span>Bandeira</span><input value={form.brand||''} onChange={e=>setField('brand',e.target.value)}/></label><label><span>Final</span><input inputMode="numeric" maxLength={4} value={form.lastFour||''} onChange={e=>setField('lastFour',e.target.value.replace(/\D/g,'').slice(0,4))}/></label><label><span>Limite</span><input inputMode="decimal" value={form.creditLimit||'0'} onChange={e=>setField('creditLimit',e.target.value)}/></label><label><span>Fechamento</span><input type="number" min="1" max="31" value={form.closingDay||'1'} onChange={e=>setField('closingDay',e.target.value)}/></label><label><span>Vencimento</span><input type="number" min="1" max="31" value={form.dueDay||'10'} onChange={e=>setField('dueDay',e.target.value)}/></label><label><span>Identidade</span><input type="color" value={form.color||'#0b7777'} onChange={e=>setField('color',e.target.value)}/></label></>:null}
      </div><div className="evo-catalog-actions"><Button disabled={Boolean(busy)} onClick={()=>{setEditor(null);setForm({})}}>Cancelar</Button><Button primary disabled={disabled} onClick={()=>void saveCatalog()}>{busy==='catalog-save'?'Salvando…':'Salvar cadastro'}</Button></div></Panel>:null}
    </div>:null}
    {tab==='security'?<Panel title="Segurança" icon="alert"><div className="evo-native-boundary"><Icon name="alert"/><span><strong>Sessão Web protegida</strong><small>A biometria permanece exclusiva do aplicativo Android porque depende do sensor e do armazenamento seguro do aparelho. A Web não simula esse recurso.</small></span></div><div className="evo-native-boundary"><Icon name="phone"/><span><strong>Biometria Android preservada</strong><small>O código nativo continua intacto e disponível no APK.</small></span></div></Panel>:null}
    {tab==='notifications'?<Panel title="Canais de aviso" icon="bell"><p>Diagnóstico dos lembretes e integrações remotas compartilhadas pelo MEG.</p><Button primary disabled={!session||Boolean(busy)} onClick={()=>void testNotifications()}>{busy==='notifications'?'Testando…':'Testar canais'}</Button><pre className="evo-status-json">{notifications?JSON.stringify(notifications,null,2):'Status indisponível ou ainda carregando.'}</pre><div className="evo-native-boundary"><Icon name="phone"/><span><strong>Notificação local Android</strong><small>Permanece no APK. A Web usa apenas os canais remotos suportados pelo backend.</small></span></div></Panel>:null}
    {tab==='system'?<Panel title="Sistema e sincronização" icon="settings"><div className="evo-system-status"><span><small>Estado da nuvem</small><strong>{syncStatus?'Sincronizado':'Indisponível'}</strong></span><span><small>Última alteração</small><strong>{syncStatus?.changedAt?new Date(syncStatus.changedAt).toLocaleString('pt-BR'):'—'}</strong></span><span><small>Tipo</small><strong>{syncStatus?.mutationType||'—'}</strong></span></div><div className="evo-native-boundary"><Icon name="repeat"/><span><strong>Atualização OTA do APK</strong><small>Permanece exclusiva do Android. No navegador, a versão publicada é carregada pelo deploy Web.</small></span></div></Panel>:null}
    {message?<p className="evo-settings-message">{message}</p>:null}
  </div></div>
}

export function EvolutionBenefitLedger({data,onEdit}:{data:SystemData;onEdit:(event:FinancialEvent)=>void}){
  const [tab,setTab]=useState<'all'|'credits'|'debits'>('all'),[query,setQuery]=useState(''),rows=data.events.filter(isBenefit).filter(event=>posted(event.status)).filter(event=>tab==='all'||tab==='credits'&&signed(event)>0||tab==='debits'&&signed(event)<0).filter(event=>!normalize(query)||normalize([event.description,event.category?.name].join(' ')).includes(normalize(query))).sort((a,b)=>b.date.localeCompare(a.date));
  return <Panel title="Histórico do benefício" icon="list" className="meg-table-panel"><div className="evo-subtabs benefit">{[['all','Todas'],['credits','Entradas'],['debits','Saídas']].map(([key,label])=><button key={key} className={tab===key?'active':''} onClick={()=>setTab(key as typeof tab)}>{label}</button>)}</div><div className="evo-table-tools"><label><Icon name="search"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar no extrato do benefício"/></label></div><div className="meg-scroll"><table className="meg-table"><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Tipo</th><th>Valor</th><th/></tr></thead><tbody>{rows.map(event=><tr key={event.id}><td>{datePt(event.date)}</td><td>{event.description}</td><td>{event.category?.name||'Benefício'}</td><td><span className={'meg-pill '+(signed(event)>0?'green':'yellow')}>{signed(event)>0?'Recarga':'Consumo'}</span></td><td className={signed(event)>0?'green':'yellow'}>{signed(event)>0?'+ ':'− '}{money(Math.abs(signed(event)))}</td><td><button className="meg-row-edit" onClick={()=>onEdit(event)}><Icon name="note" size={17}/></button></td></tr>)}</tbody></table>{!rows.length?<p className="meg-empty">Nenhuma movimentação neste filtro.</p>:null}</div></Panel>
}

export function EvolutionPeriodOverview({data,events,label,openingBalance,closingBalance,onMovements}:{data:SystemData;events:FinancialEvent[];label:string;openingBalance?:number;closingBalance?:number;onMovements:()=>void}){
  const realized=events.filter(event=>posted(event.status)&&event.type!=='transfer'),income=sum(realized.filter(event=>signed(event)>0&&!isBenefit(event)).map(event=>signed(event))),expense=sum(realized.filter(event=>signed(event)<0&&!isBenefit(event)).map(event=>Math.abs(signed(event)))),result=income-expense,months=new Set(events.map(event=>String(event.competence||event.date).slice(0,7)).filter(Boolean));
  return <div className="meg-module-grid evo-period-overview"><header className="meg-page-head"><div><h1>{label}</h1><p>Visão consolidada do período selecionado.</p></div><Button primary icon="list" onClick={onMovements}>Ver lançamentos</Button></header><div className="meg-module-metrics">{openingBalance!==undefined?<Metric label="Saldo inicial" icon="wallet" value={openingBalance}/>:<Metric label="Meses com movimentos" icon="calendar" value={months.size}/>}<Metric label="Receitas realizadas" icon="up" tone="green" value={income}/><Metric label="Despesas realizadas" icon="down" tone="red" value={expense}/><Metric label="Resultado consolidado" icon="trend" value={result}/></div>{closingBalance!==undefined?<Panel title="Fechamento do intervalo" icon="wallet"><div className="meg-result-card"><small>Saldo ao fim do período</small><strong>{money(closingBalance)}</strong><span>Saldo atual de benefício {money(data.benefit.balance)}</span></div></Panel>:<Panel title="Posição atual" icon="wallet"><div className="meg-result-card"><small>Saldo monetário atual</small><strong>{money(Number(data.summary.availableBalance||0)+Number(data.summary.realizedResult||0))}</strong><span>Benefício atual {money(data.benefit.balance)}</span></div></Panel>}</div>
}
