import type { PhoenixReadModel } from '../contracts';
import '../phoenix-settings.css';

type PhoenixSettingsProps = {
  data: PhoenixReadModel;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
};

function stateLabel(value?: string | boolean | null) {
  if (value === true) return 'OK';
  if (value === false) return 'Atenção';
  if (!value) return 'Não informado';
  return String(value);
}

export function PhoenixSettings({ data, theme, onToggleTheme }: PhoenixSettingsProps) {
  const normalizationOk = Boolean(data.normalization.primary && data.normalization.reconciled);
  const repair = data.health.dataRepair;
  const healthNormalization = data.health.normalization;

  return <section className="px-screen px-settings-screen">
    <header className="px-screen-head"><div><span className="px-kicker">Configurações</span><h1>Personalize o MEG do seu jeito</h1><p>Preferências, segurança, sincronização e diagnóstico do ambiente Phoenix sem alterar a base financeira.</p></div><div className="px-screen-head-aside"><span className={`px-settings-health ${normalizationOk ? 'ok' : 'warn'}`}>{normalizationOk ? 'Base reconciliada' : 'Verificar integridade'}</span></div></header>

    <section className="px-card px-settings-health-banner">
      <div><span className="px-kicker">Saúde do sistema</span><h2>{data.health.status || 'Status não informado'}</h2><p>Leitura direta dos indicadores disponibilizados pela API e pelo contrato de normalização.</p></div>
      <div className="px-settings-health-chips"><span>API: {stateLabel(data.health.status)}</span><span>Normalização: {normalizationOk ? 'Reconciliada' : 'Pendente'}</span><span>Base primária: {data.normalization.primary ? 'Sim' : 'Não'}</span><span>Modo: {data.normalization.mode || '—'}</span></div>
    </section>

    <section className="px-settings-grid">
      <article className="px-card px-settings-card"><span className="px-kicker">Preferências</span><h2>Aparência</h2><p>O tema do preview é independente do sistema atual.</p><div className="px-settings-row"><div><strong>Tema ativo</strong><small>{theme === 'dark' ? 'Modo escuro' : 'Modo claro'}</small></div><button type="button" onClick={onToggleTheme}>Usar modo {theme === 'dark' ? 'claro' : 'escuro'}</button></div></article>

      <article className="px-card px-settings-card"><span className="px-kicker">Segurança</span><h2>Sessão e permissões</h2><dl><div><dt>Usuário</dt><dd>{data.user.name}</dd></div><div><dt>E-mail</dt><dd>{data.user.email}</dd></div><div><dt>Perfil</dt><dd>{data.user.role}</dd></div><div><dt>Status</dt><dd>{data.user.status}</dd></div></dl></article>

      <article className="px-card px-settings-card"><span className="px-kicker">Sincronização</span><h2>Integridade da base</h2><dl><div><dt>Primária</dt><dd>{data.normalization.primary ? 'Sim' : 'Não'}</dd></div><div><dt>Reconciliada</dt><dd>{data.normalization.reconciled ? 'Sim' : 'Não'}</dd></div><div><dt>Revisão</dt><dd>{data.normalization.revision}</dd></div><div><dt>Atualização</dt><dd>{data.normalization.updatedAt ? new Date(data.normalization.updatedAt).toLocaleString('pt-BR') : 'Não informada'}</dd></div></dl></article>

      <article className="px-card px-settings-card"><span className="px-kicker">Diagnóstico</span><h2>Reparo e normalização</h2><dl><div><dt>Reparo</dt><dd>{repair ? stateLabel(repair.status) : 'Não informado'}</dd></div><div><dt>Itens verificados</dt><dd>{repair?.scanned ?? '—'}</dd></div><div><dt>Itens reparados</dt><dd>{repair?.repaired ?? '—'}</dd></div><div><dt>Ocorrências</dt><dd>{repair?.issues ?? '—'}</dd></div><div><dt>Normalização API</dt><dd>{healthNormalization ? stateLabel(healthNormalization.status) : 'Não informado'}</dd></div></dl></article>

      <article className="px-card px-settings-card"><span className="px-kicker">Backup e dados</span><h2>Proteção da base</h2><p>A exportação e a restauração continuam disponíveis no sistema atual. Nesta fase, a Phoenix não grava nem restaura lançamentos.</p><button type="button" disabled>Restaurar backup</button><small className="px-settings-note">Bloqueado propositalmente durante a validação read-only.</small></article>

      <article className="px-card px-settings-card"><span className="px-kicker">Dispositivos</span><h2>Web e Android</h2><p>O preview não presume estado de biometria, notificações ou atualização do aplicativo. Esses recursos serão conectados somente depois da leitura real dos módulos nativos.</p><div className="px-settings-status-list"><span>Biometria · não consultada</span><span>Notificações · não consultadas</span><span>Atualização Android · não consultada</span></div></article>

      <article className="px-card px-settings-card"><span className="px-kicker">Alertas</span><h2>Notificações e automações</h2><p>Os canais e rotinas existentes ainda não foram ligados a esta interface Phoenix.</p><div className="px-settings-status-list"><span>E-mail · integração pendente</span><span>WhatsApp · integração pendente</span><span>Automações · integração pendente</span></div></article>

      <article className="px-card px-settings-card"><span className="px-kicker">Sobre</span><h2>Phoenix V15</h2><p>Reconstrução visual isolada, com fontes reais e mutações financeiras desabilitadas durante a fase de paridade.</p><dl><div><dt>Modo</dt><dd>{data.sourcePolicy.mode}</dd></div><div><dt>Eventos</dt><dd>{data.sourcePolicy.events}</dd></div><div><dt>Histórico</dt><dd>{data.sourcePolicy.activities}</dd></div><div><dt>Usuários</dt><dd>{data.sourcePolicy.users}</dd></div></dl></article>
    </section>
  </section>;
}
