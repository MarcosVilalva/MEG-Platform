# MEG WEB — CONTINUIDADE OFICIAL

> [!IMPORTANT]
> **AVISO OPERACIONAL ENTRE CHATS**
>
> - Cada chat trabalha **SOMENTE a etapa indicada no seu título**.
> - A instrução `Comece AGORA pela etapa 1` do Prompt Master vale **somente para o chat 01** e não reinicia o projeto nos chats seguintes.
> - Antes de iniciar qualquer etapa, ler este arquivo e `docs/MEG-WEB-FINANCIAL-AUTHORITY.md`, confirmar a etapa autorizada e respeitar todas as decisões já aprovadas.
> - Do PDF **MEG Finanças — Regras Consolidadas, consolidado em 29/09/2026**, somente as regras de negócio expressamente mantidas na Seção 19 se aplicam à nova Web. Regras visuais históricas do Android não substituem os prints oficiais atuais.
> - Não avançar para outra etapa enquanto a etapa do chat atual não estiver formalmente encerrada.

**Projeto:** MEG Finanças Web Evolution  
**Repositório oficial:** `MarcosVilalva/MEG-Platform`  
**Finalidade:** manter um checkpoint único, atualizado e operacional do novo MEG Web, preservando continuidade entre chats, etapas, branches e validações.

---

## 1. Regra de continuidade

Este arquivo é o checkpoint vivo do projeto.

Ele deve registrar:
- etapa atual;
- branch e PR atuais;
- último commit relevante;
- decisões aprovadas;
- telas validadas;
- telas pendentes;
- divergências encontradas;
- pendências reais;
- próximo passo autorizado.

Este arquivo **não substitui**:
- o Prompt Master;
- as regras financeiras do repositório;
- o documento de Regras Consolidadas;
- os prints oficiais atuais.

Ele serve para indicar **onde o projeto está** e **o que vem depois**.

---

## 2. Prioridade das fontes

Em caso de conflito, seguir esta ordem:

1. **Regras de negócio do repositório**
2. **Print oficial atual da tela**
3. **Prompt Master**
4. **Este checkpoint de continuidade**

Nunca alterar regra financeira para fazer uma tela “bater” visualmente.

---

## 3. Referência visual oficial

A partir do novo projeto MEG Finanças Web Evolution:

- Somente as imagens adicionadas ao Projeto como conjunto oficial atual são referência visual válida.
- Qualquer print, mockup, protótipo ou imagem anterior deve ser desconsiderado para decisões visuais.
- Os prints atuais são fonte da verdade para:
  - composição;
  - hierarquia;
  - cores;
  - tipografia;
  - espaçamentos;
  - proporções;
  - cards;
  - modais;
  - tabelas;
  - ícones;
  - organização geral.
- O modelo visual é obrigatório, não apenas inspiração.

Adaptações são permitidas somente quando necessárias para:
1. incluir informação funcional ausente;
2. acomodar regra de negócio;
3. garantir responsividade;
4. garantir acessibilidade;
5. atender requisito explícito do Prompt Master.

Toda adaptação deve preservar a identidade visual oficial.

---

## 4. Android

- Android permanece **congelado**.
- Não alterar Android, OTA, UI mobile antiga ou fluxos atuais durante a construção do novo Web.
- Android pode servir apenas como referência funcional histórica quando necessário para entender uma regra já existente.
- Não reutilizar UI do Android como base da nova Web.

---

## 5. Nova Web

A nova Web deve ser construída:
- de forma isolada;
- com base limpa;
- sem reaproveitar UI antiga;
- sem reaproveitar CSS antigo;
- sem reaproveitar componentes visuais antigos;
- sem usar protótipos anteriores como fundação.

As regras financeiras existentes devem ser auditadas, preservadas e tratadas como prioridade máxima.

---

## 6. Regra de implementação

Antes de implementar qualquer tela:

1. identificar regras e funcionalidades que não podem ser alteradas;
2. localizar a camada de regra correspondente;
3. confirmar que a tela consumirá a regra central;
4. evitar cálculo financeiro dentro da UI;
5. implementar a tela;
6. publicar preview;
7. fornecer link sem cache;
8. aguardar validação visual explícita do usuário;
9. somente depois avançar.

CI, build, testes e deploy **não equivalem à validação visual**.

Nenhuma tela deve ser considerada validada sem aprovação explícita do usuário.

---

## 7. Qualidade financeira

Nenhuma tela deve calcular por conta própria:
- saldo;
- parcela;
- fatura;
- total;
- status;
- competência;
- limite;
- valor projetado;
- saldo pós-operação.

Todas as telas e modais devem consumir a camada central de regras.

Operações financeiras devem preservar:
- atomicidade;
- precisão monetária;
- saldo disponível;
- regras de pagamento;
- regras de baixa;
- regras de benefício;
- regras de cartão;
- regras de parcelamento;
- regras de transferência.

Regras duplicadas ou divergentes devem ser **reportadas antes de qualquer correção**.

---

## 8. Responsividade

Padrão estrutural:

- mobile-first;
- breakpoints principais em `640px` e `1024px`;
- evitar altura fixa;
- zero rolagem horizontal da página;
- nenhum conteúdo cortado ou sobreposto;
- tabelas adaptadas corretamente;
- alvos de toque adequados;
- responsividade estrutural, nunca remendada;
- validação do sistema em navegador com **zoom 100%**;
- Shell ajustado exatamente à janela, sem rolagem no documento/página;
- somente a área de conteúdo abaixo da topbar pode rolar verticalmente;
- sidebar pode rolar verticalmente apenas quando seu conteúdo não couber;
- `html`, `body`, raiz React e Shell permanecem limitados ao viewport;
- nenhum container aninhado usa `min-height: 100vh` ou `min-height: 100dvh`;
- contrato obrigatório nos viewports `1366x600`, `1366x768` e `1920x1080`, expandido e recolhido, com `document.documentElement.scrollHeight <= window.innerHeight`;
- logo ativo sempre participa do fluxo e não pode se sobrepor ao primeiro item do menu.

---

## 9. Ordem oficial do projeto

1. Auditoria completa das regras de negócio
2. Testes de caracterização
3. Consolidação da camada financeira central
4. Fonte única de dados/mocks
5. Shell, tokens e componentes base
6. DataGrid
7. Loading, Login, Criar Conta e Recuperar Senha
8. Home
9. Lançamentos
10. Novo Lançamento e Editar Lançamento
11. Pendentes e Confirmar Pagamento
12. Cartões e Pagar Fatura
13. Benefícios e Registrar Recarga
14. Nova Transferência e Selecionar Período
15. Relatórios
16. Configurações
17. Funcionalidades diferenciais

Não avançar prematuramente para telas futuras.

---

## 10. Estado atual

### Etapa atual
**Etapa 3 — Shell, tokens e componentes base: EM EXECUÇÃO**

### Situação
- Prompt Master definido.
- Novo projeto MEG Finanças Web Evolution definido.
- Novo conjunto de imagens oficiais definido como única referência visual.
- Android congelado.
- Decisão mantida de não usar a PR visual anterior como base da nova Web.
- Etapa 01 mesclada na `main` pelo commit `0d21136c3993b11b127d8339a5b849b3727275ed`.
- Branch atual: `meg-web-evolution/02-fonte-unica-dados-mocks`.
- Etapa 02 mesclada na `main`: `db5e5ee4ba763db299e3bf005a5f63eac1c3666f`.
- Branch atual: `meg-web-evolution/03-shell-tokens-base`.
- PR da Etapa 03: **#605**, em Draft, mergeável.
- Head técnico da Etapa 03 antes desta atualização de continuidade: `4d872b03e2d3b5b4b01e7a55814be6a0ea35e401`.
- Base auditada: `main@87e04b989568d95c182927c6f493061be26440db`.
- Auditoria financeira por arquivo/linha registrada em `docs/MEG-WEB-AUDITORIA-ETAPA-01.md`.
- Testes de caracterização financeira criados e adicionados ao gate.
- Camada pura `financial-policy.ts` criada para regras monetárias centrais sem DOM nem acesso a banco.
- `monetary-protection.ts` mantém as assinaturas existentes e reexporta a política pura.
- `phoenix-preview-read.ts` foi consolidado para consumir a mesma política central, removendo duplicação equivalente sem alterar comportamento.
- Workflow isolado `MEG Web Evolution Foundation` passou em caracterização financeira, testes core, compatibilidade financeira legada, política de status legada e build da API.
- Correção técnica de segurança autorizada e aplicada: Capacitor atualizado para 7.6.9 e `source-map-js` fixado em 1.2.2.
- O security gate global passou e o `MEG Platform CI` fechou verde.
- O gate isolado `MEG Web Evolution Foundation` também fechou verde.
- Android permanece congelado funcional e visualmente; a exceção foi apenas de dependência de segurança.
- Divergências continuam sendo reportadas antes de qualquer refatoração.

