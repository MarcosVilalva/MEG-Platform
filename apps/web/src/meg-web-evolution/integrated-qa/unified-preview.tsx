import React,{useEffect,useState,type MouseEvent} from 'react';
import {createRoot} from 'react-dom/client';
import '../styles/tokens.css';
import '../styles/base.css';
import {LoadingScreen} from '../auth/LoadingScreen';
import {LoginScreen} from '../auth/LoginScreen';
import {CreateAccountScreen} from '../auth/CreateAccountScreen';
import {RecoverPasswordScreen} from '../auth/RecoverPasswordScreen';
import {AppShell} from '../shell/AppShell';
import {HomeDashboard} from '../home/HomeDashboard';
import {homeP0QaPreviewFixture} from '../home/home-p0-qa.preview.fixture';
import {LaunchesStage09} from '../launches/LaunchesStage09';
import {PrismLaunchChoice,PrismCloseGlyph} from './PrismLaunchChoice';
import {ExpenseForm,type ExpenseCatalogs} from '../stage10/ExpenseForm';
import type {HistorySnapshot} from '../stage10/autocomplete-history';
import prismCssText from '../stage08-qa/prism-type-pilot.css?inline';
import '../launches/new-launch.css';
import '../launches/launch-type-picker.css';
import './unified-qa.css';

