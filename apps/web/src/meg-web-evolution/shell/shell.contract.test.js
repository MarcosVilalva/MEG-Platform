import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const files = [
  'apps/web/src/meg-web-evolution/main.tsx',
  'apps/web/src/meg-web-evolution/shell/AppShell.tsx',
  'apps/web/src/meg-web-evolution/shell/shell.css',
  'apps/web/src/meg-web-evolution/styles/tokens.css',
  'apps/web/src/meg-web-evolution/styles/base.css',
  'apps/web/src/meg-web-evolution/components/primitives.tsx',
];

const source = files.map((path) => readFileSync(path, 'utf8')).join('\n');

for (const forbidden of [
  '/phoenix/',
  '/web-next/',
  '/mobile/',
  'legacy-finance',
  'legacy-financial-accounts',
]) {
  assert.equal(source.includes(forbidden), false, `clean-room violation: ${forbidden}`);
}

assert.match(source, /--meg-accent:\s*#14e3c8/i);
assert.match(source, /@media \(max-width: 1023px\)/);
assert.match(source, /@media \(max-width: 639px\)/);
assert.match(source, /min-height:\s*100dvh/);
assert.match(source, /overflow-x:\s*hidden/);
assert.match(source, /min-height:\s*3rem/);
assert.match(source, /aria-label="Navegação principal"/);
assert.match(source, /Buscar movimentações, contas, cartões, relatórios\.\.\./);
assert.match(source, /Outubro de 2026/);
assert.match(source, /Marcos de Andrade Vilalva/);
assert.match(source, /meg-loading-lockup\.svg/);
assert.equal(source.includes('meg-brand-mark'), false);
assert.equal(source.includes('dashed'), false);
assert.match(source, /Recolher menu lateral/);
assert.match(source, /Expandir menu lateral/);
assert.match(source, /is-sidebar-collapsed/);
assert.match(source, /meg-sidebar-toggle/);
assert.match(source, /margin-inline:\s*auto/);

console.log('MEG Web Evolution shell foundation contract: OK');
