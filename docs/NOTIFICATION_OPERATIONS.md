# Operação de alertas do MEG

## Agenda oficial

- 06:00 (São Paulo): resumo diário e obrigações que exigem atenção.
- 12:00 e 19:00: reforço para vencidas e vencendo hoje que continuam pendentes.
- Alexa em dias úteis: 06:20, 18:00 e 21:00.
- Alexa em fins de semana: resumo ao meio-dia.
- Android: agenda local em 5 dias antes, 3 dias antes, véspera e reforços no dia do vencimento. Ao sincronizar uma baixa, os alertas locais antigos são cancelados e recalculados.

Cartões de crédito são agrupados por cartão e vencimento. Uma obrigação quitada deixa de participar dos ciclos seguintes.

## Arquitetura redundante sem servidor pago adicional

O MEG usa dois relógios independentes, mas uma única API idempotente:

1. **GitHub Actions — primário**
   - `daily-notifications.yml`: tentativa principal dos alertas financeiros.
   - `alexa-reminders.yml`: tentativa principal da Alexa.
   - `keep-api-responsive.yml`: aquece a API e chama o watchdog em janelas de recuperação.
   - Os horários evitam o minuto 00 para reduzir atraso do scheduler do GitHub.

2. **Supabase pg_cron + pg_net — failsafe**
   - Usa o mesmo banco já existente do MEG; não cria outro servidor.
   - Chama `/notifications/watchdog` em minutos diferentes dos usados pelo GitHub.
   - Usa credencial própria (`NOTIFICATION_WATCHDOG_SECRET`) guardada no Vault.
   - O SQL oficial está em `ops/supabase/notification-watchdog-failsafe.sql`.

A API cria um marcador por usuário, data, canal lógico e slot antes de enviar. GitHub e Supabase podem atingir o mesmo ciclo sem duplicar mensagem. Um processo assume o ciclo; o outro encontra o marcador e encerra.

## Watchdog

O endpoint `POST /notifications/watchdog` examina os ciclos válidos no horário de São Paulo e recupera o que estiver faltando dentro da janela operacional.

Estados internos:

- `processing`: um executor assumiu o ciclo.
- `sent`: ciclo concluído; não pode ser duplicado.
- `failed`: houve falha e uma execução posterior pode retentar.
- ausência do marcador depois da tolerância: ciclo considerado faltante pelo diagnóstico.

`GET /notifications/deliveries` expõe, para ADMIN, a saúde do watchdog e os últimos marcadores internos sem misturá-los à contagem de mensagens entregues ao usuário.

## Aquecimento gratuito

`keep-api-responsive.yml` consulta `/ready` durante a janela diária e, depois da prontidão, chama o watchdog. O failsafe do Supabase continua independente desse workflow.

O Render gratuito ainda pode suspender a instância, por isso tanto GitHub quanto Supabase usam chamadas recorrentes. A redundância reduz a dependência de um único scheduler, mas não equivale a um SLA comercial de infraestrutura paga.

## Auditoria e diagnóstico

- `GET /health`: estado geral da API.
- `GET /ready`: prontidão real da API e PostgreSQL.
- `GET /notifications/status`: configuração dos canais (ADMIN).
- `GET /notifications/deliveries`: últimas tentativas, falhas e saúde do watchdog (ADMIN).
- GitHub Actions falha quando um canal retorna `failed`.
- Supabase registra as execuções em `cron.job_run_details` e as respostas HTTP em `net._http_response`.

As tentativas com falha permanecem registradas. Somente um envio/ciclo concluído como `sent` bloqueia nova entrega da mesma referência.

## Canais

- E-mail: Brevo é o provedor de produção preferencial; Resend fica como fallback quando aplicável.
- WhatsApp: Evolution API com retry para falhas transitórias e destinatários ativos do MEG.
- Alexa: skill consultiva e anúncio proativo são integrações diferentes. Aviso automático exige `ALEXA_ANNOUNCEMENT_WEBHOOK_URL`.
- Android: notificações locais dependem da permissão do aparelho e de uma sincronização recente. O painel de Configurações mostra permissão e quantidade de alertas agendados.

## Segredos obrigatórios

Nunca versionar valores.

Render/GitHub:
- `NOTIFICATION_CRON_SECRET`
- `BREVO_API_KEY` e remetente, ou `RESEND_API_KEY`
- `EVOLUTION_API_URL`, `EVOLUTION_API_KEY` e `EVOLUTION_INSTANCE`
- `ALEXA_ANNOUNCEMENT_WEBHOOK_URL` quando houver anúncios proativos

Render + Supabase Vault:
- `NOTIFICATION_WATCHDOG_SECRET`
- no Vault, o segredo deve se chamar `meg_notification_watchdog_secret`

## Verificação do failsafe Supabase

Após instalação/rotação de segredo:

1. conferir os jobs `meg-notification-watchdog-backup-day` e `meg-notification-watchdog-backup-late` em `cron.job`;
2. executar `public.meg_run_notification_watchdog()` manualmente;
3. confirmar HTTP 200 em `net._http_response`;
4. confirmar no MEG, em Configurações → Notificações, que o watchdog não aparece como “Requer atenção”.

A função do failsafe não deve possuir permissão de execução para `public`, `anon` ou `authenticated`.
