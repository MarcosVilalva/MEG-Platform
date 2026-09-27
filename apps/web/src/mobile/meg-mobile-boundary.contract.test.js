import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const webSrc = resolve(here, '..');
const mobileDir = here;
const repoRoot = resolve(here, '../../../../');

function filesUnder(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...filesUnder(full));
    else out.push(full);
  }
  return out;
}

const mobileSources = filesUnder(mobileDir).filter((file) =>
  /\.(?:ts|tsx|js|css)$/.test(file) && !/\.test\.js$/.test(file) && !/\.contract\.test\.js$/.test(file)
);

const allowedPhoenixImports = [
  '../phoenix/contracts',
  '../phoenix/profile-avatar',
  '../phoenix/home-period-summary',
  '../phoenix/data/',
];

const quarantinedGenerations = {
  'meg2-': new Set([
    'apps/web/src/mobile/MegMobileFinal.tsx',
    'apps/web/src/mobile/meg-mobile-final.css',
    'apps/web/src/mobile/meg-mobile-launch-sheet.css',
    'apps/web/src/mobile/meg-mobile-runtime.css',
  ]),
  'meg3-': new Set([
    'apps/web/src/mobile/MegMobileBenefitModal.tsx',
    'apps/web/src/mobile/MegMobileCardCenter.tsx',
    'apps/web/src/mobile/MegMobileCoreScreens.tsx',
    'apps/web/src/mobile/MegMobileLaunchSheet.tsx',
    'apps/web/src/mobile/meg-mobile-benefit.css',
    'apps/web/src/mobile/meg-mobile-card-center.css',
    'apps/web/src/mobile/meg-mobile-core-screens.css',
    'apps/web/src/mobile/meg-mobile-launch-sheet.css',
    'apps/web/src/mobile/meg-mobile-runtime.css',
  ]),
  'meg4-': new Set([
    'apps/web/src/mobile/MegMobileSettings.tsx',
    'apps/web/src/mobile/meg-mobile-settings.css',
    'apps/web/src/mobile/meg-mobile-runtime.css',
  ]),
  'meg5-': new Set([
    'apps/web/src/mobile/MegMobilePicker.tsx',
    'apps/web/src/mobile/meg-mobile-picker.css',
    'apps/web/src/mobile/meg-mobile-launch-sheet.css',
  ]),
};

