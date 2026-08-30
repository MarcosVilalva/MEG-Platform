# MEG Finanças: Skill Alexa

Nome de invocação por voz: `meu controle financeiro`.

Exemplos:

- `Alexa, abrir meu controle financeiro`
- `Alexa, pergunte ao meu controle financeiro o que tenho para pagar nos próximos dez dias`
- `Alexa, pergunte ao meu controle financeiro qual é meu saldo monetário`
- `Alexa, pergunte ao meu controle financeiro qual é o saldo do benefício`

Skill privada que consulta o panorama financeiro do proprietário sem duplicar regras de cálculo na Alexa. A Lambda somente traduz intents de voz e consulta a API segura do MEG.

## Intents

| Intent | Pergunta atendida |
| --- | --- |
| `FinancialOverviewIntent` | Panorama completo do mês |
| `PendingBillsIntent` | Contas abertas e vencidas |
| `NextDueIntent` | Próximo vencimento agrupado |
| `BalanceIntent` | Consulta geral de saldo |
| `MonetaryBalanceIntent` | Saldo monetário e pendências |
| `BenefitBalanceIntent` | Saldo dos benefícios |
| `MonthlyIncomeIntent` | Receitas monetárias do mês |
| `MonthlyExpensesIntent` | Despesas pagas e pendentes do mês |
| `ProjectedClosingIntent` | Projeção após quitar as pendências |
| `NaturalFinancialQueryIntent` | Pergunta aberta, classificada com segurança em uma consulta somente leitura |

## Variáveis da Lambda

- `MEG_API_URL`: URL pública da API, sem barra final.
- `MEG_ALEXA_SKILL_SECRET`: o mesmo segredo configurado como `ALEXA_SKILL_SECRET` na API.
- `MEG_ALEXA_SKILL_ID`: Skill ID autorizado a utilizar a função.

## Deploy

O deploy é feito por `.github/workflows/deploy-alexa-skill.yml` usando credenciais temporárias do GitHub Actions via AWS OIDC.

Para preparar uma conta AWS nova uma única vez, execute no AWS CloudShell:

```bash
curl -fsSL https://raw.githubusercontent.com/MarcosVilalva/MEG-Platform/main/scripts/bootstrap-aws-alexa.sh | bash
```

O bootstrap cria ou atualiza as roles IAM necessárias e limita a confiança OIDC à branch `main` deste repositório. Depois da configuração dos Secrets e Variables indicados pelo script, mudanças nesta pasta são publicadas automaticamente na Lambda e validadas com um `LaunchRequest` real.

## Segurança

- Mantenha a Skill privada/em desenvolvimento enquanto ela usar um único `ALEXA_OWNER_EMAIL`.
- Configure o Skill ID no trigger Alexa Skills Kit da Lambda.
- Nunca grave o segredo no repositório, no modelo de interação, no navegador ou no aplicativo Android.
- Prefira GitHub OIDC a Access Keys permanentes.
- Para comercialização multiusuário, substitua o proprietário fixo por Account Linking antes de publicar a Skill no catálogo.

As instruções completas estão em `docs/ALEXA_ALERTS.md`.

## Consultas detalhadas

- `BillsInDaysIntent`: contas que vencem exatamente daqui a N dias.
- `BillsNextDaysIntent`: contas dentro dos próximos N dias.
- `BillsOnDateIntent`: contas que vencem em uma data informada.
- `OverdueBillsIntent`: relação detalhada das contas vencidas.

As respostas informam quantidade, valor total e até seis itens. Faturas são agrupadas por cartão e vencimento, e o nome é falado apenas uma vez (por exemplo, `Cartão Azul`) para manter a conversa curta e natural.
