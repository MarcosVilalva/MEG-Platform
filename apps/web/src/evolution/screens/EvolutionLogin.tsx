import {FormEvent,useMemo,useState} from 'react';
import {
  forgotPassword,
  login,
  register,
  type AuthSession,
} from '../../app/auth-client';
import '../styles/login.css';

type AuthMode='login'|'register'|'forgot';
type Notice={kind:'error'|'success'|'info';text:string}|null;

const REMEMBER_EMAIL_KEY='meg.evolution.remembered-email';

function MailIcon(){
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="m4.5 7 7.5 6 7.5-6"/></svg>;
}
function LockIcon(){
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>;
}
function UserIcon(){
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/></svg>;
}
function PhoneIcon(){
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5 4.5 6c.6 6.5 7 12.9 13.5 13.5l2.5-2.5-4.2-3.1-2.2 1.4a12.7 12.7 0 0 1-5.4-5.4l1.4-2.2z"/></svg>;
}
function EyeIcon({closed=false}:{closed?:boolean}){
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.5 5.5-9.5 5.5S2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.5"/>{closed&&<path d="m4 4 16 16"/>}</svg>;
}
function ShieldLockIcon(){
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6 19 5.8v5.1c0 4.5-2.8 8.3-7 10.3-4.2-2-7-5.8-7-10.3V5.8z"/><rect x="9" y="10.8" width="6" height="5.3" rx="1.25"/><path d="M10.4 10.8V9.4a1.6 1.6 0 0 1 3.2 0v1.4M12 13v1.1"/></svg>;
}
function ArrowIcon(){
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M14 7l5 5-5 5"/></svg>;
}
function BarsIcon(){
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19V11M10 19V7M15 19V4M20 19V9"/></svg>;
}
function TargetIcon(){
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="m14.7 9.3 5.4-5.4M16.2 3.9h3.9v3.9"/></svg>;
}
function SlidersIcon(){
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h7M15 6h5M4 12h3M11 12h9M4 18h9M17 18h3"/><circle cx="13" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="15" cy="18" r="2"/></svg>;
}
function CheckIcon(){
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4 10-10"/></svg>;
}

function readRememberedEmail(){
  try{return localStorage.getItem(REMEMBER_EMAIL_KEY)||'';}catch{return '';}
}
function errorMessage(error:unknown){
  const code=String((error as {code?:string;message?:string}|null)?.code||(error as Error|null)?.message||'');
  if(code.includes('INVALID_CREDENTIALS')||code.includes('UNAUTHORIZED')||code.includes('401')) return 'E-mail ou senha não conferem. Revise os dados e tente novamente.';
  if(code.includes('PENDING')) return 'Seu acesso ainda está aguardando aprovação do administrador.';
  if(code.includes('BLOCKED')) return 'Este acesso está bloqueado. Entre em contato com o administrador do MEG.';
  if(code.includes('TIMEOUT')||code.includes('Failed to fetch')||code.includes('HTTP_5')) return 'Não foi possível falar com o MEG agora. Tente novamente em instantes.';
  return 'Não foi possível concluir a operação. Revise os dados e tente novamente.';
}

