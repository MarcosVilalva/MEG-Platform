/**
 * MEG Web Evolution / Home 06 / imagens editoriais oficiais.
 * Composição vetorial própria, independente de foto externa, screenshot ou mock.
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

const walletBodySvg = String.raw`
<svg xmlns="http://www.w3.org/2000/svg" width="990" height="690" viewBox="0 0 990 690">
<defs>
 <linearGradient id="leather" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#062832"/><stop offset=".17" stop-color="#071b24"/><stop offset=".55" stop-color="#050f18"/><stop offset=".86" stop-color="#03090e"/><stop offset="1" stop-color="#082b30"/></linearGradient>
 <linearGradient id="rim" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#52cabb"/><stop offset=".22" stop-color="#18555a"/><stop offset=".65" stop-color="#06151f"/><stop offset="1" stop-color="#2b6c6a"/></linearGradient>
 <radialGradient id="edge" cx=".75" cy=".15" r=".9"><stop stop-color="#19a7a2" stop-opacity=".31"/><stop offset=".52" stop-color="#0a2734" stop-opacity=".08"/><stop offset="1" stop-color="#030b10" stop-opacity=".24"/></radialGradient>
 <filter id="grain"><feTurbulence baseFrequency=".44" numOctaves="3" seed="17" type="fractalNoise"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".13"/></feComponentTransfer></filter>
 <filter id="softshadow" x="-30%" y="-40%" width="160%" height="180%"><feGaussianBlur stdDeviation="24"/></filter>
 <clipPath id="body"><rect x="60" y="55" width="840" height="540" rx="63"/></clipPath>
</defs>
<ellipse cx="508" cy="618" rx="408" ry="49" fill="#000508" opacity=".72" filter="url(#softshadow)"/>
<rect x="54" y="54" width="852" height="547" rx="72" fill="#00080b" stroke="#0d4348" stroke-width="9"/>
<g clip-path="url(#body)">
 <rect x="60" y="55" width="840" height="540" rx="63" fill="url(#leather)"/>
 <rect x="60" y="55" width="840" height="540" rx="63" fill="url(#edge)"/>
 <rect x="60" y="55" width="840" height="540" rx="63" filter="url(#grain)" opacity=".47"/>
 <path d="M55 87Q160 28 300 53L825 55Q913 63 901 154" fill="none" stroke="#3dafa7" stroke-opacity=".53" stroke-width="8"/>
 <path d="M61 530Q350 625 899 560" fill="none" stroke="#3c928d" stroke-opacity=".2" stroke-width="14"/>
 <path d="M133 55V597" stroke="#15434a" stroke-width="13" opacity=".63"/>
 <path d="M139 55V597" stroke="#58c7b4" stroke-width="2" opacity=".31"/>
 <path d="M780 110L940 275" stroke="#2fd4c4" stroke-opacity=".045" stroke-width="165"/>
 <rect x="80" y="75" width="800" height="495" rx="47" fill="none" stroke="#84c7c0" stroke-opacity=".46" stroke-width="2.6" stroke-dasharray="4 11"/>
 <rect x="91" y="86" width="778" height="473" rx="38" fill="none" stroke="#02141c" stroke-width="6"/>
</g>
<rect x="64" y="59" width="832" height="532" rx="61" fill="none" stroke="url(#rim)" stroke-width="5"/>
</svg>`;
const walletLogo = await sharp(officialLogo).resize(226, 226, {fit:'contain'}).png().toBuffer();
const walletBody = await sharp(Buffer.from(walletBodySvg))
 .composite([{input:walletLogo,left:560,top:314}])
 .resize({width:785,height:795,fit:'fill'})
 .rotate(9,{background:{r:0,g:0,b:0,alpha:0}})
 .resize({width:695})
 .png().toBuffer();
const walletMeta=await sharp(walletBody).metadata();

const walletScene=String.raw`
<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1000" viewBox="0 0 1800 1000">
<defs>
<linearGradient id="scene" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#00141e"/><stop offset=".34" stop-color="#02323d"/><stop offset=".70" stop-color="#00222e"/><stop offset="1" stop-color="#091d25"/></linearGradient>
<radialGradient id="window"><stop stop-color="#55e2c5" stop-opacity=".62"/><stop offset=".42" stop-color="#23a8a5" stop-opacity=".24"/><stop offset="1" stop-color="#13c7b7" stop-opacity="0"/></radialGradient>
<linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#07565b"/><stop offset=".27" stop-color="#06363c"/><stop offset="1" stop-color="#041923"/></linearGradient>
<filter id="blur"><feGaussianBlur stdDeviation="57"/></filter>
</defs>
<rect width="1800" height="1000" fill="url(#scene)"/>
<ellipse cx="1250" cy="215" rx="585" ry="425" fill="url(#window)"/>
<g filter="url(#blur)" opacity=".45">
<rect x="1150" y="-60" width="67" height="390" rx="34" fill="#8cffe7" transform="rotate(11 1150 -60)"/>
<rect x="1370" y="-10" width="56" height="335" rx="28" fill="#c5ffeb" transform="rotate(9 1370 -10)"/>
<circle cx="1701" cy="320" r="152" fill="#368f81"/>
<circle cx="945" cy="340" r="105" fill="#05b6b1"/>
</g>
<path d="M0 770 L1800 690 L1800 1000 L0 1000Z" fill="url(#floor)"/>
<path d="M300 850L1800 754" stroke="#20958e" stroke-opacity=".14" stroke-width="4"/>
<ellipse cx="1355" cy="865" rx="490" ry="68" fill="#020b11" opacity=".7" filter="url(#blur)"/>
<ellipse cx="1450" cy="820" rx="520" ry="175" fill="url(#window)" opacity=".18"/>
</svg>`;
// Enquadramento editorial: a carteira inteira deve permanecer na faixa visível
// do hero (object-fit:cover), inclusive em 1366px, sem cortar sua base.
const walletX= Math.floor(1800-(walletMeta.width??695)-105);
const walletY= Math.max(180,Math.floor((1000-(walletMeta.height??680))/2));
if(walletX<700 || walletY<0 || walletY+(walletMeta.height??0)>1000)throw Error('Wallet geometry exceeds scene');
const wallet=await sharp(Buffer.from(walletScene))
 .composite([{input:walletBody,left:walletX,top:walletY}])
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
for(const [name,buffer] of [['wallet-official-02.webp',wallet],['verocard-oficial-panorama.webp',card]]){
 const p=resolve(root,name);writeFileSync(p,buffer);const info=await sharp(buffer).metadata();
 if((info.width??0)<1800||(info.height??0)<1000||statSync(p).size<30000)throw Error(name+': quality gate failed');
 console.log(JSON.stringify({name,width:info.width,height:info.height,bytes:statSync(p).size,sha256:createHash('sha256').update(buffer).digest('hex')}));
}
