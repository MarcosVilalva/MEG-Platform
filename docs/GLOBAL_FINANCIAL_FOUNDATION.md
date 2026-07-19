# Fundacao financeira global

## Objetivo

Substituir regras particulares baseadas no texto `VEROCARD` por contas financeiras explicitas, preservando integralmente a base pessoal de Marcos e preparando novos clientes para iniciar com dados vazios.

## Modelo no estado do workspace

Cada conta possui `id`, `name`, `type`, `subtype`, `currency`, `openingBalance`, `isActive` e `source`. Os tipos iniciais sao `MONETARY` e `BENEFIT`. Cada lancamento recebe `financialAccountId` e `financialScope`.

## Compatibilidade

- Lancamentos antigos que ja possuem conta explicita nao sao reclassificados.
- Receitas descritas como Verocard, despesas pagas com Verocard e modalidade alimentacao sao vinculadas ao beneficio legado apenas durante a migracao.
- Demais registros sao vinculados a conta monetaria principal.
- O migrador pode ser executado novamente sem produzir novos registros ou alterar resultados.

## Reconciliacao obrigatoria

Antes da publicacao devem permanecer identicos: quantidade de lancamentos, total de receitas e total de despesas. Os testes automatizados verificam essa invariancia e a idempotencia.

## Evolucao segura

Esta etapa mantem o `AppState` isolado por workspace como fonte operacional. A normalizacao em tabelas relacionais sera realizada em migracao posterior, com colunas de workspace, dupla leitura temporaria e reconciliacao antes da troca definitiva.
## Saldo inicial auditavel

Ao cadastrar ou alterar uma conta, o saldo inicial gera ou atualiza um lancamento pago identificado por `systemGenerated: OPENING_BALANCE`. Saldos positivos geram receita; saldos negativos geram despesa. Zerar o saldo remove somente esse lancamento sistemico. Assim, paineis, fluxo de caixa e relatorios continuam derivados de eventos financeiros reais.
