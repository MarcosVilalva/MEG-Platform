/* MEG Home 06. Fontes HD, sem rasterizar dados ou controles.
   Fotografia: Aleksandrs Karevs / Pexels 15440419, Pexels License.
   A arte do benefício é uma representação gráfica da referência visual 02.
*/
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url);
const sharp=require(process.env.MEG_SHARP_MODULE||'sharp');
const root=resolve(import.meta.dirname,'../apps/web/public/meg-web-evolution/home');
mkdirSync(root,{recursive:true});
const photoUrl='https://images.pexels.com/photos/15440419/pexels-photo-15440419.jpeg?auto=compress&cs=tinysrgb&w=3200';
const response=await fetch(photoUrl,{headers:{'User-Agent':'MEG-Web-Evolution-HD-Assets/1.0'}});
if(!response.ok)throw Error('Fonte original indisponível: HTTP '+response.status);
const photo=Buffer.from(await response.arrayBuffer());
const meta=await sharp(photo).metadata();
if(photo.length<120000||(meta.width??0)<2100||(meta.height??0)<1300)throw Error('Imagem não é HD: '+meta.width+'x'+meta.height);
const crop={left:Math.round(meta.width*.2),top:Math.round(meta.height*.15),width:Math.round(meta.width*.6),height:Math.round(meta.height*.7)};
crop.width=Math.min(crop.width,meta.width-crop.left);
crop.height=Math.min(crop.height,meta.height-crop.top);
const wallet=await sharp(photo).extract(crop).resize(1800,1000,{fit:'cover',position:'centre'})
 .modulate({brightness:.82,saturation:.57}).webp({quality:93,effort:6}).toBuffer();

const cardSvg=[
'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1800 1040" width="1800" height="1040">',
'<defs><linearGradient id="base" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#061a28"/><stop offset=".5" stop-color="#071f28"/><stop offset="1" stop-color="#000c15"/></linearGradient>',
'<linearGradient id="band" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#13d9d4" stop-opacity=".45"/><stop offset="1" stop-color="#1af2de" stop-opacity=".04"/></linearGradient>',
'<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff2bb"/><stop offset=".45" stop-color="#c99d35"/><stop offset="1" stop-color="#987028"/></linearGradient>',
'<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".34" numOctaves="3" seed="33" result="n"/><feColorMatrix in="n" type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".1"/></feComponentTransfer></filter>',
'<filter id="blur"><feGaussianBlur stdDeviation="35"/></filter><clipPath id="card"><rect x="110" y="92" width="1580" height="850" rx="72"/></clipPath></defs>',
'<ellipse cx="900" cy="930" rx="700" ry="62" fill="#00110d" opacity=".7" filter="url(#blur)"/>',
'<rect x="110" y="92" width="1580" height="850" rx="72" fill="url(#base)" stroke="#54c9c1" stroke-opacity=".5" stroke-width="4"/>',
'<g clip-path="url(#card)"><path d="M820 92 L1510 92 L1080 942 L580 942Z" fill="url(#band)"/><path d="M1220 92 H1380 L960 942 H780 Z" fill="#007c84" opacity=".19"/><rect x="110" y="92" width="1580" height="850" filter="url(#grain)" opacity=".18"/></g>',
'<g transform="translate(205 195)"><path d="M0 75 L60 0 L90 33 L120 0 L183 75 L145 75 L120 45 L90 75 L60 45 L25 75Z" fill="#3de9df"/>',
'<text x="0" y="134" font-family="Arial,sans-serif" font-size="68" font-weight="900" fill="#e9fffc">MEG</text><text x="0" y="168" font-family="Arial,sans-serif" font-size="23" letter-spacing="8" font-weight="700" fill="#3de9df">FINANÇAS</text></g>',
'<text x="1120" y="295" fill="#f5fffd" font-family="Arial,sans-serif" font-size="92" font-weight="700" letter-spacing="2">VEROCARD</text>',
'<path d="M1390 331 C1450 304 1496 360 1540 329 C1580 310 1615 333 1630 339" fill="none" stroke="#f4fffe" stroke-width="9" stroke-linecap="round"/>',
'<rect x="220" y="505" width="160" height="130" rx="20" fill="url(#gold)" stroke="#f4d28f" stroke-width="5"/>',
'<path d="M220 564 H380 M300 505V635 M245 525 H352 M245 615 H352" fill="none" stroke="#99742c" stroke-width="5"/>',
'<g fill="none" stroke="#e5fff9" stroke-width="13" stroke-linecap="round" opacity=".8"><path d="M1560 490 Q1620 551 1560 612"/><path d="M1524 519 Q1561 550 1524 585"/><path d="M1496 530 Q1514 552 1496 572"/></g>',
'<text x="220" y="830" fill="#d7e9e8" font-family="Arial,sans-serif" font-size="46" letter-spacing="4">VEROCARD</text>',
'<g transform="translate(1370 767)"><circle cx="0" cy="0" r="85" fill="#fa4f3f"/><circle cx="88" cy="0" r="85" fill="#ffbe29"/><path d="M44 -73 C100 -34 100 34 44 73 C-12 34 -12 -34 44 -73" fill="#f0801b"/></g></svg>'
].join('');
const card=await sharp(Buffer.from(cardSvg)).webp({quality:95,effort:6}).toBuffer();
for(const [name,buf] of [['wallet-official-02.webp',wallet],['verocard-oficial-panorama.webp',card]]){
 const filepath=resolve(root,name);writeFileSync(filepath,buf);
 const info=await sharp(buf).metadata();
 console.log(JSON.stringify({path:filepath,width:info.width,height:info.height,bytes:statSync(filepath).size,sha256:createHash('sha256').update(buf).digest('hex')}));
}
