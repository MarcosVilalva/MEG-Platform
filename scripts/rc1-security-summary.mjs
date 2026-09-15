import { readFileSync } from 'node:fs';

const path = process.argv[2] || 'rc1-npm-audit.json';
let report;
try {
  report = JSON.parse(readFileSync(path, 'utf8'));
} catch (error) {
  console.error(`Não foi possível ler o inventário de segurança em ${path}.`);
  throw error;
}

const counts = report?.metadata?.vulnerabilities || {};
const vulnerabilities = Object.entries(report?.vulnerabilities || {}).map(([name, item]) => ({ name, ...item }));
const weight = { critical: 5, high: 4, moderate: 3, low: 2, info: 1 };
vulnerabilities.sort((left, right) => (weight[right.severity] || 0) - (weight[left.severity] || 0) || left.name.localeCompare(right.name));

function fixLabel(value) {
  if (value === true) return 'sim';
  if (!value) return 'não';
  if (typeof value === 'object') {
    const name = value.name || '';
    const version = value.version || '';
    const breaking = value.isSemVerMajor ? ' · major' : '';
    return [name, version].filter(Boolean).join('@') + breaking;
  }
  return String(value);
}

function viaLabel(via) {
  if (!Array.isArray(via)) return '';
  return via.map((entry) => typeof entry === 'string' ? entry : entry?.title || entry?.name || entry?.source || '')
    .filter(Boolean)
    .slice(0, 3)
    .join(' · ');
}

const total = Number(counts.total || vulnerabilities.length || 0);
console.log('# MEG RC1 — Inventário de segurança de dependências');
console.log('');
console.log(`Total: **${total}** · Críticas: **${Number(counts.critical || 0)}** · Altas: **${Number(counts.high || 0)}** · Moderadas: **${Number(counts.moderate || 0)}** · Baixas: **${Number(counts.low || 0)}**`);
console.log('');
console.log('Este arquivo é um inventário automatizado do `npm audit`. Ele não declara explorabilidade no MEG e não autoriza `npm audit fix --force`. Cada item crítico/alto deve ser triado antes da promoção oficial.');
console.log('');
console.log('| Severidade | Pacote | Direta | Faixa afetada | Correção npm | Origem resumida |');
console.log('|---|---|---:|---|---|---|');
for (const item of vulnerabilities) {
  const via = viaLabel(item.via).replaceAll('|', '\\|');
  console.log(`| ${item.severity || '—'} | ${item.name} | ${item.isDirect ? 'sim' : 'não'} | ${String(item.range || '—').replaceAll('|', '\\|')} | ${fixLabel(item.fixAvailable).replaceAll('|', '\\|')} | ${via || '—'} |`);
}

const blockers = vulnerabilities.filter((item) => item.severity === 'critical' || item.severity === 'high');
console.log('');
console.log(`## Bloqueadores RC1: ${blockers.length}`);
if (!blockers.length) {
  console.log('Nenhuma dependência crítica/alta foi reportada nesta execução.');
} else {
  for (const item of blockers) {
    console.log(`- **${item.name}** — ${item.severity}; ${item.isDirect ? 'dependência direta' : 'transitiva'}; correção npm: ${fixLabel(item.fixAvailable)}${viaLabel(item.via) ? `; ${viaLabel(item.via)}` : ''}.`);
  }
}
