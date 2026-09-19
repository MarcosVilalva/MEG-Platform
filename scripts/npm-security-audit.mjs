import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const NPM_AUDIT_URL = 'https://registry.npmjs.org/-/npm/v1/security/advisories/bulk';
const OSV_BATCH_URL = 'https://api.osv.dev/v1/querybatch';
const OSV_VULN_URL = 'https://api.osv.dev/v1/vulns/';
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

const packageVersionPairs = Object.entries(payload)
  .flatMap(([name, versions]) => versions.map((version) => ({ name, version })));

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeBody(buffer, headers) {
  const encoding = String(headers.get('content-encoding') || '').toLowerCase();
  let body = Buffer.from(buffer);

  if (encoding.includes('gzip') || (body[0] === 0x1f && body[1] === 0x8b)) {
    try {
      body = gunzipSync(body);
    } catch {
      // Alguns clientes já descompactam automaticamente quando o cabeçalho está correto.
    }
  }

  return body.toString('utf8');
}

async function fetchJson(url, init, label, attempts = 4) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20_000);
      const response = await fetch(url, {
        ...init,
        headers: {
          accept: 'application/json',
          'accept-encoding': 'identity',
          'user-agent': 'MEG-Platform-CI-security-gate/2.0',
          ...(init?.headers || {})
        },
        signal: controller.signal
      });
      clearTimeout(timeout);

      const raw = await response.arrayBuffer();
      const text = decodeBody(raw, response.headers);

      if (!response.ok) {
        throw new Error(`${label} respondeu HTTP ${response.status}: ${text.slice(0, 500)}`);
      }

      try {
        return JSON.parse(text);
      } catch (error) {
        throw new Error(`Resposta inválida de ${label}: ${error instanceof Error ? error.message : String(error)}`);
      }
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(700 * attempt);
    }
  }
  throw lastError || new Error(`Falha desconhecida ao consultar ${label}.`);
}

async function fetchNpmBulkAdvisories() {
  return fetchJson(NPM_AUDIT_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  }, 'npm Bulk Advisory');
}

function normalizeSeverity(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'medium') return 'moderate';
  if (raw in severityWeight) return raw;
  return null;
}

function numericSeverity(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return null;
  if (score >= 9) return 'critical';
  if (score >= 7) return 'high';
  if (score >= 4) return 'moderate';
  if (score > 0) return 'low';
  return 'info';
}

function osvSeverity(detail, packageName) {
  const directSeverity = normalizeSeverity(detail?.database_specific?.severity);
  if (directSeverity) return directSeverity;

  for (const affected of detail?.affected || []) {
    if (affected?.package?.name !== packageName) continue;
    const ecosystemSeverity = normalizeSeverity(affected?.ecosystem_specific?.severity);
    if (ecosystemSeverity) return ecosystemSeverity;
  }

  const cvssNumber = numericSeverity(detail?.database_specific?.cvss?.score);
  if (cvssNumber) return cvssNumber;

  for (const entry of detail?.severity || []) {
    const asNumber = numericSeverity(entry?.score);
    if (asNumber) return asNumber;
  }

  // Se há vulnerabilidade confirmada, mas a fonte não fornece uma classificação
  // qualitativa utilizável, tratamos como alta para não criar falso negativo.
  return 'high';
}

function osvRange(detail, packageName, version) {
  const affected = (detail?.affected || []).find((item) => item?.package?.name === packageName);
  if (!affected) return version;

  const explicit = Array.isArray(affected.versions) && affected.versions.length
    ? affected.versions.join(', ')
    : '';
  if (explicit) return explicit;

  const ranges = (affected.ranges || []).flatMap((range) =>
    (range.events || []).map((event) => {
      if (event.introduced !== undefined) return `>=${event.introduced}`;
      if (event.fixed !== undefined) return `<${event.fixed}`;
      if (event.last_affected !== undefined) return `<=${event.last_affected}`;
      if (event.limit !== undefined) return `<${event.limit}`;
      return '';
    }).filter(Boolean)
  );
  return ranges.join(' ') || version;
}

async function fetchOsvFallback() {
  const queries = packageVersionPairs.map(({ name, version }) => ({
    package: { ecosystem: 'npm', name },
    version
  }));

  const pairVulns = new Map();
  for (let offset = 0; offset < queries.length; offset += 1000) {
    const chunk = queries.slice(offset, offset + 1000);
    const response = await fetchJson(OSV_BATCH_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ queries: chunk })
    }, 'OSV querybatch', 3);

    const results = response?.results || [];
    for (let index = 0; index < chunk.length; index += 1) {
      const pair = packageVersionPairs[offset + index];
      const ids = (results[index]?.vulns || []).map((item) => item.id).filter(Boolean);
      if (ids.length) pairVulns.set(`${pair.name}@${pair.version}`, { ...pair, ids });
    }
  }

  const ids = [...new Set([...pairVulns.values()].flatMap((item) => item.ids))];
  const details = new Map();
  const concurrency = 12;
  let cursor = 0;

  async function worker() {
    while (cursor < ids.length) {
      const index = cursor;
      cursor += 1;
      const id = ids[index];
      const detail = await fetchJson(`${OSV_VULN_URL}${encodeURIComponent(id)}`, { method: 'GET' }, `OSV ${id}`, 3);
      details.set(id, detail);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, ids.length || 1) }, () => worker()));

  const advisories = {};
  for (const item of pairVulns.values()) {
    const list = advisories[item.name] || [];
    for (const id of item.ids) {
      const detail = details.get(id);
      if (!detail) continue;
      const key = `${id}|${item.version}`;
      if (list.some((entry) => entry.__key === key)) continue;
      list.push({
        __key: key,
        id,
        url: (detail.references || []).find((ref) => ref?.url)?.url || `https://osv.dev/vulnerability/${id}`,
        title: detail.summary || id,
        severity: osvSeverity(detail, item.name),
        vulnerable_versions: osvRange(detail, item.name, item.version),
        aliases: detail.aliases || []
      });
    }
    if (list.length) advisories[item.name] = list;
  }

  return advisories;
}

function buildReport(advisories, source) {
  const vulnerabilities = {};
  const counts = { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 };

  for (const [name, items] of Object.entries(advisories || {})) {
    if (!Array.isArray(items) || !items.length) continue;

    const normalized = items.map((item) => ({
      source: item.id ?? item.source ?? item.url ?? name,
      name,
      dependency: name,
      title: item.title || 'Advisory de segurança',
      url: item.url || null,
      severity: normalizeSeverity(item.severity) || 'high',
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
    source,
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

  let advisories;
  let source = 'npm-bulk-advisory';
  let npmFailure = null;

  try {
    advisories = await fetchNpmBulkAdvisories();
  } catch (error) {
    npmFailure = error;
    source = 'osv-fallback';
    if (!jsonOutput) {
      console.warn(`npm Bulk Advisory indisponível; acionando fallback OSV: ${error instanceof Error ? error.message : String(error)}`);
    }
    advisories = await fetchOsvFallback();
  }

  const report = buildReport(advisories, source);
  if (npmFailure) report.primarySourceFailure = npmFailure instanceof Error ? npmFailure.message : String(npmFailure);

  const blockers = Object.values(report.vulnerabilities)
    .filter((item) => severityWeight[item.severity] >= severityWeight[auditLevel]);

  if (jsonOutput) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else {
    const counts = report.metadata.vulnerabilities;
    console.log(`Security gate via ${source}: ${counts.total} pacote(s) com advisory.`);
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
