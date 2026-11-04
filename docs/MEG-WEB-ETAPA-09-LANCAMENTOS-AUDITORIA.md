# MEG Web Evolution | Etapa 09 | Auditoria de Lançamentos
Data de trabalho: 04/11/2026. Estado: **candidata visual read-only; NÃO homologada**.

## Base protegida
- Repositório: `MarcosVilalva/MEG-Platform`.
- Branch isolada: `preview/09-lancamentos-20261104`; PR Draft #656 contra `preview/06-home-refino-preservado-20261104`.
- Home PR #655: homologação visual exclusiva do código `dd0a472eee736558c224268c5bca096bc2d58187`. O código das telas, assets e CSS da Home não foram modificados.
- Seletor Novo Lançamento PR #654: homologação visual exclusiva do commit `28a2bd0f3b550c87958e78805f0ca1739e8adf62`. Não foi modificado.
- Android, API, banco, regras centrais, componentes compartilhados Shell/DataGrid e entrada autenticada `main.tsx`: intocados.

## Fontes que orientam a implementação
- `docs/MEG-WEB-FINANCIAL-AUTHORITY.md`; `docs/MEG-WEB-AUDITORIA-ETAPA-01.md`.
- `MEG-WEB-CONTINUIDADE-OFICIAL.md` e `PROMPT-MASTER.txt`.
- Itens 7–16, 18–19, 21–22 das Regras Consolidadas, **exceto o item 11 sobre Crediário**, excluído por decisão posterior.
- Exclusivamente a imagem oficial da tela Lançamentos no Projeto (`Imagem do ChatGPT 3 de out. de 2026, 16_54_48-4.png`), para aparência.
- A Home e o seletor Novo homologados, como contexto visual atual, sem modificar seu código.

## Matriz de auditoria de regras financeiras
A matriz abaixo usa as linhas auditadas e registradas em `docs/MEG-WEB-AUDITORIA-ETAPA-01.md`. Reflete a autoridade funcional, não declara que toda a UI já esteja integrada.

| Regra | Arquivo:linhas | Comportamento a preservar | Atinge |
|---|---|---|---|
| Classificação de status, Fixo, crédito | `apps/api/src/modules/finance/financial-policy.ts:103-121` | Receita/Fixo realizados, cartão pendente até fatura, benefício com writer próprio | Lançamentos, Novo/Editar, Pendentes |
| Escopo monetário e status postado | `financial-policy.ts:13-48`; `monetary-protection.ts:60-80` | Não incluir benefício ou transferência como lançamento monetário indevido | Home, Lançamentos, Benefícios |
| Valores e saldos realizados | `monetary-protection.ts:60-80,139-199` | Saldo por conta e data via domínio, nunca por somas de componentes | Home, Lançamentos, Pendentes |
| Criação protegida | `event-mutation.ts:43-192` | Idempotência, validação e status oficiais | Novo Lançamento (Etapa futura) |
| Leitura resumo/fluxo/analytics | `read-model.ts:21-310`; `routes.ts:258-310` | KPIs e somas financeiras provenientes da API | Home, Lançamentos, Relatórios |
| Histórico de eventos | `routes.ts:316-342`; `service.ts:listFinancialEvents` | Autorizar e paginar apenas eventos do titular | Lançamentos |
| Benefício | `benefit-event-mutation.ts:76-97,252-402` | Conta benefício, Verocard legado só compatibilidade, saldo protegido | Alimentação, Benefícios |
| Competência e parcelas de cartão | `cards/service.ts:262-373` | Competência por fechamento, divisão em centavos, saldo e limite | Lançamentos, Cartões, Novo/Editar |
| Pagamento de fatura | `cards/service.ts:374-586` | Pagamento total/parcial protegido e competência | Cartões, Pendentes |
| Pendência/baixa | `payables/service.ts:79-88,291-300` | Pendente só baixado após confirmação e saldo suficiente | Lançamentos, Pendentes |
| Transferências | `transfer-service.ts:46-67,165-171` | Duas pernas conservativas, atomicidade e saldo da origem | Lançamentos, Transferência |
| Precisão Decimal | `packages/database/prisma/schema.prisma:313-320,369-401,561-617` | Nunca criar saldo ou arredondamento de regras na UI | Todos |

