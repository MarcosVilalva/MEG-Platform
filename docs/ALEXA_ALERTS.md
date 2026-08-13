# Alexa + MEG Finanças

O MEG prepara a mensagem a partir da mesma base financeira usada pela Web e pelo Android. Despesas já pagas são excluídas no momento de cada execução.

Há duas integrações independentes:

1. **Avisos automáticos:** a Alexa anuncia vencimentos nos horários configurados por meio da ponte de webhook.
2. **Consulta por voz:** a Skill privada responde perguntas sobre saldo, panorama do mês, pendências e próximo vencimento.

## Perguntas disponíveis

Depois de habilitar a Skill, use frases como:

- “Alexa, abra MEG Finanças.”
- “Alexa, pergunte ao MEG Finanças como estão minhas finanças.”
- “Alexa, pergunte ao MEG Finanças quanto ainda tenho para pagar.”
- “Alexa, pergunte ao MEG Finanças qual é o próximo vencimento.”
- “Alexa, pergunte ao MEG Finanças quanto tenho disponível.”

O panorama falado informa:

- saldo monetário disponível;
- receitas e despesas pagas do mês;
- contas monetárias pendentes;
- sobra ou falta projetada depois das pendências;
- saldo do benefício alimentação;
- próximo vencimento, com faturas agrupadas por cartão.

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

## Skill privada para consultas

O código pronto está em `integrations/alexa-skill`. A arquitetura é:

```text
Dispositivo Alexa → Skill privada → AWS Lambda → API MEG → base financeira do proprietário
```

A Lambda evita expor o endpoint interno diretamente à Alexa e usa um segredo compartilhado. A Skill deve permanecer em modo de desenvolvimento enquanto estiver ligada apenas à conta do proprietário.

### 1. Render

Configure `ALEXA_SKILL_SECRET` com um valor aleatório de pelo menos 24 caracteres. O valor também será usado na Lambda. Mantenha `ALEXA_OWNER_EMAIL` apontando para o proprietário correto da base.

### 2. Pacote da Lambda

Em PowerShell, na raiz do repositório:

```powershell
cd integrations\alexa-skill
npm install --omit=dev
Compress-Archive -Path index.js,node_modules,package.json -DestinationPath meg-alexa-skill.zip -Force
```

Crie uma função AWS Lambda com runtime Node.js 20 ou superior, envie o ZIP e use o handler `index.handler`. Adicione as variáveis:

```text
MEG_API_URL=https://meg-platform-api.onrender.com
MEG_ALEXA_SKILL_SECRET=mesmo valor de ALEXA_SKILL_SECRET no Render
```

Adicione o trigger **Alexa Skills Kit** e informe o ID da Skill para restringir quem pode chamar a função.

### 3. Alexa Developer Console

1. Crie uma Skill do tipo **Custom**, em português do Brasil.
2. No editor JSON do modelo de interação, cole `interaction-model.pt-BR.json` e clique em **Build Model**.
3. Em **Endpoint**, escolha AWS Lambda ARN e informe o ARN da função.
4. Em **Test**, habilite o modo Development e teste “Alexa, abra MEG Finanças”.

O segredo nunca deve ser colocado no modelo de interação, no aplicativo Web ou no Android.

## Automação

O workflow `.github/workflows/alexa-reminders.yml` acorda a API nos horários definidos. O secret `NOTIFICATION_CRON_SECRET` do GitHub Actions precisa possuir o mesmo valor usado no Render.

Para validar manualmente, abra o workflow **MEG Alexa Due Reminders** no GitHub Actions e execute **Run workflow**. A API registra cada horário enviado para impedir anúncios duplicados, salvo quando a execução manual usa `force`.
