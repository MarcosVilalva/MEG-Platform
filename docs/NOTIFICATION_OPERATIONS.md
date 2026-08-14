# Operação de alertas do MEG

## Agenda oficial

- 06:00 (São Paulo): contas vencidas, contas que vencem hoje e nos próximos três dias.
- 12:00 e 19:00: reforço apenas para vencidas e vencendo hoje que continuam pendentes.
- A cada cinco dias, no ciclo das 06:00: resumo de todas as obrigações abertas até o mês atual.
- Android: agenda local para três dias antes e para 06:00, 12:00 e 19:00 no vencimento. Ao sincronizar uma baixa, os alertas locais antigos são cancelados e recalculados.

Cartões de crédito são agrupados por cartão e vencimento. Uma conta paga deixa de participar dos ciclos seguintes.

## Aquecimento gratuito

O workflow `keep-api-responsive.yml` consulta `/ready`, que valida API e banco, dez minutos antes dos ciclos e uma vez por hora entre 06:05 e 23:05. O próprio workflow de envio também aguarda `/ready` antes de disparar.

Isso reduz partidas frias, mas não cria garantia de disponibilidade: o Render gratuito ainda pode suspender a instância e o GitHub pode atrasar execuções agendadas. Disponibilidade garantida exige uma instância sem suspensão.

## Auditoria e diagnóstico

- `GET /health`: configuração pública e estado geral da API.
- `GET /ready`: prontidão real da API e do PostgreSQL.
- `GET /notifications/status`: configuração dos canais (ADMIN).
- `GET /notifications/deliveries`: últimas 100 tentativas, sucessos e falhas (ADMIN).
- GitHub Actions marca o ciclo como falho quando um canal retorna `failed`.

As tentativas com falha ficam gravadas e podem ser reenviadas; somente um envio com status `sent` bloqueia duplicidade daquele canal, data e horário.

## Canais

- E-mail: Brevo é preferido quando configurado; Resend é o fallback. O e-mail contém versão HTML responsiva e versão texto.
- WhatsApp: Evolution API, com destinatários ativos cadastrados no MEG e fallback para o responsável do workspace.
- Alexa: a consulta pela skill e o anúncio proativo são integrações distintas. Avisos falados automáticos exigem `ALEXA_ANNOUNCEMENT_WEBHOOK_URL`; sem esse webhook, o workflow fica vermelho para que a ausência não passe despercebida.
- Android: notificações locais independem de e-mail e WhatsApp, mas o aplicativo precisa ter sincronizado os dados e recebido permissão de notificações.

## Segredos obrigatórios

Não versionar valores. Manter no Render/GitHub:

- `NOTIFICATION_CRON_SECRET`
- `BREVO_API_KEY` e remetente, ou `RESEND_API_KEY` e domínio verificado
- `EVOLUTION_API_URL`, `EVOLUTION_API_KEY` e `EVOLUTION_INSTANCE`
- `ALEXA_ANNOUNCEMENT_WEBHOOK_URL` para anúncio proativo (opcional)
