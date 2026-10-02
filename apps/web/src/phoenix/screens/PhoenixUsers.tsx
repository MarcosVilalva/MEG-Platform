import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usersAdminClient, type AuthUser, type UserAccessAction, type UserRole } from '../../app/auth-client';
import type { PhoenixReadModel } from '../contracts';
import { loadPhoenixReadModel } from '../data/load-phoenix-read-model';
import { megAlert, megConfirm } from '../meg-confirm';
import { PhoenixProfileAvatar, readPhoenixAvatarPreference } from '../profile-avatar';

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

function accessError(error: unknown) {
  const code = error instanceof Error ? error.message : 'USER_ACCESS_FAILED';
  if (/PRIMARY_ADMIN_CANNOT_BE_BLOCKED/i.test(code)) return 'O administrador principal do workspace não pode ser bloqueado.';
  if (/PRIMARY_ADMIN_CANNOT_BE_DELETED/i.test(code)) return 'O administrador principal do workspace não pode ser removido.';
  if (/CANNOT_DELETE_OWN_ACCESS/i.test(code)) return 'Sua própria conta não pode ser removida por esta tela.';
  if (/USER_MUST_BE_INACTIVE_BEFORE_DELETE/i.test(code)) return 'Bloqueie ou rejeite o acesso antes de remover definitivamente este usuário.';
  if (/USER_NOT_IN_WORKSPACE|USER_NOT_FOUND/i.test(code)) return 'Este usuário não pertence mais ao workspace atual.';
  if (/USER_NOT_ACTIVE/i.test(code)) return 'A conta precisa estar ativa para executar esta ação.';
  if (/EMAIL_DELIVERY_FAILED|NOTIFICATION_DELIVERY_FAILED/i.test(code)) return 'A alteração foi processada, mas o aviso ao usuário não pôde ser entregue por nenhum canal disponível.';
  if (/403|FORBIDDEN/i.test(code)) return 'Somente administradores podem alterar acessos.';
  return 'Não foi possível concluir a alteração de acesso.';
}

