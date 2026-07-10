import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { config } from './config';
import { registerAuth } from './plugins/auth';
import { authRoutes } from './modules/auth/routes';
import { financeRoutes } from './modules/finance/routes';

const app = Fastify({
  logger: {
    level: config.logLevel
  }
});

await app.register(cors, {
  origin(origin, callback) {
    if (!origin || config.corsOrigins.includes('*') || config.corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origin not allowed by CORS'), false);
  },
  credentials: true
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
  timestamp: new Date().toISOString()
}));

await app.register(authRoutes, { prefix: '/auth' });
await app.register(financeRoutes, { prefix: '/finance' });

const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'Graceful shutdown started');
  await app.close();
  process.exit(0);
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

try {
  await app.listen({ port: config.port, host: config.host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
