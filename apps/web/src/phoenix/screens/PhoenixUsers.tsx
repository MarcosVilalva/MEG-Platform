import { useMemo, useState } from 'react';
import type { AuthUser } from '../../app/auth-client';
import type { PhoenixReadModel } from '../contracts';
import '../phoenix-users.css';

const lastLogin = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
});
const shortDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

function statusLabel(status: AuthUser['status']) {
  return ({ ACTIVE: 'Ativo', PENDING: 'Pendente', REJECTED: 'Rejeitado', BLOCKED: 'Bloqueado' } as const)[status] || status;
}

function roleLabel(role: AuthUser['role']) {
  return ({ ADMIN: 'Administrador', MANAGER: 'Gestor', OPERATOR: 'Operador', VIEWER: 'Visualização' } as const)[role] || role;
}

type UserGroup = { id: string; title: string; description: string; users: AuthUser[] };

function actionLabel(item: AuthUser) {
  if (item.status === 'PENDING') return 'Analisar solicitação';
  if (item.status === 'BLOCKED' || item.status === 'REJECTED') return 'Revisar acesso';
  return 'Gerenciar acesso';
}

export function PhoenixUsers({ data }: { data: PhoenixReadModel }) {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const source = data.workspaceUsers;
  const users = source.status === 'ready' ? source.users : [];
  const filtered = useMemo(() => users.filter((item) => {
    const haystack = `${item.name} ${item.email} ${item.phone || ''}`.toLocaleLowerCase('pt-BR');
    return haystack.includes(search.trim().toLocaleLowerCase('pt-BR'))
      && (role === 'all' || item.role === role)
      && (status === 'all' || item.status === status);
  }), [users, search, role, status]);

  if (source.status === 'restricted') {
    return <section className="px-screen"><header className="px-screen-head"><div><span className="px-kicker">Usuários</span><h1>Pessoas, perfis e permissões</h1><p>Esta área é administrativa.</p></div></header><div className="px-card px-users-message"><strong>Acesso restrito</strong><p>Seu perfil atual é {roleLabel(data.user.role)}. A leitura da lista de usuários permanece protegida pela regra ADMIN do backend.</p></div></section>;
  }

  if (source.status === 'error') {
    return <section className="px-screen"><header className="px-screen-head"><div><span className="px-kicker">Usuários</span><h1>Pessoas, perfis e permissões</h1><p>Leitura administrativa oficial.</p></div></header><div className="px-card px-users-message"><strong>Não foi possível carregar os usuários</strong><p>{source.error || 'USERS_READ_FAILED'}</p></div></section>;
  }

  const active = users.filter((item) => item.status === 'ACTIVE' && item.isActive).length;
  const pending = users.filter((item) => item.status === 'PENDING').length;
  const inactive = users.filter((item) => item.status === 'BLOCKED' || item.status === 'REJECTED' || !item.isActive).length;
  const admins = users.filter((item) => item.role === 'ADMIN' && item.isActive).length;
  const groups: UserGroup[] = [
    { id: 'pending', title: 'Aguardando aprovação', description: 'Novos cadastros que ainda precisam ser analisados.', users: filtered.filter((item) => item.status === 'PENDING') },
    { id: 'active', title: 'Usuários ativos', description: 'Pessoas com acesso liberado ao espaço atual.', users: filtered.filter((item) => item.status === 'ACTIVE' && item.isActive) },
    { id: 'inactive', title: 'Bloqueados e inativos', description: 'Acessos bloqueados, rejeitados ou desabilitados.', users: filtered.filter((item) => item.status !== 'PENDING' && !(item.status === 'ACTIVE' && item.isActive)) }
  ].filter((group) => group.users.length > 0);

  return <section className="px-screen px-users-screen">
    <header className="px-screen-head"><div><span className="px-kicker">Usuários</span><h1>Pessoas, perfis e permissões</h1><p>{source.workspace?.name ? `${source.workspace.name} · ` : ''}Cadastros e acessos carregados da rota administrativa oficial do MEG.</p></div><div className="px-screen-head-aside"><span className={`px-users-readonly ${pending ? 'has-pending' : ''}`}>{pending ? `${pending} aguardando aprovação` : 'Somente leitura'}</span></div></header>

    <section className="px-screen-kpis">
      <article><span>Total de pessoas</span><strong>{users.length}</strong><small>No espaço atual</small></article>
      <article><span>Ativos</span><strong>{active}</strong><small>Acesso liberado</small></article>
      <article className="warn"><span>Pendentes</span><strong>{pending}</strong><small>Aguardando análise</small></article>
      <article className={inactive ? 'danger' : ''}><span>Bloqueados/inativos</span><strong>{inactive}</strong><small>{admins} administrador(es) ativo(s)</small></article>
    </section>

    <section className="px-card px-users-panel">
      <div className="px-users-toolbar">
        <label className="px-search-field"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nome, e-mail ou telefone" /></label>
        <select value={role} onChange={(event) => setRole(event.target.value)}><option value="all">Todos os perfis</option><option value="ADMIN">Administrador</option><option value="MANAGER">Gestor</option><option value="OPERATOR">Operador</option><option value="VIEWER">Visualização</option></select>
        <select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Todos os status</option><option value="ACTIVE">Ativo</option><option value="PENDING">Pendente</option><option value="BLOCKED">Bloqueado</option><option value="REJECTED">Rejeitado</option></select>
      </div>

      <div className="px-users-groups">
        {groups.map((group) => <section className={`px-users-group is-${group.id}`} key={group.id}>
          <header className="px-users-group-head"><div><span>{group.title}</span><small>{group.description}</small></div><strong>{group.users.length}</strong></header>
          <div className="px-users-grid">
            {group.users.map((item) => <article className="px-user-card" key={item.id}>
              <div className="px-user-card-head"><span className="px-user-card-avatar">{item.name.slice(0, 1).toUpperCase()}</span><div><strong>{item.name}</strong><small>{item.email}</small></div><span className={`px-user-status ${item.status.toLowerCase()}`}>{statusLabel(item.status)}</span></div>
              <dl><div><dt>Perfil</dt><dd>{roleLabel(item.role)}</dd></div><div><dt>Telefone</dt><dd>{item.phone || 'Não informado'}</dd></div><div><dt>Cadastro</dt><dd>{item.createdAt ? shortDate.format(new Date(item.createdAt)) : 'Não informado'}</dd></div><div><dt>Último acesso</dt><dd>{item.lastLoginAt ? lastLogin.format(new Date(item.lastLoginAt)) : 'Sem acesso registrado'}</dd></div><div><dt>Conta</dt><dd>{item.isActive ? 'Habilitada' : 'Desabilitada'}</dd></div></dl>
              <div className="px-user-card-footer"><span>{item.status === 'PENDING' ? 'A aprovação será habilitada junto com a escrita administrativa.' : 'Alterações continuam bloqueadas nesta fase.'}</span><button type="button" disabled>{actionLabel(item)}</button></div>
            </article>)}
          </div>
        </section>)}
      </div>
      {!filtered.length ? <div className="px-empty px-users-empty">Nenhum usuário corresponde aos filtros.</div> : null}
    </section>
  </section>;
}
