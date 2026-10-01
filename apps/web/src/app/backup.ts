import type { LegacyTransaction } from '@core/finance/events';

const MAX_BACKUP_TRANSACTIONS = 20_000;

export interface BackupPayload {
  version: string;
  exportedAt: string;
  transactionCount: number;
  transactions: LegacyTransaction[];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function normalizeTransaction(value: unknown, index: number): LegacyTransaction {
  const item = asRecord(value);
  const id = String(item.id || '').trim();
  const date = String(item.date || '').trim();
  const description = String(item.description || '').trim();
  const type = String(item.type || '').trim().toLowerCase();
  const amount = Number(item.amount);

  if (!id) throw new Error(`Backup inválido: lançamento ${index + 1} sem ID.`);
  if (date.length < 10) throw new Error(`Backup inválido: lançamento ${index + 1} sem data válida.`);
  if (!description) throw new Error(`Backup inválido: lançamento ${index + 1} sem descrição.`);
  if (type !== 'income' && type !== 'expense') throw new Error(`Backup inválido: lançamento ${index + 1} possui tipo desconhecido.`);
  if (!Number.isFinite(amount)) throw new Error(`Backup inválido: lançamento ${index + 1} possui valor inválido.`);

  const base = item as unknown as LegacyTransaction;
  return {
    ...base,
    id,
    date,
    description,
    type,
    amount,
  };
}

export function downloadJsonBackup(transactions: LegacyTransaction[]) {
  const payload: BackupPayload = {
    version: '0.5.0',
    exportedAt: new Date().toISOString(),
    transactionCount: transactions.length,
    transactions,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `meg-financial-os-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function readJsonBackup(file: File): Promise<BackupPayload> {
  let parsed: Record<string, unknown>;
  try {
    parsed = asRecord(JSON.parse(await file.text()));
  } catch {
    throw new Error('Arquivo inválido: o conteúdo não é um JSON válido.');
  }

  if (!Array.isArray(parsed.transactions)) {
    throw new Error('Arquivo inválido: transactions não encontrado.');
  }
  if (parsed.transactions.length > MAX_BACKUP_TRANSACTIONS) {
    throw new Error(`Backup excede o limite de ${MAX_BACKUP_TRANSACTIONS.toLocaleString('pt-BR')} lançamentos.`);
  }

  const transactions = parsed.transactions.map(normalizeTransaction);
  const ids = new Set<string>();
  for (const item of transactions) {
    if (ids.has(item.id)) throw new Error(`Backup inválido: ID duplicado ${item.id}.`);
    ids.add(item.id);
  }

  return {
    version: typeof parsed.version === 'string' && parsed.version.trim() ? parsed.version : 'legado',
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : '',
    transactionCount: transactions.length,
    transactions,
  };
}
