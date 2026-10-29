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
 .modulate({brightness:.89,saturation:.68}).toBuffer();

// Não ampliar pixels da referência 02: isolar a carteira da fotografia HD
// e integrá-la a um novo ambiente teal, removendo chaves/mesa como foco.
// A máscara acompanha a silhueta da fotografia Pexels acima, não os dados da UI.
// O fundo marrom da foto nao faz parte da carteira. A alpha-matte
// conserva pixels escuros da superficie de couro e atenua as cores
// marrons da mesa dentro de uma caixa espacial com bordas suaves.
// Nao produz efeito de "recorte retangular" nem altera pixels do print.
const raw=await sharp(walletBase).removeAlpha().raw().toBuffer({resolveWithObject:true});
const {width:sourceWidth,height:sourceHeight,channels}=raw.info;
const matted=Buffer.alloc(sourceWidth*sourceHeight*4);
const clamp=(x)=>Math.max(0,Math.min(1,x));
const smooth=(edge0,edge1,x)=>{const t=clamp((x-edge0)/(edge1-edge0));return t*t*(3-2*t);};
for(let y=0;y<sourceHeight;y++){
 for(let x=0;x<sourceWidth;x++){
  const idx=(y*sourceWidth+x)*channels;
  const r=raw.data[idx],g=raw.data[idx+1],b=raw.data[idx+2];
  const o=(y*sourceWidth+x)*4;
  const brightness=.299*r+.587*g+.114*b;
  const colorDifference=Math.max(r,g,b)-Math.min(r,g,b);
  const spatial=smooth(305,362,x)*(1-smooth(1150,1200,x))*smooth(77,128,y)*(1-smooth(731,789,y));
  const darkLeather=1-smooth(37,74,brightness);
  const brownAttenuation=1-.86*smooth(9,40,colorDifference);
  const alpha=clamp(spatial*darkLeather*brownAttenuation);
  matted[o]=r;matted[o+1]=g;matted[o+2]=b;matted[o+3]=Math.round(255*alpha);
 }
}
const cutout=await sharp(matted,{raw:{width:sourceWidth,height:sourceHeight,channels:4}}).png().toBuffer();
const walletMark=await sharp(officialLogo).resize(137,137,{fit:'contain'}).png().toBuffer();
const walletBranded=await sharp(cutout)
 .composite([{input:walletMark,left:660,top:485}])
 .extract({left:290,top:64,width:930,height:744})
 .extend({top:90,bottom:115,left:120,right:125,background:{r:0,g:0,b:0,alpha:0}})
 .rotate(13,{background:{r:0,g:0,b:0,alpha:0}})
 .resize({width:770})
 .png().toBuffer();
const brandedMeta=await sharp(walletBranded).metadata();
if((brandedMeta.width??0)>1100||(brandedMeta.height??0)>975)throw Error('Carteira fora do envelope: '+brandedMeta.width+'x'+brandedMeta.height);
const walletScene=Buffer.from([
 '<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1000" viewBox="0 0 1800 1000">',
 '<defs><linearGradient id="background" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#001720"/><stop offset=".43" stop-color="#00303b"/><stop offset="1" stop-color="#042129"/></linearGradient>',
 '<radialGradient id="teal"><stop stop-color="#20d2cc" stop-opacity=".58"/><stop offset="1" stop-color="#03bcaa" stop-opacity="0"/></radialGradient>',
 '<filter id="blur"><feGaussianBlur stdDeviation="72"/></filter>',
 '<linearGradient id="desk" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#0b3f45"/><stop offset="1" stop-color="#00151d"/></linearGradient></defs>',
 '<rect width="1800" height="1000" fill="url(#background)"/>',
 '<g filter="url(#blur)" opacity=".7"><ellipse cx="1220" cy="105" rx="230" ry="190" fill="#4affec"/><ellipse cx="1660" cy="208" rx="250" ry="200" fill="#125e64"/><ellipse cx="1080" cy="740" rx="410" ry="150" fill="#12b9b2"/></g>',
 '<rect x="0" y="775" width="1800" height="225" fill="url(#desk)" opacity=".72"/>',
 '<path d="M1040 835 L1700 695 L1800 862 L1190 1000 L950 1000 Z" fill="#01121d" stroke="#125e65" stroke-width="7" opacity=".32"/>',
 '<path d="M1030 855 L1680 717" stroke="#16cabc" stroke-opacity=".11" stroke-width="4"/>',
 '<rect width="1800" height="1000" fill="url(#teal)" opacity=".26"/>',
 '</svg>'
].join(''));
const x=Math.round(1670-(brandedMeta.width??985));
const y=Math.max(110,Math.round((950-(brandedMeta.height??750))/2));
const wallet=await sharp(walletScene)
 .composite([{input:walletBranded,left:x,top:y}])
 .webp({quality:98,effort:6}).toBuffer();

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
