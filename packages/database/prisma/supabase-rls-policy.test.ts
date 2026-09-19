import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const schema = readFileSync(new URL('./schema.prisma', import.meta.url), 'utf8');
const sql = readFileSync(new URL('./supabase-rls-hardening.sql', import.meta.url), 'utf8');
const executableSql = sql.replace(/^\s*--.*$/gm, '');

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

assert.match(sql, /FROM anon, authenticated, service_role;/,
  'anon, authenticated e service_role devem ficar sem acesso direto às tabelas');
assert.match(sql, /REVOKE EXECUTE ON FUNCTIONS[\s\S]*FROM anon, authenticated, service_role;/,
  'funções futuras não podem nascer executáveis pelas roles do Data API');
assert.match(sql, /REVOKE USAGE, SELECT ON SEQUENCES[\s\S]*FROM anon, authenticated, service_role;/,
  'sequências futuras não podem nascer acessíveis pelas roles do Data API');
assert.match(sql, /REVOKE EXECUTE ON FUNCTIONS[\s\S]*FROM PUBLIC;/,
  'funções futuras não podem herdar EXECUTE público');
assert.match(sql, /ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public/,
  'futuras tabelas criadas pelo Prisma devem nascer sem grants diretos ao Data API');
assert.doesNotMatch(executableSql, /FORCE ROW LEVEL SECURITY/,
  'FORCE RLS quebraria o backend enquanto Prisma usa postgres/BYPASSRLS');
assert.doesNotMatch(executableSql, /auth\.uid\s*\(/,
  'não criar políticas Supabase Auth em uma aplicação que usa autenticação própria');

console.log(`Supabase RLS hardening contract: ${models.length} tables protected.`);
