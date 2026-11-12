# MEG Web Evolution | Etapa 08 | Fechamento da integração Home e Lançamentos

**Checkpoint de trabalho:** 12/11/2026. **Escopo:** integração funcional e auditoria de UI já homologada, sem operação financeira.  
**Origem imutável visual:** preview estático aprovado em `760b7ad0e3217dbab70ea426df9cad67318f79ef`.  
**Branch isolada:** `stage08/home-launches-closeout-20261112`, derivada da PR #673. PRs #664, #656, #668, #669, #672 e #673 permanecem independentes.  
**Aviso:** checklist aprovado pelo operador é autorização de trabalho, NÃO evidência automática de teste concluído, merge, deploy ou homologação funcional.

## Regras e contratos que não podem mudar
- Autoridade financeira: `docs/MEG-WEB-FINANCIAL-AUTHORITY.md`; política monetária, saldo, benefício, pagamentos, parcelas e escrituração na API, não nos componentes.
- Home P0 revisão #9, Lançamentos (cinco grupos), Shell universal e DataGrid conforme preview homologado. Nenhuma alteração em CSS, JSX do Shell, DataGrid, classes visuais, ícones, métricas e regras financeiras.
- `HomeDashboard` é fonte visual homologada; a alteração permitida nesta PR é exclusivamente no contrato de retorno do callback e no tratamento de destino indisponível, sem mudar markup. Gate de blob da Home deve acompanhar a alteração e continuar bloqueando novas modificações não revisadas.
- Sessão autenticada, `HomeDueAlertsProvider`, revogação do logout, `localStorage` dos atalhos por usuário e filtros favoritos devem continuar existentes. Preview público segue fictício e sem API.
- Não alterar Android, writers, API produtiva, banco, Render, branches/PRs da Etapa 09 (backup e auditoria) ou da Etapa 10.

## 1. Navegação autorizada: implementação proposta na branch isolada
**Lacuna confirmada:** `main.tsx` montava `<HomeDashboard userId=... />` sem `onNavigate`, embora a Shell já permitisse `section='home'|'launches'`. O atalho 'Lançamentos' mostrava aviso e não navegava.

**Correção restrita:**
1. `main.tsx` passa `onNavigate` somente para o identificador `lancamentos`, ativando a seção autorizada `launches`. Não cria outra página.
2. `HomeDashboard.tsx` mantém o aviso anterior quando o callback informa `false` (não atendido). Callbacks históricos que retornam `void` continuam compatíveis. O markup não é alterado.
3. `QuickActions.tsx`, `AppShell.tsx`, DataGrid, estilos e fixture visual permanecem inalterados.

**Verificação:** teste `scripts/meg-stage08-home-navigation.browser.mjs` em sessão fictícia nos viewports 1366×768 e 390×844, incluindo usuário identificado, preferência de atalhos persistida, rota autorizada, retorno à Home, ausência de novas telas para ação não autorizada, zero escrita financeira e sem overflow. Regressões existentes continuam obrigatórias.

## 2. Inventário de controles por destino e etapa responsável

| Controle | Situação na entrada autenticada antes desta intervenção | Responsável por integração futura |
| --- | --- | --- |
| Sidebar Início ↔ Lançamentos | Rotas internas `home`/`launches` efetivas, logout separado | Etapa 08 mantém contrato e navegação |
| Ação rápida Lançamentos | Apresentada, mas sem `onNavigate` da Home | Etapa 08: corrigir pelo destino já existente |
| Ações rápidas Transferência, Pagar conta, Cartões, Benefícios, Relatórios, Configurações | Catálogo personalizável, sem rotas correspondentes no `AuthGateway`; aviso de indisponibilidade era o comportamento aprovado | Telas/etapas próprias; não criar placeholder financeiro |
| Topbar `+ Novo lançamento` | Botão presente, sem `onClick` autenticado | Etapa 10 e integração autorizada do formulário |
| Sidebar Cartões/Pendentes/Benefícios/Relatórios/Configurações | Botões visuais; `AppShell` só encaminha índices 0 e 1 | Telas próprias futuras |
| Busca global | Input visual sem busca orquestrada/autorizada | Funcionalidade transversal, exige escopo e contrato de consultas |
| Período da topbar | Exibe mês civil; seletor visual sem `onClick` | Modal Selecionar Período na etapa própria; não recalcular competência |
| Perfil da topbar | Exibe iniciais/nome; controle sem expansão | Configurações/perfil em etapa própria |
| Sino de compromissos | Provider e painel canônico existem; consulta/aviso periódico na sessão autenticada | Manter na Home; publicação coordenada de API é gate externo |
| Ver todos os compromissos | Modal e paginação canônica sob demanda no código da Home | Etapa 08: testar leitura em QA; operação depende da API autorizada |
| Novo lançamento, Editar, Excluir, Baixa em Lançamentos | Writer ainda bloqueado; CTA desabilitado em modo `live` e detalhes somente leitura | Etapa 10 e etapas de pagamento correspondentes |

