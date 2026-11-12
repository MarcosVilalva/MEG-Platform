import {useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {stage10Fixture} from './stage10.fixture.js';
import './launch-editor-stage10.css';

/**
 * Exclusivamente PR de PREVIA VISUAL da Etapa 10. Sem import de auth-client,
 * fetch, writes, saldos, faturas, parcelamento calculado ou backend. O domínio
 * financeiro real deve fornecer status/competência/parcelas/resumos depois.
 * Não considerar "Salvar" ou "Excluir" habilitados para dados reais.
 */
type LaunchKind='expense'|'income';
type EditorMode='create'|'edit';
type Props={kind:LaunchKind;mode?:EditorMode;onBack:()=>void;onClose:()=>void;onInspectEdit?:()=>void};
const previewDate='2026-11-12'; // data de fixture, não indicador de vencimento/status
const sample=stage10Fixture.transactions[0];
const moneyMask=(raw:string)=>raw.replace(/[^0-9,]/g,'').slice(0,12);
const formatDate=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)?s.slice(8)+'/'+s.slice(5,7)+'/'+s.slice(0,4):'—';
function CategoryGlyph({id}:{id:string}){
 const paths:Record<string,React.ReactNode>={
  'qa-food':<><path d="M4 3v8M7 3v8M10 3v8M4 7h6M7 11v10M16 3c-3 4-3 8 0 11h3V3M19 14v7"/></>,
  'qa-home':<><path d="m3 11 9-8 9 8M5 10v10h14V10M9 20v-6h6v6"/></>,
  'qa-transport':<><path d="m4 15 2-7h12l2 7M3 15h18v5H3zM6 20v2M18 20v2M7 11h10"/></>,
  'qa-health':<path d="M20 8c0-4-5-6-8-2-3-4-8-2-8 2 0 5 8 11 8 11s8-6 8-11Z"/>,
  'qa-shopping':<><path d="M4 8h16l-1 13H5L4 8ZM9 9V6a3 3 0 0 1 6 0v3"/></>,
  'qa-fixed':<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  'qa-salary':<><path d="M3 6h18v12H3zM8 12h8M12 9v6M4 3h16"/></>,
 };
 return <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
  stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
  aria-hidden="true" focusable="false">{paths[id]||paths['qa-shopping']}</svg>;
}

