import type {ReactNode} from 'react';

/**
 * MEG Prism: símbolos vetoriais próprios, com corpo arredondado,
 * profundidade por camadas e brilho de borda. Não usa fontes, CDN nem imagens.
 * Coordenadas 256x256, escaláveis sem perda de nitidez.
 *
 * Semântica: entrada = seta VERTICAL PARA BAIXO (entra no caixa),
 * saída = seta VERTICAL PARA CIMA (sai do caixa).
 * Não altera nenhum dado, status ou cálculo financeiro.
 */
const downArrow = 'M114 33h28a14 14 0 0 1 14 14v89h23a13 13 0 0 1 10 22l-51 57a14 14 0 0 1-21 0l-51-57a13 13 0 0 1 10-22h24V47a14 14 0 0 1 14-14Z';

export const megPrismIcons:Record<string,ReactNode> = {
  projection3d: <>
    <defs>
      <linearGradient id="meg-prism-proj-bars" x1="0" x2=".86" y1="0" y2="1">
        <stop stopColor="#a3fff2"/><stop offset=".38" stopColor="#39d6c9"/>
        <stop offset="1" stopColor="#087d8c"/>
      </linearGradient>
      <linearGradient id="meg-prism-proj-trend" x1="0" x2=".9" y1="0" y2="1">
        <stop stopColor="#eafffc"/><stop offset=".55" stopColor="#89fff4"/>
        <stop offset="1" stopColor="#19cdb6"/>
      </linearGradient>
    </defs>
    <g data-meg-surface="prism" strokeLinejoin="round">
      <rect x="26" y="169" width="48" height="64" rx="17" fill="#004752" opacity=".85"/>
      <rect x="26" y="161" width="48" height="63" rx="17" fill="url(#meg-prism-proj-bars)" opacity=".72"/>
      <rect x="83" y="126" width="48" height="107" rx="17" fill="#004752" opacity=".85"/>
      <rect x="83" y="118" width="48" height="106" rx="17" fill="url(#meg-prism-proj-bars)" opacity=".86"/>
      <rect x="140" y="88" width="48" height="145" rx="17" fill="#004752" opacity=".85"/>
      <rect x="140" y="80" width="48" height="144" rx="17" fill="url(#meg-prism-proj-bars)"/>
      <path d="M44 179v24M101 139v59M158 101v96" fill="none" stroke="#e7fff9" strokeWidth="7" strokeLinecap="round" opacity=".35"/>
      <path d="M31 128 91 102l39 19 91-90" fill="none" stroke="#003845" strokeWidth="30" strokeLinecap="round" strokeLinejoin="round" opacity=".8"/>
      <path d="M31 120 91 94l39 19 91-90" fill="none" stroke="url(#meg-prism-proj-trend)" strokeWidth="21" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M191 24h31v31" fill="none" stroke="#c9fff6" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M30 114 91 89" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".55"/>
    </g>
  </>,
  entry3d: <>
    <defs>
      <linearGradient id="meg-prism-entry-face" x1=".1" y1="0" x2=".85" y2="1">
        <stop stopColor="#b9ffe2"/><stop offset=".35" stopColor="#4cf3b9"/>
        <stop offset=".75" stopColor="#14ba91"/><stop offset="1" stopColor="#05725d"/>
      </linearGradient>
      <linearGradient id="meg-prism-entry-tray" x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#cefff0"/><stop offset=".5" stopColor="#35cfa4"/><stop offset="1" stopColor="#08745d"/>
      </linearGradient>
    </defs>
    <g data-financial-flow="down" data-meg-surface="prism">
      <path d={downArrow} transform="translate(0 8)" fill="#003f3e" opacity=".85"/>
      <path d={downArrow} fill="url(#meg-prism-entry-face)"/>
      <path d="M113 57v83" stroke="#f3fffa" strokeWidth="10" strokeLinecap="round" opacity=".6"/>
      <path d="M80 155 128 208" fill="none" stroke="#eafff3" strokeWidth="7" strokeLinecap="round" opacity=".44"/>
      <rect x="36" y="229" width="184" height="17" rx="8.5" fill="#003e3b" opacity=".88"/>
      <rect x="36" y="222" width="184" height="17" rx="8.5" fill="url(#meg-prism-entry-tray)"/>
    </g>
  </>,
  exit3d: <>
    <defs>
      <linearGradient id="meg-prism-exit-face" x1=".12" y1="0" x2=".9" y2="1">
        <stop stopColor="#ffd4c7"/><stop offset=".34" stopColor="#ff938d"/>
        <stop offset=".72" stopColor="#fa5a76"/><stop offset="1" stopColor="#ad314f"/>
      </linearGradient>
      <linearGradient id="meg-prism-exit-tray" x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#ffcac4"/><stop offset=".53" stopColor="#fa7580"/>
        <stop offset="1" stopColor="#97374b"/>
      </linearGradient>
    </defs>
    <g data-financial-flow="up" data-meg-surface="prism">
      <path d={downArrow} transform="translate(0 264) scale(1 -1)" fill="#4a1d37" opacity=".88"/>
      <path d={downArrow} transform="translate(0 256) scale(1 -1)" fill="url(#meg-prism-exit-face)"/>
      <path d="M113 201v-80" stroke="#fff2ed" strokeWidth="10" strokeLinecap="round" opacity=".6"/>
      <path d="M80 101 128 48" fill="none" stroke="#fff1e8" strokeWidth="7" strokeLinecap="round" opacity=".42"/>
      <rect x="36" y="229" width="184" height="17" rx="8.5" fill="#4b1b36" opacity=".86"/>
      <rect x="36" y="222" width="184" height="17" rx="8.5" fill="url(#meg-prism-exit-tray)"/>
    </g>
  </>,
  wallet3d: <>
    <defs>
      <linearGradient id="meg-prism-wallet-body" x1=".06" y1=".05" x2=".92" y2="1">
        <stop stopColor="#fff4bb"/><stop offset=".28" stopColor="#f5d66c"/>
        <stop offset=".65" stopColor="#cba43d"/><stop offset="1" stopColor="#745b20"/>
      </linearGradient>
      <linearGradient id="meg-prism-wallet-flap" x1=".1" y1="0" x2=".9" y2="1">
        <stop stopColor="#fff9db"/><stop offset=".45" stopColor="#ebc857"/>
        <stop offset="1" stopColor="#b17e25"/>
      </linearGradient>
    </defs>
    <g data-meg-surface="prism">
      <rect x="26" y="52" width="192" height="164" rx="34" fill="#63461c" opacity=".76" transform="translate(0 7)"/>
      <rect x="26" y="48" width="192" height="164" rx="34" fill="url(#meg-prism-wallet-body)"/>
      <path d="M35 79a26 26 0 0 1 26-26h119" fill="none" stroke="#fffdf1" strokeWidth="10" strokeLinecap="round" opacity=".65"/>
      <rect x="125" y="107" width="111" height="70" rx="26" fill="#634516" opacity=".75" transform="translate(0 5)"/>
      <rect x="125" y="102" width="111" height="70" rx="26" fill="url(#meg-prism-wallet-flap)"/>
      <path d="M142 116h67" stroke="#fff6cb" strokeWidth="8" strokeLinecap="round" opacity=".55"/>
      <circle cx="166" cy="137" r="16" fill="#775623" opacity=".55" transform="translate(1 3)"/>
      <circle cx="164" cy="134" r="14" fill="#fff2af"/>
      <circle cx="159" cy="129" r="4" fill="#fffdf6" opacity=".85"/>
    </g>
  </>,
  details3d: <>
    <defs>
      <linearGradient id="meg-prism-eye-outer" x1=".13" y1=".03" x2=".87" y2=".95">
        <stop stopColor="#e1fffb"/><stop offset=".4" stopColor="#89ede3"/>
        <stop offset="1" stopColor="#2aa89f"/>
      </linearGradient>
      <radialGradient id="meg-prism-eye-iris" cx=".34" cy=".24" r=".82">
        <stop stopColor="#c6fff4"/><stop offset=".35" stopColor="#3ad5bf"/>
        <stop offset="1" stopColor="#056e74"/>
      </radialGradient>
    </defs>
    <g data-meg-surface="prism">
      <path d="M19 134c31-45 68-68 109-68s78 23 109 68c-31 45-68 68-109 68S50 179 19 134Z" fill="#07313d" opacity=".82" transform="translate(0 7)"/>
      <path d="M19 127c31-45 68-68 109-68s78 23 109 68c-31 45-68 68-109 68S50 172 19 127Z" fill="url(#meg-prism-eye-outer)"/>
      <path d="M39 119c30-33 59-48 89-48" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" opacity=".68"/>
      <circle cx="128" cy="127" r="49" fill="#044c58" opacity=".9"/>
      <circle cx="128" cy="123" r="44" fill="url(#meg-prism-eye-iris)"/>
      <circle cx="128" cy="123" r="21" fill="#042c41"/>
      <circle cx="114" cy="108" r="12" fill="#f4fffb" opacity=".94"/>
      <circle cx="140" cy="140" r="5" fill="#d4fff3" opacity=".5"/>
    </g>
  </>,
};