**Não converter placeholder em botão financeiro ativo nem alterar identidade do Shell para dar a impressão de funcionalidade.**

## 3. Ações rápidas e filtros favoritos
- `QuickActions.tsx` mantém adicionar, remover, reordenar, restaurar, carrossel circular, a11y e versão `meg.web.home.quick-actions.v1.user.${encodeURIComponent(userId)}` no `localStorage`; preview utiliza chave `demo`.
- O catálogo tem sete destinos autorizados como *identificadores*, não sete telas prontas. Somente `lancamentos` ganha rota autenticada nesta alteração.
- Filtros favoritos de Lançamentos permanecem em `saved-filters.ts` e componentes homologados; testes existentes (`meg-stage09-saved-filters.contract.test.ts` e fluxo operacional) devem continuar verdes.
- Sincronização entre dispositivos e personalização por ID de categoria não estão implementadas. São proposta transversal da issue #662, não homologação visual existente; dependem de contrato de preferências e autorização próprios.

## 4. Lacunas técnicas caracterizadas, sem inventar regra
1. **Saldos e projeções explicáveis:** a Home apresenta `summary`, `cashflow`, `home-available` e benefício provenientes de leituras canônicas; não foi verificado contrato próprio de detalhamento rastreável por item para explicar composição a partir da UI. Não fazer reconciliação de saldo no React. Exige desenho de contrato somente leitura na etapa apropriada.
2. **Contagens globais de urgência:** `GET /finance/home-commitments` publica página, cursor, `asOf` e `dueState`. A janela inicial não fornece total global completo de vencidos/hoje. O botão `Ver todos` carrega páginas sob demanda e distingue quantidade carregada do total confirmado. Não inventar contagens a partir de oito itens.
3. **Atualização entre telas:** Home carrega na montagem/atualização e Lançamentos possui consulta/revisão sob demanda. Falta contrato de invalidação após writers reais, atualmente deliberadamente não habilitados. Revisar após a Etapa 10, sem implementar polling financeiro paralelo.
4. **Robustez de leitura:** Home evita falso vazio em falha de compromissos; Lançamentos evita apresentar snapshot parcial. Permanecem testes de falha, cursor, idempotência visual, reconexão, favoritos e isolamento de sessão, sem tocar writers.
5. **Desempenho:** existem ensaios PostgreSQL 17 sintéticos; um `Seq Scan+Sort` para `FinancialEvent` é hipótese de otimização, não autorização de índice/migration. Medição representativa e orçamento de latência são pendentes da integração de leitura.

## 5. Cadeia de PRs e arquivos com sobreposição
- **Linha Home:** #664 (atalhos) → #668 (GET compromissos) → #669 (Home P0), com bases empilhadas e aprovadas visualmente apenas onde registrado.
- **Linha de API/leitura:** #663 fornece snapshot e resumo; #672 compõe a leitura Home+Lançamentos na base da #669.
- **Linha visual Lançamentos:** #656 (branch paralela). #673 compõe a UI da #656 com a base da #672.
- **Esta branch:** criada a partir do HEAD da #673. NÃO altera #673 ou sua base; revisão em PR Draft própria direcionada à branch da #673, sem merge.
- Sobreposições críticas já reconciliadas parcialmente na #672/#673, que requerem nova inspeção no candidato final: `apps/api/src/modules/finance/routes.ts` e `history-filter.ts` entre #663/#668/#656; `AppShell.tsx`, `main.tsx`, `DataGrid.tsx` entre Home e Lançamentos; checkpoint `MEG-WEB-CONTINUIDADE-OFICIAL.md` em todas as frentes.
- Nenhuma estratégia de merge baseada apenas em `mergeable=true`; revalidar SHAs, diffs, flags Draft, CI e homologações antes da decisão. Não realizar merge nesta etapa.

