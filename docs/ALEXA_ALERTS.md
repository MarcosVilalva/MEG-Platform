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

A Alexa não oferece um endpoint público que permita ao MEG falar diretamente. É necessária uma rotina ou Skill intermediária que aceite um webhook e dispare o anúncio no dispositivo escolhido.

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

O código está em `integrations/alexa-skill`. A arquitetura é:

```text
Dispositivo Alexa → Skill privada → AWS Lambda → API MEG → base financeira do proprietário
```

A Lambda traduz as intents de voz e consulta a API segura do MEG. A Skill deve permanecer em modo de desenvolvimento enquanto estiver ligada apenas à conta do proprietário.

### 1. API do MEG

Configure `ALEXA_SKILL_SECRET` com um valor aleatório de pelo menos 24 caracteres. O mesmo valor deve ser cadastrado no GitHub como `MEG_ALEXA_SKILL_SECRET`. Mantenha `ALEXA_OWNER_EMAIL` apontando para o proprietário correto da base.

### 2. Bootstrap único da AWS

O deploy usa GitHub Actions OIDC. Não é necessário manter Access Key permanente no GitHub.

Abra o **AWS CloudShell** na conta que hospedará a Lambda e execute:

```bash
curl -fsSL https://raw.githubusercontent.com/MarcosVilalva/MEG-Platform/main/scripts/bootstrap-aws-alexa.sh | bash
```

O script é idempotente e prepara somente os recursos necessários para este deploy:

- provedor OIDC `token.actions.githubusercontent.com`, caso ainda não exista;
- role `MEG-GitHub-AlexaDeploy`, confiando apenas na branch `main` do repositório `MarcosVilalva/MEG-Platform`;
- role `MEG-AlexaLambdaExecution` para a função Lambda;
- permissão de logs do CloudWatch para a Lambda;
- política de deploy limitada à função `meg-financas-alexa-skill` e à role de execução correspondente.

Ao concluir, o script mostra os ARNs que devem ser cadastrados no GitHub Actions.

### 3. Configuração do GitHub Actions

Em **Settings > Secrets and variables > Actions**, configure:

Secrets:

- `AWS_ALEXA_DEPLOY_ROLE_ARN`: ARN da role `MEG-GitHub-AlexaDeploy` exibido pelo bootstrap.
- `AWS_ALEXA_LAMBDA_EXECUTION_ROLE_ARN`: ARN da role `MEG-AlexaLambdaExecution` exibido pelo bootstrap.
- `MEG_ALEXA_SKILL_SECRET`: mesmo valor de `ALEXA_SKILL_SECRET` usado pela API.

Variables:

- `AWS_ALEXA_REGION`: `us-east-1`, salvo se a Skill estiver sendo hospedada em outra região permitida.
- `AWS_ALEXA_LAMBDA_FUNCTION`: `meg-financas-alexa-skill`.
- `ALEXA_SKILL_ID`: ID `amzn1.ask.skill...` copiado no Alexa Developer Console.

Não cadastre Access Key permanente se o OIDC estiver configurado.

### 4. Deploy automático da Lambda

O workflow `.github/workflows/deploy-alexa-skill.yml` é executado quando arquivos de `integrations/alexa-skill/` mudam na branch `main` e também pode ser iniciado manualmente.

Ele executa, em ordem:

1. autenticação temporária na AWS via GitHub OIDC;
2. instalação das dependências da Skill;
3. geração do ZIP da Lambda;
4. criação da função, se necessário, ou atualização do código existente;
5. atualização das variáveis `MEG_API_URL`, `MEG_ALEXA_SKILL_SECRET` e `MEG_ALEXA_SKILL_ID`;
6. configuração do trigger Alexa Skills Kit limitado ao Skill ID;
7. `LaunchRequest` real de smoke test na Lambda.

O runtime usado é Node.js 22, handler `index.handler`, memória de 256 MB e timeout de 15 segundos.

### 5. Alexa Developer Console

1. Crie uma Skill do tipo **Custom**, em português do Brasil.
2. Copie o Skill ID e configure a variável `ALEXA_SKILL_ID` no GitHub.
3. No editor JSON do modelo de interação, cole `integrations/alexa-skill/interaction-model.pt-BR.json` e clique em **Build Model**.
4. Em **Endpoint**, escolha AWS Lambda ARN e informe o ARN exibido no resumo do workflow de deploy.
5. Em **Test**, habilite o modo Development e teste “Alexa, abra meu controle financeiro”.

O segredo nunca deve ser colocado no modelo de interação, no aplicativo Web ou no Android.

## Avisos automáticos

O workflow `.github/workflows/alexa-reminders.yml` acorda a API nos horários definidos. O secret `NOTIFICATION_CRON_SECRET` do GitHub Actions precisa possuir o mesmo valor usado na API.

Para validar manualmente, abra o workflow **MEG Alexa Due Reminders** no GitHub Actions e execute **Run workflow**. A API registra cada horário enviado para impedir anúncios duplicados, salvo quando a execução manual usa `force`.
