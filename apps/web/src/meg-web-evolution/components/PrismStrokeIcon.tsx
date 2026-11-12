import {useId, type ReactNode, type SVGProps} from 'react';

/**
 * MEG Prism / microiconografia 24x24.
 * Mantém a geometria semântica já utilizada em Home e Shell.
 * Sobrepõe volume vetorial (contorno de profundidade, gradiente de superfície
 * e pequeno reflexo) sem imagens raster, fontes de ícones nem dependências.
 * Os ícones financeiros grandes continuam com modelos próprios 256x256.
 */
type PrismStrokeProps=Omit<SVGProps<SVGSVGElement>,'children'> & {
  children:ReactNode;
  tone?:'aqua'|'income'|'expense'|'gold'|'neutral';
};
const colors={
 aqua:['#eafffa','#73f6e4','#17aaa9'],
 income:['#eafff2','#7bffcd','#13a97a'],
 expense:['#fff0e9','#ff9d9d','#d74c70'],
 gold:['#fffbe0','#ffe08a','#c18c36'],
 neutral:['#f1ffff','#c3e4e4','#71acae'],
} as const;

export function PrismStrokeIcon({
  children,tone='aqua',width=22,height=22,className,...props
}:PrismStrokeProps){
  const id=useId().replace(/:/g,'');
  const [light,mid,dark]=colors[tone];
  return <svg
    viewBox="0 0 24 24" width={width} height={height}
    fill="none" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" focusable="false"
    className={className}
    data-meg-prism="micro-3d"
    {...props}
  >
    <defs>
      <linearGradient id={`meg-prism-stroke-${id}`} x1="0%" y1="0%" x2="90%" y2="100%">
        <stop offset="0%" stopColor={light}/>
        <stop offset="44%" stopColor={mid}/>
        <stop offset="100%" stopColor={dark}/>
      </linearGradient>
    </defs>
    <g transform="translate(0 .72)" stroke="#002730" strokeWidth="3.75" opacity=".76">{children}</g>
    <g stroke={`url(#meg-prism-stroke-${id})`} strokeWidth="2.45">{children}</g>
    <g transform="translate(-.17 -.3)" stroke="#fffefa" strokeWidth=".55" opacity=".43">{children}</g>
  </svg>;
}
