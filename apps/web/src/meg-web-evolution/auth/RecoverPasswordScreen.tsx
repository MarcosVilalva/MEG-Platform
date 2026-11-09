import { useId, useState, type FormEvent } from 'react';
import { forgotPassword } from '../../app/auth-client';
import { AuthScreenLayout } from './AuthScreenLayout';

type Status = 'idle' | 'sending' | 'sent';
type Props = {
  onNavigateLogin: () => void;
  /** Apenas para prévia estática: valida o e-mail sem chamar a API. */
  previewOnly?: boolean;
};

export function RecoverPasswordScreen({ onNavigateLogin, previewOnly = false }: Props) {
  const id = useId();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [previewMessage, setPreviewMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === 'sending') return;
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setError('Digite um e-mail válido.');
      setPreviewMessage('');
      return;
    }

    setError('');
    if (previewOnly) {
      // Segurança da homologação: nenhuma chamada de recuperação, gravação
      // local ou consulta de existência de usuário é executada nesta prévia.
      setPreviewMessage('Formato de e-mail validado. Prévia visual: nenhuma solicitação foi enviada.');
      return;
    }

    setPreviewMessage('');
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
    <AuthScreenLayout
      variant="recover"
      title="Recuperar senha"
      description="Solicite uma senha temporária para recuperar o acesso ao MEG.">
      {status === 'sent' ? (
        <section className="meg-auth-success" role="status" aria-live="polite">
          <h2>Solicitação recebida</h2>
          <p>Se o e-mail estiver cadastrado, você receberá uma senha temporária por e-mail ou WhatsApp.</p>
        </section>
      ) : (
        <form className="meg-auth-form" onSubmit={submit} noValidate>
          <div className="meg-auth-fields">
            {previewOnly && (
              <p className="meg-register-preview-notice" role="note">
                Prévia visual: utilize apenas um e-mail fictício. Nenhuma mensagem será enviada.
              </p>
            )}
            <div className="meg-login-input-block">
              <label htmlFor={`${id}-email`}>E-mail</label>
              <div className="meg-login-input-wrap">
                <input
                  id={`${id}-email`}
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete={previewOnly ? 'off' : 'email'}
                  placeholder="seu@email.com"
                  value={email}
                  onChange={event => {
                    setEmail(event.target.value);
                    if (error) setError('');
                    if (previewMessage) setPreviewMessage('');
                  }}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? `${id}-error` : undefined}
                  required
                  disabled={status === 'sending'}
                />
              </div>
            </div>
            <p className="meg-auth-note">
              Por segurança, não informamos se um e-mail possui cadastro.
              Não há recuperação por token nem escolha de nova senha nesta etapa.
            </p>
          </div>
          <p
            id={`${id}-error`}
            className={`meg-auth-error${previewMessage ? ' is-preview-ok' : ''}`}
            role={error ? 'alert' : 'status'}
            aria-live="polite">
            {error || previewMessage}
          </p>
          <button
            className="meg-login-submit meg-auth-submit"
            type="submit"
            disabled={status === 'sending'}
            aria-busy={status === 'sending'}>
            {status === 'sending' ? 'Solicitando...' : 'Receber senha temporária'}
          </button>
        </form>
      )}
      <div className="meg-auth-footer">
        <button type="button" onClick={onNavigateLogin}>Voltar ao login</button>
      </div>
    </AuthScreenLayout>
  );
}
