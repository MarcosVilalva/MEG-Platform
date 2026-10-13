import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { login } from '../../app/auth-client';
import './login.css';

type LoginScreenProps = {
  onAuthenticated: () => void;
  onNavigate: (destination: 'create-account' | 'recover-password') => void;
};

type LoginError = 'email' | 'password' | 'server' | null;
const EMAIL_REMEMBER_KEY = 'meg-web-evolution:remembered-email';

function readRememberedEmail() {
  try { return window.localStorage.getItem(EMAIL_REMEMBER_KEY) || ''; }
  catch { return ''; }
}

function getLoginError(error: unknown): string {
  const reason = error && typeof error === 'object' && 'code' in error
    ? String(error.code) : error instanceof Error ? error.message : '';
  switch (reason) {
    case 'INVALID_CREDENTIALS': return 'E-mail ou senha incorretos. Confira os dados e tente novamente.';
    case 'ACCESS_PENDING': return 'Seu cadastro está aguardando aprovação para acessar o MEG.';
    case 'ACCESS_REJECTED': return 'O acesso a esta conta não foi aprovado.';
    case 'USER_BLOCKED': return 'Esta conta está bloqueada. Entre em contato com o administrador.';
    case 'HTTP_429': return 'Muitas tentativas de acesso. Aguarde antes de tentar novamente.';
    default: return 'Não foi possível entrar agora. Verifique sua conexão e tente novamente.';
  }
}

function LoginIcon({ name }: { name: 'shield' | 'mail' | 'lock' | 'eye' | 'eye-off' | 'arrow' | 'bars' | 'target' | 'sliders' }) {
  const paths: Record<typeof name, ReactNode> = {
    shield: <><path d="M12 2.5 20 6v5.5c0 5-3.3 8.3-8 10-4.7-1.7-8-5-8-10V6Z"/><rect x="10" y="10.8" width="4" height="5" rx=".7"/><path d="M11 10.8V9.5a1 1 0 0 1 2 0v1.3"/></>,
    mail: <><rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v3"/></>,
    eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="3"/></>,
    'eye-off': <><path d="M3 3 21 21"/><path d="M10 6.3a11.6 11.6 0 0 1 2-.3c6.5 0 10 6 10 6a17 17 0 0 1-3.1 3.5M6.2 6.5C3.5 8.2 2 12 2 12s3.5 6 10 6a10.5 10.5 0 0 0 3.1-.4"/><path d="M10 10a3 3 0 0 0 4 4"/></>,
    arrow: <><path d="M4 12h16m-7-7 7 7-7 7"/></>,
    bars: <><path d="M4 20v-5M9.5 20V9M15 20V12M20 20V4"/></>,
    target: <><circle cx="11" cy="13" r="8"/><circle cx="11" cy="13" r="4"/><path d="m11 13 9-9M15 4h5v5"/></>,
    sliders: <><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2" fill="currentColor" stroke="none"/><circle cx="16" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="8" cy="18" r="2" fill="currentColor" stroke="none"/></>
  };
  return <svg className="meg-login-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name]}</svg>;
}

