import { FormEvent, useState } from 'react';
import { login, register, type AuthSession } from '../../app/auth-client';

type Props = {
  onAuthenticated: (session: AuthSession) => void;
};

function friendlyError(error: unknown) {
  const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
  if (message === 'INVALID_CREDENTIALS') return 'E-mail ou senha inválidos.';
  if (message === 'EMAIL_ALREADY_REGISTERED') return 'Este e-mail já está cadastrado.';
  if (message === 'VALIDATION_ERROR') return 'Revise os dados informados.';
  if (message.includes('Failed to fetch')) return 'Não foi possível conectar à API. Verifique se ela está em execução.';
  return 'Não foi possível concluir o acesso.';
}

export function LoginScreen({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      const session = mode === 'login'
        ? await login(email, password)
        : await register(name, email, password);
      onAuthenticated(session);
    } catch (cause) {
      setError(friendlyError(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-presentation">
        <div className="auth-brand">
          <div className="auth-brand-mark">M</div>
          <div>
            <strong>MEG</strong>
            <span>Financial OS</span>
          </div>
        </div>

        <div className="auth-copy">
          <span>Gestão financeira inteligente</span>
          <h1>Seu dinheiro, suas decisões, um único sistema.</h1>
          <p>Controle, projeção, conciliação e inteligência financeira com segurança e rastreabilidade.</p>
        </div>

        <div className="auth-highlights">
          <div><strong>360°</strong><span>Visão financeira integrada</span></div>
          <div><strong>RBAC</strong><span>Acesso por perfis e permissões</span></div>
          <div><strong>Auditável</strong><span>Histórico e rastreabilidade</span></div>
        </div>
      </section>

      <section className="auth-panel">
        <form className="auth-card" onSubmit={handleSubmit}>
          <div className="auth-tabs" role="tablist">
            <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Entrar</button>
            <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Criar conta</button>
          </div>

          <div className="auth-card-heading">
            <span>Área segura</span>
            <h2>{mode === 'login' ? 'Acesse sua conta' : 'Crie seu acesso'}</h2>
            <p>{mode === 'login' ? 'Informe suas credenciais para continuar.' : 'Cadastre o primeiro usuário da sua organização.'}</p>
          </div>

          {mode === 'register' && (
            <label>
              Nome completo
              <input value={name} onChange={(event) => setName(event.target.value)} minLength={2} required autoComplete="name" />
            </label>
          )}

          <label>
            E-mail
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
          </label>

          <label>
            Senha
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            <small>Mínimo de 8 caracteres.</small>
          </label>

          {error && <div className="auth-error" role="alert">{error}</div>}

          <button className="auth-submit" disabled={busy}>
            {busy ? 'Processando...' : mode === 'login' ? 'Entrar no MEG' : 'Criar conta e acessar'}
          </button>

          <p className="auth-security">Sessão protegida por JWT e refresh token rotativo.</p>
        </form>
      </section>
    </main>
  );
}
