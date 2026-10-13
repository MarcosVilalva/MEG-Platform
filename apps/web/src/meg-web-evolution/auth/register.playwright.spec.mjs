import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

// Coordenadas aproximadas medidas na imagem oficial de fundo WebP de 2048x1143.
// A posição na tela depende exclusivamente de background-size: cover e position: center.
const ORB_CENTER = { x: 1008, y: 542 };
const ORB_RADIUS = 20;
const ORB_SOURCE = { width: 2048, height: 1143 };
const FULL_VIEWPORTS = [[360,844],[390,844],[768,1024],[1365,600],[1366,768],[1920,1080],[2560,1440]];
const getBox = async locator => {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return { ...box, right: box.x + box.width, bottom: box.y + box.height };
};
const measureOrb = async page => page.locator('.meg-auth-page').evaluate((el, constants) => {
  const { ORB_CENTER, ORB_RADIUS, ORB_SOURCE } = constants;
  const bounds = el.getBoundingClientRect();
  const scale = Math.max(bounds.width / ORB_SOURCE.width, bounds.height / ORB_SOURCE.height);
  const imageWidth = ORB_SOURCE.width * scale;
  const imageHeight = ORB_SOURCE.height * scale;
  const left = bounds.left + (bounds.width - imageWidth) / 2;
  const top = bounds.top + (bounds.height - imageHeight) / 2;
  return {
    source: ORB_SOURCE, center: ORB_CENTER, radius: ORB_RADIUS,
    scale, backgroundPosition:'center center', backgroundSize:'cover',
    x: left + ORB_CENTER.x * scale, y: top + ORB_CENTER.y * scale,
    left: left + (ORB_CENTER.x - ORB_RADIUS) * scale
  };
}, { ORB_CENTER, ORB_RADIUS, ORB_SOURCE });

async function readTitleGeometry(page) {
  return page.locator('.meg-auth-page .meg-login-hero h2').evaluate(heading => {
    const span = heading.querySelector('span');
    const end = span?.lastChild;
    if (!end || end.nodeType !== Node.TEXT_NODE) throw new Error('Título sem texto do gradiente');
    const range = document.createRange();
    range.setStart(end, end.textContent.length-1);
    range.setEnd(end, end.textContent.length);
    const glyph = range.getBoundingClientRect(), bounds=span.getBoundingClientRect();
    const panel = document.querySelector('.meg-auth-card').getBoundingClientRect();
    const para = document.querySelector('.meg-login-intro').getBoundingClientRect();
    const toBox = r=>({x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom});
    return {
      title: heading.textContent, lastCharacter: end.textContent.slice(-1),
      glyph:toBox(glyph),span:toBox(bounds), panel:toBox(panel),paragraph:toBox(para),
      scrollWidth:span.scrollWidth,clientWidth:span.clientWidth,
      fontSize:getComputedStyle(span).fontSize,
      paddingRight:getComputedStyle(span).paddingRight
    };
  });
}

