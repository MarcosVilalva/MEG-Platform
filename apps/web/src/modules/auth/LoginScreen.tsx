import { FormEvent, useState } from 'react';
import { login, register, type AuthSession } from '../../app/auth-client';

type Props = {
  onAuthenticated: (session: AuthSession) => void;
};

function friendlyError(error: unknown) {
  const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
  if (message === 'INVALID_CREDENTIALS') return 'E-mail ou senha inválidos.';
  if (message === 'ACCESS_PENDING') return 'Seu acesso ainda aguarda aprovação do administrador.';
  if (message === 'ACCESS_REJECTED') return 'Sua solicitação de acesso foi rejeitada.';
  if (message === 'USER_BLOCKED') return 'Este usuário está bloqueado.';
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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');

    try {
      if (mode === 'register') {
        if (password !== confirmPassword) {
          setError('As senhas não coincidem.');
          return;
        }
        const result = await register(name, email, password, confirmPassword);
        if ('status' in result && result.status === 'PENDING_APPROVAL') {
          setSuccess(`Solicitação enviada. O administrador ${result.administratorEmail} analisará seu acesso.`);
          setMode('login');
          setPassword('');
          setConfirmPassword('');
          return;
        }
        onAuthenticated(result as AuthSession);
        return;
      }

      onAuthenticated(await login(email, password));
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
          <div><strong>MEG</strong><span>Financial OS</span></div>
        </div>
        <div className="auth-copy">
          <span>Finanças pessoais inteligentes</span>
          <h1>Seu dinheiro, suas decisões, um único sistema.</h1>
          <p>Controle, projeção e inteligência financeira com segurança e privacidade.</p>
        </div>
        <div className="auth-highlights">
          <div><strong>360°</strong><span>Visão financeira integrada</span></div>
          <div><strong>Seguro</strong><span>Acesso aprovado pelo administrador</span></div>
          <div><strong>Auditável</strong><span>Histórico e rastreabilidade</span></div>
        </div>
      </section>

      <section className="auth-panel">
        <form className="auth-card" onSubmit={handleSubmit}>
          <div className="auth-tabs" role="tablist">
            <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Entrar</button>
            <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Solicitar acesso</button>
          </div>

          <div className="auth-card-heading">
            <span>Área segura</span>
            <h2>{mode === 'login' ? 'Acesse sua conta' : 'Solicite seu acesso'}</h2>
            <p>{mode === 'login' ? 'Informe suas credenciais para continuar.' : 'Seu cadastro dependerá da aprovação do administrador.'}</p>
          </div>

          {mode === 'register' && (
            <label>Nome completo<input value={name} onChange={(event) => setName(event.target.value)} minLength={2} required autoComplete="name" /></label>
          )}

          <label>E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></label>

          <label>
            Senha
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            <small>Mínimo de 8 caracteres.</small>
          </label>

          {mode === 'register' && (
            <label>
              Repetir senha
              <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} required autoComplete="new-password" />
            </label>
          )}

          {error && <div className="auth-error" role="alert">{error}</div>}
          {success && <div className="auth-success" role="status">{success}</div>}

          <button className="auth-submit" disabled={busy}>
            {busy ? 'Processando...' : mode === 'login' ? 'Entrar no MEG' : 'Enviar solicitação'}
          </button>
          <p className="auth-security">Novos usuários só acessam o sistema após aprovação.</p>
        </form>
      </section>
    </main>
  );
}