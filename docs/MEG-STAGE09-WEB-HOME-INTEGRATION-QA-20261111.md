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