const ROOT = 'http://127.0.0.1:4173/web-evolution.html?auth=create-account';
const DIR = 'artifacts/meg-stage05-auth';
test.use({ launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROME_PATH || undefined } });
const sizes = [[360,844],[390,844],[768,1024],[1365,600],[1366,768],[1920,1080],[2560,1440]];
for (const [width,height] of sizes) {
  test(`Criar Conta ${width}x${height}: captura integral e erro`, async ({ browser }) => {
    const context = await browser.newContext({ viewport:{width,height}, reducedMotion:'reduce' });
    const page=await context.newPage();
    await page.goto(ROOT);
    await expect(page.getByRole('heading',{name:'Criar conta'})).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    mkdirSync(DIR,{recursive:true});
    await page.screenshot({path:`${DIR}/criar-conta-${width}x${height}.png`,fullPage:true,animations:'disabled'});
    await page.getByRole('button',{name:'Continuar'}).click();
    await expect(page.getByRole('alert')).toContainText('Informe seu nome');
    await page.screenshot({path:`${DIR}/criar-conta-${width}x${height}-erro.png`,fullPage:true,animations:'disabled'});
    for (const button of await page.getByRole('button').all()) {
      const bounds=await button.boundingBox();
      if (bounds) expect(bounds.height).toBeGreaterThanOrEqual(44);
    }
    await context.close();
  });
}
test('Criar Conta mantém 202 PENDING_APPROVAL sem inventar confirmação imediata',async({page})=>{
  let requestBody;
  await page.route('**/auth/register',async route=>{
    requestBody=route.request().postDataJSON();
    await route.fulfill({status:202,contentType:'application/json',body:JSON.stringify({status:'PENDING_APPROVAL',message:'Solicitação enviada ao administrador.',administratorEmail:'admin@exemplo.com'})});
  });
  await page.goto(ROOT);
  await page.getByRole('textbox',{name:'Nome completo'}).fill('Pessoa Exemplo');
  await page.getByRole('textbox',{name:'E-mail'}).fill('usuario@exemplo.com');
  await page.getByRole('textbox',{name:'Telefone'}).fill('(18) 99999-9999');
  await page.getByLabel('Senha',{exact:true}).fill('SenhaTeste123!');
  await page.getByLabel('Confirmar senha').fill('SenhaTeste123!');
  await page.getByRole('button',{name:'Continuar'}).click();
  await expect(page.getByText('Aguardando aprovação')).toBeVisible();
  expect(requestBody.phone).toBe('18999999999');
  expect(requestBody.accountType).toBe('REQUEST_ACCESS');
});
test('Criar meu espaço MEG usa contrato existente de cadastro',async({page})=>{
  let body;
  await page.route('**/auth/register',async route=>{
    body=route.request().postDataJSON();
    await route.fulfill({status:202,contentType:'application/json',body:JSON.stringify({status:'PENDING_APPROVAL',message:'Aguardando aprovação',administratorEmail:'admin@exemplo.com'})});
  });
  await page.goto(ROOT);
  await page.getByRole('radio',{name:'Criar meu espaço MEG'}).check();
  await page.getByRole('textbox',{name:'Nome completo'}).fill('Pessoa Exemplo');
  await page.getByRole('textbox',{name:'E-mail'}).fill('usuario@exemplo.com');
  await page.getByRole('textbox',{name:'Telefone'}).fill('(18) 99999-9999');
  await page.getByRole('textbox',{name:'Nome do espaço MEG'}).fill('Espaço Exemplo');
  await page.getByLabel('Senha',{exact:true}).fill('SenhaTeste123!');
  await page.getByLabel('Confirmar senha').fill('SenhaTeste123!');
  await page.getByRole('button',{name:'Continuar'}).click();
  expect(body.accountType).toBe('CREATE_WORKSPACE');
  expect(body.workspaceName).toBe('Espaço Exemplo');
});
test('Criar Conta trata erro de API e preserva senha fora de armazenamento',async({page})=>{
  await page.route('**/auth/register',route=>route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({error:'EMAIL_ALREADY_REGISTERED'})}));
  await page.goto(ROOT);
  await page.getByRole('textbox',{name:'Nome completo'}).fill('Pessoa Exemplo');
  await page.getByRole('textbox',{name:'E-mail'}).fill('usuario@exemplo.com');
  await page.getByRole('textbox',{name:'Telefone'}).fill('(18) 99999-9999');
  await page.getByLabel('Senha',{exact:true}).fill('SenhaTeste123!');
  await page.getByLabel('Confirmar senha').fill('SenhaTeste123!');
  await page.getByRole('button',{name:'Continuar'}).click();
  await expect(page.getByRole('alert')).toContainText('e-mail já possui cadastro');
  expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toContain('SenhaTeste123!');
});
test('Criar Conta usa labels, foco visível e sem violações WCAG AA',async({page})=>{
  await page.goto(ROOT);
  await page.getByRole('textbox',{name:'Nome completo'}).focus();
  expect(await page.getByRole('textbox',{name:'Nome completo'}).evaluate(el=>el.matches(':focus-visible'))).toBe(true);
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(result.violations).toEqual([]);
});


