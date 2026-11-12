# MEG Web Evolution — Etapa 10 — Auditoria inicial de contratos (12/11/2026)

**Estado:** auditoria preliminar; nenhuma operação financeira nova autorizada. **Base visual congelada:** `760b7ad0e3217dbab70ea426df9cad67318f79ef`. Branch isolada: `stage10/novo-editar-lancamento-isolado-20261112`.

## Fontes verificadas

- `docs/MEG-WEB-FINANCIAL-AUTHORITY.md`: autoridades financeiras canônicas e módulos apenas de compatibilidade.
- `MEG-WEB-CONTINUIDADE-OFICIAL.md`: última homologação do Shell, Home e Lançamentos e autorização de Etapa 10.
- Prompt Master e PDF Regras Consolidadas, exclusivamente regras financeiras aplicáveis (itens 7–16, 18–19, 21–22; item 11 de Crediário excluído por decisão posterior).

## Mapa inicial de regras, contratos e consumidores futuros

| Regra / domínio | Arquivo e linhas verificadas | Comportamento atual observado | Uso previsto |
| --- | --- | --- | --- |
| Criação monetária | `apps/api/src/modules/finance/event-mutation.ts:43-175` | `createFinancialEventProtected`, transação serializável, valida referências e bloqueia benefício no writer monetário; status via política central, duplicidade semântica, auditoria e receipt opcional | Novo despesa/receita comuns |
| Status / Fixo | `apps/api/src/modules/finance/financial-policy.ts:103+` | `resolveCanonicalFinancialStatus` utilizado pelo writer, não calcular na UI | Novo/Editar e resumo |
| Criação de benefício | `apps/api/src/modules/finance/benefit-event-mutation.ts` (`createBenefitEventProtected`) | Writer separado com conta `BENEFIT`, pagamento de benefício, status `paid`, saldo disponível, auditoria e idempotência | Alimentação e benefício |
| Edição de benefício | `apps/api/src/modules/finance/benefit-event-mutation.ts` (`updateBenefitEventProtected`) | Writer separado, `expectedUpdatedAt`, proteção de saldo e transação serializável | Editar alimentação |
| Crédito parcelado | `apps/api/src/modules/cards/service.ts` (`createCardPurchaseProtected`) | Compra própria por cartão, distribui centavos e determina mês conforme fechamento | Novo crédito |
| Edição de compra e parcela | `apps/api/src/modules/cards/routes.ts:336-493` | Compra preserva IDs das parcelas; edição unitária de parcela aberta reconcilia total e bloqueia parcela paga/parcial | Editar crédito |
| Exclusão de compra | `apps/api/src/modules/cards/routes.ts:496+` | Cancelamento com proteção de domínio e registro de auditoria | Excluir crédito |
| Edição monetária legada | `apps/api/src/modules/finance/routes.ts:422-429` → `service.ts:229-283` | Rota PATCH chama `updateFinancialEvent` de `service.ts` | **Não adotar sem caracterização/conciliação** |
| Exclusão monetária legada | `apps/api/src/modules/finance/routes.ts:432-439` → `service.ts:285-319` | Arquivamento lógico e exclusão dos lançamentos de razão vinculados, auditados | **Não adotar sem caracterização/conciliação** |
| Saldo e serialização | `apps/api/src/modules/finance/monetary-protection.ts` | Leitura de saldo e transação serializável com retry | Somente pela autoridade financeira |

## Riscos e lacunas que impedem ligar o botão Salvar de produção

