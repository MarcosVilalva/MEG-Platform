import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { forgotPassword } from '../../app/auth-client';
import { AuthScreenLayout } from './AuthScreenLayout';

type Status = 'idle' | 'sending' | 'sent';
type Props = { onNavigateLogin: () => void };

export function RecoverPasswordScreen({ onNavigateLogin }: Props) {
  const id = useId();
  const emailId = id + '-email';
  const errorId = id + '-error';
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmationRef = useRef<HTMLHeadingElement>(null);
  const sendingRef = useRef(false);
  const mountedRef = useRef(true);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (status === 'idle' && error) inputRef.current?.focus();
    if (status === 'sent') confirmationRef.current?.focus();
  }, [status, error]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Ref síncrona evita duas chamadas antes de o React aplicar o estado disabled.
    if (sendingRef.current || status !== 'idle') return;
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setError('Digite um e-mail válido.');
      return;
    }

    sendingRef.current = true;
    setError('');
    setStatus('sending');
    try {
      await forgotPassword(normalized);
      if (mountedRef.current) setStatus('sent');
    } catch {
      if (mountedRef.current) {
        setError('Não foi possível concluir sua solicitação agora. Tente novamente mais tarde.');
        setStatus('idle');
      }
    } finally {
      sendingRef.current = false;
    }
  }

  return (
    <AuthScreenLayout title="Recuperar senha" description="Solicite uma senha temporária para recuperar o acesso ao MEG.">
      {status === 'sent' ? (
        <section className="meg-auth-success" role="status" aria-live="polite">
          <h2 ref={confirmationRef} tabIndex={-1}>Solicitação recebida</h2>
          <p>Se existir uma conta ativa para este e-mail, você poderá receber uma senha temporária pelos canais cadastrados.</p>
        </section>
      ) : (
        <form className="meg-auth-form" onSubmit={submit} noValidate aria-busy={status === 'sending'}>
          <div className="meg-login-input-block">
            <label htmlFor={emailId}>E-mail</label>
            <div className={'meg-login-input-wrap' + (error ? ' is-invalid' : '')}>
              <input
                ref={inputRef}
                id={emailId}
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="seu@email.com"
                value={email}
                onChange={event => {
                  setEmail(event.target.value);
                  if (error) setError('');
                }}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? errorId : undefined}
                required
                disabled={status === 'sending'}
              />
            </div>
          </div>
          <p className="meg-auth-note">Por segurança, não informamos se um e-mail possui cadastro. A recuperação atual utiliza senha temporária, não um link de redefinição por token.</p>
          <p id={errorId} className="meg-auth-error" role={error ? 'alert' : 'status'} aria-live="polite">{error}</p>
          <button className="meg-login-submit meg-auth-submit" type="submit" disabled={status === 'sending'} aria-busy={status === 'sending'}>
            {status === 'sending' ? 'Solicitando...' : 'Receber senha temporária'}
          </button>
        </form>
      )}
      <div className="meg-auth-footer"><button type="button" onClick={onNavigateLogin}>Voltar ao login</button></div>
    </AuthScreenLayout>
  );
}
