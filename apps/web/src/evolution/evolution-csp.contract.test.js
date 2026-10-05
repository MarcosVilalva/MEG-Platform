import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const vite = readFileSync(new URL('../../vite.config.ts', import.meta.url), 'utf8');
const html = readFileSync(new URL('../../evolution.html', import.meta.url), 'utf8');

assert.match(vite, /name:\s*'evolution-production-csp'/, 'CSP do Evolution deve existir no build.');
assert.match(vite, /apply:\s*'build'/, 'CSP deve ser injetada somente no build, sem atrapalhar desenvolvimento local.');
assert.match(vite, /default-src 'self'/, 'CSP deve negar origens por padrão.');
assert.match(vite, /script-src 'self'/, 'Scripts devem permanecer restritos à própria origem.');
assert.match(vite, /object-src 'none'/, 'Plugins/objects devem permanecer bloqueados.');
assert.match(vite, /connect-src 'self'/, 'Conexões devem partir de allowlist explícita.');
assert.match(vite, /frame-src 'none'/, 'Frames externos devem permanecer bloqueados.');
assert.match(vite, /form-action 'self'/, 'Formulários não podem postar para origem arbitrária.');
assert.match(vite, /upgrade-insecure-requests/, 'Build publicado deve forçar upgrade de recursos inseguros.');
assert.match(vite, /endsWith\('\/evolution\.html'\)/, 'CSP desta etapa deve atingir somente a rota Evolution validada.');

assert.doesNotMatch(
  html,
  /<script(?![^>]*type=["']module["'])[^>]*>/i,
  'Evolution não deve depender de script inline clássico incompatível com script-src self.'
);

console.log('Contrato CSP do MEG Evolution validado.');
