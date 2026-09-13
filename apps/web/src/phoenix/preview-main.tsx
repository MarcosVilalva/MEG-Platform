import React, { FormEvent, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  authenticatedRequest,
  clearSession,
  login,
  logout,
  readSession
} from '../app/auth-client';
import { PhoenixApp } from './PhoenixApp';
import { loadPhoenixReadModel } from './data/load-phoenix-read-model';
import './preview.css';
import './phoenix-preview-parity.css';

type PreviewState = 'checking' | 'signed-out' | 'signed-in';

function currentMonth() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit'
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value || '2026';
  const month = parts.find((part) => part.type === 'month')?.value || '01';
  return `${year}-${month}`;
}

async function preparePhoenixSession() {
  await loadPhoenixReadModel(currentMonth());
}

function loginErrorMessage(cause: unknown) {
  const message = cause instanceof Error ? cause.message : '';
  if (/401|invalid|credential|login|unauthor/i.test(message)) return 'E-mail ou senha não conferem. Revise os dados e tente novamente.';
  return 'Não foi possível entrar agora. Verifique sua conexão e tente novamente.';
}

function EyeIcon({ visible }: { visible: boolean }) {
  return visible
    ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 4.2A10.7 10.7 0 0 1 12 4c5.4 0 9 5.1 9 8 0 1.2-.7 2.7-1.9 4.1M6.2 6.3C4.2 7.8 3 10.2 3 12c0 2.9 3.6 8 9 8 1.7 0 3.2-.5 4.5-1.2" /></svg>
    : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12s3.6-8 9-8 9 8 9 8-3.6 8-9 8-9-8-9-8Z" /><circle cx="12" cy="12" r="2.6" /></svg>;
}

function PhoenixPreviewRoot() {
  const [state, setState] = useState<PreviewState>(() => readSession() ? 'checking' : 'signed-out');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (state !== 'checking') return;
    let active = true;
    void authenticatedRequest('/auth/me')
      .then(() => preparePhoenixSession())
      .then(() => { if (active) setState('signed-in'); })
      .catch(() => {
        clearSession();
        if (active) setState('signed-out');
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !email.trim() || !password) return;
    setBusy(true);
    setError('');
    try {
      await login(email.trim(), password);
      await preparePhoenixSession();
      setState('signed-in');
    } catch (cause) {
      setError(loginErrorMessage(cause));
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
      setState('signed-out');
    }
  }

  if (state === 'signed-in') return <PhoenixApp onLogout={() => { void signOut(); }} />;

  return <main className={`px-preview-auth ${state === 'checking' ? 'is-checking' : ''}`}>
    <section className="px-preview-shell" aria-label="Acesso ao MEG Finanças">
      <div className="px-preview-showcase">
        <div className="px-preview-showcase-brand">
          <img src="./brand/meg-finance-system-mark.svg" alt="MEG Finance System" />
          <div><span>MEG FINANÇAS</span><strong>Finance System</strong></div>
        </div>

        <div className="px-preview-hero-copy">
          <span className="px-preview-eyebrow">CONTROLE · CLAREZA · PROJEÇÃO</span>
          <h1>Sua vida financeira,<br />com clareza para decidir.</h1>
          <p>Saldo real, compromissos, cartões e projeções reunidos em uma visão consistente para você entender o presente e planejar o que vem pela frente.</p>
        </div>

        <div className="px-preview-value-grid" aria-label="Principais recursos do MEG">
          <article><span className="px-preview-value-icon">◉</span><div><strong>Saldo real</strong><small>O que está realizado hoje, sem misturar previsão com dinheiro disponível.</small></div></article>
          <article><span className="px-preview-value-icon">↗</span><div><strong>Projeções</strong><small>Veja compromissos futuros e a trajetória do seu saldo até o período escolhido.</small></div></article>
          <article><span className="px-preview-value-icon">✓</span><div><strong>Controle consistente</strong><small>Lançamentos, cartões, agenda e histórico conectados à mesma regra financeira.</small></div></article>
        </div>

        <div className="px-preview-showcase-foot">
          <span className="px-preview-live-dot" aria-hidden="true" />
          <strong>MEG conectado</strong>
          <small>Dados protegidos pela sua sessão autenticada.</small>
        </div>
      </div>

      <div className="px-preview-access">
        <div className="px-preview-access-brand">
          <img src="./brand/meg-finance-system-mark.svg" alt="" aria-hidden="true" />
          <div><strong>MEG</strong><span>Finanças</span></div>
        </div>

        {state === 'checking' ? <div className="px-preview-checking px-preview-boot">
          <div className="px-preview-boot-mark"><img src="./brand/meg-finance-system-mark.svg" alt="" aria-hidden="true" /><span className="px-preview-spinner" aria-hidden="true" /></div>
          <strong>Preparando seu MEG</strong>
          <small>Sessão, visão financeira e módulos principais estão sendo preparados antes da navegação.</small>
          <div className="px-preview-boot-line" aria-hidden="true"><span /></div>
        </div> : <form className="px-preview-form" onSubmit={submit}>
          <div className="px-preview-copy">
            <span>ACESSO AO SEU ESPAÇO</span>
            <h2>Bem-vindo de volta.</h2>
            <p>Entre com sua conta do MEG para continuar de onde parou.</p>
          </div>

          <label className="px-preview-field"><span>E-mail</span><input type="email" autoComplete="username" inputMode="email" value={email} onChange={(event) => { setEmail(event.target.value); if (error) setError(''); }} placeholder="seu@email.com" autoFocus /></label>
          <label className="px-preview-field"><span>Senha</span><div className="px-preview-password"><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => { setPassword(event.target.value); if (error) setError(''); }} placeholder="••••••••" /><button type="button" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} title={showPassword ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShowPassword((value) => !value)}><EyeIcon visible={showPassword} /></button></div></label>

          {error ? <div className="px-preview-error" role="alert"><span>!</span><div><strong>Não foi possível entrar</strong><small>{error}</small></div></div> : null}

          <button className="px-preview-submit" type="submit" disabled={busy || !email.trim() || !password}>
            <span>{busy ? 'Preparando seu MEG…' : 'Entrar no MEG'}</span>
            {!busy ? <span aria-hidden="true">→</span> : <span className="px-preview-button-spinner" aria-hidden="true" />}
          </button>

          <div className="px-preview-trust"><span aria-hidden="true">◆</span><div><strong>Sessão protegida</strong><small>Suas credenciais são usadas apenas para autenticar o acesso ao seu MEG.</small></div></div>
        </form>}

        <div className="px-preview-environment"><span>Ambiente Phoenix V15</span><i aria-hidden="true" /> <small>Validação read-only</small></div>
      </div>
    </section>
  </main>;
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PhoenixPreviewRoot />
  </React.StrictMode>
);
