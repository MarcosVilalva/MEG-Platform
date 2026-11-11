import { prisma } from '@meg/database';

/**
 * Revisao de leitura da Etapa 09.
 *
 * A antiga /sync-status observava somente CloudMutationReceipt e catalogos.
 * PATCH /finance/events/:id pode alterar FinancialEvent sem gerar esse recibo.
 *
 * Este fingerprint deriva dos dados ATIVOS realmente lidos no historico,
 * incluindo metadados de importacao, sem atualizar writers ou criar schema.
 * PostgreSQL calcula o checksum no servidor e retorna somente o resumo opaco.
 * MD5 e usado para detectar mudancas, NAO para autenticacao/assinatura.
 */
export async function getActiveFinancialHistoryRevision(userId: string): Promise<string> {
  const rows = await prisma.$queryRaw<Array<{
    activeCount: bigint;
    fingerprint: string;
  }>>`
    SELECT COUNT(*)::bigint AS "activeCount",
           md5(COALESCE(
             string_agg(
               md5(to_jsonb(fe)::text || COALESCE(to_jsonb(ir)::text, '')),
               '' ORDER BY fe."id"
             ),
             ''
           )) AS "fingerprint"
    FROM "FinancialEvent" fe
    LEFT JOIN "ImportedRow" ir ON ir."eventId" = fe."id"
    WHERE fe."userId" = ${userId} AND fe."archivedAt" IS NULL
  `;

  const result = rows[0];
  if (!result || typeof result.fingerprint !== 'string' ||
      !/^[a-f0-9]{32}$/.test(result.fingerprint)) {
    throw new Error('FINANCIAL_HISTORY_REVISION_UNAVAILABLE');
  }
  return `history-v1:${result.activeCount.toString()}:${result.fingerprint}`;
}