export function EvolutionLogin({onAuthenticated}:{onAuthenticated?:(session:AuthSession)=>void}){
  const remembered=useMemo(readRememberedEmail,[]);
  const [mode,setMode]=useState<AuthMode>('login');
  const [email,setEmail]=useState(remembered);
  const [password,setPassword]=useState('');
  const [confirmPassword,setConfirmPassword]=useState('');
  const [name,setName]=useState('');
  const [phone,setPhone]=useState('');
  const [workspaceName,setWorkspaceName]=useState('');
  const [accountType,setAccountType]=useState<'REQUEST_ACCESS'|'CREATE_WORKSPACE'>('REQUEST_ACCESS');
  const [showPassword,setShowPassword]=useState(false);
  const [rememberEmail,setRememberEmail]=useState(Boolean(remembered));
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState<Notice>(null);
  const [authenticatedName,setAuthenticatedName]=useState('');

  function switchMode(next:AuthMode){
    setMode(next);
    setNotice(null);
    setBusy(false);
  }

  async function submit(event:FormEvent){
    event.preventDefault();
    if(busy)return;
    setNotice(null);
    setBusy(true);
    try{
      if(mode==='login'){
        const session=await login(email.trim(),password);
        try{
          if(rememberEmail)localStorage.setItem(REMEMBER_EMAIL_KEY,email.trim());
          else localStorage.removeItem(REMEMBER_EMAIL_KEY);
        }catch{}
        setAuthenticatedName(session.user.name||'');
        setNotice({kind:'success',text:'Acesso confirmado com segurança.'});
        onAuthenticated?.(session);
        return;
      }
      if(mode==='forgot'){
        if(!email.trim())throw new Error('EMAIL_REQUIRED');
        await forgotPassword(email.trim());
        setNotice({kind:'success',text:'Se existir uma conta ativa para este e-mail, as instruções de recuperação serão enviadas pelos canais cadastrados.'});
        return;
      }
      if(password.length<8){
        setNotice({kind:'error',text:'Use uma senha com pelo menos 8 caracteres.'});
        return;
      }
      if(password!==confirmPassword){
        setNotice({kind:'error',text:'A confirmação da senha não corresponde à senha informada.'});
        return;
      }
      const result=await register(
        name.trim(),
        email.trim(),
        phone.trim(),
        password,
        confirmPassword,
        accountType,
        workspaceName.trim()||undefined,
      );
      if('accessToken' in result){
        setAuthenticatedName(result.user.name||name);
        setNotice({kind:'success',text:'Seu espaço MEG foi criado e o acesso está confirmado.'});
        onAuthenticated?.(result);
      }else{
        setNotice({kind:'success',text:result.message||'Solicitação enviada. O acesso será liberado após aprovação.'});
      }
    }catch(error){
      setNotice({kind:'error',text:errorMessage(error)});
    }finally{
      setBusy(false);
    }
  }

  const title=authenticatedName
    ?`Bem-vindo, ${authenticatedName.split(' ')[0]}.`
    :mode==='login'
      ?'Bem-vindo de volta.'
      :mode==='register'
        ?'Crie seu acesso.'
        :'Recupere seu acesso.';

  const subtitle=authenticatedName
    ?'Sua autenticação foi validada. Preparando sua visão financeira.'
    :mode==='login'
      ?'Entre na sua conta para acessar o MEG.'
      :mode==='register'
        ?'Entre em um espaço existente ou crie o seu MEG.'
        :'Informe seu e-mail para receber uma senha temporária.';

  return <main className="evo-login" data-evolution-screen="login" data-evolution-login-fidelity="approved-reference-v1" data-evolution-login-structure="faithful-login-v2">
    <div className="evo-login-overlay" aria-hidden="true"/>

    <section className="evo-login-shell">
      <section className="evo-login-story" aria-label="MEG Finanças">
        <img className="evo-login-brand" src="./brand/meg-loading-lockup.svg" alt="MEG Finanças"/>
        <div className="evo-login-kicker">MEG EVOLUTION</div>
        <h1>Sua vida financeira,<br/><strong>com clareza para<br/>decidir.</strong></h1>
        <p>Saldo, compromissos e projeções em uma visão única<br className="evo-login-copy-break"/> para você saber onde está e para onde está indo.</p>

        <div className="evo-login-proof" aria-label="Recursos do MEG">
          <article>
            <i><BarsIcon/></i>
            <span><b>Saldo real</b><small>Visão completa<br/>e atualizada</small></span>
          </article>
          <article>
            <i><TargetIcon/></i>
            <span><b>Projetos</b><small>Mais controle<br/>para seus planos</small></span>
          </article>
          <article>
            <i><SlidersIcon/></i>
            <span><b>Controle</b><small>Decisões melhores<br/>todos os dias</small></span>
          </article>
        </div>
      </section>

      <section className={`evo-login-card evo-login-card-${mode}`}>
        <div className="evo-login-card-head">
          <div className="evo-login-security-mark"><ShieldLockIcon/></div>
          <div className="evo-login-card-title">
            <span>{authenticatedName?'SESSÃO VALIDADA':mode==='login'?'ACESSO SEGURO':mode==='register'?'NOVO ACESSO':'RECUPERAÇÃO'}</span>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
        </div>

        {authenticatedName ? (
          <div className="evo-login-confirmed">
            <div className="evo-login-confirmed-ring"><ShieldLockIcon/></div>
            <strong>Acesso confirmado</strong>
            <p>Autenticação concluída. O MEG está preparando seus dados.</p>
            <button type="button" className="evo-login-secondary" onClick={()=>{setAuthenticatedName('');setPassword('');setNotice(null);}}>
              Voltar ao login
            </button>
          </div>
        ) : (
          <form className="evo-login-form" onSubmit={submit}>
            <div className="evo-login-form-scroll">
              {mode==='register'&&<>
                <label className="evo-login-field">
                  <span>Nome</span>
                  <div><UserIcon/><input autoComplete="name" value={name} onChange={e=>setName(e.target.value)} placeholder="Como devemos chamar você?" required/></div>
                </label>
                <label className="evo-login-field">
                  <span>Telefone</span>
                  <div><PhoneIcon/><input autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="(00) 00000-0000" required/></div>
                </label>
              </>}

              <label className="evo-login-field">
                <span>E-mail</span>
                <div><MailIcon/><input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com" required/></div>
              </label>

              {mode!=='forgot'&&<label className="evo-login-field">
                <span>Senha</span>
                <div>
                  <LockIcon/>
                  <input type={showPassword?'text':'password'} autoComplete={mode==='login'?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required/>
                  <button type="button" className="evo-login-eye" onClick={()=>setShowPassword(value=>!value)} aria-label={showPassword?'Ocultar senha':'Mostrar senha'}><EyeIcon closed={showPassword}/></button>
                </div>
              </label>}

              {mode==='register'&&<>
                <label className="evo-login-field">
                  <span>Confirmar senha</span>
                  <div><LockIcon/><input type={showPassword?'text':'password'} autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Repita a senha" required/></div>
                </label>

                <fieldset className="evo-login-account-type">
                  <legend>Como você quer começar?</legend>
                  <button type="button" className={accountType==='REQUEST_ACCESS'?'active':''} onClick={()=>setAccountType('REQUEST_ACCESS')}>
                    <strong>Acessar um MEG existente</strong><small>Solicita aprovação do administrador.</small>
                  </button>
                  <button type="button" className={accountType==='CREATE_WORKSPACE'?'active':''} onClick={()=>setAccountType('CREATE_WORKSPACE')}>
                    <strong>Criar meu espaço MEG</strong><small>Inicia uma nova base financeira.</small>
                  </button>
                </fieldset>

                {accountType==='CREATE_WORKSPACE'&&<label className="evo-login-field">
                  <span>Nome do espaço</span>
                  <div><UserIcon/><input value={workspaceName} onChange={e=>setWorkspaceName(e.target.value)} placeholder="Ex.: MEG da Família" required/></div>
                </label>}
              </>}

              {mode==='login'&&<div className="evo-login-options">
                <label>
                  <input type="checkbox" checked={rememberEmail} onChange={e=>setRememberEmail(e.target.checked)}/>
                  <span className="evo-login-checkbox">{rememberEmail&&<CheckIcon/>}</span>
                  Lembrar meu e-mail
                </label>
                <button type="button" onClick={()=>switchMode('forgot')}>Esqueci minha senha</button>
              </div>}

              {notice&&<div className={`evo-login-notice evo-login-notice-${notice.kind}`} role="status">{notice.text}</div>}
            </div>

            <button className="evo-login-primary" type="submit" disabled={busy}>
              <span>{busy?'Processando...':mode==='login'?'Entrar no MEG':mode==='register'?'Continuar':'Enviar recuperação'}</span>
              {!busy&&<i className="evo-login-primary-arrow"><ArrowIcon/></i>}
              {busy&&<i className="evo-login-spinner" aria-hidden="true"/>}
            </button>

            <div className="evo-login-switch">
              {mode==='login'&&<><i/><span>Ainda não tem acesso? <button type="button" onClick={()=>switchMode('register')}>Criar conta</button></span><i/></>}
              {mode!=='login'&&<><i/><span>Já possui acesso? <button type="button" onClick={()=>switchMode('login')}>Voltar ao login</button></span><i/></>}
            </div>
          </form>
        )}

        <div className="evo-login-secure"><ShieldLockIcon/><span>Sessão protegida</span><i/>Conexão segura com o MEG</div>
      </section>
    </section>
  </main>;
}
