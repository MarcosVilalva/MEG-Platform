import { useEffect, useMemo, useRef, useState } from 'react';
import { authenticatedRequest } from '../../app/auth-client';
import type { PhoenixReadModel } from '../contracts';
import { getPhoenixLocalNotificationStatus } from '../phoenix-native-notifications';
import {
  PhoenixProfileAvatar,
  imageFileToAvatarDataUrl,
  phoenixAvatarPresets,
  readPhoenixAvatarPreference,
  hydratePhoenixAvatarPreference,
  savePhoenixAvatarPreference,
  savePhoenixAvatarPreferenceCloud,
  type PhoenixAvatarPreference
} from '../profile-avatar';
import '../phoenix-settings.css';

type PhoenixSettingsProps = {
  data: PhoenixReadModel;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onLogoutRequest?: () => void;
};

type SettingsSection = 'profile' | 'home' | 'security' | 'notifications' | 'system';

type BiometricStatus = { available: boolean; enabled: boolean; reason?: string | null; email?: string | null };
type NotificationStatus = {
  email?: { configured?: boolean; provider?: string; mode?: string; readyForAllUsers?: boolean; sender?: string };
  whatsapp?: { configured?: boolean; defaultRecipient?: string | null };
  alexa?: { configured?: boolean; announcementsConfigured?: boolean; skillConfigured?: boolean; schedule?: string };
  automation?: { configured?: boolean; schedule?: string };
};
type DeliverySummary = {
  sentLast24Hours?: number;
  failedLast24Hours?: number;
  lastSuccessAt?: string | null;
  lastFailureAt?: string | null;
  watchdog?: {
    lastCheckAt?: string | null;
    failedLast24Hours?: number;
    processing?: number;
    status?: 'ok' | 'attention' | 'processing' | 'waiting';
    localDate?: string;
    localTime?: string;
    expected?: Array<{ kind?: string; slot?: string; task?: string; state?: string; deliveredAt?: string | null }>;
  };
};
type LocalNotificationStatus = { native: boolean; permission: string; scheduled: number; platform: string };
type NormalizationPreview = {
  revision: number;
  primary: boolean;
  reconciled: boolean;
  mode: string;
  updatedAt?: string | null;
  source: { sourceCount: number; validCount: number; invalidCount: number; fingerprint: string };
  normalized: { count: number; fingerprint: string };
};
type DeviceSession = { id: string; userId: string; userName: string; deviceName: string; platform: string; createdAt: string; expiresAt: string; lastLoginAt?: string | null; active: boolean; revokedAt?: string | null };
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

