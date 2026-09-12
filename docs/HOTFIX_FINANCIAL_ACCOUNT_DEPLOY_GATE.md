# Hotfix de preservação de `FinancialEvent.accountId`

Este hotfix existe para preparar a migração das contas normalizadas sem mesclar a reconstrução Phoenix V15.

Ordem obrigatória:

1. schema principal deve conhecer `Account.userId`, `Category.userId` e `PaymentMethod.userId` antes de qualquer deploy com `prisma db push`;
2. as duas contas históricas devem existir no banco com os IDs `account-monetary-main` e `account-benefit-verocard-food` antes que a normalização passe a projetar `financialAccountId` em `FinancialEvent.accountId`;
3. o sincronizador deve preservar `accountId` em toda recriação do projection normalizado;
4. somente depois disso o backfill dos 6.471 eventos pode ser executado;
5. a Phoenix permanece sem escrita até a paridade financeira pós-backfill ser comprovada.

A Fase 1 de propriedade de Category/PaymentMethod e a materialização das duas contas já foram executadas diretamente no Supabase com validações e sem alteração de FinancialEvent.
