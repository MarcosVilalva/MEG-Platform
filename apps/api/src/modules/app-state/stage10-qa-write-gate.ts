/**
 * Gate somente para trabalho funcional QA, nao para publicar novo writer.
 * O navegador e o servidor verificam isolamento, o ultimo e a autoridade.
 */
export const MEG_STAGE10_QA_WRITE_PROTOCOL = 'meg-stage10-qa-transactional-mirror-v1';

/**
 * Exercício de compatibilidade de dois clientes, exclusivamente no banco
 * sintético de teste. Nunca abre o espelho em QA persistente ou produção.
 * É uma autorização adicional à configuração do writer de histórico, não
 * uma permissão de execução em outros bancos.
 */
export function stage10UnificationSyntheticMirrorEnabled() {
  if (process.env.MEG_STAGE10_UNIFICATION_SYNTHETIC_MIRROR !== '1'
    || process.env.MEG_STAGE10_HISTORICAL_DISPOSABLE_WRITE_TEST !== '1') return false;
  try {
    const uri = new URL(process.env.DATABASE_URL || '');
    return uri.protocol === 'postgresql:'
      && uri.hostname === '127.0.0.1'
      && uri.port === '55459'
      && uri.pathname === '/meg_stage10_pt63_disposable'
      && decodeURIComponent(uri.username) === 'meg_stage10_pt63_writer'
      && uri.password.length >= 30
      && !uri.searchParams.has('host')
      && !uri.searchParams.has('sslmode');
  } catch { return false; }
}

export function stage10QaWebWriteEnabled() {
  if (process.env.MEG_STAGE10_WEB_WRITE_QA !== '1'
    || process.env.MEG_STAGE10_ISOLATED_PG !== '1') return false;
  try {
    const uri = new URL(process.env.DATABASE_URL || '');
    return uri.hostname === '127.0.0.1'
      && uri.pathname === '/meg_stage10_sandbox'
      && uri.username === 'meg_stage10_ci';
  } catch { return false; }
}
