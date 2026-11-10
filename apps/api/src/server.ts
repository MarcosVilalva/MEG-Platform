import Fastify from 'fastify';
import cors from '@fastify/cors';
import compress from '@fastify/compress';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { prisma } from '@meg/database';
import { config } from './config';
import { registerSecurityHeaders } from './security';
import { isAllowedOrigin, isStage09PreviewRequestAllowed } from './cors';
import { registerAuth } from './plugins/auth';
import { authRoutes } from './modules/auth/routes';
import { financeRoutes } from './modules/finance/routes';
import { financeBulkMutationRoutes } from './modules/finance/event-bulk-routes';
import { financeCommitmentForecastRoutes } from './modules/finance/commitment-forecast-routes';
import { financeBenefitEventRoutes } from './modules/finance/benefit-event-routes';
import { receivableRoutes } from './modules/receivables/routes';
import { cardRoutes } from './modules/cards/routes';
import { cardManagementRoutes } from './modules/cards/management-routes';
import { cardStatementReopenRoutes } from './modules/cards/statement-reopen-routes';
import { cardStatementLifecycleRoutes } from './modules/cards/statement-lifecycle-routes';
import { migrateLegacyCardsForAllWorkspaces } from './modules/cards/service';
import { payableRoutes } from './modules/payables/routes';
import { materializeRecurringExpenses } from './modules/payables/service';
import { repairLegacyImportedEvents } from './modules/imports/repair';
import { appStateRoutes } from './modules/app-state/routes';
import { notificationRoutes } from './modules/notifications/routes';
import { advisorRoutes } from './modules/notifications/advisor-routes';
import { platformAdminRoutes } from './modules/platform-admin/routes';
import { ensureCommercialFoundation } from './modules/platform-admin/service';
import { integrationRoutes } from './modules/integrations/routes';
import { refreshCommercialBillingStatuses } from './modules/billing/service';
import { ensurePrimaryWorkspace } from './modules/workspaces/service';
import {
  activateNormalizationPrimary,
  getNormalizationRuntimeStatus,
  normalizationPreview,
  recordNormalizationRuntimeStatus,
} from './modules/app-state/normalization-migration';
import { reconcilePrimaryAppStateFromNormalized } from './modules/app-state/normalized-primary-writeback';
import { needsDeepNormalizationAudit, sameNormalizationAuditStamp, type NormalizationAuditStamp } from './modules/app-state/normalization-audit-gate';

const app = Fastify({
  bodyLimit: 25 * 1024 * 1024,
  logger: {
    level: config.logLevel
  }
});

let dataRepair: { status: 'pending' | 'completed'; scanned: number; repaired: number; issues: number } = {
  status: 'pending', scanned: 0, repaired: 0, issues: 0
};

registerSecurityHeaders(app);

// A prévia Web 09 só pode consultar dados e manter sessões. Nenhum writer
// financeiro é atendido a partir dessa origem. Regras existentes intactas
// para Web publicada e Android; autenticação e workspace são obrigatórios.
app.addHook('onRequest', async (request, reply) => {
  if (!isStage09PreviewRequestAllowed(request.headers.origin, request.method, request.url)) {
    return reply.code(405).send({ error: 'STAGE09_PREVIEW_READ_ONLY' });
  }
});

await app.register(cors, {
  origin(origin, callback) {
    if (isAllowedOrigin(origin, config.corsOrigins)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origin not allowed by CORS'), false);
  },
  credentials: true
});

// O estado financeiro pode conter milhares de lançamentos. A compressão reduz
// drasticamente o volume transferido para a web e para o aplicativo Android.
await app.register(compress, {
  global: true,
  threshold: 1024
});

if (!config.isProduction) {
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'MEG Platform API',
        description: 'API da MEG Platform — Project Phoenix',
        version: '1.3.0'
      }
    }
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs'
  });
}

await registerAuth(app);

app.get('/health', async (_request, reply) => {
  const normalization = getNormalizationRuntimeStatus();
  reply.header('Cache-Control', 'no-store');
  return {
    status: 'ok',
    financialReady: normalization.status === 'completed' && normalization.primary && normalization.reconciled,
  };
});

app.get('/ready', async (_request, reply) => {
  reply.header('Cache-Control', 'no-store');
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ready' };
  } catch (error) {
    app.log.error(error, 'Database readiness check failed');
    return reply.status(503).send({ status: 'unavailable' });
  }
});