### Direção aprovada
A Etapa 1 foi encerrada após caracterização, consolidação das autoridades financeiras, correções de segurança e gates verdes. Nenhuma UI foi iniciada nesta etapa.

### Etapa 03 — execução atual
- Entrada isolada criada em `apps/web/web-evolution.html`.
- Nova camada visual criada em `apps/web/src/meg-web-evolution/`, sem importação de UI Phoenix/Web Next/Android.
- Tokens oficiais aplicados em `styles/tokens.css`.
- Shell inicial criado com sidebar, topbar, busca, período, notificações, avatar e responsividade 640/1024.
- Componentes base iniciais: `GlassCard`, `PrimaryButton`, `IconButton` e SVGs semânticos próprios.
- Contrato `test:web-evolution-shell` adicionado ao gate.
- Android permanece congelado.
- DataGrid não iniciado.
- Preview dedicado publicado em Render: `https://meg-web-evolution-preview.onrender.com/web-evolution.html`.
- Refinamento de fidelidade aplicado: logo oficial MEG FINANÇAS, escala/posição do branding, proporções da sidebar/topbar, botão `Novo`, fundo e atmosfera teal/neon ajustados ao print oficial.
- Ajuste solicitado na validação visual: branding centralizado e controle explícito de recolher/expandir a sidebar no desktop; em tablet/mobile permanece o comportamento responsivo próprio.
- Referência oficial da Home recebida nesta etapa: composição desktop 1672 × 941, mantendo sidebar de 208 px e topbar de aproximadamente 86 px; usada agora apenas para calibrar o Shell. A Home funcional continua não iniciada para respeitar a ordem do projeto.
- Refinamento adicional do Shell conforme a referência oficial: espaçamento dos itens de navegação, largura do botão `Novo` e marca reduzida dedicada ao estado recolhido.
- Grafismo inferior da sidebar reconstruído como SVG inline em `sidebar__art`, com fluxo normal de layout, `margin-top:auto`, recorte pela largura, baixa opacidade e fade superior; pseudo-elementos absolutos anteriores removidos.
- Contrato estrutural soberano da futura Home registrado em `docs/MEG-WEB-HOME-CONTRACT.md`: 7/5 na linha 1, quatro KPIs 3/3/3/3, 6/6 na linha 3 e 6/6 na linha 4.
- Vulnerabilidade transitiva `shell-quote` detectada pelo CI durante a Etapa 03 e corrigida para `1.12.0`; gates retornaram verdes antes dos refinamentos visuais seguintes.
- Cabeçalho da sidebar refinado novamente no desktop: controle de recolher passou para botão glass `28x28` com ícones `PanelLeftClose/PanelLeftOpen`, tooltip, metade para dentro/metade para fora da borda; logo expandida usa lockup desktop próprio com `FINANÇAS` centralizado; estado recolhido exibe apenas o símbolo financeiro `32x32`; ícones do menu recolhido permanecem no mesmo eixo horizontal da marca. Mobile não foi alterado nesta rodada. Head visual da rodada: `7bce0b93e3a44d1768c5a36f889c56aabddcfec4`.
- Identidade da sidebar atualizada com os SVGs oficiais anexados pelo usuário, sem redesenho: `logo-meg-financas.svg` para o estado expandido (`140px`, altura automática) e `simbolo-meg-financas.svg` para o estado recolhido (`36px`, altura automática), com crossfade de opacidade em `200ms`. Assets gerados anteriormente para a sidebar foram removidos para evitar referência visual concorrente.
- Espaçamento desktop do branding refinado sem alterar os SVGs: expandido com `padding-top: 20px` e `margin-bottom: 20px`; recolhido com `padding-block: 16px`; container com `overflow: visible`; larguras preservadas em `140px` e `36px` com altura automática.
- Correção estrutural de viewport e sidebar aplicada: documento travado ao viewport, Shell em `100vh/100dvh` com overflow externo bloqueado, coluna principal em flex, rolagem vertical restrita ao conteúdo, sidebar com overflow vertical próprio, botão de recolher removido do container rolável e crossfade do logo corrigido para que somente o asset ativo participe do fluxo.
- Contrato automatizado de navegador adicionado em `shell.viewport.browser.test.mjs`, cobrindo `1366x600`, `1366x768` e `1920x1080`, nos estados expandido e recolhido, verificando scroll do documento e não sobreposição entre logo e `Início`.
- O workflow `MEG Web Evolution Foundation` agora executa esse contrato em Chrome headless.
- Bug visual confirmado no viewport baixo: o container do logo estava participando de um flex-column com `flex-shrink: 1`; quando a sidebar precisava acomodar navegação, grafismo e botão em pouca altura, o container encolhia mas o SVG permanecia visível com `overflow: visible`, invadindo `Início` e `Lançamentos`.
- Correção aplicada sem alterar os SVGs: `.meg-brand` e `.meg-nav` agora usam `flex: 0 0 auto`; o menu mantém `margin-top: 0`; o logo ativo continua no fluxo normal e o inativo permanece absoluto no crossfade.
- O contrato de navegador permanece responsável por validar `firstItemTop >= logoBottom` nos estados expandido e recolhido. O workflow foi corrigido para servir `web-evolution.html` com base `/` no CI, pois a tentativa anterior falhou antes da medição por `404` do Vite em ambiente GitHub Actions.
- Sidebar desktop refinada para preservar a largura expandida de `13rem` (~208px) e evitar truncamento visual de `Lançamentos`/`Configurações`; padding horizontal dos itens reduzido sem alterar a largura estrutural.
- Wrapper `.meg-sidebar-wrap` criado com `position: relative` e `overflow: visible`; o botão de recolher permanece filho desse wrapper e fora do elemento rolável. A sidebar fixa não rola; somente `.meg-nav` usa `overflow-y: auto`, `flex: 1`, `min-height: 0`, scrollbar oculta e rolagem por roda preservada.
- Regras de altura desktop adicionadas: até `700px`, logo expandido `110px`, `padding-top: 12px`, itens de menu `40px` e gaps menores; até `600px`, logo `90px`, itens `36px` e compactação adicional.
- Contrato de navegador ampliado para `1366x600`, `1366x768` e `1920x1080`, expandida e recolhida: nenhum texto do menu pode exceder sua largura, botão de recolher deve permanecer totalmente dentro da janela e sem clipping real por ancestrais, `Início` deve iniciar abaixo da base do logo e o documento não pode rolar.
- Branding desktop refinado sem alterar os SVGs oficiais: logo expandido reduzido para `112px` com `padding-top: 16px` e `margin-bottom: 16px`; símbolo recolhido mantido em `36px`; até `700px` de altura o logo passa a `96px` com espaçamento `12px/12px`; até `600px`, `80px`.
- Botão de recolher/expandir refeito: SVGs `PanelLeftClose/PanelLeftOpen` com os paths aprovados, `strokeWidth={1.75}`, ícone `18px`, botão `32x32`, raio `10px`, fundo igual ao campo de busca, borda verde-água sutil, cor secundária em repouso, destaque/glow no hover/focus e transição `150ms`; continua filho de `.meg-sidebar-wrap`, com `right: -16px`, centralizado verticalmente e fora da área rolável.
- Acessibilidade do botão atualizada com `aria-label` dinâmico `Recolher menu`/`Expandir menu`, `aria-expanded` e `title`; `prefers-reduced-motion` continua coberto pela regra global do Shell.
- Contratos atualizados para os novos tamanhos do logo e do botão. O teste real de navegador mantém a verificação de botão totalmente dentro da janela em estados expandido/recolhido e agora também exige geometria `32x32`.
- Botão desktop de recolher/expandir corrigido sem alterar logo nem demais SVGs: botão permanece `32x32`, ícone recebe `width={18}` e `height={18}` explícitos no próprio SVG, além de `strokeWidth={1.75}`.
- Stacking/corte corrigido: `.meg-sidebar-wrap` continua `position: relative; overflow: visible`; botão é filho direto desse wrapper, usa `position: absolute; top: 50%; right: -16px; transform: translateY(-50%)`, `z-index: 50` e fundo sólido `#02181c`, ficando acima da sidebar (`z-index: 30`) e do conteúdo principal.
- Tooltip nativo removido: o botão não possui mais atributo `title`; permanecem apenas tooltip customizado por `data-tooltip`, `aria-label` dinâmico `Recolher menu`/`Expandir menu` e `aria-expanded`.
- Contrato visual ampliado: em aberto e recolhido, exige `getBoundingClientRect()` de `32x32`, botão integralmente dentro da janela, nenhum clipping real por ancestral, ausência de `title` e `document.elementFromPoint()` no centro retornando o próprio botão. O SVG interno usa `pointer-events: none` para que o hit-test recaia no botão.
- Controle desktop de recolher/expandir redesenhado como item de rodapé da sidebar, acima de `Novo`; o botão flutuante de borda e seu tooltip em pílula foram removidos.
- Novo controle reutiliza a linguagem dos itens de navegação: `<button>` com ícone `20px`, texto `Recolher menu`, sem borda/glow em repouso, hover teal discreto, foco com outline de destaque e divisor superior de `1px`. O bloco usa `flex: 0 0 auto`, permanece fora do `.meg-nav` rolável e, portanto, continua visível em viewports baixos.
- No estado recolhido o texto some, o ícone `PanelLeftOpen` permanece centralizado no mesmo eixo dos demais ícones e o tooltip customizado `Expandir menu` aparece apenas em hover/focus. Sem atributo `title`; permanecem `aria-label` dinâmico e `aria-expanded`.
- Os SVGs de painel permanecem exatamente com os paths aprovados e `strokeWidth={1.75}`; logo e demais SVGs não foram alterados.
- Contratos atualizados para `1366x600`, `1366x768` e `1920x1080`, expandido/recolhido: controle integralmente dentro da janela, `document.elementFromPoint()` no centro retornando o próprio botão, ausência de `title` e documento sem rolagem. Em `max-height: 600px`, somente o nav é rolável e o rodapé permanece fora dele.
- Estado recolhido da sidebar refinado sem alterar os SVGs: largura estrutural permanece `72px` (`4.5rem`); container da marca recolhida passa a `56px` de altura, `display:flex`, alinhamento central e `padding-block:12px`.
- Símbolo recolhido passa a `28px`, `height:auto`, `object-fit:contain`, `max-width:40%` e permanece no fluxo normal; o logo expandido fica absoluto/inativo no crossfade. Em `max-height:600px`, container `48px` e símbolo `24px`.
- Crossfade do branding ajustado para `150ms`; a regra global de `prefers-reduced-motion` continua reduzindo transições quando solicitado pelo sistema.
- Controle de recolher permanece como item de rodapé da sidebar, fora do nav rolável; o antigo botão flutuante de borda continua removido.
- Contrato de navegador ampliado no estado recolhido para `1366x600` e `1366x768`: centro horizontal do símbolo deve coincidir com o centro do primeiro ícone do menu com tolerância de `1px`, respiro superior mínimo de `12px`, e `Início` deve começar abaixo da base do símbolo.
- Sidebar recolhida corrigida após validação visual do usuário: largura explicitamente fixada em `72px` no grid, wrapper e aside; todos os ícones do menu passam a `20x20px` e permanecem centralizados na coluna.
- Causa do ícone de Configurações parcialmente visível tratada na estrutura: no estado recolhido o grafismo `.sidebar__art` é ocultado com `display:none`, liberando altura; somente `.meg-nav` continua rolável, enquanto marca e rodapé usam `flex-shrink:0` e permanecem fixos.
- Branding recolhido atualizado sem alterar os SVGs: container `64px`, `display:flex`, centralizado, `padding-block:14px`; símbolo `36px`, `height:auto`, `object-fit:contain`, `flex:0 0 auto`, `min-width/max-width:36px`. Em `max-height:600px`, container `52px` e símbolo `30px`.
- Controle `Expandir menu` permanece como item de rodapé acima de `Novo`, sem borda/fundo/glow em repouso; hover/focus mantém destaque teal e tooltip apenas no estado recolhido. O antigo botão flutuante continua removido.
- Contrato de navegador ampliado para o estado recolhido em `1366x600` e `1366x768`: exatamente 7 ícones no nav, todos com dimensões positivas, totalmente dentro do nav e visíveis no `elementFromPoint` central; alinhamento horizontal logo/ícones com tolerância de `1px`; símbolo com largura mínima `30px`; controle sem borda em repouso; grafismo decorativo oculto; documento sem rolagem.
- Revisão por vídeo em 06/10/2026 confirmou regressão visual grave no estado recolhido: a troca para `simbolo-meg-financas.svg` fazia a identidade parecer um fragmento/traço no topo, em vez de uma redução natural do logo do sistema.
- Correção aplicada sem alterar os SVGs: o estado recolhido agora reutiliza `logo-meg-financas.svg` e apenas reduz sua escala. O logo recolhido passa a `48px` dentro do container de `64px`; em `max-height:600px`, `40px` dentro de `52px`. A transição continua em `150ms`, com o logo ativo no fluxo e o inativo absoluto.
- O vídeo também mostrou compressão vertical desnecessária da navegação em viewport baixo por causa do grafismo inferior. Em desktop com `max-height:700px`, `.sidebar__art` passa a `display:none`, preservando espaço para os 7 itens e o rodapé; em estado recolhido o grafismo já permanece oculto.
- Sidebar recolhida continua fixada em `72px`; ícones do menu permanecem `20x20px`, logo e rodapé fixos e somente o nav rolável. O controle de expandir permanece como item de rodapé, sem retorno do botão flutuante.
- Contratos atualizados para impedir regressão: estado recolhido não pode voltar a usar `simbolo-meg-financas.svg`; logo reduzido deve ter pelo menos `40px` no teste de navegador; viewports baixos devem ocultar o grafismo inferior.
- Controle de rodapé `Recolher menu` recebeu refinamento visual para aderir melhor à identidade MEG sem alterar os SVGs: ícone agora vive em um tile próprio `30x30`, raio `9px`, fundo teal muito discreto e contorno interno sutil.
- Linha do controle continua sem borda/glow em repouso; label usa tom secundário refinado e peso `650`. No hover/focus, o fundo da linha ganha gradiente teal leve, o tile do ícone recebe realce e o texto sobe para a cor principal, mantendo transições de `150ms` e `prefers-reduced-motion` global.
- No estado recolhido, apenas o tile com ícone permanece visível e centralizado; o tooltip customizado continua sendo `Expandir menu`. Nenhuma alteração foi feita no logo ou nos demais SVGs.
- Controle de rodapé recebeu revisão visual mais forte após feedback do usuário: agora tem superfície 3D própria, borda teal, dupla sombra interna/externa e glow neon perceptível já em repouso, mantendo linguagem do sistema em vez do aspecto plano anterior.
- O tile do ícone passa a `32x32` no estado expandido, com gradiente teal, highlight superior, sombra inferior e halo; no hover/focus o controle sobe `1px`, intensifica borda/glow e o tile ganha brilho adicional.
- No estado recolhido, o controle passa a um bloco persistente `44x44`, com tile `34x34`, `opacity:1`, `visibility:visible`, `z-index:8` no wrapper e glow próprio. Isso impede o desaparecimento visual ao recolher.
- Contratos atualizados: estado recolhido exige borda de `1px`, `opacity:1` e `visibility:visible`, além das verificações já existentes de hit-test, viewport e ausência de rolagem.
- Controle `Recolher/Expandir` refinado após novo feedback visual: ícone anterior de painel foi substituído por chevrons duplos (`chevronsLeft`/`chevronsRight`), mais leves e contemporâneos, mantendo `20px` e `strokeWidth={1.75}`.
- O visual do controle foi reduzido de intensidade: borda e glow em repouso ficaram discretos, tile interno caiu para `28x28`, fundo mais sóbrio e halo residual. Hover/focus ainda usa accent, porém sem o excesso de neon/3D da versão anterior.
- No estado recolhido, o controle permanece visível em `42x42` com tile `28x28`, sem desaparecer; o tooltip `Expandir menu` continua apenas em hover/focus.
- O grafismo inferior da sidebar foi restaurado no estado expandido inclusive em viewports baixos, porém compactado e com opacidade menor (`8.5rem/.42` até 700px e `6.5rem/.34` até 600px). No estado recolhido ele continua oculto para não disputar espaço com a navegação.
- Controle de recolher/expandir saiu da sidebar e passou para a topbar desktop, imediatamente antes da busca, em formato compacto de dois botões lado a lado: `Recolher menu` e `Expandir menu`, com chevrons duplos e estado indisponível desabilitado conforme a sidebar esteja aberta ou recolhida.
- A sidebar ganhou um novo item de rodapé `Sair`, com SVG próprio `logOut`, visual sóbrio e moderno, hover discreto com acento quente e foco acessível. Nesta Etapa 03 o botão é somente estrutural/visual; nenhuma rotina de autenticação/logout foi inventada ou conectada.
- O antigo controle de recolher no rodapé foi removido por completo. O botão `Novo` permanece abaixo de `Sair`, e o grafismo inferior da sidebar continua preservado no estado expandido.
- Contratos atualizados para exigir os dois controles da topbar, remoção do controle antigo da sidebar e presença do item `Sair`; o teste de viewport passa a usar o botão ativo da topbar para alternar o estado.
- Ajuste visual orientado pelo print enviado pelo usuário: os dois controles antes da busca passam a ser `Recolher/Expandir sidebar` (um único botão dinâmico com chevrons) + `Novo lançamento` (botão `+`), lado a lado, ambos com 46x46px e linguagem visual compatível com a topbar.
- O botão `Novo` foi removido da sidebar; permanece apenas na topbar como ação rápida. Nenhuma rotina funcional de inclusão foi conectada nesta Etapa 03.
- A sidebar mantém o item `Sair` no rodapé com ícone próprio, enquanto o grafismo inferior permanece preservado no estado expandido e oculto no recolhido.
- Contratos atualizados para exigir o par `toggle + Novo` na topbar, proibir o antigo `meg-new-button` na sidebar e manter o teste de viewport alternando o estado pelo botão único da topbar.
- Topbar refinada após vídeo de validação: seletor de período não pode mais ser comprimido nem quebrar `Outubro de 2026` em duas linhas. A topbar desktop passa a grid `auto minmax(0,1fr) auto`; busca absorve a variação de largura e ações à direita permanecem íntegras.
- `.meg-period` usa `min-width:max-content` e `white-space:nowrap`; nome do perfil continua sendo o elemento sacrificável por truncamento controlado, nunca o mês/período.
- Contrato de navegador ampliado nos viewports oficiais para exigir período em uma linha, sem clipping e totalmente dentro da janela.
- Feedback final antes da validação da Etapa 03: usuário aprovou os acabamentos sugeridos de consistência de tooltip e estados hover/focus, mas apontou que a descrição do filtro de período ainda quebrava em determinadas larguras.
- Correção reforçada no seletor de período: o texto passa a usar espaços não quebráveis (`Outubro&nbsp;de&nbsp;2026`), `.meg-period` usa `width:max-content`, mínimo `11.75rem` e `white-space:nowrap`; o `<span>` interno também fica explicitamente não quebrável. Em mobile o controle ocupa a largura disponível sem permitir quebra interna do texto.
- Teste real de navegador reforçado para exigir um único client rect do label, além das verificações já existentes de clipping e ajuste ao viewport.
- As sugestões finais de tooltips consistentes para ações icon-only e uniformização de hover/focus foram aprovadas pelo usuário e devem ser preservadas no fechamento visual da Etapa 03.
- Tooltips customizados implementados de forma consistente para controles icon-only: todos os 7 itens da navegação mostram tooltip apenas quando a sidebar está recolhida; `Sair` segue a mesma regra.
- Na topbar, os controles icon-only `Recolher/Expandir menu`, `Novo lançamento` e `Notificações` recebem tooltip customizado próprio. Nenhum `title` nativo foi adicionado.
- Os tooltips usam superfície escura, borda teal sutil, tipografia compacta e aparecem em hover/focus com transição de `150ms`; `prefers-reduced-motion` continua coberto pela regra global.
- Contrato atualizado para exigir `data-tooltip` nos itens recolhidos e nos controles icon-only da topbar.
- Investigação confirmou por que o tooltip não aparecia de forma confiável: ele era um pseudo-elemento filho dos itens dentro do `.meg-nav`, que precisa manter `overflow-y:auto`; pelas regras de overflow do navegador, isso podia clipar a projeção horizontal do tooltip. A correção passou o tooltip para um portal no `document.body`, com `position:fixed` e `z-index:1000`, eliminando o clipping pelo nav/sidebar.
- Tooltip agora é funcional tanto em `hover` quanto em `focus`: sidebar recolhida (7 itens + Sair) e controles icon-only da topbar (`Recolher/Expandir`, `Novo lançamento`, `Notificações`). Em sidebar expandida os itens com texto não exibem tooltip redundante.
- Última passada de consistência aplicada aos controles icon-only: raio `12px`, mesma profundidade de hover/focus (`inset 0 1px`, sombra externa `0 6px 16px` e halo `0 0 12px` a `.10`), mesma transição `150ms` e outline teal de `2px`. `Sair` preserva apenas a cor semântica avermelhada, mantendo a mesma intensidade de profundidade/neon.
- Teste de navegador agora simula mouse real via CDP e foco por teclado, exigindo tooltip visível e dentro da janela para `Novo`, `Recolher menu`, `Início` e `Configurações`; portanto a existência do atributo sem renderização deixou de ser considerada suficiente.
- Marca da sidebar recolhida recebeu destaque visual sem alterar o SVG oficial: `.meg-brand-stack` passa a funcionar como badge premium `48x48`, raio `13px`, fundo verde-escuro em gradiente, borda teal discreta, profundidade interna e halo neon leve.
- O logo completo reduzido permanece sendo o mesmo `logo-meg-financas.svg`, agora renderizado em `38px` dentro do badge com drop-shadow sutil. Em `max-height:600px`, badge `44x44` e logo `34px`.
- A solução preserva a coluna recolhida de `72px`, o alinhamento com os ícones, o fluxo normal e o crossfade já validado tecnicamente; nenhum path, cor ou viewBox do SVG foi alterado.
- Contratos atualizados para exigir o badge `48x48`/`44x44` e largura mínima de logo `34px` no navegador.
- Contrato de tooltips ampliado sem alteração de layout: no estado recolhido, os 7 itens da navegação, `Sair`, `Expandir menu (»)` e `Novo lançamento (+)` são testados individualmente em hover real e foco por teclado.
- Para cada alvo recolhido, o teste exige exatamente 1 tooltip, texto idêntico ao `aria-label`, dimensões visíveis, retângulo integralmente dentro da janela, portal direto em `document.body`, ausência de ancestral de sidebar/nav e ausência de atributo `title`.
- No estado expandido, os 7 itens da navegação e `Sair` são testados em hover/foco e devem produzir exatamente 0 tooltips; `Recolher menu («)` e `Novo lançamento (+)` continuam obrigados a produzir exatamente 1 tooltip em hover e foco.
- O contrato estático também proíbe `title=` e registra as asserções de unicidade, equivalência com `aria-label` e isolamento do overflow da sidebar.
- Nenhum CSS, geometria, espaçamento, SVG ou comportamento visual do Shell foi alterado nesta rodada; somente testes de contrato e checkpoint.
- Execução inicial do contrato exaustivo de tooltips não chegou aos testes de hover/foco: o gate parou antes em uma asserção estática obsoleta que ainda exigia `padding:16px 0` no branding recolhido, valor substituído nas rodadas posteriores.
- A falha não indica defeito de tooltip; foi uma regressão do próprio teste. A asserção antiga foi removida no commit `69a58f00573e8476189d8b99ff40f184f21ce3a9`, sem qualquer alteração de layout ou comportamento.
- O contrato de tooltips permanece inalterado e ainda precisa concluir uma execução verde para que seus resultados sejam considerados confirmados.
- Ajuste solicitado após validação em janela reduzida: no estado recolhido, o `.meg-nav` passa a distribuir os 7 itens verticalmente com `display:flex`, `flex-direction:column` e `justify-content:space-evenly`, mantendo `overflow-y:auto` apenas como fallback extremo. Em `1366x600` e `1366x768`, o contrato passa a exigir que o nav caiba sem rolagem.
- O rodapé `Sair` continua fixo fora do nav e agora é delimitado apenas por uma linha de 1px em gradiente teal/neon discreto (`.meg-sidebar-footer::before`), sem uma caixa separadora pesada.
- O objetivo é manter todos os ícones visíveis e distribuídos ao longo da coluna recolhida, preservando logo e rodapé fixos; a roda do mouse só será necessária se uma altura futura realmente não comportar os itens.
- Responsividade estrutural da topbar revisada após validação em janela reduzida: busca, período, notificações e perfil não podem mais disputar a mesma linha até se sobreporem.
- Entre `640px` e `1023px`, a topbar passa a duas linhas: busca ocupa uma linha integral e o bloco de ações ocupa a linha seguinte; período mantém largura íntegra e notificações/perfil ficam alinhados à direita.
- Abaixo de `640px`, a topbar passa a três faixas estruturais: menu + notificações/perfil, período em linha exclusiva e busca em linha exclusiva. O texto do período permanece `nowrap` e nunca é comprimido para caber ao lado de outros controles.
- A solução usa somente os breakpoints oficiais `640px` e `1024px`; não foi criado breakpoint intermediário arbitrário.
- Contrato de navegador ampliado para `1023x768`, `768x600`, `640x600` e `390x844`: nenhum par de controles pode se sobrepor, todos devem permanecer dentro da topbar e da janela, o período deve continuar em uma linha e o documento não pode criar rolagem horizontal ou vertical externa.
- Responsividade da topbar refinada novamente: entre `640px` e `1023px` a topbar não quebra mais imediatamente em duas linhas. Busca e ações permanecem na mesma faixa; a busca usa `minmax(46px,1fr)` e absorve a redução de largura progressivamente.
- Quando o espaço real disponível da coluna principal cai abaixo de `39rem`, uma container query reduz a busca a `46px`, deixando visualmente apenas a lupa; o input continua presente e acessível por `aria-label="Buscar"`, mas fica recolhido visualmente. Isso usa o espaço efetivo do shell, não um breakpoint de viewport arbitrário.
- A quebra estrutural fica reservada ao breakpoint oficial `<640px`: aí a busca volta a ocupar uma linha própria e o input reaparece integralmente. Assim a ordem é: busca larga -> busca menor -> lupa -> reflow mobile.
- Contrato de navegador ampliado para `1023x768`, `900x700`, `768x600`, `700x600`, `640x600`, `639x600` e `390x844`, verificando ausência de colisões, ausência de scroll externo, período em uma linha, busca compacta em `640–700` e busca integral após o reflow mobile.
- Sidebar responsiva revisada para janelas de pouca altura sem alterar SVGs e sem mexer no visual de alturas `>=768px`: abaixo disso, o nav ocupa todo o espaço livre entre marca e rodapé (`flex:1 1 auto; min-height:0`) e distribui os 7 itens verticalmente.
- Em alturas `<768px`, cada item usa `clamp(34px, 6.2vh, 42px)` e o gap usa `clamp(2px, .8vh, 6px)` tanto expandido quanto recolhido. A partir de `520px` o objetivo contratual é caber sem rolagem; abaixo de `520px`, o nav passa a `justify-content:flex-start`, mantém `overflow-y:auto` e recebe fade de `16px` no final.
- Logo e rodapé permanecem `flex-shrink:0`; o container da marca fica em `64px` nas alturas reduzidas e `52px` abaixo de `600px`. A marca d'água fica `display:none` abaixo de `700px`, evitando consumo de altura nesse cenário.
- O divisor acima de `Sair` foi neutralizado para `rgba(255,255,255,.08)`, 1px, sem glow, com `margin-block:8px`, aplicado tanto na sidebar expandida quanto recolhida.
- Corrigida regressão grave da topbar em larguras reduzidas: entre `640px` e `1023px`, os controles rápidos `Recolher/Expandir` e `Novo` permanecem visíveis. Abaixo de `640px`, o drawer/menu substitui o controle de recolher/expandir, mas `Novo` continua visível ao lado do botão de menu.
- Novo contrato de navegador cobre `1366x768`, `1024x600`, `900x560`, `690x600`, `768x520`, `480x520` e um caso adicional `480x480` para validar o fallback rolável: 7 itens, dimensões positivas, hit-test central, ausência de clipping, último item dentro do nav, distribuição sem vazio excessivo, scroll apenas abaixo de 520px, divisor neutro, tooltips recolhidos preservados e documento sem rolagem externa.
- Ajuste final da rodada de responsividade da sidebar: as regras de altura foram reafirmadas ao fim do CSS para prevalecer sobre regras específicas de largura. Em `<768px` o nav distribui os itens; em `<700px` o grafismo fica oculto; em `<600px` a marca cai para `52px`; em `<520px` o nav passa a rolável com fade de `16px`.
- O contrato real de navegador foi ampliado para testar sidebar expandida e recolhida em `1366x768`, `1024x600`, `900x560`, `690x600`, `768x520`, `480x520` e `480x480`, incluindo 7 itens, hit-test central, clipping, último item, vazio até rodapé, scroll apenas abaixo de `520px`, divisor neutro e documento sem rolagem.
- A visibilidade dos controles rápidos da topbar também virou gate: em larguras `>=640px`, `Recolher/Expandir` e `Novo` precisam permanecer visíveis; em mobile o botão de menu substitui apenas o toggle da sidebar e `Novo` continua presente.
- Correção visual específica após print de 07/10/2026: em alturas reduzidas o logo expandido ainda invadia visualmente o item `Início`. A causa era o container da marca ficar menor que a altura visual efetiva do SVG após as regras desktop.
- Em `<768px` de altura, o cabeçalho da marca passa a reservar `72px` reais no fluxo, com `padding: 6px 0 8px`; o logo expandido é limitado a `88px` de largura e `54px` de altura máxima. O nav ganha `8px` de respiro superior.
- Em `<600px`, a marca passa a `60px`, logo expandido `76px` com `46px` de altura máxima e respiro do nav de `6px`. Isso reduz primeiro o logo, nunca o espaço de segurança até `Início`.
- Contrato de navegador reforçado: em qualquer viewport com altura `<768px`, a base visual do logo deve ficar no mínimo `6px` acima do topo do primeiro item.
- Regra responsiva ajustada após comparação dos prints de 07/10/2026: entre `640px` e `1023px`, a sidebar compacta passa a ser obrigatória e não pode ser expandida pelo usuário. O controle `Recolher/Expandir` fica oculto e fora da ordem de foco nesse intervalo; `Novo` continua disponível na topbar.
- Ao retornar para `>=1024px`, a sidebar volta automaticamente ao estado expandido e o controle de recolher reaparece. O comportamento é sincronizado por `matchMedia('(min-width: 1024px)')`, evitando estados quebrados durante resize.
- O logo da sidebar compacta recebeu mais presença sem alterar o SVG: container `76px`, badge `52x52` e logo `42px`. Em alturas `<600px`, container `60px`, badge `46x46` e logo `38px`, evitando o encolhimento excessivo visto no print.
- Contratos atualizados para garantir: sidebar obrigatoriamente recolhida em `640–1023px`, tentativa de clique não expande, toggle oculto com `aria-hidden=true` e `tabIndex=-1`, botão `Novo` permanece visível, e resize de `900px` para `1366px` restaura automaticamente o estado expandido.
- Correção após print de 07/10/2026 com navegador totalmente aberto: em desktop largo (`>=1024px`), a redução por altura estava encolhendo demais o logo expandido e descaracterizando a marca.
- Em `>=1024px`, mesmo quando a altura útil cai abaixo de `768px`, o logo expandido volta à escala aprovada de `112px`; o container reserva `92px` no fluxo e mantém `8px` de respiro antes do nav. Apenas em alturas extremas `<520px` a marca reduz levemente para `104px`.
- A restrição de `max-height` do logo expandido foi removida nesse desktop largo; a separação do item `Início` passa a ser garantida pelo tamanho do container, não esmagando a marca.
- Contrato reforçado para exigir logo expandido com pelo menos `112px` em desktop largo (ou `104px` abaixo de `520px`) sem sobreposição com o primeiro item.
- Ajuste fino aprovado visualmente: logo expandido em desktop de pouca altura foi deslocado discretamente para baixo sem alterar o SVG, mantendo `112px`; container passou a `96px` com `padding-top:14px` e o nav inicia com `10px` de respiro.
- Ajuste óptico final da marca: logo expandido e recolhido foram deslocados `4px` para baixo via `transform` no container, sem alterar SVG, dimensões ou fluxo. O objetivo é alinhar visualmente o centro da marca ao eixo dos botões `Recolher/Expandir` e `Novo` da topbar. Contrato passou a conferir também proximidade vertical entre logo recolhido e ação rápida.
- Regra definitiva da sidebar responsiva: abaixo de `1024px`, o estado efetivo fica forçadamente recolhido e o controle `«/»` permanece oculto; o botão `+` continua visível. A preferência manual do usuário em desktop agora é armazenada separadamente de `sidebarCollapsed` efetivo.
- Ao retornar para `>=1024px`, o sistema restaura exatamente a preferência anterior do usuário: recolhida volta recolhida; expandida volta expandida. O resize não sobrescreve mais essa escolha.
- Alinhamento da marca recolhida foi estruturalizado: em desktop recolhido, o container da marca usa a mesma banda vertical de `5.35rem` da topbar; em `640–1023px`, usa `72px`, centralizado. Foram removidos offsets ópticos do estado recolhido.
- Contrato de navegador agora exige tolerância máxima de `2px` entre o centro vertical da marca recolhida e o botão `Novo`; em desktop `>=1024px`, também entre a marca e o botão `Expandir`. O contrato testa ainda os dois cenários de restauração da preferência do usuário.
- Gates da rodada acusaram uma asserção estática obsoleta (`min-height:40px/36px`) herdada da sidebar antiga. Ela foi removida sem alterar layout; o contrato vigente já exige a regra responsiva `clamp(34px, 6.2vh, 42px)`.
- Após a validação visual, foi identificado um bug de restauração ao sair da aba e voltar: a preferência da sidebar existia apenas no estado React e podia se perder se o navegador recarregasse/descartasse a aba.
- A preferência desktop da sidebar agora é persistida em `localStorage` (`meg-web-evolution:sidebar-collapsed`) e resincronizada em `pageshow`, `focus`, `visibilitychange` e mudança do media query `1024px`.
- Abaixo de `1024px`, o estado efetivo continua forçadamente recolhido; acima de `1024px`, a preferência persistida é restaurada. Nenhuma alteração visual foi feita nesta correção.
- Contrato de navegador acrescentado para simular recarregamento/restauração de aba tanto com preferência recolhida quanto expandida.
- Também foi removida uma asserção estática obsoleta de glow (`0 0 10px ... .08`) que já não representava o visual validado e estava bloqueando os gates sem indicar regressão real.
- Limpeza técnica para fechamento: removido o seletor obsoleto `.meg-new-button` que ainda restava no CSS da sidebar e fazia o contrato acusar falsamente que `Novo` existia fora da topbar. Nenhuma alteração visual/funcional.
- Nova falha dos gates identificada no print/Actions: a asserção `source.includes('PrimaryButton') === false` era global e varria também `components/primitives.tsx`, onde `PrimaryButton` existe legitimamente como componente base. A asserção foi removida; o contrato específico já garante que `Novo` está na topbar e que `.meg-new-button` não existe na sidebar.
- Falha dos gates após atualização do GitHub: o contrato estático ainda tentava localizar nomes/mensagens que pertencem exclusivamente ao teste de navegador (`assertTooltipMatches`, cenários de resize/restauração etc.), mas `shell.contract.test.js` não inclui `shell.viewport.browser.test.mjs` no `source`. Essas asserções autorreferenciais foram removidas; os comportamentos continuam cobertos no teste de navegador real.
- Status visual: VALIDADO EXPLICITAMENTE PELO USUÁRIO em 07/10/2026. A Etapa 03 pode ser encerrada somente após gates técnicos verdes e merge da PR #605.

