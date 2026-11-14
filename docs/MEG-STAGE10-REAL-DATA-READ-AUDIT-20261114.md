# Etapa 10 | Leitura autorizada da base real | 14/11/2026

## Escopo e mudança de direção

O responsável rejeitou contratação e banco Free temporário como solução definitiva. Reiterou uma única preview consolidada até integração futura na main e determinou usar dados que realmente existem na base. Autorizada consulta de dados reais para fundamentar a implementação. Não autorizadas mutações financeiras, migração, merge, alteração Android, contratação ou Etapa 11. Leitura de produção autorizada neste escopo não equivale a deploy produtivo.

## Evidências consultadas

Supabase meg-financas, projeto ugbiqzaqnrhulhetevby, workspace Finanças de Marcos, proprietário confirmado por nome completo. Nenhum outro workspace financeiro consultado. Queries com BEGIN READ ONLY e COMMIT, somente catálogo SQL, contagens, campos históricos e amostra limitada. Nenhuma senha, token ou hash lido. Nenhuma alteração de schema, grants, RLS, dados ou configuração. Não exportar registros reais para assets públicos, fixtures, Git ou artefatos de CI.

Inventário no instante da leitura:

| Fonte | Registros |
|---|---:|
| FinancialEvent do proprietário e workspace | 3738 |
| FinancialEvent sem archivedAt | 3731 |
| FinancialEvent com legacyTransactionId | 3633 |
| FinancialEvent sem legacyTransactionId | 105 |
| AppState.transactions | 3630 |
| Account do proprietário | 2 |
| CreditCard do proprietário | 4 |
| CardPurchase do proprietário | 21 |
| Payable do proprietário | 0 |

As contagens têm filtros/semânticas distintas e NÃO constituem reconciliação ou prova de duplicidade. Não somar AppState e FinancialEvent. AppState.revision observado 1561; __megNormalization.mode = normalized-primary. Datas de eventos observadas de junho/2025 a agosto/2028, incluindo futuros; não assumir que só mês corrente existe. Payable vazio não significa ausência de compromissos, que também podem derivar de eventos/faturas.

## Contrato real que a UI precisa preservar

- Eventos: IDs, workspaceId, userId, date, competence, amount/signedAmount numéricos, status, archivedAt, versões e sourcePayload históricos. Precisão monetária vem da autoridade existente.
- Há 3512 eventos ativos sem paymentMethodId e com campos históricos em sourcePayload, incluindo paymentMethod, category, financialScope, financialAccountId, expenseClass, group, situation e modality. Ausência do vínculo não autoriza criar cadastros ou inventar classificação. OperationalLaunches já possui fallback de exibição para campos históricos.
- Conta benefício e método Verocard não podem virar CreditCard por existir tipo credit em cadastro histórico. Preservar financial-policy e autoridade exclusiva de benefício.
- Há 21 compras normalizadas em CardPurchase; o contrato atual de batch-edit-preview-read fornece prévia de ciclo SOMENTE para card-purchase. FinancialEvent, benefício e Payable continuam bloqueados com motivos específicos; não converter os milhares de eventos em CardPurchase nem inferir IDs por nome/descrição.
- ID/updatedAt devem vir da mesma origem real selecionada. Não utilizar QA_EDIT_EXPENSE_SNAPSHOT para um registro real nem mesclar catálogos/IDs fictícios com reais.

## Lacuna comprovada da preview

apps/web/src/meg-web-evolution/integrated-qa/unified-preview.tsx usa homeP0QaPreviewFixture, catálogos e histórico fictícios, LoginScreen previewOnly e sobrescreve window.fetch para bloquear toda rede. Portanto, os dados reais AINDA NÃO ESTÃO na preview. Não declarar integração implementada ou homologada.

Reutilizar os leitores existentes em apps/web/src/meg-web-evolution/launches/OperationalLaunches.tsx, authorized-history.ts e app/finance-client.ts para consistência de versão, snapshots, rótulos históricos e totais de servidor. Preservar UI Prism homologada. O main.tsx operacional não deve ser publicado no lugar da preview como atalho, pois não equivale à composição consolidada e às proteções de QA.

O serviço atual é estático e não pode executar Fastify. A API existente tem autenticação/autoridades reutilizáveis, porém endpoints genéricos podem chamar resolveWorkspaceContext, cujo fallback ensurePrimaryWorkspace pode escrever. Um GET por si só NÃO prova read-only. Auditar o caminho completo antes de liberar consultas na preview. Não alterar CORS produtivo nem copiar segredo/credencial de DB para frontend. Registrar a rota de batch preview em produção continua fora da autorização atual.

## Próximo passo exato

Preparar, na branch isolada da Etapa 10, conexão autenticada de leitura ao contrato existente, sem fallback para fixtures quando a API falhar, sem habilitar writers e sem alteração visual arbitrária. Testar origem CORS, sessão, isolamento por workspace, versão e propriedade real de registros; não publicar dados em bundle nem em URL pública sem autenticação. Utilizar a mesma preview consolidada. Confirmar caminhos sem efeitos colaterais antes de acessá-los. Nenhum banco novo necessário para decidir a fonte dos dados. Integração no navegador e sua homologação funcional continuam pendentes.

