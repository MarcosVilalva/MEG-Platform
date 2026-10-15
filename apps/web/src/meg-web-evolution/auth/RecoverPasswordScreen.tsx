import { useId, useState, type FormEvent } from 'react';
import { forgotPassword } from '../../app/auth-client';
import { AuthScreenLayout } from './AuthScreenLayout';

type Status = 'idle' | 'sending' | 'sent';
type Props = { onNavigateLogin: () => void };

export function RecoverPasswordScreen({ onNavigateLogin }: Props) {
  const id = useId();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === 'sending') return;
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setError('Digite um e-mail válido.'); return;
    }
    setError('');
    setStatus('sending');
    try {
      await forgotPassword(normalized);
      setStatus('sent');
    } catch {
      setError('Não foi possível concluir sua solicitação agora. Tente novamente mais tarde.');
      setStatus('idle');
    }
  }

  return (
    <AuthScreenLayout title="Recuperar senha" description="Solicite uma senha temporária para recuperar o acesso ao MEG.">
      {status === 'sent' ? (
        <section className="meg-auth-success" role="status" aria-live="polite">
          <h2>Solicitação recebida</h2>
          <p>Se o e-mail estiver cadastrado, você receberá uma senha temporária por e-mail ou WhatsApp.</p>
          <button className="meg-login-submit meg-auth-submit" type="button" onClick={onNavigateLogin}>Voltar ao login</button>
        </section>
      ) : (
        <form className="meg-auth-form" onSubmit={submit} noValidate>
          <div className="meg-login-input-block">
            <label htmlFor={`${id}-email`}>E-mail</label>
            <div className="meg-login-input-wrap">
              <input id={`${id}-email`} name="email" type="email" inputMode="email" autoComplete="email" placeholder="seu@email.com" value={email} onChange={event => setEmail(event.target.value)} required disabled={status === 'sending'} />
            </div>
          </div>
          <p className="meg-auth-note">Por segurança, não informamos se um e-mail possui cadastro. Não há recuperação por token nem escolha de nova senha nesta etapa.</p>
          <p className="meg-auth-error" role={error ? 'alert' : 'status'} aria-live="polite">{error}</p>
          <button className="meg-login-submit meg-auth-submit" type="submit" disabled={status === 'sending'} aria-busy={status === 'sending'}>
            {status === 'sending' ? 'Solicitando...' : 'Receber senha temporária'}
          </button>
        </form>
      )}
      <div className="meg-auth-footer"><button type="button" onClick={onNavigateLogin}>Voltar ao login</button></div>
    </AuthScreenLayout>
  );
}