export function LaunchEditorStage10({kind,mode='create',onBack,onClose,onInspectEdit}:Props){
 const isEdit=mode==='edit';
 const [description,setDescription]=useState(isEdit?sample.description:'');
 const [categoryId,setCategoryId]=useState(isEdit?sample.categoryId:kind==='income'?'qa-salary':'qa-home');
 const [accountId,setAccountId]=useState(isEdit?sample.accountId:'qa-current');
 const [methodId,setMethodId]=useState(isEdit?sample.paymentMethodId:'qa-pix');
 const [date,setDate]=useState(isEdit?sample.date:previewDate);
 const [amount,setAmount]=useState(isEdit?sample.amount.replace('.',','):'');
 const [status,setStatus]=useState<'paid'|'planned'>(isEdit?'planned':kind==='income'?'paid':'planned');
 const [notes,setNotes]=useState('');
 const [installments,setInstallments]=useState(1);
 const [cardId,setCardId]=useState('qa-card');
 const [suggestionsOpen,setSuggestionsOpen]=useState(false);
 const [summaryOpen,setSummaryOpen]=useState(true);
 const [message,setMessage]=useState('');
 const [invalid,setInvalid]=useState(false);
 const dialogRef=useRef<HTMLElement>(null);
 const firstRef=useRef<HTMLInputElement>(null);
 const food=kind==='expense'&&categoryId==='qa-food';
 const fixed=kind==='expense'&&categoryId==='qa-fixed';
 const credit=kind==='expense'&&!food&&methodId==='qa-credit';
 const categories=stage10Fixture.categories.filter(c=>c.type===kind&&c.isActive);
 const methods=stage10Fixture.paymentMethods.filter(m=>m.isActive&&(kind==='expense'||m.id!=='qa-credit'));
 const historicSuggestions=useMemo(()=>{
  const term=description.trim().toLocaleLowerCase('pt-BR');
  if(term.length<2)return [];
  return stage10Fixture.transactions.filter(t=>t.type===kind&&t.description.toLocaleLowerCase('pt-BR').includes(term)).slice(0,5);
 },[description,kind]);
 const selectedCategory=stage10Fixture.categories.find(c=>c.id===categoryId)?.name||'Não selecionada';
 const selectedAccount=stage10Fixture.accounts.find(a=>a.id===accountId)?.name||'Não selecionada';
 const selectedMethod=stage10Fixture.paymentMethods.find(m=>m.id===methodId)?.name||'Não selecionada';
 const selectedCard=stage10Fixture.cards.find(c=>c.id===cardId)?.name||'Não selecionado';
 const validDate=/^\d{4}-\d{2}-\d{2}$/.test(date)&&!Number.isNaN(new Date(date+'T12:00:00Z').getTime())
  &&new Date(date+'T12:00:00Z').toISOString().slice(0,10)===date;
 const validAmount=/^\d{1,9}(,\d{1,2})?$/.test(amount)&&!/^0+(,0{1,2})?$/.test(amount);
 const valid=description.trim().length>=2&&validDate&&validAmount&&Boolean(categoryId)&&Boolean(accountId)&&Boolean(methodId);

 const chooseCategory=(id:string)=>{
  setCategoryId(id);setMessage('');setInvalid(false);
  if(id==='qa-food'){
   setAccountId('qa-benefit');setMethodId('qa-verocard');setStatus('paid');
  }else if(food){
   setAccountId('qa-current');setMethodId('qa-pix');setStatus('planned');
  }
 };
 const selectHistoric=(item:(typeof stage10Fixture.transactions)[number])=>{
  // Regra do PDF: descrição, categoria, conta e método. NUNCA valor/data.
  setDescription(item.description);
  chooseCategory(item.categoryId);
  if(item.categoryId!=='qa-food'){
   setAccountId(item.accountId);setMethodId(item.paymentMethodId);
  }
  setSuggestionsOpen(false);
 };
 const checkPreview=(event:React.FormEvent<HTMLFormElement>)=>{
  event.preventDefault();setInvalid(true);
  setMessage(valid
   ? 'Prévia visual preenchida. Nenhum lançamento foi gravado, alterado ou excluído.'
   : 'Confira descrição, categoria, conta, método, data e valor. Nenhum dado foi enviado.');
 };
 useEffect(()=>{
  const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
  const overflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  firstRef.current?.focus();
  const onKey=(e:KeyboardEvent)=>{
   if(e.key==='Escape'){e.preventDefault();onClose();return;}
   if(e.key!=='Tab')return;
   const nodes=[...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])')||[])].filter(n=>n.getClientRects().length>0);
   if(nodes.length===0)return;
   const first=nodes[0],last=nodes[nodes.length-1];
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  };
  document.addEventListener('keydown',onKey);
  return()=>{document.removeEventListener('keydown',onKey);document.body.style.overflow=overflow;previous?.focus();};
 },[onClose]);
 return createPortal(
 <div className="meg-stage10-backdrop" data-testid="stage10-visual-only">
  <section className={'meg-stage10-dialog'+(isEdit?' is-edit':'')} ref={dialogRef} role="dialog" aria-modal="true"
   aria-labelledby="stage10-title" aria-describedby="stage10-description" tabIndex={-1}>
   <header className="meg-stage10-header">
    <button type="button" className="meg-stage10-icon-button" aria-label="Voltar à escolha" onClick={onBack}>‹</button>
    <div className="meg-stage10-header-mark" aria-hidden="true">▤</div>
    <div className="meg-stage10-heading">
     <h2 id="stage10-title">{isEdit?'Editar lançamento':'Novo lançamento'}</h2>
     <p id="stage10-description">{isEdit?'Confira as informações deste registro fictício.':'Registre uma movimentação de forma completa, rápida e segura.'}</p>
    </div>
    <span className="meg-stage10-kind" data-kind={kind}>{kind==='expense'?'↓ Despesa':'↑ Receita'}</span>
    <button type="button" className="meg-stage10-icon-button meg-stage10-close" onClick={onClose} aria-label="Fechar">×</button>
   </header>
   <form onSubmit={checkPreview} className="meg-stage10-form" noValidate>
    <div className="meg-stage10-main">
     <div className="meg-stage10-panel meg-stage10-fields">
      <label className="meg-stage10-label" htmlFor="stage10-description-field">Descrição <b>*</b></label>
      <div className="meg-stage10-autocomplete">
       <input id="stage10-description-field" ref={firstRef} autoComplete="off"
        maxLength={300} value={description} placeholder={kind==='expense'?'Digite a descrição da despesa, ex.: Conta de luz...':'Digite a descrição da receita...'}
        onChange={e=>{setDescription(e.target.value);setSuggestionsOpen(true);setMessage('');}}
        aria-invalid={invalid&&description.trim().length<2} aria-autocomplete="list"
        aria-expanded={suggestionsOpen&&historicSuggestions.length>0} aria-controls="stage10-history-list"/>
       <small className="meg-stage10-counter">{description.length}/300</small>
       {suggestionsOpen&&historicSuggestions.length>0&&
        <div className="meg-stage10-suggestions" id="stage10-history-list" role="listbox" aria-label="Histórico fictício">
         {historicSuggestions.map(item=><button type="button" role="option" aria-selected="false" key={item.id}
          onClick={()=>selectHistoric(item)}>{item.description}<small>Usar categoria, conta e método. Sem copiar data e valor.</small></button>)}
        </div>}
      </div>
      <label className="meg-stage10-label" htmlFor="stage10-category">Categoria <b>*</b></label>
      <select id="stage10-category" value={categoryId} onChange={e=>chooseCategory(e.target.value)}>
       {categories.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}
      </select>
      <div className="meg-stage10-category-chips" aria-label="Categorias mais usadas">
       {categories.slice(0,5).map(cat=><button type="button" key={cat.id} onClick={()=>chooseCategory(cat.id)}
        aria-pressed={categoryId===cat.id} className={categoryId===cat.id?'is-active':''}>
        <span aria-hidden="true"><CategoryGlyph id={cat.id}/></span>{cat.name}</button>)}
      </div>
      <span className="meg-stage10-label">Classificação da conta</span>
      <div className="meg-stage10-segmented">
       <button type="button" aria-pressed={!food} disabled={food} className={!food?'is-active':''}>Contas gerais</button>
       <button type="button" disabled title="Catálogo de investimentos não autorizado para esta prévia">Investimentos</button>
       <button type="button" aria-pressed={food} disabled={!food} className={food?'is-active':''}>Benefício</button>
      </div>
      <span className="meg-stage10-label">Tipo de conta <b>*</b></span>
      <div className="meg-stage10-segmented">
       <button type="button" disabled={food} className={!food?'is-active':''}>Conta monetária</button>
       <button type="button" disabled={!food} className={food?'is-active':''}>Conta benefício</button>
      </div>
      <label className="meg-stage10-label" htmlFor="stage10-account">Conta <b>*</b></label>
      <select id="stage10-account" value={accountId} disabled={food}
       onChange={e=>setAccountId(e.target.value)}>
       {stage10Fixture.accounts.filter(a=>food?a.type==='benefit':a.type!=='benefit').map(a=>
        <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      <label className="meg-stage10-label" htmlFor="stage10-method">Forma de pagamento <b>*</b></label>
      <select id="stage10-method" disabled={food} value={methodId}
       onChange={e=>{setMethodId(e.target.value);setMessage('');}}>
       {methods.filter(m=>food?m.id==='qa-verocard':m.id!=='qa-verocard').map(m=>
        <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
      {food&&<p className="meg-stage10-rule"><strong>Alimentação:</strong> Conta Benefício + Verocard + Pago. Vínculos protegidos pela regra oficial; não movimenta conta monetária.</p>}
     </div>
     <div className="meg-stage10-panel meg-stage10-details">
      <div className="meg-stage10-two">
       <div><label className="meg-stage10-label" htmlFor="stage10-date">Data do lançamento <b>*</b></label>
       <input id="stage10-date" type="date" value={date} aria-invalid={invalid&&!validDate}
        onChange={e=>{setDate(e.target.value);setMessage('');}}/></div>
       <div><label className="meg-stage10-label" htmlFor="stage10-value">Valor <b>*</b></label>
       <div className="meg-stage10-price-input"><span>R$</span><input id="stage10-value" inputMode="decimal" type="text"
         placeholder="0,00" value={amount} aria-invalid={invalid&&!validAmount}
         onChange={e=>{setAmount(moneyMask(e.target.value));setMessage('');}}/></div></div>
      </div>
      <span className="meg-stage10-label">Status</span>
      {food||fixed||kind==='income'||credit?
       <p className="meg-stage10-rule">{food?'Pago (benefício).':fixed?'Fixo: realização definida pelo domínio.':kind==='income'?'Receita: realização definida pelo domínio.':'Cartão: status e fatura definidos pelo domínio.'}
        <small>Na operação real, apenas o servidor confirma o status.</small></p>:
       <div className="meg-stage10-segmented">
        <button type="button" className={status==='paid'?'is-active':''} onClick={()=>setStatus('paid')}>✓ Paga</button>
        <button type="button" className={status==='planned'?'is-active':''} onClick={()=>setStatus('planned')}>◷ Pendente</button>
       </div>}
      {credit&&<fieldset className="meg-stage10-installments">
        <legend>Parcelamento (Cartão de crédito)</legend>
        <label htmlFor="stage10-card" className="meg-stage10-label">Cartão</label>
        <select id="stage10-card" value={cardId} onChange={e=>setCardId(e.target.value)}>
         {stage10Fixture.cards.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="meg-stage10-two">
         <div><label className="meg-stage10-label" htmlFor="stage10-installments">Número de parcelas</label>
         <input id="stage10-installments" type="number" min={1} max={48} step={1} value={installments}
          onChange={e=>setInstallments(Math.max(1,Math.min(48,Number(e.target.value)||1)))}/></div>
         <div><span className="meg-stage10-label">Valor de cada parcela</span>
         <p className="meg-stage10-unknown">Calculado pelo servidor</p></div>
        </div>
        <p className="meg-stage10-small">Competência e vencimento calculados no domínio de cartões, conforme fechamento e data da compra.</p>
       </fieldset>}
      <label className="meg-stage10-label" htmlFor="stage10-notes">Observações (opcional)</label>
      <textarea id="stage10-notes" value={notes} rows={5} maxLength={500} placeholder="Informações adicionais..."
       onChange={e=>setNotes(e.target.value)}/>
      <span className="meg-stage10-counter">{notes.length}/500</span>
     </div>
     <div className="meg-stage10-aside">
      <section className="meg-stage10-panel meg-stage10-summary">
       <button className="meg-stage10-summary-title" type="button" onClick={()=>setSummaryOpen(!summaryOpen)}
        aria-expanded={summaryOpen}><span aria-hidden="true">▤</span><strong>Resumo do lançamento</strong><span>{summaryOpen?'⌃':'⌄'}</span></button>
       {summaryOpen&&<>
        <p>Confira os detalhes antes de salvar.</p>
        <div className="meg-stage10-big-value" data-kind={kind}>{amount?'R$ '+amount:'R$ —'}</div>
        <dl>
         <div><dt>Tipo</dt><dd>{kind==='expense'?'Despesa':'Receita'}</dd></div>
         <div><dt>Categoria</dt><dd>{selectedCategory}</dd></div>
         <div><dt>Classificação da conta</dt><dd>{food?'Benefício':'Contas gerais'}</dd></div>
         <div><dt>Conta</dt><dd>{selectedAccount}</dd></div>
         <div><dt>Forma de pagamento</dt><dd>{selectedMethod}</dd></div>
         <div><dt>Data do lançamento</dt><dd>{formatDate(date)}</dd></div>
         <div><dt>Status</dt><dd>{food?'Pago (benefício)':kind==='income'?'Definido pela API':fixed?'Definido pela API':credit?'Definido pela fatura':status==='paid'?'Solicitado: Pago':'Solicitado: Pendente'}</dd></div>
         {credit&&<><div><dt>Cartão</dt><dd>{selectedCard}</dd></div><div><dt>Parcelamento</dt><dd>{installments} parcela(s), total pelo domínio</dd></div></>}
        </dl>
        <p className="meg-stage10-small">Esta demonstração apenas espelha campos digitados. Não calcula totais, faturas, parcelas ou saldos.</p>
       </>}
      </section>
      <section className="meg-stage10-panel meg-stage10-favorites">
       <h3>Categorias mais usadas</h3>
       <p>Selecione uma categoria para preencher rapidamente.</p>
       <div>{categories.slice(0,6).map(cat=><button type="button" key={cat.id}
        className={categoryId===cat.id?'is-active':''} onClick={()=>chooseCategory(cat.id)}>
         <span aria-hidden="true">{categoryGlyph[cat.id]}</span>{cat.name}</button>)}</div>
      </section>
      {onInspectEdit&&!isEdit&&<button type="button" className="meg-stage10-inspect-edit"
       onClick={onInspectEdit}>Visualizar Editar lançamento (dados fictícios)</button>}
     </div>
    </div>
    {message&&<output className="meg-stage10-message" role="status">{message}</output>}
    <footer className="meg-stage10-footer">
     {isEdit?<button type="button" className="meg-stage10-delete" disabled
      title="Exclusão real bloqueada nesta prévia visual">Excluir lançamento</button>:null}
     <button type="button" className="meg-stage10-back" onClick={onBack}>‹ Voltar</button>
     <button type="submit" className="meg-stage10-save">{isEdit?'✓ Salvar alterações':'✓ Salvar lançamento'}</button>
    </footer>
   </form>
   <p className="meg-stage10-preview-flag" role="note">PRÉVIA VISUAL · DADOS FICTÍCIOS · SEM OPERAÇÕES FINANCEIRAS</p>
  </section>
 </div>,document.body);
}
