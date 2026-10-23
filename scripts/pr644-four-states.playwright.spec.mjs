import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const URL='http://127.0.0.1:4173/web-evolution.html?auth=recover-password';
const OUT='artifacts/meg-pr644-visual-four-states';
const sizes=[[1366,768],[1366,600],[1024,600],[1093,480],[910,400]];
test.use({launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROME_PATH||undefined}});
test.setTimeout(45_000);

async function reach(page,role,name) {
  const loc=page.getByRole(role,{name});
  await loc.scrollIntoViewIfNeeded();
  await expect(loc).toBeVisible();
  await expect(loc).toBeInViewport({ratio:.80});
  const ok=await loc.evaluate(el=>{
    const r=el.getBoundingClientRect();
    const x=r.left+r.width/2,y=r.top+r.height/2;
    const actual=document.elementFromPoint(x,y);
    return Boolean(actual && (actual===el||el.contains(actual)));
  });
  expect(ok, 'Control must be clickable after structural scrolling').toBe(true);
  return loc;
}
for(const [width,height] of sizes){
  test('Visual and keyboard states '+width+'x'+height,async({browser})=>{
    const ctx=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
    const page=await ctx.newPage();
    let release;
    let count=0;
    await page.route('**/auth/forgot-password',async route=>{
      count++;
      await new Promise(resolve=>{release=resolve});
      await route.fulfill({status:202,contentType:'application/json',body:JSON.stringify({status:'PASSWORD_SENT',deliveredTo:'mock@example.test',notifications:[]})});
    });
    try{
      mkdirSync(OUT,{recursive:true});
      await page.goto(URL);
      await page.evaluate(()=>document.fonts.ready);
      const input=await reach(page,'textbox','E-mail');
      await reach(page,'button','Receber senha temporária');
      await reach(page,'button','Voltar ao login');
      await page.screenshot({path:OUT+'/normal-'+width+'x'+height+'.png',fullPage:true,animations:'disabled'});
      await page.getByRole('button',{name:'Receber senha temporária'}).click();
      await expect(page.getByRole('alert')).toContainText('Digite um e-mail válido.');
      await expect(input).toBeFocused();
      await reach(page,'button','Voltar ao login');
      await page.screenshot({path:OUT+'/error-'+width+'x'+height+'.png',fullPage:true,animations:'disabled'});
      await input.fill('visual.only@example.test');
      await input.press('Enter');
      await expect.poll(()=>count).toBe(1);
      await expect(page.getByRole('button',{name:'Solicitando...'})).toBeDisabled();
      await reach(page,'button','Voltar ao login');
      await page.screenshot({path:OUT+'/sending-'+width+'x'+height+'.png',fullPage:true,animations:'disabled'});
      release();
      await expect(page.getByRole('heading',{name:'Solicitação recebida'})).toBeVisible();
      await expect(page.getByRole('heading',{name:'Solicitação recebida'})).toBeFocused();
      await reach(page,'button','Voltar ao login');
      await page.screenshot({path:OUT+'/success-'+width+'x'+height+'.png',fullPage:true,animations:'disabled'});
      const metrics=await page.evaluate(()=>{
        const root=document.querySelector('.meg-login');
        const action=document.querySelector('.meg-auth-footer button');
        const r=action.getBoundingClientRect();
        return {windowWidth:innerWidth,windowHeight:innerHeight,
          horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1,
          pageScrollHeight:document.documentElement.scrollHeight,
          authScrollHeight:root.scrollHeight,authClientHeight:root.clientHeight,
          actionVisibleAfterScroll:r.top>=0 && r.bottom<=innerHeight+1,
          actionHeight:r.height};
      });
      expect(metrics.horizontalOverflow).toBe(false);
      expect(metrics.actionVisibleAfterScroll).toBe(true);
      expect(metrics.actionHeight).toBeGreaterThanOrEqual(40);
      writeFileSync(OUT+'/metrics-'+width+'x'+height+'.json',JSON.stringify(metrics,null,2));
      console.log('VIEWPORT_REACHABLE_'+width+'x'+height+'=true');
      await page.getByRole('button',{name:'Voltar ao login'}).click();
      await expect(page.getByRole('heading',{name:'Bem-vindo de volta.'})).toBeVisible();
    }finally{await ctx.close()}
  });
}

test('Double click dispatch in same tick triggers one request while pending',async({page})=>{
  let calls=0;
  let release;
  await page.route('**/auth/forgot-password',async route=>{
    calls++;
    await new Promise(resolve=>{release=resolve});
    await route.fulfill({status:202,contentType:'application/json',body:JSON.stringify({status:'PASSWORD_SENT',deliveredTo:'private@example.test',notifications:[]})});
  });
  await page.goto(URL);
  await page.getByRole('textbox',{name:'E-mail'}).fill('two-clicks@example.test');
  await page.evaluate(()=>{
    const button=document.querySelector('.meg-auth-form button[type=submit]');
    button.click();
    button.click();
  });
  await expect.poll(()=>calls).toBe(1);
  await expect(page.getByRole('button',{name:'Solicitando...'})).toBeDisabled();
  release();
  await expect(page.getByRole('heading',{name:'Solicitação recebida'})).toBeVisible();
  expect(calls).toBe(1);
});
