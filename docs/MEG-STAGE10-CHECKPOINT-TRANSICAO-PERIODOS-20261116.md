# MEG Finanças Web Evolution | Etapa 10 | Checkpoint para novo chat

**Data do checkpoint:** 16/11/2026. **Estado:** transição solicitada pelo responsável. **Não iniciar Etapa 11.**

## 1. Tema, objetivo e etapa

Permanecer exclusivamente na **Etapa 10, Novo Lançamento e Editar Lançamento**, com a Web Prism 2.0 ligada a dados financeiros reais da base original. Novo objetivo expressamente autorizado para o próximo chat: **habilitar a navegação e os filtros para todos os períodos e tornar operacionais as funcionalidades desta etapa segundo as regras financeiras canônicas**, sem reconstruir a UI aprovada e sem duplicar dados. Primeiro concluir a leitura correta e rápida por mês, ano, intervalo livre que atravesse meses/anos e todo o histórico; depois consolidar os contratos de criação/edição em gates separados.

Não abrir artificialmente a Etapa 11, nem adiantar módulos completos de Pendentes, Cartões e Benefícios fora da ordem do projeto. Suas **relações financeiras** com a Etapa 10 (meio de pagamento, cartão cadastrado, parcelas, Alimentação/Verocard) são obrigatórias.

## 2. Decisões e regras de negócio confirmadas

- Fonte única: Supabase PostgreSQL 17 projeto `meg-financas`, ref `ugbiqzaqnrhulhetevby`. Os dados estão **no banco real**, não devem ser importados novamente nem embutidos no bundle, assets, mock ou cache compartilhado. `FinancialEvent` normalizado é a base de lançamentos; `AppState.transactions` é representação histórica, nunca somar ambos.
- Sessão autenticada: usuário vem do JWT validado. Leitura com escopo de workspace/proprietário e proteção contra acesso cruzado; nenhuma credencial privada no cliente. Manter `VITE_PRISM_LAYOUT` desligada por padrão no aplicativo operacional, e ligada somente na preview isolada já autorizada.
- **Filtros de período:** preservar os critérios reais de competência, data, status, conta, categoria e forma de pagamento; suportar período civil mensal, anual, intervalo arbitrário multimensal/multianual e todo o histórico, sem cortar resultados silenciosamente e sem exibir total de um escopo para outro. Verificar se cada opção já existe nos prints/regras oficiais antes de especificar a UI. Separar competência de data de lançamento quando exigido pelo contrato.
- Indicadores, saldo, fatura, parcelas, status e compromisso **somente** por serviços financeiros canônicos. Sem cálculo de componentes, estimativa, duplicação ou cruzamento arbitrário de fontes.
- Modalidade **À vista** mostra somente formas ordinárias reais cadastradas; **Crédito** mostra somente cartões de crédito reais ativos, e o domínio determina fatura/competência/parcelas. Alimentação é benefício, não cartão de crédito: exigência **Conta Benefício + Verocard + Pago**, com vínculos travados conforme regras consolidadas. Não supor correspondência histórica de `paymentMethodId` ausente.
- Autocomplete pode usar histórico de **qualquer período**, acionado sob demanda após digitação; deve reaproveitar vínculos válidos, sem copiar valor, data, competência ou status. Validar IDs nos catálogos atuais. Regras de recorrência/fixo, pendência, baixa, transferência, duplicidade, estorno e atomicidade devem ser lidas no repositório e no PDF de Regras Consolidadas antes de habilitar qualquer escrita.
- Fotos/prints **atuais oficiais do projeto** são a verdade visual. Preservar Home/Shell/DataGrid e os formulários aprovados, sem aplicar UI antiga/CSS antigo, sem criar layout novo por gosto.

## 3. Trabalho implementado e estado real

