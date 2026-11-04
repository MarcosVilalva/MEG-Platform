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
    gridWidth:document.querySelector('.meg-l09-grid-panel')?.getBoundingClientRect().width||0,
    workspaceWidth:document.querySelector('.meg-l09-left')?.getBoundingClientRect().width||0,
    viewportHeight:document.querySelector('.meg-l09-grid-panel .meg-datagrid__viewport')?.getBoundingClientRect().height||0,
    graphsCollapsed:document.querySelector('[aria-label="Expandir gráfico de distribuição"]')?.getAttribute('aria-expanded')==='false',
    detailsCollapsed:document.querySelector('[aria-label="Expandir detalhes do lançamento"]')?.getAttribute('aria-expanded')==='false',
    visibleDataRows:window.innerWidth>=1024
      ?document.querySelectorAll('.meg-l09-grid-panel .meg-datagrid-table tbody tr:not(.meg-datagrid-spacer)').length
      :document.querySelectorAll('.meg-l09-grid-panel .meg-datagrid-card-row').length,
    dates:[...document.querySelectorAll('input[type="date"]')].map(x=>x.value)};
  });
  if(measurement.documentWidth>width+2)issues.push('scroll horizontal do documento');
  if(measurement.mainScrollWidth>measurement.mainClientWidth+2)issues.push('scroll horizontal da area principal');
  if(measurement.kpis!==4||measurement.panels!==2||!measurement.grid)issues.push('componentes ausentes');
  if(measurement.viewportHeight<120||measurement.visibleDataRows<1)issues.push('DataGrid sem linhas visiveis');
  if(!measurement.graphsCollapsed||!measurement.detailsCollapsed)issues.push('paineis nao iniciaram recolhidos');
  if(measurement.gridWidth<measurement.workspaceWidth-3)issues.push('grade nao ocupa a largura toda');
  if(calls.length)issues.push('requisições de API nao autorizadas na previa');
  await page.screenshot({path:resolve(out,'lancamentos-'+width+'x'+height+'.png'),fullPage:true});
  const chartToggle=page.getByRole('button',{name:'Expandir gráfico de distribuição'});
  await chartToggle.click();
  if(!(await page.locator('#meg-l09-distribution-content').isVisible()))issues.push('grafico nao expandiu');
  if(!(await page.getByRole('button',{name:'Expandir detalhes do lançamento'}).isVisible()))issues.push('paineis nao independentes');
  await page.getByRole('button',{name:'Expandir detalhes do lançamento'}).click();
  if(!(await page.locator('#meg-l09-details-content').isVisible()))issues.push('detalhes nao expandiram');
  if(!(await page.locator('.meg-l09-edit').isDisabled()))issues.push('edicao da previa desbloqueada');
  await page.screenshot({path:resolve(out,'lancamentos-paineis-abertos-'+width+'x'+height+'.png'),fullPage:true});
  await page.getByRole('button',{name:'Recolher gráfico de distribuição'}).click();
  if(await page.locator('#meg-l09-distribution-content').isVisible())issues.push('grafico nao recolheu');
  if(!(await page.locator('#meg-l09-details-content').isVisible()))issues.push('recolher grafico afetou detalhes');
  await page.getByRole('button',{name:'Recolher detalhes do lançamento'}).click();
  if(await page.locator('#meg-l09-details-content').isVisible())issues.push('detalhes nao recolheram');
  const search=page.getByPlaceholder('Buscar lançamentos...');
  await search.fill('Supermercado');
  const n=await page.locator('.meg-l09-grid-summary').textContent();
  // A busca inclui descrição, categoria, conta e forma de pagamento.
  // Os dois mercados da fixture compartilham a categoria Supermercado.
  if(!/2 de 11 registros/.test(n||''))issues.push('filtro de busca nao funcionou: '+n);
  await search.fill('');
  const detailButton=page.locator('.meg-datagrid-card-row:visible .meg-l09-open-row:visible, .meg-datagrid-table:visible .meg-l09-open-row:visible').filter({hasText:'Farmácia'}).first();
  await detailButton.click({timeout:8000});
  if(!(await page.locator('#meg-l09-details-content').isVisible()))issues.push('selecao nao expandiu detalhes');
  if(!/Farmácia/.test(await page.locator('.meg-l09-selected-head').textContent()||''))issues.push('selecionado incorreto');
  await page.getByRole('button',{name:'Recolher detalhes do lançamento'}).click();
  if(await page.locator('#meg-l09-details-content').isVisible())issues.push('detalhes nao recolheram apos selecao');
  await page.screenshot({path:resolve(out,'lancamentos-interacao-'+width+'x'+height+'.png'),fullPage:true});
  results.push({width,height,measurement,issues});
 }catch(e){issues.push(String(e));results.push({width,height,issues});}
 errors+=issues.length;await page.close();
}
await browser.close();writeFileSync(resolve(out,'resultados.json'),JSON.stringify(results,null,2));
for(const r of results)console.log(r.width+'x'+r.height+': '+(r.issues.length?r.issues.join(' | '):'OK'));
if(errors)process.exit(1);
