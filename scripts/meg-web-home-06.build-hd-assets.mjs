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

// Hero editorial sem carteira e sem grafico ficticio de rendimento.
// A arte é apenas atmosfera, e não disputa a leitura do saldo real.
const sceneSvg=[
 '<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="1200" viewBox="0 0 2400 1200">',
 '<defs>',
 '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#00121b"/><stop offset=".46" stop-color="#01343c"/><stop offset="1" stop-color="#001721"/></linearGradient>',
 '<radialGradient id="soft" cx=".69" cy=".35" r=".60"><stop stop-color="#3de5cb" stop-opacity=".41"/><stop offset=".40" stop-color="#168f95" stop-opacity=".18"/><stop offset="1" stop-color="#0b4452" stop-opacity="0"/></radialGradient>',
 '<linearGradient id="desk" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#0b4b53"/><stop offset="1" stop-color="#01151f"/></linearGradient>',
 '<linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#8dfbea" stop-opacity=".23"/><stop offset=".35" stop-color="#48d8cd" stop-opacity=".045"/><stop offset="1" stop-color="#0a7278" stop-opacity=".12"/></linearGradient>',
 '<filter id="blur"><feGaussianBlur stdDeviation="85"/></filter>',
 '<filter id="soften"><feGaussianBlur stdDeviation="25"/></filter>',
 '<filter id="shadow"><feGaussianBlur stdDeviation="35"/></filter>',
 '</defs>',
 '<rect width="2400" height="1200" fill="url(#bg)"/>',
 '<rect width="2400" height="1200" fill="url(#soft)"/>',
 '<g filter="url(#blur)" opacity=".50">',
 '<circle cx="1830" cy="182" r="225" fill="#3ce3d7"/>',
 '<ellipse cx="2230" cy="410" rx="175" ry="370" fill="#095568"/>',
 '<circle cx="1570" cy="575" r="155" fill="#249c9c"/>',
 '<rect x="1450" y="-150" width="78" height="820" rx="40" fill="#7afde9" transform="rotate(9 1450 -150)"/>',
 '<rect x="2060" y="-95" width="45" height="620" rx="26" fill="#76e4de" transform="rotate(11 2060 -95)"/>',
 '</g>',
 '<path d="M0 992L2400 902V1200H0Z" fill="url(#desk)" opacity=".72"/>',
 '<path d="M910 1035L2400 973" stroke="#40b8b1" stroke-opacity=".13" stroke-width="5"/>',
 '<ellipse cx="1955" cy="984" rx="368" ry="76" fill="#000b15" opacity=".72" filter="url(#shadow)"/>',
 '<g transform="translate(1780 289)">',
 '<rect x="17" y="25" width="499" height="569" rx="54" fill="#00141d" opacity=".51" filter="url(#shadow)"/>',
 '<rect width="510" height="565" rx="48" fill="#032d38" fill-opacity=".55" stroke="#4bdcca" stroke-opacity=".44" stroke-width="5"/>',
 '<rect x="20" y="20" width="470" height="525" rx="37" fill="url(#glass)" stroke="#86ffea" stroke-opacity=".15" stroke-width="3"/>',
 '<path d="M31 68Q80 26 174 27" stroke="#b8fff2" stroke-opacity=".18" stroke-width="8" fill="none"/>',
 '<path d="M435 53V485" stroke="#76ffe6" stroke-opacity=".12" stroke-width="14"/>',
 '</g>',
 '<g opacity=".2" filter="url(#soften)"><ellipse cx="1818" cy="867" rx="390" ry="32" fill="#4df8e6"/></g>',
 '</svg>'
].join('');
const logo=await sharp(officialLogo).resize(350,350,{fit:'contain'}).png().toBuffer();
const hero=await sharp(Buffer.from(sceneSvg))
 .composite([{input:logo,left:1870,top:400}])
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
