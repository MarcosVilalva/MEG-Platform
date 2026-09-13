import { useEffect, useState } from 'react';
import type { PhoenixReadModel } from '../contracts';
import '../phoenix-settings.css';

type PhoenixSettingsProps = {
  data: PhoenixReadModel;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
};

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
  const [dashboardPreferences, setDashboardPreferences] = useState<DashboardPreferences>(() => readDashboardPreferences());

  useEffect(() => {
    applyDashboardPreferences(dashboardPreferences);
    try { localStorage.setItem(DASHBOARD_PREFS_KEY, JSON.stringify(dashboardPreferences)); } catch { /* preferência local opcional */ }
  }, [dashboardPreferences]);

  function toggleDashboardPreference(key: keyof DashboardPreferences) {
    setDashboardPreferences((current) => ({ ...current, [key]: !current[key] }));
  }

  function restoreDashboard() {
    setDashboardPreferences(defaultDashboardPreferences);
  }

  return <section className="px-screen px-settings-screen">
    <header className="px-screen-head"><div><span className="px-kicker">Configurações</span><h1>Personalize o MEG do seu jeito</h1><p>Preferências, segurança, sincronização, dados e composição da Home reunidos sem alterar as regras financeiras.</p></div><div className="px-screen-head-aside"><span className={`px-settings-health ${normalizationOk ? 'ok' : 'warn'}`}>{normalizationOk ? 'Sistema operacional' : 'Verificar integridade'}</span></div></header>

    <section className="px-card px-settings-health-banner">
      <div className="px-settings-health-copy"><span className="px-settings-health-icon" aria-hidden="true">{normalizationOk ? '✓' : '!'}</span><div><span className="px-kicker">Saúde do sistema</span><h2>{normalizationOk ? 'Sistema funcionando normalmente' : 'Sistema requer verificação'}</h2><p>Status construído apenas com os indicadores reais expostos pela API e pelo contrato de normalização.</p></div></div>
      <div className="px-settings-health-chips"><span>API · {stateLabel(data.health.status)}</span><span>Banco · {data.normalization.primary ? 'Primário' : 'Verificar'}</span><span>Normalização · {normalizationOk ? 'OK' : 'Pendente'}</span><span>Modo · {data.normalization.mode || '—'}</span></div>
    </section>

    <section className="px-card px-settings-card px-settings-dashboard-card">
      <div className="px-settings-card-head"><div><span className="px-kicker">Dashboard</span><h2>Monte sua Home</h2><p>Escolha quais blocos aparecem na tela principal. A preferência é local, aplicada imediatamente e preservada neste navegador.</p></div><button type="button" className="px-settings-restore" onClick={restoreDashboard}>Restaurar padrão</button></div>
      <div className="px-settings-dashboard-grid">
        <DashboardToggle checked={dashboardPreferences.balance} label="Saldo monetário" description="Card principal com o saldo realizado." onChange={() => toggleDashboardPreference('balance')} />
        <DashboardToggle checked={dashboardPreferences.projection} label="Diagnóstico e projeção" description="Alerta de fechamento positivo ou déficit." onChange={() => toggleDashboardPreference('projection')} />
        <DashboardToggle checked={dashboardPreferences.summary} label="Resumo financeiro" description="Pagas, pendentes e consolidado do período." onChange={() => toggleDashboardPreference('summary')} />
        <DashboardToggle checked={dashboardPreferences.benefit} label="Benefício alimentação" description="Saldo, créditos e utilização do benefício." onChange={() => toggleDashboardPreference('benefit')} />
        <DashboardToggle checked={dashboardPreferences.history} label="Histórico recente" description="Últimas ações registradas e auditáveis." onChange={() => toggleDashboardPreference('history')} />
        <DashboardToggle checked={dashboardPreferences.agenda} label="Agenda financeira" description="Vencimentos e compromissos acionáveis." onChange={() => toggleDashboardPreference('agenda')} />
      </div>
    </section>

    <section className="px-settings-grid">
      <article className="px-card px-settings-card">
        <div className="px-settings-title"><span>⚙</span><div><span className="px-kicker">Preferências gerais</span><h2>Aparência e comportamento</h2></div></div>
        <div className="px-settings-control-row"><div><strong>Tema</strong><small>Alteração aplicada imediatamente à Phoenix.</small></div><button type="button" onClick={onToggleTheme}>{theme === 'dark' ? 'Escuro · usar claro' : 'Claro · usar escuro'}</button></div>
        <div className="px-settings-control-row"><div><strong>Formato monetário</strong><small>Padrão oficial desta instalação.</small></div><span className="px-settings-value">R$ 1.234,56</span></div>
        <div className="px-settings-control-row"><div><strong>Primeiro dia da semana</strong><small>Preferência prevista pela V15.</small></div><span className="px-settings-value muted">Segunda-feira · próximo gate</span></div>
        <div className="px-settings-control-row"><div><strong>Tela inicial</strong><small>A Home permanece a entrada oficial durante a homologação.</small></div><span className="px-settings-value muted">Início</span></div>
      </article>

      <article className="px-card px-settings-card">
        <div className="px-settings-title"><span>◈</span><div><span className="px-kicker">Segurança</span><h2>Sessão e permissões</h2></div></div>
        <dl><div><dt>Usuário</dt><dd>{data.user.name}</dd></div><div><dt>E-mail</dt><dd>{data.user.email}</dd></div><div><dt>Perfil</dt><dd>{data.user.role}</dd></div><div><dt>Status</dt><dd>{data.user.status}</dd></div><div><dt>Último acesso</dt><dd>{data.user.lastLoginAt ? new Date(data.user.lastLoginAt).toLocaleString('pt-BR') : 'Não informado'}</dd></div></dl>
        <div className="px-settings-status-list"><span>Biometria · não consultada no módulo nativo Android</span><span>Bloqueio automático · não consultada nesta interface Web</span><span>Outras sessões · ação administrativa ainda bloqueada</span></div>
      </article>

      <article className="px-card px-settings-card">
        <div className="px-settings-title"><span>⟳</span><div><span className="px-kicker">Sincronização</span><h2>Integridade da base</h2></div></div>
        <div className={`px-settings-sync-banner ${normalizationOk ? 'ok' : 'warn'}`}><strong>{normalizationOk ? 'Tudo reconciliado' : 'Verificação necessária'}</strong><small>{data.normalization.updatedAt ? `Atualização: ${new Date(data.normalization.updatedAt).toLocaleString('pt-BR')}` : 'Horário de atualização não informado'}</small></div>
        <dl><div><dt>Base primária</dt><dd>{data.normalization.primary ? 'Sim' : 'Não'}</dd></div><div><dt>Reconciliada</dt><dd>{data.normalization.reconciled ? 'Sim' : 'Não'}</dd></div><div><dt>Revisão</dt><dd>{data.normalization.revision}</dd></div><div><dt>Eventos normalizados</dt><dd>{data.normalization.normalized?.count ?? '—'}</dd></div></dl>
      </article>

      <article className="px-card px-settings-card">
        <div className="px-settings-title"><span>◉</span><div><span className="px-kicker">Backup e dados</span><h2>Proteção da base</h2></div></div>
        <p>A V15 prevê backup, exportação e restauração. Nesta fase, restauração continua bloqueada para impedir qualquer mutação durante a homologação.</p>
        <div className="px-settings-control-row"><div><strong>Exportação</strong><small>Disponível nas telas que já possuem saída de leitura.</small></div><span className="px-settings-value">Somente leitura</span></div>
        <button type="button" disabled>Restaurar backup</button><small className="px-settings-note">Bloqueado propositalmente até o gate de escrita.</small>
      </article>

      <article className="px-card px-settings-card">
        <div className="px-settings-title"><span>▣</span><div><span className="px-kicker">Dispositivos</span><h2>Web e Android</h2></div></div>
        <p>Não exibimos dispositivos fictícios. O estado real será conectado quando o módulo nativo expuser uma leitura confiável.</p>
        <div className="px-settings-status-list"><span>Web atual · sessão autenticada</span><span>Android · integração de dispositivo pendente</span><span>Biometria · não consultada nesta sessão Web</span></div>
      </article>

      <article className="px-card px-settings-card">
        <div className="px-settings-title"><span>⇩</span><div><span className="px-kicker">Atualização</span><h2>Aplicativo Android</h2></div></div>
        <p>A regra final continua sendo atualização assistida pelo próprio aplicativo. Como a Web é o foco atual, nenhum número de versão é inventado aqui.</p>
        <div className="px-settings-status-list"><span>Canal Android · preservado</span><span>Verificação OTA · não consultada pela Phoenix Web</span></div>
      </article>

      <article className="px-card px-settings-card">
        <div className="px-settings-title"><span>✉</span><div><span className="px-kicker">Alertas e destinatários</span><h2>Canais de aviso</h2></div></div>
        <p>A estrutura V15 de e-mail e WhatsApp permanece prevista, mas destinatários reais não são inferidos nem exibidos sem contrato oficial de leitura.</p>
        <div className="px-settings-status-list"><span>E-mail · infraestrutura existente</span><span>WhatsApp · infraestrutura existente</span><span>Destinatários · leitura a conectar</span></div>
      </article>

      <article className="px-card px-settings-card">
        <div className="px-settings-title"><span>◷</span><div><span className="px-kicker">Automação de alertas</span><h2>Rotinas planejadas</h2></div></div>
        <p>A V15 previa avaliações recorrentes. Os horários abaixo permanecem como referência de produto, não como afirmação de que uma automação esteja ativa no backend atual.</p>
        <dl><div><dt>Avaliação</dt><dd>06:00 · 12:00 · 19:00</dd></div><div><dt>Fuso</dt><dd>São Paulo</dd></div><div><dt>Resumo ampliado</dt><dd>A cada 5 dias · 06:00</dd></div><div><dt>Item pago</dt><dd>Remove do alerta quando confirmado</dd></div></dl>
      </article>

      <article className="px-card px-settings-card">
        <div className="px-settings-title"><span>◇</span><div><span className="px-kicker">Diagnóstico</span><h2>Reparo e normalização</h2></div></div>
        <dl><div><dt>Reparo</dt><dd>{repair ? stateLabel(repair.status) : 'Não informado'}</dd></div><div><dt>Itens verificados</dt><dd>{repair?.scanned ?? '—'}</dd></div><div><dt>Itens reparados</dt><dd>{repair?.repaired ?? '—'}</dd></div><div><dt>Ocorrências</dt><dd>{repair?.issues ?? '—'}</dd></div><div><dt>Normalização API</dt><dd>{healthNormalization ? stateLabel(healthNormalization.status) : 'Não informado'}</dd></div></dl>
      </article>

      <article className="px-card px-settings-card px-settings-about">
        <div><div className="px-settings-title"><span>●</span><div><span className="px-kicker">Sobre</span><h2>MEG Finance System</h2></div></div><p>Meu Equilíbrio Gerencial · Phoenix V15 em homologação controlada.</p></div>
        <dl><div><dt>Modo</dt><dd>{data.sourcePolicy.mode}</dd></div><div><dt>Eventos</dt><dd>{data.sourcePolicy.events}</dd></div><div><dt>Histórico</dt><dd>{data.sourcePolicy.activities}</dd></div><div><dt>Usuários</dt><dd>{data.sourcePolicy.users}</dd></div></dl>
      </article>
    </section>
  </section>;
}
