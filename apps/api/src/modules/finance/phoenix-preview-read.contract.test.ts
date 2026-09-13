import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routes = readFileSync(new URL('./phoenix-preview-routes.ts', import.meta.url), 'utf8');
const snapshot = readFileSync(new URL('./phoenix-preview-snapshot.ts', import.meta.url), 'utf8');
const periodEvents = readFileSync(new URL('./phoenix-preview-events.ts', import.meta.url), 'utf8');
const financeRoutes = readFileSync(new URL('./routes.ts', import.meta.url), 'utf8');

assert.match(routes, /app\.get\('\/phoenix-preview'/,
  'O preview Phoenix deve ser exposto somente por GET.');
assert.match(routes, /app\.get\('\/phoenix-preview\/events'/,
  'O seletor global deve possuir uma leitura dedicada e somente leitura para eventos de período.');
assert.doesNotMatch(routes, /app\.(?:post|put|patch|delete)\(/,
  'O namespace do preview não pode expor mutações.');
assert.match(routes, /getPhoenixPreviewSnapshot\(request\.user\.sub, parsed\.data\.month\)/,
  'O snapshot deve permanecer escopado ao usuário autenticado e ao mês solicitado.');
assert.match(routes, /listPhoenixPreviewEvents\(request\.user\.sub, parsed\.data\)/,
  'A leitura de período deve permanecer escopada ao usuário autenticado.');

for (const mutation of [
  /\.create\s*\(/,
  /\.createMany\s*\(/,
  /\.update\s*\(/,
  /\.updateMany\s*\(/,
  /\.delete\s*\(/,
  /\.deleteMany\s*\(/,
  /\.upsert\s*\(/,
]) {
  assert.doesNotMatch(snapshot, mutation,
    `O snapshot Phoenix não pode executar mutação Prisma: ${mutation}`);
  assert.doesNotMatch(periodEvents, mutation,
    `A leitura de eventos por período não pode executar mutação Prisma: ${mutation}`);
}
assert.doesNotMatch(snapshot, /migrateLegacyCards|materializeRecurring/i,
  'O snapshot do preview não pode disparar manutenção ou materialização.');
assert.doesNotMatch(periodEvents, /migrateLegacyCards|materializeRecurring/i,
  'A leitura de período não pode disparar manutenção ou materialização.');
assert.match(snapshot, /archivedAt:\s*null/,
  'A projeção financeira do preview deve ignorar a sombra importada arquivada.');
assert.match(periodEvents, /archivedAt:\s*null/,
  'A leitura de período deve ignorar a sombra importada arquivada.');
assert.match(periodEvents, /userId/,
  'A leitura de período deve ser escopada por proprietário.');
assert.match(snapshot, /prisma\.account\.findMany\(\{ where: \{ userId \}/,
  'Catálogos e contas do snapshot devem ser escopados por proprietário.');
assert.match(snapshot, /single-core-event-read/,
  'Resumo, análises, fluxo e benefício devem declarar a agregação consolidada.');
assert.match(snapshot, /benefitOpeningBalance/,
  'Benefício deve permanecer separado do caixa monetário.');
assert.match(snapshot, /loadCoreEvents\(userId, end\)/,
  'O snapshot deve reutilizar uma única leitura histórica mínima para os cálculos derivados.');
assert.doesNotMatch(snapshot, /canonicalSummary\(|canonicalCashflow\(|canonicalAnalytics\(/,
  'O snapshot consolidado não pode reintroduzir cálculos canônicos independentes e repetidos.');
assert.match(financeRoutes, /registerPhoenixPreviewReads\(app\)/,
  'O endpoint de leitura isolado deve estar registrado sem substituir rotas existentes.');

console.log('Contrato somente leitura e snapshot consolidado da Phoenix validado.');
