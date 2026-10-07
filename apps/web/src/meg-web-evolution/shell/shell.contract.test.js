import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const files = [
  'apps/web/src/meg-web-evolution/main.tsx',
  'apps/web/src/meg-web-evolution/shell/AppShell.tsx',
  'apps/web/src/meg-web-evolution/shell/shell.css',
  'apps/web/src/meg-web-evolution/styles/tokens.css',
  'apps/web/src/meg-web-evolution/styles/base.css',
  'apps/web/src/meg-web-evolution/components/primitives.tsx',
  'apps/web/src/meg-web-evolution/components/Icon.tsx',
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
assert.match(source, /--meg-sidebar-wide:\s*13rem/);
assert.match(source, /@media \(max-width: 1023px\)/);
assert.match(source, /@media \(max-width: 639px\)/);
assert.match(source, /@media \(min-width:\s*1024px\) and \(max-height:\s*700px\)/);
assert.match(source, /@media \(min-width:\s*1024px\) and \(max-height:\s*600px\)/);

assert.match(source, /html,\s*\nbody\s*\{[\s\S]*height:\s*100%[\s\S]*overflow:\s*hidden/);
assert.match(source, /\*,\s*\*::before,\s*\*::after\s*\{\s*box-sizing:\s*border-box/);
assert.match(source, /\.meg-shell\s*\{[\s\S]*height:\s*100vh;[\s\S]*height:\s*100dvh;[\s\S]*overflow:\s*hidden/);
assert.match(source, /\.meg-shell-body\s*\{[\s\S]*display:\s*flex;[\s\S]*flex-direction:\s*column;[\s\S]*min-height:\s*0;[\s\S]*overflow:\s*hidden/);
assert.match(source, /\.meg-main\s*\{[\s\S]*flex:\s*1\s+1\s+auto;[\s\S]*min-height:\s*0;[\s\S]*overflow-y:\s*auto/);
assert.equal(/min-height:\s*100(?:d?vh)/.test(source), false, 'nested viewport min-height is forbidden');

assert.match(source, /className="meg-sidebar-wrap"/);
assert.match(source, /\.meg-sidebar-wrap\s*\{[\s\S]*position:\s*relative;[\s\S]*overflow:\s*visible/);
assert.match(source, /\.meg-sidebar\s*\{[\s\S]*min-height:\s*0;[\s\S]*overflow:\s*hidden/);
assert.match(source, /\.meg-nav\s*\{[\s\S]*flex:\s*1\s+1\s+auto;[\s\S]*min-height:\s*0;[\s\S]*overflow-y:\s*auto;[\s\S]*scrollbar-width:\s*none/);
assert.match(source, /\.meg-nav::\-webkit\-scrollbar\s*\{[\s\S]*display:\s*none/);
assert.match(source, /\.meg-nav\s*\{[\s\S]*margin-top:\s*0/);

assert.match(source, /logo-meg-financas\.svg/);
assert.match(source, /simbolo-meg-financas\.svg/);
assert.match(source, /transition:\s*opacity\s+150ms\s+ease/);
assert.match(source, /\.meg-brand\s*\{[\s\S]*position:\s*relative[\s\S]*overflow:\s*visible/);
assert.match(source, /\.meg-brand-stack\s*\{[\s\S]*position:\s*relative[\s\S]*overflow:\s*visible/);
assert.match(source, /\.meg-brand-logo--expanded\s*\{[\s\S]*position:\s*relative[\s\S]*width:\s*112px/);
assert.match(source, /\.meg-brand-logo--collapsed\s*\{[\s\S]*position:\s*absolute/);
assert.match(source, /\.meg-shell\.is-sidebar-collapsed \.meg-brand\s*\{[\s\S]*height:\s*64px;[\s\S]*display:\s*flex;[\s\S]*align-items:\s*center;[\s\S]*justify-content:\s*center;[\s\S]*padding:\s*14px\s+0;[\s\S]*overflow:\s*visible/);
assert.match(source, /\.meg-shell\.is-sidebar-collapsed \.meg-brand-logo--collapsed\s*\{[\s\S]*flex:\s*0\s+0\s+auto;[\s\S]*width:\s*36px;[\s\S]*min-width:\s*36px;[\s\S]*max-width:\s*36px;[\s\S]*height:\s*auto;[\s\S]*object-fit:\s*contain/);
assert.match(source, /padding:\s*16px\s+\.75rem\s+0/);
assert.match(source, /margin-bottom:\s*16px/);
assert.match(source, /padding:\s*16px\s+0/);
assert.match(source, /width:\s*96px/);
assert.match(source, /width:\s*80px/);
assert.match(source, /\.meg-shell\.is-sidebar-collapsed \.meg-brand\s*\{[\s\S]*height:\s*52px/);
assert.match(source, /\.meg-shell\.is-sidebar-collapsed \.meg-brand-logo--collapsed\s*\{[\s\S]*width:\s*30px/);
assert.match(source, /min-height:\s*40px/);
assert.match(source, /min-height:\s*36px/);

assert.match(source, /panelLeftClose:[\s\S]*m16 15-3-3 3-3/);
assert.match(source, /panelLeftOpen:[\s\S]*m14 9 3 3-3 3/);
assert.match(source, /strokeWidth=\{1\.75\}/);
assert.match(source, /aria-label=\{sidebarCollapsed \? 'Expandir menu' : 'Recolher menu'\}/);
assert.match(source, /aria-expanded=\{!sidebarCollapsed\}/);
assert.equal(/title=\{sidebarCollapsed/.test(source), false, 'native title tooltip must not exist');
assert.match(source, /className="meg-nav-item meg-sidebar-control"/);
assert.match(source, /<span>Recolher menu<\/span>/);
assert.match(source, /width=\{20\}/);
assert.match(source, /height=\{20\}/);
assert.match(source, /\.meg-sidebar-control-wrap\s*\{[\s\S]*flex:\s*0\s+0\s+auto[\s\S]*border-top:\s*1px/);
assert.match(source, /\.meg-sidebar-control\s*\{[\s\S]*width:\s*100%;[\s\S]*border:\s*0;[\s\S]*box-shadow:\s*none/);
assert.match(source, /\.meg-sidebar-control svg\s*\{[\s\S]*width:\s*20px;[\s\S]*height:\s*20px;[\s\S]*pointer-events:\s*none/);
assert.match(source, /\.meg-sidebar-control:hover\s*\{[\s\S]*color:\s*var\(--meg-accent\)/);
assert.match(source, /\.meg-sidebar-control:focus-visible\s*\{[\s\S]*outline:\s*2px solid var\(--meg-accent\)/);
assert.match(source, /\.meg-shell\.is-sidebar-collapsed\s*\{[\s\S]*grid-template-columns:\s*72px/);
assert.match(source, /\.meg-shell\.is-sidebar-collapsed \.meg-sidebar-wrap,[\s\S]*width:\s*72px;[\s\S]*min-width:\s*72px;[\s\S]*max-width:\s*72px/);
assert.match(source, /\.meg-nav-item svg\s*\{[\s\S]*width:\s*20px;[\s\S]*height:\s*20px/);
assert.match(source, /\.meg-shell\.is-sidebar-collapsed \.sidebar__art\s*\{[\s\S]*display:\s*none/);
assert.match(source, /\.meg-shell\.is-sidebar-collapsed \.meg-sidebar-control\s*\{[\s\S]*border:\s*0;[\s\S]*background:\s*transparent;[\s\S]*box-shadow:\s*none/);
assert.match(source, /\.meg-shell\.is-sidebar-collapsed \.meg-sidebar-control::after/);
assert.equal(source.includes('.meg-sidebar-toggle'), false, 'floating sidebar toggle must not exist');

assert.match(source, /aria-label="Navegação principal"/);
assert.match(source, /Buscar movimentações, contas, cartões, relatórios\.\.\./);
assert.match(source, /Outubro de 2026/);
assert.match(source, /Marcos de Andrade Vilalva/);
assert.equal(source.includes('meg-sidebar-lockup.svg'), false);
assert.equal(source.includes('meg-finance-symbol-transparent.svg'), false);
assert.equal(source.includes('meg-brand-mark'), false);
assert.equal(source.includes('dashed'), false);
assert.match(source, /is-sidebar-collapsed/);
assert.match(source, /margin-inline:\s*auto/);
assert.match(source, /className="sidebar__art"/);
assert.match(source, /margin:\s*auto\s+-\.75rem\s+0/);
assert.equal(source.includes('.meg-sidebar::before'), false);
assert.equal(source.includes('.meg-sidebar::after'), false);

console.log('MEG Web Evolution shell foundation contract: OK');

assert.equal(source.includes('.meg-sidebar-toggle'), false, 'floating sidebar toggle must remain removed');
