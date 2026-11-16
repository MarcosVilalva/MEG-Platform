import {useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import type {ExpenseCatalogs} from './ExpenseForm';
import type {QaLaunchTarget} from './LaunchActionsQa';
import './LaunchActionsQa.css';
import './BatchEditQa.css';

/** Etapa 10: prévia local, sem chamadas de rede, writes ou cálculo financeiro. */
type ChangeKey='description'|'notes'|'category'|'dueDate'|'payment'|'account'|'card'|'installments';
type Decision={item:QaLaunchTarget;status:'simulavel'|'protegido';reason:string;changes:string[]};
const options:ReadonlyArray<{id:ChangeKey;label:string;financial?:boolean}>=[
 {id:'description',label:'Alterar descrição'},
 {id:'notes',label:'Alterar observações'},
 {id:'category',label:'Alterar categoria'},
 {id:'dueDate',label:'Alterar data de vencimento',financial:true},
 {id:'payment',label:'Alterar forma de pagamento',financial:true},
 {id:'account',label:'Alterar conta de pagamento',financial:true},
 {id:'card',label:'Selecionar cartão e data da compra',financial:true},
 {id:'installments',label:'Alterar parcelamento',financial:true},
];
const isIso=(v:string)=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const d=new Date(v+'T12:00:00.000Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===v;};
const human=(v:string)=>isIso(v)?v.slice(8,10)+'/'+v.slice(5,7)+'/'+v.slice(0,4):'Não informada';
const nameOf=(items:readonly {id:string;name:string}[]|undefined,id:string)=>items?.find(x=>x.id===id)?.name||'Não selecionado';
const metadataKeys:ChangeKey[]=['description','notes','category'];

export function QaBatchEditor({items,catalogs,onClose,onSimulate}:{
 items:readonly QaLaunchTarget[];catalogs?:ExpenseCatalogs;onClose:()=>void;onSimulate:(count:number)=>void;
}){
 const [changes,setChanges]=useState<Partial<Record<ChangeKey,boolean>>>({});
 const [description,setDescription]=useState('');
 const [notes,setNotes]=useState('');
 const [notesMode,setNotesMode]=useState<'replace'|'append'>('replace');
 const [category,setCategory]=useState('');
 const [dueDate,setDueDate]=useState('');
 const [method,setMethod]=useState('');
 const [account,setAccount]=useState('');
 const [card,setCard]=useState('');
 const [purchaseDate,setPurchaseDate]=useState('');
 const [installments,setInstallments]=useState('1');
 const [review,setReview]=useState(false);
 const surface=useRef<HTMLElement|null>(null);
 const onCloseRef=useRef(onClose);onCloseRef.current=onClose;
 const closeButton=useRef<HTMLButtonElement|null>(null);
 const selected=options.filter(x=>changes[x.id]);
 const metadataOnly=selected.length>0&&selected.every(x=>!x.financial);
 const creditMethod=catalogs?.paymentMethods.find(x=>x.id===method)?.kind==='credit';
 const requiresCard=Boolean(changes.card|| (changes.payment&&creditMethod));
 const valid=selected.length>0
  &&(!changes.description||description.trim().length>0)
  &&(!changes.notes||notes.trim().length>0)
  &&(!changes.category||Boolean(category))
  &&(!changes.dueDate||isIso(dueDate))
  &&(!changes.payment||Boolean(method))
  &&(!changes.account||Boolean(account))
  &&(!requiresCard||(Boolean(card)&&isIso(purchaseDate)))
  &&(!changes.installments||Number.isInteger(Number(installments))&&Number(installments)>0&&Number(installments)<=48);
 const financialSelected=selected.some(x=>x.financial);
 const rows:Decision[]=useMemo(()=>items.map(item=>{
  const changesSummary:string[]=[];
  if(changes.description)changesSummary.push('Descrição: '+item.description+' → '+description.trim());
  if(changes.notes)changesSummary.push('Observações: '+(item.notes||'(vazio)')+' → '+(notesMode==='append'?(item.notes?item.notes+' | ':'')+notes.trim():notes.trim()));
  if(changes.category)changesSummary.push('Categoria: '+item.category+' → '+nameOf(catalogs?.categories,category));
  if(changes.dueDate)changesSummary.push('Vencimento solicitado: '+human(dueDate)+' (sem cálculo ou vínculo confirmado)');
  if(changes.payment)changesSummary.push('Pagamento solicitado: '+nameOf(catalogs?.paymentMethods,method)+' (pendente de domínio)');
  if(changes.account)changesSummary.push('Conta solicitada: '+nameOf(catalogs?.accounts,account)+' (pendente de saldo)');
  if(requiresCard)changesSummary.push('Cartão: '+nameOf(catalogs?.creditCards,card)+'; compra: '+human(purchaseDate)+'; fatura: aguardando autoridade canônica');
  if(changes.installments)changesSummary.push('Parcelamento solicitado: '+installments+' (sem alteração de parcela/fatura)');
  if(financialSelected){
   const reason=item.type!=='expense'?'Tipo de lançamento incompatível com este fluxo financeiro':
    item.accountKind==='benefit'?'Benefício exige writer próprio (incluindo Verocard)':
    item.status==='paid'||item.status==='reconciled'?'Registro realizado ou conciliado: requer reconciliação e auditoria':
    'Vínculo com pendência/cartão, versão e contrato transacional ainda não comprovados';
   return {item,status:'protegido' as const,reason,changes:changesSummary};
  }
  return {item,status:'simulavel' as const,
   reason:'Prévia de metadados somente visual; permissão de gravação exige confirmação do servidor',
   changes:changesSummary};
 }),[items,changes,description,notes,notesMode,category,dueDate,method,account,card,purchaseDate,installments,catalogs,requiresCard,financialSelected]);
 const canSimulate=review&&valid&&metadataOnly&&items.length>0;
 useEffect(()=>{
  const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
  const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
  closeButton.current?.focus();
  const key=(e:KeyboardEvent)=>{
   if(e.key==='Escape'){e.preventDefault();onCloseRef.current();return;}
   if(e.key!=='Tab')return;
   const nodes=[...(surface.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)')??[])].filter(x=>x.getClientRects().length>0);
   if(!nodes.length)return;
   if(e.shiftKey&&document.activeElement===nodes[0]){e.preventDefault();nodes[nodes.length-1].focus();}
   else if(!e.shiftKey&&document.activeElement===nodes[nodes.length-1]){e.preventDefault();nodes[0].focus();}
  };
  document.addEventListener('keydown',key);
  return ()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',key);previous?.focus();};
 },[]);
 const toggle=(key:ChangeKey,value:boolean)=>{setChanges(s=>({...s,[key]:value}));setReview(false);};
 const update=(fn:(s:string)=>void,value:string)=>{fn(value);setReview(false);};
 const cardData=catalogs?.creditCards?.find(x=>x.id===card);
 const kindCount=items.reduce((acc,item)=>{const k=item.type==='expense'?'Despesa':item.type==='income'?'Receita':item.type;acc[k]=(acc[k]||0)+1;return acc;},{} as Record<string,number>);
 return createPortal(<div className="meg-t10-qa-batch-backdrop">
  <section ref={surface} className="meg-t10-qa-batch meg-t10-qa-batch-v2" role="dialog" aria-modal="true" data-testid="qa-batch-dialog"
   aria-labelledby="meg-t10-batch-title" aria-describedby="meg-t10-batch-description">
   <header><div><span>MEG PRISM 2.0 · EDIÇÃO EM LOTE</span><h2 id="meg-t10-batch-title">Editar em lote ({items.length})</h2>
    <p id="meg-t10-batch-description">Escolha somente os campos a alterar. Nenhum lançamento será gravado nesta QA.</p>
   </div><button ref={closeButton} type="button" aria-label="Fechar edição em lote" onClick={onClose}>×</button></header>
   <div className="meg-t10-qa-batch-content">
    <div className="meg-t10-qa-batch-fields">
     <h3>Alterações solicitadas</h3>
     <p>Campos não marcados permanecem inalterados. Alterações financeiras requerem validação do domínio.</p>
     {options.map(option=><div key={option.id}>
      <label className="meg-t10-qa-batch-toggle">
       <input type="checkbox" checked={Boolean(changes[option.id])} onChange={e=>toggle(option.id,e.target.checked)}/>
       <span>{option.label}</span>{option.financial&&<small>Protegido</small>}
      </label>
      {changes[option.id]&&<div className="meg-t10-qa-batch-input">
       {option.id==='description'&&<label>Nova descrição<input aria-label="Nova descrição em lote" value={description} maxLength={120} onChange={e=>update(setDescription,e.target.value.toLocaleUpperCase('pt-BR'))}/></label>}
       {option.id==='notes'&&<><label>Tipo de alteração<select aria-label="Tratamento de observações" value={notesMode} onChange={e=>{setNotesMode(e.target.value as 'replace'|'append');setReview(false);}}>
        <option value="replace">Substituir</option><option value="append">Acrescentar texto</option></select></label>
        <label>Novas observações<textarea value={notes} onChange={e=>update(setNotes,e.target.value.toLocaleUpperCase('pt-BR'))} maxLength={500} placeholder="Digite as observações"/></label></>}
       {option.id==='category'&&<label>Nova categoria<select value={category} onChange={e=>update(setCategory,e.target.value)}><option value="">Selecione uma categoria</option>
        {catalogs?.categories.filter(c=>c.active).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
       {option.id==='dueDate'&&<label>Nova data de vencimento<input type="date" aria-label="Nova data de vencimento" value={dueDate} onChange={e=>update(setDueDate,e.target.value)}/><small>Somente despesas pendentes com origem e vínculos confirmados pela API.</small></label>}
       {option.id==='payment'&&<label>Nova forma de pagamento<select aria-label="Nova forma de pagamento" value={method} onChange={e=>update(setMethod,e.target.value)}>
        <option value="">Selecione uma forma</option>{catalogs?.paymentMethods.filter(x=>x.active).map(m=><option value={m.id} key={m.id}>{m.name}</option>)}
       </select></label>}
       {option.id==='account'&&<label>Nova conta<select aria-label="Nova conta" value={account} onChange={e=>update(setAccount,e.target.value)}>
        <option value="">Selecione uma conta</option>{catalogs?.accounts.filter(x=>x.active&&x.kind==='monetary').map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <small>Sem transferência ou movimentação de saldo nesta prévia.</small></label>}
       {option.id==='card'&&<p className="meg-t10-qa-batch-warning">Para cartão de crédito, informe cartão e data da compra no quadro abaixo. Benefícios pré-pagos não são cartões de crédito.</p>}
       {option.id==='installments'&&<label>Quantidade de parcelas<input aria-label="Quantidade de parcelas" type="number" min="1" max="48" step="1" value={installments} onChange={e=>update(setInstallments,e.target.value)}/>
        <small>Quantidade ilustrativa; nenhum parcelamento é gerado no frontend.</small></label>}
      </div>}
     </div>)}
     {requiresCard&&<div className="meg-t10-qa-batch-card">
      <h3>Dados da compra com cartão</h3>
      <label>Selecionar cartão<select aria-label="Selecionar cartão para edição em lote" value={card} onChange={e=>update(setCard,e.target.value)}>
       <option value="">Selecione o cartão</option>{catalogs?.creditCards?.filter(x=>x.active).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
      </select></label>
      <label>Data da compra<input type="date" aria-label="Data da compra em lote" value={purchaseDate} onChange={e=>update(setPurchaseDate,e.target.value)}/></label>
      <p role="note">Cartão: {cardData?.name||'Não selecionado'}. Fechamento: {cardData?.closingDay?'dia '+cardData.closingDay:'não informado'}.
       Vencimento contratual: {cardData?.dueDay?'dia '+cardData.dueDay:'não informado'}.</p>
      <div className="meg-t10-qa-batch-locked"><strong>Prévia da fatura indisponível nesta QA</strong>
       <p>A competência, o vencimento efetivo e as parcelas serão retornados pela autoridade financeira canônica. O navegador não realiza esses cálculos.</p></div>
     </div>}
    </div>
    <div className="meg-t10-qa-batch-selection">
     <h3>Registros selecionados <span>{items.length}</span></h3>
     <p>{Object.entries(kindCount).map(([k,v])=>k+': '+v).join(' · ')}</p>
     <ul>{items.map(item=><li key={item.id}><strong>{item.description}</strong>
      <span>{human(item.date)} · {item.category} · {item.type==='expense'?'Despesa':item.type==='income'?'Receita':item.type}</span></li>)}</ul>
     <div className="meg-t10-qa-batch-review">
      <h3>Conferência por registro</h3>
      {!review?<p>Selecione e preencha os campos, depois clique em Conferir alterações para visualizar Antes → Depois e impedimentos.</p>:
       <><p><strong>{financialSelected?0:rows.length} aptos apenas à simulação visual · {financialSelected?rows.length:0} protegidos</strong></p>
       <ol data-testid="qa-batch-preview">{rows.map(row=><li key={row.item.id} className={row.status==='protegido'?'is-protected':''}>
        <strong>{row.item.description}</strong><small>{row.status==='protegido'?'Protegido':'Somente prévia visual'}</small>
        <p>{row.reason}</p>{row.changes.map((v,i)=><p key={i}>{v}</p>)}
       </li>)}</ol></>}
     </div>
    </div>
   </div>
   <footer><span>{financialSelected?'Writer protegido. Não é possível simular efeito financeiro.':'QA isolada: sem PATCH, DELETE ou baixa.'}</span>
    <div><button type="button" className="secondary" onClick={onClose}>Cancelar</button>
     <button type="button" className="secondary" disabled={!valid} onClick={()=>setReview(true)}>Conferir alterações</button>
     <button type="button" className="primary" disabled={!canSimulate} onClick={()=>onSimulate(items.length)}>Simular alterações</button>
    </div>
   </footer>
  </section>
 </div>,document.body);
}