## Implementação isolada de leitura na mesma entrada da QA (14/11/2026)

**Branch isolada:** `stage10/real-data-read-integration-20261114`, criada a partir de `3757303c94fe4fe68c03c515a9dd7d0273086884`. PR #688 continua Draft e sua branch oficial não foi alterada por esta integração. Não houve merge, alteração da `main`, CORS produtivo, dados, escritores, Android, Render ou deploy.

### Código preparado, sem liberação da leitura real

- `unified-preview.tsx` mantém a mesma entrada HTML homologada, com fluxo demonstrativo intacto por padrão e `window.fetch` bloqueado. O parâmetro opt-in `?dados=reais` seleciona o módulo `UnifiedRealReadQa`, mas exibe **Leitura real bloqueada nesta QA** enquanto a flag explícita e a origem HTTPS da API não forem fornecidas.
- `stage10/real-data-read.ts` reaproveita `auth-client`, `finance-client`, `authorized-history`, `OperationalLaunches` e o `readHome` exportado. Antes de qualquer leitura financeira, valida identidade da sessão e exige contrato autenticado `GET /finance/stage10-readonly-capability` com `kind=stage10-financial-readonly-v1`, `actorId` equivalente ao usuário, `workspaceId` e `dataOwnerId` presentes, `canRead=true`, `canWrite=false` e `sideEffects=none`. **Essa rota de atestado não existe na API ativa**; portanto, mesmo uma habilitação acidental da flag não autoriza GET financeiro da ponte. Não existe fallback de dados fictícios.
- Após atestado válido, o cliente requer sync-token antes/depois, histórico completo com snapshot quando a API anunciar suporte, ou paginação de dupla leitura quando não anunciar. Erro, mudança de sessão ou revisão invalidam a consulta. Os resumos/valores financeiros continuam exclusivamente no servidor.
- Os catálogos da tela real só podem conter cadastros devolvidos pela API; o editor recebe conta e forma de pagamento somente por ID. Rótulos históricos não inventam IDs. `CreditCard` não é inferido a partir de `FinancialEvent` ou Verocard; na ponte opt-in, a lista de cartões de crédito permanece vazia até haver contrato tipado autorizado. `OperationalLaunches` passa adiante o tipo real das contas, preservando distinção monetária/benefício. Escritas permanecem bloqueadas; a edição é somente simulação.
- Adaptador `stage10-readonly-workspace.ts` foi preparado no backend da branch, com `SET TRANSACTION READ ONLY` e `RepeatableRead`, autenticação e seleção de membership sem chamar `ensurePrimaryWorkspace`. Não está registrado nas rotas nem habilitado na API produtiva.

### Testes

- `scripts/meg-stage10-real-data-read.contract.test.mjs`: guarda opt-in, ausência de fixtures no fluxo real, dados não parciais, writer bloqueado, proteção contra vínculos de nome, atestado do backend antes de GET, workspace com transação read-only.
- `scripts/meg-stage10-real-read-gate.browser.mjs`: ausência de credenciais e de chamadas à API quando a leitura está bloqueada, além da preservação do fluxo demo.
- Workflow isolado `.github/workflows/meg-stage10-real-read-integration.yml`: dependências imutáveis, testes de contrato, TypeScript Web, build Vite QA, Playwright da trava e da QA visual sintética. Execução **#43602553746 SUCCESS** para a versão de código anterior ao novo atestado; o novo atestado exige nova execução antes de eventual liberação.
- Correções de tipagem pré-existentes na Home e em Lançamentos foram limitadas a anotações, preservando comportamento. Nenhum gate anterior foi declarado retroativamente verde; divergência histórica Stage09 permanece.

### Lacunas bloqueantes

1. A API ativa roteia GETs financeiros por `resolveWorkspaceContext`, cuja ausência de membership pode executar `ensurePrimaryWorkspace` (operações de escrita). A garantia de leitura apenas não está comprovada nessas rotas. O novo resolvedor read-only **ainda não substitui** essas rotas. É necessário um contrato de backend auditado, ligado a endpoints sem efeitos colaterais, com testes e autorização de publicação.
2. Render `srv-dbr00b56e07s738n62n0` é `static_site`. A allowlist CORS versionada da API não inclui sua origem. Não alterar CORS produtivo nem criar um proxy/banco/serviço de custo desconhecido. Uma implantação de API controlada, com origem explicitamente autorizada e perfil de leitura estrito, permanece decisão separada.
3. Não há autenticação funcional ou dados reais homologados **no navegador público**; nenhum teste sintético comprova essa integração real. A QA estática homologada permanece no deploy `dep-dbs3vijbc2fs73aggcn0` e versão visual `01e55459aa6fba813984dc047470383c80eb54ec`.
4. Prévia financeira de ciclo de cartão permanece limitada a `CardPurchase`; outros objetos exigem regras próprias. Escrita financeira, migração e Etapa 11 não estão autorizadas.

**Próximo passo:** auditar e implementar rota(s) de leitura verdadeiramente livres de efeitos colaterais, com autenticação e isolamento por workspace, somente na branch Stage10. Validar CORS e rota antes de qualquer ativação; publicar no mesmo Render somente após gates aplicáveis e autorização de ambiente, para homologação funcional separada. Não avançar à `main`.
