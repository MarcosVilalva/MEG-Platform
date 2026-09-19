import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const AUDIT_URL = 'https://registry.npmjs.org/-/npm/v1/security/advisories/bulk';
const severityWeight = { info: 1, low: 2, moderate: 3, high: 4, critical: 5 };
const auditLevelArg = process.argv.find((arg) => arg.startsWith('--audit-level='));
const auditLevel = auditLevelArg?.split('=')[1] || 'low';
const jsonOutput = process.argv.includes('--json');

if (!(auditLevel in severityWeight)) {
  console.error(`Nível de auditoria inválido: ${auditLevel}`);
  process.exit(2);
}

const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const packages = lock.packages || {};

function packageNameFromPath(path) {
  const marker = 'node_modules/';
  const index = path.lastIndexOf(marker);
  if (index < 0) return null;
  return path.slice(index + marker.length) || null;
}

const payloadSets = new Map();
const direct = new Set();
let prod = 0;
let dev = 0;
let optional = 0;
let peer = 0;

for (const [path, meta] of Object.entries(packages)) {
  if (!meta || typeof meta !== 'object') continue;

  if (!path.includes('node_modules/')) {
    for (const section of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
      for (const name of Object.keys(meta[section] || {})) direct.add(name);
    }
    continue;
  }

  const name = meta.name || packageNameFromPath(path);
  const version = meta.version;
  if (!name || !version) continue;

  const versions = payloadSets.get(name) || new Set();
  versions.add(String(version));
  payloadSets.set(name, versions);

  if (meta.dev) dev += 1;
  else if (meta.optional) optional += 1;
  else if (meta.peer) peer += 1;
  else prod += 1;
}

const payload = Object.fromEntries(
  [...payloadSets.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, versions]) => [name, [...versions].sort()])
);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeBody(buffer, headers) {
  const encoding = String(headers.get('content-encoding') || '').toLowerCase();
  let body = Buffer.from(buffer);

  // npm registry briefly served gzip payloads without Content-Encoding.
  // Detect gzip magic bytes as a defensive fallback.
  if (encoding.includes('gzip') || (body[0] === 0x1f && body[1] === 0x8b)) {
    try {
      body = gunzipSync(body);
    } catch {
      // Fetch implementations may already have transparently decompressed it.
    }
  }

  return body.toString('utf8');
}

async function fetchBulkAdvisories() {
  let lastError = null;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20_000);
      const response = await fetch(AUDIT_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'accept': 'application/json',
          'accept-encoding': 'identity',
          'user-agent': 'MEG-Platform-CI-security-gate/1.0'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeout);

      const raw = await response.arrayBuffer();
      const text = decodeBody(raw, response.headers);

      if (!response.ok) {
        throw new Error(`npm bulk advisory respondeu HTTP ${response.status}: ${text.slice(0, 500)}`);
      }

      try {
        return JSON.parse(text);
      } catch (error) {
        throw new Error(`Resposta inválida do npm bulk advisory: ${error instanceof Error ? error.message : String(error)}`);
      }
    } catch (error) {
      lastError = error;
      if (attempt < 4) await sleep(700 * attempt);
    }
  }
  throw lastError || new Error('Falha desconhecida ao consultar o npm bulk advisory.');
}

function normalizeSeverity(value) {
  const severity = String(value || 'info').toLowerCase();
  return severity in severityWeight ? severity : 'info';
}

function buildReport(advisories) {
  const vulnerabilities = {};
  const counts = { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 };

  for (const [name, items] of Object.entries(advisories || {})) {
    if (!Array.isArray(items) || !items.length) continue;

    const normalized = items.map((item) => ({
      source: item.id ?? item.source ?? item.url ?? name,
      name,
      dependency: name,
      title: item.title || 'Advisory npm',
      url: item.url || null,
      severity: normalizeSeverity(item.severity),
      range: item.vulnerable_versions || item.range || '*',
      cwe: item.cwe || [],
      cvss: item.cvss || null
    }));

    const severity = normalized
      .map((item) => item.severity)
      .sort((left, right) => severityWeight[right] - severityWeight[left])[0] || 'info';

    vulnerabilities[name] = {
      name,
      severity,
      isDirect: direct.has(name),
      via: normalized,
      effects: [],
      range: [...new Set(normalized.map((item) => item.range))].join(' || '),
      nodes: payload[name] || [],
      fixAvailable: false
    };

    counts[severity] += 1;
    counts.total += 1;
  }

  return {
    auditReportVersion: 2,
    generatedAt: new Date().toISOString(),
    source: 'npm-bulk-advisory',
    vulnerabilities,
    metadata: {
      vulnerabilities: counts,
      dependencies: {
        prod,
        dev,
        optional,
        peer,
        peerOptional: 0,
        total: prod + dev + optional + peer
      }
    }
  };
}

try {
  if (!Object.keys(payload).length) {
    throw new Error('Nenhuma dependência versionada foi encontrada no package-lock.json.');
  }

  const advisories = await fetchBulkAdvisories();
  const report = buildReport(advisories);
  const blockers = Object.values(report.vulnerabilities)
    .filter((item) => severityWeight[item.severity] >= severityWeight[auditLevel]);

  if (jsonOutput) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else {
    const counts = report.metadata.vulnerabilities;
    console.log(`Security gate via npm Bulk Advisory: ${counts.total} pacote(s) com advisory.`);
    console.log(`Críticas: ${counts.critical} · Altas: ${counts.high} · Moderadas: ${counts.moderate} · Baixas: ${counts.low} · Info: ${counts.info}`);
    if (blockers.length) {
      console.error(`Bloqueado por ${blockers.length} pacote(s) em nível ${auditLevel} ou superior:`);
      for (const item of blockers) {
        console.error(`- ${item.name}: ${item.severity} · ${item.via.map((via) => via.title).slice(0, 3).join(' · ')}`);
      }
    } else {
      console.log(`Gate aprovado: nenhum advisory em nível ${auditLevel} ou superior.`);
    }
  }

  if (blockers.length) process.exitCode = 1;
} catch (error) {
  console.error('Falha fechada no security gate de dependências.');
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 2;
}
