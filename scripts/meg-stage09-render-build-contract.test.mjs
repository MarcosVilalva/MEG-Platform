import assert from 'node:assert/strict';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EXPECTED_RENDER_API_BUILD,
  readRepositoryManifests,
  verifyRenderApiBuildContract,
} from './meg-stage09-render-build-contract.mjs';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifests = readRepositoryManifests(rootDir);
assert.equal(verifyRenderApiBuildContract(EXPECTED_RENDER_API_BUILD, manifests), true);

function rejects(command, changed, message) {
  assert.throws(
    () => verifyRenderApiBuildContract(command, changed),
    /.+/,
    message
  );
}

rejects('npm install && npm run db:generate && npm run build:api && npm run db:prepare:production && npm run db:push:production',
  manifests, 'actual Render command MUST fail preflight');
rejects('npm ci --audit=false && npm run db:generate && npm run db:push:production',
  manifests, 'db push MUST fail');
rejects(EXPECTED_RENDER_API_BUILD + ' && prisma db push --accept-data-loss',
  manifests, 'accept-data-loss MUST fail');
rejects('npm install && npm run db:generate && npm run build:api',
  manifests, 'npm install instead of npm ci MUST be re-reviewed');
rejects(EXPECTED_RENDER_API_BUILD, {
  ...manifests,
  database: {
    ...manifests.database,
    scripts: { ...manifests.database.scripts, 'db:generate': 'prisma db push' }
  }
}, 'Prisma generate replaced with database writer');
rejects(EXPECTED_RENDER_API_BUILD, {
  ...manifests,
  api: { ...manifests.api, scripts: { ...manifests.api.scripts, prebuild: 'node dangerous.js' } }
}, 'prebuild lifecycle can run during npm run build');
rejects(EXPECTED_RENDER_API_BUILD, {
  ...manifests,
  root: { ...manifests.root, scripts: { ...manifests.root.scripts, postinstall: 'node mutate.js' } }
}, 'npm ci lifecycle must be visible');
const fakeWS = { ...manifests.workspaces,
  'apps/web': { ...manifests.workspaces['apps/web'], scripts: {
    ...manifests.workspaces['apps/web'].scripts, postinstall: 'node mutate.js'
  } }
};
rejects(EXPECTED_RENDER_API_BUILD, { ...manifests, workspaces: fakeWS },
  'npm install lifecycle in unrelated workspace must be reviewed');

console.log('Render offline build-contract characterizations: all passed (no DB or Render).');
