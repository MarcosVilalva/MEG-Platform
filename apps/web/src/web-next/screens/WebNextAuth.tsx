import type { FormEventHandler } from 'react';
import '../styles/auth.css';

export type WebNextAuthMode = 'login' | 'register' | 'forgot';
export type WebNextAccountType = 'REQUEST_ACCESS' | 'CREATE_WORKSPACE';

function EyeIcon({ visible }: { visible: boolean }) {
  return visible
    ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 4.2A10.7 10.7 0 0 1 12 4c5.4 0 9 5.1 9 8 0 1.2-.7 2.7-1.9 4.1M6.2 6.3C4.2 7.8 3 10.2 3 12c0 2.9 3.6 8 9 8 1.7 0 3.2-.5 4.5-1.2"/></svg>
    : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12s3.6-8 9-8 9 8 9 8-3.6 8-9 8-9-8-9-8Z"/><circle cx="12" cy="12" r="2.6"/></svg>;
}

function MailIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="m4.5 7 7.5 5.5L19.5 7"/></svg>;
}

function ArrowIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5"/></svg>;
}

function ShieldIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.6 2.8 8 7 10 4.2-2 7-5.4 7-10V6Z"/><path d="m9 12 2 2 4-4"/></svg>;
}

function HeroGraphic() {
  return <div className="mnx-auth-orbit-stage" aria-hidden="true">
    <div className="mnx-auth-orbit mnx-auth-orbit-a" />
    <div className="mnx-auth-orbit mnx-auth-orbit-b" />
    <div className="mnx-auth-graph-card">
      <div className="mnx-auth-graph-grid" />
      <div className="mnx-auth-bars">
        <i style={{height:'25%'}}/><i style={{height:'34%'}}/><i style={{height:'48%'}}/><i style={{height:'57%'}}/><i style={{height:'72%'}}/><i style={{height:'92%'}}/>
      </div>
      <svg className="mnx-auth-line" viewBox="0 0 560 240" preserveAspectRatio="none"><path d="M18 202 C78 185 94 158 140 164 C188 170 188 122 232 131 C278 141 300 78 348 88 C395 98 411 55 454 61 C492 66 508 31 542 22"/><circle cx="542" cy="22" r="7"/></svg>
    </div>
    <div className="mnx-auth-float mnx-auth-float-a"><span>Visão do seu crescimento</span><strong>↗ +12,5%</strong></div>
    <div className="mnx-auth-float mnx-auth-float-b"><b>◔</b><span>Saldo real</span></div>
    <div className="mnx-auth-float mnx-auth-float-c"><b>◎</b><span>Objetivos mais perto</span></div>
  </div>;
}

function StatusMessage({ error, success, context }: { error: string; success: string; context: 'login' | 'register' | 'forgot' }) {
  if (error) return <div className="mnx-auth-message is-error" role="alert"><strong>{context === 'login' ? 'Não foi possível entrar' : context === 'register' ? 'Revise o cadastro' : 'Não foi possível recuperar'}</strong><span>{error}</span></div>;
  if (success) return <div className="mnx-auth-message is-success" role="status"><strong>{context === 'register' ? 'Solicitação registrada' : context === 'forgot' ? 'Confira seus canais' : 'Pronto'}</strong><span>{success}</span></div>;
  return null;
}

