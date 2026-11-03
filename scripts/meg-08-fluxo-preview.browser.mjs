import {chromium} from '@playwright/test';
import {mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const base = process.env.MEG_PREVIEW_URL || 'http://127.0.0.1:4173';
const output = resolve('artifacts/meg08-integrado');
mkdirSync(output, {recursive:true});
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROME_PATH || '/usr/bin/google-chrome',
  args: ['--no-sandbox'],
});
const sizes = [
  [320,640],[360,800],[390,844],[640,900],[768,1024],
  [1024,768],[1366,768],[1672,941],[1920,1080],
];
const results = [];
let failures = 0;
try {
  for (const [width,height] of sizes) {
    const page = await browser.newPage({viewport:{width,height}, reducedMotion:'reduce'});
    const requests = [];
    page.on('request', request => {
      const u=new URL(request.url());
      if (u.pathname.includes('/api/') || u.pathname.includes('/auth/')) requests.push(u.pathname);
    });
    await page.goto(base+'/fluxo-integrado-08.html?tela=novo',{waitUntil:'networkidle'});
    await page.locator('[data-testid="new-launch-types"]').waitFor();
    const m = await page.evaluate(() => {
      const root = document.documentElement;
      const dialog = document.querySelector('.meg-new-launch.is-choose');
      const footer = document.querySelector('.meg-choice__back-action');
      const rect = n => {
        const r=n.getBoundingClientRect();
        return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height};
      };
      return {viewport:window.innerWidth,documentWidth:root.scrollWidth,
        dialog:dialog?rect(dialog):null,footer:footer?rect(footer):null,
        cards:[...document.querySelectorAll('.meg-choice__option')].map(rect)};
    });
    const problems = [];
    if (m.documentWidth > m.viewport+1) problems.push('rolagem horizontal da página');
    if (!m.dialog || !m.footer || m.cards.length !== 4) problems.push('seletor incompleto');
    else {
      if (m.dialog.left < -1 || m.dialog.right > width+1) problems.push('diálogo fora da largura');
      if (m.footer.bottom > height+1 || m.footer.top < 0) problems.push('botão Voltar cortado');
      if (m.cards.some(x=>x.height < 30 || x.width < 80)) problems.push('cards comprimidos');
    }
    if (requests.length) problems.push('requisição indevida à API: '+requests.join(','));
    await page.screenshot({path:resolve(output,'novo-'+width+'x'+height+'.png'),fullPage:true});
    results.push({screen:'novo',width,height,metrics:m,problems});
    if (problems.length) {failures++; console.error(width+'x'+height+': '+problems.join('; '));}
    await page.close();
  }
  const page = await browser.newPage({viewport:{width:1366,height:768}});
  await page.goto(base+'/fluxo-integrado-08.html?tela=login',{waitUntil:'networkidle'});
  await page.locator('[data-meg-login="visual-preview"]').waitFor();
  await page.getByRole('button',{name:'Entrar em modo demonstração (sem autenticar)'}).click();
  await page.locator('[data-preview-view="loading-initial"]').waitFor();
  await page.locator('.pano-actions', {timeout:12000}).waitFor();
  await page.screenshot({path:resolve(output,'home-1366x768.png'),fullPage:true});
  await page.locator('button.meg-topbar-new').click();
  await page.locator('[data-testid="new-launch-types"]').waitFor();
  await page.getByRole('button',{name:'Voltar à Home'}).click();
  if (await page.locator('[data-testid="new-launch-types"]').count()) throw Error('Modal não fechou');
  results.push({screen:'fluxo-login-home-novo',ok:true});
  await page.close();
} catch (e) {failures++;console.error(e);}
finally { await browser.close(); }
writeFileSync(resolve(output,'resultados.json'),JSON.stringify({failures,results},null,2));
if(failures) process.exitCode=1;
