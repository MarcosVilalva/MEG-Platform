-- MEG Finanças · failsafe independente de notificações
-- Executar no Supabase do projeto. O segredo NÃO deve ser versionado neste arquivo.
--
-- Pré-requisito:
--   criar/atualizar no Vault um segredo chamado meg_notification_watchdog_secret
--   com o mesmo valor de NOTIFICATION_WATCHDOG_SECRET configurado na API Render.
--
-- Objetivo:
--   GitHub Actions continua sendo o agendador principal.
--   pg_cron + pg_net atuam como relógio secundário, deslocado 5 minutos dos ciclos
--   do watchdog do GitHub. A API mantém idempotência e impede envio duplicado.

create or replace function public.meg_run_notification_watchdog()
returns bigint
language plpgsql
security definer
set search_path = public, vault, net, pg_temp
as $function$
declare
  v_secret text;
  v_request_id bigint;
begin
  select decrypted_secret
    into v_secret
  from vault.decrypted_secrets
  where name = 'meg_notification_watchdog_secret'
  order by updated_at desc
  limit 1;

  if v_secret is null or length(v_secret) < 32 then
    raise exception 'MEG_WATCHDOG_SECRET_UNAVAILABLE';
  end if;

  select net.http_post(
    url := 'https://meg-platform-api.onrender.com/notifications/watchdog',
    body := '{"force":false}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-watchdog-secret', v_secret
    ),
    timeout_milliseconds := 120000
  )
  into v_request_id;

  return v_request_id;
end;
$function$;

-- Não expor a função via RPC público.
revoke all on function public.meg_run_notification_watchdog() from public;
revoke all on function public.meg_run_notification_watchdog() from anon;
revoke all on function public.meg_run_notification_watchdog() from authenticated;
grant execute on function public.meg_run_notification_watchdog() to postgres;

-- Reinstalação idempotente dos jobs.
do $block$
declare
  r record;
begin
  for r in
    select jobid
    from cron.job
    where jobname in (
      'meg-notification-watchdog-backup-day',
      'meg-notification-watchdog-backup-late'
    )
  loop
    perform cron.unschedule(r.jobid);
  end loop;
end;
$block$;

-- America/Sao_Paulo = UTC-3.
-- GitHub executa o watchdog em :12/:22/:32/:42/:52.
-- Supabase executa em :17/:27/:37/:47/:57, criando independência de relógio.
select cron.schedule(
  'meg-notification-watchdog-backup-day',
  '17,27,37,47,57 9-23 * * *',
  $$select public.meg_run_notification_watchdog();$$
);

select cron.schedule(
  'meg-notification-watchdog-backup-late',
  '17,27,37,47,57 0 * * *',
  $$select public.meg_run_notification_watchdog();$$
);

-- Verificação operacional:
-- select jobid, jobname, schedule, active from cron.job
-- where jobname like 'meg-notification-watchdog%';
--
-- select id, status_code, timed_out, error_msg, created
-- from net._http_response
-- order by created desc
-- limit 20;
