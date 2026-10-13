import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

// Orbe: coordenadas originais do WebP 2048×1143, já usadas no teste aprovado.
const ORB_CENTER = { x: 1008, y: 542 };
const ORB_RADIUS = 20;
const ORB_SOURCE = { width: 2048, height: 1143 };
const ROOT = 'http://127.0.0.1:4173/web-evolution.html';
const EVIDENCE = 'artifacts/meg-web-stage05-login';
test.use({ launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROME_PATH || undefined } });
const viewports = [
  { name: 'desktop-1920x1080', width: 1920, height: 1080, scale: 1 },
  { name: 'desktop-2560x1440', width: 2560, height: 1440, scale: 1 },
  { name: 'desktop-1366x768', width: 1366, height: 768, scale: 1 },
  { name: 'low-1365x600', width: 1365, height: 600, scale: 1 },
  { name: 'mobile-360x844', width: 360, height: 844, scale: 1 },
  { name: 'mobile-390x844', width: 390, height: 844, scale: 1 },
  { name: 'tablet-768x1024', width: 768, height: 1024, scale: 1 },
  { name: 'hidpi-1366x768-2x', width: 1366, height: 768, scale: 2 },
];

async function prepare(page) {
  await page.goto(ROOT);
  await expect(page.getByRole('heading', { name: 'Bem-vindo de volta.' })).toBeVisible();
}

