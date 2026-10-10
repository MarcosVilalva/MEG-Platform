import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';

test.use({browserName:'chromium',launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROME_PATH || '/usr/bin/google-chrome',args:['--no-sandbox']}});
const base=process.env.MEG_DATAGRID_URL || 'http://127.0.0.1:4173/datagrid-harness.html';
const state='stage-04-harness-toolbar7b';
async function prepare(page,width,filter=true){
  await page.setViewportSize({width,height:844});
  await page.goto(base+'?state=toolbar7b');
  await page.evaluate(({key,filter})=>{
    localStorage.setItem('meg-web-evolution:datagrid:'+key,JSON.stringify({
      filters:filter?{description:{type:'text',operator:'contains',value:'3',selected:[]}}:{},
      sort:[{key:'description',direction:'desc'}],columnOrder:[],hiddenColumns:[],widths:{},pageSize:600
    }));
  },{key:state,filter});
  await page.reload();
  await expect(page.locator('.meg-datagrid-mobile-sort select')).toHaveValue('description:desc');
}
for (const width of [600,660,720,760]) {
  test('toolbar legivel e sem sobreposicao a '+width+'px',async({page})=>{
    await prepare(page,width);
    const report=await page.locator('.meg-datagrid-toolbar').evaluate(t=>{
      const nodes=[t.querySelector('.meg-datagrid-mobile-filter'),t.querySelector('.meg-datagrid-mobile-select-all'),t.querySelector('.meg-datagrid-toolbar__actions'),t.querySelector('.meg-datagrid-mobile-sort'),t.querySelector('.meg-datagrid-toolbar__filters')].filter(e=>e&&getComputedStyle(e).display!=='none');
      const rects=nodes.map(e=>({name:e.className,r:e.getBoundingClientRect()}));
      const toolbarRect=t.getBoundingClientRect();
      const allControls=[...t.querySelectorAll('.meg-datagrid-toolbar__actions button, .meg-datagrid-clear-all')].filter(e=>getComputedStyle(e).display!=='none');
      const clippedControls=allControls.filter(e=>e.getBoundingClientRect().right>toolbarRect.right+1||e.scrollWidth>e.clientWidth+1).map(e=>e.textContent.trim());
      const rowCount=new Set(rects.map(x=>Math.round(x.r.top/3))).size;
      const overlap=rects.flatMap((a,i)=>rects.slice(i+1).filter(b=>Math.min(a.r.right,b.r.right)-Math.max(a.r.left,b.r.left)>2&&Math.min(a.r.bottom,b.r.bottom)-Math.max(a.r.top,b.r.top)>2).map(b=>[a.name,b.name]));
      const selectRect=t.querySelector('.meg-datagrid-mobile-sort select').getBoundingClientRect();
      const chips=[...t.querySelectorAll('.meg-datagrid-filter-chip,.meg-datagrid-clear-all')].filter(e=>getComputedStyle(e).display!=='none').map(e=>e.getBoundingClientRect());
      const selectChipOverlap=chips.some(r=>Math.min(r.right,selectRect.right)-Math.max(r.left,selectRect.left)>1&&Math.min(r.bottom,selectRect.bottom)-Math.max(r.top,selectRect.top)>1);
      const label=t.querySelector('.meg-datagrid-mobile-select-all > span');
      const select=t.querySelector('.meg-datagrid-mobile-sort select');
      const canvas=document.createElement('canvas');const ctx=canvas.getContext('2d');
      ctx.font=getComputedStyle(select).font;
      const option=select.selectedOptions[0]?.textContent||'';
      const textWidth=ctx.measureText(option).width;
      return {rowCount,overlap,selectChipOverlap,clippedControls,selectionVisible:label.scrollWidth<=label.clientWidth,selectionText:label.textContent,
        selectionWidth:label.scrollWidth,selectionClient:label.clientWidth,
        selectWidth:select.getBoundingClientRect().width,selectOverflow:select.scrollWidth>select.clientWidth,textWidth,
        pageWidth:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth,
        toolbar:t.getBoundingClientRect().height};
    });
    expect(report.rowCount).toBeLessThanOrEqual(2);
    expect(report.overlap).toEqual([]);
    expect(report.clippedControls).toEqual([]);
    expect(report.selectChipOverlap).toBe(false);
    expect(report.selectionText).toBe('Selecionar filtrados');
    expect(report.selectionVisible).toBe(true);
    expect(report.selectWidth).toBeGreaterThanOrEqual(200);
    expect(report.selectOverflow).toBe(false);
    expect(report.textWidth+32).toBeLessThanOrEqual(report.selectWidth);
    expect(report.pageWidth).toBeLessThanOrEqual(report.viewport);
    if(width===660){
      await fs.mkdir('artifacts/datagrid-evidence',{recursive:true});
      await page.locator('.meg-datagrid-toolbar').screenshot({path:'artifacts/datagrid-evidence/toolbar-660x844.png'});
    }
  });
}
for (const width of [390,660]) {
  test('chip de filtro removivel por clique no X a '+width+'px',async({page})=>{
    await prepare(page,width);
    const chip=page.locator('.meg-datagrid-filter-chip').first();
    await expect(chip).toBeVisible();
    const svg=chip.locator('svg').last();
    if(width===660){
      const size=await svg.boundingBox();
      expect(size.width).toBeGreaterThanOrEqual(32);
      expect(size.height).toBeGreaterThanOrEqual(32);
    }
    await svg.click();
    await expect(chip).toHaveCount(0);
  });
}
for(const width of [390,800]){
  test('regressao estrutural viewport '+width+'px',async({page})=>{
    await prepare(page,width);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);
    expect(overflow).toBe(false);
    await expect(page.locator('.meg-datagrid__viewport')).toBeVisible();
  });
}

for (const width of [600,660,720,760]) {
  test('quatro filtros mantem overflow e Limpar tudo visiveis em '+width+'px', async({page})=>{
    await prepare(page,width);
    await page.evaluate(()=> {
      const key='meg-web-evolution:datagrid:stage-04-harness-toolbar7b';
      const state=JSON.parse(localStorage.getItem(key));
      state.filters={
        description:{type:'text',operator:'contains',value:'3',selected:[]},
        segment:{type:'enum',selected:['alpha']},
        quantity:{type:'number',operator:'gte',value:'23',selected:[]},
        amount:{type:'currency',operator:'gte',value:'23',selected:[]},
      };
      localStorage.setItem(key,JSON.stringify(state));
    });
    await page.reload();
    await expect(page.locator('.meg-datagrid-more-filters')).toContainText('+3 filtros');
    await expect(page.locator('.meg-datagrid-filter-chip')).toHaveCount(1);
    const result=await page.locator('.meg-datagrid-toolbar').evaluate(t=>{
      const r=t.getBoundingClientRect();
      const elements=[...t.querySelectorAll('.meg-datagrid-more-filters,.meg-datagrid-clear-all,.meg-datagrid-filter-chip')];
      return elements.filter(e=>{const b=e.getBoundingClientRect();return b.right>r.right+1||b.left<r.left-1||e.scrollWidth>e.clientWidth+1;}).map(e=>e.textContent.trim());
    });
    expect(result).toEqual([]);
    await page.locator('.meg-datagrid-more-filters').click();
    await expect(page.locator('[data-datagrid-active-filters-popover]')).toBeVisible();
  });
}
