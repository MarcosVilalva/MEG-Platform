import { test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

test.use({ browserName: 'chromium', launchOptions: {
  executablePath: process.env.PLAYWRIGHT_CHROME_PATH || '/usr/bin/google-chrome',
  args: ['--no-sandbox'],
}});
const url = process.env.MEG_DATAGRID_URL || 'http://127.0.0.1:4173/datagrid-harness.html';
const root = path.resolve('artifacts/datagrid-stage05/diagnostico-rodada2');
const stateKey = 'meg-web-evolution:datagrid:stage-04-harness-visual';
const r = (el) => { if (!el) return null; const b=el.getBoundingClientRect(); return {
  left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height,
}; };
async function save(page, name) {
  await fs.mkdir(root,{recursive:true});
  const measurement=await page.evaluate(() => {
    const box = el => {if(!el)return null;const b=el.getBoundingClientRect();return {
      left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height};};
    const get=selector=>box(document.querySelector(selector));
    const toolbar=document.querySelector('.meg-datagrid-toolbar');
    const toolbarBox=box(toolbar);
    const controls=[...(toolbar?.querySelectorAll('button,select,input')||[])].filter(el=>{
      const c=getComputedStyle(el),b=box(el);
      return b&&b.width>3&&b.height>3&&c.display!=='none'&&c.visibility!=='hidden';
    }).map(el=>({name:el.getAttribute('aria-label')||el.textContent?.trim()||el.tagName,box:box(el)}));
    const intersects=(a,b)=>a&&b&&Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1;
    const overlaps=controls.flatMap((a,i)=>controls.slice(i+1).filter(b=>intersects(a.box,b.box)).map(b=>[a.name,b.name]));
    const clipped=controls.filter(x=>toolbarBox&&(x.box.right>toolbarBox.right+1||x.box.left<toolbarBox.left-1||x.box.bottom>toolbarBox.bottom+1||x.box.top<toolbarBox.top-1)).map(x=>x.name);
    const chips=[...document.querySelectorAll('.meg-datagrid-filter-chip')].map(chip=>{
      const icon=chip.querySelector('svg'), ib=box(icon);
      const pts=ib?[[ib.left+2,ib.top+2],[ib.right-2,ib.top+2],[ib.left+2,ib.bottom-2],[ib.right-2,ib.bottom-2]]:[];
      return {chip:box(chip),icon:ib,iconHitPoints:pts.map(([x,y])=>({x,y,hit:document.elementFromPoint(x,y)?.closest('.meg-datagrid-filter-chip')===chip,topElement:document.elementFromPoint(x,y)?.tagName})), title:chip.title, text:chip.textContent};
    });
    const sort=document.querySelector('.meg-datagrid-mobile-sort'),select=sort?.querySelector('select');
    const sidebar=document.querySelector('.sidebar');
    const active=document.activeElement;
    return {viewport:{width:innerWidth,height:innerHeight},document:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight},
      toolbar:toolbarBox,controls,overlaps,clipped,footer:get('.meg-datagrid-footer'),
      pdf:get('.meg-datagrid-pdf-action'),sortControl:box(sort),select:box(select),
      sortLabel:sort?.textContent?.trim(),chips,sidebar:box(sidebar),
      sidebarClass:sidebar?.className,activeElement:{tag:active?.tagName,id:active?.id,className:active?.className,name:active?.getAttribute('name')},
      search:get('.meg-datagrid-quick-search'),searchInput:get('input[name="meg-datagrid-quick-search"]')};
  });
  await fs.writeFile(path.join(root,name+'.json'),JSON.stringify(measurement,null,2));
  await page.screenshot({path:path.join(root,name+'.png'),animations:'disabled',fullPage:true});
}
const sizes=[{width:600,height:844},{width:660,height:844},{width:720,height:844},{width:760,height:844},
  {width:1093,height:480},{width:1024,height:600},{width:390,height:844},{width:360,height:844},{width:680,height:600}];
for(const size of sizes) {
  test('Medicao isolada '+size.width+'x'+size.height,async({page})=>{
    await page.setViewportSize(size);
    await page.goto(url+'?state=visual');
    await save(page,size.width+'x'+size.height+'-sem-filtros');
    await page.evaluate(key=>localStorage.setItem(key,JSON.stringify({filters:{
      segment:{type:'enum',selected:['gamma']},active:{type:'boolean',booleanValue:true}},
      sort:[],columnOrder:[],hiddenColumns:[],widths:{},pageSize:600})),stateKey);
    await page.reload();
    await save(page,size.width+'x'+size.height+'-com-filtros');
    if(size.width===390) {
      const button=page.getByRole('button',{name:'Abrir busca rápida'});
      if(await button.count()&&await button.isVisible())await button.click();
      const input=page.getByRole('searchbox',{name:'Buscar em todas as colunas visíveis'});
      await input.fill('texto-impossivel-para-estado-vazio-rodada2');
      await save(page,'390x844-vazio-filtrado');
    }
  });
}
test('Medicao de foco Ctrl+K',async({page})=>{
  await page.setViewportSize({width:910,height:400});
  await page.goto(url+'?state=visual');
  await save(page,'ctrl-k-antes');
  await page.keyboard.press('Control+k');
  await save(page,'ctrl-k-depois');
  await page.waitForTimeout(250);
  await save(page,'ctrl-k-250ms');
});
test('Referencia raster baseline 680x600',async({page})=>{
  await page.setViewportSize({width:680,height:600});
  await page.goto(url+'?state=visual');
  const file=path.resolve('apps/web/src/meg-web-evolution/datagrid/datagrid.quality.playwright.spec.mjs-snapshots/datagrid-680x600-linux.png');
  const bytes=await fs.readFile(file);
  await fs.mkdir(root,{recursive:true});
  await fs.writeFile(path.join(root,'baseline-680x600.png'),bytes);
  await fs.writeFile(path.join(root,'baseline-680x600.json'),JSON.stringify({
    source:'snapshot PNG da etapa 04',imageWidth:bytes.readUInt32BE(16),imageHeight:bytes.readUInt32BE(20),
    note:'Baseline rasterizada nao contem caixas DOM; nao atribuir medidas de select/toolbar inexistentes.',
  },null,2));
  await save(page,'atual-680x600');
});
