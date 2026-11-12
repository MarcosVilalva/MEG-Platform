import type {ReactNode} from 'react';

/**
 * Refinamento pontual autorizado em 12/11/2026.
 * SVGs próprios, coordenadas Phosphor 256×256, traço uniforme e sem dependência externa.
 * Não representam regras financeiras e não alteram valores do resumo canônico.
 */
export const launchRefinedIcons:Record<string,ReactNode>={
  projectedChart: <>
    <g fill="none" stroke="currentColor" strokeWidth={16} strokeLinecap="round" strokeLinejoin="round">
      <path d="M40 205V166M96 205V143M152 205V164M208 205V110" opacity=".34"/>
      <path d="M32 142l60-57 51 30 70-74"/>
      <path d="M164 41h49v49"/>
    </g>
  </>,
  cashIn: <>
    <g fill="none" stroke="currentColor" strokeWidth={18} strokeLinecap="round" strokeLinejoin="round">
      <path d="M205 51L51 205"/>
      <path d="M51 121v84h84"/>
    </g>
  </>,
  cashOut: <>
    <g fill="none" stroke="currentColor" strokeWidth={18} strokeLinecap="round" strokeLinejoin="round">
      <path d="M51 205L205 51"/>
      <path d="M121 51h84v84"/>
    </g>
  </>,
  walletMinimal: <>
    <g fill="none" stroke="currentColor" strokeWidth={16} strokeLinecap="round" strokeLinejoin="round">
      <path d="M51 71h148a21 21 0 0 1 21 21v104a20 20 0 0 1-20 20H51a27 27 0 0 1-27-27V85a27 27 0 0 1 27-27h138"/>
      <path d="M220 116h-61a22 22 0 0 0 0 44h61"/>
      <circle cx="166" cy="138" r="4" fill="currentColor" stroke="none"/>
    </g>
  </>,
  eye: <>
    <g fill="none" stroke="currentColor" strokeWidth={17} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 128s40-62 106-62 106 62 106 62-40 62-106 62S22 128 22 128Z"/>
      <circle cx="128" cy="128" r="29"/>
    </g>
  </>,
};
