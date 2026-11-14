import {useId} from 'react';

/**
 * Símbolo MEG Prism específico da apresentação de compromisso vencido.
 * Não classifica vencimentos: recebe essa decisão do item canônico.
 * SVG vetorial com contorno arredondado, contraste no "!" e luz discreta.
 */
export function HomeOverdueWarningIcon({size=26}:{size?:number}){
 const id=useId().replace(/:/g,'');
 const body=`meg-overdue-body-${id}`;
 return <svg viewBox="0 0 32 32" width={size} height={size}
  aria-hidden="true" focusable="false" data-meg-due-warning="overdue-triangle">
  <defs>
   <linearGradient id={body} x1="12%" y1="0%" x2="89%" y2="100%">
    <stop offset="0%" stopColor="#ffd6cd"/>
    <stop offset="25%" stopColor="#ff988d"/>
    <stop offset="66%" stopColor="#e26579"/>
    <stop offset="100%" stopColor="#a7395e"/>
   </linearGradient>
  </defs>
  <path d="M13.6 5.6a2.75 2.75 0 0 1 4.8 0l10.75 18.6A2.75 2.75 0 0 1 26.8 28H5.2a2.75 2.75 0 0 1-2.38-4.13L13.6 5.6Z"
    fill="#521f39" opacity=".8" transform="translate(0 1.15)"/>
  <path d="M13.6 5.6a2.75 2.75 0 0 1 4.8 0l10.75 18.6A2.75 2.75 0 0 1 26.8 28H5.2a2.75 2.75 0 0 1-2.38-4.13L13.6 5.6Z"
    fill={`url(#${body})`} stroke="#ffb7b6" strokeWidth=".75" strokeLinejoin="round"/>
  <path d="m14.45 7.4-9.4 16.2" fill="none" stroke="#fff5eb"
    strokeWidth="1.55" strokeLinecap="round" opacity=".68"/>
  <path d="M16 11.4v8" stroke="#58243a" strokeWidth="4.6"
    strokeLinecap="round" opacity=".65" transform="translate(.3 .65)"/>
  <path d="M16 11.4v8" stroke="#fffaf4" strokeWidth="3.45" strokeLinecap="round"/>
  <circle cx="16" cy="23.35" r="2.1" fill="#66263e" opacity=".6" transform="translate(.3 .6)"/>
  <circle cx="16" cy="23.35" r="1.7" fill="#fffaf4"/>
 </svg>;
}