for (const viewport of viewports) {
  test(`${viewport.name}: Login sem sobreposição horizontal, screenshot e foco`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: viewport.scale, reducedMotion: 'reduce' });
    const page = await context.newPage();
    try {
      mkdirSync(EVIDENCE, { recursive: true });
      if (['desktop-2560x1440', 'desktop-1366x768', 'low-1365x600'].includes(viewport.name)) {
        try {
          await page.goto('https://meg-web-stage05-login-pr626.onrender.com/web-evolution.html?v=2989767125838a0daad4f989e764606ebc183cff', { waitUntil: 'domcontentloaded', timeout: 15000 });
          await expect(page.getByRole('heading', { name: 'Bem-vindo de volta.' })).toBeVisible({ timeout: 6000 });
          await page.evaluate(() => document.fonts.ready);
          await page.screenshot({ path: `${EVIDENCE}/antes-${viewport.name}.png`, fullPage: true, animations: 'disabled' });
        } catch (error) {
          console.warn('COMPARACAO_ANTES_INDISPONIVEL', viewport.name, String(error));
        }
      }
      await prepare(page);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.getByText(/meg evolution/i)).toHaveCount(0);
      const headingTitle = page.locator('.meg-login-hero h1');
      await expect(headingTitle).toContainText(/com clareza para decidir\.$/);
      const geometry = await headingTitle.evaluate(heading => {
        const span = heading.querySelector('span');
        const lastText = span.lastChild;
        const label = span.textContent;
        if (!lastText || lastText.nodeType !== Node.TEXT_NODE || !label.endsWith('.')) {
          throw new Error('O último caractere do título precisa ser um ponto final.');
        }
        const glyph = document.createRange();
        glyph.setStart(lastText, lastText.textContent.length - 1);
        glyph.setEnd(lastText, lastText.textContent.length);
        const last = glyph.getBoundingClientRect();
        const b = span.getBoundingClientRect();
        const h = heading.getBoundingClientRect();
        const rect = element => { const r = element.getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height, right:r.right, bottom:r.bottom }; };
        return { text: heading.textContent, lastGlyph: { x:last.x,y:last.y,width:last.width,height:last.height,right:last.right },
          span: rect(span), heading:rect(heading), font:getComputedStyle(span).fontSize,
          spanScrollWidth:span.scrollWidth, spanClientWidth:span.clientWidth,
          paddingRight:getComputedStyle(span).paddingRight };
      });
      expect(geometry.text.trim().endsWith('.'), 'título termina com ponto final').toBe(true);
      expect(geometry.lastGlyph.width, 'último glifo tem largura real').toBeGreaterThan(0);
      expect(geometry.lastGlyph.right, 'ponto não sai da área de pintura do span').toBeLessThanOrEqual(geometry.span.right - 0.5);
      expect(geometry.spanScrollWidth, 'span não pode ter overflow horizontal').toBeLessThanOrEqual(geometry.spanClientWidth + 1);
      writeFileSync(`${EVIDENCE}/titulo-geometria-${viewport.width}x${viewport.height}.json`, JSON.stringify(geometry,null,2));
      if (viewport.width === 2560) {
        // Orb central medido no asset WebP 2048x1143: (1008, 542), raio luminoso ~20px.
        // background-size:cover, background-position:center center, na div .meg-login.
        const orb = await page.locator('.meg-login').evaluate((el, {ORB_CENTER,ORB_RADIUS,ORB_SOURCE}) => {
          const view = el.getBoundingClientRect();
          const original = { ...ORB_SOURCE, ...ORB_CENTER, radius:ORB_RADIUS };
          const scale = Math.max(view.width/original.width, view.height/original.height);
          const imageWidth = original.width*scale, imageHeight = original.height*scale;
          const left = view.left+(view.width-imageWidth)/2;
          const top = view.top+(view.height-imageHeight)/2;
          return { source:original, scale, renderedImageWidth:imageWidth, renderedImageHeight:imageHeight,
            orbCenterX:left+original.x*scale, orbCenterY:top+original.y*scale, orbLeft:left+(original.x-original.radius)*scale };
        }, {ORB_CENTER,ORB_RADIUS,ORB_SOURCE});
        const gap = orb.orbLeft - geometry.lastGlyph.right;
        writeFileSync(`${EVIDENCE}/orb-titulo-2560x1440.json`,JSON.stringify({geometry,orb,gap},null,2));
        console.log('ORBE_GAP_2560 '+JSON.stringify({right:geometry.lastGlyph.right,orbLeft:orb.orbLeft,gap,orbSource:orb.source}));
        expect(gap,'distância entre último glifo e borda iluminada do orbe').toBeGreaterThanOrEqual(40);
        await page.screenshot({path:`${EVIDENCE}/recorte-titulo-orbe-2560x1440.png`,animations:'disabled',
          clip:{x:Math.max(0,geometry.heading.x-22),y:Math.max(0,geometry.heading.y-34),
            width:Math.min(viewport.width-geometry.heading.x+22,orb.orbCenterX-geometry.heading.x+128),
            height:Math.min(viewport.height-geometry.heading.y+34,orb.orbCenterY-geometry.heading.y+100)}});
      }
      if (viewport.width === 1920) {
        await page.screenshot({path:`${EVIDENCE}/recorte-ponto-final-1920x1080.png`, animations:'disabled',
          clip:{x:Math.max(0,geometry.lastGlyph.x-125), y:Math.max(0,geometry.lastGlyph.y-38),
            width:Math.min(viewport.width-geometry.lastGlyph.x+125,175),
            height:Math.min(viewport.height-geometry.lastGlyph.y+38,115)}});
      }

      await expect(page).not.toHaveTitle(/evolution/i);
      if (viewport.width === 768 || viewport.width === 600 || viewport.width === 1023) {
        const logo = await page.locator('.meg-login-logo').boundingBox();
        const panel = await page.locator('.meg-login-panel').boundingBox();
        const copy = await page.locator('.meg-login-hero-copy').boundingBox();
        const features = await page.locator('.meg-login-features').boundingBox();
        expect(logo.y + logo.height).toBeLessThan(panel.y);
        expect(panel.y + panel.height).toBeLessThan(copy.y);
        expect(copy.y + copy.height).toBeLessThan(features.y);
      }
      if (viewport.width === 1920) {
        const panel = await page.locator('.meg-login-panel').boundingBox();
        const heading = await page.locator('.meg-login-hero h1').boundingBox();
        const paragraph = await page.locator('.meg-login-intro').boundingBox();
        const span = await page.locator('.meg-login-hero h1 span').boundingBox();
        expect(panel.x - Math.max(span.x + span.width, paragraph.x + paragraph.width), 'respiro texto real-card').toBeGreaterThanOrEqual(120);
        const lines = await page.locator('.meg-login-hero h1').evaluate(el=>el.getBoundingClientRect().height/parseFloat(getComputedStyle(el).lineHeight));
        expect(lines,'título 1920 deve ocupar duas linhas').toBeLessThanOrEqual(2.1);
        await page.screenshot({ path: `${EVIDENCE}/recorte-titulo-orbe-1920x1080.png`,
          clip: {x: Math.max(0, heading.x - 24),y: Math.max(0, heading.y - 40),
            width: Math.min(1920 - Math.max(0, heading.x - 24), panel.x - Math.max(0, heading.x - 24) + 95),
            height: Math.min(1080 - Math.max(0, heading.y - 40), heading.height + 230) }, animations:'disabled' });
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
      await expect(page.getByRole('button', { name: 'Entrar no MEG' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Mostrar senha' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Criar conta' })).toBeVisible();
      if (viewport.width >= 1024) {
        for (const locator of [page.locator('.meg-login-panel'), page.locator('.meg-login-feature').last()]) {
          const rect = await locator.boundingBox();
          expect(rect, 'Elemento precisa estar visível no desktop').not.toBeNull();
          expect(rect.y + rect.height, 'Elemento não pode ficar cortado no desktop').toBeLessThanOrEqual(viewport.height + 1);
        }
      }
      if (viewport.width <= 480) {
        const panel = await page.locator('.meg-login-panel').boundingBox();
        const logo = await page.locator('.meg-login-logo').boundingBox();
        const copy = await page.locator('.meg-login-hero-copy').boundingBox();
        expect(logo.y + logo.height).toBeLessThan(panel.y);
        expect(panel.y + panel.height).toBeLessThan(copy.y);
        for (const selector of ['.meg-login-password-toggle', '.meg-login-submit', '.meg-login-options a', '.meg-login-create a']) {
          const bounds = await page.locator(selector).boundingBox();
          expect(bounds.height, selector).toBeGreaterThanOrEqual(44);
        }
        const secureParts = await page.locator('.meg-login-note-text').all();
        expect(secureParts).toHaveLength(2);
        const firstLine = await secureParts[0].boundingBox();
        const secondLine = await secureParts[1].boundingBox();
        expect(secondLine.y).toBeGreaterThan(firstLine.y);
        const forgot = await page.locator('.meg-login-options a').boundingBox();
        const remembered = await page.locator('.meg-login-remember').boundingBox();
        expect(Math.abs(forgot.y - remembered.y)).toBeLessThanOrEqual(2);
      }
      const positionBefore = await page.locator('.meg-login-submit').boundingBox();
      await page.screenshot({ path: `${EVIDENCE}/${viewport.name}.png`, fullPage: true, animations: 'disabled' });
      await page.getByRole('button', { name: 'Entrar no MEG' }).click();
      await expect(page.getByRole('alert')).toContainText('Digite um e-mail válido.');
      const positionAfter = await page.locator('.meg-login-submit').boundingBox();
      expect(Math.abs(positionAfter.y - positionBefore.y), 'botão não salta com erro').toBeLessThanOrEqual(1);
      const appearance = await page.locator('.meg-login-message').evaluate(el => {
        const st = getComputedStyle(el);
        const channel = st.color.match(/[0-9.]+/g).slice(0,3).map(Number);
        const lum = rgb => rgb.map(x => x / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4)
          .reduce((sum,x,i)=>sum+x*[.2126,.7152,.0722][i],0);
        const contrast = (lum(channel)+.05)/(lum([4,48,52])+.05);
        return {fontSize:parseFloat(st.fontSize),fontWeight:parseInt(st.fontWeight),color:st.color,contrast};
      });
      expect(appearance.fontSize).toBeGreaterThanOrEqual(viewport.width <= 480 ? 14 : 13);
      expect(appearance.fontWeight).toBeGreaterThanOrEqual(500);
      expect(appearance.contrast, 'contraste contra painel conservador #043034').toBeGreaterThanOrEqual(4.5);
      await expect(page.locator('input[name="email"]')).toHaveAttribute('aria-invalid','true');
      const describedBy = await page.locator('input[name="email"]').getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();
      await expect(page.locator(`#${describedBy}`)).toContainText('Digite um e-mail válido.');
      const space = await page.evaluate(() => { const a = document.querySelector('.meg-login-message').getBoundingClientRect(); const b = document.querySelector('.meg-login-submit').getBoundingClientRect(); return b.top - a.bottom; });
      expect(space).toBeGreaterThanOrEqual(7.5);
      expect(space).toBeLessThanOrEqual(12.5);
      await page.screenshot({ path: `${EVIDENCE}/${viewport.name}-erro.png`, fullPage: true, animations: 'disabled' });
      await page.getByRole('textbox', { name: 'E-mail' }).focus();
      expect(await page.locator('input[name="email"]').evaluate(el => el.matches(':focus-visible'))).toBe(true);
    } finally { await context.close(); }
  });
}

