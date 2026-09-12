# Phoenix V15 — Auditoria de escopo do saldo inicial

Data de referência: 12/09/2026

## Resultado

O `openingBalance` ainda **não pode ser incorporado automaticamente** ao saldo monetário protegido sem uma decisão de escopo dos cadastros financeiros.

A regra de negócio vigente determina que:

- saldo atual = saldo inicial + eventos efetivados;
- eventos previstos não compõem saldo disponível;
- Verocard permanece separado;
- transferências internas não alteram patrimônio líquido;
- cada evento financeiro pertence ao usuário, salvo compartilhamento familiar explícito futuro.

Entretanto, o schema normalizado atual possui uma assimetria importante:

- `FinancialEvent` possui `userId` e `workspaceId`;
- `CreditCard`, `Payable`, `RecurringExpense`, `Receivable` e outros domínios possuem proprietário identificável;
- `Account`, `Category` e `PaymentMethod` ainda são catálogos globais, sem `userId` ou `workspaceId`.

## Risco

Somar todos os `Account.openingBalance` no cálculo de `monetaryBalanceAt()` poderia misturar saldo inicial de usuários ou espaços distintos. Isso seria pior do que manter temporariamente o cálculo baseado somente em eventos efetivados.

Por esse motivo, esta etapa não altera silenciosamente a proteção de saldo.

## Decisão de segurança

Até o escopo dos catálogos ser consolidado:

1. `monetaryBalanceAt()` continua usando somente eventos financeiros efetivados e pertencentes ao usuário consultado.
2. Receita prevista não pode financiar uma baixa.
3. Verocard não entra no saldo monetário.
4. Transferências são excluídas do patrimônio monetário.
5. `openingBalance` permanece visível no cadastro, mas não será promovido a autoridade de saldo pela Phoenix enquanto sua propriedade não puder ser determinada sem ambiguidade.
6. A escrita Phoenix continua bloqueada até a paridade numérica ser provada.

## Migração recomendada

A correção definitiva deve ser feita em duas fases.

### Fase 1 — definir propriedade

Escolher uma única autoridade para `Account`, `Category` e `PaymentMethod`:

- **usuário**, coerente com a regra atual de que cada evento pertence ao usuário; ou
- **workspace**, caso o compartilhamento familiar passe a ser regra oficial do patrimônio.

Não misturar os dois modelos no mesmo cálculo.

### Fase 2 — migrar e provar

Depois da decisão:

- adicionar o identificador de propriedade aos catálogos;
- backfill dos registros legados com relatório de ambiguidades;
- impedir leitura/escrita fora do escopo;
- validar referências de eventos contra o mesmo proprietário;
- incluir `openingBalance` na política monetária;
- comparar saldo calculado com os cenários históricos de referência antes de liberar a Phoenix para escrita.

## Gate

Nenhuma alteração de schema de propriedade será enviada à produção apenas para fazer o número fechar. A migração só será considerada pronta quando preservar os dados existentes, não vazar catálogos entre usuários e reproduzir a memória de cálculo histórica do MEG.
