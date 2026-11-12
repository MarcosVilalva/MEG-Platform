# QA visual estática isolada: Home #9 e Lançamentos (11/11/2026)

**Origem funcional:** PR #673, SHA `055b998aabb52a89203d798101d67380cade5434`, workflow de integração [#43126375923](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43126375923) aprovado.
**Objetivo:** publicar exclusivamente o frontend demonstrativo `fluxo-integrado-08.html`, com fixture fictícia e sem autenticação, URL de API produtiva ou escrita financeira.

- `vite.stage09-home-launches-qa.config.ts` tem um único HTML de entrada, não inclui `web-evolution.html`, `phoenix.html` nem `index.html`.
- QA automatizada verifica a ausência de HTML autenticado, regressões Home, Ações rápidas e Lançamentos em oito viewports, sem rede de API.
- Render QA previsto em serviço estático novo, `autoDeploy=no`, branch isolada. Nunca reutilizar nem substituir a prévia homologada Home #9.
- Android, API, DB, schema, writers, PR #666 e Render produtivo permanecem intocados.
- Mesmo após Render LIVE, a composição integrada exige avaliação visual explícita do usuário; esta prévia não homologa funcionamento financeiro com dados reais.


## 12/11 — Preservação do visual aprovado da tela operacional
O usuário identificou que `?tela=lancamentos` mostrava o modo `preview` antigo, enquanto a validação visual de 09/11 na issue #660 usou `web-evolution.html?tela=lancamentos` com `mode="live"`. A entrada QA estática foi corrigida para apresentar o **mesmo modo operacional** com fixture P0 sintética de novembro e marcadores de demonstração; não publica HTML autenticado nem chama API ou realiza escrita. A rota `?tela=lancamentos-legado` preserva o cenário antigo para regressões. O novo teste em oito viewports verifica banner e quatro KPIs, cabeçalho compacto, filtros/favoritos, grid maximizado, ícones e pagamento, além de zero API. Só publicar depois dos gates verdes e aguardar aprovação explícita do usuário; produção e Android intocados.


## 12/11/2026 — Shell global único, candidato de QA após vídeo da transição
O usuário apontou no vídeo uma divergência no Shell quando navega Home → Lançamentos: marca em moldura, menu em retângulos, desaparecimento do + e sino com borda. Estilos aprovados da Home passam a ser a **única autoridade visual do Shell**, independentemente da tela. Foram removidas somente regras de Shell que estavam indevidamente em `launches-stage09.css`; a apresentação da área interna de Lançamentos continua sem alteração. O sino usa o padrão sem moldura em todas as telas; seu ponto de alerta é condicionado exclusivamente à informação financeira canônica. A regra vale para futuras telas: sidebar, logo, topbar, busca, período, perfil, notificações e botões globais são componentes do Shell, nunca CSS de cada página.

Novo teste `meg-stage09-shell-continuity.browser.mjs` compara estilos computados e dimensões de Home e Lançamentos em seis viewports, com ida e volta e zero API/escritas. O único HTML publicado continua sendo `fluxo-integrado-08.html`; sem entrada autenticada no serviço estático. **A alteração de Shell é candidata e exige nova validação visual explícita**, sem reabrir a aprovação dos componentes internos. Render QA autoDeploy OFF, aguardar CI estática e CI integrada verdes antes de deploy manual.