test('Validação local e mensagens em português', async ({ page }) => {
  await prepare(page);
  await page.getByRole('button', { name: 'Entrar no MEG' }).click();
  await expect(page.getByRole('alert')).toContainText('Digite um e-mail válido.');
  await page.getByRole('textbox', { name: 'E-mail' }).fill('usuario@exemplo.com');
  await page.getByRole('button', { name: 'Entrar no MEG' }).click();
  await expect(page.getByRole('alert')).toContainText('pelo menos 8 caracteres');
});

test('Login inválido não cria sessão e informa erro genérico', async ({ page }) => {
  await page.route('**/auth/login', async route => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'INVALID_CREDENTIALS' }) }));
  await prepare(page);
  await page.getByRole('textbox', { name: 'E-mail' }).fill('usuario@exemplo.com');
  await page.locator('input[name="password"]').fill('SenhaTeste123!');
  await page.getByRole('button', { name: 'Entrar no MEG' }).click();
  await expect(page.getByRole('alert')).toContainText('E-mail ou senha incorretos');
  expect(await page.evaluate(() => sessionStorage.getItem('meg.auth.session'))).toBeNull();
});

test('Login válido usa auth-client, cria sessão e exibe Shell sem antecipar Home', async ({ page }) => {
  await page.route('**/auth/login', async route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
    accessToken: 'test-access-token', refreshToken: 'test-refresh-token-for-fixture-only', refreshExpiresAt: '2030-01-01T00:00:00Z',
    user: { id: 'fixture-user', name: 'Usuário Exemplo', email: 'usuario@exemplo.com', status: 'ACTIVE', role: 'VIEWER', isActive: true }
  }) }));
  await prepare(page);
  await page.getByRole('textbox', { name: 'E-mail' }).fill('usuario@exemplo.com');
  await page.locator('input[name="password"]').fill('SenhaTeste123!');
  await page.getByRole('button', { name: 'Entrar no MEG' }).click();
  await expect(page.getByRole('complementary', { name: 'Navegação principal' })).toBeVisible();
  const saved = await page.evaluate(() => sessionStorage.getItem('meg.auth.session'));
  expect(JSON.parse(saved).user.email).toBe('usuario@exemplo.com');
});

