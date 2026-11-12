import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const out=resolve('artifacts/meg-stage09-lancamentos');mkdirSync(out,{recursive:true});
const sizes=[[390,844],[768,1024],[1024,768],[1366,768],[1920,1080],[2560,1440],[1366,600],[390,667]];
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
const results=[];let errors=0;
const pack='phosphor'; // Único padrão aprovado na Etapa 09.
for(const [width,height] of sizes){
 const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
 page.setDefaultTimeout(8000);
 console.log('Verificando '+pack+' no viewport '+width+'x'+height);
 const calls=[];page.on('request',r=>{if(/\/api\//.test(new URL(r.url()).pathname))calls.push(r.url())});
 const issues=[];
 try{
  await page.goto('http://127.0.0.1:4173/fluxo-integrado-08.html?tela=lancamentos-legado',{waitUntil:'networkidle'});
  await page.locator('.meg-l09').waitFor();
  const measurement=await page.evaluate(()=>{
   const main=document.querySelector('.meg-main'),root=document.querySelector('.meg-l09');
   const rect=(el)=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,top:r.top,bottom:r.bottom}};
   return {documentWidth:document.documentElement.scrollWidth,mainScrollWidth:main.scrollWidth,mainClientWidth:main.clientWidth,
    container:rect(root),kpis:document.querySelectorAll('.meg-l09-stat').length,
    panels:document.querySelectorAll('.meg-l09-panel').length,
    grid:!!document.querySelector('.meg-l09-grid-panel .meg-datagrid'),
    pack:document.querySelector('.meg-l09')?.getAttribute('data-icon-pack'),
    kpiIconBox:(()=>{const x=document.querySelector('.meg-l09-stat.is-income [data-launch-icon]')?.getBoundingClientRect();return x?{width:x.width,height:x.height}:null})(),
    categoryIconBox:(()=>{const icons=[...document.querySelectorAll('.meg-l09-grid-panel .meg-l09-chip [data-launch-icon]')];const x=icons.map(el=>el.getBoundingClientRect()).find(rect=>rect.width>0&&rect.height>0);return x?{width:x.width,height:x.height}:null})(),
    categoryIconPack:document.querySelector('.meg-l09-grid-panel .meg-l09-chip [data-launch-icon]')?.getAttribute('data-launch-pack'),
    incomeViewBox:document.querySelector('.meg-l09-stat.is-income [data-launch-icon]')?.getAttribute('viewBox'),
    incomeGlyph:document.querySelector('.meg-l09-stat.is-income [data-launch-icon]')?.getAttribute('data-launch-icon'),
    expenseGlyph:document.querySelector('.meg-l09-stat.is-expense [data-launch-icon]')?.getAttribute('data-launch-icon'),
    categoryGlyphs:document.querySelectorAll('.meg-l09-grid-panel .meg-l09-chip [data-launch-icon]').length,
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
  if(measurement.incomeGlyph!=='trendUp'||measurement.expenseGlyph!=='trendDown')issues.push('sentido dos icones de entrada e saida incorreto');
  if(measurement.pack!==pack||measurement.categoryIconPack!==pack)issues.push('pack de icones incorreto');
  if(measurement.incomeViewBox!=='0 0 256 256')issues.push('viewBox nao corresponde ao pack');
  if(!measurement.kpiIconBox||Math.abs(measurement.kpiIconBox.width-25)>1||Math.abs(measurement.kpiIconBox.height-25)>1)issues.push('bounding box do KPI mudou');
  if(!measurement.categoryIconBox||Math.abs(measurement.categoryIconBox.width-17)>1||Math.abs(measurement.categoryIconBox.height-17)>1)issues.push('bounding box da categoria mudou');
  if(measurement.categoryGlyphs<1)issues.push('categorias sem icones SVG');
  if(measurement.viewportHeight<120||measurement.visibleDataRows<1)issues.push('DataGrid sem linhas visiveis');
  if(!measurement.graphsCollapsed||!measurement.detailsCollapsed)issues.push('paineis nao iniciaram recolhidos');
  if(measurement.gridWidth<measurement.workspaceWidth-3)issues.push('grade nao ocupa a largura toda');
  if(calls.length)issues.push('requisições de API nao autorizadas na previa');
  await page.screenshot({path:resolve(out,'lancamentos-'+pack+'-'+width+'x'+height+'.png'),fullPage:true});
  const chartToggle=page.getByRole('button',{name:'Expandir gráfico de distribuição'});
  await chartToggle.click();
  if(!(await page.locator('#meg-l09-distribution-content').isVisible()))issues.push('grafico nao expandiu');
  if(!(await page.getByRole('button',{name:'Expandir detalhes do lançamento'}).isVisible()))issues.push('paineis nao independentes');
  await page.getByRole('button',{name:'Expandir detalhes do lançamento'}).click();
  if(!(await page.locator('#meg-l09-details-content').isVisible()))issues.push('detalhes nao expandiram');
  if(!(await page.locator('.meg-l09-edit').isDisabled()))issues.push('edicao da previa desbloqueada');
  await page.screenshot({path:resolve(out,'lancamentos-paineis-abertos-'+pack+'-'+width+'x'+height+'.png'),fullPage:true});
  await page.getByRole('button',{name:'Recolher gráfico de distribuição'}).click();
  if(await page.locator('#meg-l09-distribution-content').isVisible())issues.push('grafico nao recolheu');
  if(!(await page.locator('#meg-l09-details-content').isVisible()))issues.push('recolher grafico afetou detalhes');
  await page.getByRole('button',{name:'Recolher detalhes do lançamento'}).click();
  if(await page.locator('#meg-l09-details-content').isVisible())issues.push('detalhes nao recolheram');
  const search=page.getByPlaceholder('Buscar lançamentos...');
  await search.fill('Supermercado');
  if(!(await page.locator('.meg-l09-grid-panel .meg-l09-chip [data-launch-icon="grocery"]').count()))issues.push('categoria supermercado sem icone correspondente');
  const n=await page.locator('.meg-l09-grid-summary').textContent();
  // A busca inclui descrição, categoria, conta e forma de pagamento.
  // Os dois mercados da fixture compartilham a categoria Supermercado.
  if(!/2 de 11 registros/.test(n||''))issues.push('filtro de busca nao funcionou: '+n);
  await search.fill('');
  if(!(await page.locator('.meg-l09-grid-panel .meg-l09-chip [data-launch-icon="health"]').count()))issues.push('categoria saude sem icone correspondente');
  const detailButton=page.locator('.meg-datagrid-card-row:visible .meg-l09-open-row:visible, .meg-datagrid-table:visible .meg-l09-open-row:visible').filter({hasText:'Farmácia'}).first();
  await detailButton.click({timeout:8000});
  if(!(await page.locator('#meg-l09-details-content').isVisible()))issues.push('selecao nao expandiu detalhes');
  if(!/Farmácia/.test(await page.locator('.meg-l09-selected-head').textContent()||''))issues.push('selecionado incorreto');
  await page.getByRole('button',{name:'Recolher detalhes do lançamento'}).click();
  if(await page.locator('#meg-l09-details-content').isVisible())issues.push('detalhes nao recolheram apos selecao');
  await page.screenshot({path:resolve(out,'lancamentos-interacao-'+pack+'-'+width+'x'+height+'.png'),fullPage:true});
  results.push({pack,width,height,measurement,issues});
 }catch(e){issues.push(String(e));results.push({pack,width,height,issues});}
 errors+=issues.length;await page.close();
}
await browser.close();writeFileSync(resolve(out,'resultados.json'),JSON.stringify(results,null,2));
for(const r of results)console.log(r.pack+' '+r.width+'x'+r.height+': '+(r.issues.length?r.issues.join(' | '):'OK'));
if(errors)process.exit(1);
