import Fastify from 'fastify';
import cors from '@fastify/cors';
import compress from '@fastify/compress';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { config } from './config';
import { isAllowedOrigin } from './cors';
import { registerAuth } from './plugins/auth';
import { authRoutes } from './modules/auth/routes';
import { financeRoutes } from './modules/finance/routes';
import { receivableRoutes } from './modules/receivables/routes';
import { cardRoutes } from './modules/cards/routes';
import { payableRoutes } from './modules/payables/routes';
import { repairLegacyImportedEvents } from './modules/imports/repair';
import { appStateRoutes } from './modules/app-state/routes';
import { notificationRoutes } from './modules/notifications/routes';
import { notificationIntegrationStatus } from './modules/notifications/service';

const app = Fastify({
  bodyLimit: 25 * 1024 * 1024,
  logger: {
    level: config.logLevel
  }
});

let dataRepair: { status: 'pending' | 'completed'; scanned: number; repaired: number; issues: number } = {
  status: 'pending', scanned: 0, repaired: 0, issues: 0
};

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

await registerAuth(app);

app.get('/health', async () => ({
  status: 'ok',
  service: 'meg-api',
  version: '1.3.0-project-phoenix',
  environment: config.nodeEnv,
  timestamp: new Date().toISOString(),
  features: ['legacy-ui', 'cloud-state', 'xlsx-import', 'email-reminders', 'whatsapp-reminders'],
  integrations: notificationIntegrationStatus(),
  commit: process.env.RENDER_GIT_COMMIT || 'local',
  dataRepair
}));

await app.register(authRoutes, { prefix: '/auth' });
await app.register(financeRoutes, { prefix: '/finance' });
await app.register(receivableRoutes, { prefix: '/receivables' });
await app.register(cardRoutes, { prefix: '/cards' });
await app.register(payableRoutes, { prefix: '/payables' });
await app.register(appStateRoutes, { prefix: '/app-state' });
await app.register(notificationRoutes, { prefix: '/notifications' });

const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'Graceful shutdown started');
  await app.close();
  process.exit(0);
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

try {
  await app.listen({ port: config.port, host: config.host });
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
