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

## Execução comprovada de CI e bloqueio de build (12/11/2026)

- [GitHub Actions #43215699989](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43215699989): **conclusion=failure** no SHA `79005159d30842ae3d59df008d501b8247ef1619`.
- Etapa `Caracterizar contratos reais e politica pura`: **SUCCESS**, 17/17.
- Etapa `Caracterizar autocomplete de historico sem valores ou datas`: **SUCCESS**, 5/5.
- `npm run test:core`: **SUCCESS**; `npm run test:evolution-data`: **SUCCESS**.
- **Build Web FAILURE:** `HomeDashboard.tsx:216` usa `replaceAll` sem lib TS apropriada (TS2550); `home-commitments-read.ts:60` e `:62` têm inferência implícita `any` (TS7022). Esses arquivos têm blobs exatamente iguais na base homologada `760b7ad0e3217dbab70ea426df9cad67318f79ef` e na branch Etapa 10: `HomeDashboard.tsx@8e8bac894837f55ce55859740105cbb170439b25`; `home-commitments-read.ts@d0dd35584ca70841a0f0d1e1259c620447ae1c9d`. **Falha pré-existente na base, não introduzida pelo adaptador.**
- **Decisão de proteção:** não alterar Home homologada e não flexibilizar/suprimir build na CI para esconder o erro. Tratar a correção tipada e visualmente neutra em intervenção separada, com verificação de não regressão, antes de dar GO à etapa de build/preview.
- Persistem testes transacionais reais em PostgreSQL isolado para validar autorização, saldo, atomicidade e edição monetária; não foi obtida aprovação para promover `service.ts` a writer canônico.

## Build Web: correção técnica mínima e gate verde (12/11/2026)

- **Autorização:** usuário autorizou tratar os três erros TypeScript herdados da base da Home homologada. Nenhuma autorização de mudança visual, API, banco ou produção.
- **Causa:** projeto Web compila com `lib: ES2020` em `apps/web/tsconfig.json`; `String.replaceAll` só é tipado em bibliotecas posteriores. O outro arquivo sofria de duas inferências TS7022.
- **Correção restrita:** `apps/web/src/meg-web-evolution/home/HomeDashboard.tsx`: `urgency.replaceAll('_','-')` passou para `urgency.replace(/_/g,'-')`, mesma substituição global de underscores, sem alteração em CSS, JSX estrutural ou regras. `apps/web/src/meg-web-evolution/home/home-commitments-read.ts`: variáveis `query: string` e `page: CommitmentPage` explicitamente anotadas. Consulta HTTP, validação, paginação, tratamento de erro, saldos, status e retorno inalterados.
- **Commits técnicos:** `8c7a0479919bb92fecf03a31beb4d02ea12f5d4f` e `f49bdbfff236015fad1ebe990be8b9f4227635e4`.
- **Gate comprovado:** [Actions #43216531856](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43216531856), job `financial-characterization` **completed/success** no commit `f49bdbfff236015fad1ebe990be8b9f4227635e4`. Passaram 17 testes de política/contrato, cinco de autocomplete, `test:core`, `test:evolution-data` e `npm run build:web`.
- **Limite de prova:** build e contratos verdes não equivalem a comparação de pixels com a Home aprovada ou a aprovação humana de mudança visual. Como as transformações são equivalentes e os tipos são apagados em runtime, não se espera mudança visual, mas isso é inferência técnica, não homologação.
- **Ainda bloqueado:** edição/exclusão monetária canônica e saldo insuficiente, testes transacionais em PostgreSQL descartável, automação Alimentação, formulários e preview Etapa 10. **Sem merge ou deploy.**

## Primeiro modal visual isolado: escolha do tipo (12/11/2026)

- **Referência oficial:** print do projeto `Imagem do ChatGPT 3 de out. de 2026, 17_31_26.png`: modal de seleção Novo lançamento, composição esquerda informativa + quatro cards à direita (Despesa, Receita, Transferência, Benefício), rodapé informativo. Foi inspecionado o print original e implementada candidata visual, ainda **sem comparação pixel a pixel**.
- **Arquivos exclusivos da Etapa 10:**
  - `apps/web/src/meg-web-evolution/stage10/launch-type-options.ts` lista os quatro tipos, sem Crediário;
  - `LaunchTypeChooser.tsx` modal com `role=dialog`, `aria-modal`, captura de foco/Tab, Escape, clique na máscara, seleção por callback;
  - `LaunchTypeChooser.css` estilos próprios e breakpoints 639/1023 (equivalentes a min-width 640/1024), sem sobrescrever o Shell homologado;
  - `preview.tsx` QA usando `AppShell` e `HomeDashboard` com `homeP0QaPreviewFixture` fictícia e bloqueio de writers;
  - `apps/web/meg-stage10-qa.html` entrada separada, incluída na configuração Vite sem alterar a entrada principal;
  - `scripts/meg-stage10-chooser.contract.test.ts` cinco contratos estruturais e de segurança.
- **Gates comprovados:** [Actions #43218480259](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43218480259), SUCCESS no código `d7d193194cc7a2e68a344b720d063b1acc34c969`: 17 testes de caracterização financeira, 5 de autocomplete, 5 do modal, `test:core`, `test:evolution-data`, `build:web`. O teste de Node inicialmente falhou ao importar CSS de React; foi corrigido estruturalmente extraindo metadados puros. Uma asserção de Tab foi alinhada à implementação sem alterar lógica.
- **Não declarado:** homologação visual, responsividade verificada por Playwright, deploy de QA, integração com fluxo real ou gravação financeira. QA HTML existe no build, **não há URL publicada da Etapa 10**.
- **Proteções:** a nova tela não chama API ou writer, não calcula saldo/parcela/fatura, não usa dados reais. Home/Shell/Lançamentos/DataGrid não foram modificados nesta rodada; a mudança no Vite se limita a adicionar entrada QA, sem mudar as demais.
- **Próxima ação:** inspecionar capturas Playwright do primeiro modal nos viewports 390/768/1366/1920, ajustar fidelidade conforme o print sem alterar UI homologada, publicar QA isolada somente mediante estratégia de preview segura e submeter ao usuário para aceite. Em paralelo, preparar integração transacional com PostgreSQL descartável antes dos formulários com Salvar.

## QA visual automatizada e conflito entre diálogos (12/11/2026)

- [Actions #43220726390](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43220726390) **SUCCESS**, com navegador real e capturas em 390×844, 768×1024, 1366×768 e 1920×1080; sem rolagem horizontal, sem corte do modal, opções corretas, Escape e seleção funcionais, nenhuma escrita financeira. Artefato de capturas #13945507992.
- Inspeção humana das imagens geradas identificou título responsivo com palavras coladas em 390/768px. Corrigido somente o espaçamento do JSX em `LaunchTypeChooser.tsx` pelo commit `a25532be1d9eadb87788e82a2b327fc8ecea2a66` e acrescentado teste textual no browser pelo commit `508221409cae83a797e232d3c52ee3a624a88199`.
- O navegador de QA marca o alerta inicial como já exibido apenas na sessão `qa-preview`, para medir o primeiro modal sem a notificação automática da Home; **não altera Home em produção ou comportamento do alerta para usuários reais**.
- **Achado novo:** a Home usa `<dialog>.showModal()` nativo para alertas de vencimentos, participando da top layer do navegador. O seletor Novo inicialmente usa overlay portalled `div` e `role=dialog`. Em montagem simultânea artificial, o alerta nativo pode assumir foco e impedir uma garantia incondicional de focus trap do seletor. A acessibilidade desse conflito precisa de definição de precedência/coordenação de diálogos sem destruir a regra da notificação financeira.
- [Actions #43221348047](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43221348047) registrou **FAILURE no teste adicional de competição de foco**, embora as suítes de política, autocomplete, modal estrutural, core, dados, build e as quatro capturas principais tenham passado. Artefato das capturas corrigidas #13946371722.
- Um novo ciclo de correções específicas do seletor e teste de preservação de foco foi submetido na mesma PR Draft; **não inferir aprovação do último SHA sem consultar a execução correspondente**.
- A fidelidade artística ao print oficial (montanhas, curvas, cartões e densidade de informação) ainda precisa de comparação e ajustes em QA; a captura evidencia estrutura adequada, não identidade visual final.
- Até resolver colisão de foco, testar mudanças com banco descartável e obter aprovação visual explícita: **NO-GO para declarar Etapa 10 validada, publicar Web autenticada, integrar writers, fazer merge ou deploy produtivo**.

## Modal de tipo: sequência de overlays e CI final (12/11/2026)

- **PR #678 Draft**, base homologada `760b7ad0e3217dbab70ea426df9cad67318f79ef`. Implementação isolada do seletor tipo, sem writer.
- **Diagnóstico reproduzido:** prévia abria Home (com alerta canônico próprio) e modal Novo simultaneamente, gerando disputa de captura de foco entre dois diálogos. Tentativas de forçar foco da camada Novo foram descartadas para não criar competição persistente de listeners.
- **Solução aplicada na prévia isolada:** modal inicia fechado. Ao entrar, a Home pode apresentar o alerta; o teste fecha esse aviso antes de acionar o seletor. Em sessão já apresentada, abre Novo por clique. A Home e sua lógica permaneceram intactas; um diálogo é operado por vez.
- **Ajuste de texto:** espaços explícitos entre trechos divididos por `br` no título para preservar palavras em mobile quando os `br` são ocultados por CSS. Sem alterar regras financeiras.
- **CI final verificado:** [GitHub Actions #43222823187](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43222823187) **completed/success** no commit `b329df0132bb282eda645460b87884d18f7732bd`. Passaram testes financeiros, autocomplete, contrato do modal, `test:core`, `test:evolution-data`, build Web e browser QA do modal em 390×844, 768×1024, 1366×768 e 1920×1080.
- **Capturas:** [artefato #13947205375](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43222823187/artifacts/13947205375).
- **Limitações:** testes de navegador não substituem inspeção visual humana nem comparativo pixel a pixel. Nenhuma URL de QA da Etapa 10 foi publicada. Funcionalidade de gravação e formulários Novo/Editar permanecem bloqueados por caracterização de writes e vínculo canônico Alimentação.
- **Preservação:** sem mudanças no Android, API, Supabase, banco, deploy produtivo, Home, Shell, DataGrid ou Lançamentos homologados; PR continua Draft e sem merge.

## Nova Despesa: primeira estrutura visual em branch isolada (12/11/2026)

- Diretriz explícita do usuário: **abandonar seletor duplicado** e implementar prioritariamente modais de **Despesa e Receita**, usando o seletor já homologado `LaunchTypePicker` da base visual Etapa 09. O seletor alternativo `stage10/LaunchTypeChooser`, CSS/preview/testes próprios foram retirados da PR #678; não houve alteração no seletor homologado.
- Autoridade financeira consultada: `docs/MEG-WEB-FINANCIAL-AUTHORITY.md`, `finance/routes.ts`, `event-mutation.ts`, Prompt Master e PDF consolidado (especialmente itens 8–10, 12–16, 18–19, 21–22), sem adotar regra histórica de Crediário, já excluída por decisão posterior.
- Novo componente `apps/web/src/meg-web-evolution/stage10/ExpenseForm.tsx` + `ExpenseForm.css`, visual original baseado no print oficial `Novo lançamento financeiro neon.png`, sem copiar CSS da UI antiga. Três painéis em desktop, layout único abaixo de 1024 px, fluxo e campos responsivos, Escape, Tab cíclico, restauração do foco. **Candidato visual ainda não aprovado**.
- Contratos de apresentação: catálogos ativos fornecidos pelo chamador (IDs não inferidos), descrição, categoria e chips, filtro visual por tipo de conta, conta, pagamento, data, valor solicitado, status solicitado, observações, resumo descritivo, cartão e parcelas condicionais. Não recalcula status efetivo, saldo, fatura, parcela, competência ou valores canônicos.
- Autocomplete opcional consome exclusivamente adaptador canônico `autocomplete-history.ts`; seleção sugere descrição/categoria/conta/pagamento somente quando IDs ainda ativos; nunca copia valor ou data. Snapshot incompleto não produz sugestões.
- Alimentação: vínculo **explícito** `benefitBinding` passado pelo catálogo autorizado, sem adivinhar por nomes; ao escolher categoria vinculada, pré-seleciona Conta Benefício + Verocard + solicitado Pago, trava conta/método; ao sair da categoria, limpa vínculos; permanece sem envio ao writer. IDs QA são fictícios e não migram para backend.
- Crédito: exibe seleção de cartão, quantidade de parcelas e primeira data quando pagamento pertence ao domínio crédito, sem criar valores por parcela, fatura ou competência. **Não usa writer monetário para cartões/benefício**. Crediário não foi implementado conforme autoridade atual.
- **Lacuna declarada:** o print também contém `Classificação da conta`; não foi encontrado contrato canônico correspondente no schema genérico de `createFinancialEventSchema`. Não inventar campo de persistência nem afirmar fidelidade integral antes de definição de mapeamento. O filtro `Tipo de conta` é visual, não substitui a classificação financeira.
- QA isolado em `apps/web/meg-stage10-expense-qa.html` e `stage10/expense-preview.tsx` com fixtures exclusivamente fictícias e `saveEnabled=false`. Entrada de build adicionada no Vite sem alterar aplicação principal. Não há URL remota publicada para este formulário; **o Render da seleção antiga foi abandonado e continua Auto Deploy desativado**.
- Testes adicionados: `scripts/meg-stage10-expense.contract.test.ts` e `scripts/meg-stage10-expense.browser.mjs`; browser verifica 390/768/1366/1920 px, categoria Alimentação travada, cartão condicional, botão de escrita desabilitado, nenhuma requisição de mutação, Escape/fechamento e ausência de overflow horizontal.
- **Gate confirmado:** [Actions #43230168194](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43230168194), **SUCCESS**, no commit de código `b21b2c89de39cda91609dc137bd804fa4f3e457a`: 17 caracterizações financeiras, 5 autocomplete, 5 contrato nova despesa, core e dados, build Web, browser QA e artefatos. Mudanças posteriores exigem sua própria CI.
- **Pendências críticas:** registrar e validar classificação da conta, integração real dos catálogos e snapshot autorizados, testes transacionais PostgreSQL descartável de saldo, concorrência, idempotência, edição/exclusão monetárias, cartões e benefícios antes de habilitar botão Salvar. Comparação visual com o print e aceite explícito ainda não ocorreram. **Não avançar ao modal Receita até validar visualmente Despesa**.
