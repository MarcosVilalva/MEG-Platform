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
assert.match(source, /html,\s*\nbody\s*\{[\s\S]*height:\s*100%[\s\S]*overflow:\s*hidden/);
assert.match(source, /\*,\s*\*::before,\s*\*::after\s*\{\s*box-sizing:\s*border-box/);
assert.match(source, /\.meg-shell\s*\{[\s\S]*height:\s*100vh;[\s\S]*height:\s*100dvh;[\s\S]*overflow:\s*hidden/);
assert.match(source, /\.meg-shell-body\s*\{[\s\S]*display:\s*flex;[\s\S]*flex-direction:\s*column;[\s\S]*min-height:\s*0;[\s\S]*overflow:\s*hidden/);
assert.match(source, /\.meg-main\s*\{[\s\S]*flex:\s*1\s+1\s+auto;[\s\S]*min-height:\s*0;[\s\S]*overflow-y:\s*auto/);
assert.match(source, /\.meg-sidebar\s*\{[\s\S]*min-height:\s*0;[\s\S]*overflow-y:\s*auto/);
assert.equal(/min-height:\s*100(?:d?vh)/.test(source), false, 'nested viewport min-height is forbidden');
assert.match(source, /min-height:\s*3rem/);
assert.match(source, /aria-label="Navegação principal"/);
assert.match(source, /Buscar movimentações, contas, cartões, relatórios\.\.\./);
assert.match(source, /Outubro de 2026/);
assert.match(source, /Marcos de Andrade Vilalva/);
assert.match(source, /logo-meg-financas\.svg/);
assert.match(source, /simbolo-meg-financas\.svg/);
assert.match(source, /transition:\s*opacity\s+200ms\s+ease/);
assert.match(source, /\.meg-brand\s*\{[\s\S]*position:\s*relative/);
assert.match(source, /\.meg-brand-stack\s*\{[\s\S]*position:\s*relative[\s\S]*overflow:\s*visible/);
assert.match(source, /\.meg-brand-logo--expanded\s*\{[\s\S]*position:\s*relative[\s\S]*width:\s*140px/);
assert.match(source, /\.meg-brand-logo--collapsed\s*\{[\s\S]*position:\s*absolute[\s\S]*width:\s*36px/);
assert.match(source, /padding:\s*20px\s+\.75rem\s+0/);
assert.match(source, /margin-bottom:\s*20px/);
assert.match(source, /padding:\s*16px\s+0/);
assert.match(source, /\.meg-brand\s*\{[\s\S]*flex:\s*0\s+0\s+auto/);
assert.match(source, /\.meg-nav\s*\{[\s\S]*flex:\s*0\s+0\s+auto[\s\S]*margin-top:\s*0/);
assert.equal(source.includes('meg-sidebar-lockup.svg'), false);
assert.equal(source.includes('meg-finance-symbol-transparent.svg'), false);
assert.equal(source.includes('meg-brand-mark'), false);
assert.equal(source.includes('dashed'), false);
assert.match(source, /Recolher menu lateral/);
assert.match(source, /Expandir menu lateral/);
assert.match(source, /is-sidebar-collapsed/);
assert.match(source, /meg-sidebar-toggle/);
assert.match(source, /margin-inline:\s*auto/);
assert.match(source, /className="sidebar__art"/);
assert.match(source, /margin:\s*auto\s+-\.75rem\s+0/);
assert.equal(source.includes('.meg-sidebar::before'), false);
assert.equal(source.includes('.meg-sidebar::after'), false);

console.log('MEG Web Evolution shell foundation contract: OK');
