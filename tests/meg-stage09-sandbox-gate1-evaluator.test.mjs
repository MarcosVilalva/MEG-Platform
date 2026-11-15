import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateEvidence, SANDBOX_REF, CHECKS } from '../scripts/meg-stage09-sandbox-gate1-evaluator.mjs';

const script = fileURLToPath(new URL('../scripts/meg-stage09-sandbox-gate1-evaluator.mjs', import.meta.url));
const NOW = Date.parse('2026-11-14T16:10:00Z');

function fixture() {
  return {
    schema_version: 1,
    project_ref: SANDBOX_REF,
    evidence_source: 'aggregated-logs',
    observed_at: '2026-11-14T14:00:00Z',
    http: {
      auth: {'200': 1, '402': 6},
      storage: {'200': 0, '402': 2},
      other: {'200': 3, '402': 2},
    },
    controls: Object.fromEntries(CHECKS.map((key) => [key, 'NAO_VERIFICADO'])),
  };
}

test('evidencia sintética reproduz 4x200, 10x402, bloqueia os quatro gates', () => {
  const output = evaluateEvidence(fixture(), NOW);
  assert.equal(output.http_200, 4);
  assert.equal(output.http_402, 10);
  assert.equal(output.gate1, 'PARCIAL');
  assert.equal(output.gate4, 'NO_GO');
  assert.equal(output.status, 'NO_GO');
  assert.ok(output.motivos.includes('HTTP_402_OBSERVADO'));
});

test('indicios positivos de dashboard exigem revisão manual, nunca PASS', () => {
  const input = fixture();
  input.evidence_source = 'sanitized-dashboard';
  input.http = Object.fromEntries(['auth', 'storage', 'other'].map((area) => [area, {'200': 1, '402': 0}]));
  input.controls = Object.fromEntries(CHECKS.map((key) => [key, 'SIM']));
  const result = evaluateEvidence(input, NOW);
  assert.equal(result.status, 'REVISAO_MANUAL_OBRIGATORIA');
  assert.equal(result.gate1, 'PARCIAL');
  assert.equal(result.autorizacao_para_restore, false);
});

test('fonte sintética não comprova ambiente mesmo sem erros', () => {
  const input = fixture();
  input.evidence_source = 'synthetic-fixture';
  input.controls = Object.fromEntries(CHECKS.map((key) => [key, 'SIM']));
  input.http = Object.fromEntries(['auth', 'storage', 'other'].map((area) => [area, {'200': 1, '402': 0}]));
  assert.ok(evaluateEvidence(input, NOW).motivos.includes('EVIDENCIA_SINTETICA'));
});

test('recusa ref de produção e projeto inativo', () => {
  for (const project_ref of ['ugbiqzaqnrhulhetevby', 'dmrauztnozvxirbydtho']) {
    const input = fixture(); input.project_ref = project_ref;
    assert.throws(() => evaluateEvidence(input, NOW), /EVIDENCIA_INVALIDA/);
  }
});

test('recusa campos extras com segredos, inclusive aninhados', () => {
  const input = fixture(); input.api_key = 'DO_NOT_EXPOSE';
  assert.throws(() => evaluateEvidence(input, NOW), /EVIDENCIA_INVALIDA/);
  const nested = fixture(); nested.http.auth.secret = 'DO_NOT_EXPOSE';
  assert.throws(() => evaluateEvidence(nested, NOW), /EVIDENCIA_INVALIDA/);
  const controls = fixture(); controls.controls.extra = 'DO_NOT_EXPOSE';
  assert.throws(() => evaluateEvidence(controls, NOW), /EVIDENCIA_INVALIDA/);
});

test('recusa numeros negativos/decimais e chaves ausentes', () => {
  const input = fixture(); input.http.auth['402'] = -1;
  assert.throws(() => evaluateEvidence(input, NOW), /EVIDENCIA_INVALIDA/);
  const input2 = fixture(); input2.http.storage['200'] = 0.5;
  assert.throws(() => evaluateEvidence(input2, NOW), /EVIDENCIA_INVALIDA/);
  const input3 = fixture(); delete input3.controls.auth_hooks_disabled;
  assert.throws(() => evaluateEvidence(input3, NOW), /EVIDENCIA_INVALIDA/);
});

test('logs não servem para atestar configurações gerenciadas', () => {
  const input = fixture();
  input.http = Object.fromEntries(['auth', 'storage', 'other'].map((area) => [area, {'200': 1, '402': 0}]));
  input.controls = Object.fromEntries(CHECKS.map((key) => [key, 'SIM']));
  const result = evaluateEvidence(input, NOW);
  assert.equal(result.status, 'NO_GO');
  assert.ok(result.motivos.includes('LOGS_NAO_COMPROVAM_CONFIGURACOES_GERENCIADAS'));
});

test('evidencia expirada ou futura nao pode avançar para revisão', () => {
  const input = fixture();
  input.evidence_source = 'sanitized-dashboard';
  input.controls = Object.fromEntries(CHECKS.map((key) => [key, 'SIM']));
  input.http = Object.fromEntries(['auth', 'storage', 'other'].map((area) => [area, {'200': 1, '402': 0}]));
  input.observed_at = '2026-11-12T14:00:00Z';
  assert.ok(evaluateEvidence(input, NOW).motivos.includes('EVIDENCIA_DESATUALIZADA'));
  input.observed_at = '2026-11-14T16:20:00Z';
  assert.ok(evaluateEvidence(input, NOW).motivos.includes('EVIDENCIA_NO_FUTURO'));
  input.observed_at = '2026-02-31T16:00:00Z';
  assert.throws(() => evaluateEvidence(input, NOW), /EVIDENCIA_INVALIDA/);
});

test('HTTP 200 em outras rotas nao comprova Auth ou Storage', () => {
  const input = fixture();
  input.evidence_source = 'sanitized-dashboard';
  input.http.auth = {'200': 0, '402': 0};
  input.http.storage = {'200': 0, '402': 0};
  input.http.other = {'200': 4, '402': 0};
  input.controls = Object.fromEntries(CHECKS.map((key) => [key, 'SIM']));
  const result = evaluateEvidence(input, NOW);
  assert.equal(result.status, 'NO_GO');
  assert.ok(result.motivos.includes('AUTH_SEM_HTTP_200_OBSERVADO'));
  assert.ok(result.motivos.includes('STORAGE_SEM_HTTP_200_OBSERVADO'));
});

test('CLI imprime apenas saida sanitizada', () => {
  const dir = mkdtempSync(join(tmpdir(), 'meg09-'));
  try {
    const file = join(dir, 'observacoes.json');
    const current = fixture(); current.observed_at = new Date().toISOString();
    writeFileSync(file, JSON.stringify(current));
    const proc = spawnSync(process.execPath, [script, '--input', file], {encoding:'utf8'});
    assert.equal(proc.status, 0);
    assert.equal(JSON.parse(proc.stdout).http_402, 10);
    assert.equal(proc.stderr, '');
    writeFileSync(file, JSON.stringify({...current, suspicious_credential: 'SECRET_CANARY'}));
    const invalid = spawnSync(process.execPath, [script, '--input', file], {encoding:'utf8'});
    assert.equal(invalid.status, 3);
    assert.equal(invalid.stdout, '');
    assert.ok(!invalid.stderr.includes('SECRET_CANARY'));
    assert.ok(!invalid.stderr.includes(dir));
  } finally { rmSync(dir, {recursive:true, force:true}); }
});
