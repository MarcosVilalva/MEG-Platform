import { useEffect, useMemo, useState } from 'react';
import {
  changeUserAccess,
  deleteManagedUser,
  listManagedUsers,
  readSession,
  type AuthUser,
  type UserRole
} from '../../app/auth-client';

const roleLabels: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  OPERATOR: 'Operador',
  VIEWER: 'Leitor'
};

const statusLabels = {
  PENDING: 'Pendente',
  ACTIVE: 'Ativo',
  REJECTED: 'Rejeitado',
  BLOCKED: 'Bloqueado'
};

const actionSuccessLabels = {
  APPROVE: 'Acesso aprovado com sucesso.',
  REJECT: 'Solicitação rejeitada.',
  BLOCK: 'Acesso bloqueado.',
  ACTIVATE: 'Acesso reativado.',
  UPDATE: 'Dados de acesso atualizados.'
};

function cleanPhone(value?: string | null) {
  return String(value || '').replace(/\D/g, '');
}

function errorMessage(cause: unknown, fallback: string) {
  if (!(cause instanceof Error)) return fallback;
  if (cause.message === 'FORBIDDEN') return 'Apenas administradores podem gerenciar usuários.';
  if (cause.message === 'PRIMARY_ADMIN_CANNOT_BE_BLOCKED') return 'O administrador principal do espaço não pode ser bloqueado.';
  if (cause.message === 'PRIMARY_ADMIN_CANNOT_BE_DELETED') return 'O administrador principal do espaço não pode ser excluído.';
  if (cause.message === 'CANNOT_DELETE_OWN_ACCESS') return 'Você não pode excluir o próprio acesso enquanto está conectado.';
  return fallback;
}

