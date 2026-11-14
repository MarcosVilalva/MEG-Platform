import {useEffect,useId,useMemo,useRef,useState,type ClipboardEvent,type KeyboardEvent,type RefObject,type CSSProperties} from 'react';
import {Icon} from '../components/Icon';
import {suggestionsFromCanonicalHistory,type HistorySnapshot} from './autocomplete-history';
import {normalizeFinancialTextInput} from './text-entry-policy';
import {EMPTY_BRL_INPUT,brlBackspace,brlDigit,brlFormatted,brlFromPasted,brlSignedDecimal,brlToggleSign,type BRLInput} from './brl-money-mask';
import './ExpenseForm.css';

/** Stage10: QA visual sem write. A projeção de parcelas vem exclusivamente do domínio canônico. */
export type ExpenseCatalogOption={id:string;name:string;active:boolean;icon?:string;frequencyRank?:number};
export type ExpenseCreditCard=ExpenseCatalogOption & {issuer?:string|null;brand?:string|null;lastFour?:string|null;closingDay?:number|null;dueDay?:number|null;color?:string|null};
export type ExpenseCatalogs={
 categories:readonly (ExpenseCatalogOption & {group?:string})[];
 creditCards?:readonly ExpenseCreditCard[];
 accounts:readonly (ExpenseCatalogOption & {kind:'monetary'|'benefit'|'investment'})[];
 paymentMethods:readonly (ExpenseCatalogOption & {kind:'ordinary'|'credit'|'benefit'})[];
};
export type ExpenseDraft={
 description:string;categoryId:string;accountId:string;paymentMethodId:string;modality:'cash'|'credit';
 date:string;amountInput:string;requestedStatus:'paid'|'planned';creditCardId:string;
 notes:string;installmentsInput:string;firstInstallmentDate:string;
};
export type InstallmentSchedule={
 cardId:string;purchaseDate:string;installments:number;amountDecimal:string;
 rows:readonly {sequence:number;dueDate:string;amountDecimal:string;competence:string}[];
 source:'canonical';
};
export type ExpenseFormProps={
 catalogs:ExpenseCatalogs;historySnapshot?:HistorySnapshot;
 schedule?:InstallmentSchedule;
 onBack:()=>void;onRequestSave?:(draft:ExpenseDraft)=>void;saveEnabled?:boolean;
 mode?:'create'|'edit';initialDraft?:ExpenseDraft;
};
export const EMPTY_EXPENSE_DRAFT:ExpenseDraft={
 description:'',categoryId:'',accountId:'',paymentMethodId:'',
 date:'',amountInput:'',requestedStatus:'paid',creditCardId:'',modality:'cash',
 notes:'',installmentsInput:'1',firstInstallmentDate:'',
};
const fmt=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
function dateBR(s:string){return /^\d{4}-\d{2}-\d{2}$/.test(s)?s.slice(8)+'/'+s.slice(5,7)+'/'+s.slice(0,4):'Não informada';}

