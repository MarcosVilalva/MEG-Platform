import { FormEvent, useState } from 'react';
import { forgotPassword, login, register, type AuthSession } from '../../app/auth-client';

type Props = {
  onAuthenticated: (session: AuthSession) => void;
};

function friendlyError(error: unknown) {
  const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
  if (message === 'INVALID_CREDENTIALS') return 'E-mail ou senha inválidos.';
  if (message === 'ACCOUNT_NOT_FOUND') return 'Este e-mail ainda não está cadastrado. Selecione Solicitar acesso para realizar seu cadastro.';
  if (message === 'ACCESS_PENDING') return 'Seu cadastro foi recebido e está aguardando aprovação do administrador.';
  if (message === 'ACCESS_REJECTED') return 'Sua solicitação de acesso foi rejeitada.';
  if (message === 'USER_BLOCKED') return 'Este usuário está bloqueado.';
  if (message === 'EMAIL_ALREADY_REGISTERED') return 'Este e-mail já está cadastrado.';
  if (message === 'VALIDATION_ERROR') return 'Revise os dados informados.';
  if (message === 'EMAIL_DELIVERY_FAILED') return 'Não foi possível enviar o e-mail. Avise o administrador para revisar a configuração de e-mail.';
  if (message === 'NOTIFICATION_DELIVERY_FAILED') return 'Não foi possível entregar a nova senha por e-mail nem por WhatsApp. Avise o administrador.';
  if (message === 'PASSWORD_RESET_RATE_LIMITED') return 'Uma nova senha já foi enviada recentemente. Aguarde 10 minutos antes de tentar novamente.';
  if (message.includes('Failed to fetch')) return 'Não foi possível conectar à API. Verifique se ela está em execução.';
  return 'Não foi possível concluir o acesso.';
}

export function LoginScreen({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
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
      if (mode === 'forgot') {
        const result = await forgotPassword(email);
        const channels = result.notifications.filter((item) => item.status === 'sent').map((item) => item.channel === 'email' ? 'e-mail' : 'WhatsApp');
        setSuccess(`Nova senha temporária enviada por ${channels.join(' e ')}.`);
        setMode('login');
        setPassword('');
        return;
      }

      if (mode === 'register') {
        if (password !== confirmPassword) {
          setError('As senhas não coincidem.');
          return;
        }
        const result = await register(name, email, phone, password, confirmPassword);
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
            <h2>{mode === 'login' ? 'Acesse sua conta' : mode === 'forgot' ? 'Recupere seu acesso' : 'Solicite seu acesso'}</h2>
            <p>{mode === 'login' ? 'Informe suas credenciais para continuar.' : mode === 'forgot' ? 'Informe seu e-mail para receber uma senha temporária.' : 'Seu cadastro dependerá da aprovação do administrador.'}</p>
          </div>

          {mode === 'register' && (
            <label>Nome completo<input value={name} onChange={(event) => setName(event.target.value)} minLength={2} required autoComplete="name" /></label>
          )}

          <label>E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></label>

          {mode === 'register' && (
            <label>WhatsApp<input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} minLength={10} required autoComplete="tel" placeholder="5518999999999" /><small>DDD e número para avisos de aprovação e recuperação.</small></label>
          )}

          {mode !== 'forgot' && <label>
            Senha
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            <small>Mínimo de 8 caracteres.</small>
          </label>}

          {mode === 'register' && (
            <label>
              Repetir senha
              <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} required autoComplete="new-password" />
            </label>
          )}

          {error && <div className="auth-error" role="alert">{error}</div>}
          {success && <div className="auth-success" role="status">{success}</div>}

          <button className="auth-submit" disabled={busy}>
            {busy ? 'Processando...' : mode === 'login' ? 'Entrar no MEG' : mode === 'forgot' ? 'Enviar nova senha' : 'Enviar solicitação'}
          </button>
          {mode === 'login' && <button type="button" className="auth-link" onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }}>Esqueci minha senha</button>}
          {mode === 'forgot' && <button type="button" className="auth-link" onClick={() => { setMode('login'); setError(''); }}>Voltar para entrar</button>}
          <p className="auth-security">Novos usuários só acessam o sistema após aprovação.</p>
        </form>
      </section>
    </main>
  );
}
