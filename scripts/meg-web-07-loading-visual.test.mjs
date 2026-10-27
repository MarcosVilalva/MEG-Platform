import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');
const component = read('apps/web/src/meg-web-evolution/auth/LoadingScreen.tsx');
const css = read('apps/web/src/meg-web-evolution/auth/loading.css');
const preview = read('apps/web/visual-sequence/entry.tsx');
const grid = read('apps/web/src/meg-web-evolution/datagrid/DataGrid.tsx');
const login = read('apps/web/src/meg-web-evolution/auth/LoginScreen.tsx');
const loginCss = read('apps/web/src/meg-web-evolution/auth/login.css');

assert.match(component, /role="progressbar"/);
assert.match(component, /aria-valuenow=\{preview \? undefined : value\}/);
assert.match(component, /aria-live="polite"/);
assert.doesNotMatch(component, /loading-master\.png|financeClient|createEvent|authClient\.login/);
assert.match(css, /visual-loading\/ambient\.webp/);
assert.match(component, /<picture className="meg-loading-scene"/);
assert.match(component, /scene-desktop\.webp/);
assert.match(component, /scene-mobile\.webp/);
assert.match(preview, /setTimeout\(\(\) => setScreen\('login'\), 4500\)/);
assert.match(preview, /onClick=\{goToLogin\}/);
assert.match(preview, /onClick=\{reviewLoading\}/);
assert.match(preview, /requestedView !== 'login' && requestedView !== 'carregamento'/);
assert.ok(existsSync('apps/web/public/meg-web-evolution/visual-loading/scene-desktop.webp'));
assert.ok(existsSync('apps/web/public/meg-web-evolution/visual-loading/scene-mobile.webp'));
assert.match(css, /max-width: 1024px/);
assert.match(css, /max-width: 639px/);
assert.match(preview, /<LoadingScreen preview progress=\{0\}/);
assert.doesNotMatch(preview, /financeClient|authenticatedRequest|localStorage|createEvent/);
for(const file of ['ambient', 'hologram', 'logo']) {
  assert.ok(existsSync('apps/web/public/meg-web-evolution/visual-loading/'+file+'.webp'), file+' WebP not found');
}
assert.match(grid, /export function DataGrid/);
assert.match(login, /previewOnly\?: boolean/);
assert.match(login, /if \(previewOnly\) \{/);
assert.ok(login.indexOf('if (previewOnly) {') < login.indexOf('await login(normalizedEmail, password)'),
  'Preview deve retornar antes de qualquer requisição de login');
assert.match(login, /await login\(normalizedEmail, password\)/);
assert.match(login, /onNavigate\('recover-password'\)/);
assert.match(login, /onNavigate\('create-account'\)/);
assert.match(login, /visual-loading\/logo\.webp/);
assert.match(login, /autoComplete=\{previewOnly \? "off" : "current-password"\}/);
assert.match(preview, /<LoginScreen previewOnly/);
assert.match(preview, /view === 'carregamento'/);
assert.match(loginCss, /login-background\.webp/);
assert.ok(existsSync('apps/web/public/meg-web-evolution/login-background.webp'),
  'Fundo oficial em WebP ausente');
console.log('MEG visual: artes desktop/mobile, encadeamento Loading → Login, isolamento de autenticação e DataGrid preservado OK.');
