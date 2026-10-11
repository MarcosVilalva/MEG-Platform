import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
test.use({browserName:'chromium',launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']}});
const url=process.env.MEG_DATAGRID_URL||'http://127.0.0.1:4173/datagrid-harness.html';
const dir='artifacts/datagrid-stage05/responsive',key='meg-web-evolution:datagrid:stage-04-harness-visual';
const sizes=[[1366,600],[1093,480],[1024,600],[910,400],[760,600],[720,600],[680,600],[680,400],[660,600],[640,600],[600,844],[390,844],[360,844]];
const filters={segment:{type:'enum',selected:['gamma']},active:{type:'boolean',booleanValue:true}};
async function visit(page,width,height,side){
 await page.setViewportSize({width,height});await page.goto(url+'?state=visual');
 await page.evaluate(({side,key})=>{localStorage.removeItem(key);localStorage.setItem('meg-web-evolution:sidebar-collapsed',String(side==='recolhida'));},{side,key});await page.reload();
}
async function snap(page,name){
 await fs.mkdir(dir,{recursive:true});await page.screenshot({path:path.join(dir,name+'.png'),animations:'disabled'});
 const m=await page.evaluate(()=>{
 const rect=e=>{if(!e||!e.getClientRects().length)return null;return e.getBoundingClientRect().toJSON()};
 const get=s=>rect(document.querySelector(s)),bar=get('.meg-datagrid-toolbar');
 const all=[...document.querySelectorAll('.meg-datagrid-toolbar button,.meg-datagrid-toolbar select,.meg-datagrid-toolbar input')]
 .filter(e=>{let r=rect(e),c=getComputedStyle(e);return r&&r.width>=4&&r.height>=4&&c.visibility!=='hidden'&&c.clipPath!=='inset(50%)'})
 .map(e=>({name:e.getAttribute('aria-label')||e.textContent?.trim(),box:rect(e)}));
 const overlaps=[];for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++){
 const a=all[i].box,b=all[j].box;if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)overlaps.push([all[i].name,all[j].name]);}
 return {window:{width:innerWidth,height:innerHeight},toolbar:bar,footer:get('.meg-datagrid-footer'),select:get('.meg-datagrid-mobile-sort select'),sort:get('.meg-datagrid-mobile-sort'),
  quickSearch:get('.meg-datagrid-quick-search'),pdf:get('.meg-datagrid-pdf-action'),overlaps,controls:all,
  clipped:all.filter(x=>x.box.left<bar.left-1||x.box.right>bar.right+1||x.box.top<bar.top-1||x.box.bottom>bar.bottom+1).map(x=>x.name),
  bodyWidth:document.documentElement.scrollWidth,
  chips:[...document.querySelectorAll('.meg-datagrid-filter-chip')].map(e=>({text:e.textContent,title:e.title,icon:rect(e.querySelector('svg'))}))};
 });
 await fs.writeFile(path.join(dir,name+'.json'),JSON.stringify(m,null,2));return m;
}
for(const [w,h] of sizes)for(const side of w>=1024?['expandida','recolhida']:['recolhida','drawer-aberto']){
 test('Geometria '+w+'x'+h+' '+side,async({page})=>{
 await visit(page,w,h,side);const name=w+'x'+h+'-'+side;
 let a=await snap(page,name+'-antes-sem-filtros');
 if(side==='drawer-aberto' && await page.getByRole('button',{name:'Abrir menu'}).isVisible()){
  await page.getByRole('button',{name:'Abrir menu'}).click();
  await snap(page,name+'-drawer-expandido');await page.getByRole('button',{name:'Fechar menu'}).click();
 }
 await page.evaluate(({key,filters})=>localStorage.setItem(key,JSON.stringify({filters,sort:[],columnOrder:[],hiddenColumns:[],widths:{},pageSize:600})),{key,filters});await page.reload();
 let b=await snap(page,name+'-depois-com-filtros');
 for(const g of [a,b]){
  expect(g.bodyWidth,'documento sem scroll horizontal').toBeLessThanOrEqual(w+1);
  expect(g.overlaps,'não sobrepor controles').toEqual([]);
  expect(g.clipped,'controles não cortados').toEqual([]);
  if(g.select&&g.sort)expect(g.select.right,'select dentro de Ordenar').toBeLessThanOrEqual(g.sort.right+1);
  if(w===390)expect(g.footer?.bottom,'rodapé dentro 844').toBeLessThanOrEqual(h+1);
 }
 if((w===1366&&h===600)||(w===910&&h===400))expect(Math.abs(a.toolbar.height-45.6),'altura original ±1px').toBeLessThanOrEqual(1);
 if(w<=390)for(const chip of b.chips)expect(chip.icon?.width,'hit área do X').toBeGreaterThanOrEqual(16);
 if(w===390){
   if(await page.getByRole('button',{name:'Abrir busca rápida'}).isVisible())await page.getByRole('button',{name:'Abrir busca rápida'}).click();
   await page.getByRole('searchbox',{name:'Buscar em todas as colunas visíveis'}).fill('valor-que-nao-existe-98765');
   await expect(page.getByText('Nenhum resultado com os filtros atuais')).toBeVisible();
   let empty=await snap(page,name+'-vazio-filtrado');
   expect(empty.footer?.bottom,'rodapé no vazio').toBeLessThanOrEqual(h+1);
 }
 });
}
test('Trace 600x844 clique da lupa e foco Ctrl+K',async({page})=>{
 await visit(page,600,844,'recolhida');await fs.mkdir(dir,{recursive:true});
 await page.context().tracing.start({snapshots:true,screenshots:true});const trace=[];
 try{
  await page.evaluate(()=>{window.__traceFocus=[];for(const type of ['keydown','focusin','focusout'])document.addEventListener(type,e=>window.__traceFocus.push({type,key:e.key,active:document.activeElement?.outerHTML?.slice(0,250)}),true)});
  const button=page.getByRole('button',{name:'Abrir busca rápida'});trace.push({step:'button',bounding:await button.boundingBox()});
  await button.click({timeout:5000});const input=page.getByRole('searchbox',{name:'Buscar em todas as colunas visíveis'});
  await expect(input).toBeFocused();await input.fill('tecnico 003');await page.waitForTimeout(250);await expect(input).toBeFocused();
  await input.press('Escape');await page.keyboard.press('Control+k');await expect(input).toBeFocused();
 }catch(e){trace.push({failure:String(e)});throw e;}finally{
 trace.push({events:await page.evaluate(()=>window.__traceFocus??[]).catch(()=>[])});
 await fs.writeFile(path.join(dir,'trace-600x844-focus.json'),JSON.stringify(trace,null,2));
 await page.context().tracing.stop({path:path.join(dir,'trace-600x844-focus.zip')});
 }
});
