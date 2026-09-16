import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  authenticatedRequest,
  clearSession,
  forgotPassword,
  login,
  logout,
  readSession,
  register
} from '../app/auth-client';
import { PhoenixApp } from './PhoenixApp';
import { loadPhoenixReadModel } from './data/load-phoenix-read-model';
import './preview.css';
import './phoenix-preview-parity.css';
import './preview-auth-flow.css';
import './preview-boot.css';

type PreviewState = 'checking' | 'signed-out' | 'preparing' | 'prepare-error' | 'signed-in';
type AuthMode = 'login' | 'register' | 'forgot';
type AccountType = 'REQUEST_ACCESS' | 'CREATE_WORKSPACE';
type BootStage = 'session' | 'finance' | 'organizing' | 'ready';

const bootStages: Array<{ id: BootStage; label: string; title: string; description: string; progress: number }> = [
  { id: 'session', label: 'Validando sua sessão', title: 'Validando seu acesso', description: 'Confirmando sua sessão segura no MEG.', progress: 22 },
  { id: 'finance', label: 'Carregando suas finanças', title: 'Carregando suas finanças', description: 'Buscando saldos, lançamentos, cartões e compromissos.', progress: 55 },
  { id: 'organizing', label: 'Organizando cartões e pendências', title: 'Organizando sua visão financeira', description: 'Preparando os dados para que as telas já abram prontas.', progress: 82 },
  { id: 'ready', label: 'Tudo pronto', title: 'Tudo pronto', description: 'Sua visão financeira está preparada.', progress: 100 },
];

function currentMonth() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit'
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value || '2026';
  const month = parts.find((part) => part.type === 'month')?.value || '01';
  return `${year}-${month}`;
}

function nextPaint() {
  return new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
}

async function preparePhoenixSession(onStage?: (stage: BootStage) => void) {
  onStage?.('finance');
  await loadPhoenixReadModel(currentMonth());
  onStage?.('organizing');
  await nextPaint();
  onStage?.('ready');
  await nextPaint();
}

function isTransientAuthError(cause: unknown) {
  const message = cause instanceof Error ? cause.message : '';
  return /HTTP_(?:502|503|504)|network|fetch|timeout|ECONN|upstream/i.test(message);
}

function isUnauthorizedError(cause: unknown) {
  const status = Number((cause as { status?: number } | null)?.status || 0);
  const message = cause instanceof Error ? cause.message : '';
  return status === 401 || /(?:^|_)UNAUTHORIZED$|HTTP_401/i.test(message);
}

