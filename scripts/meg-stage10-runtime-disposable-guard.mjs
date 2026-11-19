import assert from 'node:assert/strict';

export const STAGE10_CI_DB = 'meg_stage10_runtime_sandbox';

export function assertStage10ManualRunner() {
  assert.equal(process.env.GITHUB_ACTIONS, 'true', 'STAGE10_GITHUB_ACTIONS_REQUIRED');
  assert.equal(process.env.GITHUB_REPOSITORY, 'MarcosVilalva/MEG-Platform', 'STAGE10_WRONG_REPOSITORY');
  assert.equal(process.env.GITHUB_REF, 'refs/heads/stage10/runtime-readonly-403-isolated-20261119', 'STAGE10_WRONG_BRANCH');
  assert.equal(process.env.MEG_STAGE10_RUNTIME_QA_MANUAL, '1', 'STAGE10_MANUAL_GATE_REQUIRED');
  assert.equal(process.env.MEG_STAGE10_QA_LOCAL_ONLY, '1', 'STAGE10_QA_FLAG_REQUIRED');
}

export function assertStage10Database(raw, user) {
  let url;
  try { url = new URL(raw || 'http://invalid'); }
  catch { throw new Error('STAGE10_DATABASE_URL_INVALID'); }
  assert.equal(url.protocol, 'postgresql:', 'STAGE10_POSTGRES_ONLY');
  assert.equal(url.hostname, '127.0.0.1', 'STAGE10_LOOPBACK_ONLY');
  assert.equal(url.port, '5432', 'STAGE10_DISPOSABLE_PORT_ONLY');
  assert.equal(url.pathname, '/' + STAGE10_CI_DB, 'STAGE10_DISPOSABLE_DATABASE_ONLY');
  assert.equal(decodeURIComponent(url.username), user, 'STAGE10_DATABASE_ROLE_MISMATCH');
  assert.ok(url.password, 'STAGE10_PASSWORD_REQUIRED');
  assert.ok(!url.searchParams.has('host') && !url.searchParams.has('sslmode'), 'STAGE10_NO_CONNECTION_OVERRIDES');
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/meg-stage10-runtime-disposable-guard.mjs')) {
  assertStage10ManualRunner();
  const requested = process.argv[2];
  assert.ok(requested === 'admin' || requested === 'runtime', 'STAGE10_INVALID_GUARD_MODE');
  assertStage10Database(process.env.DATABASE_URL, requested === 'admin' ? 'meg_stage10_ci_admin' : 'meg_stage10_ci_runtime');
  console.log('MEG_STAGE10_DISPOSABLE_DATABASE_GUARD=PASS');
}
