/**
 * Inicialização comercial canônica para o banco descartável da PR #648.
 * IMPORTANTE: executar somente via scripts/meg-pr648-codespace-preview.mjs.
 * Não cria licença manualmente e não ignora controles da API.
 */
import { prisma } from '@meg/database';
import { ensureCommercialFoundation } from '../apps/api/src/modules/platform-admin/service';

const expected = 'postgresql://megpreview:megpreview-local@127.0.0.1:5548/meg_preview';

if (process.env.MEG_PR648_PREVIEW_LOCAL_DB !== '1'
  || process.env.DATABASE_URL !== expected
  || process.env.NODE_ENV !== 'development'
  || process.env.ADMIN_EMAIL !== 'preview-admin@meg.invalid') {
  console.error('Inicialização comercial bloqueada: ambiente não é o banco descartável da PR #648.');
  process.exit(1);
}

try {
  // Fluxo real: planos, administrador de plataforma e assinaturas ausentes.
  // Corrige apenas a ordem do bootstrap (a API pode iniciar antes do cadastro).
  await ensureCommercialFoundation();
  console.log('Licença de homologação configurada pela rotina comercial canônica.');
} catch (error) {
  console.error('Não foi possível inicializar a licença de homologação:', error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
