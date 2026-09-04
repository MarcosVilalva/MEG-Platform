import { createHash } from 'node:crypto';
import { Prisma, prisma } from '@meg/database';

const RECEIPT_RETENTION_DAYS = 45;

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => [key, canonicalValue((value as Record<string, unknown>)[key])]),
  );
}

export function mutationRequestHash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(canonicalValue(value))).digest('hex');
}

export function mutationReceiptExpiry(now = new Date()): Date {
  return new Date(now.getTime() + RECEIPT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

export async function findMutationReceipt(workspaceId: string, operationId: string, requestHash: string) {
  const receipt = await prisma.cloudMutationReceipt.findUnique({
    where: { workspaceId_operationId: { workspaceId, operationId } },
  });
  if (!receipt) return null;
  if (receipt.requestHash !== requestHash) return { conflict: true as const, response: null };
  return { conflict: false as const, response: receipt.response };
}

export async function recordMutationReceipt(input: {
  workspaceId: string;
  operationId: string;
  requestHash: string;
  mutationType: string;
  revision: number;
  response: unknown;
}) {
  return prisma.cloudMutationReceipt.create({ data: receiptCreateData(input) });
}

export function receiptCreateData(input: {
  workspaceId: string;
  operationId: string;
  requestHash: string;
  mutationType: string;
  revision: number;
  response: unknown;
}) {
  return {
    ...input,
    response: JSON.parse(JSON.stringify(input.response)) as Prisma.InputJsonValue,
    expiresAt: mutationReceiptExpiry(),
  };
}
