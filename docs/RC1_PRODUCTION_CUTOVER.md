# RC1 Phoenix V15 — corte de produção e rollback

Este documento é o gate operacional final da RC1. Ele não autoriza o corte por si só. O PR #267 deve permanecer **DRAFT** até que o backup do banco esteja comprovado e exista autorização explícita para produção.

## 1. Linha de base congelada

### Produção atual

- Branch oficial: `main`.
- SHA de produção antes do corte: `88b602f0dc71184b3842763b63a7e34cc4d89316`.
- Deploy da API correspondente: `dep-dak44tad0e5s739ul1t0` — LIVE.
- API: `https://meg-platform-api.onrender.com`.
- O `/health` da API informou o mesmo commit `88b602f0dc71184b3842763b63a7e34cc4d89316` durante o smoke RC1.
- Android estável publicado antes do corte: versão `1.1.253` (`versionCode` 253), SHA-256 `1c5ccae8d9586a00e6976c1a832f336593ab76ea492cd602cda8e6fc22198d7e`.

### Candidata RC1

- PR: #267 — `rc1/phoenix-v15-integration` -> `main`.
- Ambiente isolado: `https://meg-phoenix-rc1-preview.onrender.com/phoenix.html`.
- `RC1 Runtime Smoke` obrigatório: interface, headers de segurança, leitura da API e bloqueio de writers financeiros.
- CI obrigatório: `validate`, `financial-e2e` e `android-rc1` verdes no HEAD final.

Antes de qualquer merge, conferir novamente o SHA do HEAD do PR e registrar abaixo:

- HEAD final RC1: `PREENCHER_NO_MOMENTO_DO_CORTE`
- Run CI final: `PREENCHER_NO_MOMENTO_DO_CORTE`
- Run runtime-smoke final: `PREENCHER_NO_MOMENTO_DO_CORTE`

## 2. Banco de produção — estado pré-corte

Arquitetura confirmada: Supabase PostgreSQL persistente + API Render + frontend GitHub Pages.

Estado verificado em 15/09/2026 antes do corte:

- projeto Supabase: `meg-financas`;
- região: `sa-east-1`;
- status: `ACTIVE_HEALTHY`;
- PostgreSQL: 17.6;
- tamanho aproximado do banco: 27 MB;
- `schema.prisma` possui exatamente o mesmo SHA na `main` e na RC1: `676517da184b14782328c310d2f75b03712acb10`;
- `prepare-production.ts` possui exatamente o mesmo SHA na `main` e na RC1: `1fbacaa8cccc3938ce0f90821b88b35de80b3a6d`;
- duplicidades de `Budget` detectadas pelo mesmo critério do prepare-production: 0 grupos / 0 linhas excedentes.

Fingerprint de contagens pré-corte:

| Tabela | Linhas |
| --- | ---: |
| Account | 2 |
| AppState | 1 |
| AuditLog | 21 |
| CardInstallment | 0 |
| CardPurchase | 0 |
| CloudMutationReceipt | 76 |
| CreditCard | 4 |
| FinancialEvent | 6.472 |
| LedgerEntry | 1 |
| Payable | 0 |
| PayablePayment | 0 |
| Receipt | 0 |
| Receivable | 0 |
| RecurringExpense | 0 |
| User | 2 |
| Workspace | 1 |

Essas contagens são somente um fingerprint de conferência; não substituem backup.

### Gate crítico de banco

O build da API em produção executa `db:prepare:production` e depois `prisma db push --accept-data-loss`. No estado atual isso não representa uma mudança de schema porque o `schema.prisma` da RC1 é byte a byte o mesmo da `main`. Mesmo assim, **se o SHA do schema deixar de ser `676517da184b14782328c310d2f75b03712acb10` antes do corte, interromper o processo e auditar o diff antes de continuar**.

## 3. Backup obrigatório

Nenhum merge para `main` deve ocorrer enquanto não houver evidência de backup/restauração do Supabase.

O conector disponível para a homologação confirma projeto, saúde e banco, mas não expõe inventário de backups nem criação de restore point. Por isso este gate precisa ser comprovado no provedor antes do corte.

Registrar:

- backup/PITR confirmado: `[ ]`;
- horário do ponto de restauração: `________________`;
- identificador/referência no provedor: `________________`;
- responsável pela conferência: `________________`.

Se não houver backup utilizável no plano atual, fazer um dump lógico seguro fora do repositório antes do merge. Nunca versionar URI, senha, dump com dados pessoais ou segredo do banco.

