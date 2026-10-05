import fs from 'node:fs';
import path from 'node:path';

function fail(message) {
  console.error(`EVOLUTION SECURITY CONTRACT FAILED: ${message}`);
  process.exitCode = 1;
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(?:ts|tsx|js|jsx|html)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const evolutionRoot = 'apps/web/src/evolution';
const files = [...walk(evolutionRoot), 'apps/web/evolution.html'];

const forbidden = [
  { label: 'dangerouslySetInnerHTML', re: /dangerouslySetInnerHTML/ },
  { label: 'innerHTML assignment', re: /\.innerHTML\s*=/ },
  { label: 'insertAdjacentHTML', re: /insertAdjacentHTML\s*\(/ },
  { label: 'eval', re: /\beval\s*\(/ },
  { label: 'new Function', re: /\bnew\s+Function\s*\(/ },
  { label: 'document.write', re: /document\.write\s*\(/ },
  { label: 'javascript URL', re: /javascript\s*:/i },
];

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  for (const rule of forbidden) {
    if (rule.re.test(source)) fail(`${rule.label} encontrado em ${file}`);
  }
}

const authClientPath = 'apps/web/src/app/auth-client.ts';
const authClient = fs.readFileSync(authClientPath, 'utf8');

if (!/sessionStorage\.setItem\(SESSION_KEY/.test(authClient)) {
  fail('sessão Web deve ser persistida apenas em sessionStorage.');
}
if (/localStorage\.setItem\(SESSION_KEY/.test(authClient)) {
  fail('access/refresh token não pode ser persistido em localStorage.');
}
if (!/localStorage\.removeItem\(SESSION_KEY/.test(authClient)) {
  fail('migração/limpeza de sessão antiga em localStorage deve permanecer.');
}

const parityPath = 'apps/web/src/evolution/screens/EvolutionParityPanels.tsx';
const parity = fs.readFileSync(parityPath, 'utf8');

if (!/new Set\(\['image\/png','image\/jpeg','image\/webp'\]\)/.test(parity)) {
  fail('upload de avatar deve manter allowlist explícita de MIME.');
}
if (!/file\.size>450000/.test(parity)) {
  fail('upload de avatar deve manter limite de tamanho.');
}
if (!/expectedPrefix/.test(parity)) {
  fail('upload de avatar deve validar coerência do data URL com o MIME declarado.');
}

const analyticsStart = parity.indexOf('export function EvolutionAnalytics');
const nextExport = parity.indexOf('\nexport function ', analyticsStart + 1);
const analytics = analyticsStart >= 0
  ? parity.slice(analyticsStart, nextExport >= 0 ? nextExport : parity.length)
  : '';

if (!analytics) {
  fail('bloco EvolutionAnalytics/Financial Copilot não encontrado.');
} else {
  if (/\bfetch\s*\(|authenticatedRequest\s*\(|openai|anthropic|gemini|llm/i.test(analytics)) {
    fail('Financial Copilot atual deve permanecer determinístico e sem chamada externa de IA até revisão arquitetural explícita.');
  }
  if (!/Nenhuma movimentação é feita pelo Copilot/.test(analytics)) {
    fail('Financial Copilot deve declarar a fronteira sem mutação financeira.');
  }
}

if (process.exitCode) process.exit(process.exitCode);
console.log('Evolution security contract: DOM sinks, sessão, upload e Copilot validados.');
