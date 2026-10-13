import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
const DIR='artifacts/meg-stage05-auth';
const ROOT='http://127.0.0.1:4173/web-evolution.html?auth=create-account';
const SIZES=[[360,844],[390,844],[768,1024],[1365,600],[1366,768],[1920,1080],[2560,1440]];
// Posição do orbe estimada sobre a imagem oficial original (2048x1143 px).
const ORB_CENTER={x:1008,y:542}, ORB_RADIUS=20, ORB_SOURCE={width:2048,height:1143};
const dist=(c,r)=>Math.hypot(c.x-Math.max(r.x,Math.min(c.x,r.right)),c.y-Math.max(r.y,Math.min(c.y,r.bottom)))-c.radius;
async function measure(page){
 return page.evaluate(({ORB_CENTER,ORB_RADIUS,ORB_SOURCE})=>{
  const bbox=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
  const el=q=>document.querySelector(q), card=el('.meg-auth-card'), hero=el('.meg-auth-page'), h=el('.meg-auth-page .meg-login-hero h2'),span=h.querySelector('span');
  const r=document.createRange(),node=span.lastChild;r.setStart(node,node.textContent.length-1);r.setEnd(node,node.textContent.length);
  const view=bbox(hero), scale=Math.max(view.width/ORB_SOURCE.width,view.height/ORB_SOURCE.height);
  const left=view.x+(view.width-ORB_SOURCE.width*scale)/2, top=view.y+(view.height-ORB_SOURCE.height*scale)/2;
  const orb={x:left+ORB_CENTER.x*scale,y:top+ORB_CENTER.y*scale,radius:ORB_RADIUS*scale,source:ORB_SOURCE,origin:ORB_CENTER,scale,backgroundPosition:getComputedStyle(hero).backgroundPosition};
  const fields=el('.meg-auth-fields'), btn=card.querySelector('[type=submit]'),back=card.querySelector('.meg-auth-footer button');
  const btnInfo=button=>{const b=bbox(button),c=bbox(card);return {absolute:b,relativeCard:b.y-c.y,offsetTop:button.offsetTop}};
  return {orb,title:bbox(h),intro:bbox(el('.meg-login-intro')),glyph:bbox(r),span:bbox(span),lastChar:node.textContent.slice(-1),scrollWidth:span.scrollWidth,clientWidth:span.clientWidth,logo:bbox(el('.meg-login-logo')),
    card:bbox(card),features:[...document.querySelectorAll('.meg-auth-page .meg-login-feature')].map(bbox),button:btnInfo(btn),back:btnInfo(back),
    scroll:{cardHeight:card.clientHeight,cardScroll:card.scrollHeight,fieldsHeight:fields?.clientHeight??null,fieldsScroll:fields?.scrollHeight??null,fieldsOverflow:fields?getComputedStyle(fields).overflowY:null},
    error:bbox(el('.meg-auth-error'))};
 },{ORB_CENTER,ORB_RADIUS,ORB_SOURCE});
}
test.use({launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROME_PATH||undefined}});
for(const [w,h] of SIZES){
 test('Criar Conta contrato rigoroso '+w+'x'+h,async({browser})=>{
  const ctx=await browser.newContext({viewport:{width:w,height:h},reducedMotion:'reduce'}),page=await ctx.newPage(),fails=[];
  const check=(label,condition,values)=>{if(!condition)fails.push({label,values});};
  try{
   await page.goto(ROOT);await page.evaluate(()=>document.fonts.ready);mkdirSync(DIR,{recursive:true});
   const b=await measure(page);
   check('ponto final visível',b.lastChar==='.'&&b.glyph.right<=b.span.right-.25,{glyph:b.glyph,span:b.span});
   check('gradiente sem scroll',b.scrollWidth<=b.clientWidth+1,{scroll:b.scrollWidth,client:b.clientWidth});
   check('svg beneficios',await page.locator('.meg-auth-page .meg-login-feature svg').count()===3);
   check('escudo svg',await page.locator('.meg-auth-header svg').count()===1);
   check('erro não cria 100px vazio',b.error.height<=65,b.error.height);
   if(w<=1023)check('logo acima card',b.logo.bottom<b.card.y,{logo:b.logo,card:b.card});
   if(h>=700) {
    check('card sem rolagem interna',b.scroll.cardScroll<=b.scroll.cardHeight+1,b.scroll);
    check('voltar com 16px na borda',b.card.bottom-b.back.absolute.bottom>=15,{card:b.card,back:b.back});
   }
   if(h===600)check('só campos rolam',b.scroll.fieldsScroll>b.scroll.fieldsHeight+1&&['auto','scroll'].includes(b.scroll.fieldsOverflow),b.scroll);
   if(w===1920)check('texto/card 120px',b.card.x-Math.max(b.title.right,b.intro.right)>=120,b.card.x-b.intro.right);
   if(w>=1024){
    const rects=[['titulo',b.title],['intro',b.intro],...b.features.map((f,i)=>['beneficio'+i,f])];
    b.orbDistances=Object.fromEntries(rects.map(([label,r])=>[label,dist(b.orb,r)]));
    for(const [label,value] of Object.entries(b.orbDistances))check('orbe '+label+' >=16',value>=16,value);
   }else b.orbSkipped='Por design, orbe atrás do card; sem distância negativa.';
   if(w===2560)check('ultimo glifo/orbe >=40',b.orb.x-b.orb.radius-b.glyph.right>=40,b.orb.x-b.orb.radius-b.glyph.right);
   if(w===1366){const lines=await page.locator('.meg-login-feature').last().locator('div>span').evaluate(el=>el.getBoundingClientRect().height/parseFloat(getComputedStyle(el).lineHeight));check('Controle até duas linhas',lines<=2.2,lines);}
   await page.screenshot({path:DIR+'/rigor-'+w+'x'+h+'-normal.png',fullPage:true,animations:'disabled'});
   await page.getByRole('button',{name:'Continuar'}).click();
   await expect(page.getByRole('alert')).toContainText('Informe seu nome');
   const a=await measure(page),name=page.getByRole('textbox',{name:'Nome completo'});
   check('botão estável relativo card',Math.abs(a.button.relativeCard-b.button.relativeCard)<=1,{before:b.button,after:a.button});
   check('foco nome',await name.evaluate(el=>el===document.activeElement));
   check('aria-invalid',await name.getAttribute('aria-invalid')==='true');
   check('aria-describedby',Boolean(await name.getAttribute('aria-describedby')));
   if(h===600||w<=390){const nr=await name.boundingBox(),sc=await page.locator('.meg-auth-fields').boundingBox();if(sc&&nr)check('foco 16px abaixo scroll',nr.y-sc.y>=16,{field:nr,scroll:sc});}
   for(const [title,button] of [['Continuar',a.button],['Voltar',a.back]])
    check(title+' dentro viewport',button.absolute.y>=0&&button.absolute.bottom<=h,{button,viewport:h});
   await page.screenshot({path:DIR+'/rigor-'+w+'x'+h+'-erro.png',fullPage:true,animations:'disabled'});
   writeFileSync(DIR+'/rigor-'+w+'x'+h+'.json',JSON.stringify({before:b,after:a,fail:fails},null,2));
   console.log('RESULT '+w+'x'+h+' '+JSON.stringify({fail:fails,orbDistances:b.orbDistances,card:b.scroll}));
   expect(fails,'Falhas acumuladas '+w+'x'+h).toEqual([]);
  }finally{await ctx.close();}
 });
}