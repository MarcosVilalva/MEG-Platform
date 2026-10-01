import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { authenticatedRequest } from '../../app/auth-client';
import { megConfirm } from '../meg-confirm';

type WhatsAppRecipient = {
  id: string;
  name: string;
  phone: string;
  isActive?: boolean;
};

type EmailRecipient = {
  id: string;
  name: string;
  email: string;
  isActive?: boolean;
};

type ChannelKind = 'whatsapp' | 'email';

function sortByName<T extends { name: string }>(items: T[]) {
  return [...items].sort((left, right) => left.name.localeCompare(right.name, 'pt-BR', { sensitivity: 'base' }));
}

function digits(value: string) {
  return value.replace(/\D/g, '').slice(0, 15);
}

function recipientError(error: unknown) {
  const code = error instanceof Error ? error.message : 'RECIPIENT_WRITE_FAILED';
  if (/INVALID_RECIPIENT/i.test(code)) return 'Informe um nome e um telefone com DDD, entre 10 e 15 dígitos.';
  if (/INVALID_EMAIL_RECIPIENT/i.test(code)) return 'Informe um nome e um endereço de e-mail válido.';
  if (/RECIPIENT_NOT_FOUND|EMAIL_RECIPIENT_NOT_FOUND/i.test(code)) return 'Esse destinatário já não existe na configuração atual.';
  if (/403|FORBIDDEN/i.test(code)) return 'Seu perfil não possui permissão para alterar destinatários.';
  return 'Não foi possível confirmar a alteração no servidor.';
}