for (const [width, height] of FULL_VIEWPORTS) {
  test(`Registro visual e acessível ${width}x${height}`, async ({ browser }) => {
    const context = await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
    const page=await context.newPage();
    const problems = [];
    const check = (name, truth) => { if (!truth) problems.push(name); };
    const target = `${DIR}/registro-visual-${width}x${height}`;
    try {
      mkdirSync(DIR,{recursive:true});
      await page.goto(ROOT);
      await page.evaluate(()=>document.fonts.ready);
      const logo=await getBox(page.locator('.meg-login-logo'));
      const panel=await getBox(page.locator('.meg-auth-card'));
      const copy=await getBox(page.locator('.meg-login-hero-copy'));
      const features=await getBox(page.locator('.meg-login-features'));
      const title=await readTitleGeometry(page);
      const orb=await measureOrb(page);
      const gap=orb.left-title.glyph.right;
      const button=page.getByRole('button',{name:'Continuar'});
      const beforeOffset=await button.evaluate(el=>el.offsetTop);
      const before=await getBox(button);
      const scrollState=await page.locator('.meg-auth-card').evaluate(el=>({
        clientHeight:el.clientHeight,scrollHeight:el.scrollHeight,overflow:getComputedStyle(el).overflowY
      }));
      const data={width,height,logo,panel,copy,features,title,orb,gap,scrollState,beforeButton:before};
      writeFileSync(`${target}.json`,JSON.stringify(data,null,2));
      await page.screenshot({path:`${target}.png`,fullPage:true,animations:'disabled'});
      check('O texto interno MEG EVOLUTION ainda aparece', (await page.getByText(/meg evolution/i).count())===0);
      check('O texto do título não termina com ponto',title.title.trim().endsWith('.')&&title.lastCharacter==='.');
      check('Ponto final fora da área de pintura',title.glyph.width>0 && title.glyph.right<=title.span.right-.25);
      check('Span de gradiente com overflow horizontal',title.scrollWidth<=title.clientWidth+1);
      check('Rolagem horizontal',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      if(width<=1023){
        check('Logo não está antes do card',logo.bottom<panel.y);
        check('Card não está antes do título',panel.bottom<copy.y);
        check('Benefícios não estão após o título',copy.bottom<features.y);
        check('Card cortado à esquerda/direita',panel.x>=0 && panel.right<=width+1);
      }
      if(width===1365&&height===600){
        check('Card não usa rolagem interna',scrollState.scrollHeight>scrollState.clientHeight+1 && ['auto','scroll'].includes(scrollState.overflow));
        // Em 1365x600 o botão pode começar abaixo do viewport interno. Deve ser alcançável sem corte.
        await button.scrollIntoViewIfNeeded();
        const scrolledButton=await getBox(button);
        const visiblePanel=await getBox(page.locator('.meg-auth-card'));
        check('Botão não pode ser alcançado pela rolagem interna',scrolledButton.bottom<=visiblePanel.bottom+1 && scrolledButton.y>=visiblePanel.y-1);
        await page.screenshot({path:`${target}-card-bottom.png`,fullPage:true,animations:'disabled'});
      }
      if(width===1920) check('Distância título/parágrafo ao card inferior a 120px',panel.x-Math.max(title.glyph.right,title.paragraph.right)>=120);
      if(width===2560) check('Distância até orbe menor que 40px',gap>=40);
      if(width===1920||width===2560){
        const minX=Math.max(0,title.glyph.x-170), minY=Math.max(0,title.glyph.y-45);
        const endX=Math.min(width, width===2560?orb.x+105:panel.x+35);
        const endY=Math.min(height,title.glyph.bottom+110);
        await page.screenshot({path:`${DIR}/registro-recorte-titulo-orbe-${width}x${height}.png`,
          clip:{x:minX,y:minY,width:Math.max(1,endX-minX),height:Math.max(1,endY-minY)},animations:'disabled'});
      }
      await button.click();
      await expect(page.getByRole('alert')).toContainText('Informe seu nome');
      const input=page.getByRole('textbox',{name:'Nome completo'});
      check('Campo inválido sem aria-invalid',await input.getAttribute('aria-invalid')==='true');
      const described=await input.getAttribute('aria-describedby');
      check('Campo inválido sem aria-describedby',Boolean(described));
      if(described) check('Descrição sem mensagem',await page.locator('#'+described).textContent()=== 'Informe seu nome com 2 a 120 caracteres.');
      check('Foco não vai para primeiro campo inválido',await input.evaluate(el=>document.activeElement===el));
      const after=await getBox(button);
      const afterOffset=await button.evaluate(el=>el.offsetTop);
      // A coordenada de viewport pode mudar porque o foco rola o card, não porque o layout pulou.
      check('Botão mudou de posição no fluxo do formulário',Math.abs(afterOffset-beforeOffset)<=1);
      await page.screenshot({path:`${target}-erro.png`,fullPage:true,animations:'disabled'});
      writeFileSync(`${target}-erro.json`,JSON.stringify({problems,beforeButton:before,afterButton:after,beforeOffset,afterOffset,description:described},null,2));
      expect(problems,`Erros de viewport ${width}x${height}`).toEqual([]);
    } finally { await context.close(); }
  });
}
test('Login mantém identidade e não mostra texto interno',async({page})=>{
  await page.goto('http://127.0.0.1:4173/web-evolution.html');
  await page.evaluate(()=>document.fonts.ready);
  await expect(page.getByRole('heading',{name:'Bem-vindo de volta.'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Entrar no MEG'})).toBeVisible();
  await expect(page.getByText(/meg evolution/i)).toHaveCount(0);
  await expect(page.locator('.meg-login-logo')).toHaveAttribute('alt','MEG Finanças');
  await expect(page.locator('.meg-login-hero h1')).toContainText('Sua vida financeira,');
});
