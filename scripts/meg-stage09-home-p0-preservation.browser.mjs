import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const base=process.env.MEG_PREVIEW_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
try {
  for(const [width,height] of [[390,844],[1366,768]]) {
    const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
    const apiCalls=[];const errors=[];
    page.on('request',r=>{if(/^\/(finance|auth|cards|payables)(\/|$)/.test(new URL(r.url()).pathname))apiCalls.push(r.url())});
    page.on('pageerror',e=>errors.push(String(e)));
    await page.goto(base+'/fluxo-integrado-08.html?tela=home&stage09p0=1',{waitUntil:'networkidle'});
    await page.locator('[data-preview-view="home-p0"]').waitFor();
    await page.locator('.meg-p0-qa-label').waitFor();
    // A Home P0 aprovou o diálogo inicial de vencimentos; fechá-lo é
    // uma interação real do usuário, não uma supressão de funcionalidade.
    const dueDialog=page.locator('.meg-due-alert-dialog');
    if(await dueDialog.count())await page.getByRole('button',{name:'Entendi'}).click();

    assert.match(await page.locator('.meg-period').innerText(),/Novembro de 2026/);
    assert.ok(await page.getByText('Obrigação fictícia vencida',{exact:false}).count()>0,'Fixture P0 canônica visual não foi restaurada');
    assert.equal(await page.locator('.pano-grid').count(),2,'Home P0 não preservou os dois grids');
    // Mobile: sidebar é um drawer, e não deve ser clicada fora do viewport.
    if(width<1024)await page.getByRole('button',{name:'Abrir menu'}).click();
    await page.getByRole('button',{name:'Lançamentos',exact:true}).click();
    await page.locator('.meg-l09.is-operational').waitFor();
    // O Shell operacional fecha o drawer após navegar, como aprovado.
    // Em mobile é preciso abrir novamente para tocar em Início.
    if(width<1024)await page.getByRole('button',{name:'Abrir menu'}).click();
    await page.getByRole('button',{name:'Início',exact:true}).click();
    await page.locator('[data-preview-view="home-p0"]').waitFor();
    if(width<1024){
      // Toque real fora do drawer, longe dos itens que o sobrepõem.
      await page.mouse.click(width-10,Math.floor(height/2));
      assert.equal(await page.locator('.meg-sidebar.is-open').count(),0,'Drawer mobile deve fechar');
    }
    assert.match(await page.locator('.meg-period').innerText(),/Novembro de 2026/);
    assert.ok(await page.getByText('Obrigação fictícia vencida',{exact:false}).count()>0,'Volta de Lançamentos perdeu fixture P0');
    await page.getByRole('button',{name:'Novo lançamento',exact:true}).first().click();
    await page.locator('.meg-integrated-preview__choice-overlay').waitFor();
    await page.getByRole('button',{name:'Fechar novo lançamento'}).click();
    await page.locator('[data-preview-view="home-p0"]').waitFor();
    assert.match(await page.locator('.meg-period').innerText(),/Novembro de 2026/);
    assert.equal(apiCalls.length,0,'Preview visual P0 jamais pode chamar a API');
    assert.deepEqual(errors,[],'Erros JS na preview P0');
    await page.close();
  }
  console.log('Home P0 da PR #669 preservada: fixture Novembro, navegação, overlay, zero API em desktop/mobile.');
}finally{await browser.close()}
