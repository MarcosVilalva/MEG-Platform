import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
const OUT='artifacts/meg-stage05-auth/login-diff',viewports=[[360,844],[390,844],[768,1024],[1365,600],[1366,768],[1920,1080],[2560,1440]];
test.use({launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROME_PATH||undefined}});
for(const [w,h] of viewports){
 test('LOGIN PIXEL-DIFF aprovado vs #627 '+w+'x'+h,async({browser})=>{
  const ctx=await browser.newContext({viewport:{width:w,height:h},reducedMotion:'reduce'});
  const before=await ctx.newPage(),after=await ctx.newPage();
  try{
   await before.goto('http://127.0.0.1:4174/web-evolution.html',{waitUntil:'networkidle'});
   await after.goto('http://127.0.0.1:4173/web-evolution.html',{waitUntil:'networkidle'});
   for(const page of [before,after]){await page.evaluate(()=>document.fonts.ready);await expect(page.getByRole('heading',{name:'Bem-vindo de volta.'})).toBeVisible();}
   const b=await before.screenshot({fullPage:true,animations:'disabled'});
   const a=await after.screenshot({fullPage:true,animations:'disabled'});
   mkdirSync(OUT,{recursive:true});
   writeFileSync(OUT+'/login-aprovado-'+w+'x'+h+'.png',b);
   writeFileSync(OUT+'/login-pr627-'+w+'x'+h+'.png',a);
   const result=await after.evaluate(async(x)=>{
    const img=async raw=>{
     const bin=atob(raw),arr=new Uint8Array(bin.length);
     for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);
     return createImageBitmap(new Blob([arr],{type:'image/png'}));
    };
    const [b,a]=await Promise.all([img(x.before),img(x.after)]);
    const c=document.createElement('canvas');c.width=b.width;c.height=b.height;
    const ctx=c.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(b,0,0);const first=ctx.getImageData(0,0,c.width,c.height);
    if(a.width!==b.width||a.height!==b.height)return {error:'dimensoes distintas',base:[b.width,b.height],actual:[a.width,a.height]};
    ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(a,0,0);
    const second=ctx.getImageData(0,0,c.width,c.height),out=ctx.createImageData(c.width,c.height);
    let changed=0,total=c.width*c.height;
    for(let i=0;i<first.data.length;i+=4){
      const different=first.data[i]!==second.data[i]||first.data[i+1]!==second.data[i+1]||first.data[i+2]!==second.data[i+2]||first.data[i+3]!==second.data[i+3];
      if(different){changed++;out.data.set([255,0,80,255],i);}
      else out.data.set([0,0,0,0],i);
    }
    ctx.putImageData(out,0,0);
    return {width:c.width,height:c.height,changed,total,percentage:100*changed/total,diff:c.toDataURL('image/png')};
   },{before:b.toString('base64'),after:a.toString('base64')});
   if(result.diff){writeFileSync(OUT+'/login-diff-'+w+'x'+h+'.png',Buffer.from(result.diff.split(',')[1],'base64'));delete result.diff;}
   writeFileSync(OUT+'/login-diff-'+w+'x'+h+'.json',JSON.stringify(result,null,2));
   console.log('LOGIN_DIFF_'+w+'x'+h+' '+JSON.stringify(result));
   expect(result.error).toBeUndefined();
   expect(result.percentage,'diferença pixel-a-pixel contra Login #626 aprovado').toBe(0);
  }finally{await ctx.close();}
 });
}