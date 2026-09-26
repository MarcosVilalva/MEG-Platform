import { useEffect, useMemo, useRef, useState } from 'react';
import { authenticatedRequest } from '../app/auth-client';
import type { PhoenixReadModel } from '../phoenix/contracts';
import {
  imageFileToAvatarDataUrl,
  phoenixAvatarImage,
  phoenixAvatarPresets,
  readPhoenixAvatarPreference,
  savePhoenixAvatarPreference,
  savePhoenixAvatarPreferenceCloud,
  type PhoenixAvatarPreference,
} from '../phoenix/profile-avatar';
import './meg-mobile-settings.css';

type Section = 'profile' | 'home' | 'security' | 'notifications' | 'system';
type BiometricStatus = { available?: boolean; enabled?: boolean; reason?: string };
type NotificationStatus = Record<string, unknown>;
type DashboardPrefs = {
  balance: boolean;
  projection: boolean;
  summary: boolean;
  benefit: boolean;
  history: boolean;
  agenda: boolean;
};

const PREF_KEY = 'meg.dashboard.preferences';
const defaults: DashboardPrefs = {
  balance:true, projection:true, summary:true, benefit:true, history:true, agenda:true,
};

function readPrefs(): DashboardPrefs {
  try {
    const stored=localStorage.getItem(PREF_KEY);
    return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
  } catch { return defaults; }
}

function applyPrefs(value:DashboardPrefs){
  try { localStorage.setItem(PREF_KEY,JSON.stringify(value)); } catch {}
  const root=document.documentElement;
  Object.entries(value).forEach(([key,enabled])=>{
    root.dataset[`megDashboard${key.slice(0,1).toUpperCase()}${key.slice(1)}`]=enabled?'on':'off';
  });
}

function Avatar({name,preference}:{name:string;preference:PhoenixAvatarPreference}){
  const image=phoenixAvatarImage(preference);
  return <span className={`meg4-avatar ${image?'has-image':''}`}>{image?<img src={image} alt="" draggable={false}/>:name.trim().slice(0,1).toUpperCase()}</span>;
}

function Switch({checked,onChange,label,description}:{checked:boolean;onChange:()=>void;label:string;description:string}){
  return <button type="button" className={`meg4-switch ${checked?'on':''}`} onClick={onChange} aria-pressed={checked}>
    <span><strong>{label}</strong><small>{description}</small></span><i><b/></i>
  </button>;
}