export function PhoenixUsers({ data, onDataCommitted, focusRequest }: { data: PhoenixReadModel; onDataCommitted?: (snapshot: PhoenixReadModel) => void; focusRequest?: { token: number; userId: string } | null }) {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [selectedId, setSelectedId] = useState('');
  const [draftRole, setDraftRole] = useState<UserRole>('VIEWER');
  const [draftPhone, setDraftPhone] = useState('');
  const [rejectionNote, setRejectionNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [focusedUserId, setFocusedUserId] = useState<string | null>(null);
  const focusRequestTokenRef = useRef(0);

  const source = data.workspaceUsers;
  const users = source.status === 'ready' ? source.users : [];
  const selected = selectedId ? users.find((item) => item.id === selectedId) || null : null;
  const filtered = useMemo(() => users.filter((item) => {
    const haystack = `${item.name} ${item.email} ${item.phone || ''}`.toLocaleLowerCase('pt-BR');
    return haystack.includes(search.trim().toLocaleLowerCase('pt-BR'))
      && (role === 'all' || item.role === role)
      && (status === 'all' || item.status === status);
  }), [users, search, role, status]);

  useEffect(() => {
    if (!focusRequest || focusRequest.token === focusRequestTokenRef.current) return;
    const target = users.find((item) => item.id === focusRequest.userId);
    if (!target) return;
    focusRequestTokenRef.current = focusRequest.token;
    setSearch('');
    setRole('all');
    setStatus('all');
    setFocusedUserId(target.id);
    const scrollTimer = window.setTimeout(() => {
      document.querySelector<HTMLElement>(`[data-user-id="${CSS.escape(target.id)}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 80);
    const clearTimer = window.setTimeout(() => {
      setFocusedUserId((current) => current === target.id ? null : current);
    }, 3600);
    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
    };
  }, [focusRequest, users]);

  if (source.status === 'restricted') {
    return <section className="px-screen"><header className="px-screen-head"><div><span className="px-kicker">Usuários</span><h1>Pessoas, perfis e permissões</h1><p>Esta área é administrativa.</p></div></header><div className="px-card px-users-message"><strong>Acesso restrito</strong><p>Seu perfil atual é {roleLabel(data.user.role)}. A administração de usuários permanece protegida pela regra ADMIN do backend.</p></div></section>;
  }

  if (source.status === 'error') {
    return <section className="px-screen"><header className="px-screen-head"><div><span className="px-kicker">Usuários</span><h1>Pessoas, perfis e permissões</h1><p>Administração oficial do workspace.</p></div></header><div className="px-card px-users-message"><strong>Não foi possível carregar os usuários</strong><p>{source.error || 'USERS_READ_FAILED'}</p></div></section>;
  }

  const active = users.filter((item) => item.status === 'ACTIVE' && item.isActive).length;
  const pending = users.filter((item) => item.status === 'PENDING').length;
  const inactive = users.filter((item) => item.status === 'BLOCKED' || item.status === 'REJECTED' || !item.isActive).length;
  const admins = users.filter((item) => item.role === 'ADMIN' && item.isActive).length;
  const groups: UserGroup[] = [
    { id: 'pending', title: 'Aguardando aprovação', description: 'Solicitações que ainda precisam de uma decisão do administrador.', users: filtered.filter((item) => item.status === 'PENDING') },
    { id: 'active', title: 'Usuários ativos', description: 'Pessoas com acesso liberado ao ambiente financeiro compartilhado.', users: filtered.filter((item) => item.status === 'ACTIVE' && item.isActive) },
    { id: 'inactive', title: 'Bloqueados e inativos', description: 'Acessos bloqueados, rejeitados ou desabilitados.', users: filtered.filter((item) => item.status !== 'PENDING' && !(item.status === 'ACTIVE' && item.isActive)) }
  ].filter((group) => group.users.length > 0);

  function openUser(item: AuthUser) {
    setSelectedId(item.id);
    setDraftRole(item.role);
    setDraftPhone(item.phone || '');
    setRejectionNote('');
    setMessage('');
  }

  async function refreshUsers() {
    const snapshot = await loadPhoenixReadModel(data.month, { force: true });
    onDataCommitted?.(snapshot);
  }

  async function performAccess(action: UserAccessAction) {
    if (!selected || busy) return;
    const confirmation = action === 'APPROVE'
      ? { title:'Aprovar acesso?', message:`${selected.name} passará a acessar o workspace como ${roleLabel(draftRole)}.`, confirmLabel:'Aprovar acesso', danger:false }
      : action === 'REJECT'
        ? { title:'Rejeitar solicitação?', message:'O usuário ficará sem acesso e receberá o motivo informado, quando houver canal disponível.', confirmLabel:'Rejeitar', danger:true }
        : action === 'BLOCK'
          ? { title:'Bloquear acesso?', message:'As sessões ativas serão revogadas e o usuário deixará de acessar a base imediatamente.', confirmLabel:'Bloquear', danger:true }
          : action === 'ACTIVATE'
            ? { title:'Reativar acesso?', message:`${selected.name} voltará a acessar o workspace como ${roleLabel(draftRole)}.`, confirmLabel:'Reativar', danger:false }
            : { title:'Salvar alterações?', message:'Perfil e telefone serão atualizados no cadastro compartilhado.', confirmLabel:'Salvar', danger:false };
    const confirmed = await megConfirm({ kicker:'Controle de acesso', ...confirmation });
    if (!confirmed) return;

    setBusy(true);
    setMessage('Confirmando alteração de acesso…');
    try {
      const result = await usersAdminClient.updateAccess(selected.id, {
        action,
        ...(action === 'APPROVE' || action === 'ACTIVATE' || action === 'UPDATE' ? { role: draftRole, phone: draftPhone.trim() || undefined } : {}),
        ...(action === 'REJECT' && rejectionNote.trim() ? { note: rejectionNote.trim() } : {}),
      });
      await refreshUsers();
      const delivery = result.notifications?.length
        ? result.notifications.map((item) => `${item.channel}: ${item.status}`).join(' · ')
        : 'sem aviso externo necessário';
      setMessage(`Acesso atualizado e confirmado. ${delivery}.`);
      setSelectedId('');
    } catch (error) {
      setMessage(accessError(error));
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser() {
    if (!selected || busy || selected.id === data.user.id) return;
    const removable = selected.status === 'BLOCKED' || selected.status === 'REJECTED' || !selected.isActive;
    if (!removable) {
      setMessage('Bloqueie ou rejeite o acesso antes de remover definitivamente este usuário.');
      return;
    }
    const confirmed = await megConfirm({
      kicker:'Remoção de usuário',
      title:'Remover este usuário do workspace?',
      message:`${selected.name} (${selected.email}) será removido do cadastro e não poderá mais acessar este workspace. O histórico financeiro já registrado será preservado e a remoção ficará auditada.`,
      confirmLabel:'Remover usuário',
      cancelLabel:'Voltar',
      danger:true,
    });
    if (!confirmed) return;

    setBusy(true);
    setMessage('Removendo usuário e preservando a auditoria…');
    try {
      await usersAdminClient.deleteUser(selected.id);
      await refreshUsers();
      setSelectedId('');
      setMessage('Usuário removido do workspace. O histórico financeiro foi preservado.');
    } catch (error) {
      setMessage(accessError(error));
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    if (!selected || busy) return;
    const confirmed = await megConfirm({
      kicker:'Segurança',
      title:'Gerar nova senha temporária?',
      message:`Uma nova senha será criada para ${selected.name}, as sessões atuais serão encerradas e a credencial será enviada pelos canais disponíveis.`,
      confirmLabel:'Redefinir senha',
      danger:true,
    });
    if (!confirmed) return;
    setBusy(true);
    try {
      const result = await usersAdminClient.resetPassword(selected.id);
      await megAlert({ kicker:'Senha redefinida', title:'Credencial temporária enviada', message:`A nova credencial foi encaminhada para ${result.deliveredTo}. As sessões anteriores foram revogadas.`, buttonLabel:'Entendi' });
    } catch (error) {
      await megAlert({ kicker:'Segurança', title:'Não foi possível redefinir a senha', message:accessError(error), danger:true, buttonLabel:'Fechar' });
    } finally {
      setBusy(false);
    }
  }

  async function testEmail() {
    if (!selected || busy) return;
    setBusy(true);
    try {
      const result = await usersAdminClient.testEmail(selected.id);
      await megAlert({
        kicker:'Teste de e-mail',
        title:result.email.status === 'sent' ? 'Mensagem enviada' : 'Entrega não confirmada',
        message:result.email.status === 'sent' ? `O teste foi enviado para ${result.deliveredTo}.` : result.email.detail || 'O provedor não confirmou a entrega.',
        danger:result.email.status !== 'sent',
        buttonLabel:'Fechar',
      });
    } catch (error) {
      await megAlert({ kicker:'Teste de e-mail', title:'Falha no teste', message:accessError(error), danger:true, buttonLabel:'Fechar' });
    } finally {
      setBusy(false);
    }
  }

  return <section className="px-screen px-users-screen">
    <header className="px-screen-head"><div><span className="px-kicker">Usuários e acessos</span><h1>Pessoas, perfis e permissões</h1><p>{source.workspace?.name ? `${source.workspace.name} · ` : ''}Aprovações, perfis e bloqueios operam diretamente na rota administrativa oficial do MEG.</p></div><div className="px-screen-head-aside"><span className={`px-users-readonly active ${pending ? 'has-pending' : ''}`}>{pending ? `${pending} aguardando aprovação` : 'Administração habilitada'}</span></div></header>

    <section className="px-screen-kpis">
      <article><span>Total de pessoas</span><strong>{users.length}</strong><small>No workspace atual</small></article>
      <article><span>Ativos</span><strong>{active}</strong><small>Acesso liberado</small></article>
      <article className="warn"><span>Pendentes</span><strong>{pending}</strong><small>Aguardando decisão</small></article>
      <article className={inactive ? 'danger' : ''}><span>Bloqueados/inativos</span><strong>{inactive}</strong><small>{admins} administrador(es) ativo(s)</small></article>
    </section>

    {message ? <div className={`meg-web-operation-feedback ${/não|falha|bloqueado|restrito/i.test(message) ? 'warn' : 'ok'}`}>{message}</div> : null}

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
            {group.users.map((item) => <article data-user-id={item.id} className={`px-user-card ${focusedUserId === item.id ? 'is-search-focused' : ''}`} key={item.id}>
              <div className="px-user-card-head"><PhoenixProfileAvatar name={item.name} preference={readPhoenixAvatarPreference(item.id)} className="px-user-card-avatar" /><div><strong>{item.name}</strong><small>{item.email}</small></div><span className={`px-user-status ${item.status.toLowerCase()}`}>{statusLabel(item.status)}</span></div>
              <dl><div><dt>Perfil</dt><dd>{roleLabel(item.role)}</dd></div><div><dt>Telefone</dt><dd>{item.phone || 'Não informado'}</dd></div><div><dt>Cadastro</dt><dd>{item.createdAt ? shortDate.format(new Date(item.createdAt)) : 'Não informado'}</dd></div><div><dt>Último acesso</dt><dd>{item.lastLoginAt ? lastLogin.format(new Date(item.lastLoginAt)) : 'Sem acesso registrado'}</dd></div><div><dt>Conta</dt><dd>{item.isActive ? 'Habilitada' : 'Desabilitada'}</dd></div></dl>
              <div className="px-user-card-footer"><span>{item.id === data.user.id ? 'Sua própria conta pode ser revisada, mas bloqueios do administrador principal são protegidos pelo servidor.' : 'Alterações de acesso são auditadas no backend.'}</span><button type="button" onClick={() => openUser(item)}>{actionLabel(item)}</button></div>
            </article>)}
          </div>
        </section>)}
      </div>
      {!filtered.length ? <div className="px-empty px-users-empty">Nenhum usuário corresponde aos filtros.</div> : null}
    </section>

    {selected && typeof document !== 'undefined' ? createPortal(<div className="meg-web-user-access-overlay">
      <button className="meg-web-user-access-backdrop" type="button" aria-label="Fechar gerenciamento de acesso" disabled={busy} onClick={() => setSelectedId('')} />
      <section className="meg-web-user-access-dialog" role="dialog" aria-modal="true" aria-labelledby="meg-user-access-title">
        <header><PhoenixProfileAvatar name={selected.name} preference={readPhoenixAvatarPreference(selected.id)} className="px-user-card-avatar" /><div><span className="px-kicker">Controle de acesso</span><h2 id="meg-user-access-title">{selected.name}</h2><p>{selected.email} · {statusLabel(selected.status)}</p></div><button type="button" disabled={busy} onClick={() => setSelectedId('')}>×</button></header>
        <div className="meg-web-user-access-body">
          <div className="meg-web-user-access-grid">
            <label><span>Perfil</span><select value={draftRole} disabled={busy} onChange={(event) => setDraftRole(event.target.value as UserRole)}><option value="ADMIN">Administrador</option><option value="MANAGER">Gestor</option><option value="OPERATOR">Operador</option><option value="VIEWER">Visualização</option></select></label>
            <label><span>Telefone</span><input value={draftPhone} disabled={busy} onChange={(event) => setDraftPhone(event.target.value)} placeholder="DDD + número" /></label>
          </div>
          {selected.status === 'PENDING' ? <label className="meg-web-user-rejection"><span>Motivo da rejeição, se necessário</span><textarea maxLength={500} value={rejectionNote} onChange={(event) => setRejectionNote(event.target.value)} /></label> : null}
          <div className="meg-web-user-access-facts"><span><small>Status</small><strong>{statusLabel(selected.status)}</strong></span><span><small>Último acesso</small><strong>{selected.lastLoginAt ? lastLogin.format(new Date(selected.lastLoginAt)) : 'Sem acesso'}</strong></span><span><small>Conta</small><strong>{selected.isActive ? 'Habilitada' : 'Desabilitada'}</strong></span></div>
          <section className="meg-web-user-security-actions"><div><strong>Segurança e entrega</strong><small>Estas ações não exibem senhas nem segredos no navegador.</small></div><span><button type="button" disabled={busy || selected.status !== 'ACTIVE' || !selected.isActive} onClick={() => void resetPassword()}>Redefinir senha</button><button type="button" disabled={busy} onClick={() => void testEmail()}>Testar e-mail</button></span></section>
        </div>
        <footer>
          <button type="button" disabled={busy} onClick={() => setSelectedId('')}>Fechar</button>
          {selected.status === 'PENDING' ? <><button className="danger" type="button" disabled={busy} onClick={() => void performAccess('REJECT')}>Rejeitar</button><button className="px-primary-action" type="button" disabled={busy} onClick={() => void performAccess('APPROVE')}>Aprovar</button></> : null}
          {selected.status === 'ACTIVE' && selected.isActive ? <><button className="danger" type="button" disabled={busy || selected.id === data.user.id} onClick={() => void performAccess('BLOCK')}>Bloquear</button><button className="px-primary-action" type="button" disabled={busy} onClick={() => void performAccess('UPDATE')}>Salvar perfil</button></> : null}
          {(selected.status === 'BLOCKED' || selected.status === 'REJECTED' || !selected.isActive) ? <><button className="danger" type="button" disabled={busy || selected.id === data.user.id} onClick={() => void deleteUser()}>Remover usuário</button><button className="px-primary-action" type="button" disabled={busy} onClick={() => void performAccess('ACTIVATE')}>Reativar acesso</button></> : null}
        </footer>
      </section>
    </div>, document.body) : null}
  </section>;
}
