/**
 * Etapa 09, investigação isolada da issue #690.
 *
 * O GET /app-state conserva o mesmo contrato/objeto e todos os dados
 * financeiros. Apenas deixa de trafegar o estado inteiro pelo pooler quando
 * a assinatura integral do banco não mudou. NÃO usa TTL nem revision isolada:
 * alterações externas, arquivamentos e modificações de payload também contam.
 */
import { completeDatabaseSignature } from './normalization-periodic-audit';
import {
  normalizedStateForRead,
  recordNormalizationRuntimeStatus,
} from './normalization-migration';

type ReadResult = Awaited<ReturnType<typeof normalizedStateForRead>>;
type CacheEntry = {
  signature: string;
  value: NonNullable<ReadResult>;
};
const cache = new Map<string, CacheEntry>();
// Free Render: manter somente o último workspace e não fixar snapshots gigantes
// na memória. São limites técnicos, sem efeito sobre dados ou regras de negócio.
const MAX_CACHED_WORKSPACES = 1;
const MAX_CACHED_RESPONSE_BYTES = 10 * 1024 * 1024;

function reconciledPrimary(result: ReadResult): result is NonNullable<ReadResult> & {
  integrity: { reconciled: true; count: number };
} {
  return Boolean(
    result && result.normalizedPrimary &&
      'integrity' in result && result.integrity.reconciled === true,
  );
}

/**
 * Somente leitura. A autenticação e a autorização de workspace continuam
 * obrigatórias e são resolvidas PELO HANDLER antes desta função ser chamada.
 *
 * Sem assinatura, erro de SQL, divergência ou rollback, usa o read model
 * integral sem reutilizar nenhum resultado antigo.
 */
export async function cachedNormalizedStateForRead(
  workspaceId: string,
  ownerId: string,
): Promise<ReadResult> {
  const key = `${workspaceId}:${ownerId}`;
  let before: string | null = null;
  try {
    before = await completeDatabaseSignature(workspaceId);
  } catch {
    cache.delete(key);
    return normalizedStateForRead(workspaceId, ownerId);
  }

  const previous = cache.get(key);
  if (before !== null && previous?.signature === before) {
    // Preserva a observabilidade do caminho de leitura original.
    recordNormalizationRuntimeStatus({
      status: 'completed', primary: true, reconciled: true,
      count: previous.value.integrity && 'count' in previous.value.integrity
        ? Number(previous.value.integrity.count) : 0,
      reason: null,
    });
    return previous.value;
  }
  cache.delete(key);

  const result = await normalizedStateForRead(workspaceId, ownerId);
  if (!before || !reconciledPrimary(result)) return result;

  // Não adicionar cache quando houver escrita intercalada entre as duas
  // assinaturas e a reconstrução financeira original.
  try {
    const after = await completeDatabaseSignature(workspaceId);
    if (after !== before) return result;

    // Limite conservador de memória em vez de multiplicar snapshots por
    // usuário/workspace. Nenhum limite é imposto à resposta funcional.
    const responseBytes = Buffer.byteLength(JSON.stringify(result), 'utf8');
    if (responseBytes > MAX_CACHED_RESPONSE_BYTES) return result;

    cache.set(key, { signature: before, value: result });
    if (cache.size > MAX_CACHED_WORKSPACES) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
  } catch {
    cache.delete(key);
  }
  return result;
}
