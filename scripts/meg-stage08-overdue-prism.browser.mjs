import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';

const origin=process.env.MEG_STAGE08_QA_URL||'http://127.0.0.1:4175';
const version=process.env.MEG_STAGE08_QA_VERSION||'';
const suffix='?visual=prism'+(version?'&v='+encodeURIComponent(version):'');
const output=resolve('artifacts/meg-stage08-overdue-warning');
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({
 headless:true,executablePath:process.env.PLAYWRIGHT_CHROME_PATH||'/usr/bin/google-chrome',
 args:['--no-sandbox'],
});
try{
 for(const [width,height] of [[390,844],[960,900],[1366,768]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  const errors=[],finance=[],external=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('request',request=>{
   const u=new URL(request.url());
   if(/^\/(auth|finance|cards|payables)(\/|$)/.test(u.pathname))finance.push(request.url());
   if(u.origin!==new URL(origin).origin &&
      !['https://images.unsplash.com','https://fonts.googleapis.com','https://fonts.gstatic.com'].includes(u.origin)){
    external.push(request.url());
   }
  });
  try{
   await page.goto(origin+'/stage08-funcional-qa.html'+suffix,{waitUntil:'domcontentloaded'});
   const dlg=page.locator('.meg-due-alert-dialog');
   await dlg.waitFor({state:'visible',timeout:30000});
   const expired=dlg.locator('.meg-due-alert-item.is-overdue');
   const today=dlg.locator('.meg-due-alert-item.is-due-today');
   assert.ok(await expired.count()>=1,'Nenhum item vencido no fixture canônico');
   assert.ok(await today.count()>=1,'Nenhum item vence hoje no fixture canônico');
   assert.equal(await dlg.locator('.meg-due-alert-dialog__emblem svg[data-meg-due-warning="overdue-triangle"]').count(),1,'Emblema vermelho não recebeu triângulo');
   assert.equal(await expired.locator('svg[data-meg-due-warning="overdue-triangle"]').count(),await expired.count(),'Todos os compromissos vencidos precisam do triângulo');
   assert.equal(await today.locator('svg[data-meg-due-warning]').count(),0,'Relógio amarelo foi substituído incorretamente');
   assert.equal(await today.locator('svg[data-home-glyph="timer"]').count(),1,'Relógio amarelo canônico desapareceu');
   assert.ok(await dlg.getByText('Vencido',{exact:true}).count()>0,'Texto acessível do status vencido não foi preservado');
   assert.ok(await dlg.getByText('Vence hoje',{exact:true}).count()>0,'Texto do status vence hoje não foi preservado');
   const triangle=expired.first().locator('svg[data-meg-due-warning="overdue-triangle"]');
   const info=await triangle.evaluate(svg=>({
     width:svg.getBoundingClientRect().width,
     shapes:svg.querySelectorAll('path').length,
     gradients:svg.querySelectorAll('linearGradient').length,
     whiteExclamation:svg.querySelectorAll('path[stroke="#fffaf4"],circle[fill="#fffaf4"]').length,
   }));
   assert.ok(info.width>=24&&info.shapes>=4&&info.gradients>=1&&info.whiteExclamation>=2,'Triângulo perdeu desenho Prism ou exclamação contrastante');
   const ids=await dlg.locator('svg[data-meg-due-warning="overdue-triangle"] linearGradient').evaluateAll(nodes=>nodes.map(node=>node.id));
   assert.equal(new Set(ids).size,ids.length,'Gradientes reutilizaram IDs e podem apresentar conflito SVG');
   const horizontal=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,view:document.documentElement.clientWidth}));
   assert.ok(horizontal.doc<=horizontal.view+2,'Página apresenta scroll horizontal');
   await page.screenshot({path:resolve(output,'vencimentos-'+width+'.png'),fullPage:false});
   await dlg.getByRole('button',{name:'Entendi'}).click();
   await page.getByRole('button',{name:'Notificações'}).click();
   const panel=page.locator('.meg-due-bell-panel');
   await panel.waitFor({state:'visible',timeout:6000});
   assert.ok(await panel.locator('.meg-due-alert-item.is-overdue svg[data-meg-due-warning="overdue-triangle"]').count()>0,'Painel do sino ficou com ícone antigo');
   assert.ok(await panel.locator('.meg-due-alert-item.is-due-today svg[data-home-glyph="timer"]').count()>0,'Painel do sino perdeu o relógio amarelo');
   await page.getByRole('button',{name:'Fechar painel de notificações'}).click();
   assert.deepEqual(finance,[],'Ícone visual disparou requisição financeira');
   assert.deepEqual(external,[],'Ícone adicionou dependência de rede não autorizada');
   assert.deepEqual(errors,[],'Erro JavaScript durante os alertas');
   console.log('STAGE08_OVERDUE_PRISM '+width+'x'+height+' PASS (triângulo vermelho, relógio preservado, sino, sem rede)');
  }finally{await page.close()}
 }
}finally{await browser.close()}
