import { useEffect, useState } from 'react';
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

export function UserManagement() {
  const session = readSession();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
      setError(cause instanceof Error && cause.message === 'FORBIDDEN'
        ? 'Apenas administradores podem gerenciar usuários.'
        : 'Não foi possível carregar os usuários.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function apply(user: AuthUser, action: 'APPROVE' | 'REJECT' | 'BLOCK' | 'ACTIVATE' | 'UPDATE') {
    if (!session) return;
    const note = action === 'REJECT' ? window.prompt('Motivo da rejeição (opcional):') ?? undefined : undefined;
    try {
      await changeUserAccess(session, user.id, { action, role: roles[user.id], phone: phones[user.id] || undefined, note });
      await load();
    } catch {
      setError('Não foi possível atualizar o acesso deste usuário.');
    }
  }

  async function remove(user: AuthUser) {
    if (!session || !window.confirm(`Excluir definitivamente o acesso de ${user.email}?`)) return;
    try { await deleteManagedUser(session, user.id); await load(); }
    catch { setError('Não foi possível excluir este acesso.'); }
  }

  return (
    <section className="page admin-users-page">
      <header className="page-header">
        <div>
          <span>Administração</span>
          <h1>Usuários e permissões</h1>
          <p>Aprove solicitações e defina o nível de acesso de cada pessoa.</p>
        </div>
      </header>

      <div className="meg-card permission-guide">
        <h3>Perfis disponíveis</h3>
        <div className="permission-grid">
          <div><strong>Leitor</strong><span>Somente consultas e relatórios.</span></div>
          <div><strong>Operador</strong><span>Consulta, inclui e altera lançamentos.</span></div>
          <div><strong>Gerente</strong><span>Inclui, altera e exclui dados financeiros.</span></div>
          <div><strong>Administrador</strong><span>Controle total, inclusive usuários.</span></div>
        </div>
      </div>

      {error && <div className="auth-error">{error}</div>}
      {loading ? <div className="meg-card">Carregando usuários...</div> : (
        <div className="user-list">
          {users.map((user) => (
            <article className="meg-card user-card" key={user.id}>
              <div className="user-card-main">
                <div>
                  <span className={`status-pill status-${user.status.toLowerCase()}`}>{statusLabels[user.status]}</span>
                  <h3>{user.name}</h3>
                  <p>{user.email}</p>
                  <small>Último acesso: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('pt-BR') : 'Nunca'}</small>
                </div>
                <label>
                  Perfil
                  <select
                    value={roles[user.id] ?? user.role}
                    onChange={(event) => setRoles((current) => ({ ...current, [user.id]: event.target.value as UserRole }))}
                    disabled={user.email === 'm_vilalva@hotmail.com'}
                  >
                    {Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label>WhatsApp<input value={phones[user.id] || ''} onChange={(event) => setPhones((current) => ({ ...current, [user.id]: event.target.value }))} disabled={user.email === 'm_vilalva@hotmail.com'} placeholder="5518999999999" /></label>
              </div>

              <div className="user-actions">
                {user.status === 'PENDING' && <>
                  <button onClick={() => void apply(user, 'APPROVE')}>Aprovar</button>
                  <button className="danger-button" onClick={() => void apply(user, 'REJECT')}>Rejeitar</button>
                </>}
                {user.status === 'ACTIVE' && user.email !== 'm_vilalva@hotmail.com' && (
                  <button className="danger-button" onClick={() => void apply(user, 'BLOCK')}>Bloquear</button>
                )}
                {(user.status === 'BLOCKED' || user.status === 'REJECTED') && (
                  <button onClick={() => void apply(user, 'ACTIVATE')}>Reativar</button>
                )}
                {user.status === 'ACTIVE' && user.email !== 'm_vilalva@hotmail.com' && <button onClick={() => void apply(user, 'UPDATE')}>Salvar dados</button>}
                {user.email !== 'm_vilalva@hotmail.com' && <button className="danger-button" onClick={() => void remove(user)}>Excluir acesso</button>}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