### Etapa 02 — encerrada
- Fonte única criada em `apps/web/src/evolution/data/data.js`.
- Adaptadores da API criados em `apps/web/src/evolution/data/api-adapter.js`.
- Derivações estruturais de filtro/agrupamento isoladas em `derived.js`, sem regra financeira.
- Contrato documentado em `docs/MEG-WEB-DATA-SOURCE.md`.
- Teste `test:evolution-data` adicionado ao gate específico `MEG Web Evolution Foundation`.
- PR #604 mesclada após gates verdes.
- Gates concluídos com sucesso: `MEG Platform CI`, `MEG Web Evolution Foundation` e `MEG Evolution Visual Preflight`.
- Nenhum Shell, DataGrid ou tela foi iniciado na Etapa 02.

---

- Validação visual explícita recebida em 07/10/2026 para a Etapa 03 — Shell, Tokens e Componentes Base.
- A validação abrange o shell final apresentado no preview, incluindo sidebar expandida/recolhida, responsividade por largura/altura, topbar, tooltips, busca adaptativa, período sem quebra, ações rápidas, logo e restauração da preferência da sidebar.
- A validação visual NÃO substitui gates técnicos. A PR #605 permanece aguardando execução verde antes de sair de Draft/ser mesclada.
- Foi removida uma asserção estática obsoleta que ainda procurava o texto simples `Outubro de 2026`; o contrato válido já exige `Outubro&nbsp;de&nbsp;2026` para impedir quebra.