test('Visibilidade da senha, lembrar apenas e-mail e destinos de navegação', async ({ page }) => {
  await prepare(page);
  const pass = page.locator('input[name="password"]');
  await expect(pass).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Mostrar senha' }).click();
  await expect(pass).toHaveAttribute('type', 'text');
  await expect(page.getByRole('button', { name: 'Ocultar senha' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('link', { name: 'Criar conta' }).click();
  await expect(page).toHaveURL(/auth=create-account/);
  await expect(page.getByRole('heading', { name: 'Criar conta' })).toBeVisible();
  await page.getByRole('button', { name: 'Voltar ao login' }).click();
  await page.getByRole('link', { name: 'Esqueci minha senha' }).click();
  await expect(page).toHaveURL(/auth=recover-password/);
  await expect(page.getByRole('heading', { name: 'Recuperar senha' })).toBeVisible();
});

test('Teclado Enter envia uma vez e layout móvel com teclado reduzido mantém ação acessível', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 430 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  try {
    await page.route('**/auth/login', async route => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'INVALID_CREDENTIALS' }) }));
    await prepare(page);
    await page.getByRole('textbox', { name: 'E-mail' }).fill('usuario@exemplo.com');
    await page.locator('input[name="password"]').fill('SenhaTeste123!');
    await page.locator('input[name="password"]').press('Enter');
    await expect(page.getByRole('alert')).toBeVisible();
    await page.getByRole('button', { name: 'Entrar no MEG' }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: 'Entrar no MEG' })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  } finally { await context.close(); }
});

test('Acessibilidade do Login, sem violações WCAG 2 A/AA', async ({ page }) => {
  await prepare(page);
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(result.violations).toEqual([]);
});

test('Faixa intermediária mantém logo acima do card (600 e 1023 px)', async ({ browser }) => {
  for (const width of [600,1023]) {
    const context=await browser.newContext({viewport:{width,height:1024},reducedMotion:'reduce'});
    try {
      const page=await context.newPage(); await prepare(page);
      const logo=await page.locator('.meg-login-logo').boundingBox();
      const panel=await page.locator('.meg-login-panel').boundingBox();
      expect(logo.y+logo.height, `logo em ${width}px`).toBeLessThan(panel.y);
      await expect(page.getByText(/meg evolution/i)).toHaveCount(0);
    } finally { await context.close(); }
  }
});
