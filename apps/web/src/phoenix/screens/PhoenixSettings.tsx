import { useEffect, useRef, useState } from 'react';
import type { PhoenixReadModel } from '../contracts';
import {
  PhoenixProfileAvatar,
  imageFileToAvatarDataUrl,
  phoenixAvatarPresets,
  readPhoenixAvatarPreference,
  savePhoenixAvatarPreference,
  type PhoenixAvatarPreference
} from '../profile-avatar';
import '../phoenix-settings.css';

type PhoenixSettingsProps = {
  data: PhoenixReadModel;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
};

type SettingsSection = 'profile' | 'home' | 'security' | 'system';
type DashboardPreferences = {
  balance: boolean;
  projection: boolean;
  summary: boolean;
  benefit: boolean;
  history: boolean;
  agenda: boolean;
};

const DASHBOARD_PREFS_KEY = 'meg.dashboard.preferences';
const defaultDashboardPreferences: DashboardPreferences = {
  balance: true,
  projection: true,
  summary: true,
  benefit: true,
  history: true,
  agenda: true
};

function stateLabel(value?: string | boolean | null) {
  if (value === true) return 'OK';
  if (value === false) return 'Atenção';
  if (!value) return 'Não informado';
  return String(value);
}

function readDashboardPreferences(): DashboardPreferences {
  try {
    const stored = localStorage.getItem(DASHBOARD_PREFS_KEY);
    if (!stored) return defaultDashboardPreferences;
    return { ...defaultDashboardPreferences, ...JSON.parse(stored) } as DashboardPreferences;
  } catch {
    return defaultDashboardPreferences;
  }
}

function applyDashboardPreferences(preferences: DashboardPreferences) {
  const root = document.documentElement;
  (Object.entries(preferences) as Array<[keyof DashboardPreferences, boolean]>).forEach(([key, enabled]) => {
    root.dataset[`megDashboard${key.slice(0, 1).toUpperCase()}${key.slice(1)}`] = enabled ? 'on' : 'off';
  });
}

function DashboardToggle({ checked, label, description, onChange }: { checked: boolean; label: string; description: string; onChange: () => void }) {
  return <button type="button" className={`px-settings-dashboard-toggle ${checked ? 'is-on' : ''}`} onClick={onChange} aria-pressed={checked}>
    <span className="px-settings-dashboard-check" aria-hidden="true">{checked ? '✓' : ''}</span>
    <span><strong>{label}</strong><small>{description}</small></span>
    <em>{checked ? 'Visível' : 'Oculto'}</em>
  </button>;
}

