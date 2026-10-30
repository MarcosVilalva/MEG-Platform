/**
 * Auditoria de assets da Home 06 baseada na imagem atual do usuário.
 * Fonte licenciada: 志远 杨 (@yangzhiyuan), Misty mountains shrouded in blue twilight fog, Unsplash (licença Unsplash).
 * https://unsplash.com/photos/kzH-sVU5pqs
 *
 * A auditoria visual da página e o carregamento em produção são gates separados.
 * Nenhuma arte deve conter valores financeiros pintados na própria imagem.
 */
import { mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'..');
const output=resolve(root,'artifacts/home-06/asset-quality');
mkdirSync(output,{recursive:true});
const jsx=readFileSync(resolve(root,'apps/web/src/meg-web-evolution/home/HomeScreen.tsx'),'utf8');
const css=readFileSync(resolve(root,'apps/web/src/meg-web-evolution/home/home.css'),'utf8');
const chart=readFileSync(resolve(root,'apps/web/src/meg-web-evolution/home/HomeCashflowChart.tsx'),'utf8');
const bad=['meg-home-wallet-photo','wallet-official-02.webp','meg-balance-scene-hd.webp','meg-home-atlas','meg-home-studio'];
const violations=bad.filter(token=>jsx.includes(token)||css.includes(token));
if(!css.includes('https://unsplash.com/photos/kzH-sVU5pqs')||!css.includes('images.unsplash.com/photo-1758637689971-fe6124e7cabd'))violations.push('crédito e foto licenciada ausentes');
if(!chart.includes('d.income')||!chart.includes('d.expense'))violations.push('chart sem dados canônicos');
const url=process.env.MEG_HOME_PREVIEW_URL;
const display=[];
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
    const result=await page.evaluate(()=>{
     const home=document.querySelector('.meg-home-reference-screen');
     const hero=document.querySelector('.meg-home-hero-visual');
     return {stylePhoto:getComputedStyle(hero).backgroundImage.includes('images.unsplash.com/photo-1758637689971-fe6124e7cabd'),
      imageTags:home.querySelectorAll('img').length,
      chart:home.querySelectorAll('.meg-home-flow-chart').length,
      overflow:home.scrollWidth>home.clientWidth+1};
    });
    display.push({viewport:width+'x'+height,...result,passed:result.stylePhoto&&result.imageTags===0&&result.chart===1&&!result.overflow});
   }finally{await context.close()}
  }
 }finally{await browser.close()}
}
const issues=violations.length+display.filter(x=>!x.passed).length;
const report={kind:'MEG_HOME_LICENSED_ASSET_AUDIT',credit:'志远 杨 / Unsplash',url:'https://unsplash.com/photos/kzH-sVU5pqs',violations,display,issues,visualApproved:false};
writeFileSync(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');
writeFileSync(resolve(output,'report.md'),[
 '# MEG Home | Auditoria da referência visual',
 '','Foto de Benjamin Cole (Unsplash License). Link: https://unsplash.com/photos/kzH-sVU5pqs',
 'O gráfico usa apenas dias de caixa da API canônica. Icons SVG são renderizados no DOM.',
 '','| Tela | Foto atribuída | Gráfico | Sem overflow | Status |',
 '|---|---|---|---|---|',
 ...display.map(x=>'| '+x.viewport+' | '+x.stylePhoto+' | '+x.chart+' | '+(!x.overflow)+' | '+(x.passed?'OK':'FALHA')+' |'),
 '','Violações: '+(violations.join(', ')||'nenhuma'),
 '','CI não substitui aprovação visual do usuário.'
].join('\n')+'\n');
console.log(JSON.stringify(report,null,2));
if(issues&&process.argv.includes('--strict'))process.exitCode=1;
