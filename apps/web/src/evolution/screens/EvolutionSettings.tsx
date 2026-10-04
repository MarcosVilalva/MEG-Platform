import {useEffect,useRef,useState} from 'react';
import {authenticatedRequest} from '../../app/auth-client';
import {cardsClient} from '../../app/cards-client';
import {financeClient} from '../../app/finance-client';
import {EvolutionFinancialIcon as Icon} from '../components/EvolutionFinancialIcon';
import {Button,Panel} from '../components/SystemUI';
import type {SystemData} from '../app/system-domain';
import {evolutionAvatarImage,evolutionAvatarPresets,imageToEvolutionAvatar,readEvolutionAvatar,saveEvolutionAvatar,type EvolutionAvatarPreference} from '../app/profile-avatar';

type Section='profile'|'home'|'catalogs'|'security'|'notifications'|'system';
type DashboardPrefs={balance:boolean;projection:boolean;summary:boolean;benefit:boolean;history:boolean;agenda:boolean};
const PREF_KEY='meg.dashboard.preferences';
const defaults:DashboardPrefs={balance:true,projection:true,summary:true,benefit:true,history:true,agenda:true};

function readPrefs():DashboardPrefs{
  try{return{...defaults,...JSON.parse(localStorage.getItem(PREF_KEY)||'{}')}}catch{return defaults}
}
function applyPrefs(value:DashboardPrefs){
  try{localStorage.setItem(PREF_KEY,JSON.stringify(value))}catch{}
  Object.entries(value).forEach(([key,enabled])=>{
    document.documentElement.setAttribute('data-meg-dashboard-'+key.replace(/[A-Z]/g,l=>'-'+l.toLowerCase()),enabled?'on':'off');
  });
}
function Toggle({checked,label,description,onChange}:{checked:boolean;label:string;description:string;onChange:()=>void}){
  return <button type="button" className={'meg-evo-toggle '+(checked?'on':'')} aria-pressed={checked} onClick={onChange}><span><strong>{label}</strong><small>{description}</small></span><i><b/></i></button>;
}
function Avatar({name,pref}:{name:string;pref:EvolutionAvatarPreference}){
  const image=evolutionAvatarImage(pref);
  return <span className={'meg-evo-avatar '+(image?'has-image':'')}>{image?<img src={image} alt="" draggable={false}/>:name.trim().slice(0,1).toUpperCase()}</span>;
}

