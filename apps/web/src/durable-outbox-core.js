import {
  hasTransactionOperations,
  mergeTransactionOutbox,
  normalizeTransactionOutbox,
  samePersistedValue,
} from './cloud-write-ahead-core.js';
import { stateProperties } from './cloud-state-properties-core.js';

function timestamp(value) {
  const parsed = Date.parse(String(value?.updatedAt || ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function generation(value) {
  return Number.isFinite(Number(value?.generation)) ? Number(value.generation) : 0;
}

function newerFirst(left, right) {
  const generationDifference = generation(right) - generation(left);
  if (generationDifference) return generationDifference;
  return timestamp(right) - timestamp(left);
}

export function emptyTransactionOutbox() {
  return { generation: 0, operationId: '', upserts: [], deletes: [], activities: [], updatedAt: null };
}

export function emptyStateOutbox() {
  return { generation: 0, operationId: '', properties: null, updatedAt: null };
}

export function normalizeStateOutbox(value) {
  if (!value || typeof value !== 'object' || !value.properties || typeof value.properties !== 'object') {
    return emptyStateOutbox();
  }
  return {
    generation: generation(value),
    operationId: typeof value.operationId === 'string' ? value.operationId : '',
    properties: stateProperties(value.properties),
    updatedAt: value.updatedAt || null,
  };
}

export function reconcileTransactionOutboxes(...sources) {
  const candidates = sources
    .map(normalizeTransactionOutbox)
    .filter(hasTransactionOperations)
    .sort(newerFirst);
  if (!candidates.length) return emptyTransactionOutbox();
  if (candidates.length === 1) return candidates[0];

  const merged = candidates.reduceRight(
    (current, incoming) => mergeTransactionOutbox(current, incoming),
    emptyTransactionOutbox(),
  );
  const newest = candidates[0];
  if (candidates.every((candidate) => samePersistedValue(candidate, newest))) return newest;
  return {
    generation: Math.max(...candidates.map(generation)) + 1,
    operationId: '',
    ...merged,
    updatedAt: new Date(Math.max(Date.now(), ...candidates.map(timestamp))).toISOString(),
  };
}

export function reconcileStateOutboxes(...sources) {
  const candidates = sources
    .map(normalizeStateOutbox)
    .filter((value) => value.properties && Object.keys(value.properties).length)
    .sort(newerFirst);
  if (!candidates.length) return emptyStateOutbox();
  if (candidates.length === 1) return candidates[0];

  const properties = {};
  for (const candidate of [...candidates].reverse()) Object.assign(properties, candidate.properties);
  const newest = candidates[0];
  const unchanged = candidates.every((candidate) => samePersistedValue(candidate, newest));
  return unchanged ? newest : {
    generation: Math.max(...candidates.map(generation)) + 1,
    operationId: '',
    properties,
    updatedAt: new Date(Math.max(Date.now(), ...candidates.map(timestamp))).toISOString(),
  };
}
