import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const base = dirname(fileURLToPath(import.meta.url));
const login = readFileSync(resolve(base, 'LoginScreen.tsx'), 'utf8');
const css = readFileSync(resolve(base, 'login.css'), 'utf8');
const main = readFileSync(resolve(base, '../main.tsx'), 'utf8');

for (const field of [
  'onAuthenticated', 'onNavigate', 'name="email"', 'name="password"',
  'autoComplete="username"', 'autoComplete="current-password"', 'Lembrar meu e-mail',
  'Esqueci minha senha', 'Entrar no MEG', 'Criar conta', 'aria-live="polite"',
  'aria-pressed={passwordVisible}', 'data-meg-login="stage05"',
]) assert.ok(login.includes(field), `Contrato de login ausente: ${field}`);
assert.match(login, /import\s*\{\s*login\s*\}\s*from\s*'\.\.\/\.\.\/app\/auth-client'/);
assert.match(login, /await login\(normalizedEmail, password\)/);
assert.doesNotMatch(login, /localStorage\.setItem\([^,]+,\s*password\)/);
assert.match(login, /setPassword\(''\)/);
assert.match(css, /@media \(max-width: 639px\)/);
assert.match(css, /@media \(max-height: 700px\)/);
assert.match(css, /prefers-reduced-motion/);
assert.match(css, /:focus-visible/);
assert.match(css, /min-height:\s*100dvh/);
assert.match(css, /overflow-x:\s*clip/);
assert.ok(main.includes("import { LoginScreen } from './auth/LoginScreen'"));
assert.ok(main.includes('readSession'));
assert.match(css, /login-background\.webp/);
assert.match(css, /login-background@2x\.webp/);
assert.match(css, /image-set\(/);
assert.match(css, /\.meg-login-logo[^}]*filter:\s*none/);
for (const source of [login, css, main]) {
  for (const forbidden of ['evolution.html', 'EvolutionLogin', 'EvolutionLoading', 'loading-master.webp', '/phoenix/', '/mobile/', 'legacy-finance']) {
    assert.equal(source.includes(forbidden), false, `Isolamento violado: ${forbidden}`);
  }
}
console.log('Etapa 05: contrato isolado do Login aprovado.');