await app.register(authRoutes, { prefix: '/auth' });
await app.register(financeRoutes, { prefix: '/finance' });
await app.register(financeBulkMutationRoutes, { prefix: '/finance' });
await app.register(financeCommitmentForecastRoutes, { prefix: '/finance' });
await app.register(financeBenefitEventRoutes, { prefix: '/finance' });
await app.register(receivableRoutes, { prefix: '/receivables' });
await app.register(cardRoutes, { prefix: '/cards' });
await app.register(cardStatementReopenRoutes, { prefix: '/cards' });
await app.register(cardStatementLifecycleRoutes, { prefix: '/cards' });
await app.register(cardManagementRoutes, { prefix: '/cards-management' });
await app.register(payableRoutes, { prefix: '/payables' });
await app.register(appStateRoutes, { prefix: '/app-state' });
await app.register(notificationRoutes, { prefix: '/notifications' });
await app.register(advisorRoutes, { prefix: '/notifications' });
await app.register(platformAdminRoutes, { prefix: '/platform-admin' });
await app.register(integrationRoutes, { prefix: '/integrations' });

const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'Graceful shutdown started');
  await app.close();
  process.exit(0);
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

try {
  await app.listen({ port: config.port, host: config.host });
  // Abra a porta HTTP primeiro: health/login não devem esperar rotinas de
  // manutenção, principalmente depois de um cold start do plano gratuito.
  void Promise.all([
    ensureCommercialFoundation(),
    refreshCommercialBillingStatuses()
  ]).catch((error) => app.log.error(error, 'Background commercial maintenance failed'));

  async function runFinancialMaintenance(label: string) {
    const [recurring, cards] = await Promise.all([
      materializeRecurringExpenses(),
      migrateLegacyCardsForAllWorkspaces(),
    ]);
    if (label === 'startup' || recurring.processed || recurring.created || cards.created) {
      app.log.info({ recurring, cards, label }, 'Financial compatibility maintenance completed');
    }
  }

  void runFinancialMaintenance('startup')
    .catch((error) => app.log.error(error, 'Financial compatibility startup maintenance failed'));

  let financialMaintenanceRunning = false;
  const financialMaintenanceTimer = setInterval(() => {
    if (financialMaintenanceRunning) return;
    financialMaintenanceRunning = true;
    void runFinancialMaintenance('periodic')
      .catch((error) => app.log.error(error, 'Financial compatibility periodic maintenance failed'))
      .finally(() => { financialMaintenanceRunning = false; });
  }, 6 * 60 * 60 * 1000);
  financialMaintenanceTimer.unref();

  void ensurePrimaryWorkspace()
    .then(async (workspace) => {
      if (!workspace) return null;
      await reconcilePrimaryAppStateFromNormalized(workspace.id);
      let result: Awaited<ReturnType<typeof activateNormalizationPrimary>> | null = null;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          result = await activateNormalizationPrimary(workspace.id, workspace.ownerId, { automatic: true });
          break;
        } catch (error) {
          const retryable = error instanceof Error && error.message === 'NORMALIZATION_REVISION_CONFLICT';
          if (!retryable || attempt === 3) throw error;
          await new Promise((resolve) => setTimeout(resolve, attempt * 500));
        }
      }
      if (!result) throw new Error('NORMALIZATION_ACTIVATION_EMPTY_RESULT');
      const blockedByRollback = Boolean('blockedByRollback' in result && result.blockedByRollback);
      recordNormalizationRuntimeStatus({
        status: blockedByRollback ? 'rollback-protected' : result.primary ? 'completed' : 'fallback',
        primary: result.primary,
        reconciled: result.reconciled,
        count: result.normalized.count,
        reason: blockedByRollback ? 'ADMIN_ROLLBACK' : result.primary ? null : 'NORMALIZED_PRIMARY_INACTIVE',
      });
      app.log.info({
        mode: result.mode,
        reconciled: result.reconciled,
        count: result.normalized.count,
        fingerprint: result.normalized.fingerprint,
        blockedByRollback,
      }, 'Normalized financial source startup check completed');
      return result;
    })
    .catch((error) => {
      recordNormalizationRuntimeStatus({ status: 'fallback', primary: false, reconciled: false, count: 0, reason: error instanceof Error ? error.message : 'NORMALIZATION_STARTUP_FAILED' });
      app.log.error(error, 'Normalized financial source remained on AppState fallback');
    });
  // Pulso leve de 15 minutos. O fingerprint completo continua obrigatório após
  // qualquer alteração observável e a cada 2 horas, mesmo sem alterações.
  // Nunca suprimir a auditoria quando houver divergência ou erro.
  let normalizationAuditRunning = false;
  let lastDeepAuditStamp: NormalizationAuditStamp | null = null;
  let lastDeepAuditAtMs: number | null = null;
  async function normalizationAuditStamp(workspaceId: string): Promise<NormalizationAuditStamp> {
    const [appState, events] = await Promise.all([
      prisma.appState.findUnique({ where: { workspaceId }, select: { revision: true, updatedAt: true } }),
      prisma.financialEvent.aggregate({
        where: { workspaceId, legacyTransactionId: { not: null }, archivedAt: null },
        _count: { _all: true },
        _max: { updatedAt: true },
      }),
    ]);
    return {
      workspaceId,
      stateRevision: appState?.revision ?? null,
      stateUpdatedAt: appState?.updatedAt.toISOString() ?? null,
      activeEventCount: events._count._all,
      latestEventUpdatedAt: events._max.updatedAt?.toISOString() ?? null,
    };
  }
  const normalizationAuditTimer = setInterval(() => {
    if (normalizationAuditRunning) return;
    normalizationAuditRunning = true;
    void ensurePrimaryWorkspace()
      .then(async (workspace) => {
        if (!workspace) throw new Error('NORMALIZATION_SOURCE_NOT_FOUND');
        const before = await normalizationAuditStamp(workspace.id);
        const lastRuntime = getNormalizationRuntimeStatus();
        const stableRuntime = lastRuntime.status === 'completed' || lastRuntime.status === 'rollback-protected';
        if (stableRuntime && !needsDeepNormalizationAudit(before, lastDeepAuditStamp, lastDeepAuditAtMs, Date.now())) {
          return; // Divergência/fallback nunca é dispensada por marcador inalterado.
        }

        // Contrato financeiro original: executar a comparação integral de
        // fingerprints com a mesma função que já valida reconciliação e rollback.
        const preview = await normalizationPreview(workspace.id, workspace.ownerId);
        const after = await normalizationAuditStamp(workspace.id);
        if (!sameNormalizationAuditStamp(before, after)) {
          // Alteração concorrente: não registrar um resultado como definitivo.
          // Sem cache de erro: o próximo pulso repetirá a checagem integral.
          app.log.warn('Periodic normalized financial audit saw concurrent changes; full check required next pulse');
          return;
        }
        if (preview.mode === 'app-state-rollback') {
          recordNormalizationRuntimeStatus({ status: 'rollback-protected', primary: false, reconciled: preview.reconciled, count: preview.normalized.count, reason: 'ADMIN_ROLLBACK' });
        } else if (!preview.primary || !preview.reconciled) {
          recordNormalizationRuntimeStatus({ status: 'fallback', primary: false, reconciled: false, count: preview.normalized.count, reason: 'PERIODIC_RECONCILIATION_FAILED' });
          app.log.warn({ sourceCount: preview.source.validCount, normalizedCount: preview.normalized.count }, 'Periodic normalized financial source audit detected a divergence');
          return; // Divergências continuam sendo rechecadas a cada 15 minutos.
        } else {
          recordNormalizationRuntimeStatus({ status: 'completed', primary: true, reconciled: true, count: preview.normalized.count, reason: null });
        }
        lastDeepAuditStamp = after;
        lastDeepAuditAtMs = Date.now();
      })
      .catch((error) => {
        lastDeepAuditStamp = null;
        lastDeepAuditAtMs = null;
        recordNormalizationRuntimeStatus({ status: 'fallback', primary: false, reconciled: false, reason: error instanceof Error ? error.message : 'PERIODIC_NORMALIZATION_AUDIT_FAILED' });
        app.log.error(error, 'Periodic normalized financial source audit failed');
      })
      .finally(() => { normalizationAuditRunning = false; });
  }, 15 * 60 * 1000);
  normalizationAuditTimer.unref();
  if (config.runLegacyRepair) {
    void repairLegacyImportedEvents()
      .then((repairResult) => {
        dataRepair = { status: 'completed', ...repairResult };
        app.log.info(dataRepair, 'Optional legacy import repair completed');
      })
      .catch((error) => {
        app.log.error(error, 'Optional legacy import repair failed without stopping the API');
      });
  } else {
    dataRepair = { status: 'completed', scanned: 0, repaired: 0, issues: 0 };
    app.log.info('Legacy import repair disabled; simple cloud state is authoritative');
  }
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
