-- MEG / Evolution API — hardening aplicado em 2026-10-05
-- Projeto Supabase: meg-evolution
-- Migration registrada no Supabase: 20261005111705_harden_evolution_public_access
--
-- Objetivo:
-- 1) fechar exposição direta via anon/authenticated;
-- 2) manter a Evolution API funcionando por conexão PostgreSQL direta (postgres);
-- 3) proteger objetos futuros criados pelo papel postgres.

do $$
declare r record;
begin
  for r in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format(
      'alter table %I.%I enable row level security',
      r.schemaname,
      r.tablename
    );
  end loop;
end $$;

revoke all privileges on all tables in schema public
  from anon, authenticated;

revoke all privileges on all sequences in schema public
  from anon, authenticated;

revoke execute on all functions in schema public
  from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;

-- Validações esperadas:
-- * todas as tabelas public com RLS habilitado;
-- * zero grants de tabela para anon/authenticated;
-- * postgres/service_role preservados;
-- * advisor sem rls_disabled_in_public.
