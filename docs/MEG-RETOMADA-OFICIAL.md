# MEG Finanças — Retomada Oficial / Último Ponto Validado

> Palavra de retomada: **Retomar MEG — memória oficial — último ponto validado.**

## Correção oficial de retomada — conjunto aprovado de 16 imagens

Em 03/10/2026, Marcos reenviou e confirmou: **“esse é o nosso novo sistema”**. O conjunto de 16 imagens em `docs/design/2026-10-03/` é a referência visual integral do novo MEG Web e deve ser implementado com todas as regras financeiras já consolidadas.

Este checkpoint tem precedência sobre orientações visuais anteriores conflitantes, inclusive a restrição de tratar as demais telas somente como inventário até validar a antiga Home-mãe. O App permanece como contrato de negócio; as imagens aprovadas definem a composição visual Web. Não substituir a prancha aprovada por outro dashboard ou por uma interpretação simplificada do App.

### Arquivos de referência preservados no Git

| Tela/fluxo | Imagem original preservada |
| --- | --- |
| home | [Referência](design/2026-10-03/home.png) |
| login | [Referência](design/2026-10-03/login.png) |
| loading | [Referência](design/2026-10-03/loading.png) |
| movements | [Referência](design/2026-10-03/movements.png) |
| payables | [Referência](design/2026-10-03/payables.png) |
| cards | [Referência](design/2026-10-03/cards.png) |
| settlement | [Referência](design/2026-10-03/settlement.png) |
| benefit | [Referência](design/2026-10-03/benefit.png) |
| card-center | [Referência](design/2026-10-03/card-center.png) |
| period | [Referência](design/2026-10-03/period.png) |
| transfer | [Referência](design/2026-10-03/transfer.png) |
| card-payment | [Referência](design/2026-10-03/card-payment.png) |
| edit-launch | [Referência](design/2026-10-03/edit-launch.png) |
| benefit-recharge | [Referência](design/2026-10-03/benefit-recharge.png) |
| launch-choice | [Referência](design/2026-10-03/launch-choice.png) |
| launch | [Referência](design/2026-10-03/launch.png) |

O `manifest.json` registra nome original e SHA-256 de cada PNG. As imagens são referências, não telas funcionais nem prova de implementação. Valores, nomes e cartões de exemplo não devem substituir os dados reais do usuário.

### Regras que continuam obrigatórias

- Fidelidade às referências: estrutura, proporções, paleta escura, neon elegante, profundidade 3D, SVGs lineares e tipografia legível com dimensionamento responsivo automático.
- Login → Loading → Home; Loading aprovado preservado e Android/Mobile intocado nesta etapa.
- Telas fixas sem rolagem geral; somente regiões de dados e conteúdo extenso de modais podem rolar, com scrollbar personalizada. Cabeçalhos e ações permanecem acessíveis.
- Lançamentos sem agrupamento por categoria, com tipo, forma de pagamento, filtro de data funcional e retorno à Home com saldos atualizados após salvar.
- Novo/Editar: Despesa/Receita/Alimentação, autocomplete do histórico real, categoria visual, classificação Contas gerais/Investimentos/Benefício e tipo Conta monetária/Conta benefício, ambos filtrando contas reais.
- À vista (Pix/boleto/débito), cartão de crédito com cartão e parcelas conforme regras consolidadas, benefício com conta vinculada travada. Crediário permanece aposentado para novos lançamentos até nova validação explícita.
- Pendentes: filtros Todas/A pagar/Pagas/Vencidas, busca, agrupamento por data, somas corretas, seleção e status-pill.
- Baixa: confirmação, escolha da data, seleção em lote e bloqueio quando faltar saldo monetário, indicando exatamente quanto falta; Cancelar sem fundo branco.
- Cartões: carrossel cíclico/infinito, cartão ativo central, imagens reais, central do cartão e fatura. Verocard/benefício tem saldo e histórico próprios, com crédito/recarga inserível.
- Transferências, pagamento de fatura, edição e recarga preservam validações, persistência, sincronização e regras existentes. Nenhuma operação financeira pode ser simulada como se estivesse salva.
- Não exibir Plano Premium. Ícones de compras com benefício em amarelo e receitas com símbolo de dinheiro; categorias com ícones próprios.
- Revisar screenshots lado a lado com a referência em desktop alto e compacto antes de declarar pronto; build/CI/preflight verdes não equivalem a aprovação visual do usuário.

### Estado real desta retomada — implementação de 03/10/2026

