import React from 'react';
import { createRoot } from 'react-dom/client';
import '../src/meg-web-evolution/styles/tokens.css';
import '../src/meg-web-evolution/styles/base.css';
import { AppShell } from '../src/meg-web-evolution/shell/AppShell';
import { HomeScreen } from '../src/meg-web-evolution/home/HomeScreen';
import { homeVisualFixture } from './fixture.js';

function VisualHome() {
  const [notice,setNotice]=React.useState('');
  const [searchQuery,setSearchQuery]=React.useState('');
  const demoAction=(action)=>setNotice('Ação "'+action+'" pertence a outra tela e não é executada nesta prévia demonstrativa.');
  return <>
    <AppShell homeContext userName="Marcos de Andrade Vilalva" selectedMonth="2026-10" searchQuery={searchQuery} onSearchChange={setSearchQuery} onNewTransaction={()=>demoAction('Novo lançamento')} onLogout={()=>demoAction('Sair')} onNavigate={demoAction} onMonthChange={()=>setNotice('O período desta prévia é fixo em outubro de 2026. A Home autenticada consulta os meses reais na API.')}>
      <HomeScreen previewOnly snapshot={homeVisualFixture} searchQuery={searchQuery} onNavigate={demoAction} />
    </AppShell>
    {notice && <div role="status" style={{position:'fixed',bottom:16,right:16,zIndex:9999,maxWidth:'min(90vw,390px)',border:'1px solid #14e3c8',borderRadius:10,background:'#002525',padding:16,boxShadow:'0 10px 30px #0008',color:'#eafff8'}}>{notice}<button type="button" onClick={()=>setNotice('')} style={{marginLeft:10,padding:8,borderRadius:8,background:'#14e3c8',color:'#001d1e',border:0,cursor:'pointer'}}>Fechar</button></div>}
  </>;
}
createRoot(document.getElementById('home-root')).render(<React.StrictMode><VisualHome/></React.StrictMode>);
