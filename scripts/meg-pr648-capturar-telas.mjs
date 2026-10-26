#!/usr/bin/env node
/**
 * PR #648: screenshots de homologacao, somente leitura.
 * Usa banco ficticio ja ativo, sem criar/editar movimentos financeiros.
 * Credenciais nunca sao gravadas no pacote exportado.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const BRANCH = 'feature/meg-web-new-launch-visual-official';
const EMAIL = 'preview-admin@meg.invalid';
const API = 'http://127.0.0.1:3334';
const WEB = 'http://127.0.0.1:5174';
const CREDS = join(homedir(), '.local', 'state', 'meg-pr648-preview', 'credenciais.txt');
const CACHE = join(homedir(), '.cache', 'meg-pr648-visual-playwright');
const OUTPUT = join(ROOT, 'artifacts', 'meg-pr648-capturas');
const VIEWPORTS = [[1440, 900], [1024, 768], [390, 844]];

const run = (bin, args, options = {}) => execFileSync(bin, args, {
  cwd: ROOT, stdio: 'inherit', ...options
});
const output = (bin, args) => execFileSync(bin, args, {
  cwd: ROOT, encoding: 'utf8'
}).trim();
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
async function prerequisites() {
  assert(output('git', ['branch', '--show-current']) === BRANCH,
    'Execute somente no clone isolado da PR #648, nunca na main.');
  assert(output('git', ['remote', 'get-url', 'origin']).includes('MarcosVilalva/MEG-Platform'),
    'Repositorio inesperado.');
  assert(existsSync(CREDS), 'Credenciais de homologacao ausentes. Inicie o preview primeiro.');
  for (const [url, label] of [[API + '/health', 'API local'], [WEB + '/web-evolution.html', 'Web local']]) {
    let response;
    try { response = await fetch(url, { signal: AbortSignal.timeout(10000) }); }
    catch { throw new Error(label + ' indisponivel. Mantenha o servidor aberto em outro terminal.'); }
    assert(response.ok, label + ' respondeu HTTP ' + response.status);
    if (label === 'API local') {
      const result = await response.json();
      assert(result.financialReady === true, 'API nao confirmou financialReady=true.');
    } else {
      assert((await response.text()).includes('meg-web-evolution-root'),
        'A porta 5174 nao esta servindo Web Evolution.');
    }
  }
  const secrets = readFileSync(CREDS, 'utf8');
  assert(secrets.includes('E-mail: ' + EMAIL), 'Usuario ficticio nao confere.');
  const match = secrets.match(/^Senha: (.+)$/m);
  assert(match && match[1], 'Senha de homologacao nao encontrada.');
  return match[1];
}
async function launchBrowser() {
  const packageEntry = join(CACHE, 'node_modules', 'playwright', 'index.mjs');
  if (!existsSync(packageEntry)) {
    console.log('Preparando Playwright no cache pessoal (sem alterar package.json)...');
    mkdirSync(CACHE, { recursive: true, mode: 0o700 });
    run('npm', ['install', '--prefix', CACHE, '--no-save', '--no-package-lock',
      '--ignore-scripts', 'playwright']);
  }
  assert(existsSync(packageEntry), 'Playwright nao foi instalado corretamente.');
  const { chromium } = await import(pathToFileURL(packageEntry).href);
  const executablePath = [
    process.env.PLAYWRIGHT_CHROME_PATH,
    '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'
  ].find(file => file && existsSync(file));
  const options = { headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'],
    ...(executablePath ? { executablePath } : {}) };
  try {
    return await chromium.launch(options);
  } catch (error) {
    if (executablePath) throw error;
    console.log('Instalando Chromium no cache do Playwright...');
    run(process.execPath, [join(CACHE, 'node_modules', 'playwright', 'cli.js'), 'install', 'chromium']);
    return chromium.launch(options);
  }
}
async function evidence(page, dir, name, width, height, checks) {
  await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; });
  const filename = name + '-' + width + 'x' + height + '.png';
  await page.screenshot({ path: join(dir, filename), fullPage: true,
    animations: 'disabled', timeout: 20000 });
  const metric = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const dialog = document.querySelector('.meg-new-launch');
    const grid = document.querySelector('.meg-datagrid__viewport');
    const dateInput = dialog?.querySelector('input[type="date"]');
    const footer = dialog?.querySelector('.meg-new-launch__footer');
    const header = dialog?.querySelector('.meg-new-launch__header');
    function size(node) {
      return node ? {
        clientWidth: node.clientWidth, scrollWidth: node.scrollWidth,
        clientHeight: node.clientHeight, scrollHeight: node.scrollHeight
      } : null;
    }
    return {
      pageHorizontalOverflowPx: Math.max(0, document.documentElement.scrollWidth - viewportWidth),
      dialog: size(dialog), dataGrid: size(grid),
      dateFieldWidthPx: dateInput?.getBoundingClientRect().width ?? null,
      stickyHeaderTopPx: header?.getBoundingClientRect().top ?? null,
      stickyFooterBottomPx: footer?.getBoundingClientRect().bottom ?? null,
      dialogScrollTop: dialog?.scrollTop ?? null
    };
  });
  checks.push({ screen: name, width, height, ...metric });
  if (metric.pageHorizontalOverflowPx > 1)
    console.warn('Rolagem horizontal da pagina em ' + filename + ': '
      + metric.pageHorizontalOverflowPx + 'px');
  console.log('  ' + filename);
}
async function capture(browser, width, height, password, dir, checks) {
  const context = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: 'reduce',
    locale: 'pt-BR', timezoneId: 'America/Sao_Paulo'
  });
  const page = await context.newPage();
  try {
    // O navegador automatizado nao acessa APIs remotas ou dados de producao.
    await page.route('**/*', async route => {
      const url = route.request().url();
      if (url.startsWith(WEB + '/') || url.startsWith(API + '/')
        || url.startsWith('data:') || url.startsWith('blob:')) {
        await route.continue();
      } else {
        await route.abort();
      }
    });
    await page.goto(WEB + '/web-evolution.html', {
      waitUntil: 'domcontentloaded', timeout: 30000
    });
    await page.locator('input[name="email"]').fill(EMAIL);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole('button', { name: 'Entrar no MEG' }).click();
    await page.locator('.meg-launches__grid .meg-datagrid')
      .waitFor({ state: 'visible', timeout: 45000 });
    await evidence(page, dir, '01-lancamentos', width, height, checks);

    // O topo e a tela possuem botoes com o mesmo nome acessivel; usar o da tela.
    await page.locator('.meg-launches__actions .meg-launches__refresh--primary').click();
    await page.locator('.meg-new-launch.is-choose').waitFor({ state: 'visible' });
    await evidence(page, dir, '02-seletor', width, height, checks);

    for (const [type, prefix] of [['Despesa', '03-despesa'], ['Receita', '04-receita']]) {
      await page.getByRole('button', { name: 'Escolher ' + type }).click();
      await page.locator('.meg-new-launch.is-form').waitFor({ state: 'visible' });
      await page.locator('.meg-new-launch__panel').first()
        .waitFor({ state: 'visible', timeout: 20000 });
      await evidence(page, dir, prefix + '-inicio', width, height, checks);
      await page.locator('.meg-new-launch')
        .evaluate(node => { node.scrollTop = node.scrollHeight; });
      await evidence(page, dir, prefix + '-rodape', width, height, checks);
      if (type === 'Despesa') {
        await page.getByRole('button', { name: 'Alterar tipo' }).click();
        await page.locator('.meg-new-launch.is-choose').waitFor({ state: 'visible' });
      }
    }
    console.log('Capturas ' + width + 'x' + height + ' concluidas, sem gravar lancamentos.');
  } finally {
    await context.close();
  }
}
function zipDirectory(dir) {
  const zip = dir + '.zip';
  const code = [
    'from pathlib import Path',
    'import zipfile, sys',
    'folder = Path(sys.argv[1])',
    'dest = Path(sys.argv[2])',
    'with zipfile.ZipFile(dest, "w", zipfile.ZIP_DEFLATED) as archive:',
    '  for file in sorted(folder.rglob("*")):',
    '    if file.is_file(): archive.write(file, file.relative_to(folder.parent))'
  ].join('\n');
  run('python3', ['-c', code, dir, zip]);
  return zip;
}
async function main() {
  const password = await prerequisites();
  const revision = output('git', ['rev-parse', '--short=9', 'HEAD']);
  const time = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = join(OUTPUT, revision + '-' + time);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const checks = [];
  const browser = await launchBrowser();
  try {
    for (const [width, height] of VIEWPORTS)
      await capture(browser, width, height, password, dir, checks);
  } finally {
    await browser.close();
  }
  writeFileSync(join(dir, 'diagnostico-visual.json'), JSON.stringify({
    branch: BRANCH, revision, source: 'local-preview-5174',
    readOnly: true, generatedAt: new Date().toISOString(), checks
  }, null, 2) + '\n', { mode: 0o600 });
  const zip = zipDirectory(dir);
  console.log('\nZIP PARA ENVIAR NO CHAT:\n' + zip);
  console.log('No Explorador do Codespaces, clique com o botao direito no ZIP e em Download.');
  console.log('Nenhum dado financeiro foi criado, editado ou apagado.');
}
main().catch(error => {
  console.error('[MEG capturas]', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
