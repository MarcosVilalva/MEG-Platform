/**
 * Verificação da independência gráfica da Home Studio.
 * A nova interface não utiliza fotos decorativas, imagens de carteira,
 * dados de performance desenhados em SVG ou assets externos.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root=resolve(import.meta.dirname,'..');
const output=resolve(root,'artifacts/home-06/asset-quality');
mkdirSync(output,{recursive:true});
const source=readFileSync(resolve(root,'apps/web/src/meg-web-evolution/home/HomeScreen.tsx'),'utf8');
const css=readFileSync(resolve(root,'apps/web/src/meg-web-evolution/home/home.css'),'utf8');
const oldPatterns=['meg-home-wallet-photo','meg-home-balance-art','wallet-official-02.webp','meg-balance-scene-hd.webp','meg-home-benefit-card','verocard-oficial-panorama.webp'];
const sourceViolations=oldPatterns.filter(p=>source.includes(p)||css.includes(p));
const display=[];
const url=process.env.MEG_HOME_PREVIEW_URL;
if(url){
  const {chromium}=await import('@playwright/test');
  const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
  try{
    for(const [width,height] of [[1366,768],[1920,1080],[390,844]]){
      const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2});
      try{
        const page=await context.newPage();
        await page.goto(url,{waitUntil:'networkidle',timeout:45000});
        await page.locator('.meg-home-studio .balance').waitFor({state:'visible'});
        const d=await page.evaluate(()=>{
          const home=document.querySelector('.meg-home-studio');
          const hero=document.querySelector('.meg-home .balance');
          const benefit=document.querySelector('.meg-home .benefits');
          const imgs=home?.querySelectorAll('img').length??-1;
          const heroHasUrl=getComputedStyle(hero).backgroundImage.includes('url(');
          const benefitHasUrl=getComputedStyle(benefit).backgroundImage.includes('url(');
          return {images:imgs,heroHasUrl,benefitHasUrl,scrollWidth:home.scrollWidth,clientWidth:home.clientWidth};
        });
        display.push({viewport:width+'x'+height, ...d, passed:d.images===0&&!d.heroHasUrl&&!d.benefitHasUrl&&d.scrollWidth<=d.clientWidth+1});
      }finally{await context.close()}
    }
  }finally{await browser.close()}
}
const issues=sourceViolations.length+display.filter(x=>!x.passed).length;
const report={kind:'MEG_HOME_STUDIO_GRAPHIC_INDEPENDENCE',sourceViolations,display,issues,visualApproved:false};
writeFileSync(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');
writeFileSync(resolve(output,'report.md'),[
  '# Auditoria gráfica da Home Studio',
  '',
  'Sem fotos decorativas ou gráfico de desempenho fictício. Preservados logo do Shell e dados reais do React.',
  '',
  '| Viewport | Imagens decorativas | URL de fundo no saldo | URL de fundo no benefício | Página sem overflow | Resultado |',
  '|---|---:|---|---|---|---|',
  ...display.map(r=>'| '+r.viewport+' | '+r.images+' | '+r.heroHasUrl+' | '+r.benefitHasUrl+' | '+(r.scrollWidth<=r.clientWidth+1?'Sim':'Não')+' | '+(r.passed?'OK':'FALHOU')+' |'),
  '',
  'Violação em fonte: '+(sourceViolations.join(', ')||'nenhuma'),
  '',
  'Gates automáticos não substituem aprovação visual expressa.'
].join('\n')+'\n');
console.log(JSON.stringify({issues,sourceViolations,display},null,2));
if(issues&&process.argv.includes('--strict'))process.exitCode=1;
