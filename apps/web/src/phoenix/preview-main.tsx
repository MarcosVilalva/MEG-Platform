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
import './preview.css';
import './phoenix-preview-parity.css';

type PreviewState = 'checking' | 'signed-out' | 'signed-in';

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
      .then(() => { if (active) setState('signed-in'); })
      .catch(() => {
        clearSession();
        if (active) setState('signed-out');
      });
    return () => { active = false; };
  }, [state]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !email.trim() || !password) return;
    setBusy(true);
    setError('');
    try {
      await login(email.trim(), password);
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

      {state === 'checking' ? <div className="px-preview-checking">
        <span className="px-preview-spinner" aria-hidden="true" />
        <strong>Validando sua sessão</strong>
        <small>A produção atual permanece separada deste preview.</small>
      </div> : <form onSubmit={submit}>
        <div className="px-preview-copy">
          <span>Ambiente de validação</span>
          <h1>MEG Finanças</h1>
          <p>Entre com a mesma conta do MEG para visualizar a reconstrução V15. Nenhuma ação financeira de gravação está habilitada nesta etapa.</p>
        </div>

        <label><span>E-mail</span><input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu@email.com" /></label>
        <label><span>Senha</span><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" /></label>
        {error ? <div className="px-preview-error">{error}</div> : null}
        <button type="submit" disabled={busy || !email.trim() || !password}>{busy ? 'Entrando…' : 'Entrar no preview V15'}</button>
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
