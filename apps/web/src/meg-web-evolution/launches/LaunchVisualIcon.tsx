import type { ReactNode, SVGProps } from 'react';

/**
 * Ícones vetoriais exclusivos do Novo Lançamento.
 * Somente apresentação: não contém cálculos, saldos nem operações financeiras.
 * SVGs em linha para resolução nítida, sem dependência de biblioteca externa.
 */
export type LaunchVisualIconName =
  | 'expense' | 'income' | 'transfer' | 'benefit'
  | 'description' | 'category' | 'account' | 'payment'
  | 'date' | 'amount' | 'status' | 'installments' | 'notes' | 'summary'
  | 'check' | 'close' | 'lock'
  | 'food' | 'home' | 'transport' | 'health' | 'shopping' | 'spark' | 'arrow';

const symbols: Record<LaunchVisualIconName, ReactNode> = {
  expense: <><path d="M9 5.5h14l5 5v25l-4 3-4-3-4 3-4-3-4 3V7a1.5 1.5 0 0 1 1-1.5Z"/><path d="M23 5.5v6h6M13 16h11M13 22h11M13 28h7"/><path d="M32 20v11m-4-4 4 4 4-4"/></>,
  income: <><path d="M5 37h34M10 33v-7h7v7M21 33V19h7v14M32 33V10h7v23"/><path d="m7 18 10-8 7 5L36 4m-8 0h8v8"/></>,
  transfer: <><path d="M4 15h30l-6-6M34 15l-6 6M40 29H10l6-6M10 29l6 6"/><path d="M6 9 2 11v12M42 21v12l-4 2" opacity=".55"/></>,
  benefit: <><rect x="5" y="11" width="38" height="26" rx="5"/><path d="M5 19h38M12 30h12M32 26v7M36 26v7"/><path d="M13 4v11M10 4v5a3 3 0 0 0 6 0V4M22 4c-3 0-4 4-4 9h4"/></>,
  description: <><path d="M11 5h19l7 7v29H11a4 4 0 0 1-4-4V9a4 4 0 0 1 4-4Z"/><path d="M30 5v8h7M14 20h17M14 27h17M14 34h11"/></>,
  category: <><rect x="5" y="5" width="16" height="16" rx="3"/><rect x="27" y="5" width="16" height="16" rx="3"/><rect x="5" y="27" width="16" height="16" rx="3"/><path d="m35 28 2.5 5.4 5.5.8-4 3.8 1 5.5-5-2.6-5 2.6 1-5.5-4-3.8 5.5-.8Z"/></>,
  account: <><path d="m3 17 21-12 21 12H3ZM7 40h34M4 44h40M10 21v17M20 21v17M30 21v17M40 21v17"/><circle cx="24" cy="14" r="2"/></>,
  payment: <><rect x="3" y="8" width="42" height="31" rx="5"/><path d="M3 18h42M11 28h12"/><circle cx="35" cy="30" r="4"/></>,
  date: <><rect x="5" y="9" width="38" height="34" rx="4"/><path d="M15 4v10M33 4v10M5 20h38"/><path d="m17 32 5 5 10-11"/></>,
  amount: <><circle cx="24" cy="24" r="18"/><path d="M31 15H21a6 6 0 0 0 0 12h6a6 6 0 0 1 0 12H17M24 10v29"/></>,
  status: <><circle cx="24" cy="24" r="19"/><path d="M24 13v12l8 5"/><path d="m13 28 5 5 8-9" opacity=".5"/></>,
  installments: <><rect x="4" y="7" width="28" height="22" rx="3"/><path d="M4 14h28M11 22h8"/><rect x="16" y="20" width="28" height="22" rx="3"/><path d="M16 27h28M24 35h10"/></>,
  notes: <><path d="M11 6h26a4 4 0 0 1 4 4v20L30 42H11a4 4 0 0 1-4-4V10a4 4 0 0 1 4-4Z"/><path d="M30 42V31h11M14 16h20M14 23h16M14 30h10"/></>,
  summary: <><rect x="5" y="5" width="38" height="38" rx="5"/><path d="M12 15h4M21 15h16M12 24h4M21 24h16M12 33h4M21 33h16"/></>,
  check: <path d="m9 25 10 10 21-23"/>,
  close: <path d="M12 12 36 36M36 12 12 36"/>,
  lock: <><rect x="10" y="20" width="28" height="23" rx="4"/><path d="M16 20v-7a8 8 0 0 1 16 0v7M24 30v6"/></>,
  food: <><path d="M10 4v16M16 4v16M22 4v16M16 20v24M34 4v40M34 4c-12 6-12 19 0 20"/></>,
  home: <><path d="m5 22 19-16 19 16M10 20v22h28V20M19 42V28h10v14"/></>,
  transport: <><path d="m10 13 4-7h20l4 7 5 12v12H5V25l5-12ZM5 26h38M14 37v5M34 37v5"/><circle cx="13" cy="29" r="3"/><circle cx="35" cy="29" r="3"/></>,
  health: <><path d="M24 42S5 31 5 18C5 9 16 4 24 14c8-10 19-5 19 4 0 13-19 24-19 24Z"/><path d="M15 24h6l3-6 4 12 3-6h4"/></>,
  shopping: <><path d="M9 16h30l3 27H6l3-27ZM17 19V13a7 7 0 0 1 14 0v6"/></>,
  spark: <><path d="m24 2 5 16 16 6-16 5-5 17-5-17-16-5 16-6 5-16Z"/></>,
  arrow: <><path d="M7 24h34m-13-13 13 13-13 13"/></>,
};

export function LaunchVisualIcon({
  name,
  ...props
}: { name: LaunchVisualIconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor"
      strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"
      focusable="false" aria-hidden="true" {...props}>
      {symbols[name]}
    </svg>
  );
}
