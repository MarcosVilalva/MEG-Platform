import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
test.use({launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROME_PATH||undefined}});
const OUT='artifacts/meg-stage05-auth/login-evidencias';
const sizes=[[360,844],[390,844],[768,1024],[1365,600],[1366,768],[1920,1080],[2560,1440]];
const targets=[{key:'aprovado',url:'http://127.0.0.1:4174/web-evolution.html'}, {key:'pr627',url:'http://127.0.0.1:4173/web-evolution.html'}];
const overlap=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y));
async function geometry(page){return page.evaluate(()=>{
 const q=s=>document.querySelector(s),box=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
 const root=q('.meg-login'),panel=q('.meg-login-panel'),form=q('.meg-login-form'),message=q('.meg-login-message'),submit=form.querySelector('button[type=submit]');
 const hero=root.getBoundingClientRect(),w=2048,h=1143,scale=Math.max(hero.width/w,hero.height/h),left=hero.x+(hero.width-w*scale)/2,top=hero.y+(hero.height-h*scale)/2;
 return {screen:'login',panel:box(panel),form:box(form),fields:[...form.querySelectorAll('.meg-login-input-block')].map(box),
  message:box(message),messageText:message.textContent.trim(),messageRole:message.getAttribute('role'),
  button:box(submit),buttonOffsetTop:submit.offsetTop,
  benefits:[...root.querySelectorAll('.meg-login-feature')].map(el=>{const icon=el.querySelector('.meg-login-feature-icon'),content=el.querySelector('div');return{card:box(el),icon:box(icon),content:box(content)};}),
  orb:{x:left+1008*scale,y:top+542*scale,radius:20*scale,scale,source:{width:2048,height:1143,x:1008,y:542,radius:20}},
  intro:box(q('.meg-login-intro')),heroTitle:box(q('.meg-login-hero h1'))};
});}
for(const[width,height]of sizes){
 test('Login: evidencias identificadas '+width+'x'+height,async({browser})=>{
  const ctx=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),data={screen:'login',viewport:{width,height},versions:{}},errors=[];
  try{mkdirSync(OUT,{recursive:true});
   for(const target of targets){
    const page=await ctx.newPage();
    try{await page.goto(target.url,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
     const before=await geometry(page);
     await page.getByRole('button',{name:'Entrar no MEG'}).click();
     await expect(page.getByRole('alert')).toContainText('Digite um e-mail válido.');
     const after=await geometry(page);
     data.versions[target.key]={normal:before,erro:after};
     if(before.buttonOffsetTop!==after.buttonOffsetTop)errors.push({version:target.key,type:'buttonOffsetTop changed',before:before.buttonOffsetTop,after:after.buttonOffsetTop});
     for(const field of after.fields)if(overlap(field,after.message)>0)errors.push({version:target.key,type:'error overlaps input'});
     if(overlap(after.message,after.button)>0)errors.push({version:target.key,type:'error overlaps button'});
     for(const[i,f]of after.benefits.entries())if(f.icon.right>f.content.x+1)errors.push({version:target.key,type:'benefit icon not left',index:i});
     if(width===1365||width===1366)await page.screenshot({path:OUT+'/login-'+target.key+'-'+width+'x'+height+'-erro.png',fullPage:true,animations:'disabled'});
    }finally{await page.close();}
   }
   data.failures=errors;
   writeFileSync(OUT+'/login-metricas-'+width+'x'+height+'.json',JSON.stringify(data,null,2));
   console.log('LOGIN_EVIDENCE '+width+'x'+height+' '+JSON.stringify({errors,offsets:Object.fromEntries(Object.entries(data.versions).map(([k,v])=>[k,[v.normal.buttonOffsetTop,v.erro.buttonOffsetTop]])),featureHeights:data.versions.aprovado.normal.benefits.map(x=>x.card.height)}));
   expect(errors,'Invariantes do Login '+width+'x'+height).toEqual([]);
  }finally{await ctx.close();}
 });
}