import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const sizes = [
  ['desktop-oficial', 1672, 941],
  ['desktop-padrao', 1366, 768],
  ['desktop-baixo', 1366, 600],
  ['tablet', 768, 1024],
  ['mobile', 390, 844],
  ['mobile-estreito', 320, 700],
  ['ultrawide', 2560, 1440],
];
const browser = await chromium.launch({
  headless:true,
  executablePath:process.env.PLAYWRIGHT_CHROME_PATH || '/usr/bin/google-chrome',
  args:['--no-sandbox','--disable-dev-shm-usage'],
});
let errors = 0;
await mkdir('artifacts/home-06', {recursive:true});
try {
 for(const [name,width,height] of sizes){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
  const page=await context.newPage();
  const jsErrors=[];
  page.on('pageerror',error=>jsErrors.push(String(error)));
  const response=await page.goto('http://127.0.0.1:4173/home-visual.html',{waitUntil:'networkidle',timeout:45000});
  try{
   assert.equal(response?.status(),200,'HTTP '+name);
   await page.locator('.meg-home .balance').waitFor({state:'visible',timeout:20000});
   assert.equal(await page.locator('.meg-home-kpi').count(),4,'KPIs '+name);
   const balanceToggle=page.getByRole('button',{name:'Ocultar saldos'});
   await balanceToggle.click();
   assert.equal(await page.locator('.meg-home-hero-balance').innerText(),'R$ •••••');
   assert.equal(await page.locator('.meg-home-benefit-balance').innerText(),'R$ •••••','prévia não deve inventar saldo de benefício: '+name);
   assert.equal(await page.locator('.meg-home-benefit-finances-label').innerText(),'Saldo de benefícios');
   await page.getByRole('button',{name:'Mostrar saldos'}).click();
   assert.equal(await page.getByRole('button',{name:'Ocultar saldos'}).getAttribute('aria-pressed'),'false');
   assert.equal(await page.locator('.meg-home-grid-slot').count(),2,'DataGrids '+name);
   assert.equal(await page.locator('.meg-home img').count(),3,'arte da Home '+name);
   const stats=await page.evaluate(()=>({
     viewport:window.innerWidth,
     documentWidth:document.documentElement.scrollWidth,
     documentHeight:document.documentElement.scrollHeight,
     viewportHeight:window.innerHeight,
     shell:document.querySelector('.meg-shell')?.getBoundingClientRect().toJSON(),
     grid:document.querySelector('.meg-home-dash')?.getBoundingClientRect().toJSON(),
   }));
   assert.ok(stats.documentWidth<=stats.viewport+1,name+': rolagem horizontal: '+JSON.stringify(stats));
   assert.ok(stats.documentHeight<=stats.viewportHeight+1,name+': overflow externo: '+JSON.stringify(stats));
   assert.equal(jsErrors.length,0,name+': console errors '+jsErrors.join(' | '));
   await page.screenshot({path:'artifacts/home-06/'+name+'.png',fullPage:true});
   console.log('PASS',name,width+'×'+height,JSON.stringify(stats));
  }catch(error){
   errors++;
   console.error('FAIL',name,error);
   await page.screenshot({path:'artifacts/home-06/'+name+'-error.png',fullPage:true}).catch(()=>{});
  }
  await context.close();
 }
}finally{await browser.close();}
if(errors)process.exitCode=1;
