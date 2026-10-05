# Security checkpoint — Evolution API / Supabase

Data: 2026-10-05

## Contexto

O projeto Supabase `meg-evolution` possuía 37 tabelas no schema `public` com RLS desabilitado. O Security Advisor classificava o cenário como exposição externa porque essas tabelas estavam acessíveis pela superfície PostgREST do projeto.

## Evidências antes da correção

- Render executa a Evolution API v2.3.7 pelo serviço `meg-evolution-api`.
- Logs do serviço mostram uso de Prisma contra PostgreSQL via Session Pooler do Supabase, porta 5432.
- O volume acumulado de `pg_stat_statements` é dominado pelo papel `postgres`, com mais de 900 mil chamadas.
- `postgres` possui `rolbypassrls = true`.
- Não foi observado workload de negócio nas tabelas da Evolution pelos papéis `anon` ou `authenticated`.
- O workload observado por `authenticator` era de introspecção/schema cache do PostgREST; `service_role` apareceu somente em chamadas de storage.
- A instância registrada chama-se `meg-financas`.

## Correção aplicada

Migração Supabase:

`enable_rls_evolution_public_tables`

A migração habilitou Row Level Security nas 37 tabelas atuais do schema `public`, incluindo:

- Instance
- Session
- Chat
- Contact
- Message
- MessageUpdate
- Setting
- OpenaiCreds
- integrações auxiliares
- tabelas de bots
- _prisma_migrations

Nenhuma policy permissiva foi criada.

## Resultado

Após a migração:

- todas as 37 tabelas estão com RLS habilitado;
- o Security Advisor deixou de apontar `rls_disabled_in_public` como erro;
- o advisor passou a mostrar apenas `RLS Enabled No Policy` em nível informativo, comportamento intencional para manter a superfície REST fechada;
- teste executado como papel `anon` recebeu `permission denied` ao tentar ler `public."Instance"`;
- acesso direto administrativo/PostgreSQL continuou capaz de ler as tabelas;
- ACL atual das tabelas verificadas ficou restrita a `postgres` e `service_role`.

## Estado de risco

O risco crítico de acesso direto às tabelas via papéis públicos do Supabase foi mitigado.

A Evolution API continua concebida para usar conexão PostgreSQL direta via Prisma, não acesso anônimo do Supabase.

## Rollback de emergência

Se uma regressão comprovadamente relacionada a RLS for detectada, o rollback deve ser deliberado e temporário:

```sql
ALTER TABLE "public"."_prisma_migrations" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Instance" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Session" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Chat" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Contact" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Message" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."MessageUpdate" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Webhook" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Chatwoot" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Label" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Proxy" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Setting" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Rabbitmq" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Sqs" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Websocket" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Typebot" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."TypebotSetting" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Media" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."OpenaiCreds" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."OpenaiBot" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."OpenaiSetting" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Template" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Dify" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."DifySetting" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."IntegrationSession" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Flowise" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."FlowiseSetting" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."EvolutionBot" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."EvolutionBotSetting" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."IsOnWhatsapp" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Pusher" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Nats" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."N8n" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."N8nSetting" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Evoai" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."EvoaiSetting" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Kafka" DISABLE ROW LEVEL SECURITY;
```

Esse rollback só deve ser usado se houver evidência funcional clara de regressão. Não executá-lo preventivamente.

## Verificações ainda recomendadas

- confirmar envio/recebimento real de WhatsApp em uma janela operacional normal;
- revisar periodicamente o Security Advisor;
- impedir que futuras tabelas sejam publicadas sem RLS;
- manter chaves Supabase fora de Web, Android, logs e documentação pública.
