# MEG Web Evolution | Etapa 10 | Gate de neutralidade de saldos e mudança de facetas

**Data:** 17/11/2026. **PR:** #697 Draft. **Issues:** #699 e #700.
**Escopo:** somente PostgreSQL 17 descartável, dados fictícios, rollback intencional.

## Problema de aceitação financeira

Vincular `categoryId` e `paymentMethodId` não deve modificar ID, titular, conta, data, competência, sinal, valor, status, ledger, faturas ou saldos monetários. Entretanto, o `read-model.ts` consulta `category.name` e `paymentMethod.name` para exibir totais classificados. A composição das facetas **pode mudar de `Sem categoria` e `Não informada` para o cadastro vinculado**, mesmo quando as grandezas financeiras permanecem iguais. Exigir igualdade de todos os campos dos relatórios impediria observar essa mudança esperada.

## Teste acrescentado

`apps/api/src/modules/finance/stage10-mapping-projection-neutrality.isolated.test.ts` valida, na mesma transação QA:

1. Despesa fictícia paga de R$ 22,35, despesa planejada de R$ 5,05 e receita paga de R$ 100,00, com forma PIX e categorias distintas.
2. Antes e depois: `monetaryBalanceAt`, `monetaryAccountBalanceAt` e `summarizeMonetaryEvents` das autoridades financeiras centrais.
3. Antes e depois: `buildCanonicalCardStatement` sem cartão vinculado, sem gerar fatura artificial.
4. Identidades, IDs legados, conta, proprietário, data, competência, valores, sinais, status e `sourcePayload` preservados; nenhuma entrada ledger nem compra de cartão criada.
5. A classificação pura ainda retorna `writeAuthorized:false`; o preenchimento de FKs ocorre **somente dentro da transação fictícia que gera rollback**.
6. Confirma que as facetas de categoria e forma de pagamento mudam como consequência informativa das FKs, sem declarar homologada a reclassificação de eventos reais.
7. Guard de conexão exige exclusivamente `127.0.0.1`, usuário `meg_stage10_ci`, banco `meg_stage10_sandbox`, schema `public` e flag de isolamento.

**Gate verificado:** [GitHub Actions #44116800145](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44116800145), SUCCESS no commit `cf600ab89ab42f2767e76e4840f857d8fb512725`. Job PG17 concluído, 29 etapas bem-sucedidas, 1 etapa condicional de APK ignorada, zero falhas. Este resultado comprova somente os cenários fictícios acima, não homologação financeira de dados reais.

## Limites, pendências e decisões preservadas

Este teste verifica um conjunto **pequeno e fictício**. Não comprova todas as projeções de `getCanonicalFinancialSummary` ou `getCanonicalFinancialAnalytics` diretamente, nem a neutralidade de 647 registros reais. O read-model pode mudar a distribuição por categoria e método; isso exige revisão de classificação por ID, não correção financeira automática.

Os 1.855 históricos CREDITO/other, 278 Verocard/credit, sinais positivos, categorias Fixo, pagamentos `Não informado` e LATAM PASS continuam bloqueados. O cliente Android real ainda não foi homologado, issue #699 aberta. Não executar migração, modificar Android, Render, Supabase real, `main`, merge, deploy, custos nem Etapa 11.

**Indicador:** 40% técnico (4/10 marcos), 0% de migração produtiva; nenhuma homologação visual ou funcional nova.
