import { useEffect, useMemo, useRef, useState } from 'react';
import { authenticatedRequest } from '../../app/auth-client';
import type { PhoenixReadModel } from '../contracts';
import { exportPhoenixTransactionBackup, inspectPhoenixTransactionBackup, restorePhoenixTransactionBackup } from '../backup-restore-bridge';
import { megConfirm } from '../meg-confirm';
import {
  readPhoenixNormalizationPreview,
  reconcilePhoenixPrimaryMirror,
  type PhoenixNormalizationPreview,
} from '../normalization-reconcile-bridge';
import { getPhoenixLocalNotificationStatus, testPhoenixLocalNotification } from '../phoenix-native-notifications';
import { PhoenixNotificationRecipients } from './PhoenixNotificationRecipients';
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

type PhoenixSettingsProps = {
  data: PhoenixReadModel;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onDataCommitted: (snapshot: PhoenixReadModel) => void;
  onLogoutRequest?: () => void;
};

type SettingsSection = 'profile' | 'home' | 'security' | 'notifications' | 'system';

type BiometricStatus = { available: boolean; enabled: boolean; reason?: string | null; email?: string | null };
type NotificationStatus = {
  email?: { configured?: boolean; provider?: string; mode?: string; readyForAllUsers?: boolean; sender?: string };
  whatsapp?: { configured?: boolean; defaultRecipient?: string | null };
  alexa?: { configured?: boolean; announcementsConfigured?: boolean; skillConfigured?: boolean; enabled?: boolean; schedule?: string };
  automation?: { configured?: boolean; enabled?: boolean; schedule?: string; quietHours?: string };
};