**Divergências já conhecidas:** tratamento de Conta Benefício legada versus API normalizada; funções antigas de summary/cashflow fora das rotas; writer alternativo de payable não roteado. Não corrigir ou consumir esses caminhos por conveniência visual.

## Contratos e lacunas confirmados nesta etapa
1. `GET /finance/events` expõe `page`, `pageSize`, `total`, `items` (tamanho máximo 100), mas o tipo `FinancialEventPage` presente na base atual **não declara `revision`**. O loader de PR #646 exige `revision`. Sua integração sem reconciliação não é segura.
2. `GET /finance/summary` e `GET /finance/analytics` recebem `month`, mas não há contrato verificado de totais financeiros para **cada filtro arbitrário** da grade. A prévia não deriva saldo no cliente.
3. O fixture isolado `homePreviewFixture.transactions` contém campos básicos de eventos, mas nem sempre possui forma de pagamento, competência e cartão explícito. Não inventar esses atributos.
4. O schema atual não fornece catálogo próprio `Classification`; preservar classificação existente, sem inventar catálogo.
5. Autocomplete de descrição, recuperação de categoria/conta/forma, edição/exclusão protegidas, estornos, parcelamento e baixa são contratos obrigatórios, **não implementados nesta prévia read-only**. Pertencem a integrações futuras autorizadas.
6. Crediário fora do escopo; Benefício pré-pago não é cartão de crédito com fatura.

## Implementação isolada nesta PR
- `apps/web/src/meg-web-evolution/launches/LaunchesStage09.tsx`: tela de apresentação; filtros estruturais, DataGrid, detalhe sem mutação, KPIs vindos do `summary` existente quando o intervalo não foi filtrado; seletor de datas; rosca por **quantidade de despesas**, explicitamente rotulada como visualização exploratória.
- `apps/web/src/meg-web-evolution/launches/launches-stage09.css`: folha nova e escopada, mobile-first, composição inspirada apenas no print oficial; sem alteração dos estilos globais.
- `apps/web/src/meg-web-evolution/integrated-preview/preview.tsx`: adição de rota de demonstração `?tela=lancamentos` e navegação pelo Shell, sem substituir Home nem seletor Novo.
- `scripts/meg-stage09-lancamentos.browser.mjs` + `.github/workflows/meg-stage09-lancamentos.yml`: contratos de build, Prisma, financeiros, core, fonte única, DataGrid, geometria e capturas em oito resoluções.
- Preview próprio Render: `https://meg-lancamentos-09-pr.onrender.com/fluxo-integrado-08.html?tela=lancamentos`.

## Checklist
- [x] Auditoria prévia das autoridades, funcionalidades e conflitos.
- [x] Branch e PR isoladas; Home/Novo/Android/API/financial-policy intocados.
- [x] Print oficial identificado e estrutura de Lançamentos reproduzida como candidata.
- [x] DataGrid e Shell existentes reaproveitados sem importar UI legada.
- [x] Mocks somente do conjunto já existente, declarados como demonstração.
- [x] Edição, exclusão, baixa e gravação protegidas/desabilitadas.
- [x] Render próprio criado sem substituir previews homologados.
- [ ] Resultado final do CI da branch (consultar GitHub Actions; testes podem estar em execução).
- [ ] Revisão de screenshots em 390/768/1024/1366/1920/2560, alturas compactas e zoom 125%.
- [ ] Validação visual **explícita** pelo usuário.
- [ ] Contrato operacional de leitura consistente com revision/snapshot.
- [ ] Totais financeiros canônicos reagindo a todos os filtros.
- [ ] Operações financeiras protegidas e integrações API.
- [ ] Merge (somente com gates e autorização posterior).

## Posição de segurança
**Não concluir a etapa.** O prévio visual/funcional de consulta é demonstração. CI, build e Render não substituem homologação visual nem contrato financeiro operacional.
