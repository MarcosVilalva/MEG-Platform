declare module '@fastify/swagger-ui' {
  import type { FastifyPluginAsync } from 'fastify';

  const swaggerUi: FastifyPluginAsync<Record<string, unknown>>;
  export default swaggerUi;
}
