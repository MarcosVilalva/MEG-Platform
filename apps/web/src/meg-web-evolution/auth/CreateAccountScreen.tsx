import { useId, useState, type FormEvent } from 'react';
import { register } from '../../app/auth-client';
import { AuthScreenLayout } from './AuthScreenLayout';

type AccountType = 'REQUEST_ACCESS' | 'CREATE_WORKSPACE';
type Status = 'idle' | 'submitting' | 'pending' | 'approved';
type Props = { onNavigateLogin: () => void; onAuthenticated: () => void };

function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 15);
  if (digits.length > 11) return digits;
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  const head = digits.slice(0, 2);
  const rest = digits.slice(2);
  const prefixLength = digits.length <= 10 ? 4 : 5;
  return `(${head}) ${rest.slice(0, prefixLength)}${rest.length > prefixLength ? '-' + rest.slice(prefixLength) : ''}`;
}

function messageForError(error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (code === 'EMAIL_ALREADY_REGISTERED') return 'Este e-mail já possui cadastro.';
  if (code === 'ACCESS_PENDING') return 'Esta solicitação já está aguardando aprovação.';
  if (code === 'WORKSPACE_NOT_FOUND') return 'Não foi possível localizar o espaço solicitado.';
  if (code === 'WORKSPACE_MEMBER_LIMIT_REACHED') return 'O espaço não aceita novos participantes no momento.';
  return 'Não foi possível enviar o cadastro. Verifique a conexão e tente novamente.';
}

export function CreateAccountScreen({ onNavigateLogin, onAuthenticated }: Props) {
  const formId = useId();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [type, setType] = useState<AccountType>('REQUEST_ACCESS');
  const [workspaceName, setWorkspaceName] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === 'submitting') return;
    const normalizedEmail = email.trim().toLowerCase();
    const digits = phone.replace(/\D/g, '');
    let nextError = '';
    if (name.trim().length < 2 || name.trim().length > 120) nextError = 'Informe seu nome com 2 a 120 caracteres.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) nextError = 'Digite um e-mail válido.';
    else if (digits.length < 10 || digits.length > 15) nextError = 'Informe um telefone com 10 a 15 dígitos.';
    else if (password.length < 8 || password.length > 128) nextError = 'A senha deve ter de 8 a 128 caracteres.';
    else if (password !== confirmPassword) nextError = 'As senhas informadas não coincidem.';
    else if (type === 'CREATE_WORKSPACE' && (workspaceName.trim().length < 2 || workspaceName.trim().length > 120)) nextError = 'Informe o nome do espaço com 2 a 120 caracteres.';
    if (nextError) { setError(nextError); return; }
    setError('');
    setStatus('submitting');
    try {
      const result = await register(name.trim(), normalizedEmail, digits, password, confirmPassword, type, type === 'CREATE_WORKSPACE' ? workspaceName.trim() : undefined);
      if ('status' in result && result.status === 'PENDING_APPROVAL') setStatus('pending');
      else { setStatus('approved'); onAuthenticated(); }
    } catch (cause) {
      setError(messageForError(cause));
      setStatus('idle');
    }
  }

  return (
    <AuthScreenLayout title="Criar conta" description="Solicite acesso ou crie seu espaço MEG. O cadastro aguarda aprovação.">
      {status === 'pending' || status === 'approved' ? (
        <div className="meg-auth-success" role="status" aria-live="polite">
          <h2>{status === 'pending' ? 'Aguardando aprovação' : 'Cadastro aprovado'}</h2>
          <p>{status === 'pending' ? 'Sua solicitação foi enviada. Aguarde a aprovação para acessar o MEG.' : 'Seu acesso foi criado. Você já pode utilizar o MEG.'}</p>
          <button type="button" className="meg-login-submit meg-auth-submit" onClick={onNavigateLogin}>Voltar ao login</button>
        </div>
      ) : (
        <form className="meg-auth-form" aria-label="Formulário de cadastro" onSubmit={submit} noValidate>
          <div className="meg-auth-mode" role="group" aria-label="Tipo de cadastro">
            <label><input type="radio" name={`${formId}-type`} checked={type === 'REQUEST_ACCESS'} onChange={() => setType('REQUEST_ACCESS')} disabled={status === 'submitting'} />Solicitar acesso</label>
            <label><input type="radio" name={`${formId}-type`} checked={type === 'CREATE_WORKSPACE'} onChange={() => setType('CREATE_WORKSPACE')} disabled={status === 'submitting'} />Criar meu espaço MEG</label>
          </div>
          <div className="meg-login-input-block"><label htmlFor={`${formId}-name`}>Nome completo</label><div className="meg-login-input-wrap"><input id={`${formId}-name`} name="name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" disabled={status === 'submitting'} required /></div></div>
          <div className="meg-login-input-block"><label htmlFor={`${formId}-email`}>E-mail</label><div className="meg-login-input-wrap"><input id={`${formId}-email`} name="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" disabled={status === 'submitting'} required /></div></div>
          <div className="meg-login-input-block"><label htmlFor={`${formId}-phone`}>Telefone</label><div className="meg-login-input-wrap"><input id={`${formId}-phone`} name="phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="(00) 00000-0000" disabled={status === 'submitting'} required /></div></div>
          {type === 'CREATE_WORKSPACE' && <div className="meg-login-input-block"><label htmlFor={`${formId}-workspace`}>Nome do espaço MEG</label><div className="meg-login-input-wrap"><input id={`${formId}-workspace`} name="workspaceName" value={workspaceName} onChange={e => setWorkspaceName(e.target.value)} placeholder="Meu espaço" disabled={status === 'submitting'} required /></div></div>}
          <div className="meg-login-input-block"><label htmlFor={`${formId}-password`}>Senha</label><div className="meg-login-input-wrap"><input id={`${formId}-password`} type="password" name="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Pelo menos 8 caracteres" disabled={status === 'submitting'} required /></div></div>
          <div className="meg-login-input-block"><label htmlFor={`${formId}-confirm`}>Confirmar senha</label><div className="meg-login-input-wrap"><input id={`${formId}-confirm`} type="password" name="confirmPassword" autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repita sua senha" disabled={status === 'submitting'} required /></div></div>
          <p className="meg-auth-note">O acesso depende de aprovação. Nenhum dado financeiro é criado nesta tela.</p>
          <p className="meg-auth-error" role={error ? 'alert' : 'status'} aria-live="polite">{error}</p>
          <button type="submit" className="meg-login-submit meg-auth-submit" disabled={status === 'submitting'} aria-busy={status === 'submitting'}>{status === 'submitting' ? 'Enviando solicitação...' : 'Continuar'}</button>
        </form>
      )}
      <div className="meg-auth-footer"><button type="button" onClick={onNavigateLogin}>Voltar ao login</button></div>
    </AuthScreenLayout>
  );
}
