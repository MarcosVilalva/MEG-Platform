import { useRef, useState } from 'react';
import { MEGButton, MEGCard } from '@ui';
import { useAppStore } from '../../app/store';
import { downloadJsonBackup, readJsonBackup } from '../../app/backup';
import { readCloudState, replaceCloudTransactions } from '../../app/app-state-client';
import { readSession } from '../../app/auth-client';
import { invalidateFinanceSummary } from '../../app/use-finance-summary';

export function Settings() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const theme = useAppStore((state) => state.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const replaceTransactions = useAppStore((state) => state.replaceTransactions);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const session = readSession();
  const canRestore = Boolean(session && session.user.role !== 'VIEWER');

  async function exportBackup() {
    setBusy(true); setError(''); setMessage('');
    try { const cloud = await readCloudState(); downloadJsonBackup(cloud.state.transactions); setMessage(`Backup criado com ${cloud.state.transactions.length} lançamentos da base compartilhada.`); }
    catch { setError('Não foi possível ler a base compartilhada para gerar o backup.'); }
    finally { setBusy(false); }
  }

  async function importBackup(file?: File) {
    if (!file) return;
    if (!canRestore) {
      setError('Seu perfil possui acesso somente para consulta e não pode restaurar backups.');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    setBusy(true); setError(''); setMessage('');
    try {
      const backup = await readJsonBackup(file);
      const current = await readCloudState();
      const exported = backup.exportedAt ? new Date(backup.exportedAt).toLocaleString('pt-BR') : 'data não informada';
      const confirmed = confirm(
        `Restaurar backup ${backup.version} com ${backup.transactions.length} lançamentos?\n\n`
        + `Base atual: ${current.state.transactions.length} lançamentos.\n`
        + `Backup gerado em: ${exported}.\n\n`
        + 'Os lançamentos atuais serão substituídos em uma única operação, com sincronização da base financeira normalizada e conferência final.'
      );
      if (!confirmed) return;

      const restored = await replaceCloudTransactions(backup.transactions);
      replaceTransactions(restored.state.transactions);
      invalidateFinanceSummary();
      setMessage(`Backup restaurado, sincronizado e conferido na revisão ${restored.verifiedRevision}. ${restored.state.transactions.length} lançamento(s) ativos.`);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '';
      if (message === 'RESTORE_VERIFICATION_FAILED') {
        setError('A restauração foi enviada ao servidor, mas a conferência final não coincidiu. Recarregue a base antes de tentar qualquer nova restauração.');
      } else if ((cause as { status?: number }).status === 409 || message === 'STATE_CONFLICT') {
        setError('A base mudou durante a restauração. Nenhum novo envio será feito até uma nova leitura da base.');
      } else {
        setError(message || 'Erro ao restaurar o backup.');
      }
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return <section id="settings" className="page settings-page"><header className="page-head page-header"><div><span>Configurações</span><h1>Personalize o MEG do seu jeito</h1><p>Preferências, segurança, sincronização e dados em uma única visão, sem remover as regras de alertas já existentes.</p></div><span className="status-pill active">Base compartilhada ativa</span></header>
    {error && <div className="auth-error" role="alert">{error}</div>}{message && <div className="auth-success" role="status">{message}</div>}
    <section className="settings-overview"><article><span>CONTA CONECTADA</span><strong>{session?.user.email || 'Usuário MEG'}</strong><small>Perfil {session?.user.role || 'não informado'}</small></article><article><span>SINCRONIZAÇÃO</span><strong>Confirmação obrigatória</strong><small>Alterações liberadas somente após resposta da base</small></article><article><span>APARÊNCIA</span><strong>{theme === 'dark' ? 'Modo escuro' : 'Modo claro'}</strong><small>Preferência mantida neste dispositivo</small></article></section>
    <section className="settings-grid"><MEGCard title="Aparência" eyebrow="Interface"><p>Alterne o tema mantendo contraste e legibilidade em todas as telas.</p><div className="toggle-row"><div><strong>Tema do sistema</strong><small>{theme === 'dark' ? 'Escuro ativo' : 'Claro ativo'}</small></div><button className="secondary-button" onClick={toggleTheme}>Usar modo {theme === 'dark' ? 'claro' : 'escuro'}</button></div></MEGCard>
      <MEGCard title="Backup da base" eyebrow="Proteção dos dados"><p>Exporte uma cópia dos lançamentos confirmados ou restaure um backup validado pela Web.</p><div className="settings-actions"><MEGButton onClick={() => void exportBackup()} disabled={busy}>{busy ? 'Aguarde...' : 'Exportar backup'}</MEGButton><MEGButton variant="ghost" onClick={() => inputRef.current?.click()} disabled={busy || !canRestore}>Restaurar backup</MEGButton><input ref={inputRef} type="file" accept="application/json" hidden onChange={(event) => void importBackup(event.target.files?.[0])} /></div><small className="settings-warning">{canRestore ? 'A restauração valida o arquivo, sincroniza a base normalizada e relê os dados antes de confirmar sucesso.' : 'Seu perfil pode exportar backups, mas não possui permissão para restaurar a base.'}</small></MEGCard>
      <MEGCard title="Segurança da conta" eyebrow="Acesso"><div className="security-list"><div><strong>Sessão autenticada</strong><span>Credenciais e permissões são verificadas pela API.</span></div><div><strong>Histórico preservado</strong><span>Operações relevantes permanecem rastreáveis.</span></div><div><strong>Perfis de acesso</strong><span>Administrador, gerente, operador e leitor.</span></div></div></MEGCard>
      <MEGCard title="Dispositivos e aplicativo" eyebrow="Ecossistema MEG"><div className="security-list"><div><strong>Web responsiva</strong><span>Adaptação automática ao tamanho da janela.</span></div><div><strong>Aplicativo Android</strong><span>Sincronizado pela mesma base financeira.</span></div><div><strong>Status operacional</strong><span>Dados confirmados antes de liberar nova ação.</span></div></div></MEGCard></section>
  </section>;
}
