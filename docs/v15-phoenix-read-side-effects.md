# Phoenix V15 — auditoria de efeitos colaterais em consultas

A fase Phoenix é **somente leitura do ponto de vista da interface**: nenhum componente novo chama `POST`, `PATCH`, `PUT` ou `DELETE` para alterar dados. Porém, a auditoria do backend atual identificou rotas `GET` que historicamente executam manutenção de domínio durante a própria consulta.

## `/cards?month=YYYY-MM`

Antes de devolver os cartões, a rota chama a migração de cartões legados encontrados em `AppState`. Quando encontra um cartão válido ainda não materializado em `CreditCard`, pode criar o registro normalizado.

Isso significa que abrir a tela de cartões pode causar uma **migração de compatibilidade já prevista pelo backend**, mesmo sem existir uma ação de gravação na UI Phoenix.

Decisão: manter o comportamento durante a fase de paridade, porque é o contrato consumido pela produção atual, mas não classificá-lo como GET puro. Antes do cutover final, avaliar separar migração/manutenção da consulta.

## `/payables?month=YYYY-MM`

Antes de listar títulos, a rota chama `generateRecurring()`. Essa rotina pode:

- criar `Payable` para recorrências cujo vencimento entrou no horizonte;
- avançar `nextDueDate` em `RecurringExpense`;
- desativar uma recorrência que chegou ao fim.

Portanto, a consulta de pendentes também possui **materialização automática de domínio**.

Decisão: preservar durante a paridade para que a Phoenix mostre o mesmo universo funcional do sistema atual. Antes do cutover final, decidir se a geração recorrente continua sendo lazy-on-read ou migra para job/ação explícita.

## Regra de comunicação

Durante esta fase, a interface deve informar:

> Phoenix V15 em modo de paridade. Nenhuma edição ou gravação manual está habilitada nesta raiz.

Não deve afirmar que simplesmente abrir a Phoenix jamais altera o banco, porque os dois comportamentos acima já fazem parte dos serviços existentes.

## Condição antes da produção

Antes de declarar a Phoenix pronta para substituir a interface atual:

1. classificar todas as rotas GET usadas no bootstrap como puras ou com manutenção de domínio;
2. decidir explicitamente quais efeitos lazy-on-read serão preservados;
3. adicionar testes para os efeitos preservados;
4. impedir que uma simples consulta crie duplicidade ou recalcule dados já confirmados.
