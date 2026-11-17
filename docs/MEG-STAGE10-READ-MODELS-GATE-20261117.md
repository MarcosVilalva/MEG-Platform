# MEG Finanças Web Evolution | Etapa 10 | Prova integrada dos read-models

**Data:** 17/11/2026. **PR:** #697 Draft, issue #700. **Ambiente:** somente PG17 CI descartável com dados fictícios.

## Escopo

Além da prova anterior das funções financeiras puras, o novo teste `stage10-mapping-read-models.isolated.test.ts` acessa efetivamente as três autoridades de leitura da Web: `getCanonicalFinancialSummary`, `getCanonicalFinancialCashflow` e `getCanonicalFinancialAnalytics`.

Três eventos sintéticos são criados no banco descartável: despesa paga de R$ 22,35, despesa planejada de R$ 5,05, receita paga de R$ 100,00. A leitura inicial usa FKs de categoria e forma de pagamento nulas. Em nova transação QA, cada vínculo é preenchido após validação da triagem somente leitura, que preserva `writeAuthorized:false`. A leitura posterior confronta resumo, fluxo, analytics, identidade, montantes e status. O teste **não** é código de migração.

### Critérios assertivos

- O resumo da competência deve continuar com receitas R$ 100,00, despesas R$ 27,40, resultado projetado R$ 72,60 e resultado realizado R$ 77,65.
- O cashflow diário e a posição financeira não podem sofrer alteração quando somente FK é preenchida em eventos fictícios que não pertencem a cartão nem a benefício.
- O resumo da competência, as tendências e as variações do analytics devem permanecer iguais.
- `topCategories` deve passar de `Sem categoria` para `Mercado QA`, com montante inalterado.
- `paymentMethods` deve passar de `Não informada` para `PIX`, com montante inalterado.
- IDs, conta, status, data, competência, sinal, payload e ledger devem permanecer inalterados.
- Todas as fixtures fictícias criadas pelo teste devem ser excluídas no `finally`, e o job descarta o banco inteiro após a execução.

O teste confere `DATABASE_URL` com host 127.0.0.1, DB `meg_stage10_sandbox`, usuário `meg_stage10_ci`, schema `public` e flag `MEG_STAGE10_ISOLATED_PG=1` antes de qualquer comando.

**Status:** aguardando confirmação de CI para o commit técnico que incluiu o teste. A prova ainda não autoriza migração.

## Limites

Não é ensaio dos 647 registros reais, nem prova de neutralidade para Verocard/benefício, modalidade CREDITO, estornos, contas especiais ou cartões. As categorias/métodos do read-model são uma representação e sua mudança de rótulo precisa de revisão financeira por ID. Issue #699 continua bloqueando cliente Android/legado, sem versão instalada comprovada.

**Restrições:** sem Android, produção, Render, Supabase real, main, merge, deploy, custos, migração produtiva ou Etapa 11.
