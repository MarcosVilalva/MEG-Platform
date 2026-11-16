import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';

// No passwords, tokens, real API reads or financial transactions.
const base='https://meg-stage10-prism-real-preview.onrender.com';
const location=resolve('artifacts/meg-stage10-prism-public-login');
mkdirSync(location,{recursive:true});
const browser=await chromium.launch({
 headless:true,
 executablePath:process.env.PLAYWRIGHT_CHROME_PATH||'/usr/bin/google-chrome',
 args:['--no-sandbox'],
});
try{
 for(const [width,height] of [[390,844],[1366,768]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  const errors=[];
  const failedLocal=[];
  const financialRequests=[];
  page.on('pageerror',error=>errors.push(String(error)));
  page.on('requestfailed',request=>{
   if(new URL(request.url()).origin===base)failedLocal.push(request.url());
  });
  page.on('request',request=>{
   const pathname=new URL(request.url()).pathname;
   if(/^\/(finance|cards)(\/|$)/.test(pathname))financialRequests.push(request.method()+' '+pathname);
  });
  try{
   const response=await page.goto(base+'/web-evolution.html?v=visual-safe-960de975',{
    waitUntil:'domcontentloaded',timeout:45000
   });
   assert.equal(response?.status(),200);
   const login=page.locator('[data-meg-login="stage05"]');
   await login.waitFor({state:'visible',timeout:30000});
   await page.getByRole('textbox',{name:'E-mail'}).waitFor({state:'visible'});
   await page.getByLabel('Senha').waitFor({state:'visible'});
   await page.getByRole('button',{name:'Entrar no MEG'}).waitFor({state:'visible'});
   await page.waitForFunction(()=>{
    const logo=document.querySelector('.meg-login-logo');
    return logo instanceof HTMLImageElement&&logo.complete&&logo.naturalWidth>0;
   },null,{timeout:20000});
   const metrics=await page.evaluate(()=>({
    horizontalScroll:document.documentElement.scrollWidth>window.innerWidth+2,
    hasSession:Boolean(sessionStorage.getItem('meg.auth.session')),
   }));
   assert.equal(metrics.horizontalScroll,false,'Login must not horizontally overflow');
   assert.equal(metrics.hasSession,false,'Public preview must start unauthenticated');
   assert.deepEqual(errors,[],'JavaScript runtime errors');
   assert.deepEqual(failedLocal,[],'Missing app assets');
   assert.deepEqual(financialRequests,[],'Financial data must not be fetched before login');
   await page.screenshot({path:resolve(location,'login-'+width+'x'+height+'.png'),fullPage:false});
   console.log('MEG_STAGE10_PUBLIC_LOGIN_VIEWPORT_PASS '+width+'x'+height);
  }finally{await page.close();}
 }
 console.log('MEG_STAGE10_PUBLIC_LOGIN_VISUAL_SMOKE_PASS');
}finally{await browser.close();}