## 11. Achados iniciais da auditoria

Os seguintes pontos já foram identificados como relevantes para a Etapa 1:

### Regras já reconhecidas como críticas
- saldo realizado;
- despesas pendentes;
- proteção contra saldo insuficiente;
- parcelamento;
- vencimento em fim de semana;
- competência de cartão;
- limite comprometido;
- fatura canônica;
- benefício;
- transferências;
- saldo inicial;
- arredondamento monetário.

### Divergências confirmadas

1. **Benefício:** há coexistência real entre o legado `financialAccountId` + `financialScope` em `apps/web/src/legacy-financial-accounts.js` e a camada normalizada da API baseada em `accountId` + `Account.type`. As heurísticas históricas `VEROCARD` continuam existindo para compatibilidade.
2. **Saldo inicial:** o legado Web implementa evento sistemático `OPENING_BALANCE` (`legacy-financial-accounts.js`), coerente com `docs/GLOBAL_FINANCIAL_FOUNDATION.md`; já a camada normalizada/API grava e soma `Account.openingBalance` diretamente. A divergência é entre camadas, não ausência da regra.
3. **Pagamento de fatura:** regra aprovada e implementada na fundação para pagamento total e parcial (`Outro`). `Mínimo` só fica disponível quando existir valor explícito do domínio/dado da fatura; nenhum percentual será inventado.
4. **Edição de compra parcelada:** regra aprovada e implementada para edição unitária de parcela aberta, preservando as demais e reconciliando o total agregado da compra.
5. **Baixa de payable:** a rota pública usa `payPayableProtected`; existe um writer alternativo `payment-mutation.ts` que não está ligado à rota pública e não possui a mesma proteção de saldo.
6. **Read models:** o read model principal e o Phoenix Preview consomem a mesma política monetária central nesta branch.
7. **Código legado de summary/cashflow:** funções antigas em `finance/service.ts` permanecem no repositório, embora não sejam usadas pelas rotas principais e tenham comportamento divergente da política monetária canônica. A nova Web não deve consumi-las.
8. **Status/Fixo:** regra centralizada em `financial-policy.ts`: Receita e Fixo são realizados/pagos; cartão de crédito prevalece como pendente até pagamento da fatura; benefício permanece no writer próprio.
9. **Crediário:** removido do escopo da nova Web. O único parcelamento canônico de compra será cartão de crédito.
10. **Classificações:** o schema atual não possui catálogo `Classification` próprio. A fonte única mantém a coleção reservada, porém vazia, e preserva classificação histórica apenas como atributo do lançamento até existir fonte oficial.
11. **Benefício — leitura:** existe writer canônico, mas a Etapa 01 não declarou um read model canônico específico para histórico/saldo de benefício. A nova Web não promoverá silenciosamente o endpoint de compatibilidade a autoridade.

