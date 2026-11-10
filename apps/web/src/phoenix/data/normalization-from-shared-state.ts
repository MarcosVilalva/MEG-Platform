import type { PhoenixNormalizationPreview } from '../contracts';

/**
 * O GET /app-state já compara os fingerprints e reconstrói os eventos legados
 * quando a base normalizada é primária. Aproveitar esse resultado evita um
 * segundo GET /app-state/normalization-preview com outra leitura integral.
 *
 * Não inferir "sincronizado" sem prova: estados legados, divergência, payload
 * incompleto ou modo de rollback continuam exigindo o endpoint diagnóstico.
 */
export type NormalizationSharedRead = {
  dataSource?: string;
  normalizedPrimary?: boolean;
  revision?: number;
  updatedAt?: string | null;
  integrity?: {
    reconciled?: boolean;
    count?: number;
    fingerprint?: string;
  } | null;
};

export function normalizationFromSharedState(
  response: NormalizationSharedRead
): PhoenixNormalizationPreview | null {
  const integrity = response.integrity;
  if (
    response.dataSource !== 'normalized'
    || response.normalizedPrimary !== true
    || integrity?.reconciled !== true
    || typeof integrity.count !== 'number'
    || !Number.isSafeInteger(integrity.count)
    || (integrity.count ?? -1) < 0
    || typeof response.revision !== 'number'
    || !Number.isSafeInteger(response.revision)
    || (response.revision ?? -1) < 0
  ) {
    return null;
  }

  return {
    revision: response.revision!,
    updatedAt: response.updatedAt ?? null,
    primary: true,
    mode: 'normalized-primary',
    reconciled: true,
    source: {
      validCount: integrity.count,
      invalidCount: 0,
      fingerprint: integrity.fingerprint,
    },
    normalized: {
      count: integrity.count,
      fingerprint: integrity.fingerprint,
    },
  };
}
