import { authenticatedRequest } from '../app/auth-client';
import { downloadJsonBackup, readJsonBackup, type BackupPayload } from '../app/backup';
import { readCloudState } from '../app/app-state-client';
import type { LegacyTransaction } from '@core/finance/events';
import type { PhoenixReadModel } from './contracts';
import { clearPhoenixReadModelCache, loadPhoenixReadModel } from './data/load-phoenix-read-model';

export type PreparedPhoenixBackupRestore = {
  backup: BackupPayload;
  expectedRevision: number;
  currentCount: number;
  currentUpdatedAt?: string | null;
};

export type PhoenixBackupRestoreResult =
  | {
      status: 'confirmed';
      revision: number;
      restoredCount: number;
      snapshot: PhoenixReadModel;
    }
  | {
      status: 'error';
      code: 'STATE_CONFLICT' | 'RESTORE_VERIFICATION_FAILED' | 'RESTORE_FAILED';
      message: string;
    };

function restoreFingerprint(transactions: LegacyTransaction[]) {
  return transactions
    .map((item) => [item.id, String(item.date || '').slice(0, 10), item.type, Number(item.amount), item.description].join('|'))
    .sort()
    .join('\n');
}

export async function exportPhoenixTransactionBackup() {
  const cloud = await readCloudState();
  downloadJsonBackup(cloud.state.transactions);
  return {
    count: cloud.state.transactions.length,
    revision: cloud.revision,
    updatedAt: cloud.updatedAt || null,
  };
}

export async function inspectPhoenixTransactionBackup(file: File): Promise<PreparedPhoenixBackupRestore> {
  const [backup, current] = await Promise.all([
    readJsonBackup(file),
    readCloudState(),
  ]);

  return {
    backup,
    expectedRevision: current.revision,
    currentCount: current.state.transactions.length,
    currentUpdatedAt: current.updatedAt || null,
  };
}

export async function restorePhoenixTransactionBackup(
  prepared: PreparedPhoenixBackupRestore,
  refreshMonth: string,
): Promise<PhoenixBackupRestoreResult> {
  try {
    const current = await readCloudState();
    if (current.revision !== prepared.expectedRevision) {
      return {
        status: 'error',
        code: 'STATE_CONFLICT',
        message: 'A base mudou depois da conferência do backup. A restauração foi cancelada antes de qualquer gravação.',
      };
    }

    const expectedFingerprint = restoreFingerprint(prepared.backup.transactions);
    const response = await authenticatedRequest<{
      revision: number;
      updatedAt?: string | null;
      normalization?: { active?: boolean; reconciled?: boolean };
    }>('/app-state', {
      method: 'PUT',
      body: JSON.stringify({
        state: { ...current.state, transactions: prepared.backup.transactions },
        expectedRevision: prepared.expectedRevision,
      }),
    });

    const verified = await readCloudState();
    if (restoreFingerprint(verified.state.transactions) !== expectedFingerprint) {
      return {
        status: 'error',
        code: 'RESTORE_VERIFICATION_FAILED',
        message: 'A restauração foi recebida pelo servidor, mas a conferência final dos lançamentos não coincidiu.',
      };
    }

    clearPhoenixReadModelCache();
    const snapshot = await loadPhoenixReadModel(refreshMonth, { force: true, forceStatic: true });

    return {
      status: 'confirmed',
      revision: response.revision,
      restoredCount: verified.state.transactions.length,
      snapshot,
    };
  } catch (error) {
    const status = error && typeof error === 'object' && 'status' in error
      ? Number((error as { status?: unknown }).status)
      : 0;
    const message = error instanceof Error ? error.message : '';

    if (status === 409 || message === 'STATE_CONFLICT') {
      return {
        status: 'error',
        code: 'STATE_CONFLICT',
        message: 'A base mudou durante a restauração. Nada será reenviado automaticamente; confira novamente o arquivo antes de tentar de novo.',
      };
    }

    return {
      status: 'error',
      code: 'RESTORE_FAILED',
      message: message || 'Não foi possível restaurar o backup.',
    };
  }
}
