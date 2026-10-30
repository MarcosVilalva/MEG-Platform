/**
 * Auditoria da identidade visual da Home 06.
 * Foto licenciada: Francesco Ungaro, Unsplash License
 * https://unsplash.com/photos/a-mountain-range-with-a-body-of-water-in-the-foreground-VrpZtXxwyvE
 * Assets WebP locais em 1600x700 e 2560x1120, gerados pelo workflow Home Hero HD.
 * SVGs da Home: linguagem Lucide (ISC License).
 */
import {mkdirSync,readFileSync,writeFileSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const output=resolve(root,'artifacts/home-06/asset-quality');
mkdirSync(output,{recursive:true});
const jsx=readFileSync(resolve(root,'apps/web/src/meg-web-evolution/home/HomeScreen.tsx'),'utf8');
const css=readFileSync(resolve(root,'apps/web/src/meg-web-evolution/home/home.css'),'utf8');
const chart=readFileSync(resolve(root,'apps/web/src/meg-web-evolution/home/HomeCashflowChart.tsx'),'utf8');
const icons=readFileSync(resolve(root,'apps/web/src/meg-web-evolution/home/HomeIcons.tsx'),'utf8');
const invalid=['meg-home-wallet-photo','wallet-official-02.webp','meg-balance-scene-hd.webp','meg-home-atlas','meg-home-studio'];
const violations=invalid.filter(token=>jsx.includes(token)||css.includes(token));
const source='https://unsplash.com/photos/a-mountain-range-with-a-body-of-water-in-the-foreground-VrpZtXxwyvE';
if(!css.includes(source)||!icons.includes('Lucide'))violations.push('créditos de imagem ou ícones ausentes');
if(!chart.includes('d.income')||!chart.includes('d.expense'))violations.push('gráfico sem leitura canônica');
if(!chart.includes("type:'bar'")||!chart.includes("min:0"))violations.push('gráfico de comparação não identificado');
for(const [filename,width] of [['meg-hero-mountains-1600.webp',1600],['meg-hero-mountains-2560.webp',2560]]){
 const file=resolve(root,'apps/web/public/meg-web-evolution/home',filename);
 try{
  const bytes=statSync(file).size;
  if(bytes<30000||bytes>1500000)violations.push(filename+': tamanho suspeito '+bytes);
  if(!css.includes(filename))violations.push(filename+': imagem não aplicada no CSS');
 }catch{violations.push(filename+': arquivo local não encontrado')}
}
const display=[];const url=process.env.MEG_HOME_PREVIEW_URL;
if(url){
 const {chromium}=await import('@playwright/test');
 const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const [width,height] of [[1366,768],[1920,1080],[390,844]]){
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2});
   try{
    const page=await context.newPage();
    await page.goto(url,{waitUntil:'networkidle',timeout:45000});
    await page.locator('.meg-home-reference-screen .balance').waitFor({state:'visible'});
    const result=await page.evaluate(async()=>{
      const home=document.querySelector('.meg-home-reference-screen');
      const hero=document.querySelector('.meg-home-hero-visual');
      const refs=['meg-hero-mountains-1600.webp','meg-hero-mountains-2560.webp'];
      const local=await Promise.all(refs.map(async name=>{
        const r=await fetch('/meg-web-evolution/home/'+name);
        return {name,ok:r.ok,type:r.headers.get('content-type')};
      }));
      return {stylePhoto:getComputedStyle(hero).backgroundImage.includes('meg-hero-mountains-2560.webp'),
        imageTags:home.querySelectorAll('img').length,
        icons:home.querySelectorAll('.meg-home-icon-svg').length,
        chart:home.querySelectorAll('.meg-home-flow-chart').length,
        overflow:home.scrollWidth>home.clientWidth+1,assets:local};
    });
    display.push({viewport:width+'x'+height,...result,passed:result.stylePhoto&&result.imageTags===0&&result.icons>=16&&result.chart===1&&!result.overflow&&result.assets.every(x=>x.ok)});
   }finally{await context.close()}
  }
 }finally{await browser.close()}
}
const issues=violations.length+display.filter(x=>!x.passed).length;
const report={kind:'MEG_HOME_LOCAL_HD_ASSET_AUDIT',credit:'Francesco Ungaro / Unsplash',source,violations,display,issues,visualApproved:false};
writeFileSync(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');
writeFileSync(resolve(output,'report.md'),[
 '# Home MEG - Auditoria de assets locais e simetria',
 '', 'Foto © Francesco Ungaro, licença Unsplash: '+source,
 'Iconografia da área interna baseada na biblioteca Lucide, licença ISC.',
 'ECharts exibe exclusivamente entradas e saídas fornecidas pelo backend.',
 '', '| Viewport | WebP locais | Ícones SVG | Gráfico | Sem overflow | Resultado |',
 '|---|---|---:|---|---|---|',
 ...display.map(x=>'| '+x.viewport+' | '+x.assets.every(a=>a.ok)+' | '+x.icons+' | '+x.chart+' | '+!x.overflow+' | '+(x.passed?'OK':'FALHA')+' |'),
 '', 'Pendências: '+(violations.join(', ')||'nenhuma'), '',
 'A aprovação visual depende de decisão expressa do usuário.'
].join('\n')+'\n');
console.log(JSON.stringify(report,null,2));
if(issues&&process.argv.includes('--strict'))process.exitCode=1;
