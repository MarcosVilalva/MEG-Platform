/**
 * Asset fotográfico da Home MEG, baixado uma única vez para evitar depender
 * de CDN de terceiros durante a execução do dashboard.
 *
 * Foto: Francesco Ungaro, Unsplash (Unsplash License)
 * https://unsplash.com/photos/a-mountain-range-with-a-body-of-water-in-the-foreground-VrpZtXxwyvE
 * Imagem original: https://images.unsplash.com/photo-1646641222646-38d313dc9aa6
 *
 * A foto não contém dados ou indicadores financeiros.
 */
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {resolve,dirname} from 'node:path';
const require=createRequire(import.meta.url);
const sharp=require(process.env.MEG_SHARP_MODULE||'sharp');
const input=process.env.MEG_HOME_PHOTO_SOURCE||'/tmp/meg-hero-mountains-source';
const raw=await readFile(input);
const meta=await sharp(raw).metadata();
if(!meta.width||!meta.height||meta.width<2500||meta.height<1200){
 throw new Error('Foto insuficiente para asset em alta definição: '+JSON.stringify({width:meta.width,height:meta.height}));
}
const directory=resolve('apps/web/public/meg-web-evolution/home');
await mkdir(directory,{recursive:true});
for(const [name,width,height,quality] of [
 ['meg-hero-mountains-1600.webp',1600,700,84],
 ['meg-hero-mountains-2560.webp',2560,1120,87]
]){
 const out=resolve(directory,name);
 const data=await sharp(raw).rotate().resize({width,height,fit:'cover',position:'centre',withoutEnlargement:true})
   .webp({quality,effort:5}).toBuffer();
 await writeFile(out,data);
 const res=await sharp(data).metadata();
 if(res.width<width||res.height<height)throw new Error('Saída incompleta: '+out);
 console.log('ASSET',name,res.width+'x'+res.height,data.length+' bytes');
}
