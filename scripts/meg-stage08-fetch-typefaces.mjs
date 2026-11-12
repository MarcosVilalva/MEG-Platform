import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile,rename,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';

/* Fontes OFL, obtidas somente DURANTE O BUILD, servidas depois pela própria Web.
 * Origem fixa, tamanho e git blob SHA-1 verificados. Não usa segredos nem API MEG.
 * Nunca sobrescreve InterVariable nem arquivos visuais homologados. */
const rev='5a72889057f592bb0659629e38337359f94d53b2';
const dir=resolve(dirname(fileURLToPath(import.meta.url)),'../apps/web/public/meg-web-evolution/fonts');
const fonts=[
 {family:'manrope',name:'manrope-latin-wght-normal.woff2',target:'MEG-Manrope-latin-variable.woff2',size:24836,git:'71eb731d558046199aa7f985adbf812890a093a1'},
 {family:'manrope',name:'manrope-latin-ext-wght-normal.woff2',target:'MEG-Manrope-latin-ext-variable.woff2',size:15120,git:'bd24140af06f1b5897d3bbd6538a74b03748a21e'},
 {family:'sora',name:'sora-latin-wght-normal.woff2',target:'MEG-Sora-latin-variable.woff2',size:33652,git:'3dbf56eb49eadd3ab4c09b71b9158b042d812584'},
 {family:'sora',name:'sora-latin-ext-wght-normal.woff2',target:'MEG-Sora-latin-ext-variable.woff2',size:15548,git:'28516fd342a982db01f81cb9812e25a9f4c9a2e1'},
];
const blobHash=(bytes)=>createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
const valid=(data,f)=>data.length===f.size&&blobHash(data)===f.git;
const fetchAsset=async(f)=>{
 const out=resolve(dir,f.target);
 try{const previous=await readFile(out);if(valid(previous,f)){console.log('MEG_FONT_CACHE '+f.target+' VERIFIED');return}}catch{}
 const locations=[
   'https://raw.githubusercontent.com/fontsource/font-files/'+rev+'/fonts/variable/'+f.family+'/files/'+f.name,
   'https://cdn.jsdelivr.net/gh/fontsource/font-files@'+rev+'/fonts/variable/'+f.family+'/files/'+f.name,
 ];
 let lastError;
 for(const url of locations){
  try{
   const response=await fetch(url,{signal:AbortSignal.timeout(25000)});
   if(!response.ok)throw Error('HTTP '+response.status);
   const bytes=Buffer.from(await response.arrayBuffer());
   if(!valid(bytes,f))throw Error('checksum/size mismatch');
   const temp=out+'.part';
   try{await writeFile(temp,bytes);await rename(temp,out)}finally{await rm(temp,{force:true}).catch(()=>{})}
   console.log('MEG_FONT_SELF_HOSTED '+f.target+' '+bytes.length+' VERIFIED');
   return;
  }catch(error){lastError=error}
 }
 throw new Error('MEG_FONT_ASSET_UNAVAILABLE '+f.target+': '+String(lastError));
};
await mkdir(dir,{recursive:true});
await Promise.all(fonts.map(fetchAsset));
console.log('MEG_PRISM_FONTS_READY 4 files, 2 variable families, OFL, own-origin');
