import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routes = readFileSync(new URL('./routes.ts', import.meta.url), 'utf8');
const service = readFileSync(new URL('./service.ts', import.meta.url), 'utf8');
const reset = readFileSync(new URL('./password-reset.ts', import.meta.url), 'utf8');
const schema = readFileSync(new URL('../../../../database/prisma/schema.prisma', import.meta.url), 'utf8');

assert.match(schema, /passwordResetTokenHash\s+String\?\s+@unique/);
assert.match(schema, /passwordResetExpiresAt\s+DateTime\?/);
assert.match(schema, /passwordResetRequestedAt\s+DateTime\?/);

assert.match(routes, /app\.post\('\/forgot-password'[\s\S]*status:\s*'RESET_LINK_REQUESTED'/,
  'Forgot-password deve responder genericamente, sem confirmar existência da conta.');
assert.doesNotMatch(routes, /forgot-password[\s\S]{0,1800}ACCOUNT_NOT_FOUND/,
  'Forgot-password não pode voltar a enumerar contas.');
assert.match(routes, /app\.post\('\/reset-password'[\s\S]*authRateLimiters\.resetPassword/,
  'Consumo do reset deve possuir rate limit próprio.');
assert.match(routes, /resetPasswordSchema[\s\S]*PASSWORDS_DO_NOT_MATCH/,
  'Nova senha precisa de confirmação no servidor.');

assert.match(service, /requestPasswordReset[\s\S]*PASSWORD_RESET_LINK_REQUESTED/,
  'Solicitação deve ser auditada como link, não troca imediata de senha.');
const requestStart = service.indexOf('export async function requestPasswordReset');
const requestEnd = service.indexOf('export async function consumePasswordResetToken', requestStart);
const requestBlock = service.slice(requestStart, requestEnd);
assert.doesNotMatch(requestBlock, /passwordHash\s*[,}]/,
  'Solicitar recuperação não pode alterar a senha atual.');
assert.doesNotMatch(requestBlock, /authSession\.updateMany/,
  'Solicitar recuperação não deve derrubar sessões antes do uso do link.');

assert.match(service, /consumePasswordResetToken[\s\S]*passwordResetTokenHash:\s*tokenHash[\s\S]*passwordResetExpiresAt:\s*\{\s*gt:\s*now\s*\}/,
  'Token deve ser validado por hash e expiração.');
assert.match(service, /consumePasswordResetToken[\s\S]*updateMany[\s\S]*consumed\.count !== 1/,
  'Consumo do token deve ser atômico e de uso único.');
assert.match(service, /PASSWORD_RESET_LINK_CONSUMED/,
  'Consumo bem-sucedido deve gerar auditoria.');
assert.match(service, /authSession\.updateMany[\s\S]*revokedAt:\s*now/,
  'Troca efetiva de senha deve revogar sessões existentes.');

assert.match(reset, /createHash\('sha256'\)/,
  'Token bruto não deve ser persistido.');
assert.match(reset, /evolution\.html#reset=/,
  'Token deve viajar no fragmento da URL, não em query string enviada ao servidor.');

console.log('Contrato de recuperação de senha por link seguro validado.');