/** Integração EXCLUSIVAMENTE visual. A sessão, os catálogos e os eventos são fictícios. */
type Screen='loading-entry'|'login'|'register'|'recover'|'loading-after'|'home'|'launches';
type Overlay='choice'|'expense'|null;
const known:Record<string,Screen>={
 'carregamento':'loading-entry','login':'login','cadastro':'register',
 'recuperar-senha':'recover','carregamento-apos-login':'loading-after',
 'home':'home','lancamentos':'launches',
};
const params=new URLSearchParams(location.search);
const initial=known[params.get('tela')||'']??'loading-entry';
const rootElement=document.documentElement;
rootElement.dataset.megTypographyPilot='true';
rootElement.dataset.megPrismUi='true';
const style=document.createElement('style');
style.dataset.megPrismStyle='unified-qa';
style.textContent=prismCssText;
document.head.appendChild(style);
const blockedRequests:string[]=[];
(window as typeof window&{__MEG_UNIFIED_QA_BLOCKED__?:string[]}).__MEG_UNIFIED_QA_BLOCKED__=blockedRequests;
window.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{
 const path=typeof input==='string'||input instanceof URL?String(input):input.url;
 blockedRequests.push((init?.method||'GET')+' '+path);
 return new Response(JSON.stringify({error:'MEG_UNIFIED_QA_NETWORK_BLOCKED'}),{status:403,headers:{'Content-Type':'application/json'}});
};
const catalogs:ExpenseCatalogs={
 creditCards:[{id:'qa-card-1',name:'Cartão fictício',active:true,closingDay:25,dueDay:5}],
 categories:[
  {id:'qa-category-food',name:'Alimentação',active:true},
  {id:'qa-category-house',name:'Casa',active:true},
  {id:'qa-category-transport',name:'Transporte',active:true},
  {id:'qa-category-health',name:'Saúde',active:true},
  {id:'qa-category-shopping',name:'Compras',active:true},
  {id:'qa-category-leisure',name:'Lazer',active:true},
 ],
 accounts:[{id:'qa-account-money',name:'Conta corrente fictícia',active:true,kind:'monetary'}],
 paymentMethods:[
  {id:'qa-method-instant',name:'À vista',active:true,kind:'ordinary'},
  {id:'qa-method-credit',name:'Crédito',active:true,kind:'credit'},
  {id:'qa-method-pix',name:'PIX',active:true,kind:'ordinary'},
  {id:'qa-method-boleto',name:'Boleto',active:true,kind:'ordinary'},
  {id:'qa-method-debit',name:'Débito',active:true,kind:'ordinary'},
 ],
};
const history:HistorySnapshot={protocol:'financial-history-v1',kind:'complete',items:[
 {id:'qa-history-1',description:'Mercado fictício',date:'2026-09-01',amount:125.49,categoryId:'qa-category-food',accountId:'qa-account-money',paymentMethodId:'qa-method-instant',category:{id:'qa-category-food',name:'Alimentação'},account:{id:'qa-account-money',name:'Conta corrente fictícia'},paymentMethod:{id:'qa-method-instant',name:'À vista'}},
]};
function UnifiedQA(){
 const [screen,setScreen]=useState<Screen>(initial);
 const [overlay,setOverlay]=useState<Overlay>(()=>initial==='launches'&&params.get('modal')==='novo'?'choice':null);
 const [progress,setProgress]=useState(0);
 const [notice,setNotice]=useState('');
 const loading=screen==='loading-entry'||screen==='loading-after';
 useEffect(()=>{
  if(!loading)return;
  setProgress(0);
  const start=performance.now();
  const tick=window.setInterval(()=>{
   const value=Math.min(100,Math.round((performance.now()-start)/2200*100));
   setProgress(value);
   if(value===100){clearInterval(tick);setScreen(screen==='loading-entry'?'login':'home');}
  },80);
  return()=>clearInterval(tick);
 },[loading,screen]);
 const go=(next:Screen)=>{setOverlay(null);setNotice('');setScreen(next);};
 const openNew=()=>{setNotice('');setOverlay('choice');};
 const capture=(event:MouseEvent<HTMLDivElement>)=>{
  const target=event.target;
  if(!(target instanceof Element))return;
  const button=target.closest('button');
  if(!button)return;
  if(button.getAttribute('aria-label')==='Novo lançamento'){event.preventDefault();event.stopPropagation();openNew();}
 };
 if(loading)return <div data-meg-unified-screen={screen}><LoadingScreen preview progress={progress} onNavigateLogin={()=>go('login')}/></div>;
 if(screen==='login')return <div data-meg-unified-screen="login" className="meg-unified-auth">
   <LoginScreen previewOnly onAuthenticated={()=>go('loading-after')} onReviewLoading={()=>go('loading-entry')}
    onNavigate={dest=>go(dest==='create-account'?'register':'recover')}/>
   <button type="button" className="meg-unified-demo-enter" onClick={()=>go('loading-after')}>Entrar na demonstração sem autenticação</button>
  </div>;
 if(screen==='register')return <div data-meg-unified-screen="register"><CreateAccountScreen previewOnly onNavigateLogin={()=>go('login')} onAuthenticated={()=>go('login')}/></div>;
 if(screen==='recover')return <div data-meg-unified-screen="recover"><RecoverPasswordScreen previewOnly onNavigateLogin={()=>go('login')}/></div>;
 return <div data-meg-unified-screen={screen} onClickCapture={capture}>
  <AppShell activeSection={screen==='launches'?'launches':'home'} profileName="Usuário fictício QA"
   periodLabel="Novembro de 2026" onNavigate={next=>go(next==='launches'?'launches':'home')} onLogout={()=>go('login')}>
   {screen==='launches'
    ? <LaunchesStage09 data={homeP0QaPreviewFixture} mode="live" periodMonth="2026-11"
      userId="qa-unified-prism" exportUserName="Usuário fictício QA"
      onRefresh={()=>setNotice('Dados fictícios: nenhuma consulta foi realizada.')} onNew={openNew} onHome={()=>go('home')}/>
    : <HomeDashboard previewData={homeP0QaPreviewFixture} month="2026-11" userId="qa-unified-prism"
      onNavigate={target=>{
       if(target==='novo'){openNew();return true;}
       if(target==='lancamentos'){go('launches');return true;}
       setNotice('Recurso de etapa futura não disponível nesta prévia.');return false;
      }}/>
   }
  </AppShell>
  {overlay==='choice'&&<div className="meg-new-launch__overlay is-choice-overlay meg-unified-choice-overlay">
    <section className="meg-new-launch is-choose" role="dialog" aria-modal="true" aria-labelledby="meg-unified-new-title">
      <header className="meg-new-launch__header">
       <div className="meg-new-launch__headline"><h2 id="meg-unified-new-title">Novo lançamento</h2><p>Escolha o tipo de lançamento.</p></div>
       <button type="button" className="meg-new-launch__close" aria-label="Fechar novo lançamento" title="Fechar novo lançamento" onClick={()=>setOverlay(null)}><PrismCloseGlyph/></button>
      </header>
      <PrismLaunchChoice onBack={()=>setOverlay(null)} onChoose={type=>{
        if(type==='expense')setOverlay('expense');
        else setNotice('Receita permanece fora do formulário de despesa autorizado.');
      }}/>
    </section>
   </div>}
  {overlay==='expense'&&<ExpenseForm catalogs={catalogs} historySnapshot={history}
    saveEnabled={false} onBack={()=>setOverlay('choice')}/>}
  {notice&&<output className="meg-unified-notice" role="status">{notice}
    <button type="button" aria-label="Fechar aviso" onClick={()=>setNotice('')}>×</button>
   </output>}
  <aside className="meg-unified-stamp" role="note">QA UNIFICADA · MEG Prism 2.0 · Dados fictícios · Sem API real</aside>
 </div>;
}
const el=document.getElementById('meg-unified-qa-root');
if(!el)throw new Error('MEG_UNIFIED_QA_ROOT_NOT_FOUND');
createRoot(el).render(<React.StrictMode><UnifiedQA/></React.StrictMode>);
