import type { FastifyInstance } from 'fastify';
import { config } from '../../config';
import { alexaSecretsMatch } from './alexa-auth';
import { alexaFinancialAdvice, type AlexaAdvisorIntent, type AlexaAdvisorQuery } from './financial-advisor';

export async function advisorRoutes(app: FastifyInstance) {
  app.post('/alexa/advisor', async (request, reply) => {
    const providedSecret = Array.isArray(request.headers['x-alexa-skill-secret'])
      ? request.headers['x-alexa-skill-secret'][0]
      : request.headers['x-alexa-skill-secret'];
    const validExplicitSecret = alexaSecretsMatch(providedSecret, config.alexaSkillSecret);
    const validDerivedSecret = alexaSecretsMatch(providedSecret, config.alexaDerivedSkillSecret);
    if (!validExplicitSecret && !validDerivedSecret) {
      return reply.status(401).send({ error: 'INVALID_ALEXA_SKILL_SECRET' });
    }

    const body = (request.body || {}) as { intent?: AlexaAdvisorIntent; query?: AlexaAdvisorQuery };
    const allowed: AlexaAdvisorIntent[] = [
      'financial-analysis',
      'financial-risk',
      'savings-opportunities',
      'spending-analysis',
      'cash-margin',
      'scenario-by-date'
    ];
    const intent = allowed.includes(body.intent as AlexaAdvisorIntent)
      ? body.intent as AlexaAdvisorIntent
      : 'financial-analysis';
    const query: AlexaAdvisorQuery = {
      date: /^\d{4}-\d{2}-\d{2}$/.test(String(body.query?.date || '')) ? String(body.query?.date) : undefined
    };

    try {
      return await alexaFinancialAdvice(new Date(), intent, query);
    } catch (error) {
      if (error instanceof Error && error.message === 'ALEXA_OWNER_NOT_ACTIVE') {
        return reply.status(404).send({ error: error.message });
      }
      throw error;
    }
  });
}