export function WebNextAuth({
  mode,
  logoSrc,
  email,
  password,
  showPassword,
  busy,
  error,
  success,
  registerName,
  registerPhone,
  registerEmail,
  registerPassword,
  registerConfirm,
  showRegisterPassword,
  showRegisterConfirm,
  registerStrength,
  accountType,
  workspaceName,
  onModeChange,
  onEmailChange,
  onPasswordChange,
  onTogglePassword,
  onRegisterNameChange,
  onRegisterPhoneChange,
  onRegisterEmailChange,
  onRegisterPasswordChange,
  onRegisterConfirmChange,
  onToggleRegisterPassword,
  onToggleRegisterConfirm,
  onAccountTypeChange,
  onWorkspaceNameChange,
  onSubmitLogin,
  onSubmitRegister,
  onSubmitForgot,
}: {
  mode: WebNextAuthMode;
  logoSrc: string;
  email: string;
  password: string;
  showPassword: boolean;
  busy: boolean;
  error: string;
  success: string;
  registerName: string;
  registerPhone: string;
  registerEmail: string;
  registerPassword: string;
  registerConfirm: string;
  showRegisterPassword: boolean;
  showRegisterConfirm: boolean;
  registerStrength: number;
  accountType: WebNextAccountType;
  workspaceName: string;
  onModeChange: (mode: WebNextAuthMode) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
  onRegisterNameChange: (value: string) => void;
  onRegisterPhoneChange: (value: string) => void;
  onRegisterEmailChange: (value: string) => void;
  onRegisterPasswordChange: (value: string) => void;
  onRegisterConfirmChange: (value: string) => void;
  onToggleRegisterPassword: () => void;
  onToggleRegisterConfirm: () => void;
  onAccountTypeChange: (value: WebNextAccountType) => void;
  onWorkspaceNameChange: (value: string) => void;
  onSubmitLogin: FormEventHandler<HTMLFormElement>;
  onSubmitRegister: FormEventHandler<HTMLFormElement>;
  onSubmitForgot: FormEventHandler<HTMLFormElement>;
}) {
  return <main className="mnx-auth" data-web-next-screen="auth">
    <section className="mnx-auth-shell" aria-label="Acesso ao MEG Finanças">
      <div className="mnx-auth-showcase">
        <div className="mnx-auth-brand"><img src={logoSrc} alt="MEG Finanças"/></div>
        <div className="mnx-auth-copy">
          <p className="mnx-auth-kicker">CONTROLE FINANCEIRO INTELIGENTE</p>
          <h1>Sua vida financeira,<br/><em>com clareza<br/>para decidir.</em></h1>
          <p>Saldo, compromissos e projeções em uma visão única para você saber onde está e para onde está indo.</p>
          <div className="mnx-auth-features"><span>▥ <b>Saldo real</b></span><span>↗ <b>Projeções</b></span><span>✓ <b>Controle</b></span></div>
        </div>
        <HeroGraphic/>
        <div className="mnx-auth-protected"><ShieldIcon/><span>Conexão protegida</span></div>
      </div>

      <div className={'mnx-auth-access is-' + mode}>
        <div className="mnx-auth-access-glow" aria-hidden="true"/>
        <div className="mnx-auth-access-brand"><img src={logoSrc} alt="MEG Finanças"/></div>

        {mode === 'login' ? <form className="mnx-auth-form" onSubmit={onSubmitLogin}>
          <header><h2>Bem-vindo de <em>volta.</em></h2><p>Entre na sua conta para acessar o MEG.</p></header>
          <label className="mnx-auth-field"><span>E-mail</span><div><MailIcon/><input type="email" autoComplete="username" inputMode="email" value={email} onChange={(event)=>onEmailChange(event.target.value)} placeholder="seu@email.com" autoFocus/></div></label>
          <label className="mnx-auth-field"><span className="mnx-auth-field-head"><b>Senha</b><button type="button" onClick={()=>onModeChange('forgot')}>Esqueci minha senha</button></span><div><input type={showPassword?'text':'password'} autoComplete="current-password" value={password} onChange={(event)=>onPasswordChange(event.target.value)} placeholder="••••••••"/><button className="mnx-auth-eye" type="button" onClick={onTogglePassword} aria-label={showPassword?'Ocultar senha':'Mostrar senha'}><EyeIcon visible={showPassword}/></button></div></label>
          <StatusMessage error={error} success={success} context="login"/>
          <button className="mnx-auth-primary" type="submit" disabled={busy || !email.trim() || !password}><span>{busy?'Validando acesso…':'Entrar no MEG'}</span>{busy?<i/>:<ArrowIcon/>}</button>
          <div className="mnx-auth-divider"><span/> <b>Novo por aqui?</b> <span/></div>
          <button className="mnx-auth-secondary" type="button" onClick={()=>onModeChange('register')}>Criar conta</button>
        </form> : null}

        {mode === 'register' ? <form className="mnx-auth-form mnx-auth-form-register" onSubmit={onSubmitRegister}>
          <header><button className="mnx-auth-back" type="button" onClick={()=>onModeChange('login')}>← Voltar</button><h2>Crie seu <em>acesso.</em></h2><p>Cadastre seus dados e escolha como quer começar no MEG.</p></header>
          <div className="mnx-auth-account-type" role="group" aria-label="Tipo de cadastro">
            <button type="button" className={accountType==='REQUEST_ACCESS'?'active':''} onClick={()=>onAccountTypeChange('REQUEST_ACCESS')}><strong>Acessar um MEG existente</strong><small>Solicita aprovação ao administrador.</small></button>
            <button type="button" className={accountType==='CREATE_WORKSPACE'?'active':''} onClick={()=>onAccountTypeChange('CREATE_WORKSPACE')}><strong>Criar meu espaço MEG</strong><small>Abre um novo ambiente para você.</small></button>
          </div>
          <div className="mnx-auth-grid"><label className="mnx-auth-field"><span>Nome</span><div><input value={registerName} onChange={(e)=>onRegisterNameChange(e.target.value)} autoComplete="name" placeholder="Seu nome"/></div></label><label className="mnx-auth-field"><span>Telefone</span><div><input value={registerPhone} onChange={(e)=>onRegisterPhoneChange(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="(18) 99999-9999"/></div></label></div>
          <label className="mnx-auth-field"><span>E-mail</span><div><MailIcon/><input type="email" value={registerEmail} onChange={(e)=>onRegisterEmailChange(e.target.value)} inputMode="email" autoComplete="email" placeholder="seu@email.com"/></div></label>
          {accountType==='CREATE_WORKSPACE'?<label className="mnx-auth-field"><span>Nome do espaço</span><div><input value={workspaceName} onChange={(e)=>onWorkspaceNameChange(e.target.value)} placeholder="Ex.: Finanças da Família"/></div></label>:null}
          <div className="mnx-auth-grid"><label className="mnx-auth-field"><span>Senha</span><div><input type={showRegisterPassword?'text':'password'} value={registerPassword} onChange={(e)=>onRegisterPasswordChange(e.target.value)} autoComplete="new-password" placeholder="Mínimo 8 caracteres"/><button className="mnx-auth-eye" type="button" onClick={onToggleRegisterPassword}><EyeIcon visible={showRegisterPassword}/></button></div></label><label className="mnx-auth-field"><span>Confirmar senha</span><div><input type={showRegisterConfirm?'text':'password'} value={registerConfirm} onChange={(e)=>onRegisterConfirmChange(e.target.value)} autoComplete="new-password" placeholder="Repita a senha"/><button className="mnx-auth-eye" type="button" onClick={onToggleRegisterConfirm}><EyeIcon visible={showRegisterConfirm}/></button></div></label></div>
          <div className="mnx-auth-strength"><div>{[0,1,2,3].map(item=><i key={item} className={registerStrength>item?'active':''}/>)}</div><small>{registerPassword?(registerStrength<=1?'Senha básica':registerStrength===2?'Senha razoável':registerStrength===3?'Senha boa':'Senha forte'):'Use letras, números e um símbolo.'}</small></div>
          <StatusMessage error={error} success={success} context="register"/>
          <button className="mnx-auth-primary" type="submit" disabled={busy || Boolean(success)}><span>{busy?'Enviando cadastro…':success?'Aguardando aprovação':'Continuar'}</span>{busy?<i/>:<ArrowIcon/>}</button>
          {success?<button className="mnx-auth-secondary" type="button" onClick={()=>onModeChange('login')}>Voltar para o login</button>:null}
        </form>:null}

        {mode === 'forgot' ? <form className="mnx-auth-form" onSubmit={onSubmitForgot}>
          <header><button className="mnx-auth-back" type="button" onClick={()=>onModeChange('login')}>← Voltar</button><h2>Recuperar <em>acesso.</em></h2><p>Informe seu e-mail. O MEG enviará uma senha temporária pelos canais configurados.</p></header>
          <label className="mnx-auth-field"><span>E-mail</span><div><MailIcon/><input type="email" autoComplete="username" inputMode="email" value={email} onChange={(e)=>onEmailChange(e.target.value)} placeholder="seu@email.com" autoFocus/></div></label>
          <StatusMessage error={error} success={success} context="forgot"/>
          <button className="mnx-auth-primary" type="submit" disabled={busy || !email.trim() || Boolean(success)}><span>{busy?'Enviando…':success?'Recuperação enviada':'Enviar recuperação'}</span>{busy?<i/>:<ArrowIcon/>}</button>
          {success?<button className="mnx-auth-secondary" type="button" onClick={()=>onModeChange('login')}>Voltar para entrar</button>:null}
        </form>:null}

        <footer className="mnx-auth-foot"><ShieldIcon/><span>MEG FINANÇAS · ACESSO SEGURO</span></footer>
      </div>
    </section>
  </main>;
}
