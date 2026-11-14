import {useEffect,useId,useState} from 'react';
import {Icon} from '../components/Icon';
import {normalizeFinancialTextInput} from './text-entry-policy';
import './ExpenseForm.css';
import './EditExpensePreview.css';

/**
 * Etapa 10: somente leitura de um snapshot fictício.
 * Não usa PATCH, fetch, writer, ledger, saldo, fatura nem exclusão.
 * O mesmo padrão de três colunas da Nova Despesa homologada é preservado,
 * mas esta apresentação NÃO afirma que edição monetária está autorizada.
 */
export type EditExpenseSnapshot={
 source:'financial-event';financialScope:'monetary';type:'expense';
 id:string;
 description:string;notes:string;
 categoryId:string;categoryName:string;
 dateDisplay:string;amountDisplay:string;
 paymentMethodName:string;accountName:string;statusLabel:string;
};
export const QA_EDIT_EXPENSE_SNAPSHOT:EditExpenseSnapshot={
 source:'financial-event',financialScope:'monetary',type:'expense',
 id:'qa-edit-event-001',
 description:'COMPRA DE MATERIAL PARA CASA',
 notes:'LANÇAMENTO FICTÍCIO PARA REVISÃO VISUAL',
 categoryId:'qa-category-house',categoryName:'Casa',
 dateDisplay:'10/11/2026',amountDisplay:'R$ 125,49',
 paymentMethodName:'PIX',accountName:'Conta corrente fictícia',
 statusLabel:'Paga',
};
/** Mesmo acabamento vetorial Prism usado no seletor, isolado na prévia de edição. */
function EditCloseGlyph(){
 const id=useId().replace(/:/g,'');
 const gradient='meg-t10-edit-close-'+id;
 return <svg viewBox="0 0 24 24" width="25" height="25" fill="none"
  stroke={'url(#'+gradient+')'} strokeWidth="2.55" strokeLinecap="round"
  aria-hidden="true" focusable="false" data-meg-prism="icon-2">
  <defs><linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
   <stop offset="0" stopColor="#ffffff"/>
   <stop offset=".48" stopColor="#a3fff4"/>
   <stop offset="1" stopColor="#1ccbc6"/>
  </linearGradient></defs>
  <path d="M5 5 19 19M19 5 5 19"/>
 </svg>;
}
export function EditExpensePreview({snapshot,onBack}:{
 snapshot:EditExpenseSnapshot;onBack:()=>void;
}){
 const formId=useId();
 const [description,setDescription]=useState(snapshot.description);
 const [notes,setNotes]=useState(snapshot.notes);
 const [mobileStep,setMobileStep]=useState<'data'|'payment'|'summary'>('data');
 const [notesOpen,setNotesOpen]=useState(false);
 useEffect(()=>{setNotesOpen(window.matchMedia('(min-width: 1025px) and (min-height: 760px)').matches);},[]);
 useEffect(()=>{
  const original=document.body.style.overflow;
  const focusBefore=document.activeElement instanceof HTMLElement?document.activeElement:null;
  document.body.style.overflow='hidden';
  const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();onBack();}};
  document.addEventListener('keydown',onKey);
  return()=>{document.removeEventListener('keydown',onKey);document.body.style.overflow=original;focusBefore?.focus();};
 },[onBack]);
 const recorded=snapshot.source==='financial-event'&&snapshot.financialScope==='monetary'&&snapshot.type==='expense';
 if(!recorded)return null;
 return <div className="meg-t10-expense-backdrop meg-t10-edit-backdrop">
  <section className="meg-t10-expense meg-t10-edit" role="dialog" aria-modal="true"
   aria-labelledby={formId+'title'} data-testid="stage10-edit-preview">
   <header className="meg-t10-expense-header">
    <button type="button" className="meg-t10-expense-head-icon" aria-label="Voltar aos lançamentos" onClick={onBack}><Icon name="chevronLeft"/></button>
    <span className="meg-t10-expense-title">
     <h2 id={formId+'title'}>Editar lançamento</h2>
     <small><span className="meg-t10-expense-type"><Icon name="chevronDown"/> DESPESA</span> Prévia visual do registro fictício.</small>
    </span>
    <span className="meg-t10-expense-head-actions">
     <button type="button" className="meg-t10-expense-head-save" aria-label="Salvar alterações" title="Edição financeira desabilitada" disabled><Icon name="plus"/> <span>Salvar alterações</span></button>
     <button type="button" className="meg-t10-expense-head-icon" aria-label="Fechar edição" title="Fechar edição" onClick={onBack}><EditCloseGlyph/></button>
    </span>
   </header>
   <nav className="meg-t10-expense-mobile-nav" aria-label="Etapas da edição">
    {([['data','Dados'],['payment','Pagamento'],['summary','Resumo']] as const).map(([value,label])=>
      <button type="button" key={value} aria-current={mobileStep===value?'step':undefined} onClick={()=>setMobileStep(value)}>{label}</button>)}
   </nav>
   <div className="meg-t10-expense-grid">
    <section className={'meg-t10-expense-panel meg-t10-expense-primary'+(mobileStep==='data'?' is-step':'')} aria-label="Dados da edição">
     <label htmlFor={formId+'description'}><Icon name="list"/> Descrição *</label>
     <input id={formId+'description'} maxLength={160} value={description} aria-label="Descrição da edição"
      onChange={e=>setDescription(normalizeFinancialTextInput(e.target.value))} autoComplete="off"/>
     <span className="meg-t10-edit-hint">Alteração local demonstrativa. Nenhum registro será modificado.</span>
     <label htmlFor={formId+'category'}><Icon name="list"/> Categoria do registro</label>
     <select id={formId+'category'} value={snapshot.categoryId} disabled aria-label="Categoria original">
      <option value={snapshot.categoryId}>{snapshot.categoryName}</option>
     </select>
     <p className="meg-t10-edit-readonly-note"><Icon name="clock"/> Categoria registrada, somente consulta.</p>
     <label htmlFor={formId+'date'}><Icon name="calendar"/> Data registrada</label>
     <input id={formId+'date'} type="text" value={snapshot.dateDisplay} disabled aria-label="Data original"/>
     <div className="meg-t10-expense-notes">
      <button type="button" className="meg-t10-expense-expand" aria-expanded={notesOpen} onClick={()=>setNotesOpen(o=>!o)}>
       <Icon name="list"/> Observações (opcional) <Icon name="chevronDown"/>
      </button>
      {notesOpen&&<textarea aria-label="Observações da edição" value={notes} maxLength={1000}
       onChange={e=>setNotes(normalizeFinancialTextInput(e.target.value))}/>}
     </div>
    </section>
    <section className={'meg-t10-expense-panel meg-t10-expense-secondary'+(mobileStep==='payment'?' is-step':'')} aria-label="Dados financeiros originais">
     <label htmlFor={formId+'amount'}><Icon name="card"/> Valor original (R$)</label>
     <input id={formId+'amount'} value={snapshot.amountDisplay} disabled aria-label="Valor original"/>
     <div className="meg-t10-edit-status">
      <span className="meg-t10-edit-status-label"><Icon name="clock"/> Status registrado</span>
      <output className="meg-t10-edit-status-value" aria-label="Status original">{snapshot.statusLabel}</output>
     </div>
     <label htmlFor={formId+'account'}><Icon name="card"/> Conta registrada</label>
     <input id={formId+'account'} disabled value={snapshot.accountName} aria-label="Conta original"/>
     <label htmlFor={formId+'method'}><Icon name="card"/> Forma de pagamento registrada</label>
     <input id={formId+'method'} disabled value={snapshot.paymentMethodName} aria-label="Forma de pagamento original"/>
     <div className="meg-t10-edit-protection" role="note">
      <strong><Icon name="clock"/> Campos financeiros protegidos</strong>
      <p>Valor, conta, status, categoria e data estão somente para consulta nesta prévia.
       Edição real exige caracterização e autorização do escritor financeiro.</p>
     </div>
    </section>
    <aside className={'meg-t10-expense-panel meg-t10-expense-summary'+(mobileStep==='summary'?' is-step':'')} aria-label="Resumo da edição">
     <h3><Icon name="list"/> Resumo do lançamento</h3>
     <p className="meg-t10-expense-checkline">Registro de demonstração, não vinculado a dados reais.</p>
     <strong className="meg-t10-expense-total">{snapshot.amountDisplay}</strong>
     <dl>
      <div><dt>Tipo</dt><dd>Despesa</dd></div>
      <div><dt>Descrição digitada</dt><dd>{description||'Não informada'}</dd></div>
      <div><dt>Categoria original</dt><dd>{snapshot.categoryName}</dd></div>
      <div><dt>Data original</dt><dd>{snapshot.dateDisplay}</dd></div>
      <div><dt>Forma de pagamento</dt><dd>{snapshot.paymentMethodName}</dd></div>
      <div><dt>Status registrado</dt><dd>{snapshot.statusLabel}</dd></div>
     </dl>
     <div className="meg-t10-expense-summary-footer"><Icon name="gift"/> Prévia fictícia, sem operações financeiras.</div>
    </aside>
   </div>
  </section>
 </div>;
}
