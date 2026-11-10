/**
 * Retém a checagem de integridade a cada pulso de 15 minutos, mas só transporta
 * o histórico inteiro quando o marcador de revisão mudou ou na auditoria
 * profunda obrigatória. O marcador NÃO substitui o fingerprint financeiro.
 *
 * A auditoria profunda ocorre pelo menos a cada 2 horas enquanto a API está
 * ativa, mesmo que os marcadores não mudem. Isso detecta também alterações
 * fora dos writers que não atualizaram os metadados.
 */
export const FULL_NORMALIZATION_AUDIT_INTERVAL_MS = 2 * 60 * 60 * 1000;

export type NormalizationAuditStamp = {
  workspaceId: string;
  stateRevision: number | null;
  stateUpdatedAt: string | null;
  activeEventCount: number;
  latestEventUpdatedAt: string | null;
};

export function sameNormalizationAuditStamp(
  left: NormalizationAuditStamp,
  right: NormalizationAuditStamp
): boolean {
  return left.workspaceId === right.workspaceId
    && left.stateRevision === right.stateRevision
    && left.stateUpdatedAt === right.stateUpdatedAt
    && left.activeEventCount === right.activeEventCount
    && left.latestEventUpdatedAt === right.latestEventUpdatedAt;
}

export function needsDeepNormalizationAudit(
  stamp: NormalizationAuditStamp,
  lastVerified: NormalizationAuditStamp | null,
  lastVerifiedAtMs: number | null,
  nowMs: number,
  maxAgeMs = FULL_NORMALIZATION_AUDIT_INTERVAL_MS
): boolean {
  if (!lastVerified || lastVerifiedAtMs === null) return true;
  if (maxAgeMs <= 0 || nowMs < lastVerifiedAtMs || nowMs - lastVerifiedAtMs >= maxAgeMs) return true;
  return !sameNormalizationAuditStamp(stamp, lastVerified);
}
