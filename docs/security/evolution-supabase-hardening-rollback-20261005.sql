-- MEG / Evolution API — rollback de emergência
-- NÃO EXECUTAR como rotina.
-- Este arquivo existe apenas para reversão controlada da migration
-- 20261005111705_harden_evolution_public_access.
--
-- Antes de usar:
-- 1) confirmar falha real da Evolution causada pelo hardening;
-- 2) registrar evidência;
-- 3) executar smoke após a reversão;
-- 4) reabrir o desenho de acesso ao Supabase.

do $$
declare r record;
begin
  for r in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format(
      'alter table %I.%I disable row level security',
      r.schemaname,
      r.tablename
    );
  end loop;
end $$;

grant all privileges on all tables in schema public
  to anon, authenticated;

grant all privileges on all sequences in schema public
  to anon, authenticated;

grant execute on all functions in schema public
  to anon, authenticated;

alter default privileges for role postgres in schema public
  grant all on tables to anon, authenticated;

alter default privileges for role postgres in schema public
  grant all on sequences to anon, authenticated;

alter default privileges for role postgres in schema public
  grant execute on functions to anon, authenticated;

-- Observação:
-- os default privileges pertencentes a supabase_admin não foram alterados
-- pela migration de hardening, portanto não fazem parte deste rollback.