type NotificationSchedule = {
  workspaceId?: string;
  automationEnabled: boolean;
  messagingMorningTime: string;
  messagingMiddayTime: string;
  messagingEveningTime: string;
  alexaAutomationEnabled: boolean;
  alexaWeekdayMorningTime: string;
  alexaWeekdayEveningTime: string;
  alexaWeekdayNightTime: string;
  alexaWeekendTime: string;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
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

export function PhoenixSettings({ data, theme, onToggleTheme, onDataCommitted, onLogoutRequest }: PhoenixSettingsProps) {
  const normalizationOk = Boolean(data.normalization.primary && data.normalization.reconciled);
  const repair = data.health.dataRepair;
  const healthNormalization = data.health.normalization;
  const fileRef = useRef<HTMLInputElement>(null);
  const backupFileRef = useRef<HTMLInputElement>(null);
  const [section, setSection] = useState<SettingsSection>('profile');
  const [avatar, setAvatar] = useState<PhoenixAvatarPreference>(() => readPhoenixAvatarPreference(data.user.id));
  const [avatarError, setAvatarError] = useState('');
  const [dashboardPreferences, setDashboardPreferences] = useState<DashboardPreferences>(() => readDashboardPreferences());
  const [avatarsExpanded, setAvatarsExpanded] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus | null>(null);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<NotificationStatus | null>(null);
  const [notificationSchedule, setNotificationSchedule] = useState<NotificationSchedule | null>(null);
  const [notificationScheduleBusy, setNotificationScheduleBusy] = useState(false);
  const [notificationScheduleMessage, setNotificationScheduleMessage] = useState('');
  const [notificationScheduleError, setNotificationScheduleError] = useState('');
  const [deliverySummary, setDeliverySummary] = useState<DeliverySummary | null>(null);
  const [normalizationPreview, setNormalizationPreview] = useState<PhoenixNormalizationPreview | null>(null);
  const [normalizationPreviewError, setNormalizationPreviewError] = useState('');
  const [normalizationPreviewBusy, setNormalizationPreviewBusy] = useState(false);
  const [normalizationRepairBusy, setNormalizationRepairBusy] = useState(false);
  const [normalizationRepairMessage, setNormalizationRepairMessage] = useState('');
  const [appVersion, setAppVersion] = useState<string>('Consultando…');
  const [deviceSessions, setDeviceSessions] = useState<DeviceSession[]>([]);
  const [deviceSessionsBusy, setDeviceSessionsBusy] = useState(false);
  const [sessionActionId, setSessionActionId] = useState('');
  const [sessionActionMessage, setSessionActionMessage] = useState('');
  const [sessionActionError, setSessionActionError] = useState('');
  const [notificationTestBusy, setNotificationTestBusy] = useState(false);
  const [notificationTestResult, setNotificationTestResult] = useState<Record<string, { status?: string; detail?: unknown }> | null>(null);
  const [localNotificationStatus, setLocalNotificationStatus] = useState<LocalNotificationStatus | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupMessage, setBackupMessage] = useState('');
  const [backupError, setBackupError] = useState('');
  const canRestoreBackup = data.user.role !== 'VIEWER';

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
      authenticatedRequest<{ summary?: DeliverySummary }>('/notifications/deliveries', { cache: 'no-store' }),
      authenticatedRequest<NotificationSchedule>('/notifications/schedule', { cache: 'no-store' })
    ]).then(([statusResult, deliveriesResult, scheduleResult]) => {
      if (!active) return;
      if (statusResult.status === 'fulfilled') setNotificationStatus(statusResult.value);
      if (deliveriesResult.status === 'fulfilled') setDeliverySummary(deliveriesResult.value.summary || null);
      if (scheduleResult.status === 'fulfilled') setNotificationSchedule(scheduleResult.value);
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


  async function revokeDeviceSession(session: DeviceSession) {
    if (!session.active || sessionActionId) return;
    const target = data.user.role === 'ADMIN' && session.userId !== data.user.id
      ? `${session.userName} · ${session.deviceName}`
      : session.deviceName;
    const confirmed = await megConfirm({
      kicker: 'Segurança da conta',
      title: 'Encerrar esta sessão?',
      message: `O acesso de ${target} (${session.platform}) será revogado. O aparelho precisará autenticar novamente quando tentar renovar o acesso.`,
      confirmLabel: 'Encerrar sessão',
      cancelLabel: 'Cancelar',
      danger: true,
    });
    if (!confirmed) return;

    setSessionActionId(session.id);
    setSessionActionMessage('');
    setSessionActionError('');
    try {
      await authenticatedRequest<{ revoked: boolean }>(`/auth/sessions/${encodeURIComponent(session.id)}`, { method: 'DELETE' });
      await refreshDeviceSessions();
      setSessionActionMessage(`Sessão de ${target} encerrada.`);
    } catch (cause) {
      const status = cause && typeof cause === 'object' && 'status' in cause
        ? Number((cause as { status?: unknown }).status)
        : 0;
      setSessionActionError(status === 404
        ? 'A sessão não está mais disponível ou não pertence à sua área de acesso.'
        : cause instanceof Error ? cause.message : 'Não foi possível encerrar a sessão.');
    } finally {
      setSessionActionId('');
    }
  }

  async function inspectNormalization() {
    if (normalizationPreviewBusy || normalizationRepairBusy) return;
    setNormalizationPreviewBusy(true);
    setNormalizationPreviewError('');
    setNormalizationRepairMessage('');
    try {
      const preview = await readPhoenixNormalizationPreview();
      setNormalizationPreview(preview);
    } catch (error) {
      setNormalizationPreviewError(error instanceof Error ? error.message : 'Não foi possível comparar as duas fontes.');
    } finally {
      setNormalizationPreviewBusy(false);
    }
  }

  async function repairNormalizationMirror() {
    if (!normalizationPreview || normalizationRepairBusy || normalizationPreview.reconciled) return;
    if (!normalizationPreview.primary) {
      setNormalizationPreviewError('A base normalizada ainda não é a fonte primária. Esta operação de reconciliação permanece bloqueada.');
      return;
    }

    const confirmed = await megConfirm({
      kicker: 'Integridade da base',
      title: 'Reconciliar o espelho do AppState?',
      message: `A base normalizada continuará sendo a fonte autoritativa. O MEG vai reconstruir apenas o espelho compatível do AppState usando ${normalizationPreview.normalized.count} evento(s) normalizado(s), na revisão ${normalizationPreview.revision}. Alterações concorrentes cancelam a operação automaticamente.`,
      confirmLabel: 'Reconciliar espelho',
      cancelLabel: 'Cancelar',
      danger: false,
    });
    if (!confirmed) return;

    setNormalizationRepairBusy(true);
    setNormalizationPreviewError('');
    setNormalizationRepairMessage('');
    try {
      const result = await reconcilePhoenixPrimaryMirror(normalizationPreview, data.month);
      if (result.status === 'error') {
        if (result.preview) setNormalizationPreview(result.preview);
        setNormalizationPreviewError(result.message);
        return;
      }

      setNormalizationPreview(result.preview);
      onDataCommitted(result.snapshot);
      const changed = result.repair.changed
        ? `Espelho atualizado na revisão ${result.repair.revision ?? result.preview.revision}.`
        : 'As fontes já estavam equivalentes no momento da gravação.';
      const details = [
        result.repair.refreshedEvents ? `${result.repair.refreshedEvents} origem(ns) atualizada(s)` : '',
        result.repair.removedLegacyIds ? `${result.repair.removedLegacyIds} espelho(s) obsoleto(s) removido(s)` : '',
      ].filter(Boolean).join(' · ');
      setNormalizationRepairMessage(`${changed}${details ? ` ${details}.` : ''} Conferência final concluída.`);
    } finally {
      setNormalizationRepairBusy(false);
    }
  }

  useEffect(() => {
    if (section === 'system' || section === 'security') void refreshDeviceSessions();
  }, [section]);

  async function saveNotificationScheduleSettings() {
    if (!notificationSchedule || notificationScheduleBusy) return;
    setNotificationScheduleBusy(true);
    setNotificationScheduleMessage('');
    setNotificationScheduleError('');
    try {
      const payload = {
        automationEnabled: notificationSchedule.automationEnabled,
        messagingMorningTime: notificationSchedule.messagingMorningTime,
        messagingMiddayTime: notificationSchedule.messagingMiddayTime,
        messagingEveningTime: notificationSchedule.messagingEveningTime,
        alexaAutomationEnabled: notificationSchedule.alexaAutomationEnabled,
        alexaWeekdayMorningTime: notificationSchedule.alexaWeekdayMorningTime,
        alexaWeekdayEveningTime: notificationSchedule.alexaWeekdayEveningTime,
        alexaWeekdayNightTime: notificationSchedule.alexaWeekdayNightTime,
        alexaWeekendTime: notificationSchedule.alexaWeekendTime,
        quietHoursEnabled: notificationSchedule.quietHoursEnabled,
        quietHoursStart: notificationSchedule.quietHoursStart,
        quietHoursEnd: notificationSchedule.quietHoursEnd,
      };
      const saved = await authenticatedRequest<{ settings: NotificationSchedule; updatedAt?: string }>('/notifications/schedule', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setNotificationSchedule({ ...saved.settings, workspaceId: notificationSchedule.workspaceId });
      const [status, deliveries] = await Promise.all([
        authenticatedRequest<NotificationStatus>('/notifications/status', { cache: 'no-store' }),
        authenticatedRequest<{ summary?: DeliverySummary }>('/notifications/deliveries', { cache: 'no-store' }),
      ]);
      setNotificationStatus(status);
      setDeliverySummary(deliveries.summary || null);
      setNotificationScheduleMessage('Agenda salva e aplicada ao watchdog deste workspace.');
    } catch (cause) {
      const raw = cause instanceof Error ? cause.message : '';
      const messages: Record<string, string> = {
        NOTIFICATION_TIME_OUTSIDE_AUTOMATION_WINDOW: 'Os horários automáticos precisam ficar entre 06:00 e 21:00.',
        MESSAGING_SCHEDULE_ORDER_INVALID: 'Os três horários de alertas devem ficar em ordem e separados por pelo menos 30 minutos.',
        ALEXA_SCHEDULE_ORDER_INVALID: 'Os horários da Alexa em dias úteis devem ficar em ordem e separados por pelo menos 30 minutos.',
        QUIET_HOURS_RANGE_INVALID: 'O início e o fim do período silencioso não podem ser iguais.',
      };
      const code = Object.keys(messages).find((item) => raw.includes(item));
      setNotificationScheduleError(code ? messages[code] : raw || 'Não foi possível salvar a agenda.');
    } finally {
      setNotificationScheduleBusy(false);
    }
  }

  async function testNotificationChannels() {
    setNotificationTestBusy(true);
    setNotificationTestResult(null);
    try {
      const [remote, android] = await Promise.allSettled([
        authenticatedRequest<Record<string, { status?: string; detail?: unknown }>>('/notifications/test-channels', { method: 'POST' }),
        testPhoenixLocalNotification(),
      ]);
      const result = remote.status === 'fulfilled'
        ? remote.value
        : { error: { status: 'failed', detail: remote.reason instanceof Error ? remote.reason.message : 'Não foi possível testar os canais remotos.' } };
      const androidResult = android.status === 'fulfilled'
        ? { status: android.value.status, detail: android.value.detail }
        : { status: 'failed', detail: android.reason instanceof Error ? android.reason.message : 'Não foi possível testar a notificação local.' };
      setNotificationTestResult({ ...result, android: androidResult });
    } catch (error) {
      setNotificationTestResult({ error: { status: 'failed', detail: error instanceof Error ? error.message : 'Não foi possível executar o teste.' } });
    } finally {
      setNotificationTestBusy(false);
    }
  }

  function toggleDashboardPreference(key: keyof DashboardPreferences) {
    setDashboardPreferences((current) => ({ ...current, [key]: !current[key] }));
  }


  async function exportBackup() {
    if (backupBusy) return;
    setBackupBusy(true);
    setBackupError('');
    setBackupMessage('');
    try {
      const result = await exportPhoenixTransactionBackup();
      setBackupMessage(`Backup criado com ${result.count} lançamento(s) compatível(is), revisão ${result.revision}.`);
    } catch (cause) {
      setBackupError(cause instanceof Error ? cause.message : 'Não foi possível gerar o backup.');
    } finally {
      setBackupBusy(false);
    }
  }

  async function importBackup(file?: File) {
    if (!file) return;
    if (!canRestoreBackup) {
      setBackupError('Seu perfil possui acesso somente para consulta e não pode restaurar backups.');
      if (backupFileRef.current) backupFileRef.current.value = '';
      return;
    }

    setBackupBusy(true);
    setBackupError('');
    setBackupMessage('');
    try {
      const prepared = await inspectPhoenixTransactionBackup(file);
      const exportedAt = prepared.backup.exportedAt
        ? new Date(prepared.backup.exportedAt).toLocaleString('pt-BR')
        : 'data não informada';
      const confirmed = await megConfirm({
        kicker: 'Backup de lançamentos',
        title: 'Restaurar lançamentos compatíveis?',
        message: `O arquivo contém ${prepared.backup.transactions.length} lançamento(s) e foi gerado em ${exportedAt}. A base atual possui ${prepared.currentCount}. A restauração substitui somente os lançamentos compatíveis do AppState; transferências nativas, cartões, recebíveis, cadastros e demais domínios não são apagados. Se a base mudar antes da gravação, a operação será cancelada.`,
        confirmLabel: 'Sim, restaurar',
        cancelLabel: 'Cancelar',
        danger: true,
      });
      if (!confirmed) return;

      const result = await restorePhoenixTransactionBackup(prepared, data.month);
      if (result.status === 'error') {
        setBackupError(result.message);
        return;
      }

      onDataCommitted(result.snapshot);
      setBackupMessage(`Backup restaurado e conferido na revisão ${result.revision}. ${result.restoredCount} lançamento(s) compatível(is) ativos.`);
    } catch (cause) {
      setBackupError(cause instanceof Error ? cause.message : 'Não foi possível restaurar o backup.');
    } finally {
      setBackupBusy(false);
      if (backupFileRef.current) backupFileRef.current.value = '';
    }
  }

  return <section className="px-screen px-settings-screen">
    <header className="px-screen-head"><div><span className="px-kicker">Configurações</span><h1>Seu MEG, do seu jeito</h1><p>Perfil, aparência, segurança e saúde do sistema organizados no padrão V15.</p></div><div className="px-screen-head-aside"><span className={`px-settings-health ${normalizationOk ? 'ok' : 'warn'}`}>{normalizationOk ? 'Sistema operacional' : 'Verificar integridade'}</span></div></header>

    <div className="px-settings-v15-layout">
      <nav className="px-settings-nav" aria-label="Seções das configurações">
        <button type="button" className={section === 'profile' ? 'active' : ''} onClick={() => setSection('profile')}><span>01</span><div><strong>Meu perfil</strong><small>Foto, avatar e identidade</small></div></button>
        <button type="button" className={section === 'home' ? 'active' : ''} onClick={() => setSection('home')}><span>02</span><div><strong>Aparência e Home</strong><small>Tema e dashboard</small></div></button>
        <button type="button" className={section === 'security' ? 'active' : ''} onClick={() => setSection('security')}><span>03</span><div><strong>Segurança</strong><small>Biometria e sessão</small></div></button>
        <button type="button" className={section === 'notifications' ? 'active' : ''} onClick={() => setSection('notifications')}><span>04</span><div><strong>Notificações</strong><small>E-mail, WhatsApp, Android e Alexa</small></div></button>
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
          <section className="px-card px-settings-card"><div className="px-settings-card-head"><div><span className="px-kicker">Notificações</span><h2>Canais do MEG</h2><p>Status real das integrações. Nenhuma chave ou segredo é exibido nesta tela.</p></div></div>{data.user.role !== 'ADMIN' ? <p>O administrador da base controla integrações e agendas de envio.</p> : <><div className="px-settings-channel-grid"><article><strong>E-mail</strong><span>{notificationStatus?.email?.configured ? 'Configurado' : 'Não configurado'}</span><small>{notificationStatus?.email?.provider ? `Provedor: ${notificationStatus.email.provider}` : 'Provedor não informado'}</small></article><article><strong>WhatsApp</strong><span>{notificationStatus?.whatsapp?.configured ? 'Configurado' : 'Não configurado'}</span><small>{notificationStatus?.whatsapp?.defaultRecipient ? `Destino padrão: ${notificationStatus.whatsapp.defaultRecipient}` : 'Sem destino padrão'}</small></article><article><strong>Alexa</strong><span>{notificationStatus?.alexa?.configured ? 'Configurada' : 'Não configurada'}</span><small>{notificationStatus?.alexa?.schedule || 'Agenda não informada'}</small></article><article><strong>Android</strong><span>{localNotificationStatus?.native ? localNotificationStatus.permission === 'granted' ? 'Permitido' : 'Permissão necessária' : 'Somente no aplicativo'}</span><small>{localNotificationStatus?.native ? `${localNotificationStatus.scheduled} alerta(s) agendado(s) neste aparelho` : 'Abra esta tela no Android para diagnosticar'}</small></article><article><strong>Automação</strong><span>{notificationStatus?.automation?.configured ? 'Ativa' : 'Não configurada'}</span><small>{notificationStatus?.automation?.schedule || 'Agenda não informada'}</small></article></div><div className="px-settings-notification-test"><button type="button" onClick={() => { void testNotificationChannels(); }} disabled={notificationTestBusy}>{notificationTestBusy ? 'Testando canais…' : 'Testar canais agora'}</button><small>Dispara um teste real de e-mail, WhatsApp e Alexa. No aplicativo Android, também agenda um aviso local para aparecer em alguns segundos.</small>{notificationTestResult ? <div className="px-settings-test-results">{['email','whatsapp','alexa','android'].map((channel) => { const item = notificationTestResult[channel]; return <span key={channel} className={item?.status === 'sent' ? 'ok' : 'warn'}><strong>{channel === 'email' ? 'E-mail' : channel === 'whatsapp' ? 'WhatsApp' : channel === 'android' ? 'Android' : 'Alexa'}</strong><b>{item?.status === 'sent' ? channel === 'android' ? 'Agendado' : 'Enviado' : item?.status === 'failed' ? 'Falhou' : 'Não enviado'}</b></span>; })}</div> : null}</div></>}</section>
          {data.user.role === 'ADMIN' ? <PhoenixNotificationRecipients /> : null}
          {data.user.role === 'ADMIN' ? <section className="px-settings-grid"><article className="px-card px-settings-card"><div className="px-settings-card-head"><div><span className="px-kicker">Entrega</span><h2>Últimas 24 horas</h2></div></div><dl><div><dt>Enviadas</dt><dd>{deliverySummary?.sentLast24Hours ?? '—'}</dd></div><div><dt>Falhas</dt><dd>{deliverySummary?.failedLast24Hours ?? '—'}</dd></div><div><dt>Último sucesso</dt><dd>{deliverySummary?.lastSuccessAt ? new Date(deliverySummary.lastSuccessAt).toLocaleString('pt-BR') : 'Não informado'}</dd></div><div><dt>Última falha</dt><dd>{deliverySummary?.lastFailureAt ? new Date(deliverySummary.lastFailureAt).toLocaleString('pt-BR') : 'Nenhuma registrada'}</dd></div><div><dt>Watchdog</dt><dd>{deliverySummary?.watchdog?.status === 'attention' ? 'Requer atenção' : deliverySummary?.watchdog?.status === 'processing' ? 'Processando' : deliverySummary?.watchdog?.status === 'waiting' ? 'Aguardando próxima janela' : deliverySummary?.watchdog?.lastCheckAt ? 'Ativo' : 'Aguardando primeiro ciclo'}</dd></div><div><dt>Último ciclo registrado</dt><dd>{deliverySummary?.watchdog?.lastCheckAt ? new Date(deliverySummary.watchdog.lastCheckAt).toLocaleString('pt-BR') : 'Ainda não executado'}</dd></div><div><dt>Ciclos esperados</dt><dd>{deliverySummary?.watchdog?.expected?.length ? deliverySummary.watchdog.expected.map((item) => `${item.slot}: ${item.state === 'ok' ? 'OK' : item.state || '—'}`).join(' · ') : 'Nenhum ciclo vencido nesta janela'}</dd></div></dl></article><article className="px-card px-settings-card px-settings-schedule-card"><div className="px-settings-card-head"><div><span className="px-kicker">Agenda</span><h2>Horários automáticos</h2><p>Configuração real deste workspace, sempre no fuso America/Sao_Paulo.</p></div><button type="button" disabled={!notificationSchedule || notificationScheduleBusy} onClick={() => { void saveNotificationScheduleSettings(); }}>{notificationScheduleBusy ? 'Salvando…' : 'Salvar agenda'}</button></div>{notificationSchedule ? <><div className="px-settings-schedule-section"><div className="px-settings-schedule-title"><div><strong>Alertas financeiros</strong><small>Resumo da manhã e lembretes de vencimento.</small></div><button type="button" className={notificationSchedule.automationEnabled ? 'is-on' : ''} aria-pressed={notificationSchedule.automationEnabled} onClick={() => setNotificationSchedule((current) => current ? { ...current, automationEnabled: !current.automationEnabled } : current)}>{notificationSchedule.automationEnabled ? 'Ativos' : 'Pausados'}</button></div><div className="px-settings-time-grid"><label><span>Manhã</span><input type="time" min="06:00" max="21:00" value={notificationSchedule.messagingMorningTime} onChange={(event) => setNotificationSchedule((current) => current ? { ...current, messagingMorningTime: event.target.value } : current)} /></label><label><span>Meio do dia</span><input type="time" min="06:00" max="21:00" value={notificationSchedule.messagingMiddayTime} onChange={(event) => setNotificationSchedule((current) => current ? { ...current, messagingMiddayTime: event.target.value } : current)} /></label><label><span>Noite</span><input type="time" min="06:00" max="21:00" value={notificationSchedule.messagingEveningTime} onChange={(event) => setNotificationSchedule((current) => current ? { ...current, messagingEveningTime: event.target.value } : current)} /></label></div></div><div className="px-settings-schedule-section"><div className="px-settings-schedule-title"><div><strong>Alexa</strong><small>Briefing e lembretes falados.</small></div><button type="button" className={notificationSchedule.alexaAutomationEnabled ? 'is-on' : ''} aria-pressed={notificationSchedule.alexaAutomationEnabled} onClick={() => setNotificationSchedule((current) => current ? { ...current, alexaAutomationEnabled: !current.alexaAutomationEnabled } : current)}>{notificationSchedule.alexaAutomationEnabled ? 'Ativa' : 'Pausada'}</button></div><div className="px-settings-time-grid four"><label><span>Útil · manhã</span><input type="time" min="06:00" max="21:00" value={notificationSchedule.alexaWeekdayMorningTime} onChange={(event) => setNotificationSchedule((current) => current ? { ...current, alexaWeekdayMorningTime: event.target.value } : current)} /></label><label><span>Útil · tarde</span><input type="time" min="06:00" max="21:00" value={notificationSchedule.alexaWeekdayEveningTime} onChange={(event) => setNotificationSchedule((current) => current ? { ...current, alexaWeekdayEveningTime: event.target.value } : current)} /></label><label><span>Útil · noite</span><input type="time" min="06:00" max="21:00" value={notificationSchedule.alexaWeekdayNightTime} onChange={(event) => setNotificationSchedule((current) => current ? { ...current, alexaWeekdayNightTime: event.target.value } : current)} /></label><label><span>Fim de semana</span><input type="time" min="06:00" max="21:00" value={notificationSchedule.alexaWeekendTime} onChange={(event) => setNotificationSchedule((current) => current ? { ...current, alexaWeekendTime: event.target.value } : current)} /></label></div></div><div className="px-settings-schedule-section"><div className="px-settings-schedule-title"><div><strong>Período silencioso</strong><small>Bloqueia ciclos automáticos dentro desta janela.</small></div><button type="button" className={notificationSchedule.quietHoursEnabled ? 'is-on' : ''} aria-pressed={notificationSchedule.quietHoursEnabled} onClick={() => setNotificationSchedule((current) => current ? { ...current, quietHoursEnabled: !current.quietHoursEnabled } : current)}>{notificationSchedule.quietHoursEnabled ? 'Ativo' : 'Desativado'}</button></div><div className="px-settings-time-grid two"><label><span>Início</span><input type="time" value={notificationSchedule.quietHoursStart} onChange={(event) => setNotificationSchedule((current) => current ? { ...current, quietHoursStart: event.target.value } : current)} /></label><label><span>Fim</span><input type="time" value={notificationSchedule.quietHoursEnd} onChange={(event) => setNotificationSchedule((current) => current ? { ...current, quietHoursEnd: event.target.value } : current)} /></label></div></div>{notificationScheduleMessage ? <div className="px-settings-sync-banner ok"><strong>Agenda atualizada</strong><small>{notificationScheduleMessage}</small></div> : null}{notificationScheduleError ? <div className="px-settings-sync-banner warn"><strong>Agenda não salva</strong><small>{notificationScheduleError}</small></div> : null}<div className="px-settings-status-list"><span>Alertas · {notificationStatus?.automation?.schedule || 'Não informado'}</span><span>Alexa · {notificationStatus?.alexa?.schedule || 'Não informado'}</span><span>Silêncio · {notificationStatus?.automation?.quietHours || 'Não informado'}</span></div></> : <p className="px-settings-note">Carregando agenda do workspace…</p>}</article></section> : null}
        </> : null}

        {section === 'system' ? <>
          <section className="px-card px-settings-health-banner"><div className="px-settings-health-copy"><span className="px-settings-health-icon" aria-hidden="true">{normalizationOk ? '✓' : '!'}</span><div><span className="px-kicker">Saúde do sistema</span><h2>{normalizationOk ? 'Sistema funcionando normalmente' : 'Sistema requer verificação'}</h2><p>Status construído apenas com indicadores reais expostos pela API.</p></div></div><div className="px-settings-health-chips"><span>API · {stateLabel(data.health.status)}</span><span>Banco · {data.normalization.primary ? 'Primário' : 'Verificar'}</span><span>Normalização · {normalizationOk ? 'OK' : 'Pendente'}</span><span>Modo · {data.normalization.mode || '—'}</span></div></section>
          <section className="px-settings-grid">
            <article className="px-card px-settings-card"><div className="px-settings-card-head"><div><span className="px-kicker">Sincronização</span><h2>Integridade da base</h2></div></div><div className={`px-settings-sync-banner ${normalizationOk ? 'ok' : 'warn'}`}><strong>{normalizationOk ? 'Tudo reconciliado' : 'Verificação necessária'}</strong><small>{data.normalization.updatedAt ? `Atualização: ${new Date(data.normalization.updatedAt).toLocaleString('pt-BR')}` : 'Horário de atualização não informado'}</small></div><dl><div><dt>Base primária</dt><dd>{data.normalization.primary ? 'Sim' : 'Não'}</dd></div><div><dt>Revisão</dt><dd>{data.normalization.revision}</dd></div><div><dt>Eventos normalizados</dt><dd>{data.normalization.normalized?.count ?? '—'}</dd></div></dl></article>
            <article className="px-card px-settings-card"><div className="px-settings-card-head"><div><span className="px-kicker">Backup e dados</span><h2>Proteção dos lançamentos</h2><p>Exporte ou restaure os lançamentos compatíveis com o AppState. Os domínios nativos do MEG continuam preservados na base oficial.</p></div></div><input ref={backupFileRef} type="file" accept="application/json" hidden onChange={(event) => { void importBackup(event.target.files?.[0]); }} /><div className="px-settings-actions"><button type="button" disabled={backupBusy} onClick={() => { void exportBackup(); }}>{backupBusy ? 'Aguarde…' : 'Exportar backup'}</button><button type="button" disabled={backupBusy || !canRestoreBackup} onClick={() => backupFileRef.current?.click()}>Restaurar backup</button></div>{backupMessage ? <div className="px-settings-sync-banner ok"><strong>Backup confirmado</strong><small>{backupMessage}</small></div> : null}{backupError ? <div className="px-settings-sync-banner warn"><strong>Operação não concluída</strong><small>{backupError}</small></div> : null}<small className="px-settings-note">{canRestoreBackup ? 'A restauração exige confirmação explícita, revisão exata da base e conferência final antes de informar sucesso.' : 'Seu perfil pode exportar backups, mas não possui permissão para restaurar lançamentos.'}</small></article>
            <article className="px-card px-settings-card px-settings-devices"><div className="px-settings-card-head"><div><span className="px-kicker">Dispositivos e sessões</span><h2>{data.user.role === 'ADMIN' ? 'Acessos ao MEG' : 'Meus aparelhos'}</h2><p>{data.user.role === 'ADMIN' ? 'Sessões registradas para os usuários deste workspace.' : 'Aparelhos usados pela sua conta.'}</p></div><button type="button" onClick={() => { void refreshDeviceSessions(); }} disabled={deviceSessionsBusy || Boolean(sessionActionId)}>{deviceSessionsBusy ? 'Atualizando…' : 'Atualizar'}</button></div>{sessionActionMessage ? <div className="px-settings-sync-banner ok"><strong>Sessão encerrada</strong><small>{sessionActionMessage}</small></div> : null}{sessionActionError ? <div className="px-settings-sync-banner warn"><strong>Não foi possível encerrar</strong><small>{sessionActionError}</small></div> : null}<div className="px-settings-device-list">{deviceSessions.length ? deviceSessions.map((session) => <div className="px-settings-device-row" key={session.id}><div><strong>{session.deviceName}</strong><small>{data.user.role === 'ADMIN' ? session.userName + ' · ' : ''}{session.platform} · {session.active ? 'Sessão ativa' : 'Sessão encerrada'}</small></div><span><b>{session.lastLoginAt ? new Date(session.lastLoginAt).toLocaleString('pt-BR') : new Date(session.createdAt).toLocaleString('pt-BR')}</b><small>Último login</small></span><div className="px-settings-device-actions">{session.active ? <button className="danger" type="button" disabled={Boolean(sessionActionId) || deviceSessionsBusy} onClick={() => { void revokeDeviceSession(session); }}>{sessionActionId === session.id ? 'Encerrando…' : 'Encerrar sessão'}</button> : <span className="px-status archived">Encerrada</span>}</div></div>) : <p>Nenhuma sessão registrada.</p>}</div><small className="px-settings-note">Encerrar uma sessão revoga a renovação daquele acesso. A identificação automática depende das informações fornecidas pelo aparelho.</small></article>
            <article className="px-card px-settings-card"><div className="px-settings-card-head"><div><span className="px-kicker">Diagnóstico</span><h2>Reparo e normalização</h2></div><button type="button" disabled={normalizationPreviewBusy || normalizationRepairBusy} onClick={() => { void inspectNormalization(); }}>{normalizationPreviewBusy ? 'Comparando…' : 'Comparar fontes'}</button></div><dl><div><dt>Reparo</dt><dd>{repair ? stateLabel(repair.status) : 'Não informado'}</dd></div><div><dt>Itens verificados</dt><dd>{repair?.scanned ?? '—'}</dd></div><div><dt>Itens reparados</dt><dd>{repair?.repaired ?? '—'}</dd></div><div><dt>Ocorrências</dt><dd>{repair?.issues ?? '—'}</dd></div><div><dt>Normalização API</dt><dd>{healthNormalization ? stateLabel(healthNormalization.status) : 'Não informado'}</dd></div></dl>{normalizationPreview ? <div className={`px-settings-sync-banner ${normalizationPreview.reconciled ? 'ok' : 'warn'}`}><strong>{normalizationPreview.reconciled ? 'Fontes reconciliadas' : normalizationPreview.primary ? 'Divergência confirmada' : 'Divergência em modo protegido'}</strong><small>AppState: {normalizationPreview.source.validCount} válidos · Normalizada: {normalizationPreview.normalized.count} · Inválidos na origem: {normalizationPreview.source.invalidCount} · Revisão {normalizationPreview.revision} · Fonte primária: {normalizationPreview.primary ? 'base normalizada' : 'AppState'}.</small>{!normalizationPreview.reconciled && normalizationPreview.primary ? <button className="px-settings-repair-action" type="button" disabled={normalizationRepairBusy || normalizationPreviewBusy} onClick={() => { void repairNormalizationMirror(); }}>{normalizationRepairBusy ? 'Reconciliando…' : 'Reconciliar espelho'}</button> : null}{!normalizationPreview.reconciled && !normalizationPreview.primary ? <small>O reparo automático permanece bloqueado porque a base normalizada ainda não é a fonte autoritativa.</small> : null}</div> : null}{normalizationRepairMessage ? <div className="px-settings-sync-banner ok"><strong>Reconciliação concluída</strong><small>{normalizationRepairMessage}</small></div> : null}{normalizationPreviewError ? <div className="px-settings-sync-banner warn"><strong>Operação não concluída</strong><small>{normalizationPreviewError}</small></div> : null}</article>
            <article className="px-card px-settings-card"><div className="px-settings-card-head"><div><span className="px-kicker">Sobre</span><h2>MEG Finance System</h2></div></div><p>Meu Equilíbrio Gerencial · Phoenix V15.</p><dl><div><dt>Aplicativo</dt><dd>{appVersion}</dd></div><div><dt>Perfil de dados</dt><dd>Base oficial do workspace</dd></div><div><dt>Usuários</dt><dd>{data.sourcePolicy.users}</dd></div></dl><details className="px-settings-advanced"><summary>Diagnóstico avançado</summary><dl><div><dt>Modo</dt><dd>{data.sourcePolicy.mode}</dd></div><div><dt>Eventos</dt><dd>{data.sourcePolicy.events}</dd></div><div><dt>Revisão</dt><dd>{data.normalization.revision}</dd></div></dl></details></article>
          </section>
        </> : null}
      </div>
    </div>
  </section>;
}