Todas devem permanecer visíveis e caracterizadas antes de consolidação.

---

## 12. Testes de caracterização obrigatórios

A Etapa 1 deve cobrir, no mínimo:

- virada de mês;
- saldo anterior;
- pago × pendente;
- saldo insuficiente monetário;
- benefício com saldo insuficiente;
- crédito e débito em benefício;
- parcelamento com divisão não exata;
- preservação de centavos;
- vencimento em fevereiro;
- meses de 30 dias;
- sábado/domingo para segunda-feira;
- fechamento de fatura;
- vencimento de fatura;
- comportamento atual de pagamento de fatura (integral no contrato ativo) e lacuna para pagamento parcial;
- saldo credor de fatura;
- limite comprometido com parcelas futuras;
- transferência conservativa;
- comportamento atual do saldo inicial e divergência com `OPENING_BALANCE`;
- comportamento atual de edição de compra parcelada e divergência com preservação individual;
- compatibilidade entre `financialScope` legado, conta explícita normalizada e heurísticas Verocard.

Nenhuma camada financeira deve ser consolidada antes desses testes estarem caracterizando o comportamento atual.

---

## 13. Fonte única de dados

Depois da caracterização e da consolidação das regras:

- uma única fonte de dados/mocks deverá alimentar todas as telas;
- nenhum total deve ser digitado manualmente na UI;
- KPIs, gráficos, contadores, resumos e totais devem derivar dos dados;
- o mesmo item deve manter data, valor, status e vínculo iguais em todas as telas;
- filtros devem afetar os indicadores derivados correspondentes.