## 4. Sequência do corte

1. Confirmar PR #267 ainda mergeável e 0 commits atrás da `main`.
2. Confirmar `validate`, `financial-e2e`, `android-rc1` e `RC1 Runtime Smoke` verdes no HEAD final.
3. Confirmar `schema.prisma` sem diferença contra `main`.
4. Confirmar backup/PITR e preencher a seção 3.
5. Registrar SHA atual de `main` e deploy LIVE atual da API.
6. Somente após autorização explícita, retirar o PR de DRAFT e mesclar.
7. Não disparar deploy manual no Render: `main` possui autoDeploy.
8. Acompanhar o novo deploy da API até LIVE.
9. Confirmar `/health` e que o campo `commit` corresponde ao novo SHA de produção.
10. Acompanhar GitHub Pages até a interface Phoenix V15 oficial ficar disponível.
11. Acompanhar o workflow Android. O APK oficial só é considerado promovido depois de build release, assinatura, SHA-256, publicação do release e manifesto de atualização concluídos.
12. Executar smoke funcional pós-corte antes de declarar a V15 oficial.

## 5. Smoke pós-corte obrigatório

Validar, no mínimo:

- login, refresh de sessão e biometria Android;
- Home e carregamento inicial sem atraso anormal;
- filtros de período e responsividade;
- tabela de lançamentos, ordenação, multiseleção e filtros;
- criação de um lançamento controlado e conferência da persistência;
- edição e baixa de um lançamento controlado;
- cartões, fatura, fechamento/vencimento, lifecycle e histórico;
- Payables/Receivables quando houver dados de homologação adequados;
- radar 12 meses, simulador e assistente de decisão sem gravação indevida;
- notificações e indicadores visuais;
- `/health` da API;
- recontagem das tabelas críticas para explicar somente as alterações efetuadas no smoke.

Qualquer divergência financeira não explicada bloqueia a declaração de sucesso.

## 6. Rollback de código

Se houver regressão de Web/API e o banco estiver íntegro:

1. não usar force-push em `main`;
2. criar um revert do merge da RC1, preservando histórico;
3. confirmar que o revert restaura a base de código equivalente ao SHA pré-corte `88b602f0dc71184b3842763b63a7e34cc4d89316` mais eventuais correções explicitamente preservadas;
4. aguardar autoDeploy do Render;
5. republicar GitHub Pages a partir da `main` revertida;
6. repetir `/health` e smoke mínimo.

O deploy API conhecido como referência pré-corte é `dep-dak44tad0e5s739ul1t0`.

## 7. Rollback de banco

Se houver alteração ou corrupção de dados/schema atribuível ao corte:

1. interromper novas mutações financeiras;
2. reverter o código primeiro para uma versão compatível com o ponto que será restaurado;
3. restaurar o backup/PITR confirmado na seção 3;
4. não executar `db push` de uma versão divergente durante a restauração;
5. conferir fingerprint, integridade financeira e `/health` antes de reabrir writers;
6. documentar qualquer transação legítima posterior ao ponto restaurado que precise ser reaplicada.

Sem um ponto de restauração comprovado, não executar o corte.

## 8. Rollback Android

Android não deve ser tratado como simples downgrade. O canal de atualização usa `versionCode` crescente e assinatura permanente.

Se a RC1 Android já tiver sido publicada e precisar de rollback:

1. partir do commit de código reparado/revertido;
2. gerar **nova versão com `versionCode` maior** que a defeituosa;
3. assinar com a mesma chave permanente;
4. validar assinatura e SHA-256;
5. publicar o novo APK no canal estável;
6. atualizar `app-version.json` para essa versão corretiva.

Não substituir o APK por uma versão antiga de `versionCode` menor esperando downgrade automático.

## 9. Critério para declarar Phoenix V15 oficial

A V15 só passa a ser oficial quando todos os itens abaixo estiverem concluídos:

- `[ ]` backup/PITR comprovado;
- `[ ]` PR #267 mesclado por decisão explícita;
- `[ ]` API nova LIVE e `/health` correto;
- `[ ]` Web oficial publicada;
- `[ ]` smoke financeiro pós-corte aprovado;
- `[ ]` Android release assinado aprovado/publicado ou deliberadamente adiado;
- `[ ]` nenhuma divergência não explicada nas tabelas financeiras;
- `[ ]` rollback permaneceu disponível durante toda a janela de observação.

Até lá, a RC1 é candidata homologada, não produção oficial.
