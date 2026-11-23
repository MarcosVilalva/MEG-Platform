import {useEffect,useRef,useState} from 'react';
import type {FinancialEvent} from '../../app/finance-client';
import './historical-workbench-editor.css';

export type HistoricalExpenseEditPayload={
 description:string;notes:string;amount:number|undefined;
};

type Props={
 event:FinancialEvent;
 saving:boolean;
 onSave:(next:HistoricalExpenseEditPayload)=>Promise<void>;
 onBack:()=>void;
};

function parseEnteredMoney(value:string):number|null{
 const s=value.trim();
 if(!/^\d{1,12}(?:[.,]\d{1,2})?$/.test(s))return null;
 const amount=Number(s.replace(',','.'));
 if(!Number.isFinite(amount)||amount<=0||
  !Number.isSafeInteger(Math.round(amount*100)))return null;
 return amount;
}
function readError(value:unknown){
 if(value instanceof Error)return value.message;
 return 'Não foi possível confirmar esta edição. Nenhum salvamento foi considerado concluído.';
}
export function HistoricalExpenseWorkbenchEditor({event,saving,onSave,onBack}:Props){
 const inputRef=useRef<HTMLInputElement|null>(null);
 const [description,setDescription]=useState(event.description);
 const [notes,setNotes]=useState(event.notes??'');
 const [amountInput,setAmountInput]=useState(Number(event.amount).toFixed(2).replace('.',','));
 const [error,setError]=useState('');
 const amountEditable=event.status==='paid'&&Number(event.signedAmount)<0;
 useEffect(()=>{inputRef.current?.focus();},[]);
 useEffect(()=>{
  if(saving)return;
  const key=(e:KeyboardEvent)=>{
   if(e.key==='Escape'){e.preventDefault();onBack();}
  };
  document.addEventListener('keydown',key);
  return()=>document.removeEventListener('keydown',key);
 },[saving,onBack]);
 const save=async(e:React.FormEvent)=>{
  e.preventDefault();
  if(saving)return;
  if(description.trim().length<1||description.trim().length>160||notes.length>1000){
   setError('Verifique a descrição e as observações.');return;
  }
  const value=amountEditable?parseEnteredMoney(amountInput):undefined;
  if(amountEditable&&value===null){
   setError('Valor inválido. Use, por exemplo, 150,00.');return;
  }
  const amount=value===null?undefined:value;
  if(description.trim()===event.description&&notes.trim()===(event.notes??'')&&
   (!amountEditable||Math.round((amount??0)*100)===Math.round(Number(event.amount)*100))){
   setError('Nenhuma alteração foi informada.');return;
  }
  setError('');
  try{await onSave({description:description.trim(),notes:notes.trim(),amount});}
  catch(cause){setError(readError(cause));}
 };
 return <div className="meg-hist-edit-overlay" role="presentation">
  <section role="dialog" aria-modal="true" aria-labelledby="meg-hist-edit-title"
   className="meg-hist-edit-modal">
   <header className="meg-hist-edit-header">
    <div>
     <small>HOMOLOGAÇÃO LOCAL | LANÇAMENTO HISTÓRICO</small>
     <h2 id="meg-hist-edit-title">Editar lançamento</h2>
     <p>O salvamento será realizado somente na cópia isolada de homologação.</p>
    </div>
    <button type="button" aria-label="Fechar edição" onClick={onBack}
     disabled={saving}>×</button>
   </header>
   <form onSubmit={save} className="meg-hist-edit-form">
    <label>Descrição
     <input ref={inputRef} value={description} onChange={e=>setDescription(e.target.value)}
      required maxLength={160} disabled={saving}/>
    </label>
    <label>Valor (R$)
     <input value={amountInput} onChange={e=>setAmountInput(e.target.value)}
      inputMode="decimal" disabled={saving||!amountEditable}
      aria-describedby="meg-hist-edit-money-rule"/>
    </label>
    <p id="meg-hist-edit-money-rule" className="meg-hist-edit-note">
     {amountEditable?'Use duas casas decimais. A API verifica saldos posteriores antes de aumentar uma despesa.':
     'A alteração de valor deste status está protegida; somente descrição e observações podem ser editadas.'}
    </p>
    <label>Observações
     <textarea value={notes} onChange={e=>setNotes(e.target.value)}
      rows={4} maxLength={1000} disabled={saving}/>
    </label>
    <div className="meg-hist-edit-locked">
     <strong>Campos preservados nesta etapa</strong>
     <p>Data: {event.date.slice(0,10).split('-').reverse().join('/')}.
      Conta: {event.account?.name||'Vínculo histórico'}.
      Situação: {event.status}.
      Categoria e forma de pagamento continuam inalteradas.</p>
    </div>
    {error&&<p role="alert" className="meg-hist-edit-error">{error}</p>}
    <footer className="meg-hist-edit-buttons">
     <button type="button" disabled={saving} onClick={onBack}>Cancelar</button>
     <button type="submit" disabled={saving}>{saving?'Salvando...':'Salvar alterações'}</button>
    </footer>
   </form>
  </section>
 </div>;
}
