# Alertas de vencimento na Alexa

O MEG prepara a mensagem a partir da mesma base financeira usada pela Web e pelo Android. Despesas já pagas são excluídas no momento de cada execução.

## Agenda

- Segunda a sexta: 06:20, 18:00 e 21:00, informando contas que vencem hoje e amanhã.
- Sábado e domingo: 12:00, informando apenas contas que vencem no próprio dia.
- Cartões e contas com o mesmo vencimento seguem os agrupamentos financeiros do MEG.

## Conexão com a Alexa

A Alexa não oferece um endpoint público que permita ao MEG falar diretamente. É necessária uma rotina ou skill intermediária que aceite um webhook e dispare o anúncio no dispositivo escolhido.

No Render, configure:

- `ALEXA_OWNER_EMAIL`: usuário proprietário da base que será anunciada.
- `ALEXA_ANNOUNCEMENT_WEBHOOK_URL`: URL HTTPS fornecida pela ponte da rotina.

Há dois formatos aceitos:

1. URL com `{text}`: o MEG substitui esse marcador pela mensagem codificada e faz `GET`.
2. URL sem marcador: o MEG faz `POST` com JSON no formato `{ "text": "mensagem" }`.

Exemplo de modelo seguro:

```text
https://servico-da-rotina.example/announce?token=SEGREDO&text={text}
```

O token do webhook deve existir somente nas variáveis secretas do Render. Não o grave no GitHub nem no navegador.

## Automação

O workflow `.github/workflows/alexa-reminders.yml` acorda a API nos horários definidos. O secret `NOTIFICATION_CRON_SECRET` do GitHub Actions precisa possuir o mesmo valor usado no Render.

Para validar manualmente, abra o workflow **MEG Alexa Due Reminders** no GitHub Actions e execute **Run workflow**. A API registra cada horário enviado para impedir anúncios duplicados, salvo quando a execução manual usa `force`.
