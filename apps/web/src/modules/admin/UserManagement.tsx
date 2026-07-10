import { useEffect, useState } from 'react';
import { listUsers, updateUserAccess, type AuthSession, type AuthUser, type UserRole } from '../../app/auth-client';

type Props = { session: AuthSession; onClose: () => void };
const roles: UserRole[] = ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'];

export function UserManagement({ session, onClose }: Props) {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true); setError('');
    try { setUsers((await listUsers(session)).users); }
    catch { setError('Não foi possível carregar os usuários.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function change(user: AuthUser, changes: Partial<Pick<AuthUser, 'role' | 'approvalStatus' | 'isActive'>>) {
    const updated = (await updateUserAccess(session, user.id, changes)).user;
    setUsers((items) => items.map((item) => item.id === updated.id ? updated : item));
  }

  return (
    <section className="admin-users-page">
      <header className="page-header"><div><span>Administração</span><h1>Usuários e permissões</h1><p>Aprove solicitações e defina o nível de acesso de cada usuário.</p></div><button onClick={onClose}>Voltar</button></header>
      {error && <div className="auth-error">{error}</div>}
      {loading ? <div className="meg-card">Carregando...</div> : (
        <div className="user-admin-grid">
          {users.map((user) => (
            <article className="meg-card user-admin-card" key={user.id}>
              <div><strong>{user.name}</strong><small>{user.email}</small></div>
              <span className={`status-pill ${user.approvalStatus.toLowerCase()}`}>{user.approvalStatus}</span>
              <label>Perfil<select value={user.role} onChange={(event) => void change(user, { role: event.target.value as UserRole })}>{roles.map((role) => <option key={role}>{role}</option>)}</select></label>
              <div className="user-admin-actions">
                {user.approvalStatus === 'PENDING' && <><button onClick={() => void change(user, { approvalStatus: 'APPROVED', isActive: true })}>Aprovar</button><button onClick={() => void change(user, { approvalStatus: 'REJECTED', isActive: false })}>Rejeitar</button></>}
                {user.approvalStatus === 'APPROVED' && <button onClick={() => void change(user, { isActive: !user.isActive })}>{user.isActive ? 'Desativar' : 'Ativar'}</button>}
              </div>
              <small>{user.role === 'VIEWER' ? 'Somente leitura' : user.role === 'OPERATOR' ? 'Pode incluir e alterar' : 'Pode incluir, alterar e excluir'}</small>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}