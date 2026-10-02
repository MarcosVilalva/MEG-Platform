import type { SVGProps } from 'react';

export type WebNextIconName =
  | 'home' | 'movements' | 'history' | 'payables' | 'cards' | 'catalogs'
  | 'receivables' | 'cashflow' | 'analytics' | 'budgets' | 'reports' | 'settings'
  | 'search' | 'bell' | 'menu' | 'logout' | 'calendar' | 'chevron' | 'plus' | 'food';

export function WebNextIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: WebNextIconName }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (name === 'home') return <svg viewBox="0 0 24 24" {...props} {...common}><path d="M3.5 11 12 4l8.5 7v9H15v-6H9v6H3.5Z"/></svg>;
  if (name === 'movements') return <svg viewBox="0 0 24 24" {...props} {...common}><path d="M5 7h13M5 12h9M5 17h13"/><path d="m16 10 3 2-3 2"/></svg>;
  if (name === 'history') return <svg viewBox="0 0 24 24" {...props} {...common}><path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.7"/><path d="M4 4v4.7h4.7M12 7.5V12l3 2"/></svg>;
  if (name === 'payables') return <svg viewBox="0 0 24 24" {...props} {...common}><circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/></svg>;
  if (name === 'cards') return <svg viewBox="0 0 24 24" {...props} {...common}><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 9h18M7 15h4"/></svg>;
  if (name === 'catalogs') return <svg viewBox="0 0 24 24" {...props} {...common}><rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/></svg>;
  if (name === 'receivables') return <svg viewBox="0 0 24 24" {...props} {...common}><path d="M12 3v12"/><path d="m8 11 4 4 4-4"/><path d="M5 19h14"/></svg>;
  if (name === 'cashflow') return <svg viewBox="0 0 24 24" {...props} {...common}><path d="M4 17 9 12l4 3 7-8"/><path d="M16 7h4v4"/></svg>;
  if (name === 'analytics') return <svg viewBox="0 0 24 24" {...props} {...common}><path d="M5 19V9M12 19V5M19 19v-7"/></svg>;
  if (name === 'budgets') return <svg viewBox="0 0 24 24" {...props} {...common}><circle cx="12" cy="12" r="8"/><path d="M8 12h8M12 8v8"/></svg>;
  if (name === 'reports') return <svg viewBox="0 0 24 24" {...props} {...common}><path d="M6 3h9l4 4v14H6Z"/><path d="M15 3v5h4M9 13h6M9 17h6"/></svg>;
  if (name === 'settings') return <svg viewBox="0 0 24 24" {...props} {...common}><circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/></svg>;
  if (name === 'search') return <svg viewBox="0 0 24 24" {...props} {...common}><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>;
  if (name === 'bell') return <svg viewBox="0 0 24 24" {...props} {...common}><path d="M6 9a6 6 0 0 1 12 0v4l2 3H4l2-3Z"/><path d="M9.5 19h5"/></svg>;
  if (name === 'menu') return <svg viewBox="0 0 24 24" {...props} {...common}><path d="M5 7h14M5 12h14M5 17h14"/></svg>;
  if (name === 'logout') return <svg viewBox="0 0 24 24" {...props} {...common}><path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9"/></svg>;
  if (name === 'calendar') return <svg viewBox="0 0 24 24" {...props} {...common}><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M8 3.5v4M16 3.5v4M3.5 10h17"/></svg>;
  if (name === 'plus') return <svg viewBox="0 0 24 24" {...props} {...common}><path d="M12 5v14M5 12h14"/></svg>;
  if (name === 'food') return <svg viewBox="0 0 24 24" {...props} {...common}><path d="M6 3v7M9 3v7M6 7h3M7.5 10v11M15 3c2.5 2.4 2.5 6.1 0 8.5V21M15 3v8.5"/></svg>;
  return <svg viewBox="0 0 24 24" {...props} {...common}><path d="m9 5 7 7-7 7"/></svg>;
}
