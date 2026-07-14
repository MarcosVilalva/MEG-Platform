import assert from 'node:assert/strict';
import { createTemporaryPassword, normalizeAccountEmail, passwordResetMessages } from './password-reset';

assert.equal(normalizeAccountEmail('  Usuario@Hotmail.com?  '), 'usuario@hotmail.com');
assert.equal(normalizeAccountEmail('usuario@hotmail.com'), 'usuario@hotmail.com');

const password = createTemporaryPassword(Buffer.from('0123456789abcdef', 'hex'));
assert.equal(password, 'Meg#0123456789ab9a');
assert.doesNotMatch(password, /[?？\s]/u);
assert.match(passwordResetMessages({ name: 'Usuário MEG' }, password).emailText, new RegExp(password));
assert.match(passwordResetMessages({ name: 'Usuário MEG' }, password, true).subject, /senha temporária/i);

console.log('MEG password reset tests passed.');