export function normalizeEntryDate(text:string,currentYear:number):{display:string;iso:string}|null{
 const match=text.trim().match(/^(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{4}))?$/);
 if(!match)return null;
 const day=Number(match[1]),month=Number(match[2]),year=match[3]?Number(match[3]):currentYear;
 if(year<1||year>9999||month<1||month>12||day<1||day>31)return null;
 const actual=new Date(0);actual.setFullYear(year,month-1,day);actual.setHours(12,0,0,0);
 if(actual.getFullYear()!==year||actual.getMonth()!==month-1||actual.getDate()!==day)return null;
 const pad=(n:number)=>String(n).padStart(2,'0');
 return {display:pad(day)+'/'+pad(month)+'/'+String(year).padStart(4,'0'),iso:String(year).padStart(4,'0')+'-'+pad(month)+'-'+pad(day)};
}
/** Máscara de digitação, sem interpretar data inválida como válida. */
export function formatEntryDateTyping(text:string):string{
 const normalized=text.replace(/[.-]/g,'/').trim();
 if(/^\d{1,2}\/\d{0,2}(?:\/\d{0,4})?$/.test(normalized))return normalized;
 const digits=normalized.replace(/\D/g,'').slice(0,8);
 if(digits.length<=2)return digits;
 if(digits.length<=4)return digits.slice(0,2)+'/'+digits.slice(2);
 return digits.slice(0,2)+'/'+digits.slice(2,4)+'/'+digits.slice(4);
}
function nameOf(items:readonly ExpenseCatalogOption[],id:string){return items.find(x=>x.id===id)?.name??'Não selecionado';}
function CategoryGlyph({name}:{name:string}){
 const slug=name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const p=slug.includes('aliment')?'food':slug.includes('casa')||slug.includes('morad')?'house':slug.includes('transport')||slug.includes('combust')?'car':slug.includes('saude')||slug.includes('medic')?'heart':slug.includes('compra')?'bag':slug.includes('lazer')?'game':'tag';
 return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="meg-t10-category-glyph">
 {p==='food'?<><path d="M4 3v8m3-8v8m3-8v8M7 11v10M17 21V3c-4 2-5 5-5 10h5"/></>:
 p==='house'?<><path d="m3 11 9-8 9 8"/><path d="M5 10v11h14V10M10 21v-7h4v7"/></>:
 p==='car'?<><path d="M5 16H3v-5l3-6h12l3 6v5h-2M5 16h14M5 16v3h3v-3m8 0v3h3v-3M3 11h18"/></>:
 p==='heart'?<path d="M20.8 5.8c-2-2.7-6-2.4-8.8.7-2.8-3.1-6.8-3.4-8.8-.7-3.1 4.5 2.8 9.6 8.8 14.2 6-4.6 11.9-9.7 8.8-14.2Z"/>:
 p==='bag'?<><rect x="4" y="8" width="16" height="13" rx="2"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></>:
 p==='game'?<><rect x="3" y="7" width="18" height="12" rx="5"/><path d="M7 13h5m-2.5-2.5v5M16 12h.01M18 15h.01"/></>:
 <><path d="m3 12 9-9h9v9l-9 9-9-9Z"/><circle cx="17" cy="7" r="1"/></>}
 </svg>;
}
function OverlayKeys({root,onClose}:{root:RefObject<HTMLElement|null>;onClose:()=>void}){
 const onCloseRef=useRef(onClose);
 onCloseRef.current=onClose;
 useEffect(()=>{
  const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
  const old=document.body.style.overflow;
  document.body.style.overflow='hidden';
  root.current?.querySelector<HTMLElement>('input:not(:disabled),button:not(:disabled)')?.focus();
  function keys(event:globalThis.KeyboardEvent){
   if(event.key==='Escape'){event.preventDefault();onCloseRef.current();return;}
   if(event.key!=='Tab')return;
   const all=Array.from(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)')??[]).filter(x=>x.getClientRects().length>0);
   if(!all.length)return;
   if(event.shiftKey&&document.activeElement===all[0]){event.preventDefault();all[all.length-1].focus();}
   if(!event.shiftKey&&document.activeElement===all[all.length-1]){event.preventDefault();all[0].focus();}
  }
  document.addEventListener('keydown',keys);
  return()=>{document.body.style.overflow=old;document.removeEventListener('keydown',keys);previous?.focus();};
 },[root]);
 return null;
}
/** Mesmo SVG Prism usado no botão de fechar da prévia isolada de edição. */
function EditCloseGlyph(){
 const id=useId().replace(/:/g,'');
 const gradient='meg-t10-edit-close-'+id;
 return <svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke={'url(#'+gradient+')'} strokeWidth="2.55" strokeLinecap="round" aria-hidden="true" focusable="false" data-meg-prism="icon-2">
  <defs><linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff"/><stop offset=".48" stopColor="#a3fff4"/><stop offset="1" stopColor="#1ccbc6"/></linearGradient></defs>
  <path d="M5 5 19 19M19 5 5 19"/>
 </svg>;
}
export function ExpenseForm({catalogs,historySnapshot,schedule,onBack,onRequestSave,saveEnabled=false,mode='create',initialDraft}:ExpenseFormProps){
 const isEdit=mode==='edit';
 const [draft,setDraft]=useState<ExpenseDraft>(()=>initialDraft??EMPTY_EXPENSE_DRAFT);
 const [money,setMoney]=useState<BRLInput>(()=>initialDraft?.amountInput?brlFromPasted(initialDraft.amountInput):EMPTY_BRL_INPUT);
 const [dateText,setDateText]=useState(()=>initialDraft?.date?dateBR(initialDraft.date):'');
 const [dateError,setDateError]=useState(false);

 const [categoryPicker,setCategoryPicker]=useState(false);
 const [categoryPage,setCategoryPage]=useState(0);
 const [parcelModal,setParcelModal]=useState(false);
 const [mobileStep,setMobileStep]=useState<'data'|'payment'|'summary'>('data');
 const [suggestionsOpen,setSuggestionsOpen]=useState(false);
 const [notesOpen,setNotesOpen]=useState(false);
 useEffect(()=>{setNotesOpen(window.matchMedia('(min-width: 1025px) and (min-height: 760px)').matches);},[]);
 const formId=useId();
 const root=useRef<HTMLElement>(null);
 const categories=useMemo(()=>catalogs.categories.filter(x=>x.active),[catalogs.categories]);
 const accounts=useMemo(()=>catalogs.accounts.filter(x=>x.active&&x.kind==='monetary'),[catalogs.accounts]);
 const methods=useMemo(()=>catalogs.paymentMethods.filter(x=>x.active&&x.kind!=='benefit'),[catalogs.paymentMethods]);
 const visibleMethods=useMemo(()=>methods.filter(x=>x.kind==='ordinary'),[methods]);
 const cards=useMemo(()=>catalogs.creditCards?.filter(x=>x.active)??[],[catalogs.creditCards]);
 const frequent=useMemo(()=>categories.slice().sort((a,b)=>(a.frequencyRank??999)-(b.frequencyRank??999)||a.name.localeCompare(b.name,'pt-BR')).slice(0,5),[categories]);
 const suggestions=useMemo(()=>historySnapshot?suggestionsFromCanonicalHistory(historySnapshot,draft.description,5):[],[historySnapshot,draft.description]);
 const selectedAccount=accounts.find(x=>x.id===draft.accountId);
 const method=visibleMethods.find(x=>x.id===draft.paymentMethodId);
 const isCredit=draft.modality==='credit';
 const showSettlementAccount=!isCredit&&draft.requestedStatus==='paid';
 const selectedCard=cards.find(x=>x.id===draft.creditCardId);
 const requestedAmount=brlSignedDecimal(money);
 const isRefund=money.negative&&requestedAmount!==null;
 const isDirty=isEdit&&Boolean(initialDraft)&&(Object.keys(EMPTY_EXPENSE_DRAFT) as (keyof ExpenseDraft)[]).some(key=>draft[key]!==initialDraft![key]);
 const validPayment=isCredit?Boolean(selectedCard)&&/^[1-9]\d*$/.test(draft.installmentsInput):Boolean(method)&&(!showSettlementAccount||Boolean(selectedAccount));
 const canSave=Boolean(saveEnabled&&onRequestSave&&draft.description.trim()&&categories.some(x=>x.id===draft.categoryId)&&draft.date&&requestedAmount&&validPayment&&(!isCredit||isEdit)&&(!isEdit||isDirty));
 // A gravação continua desabilitada no QA. Para pendências, a API aceita accountId ausente,
 // mas qualquer writer real exigirá caracterização transacional antes de ser conectado.
 const currentSchedule=Boolean(schedule&&schedule.source==='canonical'&&schedule.cardId===draft.creditCardId&&schedule.purchaseDate===draft.date&&schedule.installments===Number(draft.installmentsInput)&&schedule.amountDecimal===requestedAmount&&schedule.rows.length===Number(draft.installmentsInput));
 const chosenCategory=categories.find(x=>x.id===draft.categoryId);
 const missingRequired=[
  ...(!draft.description.trim()?['Descrição']:[]),
  ...(!draft.date?['Data']:[]),
  ...(!requestedAmount||requestedAmount==='0.00'||requestedAmount==='-0.00'?['Valor']:[]),
  ...(!chosenCategory?['Categoria']:[]),
  ...(isCredit?[
   ...(!selectedCard?['Cartão']:[]),
   ...(!/^[1-9]\d*$/.test(draft.installmentsInput)?['Número de parcelas']:[])
  ]:[
   ...(!method?['Forma de pagamento']:[]),
   ...(showSettlementAccount&&!selectedAccount?['Conta de saída']:[])
  ])
 ];

 function patch<K extends keyof ExpenseDraft>(key:K,value:ExpenseDraft[K]){setDraft(old=>({...old,[key]:value}));}
 function completeDate(){
  if(!dateText.trim()){patch('date','');setDateError(false);return;}
  const parsed=normalizeEntryDate(dateText,new Date().getFullYear());
  if(parsed){setDateText(parsed.display);patch('date',parsed.iso);setDateError(false);}
  else{patch('date','');setDateError(true);}
 }
 function chooseCategory(id:string){patch('categoryId',id);setCategoryPicker(false);}
 function chooseModality(modality:'cash'|'credit'){
  setDraft(old=>({...old,modality,requestedStatus:modality==='credit'?'planned':'paid',accountId:modality==='cash'&&accounts.length===1?accounts[0].id:'',paymentMethodId:'',creditCardId:'',installmentsInput:'1'}));
  setParcelModal(false);
 }
 function chooseStatus(status:'paid'|'planned'){
  if(isCredit)return;
  setDraft(old=>({...old,requestedStatus:status,accountId:status==='paid'&&accounts.length===1?accounts[0].id:''}));
 }
 useEffect(()=>{
  // Catálogo ativo pode chegar após a seleção de Paga ou mudar em sessão.
  // Com uma só conta, preenche automaticamente; com várias, não presume escolha.
  if(!showSettlementAccount)return;
  const selectedValid=accounts.some(a=>a.id===draft.accountId);
  const expected=selectedValid?draft.accountId:accounts.length===1?accounts[0].id:'';
  if(draft.accountId!==expected)setDraft(old=>({...old,accountId:expected}));
 },[showSettlementAccount,accounts,draft.accountId]);
 function selectSuggestion(s:(typeof suggestions)[number]){
  const categoryId=categories.some(x=>x.id===s.categoryId)?s.categoryId??'':'';
  // Uma sugestão histórica não define conta de baixa: apenas uma conta ativa autoriza autopreenchimento.
  const accountId=accounts.length===1?accounts[0].id:'';
  const matchedMethod=methods.find(x=>x.id===s.paymentMethodId);
  const modality=matchedMethod?.kind==='credit'?'credit':'cash';
  const paymentMethodId=modality==='cash'&&matchedMethod?.kind==='ordinary'?matchedMethod.id:'';
  setDraft(old=>({...old,description:normalizeFinancialTextInput(s.description),categoryId,accountId:modality==='cash'?accountId:'',paymentMethodId,modality,requestedStatus:modality==='credit'?'planned':'paid',creditCardId:'',installmentsInput:'1'}));
  setSuggestionsOpen(false);
 }
 function changeMoney(next:BRLInput){
  setMoney(next);patch('amountInput',brlSignedDecimal(next)??'');
 }
 function moneyKeys(event:KeyboardEvent<HTMLInputElement>){
  if(event.ctrlKey||event.metaKey||event.altKey||event.key==='Tab'||event.key.startsWith('Arrow')||event.key==='Home'||event.key==='End')return;
  if(/^\d$/.test(event.key)){event.preventDefault();changeMoney(brlDigit(money,event.key));}
  else if(event.key==='Backspace'||event.key==='Delete'){event.preventDefault();changeMoney(brlBackspace(money));}
  else if(event.key==='-'||event.key==='Subtract'){event.preventDefault();changeMoney(brlToggleSign(money));}
  else if(event.key.length===1){event.preventDefault();}
 }
 function moneyPaste(event:ClipboardEvent<HTMLInputElement>){event.preventDefault();changeMoney(brlFromPasted(event.clipboardData.getData('text')));}
 return <div className="meg-t10-expense-backdrop">
  <section ref={root} className={'meg-t10-expense'+(isEdit?' meg-t10-edit':'')} role="dialog" aria-modal="true" aria-labelledby={formId+'title'} data-testid={isEdit?'stage10-edit-preview':undefined}>
   <OverlayKeys root={root} onClose={parcelModal?()=>setParcelModal(false):categoryPicker?()=>setCategoryPicker(false):onBack}/>
   <header className="meg-t10-expense-header">
    {!isEdit&&<button type="button" className="meg-t10-expense-head-icon" aria-label="Voltar à escolha do tipo" onClick={onBack}><Icon name="chevronLeft"/></button>}
    <span className="meg-t10-expense-title"><h2 id={formId+'title'}>{isEdit?'Editar lançamento':'Novo lançamento'}</h2><small><span className="meg-t10-expense-type"><Icon name="chevronDown"/> DESPESA</span> {isEdit?'Revise os dados do lançamento.':'Registre sua movimentação com segurança.'}</small></span>
    <span className="meg-t10-expense-head-actions">
     <button type="button" className="meg-t10-expense-head-save" aria-label={isEdit?'Salvar alterações':'Salvar lançamento'} title={isEdit?'Simulação QA: não grava dados financeiros':'Salvar lançamento'} disabled={!canSave} onClick={()=>onRequestSave?.({...draft,amountInput:requestedAmount??''})}><Icon name="plus"/> <span>{isEdit?'Salvar alterações':'Salvar'}</span></button>
     <button type="button" className="meg-t10-expense-head-icon" aria-label={isEdit?'Fechar edição':'Fechar formulário'} title={isEdit?'Descartar alterações e fechar':undefined} onClick={onBack}>{isEdit?<EditCloseGlyph/>:'×'}</button>
    </span>
   </header>
   <nav className="meg-t10-expense-mobile-nav" aria-label="Etapas do formulário">
    {([['data','Dados'],['payment','Pagamento'],['summary','Resumo']] as const).map(([value,label])=><button type="button" key={value} aria-current={mobileStep===value?'step':undefined} onClick={()=>setMobileStep(value)}>{label}</button>)}
   </nav>
   <div className="meg-t10-expense-grid">
    <section className={'meg-t10-expense-panel meg-t10-expense-primary'+(mobileStep==='data'?' is-step':'')} aria-label="Dados da despesa">
     <label htmlFor={formId+'description'}><Icon name="list"/> Descrição *</label>
     <input id={formId+'description'} aria-label={isEdit?'Descrição da edição':undefined} maxLength={160} value={draft.description} onChange={e=>{patch('description',normalizeFinancialTextInput(e.target.value));setSuggestionsOpen(true);}} placeholder="DESCREVA A DESPESA" autoComplete="off" aria-expanded={suggestionsOpen&&suggestions.length>0} aria-controls={formId+'suggestions'}/>
     {suggestionsOpen&&suggestions.length>0&&<div className="meg-t10-expense-suggestions" id={formId+'suggestions'} role="listbox" aria-label="Descrições do histórico">
      <strong className="meg-t10-expense-suggestions-title"><Icon name="list"/> Histórico relacionado</strong>
      {suggestions.slice(0,3).map(s=><button type="button" key={s.sourceEventId} role="option" aria-selected={false} onClick={()=>selectSuggestion(s)}>{s.description}<small>{s.categoryName??'Categoria indisponível'} · Sem copiar valor ou data</small></button>)}
     </div>}
     <fieldset className="meg-t10-expense-choice meg-t10-expense-modality"><legend>Modalidade de pagamento *</legend>
      <button type="button" aria-pressed={!isCredit} onClick={()=>chooseModality('cash')}><Icon name="card"/> À vista</button>
      <button type="button" aria-pressed={isCredit} onClick={()=>chooseModality('credit')}><Icon name="card"/> Crédito</button>
     </fieldset>
     {!isCredit&&<div className="meg-t10-expense-method-field">
      <label htmlFor={formId+'method'}><Icon name="card"/> Forma de pagamento *</label>
      <div className="meg-t10-expense-method-control">
       <Icon name="card"/>
       <select id={formId+'method'} value={draft.paymentMethodId} onChange={e=>patch('paymentMethodId',e.target.value)}><option value="">SELECIONE A FORMA</option>{visibleMethods.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select>
      </div>
     </div>}

     <label htmlFor={formId+'date'}><Icon name="calendar"/> Data do lançamento *</label>
     <div className="meg-t10-expense-date-entry">
      <input id={formId+'date'} type="text" inputMode="numeric" autoComplete="off" maxLength={10} placeholder="DD/MM/AAAA" value={dateText} aria-invalid={dateError} aria-describedby={formId+'datehint'} onChange={e=>{setDateText(formatEntryDateTyping(e.target.value));patch('date','');setDateError(false);}} onBlur={completeDate}/>
      <div className="meg-t10-expense-date-calendar" title="Selecionar data no calendário">
       <Icon name="calendar"/>
       <input type="date" className="meg-t10-expense-date-picker" aria-label="Selecionar data no calendário" title="Selecionar data no calendário" value={draft.date} onChange={e=>{const value=e.target.value;patch('date',value);setDateText(dateBR(value)==='Não informada'?'':dateBR(value));setDateError(false);}}/>
      </div>
     </div>
     <small className="meg-t10-expense-date-hint" id={formId+'datehint'}>{dateError?'Data inválida. Confira dia, mês e ano.':'Digite dia/mês e pressione Tab para completar o ano.'}</small>
     <label htmlFor={formId+'category'}><Icon name="list"/> Categoria *</label>
     <select id={formId+'category'} value={draft.categoryId} onChange={e=>chooseCategory(e.target.value)}>
      <option value="">SELECIONE UMA CATEGORIA</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
     </select>
     <div className="meg-t10-expense-frequent" aria-label="Categorias usadas com maior frequência">
      {frequent.map(c=><button key={c.id} type="button" className="meg-t10-expense-category" aria-pressed={draft.categoryId===c.id} onClick={()=>chooseCategory(c.id)}><CategoryGlyph name={c.name}/><span>{c.name}</span></button>)}
      {categories.length>5&&<button type="button" className="meg-t10-expense-category" aria-label="Mais categorias" onClick={()=>setCategoryPicker(true)}><Icon name="menu"/><span>Mais</span></button>}
     </div>
     <div className="meg-t10-expense-notes">
      <button type="button" className="meg-t10-expense-expand" aria-expanded={notesOpen} onClick={()=>setNotesOpen(o=>!o)}><Icon name="list"/> Observações (opcional) <Icon name="chevronDown"/></button>
      {notesOpen&&<textarea id={formId+'notes'} aria-label="Observações (opcional)" value={draft.notes} maxLength={1000} onChange={e=>patch('notes',normalizeFinancialTextInput(e.target.value))} placeholder="OBSERVAÇÕES ADICIONAIS"/>}
     </div>
    </section>
    <section className={'meg-t10-expense-panel meg-t10-expense-secondary'+(mobileStep==='payment'?' is-step':'')} aria-label="Dados de pagamento">
     <div className="meg-t10-expense-dual">
      <div><label htmlFor={formId+'amount'}><Icon name="card"/> Valor (R$) *</label>
       <div className="meg-t10-expense-money"><button type="button" aria-label="Alternar sinal para estorno" aria-pressed={money.negative} title="Estorno / valor negativo" onClick={()=>changeMoney(brlToggleSign(money))}>±</button>
        <input id={formId+'amount'} type="text" inputMode="numeric" autoComplete="off" aria-label="Valor *" value={brlFormatted(money)} onKeyDown={moneyKeys} onPaste={moneyPaste} onChange={e=>changeMoney(brlFromPasted(e.target.value))}/></div>
      </div>
     </div>
     <div className="meg-t10-expense-money-note" role="status">{isRefund?'ESTORNO / VALOR NEGATIVO': 'DIGITE OS CENTAVOS, SEM VÍRGULA'}</div>
     <fieldset className="meg-t10-expense-choice meg-t10-expense-status"><legend>Status solicitado *</legend>
      <button type="button" aria-pressed={draft.requestedStatus==='paid'} disabled={isCredit} onClick={()=>chooseStatus('paid')}><Icon name="card"/> Paga</button>
      <button type="button" aria-pressed={draft.requestedStatus==='planned'} disabled={isCredit} onClick={()=>chooseStatus('planned')}><Icon name="clock"/> Pendente</button>
     </fieldset>
     {showSettlementAccount&&<div className="meg-t10-expense-settlement-account">
      <label htmlFor={formId+'account'}><Icon name="card"/> Conta de saída do recurso *</label>
      <select id={formId+'account'} value={draft.accountId} onChange={e=>patch('accountId',e.target.value)}><option value="">SELECIONE A CONTA</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>
      {accounts.length===1&&<small>Conta monetária única preenchida automaticamente.</small>}
      {accounts.length===0&&<small role="status">Nenhuma conta monetária ativa disponível.</small>}
     </div>}
     {isCredit&&<div className="meg-t10-expense-credit"><div className="meg-t10-expense-credit-title"><Icon name="card"/> Cartão de crédito</div>
      <div className="meg-t10-expense-credit-fields">
       <div><label htmlFor={formId+'card'}>Cartão</label><select id={formId+'card'} value={draft.creditCardId} onChange={e=>patch('creditCardId',e.target.value)}><option value="">SELECIONE</option>{cards.map(c=><option key={c.id} value={c.id}>{c.name}{c.lastFour?' • '+c.lastFour:''}</option>)}</select></div>
       <div><label htmlFor={formId+'installments'}>Número de parcelas</label><input id={formId+'installments'} type="number" min="1" step="1" value={draft.installmentsInput} onChange={e=>patch('installmentsInput',e.target.value)}/></div>
      </div>
      {selectedCard&&<div className="meg-t10-credit-preview" aria-label="Identificação do cartão selecionado" style={{'--meg-card-accent':selectedCard.color||'#14e5d4'} as CSSProperties}>
       <div className="meg-t10-credit-mini"><span className="meg-t10-credit-mini-brand">{selectedCard.issuer||selectedCard.name}</span><Icon name="card"/><strong>{selectedCard.brand||'CARTÃO DE CRÉDITO'}</strong><small>{selectedCard.lastFour?'•••• '+selectedCard.lastFour:'Final não informado'}</small></div>
       <div className="meg-t10-credit-details"><strong>{selectedCard.name}</strong><span>Fechamento: {selectedCard.closingDay?'dia '+selectedCard.closingDay:'não informado'}</span><span>Vencimento: {selectedCard.dueDay?'dia '+selectedCard.dueDay:'não informado'}</span></div>
      </div>}
      <button type="button" className="meg-t10-expense-schedule-button" onClick={()=>setParcelModal(true)}><Icon name="calendar"/> Mostrar parcelamento <Icon name="chevronRight"/></button>
     </div>}
     {!isCredit&&<div className="meg-t10-expense-payment-context" aria-live="polite">
      <strong><Icon name="list"/> Conta e baixa</strong>
      <p>{draft.requestedStatus==='planned'?'A conta será informada na baixa da pendência.':selectedAccount?'Conta selecionada: '+selectedAccount.name+'. Saldo não consultado nesta prévia.':'Selecione uma conta monetária ativa para a saída do recurso.'}</p>
     </div>}

     {isRefund&&<p className="meg-t10-expense-refund-warning">Estorno sinalizado. A gravação deverá seguir o contrato financeiro específico, inclusive o do cartão.</p>}
    </section>
    <aside className={'meg-t10-expense-panel meg-t10-expense-summary'+(mobileStep==='summary'?' is-step':'')} aria-label="Resumo do lançamento">
     <h3><Icon name="list"/> Resumo do lançamento</h3>
     <p className="meg-t10-expense-checkline" aria-live="polite"><strong>Conferência:</strong> {missingRequired.length===0?'Campos obrigatórios preenchidos.':'Faltam: '+missingRequired.join(', ')+'.'}</p>
     <strong className={'meg-t10-expense-total'+(isRefund?' is-refund':'')}>{requestedAmount?fmt.format(Number(requestedAmount)):'VALOR NÃO INFORMADO'}</strong>
     {isRefund&&<span className="meg-t10-expense-refund-tag">ESTORNO</span>}
     <dl>
      <div><dt>Tipo</dt><dd>Despesa</dd></div>
      <div><dt>Categoria</dt><dd>{chosenCategory?.name??'Não selecionada'}</dd></div>
      <div><dt>Modalidade</dt><dd>{isCredit?'Crédito':'À vista'}</dd></div>
      {showSettlementAccount&&<div><dt>Conta de saída</dt><dd>{nameOf(accounts,draft.accountId)}</dd></div>}
      {!isCredit&&<div><dt>Pagamento</dt><dd>{nameOf(visibleMethods,draft.paymentMethodId)}</dd></div>}
      <div><dt>Data</dt><dd>{dateBR(draft.date)}</dd></div>
      <div><dt>Status solicitado</dt><dd>{isCredit?'Pendente':draft.requestedStatus==='paid'?'Paga':'Pendente'}</dd></div>
      {isCredit&&<div><dt>Cartão / parcelas</dt><dd>{nameOf(cards,draft.creditCardId)} · {draft.installmentsInput||'1'}x</dd></div>}
      {isCredit&&selectedCard&&<div><dt>Fecha / vence</dt><dd>{selectedCard.closingDay||'?' } / {selectedCard.dueDay||'?'}</dd></div>}
     </dl>
     <div className="meg-t10-expense-summary-footer"><Icon name="gift"/> Prévia fictícia, sem operações financeiras.</div>
    </aside>
   </div>
   {categoryPicker&&<div className="meg-t10-expense-suboverlay"><section className="meg-t10-expense-subdialog" role="dialog" aria-modal="true" aria-label="Todas as categorias">
    <header><h3>Selecionar categoria</h3><button type="button" aria-label="Fechar categorias" onClick={()=>setCategoryPicker(false)}>×</button></header>
    <div className="meg-t10-expense-category-grid">{categories.slice(categoryPage*12,(categoryPage+1)*12).map(c=><button key={c.id} type="button" aria-pressed={draft.categoryId===c.id} onClick={()=>chooseCategory(c.id)}><CategoryGlyph name={c.name}/>{c.name}</button>)}</div>
    <footer><button type="button" disabled={categoryPage===0} onClick={()=>setCategoryPage(p=>p-1)}>Anterior</button><span>{categoryPage+1} / {Math.max(1,Math.ceil(categories.length/12))}</span><button type="button" disabled={(categoryPage+1)*12>=categories.length} onClick={()=>setCategoryPage(p=>p+1)}>Próximo</button></footer>
   </section></div>}
   {parcelModal&&<div className="meg-t10-expense-suboverlay"><section className="meg-t10-expense-subdialog" role="dialog" aria-modal="true" aria-label="Mostrar parcelamento">
    <header><h3><Icon name="calendar"/> Parcelamento do cartão</h3><button type="button" aria-label="Fechar parcelamento" onClick={()=>setParcelModal(false)}>×</button></header>
    {currentSchedule&&schedule?<div className="meg-t10-expense-schedule-list"><p>Vencimentos e competências devolvidos pelo domínio financeiro.</p>{schedule.rows.map(r=><div key={r.sequence}><strong>{r.sequence}ª parcela</strong><span>Vence {dateBR(r.dueDate)}</span><span>{r.competence}</span><b>{fmt.format(Number(r.amountDecimal))}</b></div>)}</div>:
    <p className="meg-t10-expense-schedule-unavailable">A programação de vencimentos ainda não foi fornecida pela camada financeira canônica para este cartão, valor e data. Nenhuma parcela ou data será estimada pela tela.</p>}
    <footer><button type="button" onClick={()=>setParcelModal(false)}>Fechar</button></footer>
   </section></div>}
  </section>
 </div>;
}