export function MegMobileSettings({data,onLogout}:{data:PhoenixReadModel;onLogout?:()=>void}){
  const [section,setSection]=useState<Section>('profile');
  const [avatar,setAvatar]=useState<PhoenixAvatarPreference>(()=>readPhoenixAvatarPreference(data.user.id));
  const [avatarExpanded,setAvatarExpanded]=useState(false);
  const [avatarMessage,setAvatarMessage]=useState('');
  const [prefs,setPrefs]=useState<DashboardPrefs>(readPrefs);
  const [biometric,setBiometric]=useState<BiometricStatus|null>(null);
  const [biometricBusy,setBiometricBusy]=useState(false);
  const [notifications,setNotifications]=useState<NotificationStatus|null>(null);
  const [notificationBusy,setNotificationBusy]=useState(false);
  const [notificationMessage,setNotificationMessage]=useState('');
  const [version,setVersion]=useState('Consultando…');
  const fileRef=useRef<HTMLInputElement>(null);

  useEffect(()=>{ applyPrefs(prefs); },[prefs]);

  useEffect(()=>{
    let active=true;
    // @ts-ignore módulo JS nativo carregado apenas no APK.
    void import('../native-biometric-login.js')
      .then((module)=>module.getBiometricLoginStatus())
      .then((status)=>{if(active)setBiometric(status);})
      .catch(()=>{if(active)setBiometric({available:false,enabled:false,reason:'PLUGIN_UNAVAILABLE'});});
    return()=>{active=false;};
  },[]);

  useEffect(()=>{
    let active=true;
    const base=import.meta.env.BASE_URL||'/';
    const url=`${base.endsWith('/')?base:base+'/'}downloads/app-version.json`;
    void fetch(url,{cache:'no-store'})
      .then((response)=>response.ok?response.json():Promise.reject(new Error('VERSION_UNAVAILABLE')))
      .then((payload)=>{if(active)setVersion(payload?.versionName?`Android ${payload.versionName}`:'Versão não informada');})
      .catch(()=>{if(active)setVersion('Android · versão não informada');});
    return()=>{active=false;};
  },[]);

  useEffect(()=>{
    if(section!=='notifications') return;
    let active=true;
    void authenticatedRequest<NotificationStatus>('/notifications/status',{cache:'no-store'})
      .then((value)=>{if(active)setNotifications(value);})
      .catch(()=>{if(active)setNotifications(null);});
    return()=>{active=false;};
  },[section]);

  const visiblePresets=useMemo(()=>{
    if(avatarExpanded)return phoenixAvatarPresets;
    const first=phoenixAvatarPresets.slice(0,10);
    if(avatar.kind!=='preset'||first.some((item)=>item.id===avatar.presetId))return first;
    const selected=phoenixAvatarPresets.find((item)=>item.id===avatar.presetId);
    return selected?[...first.slice(0,9),selected]:first;
  },[avatar,avatarExpanded]);

  async function saveAvatar(next:PhoenixAvatarPreference){
    const local=savePhoenixAvatarPreference(next,data.user.id);
    setAvatar(local);setAvatarMessage('');
    const result=await savePhoenixAvatarPreferenceCloud(local,data.user.id);
    setAvatarMessage(result.synced?'Avatar sincronizado.':'Avatar aplicado. A sincronização será tentada novamente quando a nuvem estiver disponível.');
  }

  async function choosePhoto(file?:File){
    if(!file)return;
    try{
      const dataUrl=await imageFileToAvatarDataUrl(file);
      await saveAvatar({kind:'photo',dataUrl});
    }catch(error){
      setAvatarMessage(error instanceof Error?error.message:'Não foi possível usar esta imagem.');
    }
  }

  async function disableBiometric(){
    if(biometricBusy)return;
    setBiometricBusy(true);
    try{
      // @ts-ignore módulo JS nativo carregado apenas no APK.
      const module=await import('../native-biometric-login.js');
      await module.clearBiometricLogin();
      setBiometric(await module.getBiometricLoginStatus());
    }finally{setBiometricBusy(false);}
  }

  async function refreshBiometric(){
    if(biometricBusy)return;
    setBiometricBusy(true);
    try{
      // @ts-ignore módulo JS nativo carregado apenas no APK.
      const module=await import('../native-biometric-login.js');
      setBiometric(await module.getBiometricLoginStatus());
    }finally{setBiometricBusy(false);}
  }

  async function testNotifications(){
    if(notificationBusy)return;
    setNotificationBusy(true);setNotificationMessage('');
    try{
      const result=await authenticatedRequest<Record<string,{status?:string}>>('/notifications/test-channels',{method:'POST'});
      const ok=Object.values(result||{}).filter((item)=>item?.status==='sent'||item?.status==='ok').length;
      setNotificationMessage(ok?`Teste enviado para ${ok} canal(is).`:'Teste concluído. Verifique o diagnóstico dos canais.');
      setNotifications(await authenticatedRequest<NotificationStatus>('/notifications/status',{cache:'no-store'}));
    }catch(error){
      setNotificationMessage(error instanceof Error?error.message:'Não foi possível testar os canais.');
    }finally{setNotificationBusy(false);}
  }

  return <main className="meg4-settings" data-meg-fixed-screen="true">
    <header className="meg4-settings-title"><span>CONFIGURAÇÕES</span><h1>Seu MEG</h1><p>Perfil, experiência, segurança e integrações.</p></header>

    <nav className="meg4-settings-nav" aria-label="Seções">
      {([
        ['profile','Perfil'],['home','Home'],['security','Segurança'],['notifications','Avisos'],['system','Sistema']
      ] as Array<[Section,string]>).map(([id,label])=><button key={id} className={section===id?'active':''} onClick={()=>setSection(id)}>{label}</button>)}
    </nav>

    <section className="meg4-settings-workspace" data-meg-scroll-region="true">
      {section==='profile'?<>
        <article className="meg4-profile-card">
          <Avatar name={data.user.name} preference={avatar}/>
          <div><small>MEU PERFIL</small><strong>{data.user.name}</strong><span>{data.user.email}</span><em>{data.user.role}</em></div>
        </article>
        <article className="meg4-settings-card">
          <header><div><small>IDENTIDADE</small><h2>Foto e avatar</h2></div><button onClick={()=>fileRef.current?.click()}>Escolher foto</button></header>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event)=>{void choosePhoto(event.target.files?.[0]);event.currentTarget.value='';}}/>
          <div className="meg4-avatar-grid">
            {visiblePresets.map((preset)=>{
              const preference:PhoenixAvatarPreference={kind:'preset',presetId:preset.id};
              const selected=avatar.kind==='preset'&&avatar.presetId===preset.id;
              return <button key={preset.id} className={selected?'selected':''} onClick={()=>void saveAvatar(preference)}><Avatar name={preset.label} preference={preference}/><small>{preset.label}</small>{selected?<b>✓</b>:null}</button>;
            })}
          </div>
          <div className="meg4-inline-actions"><button onClick={()=>setAvatarExpanded((value)=>!value)}>{avatarExpanded?'Recolher':'Ver todos'}</button><button onClick={()=>void saveAvatar({kind:'initials'})}>Usar iniciais</button></div>
          {avatarMessage?<p className="meg4-message">{avatarMessage}</p>:null}
        </article>
      </>:null}

      {section==='home'?<article className="meg4-settings-card">
        <header><div><small>DASHBOARD</small><h2>Monte sua Home</h2><p>Escolha os blocos que deseja manter visíveis.</p></div><button onClick={()=>setPrefs(defaults)}>Restaurar</button></header>
        <div className="meg4-switch-list">
          <Switch checked={prefs.balance} label="Saldo monetário" description="Saldo realizado em destaque." onChange={()=>setPrefs((p)=>({...p,balance:!p.balance}))}/>
          <Switch checked={prefs.projection} label="Projeção" description="Indicadores futuros e diagnóstico." onChange={()=>setPrefs((p)=>({...p,projection:!p.projection}))}/>
          <Switch checked={prefs.summary} label="Resumo financeiro" description="Pagas, pendentes e consolidados." onChange={()=>setPrefs((p)=>({...p,summary:!p.summary}))}/>
          <Switch checked={prefs.benefit} label="Benefício Alimentação" description="Saldo do Verocard na Home." onChange={()=>setPrefs((p)=>({...p,benefit:!p.benefit}))}/>
          <Switch checked={prefs.history} label="Histórico recente" description="Últimas movimentações." onChange={()=>setPrefs((p)=>({...p,history:!p.history}))}/>
          <Switch checked={prefs.agenda} label="Agenda financeira" description="Vencimentos e compromissos." onChange={()=>setPrefs((p)=>({...p,agenda:!p.agenda}))}/>
        </div>
      </article>:null}

      {section==='security'?<article className="meg4-settings-card">
        <header><div><small>SEGURANÇA</small><h2>Biometria</h2><p>Proteção do acesso no aparelho Android.</p></div><button disabled={biometricBusy} onClick={()=>void refreshBiometric()}>Atualizar</button></header>
        <div className="meg4-status-row"><span><strong>Disponibilidade</strong><small>{biometric?.available?'Sensor disponível':'Indisponível neste momento'}</small></span><b className={biometric?.available?'ok':'warn'}>{biometric?.available?'OK':'ATENÇÃO'}</b></div>
        <div className="meg4-status-row"><span><strong>Login biométrico</strong><small>{biometric?.enabled?'Ativo para os próximos acessos':'Não habilitado'}</small></span><b className={biometric?.enabled?'ok':''}>{biometric?.enabled?'ATIVO':'INATIVO'}</b></div>
        {biometric?.enabled?<button className="meg4-danger-action" disabled={biometricBusy} onClick={()=>void disableBiometric()}>Desativar biometria neste aparelho</button>:null}
        {!biometric?.enabled?<p className="meg4-help">A ativação é oferecida após um login válido, quando o Android confirma que a biometria está disponível.</p>:null}
      </article>:null}

      {section==='notifications'?<article className="meg4-settings-card">
        <header><div><small>NOTIFICAÇÕES</small><h2>Canais de aviso</h2><p>Diagnóstico dos lembretes e integrações.</p></div><button disabled={notificationBusy} onClick={()=>void testNotifications()}>{notificationBusy?'Testando…':'Testar canais'}</button></header>
        <div className="meg4-notification-summary">
          <span><strong>Android</strong><small>Notificações locais do aplicativo</small></span>
          <span><strong>E-mail / WhatsApp / Alexa</strong><small>Serviços remotos configurados no MEG</small></span>
        </div>
        <pre className="meg4-status-json">{notifications?JSON.stringify(notifications,null,2):'Status indisponível ou ainda carregando.'}</pre>
        {notificationMessage?<p className="meg4-message">{notificationMessage}</p>:null}
      </article>:null}

      {section==='system'?<>
        <article className="meg4-settings-card">
          <header><div><small>SISTEMA</small><h2>Versão e atualização</h2><p>O APK acompanha o canal automático de atualização do MEG.</p></div></header>
          <div className="meg4-status-row"><span><strong>Versão instalada</strong><small>{version}</small></span><b className="ok">OTA</b></div>
          <div className="meg4-status-row"><span><strong>Dados normalizados</strong><small>{data.normalization.primary&&data.normalization.reconciled?'Leitura conciliada':'Requer verificação'}</small></span><b className={data.normalization.primary&&data.normalization.reconciled?'ok':'warn'}>{data.normalization.primary&&data.normalization.reconciled?'OK':'ATENÇÃO'}</b></div>
        </article>
        {onLogout?<button className="meg4-logout" onClick={onLogout}>Sair da conta</button>:null}
      </>:null}
    </section>
  </main>;
}
