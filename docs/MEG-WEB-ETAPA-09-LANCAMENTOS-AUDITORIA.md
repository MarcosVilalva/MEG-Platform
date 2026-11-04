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

## 04/11/2026 | Ajuste de ergonomia aprovado: DataGrid prioritário
- O usuário solicitou painéis auxiliares **recolhidos por padrão**, com expansão/recolhimento **independente**, para ampliar o DataGrid. Essa autorização NÃO homologa o resultado visual.
- Os dois painéis ("Distribuição no período" e "Lançamento selecionado") saíram da coluna lateral permanente e passaram a uma faixa de accordions acima da grade; mesmo quando abertos, a tabela continua em **100% da largura disponível**.
- Botões nativos com `aria-expanded`, `aria-controls`, `hidden` e foco por teclado. No mobile, os detalhes expandidos aparecem na própria página, sem modal que cubra a grade.
- Clicar em uma descrição ou ação da linha revela o detalhamento do ID selecionado e desloca a área de conteúdo até o painel. Não aciona edição.
- A altura máxima da área rolável do DataGrid aumentou de `clamp(18rem, 100dvh - 24rem, 42rem)` para `clamp(22rem, 100dvh - 13rem, 64rem)` em desktop, limitada ao viewport e sem scroll horizontal da página; na faixa mobile, até `52rem`. A paginação padrão passou de 12 para **25 registros**. Preferências persistidas do usuário continuam sujeitas ao contrato do DataGrid.
- Teste de navegador atualizado para validar estado inicial fechado, abertura independente, recolhimento, seleção, largura integral da grade, ausência de mutação/API, filtros e responsividade em oito resoluções.
- **Preservação:** não houve alteração de Home, Novo Lançamento, Android, API, camada financeira, nem implementação de writers. PR #656 permanece Draft. Requer CI, inspeção de capturas e aprovação visual explícita.

