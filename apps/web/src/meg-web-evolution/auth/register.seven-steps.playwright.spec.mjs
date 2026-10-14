import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

test.use({ launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROME_PATH || undefined } });
const ROOT='http://127.0.0.1:4173/web-evolution.html?auth=create-account';
const OUTPUT='artifacts/meg-stage05-auth';
const SIZES=[[360,844],[390,844],[768,1024],[1365,600],[1366,768],[1920,1080],[2560,1440]];
const bounding=async locator=>{
 const b=await locator.boundingBox();
 if(!b) throw new Error('Bounding box ausente: '+locator.toString());
 return {x:b.x,y:b.y,width:b.width,height:b.height,right:b.x+b.width,bottom:b.y+b.height};
};

async function audit(page) {
 const card=page.locator('.meg-auth-card');
 const form=page.locator('.meg-auth-form');
 const fields=page.locator('.meg-auth-fields');
 const first=page.locator('.meg-auth-fields .meg-login-input-block').first();
 const note=page.locator('.meg-auth-note');
 const confirm=page.getByLabel('Confirmar senha');
 const message=page.locator('.meg-auth-error');
 const button=form.locator('button[type=submit]');
 const [cardBox,formBox,fieldsBox,firstBox,noteBox,confirmBox,messageBox,buttonBox]=await Promise.all(
  [card,form,fields,first,note,confirm,message,button].map(bounding));
 const info=await page.evaluate(()=>{
  const r=q=>document.querySelector(q);
  const a=r('.meg-auth-card'),b=r('.meg-auth-fields'),c=r('.meg-auth-form button[type=submit]');
  const cs=getComputedStyle(a),fs=getComputedStyle(b);
  return {
   cardMaxHeight:cs.maxHeight,cardMinHeight:cs.minHeight,cardHeight:cs.height,cardOverflow:cs.overflowY,
   cardPaddingLeft:parseFloat(cs.paddingLeft),cardPaddingRight:parseFloat(cs.paddingRight),
   fieldsScrollHeight:b.scrollHeight,fieldsClientHeight:b.clientHeight,fieldsOverflow:fs.overflowY,
   fieldsMaxHeight:fs.maxHeight,fieldsHeight:fs.height,formGap:getComputedStyle(r('.meg-auth-form')).gap,
   buttonOffsetTop:c.offsetTop,buttonRelativeToForm:c.getBoundingClientRect().y-r('.meg-auth-form').getBoundingClientRect().y
  };
 });
 return {card:cardBox,form:formBox,fields:fieldsBox,first: firstBox, note:noteBox,
   confirm:confirmBox,error:messageBox,button:buttonBox,...info};
}
function inspect(data,w,h) {
 const fail=[];
 const check=(name,passes,actual)=>{if(!passes)fail.push({name,actual});};
 const eq=(x,y)=>Math.abs(x-y)<=1;
 const left=data.first.x,right=data.first.right;
 check('Botão alinhado à esquerda (±1px)',eq(data.button.x,left),{button:data.button.x,field:left});
 check('Botão alinhado à direita (±1px)',eq(data.button.right,right),{button:data.button.right,field:right});
 check('Erro alinhado à esquerda (±1px)',eq(data.error.x,left),{error:data.error.x,field:left});
 check('Erro alinhado à direita (±1px)',eq(data.error.right,right),{error:data.error.right,field:right});
 check('Respiro campos → erro ≥8px',data.error.y-data.fields.bottom>=8,{gap:data.error.y-data.fields.bottom});
 check('Respiro erro → Continuar ≥8px',data.button.y-data.error.bottom>=8,{gap:data.button.y-data.error.bottom});
 if(w<1024) {
  check('Card sem max-height de viewport',data.cardMaxHeight==='none',data.cardMaxHeight);
  check('Campos sem rolagem interna',data.fieldsScrollHeight<=data.fieldsClientHeight+1,
    {client:data.fieldsClientHeight,scroll:data.fieldsScrollHeight});
  check('Campos não devem usar overflow:auto',data.fieldsOverflow!=='auto'&&data.fieldsOverflow!=='scroll',data.fieldsOverflow);
  check('Confirmar senha inteiro',data.confirm.y>=data.fields.y-1&&data.confirm.bottom<=data.fields.bottom+1,
    {confirm:data.confirm,fields:data.fields});
  check('Nota inteira',data.note.y>=data.fields.y-1&&data.note.bottom<=data.fields.bottom+1,
    {note:data.note,fields:data.fields});
  check('Card sem corte do conteúdo',data.card.bottom>=data.button.bottom&&data.card.bottom>=data.note.bottom,
    {card:data.card,button:data.button,note:data.note});
  check('Área útil do card (largura)',data.first.width>=data.card.width-data.cardPaddingLeft-data.cardPaddingRight-12,
    {card:data.card.width,paddingLeft:data.cardPaddingLeft,paddingRight:data.cardPaddingRight,first:data.first.width});
 } else if(w===1365&&h===600) {
  check('Campos inteiros sem rolagem própria',data.fieldsScrollHeight<=data.fieldsClientHeight+1&&!['auto','scroll'].includes(data.fieldsOverflow),
   {client:data.fieldsClientHeight,scroll:data.fieldsScrollHeight,overflow:data.fieldsOverflow});
  check('Card sem max-height',data.cardMaxHeight==='none'&&data.cardOverflow==='visible',
    {maxHeight:data.cardMaxHeight,overflow:data.cardOverflow});
 }
 return fail;
}
for(const [width,height] of SIZES) {
 test('PR627 sete passos '+width+'x'+height,async({browser})=>{
  const ctx=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
  const page=await ctx.newPage();const errors=[];
  try {
   mkdirSync(OUTPUT,{recursive:true});
   await page.goto(ROOT);await page.evaluate(()=>document.fonts.ready);
   const initial=await audit(page);
   errors.push(...inspect(initial,width,height));
   if(width===1365&&height===600) {
     const scroll=await page.evaluate(()=>({full:document.scrollingElement.scrollHeight,viewport:innerHeight}));
     if(scroll.full<=scroll.viewport+1)errors.push({name:'Página não rola no desktop baixo',scroll});
   }
   await page.screenshot({path:OUTPUT+'/sete-passos-'+width+'x'+height+'-normal.png',fullPage:true,animations:'disabled'});
   await page.getByRole('button',{name:'Continuar'}).click();
   await expect(page.getByRole('alert')).toContainText('Informe seu nome');
   const after=await audit(page);
   errors.push(...inspect(after,width,height).map(e=>({...e,state:'erro'})));
   if(width===1365&&height===600) {
     for(const [label,loc] of [['Continuar',page.getByRole('button',{name:'Continuar'})],
       ['Voltar',page.getByRole('button',{name:'Voltar ao login'}).last()]]){
       await loc.scrollIntoViewIfNeeded();
       const rect=await loc.boundingBox();
       if(!rect||rect.y<0||rect.y+rect.height>height+1)
         errors.push({name:label+' não acessível pela rolagem da página',rect});
     }
   }
   if(Math.abs(initial.buttonOffsetTop-after.buttonOffsetTop)>0)errors.push({name:'offsetTop do botão mudou entre normal e erro',
     before:initial.buttonOffsetTop,after:after.buttonOffsetTop});
   await page.screenshot({path:OUTPUT+'/sete-passos-'+width+'x'+height+'-erro.png',fullPage:true,animations:'disabled'});
   writeFileSync(OUTPUT+'/sete-passos-'+width+'x'+height+'.json',JSON.stringify({width,height,before:initial,after,failures:errors},null,2));
   console.log('SEVEN_STEPS '+width+'x'+height+' '+JSON.stringify({failures:errors,pre:{fieldsHeight:initial.fieldsClientHeight,fieldsScroll:initial.fieldsScrollHeight,buttonX:initial.button.x,fieldX:initial.first.x,fieldToError:initial.error.y-initial.fields.bottom,errorToButton:initial.button.y-initial.error.bottom},post:{fieldsHeight:after.fieldsClientHeight,fieldsScroll:after.fieldsScrollHeight,buttonX:after.button.x,fieldX:after.first.x,fieldToError:after.error.y-after.fields.bottom,errorToButton:after.button.y-after.error.bottom}}));
   expect(errors,'Falhas acumuladas de '+width+'x'+height).toEqual([]);
  } finally {await ctx.close();}
 });
}
