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

for (const file of mobileSources) {
  const source = readFileSync(file, 'utf8');
  const rel = relative(repoRoot, file).replaceAll('\\', '/');

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
