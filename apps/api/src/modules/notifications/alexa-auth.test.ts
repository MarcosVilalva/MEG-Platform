import { describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import {
  ALEXA_SECRET_DERIVATION_CONTEXT,
  alexaSecretsMatch,
  deriveAlexaSkillSecret,
  resolveAlexaSkillSecret
} from './alexa-auth';

describe('Alexa skill authentication', () => {
  it('deriva uma credencial estável e isolada do segredo de cron', () => {
    const base = 'cron-secret-com-mais-de-24-caracteres';
    const expected = createHmac('sha256', base)
      .update(ALEXA_SECRET_DERIVATION_CONTEXT)
      .digest('hex');

    expect(deriveAlexaSkillSecret(base)).toBe(expected);
    expect(deriveAlexaSkillSecret(base)).not.toBe(base);
    expect(deriveAlexaSkillSecret(base)).toHaveLength(64);
  });

  it('mantém compatibilidade com um segredo Alexa explícito', () => {
    expect(resolveAlexaSkillSecret('segredo-alexa-explicito', 'segredo-cron')).toBe('segredo-alexa-explicito');
  });

  it('usa o segredo de cron somente como origem da derivação', () => {
    const cron = 'outro-segredo-de-cron-com-mais-de-24-caracteres';
    expect(resolveAlexaSkillSecret(undefined, cron)).toBe(deriveAlexaSkillSecret(cron));
  });

  it('compara credenciais sem comparação textual direta', () => {
    const secret = deriveAlexaSkillSecret('base-valida-com-mais-de-24-caracteres');
    expect(alexaSecretsMatch(secret, secret)).toBe(true);
    expect(alexaSecretsMatch(`${secret}x`, secret)).toBe(false);
    expect(alexaSecretsMatch(undefined, secret)).toBe(false);
  });
});
