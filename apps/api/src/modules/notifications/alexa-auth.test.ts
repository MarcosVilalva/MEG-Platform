import { describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import {
  ALEXA_SECRET_DERIVATION_CONTEXT,
  alexaSecretsMatch,
  deriveAlexaSkillSecret
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

  it('produz credenciais diferentes para bases diferentes', () => {
    expect(deriveAlexaSkillSecret('base-um-com-mais-de-24-caracteres'))
      .not.toBe(deriveAlexaSkillSecret('base-dois-com-mais-de-24-caracteres'));
  });

  it('compara credenciais com timingSafeEqual', () => {
    const secret = deriveAlexaSkillSecret('base-valida-com-mais-de-24-caracteres');
    expect(alexaSecretsMatch(secret, secret)).toBe(true);
    expect(alexaSecretsMatch(`${secret}x`, secret)).toBe(false);
    expect(alexaSecretsMatch(undefined, secret)).toBe(false);
  });
});
