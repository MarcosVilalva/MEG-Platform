# MEG Finanças Web Evolution | Etapa 10 | Diagnóstico real consolidado: banco, regras de pagamento e APK

**Data:** 17/11/2026. **Origem dos dados:** consultas `SELECT` exclusivamente no projeto Supabase produtivo `meg-financas` (sem dados individuais exportados), assessoramento de segurança e performance; GitHub Release `android-latest` inspecionado automaticamente em runner descartável.  
**Branch:** `stage10/saneamento-qa-descartavel-20261117`, PR #697 Draft. **Nenhum SQL de escrita executado no banco real.**
**Estado:** marco 5/10 aberto, 40% técnico, 0% de migração produtiva.

## 1. Inventário verificado diretamente no banco real

| Indicador | Quantidade |
| --- | ---: |
| FinancialEvent total | 6.576 |
| Ativos | 3.731 |
| Arquivados | 2.845 |
| Ativos legados com legacyTransactionId | 3.630 |
| Ativos sem categoryId | 3.626 |
| Ativos sem paymentMethodId | 3.512 |
| Ativos sem workspaceId, userId ou accountId | 0, 0, 0 |
| Ativos com LedgerEntry | 118 legados |
| Arquivados sem workspaceId | 2.838 |
| Ativos income / expense | 646 / 3.085 |

As chaves `category`, `expenseClass`, `paymentMethod`, `financialScope`, `modality` e outras estão presentes nos `sourcePayload` dos 3.630 legados ativos. **Uma string no payload não equivale a FK financeira homologada.** Há 101 ativos sem `sourcePayload` legado, que devem preservar vínculos canônicos.

Entre as relações preenchidas dos eventos ativos, nenhuma divergência de proprietário de conta/categoria/método/workspace e nenhuma divergência de tipo categoria/evento foi encontrada pelos cruzamentos consultados. A ausência de divergência atual não substitui validação transacional das próximas escritas.

## 2. Matriz de vínculos por evidência

**Categoria:** dentre 3.626 sem FK, o cruzamento pelo mesmo `userId`, `type`, `sourcePayload.category = Category.name`, `sourcePayload.expenseClass = Category.group`, categoria ativa, encontrou **3.035** candidatos tecnicamente únicos, **0** múltiplos e **591** sem correspondência. Dois dos 3.035 têm rótulo sentinela `Sem categoria` e são bloqueados, sobrando **3.033 candidatos à revisão**, **não** à aplicação automática.

**Pagamento:** dentre 3.512 sem FK, o cruzamento por `userId` e `sourcePayload.paymentMethod = PaymentMethod.name`, método ativo, identificou **2.900** candidatos técnicos únicos, **0** múltiplos e **612** sem correspondência. Desses sem match, **496** trazem o rótulo `Não informado` e **116** trazem `CARTÃO LATAM PASS`. Nenhum método ou cartão inexistente foi criado.

**Correspondência simultânea:** 2.806 ativos têm possível categoria e método coincidentes por esses critérios. Segregação aproximada do escopo operacional:
- 649 casos monetários à vista sem marcador especial de cartão/benefício e com duas correspondências técnicas: grupo **prioritário para revisão**, ainda não autorizado para UPDATE;
- 2.157 casos com duas correspondências mas marcadores de cartão, crédito ou benefício: **revisão financeira especializada**, sem simples ligação de FKs;
- demais grupos sem par completo ou com informação ausente devem permanecer sem inferência.

A classificação de risco utiliza marcadores de `financialScope`, `modality` e `paymentMethod` e **não** substitui regras financeiras canônicas.

## 3. Risco concreto de status/cálculo por tipo de método

`financial-policy.ts`, função `resolveCanonicalFinancialStatus`, adia despesas para `planned` quando `PaymentMethod.type = credit`. Em dados reais, verificados por SELECT:
- **1.855** despesas legadas da modalidade `CREDITO` têm candidato de método `type=other`, o que não acionaria essa regra de crédito;
- **278** eventos do escopo `benefit` com `Verocard` têm candidato `PaymentMethod.type=credit`, embora benefício/alimentação deva usar escritor exclusivo e não gerar fatura;
- **293** eventos legados de benefício no total: 278 com Verocard/Alimentação, 15 com método `Não informado` e modalidade `-`.

Em `apps/api/src/modules/finance/stage10-mapping-status-collision.test.ts` foi criada **prova sintética de caracterização** (sem mudar regra): `type=other` não força status de fatura; `type=credit` transforma o requested `paid` em `planned`, inclusive se a modalidade nominal for Verocard. O teste confirma também `isBenefitFinancialEvent` e exclusão de benefício do saldo monetário. Esse comportamento exige regra de migração homologada; não é prova de saldo já errado na base.

