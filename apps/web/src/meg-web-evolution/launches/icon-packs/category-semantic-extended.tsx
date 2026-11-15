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

 'clothing': <>
  <path d="M88 41 54 53 24 103l33 19 15-24v123h112V98l15 24 33-19-30-50-34-12-14 26a32 32 0 0 1-52 0Z" fill="currentColor" opacity=".2"/>
  <path d="M88 41 54 53 24 103l33 19 15-24v123h112V98l15 24 33-19-30-50-34-12-14 26a32 32 0 0 1-52 0Z" fill="none" stroke="currentColor" strokeWidth="13" strokeLinejoin="round"/>
  <path d="M101 48c6 15 15 22 27 22s21-7 27-22" fill="none" stroke="currentColor" strokeWidth="11" strokeLinecap="round"/>
 </>,
 'electronics': <>
  <rect x="25" y="47" width="146" height="111" rx="12" fill="currentColor" opacity=".18"/>
  <rect x="25" y="47" width="146" height="111" rx="12" fill="none" stroke="currentColor" strokeWidth="14"/>
  <path d="M79 191h39m-20-33v33m-33 1h67" fill="none" stroke="currentColor" strokeWidth="13" strokeLinecap="round"/>
  <rect x="185" y="80" width="45" height="116" rx="11" fill="currentColor" opacity=".3"/>
  <rect x="185" y="80" width="45" height="116" rx="11" fill="none" stroke="currentColor" strokeWidth="13"/>
  <circle cx="207" cy="177" r="5" fill="currentColor"/>
 </>,
 'hygiene': <>
  <path d="M130 29C110 63 73 110 73 151a57 57 0 0 0 114 0c0-41-37-88-57-122Z" fill="currentColor" opacity=".18"/>
  <path d="M130 29C110 63 73 110 73 151a57 57 0 0 0 114 0c0-41-37-88-57-122Z" fill="none" stroke="currentColor" strokeWidth="15" strokeLinejoin="round"/>
  <path d="M108 160c5 12 14 18 26 19" fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
  <path d="M56 59v26m-13-13h26M201 45v36m-18-18h36" fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
 </>,
 'schoolSupplies': <>
  <path d="M25 52c42-12 73-9 103 12 29-21 61-24 103-12v157c-44-12-74-9-103 12-30-21-61-24-103-12Z" fill="currentColor" opacity=".16"/>
  <path d="M25 52c42-12 73-9 103 12 29-21 61-24 103-12v157c-44-12-74-9-103 12-30-21-61-24-103-12Z" fill="none" stroke="currentColor" strokeWidth="14" strokeLinejoin="round"/>
  <path d="M128 64v157M51 91c22-3 40 0 56 8m-56 20c22-3 40 0 56 8m42-28c16-8 34-11 56-8" fill="none" stroke="currentColor" strokeWidth="11" strokeLinecap="round"/>
 </>,
 'debt': <>
  <rect x="48" y="25" width="160" height="206" rx="15" fill="currentColor" opacity=".15"/>
  <rect x="48" y="25" width="160" height="206" rx="15" fill="none" stroke="currentColor" strokeWidth="14"/>
  <path d="M77 79h101M77 113h83m-83 37h54" fill="none" stroke="currentColor" strokeWidth="13" strokeLinecap="round"/>
  <path d="m119 181 21 20 43-44" fill="none" stroke="currentColor" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round"/>
 </>,
 'savings': <>
  <path d="M28 107 128 46l100 61v18H28v-18Zm21 33h158v15H49v-15Zm8 18h19v42H57v-42Zm62 0h18v42h-18v-42Zm62 0h18v42h-18v-42ZM35 215h186" fill="currentColor" opacity=".2" stroke="currentColor" strokeWidth="11" strokeLinejoin="round" strokeLinecap="round"/>
  <path d="M28 107 128 46l100 61v18H28v-18Zm21 33h158m-150 60h144M35 215h186" fill="none" stroke="currentColor" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round"/>
  <path d="M65 140v60m63-60v60m63-60v60" fill="none" stroke="currentColor" strokeWidth="13" strokeLinecap="round"/>
 </>,
 'beverages': <>
  <path d="M48 46h160l-18 103c-6 33-30 54-62 54s-56-21-62-54L48 46Z" fill="currentColor" opacity=".18"/>
  <path d="M48 46h160l-18 103c-6 33-30 54-62 54s-56-21-62-54L48 46Zm80 157v24m-42 0h84" fill="none" stroke="currentColor" strokeWidth="14" strokeLinejoin="round" strokeLinecap="round"/>
  <path d="M62 94h132" fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round" opacity=".8"/>
 </>,
 'fastFood': <>
  <path d="M35 111c0-44 38-74 93-74s93 30 93 74H35Zm3 44h180m-173 21h166c0 25-20 43-47 43H92c-27 0-47-18-47-43Z" fill="currentColor" opacity=".16" stroke="currentColor" strokeWidth="13" strokeLinejoin="round"/>
  <path d="M35 111c0-44 38-74 93-74s93 30 93 74H35Zm2 20h182m-177 27h172m-169 18h166c0 25-20 43-47 43H92c-27 0-47-18-47-43Z" fill="none" stroke="currentColor" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round"/>
  <path d="M91 82h2m39-12h2m35 14h2" fill="none" stroke="currentColor" strokeWidth="11" strokeLinecap="round"/>
 </>,
 'reimbursement': <>
  <path d="M48 30h137l25 29v166H48Z" fill="currentColor" opacity=".17"/>
  <path d="M48 30h137l25 29v166H48Z" fill="none" stroke="currentColor" strokeWidth="14" strokeLinejoin="round"/>
  <path d="M74 91h103M74 121h70m-58 51h98m-12-19 20 19-20 19" fill="none" stroke="currentColor" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round"/>
 </>,
};