import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import {
  ALEXA_SECRET_DERIVATION_CONTEXT,
  alexaSecretsMatch,
  deriveAlexaSkillSecret
} from './alexa-auth';

const base = 'cron-secret-com-mais-de-24-caracteres';
const expected = createHmac('sha256', base)
  .update(ALEXA_SECRET_DERIVATION_CONTEXT)
  .digest('hex');

assert.equal(deriveAlexaSkillSecret(base), expected, 'a derivação deve ser estável e idêntica ao pipeline');
assert.notEqual(deriveAlexaSkillSecret(base), base, 'o segredo bruto não pode ser reutilizado pela Lambda');
assert.equal(deriveAlexaSkillSecret(base).length, 64, 'o HMAC SHA-256 em hexadecimal deve ter 64 caracteres');

assert.notEqual(
  deriveAlexaSkillSecret('base-um-com-mais-de-24-caracteres'),
  deriveAlexaSkillSecret('base-dois-com-mais-de-24-caracteres'),
  'bases diferentes devem gerar credenciais diferentes'
);

const secret = deriveAlexaSkillSecret('base-valida-com-mais-de-24-caracteres');
assert.equal(alexaSecretsMatch(secret, secret), true, 'credencial correta deve ser aceita');
assert.equal(alexaSecretsMatch(`${secret}x`, secret), false, 'credencial de tamanho diferente deve ser rejeitada');
assert.equal(alexaSecretsMatch(undefined, secret), false, 'credencial ausente deve ser rejeitada');

console.log('Alexa auth tests: OK');
