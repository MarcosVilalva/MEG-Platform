import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');
const component = read('apps/web/src/meg-web-evolution/auth/LoadingScreen.tsx');
const css = read('apps/web/src/meg-web-evolution/auth/loading.css');
const preview = read('apps/web/visual-sequence/entry.tsx');
const grid = read('apps/web/src/meg-web-evolution/datagrid/DataGrid.tsx');
const login = read('apps/web/src/meg-web-evolution/auth/LoginScreen.tsx');
const loginCss = read('apps/web/src/meg-web-evolution/auth/login.css');
const createAccount = read('apps/web/src/meg-web-evolution/auth/CreateAccountScreen.tsx');
const authLayout = read('apps/web/src/meg-web-evolution/auth/AuthScreenLayout.tsx');

assert.match(component, /role="progressbar"/);
assert.match(component, /aria-valuenow=\{value\}/);
assert.match(component, /Progresso ilustrativo/);
assert.match(component, /aria-live="polite"/);
assert.doesNotMatch(component, /loading-master\.png|financeClient|createEvent|authClient\.login/);
assert.match(css, /visual-loading\/loading-fullbleed-cinematic\.webp/);
assert.match(component, /logo-transparent\.webp/);
assert.match(component, /meg-loading-stage/);
assert.doesNotMatch(component, /<picture|scene-mobile\.webp|scene-desktop\.webp/);
assert.doesNotMatch(css, /meg-loading-illustration|meg-loading-scene/);
assert.match(css, /background-size: 100% 100%, auto 100%/);
assert.match(preview, /durationMs = 4500/);
assert.match(preview, /percentage = Math\.min\(100, Math\.floor/);
assert.match(preview, /progress !== 100/);
assert.match(preview, /setTimeout\(\(\) => setScreen\('login'\), 550\)/);
assert.match(preview, /disabled=\{progress < 100\}/);
assert.doesNotMatch(preview, /setTimeout\(\(\) => setScreen\('login'\), 4500\)/);
assert.doesNotMatch(css, /meg-loading-illustrative/);
assert.match(preview, /onClick=\{goToLogin\}/);
assert.match(preview, /onClick=\{reviewLoading\}/);
assert.match(preview, /requestedView !== 'login' && requestedView !== 'carregamento'/);
assert.ok(existsSync('apps/web/public/meg-web-evolution/visual-loading/loading-fullbleed-cinematic.webp'));
assert.ok(existsSync('apps/web/public/meg-web-evolution/visual-loading/logo-transparent.webp'));
assert.match(css, /max-width: 1024px/);
assert.match(css, /max-width: 639px/);
assert.match(preview, /<LoadingScreen preview progress=\{progress\}/);
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
assert.match(preview, /requestedView !== 'carregamento'/);
assert.match(loginCss, /login-background\.webp/);
assert.ok(existsSync('apps/web/public/meg-web-evolution/login-background.webp'),
  'Fundo oficial em WebP ausente');
assert.match(createAccount, /previewOnly\?: boolean/);
assert.match(createAccount, /if \(previewOnly\) \{/);
assert.ok(createAccount.indexOf('if (previewOnly) {') < createAccount.indexOf('await register('),
  'O cadastro de preview deve bloquear a API antes de enviar quaisquer dados.');
assert.match(createAccount, /await register\(/);
assert.match(createAccount, /type === 'REQUEST_ACCESS'/);
assert.match(createAccount, /type === 'CREATE_WORKSPACE'/);
assert.match(createAccount, /password !== confirmPassword/);
assert.match(createAccount, /autoComplete=\{previewOnly \? 'off' : 'new-password'\}/);
assert.match(createAccount, /onNavigateLogin/);
assert.match(authLayout, /meg-web-evolution\/visual-loading\/logo\.webp/);
assert.match(preview, /<CreateAccountScreen previewOnly/);
assert.match(preview, /destination === 'create-account'/);
assert.match(preview, /requestedView === 'cadastro'/);
assert.match(preview, /screen === 'loading' && progress !== 100/);
assert.doesNotMatch(preview, /register\(|fetch\(|axios\./);
console.log('MEG visual: fluxo Loading 100% → Login → Criar Conta, bloqueio de API, regras de cadastro e DataGrid preservados OK.');
