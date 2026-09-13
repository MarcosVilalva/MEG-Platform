export type PhoenixNavigationIcon =
  | 'home'
  | 'movements'
  | 'history'
  | 'payables'
  | 'cards'
  | 'catalogs'
  | 'users'
  | 'settings'
  | 'receivables'
  | 'revenues'
  | 'cashflow'
  | 'reconcile'
  | 'analytics'
  | 'budgets'
  | 'logout'
  | 'more';

export function PhoenixNavIcon({ name }: { name: PhoenixNavigationIcon }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true
  };

  if (name === 'home') return <svg {...common}><path d="M3 10.8 12 3l9 7.8V21h-6v-6H9v6H3z" /></svg>;
  if (name === 'movements') return <svg {...common}><rect x="4" y="3" width="13" height="18" rx="2"/><path d="M8 8h5M8 12h5M8 16h3M19 8v6M16 11h6"/></svg>;
  if (name === 'history') return <svg {...common}><path d="M4.6 7.7A8.5 8.5 0 1 1 4 15"/><path d="M4.6 3.8v3.9H8.5M12 7.5V12l3 2"/></svg>;
  if (name === 'payables') return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18M12 13v3M12 19h.01"/></svg>;
  if (name === 'cards') return <svg {...common}><rect x="2.8" y="5" width="18.4" height="14" rx="2.5"/><path d="M3 9h18M7 15h4"/></svg>;
  if (name === 'catalogs') return <svg {...common}><path d="M4 6h6M14 6h6M4 12h10M18 12h2M4 18h3M11 18h9"/><circle cx="12" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="9" cy="18" r="2"/></svg>;
  if (name === 'users') return <svg {...common}><circle cx="9" cy="8" r="3"/><path d="M3.5 20v-1.5A5.5 5.5 0 0 1 9 13h0a5.5 5.5 0 0 1 5.5 5.5V20M16 7.2a3 3 0 0 1 0 5.6M17 14.2a5 5 0 0 1 3.5 4.8v1"/></svg>;
  if (name === 'settings') return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.05.05-2.78 2.78-.05-.05A1.8 1.8 0 0 0 15 19.4a1.8 1.8 0 0 0-1 .6 1.8 1.8 0 0 0-.4 1.17V21h-3.2v-.08A1.8 1.8 0 0 0 9 19.4a1.8 1.8 0 0 0-1.98.36l-.05.05-2.78-2.78.05-.05A1.8 1.8 0 0 0 4.6 15a1.8 1.8 0 0 0-.6-1 1.8 1.8 0 0 0-1.17-.4H2.8v-3.2h.08A1.8 1.8 0 0 0 4.6 9a1.8 1.8 0 0 0-.36-1.98l-.05-.05 2.78-2.78.05.05A1.8 1.8 0 0 0 9 4.6a1.8 1.8 0 0 0 1-.6 1.8 1.8 0 0 0 .4-1.17V2.8h3.2v.08A1.8 1.8 0 0 0 15 4.6a1.8 1.8 0 0 0 1.98-.36l.05-.05 2.78 2.78-.05.05A1.8 1.8 0 0 0 19.4 9c.18.36.4.7.6 1 .3.25.7.4 1.17.4h.03v3.2h-.08A1.8 1.8 0 0 0 19.4 15Z"/></svg>;
  if (name === 'receivables') return <svg {...common}><path d="M6 3h9l3 3v15H6zM15 3v4h4"/><path d="M9 12h6M12 9v6M9 18h6"/></svg>;
  if (name === 'revenues') return <svg {...common}><path d="M4 18 10 12l4 4 6-8"/><path d="M15 8h5v5"/></svg>;
  if (name === 'cashflow') return <svg {...common}><path d="M4 8h14M15 5l3 3-3 3M20 16H6M9 13l-3 3 3 3"/></svg>;
  if (name === 'reconcile') return <svg {...common}><path d="M4 7h9M10 4l3 3-3 3M20 17h-9M14 14l-3 3 3 3"/><path d="m15.5 10.5 1.7 1.7 3.3-3.7"/></svg>;
  if (name === 'analytics') return <svg {...common}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/><path d="m4 7 6-4 6 5 5-4"/></svg>;
  if (name === 'budgets') return <svg {...common}><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/><path d="m15 9 5-5"/></svg>;
  if (name === 'logout') return <svg {...common}><path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5M14 8l4 4-4 4M18 12H8"/></svg>;
  return <svg {...common}><path d="M4 7h16M4 12h16M4 17h16"/></svg>;
}
