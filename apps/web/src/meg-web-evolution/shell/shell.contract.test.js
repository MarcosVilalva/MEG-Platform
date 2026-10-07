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
assert.match(source, /\.meg-sidebar-footer::before\s*\{[\s\S]*height:\s*1px;[\s\S]*background:\s*rgba\(255, 255, 255, \.08\);[\s\S]*box-shadow:\s*none/);
assert.match(source, /\.meg-logout-button\s*\{[\s\S]*min-height:\s*44px[\s\S]*background:\s*transparent/);
assert.match(source, /\.meg-shell\.is-sidebar-collapsed\s*\{[\s\S]*grid-template-columns:\s*72px/);
assert.match(source, /\.meg-shell\.is-sidebar-collapsed \.meg-sidebar-wrap,[\s\S]*width:\s*72px;[\s\S]*min-width:\s*72px;[\s\S]*max-width:\s*72px/);
assert.match(source, /\.meg-nav-item svg\s*\{[\s\S]*width:\s*20px;[\s\S]*height:\s*20px/);
assert.match(source, /\.meg-shell\.is-sidebar-collapsed \.sidebar__art\s*\{[\s\S]*display:\s*none/);
assert.equal(source.includes('.meg-sidebar-control'), false, 'old sidebar footer collapse control must be removed');
assert.equal(source.includes('.meg-sidebar-toggle {'), false, 'floating sidebar toggle must not exist');

assert.match(source, /aria-label="Navegação principal"/);
assert.match(source, /Buscar movimentações, contas, cartões, relatórios\.\.\./);
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

assert.equal(source.includes('.meg-sidebar-toggle {'), false, 'floating sidebar toggle must remain removed');

assert.match(source, /@media \(max-height:\s*699px\)[\s\S]*\.sidebar__art,[\s\S]*display:\s*none/);
assert.match(source, /\.meg-shell\.is-sidebar-collapsed \.sidebar__art\s*\{[\s\S]*display:\s*none/);


assert.equal(source.includes('meg-new-button'), false, 'Novo must live in the topbar, not sidebar');

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

assert.match(source, /\.meg-shell\.is-sidebar-collapsed \.meg-nav\s*\{[\s\S]*display:\s*flex;[\s\S]*flex-direction:\s*column;[\s\S]*justify-content:\s*space-evenly;[\s\S]*overflow-y:\s*auto/);

assert.match(source, /@media \(max-width: 1023px\)[\s\S]*\.meg-topbar\s*\{[\s\S]*grid-template-columns:\s*auto minmax\(46px, 1fr\) auto;[\s\S]*grid-template-areas:\s*"launchers search actions"/);
assert.match(source, /@media \(max-width: 1023px\)[\s\S]*\.meg-topbar-actions\s*\{[\s\S]*display:\s*flex;[\s\S]*justify-content:\s*flex-end/);
assert.match(source, /@media \(max-width: 639px\)[\s\S]*grid-template-areas:[\s\S]*"menu \. notification profile"[\s\S]*"period period period period"[\s\S]*"search search search search"/);
assert.match(source, /@media \(max-width: 639px\)[\s\S]*\.meg-topbar-actions\s*\{[\s\S]*display:\s*contents/);
assert.match(source, /responsiveViewports[\s\S]*1023[\s\S]*768[\s\S]*640[\s\S]*390/);
assert.match(source, /responsive\.overlaps/);
assert.match(source, /responsive\.allInsideViewport/);
assert.match(source, /responsive\.periodOneLine/);

assert.match(source, /container-type:\s*inline-size/);
assert.match(source, /container-name:\s*meg-shell-body/);
assert.match(source, /@container meg-shell-body \(max-width:\s*39rem\)/);
assert.match(source, /@media \(max-width:\s*1023px\)[\s\S]*grid-template-columns:\s*minmax\(46px, 1fr\) auto/);
assert.match(source, /@container meg-shell-body \(max-width:\s*39rem\)[\s\S]*\.meg-search\s*\{[\s\S]*width:\s*46px;[\s\S]*max-width:\s*46px/);
assert.match(source, /@container meg-shell-body \(max-width:\s*39rem\)[\s\S]*\.meg-search input\s*\{[\s\S]*width:\s*0;[\s\S]*opacity:\s*0/);
assert.match(source, /aria-label="Buscar"/);

assert.match(source, /@media \(max-height:\s*767px\)[\s\S]*\.meg-nav,[\s\S]*flex:\s*1\s+1\s+auto;[\s\S]*min-height:\s*0;[\s\S]*justify-content:\s*space-evenly;[\s\S]*gap:\s*clamp\(2px, \.8vh, 6px\)/);
assert.match(source, /@media \(max-height:\s*767px\)[\s\S]*\.meg-nav-item,[\s\S]*height:\s*clamp\(34px, 6\.2vh, 42px\)/);
assert.match(source, /@media \(max-height:\s*599px\)[\s\S]*flex-basis:\s*52px;[\s\S]*height:\s*52px/);
assert.match(source, /@media \(max-height:\s*519px\)[\s\S]*mask-image:\s*linear-gradient\(to bottom, #000 0, #000 calc\(100% - 16px\), transparent 100%\)/);
assert.match(source, /\.meg-sidebar-footer\s*\{[\s\S]*margin-block:\s*8px;[\s\S]*padding-top:\s*8px/);
assert.match(source, /@media \(max-width:\s*1023px\)[\s\S]*\.meg-topbar-launchers\s*\{\s*display:\s*inline-flex/);
assert.match(source, /@media \(max-width:\s*639px\)[\s\S]*\.meg-topbar-launchers\s*\{[\s\S]*display:\s*inline-flex[\s\S]*\.meg-sidebar-toggle-topbar\s*\{\s*display:\s*none/);
assert.match(source, /sidebarResponsiveViewports[\s\S]*1366[\s\S]*1024[\s\S]*900[\s\S]*690[\s\S]*768[\s\S]*480/);
assert.match(source, /result\.gapToFooter <= result\.maxItemHeight \+ 1/);
assert.match(source, /result\.dividerNeutral/);
assert.match(source, /result\.needsScroll/);
assert.match(source, /assertReducedTopbarLaunchers/);

assert.match(source, /@media \(max-height:\s*767px\)[\s\S]*\.meg-brand,[\s\S]*flex:\s*0\s+0\s+72px;[\s\S]*height:\s*72px;[\s\S]*padding:\s*6px\s+0\s+8px/);
assert.match(source, /@media \(max-height:\s*767px\)[\s\S]*\.meg-brand-logo--expanded\s*\{[\s\S]*width:\s*88px;[\s\S]*max-height:\s*54px/);
assert.match(source, /@media \(max-height:\s*599px\)[\s\S]*flex-basis:\s*60px;[\s\S]*\.meg-brand-logo--expanded\s*\{[\s\S]*width:\s*76px;[\s\S]*max-height:\s*46px/);
assert.match(source, /@media \(max-height:\s*767px\)[\s\S]*\.meg-nav,[\s\S]*padding-top:\s*8px/);

assert.match(source, /useEffect/);
assert.match(source, /window\.matchMedia\('\(min-width: 1024px\)'\)/);
assert.match(source, /sidebarPreferenceCollapsed/);
assert.match(source, /const sidebarCollapsed = isDesktopWide \? sidebarPreferenceCollapsed : true/);
assert.match(source, /setSidebarPreferenceCollapsed\(\(value\) => !value\)/);
assert.match(source, /aria-hidden=\{!isDesktopWide\}/);
assert.match(source, /tabIndex=\{isDesktopWide \? 0 : -1\}/);
assert.match(source, /@media \(max-width:\s*1023px\)[\s\S]*\.meg-sidebar-toggle-topbar\s*\{\s*display:\s*none/);
assert.match(source, /@media \(max-width:\s*1023px\)[\s\S]*\.meg-brand-stack\s*\{[\s\S]*width:\s*52px;[\s\S]*height:\s*52px/);
assert.match(source, /@media \(max-width:\s*1023px\)[\s\S]*\.meg-brand-logo--collapsed\s*\{[\s\S]*width:\s*42px;[\s\S]*min-width:\s*42px/);
assert.match(source, /@media \(max-width:\s*1023px\) and \(max-height:\s*599px\)[\s\S]*\.meg-brand-stack\s*\{[\s\S]*width:\s*46px;[\s\S]*height:\s*46px/);
assert.match(source, /sidebar deve voltar expandida automaticamente/);

assert.match(source, /@media \(min-width:\s*1024px\) and \(max-height:\s*767px\)[\s\S]*\.meg-brand\s*\{[\s\S]*flex:\s*0\s+0\s+92px;[\s\S]*height:\s*92px/);
assert.match(source, /@media \(min-width:\s*1024px\) and \(max-height:\s*767px\)[\s\S]*\.meg-brand-logo--expanded\s*\{[\s\S]*width:\s*112px;[\s\S]*max-height:\s*none/);
assert.match(source, /@media \(min-width:\s*1024px\) and \(max-height:\s*519px\)[\s\S]*\.meg-brand-logo--expanded\s*\{[\s\S]*width:\s*104px/);

assert.match(source, /@media \(min-width:\s*1024px\) and \(max-height:\s*767px\)[\s\S]*\.meg-brand\s*\{[\s\S]*flex:\s*0\s+0\s+96px;[\s\S]*padding:\s*14px\s+0\s+6px/);

assert.match(source, /@media \(min-width:\s*1024px\)[\s\S]*\.meg-shell\.is-sidebar-collapsed \.meg-brand\s*\{[\s\S]*height:\s*5\.35rem/);
assert.match(source, /@media \(min-width:\s*1024px\)[\s\S]*\.meg-shell\.is-sidebar-collapsed \.meg-brand-stack\s*\{[\s\S]*transform:\s*none/);
assert.match(source, /@media \(max-width:\s*1023px\) and \(min-width:\s*640px\)[\s\S]*\.meg-brand\s*\{[\s\S]*height:\s*72px;[\s\S]*\.meg-brand-stack\s*\{[\s\S]*transform:\s*none/);


assert.match(source, /SIDEBAR_PREFERENCE_KEY = 'meg-web-evolution:sidebar-collapsed'/);
assert.match(source, /window\.localStorage\.getItem\(SIDEBAR_PREFERENCE_KEY\)/);
assert.match(source, /window\.localStorage\.setItem\(SIDEBAR_PREFERENCE_KEY, String\(nextValue\)\)/);
assert.match(source, /window\.addEventListener\('pageshow'/);
assert.match(source, /window\.addEventListener\('focus'/);
assert.match(source, /document\.addEventListener\('visibilitychange'/);
