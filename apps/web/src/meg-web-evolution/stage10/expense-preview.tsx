import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import '../styles/tokens.css';
import '../styles/base.css';
import {AppShell} from '../shell/AppShell';
import {HomeDashboard} from '../home/HomeDashboard';
import {homeP0QaPreviewFixture} from '../home/home-p0-qa.preview.fixture';
import {ExpenseForm,type ExpenseCatalogs} from './ExpenseForm';

/** Catálogos sintéticos SOMENTE desta prévia, nunca IDs de produção. */
const syntheticCatalogs:ExpenseCatalogs={
 benefitBinding:{categoryIds:['qa-category-food'],accountId:'qa-account-benefit',paymentMethodId:'qa-method-benefit'},
 creditCards:[{id:'qa-creditcard-1',name:'Cartão de demonstração (fictício)',active:true}],
 categories:[
  {id:'qa-category-food',name:'Alimentação',active:true},
  {id:'qa-category-house',name:'Casa',active:true},
  {id:'qa-category-transport',name:'Transporte',active:true},
  {id:'qa-category-health',name:'Saúde',active:true},
  {id:'qa-category-shopping',name:'Compras',active:true},
  {id:'qa-category-leisure',name:'Lazer',active:true},
 ],
 accounts:[
  {id:'qa-account-money',name:'Conta corrente de demonstração',active:true,kind:'monetary'},
  {id:'qa-account-benefit',name:'Conta Benefício (demonstração)',active:true,kind:'benefit'},
 ],
 paymentMethods:[
  {id:'qa-method-instant',name:'À vista',active:true,kind:'ordinary'},
  {id:'qa-method-credit',name:'Cartão de crédito (demonstração)',active:true,kind:'credit'},
  {id:'qa-method-benefit',name:'Verocard (demonstração)',active:true,kind:'benefit'},
 ],
};
function ExpenseQA(){
 const [open,setOpen]=useState(false);
 return <div data-stage10-expense-qa="isolated" data-no-real-writers="true">
  <AppShell periodLabel="Novembro de 2026" activeSection="launches">
   <HomeDashboard month="2026-11" previewData={homeP0QaPreviewFixture}/>
   {!open&&<button type="button" onClick={()=>setOpen(true)} style={{position:'fixed',zIndex:90,bottom:'1.4rem',right:'1.4rem',borderRadius:12,padding:'1rem',border:'1px solid #14e3c8',background:'#02444b',color:'#fff',cursor:'pointer'}}>Abrir Nova Despesa (QA)</button>}
  </AppShell>
  {open&&<ExpenseForm catalogs={syntheticCatalogs} onBack={()=>setOpen(false)} saveEnabled={false}/>}
 </div>;
}
createRoot(document.getElementById('meg-stage10-expense-root')!).render(<ExpenseQA/>);
