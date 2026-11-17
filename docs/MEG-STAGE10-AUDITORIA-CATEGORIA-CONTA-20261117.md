# MEG Finanças Web Evolution | Etapa 10
## Auditoria de classificação histórica, coluna Conta / Cartão e barreiras de produção
**Data:** 17/11/2026
**Branch:** `stage10/prism-real-read-optin-20261116`
**PR:** #696 DRAFT
**Status:** correção apenas da visualização e do contrato de leitura; correção de vínculos no banco NÃO AUTORIZADA e NÃO EXECUTADA.

### 1. Evidências recebidas
- Print do DataGrid com nome longo da conta monetária cortado sem reticências na coluna `Conta / Cartão`.
- Print da Home durante leitura progressiva (cartões e saldo ainda em consulta). O print é evidência do estado transitório, não de conclusão do carregamento nem de falha da API.
- Responsável reportou vários lançamentos sem categoria e exigiu estabilização antes de uso operacional. A Web atual é **preview Free** que consome API existente com dados reais; **não é Web de produção homologada**.

### 2. Inspeção somente leitura no Supabase produtivo
Consulta por ferramentas Supabase, exclusivamente comandos `SELECT` / catálogos, sem `UPDATE`, `DELETE`, `INSERT`, `CREATE INDEX`, `ALTER`, migrations ou efeitos de escrita.

Dados no momento da inspeção:
| Métrica | Quantidade |
|---|---:|
| FinancialEvent com `archivedAt IS NULL` | 3.731 |
| Eventos ativos com `categoryId` válido em Category | 105 |
| Eventos ativos com `categoryId IS NULL` | 3.626 |
| Desses com rótulo de categoria não vazio em `sourcePayload.category` | 3.626 |
| Desses com rótulo literalmente `Sem categoria` | 2 |
| Eventos ativos com rótulo diferente de `Sem categoria`, mas sem vínculo canônico | 3.624 |
| Eventos ativos com `accountId IS NULL` | 0 |
| Eventos ativos com `accountId` órfão | 0 |
| Eventos ativos com `workspaceId IS NULL` | 0 |
| Eventos ativos `expense/planned` com categoria não vinculada | 326 |
| Eventos ativos com `paymentMethodId IS NULL` (de todas as tipologias) | 3.512 |

**Mapeamento ambíguo:** comparação somente leitura de `lower(trim(sourcePayload.category))` com `lower(trim(Category.name))` restringida ao mesmo `userId` mostrou que os nomes associados a **3.624 eventos** coincidem com *mais de um* registro em Category. Os outros dois têm rótulo `Sem categoria` sem correspondência de nome. **Não existe base técnica para atribuir por nome um Category.id único.** Essa comparação é apenas diagnóstica, não constituiu vinculação de eventos. Eventuais regras adicionais (tipo, grupo, dono, legado de origem, tabela de mapeamento aprovado) dependem de prova e aprovação antes de escrita.

**Amostra de distribuição por tipo/status:** `expense/paid`: 2.759 (2.711 sem vínculo); `income/paid`: 646 (589 sem vínculo); `expense/planned`: 326 (326 sem vínculo). Campos de pagamento não vinculados não significam necessariamente ausência de texto legado.

### 3. Diagnóstico dos consumidores
- `apps/api/src/modules/finance/phoenix-preview-events.ts` fornece evento com `sourcePayload` e relação `category` quando houver `categoryId`. A API retorna informações de origem, mas a categoria relacional pode permanecer nula em históricos importados.
- `apps/api/src/modules/finance/history-filter.ts` já filtra `legacy:<nome>` por rótulo de origem, preservando a distinção de `categoryId`. Também calcula agregados via política canônica, não pela Web.
- `apps/web/src/meg-web-evolution/launches/OperationalLaunches.tsx` já repassa `legacyCategoryName` dos dados históricos. A Web não deve preencher um `categoryId` faltante com base apenas no nome.
- `LaunchesStage09.tsx` agora admite de modo explícito tanto `legacyCategoryName` quanto `sourcePayload.category`, define origem `canonical`, `historical` ou `unclassified` e preserva o título original. `LaunchCategoryBadge.tsx` fornece tooltip de categoria histórica sem afirmar vínculo relacional.
- `Conta / Cartão` usava `type=enum` padrão DataGrid, cuja pill podia transbordar com um nome longo. Substituído **somente nesta coluna** por render específico com nome completo em `title`/acessibilidade e texto com `text-overflow:ellipsis`; o valor de `row.account` permanece íntegro para filtro, exportação e modal. CSS limitado a `launches-stage09.css`, sem alterações no DataGrid compartilhado.

### 4. Arquivos de código e teste
- `apps/web/src/meg-web-evolution/launches/LaunchesStage09.tsx`
- `apps/web/src/meg-web-evolution/launches/LaunchCategoryBadge.tsx`
- `apps/web/src/meg-web-evolution/launches/launches-stage09.css`
- `scripts/meg-stage10-prism-real-read-optin.browser.mjs`
- Código final **`8ec6fbf750307bd7a806ac80b151a7213358cc4a`**.
- [CI sintético #44057580340](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44057580340) SUCCESS com dez viewports, categoria histórica `BEBIDAS E SIMILARES`, conta longa truncada com título íntegro, segurança por titular, e TypeScript.
- [CORS #44057580303](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44057580303) SUCCESS; [smoke público pré-deploy #44057580203](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44057580203) SUCCESS, relativo à versão que estava LIVE antes do código novo.
- Deploy manual da mesma preview Free `dep-dbu22s4ipgvc73ag4l00` iniciado em 17/11/2026 09:42 UTC com commit fixado no SHA acima. **Confirmar LIVE e smoke pós-deploy antes de fornecer nova URL como publicada**. Não há aprovação visual humana desta alteração.

### 5. Bloqueios para liberação operacional
1. **Migração de categorias**: necessita caracterização e política de equivalência inequívoca, com dados QA, rollback e aprovação explícita. Não converter rótulos históricos em vínculos canônicos por heurística nem reparar dados reais automaticamente.
2. **Meios de pagamento**: há grande população com `paymentMethodId` nulo. Auditar rótulos de origem e regras para editar/pagar antes de habilitar writes. Não concluir que 3.512 eventos estão sem informação textual de pagamento.
3. **Home**: tela em carregamento parcial é comportamento previsto da implementação atual; warmup pós-sessão e eliminação da tela de despertar Render Free estão apenas planejados em `docs/MEG-STAGE10-PLANO-LOADING-WARMUP-COTA-FREE-20261117.md` e não implementados.
4. **Teste real em sessão autenticada**: validar categorias, filtro por legado, exportação, conta truncada, Home/indicadores, período, responsive e dados entre usuários/workspaces. Testes sintéticos e smoke público pré-login não homologam produção.
5. **Segurança de produção**: API de produção permanece intocada. Escritores financeiros, merge, Android e Etapa 11 continuam proibidos.

### 6. Próximo gate
Após LIVE e smoke público, colher validação visual explícita da coluna e rótulos, enquanto se abre plano de saneamento de dados **somente em QA isolado**, sem escrita na base real. Em paralelo, realizar inventário de demais problemas técnicos da Etapa 10 que bloqueiam a operação financeira. Não afirmar “sistema estável para produção” com os vínculos financeiros pendentes.