for (const file of mobileSources) {
  const source = readFileSync(file, 'utf8');
  const rel = relative(repoRoot, file).replaceAll('\\', '/');

  for (const [prefix, allowedFiles] of Object.entries(quarantinedGenerations)) {
    if (source.includes(prefix)) {
      assert.ok(allowedFiles.has(rel),
        rel + ': geração móvel antiga ' + prefix + ' está em quarentena e não pode se espalhar para novos arquivos. Use o namespace semântico da reconstrução.');
    }
  }

  assert.doesNotMatch(source, /\bpx-[a-z0-9-]+/i,
    rel + ': código clean-room não pode reutilizar classes visuais px-* do Phoenix.');

  if (/\.(?:ts|tsx|js)$/.test(file)) {
    const imports = [...source.matchAll(/(?:from\s+|import\s*)['"]([^'"]+)['"]/g)].map((m) => m[1]);
    for (const specifier of imports.filter((value) => value.startsWith('../phoenix/'))) {
      assert.ok(
        allowedPhoenixImports.some((prefix) => specifier === prefix || specifier.startsWith(prefix)),
        rel + ': import Phoenix fora da camada compartilhada permitida: ' + specifier
      );
    }
    assert.doesNotMatch(source, /import\s+['"]\.\.\/phoenix\/[^'"]+\.css['"]/,
      rel + ': CSS Phoenix não pode entrar no clean-room móvel.');
  }

  if (extname(file) === '.css') {
    assert.doesNotMatch(source, /^\s*:root\s*\{/m,
      rel + ': tokens móveis não podem vazar para :root.');
    const rawHtmlOrBody = source.split('\n').filter((line) => {
      const value = line.trim();
      if (!/^(?:html|body)(?:\b|\[|\.|#|:)/.test(value)) return false;
      return !value.startsWith('html.meg-cleanroom-mobile')
        && !value.startsWith('body.meg-cleanroom-mobile');
    });
    assert.equal(rawHtmlOrBody.length, 0,
      rel + ': seletores html/body precisam estar presos ao namespace meg-cleanroom-mobile. Encontrado: ' + rawHtmlOrBody.join(' | '));
  }
}

const main = readFileSync(resolve(webSrc, 'app/main.tsx'), 'utf8');
const preview = readFileSync(resolve(webSrc, 'phoenix/preview-main.tsx'), 'utf8');
const phoenixApp = readFileSync(resolve(webSrc, 'phoenix/PhoenixApp.tsx'), 'utf8');
const previewCss = readFileSync(resolve(webSrc, 'phoenix/preview.css'), 'utf8');

function resolveStaticImport(fromFile, specifier) {
  if (!specifier.startsWith('.')) return null;
  const base = resolve(dirname(fromFile), specifier);
  const candidates = [
    base,
    base + '.ts',
    base + '.tsx',
    base + '.js',
    base + '.css',
    join(base, 'index.ts'),
    join(base, 'index.tsx'),
    join(base, 'index.js'),
  ];
  for (const candidate of candidates) {
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch {}
  }
  return null;
}

function collectStaticGraph(entryFile) {
  const visited = new Set();
  const pending = [entryFile];
  const css = new Set();
  while (pending.length) {
    const file = pending.pop();
    if (!file || visited.has(file)) continue;
    visited.add(file);
    const source = readFileSync(file, 'utf8');
    const staticImports = [...source.matchAll(/^\s*import(?:[\s\S]*?from\s*)?['"]([^'"]+)['"];?/gm)]
      .map((match) => match[1]);
    for (const specifier of staticImports) {
      const target = resolveStaticImport(file, specifier);
      if (!target) continue;
      if (target.endsWith('.css')) css.add(target);
      else pending.push(target);
    }
  }
  return { visited, css };
}

const nativeStaticGraph = collectStaticGraph(resolve(webSrc, 'phoenix/preview-main.tsx'));
const allowedNativeCss = new Set([
  resolve(webSrc, 'phoenix/preview.css'),
  resolve(webSrc, 'phoenix/preview-auth-flow.css'),
  ...filesUnder(mobileDir).filter((file) => file.endsWith('.css')),
]);
const unexpectedNativeCss = [...nativeStaticGraph.css]
  .filter((file) => !allowedNativeCss.has(file))
  .map((file) => relative(repoRoot, file).replaceAll('\\', '/'));

assert.deepEqual(unexpectedNativeCss, [],
  'Grafo estático do APK carregou CSS fora do clean-room/auth permitido: ' + unexpectedNativeCss.join(', '));


assert.doesNotMatch(main, /^import\s+['"]\.\.\/phoenix\/[^'"]*(?:bridge|prewarm|fastpaint|enhancements)[^'"]*['"];?$/m,
  'Bootstrap não pode importar runtime Phoenix legado estaticamente no APK.');
assert.match(main, /if \(!nativeOperationalBuild\) \{[\s\S]*await loadWebOnlyLegacyRuntime\(\)/,
  'Runtime legado precisa ficar atrás do gate Web.');
assert.match(preview, /if \(MEG_MOBILE_RUNTIME[\s\S]*meg-cleanroom-mobile[\s\S]*else if \(!MEG_MOBILE_RUNTIME\)[\s\S]*PhoenixWebStyles/,
  'Preview precisa separar explicitamente clean-room Android e estilos Web.');
assert.match(phoenixApp, /if \(nativeOperational && viewData\)[\s\S]*<MegMobileFinal/,
  'Android com dados deve sempre entrar no shell móvel novo.');
assert.match(phoenixApp, /: 'home';[\s\S]*view=\{nativeView\}/,
  'Rota Android desconhecida deve cair na Home clean-room, nunca no shell Phoenix.');
assert.doesNotMatch(previewCss, /^\s*(?:html|body|button|input)(?:\s|,|\{)/m,
  'Reset do preview não pode atuar globalmente sobre o clean-room.');

console.log('Auditoria de fronteira mobile: clean-room isolado do legado Phoenix.');