export function UserManagement() {
  const session = readSession();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [roles, setRoles] = useState<Record<string, UserRole>>({});
  const [phones, setPhones] = useState<Record<string, string>>({});

  async function load() {
    if (!session) return;
    setLoading(true);
    setError('');
    try {
      const result = await listManagedUsers(session);
      setUsers(result.users);
      setRoles(Object.fromEntries(result.users.map((user) => [user.id, user.role])));
      setPhones(Object.fromEntries(result.users.map((user) => [user.id, user.phone || ''])));
    } catch (cause) {
      setError(errorMessage(cause, 'Não foi possível carregar os usuários.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const summary = useMemo(() => ({
    pending: users.filter((user) => user.status === 'PENDING').length,
    active: users.filter((user) => user.status === 'ACTIVE').length,
    blocked: users.filter((user) => user.status === 'BLOCKED').length,
    rejected: users.filter((user) => user.status === 'REJECTED').length
  }), [users]);

  function hasChanges(user: AuthUser) {
    return (roles[user.id] ?? user.role) !== user.role
      || cleanPhone(phones[user.id]) !== cleanPhone(user.phone);
  }

  function replaceUser(updated: AuthUser) {
    setUsers((current) => current.map((user) => user.id === updated.id ? updated : user));
    setRoles((current) => ({ ...current, [updated.id]: updated.role }));
    setPhones((current) => ({ ...current, [updated.id]: updated.phone || '' }));
  }

  async function apply(user: AuthUser, action: 'APPROVE' | 'REJECT' | 'BLOCK' | 'ACTIVATE' | 'UPDATE') {
    if (!session || busyUserId) return;

    if (action === 'BLOCK' && !window.confirm(`Bloquear o acesso de ${user.name}? A sessão dessa pessoa será encerrada.`)) return;
    const note = action === 'REJECT' ? window.prompt('Motivo da rejeição (opcional):') ?? undefined : undefined;

    setBusyUserId(user.id);
    setError('');
    setSuccess('');
    try {
      const result = await changeUserAccess(session, user.id, {
        action,
        role: roles[user.id],
        phone: phones[user.id] || undefined,
        note
      });
      replaceUser(result.user);
      setSuccess(`${user.name}: ${actionSuccessLabels[action]}`);
    } catch (cause) {
      setError(errorMessage(cause, 'Não foi possível atualizar o acesso deste usuário.'));
    } finally {
      setBusyUserId(null);
    }
  }

  async function remove(user: AuthUser) {
    if (!session || busyUserId || !window.confirm(`Excluir definitivamente o acesso de ${user.email}?`)) return;
    setBusyUserId(user.id);
    setError('');
    setSuccess('');
    try {
      await deleteManagedUser(session, user.id);
      setUsers((current) => current.filter((item) => item.id !== user.id));
      setRoles((current) => {
        const next = { ...current };
        delete next[user.id];
        return next;
      });
      setPhones((current) => {
        const next = { ...current };
        delete next[user.id];
        return next;
      });
      setSuccess(`${user.name}: acesso excluído.`);
    } catch (cause) {
      setError(errorMessage(cause, 'Não foi possível excluir este acesso.'));
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <section id="users" className="page admin-users-page">
      <header className="page-head page-header compact">
        <div>
          <span>Usuários e acesso</span>
          <h1>Permissões</h1>
          <p>Apenas ADMIN gerencia usuários e permissões críticas. Novos usuários entram como pendentes e mudanças de acesso geram auditoria.</p>
        </div>
      </header>

      {!loading && (
        <div className="user-summary-grid" aria-label="Resumo de acessos">
          <div className="user-summary-card pending"><span>Pendentes</span><strong>{summary.pending}</strong></div>
          <div className="user-summary-card active"><span>Ativos</span><strong>{summary.active}</strong></div>
          <div className="user-summary-card blocked"><span>Bloqueados</span><strong>{summary.blocked}</strong></div>
          <div className="user-summary-card rejected"><span>Rejeitados</span><strong>{summary.rejected}</strong></div>
        </div>
      )}

      <details className="meg-card permission-guide">
        <summary>Entenda os níveis de acesso</summary>
        <div className="permission-grid">
          <div><strong>Leitor</strong><span>Somente consultas e relatórios.</span></div>
          <div><strong>Operador</strong><span>Consulta, inclui e altera lançamentos.</span></div>
          <div><strong>Gerente</strong><span>Inclui, altera e exclui dados financeiros.</span></div>
          <div><strong>Administrador</strong><span>Controle total, inclusive usuários.</span></div>
        </div>
      </details>

      {error && <div className="auth-error" role="alert">{error}</div>}
      {success && <div className="auth-success" role="status">{success}</div>}

      {loading ? <div className="meg-card user-loading">Carregando usuários...</div> : users.length === 0 ? (
        <div className="meg-card empty-state">Nenhum usuário encontrado neste espaço.</div>
      ) : (
        <div className="user-list">
          {users.map((user) => {
            const isSelf = session?.user.id === user.id;
            const busy = busyUserId === user.id;
            const changed = hasChanges(user);
            const initials = user.name
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase())
              .join('');

            return (
              <article className={`meg-card user-card${busy ? ' is-busy' : ''}`} key={user.id} aria-busy={busy}>
                <div className="user-card-main">
                  <div className="user-identity">
                    <div className="user-avatar" aria-hidden="true">{initials || '?'}</div>
                    <div className="user-copy">
                      <div className="user-status-line">
                        <span className={`status-pill status-${user.status.toLowerCase()}`}>{statusLabels[user.status]}</span>
                        {isSelf && <span className="current-user-pill">Sua conta</span>}
                        {changed && !isSelf && <span className="unsaved-pill">Alterações não salvas</span>}
                      </div>
                      <h3>{user.name}</h3>
                      <p>{user.email}</p>
                      <small>Último acesso: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('pt-BR') : 'Nunca'}</small>
                    </div>
                  </div>

                  <div className="user-access-fields">
                    <label>
                      Perfil
                      <select
                        value={roles[user.id] ?? user.role}
                        onChange={(event) => setRoles((current) => ({ ...current, [user.id]: event.target.value as UserRole }))}
                        disabled={isSelf || busy}
                      >
                        {Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </label>
                    <label>
                      WhatsApp
                      <input
                        value={phones[user.id] || ''}
                        onChange={(event) => setPhones((current) => ({ ...current, [user.id]: event.target.value }))}
                        disabled={isSelf || busy}
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="5518999999999"
                      />
                    </label>
                  </div>
                </div>

                {isSelf ? (
                  <div className="self-access-note">Sua própria permissão é protegida nesta tela para evitar perda acidental de acesso.</div>
                ) : (
                  <div className="user-actions">
                    {user.status === 'PENDING' && <>
                      <button disabled={busy} onClick={() => void apply(user, 'APPROVE')}>{busy ? 'Processando...' : 'Aprovar acesso'}</button>
                      <button disabled={busy} className="secondary-button" onClick={() => void apply(user, 'REJECT')}>Rejeitar</button>
                    </>}
                    {user.status === 'ACTIVE' && <>
                      {changed && <button disabled={busy} onClick={() => void apply(user, 'UPDATE')}>{busy ? 'Salvando...' : 'Salvar alterações'}</button>}
                      <button disabled={busy} className="secondary-button" onClick={() => void apply(user, 'BLOCK')}>Bloquear</button>
                    </>}
                    {(user.status === 'BLOCKED' || user.status === 'REJECTED') && (
                      <button disabled={busy} onClick={() => void apply(user, 'ACTIVATE')}>{busy ? 'Processando...' : 'Reativar acesso'}</button>
                    )}
                    <button disabled={busy} className="danger-button" onClick={() => void remove(user)}>Excluir acesso</button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