Além disso, 38 eventos `expense` ativos possuem `signedAmount=amount>0`, total R$ 1.449,78, todos `paid`. Podem ser créditos/estornos de despesa legítimos. **Proibido inverter o sinal automaticamente** sem caracterização da origem.

## 4. Segurança de acesso e performance, leitura real

Advisor Supabase em 17/11/2026: 32 tabelas em `public` com RLS ligada mas sem políticas (lint informativo). Consulta ao catálogo confirmou **32/32 com RLS habilitada**, **0** políticas, **0** tabelas com privilégios diretos a `anon` ou `authenticated` para SELECT/INSERT/UPDATE/DELETE. Portanto o alerta `rls_enabled_no_policy` **não demonstra vazamento público**. Não significa que usuários da API Prisma tenham isolamento multi-tenant garantido: isso depende da credencial e das verificações do servidor.

Advisor de segurança sinalizou `pg_net` no schema `public` (WARN). Advisor de performance listou 9 FKs sem índice de cobertura e 13 índices não utilizados segundo estatística atual. **Não criar políticas, mover extensão, apagar índice ou conceder permissões** sem plano de migração, revisão do modelo de acesso e autorização específica.

Referências dos lints: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy e https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public .

## 5. APK de release realmente inspecionado

O script `scripts/meg-stage10-apk-release-readonly-audit.py` foi executado no [GitHub Actions #44096487998](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44096487998), **SUCCESS**, baixando e analisando o arquivo de release `MEG-Financas-708.apk` sem instalar ou executar.

- Artefato: `MEG-Financas-708.apk`, 6.715.918 bytes;
- SHA-256: `1718b23c2f38977c5d759c07b26e59762819fd9d16168c017859bd09f2ee83c6`;
- Package ID: `br.com.megfinancas.app`;
- Version code: `708`; version name: `2.0.708`;
- **Host embutido detectado em assets:** `meg-platform-api.onrender.com`;
- 30 assets de texto inspecionados; as strings `app-state/transactions` e `megCloudConfirmation` **não foram localizadas nesses assets**. Isso NÃO prova ausência desses protocolos na APK nativa ou em código remoto, nem qual URL a APK efetivamente instalada consulta.

A presença do host confirma risco de acoplamento do APK **publicado** com a API Render compartilhada. **Não foi comprovado que a versão 708 é a instalada no aparelho do usuário.** Logo, permanece proibido implantar a API corrigida no endpoint compartilhado sem gate específico do Android.

## 6. Premissas preservadas do pacote de auditoria histórico

O pacote de QA sintético da Etapa 10 (branch PR #696, produzido anteriormente) documentava **3.033** categorias revisáveis, **2.900** pagamentos candidatos, **591/612** exceções e 18 testes fictícios de classificação; os contadores foram **reconfirmados** pela consulta real desta rodada. Não reclassificar a sentinela `Sem categoria`, não inferir FKs por homônimos, não transformar `Não informado` em um pagamento, não inventar LATAM PASS, não associar Verocard a cartão de crédito.

## 7. Decisão de execução e próximos gates

1. Preservar IDs/valores/status/ledger e a API produtiva. Em PR #697 Draft, a sincronização normalizada e a reconstrução shadow estão protegidas em QA, CI PostgreSQL17/Fastify aprovado.
2. **Não executar atualização em lote**, nem nos 649 casos do grupo prioritário, antes de comprovar neutralidade de status, saldos, parcelas, benefícios e totalização. Mapear por ID real e revisão auditada, com `chosenId` somente após aprovação de regra e revisor.
3. Manter issue #699 P0: Android legado repete 409/422; confirmação da origem da APK de release não substitui prova no dispositivo instalado. Não criar segunda fonte produtiva de dados divergentes.
4. Preparar testes de caracterização de correspondências e regras de status com fixtures fictícias (sem copiar dados reais); adotar política de revisão expressa para 3.033/2.900 candidatos. Arquivados permanecem fora da execução e sem restaurar workspace por suposição.
5. Somente após compatibilidade, autenticação integrada e backup/restauração isolada com dry-run e rollback realizar qualquer saneamento autorizado de produção. Progresso técnico permanece **40% (4/10)** e execução produtiva **0%**.

**Sem deploy, merge, alteração do Android, Render, Supabase, main, custos novos ou Etapa 11.**