- PR #696: integração isolada da Web Prism autenticada com leitura real e editor de despesa **somente leitura**. `apps/web/src/app/finance-client.ts` e `launches/OperationalLaunches.tsx`: leitura por `GET /finance/events/month?month=YYYY-MM` com validação do conjunto mensal e token de sincronização antes/depois, sem duas passagens globais na abertura. 
- `LaunchesStage09.tsx`, `PrismOperationalLaunches.tsx`, `main.tsx`: mês selecionável, datas inicial/final **limitadas ao mês atualmente escolhido**, filtros inicialmente abertos na prévia, cabeçalho sincronizado; ainda **NÃO existe** intervalo multimensal livre ou ano/todo o histórico como filtro funcional rápido.
- `ExpenseForm.tsx` e `PrismOperationalLaunches.tsx`: autocomplete entre meses sob demanda (debounce, cancelamento, duas passagens apenas dos resultados da busca); não há busca integral ao abrir editor ou grade. À vista e Crédito já separam catálogos de formas e cartões ativos; salvar/editar reais estão **desabilitados**. Programação de parcelas não pode ser estimada na tela.
- `HomeDashboard.tsx`: 404 da rota canônica de compromissos já não oculta todos os dados disponíveis; painel ausente recebe aviso, sem inventar compromissos. Ler primeiro se a Home publicada de fato apresenta cartões, resumo de benefício, indicadores. **`/finance/home-commitments` e `/finance/home-available` foram observados em 404 na API existente.**
- A gravação do vídeo `11-12-05.mp4` (28,485 s) mostrou a versão anterior demorando ao paginar histórico (17% a 51% nos primeiros ~16 s) e Home sem informação. A correção posterior foi implementada, mas o usuário ainda **não homologou visualmente** a nova tela com seus próprios dados.
- Dados de referência de consulta exclusivamente READ ONLY em 16/11: `FinancialEvent` total 6.576, ativos 3.731, arquivados 2.845; novembro/2026 ativos 49; outubro/2026 ativos 116; 2 contas, 47 categorias, 17 formas de pagamento e 4 cartões. Números são fotografia, não usar como fixtures ou prometer contagem fixa futura.

## 4. Testes e evidências comprovados

