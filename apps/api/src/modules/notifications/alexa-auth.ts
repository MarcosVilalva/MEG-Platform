import { createHmac, timingSafeEqual } from 'node:crypto';

export const ALEXA_SECRET_DERIVATION_CONTEXT = 'meg-alexa-skill-v1';

export function deriveAlexaSkillSecret(baseSecret: string) {
  const source = String(baseSecret || '').trim();
  if (!source) throw new Error('ALEXA_SECRET_BASE_REQUIRED');

  return createHmac('sha256', source)
    .update(ALEXA_SECRET_DERIVATION_CONTEXT)
    .digest('hex');
}

export function resolveAlexaSkillSecret(explicitSecret?: string, notificationCronSecret?: string) {
  const explicit = String(explicitSecret || '').trim();
  if (explicit) return explicit;

  const cron = String(notificationCronSecret || '').trim();
  return cron ? deriveAlexaSkillSecret(cron) : undefined;
}

export function alexaSecretsMatch(provided: string | undefined, expected: string | undefined) {
  const left = Buffer.from(String(provided || ''), 'utf8');
  const right = Buffer.from(String(expected || ''), 'utf8');
  if (!left.length || left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
