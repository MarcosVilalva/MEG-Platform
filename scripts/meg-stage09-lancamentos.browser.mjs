import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const out=resolve('artifacts/meg-stage09-lancamentos');mkdirSync(out,{recursive:true});
const sizes=[[390,844],[768,1024],[1024,768],[1366,768],[1920,1080],[2560,1440],[1366,600],[390,667]];
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
const results=[];let errors=0;
for(const [width,height] of sizes){
 const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
 page.setDefaultTimeout(8000);
 console.log('Verificando viewport '+width+'x'+height);
 const calls=[];page.on('request',r=>{if(/\/api\//.test(new URL(r.url()).pathname))calls.push(r.url())});
 const issues=[];
 try{
  await page.goto('http://127.0.0.1:4173/fluxo-integrado-08.html?tela=lancamentos',{waitUntil:'networkidle'});
  await page.locator('.meg-l09').waitFor();
  const measurement=await page.evaluate(()=>{
   const main=document.querySelector('.meg-main'),root=document.querySelector('.meg-l09');
   const rect=(el)=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,top:r.top,bottom:r.bottom}};
   return {documentWidth:document.documentElement.scrollWidth,mainScrollWidth:main.scrollWidth,mainClientWidth:main.clientWidth,
    container:rect(root),kpis:document.querySelectorAll('.meg-l09-stat').length,
    panels:document.querySelectorAll('.meg-l09-panel').length,
    grid:!!document.querySelector('.meg-l09-grid-panel .meg-datagrid'),
    viewportHeight:document.querySelector('.meg-l09-grid-panel .meg-datagrid__viewport')?.getBoundingClientRect().height||0,
    visibleDataRows:window.innerWidth>=1024
      ?document.querySelectorAll('.meg-l09-grid-panel .meg-datagrid-table tbody tr:not(.meg-datagrid-spacer)').length
      :document.querySelectorAll('.meg-l09-grid-panel .meg-datagrid-card-row').length,
    editorDisabled:document.querySelector('.meg-l09-edit')?.disabled===true,
    dates:[...document.querySelectorAll('input[type="date"]')].map(x=>x.value)};
  });
  if(measurement.documentWidth>width+2)issues.push('scroll horizontal do documento');
  if(measurement.mainScrollWidth>measurement.mainClientWidth+2)issues.push('scroll horizontal da area principal');
  if(measurement.kpis!==4||measurement.panels!==2||!measurement.grid)issues.push('componentes ausentes');
  if(measurement.viewportHeight<120||measurement.visibleDataRows<1)issues.push('DataGrid sem linhas visiveis');
  if(!measurement.editorDisabled)issues.push('edicao desbloqueada na previa');
  if(calls.length)issues.push('requisições de API nao autorizadas na previa');
  await page.screenshot({path:resolve(out,'lancamentos-'+width+'x'+height+'.png'),fullPage:true});
  const search=page.getByPlaceholder('Buscar lançamentos...');
  await search.fill('Supermercado');
  const n=await page.locator('.meg-l09-grid-summary').textContent();
  // A busca inclui descrição, categoria, conta e forma de pagamento.
  // Os dois mercados da fixture compartilham a categoria Supermercado.
  if(!/2 de 11 registros/.test(n||''))issues.push('filtro de busca nao funcionou: '+n);
  await search.fill('');
  const detailButton=page.locator('.meg-datagrid-card-row:visible .meg-l09-open-row:visible, .meg-datagrid-table:visible .meg-l09-open-row:visible').filter({hasText:'Supermercado'}).first();
  await detailButton.click({timeout:8000});
  if(width<640){if(!(await page.locator('.meg-l09-details.is-mobile-open').isVisible()))issues.push('detalhe mobile nao abriu');
   await page.getByRole('button',{name:'Fechar detalhes'}).last().click();}
  await page.screenshot({path:resolve(out,'lancamentos-interacao-'+width+'x'+height+'.png'),fullPage:true});
  results.push({width,height,measurement,issues});
 }catch(e){issues.push(String(e));results.push({width,height,issues});}
 errors+=issues.length;await page.close();
}
await browser.close();writeFileSync(resolve(out,'resultados.json'),JSON.stringify(results,null,2));
for(const r of results)console.log(r.width+'x'+r.height+': '+(r.issues.length?r.issues.join(' | '):'OK'));
if(errors)process.exit(1);
