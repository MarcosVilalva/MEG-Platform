import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import '../styles/tokens.css';
import '../styles/base.css';
import {AppShell} from '../shell/AppShell';
import {HomeDashboard} from '../home/HomeDashboard';
import {homeP0QaPreviewFixture} from '../home/home-p0-qa.preview.fixture';
import {LaunchTypeChooser,type NewLaunchType} from './LaunchTypeChooser';

/** Prévia sem API, com a própria Home P0 homologada como plano de fundo. */
function Stage10Qa(){
 const [open,setOpen]=useState(true);
 const [choice,setChoice]=useState<NewLaunchType|null>(null);
 return <div data-stage10-qa="isolated" data-no-real-writers="true">
   <AppShell periodLabel="Novembro de 2026" activeSection="home">
    <HomeDashboard previewData={homeP0QaPreviewFixture} month="2026-11"
      onNavigate={target=>{if(target==='novo'){setChoice(null);setOpen(true);}}}/>
    {!open&&<button type="button" style={{position:'fixed',bottom:'1.5rem',right:'1.5rem',zIndex:100,border:'1px solid #14e3c8',borderRadius:12,background:'#063b3b',color:'#fff',padding:'1rem',cursor:'pointer'}}
      onClick={()=>{setChoice(null);setOpen(true)}}>Abrir seleção de tipo</button>}
   </AppShell>
   <LaunchTypeChooser open={open} onClose={()=>setOpen(false)}
     onSelect={type=>{setChoice(type);setOpen(false);}}/>
   {choice&&<div role="status" style={{position:'fixed',bottom:'5.5rem',right:'1.5rem',zIndex:110,background:'#052a2d',padding:'1rem',color:'#eafffa',border:'1px solid #14e3c8',borderRadius:12}}>
     Tipo selecionado: {choice}. Próximo formulário ainda não conectado. Nenhuma gravação foi realizada.
   </div>}
  </div>;
}
createRoot(document.getElementById('meg-stage10-root')!).render(<Stage10Qa/>);
