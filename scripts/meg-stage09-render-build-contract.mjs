/**
 * Etapa 09. Contrato OFFLINE do próximo Build Command seguro do Render.
 *
 * Não acessa Render, Supabase, banco, arquivos .env ou segredos.
 * Não altera configuração, não dispara npm, build nem deploy.
 * ATENÇÃO: este teste NÃO prova que o comando configurado no Render foi alterado.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const EXPECTED_RENDER_API_BUILD = 'npm ci --audit=false && npm run db:generate && npm run build:api';

const DISALLOWED_LIFECYCLE = new Set([
  'preinstall', 'install', 'postinstall', 'prepare',
  'prebuild:api', 'postbuild:api',
  'predb:generate', 'postdb:generate',
  'prebuild', 'postbuild'
]);

const REQUIRED_SCRIPT = {
  root: {
    'db:generate': 'npm --workspace packages/database run db:generate',
    'build:api': 'npm --workspace apps/api run build'
  },
  database: {
    'db:generate': 'prisma generate'
  },
  api: {
    build: 'tsc -p tsconfig.json'
  }
};

function checkScripts(label, pkg, expectedScripts, requirePrivate = true) {
  if (requirePrivate) assert.equal(pkg?.private, true, label + ' must remain private');
  const scripts = pkg?.scripts ?? {};
  for (const [name, expected] of Object.entries(expectedScripts)) {
    assert.equal(scripts[name], expected, label + ': unexpected script chain for ' + name);
  }
  for (const name of Object.keys(scripts)) {
    assert.ok(!DISALLOWED_LIFECYCLE.has(name),
      label + ': unexpected npm lifecycle hook ' + name + ' could run during build');
  }
}

export function verifyRenderApiBuildContract(proposed, manifests) {
  assert.equal(proposed, EXPECTED_RENDER_API_BUILD,
    'Render API candidate differs from approved exact, DB-write-free build command');
  const root = manifests.root;
  checkScripts('root', root, REQUIRED_SCRIPT.root);
  checkScripts('@meg/database', manifests.database, REQUIRED_SCRIPT.database);
  checkScripts('@meg/api', manifests.api, REQUIRED_SCRIPT.api);
  assert.deepEqual(root?.workspaces, [
    'apps/web', 'packages/core', 'packages/ui', 'packages/shared',
    'packages/analytics', 'packages/intelligence', 'apps/api', 'packages/database'
  ], 'Workspace list changed; audit npm lifecycle before relying on this contract');
  const workspacePackages = manifests.workspaces;
  assert.equal(Object.keys(workspacePackages).length, root.workspaces.length);
  for (const name of root.workspaces) {
    assert.ok(workspacePackages[name], 'Manifest absent for ' + name);
    checkScripts(name, workspacePackages[name], {}, false);
  }
  return true;
}

export function readRepositoryManifests(repoRoot) {
  const read = (path) => JSON.parse(readFileSync(resolve(repoRoot, path), 'utf8'));
  const root = read('package.json');
  const workspaces = Object.fromEntries(root.workspaces.map(w => [w, read(w + '/package.json')]));
  return {
    root,
    database: workspaces['packages/database'],
    api: workspaces['apps/api'],
    workspaces
  };
}

const invokedAsScript = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsScript) {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const proposed = process.env.MEG_RENDER_PROPOSED_BUILD || EXPECTED_RENDER_API_BUILD;
  verifyRenderApiBuildContract(proposed, readRepositoryManifests(repoRoot));
  console.log('Render Build Contract: OK (offline candidate only, NOT deployed).');
  console.log('Approved candidate: ' + EXPECTED_RENDER_API_BUILD);
  console.log('Production Render Build Command was NOT checked by this script.');
}
