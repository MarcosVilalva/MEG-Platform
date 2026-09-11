import { useRef, useState } from 'react';
import { MEGButton, MEGCard } from '@ui';
import { useAppStore } from '../../app/store';
import { downloadJsonBackup, readJsonBackup } from '../../app/backup';
import { patchCloudTransactions, readCloudState } from '../../app/app-state-client';
import { readSession } from '../../app/auth-client';

export function Settings() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const theme = useAppStore((state) => state.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const replaceTransactions = useAppStore((state) => state.replaceTransactions);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const session = readSession();

  async function exportBackup() {
    setBusy(true); setError(''); setMessage('');
    try { const cloud = await readCloudState(); downloadJsonBackup(cloud.state.transactions); setMessage(`Backup criado com ${cloud.state.transactions.length} lançamentos da base compartilhada.`); }
    catch { setError('Não foi possível ler a base compartilhada para gerar o backup.'); }
    finally { setBusy(false); }
  }

  async function importBackup(file?: File) {
    if (!file) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const backup = await readJsonBackup(file);
      const current = await readCloudState();
      if (!confirm(`Restaurar ${backup.transactions.length} lançamentos? A base atual será substituída somente após confirmação do servidor.`)) return;
      const incomingIds = new Set(backup.transactions.map((item) => item.id));
      const deletes = current.state.transactions.filter((item) => !incomingIds.has(item.id)).map((item) => item.id);
      await patchCloudTransactions(backup.transactions, deletes);
      replaceTransactions(backup.transactions);
      setMessage('Backup restaurado e confirmado na base compartilhada.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Erro ao restaurar o backup.'); }
    finally { setBusy(false); if (inputRef.current) inputRef.current.value = ''; }
  }

  return <section className="page settings-page"><header className="page-header"><div><span>Configurações</span><h1>Preferências e segurança</h1><p>Sincronização, aparência, backup e proteção da conta.</p></div><span className="status-pill active">Base compartilhada ativa</span></header>
    {error && <div className="auth-error" role="alert">{error}</div>}{message && <div className="auth-success" role="status">{message}</div>}
    <section className="settings-overview"><article><span>CONTA CONECTADA</span><strong>{session?.user.email || 'Usuário MEG'}</strong><small>Perfil {session?.user.role || 'não informado'}</small></article><article><span>SINCRONIZAÇÃO</span><strong>Confirmação obrigatória</strong><small>Alterações liberadas somente após resposta da base</small></article><article><span>APARÊNCIA</span><strong>{theme === 'dark' ? 'Modo escuro' : 'Modo claro'}</strong><small>Preferência mantida neste dispositivo</small></article></section>
    <section className="settings-grid"><MEGCard title="Aparência" eyebrow="Interface"><p>Alterne o tema mantendo contraste e legibilidade em todas as telas.</p><div className="toggle-row"><div><strong>Tema do sistema</strong><small>{theme === 'dark' ? 'Escuro ativo' : 'Claro ativo'}</small></div><button className="secondary-button" onClick={toggleTheme}>Usar modo {theme === 'dark' ? 'claro' : 'escuro'}</button></div></MEGCard>
      <MEGCard title="Backup da base" eyebrow="Proteção dos dados"><p>Exporte uma cópia dos lançamentos atualmente confirmados no servidor.</p><div className="settings-actions"><MEGButton onClick={() => void exportBackup()} disabled={busy}>{busy ? 'Aguarde...' : 'Exportar backup'}</MEGButton><MEGButton variant="ghost" onClick={() => inputRef.current?.click()} disabled={busy}>Restaurar backup</MEGButton><input ref={inputRef} type="file" accept="application/json" hidden onChange={(event) => void importBackup(event.target.files?.[0])} /></div><small className="settings-warning">A restauração exige confirmação e nunca utiliza dados de demonstração.</small></MEGCard>
      <MEGCard title="Segurança da conta" eyebrow="Acesso"><div className="security-list"><div><strong>Sessão autenticada</strong><span>Credenciais e permissões são verificadas pela API.</span></div><div><strong>Histórico preservado</strong><span>Operações relevantes permanecem rastreáveis.</span></div><div><strong>Perfis de acesso</strong><span>Administrador, gerente, operador e leitor.</span></div></div></MEGCard>
      <MEGCard title="Dispositivos e aplicativo" eyebrow="Ecossistema MEG"><div className="security-list"><div><strong>Web responsiva</strong><span>Adaptação automática ao tamanho da janela.</span></div><div><strong>Aplicativo Android</strong><span>Sincronizado pela mesma base financeira.</span></div><div><strong>Status operacional</strong><span>Dados confirmados antes de liberar nova ação.</span></div></div></MEGCard></section>
  </section>;
}
