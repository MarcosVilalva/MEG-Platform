import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
test.use({launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROME_PATH||undefined}});
const PAGE='http://127.0.0.1:4173/web-evolution.html?auth=create-account';
const EVIDENCE='artifacts/meg-stage05-auth';
const ALL=[[360,844],[390,844],[768,1024],[1365,600],[1366,768],[1920,1080],[2560,1440]];
async function snapshot(page) {
 return page.evaluate(()=>{
  const r=el=>{const b=el.getBoundingClientRect();return {x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width,height:b.height}};
  const card=document.querySelector('.meg-auth-card');
  const fields=document.querySelector('.meg-auth-fields');
  const error=document.querySelector('.meg-auth-error');
  const continueButton=document.querySelector('.meg-auth-form button[type=submit]');
  const back=document.querySelector('.meg-auth-footer button');
  const title=document.querySelector('.meg-login-hero h2 span');
  const first=document.querySelector('.meg-auth-fields .meg-login-input-block');
  const confirm=document.querySelector('input[name=confirmPassword]');
  const note=document.querySelector('.meg-auth-note');
  const rects={card:r(card),fields:r(fields),error:r(error),button:r(continueButton),back:r(back),first:r(first),confirm:r(confirm),note:r(note)};
  return {rects,
   cardHeight:card.clientHeight,cardScroll:card.scrollHeight,
   fieldsHeight:fields.clientHeight,fieldsScroll:fields.scrollHeight,
   cardMaxHeight:getComputedStyle(card).maxHeight,
   fieldsOverflow:getComputedStyle(fields).overflowY,
   footerBottomGap:rects.card.bottom-rects.back.bottom,
   gapFieldsError:rects.error.y-rects.fields.bottom,
   gapErrorButton:rects.button.y-rects.error.bottom,
   buttonOffsetTop:continueButton.offsetTop,
   errorText:error.textContent,
   titleOverflow:title.scrollWidth-title.clientWidth};
 });
}
function overlap(a,b) {return Math.max(0,Math.min(a.right,b.right)-Math.max(a.x,b.x)) * Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y));}
for(const [width,height] of ALL){
 test('Critérios autônomos '+width+'x'+height,async({browser})=>{
  const ctx=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
  const page=await ctx.newPage();const fail=[];
  const check=(name,pass,actual)=>{if(!pass)fail.push({name,actual});};
  try {
   mkdirSync(EVIDENCE,{recursive:true});
   await page.goto(PAGE);await page.evaluate(()=>document.fonts.ready);
   const before=await snapshot(page);
   await page.screenshot({path:EVIDENCE+'/final-'+width+'x'+height+'-normal.png',fullPage:true,animations:'disabled'});
   await page.getByRole('button',{name:'Continuar'}).click();
   await expect(page.getByRole('alert')).toContainText('Informe seu nome');
   const after=await snapshot(page);
   await page.screenshot({path:EVIDENCE+'/final-'+width+'x'+height+'-erro.png',fullPage:true,animations:'disabled'});
   for(const [state,data] of [['normal',before],['erro',after]]) {
    check(state+': folga Voltar/card >=16px',data.footerBottomGap>=16,{gap:data.footerBottomGap});
    check(state+': card sem rolagem interna',data.cardScroll<=data.cardHeight+1,{client:data.cardHeight,scroll:data.cardScroll});
    check(state+': campos sem rolagem interna (todos os viewports)',data.fieldsScroll<=data.fieldsHeight+1,{client:data.fieldsHeight,scroll:data.fieldsScroll,viewport:[width,height]});
    check(state+': campos sem overflow:auto',!['auto','scroll'].includes(data.fieldsOverflow),data.fieldsOverflow);
    check(state+': erro não cobre campos',overlap(data.rects.error,data.rects.fields)===0,overlap(data.rects.error,data.rects.fields));
    check(state+': erro não cobre botão',overlap(data.rects.error,data.rects.button)===0,overlap(data.rects.error,data.rects.button));
    check(state+': folgas de 8px',data.gapFieldsError>=8&&data.gapErrorButton>=8,{fields:data.gapFieldsError,button:data.gapErrorButton});
    check(state+': campos alinhados à mensagem e botão',Math.abs(data.rects.first.x-data.rects.error.x)<=1 && Math.abs(data.rects.first.x-data.rects.button.x)<=1 && Math.abs(data.rects.first.width-data.rects.error.width)<=1&&Math.abs(data.rects.first.width-data.rects.button.width)<=1,{first:data.rects.first,error:data.rects.error,button:data.rects.button});
    check(state+': título sem overflow',data.titleOverflow<=1,data.titleOverflow);
    if(width<768) check(state+': voltar ≥16px em largura mobile',data.footerBottomGap>=16,data.footerBottomGap);
    if(width<1024){
      check(state+': confirmar e nota inteiros',data.rects.confirm.y>=data.rects.fields.y && data.rects.confirm.bottom<=data.rects.fields.bottom+1 && data.rects.note.bottom<=data.rects.fields.bottom+1, {confirm:data.rects.confirm,note:data.rects.note,fields:data.rects.fields});
      check(state+': card sem max-height de viewport',data.cardMaxHeight==='none',data.cardMaxHeight);
    }
  }
   check('OffsetTop estável nos dois estados',before.buttonOffsetTop===after.buttonOffsetTop,{before:before.buttonOffsetTop,after:after.buttonOffsetTop});
   writeFileSync(EVIDENCE+'/final-'+width+'x'+height+'.json',JSON.stringify({viewport:[width,height],before,after,failures:fail},null,2));
   console.log('AUTONOMOUS_'+width+'x'+height+' '+JSON.stringify({failures:fail,normal:before.footerBottomGap,error:after.footerBottomGap}));
   expect(fail,'Todas as falhas em '+width+'x'+height).toEqual([]);
  }finally{await ctx.close();}
 });
}
