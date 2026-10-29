/* MEG Home 06. Fontes HD, sem rasterizar dados ou controles.
   Fotografia: Aleksandrs Karevs / Pexels 15440419, Pexels License.
   A arte do benefício é uma representação gráfica da referência visual 02.
*/
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync,statSync,readFileSync} from 'node:fs';
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
// A fonte é uma fotografia HD independente. Marca oficial é aplicada
// em resolução nativa sobre a carteira, sem reaproveitar os pixels do mockup.
const officialLogo=readFileSync(resolve(import.meta.dirname,'../apps/web/public/brand/logo-meg-financas.svg'));
const walletBase=await sharp(photo).extract(crop).resize(1800,1000,{fit:'cover',position:'centre'})
 .modulate({brightness:.83,saturation:.74}).toBuffer();
const walletLighting=Buffer.from([
 '<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1000" viewBox="0 0 1800 1000">',
 '<defs><linearGradient id="scene" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#001e29" stop-opacity=".55"/><stop offset=".62" stop-color="#003c45" stop-opacity=".21"/><stop offset="1" stop-color="#00252c" stop-opacity=".48"/></linearGradient>',
 '<radialGradient id="light"><stop stop-color="#1efbe3" stop-opacity=".33"/><stop offset="1" stop-color="#1efbe3" stop-opacity="0"/></radialGradient></defs>',
 '<rect width="1800" height="1000" fill="url(#scene)"/>',
 '<ellipse cx="1430" cy="180" rx="680" ry="400" fill="url(#light)"/>',
 '</svg>'
].join(''));
const walletMark=await sharp(officialLogo).resize(178,178,{fit:'contain'}).png().toBuffer();
const wallet=await sharp(walletBase)
 .composite([{input:walletLighting,left:0,top:0},{input:walletMark,left:800,top:452}])
 .webp({quality:93,effort:6}).toBuffer();

// O cartão é uma ilustração HD da linguagem da referência visual 02.
// Dados, botões, cifras e status continuam exclusivamente no React.
const cardSvg=[
 '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1800 1040" width="1800" height="1040">',
 '<defs>',
 '<linearGradient id="base" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#061c2a"/><stop offset=".55" stop-color="#031923"/><stop offset="1" stop-color="#000d16"/></linearGradient>',
 '<linearGradient id="stripe" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#004654"/><stop offset=".56" stop-color="#08b4b4"/><stop offset="1" stop-color="#053647"/></linearGradient>',
 '<linearGradient id="gloss" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#dcfffc" stop-opacity=".15"/><stop offset=".22" stop-color="#dcfffc" stop-opacity=".015"/><stop offset="1" stop-color="#dcfffc" stop-opacity="0"/></linearGradient>',
 '<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff2c6"/><stop offset=".52" stop-color="#dab149"/><stop offset="1" stop-color="#986c23"/></linearGradient>',
 '<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".28" numOctaves="3" seed="33"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".06"/></feComponentTransfer></filter>',
 '<filter id="shadow"><feGaussianBlur stdDeviation="21"/></filter>',
 '<clipPath id="rounded"><rect x="94" y="94" width="1612" height="852" rx="72"/></clipPath>',
 '</defs>',
 '<ellipse cx="910" cy="944" rx="765" ry="64" fill="#000e14" opacity=".75" filter="url(#shadow)"/>',
 '<rect x="94" y="94" width="1612" height="852" rx="72" fill="url(#base)" stroke="#197a83" stroke-width="5"/>',
 '<g clip-path="url(#rounded)">',
 '<path d="M1020 92 H1518 L1125 946 H630 Z" fill="url(#stripe)" opacity=".93"/>',
 '<path d="M1250 92 H1390 L990 946 H840 Z" fill="#33efda" opacity=".21"/>',
 '<path d="M1510 92 H1730 L1304 946 H1130 Z" fill="#078c9a" opacity=".31"/>',
 '<rect x="94" y="94" width="1612" height="852" fill="url(#gloss)"/>',
 '<rect x="94" y="94" width="1612" height="852" filter="url(#grain)" opacity=".25"/>',
 '</g>',
 '<rect x="95" y="95" width="1610" height="850" rx="71" fill="none" stroke="#4bf8ed" stroke-opacity=".22" stroke-width="3"/>',
 '<rect x="250" y="510" width="158" height="124" rx="20" fill="url(#gold)" stroke="#f9df94" stroke-width="5"/>',
 '<path d="M250 566 H408 M329 510 V634 M275 530 H381 M275 613 H381" fill="none" stroke="#9c752b" stroke-width="5"/>',
 '<g fill="none" stroke="#e8ffff" stroke-width="13" stroke-linecap="round" opacity=".84"><path d="M1514 380 Q1577 451 1514 522"/><path d="M1473 410 Q1513 451 1473 492"/><path d="M1439 428 Q1463 451 1439 475"/></g>',
 '<text x="245" y="834" fill="#d9eff1" font-family="Arial,sans-serif" font-size="44" letter-spacing="5">VEROCARD</text>',
 '<g transform="translate(1480 787)"><circle cx="-46" cy="0" r="81" fill="#fa493d"/><circle cx="45" cy="0" r="81" fill="#ffbe28"/><path d="M0 -70 C56 -36 56 36 0 70 C-56 36 -56 -36 0 -70" fill="#f1821a"/></g>',
 '</svg>'
].join('');
// Não desenhar uma segunda logo à mão: preservar o SVG oficial do MEG.
const officialCardMark=await sharp(officialLogo).resize(230,230,{fit:'contain'}).png().toBuffer();
const card=await sharp(Buffer.from(cardSvg))
 .composite([{input:officialCardMark,left:198,top:154}])
 .webp({quality:95,effort:6}).toBuffer();

for(const [name,buf] of [['wallet-official-02.webp',wallet],['verocard-oficial-panorama.webp',card]]){
 const filepath=resolve(root,name);writeFileSync(filepath,buf);
 const info=await sharp(buf).metadata();
 console.log(JSON.stringify({path:filepath,width:info.width,height:info.height,bytes:statSync(filepath).size,sha256:createHash('sha256').update(buf).digest('hex')}));
}