---

## 14. Entrega de cada etapa

Ao final de cada entrega, registrar:

1. o que foi implementado;
2. arquivos criados/alterados;
3. checklist atendido;
4. checklist não atendido;
5. divergências encontradas;
6. pendências reais;
7. branch;
8. PR;
9. commit;
10. link de preview sem cache;
11. status de validação visual.

Nunca usar “pronto” enquanto houver item crítico pendente.

---

## 15. Registro de validações

### Telas oficialmente validadas no novo projeto
Nenhuma ainda.

### Telas em construção
Nenhuma ainda.

### Observação
As imagens oficiais atuais definem o padrão visual, mas **uma tela só passa a ser considerada validada após implementação e aprovação explícita do usuário**.

---

## 16. Próximo passo autorizado

**Concluir e validar visualmente a Etapa 3 — Shell, tokens e componentes base.**

Sequência imediata:
1. manter a nova entrada isolada `web-evolution.html`, sem reaproveitar Phoenix, Web Next, Android ou UI anterior;
2. validar sidebar, topbar, tokens e componentes base contra os prints oficiais atuais;
3. preservar `apps/web/src/evolution/data/` como fonte única da nova Web;
4. não implementar DataGrid antes da aprovação desta fundação visual;
5. publicar preview da nova entrada e fornecer link sem cache;
6. aguardar validação visual explícita antes de encerrar a Etapa 03.