- As 16 referências originais permanecem preservadas. A implementação funcional foi criada no Evolution, substituindo a Home antiga e a galeria estática por componentes do produto.
- Login real e Loading preservado; Home, Lançamentos, Pendentes, Cartões, Benefício, relatórios, fluxo de caixa e modais usam APIs existentes. Configurações mostra os cadastros reais para consulta.
- Pagamento em lote expande a fatura canônica, evita duplicidade de eventos e valida saldo na data escolhida. Recarga usa endpoint exclusivo de benefício. Transferência e lançamentos preservam operationId nos retries. Edição mantém proteção de versão e de origem do cartão.
- QA sem sessão é identificada como ilustrativa e bloqueia gravações. Falha de API autenticada mostra erro e tentativa novamente, sem trocar por dados fictícios.
- Build Web e contratos Evolution passaram localmente. Smoke Playwright verificou 8 módulos em 3 viewports (24 layouts), filtros, insuficiência de saldo, data/baixa atômica, recarga/histórico e retry idempotente, com API simulada e nenhuma alteração em dados reais.
- `scripts/evolution-system-smoke.mjs` reproduz a verificação; o workflow Visual Preflight publica as capturas e resultados como artifact. Todos os grupos da suíte passaram localmente após gerar Prisma e executar os testes TypeScript com `node --import tsx`, contornando a limitação de IPC do CLI tsx. CI deve ser conferida na revisão publicada.
- **Validação visual final ainda pendente:** a composição foi conferida em capturas, mas o acabamento não é pixel a pixel. A arte da Home é SVG geométrico e difere da textura da referência. A central do cartão compartilha a composição funcional de cartões. Não declarar aprovação visual do usuário.
- Rota do novo sistema: `evolution.html`; Login: `evolution.html?screen=login`. O portal legado em `index.html` permanece separado. Android/Mobile não foi alterado.
- Próxima retomada: verificar revisão da PR, checks e publicação; consultar artifacts e PNGs lado a lado; finalizar diferenças visuais acima. Não solicitar reenvio das referências já salvas.

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


## Correção visual oficial — Home Web fiel ao App

Em 03/10/2026, o usuário rejeitou a primeira galeria genérica por não preservar a arte real do App.

Regra atualizada:
- a Home do App é a prancha-mãe visual;
- copiar os tokens reais do App, inclusive `#002e2f`, `#001f22`, `#20e7e0`, bordas, gradientes, sombras e raios definidos em `apps/web/src/mobile/meg-mobile-final.css`;
- usar a arte de marca do App, `/brand/meg-finance-system-mark-transparent.svg`, nas prévias que representam o sistema;
- desktop pode apenas redistribuir os mesmos blocos para ficar mais próximo, ajustado e produtivo;
- não criar outra estética para “parecer desktop”;
- não propagar a nova estética para todas as telas antes de validar a Home-mãe.

## Novo Lançamento Web — referência aprovada para implementação

Em 03/10/2026, o usuário aprovou como direção do Novo Lançamento a composição visual com maior profundidade 3D, ícones SVG, tipografia maior e dimensionamento automático para Web.

Regras obrigatórias desta implementação:
- usar `EvolutionFinancialIcon`/SVG sempre que houver equivalente;
- manter Categoria com picker visual e atalhos das categorias mais usadas;
- exibir **Classificação da conta**: Contas gerais / Investimentos / Benefício;
- exibir **Tipo de conta**: Conta monetária / Conta benefício;
- a classificação/tipo devem filtrar contas reais, nunca ser decoração sem efeito;
- preservar regras reais de pagamento, crédito, parcelamento, benefício, status e autocomplete;
- Crediário continua aposentado para novos lançamentos até nova validação explícita;
- aumentar tipografia e controles com `clamp()` e grids responsivos;
- modal deve dimensionar automaticamente com largura/altura do viewport e recompor colunas em telas menores;
- aparência 3D deve vir de profundidade, gradientes, sombras, camadas e ícones, sem sacrificar legibilidade;
- validar no Visual Preflight em desktop alto e desktop compacto antes do merge.

## Regra permanente de documentação e prévias

A partir de 03/10/2026:

- Toda mudança relevante de direção, referência visual, regra de produto ou ponto validado deve ser registrada neste arquivo ou em documento oficial relacionado antes de encerrar a etapa.
- O projeto mantém `docs/MEG-WEB-PREVIEWS.md` como inventário oficial das telas Web.
- A galeria de prévias deve existir no próprio Evolution por `evolution.html?screen=preview&preview=<tela>`.
- O Visual Preflight deve gerar screenshots das prévias principais em cada PR visual.
- Se o chat travar, a retomada deve consultar primeiro este arquivo, a galeria de prévias, a `main` atual e os últimos artifacts do preflight.
- Não depender de uma decisão existir apenas no chat.

## Regra de retomada

Quando o usuário escrever **“Retomar MEG — memória oficial — último ponto validado”**, conferir este arquivo, a `main` atual e o último CI/preflight antes de continuar. Não assumir que uma tentativa posterior foi validada só porque existe no código.

