import { useRef } from 'react';
import { MEGButton, MEGCard } from '@ui';
import { useAppStore } from '../../app/store';
import { downloadJsonBackup, readJsonBackup } from '../../app/backup';

export function Settings() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { transactions, replaceTransactions, resetDemoData } = useAppStore();

  async function importBackup(file?: File) {
    if (!file) return;

    try {
      const backup = await readJsonBackup(file);
      replaceTransactions(backup.transactions);
      alert('Backup importado com sucesso.');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro ao importar backup.');
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <span>Configurações</span>
          <h1>Administração do MEG</h1>
          <p>Backup, restauração e manutenção dos dados locais.</p>
        </div>
      </header>

      <section className="dashboard-grid">
        <MEGCard title="Backup local" eyebrow="Dados">
          <p>Exporte seus lançamentos em JSON para guardar uma cópia de segurança.</p>
          <div className="settings-actions">
            <MEGButton onClick={() => downloadJsonBackup(transactions)}>Exportar backup JSON</MEGButton>
            <MEGButton variant="ghost" onClick={() => inputRef.current?.click()}>Importar backup</MEGButton>
            <input
              ref={inputRef}
              type="file"
              accept="application/json"
              hidden
              onChange={(event) => importBackup(event.target.files?.[0])}
            />
          </div>
        </MEGCard>

        <MEGCard title="Dados de demonstração" eyebrow="Manutenção">
          <p>Restaure os dados iniciais para testar o sistema novamente.</p>
          <div className="settings-actions">
            <MEGButton variant="danger" onClick={() => {
              if (confirm('Restaurar dados demo? Isso substituirá seus lançamentos locais.')) {
                resetDemoData();
              }
            }}>Restaurar dados demo</MEGButton>
          </div>
        </MEGCard>
      </section>
    </section>
  );
}
