import assert from 'node:assert/strict';
import {
  createPasswordResetToken,
  createTemporaryPassword,
  normalizeAccountEmail,
  passwordResetLink,
  passwordResetLinkMessages,
  passwordResetMessages
} from './password-reset';

assert.equal(normalizeAccountEmail('  Usuario@Hotmail.com?  '), 'usuario@hotmail.com');
assert.equal(normalizeAccountEmail('usuario@hotmail.com'), 'usuario@hotmail.com');

const password = createTemporaryPassword(Buffer.from('0123456789abcdef', 'hex'));
assert.equal(password, 'Meg#0123456789ab9a');
assert.doesNotMatch(password, /[?？\s]/u);
assert.match(passwordResetMessages({ name: 'Usuário MEG' }, password).emailText, new RegExp(password));
assert.match(passwordResetMessages({ name: 'Usuário MEG' }, password, true).subject, /senha temporária/i);

const reset = createPasswordResetToken(Buffer.alloc(32, 7));
assert.ok(reset.token.length >= 32);
assert.match(reset.tokenHash, /^[a-f0-9]{64}$/);
assert.notEqual(reset.token, reset.tokenHash, 'Token bruto nunca deve ser persistido como hash.');
const link = passwordResetLink(reset.token);
assert.match(link, /^https:\/\/marcosvilalva\.github\.io\/MEG-Platform\/evolution\.html#reset=/);
assert.ok(link.includes(encodeURIComponent(reset.token)));
const messages = passwordResetLinkMessages({ name: 'Usuário MEG' }, link);
assert.match(messages.emailText, /20 minutos/);
assert.match(messages.emailText, /uma vez/i);
assert.ok(messages.emailText.includes(link));
assert.doesNotMatch(messages.emailText, /senha temporária/i);

console.log('MEG password reset tests passed.');