---

## 17. Regra final

Preservar o que funciona.  
Não improvisar.  
Não avançar sem segurança técnica.  
Não usar referência visual antiga.  
Não alterar regra financeira por conveniência de UI.  
Não considerar tela validada sem aprovação explícita.

**Este arquivo deve ser atualizado sempre que houver uma mudança material no estado do projeto.**


---

## 18. Decisões aprovadas em 06/10/2026 — Etapa 1

As decisões abaixo foram aprovadas explicitamente e passam a orientar a consolidação:

1. **Saldo inicial:** adotar evento sistemático auditável `OPENING_BALANCE` como autoridade definitiva. O campo direto `Account.openingBalance` passa a ser apenas compatibilidade de migração até a materialização segura dos eventos existentes.
2. **Pagamento de fatura:** permitir pagamento total e parcial (`Outro`). A opção `Mínimo` só pode usar valor explícito proveniente da regra/dado da fatura; não criar percentual arbitrário.
3. **Edição de parcela:** editar uma parcela sem recriar as demais. Alterações da parcela afetam somente aquela parcela; o total agregado da compra deve permanecer reconciliado com a soma das parcelas.
4. **Status/Fixo:** centralizar a regra no domínio financeiro. Receita e Fixo entram como realizados/pagos; cartão de crédito permanece pendente até a baixa/fatura. Benefício continua no writer próprio e realizado conforme sua regra.
5. **Crediário:** não será utilizado na nova Web. A nova camada canônica mantém somente a regra de cartão de crédito para parcelamento de compras. Código legado de crediário não deve ser reutilizado como autoridade.
6. **Capacitor:** fica autorizada a atualização necessária do Capacitor para eliminar o advisory crítico do security gate. A autorização é restrita à dependência/compatibilidade técnica necessária; não autoriza alteração funcional ou visual do Android.

Essas decisões substituem referências históricas conflitantes apenas nos pontos acima.


---

## 19. DECISÕES APROVADAS (organização dos chats)

As decisões abaixo foram aprovadas para organizar a continuidade do MEG Web Evolution entre chats e consolidar regras estruturais já definidas para a nova Web.

### 19.1. Um chat por etapa

Cada chat trabalha exclusivamente a etapa indicada no título. Ao encerrar uma etapa, o checkpoint deve ser atualizado e o próximo chat deve começar pela etapa seguinte, sem reabrir etapas encerradas salvo correção expressamente autorizada.

Sequência oficial de **15 chats**:

1. **01 - Auditoria e Fundação**
2. **02 - Fonte Única de Dados e Mocks**
3. **03 - Shell, Tokens e Componentes Base**
4. **04 - DataGrid**
5. **05 - Loading, Login, Criar Conta e Recuperar Senha**
6. **06 - Home**
7. **07 - Lançamentos**
8. **08 - Novo Lançamento e Editar Lançamento**
9. **09 - Pendentes e Confirmar Pagamento**
10. **10 - Cartões e Pagar Fatura**
11. **11 - Benefícios e Registrar Recarga**
12. **12 - Nova Transferência e Selecionar Período**
13. **13 - Relatórios**
14. **14 - Configurações**
15. **15 - Funcionalidades Diferenciais e Fechamento**

