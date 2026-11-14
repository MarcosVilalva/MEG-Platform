/**
 * Etapa 09, candidata experimental: auditoria periódica com assinatura completa.
 * Não altera normalizationPreview, os endpoints administrativos ou qualquer writer.
 *
 * O SHA-256 é calculado em PostgreSQL 17 sobre todo AppState e sobre todas
 * as linhas FinancialEvent do workspace, inclusive arquivadas, sem devolver
 * payloads financeiros pela conexão. Qualquer diferença exige auditoria
 * financeira completa com o normalizationFingerprint original.
 */
import { Prisma, prisma } from '@meg/database';
import type { normalizationPreview } from './normalization-migration';

type Preview = Awaited<ReturnType<typeof normalizationPreview>>;
type CacheEntry = { signature: string; preview: Preview };
const cache = new Map<string, CacheEntry>();
const MAX_WORKSPACES = 16;

export async function completeDatabaseSignature(workspaceId: string): Promise<string | null> {
  // Uma única instrução SQL: as duas subconsultas compartilham o mesmo snapshot.
  // to_jsonb(e) inclui TODAS as colunas, para detectar edições externas à API.
  // SHA-256 por linha, em ordem estável por ID, antes da agregação final.
  // Isto evita construir um jsonb_agg gigante na memória do PostgreSQL.
  const rows = await prisma.$queryRaw<Array<{
    stateDigest: string | null;
    eventDigest: string;
  }>>(Prisma.sql`
    SELECT
      (SELECT encode(sha256(convert_to(to_jsonb(a)::text, 'UTF8')), 'hex')
       FROM "AppState" AS a WHERE a."workspaceId" = ${workspaceId}) AS "stateDigest",
      encode(sha256(convert_to(COALESCE((
        SELECT string_agg(
          encode(sha256(convert_to(to_jsonb(e)::text, 'UTF8')), 'hex'),
          '' ORDER BY e."id"
        )
        FROM "FinancialEvent" AS e
        WHERE e."workspaceId" = ${workspaceId}
      ), ''), 'UTF8')), 'hex') AS "eventDigest"
  `);
  const value = rows[0];
  if (!value?.stateDigest || !value.eventDigest) return null;
  return `${value.stateDigest}:${value.eventDigest}`;
}

/**
 * Exclusivamente para o timer de 15 minutos. Rotas, writes e leitura financeira
 * continuam usando a auditoria original, sem cache.
 *
 * Se a consulta SHA falhar, se houver alteração, rollback, divergência ou
 * primeira execução, executa a auditoria completa. O cache só é preenchido
 * após dois snapshots iguais antes/depois da auditoria completa reconciliada.
 */
export async function periodicNormalizationPreview(
  workspaceId: string,
  userId: string,
  fullAudit: (workspaceId: string, userId: string) => Promise<Preview>,
): Promise<Preview> {
  const cacheKey = `${workspaceId}:${userId}`;
  let before: string | null = null;
  try {
    before = await completeDatabaseSignature(workspaceId);
  } catch {
    // Falha na assinatura jamais equivale a resultado 'reconciled'.
    cache.delete(cacheKey);
    return fullAudit(workspaceId, userId);
  }

  const previous = cache.get(cacheKey);
  if (before && previous?.signature === before) {
    return previous.preview;
  }
  cache.delete(cacheKey);

  const preview = await fullAudit(workspaceId, userId);
  if (!before || !preview.primary || !preview.reconciled ||
      preview.mode !== 'normalized-primary') return preview;

  // Uma escrita concorrente durante a auditoria impede reutilização.
  try {
    const after = await completeDatabaseSignature(workspaceId);
    if (after === before) {
      cache.set(cacheKey, { signature: before, preview });
      if (cache.size > MAX_WORKSPACES) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
      }
    }
  } catch {
    cache.delete(cacheKey);
  }
  return preview;
}
