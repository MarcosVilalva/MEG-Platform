import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const root = new URL(process.env.MEG_PRODUCTION_URL || 'https://marcosvilalva.github.io/MEG-Platform/', import.meta.url);
root.searchParams.set('v', process.env.BUILD_SHA || 'local');
const screenshotPath = 'artifacts/production-root-smoke/meg-evolution-root.png';
const phoenixCssPaths = [
  'assets/phoenix-card-premium.css',
  'assets/phoenix-mobile-login-fix.css',
  'assets/phoenix-runtime-refinements.css',
  'assets/phoenix-v15-final-polish.css',
];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const assetStatuses = new Map();
page.on('response', (response) => {
  const url = response.url();
  if (url.includes('/MEG-Platform/meg-web-evolution/')) assetStatuses.set(url, response.status());
});
let lastFailure;
let passed = false;

try {
  for (let attempt = 1; attempt <= 24; attempt += 1) {
    try {
      const response = await page.goto(root.href, { waitUntil: 'domcontentloaded', timeout: 20_000 });
      assert.equal(response?.status(), 200, 'A raiz publicada precisa responder HTTP 200.');
      await page.locator('[data-meg-login="stage05"]').waitFor({ state: 'visible', timeout: 10_000 });
      await page.getByRole('heading', { name: 'Bem-vindo de volta.' }).waitFor({ state: 'visible', timeout: 5_000 });
      await page.getByRole('button', { name: 'Entrar no MEG' }).waitFor({ state: 'visible', timeout: 5_000 });
      await page.getByRole('link', { name: 'Criar conta' }).waitFor({ state: 'visible', timeout: 5_000 });

      const documentHtml = await page.content();
      assert.doesNotMatch(documentHtml, /phoenix/i, 'HTML renderizado na raiz não pode conter Phoenix.');
      assert.doesNotMatch(documentHtml, /data-meg-shell=["']phoenix-v15["']/i, 'A raiz não pode declarar shell Phoenix.');
      assert.doesNotMatch(documentHtml, /meg-finanças\s*[—-]\s*phoenix/i, 'Título Phoenix não pode ser servido na raiz.');
      assert.match(await page.title(), /MEG/i, 'A página deve ter título MEG.');
      const policy = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
      assert.ok(policy, 'A raiz publicada deve declarar CSP.');
      for (const directive of ["default-src 'self'", "script-src 'self'", "object-src 'none'", "connect-src 'self'", "frame-src 'none'", "form-action 'self'", 'upgrade-insecure-requests']) {
        assert.ok(policy.includes(directive), `CSP publicada sem diretiva: ${directive}`);
      }

      await page.evaluate(async () => { await document.fonts.load('400 16px "MEG Inter"'); });
      const logoLoaded = await page.locator('.meg-login-logo').evaluate((image) => image.complete && image.naturalWidth > 0);
      assert.equal(logoLoaded, true, 'A marca Stage05 não carregou.');
      assert.ok([...assetStatuses].some(([url, status]) => url.endsWith('/fonts/InterVariable.woff2') && status === 200), 'A fonte Stage05 não carregou sob a base do Pages.');
      assert.ok([...assetStatuses].some(([url, status]) => /\/login-background(?:@2x)?\.webp$/.test(url) && status === 200), 'O fundo aprovado Stage05 não carregou sob a base do Pages.');

      const accountUrl = new URL(root.href);
      accountUrl.searchParams.set('auth', 'create-account');
      const accountResponse = await page.goto(accountUrl.href, { waitUntil: 'domcontentloaded', timeout: 20_000 });
      assert.equal(accountResponse?.status(), 200, 'A rota de cadastro por query deve responder HTTP 200.');
      await page.getByRole('heading', { name: 'Criar conta' }).waitFor({ state: 'visible', timeout: 10_000 });
      await page.getByRole('textbox', { name: 'Nome completo' }).waitFor({ state: 'visible', timeout: 5_000 });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { name: 'Criar conta' }).waitFor({ state: 'visible', timeout: 10_000 });

      const phoenixPage = await page.request.get(new URL('phoenix.html', root).href, { maxRedirects: 0 });
      assert.equal(phoenixPage.status(), 404, 'A rota antiga phoenix.html deve responder 404.');
      for (const assetPath of phoenixCssPaths) {
        const asset = await page.request.get(new URL(assetPath, root).href, { maxRedirects: 0 });
        assert.equal(asset.status(), 404, `Asset público antigo deve responder 404: ${assetPath}`);
      }

      const fallbackUrl = new URL('__meg-stage05-fallback-check__', root);
      fallbackUrl.searchParams.set('auth', 'create-account');
      const fallbackResponse = await page.request.get(fallbackUrl.href, { maxRedirects: 0 });
      assert.equal(fallbackResponse.status(), 404, 'O caminho desconhecido deve manter status 404 do GitHub Pages.');
      const fallbackHtml = await fallbackResponse.text();
      assert.match(fallbackHtml, /data-meg-web-evolution="true"/, 'O fallback deve servir exclusivamente o shell Stage05.');
      assert.match(fallbackHtml, /http-equiv="Content-Security-Policy"/, 'O fallback deve manter a CSP de produção.');
      assert.doesNotMatch(fallbackHtml, /phoenix/i, 'O fallback não pode conter conteúdo Phoenix.');
      const fallbackNavigation = await page.goto(fallbackUrl.href, { waitUntil: 'domcontentloaded', timeout: 20_000 });
      assert.equal(fallbackNavigation?.status(), 404, 'A navegação/reload do fallback deve preservar o status 404.');
      await page.getByRole('heading', { name: 'Criar conta' }).waitFor({ state: 'visible', timeout: 10_000 });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { name: 'Criar conta' }).waitFor({ state: 'visible', timeout: 10_000 });

      const webEvolutionPage = await page.request.get(new URL('web-evolution.html', root).href);
      assert.equal(webEvolutionPage.status(), 200, 'web-evolution.html deve continuar publicado.');
      const evolutionPage = await page.request.get(new URL('evolution.html', root).href);
      assert.equal(evolutionPage.status(), 200, 'evolution.html deve continuar publicado.');

      await page.goto(root.href, { waitUntil: 'networkidle', timeout: 20_000 });
      await page.getByRole('heading', { name: 'Bem-vindo de volta.' }).waitFor({ state: 'visible', timeout: 5_000 });
      mkdirSync('artifacts/production-root-smoke', { recursive: true });
      await page.screenshot({ path: screenshotPath, fullPage: true, animations: 'disabled' });
      console.log(`Raiz Stage05 publicada e validada por Playwright na tentativa ${attempt}; screenshot: ${screenshotPath}`);
      passed = true;
      break;
    } catch (error) {
      lastFailure = error;
      console.error(`Raiz Stage05 ainda propagando (tentativa ${attempt}/24): ${error instanceof Error ? error.message : String(error)}`);
      if (attempt < 24) await new Promise((resolve) => setTimeout(resolve, 10_000));
    }
  }

  if (!passed) {
    const screenshotExists = [...assetStatuses.values()].some((status) => status === 200);
    if (!screenshotExists) console.error('Nenhum asset Stage05 foi confirmado durante o smoke.');
    throw lastFailure || new Error('Smoke da raiz Stage05 não concluiu.');
  }
} finally {
  await browser.close();
}