Essa organização por chats não altera a ordem técnica detalhada da Seção 9; ela define apenas como o trabalho e a continuidade serão separados operacionalmente.

### 19.2. Estado atual da organização

- Chats **01** e **02** encerrados.
- Etapa 01 mesclada na `main`.
- Etapa 02 mesclada na `main` pelo commit `db5e5ee4ba763db299e3bf005a5f63eac1c3666f`.
- Chat/Etapa atual: **03 - Shell, Tokens e Componentes Base**.
- Branch atual: `meg-web-evolution/03-shell-tokens-base`.
- PR atual: **#605**, em Draft e mergeável.
- A Etapa 03 permanece **em execução** e **sem validação visual final**.
- DataGrid pertence ao chat 04 e não deve ser iniciado antes do encerramento formal do chat 03.

### 19.3. Grid soberano da Home

Para `>=1024px`, a Home usa grid de **12 colunas**:

- linha 1: `.balance` span **7** + `.flow` span **5**;
- linha 2: quatro KPIs com span **3** cada:
  - `.kpi--pay`;
  - `.kpi--invoice`;
  - `.kpi--pending`;
  - `.kpi--paid`;
- linha 3: `.benefits` span **6** + `.quick` span **6**;
- linha 4: `.recent` span **6** + `.upcoming` span **6**.

O **CSS é soberano** para a estrutura do grid. Percentuais, proporções aparentes ou medições extraídas do print servem apenas como referência visual e não substituem o contrato estrutural acima.

Classes estruturais oficiais da Home:

- `.app`
- `.sidebar`
- `.main`
- `.topbar`
- `.dash`
- `.balance`
- `.flow`
- `.kpi--pay`
- `.kpi--invoice`
- `.kpi--pending`
- `.kpi--paid`
- `.benefits`
- `.quick`
- `.recent`
- `.upcoming`

### 19.4. Sidebar e grafismo inferior

O grafismo inferior da sidebar deve ser implementado em **SVG inline** dentro de `.sidebar__art`, com:

- `aria-hidden="true"`;
- participação no fluxo normal do layout;
- `margin-top:auto`;
- nenhuma utilização de `position:absolute` para organizar o layout do grafismo;
- ocultação no drawer mobile;
- entre `640px` e `1023px`, exibir somente o conteúdo que couber naturalmente no espaço disponível.

### 19.5. Datas e textos relativos

Status temporais e textos relativos, incluindo exemplos como **“Amanhã”**, **“Vencido”** e **“Em 3 dias”**, devem ser sempre calculados a partir da data atual em tempo de execução com `new Date()`.

Esses textos e status **nunca podem ficar fixos em mocks, HTML ou componentes**.

### 19.6. Regras Consolidadas válidas para a nova Web

Do PDF **MEG Finanças — Regras Consolidadas**, consolidado em **29/09/2026**, valem para a nova Web somente as regras de negócio dos itens **7–16, 18–19 e 21–22**, com a exceção expressa do item 11 sobre Crediário, que não se aplica por decisão mais recente da Seção 18.

Regras mantidas:

- **Lançamentos em ordem cronológica:** sem agrupamento por categoria; forma de pagamento visível; detalhes/edição, busca, filtros, KPIs e classificação preservados.
- **Autocomplete:** pesquisar histórico pela descrição e, ao selecionar item conhecido, recuperar categoria, conta e forma de pagamento, sem copiar valor nem data.
- **Despesa à vista:** manter modalidade própria e formas de pagamento cadastradas.
- **Crédito e competência:** cartão, parcelas e fatura aparecem quando aplicáveis; competência segue fechamento e vencimento do cartão.
- **Alimentação:** aplicar automaticamente **Conta Benefício + Verocard + Pago**, com vínculos travados; não movimentar a conta monetária principal.
- **Fixo:** lançamentos do grupo/categoria Fixo entram automaticamente como realizados/pagos.
- **Pendente:** permanece exceção explícita, vai para Pendentes e recebe baixa com data de pagamento, conta monetária e forma de pagamento; só é considerado baixado após confirmação do servidor e atualização dos dados.
- **Editar lançamento:** recuperar corretamente Categoria, Conta e Forma de pagamento; preservar pendente, estorno, edição e exclusão.
- **Parcelamento e cartões:** preservar competência por vencimento, seleção de cartão, parcelamento, Visualizar parcelas e alteração das parcelas conforme as regras existentes.
- **Iconografia semântica em SVG:** resolução por tipo do lançamento, categoria, grupo/classificação e fallback.
- **Consistência da iconografia:** o mesmo lançamento deve manter o mesmo ícone em Home, Lançamentos, Pendentes, autocomplete, detalhes, modais e demais áreas.
- **Pendentes:** preservar filtro próprio, soma correta, rolagem apenas na área destinada, modal detalhado e ações de editar/baixar sem perder contexto.
- **Benefício:** manter card de saldo e acesso à evolução e aos lançamentos da Conta Benefício.

### 19.7. Novo Lançamento como estrutura única

Além do recorte do PDF acima, fica registrada como **decisão atual explícita do projeto** a estrutura única de Novo Lançamento: Despesa, Receita e Alimentação compartilham uma estrutura visual canônica, alterando somente campos e regras aplicáveis a cada tipo.

Esta decisão é registrada diretamente aqui e não amplia, por inferência, o conjunto de outros itens do PDF aceitos como regra para a nova Web.

### 19.8. Crediário

A decisão da Seção 18 permanece soberana:

- **Crediário está fora do escopo da nova Web**;
- o item 11 do PDF, “Crediário separado de cartão”, **não é aplicado**;
- o parcelamento canônico de compras na nova Web permanece vinculado ao domínio de cartão de crédito;
- código legado de Crediário não deve ser promovido a autoridade.

### 19.9. Conflitos com a Seção 18

O único conflito identificado entre as regras listadas acima e a Seção 18 é o item 11 do PDF sobre **Crediário**. Esse item foi explicitamente excluído e não foi aplicado.

Nenhum outro conflito com a Seção 18 foi identificado nas decisões registradas nesta seção.


---

### 19.10. Validação explícita do usuário

Em **06/10/2026**, o usuário validou explicitamente esta parte do checkpoint, abrangendo:

- o aviso operacional entre chats;
- a organização oficial em 15 chats;
- o estado atual registrado para a Etapa 03;
- o contrato estrutural da Home registrado nesta seção;
- as classes estruturais oficiais da Home;
- a regra do grafismo inferior da sidebar;
- a regra de datas e textos relativos calculados com `new Date()`;
- o recorte das Regras Consolidadas aplicável à nova Web;
- a manutenção da decisão de que Crediário está fora do escopo.

Esta validação **não equivale à validação visual da Etapa 03** e não encerra Shell, tokens e componentes base. A Etapa 03 permanece em execução até validação visual explícita do Shell e dos componentes correspondentes.


---

## 20. Encerramento formal da Etapa 1

**Status:** ENCERRADA  
**Data:** 06/10/2026  
**Branch:** `meg-web-evolution/01-auditoria-fundacao`  
**PR:** #603  
**Head técnico validado antes do commit de fechamento:** `0fe83535f1644bf73bf06db793e6a0310a1afa0d`

Gates confirmados:
- `MEG Web Evolution Foundation`: **SUCCESS**
- `MEG Platform CI`: **SUCCESS**
- security gate: **SUCCESS**
- build API: **SUCCESS**
- testes financeiros e de caracterização: **SUCCESS**

Arquivo de autoridade da nova Web:
- `docs/MEG-WEB-FINANCIAL-AUTHORITY.md`

Nenhuma tela foi implementada ou validada nesta etapa.

**Próxima etapa oficial:** `02 - Fonte Única de Dados e Mocks`.
