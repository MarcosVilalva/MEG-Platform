import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = readFileSync('.github/workflows/production-smoke.yml', 'utf8');

assert.match(workflow, /^name: MEG Production Smoke Test$/m, 'Smoke de produção deve manter nome válido.');
assert.equal((workflow.match(/- name: Verify API/g) || []).length, 1, 'Verify API deve existir uma única vez.');
assert.equal((workflow.match(/- name: Verify production security hardening/g) || []).length, 1, 'Hardening deve existir uma única vez.');
assert.equal((workflow.match(/- name: Verify published Evolution Web/g) || []).length, 1, 'Evolution Web deve ser validado uma única vez.');
assert.equal((workflow.match(/- name: Verify official Phoenix V15 web application/g) || []).length, 1, 'Phoenix V15 deve ser validado uma única vez.');

for (const token of [
  '"financialReady":true',
  "'^cache-control: no-store$'",
  '"status":"ready"',
  'docs_status=$(curl',
  'auth_status=$(curl',
  'data-meg-shell="evolution"',
  'data-meg-shell="phoenix-v15"',
]) {
  assert.ok(workflow.includes(token), `Smoke de produção não contém marcador obrigatório: ${token}`);
}

assert.doesNotMatch(
  workflow,
  /^\s*health-headers-normalized\.txt\s*$/m,
  'Workflow contém fragmento órfão de comando, sinal de edição corrompida.'
);

assert.doesNotMatch(
  workflow,
  /cache-control: no-store\$\([^\n]+docs/u,
  'Comandos do smoke foram concatenados indevidamente.'
);

console.log('Contrato do workflow production-smoke validado.');
