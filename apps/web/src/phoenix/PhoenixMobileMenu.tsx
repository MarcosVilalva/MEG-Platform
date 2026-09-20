import type { PhoenixRoute } from './PhoenixCommandPalette';
import { PhoenixNavIcon } from './PhoenixNavIcon';
import { PhoenixProfileAvatar, type PhoenixAvatarPreference } from './profile-avatar';

type Props = {
  open: boolean;
  userName: string;
  userRole: string;
  avatar: PhoenixAvatarPreference;
  currentView: PhoenixRoute;
  refreshing: boolean;
  onClose: () => void;
  onNavigate: (view: PhoenixRoute) => void;
  onSearch: () => void;
  onRefresh: () => void;
  onLogout?: () => void;
};

const shortcuts: Array<{ id: PhoenixRoute; label: string; copy: string; icon: 'history' | 'cards' | 'catalogs' | 'settings' }> = [
  { id: 'history', label: 'Histórico', copy: 'Tudo que mudou na sua base', icon: 'history' },
  { id: 'cards', label: 'Cartões', copy: 'Faturas, limites e compras', icon: 'cards' },
  { id: 'catalogs', label: 'Cadastros', copy: 'Grupos, contas e formas', icon: 'catalogs' },
  { id: 'settings', label: 'Configurações', copy: 'Perfil, avatar e preferências', icon: 'settings' },
];

export function PhoenixMobileMenu({
  open,
  userName,
  userRole,
  avatar,
  currentView,
  refreshing,
  onClose,
  onNavigate,
  onSearch,
  onRefresh,
  onLogout
}: Props) {
  if (!open) return null;

  return <div className="px-mobile-more-layer" role="presentation">
    <button className="px-mobile-more-backdrop" type="button" aria-label="Fechar menu" onClick={onClose} />
    <section className="px-mobile-more-sheet" role="dialog" aria-modal="true" aria-label="Menu do MEG Operacional">
      <header className="px-mobile-more-head">
        <div className="px-mobile-more-profile">
          <PhoenixProfileAvatar name={userName} preference={avatar} className="px-mobile-more-avatar" />
          <div><strong>{userName}</strong><small>{userRole}</small></div>
        </div>
        <button type="button" className="px-mobile-more-close" onClick={onClose} aria-label="Fechar menu">×</button>
      </header>

      <div className="px-mobile-more-primary">
        <button type="button" onClick={() => { onSearch(); onClose(); }}>
          <span><PhoenixNavIcon name="search" /></span><div><strong>Buscar</strong><small>Encontre um lançamento rapidamente</small></div>
        </button>
        <button type="button" disabled={refreshing} onClick={() => { onRefresh(); onClose(); }}>
          <span className={refreshing ? 'is-spinning' : ''}>↻</span><div><strong>{refreshing ? 'Atualizando…' : 'Atualizar dados'}</strong><small>Sincronize a base agora</small></div>
        </button>
      </div>

      <div className="px-mobile-more-grid">
        {shortcuts.map((item) => <button
          key={item.id}
          type="button"
          className={currentView === item.id ? 'active' : ''}
          onClick={() => onNavigate(item.id)}
        >
          <span><PhoenixNavIcon name={item.icon} /></span>
          <strong>{item.label}</strong>
          <small>{item.copy}</small>
        </button>)}
      </div>

      <footer className="px-mobile-more-footer">
        <button type="button" onClick={() => onNavigate('settings')}>
          <PhoenixNavIcon name="settings" /><span>Meu perfil</span>
        </button>
        <button type="button" onClick={onLogout}>
          <PhoenixNavIcon name="logout" /><span>Sair</span>
        </button>
      </footer>
    </section>
  </div>;
}
