/**
 * MEG Web Evolution / Home 06 / cena HD do saldo e Verocard.
 * Cena do saldo sem carteira: arte vetorial própria e logotipo canônico.
 * Números e controles permanecem exclusivamente no React.
 * O logotipo vem do SVG canônico do projeto (nunca redesenhado).
 */
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
const sharp = require(process.env.MEG_SHARP_MODULE || 'sharp');
const root = resolve(import.meta.dirname, '../apps/web/public/meg-web-evolution/home');
mkdirSync(root, { recursive: true });
const officialLogo = readFileSync(resolve(import.meta.dirname, '../apps/web/public/brand/logo-meg-financas.svg'));

// Cena editorial estática. Gráfico de fundo é decorativo, sem representar dados.
const sceneW=2400,sceneH=1200;
const bars=Array.from({length:10},(_,i)=>{
  const x=1320+i*93,h=164+i*55,y=886-h;
  const shade=['#13ead8','#0bc8c4','#0f9fba'][i%3];
  return [
   '<g opacity="'+(0.40+i*.05).toFixed(3)+'">',
   '<rect x="'+x+'" y="'+y+'" width="48" height="'+h+'" rx="5" fill="url(#columnFill)" stroke="'+shade+'" stroke-width="3"/>',
   '<path d="M'+x+' '+y+'l20 -14h48l-20 14Z" fill="#8bfff3" opacity=".4"/>',
   '<path d="M'+(x+48)+' '+y+'l20 -14v'+h+'l-20 14Z" fill="#087d91" opacity=".5"/>',
   '<path d="M'+(x+8)+' '+(y+14)+'v'+(h-26)+'" stroke="#9ffff2" stroke-opacity=".32" stroke-width="3"/>',
   '</g>'
  ].join('');
}).join('');
const sceneSvg=String.raw`
<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="1200" viewBox="0 0 2400 1200">
<defs>
 <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#00131d"/><stop offset=".48" stop-color="#002a34"/><stop offset="1" stop-color="#031924"/></linearGradient>
 <radialGradient id="halo"><stop stop-color="#12e7c7" stop-opacity=".46"/><stop offset=".4" stop-color="#16a9aa" stop-opacity=".24"/><stop offset="1" stop-color="#11cab9" stop-opacity="0"/></radialGradient>
 <linearGradient id="columnFill" x1="0" y1="0" x2="1" y2=".2"><stop stop-color="#046377" stop-opacity=".5"/><stop offset=".4" stop-color="#0ca7af" stop-opacity=".8"/><stop offset="1" stop-color="#083b4a" stop-opacity=".9"/></linearGradient>
 <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#093943"/><stop offset="1" stop-color="#02141e"/></linearGradient>
 <linearGradient id="pathline" x1="0" y1="0" x2="1" y2=".1"><stop stop-color="#036875" stop-opacity="0"/><stop offset=".3" stop-color="#15c0b7"/><stop offset=".78" stop-color="#7cfff2"/><stop offset="1" stop-color="#08c0ca"/></linearGradient>
 <filter id="depth"><feGaussianBlur stdDeviation="53"/></filter>
 <filter id="glow"><feGaussianBlur stdDeviation="18"/></filter>
 <filter id="floorBlur"><feGaussianBlur stdDeviation="12"/></filter>
</defs>
<rect width="2400" height="1200" fill="url(#bg)"/>
<g opacity=".54" filter="url(#depth)">
 <ellipse cx="1804" cy="398" rx="830" ry="470" fill="url(#halo)"/>
 <path d="M1430 -100h68v615h-68z" fill="#9efff5" opacity=".32" transform="rotate(12 1430 0)"/>
 <path d="M1890 -100h38v535h-38z" fill="#39f6ed" opacity=".3" transform="rotate(-8 1900 0)"/>
 <ellipse cx="2210" cy="520" rx="270" ry="230" fill="#166a71"/>
</g>
<path d="M0 940L2400 830V1200H0Z" fill="url(#floor)"/>
<g opacity=".17" stroke="#3ac5b9" fill="none" stroke-width="2">
 <path d="M0 1044L2400 918"/><path d="M0 1111L2400 1021"/>
 <path d="M600 1200L1450 861"/><path d="M1200 1200L1800 838"/><path d="M1750 1200L2200 830"/>
</g>
<ellipse cx="1810" cy="910" rx="590" ry="92" fill="#000a11" opacity=".68" filter="url(#depth)"/>
<g>
 <ellipse cx="1860" cy="921" rx="535" ry="88" fill="#02212d" stroke="#0c6571" stroke-width="6"/>
 <path d="M1325 923v45c0 48 235 85 535 85s535-37 535-85v-45" fill="#02131d" stroke="#0b4f58" stroke-width="4"/>
 <ellipse cx="1860" cy="918" rx="527" ry="82" fill="#073542" stroke="#27b2a6" stroke-opacity=".65" stroke-width="5"/>
 <ellipse cx="1860" cy="918" rx="470" ry="58" fill="#001823" opacity=".7"/>
 <path d="M1480 940Q1850 1021 2260 940" stroke="#1be8d0" stroke-opacity=".62" stroke-width="7" fill="none" filter="url(#floorBlur)"/>
</g>
<!-- BARS -->
<path d="M890 797C1140 849 1240 720 1432 667S1735 459 1870 487S2100 383 2310 324" fill="none" stroke="#24f7d9" stroke-width="29" stroke-opacity=".47" filter="url(#glow)"/>
<path d="M890 797C1140 849 1240 720 1432 667S1735 459 1870 487S2100 383 2310 324" fill="none" stroke="url(#pathline)" stroke-width="8" stroke-linecap="round"/>
<path d="M1050 878C1220 812 1300 840 1475 760S1745 615 1930 650S2210 520 2385 476" stroke="#45eee3" stroke-opacity=".23" stroke-width="3" fill="none"/>
<g filter="url(#glow)" opacity=".6"><circle cx="1870" cy="487" r="20" fill="#9efff2"/><circle cx="2310" cy="324" r="21" fill="#7bfff0"/></g>
</svg>`.replace('<!-- BARS -->',bars);
const logo=await sharp(officialLogo).resize(315,315,{fit:'contain'}).png().toBuffer();
const hero=await sharp(Buffer.from(sceneSvg))
 .composite([{input:logo,left:1875,top:540}])
 .webp({lossless:true,effort:6}).toBuffer();

