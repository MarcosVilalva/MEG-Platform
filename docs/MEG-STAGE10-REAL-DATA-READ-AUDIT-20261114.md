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
