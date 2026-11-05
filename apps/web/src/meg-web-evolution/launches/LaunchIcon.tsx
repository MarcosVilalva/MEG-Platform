import type {ReactNode, SVGProps} from 'react';

/*
 * Curadoria local de SVGs do pacote Lucide Icons para a Etapa 09.
 * Origem: https://github.com/lucide-icons/lucide/tree/main/icons
 * Licença ISC, Copyright (c) 2026 Lucide Icons and Contributors
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 *
 * Ícones empacotados localmente para não alterar dependências, API, Android
 * nem o Shell/DataGrid compartilhados. A licença e os paths originais ficam
 * preservados neste arquivo; não há chamadas a CDNs no navegador.
 */

export type LaunchIconName = 'trendUp' | 'trendDown' | 'chart' | 'wallet' | 'grocery' | 'health' | 'transport' | 'home' | 'income' | 'generic' | 'food' | 'fuel' | 'education' | 'leisure' | 'services' | 'gift' | 'card' | 'work' | 'subscriptions';

const glyphs:Record<LaunchIconName,ReactNode> = {
  trendUp: <>
    <path d="M16 7h6v6"/>
    <path d="m22 7-8.5 8.5-5-5L2 17"/>
  </>,
  trendDown: <>
    <path d="M16 17h6v-6"/>
    <path d="m22 17-8.5-8.5-5 5L2 7"/>
  </>,
  chart: <>
    <path d="M12 16v5"/>
    <path d="M16 14.639V21"/>
    <path d="M20 10.656V21"/>
    <path d="m22 3-8.646 8.646a.5.5 0 0 1-.708 0L9.354 8.354a.5.5 0 0 0-.707 0L2 15"/>
    <path d="M4 18.463V21"/>
    <path d="M8 14.656V21"/>
  </>,
  wallet: <>
    <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/>
    <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>
  </>,
  grocery: <>
    <path d="m15 11-1 9"/>
    <path d="m19 11-4-7"/>
    <path d="M2 11h20"/>
    <path d="m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6l1.7-7.4"/>
    <path d="M4.5 15.5h15"/>
    <path d="m5 11 4-7"/>
    <path d="m9 11 1 9"/>
  </>,
  health: <>
    <path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"/>
    <path d="M3.22 13H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>
  </>,
  transport: <>
    <path d="m21 8-2 2-1.5-3.7A2 2 0 0 0 15.646 5H8.4a2 2 0 0 0-1.903 1.257L5 10 3 8"/>
    <path d="M7 14h.01"/>
    <path d="M17 14h.01"/>
    <rect width="18" height="8" x="3" y="10" rx="2"/>
    <path d="M5 18v2"/>
    <path d="M19 18v2"/>
  </>,
  home: <>
    <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/>
    <path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
  </>,
  income: <>
    <rect width="20" height="12" x="2" y="6" rx="2"/>
    <circle cx="12" cy="12" r="2"/>
    <path d="M6 12h.01M18 12h.01"/>
  </>,
  generic: <>
    <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/>
    <circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>
  </>,
  food: <>
    <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
    <path d="M7 2v20"/>
    <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>
  </>,
  fuel: <>
    <path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 4 0v-6.998a2 2 0 0 0-.59-1.42L18 5"/>
    <path d="M14 21V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v16"/>
    <path d="M2 21h13"/>
    <path d="M3 9h11"/>
  </>,
  education: <>
    <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/>
    <path d="M22 10v6"/>
    <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>
  </>,
  leisure: <>
    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
    <path d="M13 5v2"/>
    <path d="M13 17v2"/>
    <path d="M13 11v2"/>
  </>,
  services: <>
    <path d="M12 17V7"/>
    <path d="M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8"/>
    <path d="M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z"/>
  </>,
  gift: <>
    <path d="M12 7v14"/>
    <path d="M20 11v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8"/>
    <path d="M7.5 7a1 1 0 0 1 0-5A4.8 8 0 0 1 12 7a4.8 8 0 0 1 4.5-5 1 1 0 0 1 0 5"/>
    <rect x="3" y="7" width="18" height="4" rx="1"/>
  </>,
  card: <>
    <rect width="20" height="14" x="2" y="5" rx="2"/>
    <line x1="2" x2="22" y1="10" y2="10"/>
    <path d="M6 14h2"/>
  </>,
  work: <>
    <path d="M12 12h.01"/>
    <path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
    <path d="M22 13a18.15 18.15 0 0 1-20 0"/>
    <rect width="20" height="14" x="2" y="6" rx="2"/>
  </>,
  subscriptions: <>
    <rect width="14" height="20" x="5" y="2" rx="2" ry="2"/>
    <path d="M12 18h.01"/>
  </>,
};

export function LaunchIcon({name,...props}:{name:LaunchIconName}&SVGProps<SVGSVGElement>){
 return <svg
  viewBox="0 0 24 24" fill="none" stroke="currentColor"
  strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
  width={24} height={24} focusable="false" aria-hidden="true"
  data-launch-icon={name} {...props}
 >{glyphs[name]}</svg>;
}
