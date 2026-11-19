import { pathToFileURL } from 'node:url';

/**
 * Stage10 Gate1, pure local comparison. NEVER send private inputs to CI, GitHub,
 * hosted runners, chat, logs or artifacts. No DB/network/file writers.
 * The existing read-only PSQL query is the authority for these field names.
 */
const LABELS = ['A', 'B', 'C'];
const COUNTERS = Object.freeze({
  categorias_unicas: 1,
  meios_unicos: 1,
  espelhos_exatos: 1,
  ledger: 0,
  recibos: 0,
  baixas: 0,
  importacoes: 0,
});
const FINGERPRINTS = [
  'event_fingerprint',
  'account_fingerprint',
  'category_fingerprint',
  'payment_fingerprint',
  'source_fingerprint',
];
const EXPECTED_FIELDS = ['padrao', 'elegibilidade', ...Object.keys(COUNTERS), ...FINGERPRINTS];
const EXPECTED_SET = new Set(EXPECTED_FIELDS);
const HASH_RE = /^[0-9a-f]{32}$/;

const obj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const validKeys = (row) =>
  Object.keys(row).length === EXPECTED_FIELDS.length && Object.keys(row).every((key) => EXPECTED_SET.has(key));

function normalizeRows(rows) {
  if (!Array.isArray(rows) || rows.length !== 3) return { code: 'INVALID_ROW_COUNT' };
  const out = new Map();
  for (const row of rows) {
    if (!obj(row) || !validKeys(row)) return { code: 'UNEXPECTED_FIELD_OR_MISSING_FIELD' };
    if (!LABELS.includes(row.padrao) || out.has(row.padrao)) return { code: 'INVALID_OR_DUPLICATE_PATTERN' };
    if (row.elegibilidade !== 'PASS') return { code: 'PATTERN_NOT_ELIGIBLE' };
    for (const [field, expected] of Object.entries(COUNTERS)) {
      // PSQL JSON serializers may represent bigint counts as strings.
      if (row[field] !== expected && row[field] !== String(expected)) return { code: 'INVARIANT_COUNTER_MISMATCH' };
    }
    for (const field of FINGERPRINTS) {
      if (typeof row[field] !== 'string' || !HASH_RE.test(row[field])) return { code: 'INVALID_FINGERPRINT' };
    }
    out.set(row.padrao, row);
  }
  if (out.size !== 3 || LABELS.some((label) => !out.has(label))) return { code: 'MISSING_PATTERN' };
  return { rows: out };
}

/** Return only status and public field labels, never hashes, IDs or values. */
export function compareStage10Lote03Private(input) {
  if (!obj(input) || Object.keys(input).length !== 2 || !Object.keys(input).every((k) => k === 'current' || k === 'local')) {
    return { ok: false, reason: 'INVALID_PRIVATE_INPUT_SHAPE' };
  }
  const current = normalizeRows(input.current);
  const local = normalizeRows(input.local);
  if (current.code) return { ok: false, reason: 'CURRENT_' + current.code };
  if (local.code) return { ok: false, reason: 'LOCAL_' + local.code };
  for (const label of LABELS) {
    const expected = current.rows.get(label);
    const actual = local.rows.get(label);
    for (const field of FINGERPRINTS) {
      if (expected[field] !== actual[field]) {
        return { ok: false, reason: 'FINGERPRINT_MISMATCH', pattern: label, field };
      }
    }
  }
  return { ok: true, result: 'THREE_PATTERNS_FIVE_FINGERPRINTS_MATCH', patterns: 3, fieldsPerPattern: 5 };
}

// Opt-in local stdin mode: no payload or hash may ever be printed, including on invalid JSON.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let result;
  if (process.env.MEG_STAGE10_PRIVATE_OFFLINE_ACK !== '1' || process.env.GITHUB_ACTIONS === 'true' || process.env.CI === 'true') {
    result = { ok: false, reason: 'PRIVATE_LOCAL_ONLY_GUARD' };
  } else {
    try {
      const parts = [];
      let length = 0;
      for await (const part of process.stdin) {
        length += part.length;
        if (length > 32768) throw new Error('INPUT_TOO_LARGE');
        parts.push(part);
      }
      const payload = JSON.parse(Buffer.concat(parts).toString('utf8'));
      result = compareStage10Lote03Private(payload);
    } catch {
      result = { ok: false, reason: 'PRIVATE_INPUT_UNREADABLE' };
    }
  }
  console.log('MEG_STAGE10_LOTE03_PRIVATE_GATE1=' + (result.ok ? 'PASS' : 'BLOCKED'));
  console.log('MEG_STAGE10_LOTE03_PRIVATE_REASON=' + (result.ok ? result.result : result.reason));
  if (!result.ok && result.pattern) console.log('MEG_STAGE10_LOTE03_PRIVATE_PATTERN=' + result.pattern);
  if (!result.ok && result.field) console.log('MEG_STAGE10_LOTE03_PRIVATE_FIELD=' + result.field);
  process.exitCode = result.ok ? 0 : 3;
}
