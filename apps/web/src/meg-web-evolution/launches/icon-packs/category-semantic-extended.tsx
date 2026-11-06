import type {ReactNode} from 'react';

/**
 * Glifos semânticos originais do MEG, separados dos glifos Phosphor Core MIT.
 * Apenas apresentação SVG, sem carga remota, classificação ou operações.
 * Mesma geometria 256x256 e espessura visual da coleção existente.
 */
export const categorySemanticExtended:Record<string,ReactNode>={
 'marketCart': <>
  <path d="M28 44h24l21 114c2 12 12 20 24 20h103" fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round"/>
  <path d="M64 70h162l-17 79c-2 11-12 19-24 19H81" fill="currentColor" opacity=".19"/>
  <path d="M64 70h162l-17 79c-2 11-12 19-24 19H81" fill="none" stroke="currentColor" strokeWidth="16" strokeLinejoin="round"/>
  <circle cx="102" cy="211" r="14" fill="currentColor"/>
  <circle cx="192" cy="211" r="14" fill="currentColor"/>
 </>,
 'motorcycle': <>
  <circle cx="62" cy="187" r="35" fill="currentColor" opacity=".16"/>
  <circle cx="196" cy="187" r="35" fill="currentColor" opacity=".16"/>
  <circle cx="62" cy="187" r="35" fill="none" stroke="currentColor" strokeWidth="15"/>
  <circle cx="196" cy="187" r="35" fill="none" stroke="currentColor" strokeWidth="15"/>
  <path d="M62 187l46-70 46 70H62l-16-43M154 187l24-60h25l-12-30h-21" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round"/>
  <path d="M96 117h37M173 96h31M185 86v18" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round"/>
  <path d="M87 101c0-9 7-16 16-16h35" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round"/>
 </>,
 'petPaw': <>
  <ellipse cx="63" cy="107" rx="18" ry="25" transform="rotate(-19 63 107)" fill="currentColor" opacity=".84"/>
  <ellipse cx="103" cy="74" rx="18" ry="25" transform="rotate(-7 103 74)" fill="currentColor"/>
  <ellipse cx="153" cy="74" rx="18" ry="25" transform="rotate(7 153 74)" fill="currentColor"/>
  <ellipse cx="193" cy="107" rx="18" ry="25" transform="rotate(19 193 107)" fill="currentColor" opacity=".84"/>
  <path d="M128 129c-19 0-33 12-46 26-13 14-23 25-23 41 0 16 13 29 30 29 14 0 24-9 39-9s25 9 39 9c17 0 30-13 30-29 0-16-10-27-23-41-13-14-27-26-46-26Z" fill="currentColor" opacity=".92"/>
  <path d="M128 145c-15 0-27 11-38 24-10 11-16 19-16 27" fill="none" stroke="#fff" strokeOpacity=".17" strokeWidth="8" strokeLinecap="round"/>
 </>,
};