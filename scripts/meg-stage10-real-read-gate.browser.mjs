import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const base=process.env.MEG_STAGE08_UNIFIED_QA_URL||'http://127.0.0.1:4175';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1366,height:768}});
 const api=[],errors=[];
 page.on('request',r=>{if(/\/(auth|finance|cards|payables)(\/|$)/.test(new URL(r.url()).pathname))api.push(r.url());});
 page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(base+'/meg-unificado-qa.html?dados=reais&tela=lancamentos',{waitUntil:'domcontentloaded'});
 await page.locator('[data-meg-unified-screen="real-blocked"]').waitFor({state:'visible'});
 assert.match(await page.locator('body').innerText(),/Leitura real bloqueada nesta QA/);
 assert.equal(await page.locator('input[type=password]').count(),0,'Gate fechado nao pede senha');
 assert.equal(api.length,0,'Gate fechado nao consulta API');
 await page.goto(base+'/meg-unificado-qa.html?visual=prism&tela=login',{waitUntil:'domcontentloaded'});
 await page.locator('[data-meg-unified-screen="login"]').waitFor({state:'visible'});
 assert.equal(await page.getByRole('button',{name:'Entrar na demonstração sem autenticação'}).count(),1,'QA visual padrao preservada');
 assert.equal(api.length,0,'QA visual nao consulta API');
 assert.deepEqual(errors,[],'Nenhum erro no navegador');
 console.log('MEG_STAGE10_REAL_READ_GATE_BROWSER PASS');
}finally{await browser.close();}
