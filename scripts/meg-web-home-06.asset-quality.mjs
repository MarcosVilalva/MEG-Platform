import { createRequire } from 'node:module';
import { existsSync, mkdirSync, writeFileSync, statSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const root=resolve(import.meta.dirname,'../apps/web/public/meg-web-evolution/home');
const out=resolve(import.meta.dirname,'../artifacts/home-06/asset-quality');
mkdirSync(out,{recursive:true});
const require=createRequire(import.meta.url);
let sharp;
try{sharp=require(process.env.MEG_SHARP_MODULE||'sharp')}catch(err){
  throw Error('Sharp ausente. Instale no runner isolado: '+String(err));
}
const manifest=[
  {name:'Cena financeira HD do saldo',file:'meg-balance-scene-hd.webp',minWidth:2000,minHeight:1100},
  {name:'Cartão do benefício',file:'verocard-oficial-panorama.webp',minWidth:900,minHeight:500},
];
const measured=[];
for(const asset of manifest){
  const p=resolve(root,asset.file);
  if(!existsSync(p)){
    measured.push({...asset,status:'MISSING',reason:'Arquivo ausente'});
    continue;
  }
  const meta=await sharp(p).metadata();
  const bytes=statSync(p).size;
  const hash=createHash('sha256').update(readFileSync(p)).digest('hex');
  const tooSmall=!(meta.width>=asset.minWidth&&meta.height>=asset.minHeight);
  measured.push({
    ...asset,path:'apps/web/public/meg-web-evolution/home/'+asset.file,
    width:meta.width,height:meta.height,format:meta.format,bytes,sha256:hash,
    status:tooSmall?'LOW_RESOLUTION':'SOURCE_DIMENSIONS_OK',
    reason:tooSmall?'Fonte com dimensões abaixo do mínimo. Nunca ampliar o recorte para fingir alta resolução.':'Dimensões suficientes, mas ainda exige inspeção de nitidez humana.',
  });
}
let display=[];
const url=process.env.MEG_HOME_PREVIEW_URL;
if(url){
  const {chromium}=await import('@playwright/test');
  const browser=await chromium.launch({
    headless:true,executablePath:process.env.PLAYWRIGHT_CHROME_PATH||'/usr/bin/google-chrome',
    args:['--no-sandbox','--disable-dev-shm-usage'],
  });
  try{
    for(const [width,height] of [[1366,768],[1920,1080],[390,844]]){
      const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2});
      const page=await context.newPage();
      try{
        await page.goto(url,{waitUntil:'networkidle',timeout:45000});
        await page.locator('.meg-home-balance-art').waitFor();
        const images=await page.locator('.meg-home-balance-art, .meg-home-benefit-card').evaluateAll(nodes=>
          nodes.map(node=>{
            const rect=node.getBoundingClientRect();
            const css=getComputedStyle(node);
            const x=node.naturalWidth/Math.max(1,rect.width);
            const y=node.naturalHeight/Math.max(1,rect.height);
            const d=Math.min(x,y);
            return {
              className:node.className,src:node.getAttribute('src'),
              renderedWidth:Math.round(rect.width),renderedHeight:Math.round(rect.height),
              naturalWidth:node.naturalWidth,naturalHeight:node.naturalHeight,
              opacity:css.opacity,objectFit:css.objectFit,
              effectivePixelRatio:Math.round(d*100)/100,targetPixelRatio:2,
              adequateForRetina:node.complete&&node.naturalWidth>0&&d>=2,
            };
          })
        );
        display.push({viewport:String(width)+'x'+String(height)+'@2x',images});
      }finally{await context.close();}
    }
  }finally{await browser.close();}
}
const issues=measured.filter(x=>x.status!=='SOURCE_DIMENSIONS_OK').length+
  display.flatMap(x=>x.images).filter(x=>!x.adequateForRetina).length;
const report={
  kind:'MEG_HOME_IMAGE_QUALITY',date:new Date().toISOString(),
  policy:'Diagnóstico visual: sem mutações financeiras, sem aceitar imagem ampliada como fonte HD',
  sources:measured,display,issues,qualityApproved:false,
};
writeFileSync(resolve(out,'report.json'),JSON.stringify(report,null,2)+'\n');
const lines=[
  '# Auditoria dos assets da Home','',
  '> Diagnóstico automático. Dimensões suficientes NÃO comprovam nitidez ou aprovação visual.',
  '','| Asset | Fonte (px) | Bytes | Estado |','|---|---:|---:|---|',
  ...measured.map(x=>'| '+x.name+' | '+(x.width??'?')+'×'+(x.height??'?')+' | '+(x.bytes??'?')+' | '+x.status+' |'),
  '','| Viewport | Arte | Render CSS | Densidade | Retina |','|---|---|---|---:|---|',
  ...display.flatMap(x=>x.images.map(i=>'| '+x.viewport+' | '+i.className+' | '+i.renderedWidth+'×'+i.renderedHeight+' | '+i.effectivePixelRatio+'× | '+(i.adequateForRetina?'OK':'INSUFICIENTE')+' |')),
  '','## Resultado','',
  issues?'**REPROVADO COMO ASSET HD**. Substituir por originais de alta resolução, não ampliar os arquivos atuais.':'Metadados e densidade aprovados; revisão visual humana continua obrigatória.','',
];
writeFileSync(resolve(out,'report.md'),lines.join('\n'));
console.log(JSON.stringify({issues,sources:measured.map(x=>({name:x.name,width:x.width,height:x.height,bytes:x.bytes,status:x.status})),viewports:display.map(x=>x.viewport)},null,2));
if(issues&&process.argv.includes('--strict'))process.exitCode=1;
