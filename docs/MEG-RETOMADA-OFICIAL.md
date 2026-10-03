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

## Novo norte oficial do MEG Web — EVOLUÇÃO DIRETA DO APP

A diretriz anterior de criar um Web com linguagem própria de dashboard foi substituída em 03/10/2026.

**Regra principal:** o MEG Web deve ser a evolução direta do aplicativo MEG já validado. O App é a fonte visual, estrutural e funcional de verdade.

Não criar outro produto, outro dashboard, outra identidade ou outra hierarquia de informação.

### Fonte de verdade

Antes de alterar uma tela Web, consultar os componentes reais em `apps/web/src/mobile/`, principalmente:

- `MegMobileFinal.tsx`
- `MegMobileLaunchSheet.tsx`
- `MegMobileCardCenter.tsx`
- `MegMobileCoreScreens.tsx`
- `MegMobileBenefitModal.tsx`
- `MegMobilePicker.tsx`
- os respectivos arquivos `meg-mobile-*.css`

O Android/Mobile continua **intocado**. Ele serve como referência e contrato do produto.

### O que “evolução para desktop” significa

Preservar:
- identidade MEG;
- mesma paleta e linguagem visual;
- mesma iconografia;
- mesmas nomenclaturas;
- mesma ordem mental das informações;
- mesmas regras financeiras;
- mesmos estados, cores semânticas e interações;
- mesmos fluxos de Lançamentos, Pendentes, Cartões e Benefício.

Adaptar apenas o necessário para aproveitar uma tela maior:
- distribuir blocos lado a lado quando houver espaço;
- ampliar áreas de leitura;
- transformar o Dock do app em navegação desktop equivalente, mantendo os mesmos destinos e ordem principal;
- manter cabeçalho com marca, período e usuário como no App;
- preservar carrosséis, seletores e modais reconhecíveis como os do App;
- usar responsividade para recompor o mesmo produto, nunca para inventar outro.

### Home Web deve nascer da Home real do App

A Home atual do App é a referência. Sua estrutura principal é:

1. Header: marca MEG + período + usuário.
2. Título contextual: Situação atual / período.
3. Saldo disponível.
4. Fluxo: Entradas, Saídas e Resultado.
5. Resumo: Contas a pagar, Faturas de cartões, Outras pendências e Contas pagas.
6. Benefício Alimentação.
7. Ações rápidas: Cartões, Pagar conta, Fluxo de caixa e Ver relatórios.
8. Navegação principal equivalente ao Dock: Início, Lançamentos, Novo, Pendentes e Menu.

No Web, esta estrutura pode ser reorganizada espacialmente em colunas e grids, mas não substituída por hero publicitário, KPIs inventados, gráficos que não existem na Home do App ou outra hierarquia.

### Cartões

Preservar o conceito real do App:
- carrossel infinito;
- cartão ativo central;
- cartões/imagens reais;
- central do cartão;
- métricas da fatura;
- lançamentos da fatura;
- Benefício integrado como cartão quando aplicável.

### Lançamentos

O fluxo Web deve ser uma expansão espacial do `MegMobileLaunchSheet`, não uma reinvenção:
- Despesa / Receita / Alimentação;
- mesmos campos e regras;
- mesmos estados;
- mesmos seletores visuais;
- autocomplete;
- crédito/parcelas;
- benefício travado conforme regra;
- confirmação e sucesso reconhecíveis como o App.

### Regra de validação

Antes de apresentar qualquer tela Web:
1. comparar lado a lado com o App real;
2. confirmar que um usuário do App reconheceria imediatamente o Web como o mesmo MEG;
3. verificar que a diferença é apenas ganho de espaço, legibilidade e produtividade;
4. conferir responsividade;
5. rodar CI e Visual Preflight;
6. não chamar de pronto se houver divergência visual estrutural.

A marca oficial validada pelo usuário continua obrigatória e não pode ser substituída por interpretações alternativas.


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

