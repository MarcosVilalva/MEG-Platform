import { test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

test.use({ browserName: 'chromium', launchOptions: {
  executablePath: process.env.PLAYWRIGHT_CHROME_PATH || '/usr/bin/google-chrome',
  args: ['--no-sandbox'],
}});
const url = process.env.MEG_DATAGRID_URL || 'http://127.0.0.1:4173/datagrid-harness.html';
const output = path.resolve('artifacts/datagrid-stage05/rodada3');
const storage = 'meg-web-evolution:datagrid:stage-04-harness-visual';
const scenarios = [
  { width: 1093, height: 480 },
  { width: 1024, height: 600 },
  { width: 600, height: 844 },
  { width: 390, height: 844 },
  { width: 360, height: 844 },
  { width: 660, height: 844 },
  { width: 720, height: 844 },
  { width: 760, height: 844 },
  { width: 680, height: 600 },
  { width: 1366, height: 600 },
  { width: 910, height: 400 },
];

async function capture(page, name, metadata = {}) {
  const data = await page.evaluate(() => {
    const rect = el => { if (!el) return null; const b = el.getBoundingClientRect(); return {
      left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height}; };
    const t = document.querySelector('.meg-datagrid-toolbar'), b=rect(t);
    const controls = [...(t?.querySelectorAll('button,select,input') ?? [])].filter(e=>{
      const c=getComputedStyle(e),r=rect(e);return r&&r.width>3&&r.height>3&&c.display!=='none'&&c.visibility!=='hidden';
    }).map(e=>({label:e.getAttribute('aria-label')||e.textContent?.trim(),box:rect(e)}));
    const hits = [...document.querySelectorAll('.meg-datagrid-filter-chip')].map(e=>{
      const icon=e.querySelector('svg'),r=rect(icon);
      const probes=r?[[r.left+2,r.top+2],[r.right-2,r.top+2],[r.left+2,r.bottom-2],[r.right-2,r.bottom-2]]:[];
      return {chip:rect(e),icon:r,title:e.title,probes:probes.map(([x,y])=>{
        const top=document.elementFromPoint(x,y);
        return {x,y,hit:top?.closest('.meg-datagrid-filter-chip')===e,covering:top?.className?.baseVal||top?.className||top?.tagName};
      })};
    });
    const overlap=(a,c)=>a&&c&&Math.min(a.right,c.right)-Math.max(a.left,c.left)>1&&Math.min(a.bottom,c.bottom)-Math.max(a.top,c.top)>1;
    return {viewport:{width:innerWidth,height:innerHeight},documentWidth:document.documentElement.scrollWidth,
      toolbar:b,footer:rect(document.querySelector('.meg-datagrid-footer')),
      sortControl:rect(document.querySelector('.meg-datagrid-mobile-sort')),
      sortSelect:rect(document.querySelector('.meg-datagrid-mobile-sort select')),
      sortText:document.querySelector('.meg-datagrid-mobile-sort')?.textContent?.trim(),
      search:rect(document.querySelector('.meg-datagrid-quick-search')),
      pdf:rect(document.querySelector('.meg-datagrid-pdf-action')),
      viewportBox:rect(document.querySelector('.meg-datagrid__viewport')),
      controls,overlaps:controls.flatMap((a,i)=>controls.slice(i+1).filter(c=>overlap(a.box,c.box)).map(c=>[a.label,c.label])),
      clipped:controls.filter(c=>b&&(c.box.left<b.left-1||c.box.right>b.right+1||c.box.top<b.top-1||c.box.bottom>b.bottom+1)).map(c=>c.label),
      chipHits:hits,activeElement:document.activeElement?.getAttribute('name')||document.activeElement?.tagName,
      sidebar:rect(document.querySelector('.sidebar')),sidebarClass:document.querySelector('.sidebar')?.className};
  });
  await fs.mkdir(output,{recursive:true});
  await fs.writeFile(path.join(output,name+'.json'), JSON.stringify({metadata,...data},null,2));
  await page.screenshot({path:path.join(output,name+'.png'),animations:'disabled',fullPage:true});
}

for (const size of scenarios) {
  test('Diagnostico exato '+size.width+'x'+size.height, async ({page}) => {
    await page.setViewportSize(size);
    await page.goto(url+'?state=visual');
    await capture(page,size.width+'x'+size.height+'-sem-filtros');
    await page.evaluate(key=>localStorage.setItem(key,JSON.stringify({
      filters:{segment:{type:'enum',selected:['gamma']},active:{type:'boolean',booleanValue:true}},
      sort:[],columnOrder:[],hiddenColumns:[],widths:{},pageSize:600,
    })),storage);
    await page.reload();
    if(size.width<1024) {
      const toggle=page.getByRole('button',{name:'Abrir busca rápida'});
      if(await toggle.isVisible()) await toggle.click({timeout:2500}).catch(()=>{});
    }
    const search=page.getByRole('searchbox',{name:'Buscar em todas as colunas visíveis'});
    if(await search.isVisible()) {
      await search.fill('tecnico 003');
      await search.press('Enter');
    }
    await capture(page,size.width+'x'+size.height+'-filtros-busca');
    if(size.width===390||size.width===360){
      if(await search.isVisible())await search.fill('resultado-impossivel-rodada3');
      await capture(page,size.width+'x'+size.height+'-vazio-filtrado');
    }
    const buttons=page.locator('button[aria-label*="sidebar"],button[aria-label*="Recolher"],button[aria-label*="Expandir"]');
    const toggle=buttons.first();
    if(await buttons.count() && await toggle.isVisible()) {
      await toggle.click();
      await capture(page,size.width+'x'+size.height+'-sidebar-alternada');
    } else {
      await fs.writeFile(path.join(output,size.width+'x'+size.height+'-sidebar-indisponivel.json'),
        JSON.stringify({reason:'Nenhum controle de recolhimento acessivel no harness',size},null,2));
    }
  });
}

/* Rodada 4: capturar explicitamente a geometria do cenário do contrato 7B,
   antes de qualquer asserção de regressão. */
for (const width of [600,660,720,760]) {
  test('Medicao exata Toolbar 7B ' + width, async ({page})=>{
    await page.setViewportSize({width,height:844});
    await page.goto(url+'?state=toolbar7b');
    await page.evaluate(()=>{
      localStorage.setItem('meg-web-evolution:datagrid:stage-04-harness-toolbar7b',JSON.stringify({
        filters:{description:{type:'text',operator:'contains',value:'3',selected:[]}},
        sort:[{key:'description',direction:'desc'}],
        columnOrder:[],hiddenColumns:[],widths:{},pageSize:600,
      }));
    });
    await page.reload();
    await capture(page,'rodada4-toolbar7b-'+width+'-estado-exato',{scenario:'toolbar7b',width});
  });
}
test('Medicao clique central lupa em 600x844',async({page})=>{
  await page.setViewportSize({width:600,height:844});
  await page.goto(url+'?state=visual');
  await page.evaluate(()=>{
    const btn=document.querySelector('.meg-datagrid-quick-search__toggle');
    if(!btn) return;
    const r=btn.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
    const top=document.elementFromPoint(x,y);
    document.body.dataset.lupaHit=String(top===btn||btn.contains(top));
    document.body.dataset.lupaTop=top?.className?.baseVal||top?.className||top?.tagName||'';
  });
  await capture(page,'rodada4-lupa-600x844',{hit:await page.locator('body').getAttribute('data-lupa-hit'),cover:await page.locator('body').getAttribute('data-lupa-top')});
});