export function PhoenixNotificationRecipients() {
  const [whatsapp, setWhatsapp] = useState<WhatsAppRecipient[]>([]);
  const [emails, setEmails] = useState<EmailRecipient[]>([]);
  const [waName, setWaName] = useState('');
  const [waPhone, setWaPhone] = useState('');
  const [emailName, setEmailName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<ChannelKind | 'delete' | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const activeWhatsapp = useMemo(() => whatsapp.filter((item) => item.isActive !== false), [whatsapp]);
  const activeEmails = useMemo(() => emails.filter((item) => item.isActive !== false), [emails]);

  async function loadRecipients() {
    setLoading(true);
    setError('');
    try {
      const [waResult, emailResult] = await Promise.all([
        authenticatedRequest<WhatsAppRecipient[]>('/notifications/recipients', { cache: 'no-store' }),
        authenticatedRequest<EmailRecipient[]>('/notifications/email-recipients', { cache: 'no-store' }),
      ]);
      setWhatsapp(sortByName(Array.isArray(waResult) ? waResult : []));
      setEmails(sortByName(Array.isArray(emailResult) ? emailResult : []));
    } catch (cause) {
      setError(recipientError(cause));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRecipients();
  }, []);

  async function addWhatsapp(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const name = waName.trim();
    const phone = digits(waPhone);
    if (!name || phone.length < 10) {
      setError('Informe um nome e um telefone com DDD, entre 10 e 15 dígitos.');
      return;
    }
    setBusy('whatsapp');
    setError('');
    setMessage('');
    try {
      await authenticatedRequest<WhatsAppRecipient>('/notifications/recipients', {
        method: 'POST',
        body: JSON.stringify({ name, phone }),
      });
      setWaName('');
      setWaPhone('');
      await loadRecipients();
      setMessage('Destinatário de WhatsApp confirmado no servidor.');
    } catch (cause) {
      setError(recipientError(cause));
    } finally {
      setBusy(null);
    }
  }

  async function addEmail(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const name = emailName.trim();
    const email = emailAddress.trim().toLowerCase();
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Informe um nome e um endereço de e-mail válido.');
      return;
    }
    setBusy('email');
    setError('');
    setMessage('');
    try {
      await authenticatedRequest<EmailRecipient>('/notifications/email-recipients', {
        method: 'POST',
        body: JSON.stringify({ name, email }),
      });
      setEmailName('');
      setEmailAddress('');
      await loadRecipients();
      setMessage('Destinatário de e-mail confirmado no servidor.');
    } catch (cause) {
      setError(recipientError(cause));
    } finally {
      setBusy(null);
    }
  }

  async function removeRecipient(kind: ChannelKind, item: WhatsAppRecipient | EmailRecipient) {
    if (busy) return;
    const channel = kind === 'whatsapp' ? 'WhatsApp' : 'e-mail';
    const address = kind === 'whatsapp' ? (item as WhatsAppRecipient).phone : (item as EmailRecipient).email;
    const confirmed = await megConfirm({
      kicker: 'Notificações',
      title: `Remover destinatário de ${channel}?`,
      message: `${item.name} · ${address} deixará de receber os avisos deste canal. Nenhuma informação financeira será alterada.`,
      confirmLabel: 'Remover destinatário',
      cancelLabel: 'Cancelar',
      danger: true,
    });
    if (!confirmed) return;

    setBusy('delete');
    setError('');
    setMessage('');
    try {
      const path = kind === 'whatsapp'
        ? `/notifications/recipients/${item.id}`
        : `/notifications/email-recipients/${item.id}`;
      await authenticatedRequest<void>(path, { method: 'DELETE' });
      await loadRecipients();
      setMessage(`Destinatário de ${channel} removido.`);
    } catch (cause) {
      setError(recipientError(cause));
    } finally {
      setBusy(null);
    }
  }

  return <section className="px-card px-settings-card px-settings-recipient-manager">
    <div className="px-settings-card-head">
      <div>
        <span className="px-kicker">Destinatários</span>
        <h2>Quem recebe os avisos</h2>
        <p>Cadastre os destinos usados pelos canais oficiais. Chaves, tokens e credenciais continuam fora da interface.</p>
      </div>
      <button type="button" disabled={loading || Boolean(busy)} onClick={() => { void loadRecipients(); }}>
        {loading ? 'Carregando…' : 'Atualizar lista'}
      </button>
    </div>

    {message ? <div className="px-settings-recipient-feedback ok" role="status">{message}</div> : null}
    {error ? <div className="px-settings-recipient-feedback warn" role="alert">{error}</div> : null}

    <div className="px-settings-recipient-grid">
      <article className="px-settings-recipient-channel">
        <header>
          <div><strong>WhatsApp</strong><small>{activeWhatsapp.length} destinatário(s) ativo(s)</small></div>
          <span>{activeWhatsapp.length}</span>
        </header>
        <form className="px-settings-recipient-form" onSubmit={(event) => { void addWhatsapp(event); }}>
          <label><span>Nome</span><input value={waName} maxLength={80} placeholder="Ex.: Marcos" onChange={(event) => setWaName(event.target.value)} /></label>
          <label><span>Telefone com DDD</span><input value={waPhone} inputMode="tel" maxLength={18} placeholder="18999999999" onChange={(event) => setWaPhone(event.target.value)} /></label>
          <button type="submit" disabled={Boolean(busy)}>{busy === 'whatsapp' ? 'Salvando…' : 'Adicionar WhatsApp'}</button>
        </form>
        <div className="px-settings-recipient-list">
          {activeWhatsapp.map((item) => <div className="px-settings-recipient-row" key={item.id}>
            <div><strong>{item.name}</strong><small>{item.phone}</small></div>
            <button type="button" disabled={Boolean(busy)} onClick={() => { void removeRecipient('whatsapp', item); }}>Remover</button>
          </div>)}
          {!loading && !activeWhatsapp.length ? <p>Nenhum destinatário de WhatsApp cadastrado.</p> : null}
        </div>
      </article>

      <article className="px-settings-recipient-channel">
        <header>
          <div><strong>E-mail</strong><small>{activeEmails.length} destinatário(s) ativo(s)</small></div>
          <span>{activeEmails.length}</span>
        </header>
        <form className="px-settings-recipient-form" onSubmit={(event) => { void addEmail(event); }}>
          <label><span>Nome</span><input value={emailName} maxLength={80} placeholder="Ex.: Elaine" onChange={(event) => setEmailName(event.target.value)} /></label>
          <label><span>E-mail</span><input value={emailAddress} type="email" maxLength={160} placeholder="nome@exemplo.com" onChange={(event) => setEmailAddress(event.target.value)} /></label>
          <button type="submit" disabled={Boolean(busy)}>{busy === 'email' ? 'Salvando…' : 'Adicionar e-mail'}</button>
        </form>
        <div className="px-settings-recipient-list">
          {activeEmails.map((item) => <div className="px-settings-recipient-row" key={item.id}>
            <div><strong>{item.name}</strong><small>{item.email}</small></div>
            <button type="button" disabled={Boolean(busy)} onClick={() => { void removeRecipient('email', item); }}>Remover</button>
          </div>)}
          {!loading && !activeEmails.length ? <p>Nenhum destinatário de e-mail cadastrado.</p> : null}
        </div>
      </article>
    </div>

    <p className="px-settings-note">Adicionar o mesmo telefone ou e-mail novamente atualiza o nome e reativa o destinatário, conforme o contrato oficial do servidor.</p>
  </section>;
}