1. **DIVERGÊNCIA de caminhos de mutação:** criação monetária usa `event-mutation.ts` e `serializableFinancialTransaction`, mas edição e exclusão das rotas de eventos usam `service.ts` com `prisma.$transaction` sem declarar o mesmo isolamento. Não alterar nenhum contrato antes de caracterização.
2. `updateFinancialEvent` de `service.ts:229-283` não chama `resolveCanonicalFinancialStatus` e não mostra, neste trecho, a mesma barreira explícita contra contas/formas de benefício do writer de criação. **Potencial divergência de domínio a testar**, não declarar bug confirmado.
3. **Alimentação obrigatória:** o contrato de negócio exige Conta Benefício + Verocard + Pago e vínculos travados. O writer de benefício valida conta do tipo `BENEFIT` e forma reconhecida de benefício; é necessário comprovar em teste o catálogo exato Verocard e a vinculação automática antes de habilitar gravação.
4. **Autocomplete:** regra funcional confirmada no checkpoint: selecionar descrição histórica recupera categoria, conta e forma, sem copiar valor/data. Fonte de histórico e contratos atuais ainda precisam ser identificados; não inventar sugestão.
5. **Exclusão:** /events/:id e cancelamento de compras usam permissões admin. Não disponibilizar Excluir a usuários com outros papéis sem caracterizar a autorização atual.
6. **Saldo insuficiente:** criação de benefício possui proteção explícita. Para despesa monetária, deve-se testar o comportamento real de `createFinancialEventProtected` e política de saldo, sem presumir bloqueio universal.
7. Edição de despesas, cartões, pendentes e benefícios precisa identificar o domínio do registro **antes** de abrir ação de alteração ou exclusão.
8. Nenhum mock pode substituir o ID real de conta/cartão/categoria no writer; dados fictícios somente em QA isolado, sem banco produtivo.

## Gate para avançar à UI funcional

- Caracterização de criar/editar/excluir por domínio, idempotência, duplicidade, concorrência, atomicidade, saldo insuficiente, status Fixo/Pendente e vínculos Alimentação.
- Caracterização de parcelas e fechamento, preservação de centavos, competência e cancelamento.
- Verificar contratos de leitura/autocomplete e preenchimento inicial de edição.
- Implementar isoladamente seletor de tipo, formulário compartilhado e edição segundo prints oficiais, reutilizando Shell visual homologado sem alterar seus blobs.
- Publicar apenas preview QA sem cache; solicitar homologação visual explícita.
- Sem merge, deploy produtivo, alteração no Android, API ou banco.

**Status:** apenas auditoria documental iniciada. Testes novos, implementação visual, preview e aprovação da Etapa 10 ainda pendentes.

## Caracterização adicionada nesta continuação (12/11/2026)

- Arquivo `scripts/meg-stage10-financial-characterization.test.ts`: 12 testes de contrato, incluindo execução real da política pura de status, benefício e decisão monetária em centavos, além de asserções estruturais de writers/rotas existentes. **Asserção estrutural não demonstra atomicidade transacional real**; os testes de integração com PostgreSQL descartável permanecem necessários.
- Workflow `.github/workflows/meg-stage10-characterization-isolated.yml`: CI restrita à branch `stage10/novo-editar-lancamento-isolado-20261112`, sem banco, segredos, deploy ou alterações de produção. Executa TSX, testes core/dados e build Web.
- Não foi comprovado o resultado verde da execução GitHub Actions nesta rodada. Não considerar caracterização completa ou UI liberada por essa simples inclusão dos arquivos.
- Criação, edição e exclusão no banco de QA devem ser testadas posteriormente com fixtures fictícias, rollback/retry/conflito real, papéis de autorização e domínio específico.
- O caminho de autocomplete de descrição histórica ainda requer confirmação operacional da leitura/autorização. Não conectar dados históricos legados diretamente a formulário novo.
- Alerta: a rota de edição monetária em `finance/service.ts` não foi promovida à autoridade da nova Web.

## Auditoria complementar (12/11/2026)