export function PhoenixSettings({ data, theme, onToggleTheme }: PhoenixSettingsProps) {
  const normalizationOk = Boolean(data.normalization.primary && data.normalization.reconciled);
  const repair = data.health.dataRepair;
  const healthNormalization = data.health.normalization;
  const fileRef = useRef<HTMLInputElement>(null);
  const [section, setSection] = useState<SettingsSection>('profile');
  const [avatar, setAvatar] = useState<PhoenixAvatarPreference>(() => readPhoenixAvatarPreference(data.user.id));
  const [avatarError, setAvatarError] = useState('');
  const [dashboardPreferences, setDashboardPreferences] = useState<DashboardPreferences>(() => readDashboardPreferences());

  useEffect(() => {
    applyDashboardPreferences(dashboardPreferences);
    try { localStorage.setItem(DASHBOARD_PREFS_KEY, JSON.stringify(dashboardPreferences)); } catch { /* preferência local opcional */ }
  }, [dashboardPreferences]);

  function updateAvatar(next: PhoenixAvatarPreference) {
    setAvatar(next);
    setAvatarError('');
    savePhoenixAvatarPreference(next, data.user.id);
  }

  async function choosePhoto(file?: File) {
    if (!file) return;
    try {
      const dataUrl = await imageFileToAvatarDataUrl(file);
      updateAvatar({ kind: 'photo', dataUrl });
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : 'Não foi possível usar esta imagem.');
    }
  }

  function toggleDashboardPreference(key: keyof DashboardPreferences) {
    setDashboardPreferences((current) => ({ ...current, [key]: !current[key] }));
  }

  return <section className="px-screen px-settings-screen">
    <header className="px-screen-head"><div><span className="px-kicker">Configurações</span><h1>Seu MEG, do seu jeito</h1><p>Perfil, aparência, segurança e saúde do sistema organizados no padrão V15.</p></div><div className="px-screen-head-aside"><span className={`px-settings-health ${normalizationOk ? 'ok' : 'warn'}`}>{normalizationOk ? 'Sistema operacional' : 'Verificar integridade'}</span></div></header>

    <div className="px-settings-v15-layout">
      <nav className="px-settings-nav" aria-label="Seções das configurações">
        <button type="button" className={section === 'profile' ? 'active' : ''} onClick={() => setSection('profile')}><span>01</span><div><strong>Meu perfil</strong><small>Foto, avatar e identidade</small></div></button>
        <button type="button" className={section === 'home' ? 'active' : ''} onClick={() => setSection('home')}><span>02</span><div><strong>Aparência e Home</strong><small>Tema e dashboard</small></div></button>
        <button type="button" className={section === 'security' ? 'active' : ''} onClick={() => setSection('security')}><span>03</span><div><strong>Segurança</strong><small>Sessão e permissões</small></div></button>
        <button type="button" className={section === 'system' ? 'active' : ''} onClick={() => setSection('system')}><span>04</span><div><strong>Sistema</strong><small>Dados, sincronização e diagnóstico</small></div></button>
      </nav>

      <div className="px-settings-workspace">
        {section === 'profile' ? <>
          <section className="px-card px-settings-profile-hero">
            <div className="px-settings-profile-main">
              <PhoenixProfileAvatar name={data.user.name} preference={avatar} className="px-settings-avatar-large" />
              <div><span className="px-kicker">Meu perfil</span><h2>{data.user.name}</h2><p>{data.user.email}</p><div className="px-settings-profile-tags"><span>{data.user.role}</span><span>{data.user.status}</span></div></div>
            </div>
            <div className="px-settings-profile-actions"><input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => { void choosePhoto(event.target.files?.[0]); event.currentTarget.value = ''; }} /><button type="button" onClick={() => fileRef.current?.click()}>Escolher foto</button><button type="button" onClick={() => updateAvatar({ kind: 'initials' })}>Usar iniciais</button></div>
          </section>

          <section className="px-card px-settings-card">
            <div className="px-settings-card-head"><div><span className="px-kicker">Avatares MEG</span><h2>Escolha um estilo pronto</h2><p>Você pode usar uma foto sua, um avatar pré-selecionado ou manter somente suas iniciais.</p></div></div>
            <div className="px-avatar-presets">
              {phoenixAvatarPresets.map((preset) => {
                const preference: PhoenixAvatarPreference = { kind: 'preset', presetId: preset.id };
                const selected = avatar.kind === 'preset' && avatar.presetId === preset.id;
                return <button key={preset.id} type="button" className={selected ? 'selected' : ''} onClick={() => updateAvatar(preference)}><PhoenixProfileAvatar name={data.user.name} preference={preference} /><span>{preset.label}</span>{selected ? <b>✓</b> : null}</button>;
              })}
            </div>
            {avatarError ? <div className="px-settings-avatar-error">{avatarError}</div> : null}
            <p className="px-settings-profile-note">A imagem é uma preferência visual deste usuário neste navegador. O cadastro oficial ainda não possui campo de avatar na API; não simulamos gravação em nuvem.</p>
          </section>

          <section className="px-card px-settings-card">
            <div className="px-settings-card-head"><div><span className="px-kicker">Cadastro</span><h2>Dados do usuário</h2><p>Os dados abaixo vêm do cadastro oficial de autenticação.</p></div></div>
            <dl><div><dt>Nome</dt><dd>{data.user.name}</dd></div><div><dt>E-mail</dt><dd>{data.user.email}</dd></div><div><dt>Telefone</dt><dd>{data.user.phone || 'Não informado'}</dd></div><div><dt>Perfil</dt><dd>{data.user.role}</dd></div><div><dt>Status</dt><dd>{data.user.status}</dd></div><div><dt>Último acesso</dt><dd>{data.user.lastLoginAt ? new Date(data.user.lastLoginAt).toLocaleString('pt-BR') : 'Não informado'}</dd></div></dl>
          </section>
        </> : null}

        {section === 'home' ? <>
          <section className="px-card px-settings-card px-settings-appearance-card">
            <div className="px-settings-card-head"><div><span className="px-kicker">Aparência</span><h2>Visual do sistema</h2><p>As preferências são aplicadas imediatamente, sem alterar regras financeiras.</p></div></div>
            <div className="px-settings-control-row"><div><strong>Tema</strong><small>Alterne entre o modo claro e escuro.</small></div><button type="button" onClick={onToggleTheme}>{theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}</button></div>
            <div className="px-settings-control-row"><div><strong>Formato monetário</strong><small>Padrão oficial desta instalação.</small></div><span className="px-settings-value">R$ 1.234,56</span></div>
            <div className="px-settings-control-row"><div><strong>Tela inicial</strong><small>A Home é a entrada oficial durante a homologação.</small></div><span className="px-settings-value muted">Início</span></div>
          </section>

          <section className="px-card px-settings-card px-settings-dashboard-card">
            <div className="px-settings-card-head"><div><span className="px-kicker">Dashboard</span><h2>Monte sua Home</h2><p>Escolha os blocos que fazem sentido para o seu dia a dia.</p></div><button type="button" className="px-settings-restore" onClick={() => setDashboardPreferences(defaultDashboardPreferences)}>Restaurar padrão</button></div>
            <div className="px-settings-dashboard-grid">
              <DashboardToggle checked={dashboardPreferences.balance} label="Saldo monetário" description="Card principal com o saldo realizado." onChange={() => toggleDashboardPreference('balance')} />
              <DashboardToggle checked={dashboardPreferences.projection} label="Diagnóstico e projeção" description="Alerta de fechamento positivo ou déficit." onChange={() => toggleDashboardPreference('projection')} />
              <DashboardToggle checked={dashboardPreferences.summary} label="Resumo financeiro" description="Pagas, pendentes e consolidado do período." onChange={() => toggleDashboardPreference('summary')} />
              <DashboardToggle checked={dashboardPreferences.benefit} label="Benefício alimentação" description="Saldo, créditos e utilização." onChange={() => toggleDashboardPreference('benefit')} />
              <DashboardToggle checked={dashboardPreferences.history} label="Histórico recente" description="Últimas ações auditáveis." onChange={() => toggleDashboardPreference('history')} />
              <DashboardToggle checked={dashboardPreferences.agenda} label="Agenda financeira" description="Vencimentos e compromissos acionáveis." onChange={() => toggleDashboardPreference('agenda')} />
            </div>
          </section>
        </> : null}

        {section === 'security' ? <section className="px-settings-grid">
          <article className="px-card px-settings-card"><div className="px-settings-card-head"><div><span className="px-kicker">Segurança</span><h2>Sessão e permissões</h2><p>Identidade autenticada e estado atual do acesso.</p></div></div><dl><div><dt>Usuário</dt><dd>{data.user.name}</dd></div><div><dt>Perfil</dt><dd>{data.user.role}</dd></div><div><dt>Status</dt><dd>{data.user.status}</dd></div></dl><div className="px-settings-status-list"><span>Biometria · não consultada no módulo nativo Android</span><span>Bloqueio automático · não consultada nesta interface Web</span><span>Outras sessões · ação administrativa ainda bloqueada</span></div></article>
          <article className="px-card px-settings-card"><div className="px-settings-card-head"><div><span className="px-kicker">Acesso</span><h2>Proteção da conta</h2><p>A Phoenix ainda não libera alterações administrativas de credenciais.</p></div></div><div className="px-settings-control-row"><div><strong>Recuperação de acesso</strong><small>Fluxo existe na entrada do MEG.</small></div><span className="px-settings-value">Disponível no login</span></div><div className="px-settings-control-row"><div><strong>Alterar senha</strong><small>Será habilitado com contrato seguro dedicado.</small></div><button type="button" disabled>Alterar senha</button></div></article>
        </section> : null}

        {section === 'system' ? <>
          <section className="px-card px-settings-health-banner"><div className="px-settings-health-copy"><span className="px-settings-health-icon" aria-hidden="true">{normalizationOk ? '✓' : '!'}</span><div><span className="px-kicker">Saúde do sistema</span><h2>{normalizationOk ? 'Sistema funcionando normalmente' : 'Sistema requer verificação'}</h2><p>Status construído apenas com indicadores reais expostos pela API.</p></div></div><div className="px-settings-health-chips"><span>API · {stateLabel(data.health.status)}</span><span>Banco · {data.normalization.primary ? 'Primário' : 'Verificar'}</span><span>Normalização · {normalizationOk ? 'OK' : 'Pendente'}</span><span>Modo · {data.normalization.mode || '—'}</span></div></section>
          <section className="px-settings-grid">
            <article className="px-card px-settings-card"><div className="px-settings-card-head"><div><span className="px-kicker">Sincronização</span><h2>Integridade da base</h2></div></div><div className={`px-settings-sync-banner ${normalizationOk ? 'ok' : 'warn'}`}><strong>{normalizationOk ? 'Tudo reconciliado' : 'Verificação necessária'}</strong><small>{data.normalization.updatedAt ? `Atualização: ${new Date(data.normalization.updatedAt).toLocaleString('pt-BR')}` : 'Horário de atualização não informado'}</small></div><dl><div><dt>Base primária</dt><dd>{data.normalization.primary ? 'Sim' : 'Não'}</dd></div><div><dt>Revisão</dt><dd>{data.normalization.revision}</dd></div><div><dt>Eventos normalizados</dt><dd>{data.normalization.normalized?.count ?? '—'}</dd></div></dl></article>
            <article className="px-card px-settings-card"><div className="px-settings-card-head"><div><span className="px-kicker">Backup e dados</span><h2>Proteção da base</h2></div></div><p>A restauração continua bloqueada para impedir mutações durante a homologação.</p><button type="button" disabled>Restaurar backup</button><small className="px-settings-note">Bloqueado propositalmente até o gate de escrita.</small></article>
            <article className="px-card px-settings-card"><div className="px-settings-card-head"><div><span className="px-kicker">Dispositivos</span><h2>Web e Android</h2></div></div><div className="px-settings-status-list"><span>Web atual · sessão autenticada</span><span>Android · integração de dispositivo pendente</span><span>Biometria · não consultada nesta sessão Web</span></div></article>
            <article className="px-card px-settings-card"><div className="px-settings-card-head"><div><span className="px-kicker">Alertas</span><h2>Canais e automações</h2></div></div><div className="px-settings-status-list"><span>E-mail · infraestrutura existente</span><span>WhatsApp · infraestrutura existente</span><span>Destinatários · leitura a conectar</span><span>Rotinas · não afirmadas como ativas sem contrato oficial</span></div></article>
            <article className="px-card px-settings-card"><div className="px-settings-card-head"><div><span className="px-kicker">Diagnóstico</span><h2>Reparo e normalização</h2></div></div><dl><div><dt>Reparo</dt><dd>{repair ? stateLabel(repair.status) : 'Não informado'}</dd></div><div><dt>Itens verificados</dt><dd>{repair?.scanned ?? '—'}</dd></div><div><dt>Itens reparados</dt><dd>{repair?.repaired ?? '—'}</dd></div><div><dt>Ocorrências</dt><dd>{repair?.issues ?? '—'}</dd></div><div><dt>Normalização API</dt><dd>{healthNormalization ? stateLabel(healthNormalization.status) : 'Não informado'}</dd></div></dl></article>
            <article className="px-card px-settings-card"><div className="px-settings-card-head"><div><span className="px-kicker">Sobre</span><h2>MEG Finance System</h2></div></div><p>Meu Equilíbrio Gerencial · Phoenix V15 em homologação controlada.</p><dl><div><dt>Modo</dt><dd>{data.sourcePolicy.mode}</dd></div><div><dt>Eventos</dt><dd>{data.sourcePolicy.events}</dd></div><div><dt>Usuários</dt><dd>{data.sourcePolicy.users}</dd></div></dl></article>
          </section>
        </> : null}
      </div>
    </div>
  </section>;
}
