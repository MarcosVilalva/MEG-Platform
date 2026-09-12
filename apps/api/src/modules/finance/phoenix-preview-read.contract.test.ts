import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routes = readFileSync(new URL('./phoenix-preview-routes.ts', import.meta.url), 'utf8');
const readModel = readFileSync(new URL('./phoenix-preview-read.ts', import.meta.url), 'utf8');
const financeRoutes = readFileSync(new URL('./routes.ts', import.meta.url), 'utf8');

assert.match(routes, /app\.get\('\/phoenix-preview'/,
  'O preview Phoenix deve ser exposto somente por GET.');
assert.doesNotMatch(routes, /app\.(?:post|put|patch|delete)\(/,
  'O namespace do preview não pode expor mutações.');
assert.match(routes, /getPhoenixPreviewReadModel\(request\.user\.sub, parsed\.data\.month\)/,
  'A leitura deve permanecer escopada ao usuário autenticado e ao mês solicitado.');

for (const mutation of [
  /\.create\s*\(/,
  /\.createMany\s*\(/,
  /\.update\s*\(/,
  /\.updateMany\s*\(/,
  /\.delete\s*\(/,
  /\.deleteMany\s*\(/,
  /\.upsert\s*\(/,
]) {
  assert.doesNotMatch(readModel, mutation,
    `O read-model Phoenix não pode executar mutação Prisma: ${mutation}`);
}
assert.doesNotMatch(readModel, /migrateLegacyCards|materializeRecurring/i,
  'A leitura do preview não pode disparar manutenção ou materialização.');
assert.match(readModel, /archivedAt:\s*null/,
  'A projeção financeira do preview deve ignorar a sombra importada arquivada.');
assert.match(readModel, /where:\s*\{\s*userId\s*\}/,
  'Catálogos do preview devem ser escopados por proprietário.');
assert.match(readModel, /type:\s*'benefit'/,
  'Benefício deve permanecer separado do caixa monetário.');
assert.match(financeRoutes, /registerPhoenixPreviewReads\(app\)/,
  'O endpoint de leitura isolado deve estar registrado sem substituir rotas existentes.');

console.log('Contrato somente leitura do preview Phoenix validado.');