## 6. Gates de aceite técnico
- [x] Build API/Web, testes financeiros, CORS e segurança no commit de código.
- [x] Testes de contratos e filtros favoritos.
- [x] Novo navegador autenticado Home → Lançamentos (1366/390) e fallback para destinos sem rota.
- [x] Regressões visuais existentes Home, QuickActions, Shell, DataGrid e Lançamentos (8 viewports onde aplicável).
- [x] Gate de hashes dos componentes visuais e escopo restrito de arquivos.
- [x] Resultado CI verificável no SHA do código e revisão dos logs.
- [ ] Revisão humana da PR Draft; nenhuma incorporação da Etapa 10 ou backend produtivo.

## 7. Backlog atribuído sem sobreposição entre chats
- **Etapa 08:** navegação autorizada, leitura/contratos, testes regressivos, matriz de controles, revisão da cadeia de PRs e checkpoint.
- **Etapa 09, outro chat:** backup/recuperação, Supabase/Egress, segurança Build Render, auditoria dos writers e integridade financeira (#674). A Etapa 08 recebe apenas o status final dos gates como dependência, sem mexer nos respectivos arquivos.
- **Etapa 10, outro chat:** Novo Lançamento e Editar Lançamento; formulário protegido, writer autorizado, parcelamento, autocomplete e Alimentação (Benefício + Verocard + Pago).
- **Outras etapas:** Cartões, Pendentes, Benefícios, Transferência, Relatórios, Configurações e Selecionar Período. Não implementar antecipadamente.
- **Transversal futuro:** preferências sincronizadas/ícones personalizados #662, auditoria visual por tela #671 e controles globais de busca/perfil. Exige autorização específica.

## Status operacional
Este documento registra o escopo e as evidências antes do resultado do novo CI. Não declarar gate verde sem conferir o run/commit correspondente. Nenhuma publicação, merge ou alteração em Render, Supabase, banco ou Android foi autorizada.

### Evidência de CI após correção do teste móvel
- Primeira execução [#43209146240](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43209146240) falhou **somente no novo teste**: tentativa de clicar num atalho que estava fora da janela móvel do carrossel. Build, financeiro, segurança, contratos, visual e Shell haviam passado. O componente de produção não foi alterado.
- O teste foi corrigido para avançar o carrossel pela seta real em 390px, respeitando o estado de visibilidade. Resultado final **COMPLETED/SUCCESS** no [run #43209902280](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43209902280), SHA de código `7ce1c785583bd5d24a4b3a2db93e8b4d2bb05ae3`.
- Logs: `STAGE08_HOME_NAVIGATION 1366x768 PASS` e `390x844 PASS`; fluxo de atalho, aviso de tela sem rota, retorno, persistência e zero writes; Home 16 cenários originais; QuickActions 700 verificações em 8 viewports; visual da #656 em 8 viewports; Shell em 7; teste operacional autenticado, filtros favoritos, logout, hash de blobs e gate de arquivos verdes.
- O diff da PR Draft #677 cobre apenas dois arquivos de código (`HomeDashboard.tsx` e `main.tsx`), o teste novo, este documento e o workflow. **Nenhum JSX visual do HomeDashboard foi modificado**: alteração limitada à tipagem/semântica do callback; visual de Lançamentos, Shell, CSS, DataGrid e QuickActions preservados.
- Não houve deploy Render, preview funcional nova, merge, migração, writer nem acesso a banco real. O preview oficialmente homologado ainda aponta para `760b7ad0e3217dbab70ea426df9cad67318f79ef`; ele NÃO contém a nova navegação da PR #677.
- **Pendência de produto:** inspeção humana da candidata funcional em ambiente de QA autorizado antes de qualquer integração. **Pendência externa:** gates de publicação trabalhados na Etapa 09, sem alteração nesta branch.

## 8. QA funcional isolada 12/11/2026, publicação externa bloqueada

### Implementado exclusivamente na PR #677
- Entrada QA `apps/web/stage08-funcional-qa.html` e `apps/web/src/meg-web-evolution/stage08-qa/bootstrap.ts`: carregam **o mesmo `main.tsx` autenticado da Web** após instalar respostas fictícias na própria origem. Tokens de QA são constantes inválidas em backend real; não há credenciais ou dados reais.
- O bootstrap bloqueia `fetch` para qualquer origem externa e toda rota fora da lista de leituras fictícias; `POST /auth/logout` é apenas a revogação simulada de um token fictício. HTML usa CSP `connect-src 'self'`; `img-src` permite só imagens do próprio site e as fotografias de referência visual de `images.unsplash.com`.
- Build `apps/web/vite.stage08-funcional-qa.config.ts`, executado com `NODE_ENV=production` para que o cliente use origem relativa em vez do fallback de desenvolvimento `localhost:3333`. Não configura nem consulta o endereço de API produtiva.
- Só ativos públicos necessários ao teste são copiados; a pasta `public/downloads` é excluída **do pacote de QA**, sem remoção no repositório ou na Web real.
- Teste em navegador `scripts/meg-stage08-static-qa.browser.mjs`, desktop 1366 e mobile 390: login fictício validado no gateway existente, painel Home, alerta inicial fechado pela interação normal, atalho Lançamentos, retorno, aviso para destino sem rota, persistência dos atalhos, ausência de overflow, zero erros JS e **zero consultas financeiras pela rede**.

### Evidências verificadas
- [Smoke QA isolada #43219345293](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43219345293): **SUCCESS**, commit de código `9dbe0b12aee39a209243e5f12958032b7e7ed883`, inclusive build estático e browser.
- [Artefato de QA `meg-stage08-funcional-qa-pr677`](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43219345293/artifacts/13945176562), ID `13945176562`, ZIP **6,15 MiB**, expiração informada 12/12/2026. Inclui HTML, JS, CSS e recursos de demonstração, não instalador ou APK.
- A bateria financeira/visual completa [#43219345431](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43219345431) terminou **COMPLETED/SUCCESS** no mesmo SHA de código, incluindo API/financeiro, segurança, contratos, Home, Shell, Lançamentos, filtros favoritos, gateway, navegação de QA e gate de escopo.
- Diversas tentativas iniciais de smoke falharam por carregar `localhost:3333` sob `NODE_ENV=test` ou por o modal inicial bloquear o clique do teste. Corrigidos a configuração de build da QA e **o teste**; não houve alteração na lógica de autenticação ou no componente de vencimentos.
- Os únicos arquivos novos são da QA isolada, workflows e testes; visual homologado original, Android, writers, banco e Render produtivo **inalterados**.

### Bloqueio de publicação no Render
- Tentativa de criar o serviço novo `meg-stage08-funcional-pr677` no workspace oficial com `autoDeploy=no`, branch própria e saída `dist-stage08-funcional-qa`.
- A API Render **recusou o pedido com HTTP 400: `Hobby Tier is limited to 25 services`**. **Nenhum novo serviço foi criado.** Não houve deploy ou mudança em qualquer serviço existente, inclusive a QA visual homologada `meg-stage09-home-launches-qa`.
- Não foi fornecida uma URL pública interativa, pois não há serviço LIVE que contenha este novo build. Não divulgar a prévia homologada anterior como se mostrasse a nova funcionalidade.
- Alternativas futuras dependem de ação/autorização separada: conectar hospedagem alternativa como Vercel; ou liberar capacidade do Render sem exclusões implícitas. Não remover serviços ou alterar planos sem aprovação.

### Validação local segura com o ZIP
1. Baixar o artefato ZIP do GitHub Actions e extrair para uma pasta vazia (exemplo `~/meg-stage08-qa` no Ubuntu WSL).
2. Executar `python3 -m http.server 4175 --directory ~/meg-stage08-qa`.
3. Abrir `http://localhost:4175/stage08-funcional-qa.html` no navegador Windows. A aplicação é fictícia e usa HTTP apenas para servir seus arquivos estáticos. As fotografias de referência, se acessíveis, podem vir de `images.unsplash.com`.
4. Validar pelo usuário: botão `Adicionar` em Ações rápidas, inclusão do atalho `Lançamentos`, navegação, `Voltar à Home`, fallback para outro destino e persistência. A validação humana **não está registrada ainda**.

**Status:** implementação e artefato de QA disponíveis; **publicação online e homologação humana ainda pendentes**. PR #677 segue Draft, sem merge/deploy.

## 9. Prévia pública funcional publicada após limpeza de serviços no Render

**Verificação realizada em 12/11/2026:** o workspace Render `tea-d98k1qhkh4rs73f4sfj0` passou de 25 para **20 serviços** por exclusões efetuadas pelo usuário. Foram preservados `meg-platform-api` (`srv-d98k61daeets7384hvb0`) e `meg-stage09-home-launches-qa` (`srv-dbqlth8n74is73cjq9a0`); nenhuma exclusão foi realizada por esta intervenção.

**Serviço novo criado, sem reutilizar ou alterar existentes:** `meg-stage08-funcional-pr677`, ID `srv-dbqrgtu7bikc73aufrvg`, [Painel Render](https://dashboard.render.com/static/srv-dbqrgtu7bikc73aufrvg), URL de origem `https://meg-stage08-funcional-pr677.onrender.com`. Tipo static site, Auto Deploy **OFF**, branch `stage08/home-launches-closeout-20261112`, comando `npm ci --audit=false && cd apps/web && NODE_ENV=production npx vite build --config vite.stage08-funcional-qa.config.ts`, saída `apps/web/dist-stage08-funcional-qa`, sem variáveis de ambiente ou segredos.
- **Deploy inicial:** `dep-dbqrgu67bikc73aufsv0`, estado **LIVE** confirmado via Render às `2026-11-12T13:02:02Z`, SHA publicado `571cc7aabecf96a44ecb44dee5043823e6f6ac29`. Esse SHA difere do SHA de CI `9dbe0b12aee39a209243e5f12958032b7e7ed883` exclusivamente por quatro commits **documentais**, como comprovado por comparação de commits.
- **Link sem cache para inspeção:** https://meg-stage08-funcional-pr677.onrender.com/stage08-funcional-qa.html?v=571cc7aabecf96a44ecb44dee5043823e6f6ac29 . A página emprega sessão fictícia e bloqueia a API real; não usar credenciais reais. O teste local do bundle passou; o teste contra o domínio público foi concluído em [#43223667175](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43223667175), **COMPLETED/SUCCESS**, com Chrome 1366×768 e 390×844, login fictício, ida/volta, fallback e nenhuma chamada financeira pela rede. A CI integral adicional [#43223667125](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43223667125) deve ter sua conclusão verificada separadamente.
- A prévia oficial visual anterior permanece congelada em `760b7ad0e3217dbab70ea426df9cad67318f79ef`, no serviço `srv-dbqlth8n74is73cjq9a0`. A QA nova é apenas para homologação da navegação funcional; não substitui a aprovação do layout.
- Nenhuma alteração de produção, Android, Supabase, banco, credenciais, PRs paralelas ou merge. PR #677 continua Draft. **Aceite manual da QA nova: pendente.**

**Checklist para o operador:** abrir a URL sem cache; usar a sessão de demonstração; abrir Ações rápidas, clicar Lançamentos, conferir a tela real de leitura, voltar à Home, testar um destino ainda não disponível e confirmar persistência dos atalhos. Aprovação visual/funcional somente com manifestação explícita do usuário.

## 10. Revisão iconográfica de Lançamentos aprovada em 12/11/2026 (PR #679)

**Aprovação explícita do usuário:** após visualizar uma proposta de quatro ícones dos KPIs (projeção, entradas, saídas, resultado realizado) e substituição do botão textual `Ver` por ícone de olho com tooltip, o usuário respondeu **"validado, prosseguir"**. Isto autoriza a implementação da proposta, **não equivale a homologação visual automática do novo deploy**.

**Isolamento:** branch `stage08/lancamentos-icons-refinement-20261112`, baseada na PR #677, PR [#679](https://github.com/MarcosVilalva/MEG-Platform/pull/679) Draft, sem merge.
- Novo `icon-packs/refined-action-icons.tsx`, glifos SVG locais originais com desenho uniforme e sem CDN: `projectedChart`, `cashIn`, `cashOut`, `walletMinimal` e `eye`. `LaunchIcon.tsx` foi estendido preservando os nomes anteriores.
- `LaunchesStage09.tsx`: **somente `mode=live`** usa novos KPIs; a prévia histórica permanece com os ícones originais. Botão `Ver` substituído por `eye`, sem texto visível, mantendo `title`, `aria-label` individual e tooltip `data-tooltip`. O modal anterior mantém o contrato somente leitura. A coluna Ações ficou mais compacta.
- `launches-stage09.css`: acabamento menos brilhante dos pictogramas do banner autenticado; botão de olho 36×36 px no desktop, mínimo 44×44 px no celular; tooltip no hover e no foco, com fallback `title`. Nenhuma alteração de Shell, Home, DataGrid, API, banco, Android, writers, filtros ou cálculos.
- Teste `scripts/meg-stage08-lancamentos-icons.browser.mjs` usa sessão e dados fictícios, verifica quatro ícones, legendas, tooltip, acesso por teclado, modal de detalhes, integridade dos quatro valores e ausência de API financeira externa em 1366×768, 960×900 e 390×844. O primeiro teste falhou porque selecionava um elemento da tabela oculta na versão de cartões do DataGrid; corrigido **somente o seletor do teste**, sem forçar o DataGrid a apresentar coluna que não era visível.
- Teste operacional existente teve as expectativas de glifos live atualizadas; teste da prévia histórica segue cobrando `trendUp/trendDown`, sem alterações funcionais. Workflows na branch foram ampliados preservando gates financeiros, hashes dos demais componentes e testes anteriores.

**Resultados comprovados:**
- [CI integral #43226129382](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43226129382): **COMPLETED/SUCCESS** em `c1133b6c246a1652d3f3e3712fe5c612f8689c88`.
- [QA estática #43226129447](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43226129447): **SUCCESS** no mesmo SHA; testes de desktop, 960 px e celular verdes.
- [QA pública #43226911114](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43226911114): **COMPLETED/SUCCESS**, com navegador real na URL externa do novo Render e nenhuma consulta financeira real. Capturas no artefato [`meg-stage08-icons-visual-pr679`](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43226911114/artifacts/13948775773), ID `13948775773`. O run contém um commit adicional de workflow, mas o **bundle implantado** corresponde exatamente ao SHA testado `c1133b6`.
- **Render QA dedicado:** `meg-stage08-icones-pr679`, ID `srv-dbqrr7qfngtc738gae3g`, [painel](https://dashboard.render.com/static/srv-dbqrr7qfngtc738gae3g), `autoDeploy=no`, branch própria, sem segredos e sem backend.
- **Deploy confirmado LIVE:** `dep-dbqrr82fngtc738gaee0` em 12/11/2026 13:23:26 UTC, commit `c1133b6c246a1652d3f3e3712fe5c612f8689c88`. **URL sem cache:**
  https://meg-stage08-icones-pr679.onrender.com/stage08-funcional-qa.html?v=c1133b6c246a1652d3f3e3712fe5c612f8689c88
- O preview homologado Home + Lançamentos no commit `760b7ad0e3217dbab70ea426df9cad67318f79ef` permanece intocado. A QA da PR #677 também permanece no seu serviço independente.

**Checklist final:**
- [x] Implementação iconográfica pontual, isolada e acessível.
- [x] Build, contratos e testes financeiros; integração e regressão visual; responsive; gateway fictício; zero writes.
- [x] Prévia separada LIVE e navegador externo verificado.
- [x] Referências visuais anteriores preservadas, nenhuma modificação em Render produtivo.
- [ ] **Homologação visual explícita da nova prévia pela pessoa usuária**, distinta da aprovação da proposta.
- [ ] Incorporação da PR #679 e da PR #677 somente após autorização e gates externos; **sem merge/deploy produtivo**.
