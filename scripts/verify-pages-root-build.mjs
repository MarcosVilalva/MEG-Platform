import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const dist = 'apps/web/dist';
const rootHtml = readFileSync(join(dist, 'index.html'), 'utf8');
const fallbackHtml = readFileSync(join(dist, '404.html'), 'utf8');
const evolutionHtml = readFileSync(join(dist, 'evolution.html'), 'utf8');
const webEvolutionHtml = readFileSync(join(dist, 'web-evolution.html'), 'utf8');

assert.match(rootHtml, /data-meg-web-evolution="true"/, 'A raiz do Pages deve ser o shell Stage05.');
assert.doesNotMatch(rootHtml, /phoenix/i, 'A entrada da raiz não pode conter referências Phoenix.');
assert.match(rootHtml, /http-equiv="Content-Security-Policy"/, 'A raiz deve receber CSP de produção.');
const policy = (rootHtml.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/)?.[1] || '').replaceAll('&#39;', "'");
for (const directive of ["default-src 'self'", "script-src 'self'", "object-src 'none'", "connect-src 'self'", "frame-src 'none'", "form-action 'self'", 'upgrade-insecure-requests']) {
  assert.ok(policy.includes(directive), `CSP da raiz sem diretiva obrigatória: ${directive}`);
}
assert.match(fallbackHtml, /data-meg-web-evolution="true"/, 'O fallback do Pages deve montar o shell Stage05.');
assert.match(fallbackHtml, /http-equiv="Content-Security-Policy"/, 'O fallback deve receber CSP de produção.');
assert.doesNotMatch(fallbackHtml, /phoenix/i, 'O fallback não pode conter referências Phoenix.');

const cssHrefs = [...rootHtml.matchAll(/href="([^"]+\.css)"/g)].map((match) => match[1]);
assert.ok(cssHrefs.length > 0, 'O shell da raiz precisa referenciar CSS compilado.');
const css = cssHrefs.map((href) => readFileSync(join(dist, href.replace(/^\/MEG-Platform\//, '')), 'utf8')).join('\n');
for (const assetPath of [
  'fonts/InterVariable.woff2',
  'login-background.webp',
  'login-background@2x.webp'
]) {
  assert.ok(css.includes(`/MEG-Platform/meg-web-evolution/${assetPath}`), `CSS não usa base Pages no asset ${assetPath}.`);
  assert.ok(statSync(join(dist, 'meg-web-evolution', assetPath)).isFile(), `Asset ausente no artifact: ${assetPath}.`);
}

assert.match(evolutionHtml, /data-meg-shell="evolution"/, 'A rota Evolution existente deve continuar no build.');
assert.match(webEvolutionHtml, /data-meg-web-evolution="true"/, 'A rota web-evolution.html deve continuar no build.');

function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    const file = join(directory, name);
    return statSync(file).isDirectory() ? walk(file) : [file];
  });
}

const phoenixFiles = walk(dist).map((file) => relative(dist, file)).filter((file) => /phoenix/i.test(file));
assert.deepEqual(phoenixFiles, [], `Artifact contém arquivos servidos pelo Phoenix: ${phoenixFiles.join(', ')}`);

console.log('Artifact Pages validado: raiz Stage05, CSP, assets sob /MEG-Platform/ e sem arquivos Phoenix.');
