import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import '../styles/tokens.css';
import '../styles/base.css';
import {AppShell} from '../shell/AppShell';
import {LaunchesStage09} from '../launches/LaunchesStage09';
import {homeP0QaPreviewFixture} from '../home/home-p0-qa.preview.fixture';
import {ExpenseForm,type ExpenseCatalogs} from './ExpenseForm';
import type {HistorySnapshot} from './autocomplete-history';

/** Catálogos sintéticos SOMENTE desta prévia, nunca IDs de produção. */
const syntheticCatalogs:ExpenseCatalogs={
 creditCards:[{id:'qa-creditcard-1',name:'Cartão de demonstração (fictício)',issuer:'Banco fictício',brand:'VISA',lastFour:'4587',closingDay:25,dueDay:5,color:'#238b93',active:true},{id:'qa-creditcard-2',name:'Cartão secundário de demonstração',issuer:'Banco exemplo',brand:'MASTERCARD',lastFour:'9021',closingDay:12,dueDay:20,color:'#5a5aa8',active:true}],
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
 ],
 paymentMethods:[
  {id:'qa-method-instant',name:'À vista',active:true,kind:'ordinary'},
  {id:'qa-method-credit',name:'Crédito',active:true,kind:'credit'},
  {id:'qa-method-pix',name:'PIX',active:true,kind:'ordinary'},
  {id:'qa-method-boleto',name:'Boleto',active:true,kind:'ordinary'},
  {id:'qa-method-debit',name:'Débito',active:true,kind:'ordinary'},
 ],
};
const syntheticHistory:HistorySnapshot={protocol:'financial-history-v1',kind:'complete',items:[
 {id:'qa-h-1',description:'Mercado fictício',date:'2026-09-01',amount:125.49,categoryId:'qa-category-food',accountId:'qa-account-money',paymentMethodId:'qa-method-instant',category:{id:'qa-category-food',name:'Alimentação'},account:{id:'qa-account-money',name:'Conta corrente de demonstração'},paymentMethod:{id:'qa-method-instant',name:'À vista'}},
 {id:'qa-h-2',description:'Aluguel fictício',date:'2026-08-05',amount:600,categoryId:'qa-category-house',accountId:'qa-account-money',paymentMethodId:'qa-method-instant',category:{id:'qa-category-house',name:'Casa'},account:{id:'qa-account-money',name:'Conta corrente de demonstração'},paymentMethod:{id:'qa-method-instant',name:'À vista'}},
]};
function ExpenseQA(){
 const [open,setOpen]=useState(false);
 return <div data-stage10-expense-qa="isolated" data-no-real-writers="true">
  <AppShell periodLabel="Novembro de 2026" activeSection="launches">
   <LaunchesStage09 data={homeP0QaPreviewFixture} mode="live" periodMonth="2026-11" userId="qa-visual-only-stage10" exportUserName="Usuário fictício" onRefresh={()=>{}} onNew={()=>setOpen(true)} onHome={()=>{}}/>
   {!open&&<button type="button" onClick={()=>setOpen(true)} style={{position:'fixed',zIndex:90,bottom:'1.4rem',right:'1.4rem',borderRadius:12,padding:'1rem',border:'1px solid #14e3c8',background:'#02444b',color:'#fff',cursor:'pointer'}}>Abrir Nova Despesa (QA)</button>}
  </AppShell>
  {open&&<ExpenseForm catalogs={syntheticCatalogs} historySnapshot={syntheticHistory} onBack={()=>setOpen(false)} saveEnabled={false}/>}
 </div>;
}
createRoot(document.getElementById('meg-stage10-expense-root')!).render(<ExpenseQA/>);
