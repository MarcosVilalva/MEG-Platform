# MEG Web Evolution — Etapa 09: integração visual e leitura de Lançamentos com Home P0

**Criado em:** 11/11/2026. **Status:** candidata isolada em PR Draft; não autoriza produção.
**Base:** PR #672, contratos canônicos Home P0 e Lançamentos testados em PG17 sintético.
**Origem visual dos componentes:** PR #656, cinco pontos homologados, sem promover sua camada financeira paralela.

## Implementação
- Componentes reais da tela Lançamentos (UI, SVG, filtros favoritos, DataGrid) importados da PR #656 por SHAs de blob, evitando reaproveitar protótipos ou reconstruir layout.
- \`DataGrid.tsx\` e \`types.ts\` preservam a versão atual da Home; acrescentam apenas props opcionais de rótulo de filtros e filtros salvos, sem alterar o comportamento-padrão de todos os demais consumidores.
- \`AppShell.tsx\` mantém \`HomeDueAlertsProvider\`/\`HomeDueAlertsBell\` da Home #9 e adiciona navegação autenticada Início ↔ Lançamentos, perfil de sessão e logout seguro, respeitando o fluxo atual.
- \`main.tsx\` preserva \`HomeDashboard userId\`, período de São Paulo, validação da sessão, loading e Home P0. Selecionar Lançamentos abre a tela da mesma base de código, sem reimplementar os cálculos financeiros.
- \`finance-client.ts\` adota somente GETs opcionais de snapshot e resumos, com fallback ao contrato legado quando API antiga não declara capacidade; nunca calcula saldos nem grava.
- Preview \`?tela=lancamentos\` utiliza fixture visual e nenhum acesso à API. Novo Lançamento conserva overlay protegido; ao retornar, preserva origem Home ou Lançamentos. Nenhum writer habilitado.
- Não copiar o Vite config da PR #656 que fixa a URL produtiva; manter o build duplo atual, isolado.
- Não alterar Android, schema, API financial-policy, escritores, Supabase ou infraestrutura produtiva.

## Gates requeridos
- Build da Web e API, contratos financeiros, segurança e regressões.
- Testes Playwright em oito viewports da interface Lançamentos e Home #9.
- Autenticação QA interceptada explicitamente; nenhum dado produtivo.
- Inspeção das capturas e validação visual humana da *integração*, sem reconsiderar aceites anteriores.
- PR Draft até os gates verdes e aprovação para integração operacional.
- Backup real e restauração continuam na PR #666, outro chat; Build Command do Render produtivo permanece inseguro e não pode ser executado.

## Pendências
- Executar CI desta branch, investigar divergências, corrigir sem desabilitar gates.
- Homologar visualmente a composição integrada, além das telas individuais.
- Preparar a publicação operacional autorizada somente após backup real/restauração, remoção controlada do Build Command perigoso e review de todas as PRs empilhadas.


### Regressão visual identificada pelo usuário, correção do modo público de QA (12/11)
A homologação dos cinco pontos em 09/11/2026 (issue #660) referiu-se a **`web-evolution.html?tela=lancamentos`**, com `LaunchesStage09 mode="live"`. As URLs estáticas anteriores `fluxo-integrado-08.html?tela=lancamentos` usavam inadvertidamente o modo `preview`, sem vários recursos visualmente aprovados. Essa equivalência **não era coberta** pelo QA anterior.

A QA isolada agora renderiza a MESMA composição `mode="live"` de `LaunchesStage09` com `homeP0QaPreviewFixture` sintética, período novembro/2026 e usuário fictício para salvar favoritos localmente; nenhum auth/API/writer é executado. Um marcador discreto identifica a simulação. O modo antigo é mantido apenas na rota de regressão `?tela=lancamentos-legado`. O Shell recebe `onNavigate` real e `activeSection=launches`, reproduzindo a classe `is-launches-operational`; menu móvel fecha naturalmente. Mantidos **byte a byte** os arquivos `LaunchesStage09.tsx`, `launches-stage09.css` e badges da PR #656.

Gate novo `scripts/meg-stage09-approved-visual.browser.mjs` valida todos os cinco grupos (banner/KPIs, scroll compacto, filtros/favoritos, foco, categoria/pagamento/detalhes) em 8 viewports, zero API e writers. Só fazer novo deploy de QA após **CI integrada + CI estática** verdes e revisão; nunca considerar aprovado por testes.


## Pós-aceite visual, trava de regressão e critérios GO/NO-GO (12/11/2026)
**Homologação delimitada:** o usuário afirmou “agora simmmmm, excelente trabalho estamos fazendo, bora continuar” após abrir a prévia com Home P0 e a tela operacional de Lançamentos restaurada. Apenas o **visual do QA integrado** foi aprovado, no commit estático `550675ada6b62ac88921647439dbd4b213acf296`. Os dados são fictícios; operações reais e merge não estão homologados.

**Proteção implementada:** o workflow `meg-stage09-web-home-integrated-qa.yml` agora verifica o SHA-1 Git de cinco arquivos centrais imutáveis das PRs #669/#656. Alteração sem novo aceite visual interrompe o CI; a bateria Playwright continua verificando o modo operacional, os cinco grupos e as oito larguras. Novo [CI #43194448562](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43194448562) **SUCCESS** no commit de código `2a193ce4067ba1753a9a611edfb516a457bbec6f`. Não houve atualização de Render nesta revisão puramente técnica.

| Gate | Resultado em 12/11/2026 | Consequência |
| --- | --- | --- |
| Home P0 e Lançamentos visual integrados | **Aceite do usuário em QA**, hash e browser protegidos | Congelar visual |
| UI sintética, sem API/escritas | **CI estática #43192566251 SUCCESS**, Render QA `LIVE` | Pode continuar QA visual isolada |
| Integração somente leitura/sessão sintética | **CI #43194448562 SUCCESS**, banco/requests de teste, sem produção | Preparação técnica autorizada |
| Backup externo cifrado de produção + restauração real | **Não comprovados**. PR #666 tem CI offline fictícia verde, não substitui execução real | **NO-GO** |
| Quota/Egress Supabase e disponibilidade do banco | Histórico de restrição documentado, **não rechecado nesta rodada** | **NO-GO** |
| Render API `meg-platform-api` | `autoDeploy=yes` confirmado; Build Command destrutivo documentado anteriormente, **não relido nesta consulta** | **NO-GO** para deploy |
| Nova API read-only autenticada real, compatibilidade e rollout seguro | Endpoints candidatos Draft na PR #663, **não publicados** | **NO-GO** para release |
| PRs/merge Web | #656, #663, #666, #669, #672 e #673 Draft/sem merge | Exigir aprovação separada |

**Sequência operacional sem pular gates:** finalizar backup e ensaio de restauração em sua frente isolada; verificar cota/egress; aprovar e executar somente com preflight mudança segura do build do Render; implantar e testar API read-only com autenticação real e sem writers; revalidar fluxo da integração; revisão das PRs e autorização de merge/deploy. Nenhuma mudança financeira/visual, backend produtivo ou Android nesta rodada.


### 12/11/2026 — Identidade do Shell global obrigatória após vídeo do usuário
O usuário demonstrou com vídeo uma troca indevida de identidade visual entre Home P0 e Lançamentos: moldura do logotipo, formato/realce do menu lateral, desaparecimento do botão **+ Novo lançamento**, e sino de notificações com aparência divergente. **Nova solicitação explícita:** a **Home aprovada é o padrão imutável da moldura global em todas as telas presentes/futuras**, variando apenas item selecionado, conteúdo central e dados/alertas canônicos.

**Causa comprovada:** CSS de Lançamentos alterava o menu e escondia o +, o CSS de marca/menu aprovado na Home excluía `.is-launches-operational`, e o sino sem borda dependia de `:has(.pano-root)`. A mudança proposta remove somente seletores da moldura de Lançamentos e universaliza os estilos da Home no `AppShell`, sem mudar banner, filtros, cards, DataGrid, tabela, modal, autenticação ou política financeira. `visualVariant` deixa de existir no Shell para impedir bifurcação visual por tela. O estado ativo do menu continua semântico e o indicador de notificações continua canônico e dependente de dados, nunca fixo por CSS.

**Gates:** preservar os outros quatro blobs visuais originais da PR #656 e o HomeDashboard da PR #669; ajustar o gate de `launches-stage09.css` exclusivamente à remoção desses seletores, impedindo outras alterações; novo Playwright `scripts/meg-stage09-shell-continuity.browser.mjs` compara os estilos computados da Home e Lançamentos antes e depois da navegação em seis viewports desktop/tablet/mobile, inclusive logo, navegação, +, busca, período, sino, tooltips, dimensões e rolagem. Manter testes financeiros e autorização visual do usuário separada. **Esta nova alteração de Shell ainda não está visualmente homologada** até inspeção explícita do usuário na prévia republicada em QA.
