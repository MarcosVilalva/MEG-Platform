import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
const origin='http://127.0.0.1:4173/home-06-panorama.html';
const viewports=[
 {name:'desktop-1672',width:1672,height:941},
 {name:'desktop-1366',width:1366,height:768},
 {name:'tablet-1024',width:1024,height:768},
 {name:'tablet-768',width:768,height:1024},
 {name:'mobile-640',width:640,height:930},
 {name:'mobile-390',width:390,height:844},
 {name:'mobile-320',width:320,height:700}
];
const dir='artifacts/home-06-panorama';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
let failed=false;
try{
 for(const {name,width,height} of viewports){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin,{waitUntil:'domcontentloaded',timeout:30000});
  await page.locator('.pano-hero').waitFor({state:'visible',timeout:15000});
  await page.locator('.pano-stat').first().waitFor({state:'visible'});
  await page.waitForTimeout(900);
  const result=await page.evaluate(()=>{
   const root=document.querySelector('.pano-root');
   const graph=document.querySelector('.pano-flow');
   const hero=document.querySelector('.pano-hero');
   const charts=document.querySelectorAll('.pano-chart canvas').length;
   const panels=document.querySelectorAll('.pano-stat').length;
   const datagridViewports=[...document.querySelectorAll('.pano-grid .meg-datagrid__viewport')].map(v=>({height:v.getBoundingClientRect().height,rows:v.querySelectorAll('tbody tr, .meg-datagrid-card-row').length}));
   const rootR=root?.getBoundingClientRect();
   const chartR=graph?.getBoundingClientRect();
   const heroR=hero?.getBoundingClientRect();
   return {overflow:document.documentElement.scrollWidth-innerWidth,panels,charts,datagridViewports,
    heroWidth:heroR?.width,chartWidth:chartR?.width,rootWidth:rootR?.width,
    clip:Math.round(Math.max(0,(rootR?.right||0)-innerWidth))};
  });
  await page.screenshot({path:join(dir,name+'.png'),fullPage:true});
  await page.locator('.meg-main').evaluate((element)=>{element.scrollTop=element.scrollHeight});
  await page.waitForTimeout(250);
  await page.screenshot({path:join(dir,name+'-bottom.png')});
  await page.locator('.meg-main').evaluate((element)=>{element.scrollTop=0});
  const safe=result.overflow<=1&&result.clip<=1&&result.panels===4&&result.charts>=1&&result.heroWidth>0&&result.chartWidth>0&&result.datagridViewports.length===2&&result.datagridViewports.every(x=>x.height>=100&&x.rows>0)&&errors.length===0;
  console.log(name,JSON.stringify({...result,errors,pass:safe}));
  if(!safe)failed=true;
  if(name==='mobile-390'){
   await page.getByRole('button',{name:'Ocultar valores'}).click();
   const privacy=await page.locator('.pano-chart-placeholder').count()===1;
   console.log('privacy',privacy);
   if(!privacy)failed=true;
  }
  await page.close();
 }
}finally{await browser.close()}
if(failed)process.exitCode=1;