function waitForService(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function authErrorMessage(cause: unknown) {
  const message = cause instanceof Error ? cause.message : '';
  if (message === 'ACCESS_PENDING') return 'Seu cadastro já existe e ainda aguarda aprovação do administrador.';
  if (message === 'EMAIL_ALREADY_REGISTERED') return 'Este e-mail já possui cadastro no MEG.';
  if (message === 'ACCOUNT_NOT_FOUND') return 'Não localizamos uma conta ativa com este e-mail.';
  if (message === 'USER_BLOCKED') return 'Este acesso está bloqueado. Procure o administrador do seu espaço.';
  if (message === 'ACCESS_REJECTED') return 'Esta solicitação de acesso não está ativa.';
  if (message === 'PASSWORD_RESET_RATE_LIMITED') return 'Já houve uma recuperação recente. Aguarde alguns minutos antes de tentar novamente.';
  if (message === 'WORKSPACE_MEMBER_LIMIT_REACHED') return 'O espaço atingiu o limite de usuários do plano atual.';
  if (message === 'WORKSPACE_NOT_FOUND') return 'Não foi possível localizar o espaço solicitado.';
  if (/401|invalid|credential|login|unauthor/i.test(message)) return 'E-mail ou senha não conferem. Revise os dados e tente novamente.';
  if (/HTTP_(?:502|503|504)|upstream/i.test(message)) return 'O MEG está iniciando os serviços. Aguarde alguns segundos e tente novamente.';
  if (/network|fetch|timeout|ECONN/i.test(message)) return 'Não foi possível falar com o MEG agora. Verifique sua conexão e tente novamente.';
  return 'Não foi possível concluir esta operação agora. Tente novamente em instantes.';
}

function bootErrorMessage(cause: unknown) {
  const message = cause instanceof Error ? cause.message : '';
  if (/HTTP_(?:502|503|504)|network|fetch|timeout|ECONN|upstream/i.test(message)) {
    return 'Seu acesso foi confirmado, mas o MEG não conseguiu concluir o carregamento dos dados. Tente novamente em instantes.';
  }
  return 'Seu acesso foi confirmado. Houve uma falha ao preparar sua visão financeira, sem invalidar sua sessão. Tente carregar novamente.';
}

function EyeIcon({ visible }: { visible: boolean }) {
  return visible
    ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 4.2A10.7 10.7 0 0 1 12 4c5.4 0 9 5.1 9 8 0 1.2-.7 2.7-1.9 4.1M6.2 6.3C4.2 7.8 3 10.2 3 12c0 2.9 3.6 8 9 8 1.7 0 3.2-.5 4.5-1.2" /></svg>
    : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12s3.6-8 9-8 9 8 9 8-3.6 8-9 8-9-8-9-8Z" /><circle cx="12" cy="12" r="2.6" /></svg>;
}

function passwordScore(value: string) {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  return score;
}

function PhoenixBootScreen({ stage }: { stage: BootStage }) {
  const activeIndex = Math.max(0, bootStages.findIndex((item) => item.id === stage));
  const active = bootStages[activeIndex];
  return <main className="px-preview-fullscreen-boot" aria-live="polite" aria-busy={stage !== 'ready'}>
    <section className="px-preview-boot-card" aria-label="Preparando MEG Finanças">
      <div className="px-preview-boot-logo"><span className="px-preview-boot-orbit" aria-hidden="true" /><img src="./brand/meg-finance-system-mark.svg" alt="MEG Finanças" /></div>
      <div className="px-preview-boot-copy"><span>MEG FINANÇAS</span><h1>{active.title}</h1><p>{active.description}</p></div>
      <div className="px-preview-boot-progress" aria-label={`${active.progress}% preparado`}>
        <div className="px-preview-boot-track"><span style={{ width: `${active.progress}%` }} /></div>
      </div>
      <div className="px-preview-boot-steps">
        {bootStages.map((item, index) => <div key={item.id} className={`px-preview-boot-step ${index < activeIndex ? 'done' : index === activeIndex ? 'active' : ''}`}><i>{index < activeIndex ? '✓' : index + 1}</i><span>{item.label}</span></div>)}
      </div>
      <div className="px-preview-boot-foot"><i aria-hidden="true" /><span>Conexão protegida · preparando os dados antes da navegação</span></div>
    </section>
  </main>;
}

function PhoenixBootErrorScreen({ message, busy, onRetry, onLogout }: { message: string; busy: boolean; onRetry: () => void; onLogout: () => void }) {
  return <main className="px-preview-fullscreen-boot" aria-live="assertive">
    <section className="px-preview-boot-card px-preview-boot-error" aria-label="Falha ao preparar MEG Finanças">
      <div className="px-preview-boot-logo"><img src="./brand/meg-finance-system-mark.svg" alt="MEG Finanças" /></div>
      <div className="px-preview-boot-copy"><span>ACESSO CONFIRMADO</span><h1>Não foi possível carregar seus dados.</h1><p>{message}</p></div>
      <div className="px-preview-boot-error-actions">
        <button className="px-preview-submit" type="button" disabled={busy} onClick={onRetry}><span>{busy ? 'Carregando…' : 'Tentar novamente'}</span><span aria-hidden="true">↻</span></button>
        <button className="px-preview-secondary" type="button" disabled={busy} onClick={onLogout}>Sair</button>
      </div>
      <div className="px-preview-boot-foot"><i aria-hidden="true" /><span>Sua autenticação permanece válida enquanto você tenta novamente.</span></div>
    </section>
  </main>;
}

function PhoenixPreviewRoot() {
  const [state, setState] = useState<PreviewState>(() => readSession() ? 'checking' : 'signed-out');
  const [bootStage, setBootStage] = useState<BootStage>('session');
  const [bootError, setBootError] = useState('');
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirm, setRegisterConfirm] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirm, setShowRegisterConfirm] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>('REQUEST_ACCESS');
  const [workspaceName, setWorkspaceName] = useState('');

  const registerStrength = useMemo(() => passwordScore(registerPassword), [registerPassword]);

  useEffect(() => {
    if (state !== 'checking') return;
    let active = true;
    setBootStage('session');
    setBootError('');
    void authenticatedRequest('/auth/me')
      .then(async () => {
        if (!active) return;
        setState('preparing');
        try {
          await preparePhoenixSession((stage) => { if (active) setBootStage(stage); });
          if (active) setState('signed-in');
        } catch (cause) {
          console.error('Phoenix bootstrap failed after session validation:', cause instanceof Error ? cause.message : 'UNKNOWN');
          if (active) {
            setBootError(bootErrorMessage(cause));
            setState('prepare-error');
          }
        }
      })
      .catch((cause) => {
        if (!active) return;
        if (isUnauthorizedError(cause)) {
          clearSession();
          setBootStage('session');
          setState('signed-out');
          return;
        }
        console.error('Phoenix session validation unavailable:', cause instanceof Error ? cause.message : 'UNKNOWN');
        setBootError('Sua sessão continua preservada, mas o MEG não conseguiu validá-la agora. Tente novamente.');
        setState('prepare-error');
      });
    return () => { active = false; };
  }, [state]);

  useEffect(() => {
    if (state !== 'signed-in') return;
    let stored: string | null = null;
    try { stored = localStorage.getItem('meg-sidebar-collapsed'); } catch { stored = null; }
    const shouldCollapse = stored === 'true' || (stored === null && window.matchMedia('(max-width:1100px)').matches);
    if (!shouldCollapse) return;
    const frame = window.requestAnimationFrame(() => {
      const app = document.querySelector('.px-app');
      const button = document.querySelector<HTMLButtonElement>('.px-collapse');
      if (app && button && !app.classList.contains('is-collapsed')) button.click();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [state]);

  function switchMode(next: AuthMode) {
    if (busy) return;
    setMode(next);
    setError('');
    setSuccess('');
    if (next === 'forgot' && !email && registerEmail) setEmail(registerEmail);
    if (next === 'login' && !email && registerEmail) setEmail(registerEmail);
  }

  async function prepareAuthenticatedSession() {
    setBootError('');
    setBootStage('finance');
    setState('preparing');
    try {
      await preparePhoenixSession(setBootStage);
      setState('signed-in');
      return true;
    } catch (cause) {
      console.error('Phoenix bootstrap failed after authentication:', cause instanceof Error ? cause.message : 'UNKNOWN');
      setBootError(bootErrorMessage(cause));
      setState('prepare-error');
      return false;
    }
  }

  async function retryPreparation() {
    if (busy || !readSession()) {
      if (!readSession()) setState('signed-out');
      return;
    }
    setBusy(true);
    try {
      await prepareAuthenticatedSession();
    } finally {
      setBusy(false);
    }
  }

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !email.trim() || !password) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      try {
        await login(email.trim(), password);
      } catch (cause) {
        if (!isTransientAuthError(cause)) throw cause;
        await waitForService(1400);
        await login(email.trim(), password);
      }
      await prepareAuthenticatedSession();
    } catch (cause) {
      setState('signed-out');
      setError(authErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function submitRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const phoneDigits = registerPhone.replace(/\D/g, '');
    if (busy) return;
    setError('');
    setSuccess('');
    if (registerName.trim().length < 2) return setError('Informe seu nome para continuar.');
    if (!registerEmail.trim()) return setError('Informe um e-mail válido.');
    if (phoneDigits.length < 10 || phoneDigits.length > 15) return setError('Informe um telefone válido com DDD.');
    if (registerPassword.length < 8) return setError('A senha precisa ter pelo menos 8 caracteres.');
    if (registerPassword !== registerConfirm) return setError('As senhas informadas não são iguais.');
    if (accountType === 'CREATE_WORKSPACE' && workspaceName.trim().length < 2) return setError('Informe um nome para o novo espaço MEG.');

    setBusy(true);
    try {
      const result = await register(
        registerName.trim(),
        registerEmail.trim(),
        phoneDigits,
        registerPassword,
        registerConfirm,
        accountType,
        accountType === 'CREATE_WORKSPACE' ? workspaceName.trim() : undefined
      );
      if ('status' in result && result.status === 'PENDING_APPROVAL') {
        setSuccess(accountType === 'CREATE_WORKSPACE'
          ? 'Cadastro recebido. Seu novo espaço MEG está aguardando ativação.'
          : 'Solicitação enviada. Um administrador precisa aprovar seu acesso antes do primeiro login.');
        return;
      }
      await prepareAuthenticatedSession();
    } catch (cause) {
      setMode('login');
      setState('signed-out');
      setError(authErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function submitForgot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !email.trim()) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const result = await forgotPassword(email.trim());
      const sentChannels = result.notifications.filter((item) => item.status === 'sent').map((item) => item.channel === 'email' ? 'e-mail' : 'WhatsApp');
      setSuccess(`Recuperação enviada${sentChannels.length ? ` por ${sentChannels.join(' e ')}` : ''}. Use a senha temporária recebida para entrar novamente.`);
    } catch (cause) {
      setError(authErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    const session = readSession();
    try {
      if (session) await logout(session);
      else clearSession();
    } catch {
      clearSession();
    } finally {
      setPassword('');
      setShowPassword(false);
      setError('');
      setSuccess('');
      setBootError('');
      setMode('login');
      setBootStage('session');
      setState('signed-out');
    }
  }

  if (state === 'signed-in') return <PhoenixApp onLogout={() => { void signOut(); }} />;
  if (state === 'checking' || state === 'preparing') return <PhoenixBootScreen stage={bootStage} />;
  if (state === 'prepare-error') return <PhoenixBootErrorScreen message={bootError} busy={busy} onRetry={() => { void retryPreparation(); }} onLogout={() => { void signOut(); }} />;

  return <main className="px-preview-auth">
    <section className="px-preview-shell" aria-label="Acesso ao MEG Finanças">
      <div className="px-preview-showcase">
        <div className="px-preview-showcase-brand">
          <img src="./brand/meg-finance-system-mark.svg" alt="MEG Finance System" />
          <div><span>MEG FINANÇAS</span><strong>Finance System</strong></div>
        </div>

        <div className="px-preview-hero-copy">
          <h1>Sua vida financeira,<br />com clareza para decidir.</h1>
          <p>Saldo, compromissos e projeções em uma visão única para você saber onde está e para onde está indo.</p>
          <div className="px-preview-feature-strip" aria-label="Recursos principais">
            <span><i>◉</i>Saldo real</span>
            <span><i>↗</i>Projeções</span>
            <span><i>✓</i>Controle</span>
          </div>
        </div>

        <div className="px-preview-showcase-foot"><span className="px-preview-live-dot" aria-hidden="true" /><strong>Conexão protegida</strong></div>
      </div>

      <div className="px-preview-access">
        <div className="px-preview-mobile-brand" aria-hidden="true"><img src="./brand/meg-finance-system-mark.svg" alt="" /><div><strong>MEG</strong><span>Finanças</span></div></div>
        {mode === 'login' ? <form className="px-preview-form" onSubmit={submitLogin}>
          <div className="px-preview-copy"><h2>Bem-vindo de volta.</h2><p>Entre na sua conta para acessar o MEG.</p></div>

          <label className="px-preview-field"><span>E-mail</span><input type="email" autoComplete="username" inputMode="email" value={email} onChange={(event) => { setEmail(event.target.value); if (error) setError(''); }} placeholder="seu@email.com" autoFocus /></label>
          <label className="px-preview-field"><div className="px-preview-field-head"><span>Senha</span><button type="button" onClick={() => switchMode('forgot')}>Esqueci minha senha</button></div><div className="px-preview-password"><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => { setPassword(event.target.value); if (error) setError(''); }} placeholder="••••••••" /><button type="button" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} title={showPassword ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShowPassword((value) => !value)}><EyeIcon visible={showPassword} /></button></div></label>

          {error ? <div className="px-preview-error" role="alert"><span>!</span><div><strong>Não foi possível entrar</strong><small>{error}</small></div></div> : null}
          {success ? <div className="px-preview-success" role="status"><span>✓</span><div><strong>Pronto</strong><small>{success}</small></div></div> : null}

          <button className="px-preview-submit" type="submit" disabled={busy || !email.trim() || !password}><span>{busy ? 'Validando acesso…' : 'Entrar no MEG'}</span>{!busy ? <span aria-hidden="true">→</span> : <span className="px-preview-button-spinner" aria-hidden="true" />}</button>
          <div className="px-preview-auth-switch"><span>Novo por aqui?</span><button type="button" onClick={() => switchMode('register')}>Criar conta</button></div>
        </form> : mode === 'register' ? <form className="px-preview-form px-preview-form-register" onSubmit={submitRegister}>
          <div className="px-preview-copy"><button className="px-preview-back" type="button" onClick={() => switchMode('login')}>← Voltar</button><h2>Crie seu acesso.</h2><p>Cadastre seus dados e escolha como quer começar no MEG.</p></div>

          <div className="px-preview-account-type" role="group" aria-label="Tipo de cadastro">
            <button type="button" className={accountType === 'REQUEST_ACCESS' ? 'active' : ''} onClick={() => setAccountType('REQUEST_ACCESS')}><strong>Acessar um MEG existente</strong><small>Solicita aprovação ao administrador.</small></button>
            <button type="button" className={accountType === 'CREATE_WORKSPACE' ? 'active' : ''} onClick={() => setAccountType('CREATE_WORKSPACE')}><strong>Criar meu espaço MEG</strong><small>Abre um novo ambiente para você.</small></button>
          </div>

          <div className="px-preview-form-grid"><label className="px-preview-field"><span>Nome</span><input value={registerName} onChange={(event) => setRegisterName(event.target.value)} autoComplete="name" placeholder="Seu nome" /></label><label className="px-preview-field"><span>Telefone</span><input value={registerPhone} onChange={(event) => setRegisterPhone(event.target.value)} inputMode="tel" autoComplete="tel" placeholder="(18) 99999-9999" /></label></div>
          <label className="px-preview-field"><span>E-mail</span><input type="email" value={registerEmail} onChange={(event) => setRegisterEmail(event.target.value)} inputMode="email" autoComplete="email" placeholder="seu@email.com" /></label>
          {accountType === 'CREATE_WORKSPACE' ? <label className="px-preview-field"><span>Nome do espaço</span><input value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} placeholder="Ex.: Finanças da Família" /></label> : null}
          <div className="px-preview-form-grid"><label className="px-preview-field"><span>Senha</span><div className="px-preview-password"><input type={showRegisterPassword ? 'text' : 'password'} value={registerPassword} onChange={(event) => setRegisterPassword(event.target.value)} autoComplete="new-password" placeholder="Mínimo 8 caracteres" /><button type="button" onClick={() => setShowRegisterPassword((value) => !value)} aria-label={showRegisterPassword ? 'Ocultar senha' : 'Mostrar senha'}><EyeIcon visible={showRegisterPassword} /></button></div></label><label className="px-preview-field"><span>Confirmar senha</span><div className="px-preview-password"><input type={showRegisterConfirm ? 'text' : 'password'} value={registerConfirm} onChange={(event) => setRegisterConfirm(event.target.value)} autoComplete="new-password" placeholder="Repita a senha" /><button type="button" onClick={() => setShowRegisterConfirm((value) => !value)} aria-label={showRegisterConfirm ? 'Ocultar senha' : 'Mostrar senha'}><EyeIcon visible={showRegisterConfirm} /></button></div></label></div>
          <div className="px-preview-strength" aria-label="Força da senha"><div>{[0, 1, 2, 3].map((item) => <i key={item} className={registerStrength > item ? 'active' : ''} />)}</div><small>{registerPassword ? registerStrength <= 1 ? 'Senha básica' : registerStrength === 2 ? 'Senha razoável' : registerStrength === 3 ? 'Senha boa' : 'Senha forte' : 'Use letras, números e um símbolo.'}</small></div>

          {error ? <div className="px-preview-error" role="alert"><span>!</span><div><strong>Revise o cadastro</strong><small>{error}</small></div></div> : null}
          {success ? <div className="px-preview-success" role="status"><span>✓</span><div><strong>Solicitação registrada</strong><small>{success}</small></div></div> : null}
          <button className="px-preview-submit" type="submit" disabled={busy || Boolean(success)}><span>{busy ? 'Enviando cadastro…' : success ? 'Aguardando aprovação' : 'Continuar'}</span>{!busy ? <span aria-hidden="true">→</span> : <span className="px-preview-button-spinner" aria-hidden="true" />}</button>
          {success ? <button className="px-preview-secondary" type="button" onClick={() => { setEmail(registerEmail); switchMode('login'); }}>Voltar para o login</button> : null}
        </form> : <form className="px-preview-form" onSubmit={submitForgot}>
          <div className="px-preview-copy"><button className="px-preview-back" type="button" onClick={() => switchMode('login')}>← Voltar</button><h2>Recuperar acesso.</h2><p>Informe seu e-mail. O MEG enviará uma senha temporária pelos canais configurados para a sua conta.</p></div>
          <label className="px-preview-field"><span>E-mail</span><input type="email" autoComplete="username" inputMode="email" value={email} onChange={(event) => { setEmail(event.target.value); if (error) setError(''); }} placeholder="seu@email.com" autoFocus /></label>
          {error ? <div className="px-preview-error" role="alert"><span>!</span><div><strong>Não foi possível recuperar</strong><small>{error}</small></div></div> : null}
          {success ? <div className="px-preview-success" role="status"><span>✓</span><div><strong>Confira seus canais</strong><small>{success}</small></div></div> : null}
          <button className="px-preview-submit" type="submit" disabled={busy || !email.trim() || Boolean(success)}><span>{busy ? 'Enviando…' : success ? 'Recuperação enviada' : 'Enviar recuperação'}</span>{!busy ? <span aria-hidden="true">→</span> : <span className="px-preview-button-spinner" aria-hidden="true" />}</button>
          {success ? <button className="px-preview-secondary" type="button" onClick={() => switchMode('login')}>Voltar para entrar</button> : null}
        </form>}

        <div className="px-preview-environment"><span>Phoenix V15</span><i aria-hidden="true" /><small>Ambiente de validação</small></div>
      </div>
    </section>
  </main>;
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PhoenixPreviewRoot />
  </React.StrictMode>
);