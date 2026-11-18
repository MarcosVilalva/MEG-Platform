/**
 * Gate somente para trabalho funcional QA, nao para publicar novo writer.
 * O navegador e o servidor verificam isolamento, o ultimo e a autoridade.
 */
export const MEG_STAGE10_QA_WRITE_PROTOCOL = 'meg-stage10-qa-transactional-mirror-v1';

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
