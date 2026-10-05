import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

function fail(message) {
  console.error(`SECURITY CONTRACT FAILED: ${message}`);
  process.exitCode = 1;
}

function requireTokens(file, tokens) {
  const source = fs.readFileSync(file, 'utf8');
  for (const token of tokens) {
    if (!source.includes(token)) fail(`${file} não contém proteção obrigatória: ${token}`);
  }
  return source;
}

const server = requireTokens('apps/api/src/server.ts', [
  "registerSecurityHeaders(app)",
  "if (!config.isProduction)",
  "routePrefix: '/docs'",
]);

requireTokens('apps/api/src/modules/auth/routes.ts', [
  'authRateLimiters.register',
  'authRateLimiters.loginIp',
  'authRateLimiters.loginAccount',
  'authRateLimiters.forgotPasswordIp',
  'authRateLimiters.forgotPasswordAccount',
  'authRateLimiters.refresh',
]);

requireTokens('apps/api/src/security.ts', [
  "X-Content-Type-Options",
  "X-Frame-Options",
  "Content-Security-Policy",
  "Cache-Control",
  "RATE_LIMITED",
  "externalRateLimiters",
]);

const notificationRoutes = requireTokens('apps/api/src/modules/notifications/routes.ts', [
  "externalRateLimiters.automation",
  "externalRateLimiters.voice",
  "alexaSecretsMatch(providedCron, config.notificationCronSecret)",
]);

if (/===\s*config\.notificationCronSecret/.test(notificationRoutes)) {
  fail('Segredo de cron não pode usar comparação direta; use timing-safe comparison.');
}

requireTokens('apps/api/src/modules/notifications/advisor-routes.ts', [
  "externalRateLimiters.advisor",
]);

const productionSwaggerPattern = /if\s*\(\s*config\.isProduction\s*\)[\s\S]{0,500}register\(swagger/;
if (productionSwaggerPattern.test(server)) {
  fail('Swagger não pode ser habilitado explicitamente no bloco de produção.');
}

const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((file) => /\.(?:env|ya?ml|json|m?js|c?js|ts|tsx|md|html)$/i.test(file) || file === '.env.example');

const secretPatterns = [
  { name: 'private key', re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'GitHub token', re: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}\b/ },
  { name: 'GitHub fine-grained token', re: /\bgithub_pat_[A-Za-z0-9_]{40,}\b/ },
  { name: 'AWS access key', re: /\bAKIA[0-9A-Z]{16}\b/ },
];

for (const file of tracked) {
  let source;
  try {
    source = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  for (const pattern of secretPatterns) {
    if (pattern.re.test(source)) fail(`possível ${pattern.name} versionado em ${file}`);
  }

  const lines = source.split(/\r?\n/);
  lines.forEach((line, index) => {
    const match = line.match(/\b(VITE_[A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PRIVATE_KEY|API_KEY)[A-Z0-9_]*)\s*=\s*["']?([^\s"'#]*)/);
    if (!match) return;
    const value = match[2].trim();
    if (value && value !== 'disabled' && value !== 'enabled') {
      fail(`segredo potencialmente público em ${file}:${index + 1} (${match[1]})`);
    }
  });
}

if (process.exitCode) process.exit(process.exitCode);
console.log('Security contract: exposição, rate limiting, headers e secrets gate validados.');
