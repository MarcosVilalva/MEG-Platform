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

function PhoenixPreviewRoot() {
  const [state, setState] = useState<PreviewState>(() => readSession() ? 'checking' : 'signed-out');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      setError(cause instanceof Error ? cause.message : 'LOGIN_FAILED');
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
      setError('');
      setState('signed-out');
    }
  }

  if (state === 'signed-in') return <PhoenixApp onLogout={() => { void signOut(); }} />;

  return <main className="px-preview-auth">
    <section className="px-preview-login">
      <div className="px-preview-brand">
        <img src="./brand/meg-finance-system-mark.svg" alt="MEG Finance System" />
        <div><span>PHOENIX V15</span><strong>Preview isolado</strong></div>
      </div>

      {state === 'checking' ? <div className="px-preview-checking px-preview-boot">
        <div className="px-preview-boot-mark"><img src="./brand/meg-finance-system-mark.svg" alt="" aria-hidden="true" /><span className="px-preview-spinner" aria-hidden="true" /></div>
        <strong>Preparando seu MEG</strong>
        <small>Sessão, visão financeira e módulos principais estão sendo preparados antes da navegação.</small>
        <div className="px-preview-boot-line" aria-hidden="true"><span /></div>
      </div> : <form onSubmit={submit}>
        <div className="px-preview-copy">
          <span>Ambiente de validação</span>
          <h1>MEG Finanças</h1>
          <p>Entre com a mesma conta do MEG para visualizar a reconstrução V15. Nenhuma ação financeira de gravação está habilitada nesta etapa.</p>
        </div>

        <label><span>E-mail</span><input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu@email.com" /></label>
        <label><span>Senha</span><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" /></label>
        {error ? <div className="px-preview-error">{error}</div> : null}
        <button type="submit" disabled={busy || !email.trim() || !password}>{busy ? 'Preparando seu MEG…' : 'Entrar no preview V15'}</button>
        <small className="px-preview-footnote">Entrada exclusiva da branch Phoenix. O sistema atual não é substituído por esta página.</small>
      </form>}
    </section>
  </main>;
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PhoenixPreviewRoot />
  </React.StrictMode>
);
