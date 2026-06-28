import type { LegacyTransaction } from '@core/finance/events';

export interface BackupPayload {
  version: string;
  exportedAt: string;
  transactions: LegacyTransaction[];
}

export function downloadJsonBackup(transactions: LegacyTransaction[]) {
  const payload: BackupPayload = {
    version: '0.4.0-alpha',
    exportedAt: new Date().toISOString(),
    transactions
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json'
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `meg-financial-os-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function readJsonBackup(file: File): Promise<BackupPayload> {
  const text = await file.text();
  const parsed = JSON.parse(text);

  if (!Array.isArray(parsed.transactions)) {
    throw new Error('Arquivo inválido: transactions não encontrado.');
  }

  return parsed;
}
