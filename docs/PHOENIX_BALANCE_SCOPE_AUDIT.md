# Phoenix V15 — Auditoria de escopo do saldo inicial

Data de referência: 12/09/2026

## Resultado

O `openingBalance` ainda **não pode ser incorporado automaticamente** ao saldo monetário protegido antes do backfill dos cadastros financeiros.

A regra de negócio vigente determina que:

- saldo atual = saldo inicial + eventos efetivados;
- eventos previstos não compõem saldo disponível;
- Verocard permanece separado;
- transferências internas não alteram patrimônio líquido;
- cada evento financeiro pertence ao usuário, salvo compartilhamento familiar explícito futuro.

O schema normalizado atual ainda possui uma assimetria importante:

- `FinancialEvent` possui `userId` e `workspaceId`;
- `CreditCard`, `Payable`, `RecurringExpense`, `Receivable` e outros domínios possuem proprietário identificável;
- `Account`, `Category` e `PaymentMethod` ainda são catálogos globais, sem `userId` ou `workspaceId`.

## Decisão de autoridade

Para a fase atual da Phoenix, a propriedade financeira oficial será **por usuário**.

Motivos:

1. a regra de negócio já declara expressamente que cada evento financeiro pertence ao usuário;
2. compartilhamento familiar de patrimônio está documentado como possibilidade futura, não como regra atual;
3. usar `workspace` agora transformaria uma estrutura de acesso/colaboração em autoridade patrimonial sem uma regra de negócio aprovada;
4. `openingBalance` só pode entrar no saldo quando a conta possuir o mesmo proprietário dos eventos usados no cálculo.

Portanto:

- `userId` será a autoridade de `Account`, `Category` e `PaymentMethod` na migração normalizada;
- `workspaceId` continua sendo o contexto de acesso, sessão, idempotência, auditoria e futura colaboração;
- uma eventual migração futura para patrimônio compartilhado deverá ser explícita e acompanhada por nova regra de negócio, não inferida silenciosamente.

## Risco atual

Somar todos os `Account.openingBalance` no cálculo de `monetaryBalanceAt()` poderia misturar saldo inicial de usuários distintos. Isso seria pior do que manter temporariamente o cálculo baseado somente em eventos efetivados.

Por esse motivo, esta etapa não altera silenciosamente a proteção de saldo.

## Auditoria seca antes da migração

Foi criado um planejador de propriedade que não altera o banco. Ele deriva possíveis proprietários a partir das referências reais já existentes e classifica cada catálogo em:

- proprietário único: pode manter o ID atual;
- múltiplos proprietários: exige clonagem por usuário e religação das referências;
- sem proprietário determinável: permanece bloqueado para revisão;
- referência sem `userId`: permanece bloqueada mesmo quando existe outro proprietário provável.

O comando de diagnóstico é:

`npm run db:audit:catalog-ownership`

Ele consulta `Account`, `Category` e `PaymentMethod` e cruza, conforme o domínio, referências de `FinancialEvent`, `Receipt`, `PayablePayment`, `LedgerEntry`, `CardPurchase`, `Payable` e `RecurringExpense`. O resultado é somente JSON de auditoria (`mode: dry-run`). Se houver catálogo sem proprietário determinável ou referência sem `userId`, o processo termina com código de atenção e **não altera nenhuma linha**.

O algoritmo puro também faz parte do CI por `test:catalog-ownership`, para impedir que a regra de clonagem/revisão seja alterada silenciosamente.

## Decisão de segurança

Até o backfill de propriedade dos catálogos ser concluído e validado:

1. `monetaryBalanceAt()` continua usando somente eventos financeiros efetivados e pertencentes ao usuário consultado.
2. Receita prevista não pode financiar uma baixa.
3. Verocard não entra no saldo monetário.
4. Transferências são excluídas do patrimônio monetário.
5. `openingBalance` permanece visível no cadastro, mas não será promovido a autoridade de saldo pela Phoenix enquanto sua propriedade não estiver gravada e validada.
6. Todo novo `FinancialEvent` criado pelo gateway normalizado também recebe `workspaceId`, sem substituir `userId` como proprietário financeiro atual.
7. A escrita Phoenix continua bloqueada até a paridade numérica ser provada.

## Migração definitiva

A correção será feita em duas fases.

### Fase 1 — propriedade explícita

- executar primeiro a auditoria seca e conservar o relatório;
- adicionar `userId` a `Account`, `Category` e `PaymentMethod` de forma inicialmente compatível com o legado;
- fazer backfill dos registros legados a partir das referências reais já existentes;
- quando um catálogo legado estiver referenciado por mais de um usuário, duplicar o cadastro por proprietário e religar somente as referências daquele usuário;
- emitir relatório para qualquer registro sem proprietário determinável;
- impedir leitura/escrita de catálogo fora do usuário proprietário;
- manter IDs históricos quando não houver conflito e criar novos IDs apenas nas duplicações necessárias;
- só tornar a propriedade obrigatória depois que a auditoria comprovar zero registros não resolvidos.

### Fase 2 — saldo inicial

Depois da Fase 1:

- validar que nenhuma conta utilizada por um evento pertence a outro usuário;
- confirmar quais tipos de conta participam do saldo monetário;
- incorporar `openingBalance` à mesma política usada por `summary`, `cashflow`, proteção de baixa e análises;
- comparar saldo calculado com os cenários históricos de referência antes de liberar a Phoenix para escrita.

## Gate

Nenhuma alteração de schema de propriedade será enviada à produção apenas para fazer o número fechar. A migração só será considerada pronta quando preservar os dados existentes, não vazar catálogos entre usuários e reproduzir a memória de cálculo histórica do MEG.