export function EvolutionSettings({
  data,userName,userEmail,userId,qaMode,onRefresh,onLogout,
}:{
  data:SystemData;userName:string;userEmail:string;userId:string;qaMode:boolean;onRefresh:()=>void;onLogout:()=>void;
}){
  const [section,setSection]=useState<Section>('profile');
  const [prefs,setPrefs]=useState<DashboardPrefs>(readPrefs);
  const [avatar,setAvatar]=useState<EvolutionAvatarPreference>(()=>readEvolutionAvatar(userId));
  const [avatarMessage,setAvatarMessage]=useState('');
  const [catalogBusy,setCatalogBusy]=useState('');
  const [catalogMessage,setCatalogMessage]=useState('');
  const [methods,setMethods]=useState(data.methods);
  const [cards,setCards]=useState(data.cards);
  const [notificationBusy,setNotificationBusy]=useState(false);
  const [notificationStatus,setNotificationStatus]=useState<Record<string,unknown>|null>(null);
  const [notificationMessage,setNotificationMessage]=useState('');
  const fileRef=useRef<HTMLInputElement>(null);

  useEffect(()=>setMethods(data.methods),[data.methods]);
  useEffect(()=>setCards(data.cards),[data.cards]);
  useEffect(()=>applyPrefs(prefs),[prefs]);
  useEffect(()=>{
    if(section!=='notifications'||qaMode)return;
    let active=true;
    authenticatedRequest<Record<string,unknown>>('/notifications/status',{cache:'no-store'}).then(x=>active&&setNotificationStatus(x)).catch(()=>active&&setNotificationStatus(null));
    return()=>{active=false};
  },[section,qaMode]);

  async function selectAvatar(pref:EvolutionAvatarPreference){
    setAvatar(pref);setAvatarMessage('');
    const result=await saveEvolutionAvatar(pref,userId);
    setAvatarMessage(result.synced?'Avatar sincronizado.':'Avatar aplicado localmente. A nuvem será tentada novamente.');
  }
  async function choosePhoto(file?:File){
    if(!file)return;
    try{const dataUrl=await imageToEvolutionAvatar(file);await selectAvatar({kind:'photo',dataUrl})}
    catch(error){setAvatarMessage(error instanceof Error?error.message:'Não foi possível usar a imagem.')}
  }
  async function toggleMethod(id:string){
    if(catalogBusy||qaMode)return;
    const method=methods.find(x=>x.id===id);if(!method)return;
    setCatalogBusy('method:'+id);setCatalogMessage('');
    try{
      const operationId='evolution-payment-'+(crypto.randomUUID?.()||Date.now());
      const updated=method.isActive
        ? await financeClient.deactivatePaymentMethod(id,{operationId,expectedUpdatedAt:method.updatedAt})
        : await financeClient.updatePaymentMethod(id,{isActive:true,operationId,expectedUpdatedAt:method.updatedAt});
      setMethods(items=>items.map(item=>item.id===id?{...item,...updated}:item));
      setCatalogMessage(method.name+': '+(updated.isActive?'ativado.':'desativado.'));
      onRefresh();
    }catch(error){setCatalogMessage(error instanceof Error?error.message:'Não foi possível alterar a forma de pagamento.')}
    finally{setCatalogBusy('')}
  }
  async function toggleCard(id:string){
    if(catalogBusy||qaMode)return;
    const card=cards.find(x=>x.id===id);if(!card)return;
    setCatalogBusy('card:'+id);setCatalogMessage('');
    try{
      const operationId='evolution-card-'+(crypto.randomUUID?.()||Date.now());
      const updated=card.isActive
        ? await cardsClient.deactivate(id,{operationId,expectedUpdatedAt:card.updatedAt})
        : (await cardsClient.reactivate(id,{operationId,expectedUpdatedAt:card.updatedAt})).card;
      setCards(items=>items.map(item=>item.id===id?{...item,...updated}:item));
      setCatalogMessage(card.name+': '+(updated.isActive?'ativado.':'desativado.'));
      onRefresh();
    }catch(error){setCatalogMessage(error instanceof Error?error.message:'Não foi possível alterar o cartão.')}
    finally{setCatalogBusy('')}
  }
  async function testNotifications(){
    if(notificationBusy||qaMode)return;
    setNotificationBusy(true);setNotificationMessage('');
    try{
      const result=await authenticatedRequest<Record<string,{status?:string}>>('/notifications/test-channels',{method:'POST'});
      const ok=Object.values(result||{}).filter(item=>item?.status==='sent'||item?.status==='ok').length;
      setNotificationMessage(ok?`Teste enviado para ${ok} canal(is).`:'Teste concluído. Verifique o diagnóstico.');
      setNotificationStatus(await authenticatedRequest<Record<string,unknown>>('/notifications/status',{cache:'no-store'}));
    }catch(error){setNotificationMessage(error instanceof Error?error.message:'Não foi possível testar os canais.')}
    finally{setNotificationBusy(false)}
  }

  const sections:Array<[Section,string]>=[['profile','Perfil'],['home','Home'],['catalogs','Meios'],['security','Segurança'],['notifications','Avisos'],['system','Sistema']];
  return <div className="meg-evo-settings">
    <header className="meg-page-head"><div><h1>Configurações</h1><p>Perfil, experiência, meios, segurança e integrações do MEG.</p></div></header>
    <div className="meg-evo-settings-layout">
      <nav className="meg-evo-settings-nav" aria-label="Seções de configurações">{sections.map(([id,label])=><button type="button" key={id} className={section===id?'active':''} onClick={()=>setSection(id)}>{label}</button>)}</nav>
      <section className="meg-evo-settings-workspace">
        {section==='profile'&&<>
          <Panel title="Meu perfil" icon="settings"><div className="meg-evo-profile"><Avatar name={userName} pref={avatar}/><span><strong>{userName}</strong><small>{userEmail||'Conta MEG'}</small></span><Button onClick={()=>fileRef.current?.click()}>Escolher foto</Button><input ref={fileRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={event=>{void choosePhoto(event.target.files?.[0]);event.currentTarget.value=''}}/></div></Panel>
          <Panel title="Avatar" icon="settings"><div className="meg-evo-avatar-grid">{evolutionAvatarPresets.map(preset=><button type="button" key={preset.id} className={avatar.kind==='preset'&&avatar.presetId===preset.id?'selected':''} onClick={()=>void selectAvatar({kind:'preset',presetId:preset.id})}><Avatar name={preset.label} pref={{kind:'preset',presetId:preset.id}}/><small>{preset.label}</small></button>)}</div><div className="meg-evo-inline-actions"><Button onClick={()=>void selectAvatar({kind:'initials'})}>Usar iniciais</Button></div>{avatarMessage&&<p className="meg-evo-message">{avatarMessage}</p>}</Panel>
        </>}
        {section==='home'&&<Panel title="Monte sua Home" icon="home"><p>Escolha os blocos que devem permanecer visíveis. A preferência acompanha a experiência Web sem alterar o Android congelado.</p><div className="meg-evo-toggle-list">
          <Toggle checked={prefs.balance} label="Saldo monetário" description="Saldo realizado em destaque." onChange={()=>setPrefs(p=>({...p,balance:!p.balance}))}/>
          <Toggle checked={prefs.projection} label="Projeção" description="Indicadores futuros e diagnóstico." onChange={()=>setPrefs(p=>({...p,projection:!p.projection}))}/>
          <Toggle checked={prefs.summary} label="Resumo financeiro" description="Pagas, pendentes e consolidados." onChange={()=>setPrefs(p=>({...p,summary:!p.summary}))}/>
          <Toggle checked={prefs.benefit} label="Benefício Alimentação" description="Saldo Verocard separado do caixa." onChange={()=>setPrefs(p=>({...p,benefit:!p.benefit}))}/>
          <Toggle checked={prefs.history} label="Histórico recente" description="Últimas movimentações." onChange={()=>setPrefs(p=>({...p,history:!p.history}))}/>
          <Toggle checked={prefs.agenda} label="Agenda financeira" description="Vencimentos e compromissos." onChange={()=>setPrefs(p=>({...p,agenda:!p.agenda}))}/>
        </div><Button onClick={()=>setPrefs(defaults)}>Restaurar padrão</Button></Panel>}
        {section==='catalogs'&&<>
          <Panel title="Formas de pagamento" icon="wallet"><div className="meg-evo-manage-list">{methods.map(method=><button type="button" disabled={Boolean(catalogBusy)||qaMode} key={method.id} onClick={()=>void toggleMethod(method.id)}><span><strong>{method.name}</strong><small>{method.type||'Forma de pagamento'}</small></span><i className={method.isActive?'on':''}><b/></i></button>)}</div></Panel>
          <Panel title="Cartões disponíveis" icon="card"><div className="meg-evo-manage-list">{cards.map(card=><button type="button" disabled={Boolean(catalogBusy)||qaMode} key={card.id} onClick={()=>void toggleCard(card.id)}><span><strong>{card.name}</strong><small>{card.lastFour?`Final ${card.lastFour}`:'Cartão cadastrado'} · {card.isActive?'Ativo':'Inativo'}</small></span><i className={card.isActive?'on':''}><b/></i></button>)}</div>{catalogMessage&&<p className="meg-evo-message">{catalogMessage}</p>}</Panel>
        </>}
        {section==='security'&&<Panel title="Segurança" icon="check"><div className="meg-evo-status-list"><span><Icon name="check-line"/><div><strong>Sessão Web protegida</strong><small>Autenticação e sessão usam o fluxo real do MEG.</small></div><b>ATIVO</b></span><span><Icon name="phone"/><div><strong>Biometria Android</strong><small>Permanece gerenciada exclusivamente pelo aplicativo Android 2.0.708 congelado.</small></div><b>ANDROID</b></span></div></Panel>}
        {section==='notifications'&&<Panel title="Canais de aviso" icon="bell"><p>Diagnóstico dos lembretes e integrações remotas já usados pelo MEG.</p><Button disabled={notificationBusy||qaMode} onClick={()=>void testNotifications()}>{notificationBusy?'Testando…':'Testar canais'}</Button><pre className="meg-evo-status-json">{notificationStatus?JSON.stringify(notificationStatus,null,2):qaMode?'Prévia visual: diagnóstico desativado.':'Status indisponível ou ainda carregando.'}</pre>{notificationMessage&&<p className="meg-evo-message">{notificationMessage}</p>}</Panel>}
        {section==='system'&&<>
          <Panel title="Estado do sistema" icon="chart"><div className="meg-evo-status-list"><span><Icon name="landmark"/><div><strong>{data.accounts.length} contas ativas</strong><small>Contas monetárias, benefício e investimentos.</small></div></span><span><Icon name="card"/><div><strong>{data.cards.length} cartões ativos</strong><small>Conectados à central de cartões.</small></div></span><span><Icon name="list"/><div><strong>{data.events.length} lançamentos no período</strong><small>Leitura financeira sincronizada.</small></div></span></div><Button icon="repeat" onClick={onRefresh}>Atualizar dados</Button></Panel>
          <Panel title="Sessão" icon="settings"><p>{userName}<br/>{userEmail}</p><Button onClick={onLogout}>Sair da conta</Button></Panel>
        </>}
      </section>
    </div>
  </div>;
}
