import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '../../../..');
const webNextRoot = join(repoRoot, 'apps/web/src/web-next');
const phoenixStylesPath = join(repoRoot, 'apps/web/src/phoenix/PhoenixWebStyles.ts');
const statusPath = join(repoRoot, 'docs/WEB-REBUILD-STATUS.md');
const removalPath = join(repoRoot, 'docs/WEB-LEGACY-REMOVAL.md');

assert.ok(existsSync(statusPath), 'WEB-REBUILD-STATUS.md deve existir como fonte de verdade.');
assert.ok(existsSync(removalPath), 'WEB-LEGACY-REMOVAL.md deve existir durante a migração.');
assert.ok(existsSync(webNextRoot), 'A fronteira apps/web/src/web-next deve existir.');

const status = readFileSync(statusPath, 'utf8');
const removal = readFileSync(removalPath, 'utf8');
const phoenixStyles = readFileSync(phoenixStylesPath, 'utf8');

assert.match(status, /clean-room/i);
assert.match(status, /Uma tela por vez/i);
assert.match(status, /Tela aprovada pelo usuário entra em estado VALIDADA/i);
assert.match(status, /legado substituído por aquela tela deve ser removido/i);
assert.match(status, /1920 x 1080/);
assert.match(status, /Android fica congelado/i);
assert.match(removal, /Baseline permitido: \*\*18 imports Phoenix visuais\*\*/);

const phoenixVisualImports = [...phoenixStyles.matchAll(/^import '\.\/phoenix-[^']+\.css';$/gm)]
  .map((match) => match[0]);

assert.ok(
  phoenixVisualImports.length <= 18,
  `Legado visual Phoenix cresceu de novo: ${phoenixVisualImports.length} imports. Baseline máximo é 18.`
);

const sourceExtensions = /\.(?:ts|tsx|js|jsx|css)$/i;
const bannedFileName = /(?:^|[-_.])(old|backup|legacy|wow|final\d*|v\d+)(?:[-_.]|$)/i;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

for (const file of walk(webNextRoot).filter((item) => sourceExtensions.test(item))) {
  const rel = relative(webNextRoot, file).replaceAll('\\', '/');
  const content = readFileSync(file, 'utf8');

  assert.doesNotMatch(rel, bannedFileName,
    `Web Next não aceita versões paralelas/backup no nome do arquivo: ${rel}`);
  if (!rel.startsWith('data/')) {
    assert.doesNotMatch(content, /(?:from\s+|import\s*)['"][^'"]*\/phoenix\//,
      `Somente web-next/data pode importar contratos/gateways Phoenix durante a migração: ${rel}`);
  }
  assert.doesNotMatch(content, /@import[^;]*(?:phoenix|mobile)|import\s+['"][^'"]*(?:phoenix|mobile)[^'"]*\.css['"]/i,
    `Web Next não pode importar CSS Phoenix/mobile diretamente: ${rel}`);
}

console.log(`Web Next governance OK: ${phoenixVisualImports.length}/18 imports Phoenix visuais restantes.`);
