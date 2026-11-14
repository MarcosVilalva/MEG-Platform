#!/usr/bin/env node
/**
 * MEG Etapa 09: avaliação OFFLINE de evidências previamente sanitizadas.
 * Não realiza requisições HTTP, não autentica e nunca decide Gate 1 = PASS.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const SANDBOX_REF = 'oxwmqbzeuiibdlkcbjzv';
export const CHECKS = Object.freeze([
  'auth_email_delivery_blocked',
  'sms_delivery_blocked',
  'custom_auth_providers_disabled',
  'auth_hooks_disabled',
  'storage_external_connections_absent',
  'realtime_disabled_or_private',
  'external_egress_isolated',
  'operational_services_verified',
]);

const EVIDENCE_SOURCES = new Set(['sanitized-dashboard', 'aggregated-logs', 'synthetic-fixture']);
const ANSWERS = new Set(['SIM', 'NAO', 'NAO_VERIFICADO']);
const AREAS = Object.freeze(['auth', 'storage', 'other']);
const HTTP_STATUSES = Object.freeze(['200', '402']);
const MAX_BYTES = 12_288;

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function exactKeys(value, expected) {
  return isPlainObject(value) && Object.keys(value).length === expected.length
    && expected.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function invalid() {
  // Nunca imprimir a entrada: pode conter chave, endereço ou dado sigiloso.
  throw new Error('EVIDENCIA_INVALIDA_OU_NAO_SANITIZADA');
}

export function evaluateEvidence(input) {
  if (!exactKeys(input, ['schema_version', 'project_ref', 'evidence_source', 'observed_at', 'http', 'controls'])) invalid();
  if (input.schema_version !== 1 || input.project_ref !== SANDBOX_REF) invalid();
  if (!EVIDENCE_SOURCES.has(input.evidence_source)) invalid();
  if (typeof input.observed_at !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(input.observed_at)
      || !Number.isFinite(Date.parse(input.observed_at))) invalid();
  if (!exactKeys(input.http, AREAS) || !exactKeys(input.controls, CHECKS)) invalid();

  let total200 = 0;
  let total402 = 0;
  for (const area of AREAS) {
    const counts = input.http[area];
    if (!exactKeys(counts, HTTP_STATUSES)) invalid();
    for (const status of HTTP_STATUSES) {
      if (!Number.isSafeInteger(counts[status]) || counts[status] < 0) invalid();
    }
    total200 += counts['200'];
    total402 += counts['402'];
  }
  if (!Number.isSafeInteger(total200) || !Number.isSafeInteger(total402)) invalid();

  const pending = CHECKS.filter((key) => input.controls[key] === 'NAO_VERIFICADO');
  const contradicted = CHECKS.filter((key) => input.controls[key] === 'NAO');
  if (CHECKS.some((key) => !ANSWERS.has(input.controls[key]))) invalid();
  const reasons = [];
  if (total402 > 0) reasons.push('HTTP_402_OBSERVADO');
  if (pending.length > 0) reasons.push('CONTROLES_NAO_VERIFICADOS');
  if (contradicted.length > 0) reasons.push('ISOLAMENTO_NAO_COMPROVADO');
  if (input.evidence_source === 'synthetic-fixture') reasons.push('EVIDENCIA_SINTETICA');
  if (total200 === 0) reasons.push('NENHUM_HTTP_200_OBSERVADO');
  const status = reasons.length > 0 ? 'NO_GO' : 'REVISAO_MANUAL_OBRIGATORIA';

  return Object.freeze({
    project_ref: SANDBOX_REF,
    observed_at: input.observed_at,
    status,
    gate1: 'PARCIAL',
    gate2: 'NO_GO',
    gate3: 'NO_GO',
    gate4: 'NO_GO',
    http_200: total200,
    http_402: total402,
    controles_pendentes: pending,
    controles_contraditorios: contradicted,
    motivos: reasons,
    acesso_remoto: false,
    autorizacao_para_restore: false,
  });
}

async function main() {
  if (process.argv.length !== 4 || process.argv[2] !== '--input') invalid();
  const path = process.argv[3];
  if (typeof path !== 'string' || path.startsWith('-')) invalid();
  const data = await readFile(path);
  if (data.byteLength > MAX_BYTES) invalid();
  const input = JSON.parse(data.toString('utf8'));
  const result = evaluateEvidence(input);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(() => {
    process.stderr.write('EVIDENCIA_INVALIDA_OU_NAO_SANITIZADA\n');
    process.exitCode = 3;
  });
}