- **CI de código publicado:** GitHub Actions [#43888812214](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43888812214), commit `d6b573b3797d9ac6cf6bce07bf3e4d3af50be652`, **SUCCESS**: `npm ci`, TypeScript estrito, Vite flag OFF/ON, varredura de segredos, testes do gateway isolado, Playwright sintético em oito resoluções, mudança de mês, falha canônica Home tratada, autocomplete entre meses sob demanda, sem writers.
- **CI posterior documental (HEAD anterior ao novo checkpoint):** GitHub Actions [#43889831547](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43889831547), [#43889831616](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43889831616), [#43889831710](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43889831710) **SUCCESS** no commit `d39feb83e9303bfff74ea97f5902e80e0d16bace`, somente documentação depois do código publicado.
- Logs anteriores da API mostraram GET `/finance/events?page=...` e `/finance/sync-status` HTTP 200, além do 404 das rotas citadas da Home. Login real realizado pelo usuário. **Não há evidência de teste autenticado end-to-end da nova versão com dados da conta do responsável.**
- Não inferir aprovação visual a partir de build, CI, login, smoke externo ou deploy.

## 5. Aprovações explícitas e itens não validados

- A referência visual oficial Prism 2.0 e componentes originais previamente aprovados devem ser mantidos.
- O responsável autorizou o trabalho de integração e a publicação na **preview isolada**; agora pediu no próximo chat implementação de filtros de **todos os períodos** e funcionamento das regras financeiras da Etapa 10.
- **Não validados:** exibição real da versão otimizada, nova barra de período/filtros, Home parcial, regras operacionais e editor com gravação, cross-workspace, fechamento de fatura e benefícios. Sem aprovação visual explícita da nova composição.
- Não há autorização específica para merge, publicação produtiva, alterar esquema/RLS ou fazer pagamentos/gravações em dados reais só porque foi pedido 'deixar funcional'.

## 6. Riscos e pendências

- Período atual restrito ao mês. Para `ano`, `intervalo livre`, `todo histórico`, criar **contrato canônico de leitura com filtros no servidor**, suporte a paginação/cursor estável, contagem e indicadores coerentes, com teste de consistência e isolamento. Não restaurar a dupla busca de 3.731 itens para cada navegação nem fingir que 49 eventos são o histórico completo. Filtros sempre devem apresentar qual escopo foi efetivamente consultado.
- API de compromissos ainda não publicada: não inventar vencimentos, saldo ou compromissos; evitar alteração de API produtiva. Planejar contrato de leitura isolado e seguro.
- `resolveWorkspaceContext` pode executar `ensurePrimaryWorkspace` (escrita incidental), conexões auditadas via `postgres` têm BYPASSRLS e não foi comprovado papel runtime isolado `meg_api_reader`. Segurança de leitura e auth real exige novo gate antes de implantar endpoint novo.
- Módulos completos Cartões, Benefícios e operações reais (salvar/editar/arquivar/confirmar/pagar) não concluídos. Não liberar writers financeiros até caracterização transacional em ambiente isolado, revisão de regras, testes de autorização e aprovação específica.
- Compatibilidade de filtros com competência vs data, exportações, filtros salvos, histórico arquivado, estornos, limites e contas de benefício precisa ser caracterizada. Preservar DataGrid e versão já homologada.
- **Nenhuma correção para o gate legado Stage09/HomeDashboard.tsx por remendo.**

## 7. Fontes, arquivos e links

- Continuidade oficial: [`MEG-WEB-CONTINUIDADE-OFICIAL.md`](https://github.com/MarcosVilalva/MEG-Platform/blob/stage10/prism-real-read-optin-20261116/MEG-WEB-CONTINUIDADE-OFICIAL.md).
- Autoridade financeira: [`docs/MEG-WEB-FINANCIAL-AUTHORITY.md`](https://github.com/MarcosVilalva/MEG-Platform/blob/stage10/prism-real-read-optin-20261116/docs/MEG-WEB-FINANCIAL-AUTHORITY.md).
- Análise de vídeo e mudanças: [`docs/MEG-STAGE10-VIDEO-READ-PERFORMANCE-HOME-FILTERS-20261116.md`](https://github.com/MarcosVilalva/MEG-Platform/blob/stage10/prism-real-read-optin-20261116/docs/MEG-STAGE10-VIDEO-READ-PERFORMANCE-HOME-FILTERS-20261116.md).
- `PROMPT-MASTER.txt`, `MEG_Financas_Regras_Consolidadas.pdf` (usar apenas itens de regras de negócio 7–16, 18–19, 21–22) e prints oficiais anexados ao Projeto. Não reintroduzir referência visual histórica.
- PR [#696](https://github.com/MarcosVilalva/MEG-Platform/pull/696), PR [#688](https://github.com/MarcosVilalva/MEG-Platform/pull/688).
- Preview já publicada (sem cache, URL do commit publicado): https://meg-stage10-prism-real-preview.onrender.com/web-evolution.html?tela=lancamentos&v=d6b573b3797d9ac6cf6bce07bf3e4d3af50be652

## 8. Repositório, branch, commits, PRs

- Repositório `MarcosVilalva/MEG-Platform`.
- Branch de trabalho `stage10/prism-real-read-optin-20261116`.
- **HEAD comprovado antes deste documento:** `d39feb83e9303bfff74ea97f5902e80e0d16bace`. Verificar HEAD novamente ao retomar.
- PR #696 **OPEN/DRAFT**, não mesclada; PR #688 **OPEN/DRAFT**, referência HEAD `d15ae63455a92b1d66b058ee216490464093493b`.
- Serviço Render Free isolado `meg-stage10-prism-real-preview`, ID `srv-dbtf9q3m8hqs73aotkm0`, Auto Deploy OFF. Deploy manual `dep-dbthejmi0phs73f2a380`, **LIVE**, commit `d6b573b3797d9ac6cf6bce07bf3e4d3af50be652`. A branch avançou depois **apenas por documentação**, não afirmar que HEAD é o deploy.
- Nenhum merge `main`, Android, API produtiva ou writer financeiro novo realizado nesta transição.

## 9. Restrições e ações proibidas

Não alterar `main`, Android, produção, `render.yaml` produtivo, API produtiva, banco real, dados, esquema, RLS ou credenciais sem gate e autorização específicos. Não criar serviços Render pagos, não deletar recursos, não ativar writers de pagamentos reais, não publicar nova rota de cartões insegura, não fazer merge. Não recriar UI/estilos oficiais. Não importar novamente dados da base nem copiar fixtures em caminho real. `VITE_PRISM_LAYOUT` OFF por padrão fora da preview. Preservar histórico e aprovações visuais. Novas leituras de diagnóstico contra o banco devem executar `BEGIN TRANSACTION READ ONLY`.

## 10. Próximo passo exato no novo chat

1. Ler este checkpoint, `MEG-WEB-CONTINUIDADE-OFICIAL.md`, autoridade financeira, Prompt Master, regras consolidadas e prints oficiais. Confirmar HEAD/PRs/CI/deploy e o escopo autorizável da Etapa 10.
2. Auditar **sem reexecutar trabalho já comprovado** os contratos atuais: `OperationalLaunches.tsx`, `LaunchesStage09.tsx`, `PrismOperationalLaunches.tsx`, `finance-client.ts`, `finance/routes.ts`, `read-model.ts`, `ExpenseForm.tsx`. Localizar filtros salvos, filtros DataGrid, síntese canônica, arquivados e autorizações.
3. Projetar e implementar **primeiro** os filtros de período completos: mês/ano, início/fim livres que cruzem meses e anos, todo o histórico, mantendo os demais filtros e sem resultados falsos. Usar leitura autenticada, preferencialmente filtrada no servidor, contagem e agregação canônicas, paginação estável/snapshot consistente; proteger multi-tenant e proibir mutações. Tratar lag e desempenho da preview.
4. Testar contrato e isolamento com dados sintéticos e cenários reais apenas de leitura; filtros combinados, troca rápida de período, totais, exportações, 8 resoluções, falha de API, nenhum vazamento, nenhum POST financeiro. Gate CI/TypeScript/build/secret scan.
5. Só após estes gates, atualizar **manualmente a mesma preview Free**, confirmar LIVE, fornecer URL com parâmetro `v=<SHA implantado>`, e solicitar homologação visual e funcional **explícita** dos novos períodos.
6. Prosseguir na **mesma Etapa 10** com regras existentes de Novo/Editar, métodos à vista/crédito, cartões cadastrados, parcelas, Alimentação/Verocard e autocomplete; primeiro caracterização canônica e testes, depois integração de writers somente se houver isolamento e autorização de execução real. Não abrir módulos das Etapas 11/12/13 antes de suas próprias etapas.

**Saúde do chat de origem:** **TROCA RECOMENDADA**, risco de confundir decisões devido ao histórico extenso. Este documento e o checkpoint oficial preservam a retomada.

## Texto curto para abrir o novo chat

> Continue exclusivamente a Etapa 10 do MEG Finanças Web Evolution, repositório MarcosVilalva/MEG-Platform, branch stage10/prism-real-read-optin-20261116, PR #696 Draft e PR #688 Draft. Primeiro leia docs/MEG-STAGE10-CHECKPOINT-TRANSICAO-PERIODOS-20261116.md e MEG-WEB-CONTINUIDADE-OFICIAL.md. Foi autorizada a implementação de TODOS OS PERÍODOS (mês, ano, intervalo livre multimensal/multianual, todo o histórico) com filtros combinados, dados reais autenticados e agregados canônicos, sem lentidão nem duplicação. Depois consolidar regras de Novo/Editar (à vista, crédito, cartões cadastrados, parcelas, Alimentação/Verocard, autocomplete), sem inventar regras ou liberar writers financeiros sem gate específico. Preserve o layout Prism oficial, Home/Shell/DataGrid aprovados, dados e negócios existentes. CI principal #43888812214 SUCCESS no código d6b573b; preview Free LIVE nesse commit; PR continua Draft. Não alterar main, Android, API/banco de produção, RLS, render.yaml, nem abrir Etapa 11. Faça testes sintéticos e leitura segura, publique somente na mesma preview mediante gates, entregue URL sem cache e aguarde homologação visual explícita. Não repita auditorias concluídas; atualize o checkpoint e monitore a saúde do chat.