## 04/11/2026 | Homologação visual formal pelo usuário
- O usuário aprovou explicitamente o resultado com “linduuu aprovado, caso tenha algo acrescentar”.
- **Versão visual homologada e congelada:** `61970409b834da102a5b6351d64a1e4776963678`, PR #656, somente Lançamentos. Preview `https://meg-lancamentos-09-pr.onrender.com/fluxo-integrado-08.html?tela=lancamentos&v=61970409b834da102a5b6351d64a1e4776963678`.
- Critérios aprovados: DataGrid em largura integral e viewport vertical ampliado, 25 registros por página inicialmente, distribuição e detalhes fechados no estado inicial, abertura independente e leitura móvel sem modal.
- Gate técnico [#41921287908](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/41921287908): **success** para o mesmo SHA, com testes financeiros e browser nos oito tamanhos previstos. Preview Render do SHA homologado estava `live`.
- **Nenhuma modificação visual posterior é autorizada por essa aprovação**. A homologação não implica operações financeiras prontas, acesso a registros reais, produção ou merge.
- **Próximos itens mandatórios na própria Etapa 09:** leitura autenticada e paginada de `GET /finance/events`; coerência de revisão/snapshot versus PR #646; status/categoria/forma de pagamento somente segundo contratos verificáveis; read model canônico de totais filtrados; testes de regressão financeira e responsividade. Não duplicar regras de saldos no componente.
- PR continua Draft e sem merge; **Etapa 09 NÃO ENCERRADA**.

## 04/11/2026 | Integração de leitura autenticada após homologação visual
- **Aprovação de continuidade pelo usuário:** “pode prosseguir”, após homologação visual da versão `61970409b834da102a5b6351d64a1e4776963678`. Este SHA **continua referência visual congelada**. PR #656 permanece Draft.
- **Entrada autenticada:** `apps/web/src/meg-web-evolution/main.tsx` agora oferece navegação Home ⇄ Lançamentos por `AppShell`, com identidade e período reais da sessão. A prévia `fluxo-integrado-08.html` não foi substituída e continua usando apenas `homePreviewFixture`.
- **Leitura integral:** novo `launches/authorized-history.ts` consome `GET /finance/events` via `financeClient.listEvents(page,100,'',signal)`. Como o contrato **não entrega `revision`**, realiza duas leituras independentes sem cache, verifica total, paginação, unicidade, ordenação e igualdade serializada de cada item. Detecta mudanças observáveis entre leituras, **mas não constitui snapshot transacional garantido**. Não integrar o loader de PR #646 na hipótese de revisão inexistente.
- **API read-only:** `service.ts` recebeu apenas desempate `id asc` quando `date` e `createdAt` coincidirem, para paginação determinística. Autorização por workspace, limites 10–100 e API de escrita existentes foram preservados. Nenhuma política monetária, banco ou domínio foi alterado.
- **Dados operacionais:** `launches/OperationalLaunches.tsx` consulta registros, `/finance/summary?month=YYYY-MM`, contas, categorias e formas de pagamento. O DataGrid usa os eventos autorizados integralmente carregados, com conversão de moeda **só para exibição**, sem saldo/totais em React. O `LaunchesStage09` recebe dados reais via modo `live`, mantendo o modo `preview` visualmente aprovado. Filtros principais são restaurados após atualização; filtros e ordenação do DataGrid têm armazenamento isolado por usuário.
- **Resumos financeiros:** a API canônica fornece receitas, despesas, resultado projetado e resultado realizado para o mês atual. Os quatro KPIs operacionais não misturam benefício/transferência por soma local. Com filtros arbitrários, ocultam-se os KPIs enquanto não houver contrato de resumo filtrado. O gráfico permanece por **contagem de registros**, não financeiro.
- **Escopo de uso:** tela operacional é **somente leitura**; Novo Lançamento desabilitado nessa entrada, edição, baixa e exclusão indisponíveis até integração autorizada. A área pública da prévia continua demonstrativa; o deploy Render isolado usa a build da prévia, não comprova conexão real à API. Também não foi testado contra conta real/ambiente produtivo.
- **Testes:** workflow da PR #656 agora compila `web-evolution.html` além da prévia, roda contratos financeiros existentes e Playwright com API **simulada em CI**: 101 registros (2 páginas), duas leituras, prevenção de escrita, erro após mudança na segunda leitura, conservação dos filtros ao atualizar, titular da sessão e responsividade desktop/mobile. O teste de browser não substitui homologação operacional em ambiente integrado.
- **Pendências:** integração com API real em ambiente controlado, revisão/snapshot transacional no contrato para datasets extensos, resumo canônico sob filtros arbitrários, ações de escrita protegidas e eventual validação funcional explícita. Não considerar Etapa 09 encerrada nem fazer merge.

## Checklist
- [x] Auditoria prévia das autoridades, funcionalidades e conflitos.
- [x] Branch e PR isoladas; Home/Novo/Android/API/financial-policy intocados.
- [x] Print oficial identificado e estrutura de Lançamentos reproduzida como candidata.
- [x] DataGrid e Shell existentes reaproveitados sem importar UI legada.
- [x] Mocks somente do conjunto já existente, declarados como demonstração.
- [x] Edição, exclusão, baixa e gravação protegidas/desabilitadas.
- [x] Render próprio criado sem substituir previews homologados.
- [x] Gate técnico da versão visual `61970409` concluído com sucesso no run #41921287908.
- [x] Capturas de CI revisadas e Playwright em oito resoluções (390/768/1024/1366/1920/2560, alturas compactas).
- [ ] Simulação de zoom 125% (não declarada concluída).
- [x] Validação visual **explícita** pelo usuário para SHA `61970409` (somente escopo visual).
- [ ] Contrato operacional de leitura consistente com revision/snapshot.
- [ ] Totais financeiros canônicos reagindo a todos os filtros.
- [ ] Operações financeiras protegidas e integrações API.
- [ ] Merge (somente com gates e autorização posterior).

## Posição de segurança
**Não concluir a etapa.** O prévio visual/funcional de consulta é demonstração. CI, build e Render não substituem homologação visual nem contrato financeiro operacional.
