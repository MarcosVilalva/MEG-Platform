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
  | 'search'
  | 'more';

export function PhoenixNavIcon({ name }: { name: PhoenixNavigationIcon }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true
  };

  if (name === 'search') return <svg {...common}><circle cx="10.8" cy="10.8" r="6.6"/><path d="m16 16 4.2 4.2"/></svg>;
  if (name === 'home') return <svg {...common}><path d="M3.8 10.6 12 3.8l8.2 6.8v8.8a1.6 1.6 0 0 1-1.6 1.6H5.4a1.6 1.6 0 0 1-1.6-1.6zM9.2 21v-6.2h5.6V21"/></svg>;
  if (name === 'movements') return <svg {...common}><path d="M6 3.5h9.5a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2zM8 8h5.5M8 12h5.5M8 16h3.5M19.5 8v6M16.5 11h6"/></svg>;
  if (name === 'history') return <svg {...common}><path d="M4.4 8A8.6 8.6 0 1 1 3.7 15M4.4 4.2V8h3.8M12 7.5V12l3 2"/></svg>;
  if (name === 'payables') return <svg {...common}><path d="M5 5.5h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2zM8 3v5M16 3v5M3 10h18M12 13.2v3.2M12 18.4h.01"/></svg>;
  if (name === 'cards') return <svg {...common}><path d="M4.5 5h15a2.5 2.5 0 0 1 2.5 2.5v9a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 16.5v-9A2.5 2.5 0 0 1 4.5 5zM2 9.2h20M6 15h5"/></svg>;
  if (name === 'catalogs') return <svg {...common}><path d="M4 6h5M15 6h5M4 12h10M19 12h1M4 18h2M12 18h8"/><circle cx="12" cy="6" r="2.2"/><circle cx="16.5" cy="12" r="2.2"/><circle cx="9" cy="18" r="2.2"/></svg>;
  if (name === 'users') return <svg {...common}><circle cx="9" cy="8" r="3"/><path d="M3.5 20v-1.2A5.5 5.5 0 0 1 9 13.3a5.5 5.5 0 0 1 5.5 5.5V20M16 7.2a3 3 0 0 1 0 5.6M17 14.2a5 5 0 0 1 3.5 4.8v1"/></svg>;
  if (name === 'settings') return <svg {...common}><circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.1M12 19.1v2.1M21.2 12h-2.1M4.9 12H2.8M18.5 5.5 17 7M7 17l-1.5 1.5M18.5 18.5 17 17M7 7 5.5 5.5"/><circle cx="12" cy="12" r="7.1"/></svg>;
  if (name === 'receivables') return <svg {...common}><path d="M6 3.5h8.8L18 6.7V21H6zM14.8 3.5v4h4M9 12h6M12 9v6M9 18h6"/></svg>;
  if (name === 'revenues') return <svg {...common}><path d="M4 18 10 12l4 4 6-8M15 8h5v5"/></svg>;
  if (name === 'cashflow') return <svg {...common}><path d="M4 8h14M15 5l3 3-3 3M20 16H6M9 13l-3 3 3 3"/></svg>;
  if (name === 'reconcile') return <svg {...common}><path d="M4 7h9M10 4l3 3-3 3M20 17h-9M14 14l-3 3 3 3M15.5 10.5l1.7 1.7 3.3-3.7"/></svg>;
  if (name === 'analytics') return <svg {...common}><path d="M3 20h18M5 17v-5M10 17V7M15 17v-3M20 17V9M4 8l5-4 6 5 5-4"/></svg>;
  if (name === 'budgets') return <svg {...common}><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/><path d="m15 9 5-5"/></svg>;
  if (name === 'logout') return <svg {...common}><path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5M14 8l4 4-4 4M18 12H8"/></svg>;
  return <svg {...common}><path d="M4 7h16M4 12h16M4 17h16"/></svg>;
}
