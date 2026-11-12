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
