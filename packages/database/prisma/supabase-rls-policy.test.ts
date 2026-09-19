import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const schema = readFileSync(new URL('./schema.prisma', import.meta.url), 'utf8');
const sql = readFileSync(new URL('./supabase-rls-hardening.sql', import.meta.url), 'utf8');

const models = [...schema.matchAll(/^model\s+(\w+)/gm)].map((match) => match[1]);
assert.ok(models.length > 0, 'schema.prisma deve conter modelos protegidos');

for (const model of models) {
  assert.match(
    sql,
    new RegExp(`ALTER TABLE public\\."${model}" ENABLE ROW LEVEL SECURITY;`),
    `RLS deve ser habilitado explicitamente em ${model}`,
  );
  assert.match(
    sql,
    new RegExp(`public\\."${model}"`),
    `A lista de REVOKE deve incluir ${model}`,
  );
}

assert.match(sql, /FROM anon, authenticated;/,
  'anon e authenticated devem ser bloqueados no Data API');
assert.match(sql, /ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public/,
  'futuras tabelas criadas pelo Prisma devem nascer sem grants diretos ao Data API');
assert.doesNotMatch(sql, /FORCE ROW LEVEL SECURITY/,
  'FORCE RLS quebraria o backend enquanto Prisma usa postgres/BYPASSRLS');
assert.doesNotMatch(sql, /auth\.uid\s*\(/,
  'não criar políticas Supabase Auth em uma aplicação que usa autenticação própria');

console.log(`Supabase RLS hardening contract: ${models.length} tables protected.`);
