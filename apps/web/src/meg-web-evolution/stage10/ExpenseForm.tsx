import {useEffect,useId,useMemo,useState} from 'react';
import './ExpenseForm.css';

/** Etapa 10: formulário visual de despesa, sem nenhuma operação financeira.
 * IDs e rótulos de catálogos sempre vêm da fonte autorizada do chamador.
 * O componente não calcula saldo, parcela, competência ou status canônico.
 */
export type ExpenseCatalogOption={id:string;name:string;active:boolean};
export type ExpenseCatalogs={
 categories:readonly (ExpenseCatalogOption & {group?:string})[];
 /** Vínculo explícito fornecido pela autoridade do catálogo, nunca inferido por nome. */
 benefitBinding?:{categoryIds:readonly string[];accountId:string;paymentMethodId:string};
 creditCards?:readonly ExpenseCatalogOption[];
 accounts:readonly (ExpenseCatalogOption & {kind:'monetary'|'benefit'|'investment'})[];
 paymentMethods:readonly (ExpenseCatalogOption & {kind:'ordinary'|'credit'|'benefit'})[];
};
export type ExpenseDraft={
 description:string;categoryId:string;accountId:string;paymentMethodId:string;
 date:string; amountInput:string;requestedStatus:'paid'|'planned';creditCardId:string;
 notes:string;installmentsInput:string;firstInstallmentDate:string;
};
export type ExpenseFormProps={
 catalogs:ExpenseCatalogs;
 onBack:()=>void;
 onRequestSave?:(draft:ExpenseDraft)=>void;
 saveEnabled?:boolean;
};
export const EMPTY_EXPENSE_DRAFT:ExpenseDraft={
 description:'',categoryId:'',accountId:'',paymentMethodId:'',
 date:'',amountInput:'',requestedStatus:'paid',creditCardId:'',notes:'',installmentsInput:'1',firstInstallmentDate:'',
};
function catalogName(items:readonly ExpenseCatalogOption[],id:string){return items.find(x=>x.id===id)?.name??'Não selecionado';}
export function ExpenseForm({catalogs,onBack,onRequestSave,saveEnabled=false}:ExpenseFormProps){
 const [draft,setDraft]=useState<ExpenseDraft>(EMPTY_EXPENSE_DRAFT);
 const [summaryOpen,setSummaryOpen]=useState(true);
 const formId=useId();
 const categories=useMemo(()=>catalogs.categories.filter(x=>x.active),[catalogs.categories]);
 const accounts=useMemo(()=>catalogs.accounts.filter(x=>x.active),[catalogs.accounts]);
 const methods=useMemo(()=>catalogs.paymentMethods.filter(x=>x.active),[catalogs.paymentMethods]);
 const cards=useMemo(()=>catalogs.creditCards?.filter(x=>x.active)??[],[catalogs.creditCards]);
 const binding=catalogs.benefitBinding;
 const lockedBenefit=Boolean(binding?.categoryIds.includes(draft.categoryId));
 const configuredBenefit=lockedBenefit&&accounts.some(x=>x.id===binding?.accountId&&x.kind==='benefit')&&methods.some(x=>x.id===binding?.paymentMethodId&&x.kind==='benefit');
 const category=categories.find(x=>x.id===draft.categoryId);
 const account=accounts.find(x=>x.id===draft.accountId);
 const method=methods.find(x=>x.id===draft.paymentMethodId);
 const isCredit=method?.kind==='credit';
 const isBenefit=lockedBenefit||account?.kind==='benefit'||method?.kind==='benefit';
 const hasRequired=!!draft.description.trim()&&!!category&&!!account&&!!method&&!!draft.date&&!!draft.amountInput.trim();
 const amountValid=/^\d+(?:[.,]\d{1,2})?$/.test(draft.amountInput.trim())&&Number(draft.amountInput.replace(',','.'))>0;
 const requiresDomainReview=isCredit||isBenefit||account?.kind==='investment';
 const canRequestSave=saveEnabled&&Boolean(onRequestSave)&&hasRequired&&amountValid&&!requiresDomainReview;
 function patch<K extends keyof ExpenseDraft>(key:K,value:ExpenseDraft[K]){setDraft(current=>({...current,[key]:value}));}
 function chooseCategory(id:string){
  if(id&&binding?.categoryIds.includes(id)){
   // A prévia congela a seleção e exige vínculo resolvido pelo catálogo canônico.
   setDraft(current=>({...current,categoryId:id,accountId:binding.accountId,paymentMethodId:binding.paymentMethodId,requestedStatus:'paid',creditCardId:''}));
  }else setDraft(current=>({...current,categoryId:id}));
 }
 useEffect(()=>{function esc(event:KeyboardEvent){if(event.key==='Escape')onBack();}document.addEventListener('keydown',esc);return()=>document.removeEventListener('keydown',esc);},[onBack]);
 return <div className="meg-t10-expense-backdrop">
  <section className="meg-t10-expense" role="dialog" aria-modal="true" aria-labelledby={formId+'title'} aria-describedby={formId+'help'}>
   <header className="meg-t10-expense-header">
    <button type="button" aria-label="Voltar à escolha do tipo" onClick={onBack}>‹</button>
    <div><h2 id={formId+'title'}>Novo lançamento</h2><p id={formId+'help'}><span className="meg-t10-expense-type">↓ Despesa</span> Registre uma nova movimentação financeira.</p></div>
    <button type="button" aria-label="Fechar formulário" onClick={onBack}>×</button>
   </header>
   <div className="meg-t10-expense-grid">
    <div className="meg-t10-expense-panel">
     <label htmlFor={formId+'description'}>Descrição *</label>
     <input id={formId+'description'} maxLength={160} value={draft.description} onChange={e=>patch('description',e.target.value)} placeholder="Descreva a despesa" autoFocus/>
     <small className="meg-t10-expense-count">{draft.description.length}/160</small>
     <label htmlFor={formId+'category'}>Categoria *</label>
     <select id={formId+'category'} value={draft.categoryId} onChange={e=>chooseCategory(e.target.value)}>
      <option value="">Selecione uma categoria</option>
      {categories.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
     </select>
     <div className="meg-t10-expense-chips" aria-label="Categorias disponíveis">
      {categories.slice(0,5).map(x=><button key={x.id} type="button" aria-pressed={draft.categoryId===x.id} onClick={()=>chooseCategory(x.id)}>{x.name}</button>)}
     </div>
     <label htmlFor={formId+'account'}>Conta *</label>
     <select id={formId+'account'} value={draft.accountId} disabled={lockedBenefit} onChange={e=>patch('accountId',e.target.value)}>
      <option value="">Selecione a conta</option>
      {accounts.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
     </select>
     <label htmlFor={formId+'method'}>Forma de pagamento *</label>
     <select id={formId+'method'} value={draft.paymentMethodId} disabled={lockedBenefit} onChange={e=>patch('paymentMethodId',e.target.value)}>
      <option value="">Selecione a forma de pagamento</option>
      {methods.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
     </select>
     {isBenefit&&<p className="meg-t10-expense-notice" role="alert">{configuredBenefit?'Alimentação: Conta Benefício, Verocard e Pago selecionados e travados por vínculo explícito do catálogo.':'Operação de benefício: vínculo autorizado de Conta Benefício + Verocard + Pago não resolvido.'} Este formulário não grava pelo escritor monetário.</p>}
    </div>
    <div className="meg-t10-expense-panel">
     <div className="meg-t10-expense-row">
      <div><label htmlFor={formId+'date'}>Data do lançamento *</label><input id={formId+'date'} type="date" value={draft.date} onChange={e=>patch('date',e.target.value)}/></div>
      <div><label htmlFor={formId+'amount'}>Valor *</label><input id={formId+'amount'} inputMode="decimal" value={draft.amountInput} onChange={e=>patch('amountInput',e.target.value)} placeholder="0,00" aria-describedby={formId+'amount-error'}/></div>
     </div>
     {draft.amountInput&&!amountValid&&<p id={formId+'amount-error'} className="meg-t10-expense-error">Informe um valor positivo com até duas casas decimais.</p>}
     <fieldset className="meg-t10-expense-status"><legend>Status solicitado *</legend>
      <button type="button" aria-pressed={draft.requestedStatus==='paid'} onClick={()=>patch('requestedStatus','paid')}>✓ Paga</button>
      <button type="button" disabled={lockedBenefit} aria-pressed={draft.requestedStatus==='planned'} onClick={()=>patch('requestedStatus','planned')}>◷ Pendente</button>
      <small>O status efetivo é definido pela política financeira central, não pela tela.</small>
     </fieldset>
     {isCredit&&<fieldset className="meg-t10-expense-installments"><legend>Parcelamento (cartão de crédito)</legend>
      <label htmlFor={formId+'card'}>Cartão</label>
      <select id={formId+'card'} value={draft.creditCardId} onChange={e=>patch('creditCardId',e.target.value)}><option value="">Selecione o cartão</option>{cards.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
      <label htmlFor={formId+'installments'}>Número de parcelas</label>
      <input type="number" min="1" step="1" id={formId+'installments'} value={draft.installmentsInput} onChange={e=>patch('installmentsInput',e.target.value)}/>
      <label htmlFor={formId+'firstDate'}>Primeira parcela em</label>
      <input type="date" id={formId+'firstDate'} value={draft.firstInstallmentDate} onChange={e=>patch('firstInstallmentDate',e.target.value)}/>
      <small>Valores de parcelas, competência e vencimentos serão definidos exclusivamente pelo domínio de cartões. Nenhum valor é calculado neste formulário.</small>
     </fieldset>}
     <label htmlFor={formId+'notes'}>Observações (opcional)</label>
     <textarea id={formId+'notes'} maxLength={1000} value={draft.notes} onChange={e=>patch('notes',e.target.value)} placeholder="Informações adicionais da despesa"/>
     <small className="meg-t10-expense-count">{draft.notes.length}/1000</small>
    </div>
    <aside className="meg-t10-expense-panel meg-t10-expense-summary">
     <button className="meg-t10-expense-summary-toggle" type="button" aria-expanded={summaryOpen} onClick={()=>setSummaryOpen(x=>!x)}>Resumo do lançamento <span aria-hidden="true">{summaryOpen?'⌃':'⌄'}</span></button>
     {summaryOpen&&<div><p>Confira os detalhes antes de salvar.</p>
      <strong className="meg-t10-expense-amount">{draft.amountInput?'R$ '+draft.amountInput:'R$ 0,00'}</strong>
      <dl>
       <div><dt>Tipo</dt><dd>Despesa</dd></div>
       <div><dt>Categoria</dt><dd>{catalogName(categories,draft.categoryId)}</dd></div>
       <div><dt>Conta</dt><dd>{catalogName(accounts,draft.accountId)}</dd></div>
       <div><dt>Forma de pagamento</dt><dd>{catalogName(methods,draft.paymentMethodId)}</dd></div>
       <div><dt>Data</dt><dd>{draft.date||'Não informada'}</dd></div>
       <div><dt>Status solicitado</dt><dd>{draft.requestedStatus==='paid'?'Paga':'Pendente'}</dd></div>
      </dl>
     </div>}
     {categories.length>0&&<div className="meg-t10-expense-frequent"><h3>Categorias disponíveis</h3><div className="meg-t10-expense-chips">{categories.slice(0,6).map(x=><button key={x.id} type="button" aria-pressed={draft.categoryId===x.id} onClick={()=>patch('categoryId',x.id)}>{x.name}</button>)}</div></div>}
    </aside>
   </div>
   <footer className="meg-t10-expense-footer">
    <button type="button" className="meg-t10-expense-back" onClick={onBack}>‹ Voltar</button>
    <button type="button" className="meg-t10-expense-save" disabled={!canRequestSave} onClick={()=>onRequestSave?.(draft)}>✓ Salvar lançamento</button>
   </footer>
   <p className="meg-t10-expense-footnote" role="status">{!saveEnabled?'Prévia visual de homologação. Gravação desabilitada, sem conexão com API.':requiresDomainReview?'Contrato financeiro específico exige validação antes da gravação.':''}</p>
  </section>
 </div>;
}