const cardSvg=String.raw`
<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="720" viewBox="0 0 1100 720">
<defs>
 <linearGradient id="base" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#112c3b"/><stop offset=".47" stop-color="#081d29"/><stop offset="1" stop-color="#04131c"/></linearGradient>
 <linearGradient id="ribbon" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#035b64"/><stop offset=".42" stop-color="#1bd9d2"/><stop offset="1" stop-color="#034e64"/></linearGradient>
 <linearGradient id="chip" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fce8b0"/><stop offset=".52" stop-color="#d0a24e"/><stop offset="1" stop-color="#97702e"/></linearGradient>
 <linearGradient id="gloss" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ccfff2" stop-opacity=".20"/><stop offset=".36" stop-color="#c6fff1" stop-opacity="0"/><stop offset="1" stop-color="#30e8d3" stop-opacity=".09"/></linearGradient>
 <filter id="shadow"><feGaussianBlur stdDeviation="27"/></filter>
 <clipPath id="round"><rect x="61" y="53" width="976" height="595" rx="51"/></clipPath>
</defs>
<ellipse cx="552" cy="661" rx="478" ry="38" fill="#00060e" opacity=".8" filter="url(#shadow)"/>
<rect x="59" y="51" width="980" height="599" rx="54" fill="url(#base)" stroke="#258d94" stroke-width="4"/>
<g clip-path="url(#round)">
<path d="M712 53H965L716 651H454Z" fill="url(#ribbon)" opacity=".83"/>
<path d="M836 52H931L689 652H582Z" fill="#29ddce" opacity=".25"/>
<path d="M982 52H1100L855 652H739Z" fill="#20a5ab" opacity=".23"/>
<rect x="61" y="53" width="976" height="595" fill="url(#gloss)"/>
</g>
<rect x="60" y="52" width="978" height="597" rx="53" fill="none" stroke="#62dacf" stroke-opacity=".24" stroke-width="4"/>
<rect x="155" y="353" width="125" height="95" rx="15" fill="url(#chip)" stroke="#ffe9b8" stroke-width="3"/>
<path d="M155 399H280M217 353V448M177 374H258M177 429H258" stroke="#886428" stroke-width="3" fill="none"/>
<g stroke="#c5eeec" fill="none" stroke-width="10" stroke-linecap="round" opacity=".86"><path d="M922 255q53 55 0 110"/><path d="M889 278q33 33 0 66"/><path d="M859 295q16 17 0 34"/></g>
<text x="150" y="588" font-family="Arial,sans-serif" font-size="32" letter-spacing="3" fill="#e3f6f4">VEROCARD</text>
<circle cx="892" cy="555" r="48" fill="#f64c3c"/><circle cx="951" cy="555" r="48" fill="#ffb825"/>
<path d="M921 516q37 38 0 78q-38-40 0-78" fill="#ff8422"/>
</svg>`;
const cardLogo=await sharp(officialLogo).resize(171,171,{fit:'contain'}).png().toBuffer();
const cardBody=await sharp(Buffer.from(cardSvg))
 .composite([{input:cardLogo,left:130,top:77}])
 .rotate(-7,{background:{r:0,g:0,b:0,alpha:0}})
 .png().toBuffer();
const cardMeta=await sharp(cardBody).metadata();
const cardTransparent={r:0,g:0,b:0,alpha:0};
const card=await sharp({create:{width:1800,height:1040,channels:4,background:cardTransparent}})
 .composite([{input:cardBody,left:Math.floor((1800-(cardMeta.width??1210))/2),top:Math.floor((1040-(cardMeta.height??850))/2)}])
 .webp({quality:96,effort:6}).toBuffer();
for(const [name,buffer] of [['meg-balance-scene-hd.webp',hero],['verocard-oficial-panorama.webp',card]]){
 const p=resolve(root,name);writeFileSync(p,buffer);const info=await sharp(buffer).metadata();
 if((info.width??0)<1800||(info.height??0)<1000||statSync(p).size<30000)throw Error(name+': quality gate failed');
 console.log(JSON.stringify({name,width:info.width,height:info.height,bytes:statSync(p).size,sha256:createHash('sha256').update(buffer).digest('hex')}));
}