export function LoginScreen({ onAuthenticated, onNavigate }: LoginScreenProps) {
  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();
  const [email, setEmail] = useState(readRememberedEmail);
  const [password, setPassword] = useState('');
  const [rememberEmail, setRememberEmail] = useState(true);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorField, setErrorField] = useState<LoginError>(null);
  const [message, setMessage] = useState('');
  const [authenticated, setAuthenticated] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || authenticated) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setErrorField('email'); setMessage('Digite um e-mail válido.'); return;
    }
    if (password.length < 8) {
      setErrorField('password'); setMessage('A senha precisa ter pelo menos 8 caracteres.'); return;
    }
    setErrorField(null);
    setMessage('');
    setSubmitting(true);
    try {
      await login(normalizedEmail, password);
      try {
        if (rememberEmail) window.localStorage.setItem(EMAIL_REMEMBER_KEY, normalizedEmail);
        else window.localStorage.removeItem(EMAIL_REMEMBER_KEY);
      } catch { /* armazenamento opcional */ }
      setAuthenticated(true);
      setPassword('');
      setMessage('Acesso autorizado. Preparando seu espaço no MEG.');
      window.setTimeout(onAuthenticated, 700);
    } catch (error) {
      setErrorField('server');
      setMessage(getLoginError(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="meg-login" data-meg-login="stage05" aria-label="Acesso ao MEG Finanças">
      <div className="meg-login-frame">
        <section className="meg-login-hero" aria-label="Conheça o MEG Finanças">
          <img className="meg-login-logo" src={`${import.meta.env.BASE_URL}brand/logo-meg-financas.svg`} alt="MEG Finanças" width="153" height="150" />
          <div className="meg-login-hero-copy">
            <p className="meg-login-eyebrow">MEG EVOLUTION</p>
            <h1>Sua vida financeira,<span> com clareza para decidir.</span></h1>
            <p className="meg-login-intro">Saldo, compromissos e projeções em uma visão única para você saber onde está e para onde está indo.</p>
          </div>
          <div className="meg-login-features" aria-label="Benefícios do MEG">
            <article className="meg-login-feature"><span className="meg-login-feature-icon"><LoginIcon name="bars" /></span><div><strong>Saldo real</strong><span>Visão completa e atualizada</span></div></article>
            <article className="meg-login-feature"><span className="meg-login-feature-icon"><LoginIcon name="target" /></span><div><strong>Projetos</strong><span>Mais controle para seus planos</span></div></article>
            <article className="meg-login-feature"><span className="meg-login-feature-icon"><LoginIcon name="sliders" /></span><div><strong>Controle</strong><span>Decisões melhores todos os dias</span></div></article>
          </div>
        </section>

        <section className="meg-login-panel" aria-labelledby="meg-login-heading">
          <div className="meg-login-panel-top">
            <span className="meg-login-security-icon"><LoginIcon name="shield" /></span>
            <div><p className="meg-login-panel-label">ACESSO SEGURO</p><h2 id="meg-login-heading">Bem-vindo de volta.</h2><p className="meg-login-panel-lead">Entre na sua conta para acessar o MEG.</p></div>
          </div>
          <form className="meg-login-form" onSubmit={submit} noValidate>
            <div className="meg-login-input-block">
              <label htmlFor={emailId}>E-mail</label>
              <div className={`meg-login-input-wrap ${errorField === 'email' ? 'is-invalid' : ''}`}>
                <LoginIcon name="mail" />
                <input id={emailId} type="email" name="email" autoComplete="username" inputMode="email" required placeholder="seu@email.com" value={email} onChange={event => {setEmail(event.target.value); if(errorField) {setErrorField(null);setMessage('');}}} aria-invalid={errorField === 'email'} aria-describedby={errorField === 'email' ? errorId : undefined} disabled={submitting || authenticated} />
              </div>
            </div>
            <div className="meg-login-input-block">
              <label htmlFor={passwordId}>Senha</label>
              <div className={`meg-login-input-wrap ${errorField === 'password' ? 'is-invalid' : ''}`}>
                <LoginIcon name="lock" />
                <input id={passwordId} type={passwordVisible ? 'text' : 'password'} name="password" autoComplete="current-password" required minLength={8} placeholder="••••••••" value={password} onChange={event => {setPassword(event.target.value); if(errorField) {setErrorField(null);setMessage('');}}} aria-invalid={errorField === 'password'} aria-describedby={errorField === 'password' ? errorId : undefined} disabled={submitting || authenticated} />
                <button className="meg-login-password-toggle" type="button" aria-label={passwordVisible ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={passwordVisible} disabled={submitting || authenticated} onClick={() => setPasswordVisible(value => !value)}><LoginIcon name={passwordVisible ? 'eye-off' : 'eye'} /></button>
              </div>
            </div>
            <div className="meg-login-options">
              <label className="meg-login-remember"><input type="checkbox" checked={rememberEmail} onChange={event => setRememberEmail(event.target.checked)} disabled={submitting || authenticated}/><span>Lembrar meu e-mail</span></label>
              <a href="?auth=recover-password" onClick={event => {event.preventDefault();onNavigate('recover-password');}}>Esqueci minha senha</a>
            </div>
            <p id={errorId} className={`meg-login-message ${errorField ? 'is-error' : ''}`} role={errorField ? 'alert' : 'status'} aria-live="polite">{message}</p>
            <button type="submit" className="meg-login-submit" disabled={submitting || authenticated} aria-busy={submitting}>
              <span>{submitting ? 'Entrando...' : authenticated ? 'Acesso autorizado' : 'Entrar no MEG'}</span>
              <span className="meg-login-submit-arrow"><LoginIcon name="arrow" /></span>
            </button>
          </form>
          <div className="meg-login-create"><span>Ainda não tem acesso?</span><a href="?auth=create-account" onClick={event => {event.preventDefault();onNavigate('create-account');}}>Criar conta</a></div>
          <p className="meg-login-secure-note"><LoginIcon name="shield" />Sessão protegida <span aria-hidden="true">•</span> Conexão segura com o MEG</p>
        </section>
      </div>
    </main>
  );
}
