import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routes = readFileSync(new URL('./routes.ts', import.meta.url), 'utf8');
const evolutionLogin = readFileSync(new URL('../../../web/src/evolution/screens/EvolutionLogin.tsx', import.meta.url), 'utf8');
const legacyLogin = readFileSync(new URL('../../../web/src/modules/auth/LoginScreen.tsx', import.meta.url), 'utf8');

const forgotRoute = routes.match(/app\.post\('\/forgot-password'[\s\S]*?\n  \}\);/u)?.[0] || '';

assert.ok(forgotRoute, 'Rota /forgot-password deve existir.');
assert.match(forgotRoute, /reply\.status\(202\)/, 'Recuperação deve responder genericamente com 202.');
assert.doesNotMatch(forgotRoute, /ACCOUNT_NOT_FOUND|ACCESS_PENDING|ACCESS_REJECTED|USER_BLOCKED|PASSWORD_RESET_RATE_LIMITED|NOTIFICATION_DELIVERY_FAILED/u,
  'Recuperação pública não deve revelar estado ou existência da conta.');
assert.match(forgotRoute, /notifications:\s*\[\]/, 'Resposta pública não deve expor detalhes de entrega.');

for (const source of [evolutionLogin, legacyLogin]) {
  assert.match(source, /Se existir uma conta ativa para este e-mail/u,
    'Interface deve usar mensagem neutra de recuperação.');
}

console.log('Contrato anti-enumeração da recuperação de senha validado.');
