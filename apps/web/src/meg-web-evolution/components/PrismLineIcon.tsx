import {useId,type ReactNode,type SVGProps} from 'react';

/** Prisma vetorial compartilhado na nova Web, não muda a semântica dos botões. */
type Props=SVGProps<SVGSVGElement>&{name:string;shape:ReactNode};
export function PrismLineIcon({name,shape,strokeWidth=2.1,...props}:Props){
 const uid='meg-prism-'+useId().replace(/[^a-zA-Z0-9_-]/g,'');
 return <svg viewBox="0 0 24 24" width={24} height={24} fill="none"
  stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
  aria-hidden="true" focusable="false" data-meg-icon-pack="meg-prism-system"
  data-meg-icon={name} {...props}>
  <defs><linearGradient id={uid} x1="0" y1="0" x2=".82" y2="1">
   <stop offset="0" stopColor="#f3fffb"/>
   <stop offset=".42" stopColor="currentColor"/>
   <stop offset="1" stopColor="#078f96"/>
  </linearGradient></defs>
  <g fill="none" stroke="#001b2a" strokeWidth={Number(strokeWidth)+.75}
    transform="translate(0 .65)" opacity=".64">{shape}</g>
  <g fill="none" stroke={'url(#'+uid+')'} strokeWidth={strokeWidth}>{shape}</g>
  <g fill="none" stroke="#f2fffb" strokeWidth=".36"
    transform="translate(-.14 -.26)" opacity=".44">{shape}</g>
 </svg>;
}
