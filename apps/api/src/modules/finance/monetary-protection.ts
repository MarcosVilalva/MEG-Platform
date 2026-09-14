import { Prisma, prisma } from '@meg/database';

type Tx = Prisma.TransactionClient;

type SerializableFinancialTransactionOptions = {
  maxWaitMs?: number;
  timeoutMs?: number;
};

function retryableTransaction(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2034');
}

export async function serializableFinancialTransaction<T>(
  work: (tx: Tx) => Promise<T>,
  options: SerializableFinancialTransactionOptions = {},
) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: options.maxWaitMs ?? 10_000,
        timeout: options.timeoutMs ?? 30_000,
      });
    } catch (error) {
      if (!retryableTransaction(error) || attempt === 3) throw error;
    }
  }
  throw new Error('SERIALIZABLE_TRANSACTION_RETRY_EXHAUSTED');
}