- **17 testes agora versionados**, sendo testes de política pura e asserções estruturais de contratos. Não afirmar que 17 testes foram executados: ainda não há comprovação do gate verde, e testes estruturais não substituem integração transacional.
- **Autocompletar histórico:** rota GET `/events/history-snapshot` (finance/routes.ts:346+) retorna itens com `account`, `category` e `paymentMethod` (finance/service.ts:116-165), em leitura consistente com limite de 5.000 registros e resposta `limit-exceeded` quando ultrapassado. **Não é um endpoint dedicado de autocomplete** e ainda falta caracterizar seleção de sugestão sem copiar data/valor, paginação/fallback e isolação por usuário.
- **Catálogos:** `catalog-scope.ts:5-25` só encontra conta/categoria/forma de pagamento ativas para o dono dos dados. A interface não deve adivinhar IDs.
- **Permissões:** POST/PATCH de evento e benefício exigem ADMIN/MANAGER/OPERATOR; DELETE de evento e compra exige ADMIN/MANAGER. VIEWER não pode receber botão funcional de gravação.
- **Divergência crítica em edição:** `finance/service.ts:229-283` executa edição de evento por `prisma.$transaction` e atualização genérica, sem resolução de status canônica, sem `expectedUpdatedAt` e sem guarda de benefício visível no writer de criação. A rota existe, mas **não fica liberada para a nova Web** antes dos testes e reconciliação.
- **Proteção de saldo:** `event-mutation.ts:43-175` não demonstra uma consulta de saldo monetário prévia ao insert. Não declarar bloqueio de insuficiência do saldo em despesa monetária sem ensaio transacional ou decisão expressa da autoridade. Benefício exige saldo suficiente explicitamente.
- **Alimentação:** política reconhece nome Verocard; writer benefício exige conta do tipo BENEFIT e método reconhecido, com status paid. A obrigatoriedade de escolher automaticamente Conta Benefício + Verocard + Pago ainda precisa de contrato de vínculo de catálogo, sem heurística ou nome hardcoded na camada visual.
- **Status:** `financial-policy.ts:103+` realiza receita e Fixo, mas crédito prevalece como `planned` mesmo em Fixo. UI não pode recalcular nem sobrescrever essas decisões.

**Bloqueios restantes:** executar CI, testes transacionais em PostgreSQL isolado para criação/edição/cancelamento e saldo, caracterização de autocomplete e vínculo Alimentação, definição segura do caminho de edição monetária. Nenhum preview novo nem aprovação visual da Etapa 10.

## Contrato de autocomplete read-only e PR (12/11/2026)

- PR de isolamento **#678 Draft**, base `preview/09-lancamentos-home-p0-qa-20261111`, commit-base visual exato `760b7ad0e3217dbab70ea426df9cad67318f79ef`. **Não mesclar**.
- Arquivo `apps/web/src/meg-web-evolution/stage10/autocomplete-history.ts`: adaptador de sugestões de descrição a partir do snapshot `financial-history-v1` completo. Só devolve descrição, categoria, conta e forma, incluindo IDs (sem valor, data, competência nem status). Distingue descrições iguais com vínculos diferentes; `limit-exceeded` não apresenta conteúdo enganoso.
- Arquivo `scripts/meg-stage10-autocomplete-history.test.ts`: cinco casos de contrato de autocomplete, com dados fictícios. A suíte de política financeira anterior tem 17 casos, totalizando **22 casos escritos**. A execução dos testes e do build depende do gate, não pode ser presumida.
- Workflow exclusivo `MEG Stage10 - Caracterizacao Financeira Isolada` foi reconhecido e entrou na fila do GitHub Actions: execução **#43215699989** no SHA `79005159d30842ae3d59df008d501b8247ef1619` (status inicialmente queued/in_progress).
- Este adaptador ainda não foi integrado visualmente: exige confirmação dos catálogos ativos pelo formulário; a tela não pode usar identificação implícita do Verocard por nome em substituição aos vínculos obrigatórios.
- Edição monetária, exclusão, saldo insuficiente comum e testes transacionais continuam **pendentes**. Sem alterações de API, banco, Android, telas homologadas ou deploy.
