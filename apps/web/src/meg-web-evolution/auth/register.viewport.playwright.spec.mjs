import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

test.use({ launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROME_PATH || undefined } });

const BASE = 'http://127.0.0.1:4173/web-evolution.html';
const VIEWPORTS = [[1920,1080],[1365,768],[1365,600],[1366,600],[1280,600],[1024,682],[1024,600],[390,844]];
const failuresFor = () => [];
const check = (failures, label, condition, details) => {
  if (!condition) failures.push({ label, details });
};
const intersects = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

for (const [width, height] of VIEWPORTS) {
  for (const deviceScaleFactor of [1,2]) {
    test(`Cadastro: rolagem e cards ${width}x${height} DPR ${deviceScaleFactor}`, async ({ browser }) => {
      const browserName = process.env.PLAYWRIGHT_CHROME_PATH ? 'chrome' : 'chromium';
      const context = await browser.newContext({
        viewport: { width, height },
        deviceScaleFactor,
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      const failures = failuresFor();
      const pageErrors = [];
      page.on('pageerror', error => pageErrors.push(error.message));

      try {
        await page.goto(`${BASE}?auth=create-account`);
        await page.evaluate(() => document.fonts.ready);

        for (const [mode, radioName, fieldNames] of [
          ['solicitar-acesso', 'Solicitar acesso', ['name','email','phone','password','confirmPassword']],
          ['criar-espaco', 'Criar meu espaço MEG', ['name','email','phone','workspaceName','password','confirmPassword']],
        ]) {
          await page.getByRole('radio', { name: radioName }).check();
          const modeFailures = [];
          const initial = await page.evaluate(() => {
            const card = document.querySelector('.meg-auth-card');
            const bounds = element => {
              const box = element.getBoundingClientRect();
              return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
            };
            const features = [...document.querySelectorAll('.meg-login-feature')];
            const blockers = [...document.querySelectorAll('*')].filter(element => {
              if (element === document.documentElement || element === document.body) return false;
              const style = getComputedStyle(element);
              return ['auto','scroll'].includes(style.overflowY) && element.scrollHeight > element.clientHeight + 1;
            });
            const heroTitle = document.querySelector('.meg-login-hero h2');
            const heroIntro = document.querySelector('.meg-login-intro');
            return {
              card: bounds(card),
              cardMaxHeight: getComputedStyle(card).maxHeight,
              cardOverflow: getComputedStyle(card).overflowY,
              fieldsOverflow: getComputedStyle(document.querySelector('.meg-auth-fields')).overflowY,
              blockers: blockers.map(element => ({
                selector: element.className?.baseVal || element.className || element.tagName,
                overflow: getComputedStyle(element).overflowY,
                scrollHeight: element.scrollHeight,
                clientHeight: element.clientHeight,
              })),
              features: features.map(element => ({
                bounds: bounds(element),
                icon: bounds(element.querySelector('.meg-login-feature-icon')),
                content: bounds(element.querySelector('div')),
              })),
              title: bounds(heroTitle),
              intro: bounds(heroIntro),
              documentHeight: document.scrollingElement.scrollHeight,
              viewportHeight: innerHeight,
            };
          });

          check(modeFailures, 'nenhuma rolagem interna', initial.blockers.length === 0, initial.blockers);
          check(modeFailures, 'card sem limite de altura', initial.cardMaxHeight === 'none', initial.cardMaxHeight);
          check(modeFailures, 'card sem overflow', initial.cardOverflow === 'visible', initial.cardOverflow);
          check(modeFailures, 'campos sem rolagem própria', !['auto','scroll'].includes(initial.fieldsOverflow), initial.fieldsOverflow);
          check(modeFailures, 'respiro dos cards ao fim da página', initial.documentHeight - Math.max(...initial.features.map(feature => feature.bounds.bottom)) >= 24,
            { documentHeight: initial.documentHeight, features: initial.features });
          const featuresBottom = Math.max(...initial.features.map(feature => feature.bounds.bottom));
          if (featuresBottom <= initial.viewportHeight + 1) {
            check(modeFailures, 'respiro dos cards ao fim da área visível', initial.viewportHeight - featuresBottom >= 24,
              { viewportHeight: initial.viewportHeight, featuresBottom });
          }

          const fields = page.locator('.meg-auth-fields .meg-login-input-block input');
          check(modeFailures, 'quantidade de campos ativos', await fields.count() === fieldNames.length, await fields.evaluateAll(inputs => inputs.map(input => input.name)));
          for (let index = 0; index < fieldNames.length; index += 1) {
            const field = fields.nth(index);
            const fieldName = await field.getAttribute('name');
            check(modeFailures, `campo ${fieldNames[index]} no modo ativo`, fieldName === fieldNames[index], fieldName);
            const fieldBounds = await field.evaluate(element => {
              const box = element.getBoundingClientRect();
              const card = document.querySelector('.meg-auth-card').getBoundingClientRect();
              return { left: box.left, right: box.right, top: box.top, bottom: box.bottom,
                card: { left: card.left, right: card.right, top: card.top, bottom: card.bottom } };
            });
            check(modeFailures, `${fieldNames[index]} dentro do card`,
              fieldBounds.left >= fieldBounds.card.left - 1 && fieldBounds.right <= fieldBounds.card.right + 1 &&
              fieldBounds.top >= fieldBounds.card.top - 1 && fieldBounds.bottom <= fieldBounds.card.bottom + 1, fieldBounds);
            await field.scrollIntoViewIfNeeded();
            const visibleBounds = await field.boundingBox();
            check(modeFailures, `${fieldNames[index]} visível ao rolar a página`,
              visibleBounds && visibleBounds.y >= 0 && visibleBounds.y + visibleBounds.height <= height + 1, visibleBounds);
          }

          await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
          const pageGeometry = await page.evaluate(() => ({
            scrollTop: Math.max(window.scrollY, document.documentElement.scrollTop, document.body.scrollTop),
            scrollHeight: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
            viewportHeight: innerHeight,
          }));
          if (pageGeometry.scrollHeight > pageGeometry.viewportHeight + 1) {
            check(modeFailures, 'rolagem pertence à página', pageGeometry.scrollTop > 0, pageGeometry);
          }

          const buttons = [
            ['Continuar', page.getByRole('button', { name: 'Continuar' })],
            ['Voltar ao login', page.getByRole('button', { name: 'Voltar ao login' }).last()],
          ];
          for (const [label, button] of buttons) {
            await button.scrollIntoViewIfNeeded();
            const bounds = await button.boundingBox();
            check(modeFailures, `${label} alcançável pela rolagem da página`,
              bounds && bounds.y >= 0 && bounds.y + bounds.height <= height + 1, bounds);
          }

          const pageRelations = await page.evaluate(() => {
            const bounds = element => {
              const box = element.getBoundingClientRect();
              return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
            };
            const title = bounds(document.querySelector('.meg-login-hero h2'));
            const intro = bounds(document.querySelector('.meg-login-intro'));
            const card = bounds(document.querySelector('.meg-auth-card'));
            const features = [...document.querySelectorAll('.meg-login-feature')].map(element => ({
              bounds: bounds(element),
              icon: bounds(element.querySelector('.meg-login-feature-icon')),
              content: bounds(element.querySelector('div')),
            }));
            return { title, intro, card, features };
          });
          for (const [index, feature] of pageRelations.features.entries()) {
            check(modeFailures, `benefício ${index + 1} sem sobreposição com título`,
              !intersects(feature.bounds, pageRelations.title), feature.bounds);
            check(modeFailures, `benefício ${index + 1} sem sobreposição com texto`,
              !intersects(feature.bounds, pageRelations.intro), feature.bounds);
            check(modeFailures, `benefício ${index + 1} sem sobreposição com formulário`,
              !intersects(feature.bounds, pageRelations.card), feature.bounds);
            check(modeFailures, `ícone do benefício ${index + 1} à esquerda do texto`,
              feature.icon.right <= feature.content.left + 1, { icon: feature.icon, content: feature.content });
          }

          if (deviceScaleFactor === 2 && [[1365,600],[1024,682],[390,844]].some(([w,h]) => width === w && height === h)) {
            const output = join('artifacts/meg-stage05-auth', 'viewport', browserName,
              `criar-conta-${width}x${height}-dpr2-${mode}.png`);
            mkdirSync(dirname(output), { recursive: true });
            await page.screenshot({ path: output, fullPage: true, animations: 'disabled' });
          }

          check(modeFailures, 'sem erros de JavaScript', pageErrors.length === 0, pageErrors);
          failures.push(...modeFailures.map(failure => ({ mode, ...failure })));
        }

        expect(failures, `Falhas de cadastro em ${width}x${height} DPR${deviceScaleFactor}`).toEqual([]);
      } finally {
        await context.close();
      }
    });

    test(`Login e recuperação sem regressão ${width}x${height} DPR ${deviceScaleFactor}`, async ({ browser }) => {
      const browserName = process.env.PLAYWRIGHT_CHROME_PATH ? 'chrome' : 'chromium';
      const context = await browser.newContext({
        viewport: { width, height },
        deviceScaleFactor,
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', error => pageErrors.push(error.message));

      try {
        await page.goto(`${BASE}?auth=login`);
        await page.evaluate(() => document.fonts.ready);
        await page.getByRole('link', { name: 'Esqueci minha senha' }).click();
        await page.getByRole('heading', { name: 'Recuperar senha' }).waitFor();
        await page.getByRole('button', { name: 'Voltar ao login' }).click();
        await page.getByRole('link', { name: 'Esqueci minha senha' }).waitFor();
        expect(pageErrors, `Erros do Login/Recuperar Senha em ${width}x${height} DPR${deviceScaleFactor} ${browserName}`).toEqual([]);
      } finally {
        await context.close();
      }
    });
  }
}
