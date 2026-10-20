import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = readFileSync('.github/workflows/production-smoke.yml', 'utf8');
const rootSmoke = readFileSync('scripts/production-root-smoke.mjs', 'utf8');

assert.match(workflow, /^name: MEG Production Smoke Test$/m, 'Smoke de produção deve manter nome válido.');
assert.equal((workflow.match(/- name: Verify API/g) || []).length, 1, 'Verify API deve existir uma única vez.');
assert.equal((workflow.match(/- name: Verify production security hardening/g) || []).length, 1, 'Hardening deve existir uma única vez.');
assert.equal((workflow.match(/- name: Verify published Evolution Web/g) || []).length, 1, 'Evolution Web deve ser validado uma única vez.');
assert.equal((workflow.match(/- name: Verify published Stage05 root with Playwright/g) || []).length, 1, 'A raiz Stage05 deve ser validada uma única vez por Playwright.');
assert.equal((workflow.match(/- name: Upload published Stage05 root screenshot/g) || []).length, 1, 'O screenshot da raiz Stage05 deve ser publicado como artifact.');
assert.match(rootSmoke, /data-meg-login="stage05"/, 'Smoke deve provar que o Login Stage05 está renderizado.');
assert.match(rootSmoke, /name:\s*'Bem-vindo de volta\.'/u, 'Smoke deve exigir o título visível do Login.');
assert.match(rootSmoke, /name:\s*'Entrar no MEG'/u, 'Smoke deve exigir a ação visível de Login.');
assert.match(rootSmoke, /phoenix\.html/, 'Smoke deve confirmar a remoção da rota Phoenix.');
assert.match(rootSmoke, /phoenix-(?:card-premium|mobile-login-fix|runtime-refinements|v15-final-polish)\.css/, 'Smoke deve confirmar que os CSS Phoenix não são publicados.');
assert.match(rootSmoke, /__meg-stage05-fallback-check__/, 'Smoke deve exercitar a navegação direta por um caminho desconhecido.');
assert.match(rootSmoke, /fallbackResponse\.status\(\),\s*404/, 'Smoke deve preservar o status 404 do fallback do Pages.');
assert.match(rootSmoke, /data-meg-web-evolution="true"/, 'Smoke deve confirmar que o fallback monta somente Stage05.');
assert.doesNotMatch(rootSmoke, /Sua vida financeira,\s*com clareza para decidir/i, 'Smoke não deve rejeitar texto visual Stage05 aprovado.');

for (const token of [
  '"financialReady":true',
  "'^cache-control: no-store$'",
  '"status":"ready"',
  'docs_status=$(curl',
  'auth_status=$(curl',
  'data-meg-shell="evolution"',
  'scripts/production-root-smoke.mjs',
  'meg-evolution-production-root',
  '@playwright/test@1.64.0',
]) {
  assert.ok(workflow.includes(token), `Smoke de produção não contém marcador obrigatório: ${token}`);
}

assert.doesNotMatch(workflow, /phoenix/i, 'Smoke de produção não deve voltar a exigir ou publicar a aplicação Phoenix.');

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