export function PhoenixSettings({ data, theme, onToggleTheme, onLogoutRequest }: PhoenixSettingsProps) {
  const normalizationOk = Boolean(data.normalization.primary && data.normalization.reconciled);
  const repair = data.health.dataRepair;
  const healthNormalization = data.health.normalization;
  const fileRef = useRef<HTMLInputElement>(null);
  const [section, setSection] = useState<SettingsSection>('profile');
  const [avatar, setAvatar] = useState<PhoenixAvatarPreference>(() => readPhoenixAvatarPreference(data.user.id));
  const [avatarError, setAvatarError] = useState('');
  const [dashboardPreferences, setDashboardPreferences] = useState<DashboardPreferences>(() => readDashboardPreferences());
  const [avatarsExpanded, setAvatarsExpanded] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus | null>(null);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<NotificationStatus | null>(null);
  const [deliverySummary, setDeliverySummary] = useState<DeliverySummary | null>(null);
  const [normalizationPreview, setNormalizationPreview] = useState<NormalizationPreview | null>(null);
  const [normalizationPreviewError, setNormalizationPreviewError] = useState('');
  const [normalizationPreviewBusy, setNormalizationPreviewBusy] = useState(false);
  const [appVersion, setAppVersion] = useState<string>('Consultando…');
  const [deviceSessions, setDeviceSessions] = useState<DeviceSession[]>([]);
  const [deviceSessionsBusy, setDeviceSessionsBusy] = useState(false);
  const [notificationTestBusy, setNotificationTestBusy] = useState(false);
  const [notificationTestResult, setNotificationTestResult] = useState<Record<string, { status?: string; detail?: unknown }> | null>(null);
  const [localNotificationStatus, setLocalNotificationStatus] = useState<LocalNotificationStatus | null>(null);

  const visibleAvatarPresets = useMemo(() => {
    if (avatarsExpanded) return phoenixAvatarPresets;
    const first = phoenixAvatarPresets.slice(0, 12);
    if (avatar.kind !== 'preset' || first.some((item) => item.id === avatar.presetId)) return first;
    const selected = phoenixAvatarPresets.find((item) => item.id === avatar.presetId);
    return selected ? [...first.slice(0, 11), selected] : first;
  }, [avatar, avatarsExpanded]);

  useEffect(() => {
    applyDashboardPreferences(dashboardPreferences);
    try { localStorage.setItem(DASHBOARD_PREFS_KEY, JSON.stringify(dashboardPreferences)); } catch { /* preferência local opcional */ }
  }, [dashboardPreferences]);

  useEffect(() => {
    let active = true;
    void hydratePhoenixAvatarPreference(data.user.id).then((preference) => {
      if (active) setAvatar(preference);
    });
    return () => { active = false; };
  }, [data.user.id]);

  useEffect(() => {
    let active = true;
    const base = import.meta.env.BASE_URL || '/';
    const versionUrl = `${base.endsWith('/') ? base : `${base}/`}downloads/app-version.json`;
    void fetch(versionUrl, { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('VERSION_UNAVAILABLE')))
      .then((payload) => { if (active) setAppVersion(payload?.versionName ? `Android ${payload.versionName}` : 'Versão não informada'); })
      .catch(() => { if (active) setAppVersion(import.meta.env.VITE_MOBILE_APP === 'true' ? 'Android · versão não informada' : 'Web Phoenix V15'); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (import.meta.env.VITE_MOBILE_APP !== 'true') {
      setBiometricStatus({ available: false, enabled: false, reason: 'WEB_RUNTIME' });
      return () => { active = false; };
    }
    // @ts-ignore módulo JS nativo carregado apenas no APK.
    void import('../../native-biometric-login.js')
      .then((module) => module.getBiometricLoginStatus())
      .then((status) => { if (active) setBiometricStatus(status); })
      .catch(() => { if (active) setBiometricStatus({ available: false, enabled: false, reason: 'PLUGIN_UNAVAILABLE' }); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (data.user.role !== 'ADMIN') return () => { active = false; };
    void Promise.allSettled([
      authenticatedRequest<NotificationStatus>('/notifications/status', { cache: 'no-store' }),
      authenticatedRequest<{ summary?: DeliverySummary }>('/notifications/deliveries', { cache: 'no-store' })
    ]).then(([statusResult, deliveriesResult]) => {
      if (!active) return;
      if (statusResult.status === 'fulfilled') setNotificationStatus(statusResult.value);
      if (deliveriesResult.status === 'fulfilled') setDeliverySummary(deliveriesResult.value.summary || null);
    });
    return () => { active = false; };
  }, [data.user.role]);

  useEffect(() => {
    let active = true;
    void getPhoenixLocalNotificationStatus()
      .then((status) => { if (active) setLocalNotificationStatus(status); })
      .catch(() => { if (active) setLocalNotificationStatus(null); });
    return () => { active = false; };
  }, [section]);

  function updateAvatar(next: PhoenixAvatarPreference) {
    const normalized = savePhoenixAvatarPreference(next, data.user.id);
    setAvatar(normalized);
    setAvatarError('');
    void savePhoenixAvatarPreferenceCloud(normalized, data.user.id).then((result) => {
      if (!result.synced) setAvatarError('Avatar aplicado neste aparelho. A sincronização com os outros dispositivos será tentada novamente quando a nuvem estiver disponível.');
    });
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

  async function refreshBiometricStatus() {
    if (import.meta.env.VITE_MOBILE_APP !== 'true') return;
    setBiometricBusy(true);
    try {
      // @ts-ignore módulo JS nativo carregado apenas no APK.
      const biometric = await import('../../native-biometric-login.js');
      setBiometricStatus(await biometric.getBiometricLoginStatus());
    } finally {
      setBiometricBusy(false);
    }
  }

  async function refreshDeviceSessions() {
    setDeviceSessionsBusy(true);
    try {
      const result = await authenticatedRequest<{ sessions: DeviceSession[] }>('/auth/sessions', { cache: 'no-store' });
      setDeviceSessions(result.sessions || []);
    } finally { setDeviceSessionsBusy(false); }
  }

  async function inspectNormalization() {
    if (normalizationPreviewBusy) return;
    setNormalizationPreviewBusy(true);
    setNormalizationPreviewError('');
    try {
      const preview = await authenticatedRequest<NormalizationPreview>('/app-state/normalization-preview', { cache: 'no-store' });
      setNormalizationPreview(preview);
    } catch (error) {
      setNormalizationPreviewError(error instanceof Error ? error.message : 'Não foi possível comparar as duas fontes.');
    } finally {
      setNormalizationPreviewBusy(false);
    }
  }

  useEffect(() => {
    if (section === 'system' || section === 'security') void refreshDeviceSessions();
  }, [section]);

  async function testNotificationChannels() {
    setNotificationTestBusy(true);
    setNotificationTestResult(null);
    try {
      const result = await authenticatedRequest<Record<string, { status?: string; detail?: unknown }>>('/notifications/test-channels', { method: 'POST' });
      setNotificationTestResult(result);
    } catch (error) {
      setNotificationTestResult({ error: { status: 'failed', detail: error instanceof Error ? error.message : 'Não foi possível executar o teste.' } });
    } finally {
      setNotificationTestBusy(false);
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
        <button type="button" className={section === 'security' ? 'active' : ''} onClick={() => setSection('security')}><span>03</span><div><strong>Segurança</strong><small>Biometria e sessão</small></div></button>
        <button type="button" className={section === 'notifications' ? 'active' : ''} onClick={() => setSection('notifications')}><span>04</span><div><strong>Notificações</strong><small>E-mail, WhatsApp e Alexa</small></div></button>
        <button type="button" className={section === 'system' ? 'active' : ''} onClick={() => setSection('system')}><span>05</span><div><strong>Sistema</strong><small>Versão, dados e diagnóstico</small></div></button>
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
              {visibleAvatarPresets.map((preset) => {
                const preference: PhoenixAvatarPreference = { kind: 'preset', presetId: preset.id };
                const selected = avatar.kind === 'preset' && avatar.presetId === preset.id;
                return <button key={preset.id} type="button" className={selected ? 'selected' : ''} onClick={() => updateAvatar(preference)}><PhoenixProfileAvatar name={data.user.name} preference={preference} /><span>{preset.label}</span>{selected ? <b>✓</b> : null}</button>;
              })}
            </div>
            <div className="px-avatar-presets-actions"><button type="button" onClick={() => setAvatarsExpanded((value) => !value)}>{avatarsExpanded ? 'Recolher avatares' : `Ver todos (${phoenixAvatarPresets.length})`}</button></div>
            {avatarError ? <div className="px-settings-avatar-error">{avatarError}</div> : null}
            <p className="px-settings-profile-note">O avatar é individual por usuário. A escolha fica neste aparelho e também é sincronizada na base do MEG para acompanhar o mesmo usuário em outros dispositivos.</p>
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
          <article className="px-card px-settings-card"><div className="px-settings-card-head"><div><span className="px-kicker">Segurança</span><h2>Biometria neste aparelho</h2><p>Fechar o MEG não remove a biometria. Sair da conta continua sendo uma ação diferente.</p></div><button type="button" onClick={() => { void refreshBiometricStatus(); }} disabled={biometricBusy || import.meta.env.VITE_MOBILE_APP !== 'true'}>{biometricBusy ? 'Verificando…' : 'Atualizar status'}</button></div><div className="px-settings-status-list"><span>Ambiente · {import.meta.env.VITE_MOBILE_APP === 'true' ? 'Aplicativo Android' : 'Navegador Web'}</span><span>Biometria · {biometricStatus?.enabled ? 'Ativada e pronta para o próximo acesso' : biometricStatus?.available ? 'Disponível, ainda não ativada para esta conta' : import.meta.env.VITE_MOBILE_APP === 'true' ? 'Indisponível neste aparelho' : 'Gerenciada apenas no aplicativo Android'}</span><span>Credencial · {biometricStatus?.email || (biometricStatus?.enabled ? data.user.email : 'Nenhuma credencial biométrica salva')}</span></div></article>
          <article className="px-card px-settings-card"><div className="px-settings-card-head"><div><span className="px-kicker">Acesso</span><h2>Conta e sessão</h2><p>Seu perfil define o que pode ser feito na base financeira compartilhada.</p></div></div><dl><div><dt>Usuário</dt><dd>{data.user.name}</dd></div><div><dt>Perfil</dt><dd>{data.user.role}</dd></div><div><dt>Status</dt><dd>{data.user.status}</dd></div></dl><div className="px-settings-control-row"><div><strong>Recuperação de acesso</strong><small>Disponível na tela de login.</small></div><span className="px-settings-value">Ativa</span></div>{onLogoutRequest ? <div className="px-settings-control-row px-settings-exit-row"><div><strong>Sair da conta</strong><small>Encerra a sessão e remove a credencial biométrica deste aparelho para permitir troca de usuário.</small></div><button type="button" onClick={onLogoutRequest}>Sair da conta</button></div> : null}</article>
        </section> : null}

        {section === 'notifications' ? <>
          <section className="px-card px-settings-card"><div className="px-settings-card-head"><div><span className="px-kicker">Notificações</span><h2>Canais do MEG</h2><p>Status real das integrações. Nenhuma chave ou segredo é exibido nesta tela.</p></div></div>{data.user.role !== 'ADMIN' ? <p>O administrador da base controla integrações e agendas de envio.</p> : <><div className="px-settings-channel-grid"><article><strong>E-mail</strong><span>{notificationStatus?.email?.configured ? 'Configurado' : 'Não configurado'}</span><small>{notificationStatus?.email?.provider ? `Provedor: ${notificationStatus.email.provider}` : 'Provedor não informado'}</small></article><article><strong>WhatsApp</strong><span>{notificationStatus?.whatsapp?.configured ? 'Configurado' : 'Não configurado'}</span><small>{notificationStatus?.whatsapp?.defaultRecipient ? `Destino padrão: ${notificationStatus.whatsapp.defaultRecipient}` : 'Sem destino padrão'}</small></article><article><strong>Alexa</strong><span>{notificationStatus?.alexa?.configured ? 'Configurada' : 'Não configurada'}</span><small>{notificationStatus?.alexa?.schedule || 'Agenda não informada'}</small></article><article><strong>Android</strong><span>{localNotificationStatus?.native ? localNotificationStatus.permission === 'granted' ? 'Permitido' : 'Permissão necessária' : 'Somente no aplicativo'}</span><small>{localNotificationStatus?.native ? `${localNotificationStatus.scheduled} alerta(s) agendado(s) neste aparelho` : 'Abra esta tela no Android para diagnosticar'}</small></article><article><strong>Automação</strong><span>{notificationStatus?.automation?.configured ? 'Ativa' : 'Não configurada'}</span><small>{notificationStatus?.automation?.schedule || 'Agenda não informada'}</small></article></div><div className="px-settings-notification-test"><button type="button" onClick={() => { void testNotificationChannels(); }} disabled={notificationTestBusy}>{notificationTestBusy ? 'Testando canais…' : 'Testar canais agora'}</button><small>Dispara um teste real pelos provedores configurados. Nenhuma credencial é exibida.</small>{notificationTestResult ? <div className="px-settings-test-results">{['email','whatsapp','alexa'].map((channel) => { const item = notificationTestResult[channel]; return <span key={channel} className={item?.status === 'sent' ? 'ok' : 'warn'}><strong>{channel === 'email' ? 'E-mail' : channel === 'whatsapp' ? 'WhatsApp' : 'Alexa'}</strong><b>{item?.status === 'sent' ? 'Enviado' : item?.status === 'failed' ? 'Falhou' : 'Não enviado'}</b></span>; })}</div> : null}</div></>}</section>
          {data.user.role === 'ADMIN' ? <section className="px-settings-grid"><article className="px-card px-settings-card"><div className="px-settings-card-head"><div><span className="px-kicker">Entrega</span><h2>Últimas 24 horas</h2></div></div><dl><div><dt>Enviadas</dt><dd>{deliverySummary?.sentLast24Hours ?? '—'}</dd></div><div><dt>Falhas</dt><dd>{deliverySummary?.failedLast24Hours ?? '—'}</dd></div><div><dt>Último sucesso</dt><dd>{deliverySummary?.lastSuccessAt ? new Date(deliverySummary.lastSuccessAt).toLocaleString('pt-BR') : 'Não informado'}</dd></div><div><dt>Última falha</dt><dd>{deliverySummary?.lastFailureAt ? new Date(deliverySummary.lastFailureAt).toLocaleString('pt-BR') : 'Nenhuma registrada'}</dd></div><div><dt>Watchdog</dt><dd>{deliverySummary?.watchdog?.status === 'attention' ? 'Requer atenção' : deliverySummary?.watchdog?.status === 'processing' ? 'Processando' : deliverySummary?.watchdog?.status === 'waiting' ? 'Aguardando próxima janela' : deliverySummary?.watchdog?.lastCheckAt ? 'Ativo' : 'Aguardando primeiro ciclo'}</dd></div><div><dt>Último ciclo registrado</dt><dd>{deliverySummary?.watchdog?.lastCheckAt ? new Date(deliverySummary.watchdog.lastCheckAt).toLocaleString('pt-BR') : 'Ainda não executado'}</dd></div><div><dt>Ciclos esperados</dt><dd>{deliverySummary?.watchdog?.expected?.length ? deliverySummary.watchdog.expected.map((item) => `${item.slot}: ${item.state === 'ok' ? 'OK' : item.state || '—'}`).join(' · ') : 'Nenhum ciclo vencido nesta janela'}</dd></div></dl></article><article className="px-card px-settings-card"><div className="px-settings-card-head"><div><span className="px-kicker">Agenda</span><h2>Horários atuais</h2><p>Os horários abaixo vêm da configuração ativa do servidor.</p></div></div><div className="px-settings-status-list"><span>Alertas · {notificationStatus?.automation?.schedule || 'Não informado'}</span><span>Alexa · {notificationStatus?.alexa?.schedule || 'Não informado'}</span></div><p className="px-settings-note">A próxima etapa desta tela será permitir editar essas agendas e o período silencioso sem expor credenciais.</p></article></section> : null}
        </> : null}

        {section === 'system' ? <>
          <section className="px-card px-settings-health-banner"><div className="px-settings-health-copy"><span className="px-settings-health-icon" aria-hidden="true">{normalizationOk ? '✓' : '!'}</span><div><span className="px-kicker">Saúde do sistema</span><h2>{normalizationOk ? 'Sistema funcionando normalmente' : 'Sistema requer verificação'}</h2><p>Status construído apenas com indicadores reais expostos pela API.</p></div></div><div className="px-settings-health-chips"><span>API · {stateLabel(data.health.status)}</span><span>Banco · {data.normalization.primary ? 'Primário' : 'Verificar'}</span><span>Normalização · {normalizationOk ? 'OK' : 'Pendente'}</span><span>Modo · {data.normalization.mode || '—'}</span></div></section>
          <section className="px-settings-grid">
            <article className="px-card px-settings-card"><div className="px-settings-card-head"><div><span className="px-kicker">Sincronização</span><h2>Integridade da base</h2></div></div><div className={`px-settings-sync-banner ${normalizationOk ? 'ok' : 'warn'}`}><strong>{normalizationOk ? 'Tudo reconciliado' : 'Verificação necessária'}</strong><small>{data.normalization.updatedAt ? `Atualização: ${new Date(data.normalization.updatedAt).toLocaleString('pt-BR')}` : 'Horário de atualização não informado'}</small></div><dl><div><dt>Base primária</dt><dd>{data.normalization.primary ? 'Sim' : 'Não'}</dd></div><div><dt>Revisão</dt><dd>{data.normalization.revision}</dd></div><div><dt>Eventos normalizados</dt><dd>{data.normalization.normalized?.count ?? '—'}</dd></div></dl></article>
            <article className="px-card px-settings-card"><div className="px-settings-card-head"><div><span className="px-kicker">Backup e dados</span><h2>Proteção da base</h2></div></div><p>A restauração continua bloqueada para impedir mutações durante a homologação.</p><button type="button" disabled>Restaurar backup</button><small className="px-settings-note">Bloqueado propositalmente até o gate de escrita.</small></article>
            <article className="px-card px-settings-card px-settings-devices"><div className="px-settings-card-head"><div><span className="px-kicker">Dispositivos e sessões</span><h2>{data.user.role === 'ADMIN' ? 'Acessos ao MEG' : 'Meus aparelhos'}</h2><p>{data.user.role === 'ADMIN' ? 'Sessões registradas para os usuários deste workspace.' : 'Aparelhos usados pela sua conta.'}</p></div><button type="button" onClick={() => { void refreshDeviceSessions(); }} disabled={deviceSessionsBusy}>{deviceSessionsBusy ? 'Atualizando…' : 'Atualizar'}</button></div><div className="px-settings-device-list">{deviceSessions.length ? deviceSessions.map((session) => <div className="px-settings-device-row" key={session.id}><div><strong>{session.deviceName}</strong><small>{data.user.role === 'ADMIN' ? session.userName + ' · ' : ''}{session.platform} · {session.active ? 'Sessão ativa' : 'Sessão encerrada'}</small></div><span><b>{session.lastLoginAt ? new Date(session.lastLoginAt).toLocaleString('pt-BR') : new Date(session.createdAt).toLocaleString('pt-BR')}</b><small>Último login</small></span></div>) : <p>Nenhuma sessão registrada.</p>}</div><small className="px-settings-note">A identificação automática depende das informações fornecidas pelo aparelho. A base financeira permanece única entre Web e Android.</small></article>
            <article className="px-card px-settings-card"><div className="px-settings-card-head"><div><span className="px-kicker">Diagnóstico</span><h2>Reparo e normalização</h2></div><button type="button" disabled={normalizationPreviewBusy} onClick={() => { void inspectNormalization(); }}>{normalizationPreviewBusy ? 'Comparando…' : 'Comparar fontes'}</button></div><dl><div><dt>Reparo</dt><dd>{repair ? stateLabel(repair.status) : 'Não informado'}</dd></div><div><dt>Itens verificados</dt><dd>{repair?.scanned ?? '—'}</dd></div><div><dt>Itens reparados</dt><dd>{repair?.repaired ?? '—'}</dd></div><div><dt>Ocorrências</dt><dd>{repair?.issues ?? '—'}</dd></div><div><dt>Normalização API</dt><dd>{healthNormalization ? stateLabel(healthNormalization.status) : 'Não informado'}</dd></div></dl>{normalizationPreview ? <div className={`px-settings-sync-banner ${normalizationPreview.reconciled ? 'ok' : 'warn'}`}><strong>{normalizationPreview.reconciled ? 'Fontes reconciliadas' : 'Divergência confirmada em modo somente leitura'}</strong><small>AppState: {normalizationPreview.source.validCount} válidos · Normalizada: {normalizationPreview.normalized.count} · Inválidos na origem: {normalizationPreview.source.invalidCount} · Revisão {normalizationPreview.revision}. Nenhum reparo foi executado por esta consulta.</small></div> : null}{normalizationPreviewError ? <div className="px-settings-sync-banner warn"><strong>Não foi possível concluir a comparação</strong><small>{normalizationPreviewError}</small></div> : null}</article>
            <article className="px-card px-settings-card"><div className="px-settings-card-head"><div><span className="px-kicker">Sobre</span><h2>MEG Finance System</h2></div></div><p>Meu Equilíbrio Gerencial · Phoenix V15.</p><dl><div><dt>Aplicativo</dt><dd>{appVersion}</dd></div><div><dt>Perfil de dados</dt><dd>Base oficial do workspace</dd></div><div><dt>Usuários</dt><dd>{data.sourcePolicy.users}</dd></div></dl><details className="px-settings-advanced"><summary>Diagnóstico avançado</summary><dl><div><dt>Modo</dt><dd>{data.sourcePolicy.mode}</dd></div><div><dt>Eventos</dt><dd>{data.sourcePolicy.events}</dd></div><div><dt>Revisão</dt><dd>{data.normalization.revision}</dd></div></dl></details></article>
          </section>
        </> : null}
      </div>
    </div>
  </section>;
}
