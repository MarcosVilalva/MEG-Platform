# Phoenix V15 — Gate do catálogo de recebimentos

Data de referência: 13/09/2026

## Objetivo

Fechar a regra de produto da Receita antes de liberar o primeiro `Salvar` financeiro da Phoenix.

Regra validada do formulário de Receita:

- PIX;
- DINHEIRO;
- DEPÓSITO BANCÁRIO.

A interface não deve inventar opções ausentes nem reutilizar cartão, boleto, Verocard ou outra forma apenas para completar o seletor.

## Estado real observado

Auditoria da base normalizada em 13/09/2026:

- `PaymentMethod` possui 15 registros ativos no catálogo financeiro observado;
- nenhum `PaymentMethod` normalizado está sem `userId`;
- o catálogo normalizado pertence hoje a um único proprietário financeiro;
- PIX existe, está ativo e já é usado em receitas;
- DINHEIRO aparece no AppState legado e já existe em uma receita histórica, mas ainda não possui registro normalizado correspondente em `PaymentMethod`;
- DEPÓSITO BANCÁRIO não foi localizado no catálogo normalizado nem no catálogo legado consultado.

Portanto, o gate atual é:

| Forma | Normalizada | Evidência histórica | Estado |
| --- | --- | --- | --- |
| PIX | Sim | Sim | Pronta |
| DINHEIRO | Não | Sim, legado | Normalização pendente |
| DEPÓSITO BANCÁRIO | Não | Não localizada | Cadastro controlado pendente |

## Política codificada

A branch Phoenix possui duas implementações deliberadamente equivalentes da política:

- `packages/database/prisma/income-payment-method-policy.ts` para auditoria/normalização do catálogo;
- `apps/web/src/phoenix/income-payment-methods.ts` para filtragem futura da interface.

Ambas reconhecem apenas os três nomes canônicos. A normalização textual tolera caixa, acentos e espaços, mas não transforma outros meios de pagamento em equivalentes.

O teste `income-payment-method-policy.test.ts` protege o cenário atual e o cenário pronto.

## Auditoria dry-run

Foi adicionado:

`npm run db:audit:income-payment-methods`

A rotina:

1. identifica proprietários financeiros a partir dos próprios catálogos;
2. verifica somente métodos ativos do proprietário;
3. informa quais dos três meios estão disponíveis;
4. informa quais estão ausentes;
5. não grava, não altera e não cria nenhum registro;
6. retorna estado não pronto enquanto algum proprietário auditado estiver sem uma das formas obrigatórias.

O relatório deliberadamente não depende de IDs hardcoded.

## O que não foi feito

Nenhum registro foi inserido, alterado ou removido da produção nesta etapa.

Não foi escolhido silenciosamente um `type` técnico para DEPÓSITO BANCÁRIO. O nome funcional está validado, mas a classificação técnica do método deve ser definida no mesmo lote controlado que criar o cadastro, sem inferência desnecessária.

Também não foi feita migração automática de DINHEIRO a partir do AppState. A existência do valor legado serve como evidência para o cadastro, não como autorização para modificar a base.

## Gate para mudança controlada

Antes de criar os dois métodos ausentes:

1. confirmar o proprietário financeiro que já possui PIX na base normalizada;
2. garantir que não existe equivalente inativo ou duplicado sob outra grafia;
3. definir o tipo técnico de cada método sem alterar a semântica existente;
4. criar somente os registros faltantes, vinculados ao mesmo proprietário financeiro;
5. rodar novamente a auditoria dry-run;
6. exigir `ready: true` para o proprietário;
7. confirmar que a leitura Phoenix retorna exatamente as opções homologadas para Receita;
8. somente depois ligar a filtragem visual do seletor e avançar para o writer.

## Relação com o primeiro writer

O catálogo pronto é uma condição necessária, mas não suficiente, para liberar escrita.

Continuam obrigatórios:

- backend protegido da PR isolada do primeiro writer;
- deploy da API protegida em `main` somente após autorização explícita;
- gateway frontend com capacidade ainda desativada até esse deploy;
- proxy do preview com allowlist estreita somente depois do backend estar ativo;
- teste real controlado com idempotência, auditoria, ledger e refresh do snapshot.

Até esses gates serem cumpridos, `PhoenixMovementsV15` deve continuar sem mutação financeira real.
