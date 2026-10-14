import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
test.use({launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROME_PATH||undefined}});
const DIR='artifacts/meg-stage05-auth/register-baseline-1365';
const sizes=[[360,844],[390,844],[768,1024],[1365,600],[1366,768],[1920,1080],[2560,1440]];
async function getGeometry(page){return page.evaluate(()=>{
 const b=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
 const card=document.querySelector('.meg-auth-card'),fields=document.querySelector('.meg-auth-fields'),button=document.querySelector('.meg-auth-form button[type=submit]'),back=document.querySelector('.meg-auth-footer button');
 return{card:b(card),fields:b(fields),button:b(button),back:b(back),cardClient:card.clientHeight,cardScroll:card.scrollHeight,fieldsClient:fields.clientHeight,fieldsScroll:fields.scrollHeight,cardMaxHeight:getComputedStyle(card).maxHeight,cardOverflow:getComputedStyle(card).overflowY,fieldsOverflow:getComputedStyle(fields).overflowY,buttonOffsetTop:button.offsetTop,documentHeight:document.scrollingElement.scrollHeight,viewportHeight:innerHeight};});
}
async function compare(page,a,b){return page.evaluate(async({a,b})=>{
 const load=async x=>{const t=atob(x),v=new Uint8Array(t.length);for(let i=0;i<t.length;i++)v[i]=t.charCodeAt(i);return createImageBitmap(new Blob([v],{type:'image/png'}));};
 const [p,q]=await Promise.all([load(a),load(b)]);
 if(p.width!==q.width||p.height!==q.height)return{sameDimensions:false,before:[p.width,p.height],after:[q.width,q.height]};
 const c=document.createElement('canvas');c.width=p.width;c.height=p.height;const ctx=c.getContext('2d',{willReadFrequently:true});
 ctx.drawImage(p,0,0);const x=ctx.getImageData(0,0,c.width,c.height).data;ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(q,0,0);const y=ctx.getImageData(0,0,c.width,c.height).data;
 let changed=0;for(let i=0;i<x.length;i+=4)if(x[i]!==y[i]||x[i+1]!==y[i+1]||x[i+2]!==y[i+2]||x[i+3]!==y[i+3])changed++;
 return{sameDimensions:true,changed,total:c.width*c.height,percent:100*changed/(c.width*c.height)};
 },{a:a.toString('base64'),b:b.toString('base64')});}
for(const[w,h]of sizes)test('Cadastro pixel-diff 1365 baseline '+w+'x'+h,async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:w,height:h},reducedMotion:'reduce'}),old=await ctx.newPage(),now=await ctx.newPage(),data={viewport:[w,h],states:{}};
 try{mkdirSync(DIR,{recursive:true});
 await old.goto('http://127.0.0.1:4175/web-evolution.html?auth=create-account',{waitUntil:'networkidle'});
 await now.goto('http://127.0.0.1:4173/web-evolution.html?auth=create-account',{waitUntil:'networkidle'});
 for(const p of[old,now])await p.evaluate(()=>document.fonts.ready);
 for(const state of['normal','erro']){
   if(state==='erro')for(const p of[old,now]){await p.getByRole('button',{name:'Continuar'}).click();await expect(p.getByRole('alert')).toContainText('Informe seu nome');}
   const a=await old.screenshot({fullPage:true,animations:'disabled'}),b=await now.screenshot({fullPage:true,animations:'disabled'}),diff=await compare(now,a,b);
   data.states[state]={diff,before:await getGeometry(old),after:await getGeometry(now)};
   if(w===1365){writeFileSync(DIR+'/cadastro-1365x600-'+state+'-antes.png',a);writeFileSync(DIR+'/cadastro-1365x600-'+state+'-depois.png',b);}
   else{expect(diff.sameDimensions).toBe(true);expect(diff.percent,'Mudança em viewport protegido '+w+'x'+h+' '+state).toBe(0);}
   console.log('CADASTRO_DIFF '+w+'x'+h+' '+state+' '+JSON.stringify(diff));
 }
 writeFileSync(DIR+'/cadastro-'+w+'x'+h+'.json',JSON.stringify(data,null,2));
 }finally{await ctx.close();}
});