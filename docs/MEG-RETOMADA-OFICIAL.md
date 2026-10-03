# MEG Finanças — Retomada Oficial / Último Ponto Validado

> Palavra de retomada: **Retomar MEG — memória oficial — último ponto validado.**

## Checkpoint oficial — 03/10/2026

Este arquivo é a fonte persistente de retomada do projeto MEG Finanças Web quando um chat for interrompido, travar ou precisar ser reiniciado.

### Estado do produto

- Repositório oficial: `MarcosVilalva/MEG-Platform`.
- Android: **congelado e intocado** nesta fase.
- Loading Evolution: **validado** e não deve ser redesenhado sem nova validação explícita.
- Foco atual: **MEG Web / Evolution**.
- A Web deve preservar as regras funcionais consolidadas no app, mas usar composição própria de desktop.
- Responsividade é premissa obrigatória.
- A tela principal não deve depender de rolagem geral. Rolagem apenas em regiões densas que realmente precisem dela, com tratamento visual MEG.
- Não exibir `Plano Premium` nesta fase.

## Marca canônica

A referência visual oficial da marca é a logo **MEG FINANÇAS** indicada pelo usuário em 03/10/2026: barras ascendentes em azul/ciano, seta ascendente turquesa sobre a palavra `MEG`, `MEG` em branco e `FINANÇAS` em turquesa abaixo.

Regras permanentes:

1. Não criar versões interpretadas, alternativas ou “inspiradas” da logo.
2. Não usar a antiga `evolution/brand/meg-mark.svg` no Evolution.
3. A Web deve usar uma única marca canônica em Login, Home/sidebar e demais superfícies.
4. O asset canônico do repositório nesta etapa é `/brand/meg-loading-lockup.svg`, por estar alinhado à marca validada do Loading.
5. Se for disponibilizado futuramente o arquivo vetorial original da marca, ele substitui este asset sem redesenho manual.

## Novo norte oficial do MEG Web

A condução deixa de ser “reconstrução aproximada” e passa a ser **produto real orientado por referência**.

### 1. Referência travada

Antes de implementar:
- identificar a referência oficial;
- distinguir o que deve ser preservado, adaptado ao desktop ou descartado;
- impedir elementos antigos de contaminarem a nova interface.

### 2. Linguagem de produto

A Web deve se inspirar em padrões consolidados de produtos financeiros e SaaS modernos, sem copiar identidade de terceiros:
- hierarquia clara;
- grid consistente;
- tipografia legível;
- densidade controlada;
- menos efeitos gratuitos;
- profundidade visual discreta;
- superfícies funcionais;
- ações principais óbvias;
- estados, alertas, modais e filtros consistentes.

### 3. Menos “mockup”, mais sistema

Evitar:
- brilho excessivo sem função;
- grandes áreas decorativas que roubem espaço de conteúdo;
- cards apenas cenográficos;
- fontes pequenas;
- excesso de informação simultânea;
- componentes que pareçam montados isoladamente.

Priorizar:
- leitura imediata;
- números importantes em primeiro plano;
- organização espacial;
- informação real;
- interação previsível;
- acabamento visual uniforme.

### 4. Validação antes de apresentar ao usuário

Nenhuma entrega deve ser chamada de pronta apenas porque compilou.

Antes de solicitar validação do usuário:
- CI verde;
- preflight visual verde;
- comparação das capturas;
- logo correta;
- proporção correta;
- responsividade conferida;
- nenhuma referência visual antiga reaparecendo;
- Android não alterado.

### 5. Ordem atual de reconstrução

1. **Branding canônico** em toda a Web.
2. **Login** como produto premium real, sem excesso de cenografia.
3. **Home**: rever hierarquia, proporções, densidade, cards, gráficos e cabeçalho.
4. **Novo Lançamento**: preservar fluxo funcional do app, elevar a linguagem visual Web.
5. **Pendentes / Baixa / Confirmações / Alertas**.
6. **Cartões / Benefícios / demais módulos**.
7. Validação cruzada em viewports desktop reais.

## Último marco técnico anterior a este norte

A PR #557 foi integrada à `main` no commit `ffc3d7e28dddd003bab6657e0995408f3a8711f1`.

Ela trouxe:
- fluxo de Novo Lançamento mais próximo do app;
- SVGs financeiros;
- ajustes de dimensionamento da Home;
- CI e Evolution Visual Preflight verdes.

Este marco técnico **não significou validação visual final da Home**. O usuário registrou que houve melhora, mas que ainda falta muito e pediu mudança de condução do projeto.

## Regra de retomada

Quando o usuário escrever **“Retomar MEG — memória oficial — último ponto validado”**, conferir este arquivo, a `main` atual e o último CI/preflight antes de continuar. Não assumir que uma tentativa posterior foi validada só porque existe no código.

