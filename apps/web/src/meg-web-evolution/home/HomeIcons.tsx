/**
 * Ícones exclusivos da Home MEG, baseados na linguagem Lucide:
 * https://lucide.dev/icons (ISC; Lucide Contributors).
 * Formato SVG com traço consistente, sem CSS global nem alteração da sidebar.
 */
import type { ReactNode } from 'react';

const glyphs:Record<string,ReactNode>={
  wallet:<><rect x="2.5" y="5.5" width="19" height="15" rx="2.5"/><path d="M3 8V5a2.5 2.5 0 0 1 2.5-2.5h12"/><path d="M16.2 12h5.3v5h-5.3a2.5 2.5 0 1 1 0-5Z"/><circle cx="17.9" cy="14.5" r=".55" fill="currentColor" stroke="none"/></>,
  flow:<><path d="M4.5 20V12M9.5 20V6M14.5 20V10M19.5 20V3"/><path d="M3 3h18" opacity=".36"/></>,
  up:<><path d="m5 13 7-7 7 7"/><path d="M12 6v14"/></>,
  down:<><path d="m5 11 7 7 7-7"/><path d="M12 18V4"/></>,
  equal:<><path d="M4.5 9h15M4.5 15h15"/></>,
  file:<><path d="M13.2 2.7H6a2 2 0 0 0-2 2v14.6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9.5Z"/><path d="M13 2.7V9h7M8 13h8M8 17h8"/></>,
  card:<><rect x="2" y="5" width="20" height="14" rx="2.6"/><path d="M2 10.5h20M6.5 15h4"/></>,
  clock:<><circle cx="12" cy="12" r="9.4"/><path d="M12 6.5v5.8l4 2.5"/></>,
  check:<><circle cx="12" cy="12" r="9.4"/><path d="m7.2 12.2 3.1 3.1 6.6-6.9"/></>,
  gift:<><rect x="3.3" y="9" width="17.4" height="12" rx="1.5"/><path d="M2.5 6.1h19v3h-19ZM12 6v15"/><path d="M12 6C8.4-.8 4.4 2 6.7 5.1c.7.9 2.4.9 5.3.9ZM12 6C15.6-.8 19.6 2 17.3 5.1c-.7.9-2.4.9-5.3.9Z"/></>,
  zap:<path d="m13.4 2-9 12h7.3l-.8 8.1 9-12h-7.3l.8-8.1Z"/>,
  plus:<path d="M12 4.2v15.6M4.2 12h15.6"/>,
  swap:<><path d="M4 8h16l-4-4M20 16H4l4 4"/></>,
  report:<><rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M8 16v-4M12 16V8M16 16v-6"/></>,
  settings:<><path d="M9.8 3.1 9.2 5a8.4 8.4 0 0 0-1.7 1L5.6 5.6 3.8 8.7l1.4 1.5a8.6 8.6 0 0 0 0 3.6l-1.4 1.5 1.8 3.1 1.9-.4a8.5 8.5 0 0 0 1.7 1l.6 1.9h3.6l.6-1.9a8.5 8.5 0 0 0 1.7-1l1.9.4 1.8-3.1-1.4-1.5a8.6 8.6 0 0 0 0-3.6l1.4-1.5-1.8-3.1-1.9.4a8.4 8.4 0 0 0-1.7-1l-.6-1.9Z"/><circle cx="12" cy="12" r="3"/></>,
  cart:<><circle cx="9" cy="20" r="1" fill="currentColor"/><circle cx="18" cy="20" r="1" fill="currentColor"/><path d="M2 3h2l2.5 13h13l2.1-9H5"/></>,
  fuel:<><rect x="3.5" y="3.5" width="10.5" height="17.5" rx="1.4"/><path d="M3 21h13M6.5 7.5h4.5M14 10l3.5 3.5V19a2.2 2.2 0 0 0 4.4 0V9l-3.7-4"/></>,
  restaurant:<><path d="M4 3v7M7.5 3v7M11 3v7M7.5 10v11M19 3v18M19 3c-6.3 2-6.3 11 0 11"/></>,
  medicine:<><path d="m4.5 13 8.5-8.5a5 5 0 0 1 7 7L11.5 20a5 5 0 0 1-7-7Z"/><path d="m9 9 6 6"/></>,
  arrow:<path d="m9 5 7 7-7 7"/>,
  eye:<><path d="M2.1 12s3.8-6.2 9.9-6.2S21.9 12 21.9 12s-3.8 6.2-9.9 6.2S2.1 12 2.1 12Z"/><circle cx="12" cy="12" r="3.2"/></>,
  eyeOff:<><path d="M3 3l18 18M8.8 6.3A12 12 0 0 1 12 5.8c6.1 0 9.9 6.2 9.9 6.2a15 15 0 0 1-3.7 4.2M6.1 8c-2.5 1.9-4 4-4 4s3.8 6.2 9.9 6.2c1.1 0 2.2-.2 3.2-.6"/></>
};
export function Icon({name,size=22}:{name:string;size?:number}){
 return <svg className="meg-home-icon-svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{glyphs[name]??glyphs.file}</svg>;
}
