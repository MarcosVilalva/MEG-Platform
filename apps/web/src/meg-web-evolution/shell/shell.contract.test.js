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
assert.equal(source.includes('simbolo-meg-financas.svg'), false, 'collapsed sidebar must scale the full logo instead of swapping to symbol');
assert.match(source, /transition:\s*opacity\s+150ms\s+ease/);
assert.match(source, /\.meg-brand\s*\{[\s\S]*position:\s*relative[\s\S]*overflow:\s*visible/);
assert.match(source, /\.meg-brand-stack\s*\{[\s\S]*position:\s*relative[\s\S]*overflow:\s*visible/);
assert.match(source, /\.meg-brand-logo--expanded\s*\{[\s\S]*position:\s*relative[\s\S]*width:\s*112px/);
assert.match(source, /\.meg-brand-logo--collapsed\s*\{[\s\S]*position:\s*absolute/);
assert.match(source, /\.meg-shell\.is-sidebar-collapsed \.meg-brand\s*\{[\s\S]*height:\s*64px;[\s\S]*display:\s*flex;[\s\S]*align-items:\s*center;[\s\S]*justify-content:\s*center;[\s\S]*padding:\s*8px\s+0;[\s\S]*overflow:\s*visible/);
assert.match(source, /\.meg-shell\.is-sidebar-collapsed \.meg-brand-stack\s*\{[\s\S]*width:\s*48px;[\s\S]*height:\s*48px;[\s\S]*border-radius:\s*13px;[\s\S]*0 0 14px rgba\(20, 227, 200, \.11\)/);
assert.match(source, /\.meg-shell\.is-sidebar-collapsed \.meg-brand-logo--collapsed\s*\{[\s\S]*flex:\s*0\s+0\s+auto;[\s\S]*width:\s*38px;[\s\S]*min-width:\s*38px;[\s\S]*max-width:\s*38px;[\s\S]*height:\s*auto;[\s\S]*object-fit:\s*contain/);
assert.match(source, /padding:\s*16px\s+\.75rem\s+0/);
assert.match(source, /margin-bottom:\s*16px/);
assert.match(source, /width:\s*96px/);
assert.match(source, /width:\s*80px/);
assert.match(source, /\.meg-shell\.is-sidebar-collapsed \.meg-brand\s*\{[\s\S]*height:\s*52px/);
assert.match(source, /\.meg-shell\.is-sidebar-collapsed \.meg-brand-stack\s*\{[\s\S]*width:\s*44px;[\s\S]*height:\s*44px/);
assert.match(source, /\.meg-shell\.is-sidebar-collapsed \.meg-brand-logo--collapsed\s*\{[\s\S]*width:\s*34px/);
assert.match(source, /min-height:\s*40px/);
assert.match(source, /min-height:\s*36px/);

assert.match(source, /chevronsLeft:[\s\S]*m11 17-5-5 5-5[\s\S]*m18 17-5-5 5-5/);
assert.match(source, /chevronsRight:[\s\S]*m13 17 5-5-5-5[\s\S]*m6 17 5-5-5-5/);
assert.match(source, /logOut:[\s\S]*M10 17l5-5-5-5/);
assert.match(source, /strokeWidth=\{1\.75\}/);
assert.match(source, /className="meg-topbar-launchers"/);
assert.match(source, /className="meg-topbar-launcher meg-sidebar-toggle-topbar"/);
assert.match(source, /aria-label=\{sidebarCollapsed \? 'Expandir menu' : 'Recolher menu'\}/);
assert.match(source, /aria-expanded=\{!sidebarCollapsed\}/);
assert.match(source, /className="meg-topbar-launcher meg-topbar-new"/);
assert.match(source, /aria-label="Novo lançamento"/);
assert.match(source, /className="meg-nav-item meg-logout-button"/);
assert.match(source, /aria-label="Sair"/);
assert.match(source, /<span>Sair<\/span>/);
assert.match(source, /\.meg-topbar-launchers\s*\{[\s\S]*display:\s*inline-flex[\s\S]*gap:\s*8px/);
assert.match(source, /\.meg-topbar-launcher\s*\{[\s\S]*width:\s*46px;[\s\S]*height:\s*46px[\s\S]*border-radius:\s*12px/);
assert.match(source, /\.meg-topbar-new\s*\{[\s\S]*border-color:\s*rgba\(20, 227, 200, \.62\)/);
assert.match(source, /\.meg-sidebar-footer\s*\{[\s\S]*flex:\s*0\s+0\s+auto[\s\S]*border-top:\s*0/);
assert.match(source, /\.meg-sidebar-footer::before\s*\{[\s\S]*height:\s*1px;[\s\S]*rgba\(65, 242, 220, \.56\)/);
assert.match(source, /\.meg-logout-button\s*\{[\s\S]*min-height:\s*44px[\s\S]*background:\s*transparent/);
assert.match(source, /\.meg-shell\.is-sidebar-collapsed\s*\{[\s\S]*grid-template-columns:\s*72px/);
assert.match(source, /\.meg-shell\.is-sidebar-collapsed \.meg-sidebar-wrap,[\s\S]*width:\s*72px;[\s\S]*min-width:\s*72px;[\s\S]*max-width:\s*72px/);
assert.match(source, /\.meg-nav-item svg\s*\{[\s\S]*width:\s*20px;[\s\S]*height:\s*20px/);
assert.match(source, /\.meg-shell\.is-sidebar-collapsed \.sidebar__art\s*\{[\s\S]*display:\s*none/);
assert.equal(source.includes('.meg-sidebar-control'), false, 'old sidebar footer collapse control must be removed');
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

assert.match(source, /@media \(min-width:\s*1024px\) and \(max-height:\s*700px\)[\s\S]*\.sidebar__art\s*\{[\s\S]*display:\s*block;[\s\S]*height:\s*8\.5rem/);
assert.match(source, /\.meg-shell\.is-sidebar-collapsed \.sidebar__art\s*\{[\s\S]*display:\s*none/);

assert.match(source, /0 0 10px rgba\(20, 227, 200, \.08\)/);

assert.equal(source.includes('meg-new-button'), false, 'Novo must live in the topbar, not sidebar');
assert.equal(source.includes('PrimaryButton'), false, 'sidebar Novo PrimaryButton must be removed from shell');

assert.match(source, /\.meg-topbar\s*\{[\s\S]*display:\s*grid;[\s\S]*grid-template-columns:\s*auto minmax\(0, 1fr\) auto/);
assert.match(source, /\.meg-search\s*\{[\s\S]*min-width:\s*0;[\s\S]*width:\s*min\(38\.5rem, 100%\)/);
assert.match(source, /\.meg-topbar-actions\s*\{[\s\S]*white-space:\s*nowrap/);
assert.match(source, /\.meg-period\s*\{[\s\S]*min-width:\s*max-content;[\s\S]*white-space:\s*nowrap/);
assert.match(source, /\.meg-period span\s*\{[\s\S]*white-space:\s*nowrap/);

assert.match(source, /Outubro&nbsp;de&nbsp;2026/);
assert.match(source, /\.meg-period\s*\{[\s\S]*width:\s*max-content;[\s\S]*min-width:\s*11\.75rem;[\s\S]*white-space:\s*nowrap/);
assert.match(source, /\.meg-period span\s*\{[\s\S]*display:\s*inline-block;[\s\S]*min-width:\s*max-content;[\s\S]*white-space:\s*nowrap/);

assert.match(source, /data-tooltip=\{label\}/);
assert.match(source, /data-tooltip="Sair"/);
assert.match(source, /data-tooltip=\{sidebarCollapsed \? 'Expandir menu' : 'Recolher menu'\}/);
assert.match(source, /data-tooltip="Novo lançamento"/);
assert.match(source, /data-tooltip="Notificações"/);
assert.match(source, /createPortal/);
assert.match(source, /className=\{`meg-global-tooltip is-\$\{tooltip\.placement\}`\}/);
assert.match(source, /role="tooltip"/);
assert.match(source, /\.meg-global-tooltip\s*\{[\s\S]*position:\s*fixed;[\s\S]*z-index:\s*1000/);
assert.match(source, /\.meg-global-tooltip\.is-right/);
assert.match(source, /\.meg-global-tooltip\.is-bottom/);
assert.match(source, /\.meg-shell\.is-sidebar-collapsed \.meg-nav-item:hover,[\s\S]*0 0 12px rgba\(20, 227, 200, \.10\)/);
assert.match(source, /border-radius:\s*12px/);

assert.equal(/title\s*=/.test(source), false, 'icon-only tooltip targets must not use native title attributes');
assert.match(source, /assertTooltipMatches/);
assert.match(source, /assertHoverAndFocusTooltip/);
assert.match(source, /assertHoverAndFocusNoTooltip/);
assert.match(source, /tooltip\.count, 1/);
assert.match(source, /tooltip\.text, result\.target\.ariaLabel/);
assert.match(source, /tooltip\.parentIsBody, true/);
assert.match(source, /tooltip\.insideSidebar, false/);

assert.match(source, /\.meg-shell\.is-sidebar-collapsed \.meg-nav\s*\{[\s\S]*display:\s*flex;[\s\S]*flex-direction:\s*column;[\s\S]*justify-content:\s*space-evenly;[\s\S]*overflow-y:\s*auto/);
