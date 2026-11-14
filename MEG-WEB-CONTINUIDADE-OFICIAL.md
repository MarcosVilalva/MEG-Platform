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
**Etapa 04 - DataGrid: MERGEADA na main pela PR #606; Etapas 05 e 06 NÃO AUTORIZADAS**

### Situação
- Prompt Master definido.
- Novo projeto MEG Finanças Web Evolution definido.
- Novo conjunto de imagens oficiais definido como única referência visual.
- Android congelado.
- Decisão mantida de não usar a PR visual anterior como base da nova Web.
- Etapa 01 mesclada na `main` pelo commit `0d21136c3993b11b127d8339a5b849b3727275ed`.
- Branch atual: `meg-web-evolution/02-fonte-unica-dados-mocks`.
- Etapa 02 mesclada na `main`: `db5e5ee4ba763db299e3bf005a5f63eac1c3666f`.
- Etapa 03 **ENCERRADA** e mesclada na `main` pelo commit `6307387efd5a1b5322b0ff89ca6656be799aeb72`.
- PR da Etapa 03: **#605**, mesclada em 07/10/2026.
- Branch `meg-web-evolution/03-shell-tokens-base` removida após o merge.
- Etapa 04 autorizada: **DataGrid**.
- Branch atual: `meg-web-evolution/04-datagrid`.
- Base da Etapa 04: `main@6307387efd5a1b5322b0ff89ca6656be799aeb72`.
- Validação visual específica de 360, 390, 600, 660, 720 e 760 px: **APROVADA pelo usuário**; não equivale à autorização de Ready for review nem de merge. PR #606 permanece Draft, sem merge.
- Rodada de correção visual autorizada: confinamento horizontal do grid em viewports desktop, rodapé de agregados opaco, semântica de grupos atravessando páginas e cobertura adicional de navegador, sem alteração do Shell ou de regras financeiras.
- Correção visual adicional da Etapa 04 autorizada: filtros em viewports baixos devem ser confinados à viewport, com cabeçalho/rodapé sempre acessíveis e abertura para cima quando necessário.
- Decisão visual posterior e soberana: item 5 do comando de correções substitui o fallback anterior de bottom sheet. Filtros e seletor de colunas devem permanecer popovers compactos ancorados em qualquer altura, inclusive 1093x480 e 910x400.
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

### Etapa 03 — encerrada
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
- Falha seguinte dos gates: o contrato ainda exigia o layout antigo de topbar em duas linhas para `<=1023px` (`search`/`actions` em linhas separadas). O visual validado usa uma única linha `launchers search actions`, com ações em `flex`. A asserção foi atualizada para refletir exatamente o layout aprovado, sem alterar CSS.
- Revisão adicional dos gates: removidas do contrato estático todas as asserções que pertencem ao arquivo de teste de navegador (`responsiveViewports`, sobreposição, scroll, divider e launchers). O contrato estático continua validando CSS/estrutura; o teste de navegador continua responsável pelos cenários reais de viewport. Nenhuma alteração visual/funcional.
- Auditoria completa do `shell.contract.test.js` contra o source atual encontrou 4 asserções ainda defasadas: coluna antiga da topbar compacta, toggle antigo sem persistência, mensagem antiga de restauração automática e altura antiga de `92px` da marca. Todas foram sincronizadas com o estado validado (`96px` e preferência persistida).
- O `MEG Platform CI` ficou verde no commit `fa81738f...`; o gate específico ainda falhou por erro de sintaxe no teste de navegador, não no Shell: havia um template literal aninhado dentro de `evaluate(\`...\`)` em `overlaps.push(\`${aName}x${bName}\`)`. Foi substituído por concatenação simples para permitir a execução do contrato real de viewport.
- Rodada `fa81738f...`: `MEG Platform CI` ficou SUCCESS. O gate `MEG Web Evolution Foundation` avançou pelo contrato estático e falhou somente ao iniciar o Chrome headless (`Chrome DevTools indisponível` em `127.0.0.1:9222`). O launcher do teste de navegador foi reforçado com `--remote-debugging-address=127.0.0.1` e `--user-data-dir=/tmp/meg-web-evolution-chrome` para estabilizar o CDP no runner.
- O ajuste de `127.0.0.1:9222` não resolveu o runner: o Chrome permanecia vivo, mas o endpoint fixo não respondia. O teste de navegador agora usa `--remote-debugging-port=0` e descobre a porta real pelo arquivo `DevToolsActivePort` do perfil temporário, que é o mecanismo nativo do Chrome para CDP dinâmico. Isso elimina dependência da porta fixa 9222.
- Rodada `f2bcff6a...`: o Chrome/CDP iniciou corretamente e o teste avançou, mas `measure('expanded')` retornou `undefined` porque `Runtime.evaluate` ocultava exceções do navegador. O harness agora propaga `exceptionDetails` com mensagem real e `navigate()` aguarda simultaneamente `document.readyState === 'complete'` e `.meg-shell` renderizado antes das medições. Isso torna o próximo erro determinístico em vez de mascarado.
- Diagnóstico da rodada `3879125e...`: o erro real era `SyntaxError: Invalid or unexpected token` dentro de `measure('expanded')`. A causa era `includes('\n')` dentro do template enviado ao `Runtime.evaluate`; o escape virava quebra de linha literal no código remoto. O teste foi corrigido para preservar `\\n` no código executado pelo navegador.
- Rodada `db77b261...`: `MEG Platform CI` permaneceu SUCCESS; `MEG Web Evolution Foundation` falhou porque o Chrome ficou vivo mas não criou `DevToolsActivePort`. O harness foi endurecido para capturar `stderr` do Chrome e extrair a porta da mensagem nativa `DevTools listening on ws://...`, mantendo `DevToolsActivePort` como fallback. Em caso de nova falha, o stderr será exibido no log, eliminando o diagnóstico cego.
- Rodada `630ceaff...`: o navegador finalmente executou o contrato real e o primeiro bloqueio funcional foi `1366x600 expandida: texto do menu truncado`. Como o print validado não apresenta truncamento visível, o teste foi corrigido para ignorar spans ocultos/sem largura, aceitar até 2px de diferença de arredondamento e, se ainda falhar, listar exatamente o rótulo, `scrollWidth` e `clientWidth`. Nenhum CSS foi alterado.
- Rodada `102d6b23...`: o teste de navegador identificou truncamento real de apenas `4px` em `Configurações` no viewport `1366x600` (`scrollWidth 118`, `clientWidth 114`). Foi feito ajuste mínimo no padding horizontal dos itens de `.meg-nav-item`, de `1rem` para `.875rem`, liberando 4px úteis para o rótulo sem alterar largura da sidebar, tipografia ou hierarquia.
- Rodada `8db0d6de...`: o cenário `1366x600` passou completo. A falha seguinte (`'0' !== '1'`) ocorreu ao iniciar o próximo viewport porque o teste anterior deixou a preferência persistida como recolhida no `localStorage`. O harness agora normaliza explicitamente o estado expandido antes de cada cenário desktop, preservando o teste separado de persistência para validar a preferência do usuário.
- Após nova falha intermitente de descoberta de porta DevTools, o teste de navegador deixou de depender totalmente de TCP/porta. O harness agora usa `--remote-debugging-pipe` com transporte CDP pelos descritores 3/4 do processo Chrome, sessão anexada via `Target.attachToTarget` e timeout diagnóstico por comando. Isso elimina a fonte de flutuação observada no runner.
- Primeira execução com CDP pipe avançou por todos os viewports desktop (`1366x600`, `1366x768`, `1920x1080`) e parte da responsividade (`1023`, `900`, `768`). A execução foi interrompida no `finally` porque ainda restava `socket.close()` do transporte WebSocket antigo. O cleanup foi migrado para encerrar os pipes CDP e o processo Chrome corretamente.
- O contrato real avançou até `700x600` e identificou que a busca ainda tinha `137px` quando deveria já estar no estado ícone. O container query foi ajustado de `39rem` para `40rem`, antecipando a compactação antes da pressão da topbar sem afetar `768px+` nem o reflow mobile `<640px`.
- O contrato avançou por desktop e `700/640px`; em `639x600` detectou controle da topbar fora da janela. A causa era estrutural: `Novo` compartilhava `grid-area: menu` com o botão de menu e era deslocado por `margin-left:3.25rem`. No mobile `<640px`, `Novo` agora recebe coluna `launchers` própria em uma grade de 5 colunas, eliminando o deslocamento artificial e mantendo `Menu + Novo + Notificação + Perfil` na primeira linha.
- O cenário `639x600` ainda reportou controle fora da janela sem identificar qual. O contrato agora registra `outsideViewport` com nome e retângulo exato de cada controle fora dos limites, permitindo corrigir o elemento real sem alterar CSS às cegas.
- O diagnóstico de `639x600` mostrou todos os controles da topbar deslocados exatamente ~600px para baixo. Causa real: ao mudar `.meg-shell` para `display:block` no mobile, `.meg-sidebar-wrap` continuava no fluxo com `height:100%`, consumindo uma viewport inteira antes do conteúdo. Em `<640px`, o wrapper da sidebar agora é `position:fixed` com `width/height:0` e `overflow:visible`, removendo-o do fluxo sem alterar o drawer fixo.
- Estabilização de CI em 07/10/2026 feita estritamente no launcher do Chrome do contrato de viewport, sem alterar sidebar, topbar, SVGs nem asserções de layout. Em CI, o harness resolve o navegador na ordem `CHROME_BIN`, `google-chrome`, `google-chrome-stable`, `chromium`, `chromium-browser`; usa perfil temporário único, `--remote-debugging-port=0`, leitura com polling de até 20s de `DevToolsActivePort`, captura de stdout/stderr/exit code/signal e handshake CDP por WebSocket. O comportamento local continua usando o transporte por pipe existente.
- Workflow `MEG Web Evolution Foundation` passou a registrar `which google-chrome && google-chrome --version` antes do viewport e a imprimir, com `if: always()`, as últimas 40 linhas de `/tmp/meg-web-evolution-vite.log`. No runner validado foi localizado `/usr/bin/google-chrome`, versão `154.0.8037.57`.
- A falha de inicialização/descoberta do Chrome foi eliminada. Na rodada `be898f005e4adc4f3e0e8b62f4ed6b6b5a8eb294` (Foundation run #655), o contrato executou normalmente `1366x600`, `1366x768`, `1920x1080` e toda a matriz responsiva da topbar até concluir `MEG Web Evolution responsive topbar contract: OK`.
- O bloqueio técnico remanescente é separado do launcher: `1366x768 expandida: item 5 parcialmente cortado` em `assertSidebarState`. Por instrução explícita do usuário, esta rodada não alterou layout nem relaxou a asserção para mascarar o defeito. `MEG Platform CI` run #5026 fechou `SUCCESS`; `MEG Web Evolution Foundation` run #655 fechou `FAILURE` somente nesse contrato de viewport.
- As tentativas locais desta retomada que alteravam breakpoint/contrato de altura foram revertidas antes da estabilização do Chrome; o estado visual aprovado permaneceu preservado.
- Diagnóstico geométrico definitivo do corte da sidebar em `1366x768`: o item 5 (`Benefícios`) ocupava `383.625–434.015625px`, enquanto o `.meg-nav` terminava em `428.78125px`; portanto o corte era de `5.234375px` na borda inferior do próprio nav. Logo, divisor e rodapé não sobrepunham diretamente o item; o grafismo inferior e os blocos fixos apenas consumiam altura do flex, comprimindo o nav.
- Correção aplicada exclusivamente à sidebar **expandida** em desktop: sidebar em flex column com `height:100dvh` e `overflow:hidden`; logo com `flex-shrink:0`, largura máxima `88px` e `padding-block:clamp(8px,1.5vh,16px)`; nav em `flex:1 1 0`, `min-height:0`, column e `justify-content:space-between`; itens em `flex:1 1 0`, `min-height:40px`, `max-height:56px`; rodapé preservado fora da compressão; grafismo passa a ceder altura ao nav por `min(20rem,30dvh)`. Abaixo de `700px`, gap e padding vertical são reduzidos antes de qualquer corte.
- SVGs e topbar não foram alterados nesta correção. O CSS do estado recolhido também permaneceu intacto. Como o estado recolhido já possuía itens menores que `40px` em `1366x600`, a exigência de `>=40px` foi aplicada apenas ao estado expandido para não violar simultaneamente a ordem explícita de não alterar a geometria recolhida. No recolhido continuam obrigatórios: 7 itens integralmente contidos, nenhuma sobreposição com rodapé e navegação utilizável.
- O contrato real mantém tolerância máxima de `1px` apenas para arredondamento subpixel e registra diagnóstico completo de sidebar, logo, nav, sete itens, divisor, rodapé, overflow, `scrollHeight` e `clientHeight` em caso de regressão.
- Matriz de fechamento validada no CI: `1366x600`, `1366x768` e `1920x1080` passaram expandida e recolhida; também passaram os cenários responsivos complementares até `480x480`. O cenário abaixo de `520px` mantém `overflow-y:auto` como fallback e só exige rolagem efetiva quando houver overflow real.
- Refatoração técnica do harness: medições de viewport foram extraídas para `shell.viewport.measurements.mjs`, sem alterar comportamento visual, reduzindo duplicação do teste principal.
- Gates finais desta rodada no head `a5b35eea9911b640ea50b866c6569e20bf96dccd`: `MEG Platform CI` run **#5041 — SUCCESS** e `MEG Web Evolution Foundation` run **#686 — SUCCESS**. O contrato completo de viewport encerrou verde.
- Correção posterior autorizada em 07/10/2026 para a sidebar recolhida: o estado `.is-sidebar-collapsed` passa a usar a mesma disciplina estrutural de flex da sidebar expandida, com nav elástico, sete itens entre 40px e 56px e logo/rodapé sem compressão. O grafismo inferior permanece oculto (`display:none`) no estado recolhido, como no head `87fefc5`. O cenário recolhido `1000x890` foi adicionado ao contrato sem remover a matriz existente; a tolerância geométrica continua em 1px. A alteração não alcança a sidebar expandida, SVGs ou topbar e aguarda nova validação visual do usuário antes do merge.
- Status final da Etapa 03: **ENCERRADA** após validação visual explícita do usuário, gates finais verdes no head `190fef587223d588627d807626752cd6b18af4df` e merge da PR #605 em `main@6307387efd5a1b5322b0ff89ca6656be799aeb72`.
- A falha do Foundation no commit intermediário `748275f26f11ee968d434d7a3d929e55da87628f` foi causada pelo contrato real de viewport (`1366x768 recolhida: marca d'água deve ficar oculta`) e foi corrigida antes do head final. O commit `87fefc59941dd034b38306e3c685c1734e2182b7` possui `MEG Platform CI` e `MEG Web Evolution Foundation` verdes.
- O DataGrid permaneceu fora da Etapa 03.

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

**Executar a Etapa 04 — DataGrid, exclusivamente.**

Sequência imediata:
1. partir somente de `main@6307387efd5a1b5322b0ff89ca6656be799aeb72`;
2. preservar Shell, topbar, sidebar, SVGs oficiais, tokens, fonte única da Etapa 02 e camada financeira;
3. construir o DataGrid reutilizável e isolado em `apps/web/src/meg-web-evolution/`, sem tela funcional futura disfarçada;
4. usar apenas a fonte única da Etapa 02 ou fixture técnica isolada no harness;
5. adicionar contrato do DataGrid ao gate `MEG Web Evolution Foundation` sem remover ou relaxar contratos da Etapa 03;
6. publicar preview com link sem cache e aguardar validação visual explícita antes de merge;
7. não iniciar Etapa 05 ou posterior neste chat.

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

- Chats/Etapas **01, 02 e 03 encerrados**.
- Etapa 01 mesclada na `main`.
- Etapa 02 mesclada na `main` pelo commit `db5e5ee4ba763db299e3bf005a5f63eac1c3666f`.
- Etapa 03 mesclada na `main` pela PR **#605**, commit `6307387efd5a1b5322b0ff89ca6656be799aeb72`; branch antiga removida.
- Chat/Etapa atual: **04 - DataGrid**.
- Branch atual: `meg-web-evolution/04-datagrid`.
- A frase histórica do Prompt Master que situa o DataGrid na etapa 2 não redefine a organização atual: para este projeto/chats, **DataGrid = Etapa 04**.
- Etapa 05 e posteriores permanecem bloqueadas até encerramento formal e validação visual da Etapa 04.

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


---

## 21. Encerramento formal da Etapa 03

**Status:** ENCERRADA  
**Data:** 07/10/2026  
**Branch:** `meg-web-evolution/03-shell-tokens-base` — removida após merge  
**PR:** #605  
**Head técnico final:** `190fef587223d588627d807626752cd6b18af4df`  
**Merge na main:** `6307387efd5a1b5322b0ff89ca6656be799aeb72`

Gates finais confirmados no head da PR:
- `MEG Platform CI`: **SUCCESS** (run #5044)
- `MEG Web Evolution Foundation`: **SUCCESS** (run #692)

Registro sobre checks intermediários:
- `87fefc59941dd034b38306e3c685c1734e2182b7`: Platform CI e Foundation **SUCCESS**;
- `748275f26f11ee968d434d7a3d929e55da87628f`: Platform CI **SUCCESS** e Foundation **FAILURE** exclusivamente no contrato de viewport da sidebar recolhida; falha corrigida nos commits seguintes sem relaxar a asserção válida;
- o head final `190fef587223d588627d807626752cd6b18af4df` fechou os dois gates verdes antes do merge.

Validação visual explícita da Etapa 03 foi recebida antes do merge. CI não substituiu essa aprovação.

**Próxima etapa oficial:** `04 - DataGrid`.

- Exceção autorizada para um único push corretivo após o SHA ffeb8eb4: corrigir a sintaxe do browser test e ajustar visualmente apenas DataGrid/popovers; PR #606 permanece Draft, sem merge, e a validação visual continua pendente.

- Ajustes finais autorizados da Etapa 04/PR #606: barra de filtros ativos, tema do select Coluna, grupos de ano acessíveis e screenshots estáveis. PR permanece Draft, sem merge.

- Complemento autorizado da Etapa 04/PR #606: integrar filtros ativos à toolbar, limitar chips visíveis a 2 com popover +N, formatar chip DATE em dd/mm/aaaa e garantir cabeçalho/linhas úteis em 910x400. PR permanece Draft e sem merge.

- Complemento 2 autorizado na Etapa 04/PR #606: compactar alturas baixas, manter “Filtros (N)” em todas as larguras e preservar cabeçalho/funis no vazio filtrado. PR permanece Draft e sem merge.


- Correção autorizada no passo 7 da Etapa 04: chips de filtros ativos passam a exibir operador + valor na toolbar e no popover; toolbar mantém truncamento compacto com tooltip completo, enquanto o popover mostra o texto integral com quebra. PR #606 permanece Draft, sem merge, e a validação visual continua pendente.


- Passo 7 autorizado sobre `e1e8772`: refinar o popover “Filtros ativos” para linhas de lista sem pílulas, completar tooltips de “Filtros (N)”, “+N filtros” e chips com seleções, garantir hover/foco por teclado e adicionar validação Playwright em 1366x600 e 910x400. A entrega final deve ocorrer em um único push após validação em branch temporária; PR #606 permanece Draft e sem merge.


- Passo 7 autorizado sobre `d65fe97`: corrigir centralização dos tooltips da toolbar pela largura renderizada real, com clamp de 8px à viewport e fallback vertical abaixo/acima; validar em Playwright por hover e foco em 1366x600 e 910x400. Entrega final em um único push após validação em branch temporária; PR #606 permanece Draft e sem merge.


- Passo 7 autorizado após `d65fe97`: estado vazio por filtros deve manter rodapé de paginação visível e funcional, com `0–0 de 0`, `1 / 1` e navegação desabilitada; mensagem vazia deve permanecer no corpo sem overflow. Validar em branch temporária e Playwright em 1366x600 e 910x400; PR #606 permanece Draft e sem merge.


- Passo 7 responsivo autorizado: diagnóstico real em 680x600 confirmou que o estado vazio era forçado para tabela pela regra global `.meg-datagrid-filtered-empty .meg-datagrid-table { display: table; }`, não pela regra de baixa altura. Fica definida a exceção compacta apenas em `900–1023px` com `max-height:500px`: 910x400 continua tabela; 680x400 e 680x600 são cards. Registrar a inconsistência histórica do contrato (640–1023 cards x 910x400 tabela), validar 1366x600, 910x400, 680x600, 680x400, 640x600 e 390x844. Auditoria 910x400 encontrou três campos visíveis sem id/name: busca do Shell (somente registrar), seleção geral da tabela e seletor Mostrar do DataGrid (corrigir no DataGrid). PR #606 permanece Draft e sem merge.


- Fechamento técnico adicional autorizado na Etapa 04: manter 680x400 em cards com toolbar integral; definir `Limpar tudo` preservando ordenação; migrar tema de Coluna e disclosure de ano para Playwright; auditar `id/name` do FilterPanel; adicionar gate de console/DevTools Issues, axe e regressão visual por baseline. Etapas 05 e 06 permanecem bloqueadas. PR #606 continua Draft e sem merge.


## Etapa 04 — DataGrid, correção técnica Passo 7a (10/10/2026)

- PR oficial: #606, branch `meg-web-evolution/04-datagrid`, permanece Draft e **sem merge**.
- SHA de origem reprovado: `ef1f39f43d9ec893dba4aeffd1cff5ee9466b9f4`.
- Branch temporária de verificação: `meg-web-evolution/tmp-pr606-step7a-filters-verify`; PR temporária #615, sem merge.
- Head temporário validado: `137f229b0e46b3ea1c5f69522244c6662c8ba3e9`.
- Correção (1): filtro TEXT com `value: ''` não deve procurar `(vazio)`; lista selecionada funciona sem interseção acidental com critério antigo.
- Correção (2): seleção de todos os 640 atua sobre todos os valores pesquisados; renderização inicial limitada a 200, botão de carregamento incremental em lotes de 200.
- Correção (3): critérios TEXT refletem os valores correspondentes nos checkboxes; ao escolher valores explicitamente, texto antigo é removido.
- Correção (4): alinhamento da toolbar na faixa relatada próxima de 660 px, preservando baselines oficiais de 680 px e comportamento a 390 px.
- Testes adicionados: Playwright para os quatro problemas, incluindo 660/390 px, e caracterização do núcleo para 2/640 selecionados.
- Primeira validação temporária: Platform CI #5154 e Foundation #961 **FAILURE**, contrato de limite estático exigindo `visible.slice(0, 200)`.
- Segunda validação temporária: Platform CI #5155 **SUCCESS**, Foundation #965 **FAILURE**, 3 testes revelaram ausência de tratamento correto do operando vazio e uma expectativa equivocada sobre `003`.
- Terceira validação temporária: Platform CI #5158 **SUCCESS**, Foundation #972 **SUCCESS**; Playwright 11 + 16 + 5 testes aprovados, sem atualizar snapshots.
- Após o push na branch #606: aguardar nova CI oficial, publicação do preview no SHA definitivo e **reteste manual Passo 7b**.
- Etapas 05/06 bloqueadas. Nenhuma validação visual automática ou implícita.

## Etapa 04 — Defeito 4, toolbar 600–760 px (10/10/2026)

- Correção restrita ao DataGrid, sem modificar Shell, Android ou autoridades financeiras.
- PR oficial: #606, branch `meg-web-evolution/04-datagrid`, permanece **Draft / sem merge / sem validação visual explícita**.
- Branch técnica de verificação: `meg-web-evolution/tmp-pr606-toolbar-600-760-verify`, PR temporária #616.
- Diagnóstico inicial: `MEG Web Evolution Foundation` falhava em `Validate Web Evolution viewport contracts`, devido a clipping de `Limpar tudo`, sobreposição entre seletor e chips e discrepância do snapshot de 680×400.
- Solução: duas linhas sem corte na faixa de 600–760 px quando existem filtros; manutenção do visual anterior sem filtros, inclusive orientação paisagem baixa; controle `Selecionar filtrados`, seleção/remoção por chip, `+N filtros`, `Limpar tudo` e select de ordenação preservados.
- Suíte integral temporária no SHA `a631ba49161043422013a69b75b527a5968e0a67`: `MEG Platform CI #5186` **SUCCESS** e `MEG Web Evolution Foundation #1033` **SUCCESS**. Playwright: tooltips, qualidade/axe/snapshots, 7a e 7b completos, sem alterar thresholds ou atualizar baselines.
- A integração à #606 depende de um único avanço da ref oficial e de nova verificação de CI/deploy sobre o SHA definitivo. Validação visual final da Etapa 04 permanece **PENDENTE**.
- Etapas 05/06 continuam bloqueadas.


## Etapa 04 — ajuste opcional do chip em 360/390 px (10/10/2026)

- Correção circunscrita ao DataGrid abaixo de 600px, sem tocar no Android, nas autoridades financeiras, no Shell ou no layout de 600–760px e 800px+.
- Chip TEXT mantém título truncado com reticências, SVG de remoção visível com alvo de 32×32px e `flex-shrink: 0`. A ação possui `aria-label` e tooltip completo existentes.
- `Limpar tudo` permanece inteiro e na mesma linha lógica; com múltiplos filtros abaixo de 600px exibe um chip e desloca os restantes para `+N filtros`, evitando compressão do rótulo.
- Testes acrescentados para 360/390px com Filtros (1), medição/sem corte, tooltip, `aria-label` e remoção por clique; testes antigos de 600/660/720/760px e snapshots preservados.
- Branch temporária: `meg-web-evolution/tmp-pr606-chip-390-verify`, PR #617 (Draft, sem merge).
- Head de código verificado: `aabb1485ce7ede5c82426872809c066fc04b2887`.
- Validação temporária: `MEG Platform CI #5191` **SUCCESS** e `MEG Web Evolution Foundation #1045` **SUCCESS**.
- Não foi necessário atualizar baseline de 390px: o snapshot original sem filtros permanece idêntico. Nenhum limite de comparação foi alterado.
- PR #606 deve permanecer **Draft**, sem merge. Validação visual final ainda depende de aprovação explícita.
- Próximo: um único avanço da branch oficial, conferir gates sobre SHA oficial, disponibilizar preview sem cache e excluir branch temporária após fechar #617.


## Etapa 04 - fechamento técnico/documental da PR #606 (10/10/2026)

**Escopo e autorização:** opção 1 de conclusão técnica/documental. Alterações permitidas somente neste checkpoint e na descrição da PR #606. `shell.css`, branches temporárias e PR #614 são somente leitura. Proibidos merge, saída de Draft e redeploy.

### Estado consolidado antes do commit documental

- HEAD de código auditado: `6d513cd22f327c12fe44c6c48eab69bf99b48f7d`.
- Base `main`: `6307387efd5a1b5322b0ff89ca6656be799aeb72`; GitHub confirmou `ahead: 133`, `behind: 0` e `mergeable: true`.
- MEG Platform CI #5192 e #5193: **SUCCESS**; MEG Web Evolution Foundation #1047 e #1049: **SUCCESS**, ambos no HEAD auditado. Os jobs independentes `android-rc1` e `financial-e2e` apareceram como `SKIPPED` em razão das condições do workflow; não contabilizar como testes executados.
- No Foundation #1049: Playwright tooltips 11, qualidade/axe/snapshots 16, Passo 7a 5 e toolbar 7b 14 testes aprovados.
- Render: **LIVE no SHA `6d513cd`**, conforme confirmação explícita do usuário em 10/10/2026. Não houve redeploy nesta rodada. Preview sem cache: https://meg-web-evolution-datagrid-pr606.onrender.com/datagrid-harness.html?v=6d513cd22f327c12fe44c6c48eab69bf99b48f7d
- Validação visual de 360, 390, 600, 660, 720 e 760 px: **aprovada pelo usuário**. A decisão de Ready for review e merge segue reservada ao usuário; PR permanece **Draft**.

### Itens 1 a 5 do fechamento, em ordem

1. **Deploy:** confirmação do usuário de que o Render está LIVE no SHA `6d513cd`; nenhum redeploy solicitado.
2. **Lint:** `npm run lint` é apenas `echo "Lint configurado para próxima sprint"`. Existe typecheck no `build:web` (`tsc -b`) e builds verdes, mas lint efetivo **não executado**. Pendência real, sem correção nesta rodada.
3. **Shell:** diff somente leitura. `apps/web/src/meg-web-evolution/shell/shell.css` recebeu 56 linhas no commit `127667391071`, com media queries `max-height:640px` e `max-height:500px`, compactando topbar, avatar, marca e sidebar. Efeito compartilhado fora do DataGrid exige decisão explícita de manter ou reverter. Nenhuma alteração feita nesse arquivo.
4. **Limpeza:** PR temporária #614 permanece **aberta e sem merge**, head `cc8b5672088f476ee84a65b20e8727700ed3b55c`. Comparação com `6d513cd`: `ahead:0`, `behind:38`, nenhum commit exclusivo da #614; histórico já integrado à #606. Branch `meg-web-evolution/tmp-datagrid-manual-regression-fix`: `ahead:5`, `behind:37`. Branch `meg-web-evolution/tmp-datagrid-pr606-manual-fixes`: `ahead:13`, `behind:37`, com histórico exclusivo ainda não incorporado. Nenhuma branch excluída ou PR fechada. A PR temporária #617 está fechada sem merge.
5. **Documentação:** checkpoint atualizado e descrição da PR #606 autorizada para reescrita consolidada. Corrigidas informações históricas de que o Shell ficou intocado ou de que os filtros utilizam bottom sheet. Regras financeiras e Android não alterados.

### Escopo, limites e pendências

- DataGrid genérico isolado, popovers ancorados, ordenação tipada, filtros, chips, `+N filtros`, persistência por instância, seleção, agrupamento, paginação, CSV e estados vazios. Alternância responsiva: cards nas larguras móveis e exceção de tabela compacta entre 900 e 1023 px em alturas até 500 px.
- Seis baselines visuais Linux versionados: 1366x600, 910x400, 680x600, 680x400, 640x600 e 390x844; suíte oficial passou sem atualização de snapshots nem relaxamento de tolerância na correção final.
- Permanecem pendentes: lint real; decisão de manter/reverter `shell.css`; destino da PR #614 e das duas branches com commits exclusivos; eventual limpeza dos logs diagnósticos `FILTERED_EMPTY_SNAPSHOT` e `DEVTOOLS_ISSUE_NODE`; decisão de Ready/merge. Fora desta PR: visões salvas nomeadas, log de auditoria do DataGrid, busca rápida e PDF.
- O commit exclusivamente documental desta atualização deve usar `[skip render]` para prevenir deploy automático. Caso avance o HEAD da PR, a aprovação de CI citada acima refere-se ao **SHA de código `6d513cd`**, sem afirmar que novos gates foram executados sobre o commit documental.
- **Etapa 04 não encerrada formalmente; Etapas 05 e 06 permanecem bloqueadas.**


## Etapa 04 - decisões e verificação por conteúdo da PR #606 (10/10/2026)

**Nova autorização do usuário:** manter a compactação de altura baixa em `shell.css` como exceção expressa; fechar PR temporária #614 sem merge e remover sua branch se ainda existir; lint fora do gate desta PR, como dívida técnica para PR separada. As duas branches de correções manuais permanecem **somente leitura**; proibição expressa de merge, cherry-pick, fechamento ou exclusão sem nova autorização. A PR #606 deve permanecer **Draft, sem merge, sem redeploy e sem Ready for review**.

### Decisões executadas

1. **Shell:** decisão **MANTER** as 56 linhas de media queries de baixa altura em `apps/web/src/meg-web-evolution/shell/shell.css`, oriundas do commit `127667391071`; exceção visual compartilhada, autorizada conscientemente. Nenhum ajuste adicional realizado no CSS.
2. **PR #614:** fechada **sem merge**; HEAD histórico antes da ação `cc8b5672088f476ee84a65b20e8727700ed3b55c`. Comparação do SHA `6d513cd` com `cc8b567`: zero commits exclusivos na #614. A ref `refs/heads/meg-web-evolution/tmp-datagrid-pr606-responsive-verify` já estava **ausente** quando consultada (GitHub API respondeu **404** e pesquisa de branches retornou lista vazia). Portanto, não houve exclusão executada: a condição desejada de não existir branch está atendida sem alteração artificial.
3. **Lint:** `npm run lint` é placeholder, **não constitui gate da #606** por decisão explícita. Registrar implementação real como dívida técnica **para PR futura separada**. Não alterar package/scripts nesta etapa.
4. **Gates do HEAD documental anterior `e608c258a5458f30f6ee6f14c2f30280665e9019`:** MEG Platform CI **#5196 SUCCESS**, MEG Web Evolution Foundation **#1058 SUCCESS**.
5. **Render:** publicação `6d513cd` LIVE informada pelo usuário na etapa anterior; nesta solicitação o usuário reservou a confirmação de permanência sem novo deploy à própria consulta ao painel. Nenhum redeploy foi solicitado ou disparado.

### Verificação por conteúdo: branches manuais (leitura)

**Base comum:** `ef1f39f43d9ec893dba4aeffd1cff5ee9466b9f4`. Comparados os patches exclusivos de cada branch contra os arquivos efetivos do HEAD `e608c258`. **Nenhuma das branches está integralmente representada no código da #606.**

| Arquivo | Branch A: `tmp-datagrid-manual-regression-fix` (5 commits exclusivos) | Branch B: `tmp-datagrid-pr606-manual-fixes` (13 exclusivos) |
|---|---|---|
| `FilterPanel.tsx` | Já há limpeza/seleção de filtros TEXT, mas faltam os resets de valor/value2 para NUMBER/CURRENCY e DATE, reset de `selected` nos atalhos/data e operador; comportamento de seleção TEXT usa lógica diferente | TEXT parcialmente equivalente; mensagem do limite de 200 valores difere; não é identidade de conteúdo |
| `core.ts` | Correção parcial para valor vazio existe, mas ainda usa `if (needle || filter.operator)`; branch A utiliza `if (needle)` e normaliza string em branco com `trim` | Mesmo tratamento parcial, sem a semântica exata do branco/operador |
| `datagrid.browser.driver.mjs` | Ausente espera pelo processo encerrar e rotina de retry para remoção do perfil temporário do Chrome | Sem diff exclusivo neste arquivo |
| `DataGrid.tsx` | Sem diff exclusivo | Ausente `mobileSortLabel` e `title` de ordenação móvel completa |
| `datagrid.css` | Existe correção da toolbar 600-760px, mas não regras alternativas de ordenação ativa usando `:has(option:checked)` | Não existem as regras `@container datagrid-toolbar`, ajustes de ordenação ativa e tratamento do rótulo na largura compacta |
| `.github/workflows/web-evolution-foundation.yml` | Sem diff exclusivo | Ausente coleta agregada de `SHELL_STATUS`, `DATAGRID_STATUS`, `TOOLTIP_STATUS` e `QUALITY_STATUS` com `continue-on-error: true` no contrato; atualmente há coleta agregada somente dos quatro grupos Playwright. Proposta requer revisão sem relaxamento de gate |
| `datagrid.quality.playwright.spec.mjs` | **101 linhas de testes exclusivos não incorporadas**; 11 distintos, 640 valores, critério Contém 3 e ordenação 660/390px | **166 linhas de testes exclusivos não incorporadas**; estado e persistência, 11/640 distintos, Contém 3, geometria/tooltip de ordenação 660/390px |

**Decisão de segurança:** preservar as branches A e B; não propor exclusão imediata. O código e os testes exclusivos exigem revisão funcional e aprovação em tarefa posterior. A mera existência de commits exclusivos não prova necessidade de merge; por isso a comparação foi de conteúdo, com diferenças confirmadas por arquivo.

### Status e limites após esta rodada

- O SHA de código efetivamente aprovado e publicado continua `6d513cd22f327c12fe44c6c48eab69bf99b48f7d`; a alteração subsequente é **somente documental** e deve usar mensagem `[skip render]` para não iniciar auto-deploy.
- A PR #606 segue **Draft, sem merge**, e Ready for review permanece dependente de decisão explícita.
- Shell mantido como exceção documentada; lint adiado para PR separada; PR #614 fechada sem merge; branch da #614 já ausente.
- As duas branches manuais continuam sem modificação, fechamento, exclusão, merge ou cherry-pick.
- Etapas 05 e 06 continuam bloqueadas enquanto não houver encerramento formal da Etapa 04.


## Etapa 04 - Ready for review da PR #606 (10/10/2026)

**Autorização expressa:** usuário permitiu retirar a PR #606 de Draft **sem merge, sem redeploy e sem iniciar Etapas 05/06**. Transição efetivada no HEAD `1b3e345248443621f515ee611216812541496aca`: `state=open`, `draft=false`, `merged=false`. Verificação prévia no mesmo SHA: MEG Platform CI #5197 **SUCCESS** e MEG Web Evolution Foundation #1060 **SUCCESS**.

A alteração deste checkpoint é **exclusivamente documental**, com commit `[skip render]`. Depois de qualquer avanço de HEAD, checar os próprios gates do novo SHA; não confundir aprovação anterior com a atual. Render: o usuário confirmou previamente LIVE no código `6d513cd22f327c12fe44c6c48eab69bf99b48f7d`. Não iniciar redeploy.

### Branches preservadas integralmente

- `meg-web-evolution/tmp-datagrid-manual-regression-fix`: 5 commits exclusivos no histórico, diferenças por conteúdo ainda não integralmente presentes na #606.
- `meg-web-evolution/tmp-datagrid-pr606-manual-fixes`: 13 commits exclusivos no histórico, diferenças por conteúdo ainda não integralmente presentes na #606.

**Proibido excluir, fechar, fazer merge ou cherry-pick de qualquer das duas branches sem autorização nova.**

### Escopo reservado para PR própria de reforço pós-#606

Esses itens **não estão autorizados a entrar na PR #606** e não podem ser considerados testes já integrados apenas por existirem nas branches temporárias:

1. **Valores distintos:** testes de exatamente **11 valores marcados** e de **640 valores distintos** (inclusive busca além dos 200 inicialmente renderizados, selecionar tudo, persistência e coerência do filtro com o critério TEXT).
2. **Geometria da ordenação:** regressão em **390×844** e **660×600**, com ordenação ativa, sem corte, sobreposição nem perda de controles de toolbar.
3. **Encerramento do Chrome:** fortalecer o `datagrid.browser.driver.mjs` para aguardar o fim do processo e fazer limpeza do perfil temporário com retries, sem esconder erros.
4. **`title` na ordenação:** avaliar atributo `title` completo do `select` móvel e preservar acessibilidade, `aria-label` e textos de estado.
5. **`core.ts`:** revisar semântica de operador TEXT quando operando está vazio ou em branco, e interação com `selected` / `FilterPanel.tsx`, sem alteração indevida de regra de negócio.
6. **`continue-on-error` no Foundation:** examinar coleta completa de diagnósticos após falhas de contratos, preservando falha final obrigatória do job se qualquer verificação falhar.
7. **Playwright exclusivo:** avaliar as **101 linhas da branch A** e **166 linhas da branch B** por conteúdo e utilidade, sem cherry-pick automático, atualização de baseline ou relaxamento de asserts.

A compactação de altura baixa de `shell.css` permanece **MANTIDA**, com exceção documentada e aprovada. Lint real continua dívida técnica para **PR separada**. A **Etapa 04 não está encerrada formalmente**; **Etapas 05 e 06 continuam bloqueadas**. A PR #606 está Ready for review, **não mesclada**.


## Etapa 04 - encerramento por merge autorizado da PR #606 (10/10/2026)

**Status operacional: ETAPA 04 MERGEADA**, sem iniciar qualquer etapa subsequente. A execução do merge não equivale à aprovação visual de telas futuras nem à autorização de iniciar as Etapas 05 e 06.

- Repositório: `MarcosVilalva/MEG-Platform`; PR oficial: **#606**.
- Branch de origem: `meg-web-evolution/04-datagrid`, **preservada após o merge**.
- Branch base: `main`; antes do merge, HEAD da base: `6307387efd5a1b5322b0ff89ca6656be799aeb72`.
- HEAD da PR autorizado e verificado: `129496cd8315f864f553b9fa133958bfa476a145`.
- PR em estado Ready for review, `mergeable=true` e sem conflitos antes do merge.
- Gates sobre o HEAD pré-merge: **MEG Platform CI #5198 SUCCESS** e **MEG Web Evolution Foundation #1062 SUCCESS**.
- **Método do merge: squash**, conforme padrão das PRs #604 e #605.
- **Commit de merge/squash na main:** `1768cdb5c5d72baa30996933550c16715f6a3dd2`.
- **Título exato:** `feat(meg-web): Etapa 04 - DataGrid (#606)`.
- GitHub confirmou a PR #606 **merged=true**, **closed**, SHA do merge igual ao acima; a main apontava para este commit após o merge.
- Checks do commit de merge devem ser consultados pelo SHA correspondente; **não inferir SUCCESS a partir dos gates anteriores à integração**. Após o merge houve disparo automático dos workflows de push (inclusive Pages e smoke), sem execução manual de deploy nesta rodada.
- A atualização deste checkpoint é documental, na `main`, feita com mensagem `[skip render]`. Não iniciar deploy manual.

### Limitações da validação manual que permanecem registradas

**O teste manual não cobriu:**
1. **Clique fora do popover**, para verificar o fechamento por `pointerdown` fora da área do componente.
2. **Remoção de filtro pelo botão `×` do chip na toolbar**, com verificação manual da atualização visual e dos resultados.

Isso não deve ser reclassificado como funcionalidade aprovada manualmente. Mesmo com cobertura automatizada, o limite do teste manual deve continuar explícito.

### Branches preservadas e backlog pós-#606

**Não apagar, fechar, mesclar ou fazer cherry-pick:**
- `meg-web-evolution/tmp-datagrid-manual-regression-fix`
- `meg-web-evolution/tmp-datagrid-pr606-manual-fixes`

Ambas contêm diferenças por conteúdo ainda não integralmente presentes na #606 e continuam preservadas para uma **PR própria de reforço pós-#606**, com autorização de implementação separada.

Backlog mantido e pendente, **fora da Etapa 04 mergeada**:
1. Playwright: seleção de exatamente **11 valores distintos**, alcance/busca/seleção de **640 valores**, incluindo limites de renderização e estado persistido;
2. Playwright: geometria da ordenação ativa em **390×844 e 660×600**, sem cortes ou sobreposições;
3. robustez no fechamento do processo e limpeza do perfil **Chrome/CDP** em `datagrid.browser.driver.mjs`;
4. `title` com texto completo de ordenação no seletor `Ordenar por`, preservando acessibilidade;
5. revisão de **`core.ts`** para critérios TEXT vazios/brancos e coerência com `FilterPanel.tsx` / seleção;
6. revisão de **`continue-on-error`** no workflow Foundation para diagnóstico completo **sem suprimir falha final do gate**;
7. avaliação e consolidação dos testes Playwright exclusivos de **101 linhas** (branch A) e **166 linhas** (branch B) sem cherry-pick automático ou enfraquecimento de testes;
8. complementar a validação manual de **clique fora do popover** e **remoção pelo × no chip**.

**Decisões preservadas:** media queries de altura baixa em `shell.css` mantidas como exceção aprovada; lint real é dívida técnica para PR separada. Android e autoridades financeiras permanecem preservados.

**Bloqueio formal:** **NÃO INICIAR ETAPAS 05 E 06** sem nova autorização expressa do usuário.


## Etapa 05 — decisões aprovadas e preparação do Login (12/10/2026)

**Autorização:** o usuário aprovou iniciar somente o Login, mantendo uma tela por vez. Este registro complementa o histórico sem apagar decisões anteriores.

- Ordem atual aprovada: Login → Criar Conta → Recuperar Senha → Loading (não implementar sem print oficial).
- Telefone no cadastro permanece **obrigatório** pela API, com 10 a 15 dígitos; máscara visual pretendida `(00) 00000-0000`.
- Cadastro mantém o retorno **202 PENDING_APPROVAL**, aviso de aprovação pendente e retorno ao Login. Eventuais diferenças da opção `CREATE_WORKSPACE` deverão ser relatadas sem alterar o backend.
- Recuperação usa **senha temporária via e-mail/WhatsApp** e resposta pública genérica, sem revelar existência da conta. Nesta etapa, apenas Solicitar e Enviado. Não implementar token, escolha de nova senha ou reenvio em 60 segundos.
- Essas decisões de autenticação **divergem do Prompt Master**, que descrevia telefone opcional, recuperação por token e quatro estados. Prevalece a decisão atual expressa do usuário, sem mudanças na API.
- Login seguirá print oficial desktop presente no conjunto visual; mobile em 360×844 e 390×844 será derivado sem elementos novos, ainda sem aprovação visual.
- Proibidos reaproveitamento de UI/CSS da PR #602, Evolution legada ou Loading antigo, mudanças financeiras, Android, backend e banco.
- **Base confirmada:** `main@a9adb73fec36c433c566659d78fffc36a712d494` em 12/10/2026.
- **Branch temporária de preparação:** `stage05-login/temporary-verification-20261012`, criada a partir da base; deliberadamente fora dos gatilhos de push da Foundation.
- A sétima execução reservada do Stage05 **não está autorizada para disparo manual**. Qualquer push em `meg-web-evolution/**` aciona automaticamente o gate Foundation, e PR para `main` também pode acionar CI e Foundation. Antes da branch oficial, verificar a validação da suíte sem consumi-la indevidamente.
- PR #602 preservada, sem merge ou modificação.
- **Situação:** Login em implementação/validação; nenhum preview publicado ou aprovação visual final. Pendência mobile do DataGrid continua aberta.
- Nenhuma etapa futura deve ser iniciada até a aprovação visual expressa do Login.


## Etapa 05 — Login integrado na branch oficial para aprovação visual (13/10/2026)
- **Base congelada:** `main@a9adb73fec36c433c566659d78fffc36a712d494`. Sem alterações diretas na main.
- **Branch oficial:** `stage05-login/05-login`; a PR deve permanecer **Draft**, sem merge.
- **Validação temporária:** `stage05-login/temporary-verification-20261012@c2ffcb94999a06b8d90ebec5f010fff7d382b137`, sem acionar a Foundation reservada.
- **Gate Login isolado #38327684004: SUCCESS**, com `test:auth`, `test:finance`, `test:core`, dados, Shell, DataGrid, contrato Login, builds Web/API e 12 testes Playwright de autenticação, a11y e viewport.
- **Screenshots do Login:** artifact GitHub Actions #11781256286 com desktop 1365×600, 1366×768, 1920×1080, mobile 360×844 e 390×844 e HiDPI 2x, com/sem erro.
- **Imagem oficial de fundo:** asset WebP de `apps/web/public/bg-login.webp` da PR histórica #602 (apenas mídia, nenhum CSS/componente antigo), copiado como blob para `apps/web/public/meg-web-evolution/login-background.webp` com 2048×1143 e 129.298 bytes; variante 2x 4096×2286, 215.138 bytes, gerada de forma determinística no CI e versionada.
- **Logo:** `apps/web/public/brand/logo-meg-financas.svg` preservado, sem filtro sobre foreground. Responsividade e a11y verificadas automaticamente; isso não representa aprovação visual humana.
- **Workflow desta branch:** somente manual; a PR para main pode acionar `MEG Platform CI` e listar `MEG Web Evolution Foundation` com job ignorado por branch fora de `meg-web-evolution/**`. A sétima execução reservada não foi iniciada.
- **Nada alterado:** Android, API, banco, regras financeiras, UI/CSS da Evolution antiga, PR #602 ou baselines.
- **PENDENTE:** confirmar CI oficial da PR, publicação real de preview com `?v=SHA`, aprovação visual explícita do Login, pendência mobile do DataGrid (360×844 e 390×844).
- **BLOQUEADO:** não iniciar Criar Conta, Recuperar Senha ou Loading antes da aprovação explícita do Login.

## Etapa 05: Criar Conta, correção estrutural final (13/10/2026)
- **PR:** #627 em Draft, sem merge. Base anterior `03ed440f796c3efaf734ec62d05ccc4ac866dbab`, branch `stage05-screen/05-criar-conta`. Nenhuma atualização pela main; Android, CORS, API, banco, auth-client, rotas, dependências e baselines intactos.
- **Referência Login:** #626 `364f377fef2e0c3cde3ddcba2bde34605447c13a`. Restaurado CSS do Login e 15 testes Playwright aprovados. Os 2 testes ausentes na #627 eram 2560×1440 e intervalo 600–1023px. `web-evolution.html` alinhado ao título da aba aprovado. SVGs reutilizados pela exportação de `LoginIcon`, sem alterar sua saída visual.
- **Comparação real em Chrome**: dois servidores Vite (base aprovada 4174 e branch #627 4173), sete screenshots de página inteira e diferenças por pixel via canvas. **0 pixels diferentes, 0,00%** em 360×844, 390×844, 768×1024, 1365×600, 1366×768, 1920×1080 e 2560×1440. Isso não substitui aprovação visual humana.
- **Teste vermelho do SHA antigo:** [Actions #38477026299](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/38477026299), FAILURE esperado. Causas: falta de SVG/escudo; 76px de reserva para erro; card 1366×768 com 795px para 734px; rodapé terminando em y=795,75; "Controle" em 3 linhas; novo scroller ainda ausente.
- **Primeira tentativa verde:** [Actions #38477423253](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/38477423253), FAILURE: teste herdado exigia rolagem do card inteiro, título HTML da aba antigo e folga inferior do rodapé de 14,6px. Diff real do Login já era 0,00%.
- **Gate final temporário:** [Actions #38478021368](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/38478021368), SUCCESS. 15 Playwright Login, 19 Playwright Criar Conta, 7 rigorosos de layout e 7 de pixel-diff; test:auth, test:finance, test:core, dados, Shell, DataGrid, contrato Login, build Web/API verdes. [Artifact #11856156057](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/38478021368/artifacts/11856156057).
- **Estrutura:** card em grade com cabeçalho e rodapé fixos; apenas lista de campos rola quando necessária. Em 1365×600, card=563/563px, campos=437px dentro de 270px, botão "Continuar" y=458,8px e sem salto no erro.
- **Erro:** reserva normal 42px, somente 360px 60px; `aria-invalid`, `aria-describedby`, foco no primeiro inválido, `scroll-margin` de 24px preservados. "Voltar" mantém 17,6px da borda do card.
- **1366×768:** card 728px/728px sem scroll interno, "Controle" até duas linhas; ícones SVG do Login, escudo no cabeçalho, rádio não marcado vazio.
- **Orbe:** ORB_CENTER={x:1008,y:542}, ORB_RADIUS=20 e ORB_SOURCE=2048×1143, cálculo `cover` central. Menor distância do círculo até título/parágrafo/cards em 1365×600:129px. Mobile/tablet: cálculo de colisão intencionalmente ignorado por orbe atrás do card; sem gap negativo.
- **1920×1080:** distâncias título/card=250,5px, parágrafo/card=218,5px, benefícios/card=80px. Mínimos respeitados.
- **Pendências:** aprovação visual humana, CORS conhecido no preview visual sem alteração de segurança, DataGrid mobile ainda pendente. Sem autorização de merge.

## Etapa 05 - PR #627, Cadastro desktop baixo 1365x600, 13/10/2026

- **Origem**: branch oficial `stage05-screen/05-criar-conta@d8969d50e59fbc4ee2fd101dd7f9d949f5e607ff`; branch temporária `stage05-screen/temp-page-scroll-1365-20261013@4c559754bf04956ce4fc330cf86d7cfd8d356573`; sem atualizar com main, Android e #626/#628/#629 não alterados. PR permanece Draft, sem merge.
- **Correção visual**: preservada a candidata dos 7 passos anterior (SHA `2847620b46ce338624f3f560729cf787ca8793eb`), acrescentando **somente** uma nova media query externa `(min-width:1024px) and (max-height:770px)`, com filtro de largura interna `(max-width:1365px)` para preservar 1366x768. `html:has(.meg-auth-register)`, `body:has(...)` e wrapper em altura auto/min-height 100dvh, overflow vertical da página, padding de 16px, frame align-items:start, hero sem fixed. Card max-height:none / overflow:visible, campos height:auto / overflow:visible sem mask; grid rows auto.
- **Mudança de contrato dos testes apenas em 1365x600**: os testes herdados que exigiam rolagem interna e botões na tela sem rolar foram substituídos por asserções mais fortes de campos completos, documento rolável, card sem recorte e acesso efetivo aos dois botões após scrollIntoView. Sem skips nem mudanças de assert nos outros viewports.
- **Medição antes** (antigo desktop baixo): card height 563/563px, max-height aproximadamente 564,8px, overflow:hidden; campos 262/437px, overflow:auto, scroll interno. Botão offsetTop 663px na candidata anterior.
- **Medição depois**: card client=scroll=737px, max-height:none/overflow:visible; campos client=scroll=437px e overflow:visible; página scrollHeight 771px (viewport 600px); buttonOffsetTop 615px **nos dois estados**; gapFieldsError=gapErrorButton=8,796875px, footer bottom gap 18,390625px, orbe distância mínima 48,696px (benefício), sem colisão; captura normal e erro inspecionadas visualmente pela assistente. O usuário ainda não deu aprovação visual expressa.
- **Pré-validação**: [GitHub Actions #38497113937](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/38497113937) SUCCESS, `GATE FINAL:0`. Suítes: Login 15/15, Cadastro 19/19, rigor/layout 7/7, sete passos 7/7, final-invariants 7/7, Login pixel diff 7/7 (0 pixels), Cadastro pixel diff 7/7. Financeiros, contratos, dados, Shell, DataGrid, build Web/API verdes. Os seis outros viewports do cadastro preservaram 0 pixels diferentes comparados com a última candidata (normal/erro). 1365 nova captura fullPage 1365x771, anterior 1365x600.
- **Evidências**: [artifact da pré-validação](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/38497113937/artifacts/11863594912), inclusive JSONs e PNG antes/depois 1365x600, capturas registro-visual/rigor normal/erro e resultados completos.
- **Escopo**: CSS de cadastro e testes de caracterização que incorporam a semântica da nova rolagem, script agregador e este checkpoint. Sem alterar Login, rotas, dependências, CORS, backend, banco e regras financeiras. Não alterar outros baselines; Criar Conta não possuía baselines versionados (apenas artefatos).
- **Pendente**: CI/Render oficiais com SHA da integração e aprovação visual do usuário. Merge bloqueado.

## Etapa 05, PR #627, evidências Login / Criar Conta (14/10/2026)

- **Base oficial congelada antes da correção**: `716d8e10f16d7426456c58aeee781cac54f938cb`. **Objetivo desta rodada**: evidências e medições, sem alterar markup/CSS/assets do Login, nem modificar visual do Cadastro. PR continua Draft, sem merge. Android, API, auth-client, banco, regras financeiras, PR #626/#628/#629 e main preservados.
- **Pré-validação**: [Actions #38557018550](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/38557018550), SUCCESS, GATE FINAL 0: login 15/15, registro 19/19, layout/rigor 7/7, login pixel diff 7/7, novo login evidências 7/7, sete passos 7/7, registro pixel diff 7/7, invariantes finais 7/7. Gates auth, finance, core, dados, Shell, DataGrid, builds Web/API aprovados.
- **ImageMagick 7**: `magick compare -metric AE` comparando Login aprovado #626 com Login da #627. **AE=0** em 360x844, 390x844, 768x1024, 1365x600, 1366x768, 1920x1080 e 2560x1440, normais; também **AE=0** em 1365x600 e 1366x768 com erro. `login-pr627-2560x1440.png` foi gerado e incluído com diff.
- **Login, erro medido**: em 1365x600, botão Entrar tem `offsetTop=348` antes e depois, nos SHAs aprovado e PR627. Em 1366x768, `offsetTop=397` antes e depois. Sem sobreposição do erro com os campos e botão. Evidências PNG aprovado, PR e diff desses dois viewports.
- **Medições por tela**: JSONs `login-evidencias/login-metricas-WxH.json` com card, inputs, mensagem, botão, cards benefício, orb em todos os sete viewports. JSONs de Cadastro recebem prefixos `criar-conta-final-`, `criar-conta-registro-visual-` e `criar-conta-rigor-`; sem JSON ambíguos.
- **Composição de benefícios**: Login aprovado ícone à esquerda; Cadastro atual em 1365x600 usa ícone em cima. **Não foi localizado screenshot de Criar Conta com aprovação visual explícita** que autorizasse mudar a composição. Portanto, nenhum ajuste visual, divergência registrada sem declaração de aprovação.
- **Registros sem correção**: Controle quebrando em três linhas no aprovado não é regressão; orbe sem colisão em 1365x600 mantido; gap reservado para erro no Login mantido. Cadastro em 1365x600 com card maior que 600px e rolagem da página tem validação técnica prévia, mas não aprovação visual explícita do usuário.
- **Artifact do pré-teste**: [#11890189402](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/38557018550/artifacts/11890189402) com `login-ae-metricas.csv` e Markdown, capturas, PNG diffs, resultados e JSONs; 194 entradas, 9 AE=0, sem JSONs ambíguos.
- **Alteração no código**: apenas `login.evidence.playwright.spec.mjs` novo, script de validação e workflow de evidências atualizado para disponibilizar ImageMagick 7; checkpoint atualizado. Login CSS/markup/assets e Cadastro CSS/markup/assets inalterados.
- **Pendente**: reexecutar CI oficial no novo SHA, atualizar preview e validar visualmente com aprovação explícita do usuário. A comparação com print aprovado de Criar Conta depende desse print ser identificado/confirmado.


## 10/11/2026 | ETAPA 09 — PR #666 kit de backup e restauração isolada (não executado em produção)
- O usuário autorizou avançar à próxima prioridade após a PR #665 Draft e CI verde: **proteger recuperação do banco Supabase antes de deploy ou mudanças destrutivas**. Esta entrega criou [PR #666](https://github.com/MarcosVilalva/MEG-Platform/pull/666) **Draft**, branch isolada `stage09/backup-recovery-kit-20261110` baseada em `main`; **nenhum banco, Render, plano, serviço, Android, Home, telas ou writer foi alterado**.
- **Inventário direto por SELECT agregado** Supabase projeto `ugbiqzaqnrhulhetevby`: PostgreSQL 17, `public` com 32 tabelas (~18MB), `public."User"` com 2 registros, `auth.users` com 0, `storage.buckets` e `storage.objects` com 0, `vault.secrets` com **1 segredo** (conteúdo jamais consultado), 7 extensões. O Vault reforça que um dump `public` não cobre toda recuperação; a **chave-raiz criptográfica do projeto não está em backup lógico** e requer guarda fora do chat/GitHub, conforme docs Supabase.
- Scripts `scripts/meg-stage09-safe-backup.sh` (dump lógico completo stream para `age` com no SQL plaintext), `scripts/meg-stage09-safe-restore-drill.sh` (somente localhost, banco vazio `meg_restore_drill`, restauração do domínio `public`) e `scripts/meg-stage09-backup-safety.test.mjs` (testes com programas SIMULADOS, sem produção). Workflow `.github/workflows/meg-stage09-backup-safety.yml` executa só tests offline. Doc `docs/MEG-STAGE09-BACKUP-RECOVERY-RUNBOOK-20261110.md` contém pré-requisitos, operação com credenciais no ambiente local e riscos.
- **Validação executada:** `bash -n` e teste Node simulando criptografia/pg_dump/pg_restore, bloqueio de restore remoto e manifesto. PASS. Os blobs dos 5 arquivos enviados ao GitHub foram comparados com hashes Git locais e coincidiram. **Não significa que o dump real tenha sido criado/restaurado**. CI GitHub e recuperação real ainda pendentes.
- **Gates ainda NO-GO:** coleta real do dump sob credenciais privadas do responsável, cópia criptografada offsite, chave privada age protegida independentemente, chave raiz Vault protegida e restaurada em ambiente isolado, restauração real com Postgres 17 e verificação funcional, uso/limite Egress, Build Command Render sem `db:prepare:production`/`db:push:production`, checks finais e aprovação da promoção. PR #665 desempenho e PRs #663/#656 permanecem com seus gates próprios. **Etapa 09 ABERTA; NO-GO de deploy/merge.**


### Complemento 10/11/2026 | Vault criptografado e teste com PostgreSQL 17 real, sintético
- A PR [#666](https://github.com/MarcosVilalva/MEG-Platform/pull/666) recebeu `scripts/meg-stage09-safe-vault-rootkey.sh`: obtém **somente mediante credenciais fornecidas em terminal privado** a chave-raiz via **GET** oficial `/v1/projects/ugbiqzaqnrhulhetevby/pgsodium`, valida resposta de 64 caracteres e transmite por pipe direto à criptografia `age`. Script não exibe valor e não acompanha redirecionamentos HTTP com token. **NENHUMA chave real foi consultada/copied por este chat**. O token PAT nunca deve ir para chat/issue/log.
- `scripts/meg-stage09-backup-safety.test.mjs` agora cobre o fluxo protegido do Vault com token e chave fictícios. CI `.github/workflows/meg-stage09-backup-safety.yml` inclui um segundo job com **duas instâncias descartáveis PostgreSQL 17**, cria tabelas e linhas **SINTÉTICAS**, executa `pg_dump -Fc | age`, restaura via `age -d | pg_restore` e verifica as linhas do domínio `public`; confirma presença de dados fictícios do schema `vault` no arquivo completo. Exemplo de execução bem-sucedida: GitHub run [#42925845844](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42925845844), ambos jobs **SUCCESS**; o último SHA da PR deve ter checks verificados separadamente.
- **Não foi gerado backup da produção.** O teste de PostgreSQL real usa apenas dados de ensaio em containers GitHub, nunca a API Supabase de produção. Não remover gate de backup externo, identidade privada, chave raiz Vault protegida, restauração real (local/novo Supabase com custo aprovado), Render Build Command seguro e cota Egress saneada. **Etapa 09 ABERTA, PR #666 DRAFT, NO-GO de merge/deploy da API.**


## 11/11/2026 | Etapa 09 — pacote Work auditado, PR #666 reforçada
- **Recebido do usuário:** ZIP `MEG-BACKUP-PACOTE-PREPARACAO(1).zip` com diagnóstico Windows, manual, auditoria Work e proposta de correções. Work identificou corretamente **NO-GO** por `PGSSLMODE=require` sem identidade do host, restore via `localhost` sujeito a libpq/túnel, lacunas de metadados, Vault e testes de scripts reais. O ZIP original NÃO deve ser usado para execução de backup/restauração; contém instruções antigas.
- **Correções aplicadas SOMENTE na PR #666 Draft** `stage09/backup-recovery-kit-20261110`:
  1. `scripts/meg-stage09-safe-backup.sh` exige **`PGSSLMODE=verify-full`**, CA oficial local existente `PGSSLROOTCERT`, rejeita destino/credenciais errados, elimina libpq variáveis de redirecionamento, verifica clientes e servidor PostgreSQL major 17 e diretório privado 0700.
  2. `scripts/meg-stage09-safe-restore-drill.sh` exige socket Unix **fixo `/var/run/postgresql/.s.PGSQL.5432`** pertencente ao SO `postgres`, `PGREQUIREPEER=postgres`, `env -i` para isolar todas conexões libpq, banco `meg_restore_drill`, usuário Unix corrente com role local homônima, servidor 17 validado por SQL `inet_server_addr() IS NULL` e destino vazio em qualquer schema não sistêmico antes de restaurar `public`. Sem suporte a host TCP, túnel remoto ou senha em ambiente herdado.
  3. `scripts/meg-stage09-safe-vault-rootkey.sh` corrigido para API GET oficial que retorna **objeto JSON `{root_key: ...}`** (não string), com limite de bytes/tempo, sem redirecionamento de token. GET experimental/Beta **NÃO executado**, PUT proibido.
  4. Testes simulados ampliados e CI `.github/workflows/meg-stage09-backup-safety.yml` agora executa **o script real de restore** em PostgreSQL 17 descartável, com PK/FK, índices, sequence/identity sintéticos. Não usa dados/segredos reais.
  5. Runbook revisado para Windows/WSL com CA/verify-full e criação **manual e local** de papel/banco; diagnóstico `scripts/MEG-BACKUP-WINDOWS-PREPARACAO.ps1` (somente leitura) e relatório `docs/MEG-STAGE09-WORK-BACKUP-AUDIT-20261111.md` adicionados.
- **Evidência operacional:** teste em contêiner descartável já concluiu `DRILL public APROVADO: 3 tabelas` com script novo; uma falha posterior de aspas na asserção CI de FK foi corrigida. **A CI no último SHA continua necessária** e deve ser checada independentemente.
- **Pendências reais (NO-GO):** nenhum dump de produção foi feito; nenhuma cópia criptografada offsite verificada; identidade `age`, chave-raiz Vault e credenciais reais não acessadas; sem restore com dados verdadeiros; sem backup de parâmetros/secrets Render/Auth/Storage; Build Command Render de produção ainda destrutivo, cota Supabase ainda restrita por Egress. PRs #665, #663, #656 continuam separadas e Draft. **Não declarar banco recuperável ou Etapa 09 concluída.**


### CI confirmada após correções P0 do Work — 11/11/2026
- SHA `df85970749c911ab24665a5d450ca0af9f9ecb12` da **PR #666**: [Backup Safety #42940534932](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42940534932) **SUCCESS**, inclui testes com mocks e **script efetivo de restore** em PostgreSQL 17 descartável com PK/FK, índices, sequência; [MEG Platform CI #42940534894](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42940534894) **SUCCESS**, incluindo testes gerais e builds; [CORS #42940535032](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42940535032) **SUCCESS**. Foundation **SKIPPED**; `financial-e2e` e `android-rc1` **SKIPPED**, não declarar que foram validados.
- O ciclo anterior [#42939881763](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42939881763) restaurou três tabelas reais sintéticas via script, mas falhou em asserção SQL de FK por escape de aspas no workflow, não por falha de restore; a asserção foi corrigida e os checks verdes comprovados acima.
- **Observação:** código fonte de exportação não foi conectado ao Supabase em nenhum teste; compatibilidade de TLS/CA e leitura de produção somente poderão ser comprovadas em operação privada e autorizada. Backup real/restauração real, chave do Vault e armazenamento offsite não foram realizados. Etapa 09 **ABERTA/NO-GO**; PR #666 permanece DRAFT, sem merge/deploy.


## 11/11/2026 | Etapa 09 — primeira tentativa real de backup e correção do verificador
- **Autorizacao do usuario:** primeira exportacao real PostgreSQL exclusivamente de leitura, sem restauração/Vault/merge/deploy, executada no notebook WSL em 11/11/2026, inicio ~19h13. Nao existe autorizacao para tentativa automatica posterior.
- **Fonte confirmada:** `ugbiqzaqnrhulhetevby`, Session Pooler IPv4 `aws-1-sa-east-1.pooler.supabase.com:5432`, `PGUSER=postgres.ugbiqzaqnrhulhetevby`, TLS `verify-full` com CA conferida, PostgreSQL 17. Inventario read-only verificou **32/32 tabelas public** e as tres principais. Conexao e inventario OK.
- **Primeira exportacao real FALHOU:** `pg_dump | age` passou da etapa de inicio, mas `age -d | pg_restore --list` retornou falha; relatorio WSL `CODIGO_SCRIPT_BACKUP=1`, relatorio PowerShell `CODIGO_LINUX=2`; diretorio temporario limpo. **Nenhum arquivo de backup real foi validado ou disponibilizado para restore.** O erro original detalhado foi eliminado com a pasta temporaria; nao alegar causa conclusiva.
- **Hipotese reproduzida isoladamente:** `pg_restore --list` pode encerrar antes de consumir todo o fluxo de dados, provocando SIGPIPE no `age` sob `pipefail`. Um teste sintético demonstrou falha no pipeline antigo, sucesso com drenagem do fluxo e rejeicao de fluxo truncado.
- **Correcao exclusiva da PR #666 Draft:** `scripts/meg-stage09-safe-backup.sh` agora consome ate EOF a saida descriptografada apos leitura do catalogo e verifica codigos `AGE_RC`, `CATALOGO_RC`, `DRENO_RC`; nao grava SQL sem cifra em disco. `scripts/meg-stage09-backup-safety.test.mjs` usa payload ficticio de 8 MiB e simula falha de autenticacao; workflow verifica com `age` real um arquivo integro e outro truncado. **Backup Safety #43111816421 SUCCESS** no commit `487d86dc7b75957874f548cbd862c4317be362a7`. Revalidar gates apos commits documentais.
- **Risco de execucao local:** script antigo permanece no WSL (`/home/m_vil/.meg-stage09-tools/meg-stage09-safe-backup.sh`, blob `c0fb475ac0b346addb725142746e3d873d56068e`). Wrapper Windows `MEG-ETAPA09-BACKUP-REAL-CONTROLADO.ps1` confere esse mesmo hash. **Nao reutilizar** antes de atualizar o script local e o wrapper com hashes conferidos; nao remover as verificacoes.
- **Pendente:** obter nova autorizacao para segundo `pg_dump`; antes, instalar/validar a nova versao WSL, comprovar arquivo criptografado + manifesto, copia offsite, restore REAL em banco isolado `meg_restore_drill`, Vault root key independente, configuracoes gerenciadas, credenciais Render e Egress. Nenhuma alteracao financeira, Android, API de producao, banco, Render, deployment ou plano. NO-GO para merge/deploy.

## 11/11/2026 | Etapa 09 — segunda exportacao real: arquivo gerado, validacao independente pendente
- O usuario executou **segunda tentativa com confirmacao interativa** em 11/11/2026 ~19h42-19h43 no WSL, script oficial atualizado Git blob `6411ee881b7857fd498eb26320259077969757e5`, Session Pooler IPv4 do projeto correto `ugbiqzaqnrhulhetevby`, PostgreSQL 17, TLS `verify-full`, 32 tabelas public. A autorizacao para essa tentativa ja foi utilizada.
- O **script oficial informou `CODIGO_SCRIPT_BACKUP=0`**, concluiu `pg_dump | age`, descriptografia/verificacao do catalogo e imprimiu os caminhos **privados locais**: `/home/m_vil/.meg-stage09-backups/meg-financas-full-20261111T224336Z-9958.pgdump.age` e `/home/m_vil/.meg-stage09-backups/meg-financas-full-20261111T224336Z-9958.manifest.txt`. Nenhum dump SQL claro gravado pelo script.
- **Divergencia:** wrapper PowerShell registrou `CODIGO_LINUX=2`, apesar do script oficial retornar `0`, e nao incluiu no relatorio as linhas finais de confirmacao do proprio wrapper. Causa nao comprovada. O Bash extraido do arquivo PowerShell original passou em `bash -n`, mas nao ha copia do launcher executado no WSL (foi limpo). **NAO afirmar backup completamente homologado** ate conferir arquivos reais e diagnosticar encerramento externo.
- Foi preparado, **sem executar no notebook**, `MEG-ETAPA09-VERIFICAR-BACKUP-LOCAL.ps1` para conferir localmente existencia/permissoes, manifesto, hash, bytes, descriptografar `age` ate EOF e ler apenas catalogo pelo `pg_restore --list`, sem conexao ao Supabase, sem pg_dump, restore, Vault, merge ou deploy. Testes locais neste ambiente: `bash -n` OK; fixture sintetica (9MB) aprovada e falha de autenticacao simulada rejeitada; **nao equivale a teste do arquivo real no WSL do usuario**.
- Proxima operacao: usuario executar **somente verificacao local** e colar relatorio. Apos sucesso: copiar `.pgdump.age` e manifesto para armazenamento externo independente, validar hash da copia; em seguida restore real no cluster Unix local isolado sob autorizacao e gates especificos. Vault root key, API Render e Egress seguem pendentes; nao executar terceiro backup automaticamente. PR #666 Draft, nenhuma modificacao de banco ou deploy por esse registro.


## 11/11/2026 | Etapa 09 — verificação local independente do backup real APROVADA
- Recebido relatório do usuário às **19h49min43s (America/Sao_Paulo)**: script local independente `MEG-ETAPA09-VERIFICAR-BACKUP-LOCAL.ps1` executado no WSL com **`CODIGO_LINUX=0`**, `ERRO_LOCAL` vazio e launcher temporário removido. Sem conexão Supabase, sem nova exportação, sem restore e sem Vault.
- **Arquivo verificado localmente**: `/home/m_vil/.meg-stage09-backups/meg-financas-full-20261111T224336Z-9958.pgdump.age`, **1.580.165 bytes**, **SHA-256 `3d84d7e2afac40ce64d5de27f50050854ee3b1bf69a6abdc374fd892914beeb9`**, manifesto `meg-financas-full-20261111T224336Z-9958.manifest.txt` coerente.
- Resultado `BACKUP_CRIPTOGRAFADO_LOCAL_VALIDADO`, `AGE_AUTENTICACAO_INTEGRAL=APROVADA`, `PG_RESTORE_CATALOGO=APROVADO`, **32 entradas `TABLE DATA public`**, presença de `User`, `AppState`, `FinancialEvent` e 1 entrada de catálogo `vault.secrets`. A entrada Vault **NÃO** é cópia da chave-raiz, nem comprova recuperação funcional de segredos.
- **A divergência `CODIGO_LINUX=2` da segunda tentativa era do wrapper externo, e não invalida o arquivo que passou na verificação independente**; causa desse código externo continua não diagnosticada. Não afirmar sucesso de restauração por validação de catálogo.
- **Próximos gates**: cópia `.pgdump.age` + manifesto para armazenamento externo independente (OneDrive/segunda mídia conforme disponível), SHA-256 da cópia e confirmação de upload remoto; restore REAL exclusivamente no banco `meg_restore_drill` em cluster WSL Unix isolado, separado da origem; guarda da chave-raiz Vault; recuperação integral gerenciada; Build Command do Render, cotas Egress. **Sem autorização para terceiro `pg_dump`, acesso Vault, RESTORE ou deploy nesta operação.**
- Etapa 09 permanece aberta, PR #666 Draft e NO-GO para merge/deploy. Android e regras financeiras intocados.


## 11/11/2026 | Etapa 09 — cópia OneDrive local conferida, nuvem ainda pendente
- Relatório do usuário 11/11/2026 às **19h55min57s**: `RESULTADO=COPIA_LOCAL_ONEDRIVE_CONFERIDA`, conta `OneDriveConsumer`. Arquivo `meg-financas-full-20261111T224336Z-9958.pgdump.age`, **1.580.165 bytes**, SHA-256 origem/cópia `3d84d7e2afac40ce64d5de27f50050854ee3b1bf69a6abdc374fd892914beeb9`. Manifesto copiado e conferido, SHA-256 da cópia `eb8cfbf2325e276960a54e3833bda894fd53dfe2f3c297a9899b263d29b177cf`. Sem erro local.
- **Limitação decisiva:** `SINCRONIZACAO_REMOTA=NAO_VERIFICADA`. Até o momento a evidência prova somente cópia íntegra no diretório OneDrive do Windows, não que os bytes chegaram ao serviço remoto nem que uma cópia pode ser recuperada após falha do computador. Confirmar no OneDrive **Web** e testar um download novo separado do diretório sincronizado; calcular SHA-256 do arquivo recém-baixado e conferir manifesto; não divulgar backup nem chave privada.
- Nenhuma conexão Supabase, `pg_dump`, restore, Vault, merge ou deploy durante a cópia. **Não apagar/mover** arquivos locais; não autorizar restore real antes de confirmação externa e avaliação de gates. PR #666 permanece Draft; Android, API e banco de produção intocados.


## 11/11/2026 | Etapa 09 — OneDrive Web download conferido por hash
- Relatorio do operador de **11/11/2026 20h01min28s**: `RESULTADO=DOWNLOAD_CLOUD_CONFERIDO_POR_HASH` para `meg-financas-full-20261111T224336Z-9958.pgdump.age`, arquivo **1.580.165 bytes**, hash do arquivo e SHA-256 do manifesto conferidos. Selecao realizada em pasta fora dos diretorios OneDrive conhecidos; nenhuma modificacao de arquivos e nenhuma conexao ao Supabase.
- **Ressalva de evidencia:** script offline informa `ORIGEM_WEB=DECLARADA_PELO_OPERADOR_NAO_VERIFICAVEL_PELO_SCRIPT_OFFLINE`; evidencia de download proveniente do OneDrive Web depende da declaracao de procedimento pelo operador, nao de telemetria remota do verificador. Considerando o download realmente realizado via navegador, ha uma copia externa verificavel pelo hash; nao afirmar prova independente do provedor.
- **Proximo gate seguro:** preflight somente leitura do cluster local `17/meg_restore`, socket Unix `/var/run/postgresql/.s.PGSQL.5432`, usuario `m_vil`, alvo `meg_restore_drill` vazio, hash do archive/manifesto; nao executar restore ate autorizacao separada. Recomenda-se corrigir no script de restore da PR #666 o mesmo padrao `age -d | pg_restore --list` suscetivel a SIGPIPE detectado no backup, testar isoladamente, depois validar a versao local por hash antes de restaurar.
- Gates ainda pendentes: restore REAL com dados da producao no banco WSL isolado, demonstracao funcional/consistencia, guarda de chave-raiz Vault, componentes gerenciados e credenciais externas, Egress e Build Command Render. PR #666 Draft, sem merge/deploy, Android e regras financeiras preservados.


## 11/11/2026 | Etapa 09 — correção do verificador de restore e preflight seguro
- Correcao isolada `scripts/meg-stage09-safe-restore-drill.sh` em PR #666 Draft: verificador `age -d | pg_restore --list` agora consome o stream inteiro ate EOF para evitar falso negativo SIGPIPE, preservando validacao `pipefail` antes de qualquer operacao que escreve no PostgreSQL local. Novo blob Git: `5946d03f4102068f84d9ebb011aaa199aa1e063b`. Nao instalado/rodado no notebook nesta operacao; nenhum restore de dados reais autorizado ou executado.
- CI verificada no commit `eb8253fee9f60674bdeffeebfee12f849e864144`: [Backup Safety #43116844013](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43116844013) SUCCESS; [MEG Platform CI #43116844047](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43116844047) SUCCESS; [CORS #43116844006](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43116844006) SUCCESS; Foundation skipped. CI somente sintetico, nunca testa recuperacao real.
- Foi criado em conversa, sem executar, `MEG-ETAPA09-PREFLIGHT-RESTAURACAO-LOCAL.ps1`: read-only, WSL usuario `m_vil`, confere arquivo AGE SHA-256 fixo `3d84d7e2afac40ce64d5de27f50050854ee3b1bf69a6abdc374fd892914beeb9` e manifesto, socket Unix fisico pertencente a `postgres`, PG17, role `m_vil`, database `meg_restore_drill` e numero zero de objetos extra-sistema. Proibe conexao Supabase/pg_dump/pg_restore, nao toca Vault; apenas informa disponibilidade do script de restore atualizado. Teste executado neste ambiente: `bash -n` OK no Bash incorporado; **nao equivale a execucao WSL do usuario**.
- A proxima operacao depende do resultado do preflight. Mesmo com preflight verde, **restauracao real exige autorizacao separada**, e sem ela e proibido instalar/executar fluxo de restore. Gates de Vault, elementos Supabase gerenciados, Render, Egress e plano de recuperacao integral continuam pendentes; PR #666 Draft/no-go, Android/conteudo financeiro intactos.

## 11/11/2026 | Etapa 09 — precheck WSL de restauração real aprovado
- Relatorio do usuario em **11/11/2026 20h08min15s America/Sao_Paulo**: `CODIGO_LINUX=0`, `ERRO_LOCAL` vazio, `RESULTADO_WSL=PRECHECK_LOCAL_APROVADO`; **sem conexao ao Supabase, sem pg_dump, sem restore, sem acesso ao Vault ou alteracoes de dados**.
- Arquivo AGE original e manifesto verificados por hash/coerencia; socket Unix fisico do servidor local conferido; `CONEXAO=UNIX_SOCKET_VERIFICADO`; `PG_MAJOR=17`; papel PostgreSQL local `m_vil`; banco `meg_restore_drill`; `OBJETOS_NAO_SISTEMICOS_NO_DESTINO=0`.
- `SCRIPT_RESTORE_LOCAL=NAO_INSTALADO`: o script corrigido `scripts/meg-stage09-safe-restore-drill.sh` na PR #666 Draft corresponde ao Git blob `5946d03f4102068f84d9ebb011aaa199aa1e063b`. **Nao instalar nem executar restauracao sem autorizacao expressa separada do usuario**, conforme gate anterior.
- No SHA `7faca3a486f98b5322471f2cb0b6daee82c497c6`, [Backup Safety #43117188375](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43117188375), [MEG Platform CI #43117188317](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43117188317), [CORS #43117188364](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43117188364) **SUCCESS**; Foundation skipped. CI nao comprova restauracao real.
- Proxima etapa condicionada: obter autorizacao separada para instalar script com hash conferido e realizar **somente restauracao de `public` no PostgreSQL 17 do WSL `meg_restore_drill` autenticado via socket Unix/peer**, apos revalidar integridade e destino vazio; abortar se qualquer guarda falhar, sem `--clean` nem reexecucao automatica; sem alterar Supabase/Render/GitHub main, Android ou regras financeiras. Se a autorizacao incluir apenas instalacao, nao executar restore. Validacao funcional, Vault root key, auth/Storage/config gerenciadas e Egress continuam pendentes. PR #666 DRAFT, sem merge/deploy.


## 11/11/2026 | Etapa 09 — primeira restauração real LOCAL expressamente autorizada e executor preparado
- **Autorizacao expressa do usuario recebida:** `AUTORIZO RESTAURAÇÃO LOCAL.`, apos precheck aprovado em 11/11/2026 20h08. Escopo: instalar script oficial corrigido e executar **uma unica restauracao real das tabelas public do archive `meg-financas-full-20261111T224336Z-9958.pgdump.age`** no banco **exclusivamente local** `meg_restore_drill` do cluster Ubuntu WSL `17/meg_restore`, via Unix socket autenticado por peer. Nenhuma conexao/alteracao no Supabase, Render, GitHub main, Android, Vault, Egress ou UI.
- PR #666 continua **Draft e nao mesclada**. HEAD antes da preparacao do executor `2ac827974d55bea15d2dbae22c2ad4acbd1bb028`; [Backup Safety #43117637970](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43117637970), [MEG Platform CI #43117637975](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43117637975), [CORS #43117637995](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43117637995) SUCCESS; Foundation skipped. Blob do script de restore corrigido `5946d03f4102068f84d9ebb011aaa199aa1e063b`.
- **Artefato preparado para execucao NO NOTEBOOK DO USUARIO, NAO executado aqui:** `MEG-ETAPA09-RESTAURACAO-LOCAL-CONTROLADA.ps1`. PowerShell 5.1 com `cls` e saida copiada/conferida no clipboard; preflight repetido no WSL, verifica SHA-256 backup `3d84d7e2afac40ce64d5de27f50050854ee3b1bf69a6abdc374fd892914beeb9` e manifesto `eb8cfbf2325e276960a54e3833bda894fd53dfe2f3c297a9899b263d29b177cf`, permissao 0700/0600, cluster `17/meg_restore` e banco vazio, baixa script oficial de commit imutavel e confere Git blob (sem substituicao se divergente), confirma no PowerShell `RESTAURAR NO WSL` e invoca UMA unica vez o script oficial com ambiente `env -i`, `PGREQUIREPEER=postgres` e socket Unix. Guardrails do script original permanecem; sem SQL plaintext em arquivo, sem `--clean`, sem pg_dump.
- **Diagnostico de falha:** log bruto gerado apenas em pasta privada no WSL, sem colar conteudo no chat; nao repetir restauracao se falhar. Sucesso exige saida `DRILL public APROVADO: 32 tabelas` e contagem agregada das 32 tabelas e registros positivos nas tres tabelas nucleares. Testes locais de preparacao: `bash -n` nas duas fases OK, guardas negativas recusaram usuario/ambiente errado (exit 31). **Isso nao equivale a execucao no Windows nem comprova restauracao real.**
- Aguardar relatorio do usuario antes de declarar sucesso. Apos restauracao, o WSL contera dados financeiros reais em PostgreSQL local, exigindo protecao e retencao controlada; nenhuma limpeza destrutiva automatica. Vault root key, auth/storage/schemas Supabase gerenciados e validacao integral continuam pendentes.

## 11/11/2026 | Etapa 09 — restauração cancelada na confirmação interativa, sem escrita
- Usuário enviou relatório de 11/11/2026 **20h34min31s**, `CODIGO_PREPARACAO=0`, `RESULTADO_PREPARACAO=APROVADA`. Backup/manifesto SHA-256 conferidos, cluster local `17/meg_restore`, banco `meg_restore_drill`, role `m_vil`, socket Unix peer, **0 objetos no destino**; versão do script de restore `5946d03f4102068f84d9ebb011aaa199aa1e063b` **INSTALADA_E_CONFERIDA**.
- `CONFIRMACAO=RECUSADA`, `CODIGO_RESTORE=-1`, `RESULTADO=RESTAURACAO_CANCELADA_SEM_RESTORE`. **Nenhuma restauração ocorreu, banco permanece sem dados restaurados por esta tentativa**. Nenhuma conexão Supabase, `pg_dump`, Vault, merge ou deploy. Não atribuir falha ao PostgreSQL nem supor corrupção do backup.
- Inspeção local do executor entregue anteriormente confirmou condição estrita PowerShell `$answer -cne 'RESTAURAR NO WSL'`: diferença de maiúsculas, espaços extras ou cancelamento intencional causam recusa. **Motivo humano exato não confirmado.**
- Não repetir restauração automaticamente. Solicitar confirmação renovada de que o usuário deseja tentar outra vez antes de executar; quando autorizada, reutilizar executor sem alterações se hash/estado vazio continuarem válidos; não solicitar nova exportação nem limpar destino. Dados reais somente no cluster WSL se a execução futura concluir.
- Pendências permanecem: restore real isolado, verificações funcionais, Vault root key, componentes gerenciados Supabase, Render Build Command, Egress, gates finais, PR #666 DRAFT NO-GO.


## 11/11/2026 | Etapa 09 — primeira restauracao real do schema public APROVADA
- Relatorio recebido do usuario em **11/11/2026 20h51min11s (America/Sao_Paulo)**: `CODIGO_PREPARACAO=0`, `CONFIRMACAO=CONFIRMADA`, `CODIGO_RESTORE=0`, `RESULTADO=RESTAURACAO_LOCAL_PUBLIC_VALIDADA`. A autorizacao expressa da restauração local foi consumida nesta operacao, **nao repetir restore**.
- Fonte: archive age local previamente validado `meg-financas-full-20261111T224336Z-9958.pgdump.age`, SHA-256 `3d84d7e2afac40ce64d5de27f50050854ee3b1bf69a6abdc374fd892914beeb9`, manifesto conferido. Script oficial de restore Git blob `5946d03f4102068f84d9ebb011aaa199aa1e063b` instalado e conferido.
- Destino confirmado: somente WSL Ubuntu PostgreSQL 17 cluster `17/meg_restore`, papel `m_vil`, db `meg_restore_drill`, autenticacao Unix socket `PGREQUIREPEER` e conferencias do banco inicialmente vazio; nenhuma conexao ao Supabase nem `pg_dump`/Vault/merge/deploy durante a restauracao.
- **Restauração real de `public` aprovada:** `RESULTADO_RESTORE=PUBLIC_RESTAURADO_E_CONTAGEM_VALIDADA`, **32 tabelas restauradas**, presenca com registros das tres tabelas `User`, `AppState`, `FinancialEvent`. O notebook WSL **agora armazena dados financeiros reais** no banco local; nao executar novamente o restore, nao apagar o banco, nao expor dados/segredos em logs ou chat.
- **Escopo do sucesso:** comprova exportacao age, integridade local e externa condicionada a origem do download declarada pelo operador, e restauracao do schema `public`. **NAO comprova recuperacao integral do Supabase** (Vault root key nao verificada, Auth/Storage/configuracoes gerenciadas nao homologadas), validacao funcional das regras financeiras, consistencia completa de constraints/indices nem readiness de deploy.
- **Proximo gate autorizado tecnicamente, nao executado:** verificacao local SOMENTE LEITURA do banco restaurado via socket Unix, `PGOPTIONS=default_transaction_read_only=on`, sem campos pessoais ou valores de financas; conferir tabelas, contagens agregadas, PK/FK, indices invalidos, constraints NOT VALID. Nenhuma reexecucao de dump/restore, alteracao do banco, Vault ou produção. PR #666 continua DRAFT, sem merge.


## 11/11/2026 | Etapa 09 — verificador independente pos-restore preparado
- Artefato da conversa **`MEG-ETAPA09-AUDITORIA-LOCAL-POS-RESTORE.ps1`** preparado, **nao executado no notebook**. Com `cls`, executa pelo WSL `Ubuntu-24.04` usuario `m_vil` somente `SELECT` em `meg_restore_drill`; socket Unix `/var/run/postgresql/.s.PGSQL.5432` pertencente ao SO `postgres`, cluster local `17/meg_restore` online e conexao `PGREQUIREPEER=postgres`. Com `env -i` e `PGOPTIONS=-c default_transaction_read_only=on`, confere que `transaction_read_only=on` e `inet_server_addr() IS NULL` antes de aceitar resultado.
- Verificacoes: 32 tabelas `public`, 3 tabelas nucleares com contagens positivas, contagens agregadas de PK/FK, constraints nao validadas e indices invalidos/nao prontos. **Nunca consulta valores de dinheiro, registros pessoais ou dados das linhas, apenas COUNT e catalogos**, nao utiliza `pg_dump`, `pg_restore`, Vault, API, host remoto, ALTER, DDL ou DML. Nao audita por si so invariantes das regras financeiras canônicas.
- Teste feito neste ambiente de preparacao: trecho Bash extraido validado por `bash -n`; guarda negativa de usuario Unix incorreto respondeu erro e exit 1. **Sem PowerShell Windows / WSL real nesta sessao**, logo nenhuma alegacao de aprovacao no computador do usuario. O roteiro nao foi commitado, somente documentado e disponibilizado para download seguro no chat.
- Runbook `docs/MEG-STAGE09-BACKUP-RECOVERY-RUNBOOK-20261110.md` atualizado com os gates efetivamente verdes (backup age, copia externa declarada web, restore `public` 32/32). Permanecem Gates `Vault`, recuperacao dos schemas gerenciados, validacao funcional financeira, Render Build Command, Egress, politica de retencao e backup recorrente. Nenhum merge/deploy.


## 11/11/2026 | Etapa 09 — auditoria pos-restore V1 bloqueada por parser de versao psql, V2 preparada
- Relatorio do usuário às 20h56min35s: `RESULTADO=ERRO_DE_EXECUCAO_LOCAL`, `ERRO_LOCAL=ERRO_VALIDACAO=CLIENTE_PSQL_NAO_E_PG17`, `CODIGO_LINUX=NAO_EXECUTADO`. Sem conexão Supabase, `pg_dump`, `pg_restore`, Vault, merge ou deploy. **Auditoria não concluiu; isto não invalida a restauração de `public` já aprovada às 20h51.**
- Causa encontrada no arquivo PowerShell de auditoria entregue anteriormente: teste Bash `[[ "$(psql --version)" =~ PostgreSQL\\ 17\\. ]]` não corresponde à saída real `psql (PostgreSQL) 17.11`, porque existem parênteses entre `PostgreSQL` e `17`. O script recusou antes da consulta SQL. Ainda não há nova evidência da versão instalada nesta rodada, mas o cliente 17.11 já foi utilizado e confirmado na preparação anterior.
- Foi criado **`MEG-ETAPA09-AUDITORIA-LOCAL-POS-RESTORE-V2.ps1`**, arquivo para download nesta conversa (não commitado), que verifica `^psql[[:space:]]+\\(PostgreSQL\\)[[:space:]]+17\\.[0-9]+([[:space:]].*)?$`, permitindo sufixo do Ubuntu, mantendo rejeição de versões 16/18. Também trata stderr nativo do PowerShell 5.1 em `Continue` durante o comando WSL para evitar que `$ErrorActionPreference='Stop'` substitua o código de saída Linux por `NAO_EXECUTADO`; restaura a preferência imediatamente depois.
- Testes V2 executados **neste ambiente, não no notebook**: Bash extraído passou `bash -n`; expressão aceitou `psql (PostgreSQL) 17.11` e `psql (PostgreSQL) 17.11 (Ubuntu 17.11-1.pgdg24.04+1)`, rejeitou `16.10` e `18.1`. Sem conexão WSL real disponível aqui.
- **Próximo passo:** executar V2 somente leitura no notebook Windows PowerShell 5.1 e analisar relatório com códigos verdadeiros, sem restaurar novamente nem criar novo backup. Continua pendente auditoria estrutural/financeira pós-restore, Vault e recuperação integral. PR #666 segue Draft, sem merge/deploy.


## 11/11/2026 | Etapa 09 — auditoria V2 coletou catalogo mas falhou no EOF; V3 corrigida
- **Resultado do usuário 11/11/2026 20h59min17s:** `CODIGO_LINUX=2`; o PostgreSQL WSL local respondeu por socket Unix peer com `DB=meg_restore_drill`, `ROLE=m_vil`, `PG_MAJOR=17`, `READ_ONLY=on`, **32 tabelas public**, **2 User**, **1 AppState**, **6576 FinancialEvent**, **32 PK**, **52 FK**, **0 constraints nao validadas** e **0 indices invalidos ou nao prontos**. Nenhum registro pessoal ou valor monetario exibido; nenhuma escrita, conexao Supabase, dump, restore ou Vault.
- **Falha V2:** apos imprimir essas metricas, `/bin/bash: line 76: syntax error: unexpected end of file`. Portanto, embora as consultas agregadas tenham sido executadas e sejam evidencia util, o gate completo **NAO FOI HOMOLOGADO**, `CODIGO_LINUX=2` e `RESULTADO=VALIDACAO_LOCAL_FALHOU_SEM_ALTERACOES`. **Nao repetir restore nem exportacao**.
- Inspecao da copia real V2 da conversa `/mnt/data/MEG-ETAPA09-AUDITORIA-LOCAL-POS-RESTORE-V2.ps1` identificou que o Bash incorporado possui 75 linhas, incluindo o `fi` final, e **passa `bash -n` integralmente**. A falha no Ubuntu e compativel com ausencia/truncamento da ultima linha durante o envio do script pela entrada padrao via Windows PowerShell 5.1/WSL, mas **a causa exata nao foi observada na sessao do usuario**.
- Preparado **`MEG-ETAPA09-AUDITORIA-LOCAL-POS-RESTORE-V3.ps1`** (artefato da conversa, **nao executado no notebook**). Abandona `bash -s` via texto de stdin; envia fonte como Base64 para arquivo temporario privado `/home/m_vil/.meg-audit-v3.XXXXXXXX`, verifica SHA-256 ponta a ponta, executa `bash -n` no Ubuntu e confirma marcador de fim da ultima linha ANTES de rodar auditoria. Remove o temporario em `finally`. Nao grava SQL extraido, nao acessa remoto, nao restaura, nao modifica dados.
- A V3 repete as consultas read-only com socket Unix e `PGREQUIREPEER=postgres`, `PGOPTIONS=-c default_transaction_read_only=on`, checa 32 tabelas e registros essenciais e compara **32 PK/52 FK** com o ultimo resultado, recusando indices invalidos/constraints nao validadas. Testes **somente neste ambiente isolado**: `bash -n` OK, transferencia Base64 sintetica preservou SHA-256 e marcador final, dataset simulado com metricas observadas deu exit 0, indice invalido simulado resultou exit 4; **sem execução real PowerShell 5.1/WSL no notebook nesta rodada**.
- Etapa 09: recuperacao real de `public` continua aprovada; auditoria estrutural independente formal **pendente V3**; regras financeiras funcionais, Vault root key e schemas Supabase gerenciados permanecem NO-GO. PR #666 DRAFT, nenhuma promocao ou merge/deploy.


## 11/11/2026 | Etapa 09 — auditoria V3 bloqueada no transporte Base64 e V4 sem pipeline
- **Relatorio do usuario 11/11/2026 21h08min25s:** `VERSAO_AUDITORIA=3`, `CODIGO_LINUX=NAO_EXECUTADO`, `ERRO_LOCAL=TRANSFERENCIA_BASE64_FALHOU`, `RESULTADO=ERRO_LOCAL_SEM_ALTERACOES`, `LIMPEZA=ARQUIVO_BASH_TEMPORARIO_REMOVIDO`. Nao houve auditoria SQL nesta tentativa, nem conexao ao Supabase, `pg_dump`, restore, Vault, merge ou deploy. Restauracao ja aprovada das 32 tabelas mantida.
- **Diagnostico:** V3 enviava `[Convert]::ToBase64String` por pipeline do Windows PowerShell 5.1 para `wsl.exe ... /usr/bin/base64 --decode`. Reproducao isolada: GNU `base64 --decode` retorna 1 ao receber Base64 com sufixo CRLF (`\\r\\n`) e 0 com LF (`\\n`). Isso torna a normalizacao de newline do PowerShell 5.1 uma **causa plausivel**, ainda nao demonstrada por captura de stderr da execucao Windows.
- **Artefato V4, sem alterar repo funcional:** `MEG-ETAPA09-AUDITORIA-LOCAL-POS-RESTORE-V4.ps1`, gerado e verificado em `/mnt/data` para execucao *pelo usuario* no Windows PowerShell 5.1. Substitui a transferencia via stdin por fonte Bash UTF-8 sem BOM em arquivo temporario Windows, convertido por `wslpath -u`, copiado pelo `cp` para `mktemp` privado no Ubuntu; compara SHA-256 Windows->WSL, confere permissao 0600, `bash -n` e marcador `# MEG_AUDIT_V4_END_MARKER` ANTES da execucao. Apaga temporarios Windows e WSL em `finally`. Sem senha, SQL claro de dump, dados financeiros ou segredos no script temporario.
- **Testes realizados somente neste ambiente:** codigo Bash extraido da V4 aprovado `bash -n`; fluxo sintetico de escrita/copia/sha256/marcador OK; bloqueio de usuario errado termina com codigo 1. O script V4 **nao foi executado no Windows/WSL do usuario** e a auditoria independente permanece pendente ate resultado real.
- Os resultados agregados da V2 (32 tabelas, User=2, AppState=1, FinancialEvent=6576, PK=32, FK=52, invalidas=0, read-only=on) sao evidencia util mas V2 falhou no EOF; nao declarar V2/V3 homologadas. Nao repetir dump/restore. Etapa 09 e PR #666 Draft continuam abertas, sem merge ou deploy; Vault e recuperacao integral pendentes.


## 12/11/2026 | Etapa 09 — auditoria estrutural independente V4 APROVADA
- **Relatorio recebido do usuario em 12/11/2026 03h25min15s (America/Sao_Paulo)**: `VERSAO_AUDITORIA=4`, `METODO=ARQUIVO_UTF8_TEMPORARIO_COPIADO_PARA_WSL_COM_HASH`, `SCRIPT_COPIADO_SHA256=CONFERIDO`, `SINTAXE_BASH=APROVADA`, `FIM_DO_SCRIPT=CONFERIDO`, `CODIGO_LINUX=0`, `RESULTADO=AUDITORIA_ESTRUTURAL_LOCAL_APROVADA`; arquivos temporarios WSL/Windows removidos.
- Auditoria somente leitura em PostgreSQL 17 local: `DB=meg_restore_drill`, `ROLE=m_vil`, `TRANSPORTE=LOCAL_SOCKET`, `SOCKET=UNIX_PEER_POSTGRES`, `READ_ONLY=on`, `PG_MAJOR=17`. **Dados agregados:** `TABELAS_PUBLIC=32`, `CORE_TABLES=3`, `USER_REGISTROS=2`, `APPSTATE_REGISTROS=1`, `FINANCIAL_EVENT_REGISTROS=6576`, `CHAVES_PRIMARIAS=32`, `CHAVES_ESTRANGEIRAS=52`, `CONSTRAINTS_NAO_VALIDADAS=0`, `INDICES_INVALIDOS_OU_NAO_PRONTOS=0`. Sem dados de linhas/valores exibidos.
- **Gates aprovados para o domínio `public`:** backup criptografado age local autenticado e verificado por hash; copia externa OneDrive conferida por hash (origem Web declarada pelo operador, nao provada diretamente pelo verificador); restore real `public` 32/32 em banco WSL isolado; **auditoria estrutural independente sem erros de constraints nao validadas nem indices invalidos**. Esta auditoria não é teste exaustivo de referencialidade, integridade de dados de negocio, equivalencia de todas as contagens com a origem, RLS ou aplicacao de API.
- **Nao foi executado na V4:** `pg_dump`, `pg_restore`, conexao Supabase, Vault, merge, deploy ou alteracao. Nao repetir backup/restore. O banco local contem dados financeiros reais e requer protecao.
- **Pendencias criticas (Etapa 09 permanece aberta / NO-GO):** testes funcionais das regras financeiras centrais, chave-raiz Vault em custodia separada, Auth/Storage/config Supabase gerenciados, backups de configuracoes/segredos externos, postura Render e cota Egress, automacao/retenção e gates de promocao. PR #666 permanece Draft; nenhum merge ou deploy autorizado.


## 12/11/2026 | Etapa 09 — diagnóstico financeiro de invariantes somente leitura preparado
- O usuario autorizou continuar com `AVANÇAR` apos restauracao real do dominio `public` e auditoria estrutural V4 aprovada (32 tabelas, 32 PK, 52 FK, 0 constraints nao validadas, 0 indices invalidos). **Nao autorizou mutacoes, producao, nova exportacao/restauracao, Vault, merge ou deploy.**
- Auditados os modulos canônicos do repositório: `financial-policy.ts`, `amount-sign.ts`, `opening-balance.ts`, `monetary-protection.ts`, `read-model.ts`, `transfer-core.ts`, `transfer-service.ts`, `benefit-event-mutation.ts`, esquema Prisma das entidades `FinancialEvent`, `Account`, `PaymentMethod`, `LedgerEntry`, `CardPurchase`, `CardInstallment`, `Payable` e `CloudMutationReceipt`. **Nao foi recalculado saldo nem reimplementada qualquer regra na Web.**
- Novo roteiro em PR #666 Draft `scripts/meg-stage09-audit-financial-invariants.sh`, blob oficial `1eec94cdc08c77c482bfcc057d8856568bf707e1` igual ao Git blob verificado do Bash incluido no artefato Windows `/mnt/data/MEG-ETAPA09-DIAGNOSTICO-FINANCEIRO-LOCAL-V5.ps1`, SHA-256 do Bash `d7839b0c5ff1f3d35727dbf233292da0529a5ae87f1bca73a490a335b662a326`.
- Executor PowerShell 5.1 V5 **preparado e nao executado no notebook**. Transfere Bash por arquivo UTF-8 (sem stdin/base64), SHA-256 Windows/WSL, modo 0600, `bash -n`, marcador EOF; limpa temporarios em `finally` e copia relatorio ao clipboard. Bash restringe a `m_vil`, `17/meg_restore`, socket Unix local com owner `postgres`, `PGREQUIREPEER=postgres`, `env -i`, banco `meg_restore_drill`, `default_transaction_read_only=on`, `BEGIN REPEATABLE READ READ ONLY`, statement_timeout 30s, somente SELECT/CTEs. **Sem dados de linha nem valores individuais exibidos.**
- Escopo do diagnostico: contagens agregadas de sinais/magnitude/centavos em eventos, competencia, transferencias modernas com duas pernas e soma zero, saldo inicial por evento, beneficio/Verocard, razão debit-credit, cartoes/parcelas, pendentes e recibos de mutacao. **Legados e pagamentos com juros podem gerar diferencas explicaveis**: zeros ou contagens nao nulas nao constituem sozinhos certificacao de regra financeira ou falha. Nao faz calculo de saldo e nao executa writer.
- Testes locais neste ambiente: `bash -n` do Bash exato PASS, hash Git coincide com a branch, bloqueio negativo por usuario Unix diferente sai 1, arquivo PS1 gerado/confirmado. Workflow `.github/workflows/meg-stage09-backup-safety.yml` recebeu job `financial-invariants-postgres17` com dados 100% sinteticos: testou consultas SQL reais em PostgreSQL 17 e detectou inconsistencias artificiais. No commit `c999cfca3356c9c773c044681b40e5225ba99ae8`, o job `financial-invariants-postgres17` teve **SUCCESS** e o workflow completo Backup Safety concluiu **SUCCESS**; MEG Platform CI ainda em andamento na verificacao seguinte. Nenhuma conexao Supabase ou dados reais foram utilizados no CI.
- **Proximo passo:** usuario executa apenas `MEG-ETAPA09-DIAGNOSTICO-FINANCEIRO-LOCAL-V5.ps1` no Windows PowerShell 5.1 e compartilha relatorio de contagens, sem arquivos privados. Interpretar metricas versus contratos canônicos; eventuais divergencias devem ser reportadas sem correcao automatica. **A auditoria funcional dos servicos canônicos e a recuperacao integral Supabase (Vault root key, Auth/Storage/config) continuam pendentes.** PR #666 Draft, sem merge/deploy; Android e regras preservados.


## 12/11/2026 | Etapa 09 — V5 executada; anomalias agregadas requerem triagem, não correção
- **Relatorio do usuario em 12/11/2026 03h52min34s (America/Sao_Paulo)**: V5 `MEG-ETAPA09-DIAGNOSTICO-FINANCEIRO-LOCAL-V5.ps1` concluiu com `CODIGO_LINUX=0`, `RESULTADO=DIAGNOSTICO_FINANCEIRO_LOCAL_EXECUTADO`. Fonte apenas `meg_restore_drill` PostgreSQL 17 WSL, usuario `m_vil`, Unix socket, `READ_ONLY=on`; hash e sintaxe Bash confirmados, temporarios apagados. Nao houve Supabase, `pg_dump`, restore, Vault, merge ou deploy; **nenhum writer ou regra financeira API executada**.
- **Fotografia V5:** `EVENTOS_TOTAL=6576`, `EVENTOS_ATIVOS=3731`. Foram identificados **38 eventos ativos `type=expense` com `signedAmount>0`**, **140 eventos ativos com `amount` ou `signedAmount` maior que precisao de centavos**, e **5 eventos ativos cuja `competence` difere do mes extraido da data**. Requerem classificacao por status, categoria financeira canonica, origem legada e historico, **sem tratar como erro confirmado** nem executar ajustes.
- **Outras metricas V5:** receitas negativas 0; magnitudes divergentes 0; `transfer` sem ID moderno 0, grupos modernos 0, grupos suspeitos 0 (zero grupos = **ausencia de evidencia para testar transferencias, nao prova de funcionamento**); saldo inicial `opening-balance:` ativo 0 (o codigo admite fallback legado); eventos em conta beneficio 315, Verocard fora da conta beneficio 0; razao 219 lancamentos, sem valor negativo, sem debito+credito simultaneos e sem ambos zero; parcelas de cartao 23, sem anomalias na soma/numeracao/valor parcial; payables 0 (**dominio sem amostra funcional**); 254 recibos de mutacao. **Ninguem deve inferir saldos validos ou regras canônicas homologadas dessas contagens.**
- **Analise de codigo confirmado:** `apps/api/src/modules/finance/amount-sign.ts` normalmente gera sinal negativo para despesa com entrada positiva, mas recebe parametro de entrada numerico que pode ter sido negativo; `financial-policy.ts` exclui beneficio de saldo monetario e exige status `paid|reconciled|confirmed` para realizacao; `opening-balance.ts` possui fallback para saldos iniciais legados. A interpretacao das 38/140/5 sem subgrupos ainda e inconclusiva.
- **Proximo diagnostico apenas leitura preparado nesta conversa (NAO executado no notebook):** `MEG-ETAPA09-TRIAGEM-FINANCEIRA-LOCAL-V6.ps1` em artefato local, com fonte Bash SHA-256 `c83a44045f48cc8b2673f10b3f05e191479d604f405749e2a256d50e99a24084`. Usa transporte V5 via arquivo UTF-8 temporario, hash Windows/WSL, modo 0600, `bash -n`, marcador final; WSL somente `m_vil`/cluster `17/meg_restore`/socket Unix peer, `env -i` com `PGOPTIONS=default_transaction_read_only=on` e `BEGIN REPEATABLE READ READ ONLY`. Classifica as 38 despesas positivas por status/beneficio estimado/legado/ledger; 140 subcentavo por dominio e status; 5 diferencas de competencia por tipo e origem; inventaria potencial de fallback de saldo inicial. **Sem nomes, valores, identificadores, conteudo de linhas, SQL de escrita ou segredos.** Marcadores de beneficio sao aproximações baseadas no codigo, nao execucao da API.
- **Gates deste artefato V6:** Bash `bash -n` OK; wrapper PowerShell gerado reaproveitando o metodo V5 efetivamente executado pelo usuario; hash do Bash embutido igual ao arquivo; transferencia de arquivo real/PowerShell 5.1 e SQL PostgreSQL 17 **nao executados nem certificados nesta sessao para V6**. Não promover V6 a validado até relatorio real. V6 ainda nao foi commitado ao GitHub para evitar supor que testes sintéticos V5 cobrem o novo roteiro.
- **Estado:** recuperacao estrutural do schema `public` continua comprovada; diagnostico V5 concluido e triagem critica pendente; testes funcionais dos servicos canonicos, guarda de chave raiz Vault, schemas gerenciados Supabase, Render e Egress permanecem pendentes. PR #666 Draft, sem merge/deploy, Android preservado.


## 12/11/2026 | Etapa 09 — V6 triagem agregada concluida; estorno legado confirmado como contrato no codigo
- Relatorio operador **12/11/2026 04h08min22s**: `VERSAO_AUDITORIA=6`, `CODIGO_LINUX=0`, `RESULTADO=TRIAGEM_FINANCEIRA_LOCAL_EXECUTADA`, `READ_ONLY=on`, PostgreSQL 17 socket Unix local `meg_restore_drill`, hash/sintaxe/EOF/limpeza conferidos; sem banco Supabase, dump, restore, Vault, alteracao, merge ou deploy. **Nenhuma regra da API foi executada**.
- Base V5 coerente, 3731 eventos ativos: **38 despesas com `signedAmount>0`**, todas realizadas, classificadas monetarias pela aproximacao da politica, todas `legacyTransactionId` presente, 0 beneficio, 0 metodo credito, 2 com `LedgerEntry`, 0 sem conta. **140 eventos subcentavo**, 125 realizados, 106 realizados monetarios estimados, 19 beneficio estimado, 15 nao realizados, 138 com ID legado, 7 com LedgerEntry, 139 com mais de 4 casas; ambos os campos amount/signedAmount fracionarios. **5 competencias diferentes do mes da data**, todas realizadas e sem ID legado, 0 metodo credito, 0 beneficio estimado, sem intersecao com os outros dois achados.
- Saldos iniciais: 0 contas com `openingBalance` diferente de 0, 0 fallback potencial, 0 eventos `opening-balance:` (nao e prova de Writer executado). 0 transferencias ativas e 0 Payable => dominios **sem amostra**, nao homologados.
- **Diagnostico do codigo da branch:** `apps/api/src/modules/app-state/normalization-migration-core.ts` documenta e implementa que `amount` negativo em despesa do legado representa **estorno/credito de despesa**, preservando `signedAmount` positivo, inclusive quando `expenseAmount` guarda absoluto. `normalization-migration-core.test.ts` possui testes com `refund` e `legacyRefundWithAbsoluteExpense` que comprovam o contrato; `apps/api/src/modules/finance/amount-sign.test.ts` aceita `financialAmountValues('expense', -89.9)` => `signedAmount=+89.9`. Portanto 38 positivos sao **compativeis** com o contrato, nao corrigir sinal sem confirmar sourcePayload de cada caso. `financial-policy.ts` conta estorno monetario realizado em balanco assinado e agrega como reducao de despesa.
- A rotina de migracao converte os valores da fonte com `Number(...)` e usa `Math.abs`, **nao aplica arredondamento por lancamento**, podendo explicar precisao subcentavo legada; `read-model.ts` e `monetary-protection.ts` aplicam arredondamento em agregados. Os 140 registros nao provam desvio de saldo: risco de diferenca por arredondamento permanece a investigar. `event-mutation.ts` aceita `competence?: string` e grava `input.competence || input.date.slice(0,7)`, assim competencia divergente pode ser intencional; 5 casos reais ainda necessitam verificacao sem revelar dados.
- **Status correto:** V6 diagnostico de dados aprovado sem alteracoes; regras financeiras API e integrações **NAO HOMOLOGADAS**. Proibido alterar dados automaticamente, forc̣ar valores a duas casas, inverter estornos ou igualar competencias sem trilha de origem e teste caracterizacao. Recuperacao estrutural public comprovada; Vault, Auth/Storage/config gerenciados, Render, Egress, rotina backup continuam pendentes. PR #666 Draft NO-GO.


## 12/11/2026 | Etapa 09 — V7 leitura de origem legado/precisao pronta para verificacao
- **V6 homologada apenas como triagem de dados em somente leitura:** relatório do operador 12/11/2026 04h08min22s, código 0. V5 e V6 consistentes; os 38 positivos são todos `expense` realizados com ID legado, os 140 subcentavo são 138 legados/2 não legados e os 5 desvios de competência são não legados. Código `normalization-migration-core.ts` e testes `normalization-migration-core.test.ts` confirmam que despesas legadas negativas podem ser estornos com `signedAmount` positivo; `amount-sign.test.ts` comprova valor negativo de despesa como crédito. `event-mutation.ts` permite competência explícita. **Não há autorização nem justificativa para corrigir sinal, arredondar 140 eventos ou alinhar 5 competências.**
- Artefato entregue na conversa, **NAO commitado e NAO executado no notebook**: `MEG-ETAPA09-CONFERENCIA-ORIGEM-PRECISAO-V7.ps1` (SHA256 completo do PS1 `48ce82a21d86b7239c3571735c9e0eddeb71c2a41df299778a2c98507f717d92`; SHA256 Bash embutido `8a64b56bcd95ad9448301efe68bb97032a63522138d63642d894b246d02edf94`). Reutiliza envoltorio de transporte Windows->WSL V6 validado pelo usuario: arquivo UTF-8 privado, SHA-256 Windows/WSL, permissão 0600, `bash -n`, marcador EOF e remoção no `finally`.
- **Perguntas da V7:** quantos dos 38 positivos possuem `sourcePayload.amount` ou `sourcePayload.expenseAmount` originalmente negativos, quantos não têm sinal de origem reconhecível; distribuição dos resíduos subcentavo em `<=0.000001`, `(0.000001,0.001]`, `>0.001`; quantos dos 5 desajustes de competência possuem formato YYYY-MM e quais tipos são receita/despesa/outros. Saída somente contagens, sem nomes, datas particulares, ids, valores, logs ou JSON. Não identifica legitimidade individual nem reimplementa regra financeira central.
- Segurança: somente WSL `Ubuntu-24.04` / usuário `m_vil` / PostgreSQL 17 cluster `17/meg_restore` / socket Unix pertencente a `postgres` / `PGREQUIREPEER=postgres` / banco `meg_restore_drill`; `env -i`, `default_transaction_read_only=on`, `BEGIN REPEATABLE READ READ ONLY`, somente `SELECT`/CTEs, sem `pg_dump`, `pg_restore`, Vault, Supabase, merge/deploy. Se baseline 38/140/5 mudar, sinaliza divergência sem correção.
- Verificações **neste ambiente e não no notebook:** `bash -n` PASS, guarda de usuário Unix incorreto exit 1, marcador de EOF e heredoc SQL íntegros, SQL contém apenas BEGIN/SELECT/WITH/COMMIT; **não foi executado PostgreSQL 17 com SQL real nesta preparação**, portanto V7 não homologada. Aguardar relatório local do operador para qualquer conclusão.
- Os gates de regras financeiras executadas continuam pendentes, bem como Vault root key e Supabase gerenciado, Render e Egress; PR #666 Draft, Android intocado e sem merge ou deploy.


## 12/11/2026 | Etapa 09 — V7 bloqueada por socket PostgreSQL local ausente
- Relatório do operador de **12/11/2026 06h16min38s America/Sao_Paulo**: `VERSAO_AUDITORIA=7`, script temporario transferido e validado por SHA256, `bash -n` aprovado, marcador EOF conferido; `CODIGO_LINUX=1`, `ERRO_ORIGEM=SOCKET_LOCAL_NAO_ENCONTRADO`; `RESULTADO=CONFERENCIA_LOCAL_NAO_CONCLUIDA_SEM_ALTERACOES`. Temporarios Windows/WSL apagados. **Sem consultas SQL, acesso Supabase, pg_dump, pg_restore, Vault, merge/deploy ou alteração de dados**.
- A V7 verifica antes do SQL que `/var/run/postgresql/.s.PGSQL.5432` exista e seja socket real, não symlink. Falha pode indicar cluster `17/meg_restore` desligado ou socket em caminho diferente; **não comprova perda do banco restaurado**, tampouco comprova que cluster foi desligado. Nenhuma anomalia V5/V6 foi corrigida; V7 não homologada.
- **Proximo gate seguro:** diagnosticar separadamente e somente leitura `wsl.exe -d Ubuntu-24.04 -u m_vil --exec /usr/bin/pg_lsclusters -h`, verificar `pg_conftool 17 meg_restore show listen_addresses` e `stat -c '%U %F' /var/run/postgresql/.s.PGSQL.5432`. Não presumir socket/TCP nem iniciar cluster sem confirmar a configuração local (sem listener TCP). Se cluster estiver DOWN e a configuracao exclusiva Unix socket confirmada, opcionalmente iniciar **somente** o cluster `17/meg_restore` no WSL e revalidar; não criar DB, não reexecutar backup/restore. Se estado nao corresponder, parar e examinar.
- PR #666 permanece DRAFT NO-GO e Android intacto. Homologacao funcional, Vault root key, Supabase gerenciado, Render e Egress seguem pendentes.


## 12/11/2026 | Etapa 09 — causa da indisponibilidade do socket confirmada: cluster DOWN
- **Relatorio do usuario posterior ao V7:** `CODIGO_CLUSTER=0`, `ESTADO_CLUSTER=17 meg_restore 5432 down postgres /var/lib/postgresql/17/meg_restore /var/log/postgresql/postgresql-17-meg_restore.log`, `CODIGO_CONFIG=0`, `LISTEN_ADDRESSES=listen_addresses = ''`, `SOCKET_EXISTE=False`, nenhuma alteração. **Causa imediata confirmada: cluster PostgreSQL 17 local `17/meg_restore` parado, com socket ausente**. `listen_addresses=''` significa sem listeners TCP conforme configuração principal. O motivo pelo qual o cluster parou não está confirmado (suspensao/reinicio de WSL é apenas hipótese).
- Não reinicializar nem recriar cluster, não alterar configuração e não executar backup/restore, sem acesso a Supabase. Autorizar apenas **partida operacional do cluster local já existente** pela conta `root` do Ubuntu, `pg_ctlcluster 17 meg_restore start`, **somente se preflight novo confirmar down e `listen_addresses=''`** e `unix_socket_directories` contiver somente `/var/run/postgresql` (equivalente a `/run/postgresql`). Após partida: `pg_lsclusters` online, socket real owned by postgres, confirmação da ausência de listeners TCP, antes de voltar à auditoria V7 read-only. Se falhar, recolher status e metadados, não repetir start cegamente.
- Restauração do schema `public`/auditorias estruturais V4 e dados V5/V6 seguem comprovadas em momentos anteriores. V7 permanece **não concluída**; a parada do processo não demonstra perda dos arquivos persistidos. Sem merge ou deploy; PR #666 Draft.


## 12/11/2026 | Etapa 09 — cluster PostgreSQL local reativado, V7 pode ser repetida
- **Relatorio do operador, 12/11/2026:** `ESTADO_ANTES=17 meg_restore 5432 down postgres /var/lib/postgresql/17/meg_restore /var/log/postgresql/postgresql-17-meg_restore.log`, `CODIGO_INICIALIZACAO=0`, `ESTADO_DEPOIS=17 meg_restore 5432 online postgres /var/lib/postgresql/17/meg_restore /var/log/postgresql/postgresql-17-meg_restore.log`, `SOCKET_EXISTE=True`, `RESULTADO=CLUSTER_LOCAL_REATIVADO`, `SEM_RESTORE=SIM`, `SEM_CONEXAO_SUPABASE=SIM`. Antes do start, script validou `listen_addresses = ''` e `unix_socket_directories` local; partida somente do cluster `17/meg_restore`, sem modificar dados financeiros. A causa imediata da falha V7 anterior (ausencia de socket com cluster down) foi sanada.
- **Proximo passo:** repetir somente o artefato V7 previamente entregue `MEG-ETAPA09-CONFERENCIA-ORIGEM-PRECISAO-V7.ps1` na maquina do usuario. O script copia automaticamente seu relatorio via `Set-Clipboard`. **Nao repetir V4/V5/V6, nao efetuar dump, restore, acesso Supabase, Vault, merge ou deploy.** A V7 permanece nao homologada ate relatorio real do operador com `CODIGO_LINUX=0`.
- PR #666 Draft e NO-GO; auditoria estrutural V4 e triagem V5/V6 continuam comprovadas; recuperacao integral Supabase e testes funcionais canônicos continuam pendentes.


## 12/11/2026 | Etapa 09 — V7 repetida: socket ausente; executor V8 com partida/consulta em mesma sessão
- **Novo relatorio do operador em 12/11/2026 06h50min20s:** V7 `CODIGO_LINUX=1`, `ERRO_ORIGEM=SOCKET_LOCAL_NAO_ENCONTRADO`, `RESULTADO=CONFERENCIA_LOCAL_NAO_CONCLUIDA_SEM_ALTERACOES`; Bash transferido e verificado SHA-256/sintaxe/EOF, temporarios apagados. **Sem SQL executado, Supabase, dump, restore, Vault, merge ou deploy.** Isso ocorreu mesmo apos o start do cluster `17/meg_restore` ter sido registrado como `online` e socket existente na execucao anterior. Causa da nova parada/indisponibilidade entre sessoes WSL **NAO comprovada** (encerramento de distribuicao ou parada de servico sao hipoteses).
- Inspecao do executor V7 entregue constatou que ele verifica `/var/run/postgresql/.s.PGSQL.5432` antes de executar SQL e nao tenta iniciar o cluster. Como `wsl.exe` e chamado repetidamente para transferencia, verificar estado na chamada anterior nao garante persistencia ate a chamada seguinte.
- **Artefato V8 local, NAO executado no notebook:** `/mnt/data/MEG-ETAPA09-ORIGEM-PRECISAO-AUTOCLUSTER-V8.ps1`, SHA-256 `94e6de47799b2df75b46581b4903b3937ebc9024d01f6bdd5701aa3c20a1b300` (23.492 bytes). Preserva as consultas agregadas da V7, adiciona `TCP_EFETIVO=DESABILITADO` como check no SQL, copia dois arquivos Bash temporarios com hashes conferidos: auditoria m_vil `/home/m_vil/.meg-financial-origin.XXXXXXXX` (SHA-256 embutido `1ea708027edc99ed40b897b255466d39f7b1985d09fbc1b098d2813be729e6bc`), e inicializador root privado `/root/.meg-stage09-launcher.XXXXXXXX` (SHA-256 embutido `6b0bf6736273a10a732d5621a330a76e6f473c50c471e185fd310446045c0919`). Verifica proprietario root:600, hash e sintaxe do launcher; proprietario m_vil:600 e hash da auditoria. **Nao executa arquivo editavel por m_vil como root.**
- O inicializador executado **uma unica vez** no WSL como root: (1) exige `listen_addresses = ''` e `unix_socket_directories` local, identidade `17 meg_restore 5432 postgres /var/lib/postgresql/17/meg_restore`; (2) se `down`, chama **uma vez** `pg_ctlcluster 17 meg_restore start`, ou aceita `online` sem reiniciar; (3) exige cluster `online` e socket real owner postgres; (4) `exec runuser -u m_vil -- /bin/bash` no auditor cujo hash foi validado. Todas as consultas usam PostgreSQL 17 socket Unix, `PGREQUIREPEER=postgres`, `env -i`, `PGOPTIONS=default_transaction_read_only=on` e `BEGIN REPEATABLE READ READ ONLY`, resultados agregados sem dados individuais. **Partida operacional do serviço pode escrever metadados internos PostgreSQL, mas auditoria nao realiza mutacoes financeiras**.
- Segurança e verificacoes da V8 **somente neste ambiente isolado**: Bash auditor `bash -n` PASS; Bash launcher `bash -n` PASS; auditoria SQL tem apenas BEGIN/SELECT/CTEs/COMMIT, sem verbs de escrita; launcher exige modelo restrito e muda usuario; delimitadores PowerShell inspecionados; teste negativo do launcher para caminho invalido recusou com exit 1. **Nao houve ensaio da V8 em Windows PowerShell 5.1 / WSL / banco PostgreSQL do operador nem prova de persistencia do servidor entre comandos**. Copia relatorio para clipboard como V7.
- **Estado:** V4 estrutural e V5/V6 triagens de dados continuam comprovadas. V7 nao concluida e V8 preparada para substituir nova tentativa V7 isolada. Nao repetir backup/restore nem alterar dados, automacoes ou configuracoes WSL; se V8 falhar no mesmo boot ou reportar configuracao divergente, interromper e diagnosticar logs/estado sem insistir. PR #666 Draft, sem merge/deploy; testes funcionais API, Vault root key, Auth/Storage/config Supabase, Render/Egress pendentes.


## 12/11/2026 | Etapa 09 — V8 executada: origem legada confirmada e residuos subcentavo classificados
- **Evidencia do operador, 12/11/2026 06h59min28s**: `VERSAO_AUDITORIA=8`, `CODIGO_LINUX=0`, `RESULTADO=CONFERENCIA_ORIGEM_PRECISAO_EXECUTADA`, `RESULTADO_WSL=ORIGEM_PRECISAO_LOCAL_CONCLUIDA`. Transporte temporario SHA256/sintaxe/EOF aprovados, launcher privado root com hash e sintaxe conferidos, temporarios root/Windows/WSL removidos. `CLUSTER_ANTES=down`, `PARTIDA_LOCAL=CODIGO_0`, `CLUSTER_DEPOIS=online`, `SOCKET_LOCAL=VALIDADO`; em **mesma sessao WSL** auditoria PostgreSQL 17 `meg_restore_drill`, role `m_vil`, Unix socket local, `READ_ONLY=on`, `TCP_EFETIVO=DESABILITADO`; nenhuma conexao Supabase, `pg_dump`, restore, Vault, merge ou deploy. Servidor PostgreSQL pode atualizar arquivos operacionais na partida, **mas a auditoria nao modificou dados financeiros**.
- **V8 confirmou baselines V6:** `DESPESA_POS_TOTAL=38`, `DESPESA_POS_LEGADO=38`, `DESPESA_POS_SOURCE_AMOUNT_NEGATIVO=38`, `DESPESA_POS_SOURCE_EXPENSE_NEGATIVO_SEM_AMOUNT_NEG=0`, `DESPESA_POS_ORIGEM_SEM_SINAL_NEGATIVO_IDENTIFICADO=0`, `DESPESA_POS_SOURCE_PAYLOAD_AUSENTE=0`. Os 38 eventos sao compatíveis com contrato de estorno do `normalization-migration-core.ts` e testes existentes; **nao inverter sinais**. Confirmacao de legitimidade individual nao foi feita; os numeros agregados nao a substituem.
- `SUBCENT_TOTAL=140`, `SUBCENT_LEGADO=138`, `SUBCENT_NAO_LEGADO=2`, `SUBCENT_REALIZADO_MONETARIO_ESTIMADO=106`, `SUBCENT_RESIDUO_ATE_UM_MICRO=139`, `SUBCENT_RESIDUO_ENTRE_UM_MICRO_E_0_001=1`, `SUBCENT_RESIDUO_SUPERIOR_A_0_001=0`. **Subcentavo pode provocar diferencas de arredondamento conforme ordem de somas e conversao Decimal/Number**, porem nenhuma divergencia efetiva de saldo foi calculada/comprovada. Os 2 casos nao legados merecem revisao de origem, sem presumir terem sido escritos pela API. Nao arredondar os registros automaticamente.
- `COMPETENCIA_DIVERGENTE_TOTAL=5`, `COMPETENCIA_DIVERGENTE_NAO_LEGADA=5`, `COMPETENCIA_DIVERGENTE_FORMATO_VALIDO=5`, `COMPETENCIA_DIVERGENTE_TIPO_RECEITA=4`, `COMPETENCIA_DIVERGENTE_TIPO_DESPESA=1`, `COMPETENCIA_DIVERGENTE_OUTROS_TIPOS=0`. O campo `competence` e opcional na API e pode ser informado diferente da data; validar intencao de origem antes de qualquer ajuste, **sem igualar competencia automaticamente**.
- **Resultado aprovado:** V8 **diagnostico agregado de origem e precisao** executado com seguranca; recuperacao estrutural e dados public consultaveis localmente permanecem comprovados. **Nao homologados:** legitimidade individual dos estornos, precisao funcional de saldos, calculos e writers da API, transferencias/pagamentos sem amostra, regras de beneficio/cartao/fatura e recuperacao integral de infraestrutura Supabase. Backup age, Vault root key, Auth/Storage/config gerenciados, cota Egress e Render continuam gates separados.
- **Proxima prioridade sem novos ciclos repetitivos de SQL de dados reais:** ensaios de caracterizacao OFFLINE das autoridades canonicas com casos sinteticos de estorno negativo, competencias customizadas, valores com mais de 2 casas, transferencias conservativas, pagamentos e beneficios. Registrar quaisquer falhas antes de propor mudancas. Nao executar escritores contra `meg_restore_drill` nem alterar producao; PR #666 segue Draft, NO-GO para merge/deploy, Android intocado.


## 12/11/2026 | Etapa 09 — gates financeiros canonicos OFFLINE adicionados na PR #666
- **Autorizacao do usuario:** "vamos prosseguir" depois de V8 de 12/11/2026 validada. Nenhuma modificacao em Android, Web, API financeira executavel, banco restaurado WSL, Supabase producao, Vault, Render; sem merge/deploy.
- **Auditoria de precedentes:** `docs/MEG-WEB-FINANCIAL-AUTHORITY.md`; ja existiam `financial-policy.test.ts`, `monetary-protection.test.ts`, `transfer-core.test.ts`, `card-statement-canonical.test.ts`, `benefit-event.contract.test.ts`, `payables/core.test.ts`, `normalization-migration-core.test.ts` e `web-evolution-characterization.test.ts`. Nao implementar regras alternativas nem reclassificar dados reais: expandir somente caracterizacao OFFLINE de funcoes efetivas.
- **Arquivos criados/alterados na PR #666 Draft `stage09/backup-recovery-kit-20261110`:** `apps/api/src/modules/finance/stage09-restored-financial-characterization.test.ts` criado; `apps/api/package.json` adicionou `tsx .../stage09-restored-financial-characterization.test.ts` ao final do `test:finance`; `docs/MEG-STAGE09-BACKUP-RECOVERY-RUNBOOK-20261110.md` documenta escopo/gates. Scripts financeiros de producao NAO modificados; não conectado Prisma, API, banco ou rede.
- **Casos novos com dados 100% sintéticos:** estorno legado preservando sinal de origem negativo e `signedAmount` positivo; evento com subcentavo sem arredondamento individual; observação de discrepância potencial entre arredondamento individual e agregado; `summarizeMonetaryEvents`; benefício/Verocard excluido do caixa monetario; status de receita e cartão; competência explícita distinta da data aceita pelo schema/write contract; fatura com credito e saldo credor; saldo remanescente parcial; transferência bilateral conservativa + bloqueios; saldo insuficiente em centavos e vencimentos/recorrencia. **Este teste executa funcoes puras reais, não simula algoritmos financeiros; os IDs e valores sao ficticios**.
- **Gates pendentes:** concluir `MEG Platform CI` no HEAD atual da PR e confirmar teste `test:finance` verde. Este bloco não testa writer/atomicidade/idempotência em banco, conexão ao `meg_restore_drill`, equivalência de saldos reais, RLS/Auth/Storage Supabase, Vault root key, Render/Egress. Etapa 09 continua NO-GO e PR #666 Draft.


## 12/11/2026 | Etapa 09 — caracterizacao financeira canonica OFFLINE aprovada na CI
- **Trabalho autorizado após V8:** novo teste de caracterização `apps/api/src/modules/finance/stage09-restored-financial-characterization.test.ts`, registrado em `apps/api/package.json` `test:finance`. **Somente dados sintéticos.** Chamadas efetivas às funções puras canônicas de estorno legado, política monetária/Verocard, subtentavos e arredondamento agregado, competência explícita, efeito crédito na fatura e seu estado aberto versus pago, remanescente de parcela, transferência conservativa e proteção de centavos/calendário. Nenhum writer, produção, WSL restaurado, Android, nova Web, Supabase, Render ou Vault alterados.
- **CI inicialmente falhou** no teste NOVO, por expectativa equivocada: evento de cartão com status `paid` compunha créditos históricos, mas não `creditBalance` aberto. A massa sintética foi corrigida para caracterizar `paid` e `planned` separadamente. **Nenhum código financeiro de produção foi alterado**. A correção está no commit `22c67b78c4495b3deb598215dafc2cc509bc9601`.
- **Evidência aprovada:** no commit citado, `MEG Platform CI` [run 43197995593](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43197995593) **SUCCESS**, incluindo linha `Stage09 OFFLINE canonical financial characterization: PASS (synthetic only)`, testes financeiros e builds. `MEG Stage09 Backup Recovery Safety (offline)` [run 43197995738](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43197995738) SUCCESS; `MEG API Etapa 09 CORS` [run 43197996019](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43197996019) SUCCESS; `MEG Web Evolution Foundation` SKIPPED, sem equivaler a gate visual.
- **Novo gate APROVADO com limites:** comportamento de funcoes puras com dados artificiais. A precisão efetiva de saldos no PostgreSQL, transações financeiras serializáveis, idempotência, concorrência, payables e benefícios writers, RLS/permissões e autenticação Supabase, recuperação Vault/Auth/Storage/config, Runbook de produção, Render e Egress **permanecem NÃO VALIDADOS**. Não houve evidência nem autorização de merge/deploy. PR #666 continua Draft. **Proximo passo coerente**: ensaio dos serviços/writers em banco PostgreSQL 17 efêmero com dados sintéticos e sem segredos de produção, respeitando antes a arquitetura, ou outra pendência da Etapa 09 que seja tecnicamente menos arriscada.


## 12/11/2026 | Etapa 09 — E2E financeiro integrado PG17 efemero e concorrencia de transferencias comprovados
- **Autorizacao:** usuario solicitou continuar a Etapa 09 depois de V8 e teste de funcoes puras (todos anteriores com resultado positivo). O escopo continua **backup/recuperacao + verificacao de integridade**, sem mexer no Android, na UI Web, regras financeiras, WSL restaurado, Supabase de producao, Vault ou Render; nenhum merge/deploy permitido.
- **Novos arquivos somente teste/CI:** `.github/workflows/meg-stage09-financial-integrity.yml` e `apps/api/src/modules/finance/stage09-protected-write-e2e.test.ts`; instrucoes/evidencias adicionadas ao `docs/MEG-STAGE09-BACKUP-RECOVERY-RUNBOOK-20261110.md`. Workflow aciona PostgreSQL 17 sintético efemero no GitHub Actions com credenciais ficticias, porta local e `DATABASE_URL` fixada em `127.0.0.1:5432/meg_stage09_synthetic`; guarda de CI e nome exato da base antes de usar Prisma. Utiliza `npm ci`, `db:generate`, `db:push` SOMENTE contra esse DB descartavel. Arquivos de prod/regras/Android nao foram tocados.
- **E2E existente reaproveitado:** `apps/api/src/modules/finance/rc1-financial-e2e.test.ts` executa servicos reais de lançamento (parte em compatibilidade histórica), transferencia e beneficio e verifica entradas no razão, status, saldo, proteção de conta estrangeira, replay idempotente, bloqueio por insuficiencia, auditoria, update/archive. **Não inferir writers canônicos de cartão/pendentes a partir dele.**
- **E2E adicional de escritor protegido:** `createFinancialEventProtected` com receita realizando mesmo solicitada planned, competencia explicita diferente da data, credito de estorno com `signedAmount>0`, credito/cartao planejado sem razão, benefício proibido pelo writer financeiro genérico, operationId duplicado retorna o mesmo evento/razão/recibo, mesmo operationId com diferente conteúdo rejeitado. `createFinancialTransfer`: duas pernas conservativas e razão, saldo insuficiente bloqueado com zero eventos/recibos/auditoria. Um caso real de **concorrencia contra PG17** dispara duas transferencias de 125 com saldo total 175: somente uma confirma, a outra falha com conflito serializável ou saldo insuficiente; sem saldo negativo, duplicidade de recibos ou evento meia-perna.
- **CI evidence:** [GitHub Actions Stage09 PG17 sintético run 43200214257](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43200214257), commit testado `459e939d5976e84268e4311e0062856e6459849c`, **SUCCESS**. Logs: `RC1 financial E2E: APROVADO.` e `STAGE09_PG17_PROTECTED_WRITERS=PASS_SYNTHETIC_ONLY`, incluindo `CONCURRENT_BALANCE`. `MEG API Etapa 09 - testes pontuais CORS` **SUCCESS** no commit; `MEG Stage09 Backup Recovery Safety` também **SUCCESS**. MEG Platform CI estava em andamento na última consulta; checar HEAD mais recente.
- **Falha tecnica de teste e correção honesta:** primeira integração com PG17 passou em runtime, mas `tsc` falhou porque o novo teste acessava resultados inferidos como `unknown`. Corrigido apenas no TESTE com guardas de shape `assertFinancialEventResult` e `assertFullTransferResult`, sem modificar a API real. Nova CI CORS compilou com sucesso.
- **GATE aprovado com limites:** teste integrado real de eventos, benefício e transferência em PostgreSQL 17 fictício. NÃO testados no novo job: writers de `Payable` e faturas/cartões, concorrência exaustiva, segurança RLS/roles, equivalência funcional do restore real, secrets/config Supabase/Vault, Render/Egress e backup recorrente. Recuperação estrutural e V4/V5/V6/V8 anteriores preservadas. **PR #666 DRAFT / NO-GO para merge/deploy**, Android intocado.


## 12/11/2026 | Etapa 09 — writers Payable e fatura PG17 testados, divergência de razão #674
- **Autorização do usuário:** continuar apenas nesta Etapa 09, preservando Android, regras financeiras, ambiente Supabase, banco WSL restaurado, produção, Render, Web e PR Draft sem merge/deploy. Checkpoint anterior validava E2E com eventos, transferências e benefício em PostgreSQL 17 sintético. O novo alvo foi cobrir **writers de pendentes e cartões/faturas**, não repetir backup/restauração.
- **Arquivos criados/alterados exclusivamente na branch `stage09/backup-recovery-kit-20261110` PR #666:** `apps/api/src/modules/finance/stage09-card-payable-e2e.test.ts` criado; `.github/workflows/meg-stage09-financial-integrity.yml` ganhou etapa de execução deste teste em `postgres:17` descartável; `docs/MEG-STAGE09-BACKUP-RECOVERY-RUNBOOK-20261110.md` inclui evidências. Nenhum writer de produção ou regra financeira alterado.
- **E2E com dados integralmente fictícios:** criação de três parcelas com soma exata 100,01 e vencimentos de fim de semana; replay idempotente na criação e em baixas; bloqueio de operação ID reutilizada; pagamento parcial com principal e juros/multa separados e pagamento total; restrições de saldo insuficiente e valor acima do aberto sem recibo ou pagamento parcial; compra em três parcelas de cartão, status e meses; fatura paga parcialmente e integralmente com financeiro, razão, recibos e auditoria; cartão em método indevido e pagamento acima do aberto rejeitados; parcelas futuras preservadas.
- **Gates CI do commit de implementação `4114bf1f2037c47b84bfd28cc01233b736df2e20`:** E2E real PostgreSQL17 [run #43203221490](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43203221490) **SUCCESS** com `STAGE09_PG17_CARD_PAYABLE_WRITERS=PASS_SYNTHETIC_ONLY`; [MEG Platform CI #43203221409](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43203221409) **SUCCESS**; [Backup Safety #43203221413](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43203221413) **SUCCESS**; [CORS #43203221394](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43203221394) **SUCCESS**. Web Evolution Foundation `skipped`, não validada visualmente.
- **DIVERGÊNCIA FINANCEIRA REAL NO CÓDIGO, observada no banco fictício:** duas baixas `payPayableProtected` criaram `PayablePayment` e `FinancialEvent` realizados, mas **0 `LedgerEntry`** (log `STAGE09_PAYABLE_LEDGER_ROWS_OBSERVED=0`). `apps/api/src/modules/payables/service.ts` não chama `tx.ledgerEntry.create` na baixa. A fatura, no mesmo teste, gravou duas entradas de razão. Verificar se é exceção contratual ou lacuna contábil antes de corrigir. **Issue [#674](https://github.com/MarcosVilalva/MEG-Platform/issues/674) criada**, aberta e sem correção automática; isto impede tratar toda a integridade financeira de pendentes como homologada, apesar do status verde da CI.
- **Checklist atendido:** banco CI descartável, guardas de alvo, writer de cartão, fatura, pendente e recibos caracterizados, CI básica verde, checkpoint e runbook atualizados. **Não atendido:** resolução da divergência #674, concorrência específica de pendentes/cartões, segurança Supabase gerenciada/Auth/RLS/Storage, custódia Vault root key, segredos externos/Render/Egress, rotina de backup, retenção e alertas. Nenhuma operação foi feita no notebook, no restore local ou na produção. PR #666 permanece DRAFT / NO-GO para merge/deploy.


## 12/11/2026 | Etapa 09 — issue #674: baixa individual de pendentes passa a criar LedgerEntry (PG17 sintético)
- Usuário autorizou continuar a **Etapa 09** com pedido `seguir` após gate sintético de cartões/pendentes, quando foi observado `STAGE09_PAYABLE_LEDGER_ROWS_OBSERVED=0`. A correção ocorreu **exclusivamente** na branch `stage09/backup-recovery-kit-20261110` (PR #666 Draft), sem merge, deploy, acesso a Supabase ou ao PostgreSQL restaurado em WSL, sem Android/Web/Render modificados.
- **Auditoria antes de corrigir:** `docs/MEG-WEB-FINANCIAL-AUTHORITY.md` define `payPayableProtected` em `apps/api/src/modules/payables/service.ts` como autoridade para baixa individual e `pending-batch-settlement.ts` para lote. Os writers `payment-mutation.ts` (compatibilidade, nao roteado), `pending-batch-settlement.ts`, `cards/service.ts`, `finance/service.ts` e `event-mutation.ts` mantem `LedgerEntry` ao criar eventos realizados. Ausencia de `LedgerEntry` na baixa individual foi a **unica lacuna**, evidenciada no PG17 sintético. A regra de valor original ja era `paidTotal = principal + interestAmount + fineAmount`.
- **Alteração de produção APENAS NO CODIGO DA BRANCH, sem deploy:** `apps/api/src/modules/payables/service.ts` recebeu `tx.ledgerEntry.create` depois de `tx.financialEvent.create` e antes de `tx.payablePayment.create`, **dentro da mesma transação serializável**. Campos `eventId:event.id`, `date:event.date`, `accountId:account.id`, `debit:0`, `credit:paidTotal`, `memo:event.description`. Nenhuma fórmula de saldo, juros/multa, status, account scope, idempotência ou modelo Prisma alterado. Commit `9bbcc6e7ea9004712df3168f1cfb1968a961a201`.
- **Teste caracterizacao:** `apps/api/src/modules/finance/stage09-card-payable-e2e.test.ts` reforçado com assertivas do ledger: pagamento parcial fictício R$10,00 principal + R$0,20 juros + R$0,30 multa grava crédito R$10,50; final R$23,34 grava R$23,34; total de duas baixas R$33,84 e **exatamente 2 registros no razão**. Replays não criam razão extra; baixa recusada sem saldo grava zero. Nenhum dado real foi utilizado.
- **Evidência CI commit `9bbcc6e7`:** [PG17 integração #43204805611](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43204805611) SUCCESS com `STAGE09_PAYABLE_LEDGER_ROWS_VERIFIED=2`; [MEG Platform CI #43204805742](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43204805742) SUCCESS; [CORS #43204805796](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43204805796) SUCCESS; [Backup Safety #43204805566](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43204805566) SUCCESS. A `MEG Web Evolution Foundation` foi `skipped`, sem alegacao de validacao visual.
- **Issue [#674](https://github.com/MarcosVilalva/MEG-Platform/issues/674) atualizada, MANTIDA ABERTA** enquanto alteração não for integrada, e até auditoria separada sobre eventual legado real. NÃO realizar backfill retroativo, não limpar histórico, não alterar base restaurada/produção, não declarar etapa concluída. Outros gates da Etapa 09 continuam pendentes: concorrência específica de cartões/pendentes, Vault root key, Auth/Storage/RLS Supabase, segregação de credenciais Render, Egress, politica backup/retenção e segurança das permissões. PR #666 Draft sem merge/deploy.


## 12/11/2026 | Etapa 09 — concorrência de baixa de pendentes e faturas validada em PG17 sintético
- **Autorização do usuário:** "SEGUIR COM PROXIMA ETAPA" interpretado como próximo **gate da Etapa 09 neste chat**, conforme regra do projeto de uma etapa por chat. Não avançar para telas da Etapa 10 por esta conversa, e não dispensar gates do backup/recuperação.
- **Código e CI apenas de testes na branch `stage09/backup-recovery-kit-20261110`, PR #666 DRAFT:** criado `apps/api/src/modules/finance/stage09-payable-card-concurrency-e2e.test.ts`; alterada `.github/workflows/meg-stage09-financial-integrity.yml` para rodar o teste **cinco vezes** em workspaces fictícios independentes no banco descartável `meg_stage09_synthetic` com PostgreSQL 17 em GitHub Actions. Teste exige `CI=true`, `MEG_STAGE09_SYNTHETIC_ONLY=YES` e URL exata local antes da primeira leitura. Não usa `meg_restore_drill` do usuário ou Supabase. Nenhum writer de produção foi alterado nesta entrega.
- **Três cenários reais em banco sintético, cada um repetido cinco vezes, total 15 disputas:** (1) duas baixas de 80 no mesmo título aberto em 100, com saldo final aberto 20 e um único pagamento/evento/razão/recibo/auditoria; (2) dois pagamentos de 80 na mesma fatura aberta em 100, com apenas uma baixa, `partialPaidAmount=80` e um evento/razão/recibo; (3) writer de pendentes e writer de fatura disputando a mesma conta com saldo 100, cada um tentando consumir 80, só um pode vencer, saldo final 20, sem duplicidade. Erros de negócio previstos ou conflitos `P2034` de serialização contam como rejeição segura; o teste exige exatamente uma confirmação por disputa.
- **Evidência aprovada do commit de testes `7caa46de3d35a9aee9ef2f49aac7845531feb0a3`:** workflow [Stage09 PG17 #43206817369](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43206817369) `SUCCESS`, cinco marcadores `STAGE09_PG17_PAYABLE_CARD_CONCURRENCY=PASS_SYNTHETIC_ONLY`, `STAGE09_CONCURRENCY_STRESS=PASS_5_SYNTHETIC_ATTEMPTS`; [MEG Platform CI #43206817379](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43206817379) SUCCESS; [CORS #43206817389](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43206817389) SUCCESS; [Backup Safety #43206817409](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43206817409) SUCCESS. Foundation SKIPPED não equivale à homologação visual.
- **Gates atendidos nesta entrega:** concorrência dirigida e cruzada de pendentes/fatura no PostgreSQL 17 efêmero, sem duplicação de efeitos, sem saldo insuficiente aceito, razão e recibos consistentes; preservação da correção #674 na branch. **Gates não atendidos:** concorrência exaustiva/múltiplos nós, recuperação completa Supabase Vault/Auth/Storage/RLS/config, segredo raiz Vault, chave age offline, Render/Egress, programação/retencao de backups e reconciliação de dados reais; #674 permanece aberta até integração aprovada, sem backfill. PR #666 Draft e NO-GO de merge/deploy, Android e Web intactos.


## 12/11/2026 | Etapa 09 — auditoria de seguranca Supabase somente leitura + saude do chat
- **Escopo autorizado por "SEGUIR PARA O PROXIMO" depois do gate de concorrência da Etapa 09:** manter o chat na Etapa 09 e iniciar segurança/recuperação de Supabase gerenciado. Usuário solicitou também **avaliação periódica da saúde do chat e alerta para troca quando o histórico comprometer continuidade**, aplicável idealmente a qualquer assunto. Não existe medidor confiável de % de contexto; avisar por avaliação heurística e registrar checkpoint explícito antes de migrar. **Este chat é longo e a migração agora é recomendada**. Para alcance fora deste Projeto, o usuário precisará manter a preferência em Instruções Personalizadas e/ou memória, pois atualização neste arquivo só vincula a operação do MEG.
- **Checkpoint de progresso:** backup age real protegido/cópia e hash, restauração local `public` 32/32 e auditoria V4, V5/V6/V8, testes sintéticos de writers, cartão, pendentes e concorrência (15 disputas), correção de razão #674 somente na branch, CI anterior verdes. **Etapa 09 NÃO concluída**: guarda offline de chave age, Vault chave-raiz, Auth/Storage/RLS/config e teste de recuperação gerenciada, Render/Egress, política de backups recorrentes, reconciliação histórica e aprovação de merge/deploy pendentes. PR #666 Draft e Android/Web congelados; CI não é homologação visual.
- **Auditoria de segurança REAL, read-only no projeto Supabase meg-financas em 12/11/2026:** apenas `get_advisors(security)` e consultas `SELECT` a catálogos PostgreSQL/privileges. Nenhum registro financeiro, dado pessoal, objeto Storage ou segredo Vault foi lido. Não houve escrita, DDL, alter system, vault, CLI, pg_dump/restore, WSL, deploy ou merge. Resultado confirmado:
  - `public`: 32/32 tabelas RLS ativado, 0 com RLS desabilitado, 0 policies, 0 grants `SELECT/INSERT/UPDATE/DELETE` para `anon`/`authenticated`; os 32 avisos `rls_enabled_no_policy` são **INFO** e possivelmente representam deny-by-default em backend API Fastify JWT+Prisma, **não tratar como vulnerabilidade comprovada nem como autenticação homologada**.
  - 0 views no `public`; 1 função `SECURITY DEFINER` `meg_run_notification_watchdog`, sem EXECUTE concedido a `anon` e `authenticated`.
  - `pg_net` instalado em `public`: Supabase Advisor `extension_in_public` **WARN**, registrado para investigação [issue #676](https://github.com/MarcosVilalva/MEG-Platform/issues/676); não mover extensão sem averiguar watchdog/cron.
  - `storage`: 10 tabelas RLS, alguns grants de leitura/gravação para `anon` e `authenticated` mas zero políticas no catálogo. A existência de RLS sem políticas **não valida funcionamento do Storage**, nem justifica habilitar políticas automaticamente.
  - `auth`: 27 tabelas, 16 RLS, 11 não RLS, **zero grants diretos** aos papéis citados. `vault`: 1 tabela sem RLS, **zero grants** aos mesmos papéis. Essas são estruturas gerenciadas; **não consultar segredos nem presumir exposição baseada apenas em RLS**.
  - Consulta inicial de contagem de funções com `has_function_privilege('PUBLIC',...)` retornou erro porque `PUBLIC` não é role do catálogo; foi corrigida removendo o argumento inválido e reexecutada com `anon` e `authenticated`. Sem alterações SQL. Nenhuma conclusão tirada da tentativa que falhou.
- **Arquivos alterados nesta auditoria:** `docs/MEG-STAGE09-BACKUP-RECOVERY-RUNBOOK-20261110.md` (novos achados documentados), este `MEG-WEB-CONTINUIDADE-OFICIAL.md`. Não foram alterados API, Web, Android, schema SQL, workflows ou dados. Issue #676 apenas investigação, não fix.
- **Estado e próximos passos:** reportar riscos e pendências ao usuário; não emitir porcentagens de progresso/saúde de chat como se medidas. Preparar transição para **novo chat de Etapa 09** se houver continuação longa: ler checkpoint atual e runbook, inspeção de custódia offline age e chave raiz Vault com verificação SEM revelar segredos, e plano de recuperação dos componentes Supabase gerenciados **sem alterar produção**. Não avançar para Etapa 10 neste chat; PR #666 sem merge e deploy, #674 e #676 abertas.


## 12/11/2026 | Etapa 09 — custódia offline age e plano para Supabase gerenciado (somente documentação)
- **Ponto de partida:** PR #666 em Draft, commit `6776ca2a479a6445e6fa807252b7f5788229b1fa`, auditoria de catálogos/RLS somente leitura registrada, issues #674 e #676 abertas. Etapa 09 exclusivamente, com produção, Android, Web homologada e banco restaurado intocados.
- **Documento criado:** `docs/MEG-STAGE09-CUSTODIA-OFFLINE-RECUPERACAO-GERENCIADA-20261112.md`. Verificação local proposta da identidade age **somente com mídia física criptografada desbloqueada**, por comparação de chaves públicas em memória e desafio de descriptografia com texto SINTÉTICO. Não imprime nem envia chave privada, token ou senha; não executado no notebook do operador. Rotina documentada serve apenas para cópia de identidade age legível dentro de volume cifrado, e não para arquivo .age de identidade cifrada sem procedimento específico.
- **Runbook integrado:** `docs/MEG-STAGE09-BACKUP-RECOVERY-RUNBOOK-20261110.md` recebeu seção 7 com link e gates. Consultadas referências oficiais atuais do Supabase para backup, migração manual, Vault, Edge Functions/secrets e pg_net. Backup do PostgreSQL não inclui bytes do Storage; migração manual para outro Supabase com Vault exige chave-raiz; componentes gerenciados/configurações não são automaticamente certificados por restore de `public`.
- **Evidência preservada, SEM ampliar alegações:** arquivo real .pgdump.age e manifesto conferidos, OneDrive Web download declarado pelo operador e hash validado, restore local `public` 32/32, V4/V5/V6/V8 e testes financeiros PG17 sintéticos anteriores. OneDrive e cópia cifrada da identidade NÃO comprovam custódia física offline. Nenhuma chave Vault real foi buscada e nenhum projeto Supabase novo foi criado.
- **PENDÊNCIAS críticas:** operador atestar mídia física offline independente, disponibilidade da passphrase em outro meio, teste canário e desconexão; depois autorização separada para Vault GET/guarda e teste privado; depois eventual orçamento/autorização de projeto novo para restaurar Vault/Auth/Storage/RLS/roles/Edge Functions/Realtime/cron/extensões, sem tocar origem; além de Render/Egress, rotina de backups, #674/#676 e aprovações de merge/deploy.
- **Arquivos nesta rodada:** criado o plano de custódia; alterados somente runbook e este checkpoint. Sem API, UI, Android, workflow, scripts executáveis, DB, Supabase, Render, CI de negócio ou segredos modificados. **Status Etapa 09: EM EXECUÇÃO / NO-GO. PR #666: DRAFT, sem merge/deploy.**
- **Próximo passo autorizado:** obter do operador apenas o relatório sanitizado do teste offline de canário e as confirmações físicas de custódia. Não confundir registro do plano com execução ou homologação.


## 12/11/2026 | Etapa 09 — verificador local da custódia age preparado (não executado no notebook)
- **Base verificada:** PR #666 Draft em `7fb18f2d4109c2246a5499bcce4b15997f5e9c3e`; workflows do SHA concluídos: MEG Platform CI, Stage09 PG17 financeiro sintético, Backup Recovery Safety e CORS **SUCCESS**; Web Evolution Foundation **SKIPPED**. A confirmação da CI é estritamente técnica e não homologa recuperação de componentes gerenciados nem UI.
- **Artefato entregue nesta conversa, NÃO commitado nesta rodada:** `MEG-ETAPA09-VERIFICACAO-CUSTODIA-AGE-OFFLINE.ps1`, SHA-256 `adc4e0317fce1e9b67404eea6b8bd6b7f16dfbcc2ff2abd362a9126ab1c282b0`. Requer Windows PowerShell 5.1, WSL `Ubuntu-24.04` usuário `m_vil`, age instalado e, para teste completo, identidade privada em volume físico cifrado DESBLOQUEADO somente durante a conferência; entrada do usuário é apenas CAMINHO do arquivo, nunca segredo.
- **Operação do script:** cria temporariamente no Windows apenas um Bash ASCII sem credenciais, verifica hash Windows/WSL e `bash -n`, valida localmente permissões/identidade age, converte caminho da mídia via wslpath, compara CHAVES PÚBLICAS em memória e faz desafio age com arquivo de texto FICTÍCIO (cifrado em `/tmp` e removido ao finalizar). A saída é whitelist de estados sem chaves/caminhos/dados; copia apenas relatório sanitizado. Não consulta PostgreSQL, não restaura, não exporta banco, não acessa Vault, rede, Render ou aplicações. Inclui confirmação auto-declarada de mídia externa cifrada, custódia do desbloqueio separada e desconexão física.
- **Testes realizados nesta preparação (não na máquina do usuário):** extração da parte Bash e `bash -n` **PASS**; 5 cenários simulados com comandos `age` e `age-keygen` falsos: cópia equivalente/canário, mídia ausente, chave divergente, permissões locais inadequadas, hash incorreto, todos **PASS** no ambiente de desenvolvimento. **NÃO testados:** execução real PowerShell 5.1, WSL Windows do operador, comandos criptográficos age reais, USB/BitLocker físico. Resultados de mocks não comprovam custódia nem recuperação.
- **Status:** gate offline **PENDENTE** até usuário executar procedimento local e fornecer somente relatório de marcadores sem segredos, e atestar fisicamente a mídia. Não existe confirmação de que a mídia offline está disponível. Não executar novo `pg_dump`, Vault GET/PUT, restore, criar Supabase, modificar banco restaurado, Android, Web, Render, RLS/roles ou produção.
- **Próximo passo exato:** executar no PC do usuário o `.ps1` verificado por SHA, com mídia física externa cifrada já desbloqueada; se ainda não houver mídia, executar somente diagnóstico e registrar lacuna. Nunca copiar identidade privada, senha, backup ou token para o chat. Issues #674/#676 abertas, PR #666 Draft, NO-GO merge/deploy.


## 12/11/2026 | Etapa 09 — falha de argumento vazio PowerShell 5.1 e correção do verificador offline
- Relatório fornecido pelo operador em 12/11/2026: `ETAPA=09`, `MIDIA_FISICA=NAO_INFORMADA`, `HASH_WINDOWS_WSL=OK`, `SINTAXE_BASH=OK`, `INTEGRIDADE_TRANSPORTE=FALHA`, `TESTE_AGE=NAO_CONCLUIDO`, `CUSTODIA=PENDENTE`, e marcadores explícitos de não acesso ao banco restaurado/Supabase/Vault. **Não há validação de custódia.**
- Causa identificada na versão original do utilitário `.ps1`: Windows PowerShell 5.1 omite argumento nativo vazio `$mediaPath`, deslocando `$sha` de segundo para primeiro argumento posicional no Bash WSL. O erro é de passagem de parâmetros, e **não** prova divergência do hash Windows/WSL ou corrupção da identidade `age`.
- Utilitário local v2 **gerado como anexo na conversa, não implantado/commitado neste repositório**: `MEG-ETAPA09-VERIFICACAO-CUSTODIA-AGE-OFFLINE-v2.ps1`, SHA-256 `8e287a283d0e4eb2eebb70cf831ae26e90059703892da784cc236d237f22d064`; pacote `.zip` SHA-256 `9baddf1c21c7278c72cb6c90cf0c8ad09273b438a0c1acb9120d2802d0289ad7`. Corrige com marcador literal `__MEG_NO_MEDIA__` interpretado como vazio pelo Bash; marca `DIAGNOSTICO=LOCAL_SEM_MIDIA` quando aplicável. Mantém saída sanitizada e cópia automática para a área de transferência; preserva bloqueio de hash e conteúdo fictício.
- Testes da **parte Bash extraída** no ambiente do assistente: `bash -n` OK; (1) mídia ausente por sentinela retorna integridade OK e código esperado 10, (2) mídia de teste equivalente com comandos sintéticos `age` e `age-keygen` retorna desafio de canário OK, (3) hash inválido retorna erro esperado 2, (4) reprodução do bug da v1 confirma erro esperado 2, (5) permissões 0644 recusadas com código 5. **Não executados**: PowerShell 5.1 real após correção, WSL do operador, criptografia age real, mídia USB física, restauração ou qualquer recurso de produção.
- Próxima ação: operador baixar/verificar SHA-256 da v2 e executar localmente; como nenhuma mídia foi informada, somente diagnóstico de identidade local é possível. Depois testar cópia em mídia física externa criptografada com autorização do proprietário, sem expor nenhum segredo. PR #666 segue Draft; sem merge, deploy ou acesso produtivo nesta correção.


## 12/11/2026 | Etapa 09 — diagnóstico real do operador com verificador age v2
- Operador executou o verificador v2 no notebook Windows/WSL e forneceu **exclusivamente o relatório sanitizado** (não foi fornecido segredo). Resultado registrado: `HASH_WINDOWS_WSL=OK`, `SINTAXE_BASH=OK`, `INTEGRIDADE_TRANSPORTE=OK`, `FERRAMENTAS_AGE=OK`, `PERMISSOES_IDENTIDADE_LOCAL=OK`, `IDENTIDADE_LOCAL=OK`, `DIAGNOSTICO=LOCAL_SEM_MIDIA`.
- A correção do argumento vazio no PowerShell 5.1 foi **validada em execução real no ambiente do operador** pelo relatório: a falha anterior `INTEGRIDADE_TRANSPORTE=FALHA` não ocorreu na v2. O verificador local não expôs chaves ou dados financeiros no relatório recebido.
- **Limite comprovado**: `MIDIA_FISICA=NAO_INFORMADA`, `COPIA_MIDIA=NAO_INFORMADA`, `CANARIO_SINTETICO=NAO_EXECUTADO`, `TESTE_AGE=NAO_CONCLUIDO`, `CUSTODIA=PENDENTE`. Isto confirma a identidade local acessível, mas **NÃO** comprova cópia física ou recuperação offline independente. Não inferir inexistência de mídia, apenas que ela não foi informada ao utilitário.
- Marcadores reportados: `BANCO_RESTAURADO=NAO_ACESSADO`, `SUPABASE_PRODUCAO=NAO_ACESSADO`, `VAULT=NAO_ACESSADO`, `ALTERACOES_FINANCEIRAS=NENHUMA`. São evidência declarada pelo utilitário nesta execução, não uma auditoria externa de sistemas.
- Marcador `ARQUIVO_TEMPORARIO_SCRIPT=EXCLUSAO_TENTADA` significa que limpeza foi tentada, **não** atesta exclusão. Não realizar ações corretivas sobre dados reais por esse marcador isolado.
- **Próximo gate:** identificar mídia física independente e criptografada sob custódia do operador; somente após confirmar criptografia/desbloqueio e proteção de recuperação, testar cópia de identidade `age` por canário sintético sem copiar segredos para logs/Git/chat. Registrar atestados de custódia separada e desconexão física. Ainda não autoriza Vault GET, restauração gerenciada, alteração de produção, Android, Web, bancos, merge ou deploy. Issues #674/#676 e PR #666 Draft preservadas.


## 12/11/2026 | Etapa 09 — inventário de mídias removíveis do operador
- Operador executou `Get-Disk` no Windows, filtrando `BusType` USB/SD/MMC, com resultado sanitizado: `ETAPA=09`, `PROCEDIMENTO=INVENTARIO_MIDIA_EXTERNA`, `CONSULTA=SOMENTE_LEITURA`, `DISCOS_EXTERNOS_DETECTADOS=0`, `CRIPTOGRAFIA=NAO_VERIFICADA`, `CHAVE_AGE=NAO_ACESSADA`, `ALTERACOES=NENHUMA`.
- Interpretação restrita: **nenhum disco do tipo de barramento USB/SD/MMC foi detectado conectado durante essa consulta**. Isso não demonstra inexistência de mídias desligadas/desconectadas nem cobre outros tipos de conexão e não verifica BitLocker/VeraCrypt/outra criptografia.
- **Gates inalterados**: identidade local age passou nos controles reportados pelo verificador v2, mas a cópia física offline, o canário com identidade da mídia, a segregação do desbloqueio, a confirmação da desconexão e a recuperação Vault/Supabase gerenciado continuam **PENDENTES / NO-GO**. Não presumir cópia existente nem criar/copy segredo a volume sem criptografia.
- Próximo passo exato de custódia: disponibilizar mídia física independente adequadamente criptografada sob controle do operador; sem ela, suspender o teste de custódia e avançar apenas em inventário/planejamento **somente documental** dos componentes gerenciados. Qualquer escrita de identidade age, criação de volume cifrado, operação Vault ou projeto Supabase exige autorização específica. PR #666 segue Draft, Android, Web homologada, banco restaurado e produção intocados; sem merge/deploy.


## 12/11/2026 | Etapa 09 — pendrive E: detectado, custódia protegida ainda pendente
- Operador localizou pendrive e reportou pelo comando read-only: `DISCOS_USB=1`, `DISCO_2_CAPACIDADE_GB=7.26`, `DISCO_2_PARTICAO=MBR`, `DISCO_2_SOMENTE_LEITURA=False`, `DISCO_2_OFFLINE=False`, `DISCO_2_UNIDADE=E:`, `UNIDADE_E_SISTEMA=FAT32`, `UNIDADE_E_LIVRE_GB=1.48`, `UNIDADE_E_BITLOCKER=Off`, `UNIDADE_E_CRIPTOGRAFIA=FullyDecrypted`, `RESULTADO=CONSULTA_CONCLUIDA`, `ARQUIVOS_ALTERADOS=NENHUM`, `CHAVES_AGE_ACESSADAS=NAO`, `FORMATACAO=NAO_EXECUTADA`, `SUPABASE_PRODUCAO=NAO_ACESSADO`.
- Interpretação: existe unidade USB conectada e com espaço disponível, porém seu volume **não está criptografado**. É vedado salvar ali identidade privada `age` em claro. FAT32 sem BitLocker não constitui custódia criptografada do **volume**, mas pode armazenar **um arquivo criptografado por senha forte com `age -p`**, sem alterar os demais arquivos nem formatar a mídia.
- Operador expressamente optou por usar o pendrive encontrado. Próximo passo planejado: conferir novamente identidade física USB E: e espaço, criar somente pasta exclusiva nova com falha se existente, criptografar por senha a identidade local para `identidade.age` diretamente no USB, testar descriptografia redirecionada apenas para hash em memória, emitir relatório sanitizado automaticamente. **O plano/código não prova que a escrita ocorreu**, nem que senha de desbloqueio ficou guardada separadamente; coletar resultado real do operador.
- Manter nenhum acesso ao banco restaurado, Supabase de produção, Vault, Android, Web homologada ou Render. Atestado de custódia depende de prova criptográfica e posterior desconexão física. PR #666 Draft e issues #674/#676 preservados; sem merge/deploy.


## 12/11/2026 | Etapa 09 — tentativa de cópia age no pendrive bloqueada antes da conclusão
- Operador executou o comando de preparo da cópia `age` para pendrive `E:` e forneceu relatório sanitizado: `ETAPA=09`, `PROCEDIMENTO=CUSTODIA_AGE_USB`, `UNIDADE=E`, `RESULTADO=BLOQUEADO_ANTES_DA_CONCLUSAO`, `COPIA_CRIPTOGRAFADA=NAO_CONFIRMADA`, `TESTE_RECUPERACAO=NAO_CONFIRMADO`, `ARQUIVOS_EXISTENTES=PRESERVACAO_PREVISTA`, `SENHA_NO_RELATORIO=NAO`, `BANCO_PRODUCAO=NAO_ACESSADO_PELO_SCRIPT`, `VAULT=NAO_ACESSADO_PELO_SCRIPT`, `LIMPEZA_SCRIPT_TEMP=OK`, `CUSTODIA_FISICA=AGUARDANDO_DESCONEXAO`.
- O código anterior ocultou a exceção original em `catch` genérico. **A causa exata NÃO foi identificada.** O status indica erro no PowerShell antes da conclusão normal, sem confirmação de cópia, teste de senha, canário ou recuperação. Não deduzir automaticamente que nenhum arquivo foi criado: inspeção read-only necessária. O marcador de preservação é intenção do script, não evidência de verificação pós-execução.
- Próximo passo exato: diagnóstico read-only e sanitizado no Windows/WSL de unidade `E:` e seu tipo/saúde/espaço, existência do diretório de destino sem listar dados, disponibilidade do Ubuntu WSL e caminho WSL, permissões e presença da identidade local age, sem imprimir segredos, sem criar arquivo ou alterar banco. Só após o resultado corrigir causa e pedir autorização antes de eventual nova escrita. Não formatar, sobrescrever, mover chave privada em claro, alterar produção ou executar merge/deploy. PR #666 Draft.


## 12/11/2026 | Etapa 09 — E: visível no Windows mas não montado no WSL; alternativa UNC
- Relatório read-only do operador para pendrive: `PARTICAO_E=OK`, `CONSULTA_DISCO=OK`, `TIPO_USB=SIM`, `DISCO_OFFLINE=False`, `DISCO_SOMENTE_LEITURA=False`, `CAPACIDADE_GB=7.26`, `CONSULTA_VOLUME=OK`, `SISTEMA_ARQUIVOS=FAT32`, `ESPACO_LIVRE_MB=1514`, `PASTA_RECUPERACAO_EXISTE=False`, `ARQUIVO_CRIPTOGRAFADO_EXISTE=False`, `WSLPATH=ERRO`, `USB_MONTADO_WSL=NAO`, `USB_GRAVAVEL_WSL=NAO`, `IDENTIDADE_LOCAL_PRESENTE=SIM`, `AGE_DISPONIVEL=SIM`; sem arquivos modificados pelo diagnóstico.
- Causa operacional do bloqueio de cópia anterior: caminho de conversão Windows→WSL (`wslpath`) e montagem `/mnt/e` indisponíveis. Isso explica o gate de acesso, mas **não** explica isoladamente o motivo interno exato do `catch` PowerShell anterior, que o script havia mascarado. Nenhum arquivo final de recuperação foi detectado no USB.
- Alternativa preparada **sem executar no notebook**: gerar o arquivo `age -p` com senha e diretório temporário restrito dentro do WSL; Windows acessa **apenas o criptograma** pelo caminho `\\wsl.localhost\Ubuntu-24.04\home\m_vil\...` documentado pela Microsoft; usar `Copy-Item` somente do criptograma para `E:`; validar hash Windows/WSL, reler do USB para WSL e testar `age -d` por comparação hash em memória. Não copiar a identidade privada em claro para volume FAT32, não formatar, não montar discos nem alterar configurações do WSL. Script externo à branch gerado nesta conversa: `MEG-ETAPA09-COPIA-AGE-USB-VIA-UNC.ps1`, SHA-256 `c2a8585b40d2f0acded0530e62f85d115955e52c072b64c7f5180927113844c8`.
- Testes do novo script: as três seções Bash foram extraídas e passaram `bash -n` no ambiente do assistente, **mas execução PowerShell 5.1, acesso UNC no notebook, criptografia `age -p` real e cópia/recuperação USB continuam NÃO TESTADOS**. O script foi preparado para copiar relatório sanitizado com etapa/código de erro, independente do êxito; ainda não é comprovação de custódia.
- Próximo passo: executar procedimento local autorizado, digitando senha longa e exclusiva **apenas no terminal privado**, sem compartilhá-la no chat; validar cópia criptografada e recuperação; guardar senha em custódia separada e ejetar a mídia. Persistem gates NO-GO Vault, recuperação Supabase gerenciado e merge/deploy. PR #666 Draft, issues #674/#676 preservadas.


## 12/11/2026 | Etapa 09 — cópia age cifrada no pendrive e teste de recuperação concluídos
- **Evidência do operador, 12/11/2026**: relatório sanitizado do PowerShell `ETAPA=09`, `PROCEDIMENTO=COPIA_AGE_PENDRIVE_SEM_MONTAGEM_WSL`, `UNIDADE=E`, `RESULTADO=COPIA_CIFRADA_E_RECUPERACAO_OK`, `FASE_FINAL=RECUPERAR_DO_USB`, `ERRO=NENHUM`, `HASH_CIFRADO_USB=OK`, `RECUPERACAO_USB=OK`, `LIMPEZA_STAGE_WSL=OK`.
- Declarações adicionais do procedimento: `IDENTIDADE_PRIVADA_EM_CLARO_NO_USB=NAO_PREVISTO`, `ARQUIVOS_ANTIGOS_USB=NAO_ALTERADOS_PELO_PROCEDIMENTO`, `BANCO_RESTAURADO=NAO_ACESSADO_PELO_PROCEDIMENTO`, `SUPABASE_PRODUCAO=NAO_ACESSADO_PELO_PROCEDIMENTO`, `VAULT=NAO_ACESSADO_PELO_PROCEDIMENTO`, `CUSTODIA_FISICA=AGUARDANDO_EJECAO`. **Não inferir varredura forense de pendrive nem ausência absoluta de plaintext** a partir da declaração `NAO_PREVISTO`.
- **Gate validado por relatório de execução real:** cópia da identidade `age` cifrada por senha no pendrive USB foi gravada, hash do criptograma conferido, arquivo relido do USB e descriptografia de recuperação correspondente ao original passou; diretório de estágio WSL reportado limpo. Não houve acesso a produção ou a banco restaurado pelo procedimento.
- **Ainda pendentes para certificação da custódia:** operador atestar que a senha independente foi armazenada separadamente da mídia, ejetar com segurança e desconectar fisicamente o pendrive, confirmar armazenamento separado do notebook. Após atestados, registrar `CUSTODIA_OFFLINE=OPERACIONAL` com limite de que o volume FAT32 **não tem criptografia integral**, somente a identidade em arquivo cifrado, e que o backup SQL permanece em cópia offsite distinta. Teste periódico de recuperação segue recomendado.
- Nada de Vault GET/PUT, banco, Android, Web homologada, Render, merge/deploy. PR #666 permanece Draft e issues #674/#676 continuam pendentes. Próximo passo: ejetar via Windows e executar inventário read-only pós-desconexão com confirmação explícita, sem pedir senha ou qualquer chave.


## 12/11/2026 | Etapa 09 — atestados físicos positivos, inventário USB genérico inconclusivo
- Relatório do operador após a cópia criptografada/recuperação bem-sucedidas: `ETAPA=09`, `PROCEDIMENTO=CONFIRMACAO_CUSTODIA_OFFLINE`, `USB_WINDOWS=DISPOSITIVOS_USB_AINDA_DETECTADOS`, `REMOVIDO_FISICAMENTE=S`, `SENHA_GUARDADA_SEPARADAMENTE=S`, `PENDRIVE_GUARDADO_SEPARADAMENTE=S`, `RESULTADO=CUSTODIA_FISICA_PENDENTE`, `CHAVES_OU_SENHAS_EXIBIDAS=NAO`, `ALTERACOES=NENHUMA`.
- Há atestado explícito do operador de retirada e armazenamento segregado da senha e da mídia. **Não declarar a custódia encerrada ainda**, pois a consulta PowerShell `Get-Disk | Where BusType -eq USB` encontrou um ou mais discos USB sem distinguir o pendrive específico previamente inventariado (`DiskNumber=2`, USB, capacidade reportada 7,26 GiB, `E:`). O indicador `USB_WINDOWS=DISPOSITIVOS_USB_AINDA_DETECTADOS` NÃO prova que o mesmo pendrive ainda está conectado; pode ser outro disco USB ou persistência de identificação do Windows.
- Próximo gate restrito a leitura: reconsultar a presença de `E:`, lista de discos USB e quantidade de dispositivos USB com capacidade na faixa do dispositivo-alvo (~7,26 GiB), de forma sanitizada; sem serial, dados de volume, chaves, fotos ou senhas. Quando não houver candidato correspondente e o operador mantiver atestado físico, registrar custódia age offline operacional limitada à cópia de identidade criptografada por senha. Se houver candidato ambíguo, registrar pendência, sem forçar novo teste criptográfico ou reconexão.
- O pendrive é FAT32 sem BitLocker, mas somente o artefato `identidade.age` criptografado por `age -p` foi copiado conforme relato da execução; não confundir criptografia do arquivo com proteção integral do volume. Vault, Supabase gerenciado, PR #666 Draft e issues #674/#676 seguem sem alteração/autorização; nenhuma produção, Android, Web homologada, banco restaurado, merge ou deploy.


## 12/11/2026 | Etapa 09 — custódia offline da identidade age operacional e verificada
- **Relatório final somente leitura fornecido pelo operador**: `ETAPA=09`, `PROCEDIMENTO=VERIFICACAO_FINAL_PENDRIVE_ALVO`, `MODO=SOMENTE_LEITURA`, `DISCOS_USB_TOTAIS=1`, `CANDIDATOS_CAPACIDADE_7_26GB=0`, `UNIDADE_E_PRESENTE=False`, `RESULTADO=PENDRIVE_ALVO_NAO_DETECTADO_POR_CAPACIDADE`, `REMOVIDO_FISICAMENTE=ATESTADO_ANTERIORMENTE`, `SENHA_SEPARADA=ATESTADO_ANTERIORMENTE`, `MIDIA_GUARDADA_SEPARADAMENTE=ATESTADO_ANTERIORMENTE`, `CHAVES_ACESSADAS=NAO`, `ARQUIVOS_MODIFICADOS=NENHUM`.
- **Consolidação de evidências:** (1) criptograma `identidade.age` produzido no pendrive FAT32 E: com senha `age -p`, conforme relatório de execução anterior; (2) hash do criptograma no USB `OK`; (3) leitura e descriptografia do arquivo do USB recuperando a identidade original `OK`; (4) limpeza de estágio WSL `OK`; (5) retirada física e senha armazenada separadamente e pendrive guardado separadamente, todos `S` declarados explicitamente pelo operador; (6) consulta posterior não detectou USB com capacidade ~7,26 GiB e não encontrou unidade E:. A presença de outro disco USB não invalida a ausência do dispositivo-alvo.
- **Resultado fechado:** `CUSTODIA_OFFLINE_IDENTIDADE_AGE=OPERACIONAL_COM_EVIDENCIAS_E_ATESTADO_DO_OPERADOR`. Este aceite é **somente para a identidade age**, não para o backup inteiro nem para o Vault. Não é auditoria física independente; a identificação por capacidade e letra não equivale a serial único, mas está consistente com a retirada explicitamente confirmada. A chave privada não foi enviada ao Git/chat; o dispositivo FAT32 não tem criptografia de volume, somente arquivo cifrado por senha.
- **Restrição de segurança:** manter pendrive fisicamente desconectado e separado do notebook, senha longa guardada em local diferente; não armazenar senha no USB. Testar recuperação periodicamente em procedimento protegido, sem transcrever segredo em logs. Não reconectar a mídia ou restaurar dados agora.
- **Pendências restantes da Etapa 09:** salvaguarda da chave-raiz do Vault, inventário/recuperação dos componentes gerenciados do Supabase, estratégia recorrente de backup e gestão das issues #674/#676; exigem gates e aprovações específicos. Banco restaurado, Supabase produtivo, Android e Web homologada intocados; PR #666 permanece Draft sem merge/deploy. Próximo passo não destrutivo: revisar e preparar checklist de salvaguarda do Vault **sem executar GET ou operar segredos** até autorização específica.


## 12/11/2026 | Etapa 09 — pré-execução Vault auditada com falhas sintéticas cobertas
- Estado inicial verificado antes das modificações: PR #666 `stage09/backup-recovery-kit-20261110`, Draft aberto sem merge, HEAD `97663c4ebeaaffae668771d7f848cae11397d718`; a identidade `age` já havia passado cópia criptografada, recuperação do USB, guarda de senha separada e desconexão física. Etapa 09 continua NO-GO para recuperação gerenciada.
- Consultadas fontes oficiais Supabase de 12/11/2026: https://supabase.com/docs/guides/database/vault ; https://supabase.com/docs/reference/api/v1-get-pgsodium-config ; https://supabase.com/docs/reference/api/v1-update-pgsodium-config ; https://supabase.com/changelog.md . GET `/v1/projects/{ref}/pgsodium` é experimental/Beta e exige privilégios de segredo/administrativos; PUT/rotação pode tornar dados anteriores indecifráveis. **Nenhuma chamada GET/PUT real efetuada**.
- Revisado estaticamente `scripts/meg-stage09-safe-vault-rootkey.sh`: GET HTTPS do projeto fixo, token fornecido localmente, limites de rede, parser de JSON com `root_key` 64 hex, criptografia imediata com `age`, verificação de reabertura e manifesto SHA cifrado. Risco/gate: o script recusa destino Git, mas não consegue comprovar separação física da cópia Vault, backup SQL e identidade age; essa custódia exige escolha e atestado do operador. Não declarar exportação real aprovada apenas pelos mocks.
- Código de teste atualizado: `scripts/meg-stage09-backup-safety.test.mjs` (commit `fd47b3ccd0eef63ab70cfcd2688700cb283bdfb2`) acrescenta mocks de JSON inválido, campo ausente, comprimento inválido, resposta excessiva, HTTP falho e autenticação age recusada. Em cada falha, assert de não-publicação de arquivos e ausência de tokens/chaves nos logs. **Quatro workflows do commit de testes concluíram SUCCESS** (MEG Platform CI, Stage09 Backup Recovery Safety, Stage09 Financial Integration PG17 sintético, CORS); Foundation SKIPPED. Apenas dados sintéticos, sem Supabase real. Checar novamente CI no HEAD final.
- Documento novo: `docs/MEG-STAGE09-VAULT-ROOTKEY-READINESS-20261112.md` (commit `223d1bf5eb9787b25a4013608826b6153a56057a`): inventário, auditoria estática, autorização específica para GET real, limites de privilégio/token, custódia separada, critérios de saída sem segredos e plano de recuperação em projeto isolado. Runbook atualizado com seção 8 (commit `8c4a3f45ad275ff54a48aa01656f2af65007d63b`), corrigindo histórico de custódia age pendente na seção 7.
- **Nenhuma mudança em `scripts/meg-stage09-safe-vault-rootkey.sh` neste passo**, portanto sua execução produtiva permanece bloqueada até autorização expressa, verificação de ambiente local e decisão sobre guarda da chave cifrada. Nenhuma chave-raiz, PAT, registro `vault.secrets` ou segredo real foi lido, extraído ou exibido. Sem rebackup, restore, criação de projeto, custos, mudança do banco restaurado, Android, Web homologada, Render, merge ou deploy.
- **Próximo passo exato:** obter autorização específica para execução **apenas de GET leitura** da chave-raiz Vault em terminal privado, depois preparar destino cifrado independente e registrar evidências sanitizadas. Se não houver autorização, continuar exclusivamente pelo inventário documental dos serviços gerenciados. Issues #674/#676 permanecem pendentes; PR #666 Draft.


## 12/11/2026 | Etapa 09 — autorização de GET Vault recebida; execução local aguardando operador
- **Autorização expressa do operador**: `autorizado` após solicitação para consultar **somente GET** da chave-raiz Vault do projeto original e guardar arquivo cifrado localmente; nenhuma operação PUT, rotação de chaves, mudança de banco/produção, merge/deploy ou criação de projeto foi autorizada.
- Verificados novamente o checkpoint, script `scripts/meg-stage09-safe-vault-rootkey.sh`, runbook e prontidão Vault. Consultadas fontes oficiais Supabase em 12/11/2026: https://supabase.com/docs/reference/api/v1-get-pgsodium-config , https://supabase.com/docs/guides/database/vault , https://supabase.com/docs/guides/platform/personal-access-tokens e https://supabase.com/changelog.md. Endpoint GET experimental/Beta com escopo OAuth `secrets:read` ou PAT fino exigindo `project_admin_write` (mapeado Project Settings Read-write). Usar token restrito ao projeto, com expiração curta, só no terminal privado e revogação depois.
- Preparado script avulso PowerShell 5.1 **sem segredos**: `MEG-ETAPA09-VAULT-GET-CIFRADO-LOCAL.ps1` SHA-256 `7726c732ead78548292aec14f2ec90dc11340253fc57a45a227a10a19c5aaa4c`, ZIP SHA-256 `e3cf18e9271bfb1a595a81ae9f84598f9832ec16931ad89ea423897b0513c57c`. Staging Bash somente no WSL, par age já existente, GET oficial, cifra em `/home/m_vil/.meg-stage09-vault-encrypted` privado e manifesta SHA do envelope; relatório saneado copiado automaticamente para clipboard, sem token/root_key. Não reconectar pendrive que guarda identidade age offline.
- **Testes neste ambiente (não no notebook):** Bash `bash -n` PASS; mocks Python de `curl` e `age` com terminal PTY, sucesso e falhas HTTP, JSON malformado e root_key curta: PASS. Não houve GET real, token real ou leitura de segredo neste chat ou ferramenta. Sem validação do PowerShell/Windows/age real após entregar artefato.
- **Gate pendente:** operador executar localmente, enviar APENAS relatório sanitizado, revogar o PAT, depois comprovar custódia offsite do **criptograma Vault** separada da identidade age e do backup financeiro. Diretório WSL é staging local e sozinho não equivale a backup físico independente. Recuperação de Vault em novo projeto continua NO-GO sem autorização específica.
- **Governança:** branch `stage09/backup-recovery-kit-20261110`, PR #666 Draft, issues #674/#676 abertas, sem merge/deploy. Android, Web homologada, banco PostgreSQL restaurado, Render e dados do Supabase de produção não foram alterados pelo agente.


## 12/11/2026 | Etapa 09 — GET real Vault retornou criptograma local válido, custódia offsite pendente
- **Relatório sanitizado entregue pelo operador depois de autorização específica:** `ETAPA=09`, `PROCEDIMENTO=VAULT_ROOTKEY_GET_CIFRADO`, `RESULTADO=GET_CIFRADO_LOCAL_VALIDADO`, `FASE_POWERSHELL=EXECUCAO_FINALIZADA`, `CODIGO_WSL=0`, `PROJETO=MEG_FINANCAS`, `OPERACAO_SUPABASE=SOMENTE_GET`, `TOKEN_NO_RELATORIO=NAO`, `ROOT_KEY_NO_RELATORIO=NAO`, `BANCO_SQL=NAO_ACESSADO_PELO_SCRIPT`, `VAULT_RESTORE=NAO_TESTADO`, `DESTINO_WSL=ARQUIVO_CIFRADO_LOCAL`, `CUSTODIA_OFFSITE_VAULT=PENDENTE`, `LIMPEZA_SCRIPT_WSL=OK`, `FASE_FINAL=CONCLUIDO`, `GET=OK`, `ARQUIVO_CIFRADO=OK`, `ABERTURA_LOCAL=OK`, `HASH_CIFRADO=OK`, `MANIFESTO=OK`, `RESULTADO=EXPORTACAO_LOCAL_CIFRADA_OK`.
- **Interpretação:** o script local do operador reportou GET real **somente leitura** ao endpoint Supabase Vault, recebeu chave-raiz no formato esperado, cifrou em arquivo local fora do Git, verificou abertura e hash e gravou manifesto. Nenhum token/chave-raiz apareceu no relatório recebido. Não se trata de medição independente por acesso ao notebook; a evidência provém do relatório automático fornecido pelo operador. Não houve GET remoto executado por este assistente nem qualquer PUT.
- **Gate fechado com limite:** `VAULT_ROOTKEY_EXPORTACAO_LOCAL_CIFRADA=VALIDADA_POR_RELATORIO`; `VAULT_ROOTKEY_CUSTODIA_OFFSITE=PENDENTE`; `VAULT_RESTORE_ISOLADO=NAO_TESTADO`. O arquivo cifrado no SSD WSL não é proteção suficiente diante da perda do notebook. **Identidade age offline já verificada em USB desconectado e senha segregada**, sem reconectar no teste do Vault.
- **Ação prioritária imediata:** operador revogar o PAT temporário do Supabase, criado apenas para esse GET. NÃO há confirmação ainda de revogação. Jamais pedir/receber valor de token no chat. Depois validar transporte de **apenas arquivo Vault .age e manifesto** para meio offsite separado da identidade age e, de preferência, do backup financeiro; comparar SHA do criptograma em destino sem abrir conteúdo no chat. Cópia offsite ainda não autorizada/executada neste checkpoint.
- Nenhum banco PostgreSQL restaurado ou produtivo, nenhuma tabela financeira, Android, Web homologada, Render, PUT, mudança de chave ou infraestrutura foi modificado pelo procedimento conforme relatório. A fase Supabase gerenciado Auth/Storage/Realtime/Functions e recuperação Vault em projeto isolado segue **NO-GO**, requer autorização própria e condições/custos; issues #674/#676 permanecem pendentes. PR #666 Draft, sem merge/deploy.


## 12/11/2026 | Etapa 09 — preparar custódia offsite Vault e encerrar PAT
- PR #666 Draft no início deste passo: commit `c4c0be02c8e0606574631f4be65a28f955f66d8a`; quatro workflows técnicos aplicáveis do commit concluídos `SUCCESS` (Platform CI, Stage09 Backup Recovery Safety, PG17 financeiro sintético e CORS), Foundation `SKIPPED`. Esse status não equivale à restauração Vault.
- A exportação GET real e a validação criptográfica **local** da root key foram atestadas por relatório do operador; a revogação do PAT temporário e a transferência offsite **ainda não foram atestadas**. Nenhuma credencial/chave veio para Git/chat.
- **Próximo gate sem escrita:** operador revoga o PAT `MEG-ETAPA09-VAULT-GET-TEMPORARIO` em https://supabase.com/dashboard/account/tokens e atesta separadamente. A revogação é uma operação administrativa de segurança no painel, não executada pelo assistente e não confirmada por consulta automatizada.
- Preparado diagnóstico PowerShell 5.1 somente leitura via UNC `\\wsl.localhost\Ubuntu-24.04\home\m_vil\.meg-stage09-vault-encrypted`: conta arquivos `.rootkey.age` e manifestos, confere `encrypted_file` e `archive_sha256`, valida SHA-256 do **criptograma**, detecta disponibilidade local de OneDrive por variáveis de ambiente, **sem copiar, ler chave privada, descriptografar, expor caminho/hash, consultar Supabase ou alterar arquivo**. Saída exclusivamente sanitizada e copiada para clipboard. A etapa não comprova sincronização real com a nuvem.
- **Transporte futuro, ainda NÃO executado:** preferir cópia offsite com destino privado e controle de acesso, separado da identidade `age` offline e preferivelmente do backup SQL; copiar somente criptograma e manifesto; comparar hash em destino e, para confirmar offsite, obter prova independente de upload/download (não confundir diretório OneDrive local com conclusão na nuvem). Nenhum plaintext/root key, PAT ou arquivo do pendrive offline deve ser enviado ao ChatGPT, Git, CI ou repositório.
- Gates seguem: `PAT_REVOGACAO=NAO_ATESTADA`, `VAULT_CUSTODIA_OFFSITE=PENDENTE`, `VAULT_RESTORE=NAO_TESTADO`. Proibido PUT, alteração produtiva, reiniciar extração sem motivo, mexer no PostgreSQL restaurado, Android, Web, Render, merge e deploy. Issues #674/#676 preservadas, Etapa 09 aberta.


## 12/11/2026 | Etapa 09 — PAT revogado por atestado; falso negativo no parser do manifesto Vault
- **Relatório do operador:** `ETAPA=09`, `PROCEDIMENTO=PREFLIGHT_CUSTODIA_OFFSITE_VAULT`, `MODO=SOMENTE_LEITURA`, `PAT_REVOGADO=ATESTADO_PELO_OPERADOR`, `ARQUIVOS_CIFRADOS=1`, `MANIFESTOS=1`, `PARES_CIFRADO_MANIFESTO_VALIDOS=0`, `PASTAS_ONEDRIVE_LOCAIS=1`, `SINCRONIZACAO_NUVEM=NAO_VERIFICADA`, `ORIGEM_VAULT=NAO_VALIDADA`, `RESULTADO=PENDENTE`, `COPIA_EXTERNA=NAO_EXECUTADA`, `CHAVE_PRIVADA=NAO_ACESSADA`, `ROOT_KEY=NAO_DESCRIPTOGRAFADA`, `SUPABASE=NAO_ACESSADO`, `ALTERACOES=NENHUMA_PELO_DIAGNOSTICO`.
- **Revogação do PAT:** declarada pelo operador em diálogo com o script (`ATESTADO_PELO_OPERADOR`), **não verificada de forma independente no Supabase**. Não pedir token e não usá-lo novamente.
- **Defeito comprovado do diagnóstico PowerShell read-only entregue no chat anterior:** parser de campos do manifesto usava regex `^([a-z_]+)=(.*)$`, que **omite chaves com números**, incluindo `archive_sha256`. O manifesto produzido pelo exportador local `MEG-ETAPA09-VAULT-GET-CIFRADO-LOCAL.ps1` grava explicitamente `archive_sha256=<hex>` e `encrypted_file=meg-vault-rootkey-<timestamp>-<pid>.rootkey.age`. Logo `PARES_CIFRADO_MANIFESTO_VALIDOS=0` é **falso negativo do validador**, não evidência de corrupção. Confirmado por teste sintético de parsing old/new: novo regex `^([a-z_][a-z0-9_]*)=(.*)$` extrai `archive_sha256` corretamente.
- **Próximo gate não destrutivo:** reexecutar somente diagnóstico corrigido lendo manifesto e calculando hash do criptograma no WSL por UNC Windows, sem exibir nomes/hash de arquivo, sem copiar ou abrir root key, sem outro GET Supabase. O relatório deve ser automaticamente copiado; se um par for válido, permitir planejar transporte offsite de **somente** criptograma `.rootkey.age` e manifesto, sem identidade age privada.
- **Ainda PENDENTE:** validação da origem pelo verificador corrigido no notebook, cópia offsite real e comprovação de sincronização/download do armazenamento externo. Preservar original WSL, pendrive age offline e backup SQL. Não fazer PUT, SQL, restore, merge/deploy, mudar Android, Web, Render ou produção. PR #666 Draft e issues #674/#676 preservadas.


## 12/11/2026 | Etapa 09 — Vault manifesto íntegro após diagnóstico V2; preparar cópia cifrada OneDrive
- **Evidência real recebida do operador:** `ETAPA=09`, `PROCEDIMENTO=REVALIDACAO_MANIFESTO_VAULT_V2`, `MODO=SOMENTE_LEITURA`, `PAT_REVOGADO=ATESTADO_PELO_OPERADOR`, `ARQUIVOS_CIFRADOS=1`, `MANIFESTOS=1`, `PARES_VALIDOS=1`, `INTEGRIDADE_CIFRADO=OK`, `RESULTADO=ORIGEM_CIFRADA_VALIDADA`, `FASE_FINAL=CONCLUIDO`, `ERRO=NENHUM`, `COPIA_OFFSITE=NAO_EXECUTADA`, `SINCRONIZACAO_NUVEM=NAO_VERIFICADA`, `CHAVE_PRIVADA=NAO_ACESSADA`, `ROOT_KEY=NAO_DESCRIPTOGRAFADA`, `SUPABASE=NAO_ACESSADO`, `ARQUIVOS_MODIFICADOS=NENHUM`.
- O falso negativo da V1 foi eliminado; a origem local da salvaguarda Vault tem **par único de criptograma e manifesto com SHA-256 correspondente**. Este resultado é evidência de relatório automático do operador, não auditoria direta do terminal pelo assistente. Revogação PAT atestada, não verificada independentemente pela API.
- **Próximo passo operacional proposto pelo usuário ao enviar o relatório:** copiar somente `.rootkey.age` e `.manifest.txt` do WSL para **pasta privada nova e exclusiva** do OneDrive local já detectado (`PASTAS_ONEDRIVE_LOCAIS=1` anteriormente), sem sobrescrita, sem tocar identidade age/backup PostgreSQL e sem abrir Vault. Verificar SHA-256 do criptograma e integridade do manifesto também no destino. O comando será fornecido em chat para execução privada Windows PowerShell 5.1, com clipboard de marcadores sanitizados.
- **Limites de aceite:** cópia para diretório OneDrive local + hash igual **não prova upload offsite**; é obrigatória verificação do arquivo pelo OneDrive Web (preferencialmente download para local temporário e SHA, sem abrir root key), com confirmação explícita do operador. Cópia sob a mesma conta OneDrive que guarda backup SQL é separação lógica, não redundância entre provedores; não armazenar identidade privada age na pasta cloud. Manter originais WSL e pendrive age offline.
- **Status atual:** `VAULT_ORIGEM_CIFRADA=VALIDADA`, `PAT_REVOGACAO=ATESTADA`, `VAULT_OFFSITE_COPIA=NAO_EXECUTADA`, `VAULT_OFFSITE_WEB=NAO_VERIFICADO`, `VAULT_RESTORE=NAO_TESTADO`; nenhum PUT/GET adicional, SQL, deploy, merge, alteração em produção, Android, Web homologada, Render ou banco restaurado. PR #666 Draft, issues #674/#676 em aberto.


## 12/11/2026 | Etapa 09 — cópia cifrada Vault no OneDrive local com hashes válidos
- Relatório sanitizado do operador: `ETAPA=09`, `PROCEDIMENTO=COPIA_CIFRADA_VAULT_ONEDRIVE`, `RESULTADO=COPIA_LOCAL_ONEDRIVE_VALIDADA`, `FASE_FINAL=CONCLUIDO`, `ERRO=NENHUM`, `ORIGEM_VALIDADA=SIM`, `COPIA=DOIS_ARQUIVOS_COPIADOS`, `HASH_CIFRADO_DESTINO=OK`, `HASH_MANIFESTO_DESTINO=OK`, `PASTA_RELATIVA=MEG-Custodia-Vault\Copia-20261112-141210-7148e686`, `UPLOAD_NUVEM=NAO_VERIFICADO`, `VAULT_RESTORE=NAO_TESTADO`, `IDENTIDADE_AGE=NAO_ACESSADA`, `ROOT_KEY=NAO_DESCRIPTOGRAFADA`, `SUPABASE=NAO_ACESSADO`, `ORIGINAIS_WSL=NAO_MODIFICADOS`, `EXCLUSAO_DE_ARQUIVOS=NAO_EXECUTADA`.
- **Gate confirmado por execução local do operador:** os dois arquivos de recuperação Vault **já cifrados** foram copiados da pasta privada WSL para subpasta nova exclusiva do OneDrive sincronizado no Windows, preservando originais e validando hashes de criptograma e manifesto. Não confundir arquivo OneDrive local com confirmação de upload/offsite. Os hashes e nomes individuais não foram expostos no chat.
- **Localização lógica controlada:** `MEG-Custodia-Vault/Copia-20261112-141210-7148e686` sob OneDrive do operador, sem qualquer segredo privado em texto claro. É cópia lógica separada da identidade age física offline, porém não garante redundância de provedor com o backup SQL também presente no OneDrive.
- **Próximo gate:** no **OneDrive Web** autenticado na mesma conta, verificar presença da pasta e dos dois arquivos. Baixar **somente criptograma Vault** pelo navegador para pasta Downloads local **fora** da raiz do OneDrive; confrontar SHA-256 do arquivo baixado com manifesto/origem através de script somente leitura, que não imprime hashes/caminhos, não decifra, não chama Supabase. A inspeção no Web comprova disponibilidade remota no limite do navegador; o download e SHA confirmam integridade após transporte. Registrar atestado do operador e relatório sanitizado. Não modificar nem apagar originais.
- **Status exato:** `VAULT_LOCAL=INTEGRO`, `VAULT_ONEDRIVE_PASTA_LOCAL=HASHES_OK`, `VAULT_ONEDRIVE_WEB=NAO_VERIFICADO`, `VAULT_RESTORE_ISOLADO=NAO_TESTADO`, `PAT_REVOGACAO=ATESTADA_PELO_OPERADOR`. Sem novo GET/PUT, uso do PAT, operação SQL, criação de projeto, mudança de produção, Android, Web, banco restaurado, Render, merge ou deploy. PR #666 Draft; issues #674/#676 pendentes.


## 12/11/2026 | Etapa 09 — custódia externa Vault validada por download Web e SHA
- **Novo relatório sanitizado fornecido pelo operador:** `ETAPA=09`, `PROCEDIMENTO=VERIFICACAO_DOWNLOAD_WEB_VAULT`, `ONEDRIVE_WEB=ATESTADO_PELO_OPERADOR`, `ORIGEM_LOCAL=OK`, `HASH_CIFRADO_DOWNLOAD=OK`, `HASH_MANIFESTO_DOWNLOAD=OK`, `RESULTADO=DOWNLOAD_WEB_INTEGRO`, `FASE_FINAL=CONCLUIDO`, `ERRO=NENHUM`, `VAULT_RESTORE=NAO_TESTADO`, `ROOT_KEY=NAO_DESCRIPTOGRAFADA`, `IDENTIDADE_AGE=NAO_ACESSADA`, `SUPABASE=NAO_ACESSADO`, `ARQUIVOS_MODIFICADOS_PELO_DIAGNOSTICO=NENHUM`.
- **Evidências consolidadas:** GET do Vault realizado anteriormente no terminal privado do operador e cifrado com age, manifesto/abertura local OK; criptograma + manifesto copiados sem sobrescrita para OneDrive em `MEG-Custodia-Vault/Copia-20261112-141210-7148e686`, hashes de ambos iguais aos da origem; operador atesta que acessou os dois pelo **OneDrive Web**, baixou os dois pelo navegador e verificou hashes iguais aos originais. Não foram enviados tokens, root_key, identity age ou arquivos ao chat/Git. Originais WSL preservados; não foi feita nenhuma mudança em banco ou Supabase produtivo neste ensaio de download.
- **Gate concluído estritamente:** `VAULT_ROOTKEY_CUSTODIA_OFFSITE=OPERACIONAL_COM_DOWNLOAD_WEB_E_HASHES_ATESTADOS`. Evidência de disponibilidade remota por operador e integridade de download, não restauração efetiva dos segredos Vault nem teste de recuperação de serviços gerenciados. Identidade age em pendrive offline separado e protegido por senha; backup SQL e criptograma Vault permanecem sob a mesma conta/provedor OneDrive, portanto falha de conta/serviço ainda representa concentração de risco.
- **Credencial de GET:** `PAT_REVOGADO=ATESTADO_PELO_OPERADOR`, mas sem verificação independente no painel/API. Não reutilizar. **Não realizar GET ou PUT** novamente. Avaliar depois a custódia de Downloads temporários sem excluir automaticamente material necessário ou origem.
- **Documentação atualizada neste passo:** `docs/MEG-STAGE09-BACKUP-RECOVERY-RUNBOOK-20261110.md` com seção 11, commit `4efce31a81aadeab414cfc4dc9d2bab812f08c34`; `docs/MEG-STAGE09-VAULT-ROOTKEY-READINESS-20261112.md` com seção 9, commit `5640204b27560b288a11fda6d0e8ac56912845cf`.
- **Próxima ação exata e condicionada:** somente leitura/documental: organizar o ensaio de recuperação de serviços gerenciados Supabase (Auth/Storage, Vault, extensões, cron, Realtime, Functions e configurações), custos/RPO/RTO e critérios de aceite com dados sintéticos; não criar novo projeto nem restaurar/chamar PUT sem nova autorização expressa. Issues #674 e #676 seguem abertas; PR #666 Draft, sem merge/deploy. Preservar Android, Web homologada, PostgreSQL restaurado e produção.


## 12/11/2026 | Etapa 09 — preflight de ensaio Supabase gerenciado com inventário e isolamento
- **Comando do operador:** `AUTORIZADO, SEGUIR`, em continuidade ao preparo da recuperação gerenciada da Etapa 09. **Não houve aceite de valor ou teto de cobrança e nenhuma seleção/validação de ref de projeto-alvo novo**, portanto a autorização foi aplicada a planejamento, inventários read-only e documentação; sem criação, restore ou mutação remota.
- **Base verificada ao iniciar:** PR #666 Draft branch `stage09/backup-recovery-kit-20261110`, HEAD `da877efbde022325beed66c6ee7ff857f00694be`. Checkpoint, runbook, plano custódia, readiness Vault e autoridade financeira lidos na branch. Custódia offsite root key validada anteriormente por OneDrive Web + download/hash; identidade `age` permanece em USB offline e senha segregada.
- **Supabase Connector read-only nesta rodada:** `list_organizations` => `MEG Vilalva` organização `gkvlezwigvinfcbsemjx`; `get_organization` => plano `free`; `list_projects`/`get_project` => produção `meg-financas` (`ugbiqzaqnrhulhetevby`) `ACTIVE_HEALTHY` PostgreSQL 17 `sa-east-1`, segundo projeto `meg-evolution` (`dmrauztnozvxirbydtho`) `INACTIVE` na mesma organização, mantido intocado. `list_edge_functions` => nenhuma publicada. `list_extensions` => 7 instaladas (`plpgsql`, `pg_stat_statements`, `uuid-ossp`, `pgcrypto`, `pg_net` no schema public, `pg_cron` no pg_catalog, `supabase_vault` no vault). `list_migrations` => 7 migrações registradas. **Sem consultas SQL, sem segredo ou registro financeiro lido.**
- **Documentação Supabase atualizada pesquisada:** plano Free permite até 2 projetos ativos mas sujeito à cota de owners/admins, `INACTIVE` não é garantia de projeto descartável; Pro inicia em US$25/mês, compute adicional a partir de ~US$10/mês se pago. Fluxo `Restore to a New Project` é pago e requer backups físicos; alerta que `pg_net` e `pg_cron` podem rodar IMEDIATAMENTE depois de clonagem binária, sem janela para desativar. CLI v3 adotou alvo local por padrão e exige `--remote` para hosted; não atualizar CLI nem rodar migração nesta fase. Fontes: https://supabase.com/docs/guides/platform/clone-project ; https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore ; https://supabase.com/docs/guides/platform/billing-faq ; https://supabase.com/docs/guides/platform/compute-and-disk ; https://supabase.com/pricing ; https://supabase.com/changelog.md .
- **Decisão técnica proposta, ainda não homologada por execução:** não usar restore binário automático porque jobs externos da origem podem disparar. Preparar **projeto novo e vazio**, distinto de `meg-evolution` e `meg-financas`, com teste inicial usando dados apenas sintéticos, sem Render, webhooks, cron/pg_net produtivos, notificação real ou público. A restauração lógica real exigirá ferramenta distinta com allowlist explícita do NOVO destino; `scripts/meg-stage09-safe-restore-drill.sh` continua restrito ao WSL/socket local e não será enfraquecido.
- **Novo documento criado na branch:** `docs/MEG-STAGE09-SUPABASE-MANAGED-RESTORE-DRILL-20261112.md`, commit `acb70fd7fccca8b1fd8099f1cbcc1cfafb7defb8` (inventário, matriz de componentes, ordem de gates, custos, critérios de validação e NO-GO). Runbook atualizado seção 12, commit `c76fd61255b07ac5618ad16674bec72b577a58ea`. Nenhum script/negócio financeiro alterado.
- **Issues verificadas:** #674 e #676 seguem abertas. Testes anteriores e auditoria read-only de RLS são preservados, não repetidos. Sem validação visual nova, sem alteração de produção, Android, Web homologada, banco `meg_restore_drill`, Render, Vault rootkey ou segredo. PR #666 Draft, sem merge/deploy.
- **Pendências/NO-GO:** custo específico do projeto ainda não obtido/aceito, elegibilidade real de vaga Free incerta, nome/ref e isolamento do novo alvo não aprovados como destino executável, restore de Auth/Storage/Vault/extensions/Realtime/functions não realizado, RPO/RTO sem aprovação. Não inferir que o plano Free garante nova vaga; não reativar nem usar `meg-evolution` como sandbox.
- **Próximo passo exato:** obter confirmação do limite de despesa (padrão proposto **R$ 0**, usar somente Free sem upgrade); então conferir custo real pelo mecanismo do Supabase para a organização selecionada antes de criar um **novo** projeto descartável e com isso avançar ao Gate 1 de isolamento. Não realizar restore real sem guardas e nova aprovação específica da ação de escrita.


## 12/11/2026 | Etapa 09 — projeto novo Supabase Free criado com custo zero, baseline sem dados MEG
- **Autorização explícita:** resposta `OK` à proposta de utilizar **organização MEG Vilalva**, **projeto novo no Free** e **custo máximo R$ 0,00**. Consulta `Supabase.get_cost(project, org=gkvlezwigvinfcbsemjx)` devolveu `amount=0, recurrence=monthly`, portanto **US$ 0,00/mês** na cotação. O provedor exigiu `confirm_cost` (amount 0) e o usuário havia aceito custo zero; confirmação realizada, sem aprovação de qualquer despesa paga ou upgrade.
- **Criação verificada:** `Supabase.create_project` criou **exclusivamente** `meg-stage09-restore-sandbox-20261112` (`oxwmqbzeuiibdlkcbjzv`) na org `gkvlezwigvinfcbsemjx`, região `sa-east-1`, em `2026-11-12T17:01:58.099637Z`. `Supabase.get_project` informou `ACTIVE_HEALTHY` e PostgreSQL 17 versão `17.11.0.019`. Produção `meg-financas` (`ugbiqzaqnrhulhetevby`) segue `ACTIVE_HEALTHY`; segundo projeto histórico `meg-evolution` (`dmrauztnozvxirbydtho`) segue `INACTIVE`. A organização permanece no plano Free, 2 projetos ativos, 1 inativo. **Não houve reutilização de projeto existente.**
- **Preflight somente leitura do destino após criação:** `public` com 0 tabelas, `auth.users=0`, `auth.sessions=0`, `storage.buckets=0`, `storage.objects=0`, `vault.secrets=0`, `list_edge_functions` 0, `list_migrations` da aplicação 0. Extensões instaladas no destino `plpgsql`, `pgcrypto`, `uuid-ossp`, `pg_stat_statements`, `supabase_vault 0.3.2`; `pg_cron`/`pg_net` não instalados. Há diferença com origem (`supabase_vault 0.3.1`) que requer validação antes de tentar recuperar segredos. Tabelas internas de Auth/Storage existem por padrão e não devem ser apagadas/recriadas.
- **Gates:** Gate 0 (identidade, custo e destino novo) PASS. Gate 1 (provisionamento vazio sem dados MEG) parcial: **isolation/egress/credenciais/URL/autenticação ainda NÃO TESTADOS**. Gates 2, 3, 4 não iniciados; nenhum dado fictício/real inserido, nenhum restore de Auth/Storage/Vault/Realtime/functions, nenhuma root key aberta, nenhum PUT, SQL, cópia de dados ou alteração nos projetos preexistentes. O risco de ações externas por configurações futuras requer bloqueio antes de qualquer importação.
- **Documentos oficiais atualizados:** `docs/MEG-STAGE09-SUPABASE-MANAGED-RESTORE-DRILL-20261112.md` commit `0234924258778519fd4573d15657607be4a298a2` (apêndice Gate 0/Gate 1), runbook `docs/MEG-STAGE09-BACKUP-RECOVERY-RUNBOOK-20261110.md` commit `1dc66aaaa2113c6b0f714954c87c874b0a247a32` (seção 13). Custódia offline idade age e backup remoto Vault previamente concluída por relatórios, sem necessidade de reconectar USB.
- **Preservado:** repositório `MarcosVilalva/MEG-Platform`, branch `stage09/backup-recovery-kit-20261110`, PR #666 Draft sem merge/deploy, issues #674/#676 abertas, Android, Web homologada, banco WSL `meg_restore_drill`, Render e Supabase `meg-financas` inalterados. A criação de **novo projeto vazio** é a única operação de infraestrutura neste passo.
- **Próximo passo exato:** auditoria apenas no `oxwmqbzeuiibdlkcbjzv` da configuração de egress, notificações, Auth, Storage, grants e disponibilidade de Vault/Realtime; em seguida propor fixtures sintéticas sem email/SMS/webhooks reais, preservando `SOURCE_REF` somente leitura. Não confundir projeto criado com recuperação gerenciada concluída; aprovação visual não aplicável até existir UI.


## 12/11/2026 | Etapa 09 — advisor de segurança no sandbox novo sem avisos
- `Supabase.get_advisors(project_id=oxwmqbzeuiibdlkcbjzv, type=security)` consultado **somente leitura** após criação, retornou `result.lints=[]`. Isto significa ausência de avisos **nessa consulta do advisor**, e NÃO auditoria completa de egress, configurações de Auth, exposições, backups ou restore de componentes gerenciados.
- `Gate 1`: baseline de infraestrutura criada e inventário seguro concluídos; **isolamento externo funcional e proibição de notificações/webhooks ainda não testados**. Nenhuma fixture sintética ou dado real escrito. O estado inicial não implica garantia futura caso novos objetos/funções/migrations sejam aplicados.


## 12/11/2026 | Etapa 09 — usuário aprova explicação didática; sandbox sem dados e automações em public
- **Preferência de comunicação validada explicitamente pelo operador:** explicar pontos difíceis do projeto usando analogias simples e desenhos/diagramas quando melhorarem o entendimento, mantendo precisão, pendências e gates técnicos. A imagem explicativa da Etapa 09 **não** é validação visual de tela da Web, nem substitui o conjunto de prints oficiais. Operador: `MARAVILHA AGORA ENTENDI, SEMPRE Q TIVVER DUVIDAS VC PODERIA EXPLICAR DESSA FORMA GOSTEI, PODE SEGUIR ESTA VALIDADO`.
- PR #666 Draft na abertura desta rodada, HEAD `e58cd0a09852e30ed1654d1f82851cedf5e0025f`. Foi consultado o checkpoint e o roteiro `docs/MEG-STAGE09-SUPABASE-MANAGED-RESTORE-DRILL-20261112.md`; sem alterações de lógica financeira ou UI.
- **Consulta read-only executada no projeto sandbox** `oxwmqbzeuiibdlkcbjzv` com 11 contagens, usando somente `SELECT` de metadados `pg_catalog` e contagens de tabelas gerenciadas: zero relações em `public`, zero funções/procedimentos em `public`, zero triggers customizados ativos `public`, zero políticas em `public` (não há tabelas), zero tabelas `public` em publicações Realtime, zero extensões `pg_net`/`pg_cron` instaladas, zero usuários Auth, zero buckets/objetos Storage e zero segredos Vault. **Nenhuma consulta SQL foi feita na origem `ugbiqzaqnrhulhetevby` nesta rodada.**
- **Aceite técnico limitado:** `SANDBOX_BASELINE_PUBLIC_E_AUTOMACOES=PASS_SOMENTE_LEITURA`. Zero em `public` não comprova ausência de callbacks/Auth SMTP/SMS/OAuth, settings do serviço gerenciado, egress de runtime nem integrações. Gate 1 **PARCIAL**; Gate 2 (fixtures fictícias), Gate 3 (restore de dados), Gate 4 (aprovação da recuperação) seguem **NÃO INICIADOS**. Nenhum novo dado foi inserido; nada foi restaurado ou migrado.
- Plano de ensaio atualizado com seção 9 e matriz de contagens no commit `b634d80a88ff7d1736614a2512ac3b45ff3acc39`. A política de 'desenhos' aplica-se às explicações, não à referência visual soberana do MEG Web.
- **Próximo passo exato:** inspecionar **somente no sandbox** via Dashboard Supabase os settings de Auth Providers, SMTP/SMS, URL/Redirects, hooks, configurações Storage/Realtime e egress; registrar apenas estados sanitizados, nunca mostrar senhas, JWTs, service-role ou root key. Não ativar webhooks/email, criar usuários ou carregar dados reais até comprovar isolamento e obter autorização adequada. Não reutilizar `meg-evolution`.
- Preservados: `meg-financas` em produção, `meg-evolution` inativo, Android, Web homologada, Render, banco restaurado WSL, idade age offline/OneDrive e identidade financeira canônica. PR #666 Draft sem merge/deploy. Issues #674 e #676 abertas.


## 12/11/2026 | Checkpoint de troca de chat, Etapa 09: isolamento gerenciado do sandbox
1. **Tema, objetivo, etapa:** MEG Web Evolution, **Etapa 09**: recuperação segura do Supabase em ambiente isolado, sem migração produtiva. Momento: Gate 1 de isolamento do projeto de teste, ainda **PARCIAL**.
2. **Decisões/regras confirmadas:** produção `meg-financas`/`ugbiqzaqnrhulhetevby` intocada; novo sandbox `meg-stage09-restore-sandbox-20261112`/`oxwmqbzeuiibdlkcbjzv` na org `MEG Vilalva`/`gkvlezwigvinfcbsemjx` sa-east-1, Free e custo cotado US$0/mês com limite aprovado R$0; `meg-evolution`/`dmrauztnozvxirbydtho` INACTIVE e intocado. Explicações técnicas didáticas com desenhos/analogias foram aprovadas, sem homologar visual de qualquer tela da Web.
3. **Concluído:** backup real cifrado de `public` e restauração local do PG17 (32/32 tabelas), idade `age` protegida e USB offline, GET Vault root key cifrado e cópia externa OneDrive confirmada por download/hashes; PAT de GET revogado por atestado do operador. Criado sandbox distinto, status ACTIVE_HEALTHY PG17, 0 tabelas public, 0 usuários Auth, 0 buckets/objetos, 0 segredos, 0 Edge Functions, zero pg_net/pg_cron; security advisor zero lints no projeto novo. Consulta `SELECT` exclusiva no sandbox confirmou 11 contagens zero e ausência de automações customizadas public.
4. **Testes comprovados:** relatório local de Vault `DOWNLOAD_WEB_INTEGRO`, hashes de criptograma/manifesto OK; SQL read-only sandbox `public_relations=0`, `public_functions_and_procedures=0`, `active_public_custom_triggers=0`, `public_rls_policies=0`, `public_realtime_publications=0`, `pg_net_installed=0`, `pg_cron_installed=0`, `auth_user_rows=0`, `storage_bucket_rows=0`, `storage_object_rows=0`, `vault_secret_rows=0`. **CI no SHA `ee22a652b29fac9af9e1a7304e16ff4270adf150`**: Platform CI SUCCESS; Safety offline SUCCESS; PG17 financeiro sintético SUCCESS; CORS SUCCESS; Foundation SKIPPED. CI não substitui restore ou aprovação funcional.
5. **Aprovações / não validados:** usuário autorizou projeto novo somente Free/custo zero e validou **explicação didática**, não UI. Não validado: isolamento total de SMTP/SMS/OAuth/hooks/egress, Auth/Storage/Realtime/Vault funcional no sandbox, RTO/RPO, recuperação gerenciada, aprovação visual de qualquer tela nova.
6. **Riscos/pendências:** risco de egress/avisos externos após habilitação de Auth ou migração; Vault origem extensão 0.3.1 vs sandbox 0.3.2; pg_net/pg_cron na origem, ausentes no sandbox; backup SQL e criptograma Vault no mesmo provedor OneDrive; PAT revogado somente por atestado; issues #674 (Payable/LedgerEntry) e #676 (pg_net/watchdog) ainda **OPEN**.
7. **Arquivos/fontes:** `docs/MEG-STAGE09-SUPABASE-MANAGED-RESTORE-DRILL-20261112.md`, `docs/MEG-STAGE09-BACKUP-RECOVERY-RUNBOOK-20261110.md`, `docs/MEG-STAGE09-VAULT-ROOTKEY-READINESS-20261112.md`, `docs/MEG-STAGE09-CUSTODIA-OFFLINE-RECUPERACAO-GERENCIADA-20261112.md`, `docs/MEG-WEB-FINANCIAL-AUTHORITY.md`; fontes oficiais Supabase e relatórios sanitizados do operador referidos nesses documentos.
8. **Git:** `MarcosVilalva/MEG-Platform`, branch `stage09/backup-recovery-kit-20261110`, PR **#666 Draft aberta sem merge**, HEAD antes desta atualização `ee22a652b29fac9af9e1a7304e16ff4270adf150` e quatro CI aplicáveis SUCCESS; issues #674 e #676 abertas. Esta atualização documental cria novo SHA, portanto revalidar CI do novo HEAD antes de citar gates verdes.
9. **Proibições:** não tocar Android, Web homologada, Render, produção Supabase, projeto `meg-evolution` inativo, PG17 WSL restaurado; não reutilizar restore local em remoto, não PUT root key, não GET novamente, não ativar email/SMS/webhook/cron produtivo, não importar dados reais, não merge/deploy sem gates e autorização própria.
10. **Próximo passo exato:** verificar **somente as configurações do sandbox `oxwmqbzeuiibdlkcbjzv`** em Dashboard (Auth Providers/Email/SMS/redirects/hooks, Storage, Realtime, egress), com evidências sanitizadas; completar Gate 1 antes de fixtures fictícias. Nunca confundir presença de projeto vazio com recuperação funcional.

**Texto de retomada:** `MEG Etapa 09, continuar no sandbox Supabase oxwmqbzeuiibdlkcbjzv, PR #666 Draft branch stage09/backup-recovery-kit-20261110. Ler MEG-WEB-CONTINUIDADE-OFICIAL.md e docs/MEG-STAGE09-SUPABASE-MANAGED-RESTORE-DRILL-20261112.md, runbook e autoridade financeira. Gate 1 parcial: consultar apenas settings Auth Providers, SMTP/SMS, redirects, hooks, Storage, Realtime e egress do sandbox, sem mexer na origem, inserir fixtures, fazer restore ou PUT. Documentar evidência no checkpoint, verificar CI/PR atuais. Explicar decisões complexas de forma didática.`

## 12/11/2026 | Etapa 09 — auditoria read-only de Auth, Storage, Realtime, conexões e CI no sandbox
- **Identidade e escopo:** inspeção exclusiva no Supabase sandbox oxwmqbzeuiibdlkcbjzv (meg-stage09-restore-sandbox-20261112), ACTIVE_HEALTHY, sa-east-1, PostgreSQL 17.11.0.019. PR #666 Draft, SHA de entrada b40009ac395ac7da9d5b9b04c2cc27d6831ca614. Não foi consultado o banco da origem nesta rodada.
- **Métodos somente leitura:** Supabase get_project, list_tables (public/auth/storage), list_extensions, list_edge_functions, list_migrations, get_advisors security/health e três queries SQL SELECT apenas com metadados e contagens. Advisors security e health retornaram lints=[]; isso não substitui auditoria funcional. Nenhuma chave, usuário identificável, dado financeiro ou conteúdo de segredo foi consultado.
- **Auth:** auth.users=0; auth.sso_providers=0; auth.saml_providers=0; auth.oauth_clients=0; triggers não internos em auth=0; rotinas com nome contendo hook/custom claim em schemas não sistêmicos=0. Essas contagens NÃO comprovam configuração efetiva de Providers (Email/Phone/OAuth), SMTP/SMS, site URL, redirects, templates, hooks externos nem JWT/sessão. Esses campos estão fora do alcance das leituras PostgreSQL usadas e exigem inspeção read-only no Dashboard do destino.
- **Storage:** storage.buckets=0, storage.objects=0, políticas do schema storage=0; 11 triggers do próprio schema storage em buckets/objects com nomes associados a proteção/validação/lifecycle/updated_at. Zero buckets não comprova política de upload futuro, ACL ou egress do serviço.
- **Realtime:** publicação supabase_realtime presente, modo EXPLICIT_TABLES, com zero tabelas publicadas em todos os schemas; trigger interno realtime.tr_check_filters em realtime.subscription, políticas realtime=0. Não houve teste de mensagens, inscrições ou serviço runtime. Isso não prova Realtime desabilitado.
- **Conexões e automações PostgreSQL:** public com zero relações/funções, pg_net=0 e pg_cron=0 instalados; foreign servers=0, foreign tables=0, rotinas com nomes webhook/http_request fora de schemas de sistema=0; seis event triggers no schema extensions para eventos DDL e manutenção de Supabase (nomes associados a GraphQL, PostgREST, extensões). Zero Edge Functions e zero migrações do app. Não se examinaram corpos de funções ou runtime externo. Essas ausências não certificam egress de Auth, SMTP/SMS, APIs gerenciadas ou rede da plataforma.
- **CI revalidada no SHA b40009ac395ac7da9d5b9b04c2cc27d6831ca614:** MEG Platform CI SUCCESS (run 43275919966, job validate SUCCESS), Stage09 Backup Recovery Safety SUCCESS (43275920118, contratos offline/invariantes PG17/restore sintético PG17), Stage09 Financial Integration PostgreSQL17 SUCCESS (43275920163), CORS Etapa 09 SUCCESS (43275920131). MEG Web Evolution Foundation SKIPPED (43275919890), assim como jobs financial-e2e e android-rc1 do Platform CI. Nenhuma CI foi reexecutada manualmente nesta rodada. Somente ensaios sintéticos, não restore gerenciado ou aprovação visual.
- **Gate:** Gate 1 permanece PARCIAL, Gate 2/3/4 NÃO INICIADOS e NO-GO. Não foram comprovados Auth Providers habilitados, SMTP/SMS, URL/Redirects, Auth Hooks/integrações no runtime, configurações externas Storage/Realtime, egress ou ausência de links externos. A ausência de dados MEG no banco e de objetos externos SQL não permite declarar sandbox isolado funcionalmente.
- **Próximo passo:** inspecionar read-only e exclusivamente no Dashboard do projeto oxwmqbzeuiibdlkcbjzv: Auth > Providers, Email/SMTP, Phone/SMS, URL Configuration/Redirects, Auth Hooks e configurações de Storage/Realtime/egress. Registrar só status sanitizado, sem senhas, chaves, URLs internas sensíveis ou endereços pessoais. Sem acesso comprovado ao painel não marcar itens como validados. Não habilitar notificações, criar fixtures, restaurar dados ou executar PUT Vault sem autorização e sem Gate 1 concluído.
- **Preservação:** origem ugbiqzaqnrhulhetevby, meg-evolution inativo dmrauztnozvxirbydtho, Android, Web homologada, Render, banco WSL meg_restore_drill, root key Vault e custódias age/OneDrive intocados. Issues #674/#676 continuam abertas; PR #666 Draft; sem importação, escrita Supabase, GET/PUT Vault, merge ou deploy. Nenhuma tela foi validada visualmente.
- **Nota sobre CI:** o novo commit de documentação gera outro SHA. A CI acima comprova apenas b40009ac; o SHA de documentação precisa de avaliação de seus próprios checks.

## 12/11/2026 | Etapa 09 — avanço seguro para auditoria de configurações gerenciadas do sandbox
- Usuário solicitou prosseguir para a próxima fase, interpretada como continuação **somente leitura** do Gate 1, NÃO autorização para Gate 2, restauração, SMTP/SMS, hooks, PUT Vault, merge ou deploy. Objetos de risco devem permanecer sem escrita.
- Revalidados checkpoint/autoridade financeira/runbook/plano, PR #666 Draft e branch stage09/backup-recovery-kit-20261110. Issues #674 e #676 permanecem open e open respectivamente; nenhuma alteração nelas.
- A documentação Supabase confirma APIs GET de configuração gerenciada (Auth v1 e config v2 Alpha), mas a conexão disponível **não expõe** esse endpoint e as respostas podem conter campos sensíveis. A visita autenticada ao Dashboard Supabase **não foi realizada nesta execução**. O endpoint público Auth /settings não foi obtido por ferramenta de rede; não inferir status dos providers ou isolamento.
- Novo documento operacional **exclusivamente documental**: docs/MEG-STAGE09-SANDBOX-GATE1-CONTROLES-GERENCIADOS-20261112.md, criado no commit 4eb3ff407536f9c5dc4cc0f58b04d76f1975c634. Traz matriz de inspeção read-only de Auth Providers, SMTP/SMS, URL/Redirects, Auth Hooks, Storage, Realtime, conexões e Usage, com evidência esperada sanitizada e critérios de bloqueio. Não contém tokens, segredos, payloads ou configurações obtidas sem autorização.
- **Limites comprovados anteriores permanecem:** sandbox oxwmqbzeuiibdlkcbjzv ACTIVE_HEALTHY, vazio de dados MEG; zero usuários/buckets/objetos/segredos; sem pg_net/pg_cron/FDW nem tabelas Realtime publicadas; advisors sem lints. Esses resultados NÃO homologam egress, providers, redirecionamentos, SMTP/SMS ou hooks. Gate 1 ainda PARCIAL, Gate 2/3/4 NO-GO.
- **Próximo passo exato:** inspeção autenticada do Dashboard **somente do sandbox** usando https://supabase.com/dashboard/project/oxwmqbzeuiibdlkcbjzv, seguindo a matriz do documento criado e registrando apenas SIM/NÃO/NÃO VERIFICADO e categorias gerais. Sem esse acesso não alegar conclusão. Se houver integração externa, bloquear ensaio até plano próprio e autorização separada.
- **Preservação:** produção ugbiqzaqnrhulhetevby, meg-evolution inativo, Android, Web homologada, Render, banco WSL meg_restore_drill, Vault/age/OneDrive intocados; sem inserção, exportação, restauração, GET/PUT Vault, e-mail/SMS, webhook, merge ou deploy. Sem novas telas nem validação visual de UI.
- **CI:** último SHA com checks SUCCESS anterior a estas atualizações: 8d1a2d4e765c55522e5c2c8cf2aaed05f56db810, workflows Platform CI, Backup Safety, Financial PG17 e CORS SUCCESS; Foundation SKIPPED. Conferir gates do SHA deste novo checkpoint separadamente.

## 12/11/2026 | Etapa 09 — CI revalidada após documentação do Gate 1
- **SHA testado:** e2a43d26b82787bbe5daa7af8857bed3adc2151f (checkpoint atualizado com procedimento documental de auditoria do sandbox). GitHub Actions confirma MEG Platform CI SUCCESS (run #43284635932), Stage09 Backup Recovery Safety offline SUCCESS (#43284635735), Stage09 Financial Integration PostgreSQL17 sintético SUCCESS (#43284635877), CORS Etapa 09 SUCCESS (#43284636098). MEG Web Evolution Foundation SKIPPED (#43284635803).
- **Aceite restrito:** gates técnicos desses quatro workflows verdes no SHA acima. Isso não comprova isolamento dos serviços Auth/SMTP/SMS/Redirect/Hooks, RESTORE Supabase gerenciado nem validação de tela. O novo commit deste próprio registro exige consulta dos respectivos checks novamente.
- **Acesso:** documentação de inspeção do Gate 1 criada e verificada, sem acesso autenticado ao Dashboard, sem token ou credencial. Gate 1 PARCIAL; Gates 2/3/4 NO-GO. PR #666 Draft sem merge/deploy; issues #674/#676 abertas; produção e ambientes protegidos intactos.


## 12/11/2026 | Etapa 09 — auditoria read-only do sandbox Supabase, Gate 1

- **Alvo verificado no Dashboard:** projeto `meg-stage09-restore-sandbox-20261112`, ref `oxwmqbzeuiibdlkcbjzv`, organização MEG Vilalva, Free, região `sa-east-1`, PostgreSQL 17.11. A URL da sessão e o cabeçalho do projeto corresponderam ao alvo autorizado. Não abri os projetos protegidos.
- **Restrição atual observada:** o Dashboard exibiu “Services restricted” e “Exceeding usage limits”, dizendo que a organização esgotou a cota e os projetos não conseguem atender solicitações. Na página Storage, o painel falhou ao recuperar buckets e identificou `exceed_egress_quota`. A visão geral mostrou status “Unhealthy”; o conector de leitura do projeto retornou `ACTIVE_HEALTHY`. Registrar a divergência, prevalecendo para risco operacional a mensagem de serviço restrito. A tela do sandbox não permite afirmar operação efetiva. Plano permaneceu Free; nenhum custo, upgrade ou alteração foi executado. Não consultei Usage/Billing da organização, que exibem consumo de outros projetos fora do escopo autorizado.
- **Authentication > Sign In / Providers:** Email ENABLED; Phone DISABLED; Anonymous Sign-ins desabilitado; cadastro de novos usuários habilitado e confirmação de e-mail habilitada. SAML 2.0 e todos os provedores OAuth/OIDC mostrados na página estavam DISABLED. Terceiros/custom providers não apresentaram entradas. OAuth Server estava desabilitado e a lista OAuth Apps mostrou zero cadastrados. Nenhum provedor externo de identidade foi observado.
- **Email/SMS e hooks:** SMTP personalizado desabilitado; a tela de e-mails informa que os templates padrão do Supabase serão usados. Não houve envio ou teste de entrega. O caminho de e-mail pode atingir destinatários reais se Auth voltar a atender e um cadastro for iniciado. Phone desabilitado e nenhum Auth Hook listado. A configuração de fornecedor SMS não foi confirmada em uma página própria; não concluir que nenhum fornecedor esteja cadastrado. A página Auth Hooks exibiu somente o estado vazio para criação, sem hook configurado. Nenhum Send Email/Send SMS, Before User Created, Custom Access Token, MFA ou Password Verification hook foi visto.
- **URL Configuration:** Site URL classificada como localhost; nenhuma Redirect URL adicional cadastrada. Nenhuma referência a produção foi observada nesta lista.
- **Discrepância de usuários:** a página Users indicou “10 users (estimated)”, divergente do zero registrado em verificações anteriores. Não abri linhas nem dados de usuários. O número é estimado pelo Dashboard e requer reconciliação autorizada antes de qualquer teste; não o tratar como inventário confirmado.
- **Storage:** a página Files não conseguiu carregar os buckets devido à restrição de Egress. A página Policies mostrou “Create a bucket first” e nenhum policy criado para `storage.objects` ou `storage.buckets`. O checkpoint anterior registra zero buckets e objetos, mas esta execução não confirmou as contagens atuais no Dashboard. Não consultei conteúdo de arquivos nem credenciais S3.
- **Realtime:** o serviço está habilitado e “Allow public access to channels” está habilitado. A publicação nativa `supabase_realtime` existe e mostra zero tabelas vinculadas. O Inspector mostrou a tela inicial sem canal ativo visível naquele instante, o que não comprova ausência de clientes ou assinaturas fora da observação. A página Policies não mostrou políticas listadas. A permissão a canais públicos é risco para isolamento do Gate 2, mesmo sem tabelas publicadas.
- **Integrações e egress:** Project Settings > Integrations mostrou “No connections yet”; a visão geral indicou nenhum repositório GitHub conectado. Nenhum vínculo com Render foi mostrado. Isso não identifica clientes que consumam API por fora da lista de integrações. Evidência anterior somente leitura continua válida para zero Edge Functions, zero relações/funções/triggers públicos de aplicação, `pg_net`/`pg_cron` não instalados e zero foreign servers/tables. Não inspecionei uma configuração de bloqueio universal de tráfego de saída; network restrictions de entrada não provam bloqueio de egress.
- **Advisor e limites:** o checkpoint anterior registra Advisors sem lints. O painel atual expôs restrição por cota de Egress; não explorei outras páginas de Usage/Billing em escopo organizacional. A auditoria não criou custo nem alterou plano/configurações.
- **Classificação:** identidade do sandbox, Auth providers mostrados, URLs e ausência de conexões da página de integrações foram observadas. **Requer isolamento antes do Gate 2:** signup por e-mail com SMTP padrão disponível e Realtime público habilitado. **Não verificado:** provedor SMS em separado, estado atual de buckets/objetos por falha do serviço, clientes externos em runtime, egress de saída e detalhes de restrições de rede. A divergência dos usuários estimados permanece aberta.
- **Decisão:** `GATE1=PARCIAL`, `GATE2=NO-GO`, `GATE3=NO-GO`, `GATE4=NO-GO`. Recomendações não aplicadas: reconciliar a contagem de Auth sem expor registros; antes de testes, usar estratégia que impeça e-mail/SMS real; tornar canais Realtime privados ou desabilitar Realtime se dispensável ao ensaio; reavaliar Storage quando o painel permitir leitura; avaliar separadamente egress e integrações não observáveis. Não usar upgrade como correção automática, manter o limite autorizado de R$ 0,00.
- **Escopo efetivamente executado:** navegação e leitura de configuração no projeto sandbox, sem SQL, sem criação de usuários/objetos, sem envio de notificações, sem testes de entrega/webhook, sem leitura de segredos, sem mudança no Supabase, Render, Android, Web homologada ou PostgreSQL WSL. Nenhum backup, restore, deploy ou merge.
- **PR e governança:** PR #666 permanece Draft e sem merge; issues #674 e #676 mantidas abertas. Este registro foi adicionado exclusivamente a este checkpoint documental na branch `stage09/backup-recovery-kit-20261110`. A CI do SHA resultante precisa ser consultada, sem rerun manual. Próximo passo autorizado é reconciliar os itens NÃO VERIFICADOS e apresentar proposta de isolamento ao responsável; Gate 2 só após nova autorização e fechamento do Gate 1.

## 12/11/2026 | Etapa 09 — inventário exato do sandbox reconciliado e proposta de isolamento (sem aplicação)
- **Base:** relatório Work já registrado no commit `9bdf1d4e1bc393d2acff9068945d86ebfdeb38f7`, mantendo Gate 1 PARCIAL e Gate 2/3/4 NO-GO. PR #666 Draft, issues #674/#676 ainda abertas conforme verificação anterior. Nenhuma alteração do Supabase foi autorizada nem executada agora.
- **Consulta complementar executada diretamente no sandbox `oxwmqbzeuiibdlkcbjzv` via Supabase connector, SELECT composto exclusivamente de contagens:** `auth.users=0`, `auth.identities=0`, `auth.sessions=0`, `storage.buckets=0`, `storage.objects=0`, `vault.secrets=0`, `public_relations=0`, `pg_publication_tables=0`, `pg_net=0`, `pg_cron=0`, `storage_policies=0`. Nenhum dado de linha, senha, hash, documento, chave, saldo ou payload lido. Projetos existentes protegidos não foram consultados nesta rodada.
- **Interpretação de escopo:** o número `10 users (estimated)` do Dashboard não corresponde à contagem exata `COUNT(*)` atual de `auth.users`; **a origem do indicador estimado não foi identificada**. Inventário SQL confirma buckets/objetos zero no ponto de tempo consultado, mas a falha da UI/serviço Storage por `exceed_egress_quota` permanece real conforme Work. O connector `get_project` segue com `ACTIVE_HEALTHY`; o Work viu `Unhealthy / Services restricted`. Não certificar capacidade operacional do serviço pelo status de infraestrutura nem por SQL acessível.
- **Riscos não resolvidos:** Auth Email/cadastro habilitado com caminho SMTP padrão capaz de enviar mensagens a destinatários autorizados, Realtime com canais públicos habilitados, SMS fornecedor não inventariado, isolamento de egress/cliente API e saúde operacional não comprovados. Zero tabelas Realtime publicadas não elimina canais Broadcast/Presence; ausência de conexões no Dashboard não exclui clientes por API.
- **Novo plano documentado na branch:** `docs/MEG-STAGE09-SANDBOX-GATE1-ISOLATION-PROPOSAL-20261112.md`, commit `8923cd6e5e0d8825c71a296a7f8f1a4887a7b56d`. Estabelece sequência para futura decisão sobre signup/e-mail sem envio, Realtime desligado ou privado+RLS, confirmação de SMS e links externos, e normalização operacional de Egress **sem upgrade/custo**. Nenhuma alteração de configuração foi aplicada. Mudanças futuras requerem autorização específica e avaliação de rollback; não usar a indisponibilidade por cota como substituto de isolamento.
- **CI verificada no SHA do Work `9bdf1d4e1bc393d2acff9068945d86ebfdeb38f7`:** Platform CI SUCCESS #43287996156, Backup Safety SUCCESS #43287996136, Financial PG17 sintético SUCCESS #43287996150, CORS SUCCESS #43287996286, Foundation SKIPPED. Um commit de documentação posterior exige revalidação da CI própria.
- **Governança:** somente leitura SQL no sandbox e alterações documentais na branch da PR #666. Sem SMTP/SMS, usuários de teste, fixtures, banco de produção, arquivo de backup/restauração, Vault GET/PUT, Android, Web homologada, Render, banco WSL, merge ou deploy. Sem homologação visual. Gate 1 continua PARCIAL; Gate 2 permanece BLOQUEADO.
- **Próximo passo exato:** validar com o responsável o plano de isolamento antes de qualquer modificação, e reavaliar condições de egress/capacidade do sandbox. Somente após critérios documentados e aprovação específica discutir alterações **restritas ao sandbox**, sem tocar produção.

## 12/11/2026 | Etapa 09 — autorização expressa de isolamento do sandbox (execução pendente)
- **Autorização do responsável:** após proposta específica apresentada neste chat para desativar temporariamente (1) o provedor Email do Supabase Auth e (2) o serviço Realtime, estritamente no sandbox `oxwmqbzeuiibdlkcbjzv`, usuário respondeu **“PROSSEGUIR”**. Consentimento limitado a essas **duas configurações no projeto destino**, sem expandir para signup isoladamente, SMS, hooks, RLS, dados, restauração, produção ou custos.
- **Revalidação prévia nesta sessão:** PR #666 permanece aberta, Draft, sem merge, head `7cc2e2c55e365361f9d2729055e9c0c86ee4dbf7`. O conector `get_project` confirmou o sandbox correto `meg-stage09-restore-sandbox-20261112`, região `sa-east-1`, PG 17.11, com status administrativo `ACTIVE_HEALTHY`; isto não comprova disponibilidade operacional sob restrição Egress.
- **Limitação de execução comprovada:** integração Supabase disponível nesta sessão NÃO expõe atualização de Auth Providers/Email ou Realtime Settings, nem uma sessão de Cloud Browser autenticada. **NENHUMA das duas configurações foi aplicada, salva ou testada nesta sessão.** É proibido simular mudança por SQL. Próxima ação real deve ocorrer via Dashboard autenticado no Work, nos links do **sandbox**, sem acesso aos projetos protegidos.
- **Procedimento autorizado ainda pendente:** no Work, identificar target pela referência exata; registrar estado anterior sem segredos; desativar Email Provider exclusivamente no sandbox e confirmar estado OFF por releitura; desativar Realtime Service exclusivamente no sandbox e confirmar estado OFF por releitura; observar erro de Egress, custo e qualquer falha de save; não emitir mensagens, conectar clientes, gerar credenciais, criar usuários/buckets, SQL, restaurar ou modificar o banco. Se ocorrer erro ou identidade incerta, interromper e registrar NÃO EXECUTADO/PARCIAL.
- **Rollback documentado, sem execução automática:** configuração anterior observada pelo Work era Email provider ENABLED, Realtime Service ENABLED, Allow public access to channels ENABLED. Restaurar somente mediante autorização, em ambiente sandbox, após necessidade comprovada. Não interpretar esta autorização de isolamento como autorização de reversão futura.
- **Governança:** Gate 1 ainda PARCIAL, Gate 2/3/4 NO-GO; máximo financeiro R$0. PR #666 Draft; issues #674/#676 abertas; produção, Android, Web homologada, Render, Vault, WSL não alterados. Depois de inspeção no Work, registrar evidências sanitizadas e novo HEAD/checks CI. A aprovação do usuário para a mudança não equivale a execução comprovada.

## 12/11/2026 | Etapa 09 — Work encontrou timeout no Email; tentativa de isolamento não executada
- **Relatório recebido do Work:** projeto correto `meg-stage09-restore-sandbox-20261112` (`oxwmqbzeuiibdlkcbjzv`) visível no Dashboard. Card de configuração Email não abriu, com erro de automação `Timed out after 3000ms`; portanto **Email permaneceu ENABLED, sem tentativa de desligar ou salvar**. Realtime confirmou `Enable Realtime service` ENABLED; controle de acesso público a canais ENABLED; não houve tentativa de desligar ou salvar, e `Save changes` estava desabilitado por ausência de modificações. O Work interrompeu conforme regra de segurança.
- **Situação operacional do Dashboard:** `Services restricted` e restrição de Egress persistiam no relatório do Work. Esta mensagem não deve ser interpretada automaticamente como causa técnica do timeout do seletor de interface. Conector Supabase retornou estado administrativo `ACTIVE_HEALTHY` nesta sessão, sem demonstrar funcionamento de endpoints gerenciados. Não declarar Gate 1 concluído.
- **Checagem complementar nesta sessão, read-only e só no sandbox:** Supabase query_logs executou UMA agregação de contagem por fonte dos logs das últimas 24h; `edge_logs=51`, `pgbouncer_logs=47`, `postgres_logs=24`, `auth_logs=22`, `realtime_logs=12`, `storage_logs=7`. Nenhum corpo de log, endereço IP, cabeçalho, URL de pedido, usuário ou segredo foi retornado. Essas contagens **não medem bytes de Egress nem explicam a quota da organização ou o timeout**. Não consultar Billing/Usage de outros projetos, não alterar planos e não executar novas tentativas por SQL.
- **Autorização preservada e limitada:** resposta `PROSSEGUIR` autorizou exclusivamente desligar Email Provider e Realtime Service temporariamente no sandbox. Até este registro, **nenhuma alteração no Supabase foi efetivamente aplicada**. Usuário solicitou continuar a investigação com proteção de continuidade e determinou que, ao utilizar Work, o resultado seja entregue em **arquivo Markdown real `.md`**, anexado para análise, não apenas texto formatado.
- **Situação Github verificada nesta sessão antes deste registro:** PR #666 Draft, sem merge, head `68f9fb26e078d4a8a1d9860e3b37f2e4f88d2485`; issues #674 e #676 permanecem open e open. Nenhum deploy, merge, escritura financeira, Vault, backup/restore, SQL de escrita ou mudança em produção, Android, Web, Render ou WSL.
- **Próxima ação autorizada:** diagnóstico read-only no Dashboard EXCLUSIVAMENTE do sandbox para distinguir timeout de UI e bloqueio de Egress, sem revelar dados de organização fora do projeto; se e só se os dois controles forem alcançáveis de forma normal e a identidade do projeto for confirmada, aplicar somente as duas alterações já autorizadas, validando o salvamento e estados após reload. Interromper no primeiro erro sem atalhos por scripts/SQL/APIs. Entregar relatório `.md` incluindo evidências verificadas, arquivos/commits/checks, não executados e pendências; atualizar este checkpoint somente com fatos comprovados.
- **Gates:** Gate 1 PARCIAL, Gates 2/3/4 NO-GO. Não criar fixtures, usuários, buckets, callbacks, webhooks, nem importar dados reais. Teto de custo R$ 0. Saúde do chat: acompanhamento qualitativo; se atingir atenção/troca recomendada, registrar checkpoint completo antes de recomendar migração.


## 12/11/2026 | Etapa 09 — Isolamento autorizado no sandbox, resultado parcial
- **Identidade conferida no Dashboard antes de agir:** `meg-stage09-restore-sandbox-20261112` (`oxwmqbzeuiibdlkcbjzv`), organização MEG Vilalva, plano Free. Nenhum outro projeto foi aberto. Projeto Supabase em `sa-east-1` conforme checkpoint; teto de custo R$ 0.
- **Falha anterior e diagnóstico:** o erro anterior foi `Timed out after 3000ms` ao abrir o controle de Email. Nesta execução, a tela de Auth inicialmente exibiu skeletons/carregamento; depois de uma única recarga normal, a página carregou e o card Email abriu normalmente. Isso é compatível com um timeout de automação/interface transitório, mas não comprova sua causa. Não há evidência de que o erro anterior tenha sido causado pelo Egress. O Dashboard exibiu `Services restricted` com a mensagem de que os projetos não podem atender solicitações porque a organização usou sua cota; também exibiu o link de Usage com `EXCEEDING USAGE LIMITS`. Durante a primeira observação apareceu banner `We are investigating a technical issue` com link para status, sem detalhe técnico. Nenhum erro específico de serviço ou de salvamento foi apresentado. Não foi acessada Usage/Billing organizacional nem outro projeto.
- **Email:** estado anterior visualizado como ENABLED. Apenas o switch `Enable email provider` foi desligado e salvo pelo painel. Após recarregar a página e aguardar seu carregamento normal, o Dashboard listou Email como DISABLED. Confirmação pós-recarga: **sim**. Signup e demais provedores não foram modificados.
- **Realtime:** estado anterior visualizado como `Enable Realtime service` habilitado e `Allow public access to channels` habilitado. Somente o controle `Enable Realtime service` foi desligado. O painel avisou que clientes não poderiam conectar e que salvar desconectaria clientes conectados; o salvamento foi confirmado pelo botão normal. Antes da recarga, o painel mostrou `Realtime service is disabled`, `You will need to enable it to continue using Realtime` e `Save changes` desabilitado, evidência de submissão concluída. Após a recarga solicitada para verificar persistência, a tela ficou em skeleton/carregamento e não voltou a renderizar controles no snapshot disponível; não foi feita nova tentativa. Confirmação pós-recarga: **não obtida**. Estado registrado como salvamento confirmado na UI, mas persistência após reload não verificada. `Allow public access to channels` permaneceu ligado, sem alteração.
- **Tabela de resultado:** Email: anterior ENABLED; ação desligar switch e salvar; salvamento realizado; posterior DISABLED confirmado após reload. Realtime service: anterior ENABLED; ação desligar switch e salvar com confirmação do Dashboard; UI confirmou desativado antes da recarga; após reload estado técnico dos controles não ficou disponível. Allow public access: anterior ENABLED; nenhuma ação; permanece sem alteração observada.
- **Egress/indisponibilidade:** `Services restricted` continuou visível no cabeçalho durante a navegação e após a verificação Email; `EXCEEDING USAGE LIMITS` também apareceu no seletor de projeto. Isto comprova restrição exibida no Dashboard, mas não identifica consumo por recurso nesta execução, não comprova a causa do timeout de automação e não permite inferir disponibilidade do banco ou serviços administrativos. A restrição coexistiu com carregamento e abertura do formulário Email. Em Realtime, após a recarga, somente a tela de carregamento foi observada; não atribuir isso definitivamente a Egress.
- **Arquivos e commits:** checkpoint atualizado exclusivamente neste commit documental. Nenhum código, script, migration, workflow, app ou configuração fora dos dois controles autorizados foi alterado.
- **CI/PR/issues:** consultar os checks automáticos do novo SHA, sem rerun manual. Preservar PR #666 como Draft e issues #674 e #676 abertas.
- **Gates e continuidade:** Gate 1 permanece **PARCIAL**. Gates 2/3/4 permanecem **NO-GO**. Pendências: obter estado pós-reload de Realtime quando a tela administrativa renderizar; resolver/isolar Egress operacionalmente fora do escopo desta autorização; concluir comprovação restante do isolamento externo e disponibilidade antes de qualquer Gate posterior.
- **Limites preservados:** nenhum SQL, API administrativa, DevTools, conexão SQL, dado financeiro, segredo Vault, usuário, bucket, notificação, webhook, backup, restore, faturamento, produção, Render, Android, Web homologada, WSL, merge ou deploy acessado/executado/modificado.

## 12/11/2026 | Etapa 09 — revisão do relatório Work pós-isolamento, CI e incidente regional
- **Fonte Work:** `MEG-STAGE09-GATE1-ISOLAMENTO-EXECUCAO-20261112.md`, recebido pelo responsável e auditado nesta sessão; o resultado já registrado no checkpoint da branch é preservado. Email Provider do sandbox `oxwmqbzeuiibdlkcbjzv` foi desativado e **confirmado DISABLED após reload**. Realtime Service foi salvo e a UI mostrou `Realtime service is disabled` **antes** do reload; depois a página ficou em skeleton, sem confirmação de persistência. Allow public access to channels não foi alterado. Não declarar Realtime definitivamente desativado até nova consulta read-only.
- **CI do commit Work `f56f4334dbf0f68bae8e987c72bafb14149592e4`, revalidada diretamente no GitHub:** Platform CI SUCCESS (run 43311896818), Backup Safety offline SUCCESS (43311896811), Financial Integration PostgreSQL17 sintético SUCCESS (43311897068), CORS Etapa 09 SUCCESS (43311896816), Web Evolution Foundation SKIPPED (43311896848). CI técnica não comprova salvamento do Realtime, eliminação de Egress nem restauração Supabase gerenciada.
- **Nova fonte oficial de contexto:** status público do Supabase em 12/11/2026 exibiu incidente `Database Connection Errors in sa-east-1 and ap-southeast-1`, status Investigating, componente Postgres, incluindo região `sa-east-1` do sandbox, em https://status.supabase.com/incidents/01M78QJT3GQX4V7VV88MBTQ5X3 . A página pública informa conexões com erros em alguns bancos. O incidente **pode contribuir** para falhas de carregamento, mas não prova causa do skeleton Realtime nem do Egress; verificar condição novamente na próxima execução.
- **Próxima ação estritamente autorizada:** acesso autenticado via Work ao Dashboard **somente do sandbox**, inspecionar por leitura `Realtime > Settings` e determinar se `Enable Realtime service` persiste OFF após carregar; NÃO clicar em Save nem mudar quaisquer switches. Se skeleton/erro, registrar impedimento e interromper, sem scripts, SQL, gestão de tokens ou acesso a Usage/Billing organizacional. Work deve retornar **arquivo .md real anexado** com evidências sanitizadas, HEAD, checks, estado observável, gates e próximo passo. Atualizar checkpoint apenas se surgirem novos fatos.
- **Governança preservada:** PR #666 Draft sem merge, issues #674/#676 abertas; origem Supabase, projeto inativo, Render, Android, Web homologada, WSL, Vault intocados; teto R$0. Gate 1 PARCIAL, Gate 2/3/4 NO-GO; nenhuma nova alteração de configuração nesta sessão.
- **CI após esta atualização documental:** consultar workflows no SHA novo deste commit, não assumir automaticamente os resultados do SHA anterior.


## 12/11/2026 | Etapa 09 — Realtime persistido confirmado por leitura
- **Leitura do Dashboard:** projeto confirmado antes da inspeção: `meg-stage09-restore-sandbox-20261112`, ID `oxwmqbzeuiibdlkcbjzv`; URL permaneceu exclusivamente no sandbox. Após carregamento normal, sem recarga adicional, o switch `Enable Realtime service` estava OFF. A página exibia as notas “Realtime service is disabled” e “You will need to enable it to continue using Realtime”; `Save changes` estava desabilitado. Resultado: desativação salva anteriormente persistiu após reload e está **confirmada por leitura**. Nenhum controle foi tocado. Nenhuma alteração no Supabase nesta sessão.
- **Disponibilidade no Dashboard:** o cabeçalho continuava exibindo `Services restricted` e explicava que projetos não podem atender solicitações porque a organização usou a cota. A tela também mostrou o aviso geral `We are investigating a technical issue`. Não foram acessadas páginas de Usage/Billing da organização.
- **Status público Supabase:** em 12/11/2026 às 18:42, incidente `Database Connection Errors` estava em **Investigating**, com condição `Degraded performance`. Atualização: o impacto se estendeu além das regiões inicialmente identificadas; somente um subconjunto de projetos estava afetado, com possibilidade de erros de conexão ou indisponibilidade de banco. A página pública não identificou se o projeto `oxwmqbzeuiibdlkcbjzv` pertence ao subconjunto, e na leitura não foi possível comprovar que `sa-east-1` estivesse individualmente afetada no momento. O incidente ativo é contexto consistente com a mensagem do Dashboard, mas não prova causa do Egress nem confirma impacto neste projeto específico.
- **Referência do incidente:** https://status.supabase.com/incidents/01M78QJT3GQX4V7VV88MBTQ5X3 . Nenhuma assinatura ou alerta foi configurado.
- **HEAD conferido antes do registro:** PR #666 head `859ef56bc70882fa783a68a42277767175824420`, branch autorizada, aberta e Draft, sem merge. Issues #674 e #676 abertas.
- **Ação de repositório:** como a leitura produziu evidência nova, atualizar somente este checkpoint; nenhuma outra alteração no repositório.
- **Gates:** Gate 1 permanece **PARCIAL**, apesar da confirmação de Realtime OFF, pois Egress e disponibilidade operacional ainda não estão resolvidos/comprovados e o isolamento externo permanece pendente. Gates 2/3/4 permanecem **NO-GO**.
- **Restrições preservadas:** nenhuma escrita no Supabase, mudança de configuração, SQL, Usage/Billing, dados financeiros, credenciais, Vault, outro projeto, Render, Android, Web homologada, WSL, backup, restore, merge, deploy ou contratação.

## 12/11/2026 | Etapa 09 — Diagnóstico read-only de Egress e disponibilidade do sandbox

- **Projeto conferido no Dashboard:** `meg-stage09-restore-sandbox-20261112`, ID `oxwmqbzeuiibdlkcbjzv`, organização MEG Vilalva, plano Free; inspeção limitada a este projeto. Não foi aberto projeto protegido nem tela organizacional de Usage/Billing.
- **Auth e controles de isolamento:** a página Sign In / Providers carregou e exibiu Email como **DISABLED**; os demais provedores visíveis estavam DISABLED. O estado de signup não foi alterado. Realtime foi observado OFF na tela Realtime Settings nesta execução, com mensagem de serviço desativado, conforme leitura anterior deste diagnóstico. Nenhum switch foi tocado.
- **Restrição e causa técnica identificada:** o Dashboard manteve o aviso `Services restricted` e o seletor `EXCEEDING USAGE LIMITS`. Na seção Custom Providers do Auth, o Dashboard retornou `Failed to retrieve Custom Auth Providers` e erro explícito: `Service for this project is restricted due to the following violations: exceed_egress_quota`. Isso comprova que a restrição aplicada a este projeto está associada à violação de quota de Egress. A mensagem orienta upgrade ou remoção de spend cap, mas nenhuma dessas ações foi realizada ou autorizada.
- **Limite da evidência de consumo:** não foi exibido nesta tela o total consumido, limite em GB, percentual, período de cobrança ou discriminação por serviço. A documentação oficial informa que os detalhes de Egress ficam na página Usage da organização, que permite filtrar projeto; essa página foi deliberadamente não acessada conforme o escopo. Portanto, a natureza Egress está tecnicamente confirmada, mas a quantidade e a origem por serviço ainda não.
- **Disponibilidade do sandbox:** a página de overview mostrou estado `Unhealthy`, 23 solicitações nos últimos 60 minutos e 34,8% de sucesso. Contagens exibidas por categoria: API Gateway 16, Auth 4, Realtime 3, Postgres 0, Edge Functions 0 e Storage 0. Esses dados são telemetria do Dashboard, não testes sintéticos; não comprovam disponibilidade contínua. A presença de solicitações e uma taxa de sucesso baixa não permite declarar o banco operacional. O metadata do conector Supabase havia retornado `ACTIVE_HEALTHY`, porém isso não se sobrepõe ao estado `Unhealthy` do overview nem comprova saúde de cada serviço gerenciado.
- **Erro de serviço observado:** o endpoint administrativo de Custom Auth Providers falhou especificamente por `exceed_egress_quota`; a seção de provedores padrão carregou. Isso demonstra restrição funcional real, mas não identifica todos os serviços bloqueados nem a causa de cada erro anterior de carregamento.
- **Status público:** incidente [Database Connection Errors](https://status.supabase.com/incidents/01M78QJT3GQX4V7VV88MBTQ5X3) ainda aparecia como **Investigating / Degraded performance** na consulta desta execução; a atualização pública indicava impacto em um subconjunto de projetos, sem identificar este sandbox como afetado. É um possível fator adicional de disponibilidade, não a explicação comprovada para a cota Egress.
- **Fatos, inferências e limitações:** fato: erro `exceed_egress_quota`, banner restrito, overview `Unhealthy`, taxa de sucesso 34,8%, incidente público Investigating, Email OFF, Realtime OFF. Inferência limitada: a quota excedida explica a restrição funcional indicada no erro do Auth; a indisponibilidade específica de Postgres não foi comprovada, pois a visão de solicitações mostra zero Postgres no intervalo, mas isso também não prova falha nem saúde. Não verificável neste escopo: GB consumidos/limite/percentual, Egress por serviço e dia, serviços/projetos responsáveis pelo total organizacional, estado de cobrança e prazo de liberação.
- **Autorização adicional necessária para detalhar consumo:** conceder autorização específica somente para abrir a página Usage da organização MEG Vilalva, selecionar exclusivamente o projeto sandbox e ler Egress e breakdown, sem visitar Billing, pagamento ou qualquer outro projeto. Sem essa autorização, os valores não podem ser confirmados.
- **GitHub antes do registro:** PR #666 aberta, Draft, sem merge; branch `stage09/backup-recovery-kit-20261110`, HEAD `08a9e7268dfc66d58b7e2a14470b4ee84a5c8c4f`. Issues #674 e #676 estavam abertas.
- **CI do HEAD de referência, consultada sem rerun:** Platform CI SUCCESS (run 43314278417); Stage09 Financial Integration PostgreSQL17 sintético SUCCESS (43314278513); CORS Etapa 09 SUCCESS (43314278463); Backup Recovery Safety offline SUCCESS (43314278532); Web Evolution Foundation SKIPPED (43314278455). Combined status não retornou status checks. Esses resultados não comprovam disponibilidade do Supabase nem resolvem a quota.
- **Ação documental:** atualizar exclusivamente este checkpoint com os achados acima; não houve alteração de código, workflows, configuração Supabase ou outros arquivos. Consultar a CI automática do novo SHA depois do commit, sem rerun manual.
- **Gates:** Gate 1 continua **PARCIAL**. Gates 2, 3 e 4 continuam **NO-GO**. A restrição Egress permanece ativa e disponibilidade operacional e isolamento externo ainda não foram demonstrados.
- **Restrições preservadas:** sem consulta a Usage/Billing organizacional, outros projetos, SQL, requisição de teste, escrita, credenciais, Vault, backup/restore, alteração de plano, produção, Render, Android, Web homologada, WSL, merge, deploy ou contratação.

## 12/11/2026 | Etapa 09 — autorização específica para leitura de Usage/Egress organizacional com filtro do sandbox
- **Autorização expressa do usuário nesta conversa:** após apresentação da pergunta 'Autoriza essa consulta restrita à página Usage da organização, com filtro exclusivo do sandbox?', usuário respondeu **AUTORIZO**. O consentimento se limita a **abrir Usage da organização MEG Vilalva em modo somente leitura e selecionar exclusivamente o sandbox `oxwmqbzeuiibdlkcbjzv` para examinar Egress e breakdown**. Não autoriza Billing, pagamentos, faturas, assinatura, upgrade, aquisição de quota, alteração de configurações, outro projeto, visualização dos dados dos demais projetos, requisições sintéticas ou mudança em produção. O teto financeiro R$ 0,00 permanece.
- **Motivo:** auditoria Work anterior confirmou no sandbox a restrição `exceed_egress_quota`, Overview `Unhealthy` (23 solicitações/60min, 34,8% de sucesso), Email Provider e Realtime Service OFF. A origem, consumo e limite numéricos continuam não determinados dentro do escopo anterior. A documentação do Supabase informa que a leitura segmentada de uso de Egress pertence à área Usage da organização. Os totais globais de Egress e a quota são de organização, mas a autorização **não** permite navegar em outros projetos ou inspecionar seus perfis individuais.
- **Procedimento futuro autorizado exclusivamente via Work autenticado:** identificar organização e sandbox; abrir Usage sem Billing; aplicar filtro **somente** para o Project ID `oxwmqbzeuiibdlkcbjzv` antes de analisar a tabela/gráfico; registrar somente métricas do sandbox, unidades, intervalo temporal, segmentação por serviço e limitações, sem dados de usuários, credenciais, endpoints ou dados financeiros. É permitido registrar a existência de limite/restrição organizacional sem revelar detalhes de outros projetos. Se o filtro não existir ou a tela exigir visualizar os demais projetos, parar e registrar a impossibilidade. Se um indicador for agregação não filtrável, não descrever como métrica do sandbox.
- **Entregável obrigatório:** Work deve criar e anexar um arquivo `.md` real, sugestão `MEG-STAGE09-GATE1-EGRESS-USAGE-FILTRADO-20261112.md`, com evidências verificadas, precisão dos números, fonte/intervalo, hipóteses separadas e próximos passos. Atualizar apenas `MEG-WEB-CONTINUIDADE-OFICIAL.md` na branch autorizada se houver evidência nova; conferir HEAD antes de commitar, depois consultar CI do novo SHA, sem rerun manual.
- **Último estado comprovado antes da autorização:** PR #666 Draft, aberta, sem merge, HEAD `c9e99fabed85b1e6fb882d2bc24520a6152406bb`, issues #674/#676 open; quatro workflows aplicáveis SUCCESS no SHA, conforme consulta. Gates: Gate 1 PARCIAL, Gates 2/3/4 NO-GO. Email e Realtime não devem ser reativados nesta auditoria.
- **Execução:** apenas autorização e documento registrados nesta etapa de chat; a inspeção da área Usage da organização **ainda não foi realizada**. Não marcar números ou correção de Egress como comprovados antes do relatório Work. Nada alterado no Supabase, produção, Android, Web homologada, Render, Vault, WSL, PR ou issues.

## 12/11/2026 | Etapa 09 — Usage/Egress com filtro exclusivo do sandbox

- **Autorização e identidade:** usada a autorização expressa registrada neste checkpoint. Dashboard confirmou organização `MEG Vilalva` (Free) e o filtro foi aplicado ao projeto `meg-stage09-restore-sandbox-20261112`, ID `oxwmqbzeuiibdlkcbjzv`, região `sa-east-1`. A URL filtrada continha `projectRef=oxwmqbzeuiibdlkcbjzv`; o painel exibiu `This project only.` Nenhum outro projeto foi aberto. Billing não foi acessado.
- **Período:** ciclo corrente mostrado no Usage: `27 Oct 2026 - 27 Nov 2026`. Os dados do painel atualizam por hora. O dashboard avisa que alguns dados podem levar até 24 horas para aparecer.
- **Egress próprio do sandbox:** no resumo de Usage filtrado, o Egress do projeto aparecia como `0 GB` (precisão arredondada da interface). O gráfico diário exibiu em 12/11/2026 tooltip `Auth Egress (100.0%): 9.858 KB`. O detalhamento do gráfico informa que a distribuição de tipos inclui cached Egress, embora este seja contabilizado separadamente. O painel não apresentou valor não arredondado do total acumulado do sandbox para todo o ciclo nem gráfico com outros dias acima de zero. Assim, é comprovado um registro diário de 9.858 KB, 100% Auth, e uma exibição agregada arredondada de 0 GB para o projeto; não se extrapola esse valor para outro dia.
- **Cached Egress do sandbox:** resumo exibido como `0 GB`; gráfico diário informou `No data in period`, com aviso de que pode levar até 24 horas para aparecer. Não há discriminação exata de bytes cached disponível.
- **Serviços no gráfico filtrado:** no tooltip disponível, Auth foi o único tipo exibido, com 9.858 KB e 100% em 12/11. Não foram apresentados valores distintos para Database, Shared Pooler, Storage, Realtime, Edge Functions, API ou Log Drains no filtro do projeto. Isso significa ausência de valor individual visível no tooltip, não uma prova independente de zero absoluto por serviço.
- **Quota e restrição organizacionais, sem atribuição por projeto:** fora do filtro do projeto, a tela Usage mostrava para a organização no plano Free Egress `12.968 / 5 GB (259%)`, usado `12.97 GB`, overage `7.97 GB`. O alerta dizia `All services are restricted`, respostas 402, Fair Use Policy e `Egress Exceeded`. Esses valores são do escopo organizacional agregado, não do sandbox; não foram usados para atribuir a origem aos projetos. O próprio filtro do sandbox mostrava apenas 0 GB arredondado e 9.858 KB no dia 12/11, muito abaixo do limite organizacional de 5 GB. Portanto, o consumo medido do sandbox não explica quantitativamente o overage agregado exibido.
- **Orientação de liberação exibida no painel:** upgrade levanta as restrições imediatamente, ou aguardar o início do próximo período de cobrança; a interface avisa que pode haver breve atraso após a virada. Nenhuma alteração financeira ou de plano foi feita. O período exibido termina em 27/11/2026; o painel não apresentou hora precisa de normalização.
- **Banco, tamanho e outros serviços do projeto:** Database Size mostrado como 24.97 MB, abaixo do limite exibido de 0.5 GB por projeto. Storage Size médio no período não tinha dados e mostrava 0 GB no resumo; MAU 0, Edge Function Invocations 0, Realtime Messages 0 e conexões simultâneas de pico 0. Esses indicadores são de uso faturável e não comprovam atendimento saudável. Email e Realtime permaneceram desativados durante toda a inspeção; nenhuma configuração foi modificada.
- **Status público consultado em 12/11:** [status.supabase.com](https://status.supabase.com/) mostrava dois incidentes em Investigating: `Elevated Error rates for All Supabase project APIs` (Data APIs, Functions, Storage, Auth, todas as regiões) e `Database Connection Errors` (Postgres, subconjunto de projetos). A visão regional de `sa-east-1` indicava uptime mensal de 100% e desempenho degradado em um dia para Data APIs, Functions, Postgres e Storage. A página não confirma que o sandbox específico foi afetado. Esses incidentes não explicam o overage de Egress.
- **Conclusão técnica:** fato: a organização excedeu a quota Free de Egress e o aviso de serviços restritos é organizacional; fato: o sandbox teve 9.858 KB de Auth Egress no dia 12/11 e resumo do ciclo arredondado a 0 GB. O dado filtrado não sustenta que o sandbox tenha gerado os 7.97 GB de overage; ele indica consumo próprio muito pequeno na janela observada. A contribuição quantitativa de cada outro projeto permanece desconhecida e não foi investigada.
- **GitHub antes do registro:** PR #666 aberta e Draft, sem merge; branch `stage09/backup-recovery-kit-20261110`, HEAD `09b75d0cf2984bdd45606fa43c4ea907ec36d1fa`. Issues #674 e #676 estavam abertas.
- **CI do HEAD de referência, consultada sem rerun:** Platform CI SUCCESS (run 43318098061), Backup Recovery Safety offline SUCCESS (43318097790), Financial Integration PostgreSQL17 sintético SUCCESS (43318097925), CORS Etapa 09 SUCCESS (43318097960); Web Evolution Foundation SKIPPED (43318097994). Combined status não trouxe status checks. Essa CI não verifica o Supabase operacional nem a quota.
- **Ação documental:** atualizar somente este checkpoint com métricas filtradas, escopo organizacional separado e limitações. Nenhuma configuração, código, regra financeira ou outro arquivo foi alterado. Após o commit, consultar automaticamente os workflows do novo SHA, sem rerun manual.
- **Gates:** Gate 1 continua **PARCIAL**; Gates 2, 3 e 4 continuam **NO-GO**. Não liberar Gate 2 nesta execução.
- **Restrições preservadas:** somente a página Usage autorizada, sem abrir Billing, cobrança, métodos de pagamento ou perfis de outros projetos; nenhuma alteração no Supabase, Email, Realtime, produção, projeto antigo, Render, Android, Web homologada, Vault ou PostgreSQL WSL. Sem SQL, tráfego artificial, backup, restore, merge, deploy ou custo.
 
## 12/11/2026 | Etapa 09 — Usage/Egress filtrado por produção, sandbox e projeto inativo

- **Autorização:** após a auditoria Work indicar que a produção e o projeto inativo precisariam ser incluídos para localizar o Egress, o responsável respondeu **“AUTORIZO PROSSEGUIR”**. Escopo usado: somente Usage da organização MEG Vilalva, com filtros individuais para produção `ugbiqzaqnrhulhetevby`, sandbox `oxwmqbzeuiibdlkcbjzv` e projeto inativo `dmrauztnozvxirbydtho`. Billing e outros recursos não foram abertos.
- **Ciclo:** 27/10/2026 a 27/11/2026. O Dashboard indicou atualização horária.
- **Organização:** o agregado exibiu Egress `13.057 / 5 GB (261%)`, uso arredondado `13.06 GB`, overage `8.06 GB`. Persistia `Services restricted` / `Egress Exceeded`, informando respostas HTTP 402. A interface orientava upgrade para remoção imediata ou aguardar o próximo ciclo, com possível atraso após a virada. Nenhuma ação de plano ou faturamento ocorreu.
- **Produção filtrada:** `meg-financas`, ID `ugbiqzaqnrhulhetevby`; a tela marcou `This project only.` e o resumo Egress exibiu `13.002 GB`. Tooltip em 05/11/2026: `929.451 MB`, maior pico diário que conferi, com `Shared Pooler Egress (100.0%)`. Tooltip em 12/11/2026: `715.37 MB`, também `Shared Pooler Egress (100.0%)`. A página não apresentou, nesta leitura, uma distribuição completa por todos os tipos e dias.
- **Sandbox filtrado:** `meg-stage09-restore-sandbox-20261112`, ID `oxwmqbzeuiibdlkcbjzv`; resumo `0 GB` arredondado. Tooltip diário em 12/11/2026: `Auth Egress (100.0%): 25.946 KB`. Cached Egress resumido a 0 GB; o gráfico informava que não havia dados no período e que a atualização pode levar até 24 horas.
- **Projeto inativo filtrado:** `meg-evolution`, ID `dmrauztnozvxirbydtho`; resumo Egress `0.054 GB`, Database Size 0 GB e mensagem `No active projects`. Não houve tentativa de reativação nem acesso à página do projeto.
- **Interpretação:** valores arredondados apontam aproximadamente 99,6% do agregado organizacional na produção, mas essa proporção é cálculo aproximado sobre cartões arredondados, não métrica calculada pelo painel. Os filtros confirmam volumes muito pequenos no sandbox e no projeto inativo diante do valor da produção. O gráfico atribui os pontos observados da produção ao Shared Pooler; isso é compatível com a hipótese de leituras de backend via pooler, porém não identifica cliente, endpoint, tabela ou rotina e não comprova causalidade. A soma dos cartões de projetos não fecha precisamente com o total organizacional, compatível com arredondamento e atualização em momentos distintos; a tela não permite determinar a diferença residual.
- **Status público consultado em 12/11/2026:** a página `status.supabase.com` exibiu `We’re fully operational`; na janela móvel de 30 dias, `sa-east-1` aparecia com 100% de uptime e um dia de desempenho degradado para Data APIs, Functions, Postgres e Storage. Nenhum incidente ativo foi mostrado na leitura. Isso não comprova saúde específica deste projeto nem explica o Egress.
- **Restrições e resultado:** nenhuma tela de Billing, cobrança ou pagamento foi aberta; não houve SQL, chamadas de teste, tráfego artificial, configuração, backup, restore ou alteração no Supabase. Email e Realtime não foram alterados.
- **PR antes do registro:** #666 aberta, Draft, sem merge; HEAD `92cf3ec807046ffe87e908c7c48249013bf67076`. Issues #674 e #676 permanecem abertas conforme estado registrado; não foram alteradas.
- **CI:** consultar os workflows automáticos do novo SHA após este registro, sem rerun manual. Não presumir resultado.
- **Gates:** Gate 1 permanece **PARCIAL**. Gates 2, 3 e 4 permanecem **NO-GO**. Consumo e serviço predominante estão melhor delimitados, porém seguem pendentes disponibilidade operacional comprovada, análise causal e isolamento externo.
- **Próximo passo:** correlação read-only do tráfego Shared Pooler observado com evidências técnicas de aplicação/PostgreSQL dentro de autorização específica, sem aumentar carga, consultar Billing, ou alterar produção.


## 13/11/2026 | Etapa 09 — piloto isolado de redução de Egress no startup
- **Autoridade e contexto:** depois do relatório Work de Usage organizacional, o projeto de produção `meg-financas` exibiu `13.002 GB` contra total organizacional `13.057 GB`, com Shared Pooler 100% nos dias 05/11 e 12/11 observados. Trata-se de pontos do painel, não atribuição causal a consulta específica.
- **Código implantado investigado:** Render API `meg-platform-api` no commit `28703a95310c9b9b5f193ef4f3a0cbe80e121f07`. O startup executa leituras abrangentes de `FinancialEvent` para reconciliação e normalização. Logs técnicos emitiram 19 inicializações, com 3.630 eventos normalizados e `reconciled=true`, em cada um dos dias UTC 12 e 13/11; instâncias distintas. A causa dos reinícios não foi determinada. Nenhum lançamento real foi consultado.
- **Experimento estritamente isolado:** PR [#689](https://github.com/MarcosVilalva/MEG-Platform/pull/689), **Draft, sem merge**, branch `experiment/stage09-egress-projection-20261113` baseada no HEAD anterior da PR #666 `6f131d69731c06f1f4137f6a8f06a7d07caf92be`. Modificou somente `apps/api/src/modules/app-state/normalized-primary-writeback.ts`, seu teste de caracterização e `docs/MEG-STAGE09-EXPERIMENTO-EGRESS-PROJECAO-20261113.md`. Substituiu `include` de linha integral por `select` dos campos que a reconstrução legada efetivamente consome, preservando `sourcePayload`, quantias/sinais, arquivados, revisão, atomicidade, auditoria e fallback.
- **Medição local 100% fictícia:** 3.630 eventos por cenário com quatro tamanhos nominais de payload; `JSON.stringify` sintético mostrou redução de **14,41% a 39,55% na representação de UMA consulta de startup** e equivalência de espelho/fingerprint, estorno, status e decisão de refresh. Não mede protocolo PostgreSQL/Supavisor, não garante economia global de Egress nem substitui PostgreSQL isolado. Arquivos do experimento local em `/mnt/data/MEG-STAGE09-EXPERIMENTO-PROJECAO-20261113.mjs` e `/mnt/data/MEG-STAGE09-EXPERIMENTO-PROJECAO-RESULTADOS-20261113.json` (não versionados).
- **CI real no código da PR #689:** branch de QA `fix/stage09-egress-projection-qa-20261113` apontando ao mesmo SHA `e8d4ac734e94b39199d8e282d3ff2cd00bc0ae7b` acionou automaticamente [MEG Platform CI, run 43546569620](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43546569620), conclusão **SUCCESS**. `validate`, Prisma Client, `npm run check` (testes e builds), imports e segurança do manifesto concluídos. `financial-e2e` e `android-rc1`: **SKIPPED**. Workflow específico de PostgreSQL17 foi **SKIPPED** por regra de escopo. Isso não equivale a teste de integração PostgreSQL17, caracterização de concorrência, homologação visual nem aprovação de merge/deploy.
- **Restrições preservadas:** nenhuma alteração na API ou banco de produção, Supabase, Render, WSL, Android, Web homologada, segredos, jobs de plataforma, API ativa, backup/restore, merge, plano, cobrança ou custos. Não há mitigação do bloqueio Egress em produção até deploy autorizado e validado.
- **Gates da Etapa 09 backup/DR inalterados:** Gate 1 **PARCIAL**, Gates 2/3/4 **NO-GO**. PR #666 permanece Draft, sem merge; issues #674 e #676 não foram alteradas.
- **Próximo passo exato:** caracterização no PostgreSQL17 exclusivamente descartável/local, comparando dados e comportamento do writer selecionado (inclusive pagamento, exclusão/arquivamento e concorrência) e medindo bytes do protocolo SQL; depois avaliar as leituras periódicas de `normalizationPreview` separadamente, sem sacrificar detecção de divergências. Não avançar a qualquer deploy produtivo sem autorização expressa.


## 13/11/2026 | Etapa 09 — PostgreSQL17 sintético e medição real do protocolo (PR #689 Draft)

- **Etapa e autoridade:** mantém exclusivamente Etapa 09 de backup/DR e diagnóstico de Egress, sem autorizar entrada em Etapa 10 ou alterações na Web homologada. Autoridade financeira `docs/MEG-WEB-FINANCIAL-AUTHORITY.md`. A origem completa dos 13,057 GB não foi comprovada por consulta individual.
- **Escopo técnico:** [PR #689](https://github.com/MarcosVilalva/MEG-Platform/pull/689), **Draft, aberta, sem merge**, branch `experiment/stage09-egress-projection-20261113`; seleção de colunas de `FinancialEvent` na reconciliação de inicialização, testes de caracterização e job PG17 isolado. PR #666 segue como checkpoint principal. Nenhum merge, deploy ou alteração de produção.
- **Medição de bytes do protocolo PostgreSQL, não apenas JSON:** workflow [#43548437998](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43548437998), commit testado `baa5f77cfdfeb743e73ca4fbbbb6dd5a1f93dc7a`, resultado **SUCCESS**. Usa container PostgreSQL 17 descartável da CI, Prisma e proxy TCP local, limitado a `127.0.0.1`; base fictícia de **3.630 eventos**, com `normalizationPreview.reconciled=true`. Não foi acessado Supabase de produção, WSL nem Vault.
- **Efeito específico da consulta otimizada:** leitura original com `include` transferiu **4.375.109 bytes** do servidor ao Prisma. Leitura projetada com `select` transferiu **3.772.587 bytes**. Diferença **602.522 bytes**, ou **13,772% a menos**, somente nessa consulta e nesses dados sintéticos. Não corresponde a redução de 13,772% do Egress total, não houve implantação.
- **Auditoria periódica original medida sem alterações:** chamada real de `normalizationPreview` transferiu **6.740.840 bytes**. Projeção hipotética de 96 auditorias em 24 horas continuamente ativas: **647.120.640 bytes/dia** nesse cenário sintético. Timer de 15 minutos, fingerprint, fallback e integridade financeira não foram modificados. A apuração real depende do uptime e dos tamanhos reais. A proximidade numérica com 715,37 MB de Shared Pooler em 12/11 é hipótese, **não prova causalidade**.
- **Caracterização PostgreSQL17 SUCCESS:** comparação integral dos 3.630 espelhos antes/depois, detecção de alteração de `sourcePayload`, eventos arquivados/órfãos, Ledger inalterado, idempotência, rollback, recusa de revisão antiga, concorrência com um vencedor. O primeiro ensaio detectou fixture com representação monetária em string; foi corrigida só a fixture, sem alteração de regra de negócio.
- **CI adicional:** [MEG Platform CI #43548438092](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43548438092) concluída **SUCCESS** para o SHA de código `baa5f77cfdfeb743e73ca4fbbbb6dd5a1f93dc7a`. Documentação experimental atualizada posteriormente na PR #689; consultar CI específica de commits seguintes antes de usá-los como gate.
- **Arquivos criados na PR #689:** `apps/api/src/modules/app-state/stage09-egress-pg17-e2e.test.ts` (E2E PG17 real, 100% sintético), `scripts/meg-stage09-pg17-wire-proxy.mjs` (contagem local de bytes), `.github/workflows/meg-stage09-egress-pg17-synthetic.yml` (apenas branch QA) e documentação `docs/MEG-STAGE09-EXPERIMENTO-EGRESS-PROJECAO-20261113.md`; além do código e teste de projeção anteriormente registrados. Nenhum workflow em `main` foi alterado.
- **Pendências técnicas:** avaliar abordagem equivalente para auditoria periódica sem enfraquecer checksum, detectar alterações fora da API, arquivamentos, exclusões, sinais e concorrência; demonstrar custo de bytes real no cenário proposto; recuperar disponibilidade de produção e comprovar isolamento externo antes de outros gates. O modelo otimizado não foi validado visualmente, nem liberado para merge/deploy.
- **Gates e limites:** Gate 1 **PARCIAL**, Gates 2/3/4 **NO-GO**. Issues #674 e #676 abertas (verificadas); preservar Android congelado, Web homologada, Render, Supabase de produção `ugbiqzaqnrhulhetevby`, sandbox `oxwmqbzeuiibdlkcbjzv`, WSL, backups, chaves e plano Free. Sem plano pago, merge, deploy ou escrita produtiva.
- **Próximo passo exato:** revisar a auditoria periódica com desenho formal que mantenha `normalizationFingerprint` equivalente; provar comportamento no mesmo PostgreSQL17 descartável e avaliar métricas oficiais antes de propor deploy. Não ajustar intervalo para esconder Egress.


## 14/11/2026 | Etapa 09 — auditoria periódica SHA-256 em PG17, testes ampliados

- **Etapa e escopo:** exclusivamente Etapa 09, diagnóstico de Egress/backup-DR. Testes autorizados na PR experimental [#689](https://github.com/MarcosVilalva/MEG-Platform/pull/689), branch `experiment/stage09-egress-projection-20261113`, mantendo PR principal #666 Draft, sem merge ou deploy. Código da auditoria periódica em `apps/api/src/modules/app-state/normalization-periodic-audit.ts` e ponto de uso somente no timer de `apps/api/src/server.ts`. Endpoint administrativo e `normalizationPreview` integral preservados.
- **Técnica:** PostgreSQL 17 calcula dois SHA-256 sem devolver linhas grandes ao cliente, um de todo o `AppState` e outro de todas as linhas de `FinancialEvent` do workspace. Cache em memória limitado a 16 workspaces, específico de workspace+usuário, só aceita resultado de auditoria integral **reconciled=true** e `normalized-primary` quando os snapshots antes e depois concordarem. Mudanças, arquivados, exclusões, rollback, falha do SQL ou primeiro acesso exigem rotina integral com o `normalizationFingerprint` original; não desativar auditoria nem alterar intervalo de 15 minutos.
- **CI sintética:** SHA de código testado `51950af7e40731bd7650dc00020b596d94e566e1`. [PG17 #43550388540](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43550388540) **SUCCESS**; [Platform CI #43550388576](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43550388576) **SUCCESS**. Fixture de 3.630 eventos fictícios; PostgreSQL 17 descartável, Prisma e proxy TCP em 127.0.0.1, sem Supabase, WSL, Render ou Vault produtivos.
- **Bytes realmente observados no teste:** auditoria integral original **6.740.840 bytes**; primeira execução da candidata com cache vazio **6.740.656 bytes**, sem economia significativa; repetição **sem mudança** **168 bytes**, queda de **99,998%** nesse cenário sintético específico. Startup preservou redução separada de **13,772%** na leitura selecionada. Não é redução confirmada de Egress faturado.
- **Proteções exercitadas em PG17:** drift por `notes`, `sourcePayload` e `signedAmount` alterados diretamente no DB, mudança não financeira em `AppState`, arquivamento externo, modo rollback, escrita intercalada entre snapshot e auditoria completa; nenhum cache indevido. Além disso: mesmo espelho/fingerprint, órfãos removidos, ledger intacto, rollback transacional, revisão antiga rejeitada, concorrência com vencedor único e idempotência. Tudo **PASS** na rodada final; um teste inicial tinha comparação artificial e inválida de volume de bytes entre primeiras leituras e foi corrigido só na asserção.
- **Relatório canônico do experimento:** [MEG-STAGE09-EXPERIMENTO-EGRESS-PROJECAO-20261113.md](https://github.com/MarcosVilalva/MEG-Platform/blob/experiment/stage09-egress-projection-20261113/docs/MEG-STAGE09-EXPERIMENTO-EGRESS-PROJECAO-20261113.md), com limitações e resultados. HEAD da PR #689 após documentação: `cf3b5fa3f8d90d95be6326ce56b4ea027d87a33e`. CI de documentação em QA deve ser consultada no SHA final.
- **Consulta agregada de logs Supabase, somente leitura, 13/11 00:00–14/11 00:00 UTC:** 1.201 entradas `supavisor_logs` e 413 `postgres_logs`; na segunda fonte, 410 LOG estado 00000 e 3 eventos de conexão estado 08006 (2 LOG, 1 FATAL). Logs agregados **não exibem bytes por consulta, duração ou razão exata dos 13,057 GB**. Nenhuma leitura de lançamentos financeiros reais, nenhum SQL ao banco de produção nem alteração do serviço foi realizada.
- **Diferença de branches:** #689 está **2 commits atrás de #666**, apenas por alterações no checkpoint. Não rebasear/mesclar sem revalidar a base e sem autorização de integração.
- **Gates e limitações:** Gate 1 **PARCIAL**, Gates 2, 3 e 4 **NO-GO**. Não comprovados: economia no Supabase faturado, causa quantitativa definitiva do Shared Pooler, CPU/memória/latência da consulta hash em produção, disponibilidade operacional, demais recursos de restauração e aprovação de deploy. Issues #674 e #676 permanecem abertas. Nenhum merge, produção, Android, Web homologada, WSL, Vault, cobrança ou segredo foi alterado.
- **Próximo passo exato:** medir em contexto autorizado e somente leitura o uso por consulta/endpoint e custo de CPU/IO/latência; avaliar repetição sem mudanças vs. fluxo real; manter a candidata na PR #689 Draft até prova operacional e autorização de merge/deploy separada.


## 14/11/2026 | Etapa 09 — escalabilidade e decisão técnica (sem implantação)

- **Escopo e autorização:** sequência de testes da Etapa 09 solicitada pelo operador; somente fixtures fictícias, PostgreSQL 17 descartável e consultas agregadas somente leitura a logs Supabase. Sem acesso a dados financeiros reais, credenciais, Vault, Render produtivo ou WSL. Sem merge de PR ou deploy.
- **Experimento #689:** `experiment/stage09-egress-projection-20261113`, Draft. O código do timer de 15 minutos mantém `normalizationPreview` integral como fallback obrigatório. A assinatura SHA-256 de `AppState` e de todas as linhas `FinancialEvent`, ordenada por ID, passou a ser construída com SHA-256 de cada linha seguido de agregação de hashes fixos e SHA-256 final. Isso é **somente dentro da PR experimental**, não altera as regras de negócio, writers, nem endpoint administrativo.
- **Escalabilidade CI PG17:** [#43552019834](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43552019834), [#43552309177](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43552309177) e [#43552538645](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43552538645): SUCCESS. O novo arquivo `stage09-egress-performance-pg17.test.ts` mede tempos `EXPLAIN ANALYZE`, blocos temporários, bytes de protocolo e quatro consultas concorrentes em 3.630, 12.000 e 24.000 eventos fictícios. No run #43552019834, mediana da consulta SHA anterior vs. nova: 84,306→52,137 ms; 256,928→152,631 ms; 516,758→290,242 ms, respectivamente. Outro run confirmou tendência com variação por ambiente. **Não é CPU% nem latência real de produção**.
- **Variante alternativa materializada:** testada em #43552538645, assinatura idêntica à SHA por linha, porém tempo maior; NÃO adotada. O uso de `temp blocks` foi variável entre rodadas, de 0 até 3.068 blocos escritos no maior cenário; **não** afirmar que hash por linha elimina I/O temporário.
- **Acerto do cache (12 ciclos por cenário, todas as mutações fictícias):** em [#43552309177](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43552309177), 0% de mudanças: 11 hits e 91,667% menos bytes agregados, incluindo primeira leitura integral; 25%: 9 hits, 75,006%; 50%: 6 hits, 50,014%; 100%: 0 hits, economia 0,031%. A economia de 99,998% por **uma repetição inalterada** não equivale à economia de uma rotina que encontra mudanças com frequência.
- **Memória do processo Node de CI:** aproximadamente 455 MiB com 3.630, 616 MiB com 12.000 e 1.060 MiB com 24.000 eventos na última rodada. Inclui preparo/preview integral e **não mede memória PostgreSQL nem Render**. Pode ser incompatível com instâncias de pouca memória se reproduzido; Render Free tem 512 MB segundo [documentação oficial](https://render.com/docs/compute-plans), mas o plano real do serviço não foi confirmado nesta etapa.
- **Supabase somente leitura:** `get_project` indicou `ACTIVE_HEALTHY` para produção; isto não exclui restrição de Egress organizacional. Logs agregados 12/11 UTC: Supavisor 1.315, PostgreSQL 412; 13/11 UTC: Supavisor 1.201, PostgreSQL 413. Sem medidas por SQL/endpoint. Documentação Supabase confirma que resultados pelo Supavisor compõem Shared Pooler Egress. Origem causal real dos 13,057 GB **NÃO comprovada**, embora exista correlação numérica plausível com chamadas periódicas no fixture. Nenhuma conexão SQL ao banco produtivo foi feita.
- **Sincronização:** a branch #689 incorporou os três commits pendentes da base #666, todos exclusivamente no checkpoint, via commit de integração somente dentro da branch experimental `a16c971f2882819eb1d4ece16bcb6614869961ad`; nenhum merge de PR #689 na PR #666/`main`. Verificar eventual nova divergência após esta atualização documental. A PR #689 preserva nove arquivos de alteração.
- **Homologação técnica:** suíte PG17 sintética, regressões e CI geral verdes na versão de código anterior à documentação. **Homologação operacional de produção NÃO realizada** e não pode ser presumida. Render exige seleção confirmada do workspace para consultar suas métricas; nenhum workspace foi selecionado nesta execução. Não criar projeto de staging pago nem deploy sem autorização separada.
- **Riscos e decisão:** performance do SHA é promissora e a integridade sintética passa, mas o consumo Node no cenário de 24.000 eventos exige cautela, e o monitoramento ainda não prova causa real da quota. **NO-GO para merge/deploy**; Gate 1 PARCIAL; Gates 2, 3, 4 NO-GO; issues #674/#676 permanecem abertas. Android, Home/Lançamentos homologados, API, Render, Supabase produtivo, Vault, WSL, dados, segredos, plano e cobrança intactos.
- **Arquivos da rodada:** `apps/api/src/modules/app-state/normalization-periodic-audit.ts`; `apps/api/src/modules/app-state/stage09-egress-performance-pg17.test.ts` (novo); `.github/workflows/meg-stage09-egress-pg17-synthetic.yml`; relatório `docs/MEG-STAGE09-EXPERIMENTO-EGRESS-PROJECAO-20261113.md`. Os outros arquivos do experimento anterior permanecem.
- **Próximo passo exato, condicionado:** definir com autorização separada um ambiente de homologação compatível com a produção e acesso read-only a métricas Render/Supabase por consulta e plano; medir RSS real, CPU/IO e a taxa de hits em operação antes de eventual deploy. Sem autorização, manter PR Draft e checkpoint como resultado verificável da etapa diagnóstica.


## 14/11/2026 | Etapa 09 — diagnóstico operacional Egress e bloqueadores definitivos

- **Autorização e execução:** responsável autorizou prosseguir com todas as ações necessárias. Escopo seguro executado: conexões apenas de **leitura** às métricas/logs Render e ao PostgreSQL Supabase produtivo por consultas SQL agregadas, sem retornar lançamentos, textos de transações, payload ou dados pessoais; ensaios de carga exclusivamente no PostgreSQL 17 descartável do GitHub Actions. Nenhuma escrita/DDL em Supabase de produção, Render ou WSL, nenhum custo/deploy/merge.
- **Workspace e serviço confirmado:** Render `My Workspace`, ID `tea-d98k1qhkh4rs73f4sfj0`, `meg-platform-api` ID `srv-d98k61daeets7384hvb0`, plano **Free 512 MiB**, branch `main`, commit produtivo `28703a95310c9b9b5f193ef4f3a0cbe80e121f07`, sem qualquer nova publicação. Supabase organização `MEG Vilalva` Free, produção `ugbiqzaqnrhulhetevby` com estado `ACTIVE_HEALTHY` no recurso de projeto, o que **não prova regularização da quota de Egress**.
- **Causa técnica bastante delimitada, mas sem atribuição de bytes faturados:** `pg_stat_statements` instalado, estatísticas acumuladas desde **10/07/2026 às 18:40:22 UTC**. SQL `FinancialEvent` com `sourcePayload` e campos de classificação, correspondente à projeção `normalizedItems`: assinatura `5094852670518382389`, **6.820 chamadas / 24.753.440 linhas / 3.629,54 linhas por chamada**. Outro SELECT integral `FinancialEvent`: **1.326 chamadas / 4.814.220 linhas**; SELECT `AppState.state` por workspace: **7.786 chamadas**, além de 4.690 por usuário. São números acumulados desde julho, **não são do ciclo 27/10–27/11** e não são bytes de rede. Uma segunda consulta confirmou +1 chamada/+3.630 linhas na primeira assinatura.
- **Tamanhos atuais sem acesso aos valores:** 3.630 eventos ativos, média de 1.368,6 bytes na representação `to_jsonb(e)::text`, soma de 4.968.196 bytes; `AppState.state` 2.412.952 bytes JSON. A origem do Shared Pooler por consulta/endpoint e a participação exata nos 13,057 GB não foram determinadas. Revisão do código confirmou `normalizedItems` compartilhada entre auditoria periódica e `GET /app-state`. Por segurança não inferir distribuição entre rotas.
- **Reprodução de leitura repetida no PG17 efêmero:** `normalizedStateForRead` (fonte do `GET /app-state`), com estado fictício integralmente reconciliado, transferiu **6.740.517 bytes** e novamente **6.740.297 bytes** em chamada idêntica e sem alterações. A PR #689 **não otimiza esta leitura**. Nova [issue #690](https://github.com/MarcosVilalva/MEG-Platform/issues/690), P0, para análise separada do read path com integridade financeira, RLS, concorrência e invalidadores externos.
- **Render observacional:** 25 startups distintas na janela UTC 13/11 00:00 a 14/11 09:30, 19 no dia 13 e 6 no dia 14, 25 IDs de instância, todos os logs específicos `reconciled=true`. Métricas disponibilizadas, amostragem esparsa: memória de 182.063.100 a 266.878.980 bytes em 61 amostras; CPU de 0,00226995 a 0,0037572167 em 37 amostras. Não são picos garantidos nem medições do experimento não implantado. Não foi comprovada causa das reinicializações.
- **Contenção real de memória em CI:** workflow [PG17 #43582674118](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43582674118) e [Platform CI #43582674039](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43582674039) **SUCCESS** no SHA de código `abf4a9c3a58dc320a3c1726bd1c97ab8860e6d9f`. Docker confirmou `memory.max=512 MiB`. Com 3.630 eventos fictícios e estado reconciliado: Node RSS 173,42 MiB, pico cgroup reportado 119,79 MiB, hash 68,22 ms e preview 286,88 ms. Com 24.000 eventos, fixture ampliada **não reconciliada**, RSS 467,12 MiB, pico cgroup 436,86 MiB, hash 372,35 ms, preview 1.536,66 ms: informativo, **não valida 24 mil eventos financeiros reconciliados**, nem CPU/memória Supabase. Reconciliação e igualdade permanecem aprovadas nos testes anteriores de 3.630 eventos.
- **Bloqueador de implantação P0 real:** Build Command do `meg-platform-api` executa `db:prepare:production` e `db:push:production`. O primeiro chama **`DELETE FROM "Budget"`** na deduplicação; o segundo chama **`prisma db push --accept-data-loss`**, seguido de criação de índices. Os scripts foram lidos no repositório `main`, **não executados**. Não é seguro disparar novo deploy antes de remover operações de dados do build e homologar plano de migração. Nova [issue #691](https://github.com/MarcosVilalva/MEG-Platform/issues/691), P0.
- **Relatório detalhado:** [docs/MEG-STAGE09-AUDITORIA-OPERACIONAL-EGRESS-20261114.md](https://github.com/MarcosVilalva/MEG-Platform/blob/experiment/stage09-egress-projection-20261113/docs/MEG-STAGE09-AUDITORIA-OPERACIONAL-EGRESS-20261114.md) na PR [#689](https://github.com/MarcosVilalva/MEG-Platform/pull/689). O relatório é documento experimental, sem merge em `main`.
- **Status:** PR #666 Draft, PR #689 Draft; issues #674/#676 seguem abertas, além das novas #690/#691. **Gate 1 PARCIAL; Gates 2/3/4 NO-GO.** Sem aprovação visual nova, pois nenhuma UI foi alterada. Não houve homologação real do Supabase completo, Vault e componentes gerenciados.
- **Próximo passo exato:** caracterizar em branch independente a otimização do `GET /app-state` com igualdade financeira, cenário multiusuário, write externo, rollback, memória e concorrência. Em paralelo, especificar correção segura da configuração Render sem `DELETE Budget` e `--accept-data-loss`, com migrações e rollback. Somente depois considerar QA operacional com banco isolado e autorização específica de infraestrutura, mantendo produção intacta até os gates serem aprovados. Não avançar Etapa 11 nem alterar Android/Web homologada.


## 14/11/2026 | Etapa 09 — duas correções isoladas P0 com testes completos, sem merge/deploy

**Identificação:** exclusivamente Etapa 09 de Egress/backup/DR. Repositório `MarcosVilalva/MEG-Platform`. Autoridade `docs/MEG-WEB-FINANCIAL-AUTHORITY.md`. O usuário autorizou prosseguir com todas as ações necessárias; a execução respeitou os bloqueios de produção e recuperação. Android congelado e Web homologada preservados. Não houve nova aprovação visual, pois nenhuma tela foi modificada.

### Entregas técnicas por branch, sem mistura de responsabilidades

1. **[PR #692](https://github.com/MarcosVilalva/MEG-Platform/pull/692) Draft, P0 build seguro, issue [#691](https://github.com/MarcosVilalva/MEG-Platform/issues/691).** Branch `safety/stage09-render-build-non-destructive-20261114`, base na #666; HEAD antes de sincronização documental `fd00202bc09b8b1be2a4ccba9a3410baf00ec3e9`. Arquivos: `scripts/meg-stage09-render-api-build.sh`, contrato `scripts/meg-stage09-render-api-build.contract.test.mjs`, workflow `.github/workflows/meg-stage09-render-api-safe-build.yml`, runbook `docs/MEG-STAGE09-RENDER-BUILD-SEGURO-20261114.md`. Script proposto: `npm ci --audit=false --fund=false`, `npm run db:generate`, `npm run build:api`, **sem DDL/DML/DELETE/prisma db push no build**. [CI build com DATABASE_URL inatingível #43585693570](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43585693570) SUCCESS; [Platform CI #43585693614](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43585693614) SUCCESS. CI prova compilação sem conexão a PostgreSQL, não atualização da configuração Render.
2. **[PR #693](https://github.com/MarcosVilalva/MEG-Platform/pull/693) Draft, P0 leitura GET, issue [#690](https://github.com/MarcosVilalva/MEG-Platform/issues/690).** Branch `experiment/stage09-appstate-read-cache-20261114`, **base na #689** para reutilizar o SHA integral já testado; HEAD de código `77d6961ebaafe3e75df55c38897d96d04c55f818`, posteriormente atualizado documentalmente. Arquivos: `apps/api/src/modules/app-state/normalization-read-cache.ts` (novo), `apps/api/src/modules/app-state/routes.ts` (só GET autenticado), extensão `stage09-egress-pg17-e2e.test.ts`, `stage09-egress-memory-pg17.test.ts`, workflow de QA e `docs/MEG-STAGE09-GET-APPSTATE-CACHE-EXPERIMENTO-20261114.md`. **Flag `MEG_STAGE09_GET_APPSTATE_CACHE=enabled` opt-in, DESLIGADA por padrão.** O handler continua resolvendo autorização de workspace em todo GET; cache keyed por workspace+proprietário, só se `normalizedPrimary` e `integrity.reconciled=true`, SHA de todo AppState e FinancialEvent antes e depois da leitura; fallback financeiro integral em qualquer divergência, rollback/erro. Mantém no máximo um workspace e só tenta guardar se resposta de até 10 MiB e até 5.000 transações, sem truncar resposta original.

### Resultados comprovados, todas as fixtures sintéticas

- [PG17 #43586579113](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43586579113) SUCCESS e [Platform CI #43586579066](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43586579066) SUCCESS no HEAD de código #693 `77d6961...`. GET original em duas leituras sem alterações: 6.740.517 e 6.740.297 bytes no protocolo PostgreSQL. Primeiro GET guardado: 6.740.633 bytes; segundo sem mudanças: **168 bytes**, **99,998% menos bytes exclusivamente nessa repetição sintética**, resposta financeira **idêntica**.
- PG17 detectou escrita monetária direta, mudança externa `sourcePayload`, alteração não financeira em AppState, modo rollback e arquivamento; reconciliação, ledger, transação, revisões, idempotência e outros contratos anteriores preservados. **Dois workspaces fictícios** provaram isolamento e eviction de cache; retorno ao workspace original exigiu nova leitura de 6.740.633 bytes.
- Payload não financeiro fictício de 11 MiB: duas leituras de **18.274.997 bytes cada**, sem guardar em cache, sem truncar estado. Teste puro recusou cache com **5.001 eventos** antes de JSON.stringify, aceitou 3.630. Flag não configurada ou `true` mantém cache inativo, só `enabled` ativa candidato.
- CI com contêiner Docker de limite real **512 MiB**: 3.630 eventos reconciliados, incluindo leitura guardada, RSS final ~212,77 MiB e máximo de processo ~219,54 MiB em rodada anterior; nenhuma ligação a banco produtivo. Ensaio de 24.000 eventos foi **apenas diagnóstico não reconciliado** e se aproximou do limite do plano Free; não usar como autorização para esse volume.

### Inspeção produtiva SOMENTE LEITURA e riscos

- Produção Render `meg-platform-api`, serviço `srv-d98k61daeets7384hvb0`, plano **Free 512 MiB**, branch `main`, commit live `28703a95310c9b9b5f193ef4f3a0cbe80e121f07`. **Build Command efetivo permanece INSEGURO**: `db:prepare:production` pode executar `DELETE FROM "Budget"` e `db:push:production` utiliza `prisma db push --accept-data-loss`. A PR #692 não muda a configuração Render. Nenhum novo deploy foi disparado.
- Supabase produção `ugbiqzaqnrhulhetevby`, organização Free. Consulta SQL AGREGADA e read-only em 14/11 confirmou `public."Budget"` com **0 linhas e 0 duplicidades**, e os **sete índices financeiros** de `ensure-performance-indexes.ts` presentes. Não foram retornados dados pessoais, valores de transações ou segredos.
- `pg_stat_statements` acumulado desde 10/07/2026 revela a consulta `FinancialEvent` com `sourcePayload` em 6.820 chamadas/24.753.440 linhas e múltiplos SELECT integrais `AppState`. Não há atribuição desses totais ao ciclo faturado 27/10–27/11, endpoint específico ou aos **13,057 GB**. A ausência de prova de economia real de Egress impede declarar correção produtiva.
- [Relatório operacional anterior](https://github.com/MarcosVilalva/MEG-Platform/blob/experiment/stage09-egress-projection-20261113/docs/MEG-STAGE09-AUDITORIA-OPERACIONAL-EGRESS-20261114.md) conserva evidências de logs, Egress PostgreSQL, métricas de CPU/memória Render e 25 reinícios observados.
- Problemas antigos [#674](https://github.com/MarcosVilalva/MEG-Platform/issues/674) (LedgerEntry/Payable) e [#676](https://github.com/MarcosVilalva/MEG-Platform/issues/676) (pg_net/watchdog) continuam abertos. Não realizar correção financeira sem auditoria e autorização específica.

### Gates, pendências reais e regra de continuidade

- **GO técnico isolado** para PRs #692 e #693; **NO-GO para merge, deploy e ativação da flag GET**. Gate 1 da recuperação Supabase **PARCIAL**; Gates 2/3/4 **NO-GO**. Falta homologar recuperação efetiva dos componentes gerenciados, isolamento externo do sandbox, plano de backup periódico e restauração real Vault/Auth/Storage/Realtime/Functions, correção do Build Command Render, staging seguro e Egress faturado.
- Nenhuma modificação no Android, Web homologada, API/Render/Supabase produtivo, WSL restaurado, Vault, dados reais, variáveis de ambiente, plano ou cobrança. Sem merge de PR ou alteração em `main`.
- **Ações proibidas até novos gates:** executar `db push --accept-data-loss`, deduplicação de Budget, SQL Vault, PUT da chave-raiz, restore no projeto original, carregar dados reais em staging não isolado, fazer deploy ou merge de mudança na API enquanto Build Command inseguro. Nenhum requisito crítico foi considerado concluído artificialmente.
- **Próximo passo exato:** sincronizar documentalmente #689, #692 e #693 com este checkpoint; verificar CI de todos os SHAs finais, sem executar produção. Depois, planejar com operador o isolamento comprovado da infraestrutura e o procedimento de migração sem mutação no build. A efetiva atualização do Render e homologação de Egress só podem ser realizadas após gates de recuperação e rollback positivos. Manter PRs Draft.


## 14/11/2026 | Etapa 09 — teste real de GET Fastify com isolamento de workspace (PG17 fictício)

- **Contexto:** continuação autorizada da Etapa 09, mantendo PRs #666, #689, #692 e #693 abertas em Draft, sem merge/deploy. Foi identificado que o trabalho de otimização do GET já estava implementado isoladamente na PR #693 e que o build seguro já existia na PR #692; as validações aprovadas foram **reaproveitadas sem reconstruir essas soluções**.
- **Novo teste de caracterização:** `apps/api/src/modules/app-state/stage09-get-auth-route-pg17.test.ts` na PR #693 executou `appStateRoutes` com Fastify real e PostgreSQL 17 descartável. O preHandler de autenticação é **simulado**; o resolver de permissões/membership e os workspaces são os mesmos módulos do sistema, com dados inteiramente fictícios. Testou sem credenciais, token desconhecido, proprietários distintos, VIEWER ativo, repetição com cache, eviction entre workspaces e rota original com flag ausente.
- **Resultados:** [PG17 sintético #43587267945](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43587267945) SUCCESS e [Platform CI #43587267975](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43587267975) SUCCESS no SHA `c9d4bab92d7c09e8559aa1830a7308ad0b421b4e`. HTTP 401 sem autenticação e com identificador desconhecido; HTTP 200 para owner A, viewer de A e owner B, sem vazamento entre workspaces; JSON igual no cache hit e com feature flag desabilitada.
- **Limitações:** não é autenticação JWT real nem staging com usuários/segredos reais, portanto não constitui aprovação operacional nem segurança de token homologada. Falta medição de Egress real, continuidade após reinício de instância e retorno financeiro inalterado sob concorrência de usuários reais.
- **Mudanças confinadas:** PR #693 recebeu apenas teste novo, etapa CI e atualização de relatório. Nenhuma API produtiva, Android, Web homologada, Render, Supabase, WSL, Vault, dados reais ou cobrança foram modificados. #692 não foi alterada.
- **Gates:** Gate 1 PARCIAL; Gates 2 a 4 NO-GO, devido à recuperação integral Supabase ainda não homologada; correção do Build Command #691 permanece proposta em PR #692 Draft sem aplicação no Render. PR #693 e cache GET permanecem desligados por padrão, sem merge/deploy.
- **Próximo passo autorizado dentro de segurança:** checar CI de documentação e sincronização dos HEADs, preservar os resultados. Antes de qualquer modificação produtiva, comprovar recuperação segura e desabilitar comandos de mutação financeira no build com plano de rollback.


## 14/11/2026 | Etapa 09 — autenticação JWT REAL em CI sintética

- **Evolução da rodada anterior:** o teste inicial `stage09-get-auth-route-pg17.test.ts` usava preHandler de autenticação simulado. Foi substituído pelo **plugin de autenticação JWT real** do MEG, `registerAuth` em `apps/api/src/plugins/auth.ts`, com segredo `JWT_SECRET` inventado exclusivamente para o workflow. Não foi usado token, senha, usuário, sessão ou informação produtiva. O restante do fluxo usa `appStateRoutes`, `resolveWorkspaceContext`, Prisma e PostgreSQL 17 efetivos, **apenas com workspaces e dados fictícios no CI**.
- **Cenários concluídos:** nenhum bearer token ou token malformado: HTTP 401; owner A, membro VIEWER ativo de A e owner B: HTTP 200; leitura repetida retorna JSON idêntico com cache; alternância entre workspaces não vaza dados nem produz resposta cruzada; flag ausente usa comportamento original e devolve JSON idêntico.
- **Testes verdes no SHA de código `6dc16b0c22d1525667ed3f268d902cc85de5b5e4`:** [PostgreSQL 17 + rota JWT #43587685877](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43587685877) SUCCESS (etapa específica "Check genuine Fastify JWT guard and workspace isolation in synthetic PostgreSQL 17"), [Platform CI #43587685885](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43587685885) SUCCESS. As duas não substituem homologação real de sessão, revogação, expiração e staging.
- **PR filha:** [#693](https://github.com/MarcosVilalva/MEG-Platform/pull/693), Draft, sem merge/deploy, flag desligada em produção; relatório atualizado `docs/MEG-STAGE09-GET-APPSTATE-CACHE-EXPERIMENTO-20261114.md`.
- **Risco de produção ainda pendente:** Build Command do Render usa scripts de deduplicação `Budget` e `prisma db push --accept-data-loss`; candidata segura em PR #692 não foi aplicada. Backup integral gerenciado e Vault não homologados; Egress faturado sem identificação quantitativa de cada consulta. Gate 1 PARCIAL; Gates 2 a 4 NO-GO. A autorização geral de investigação não deve contornar esses gates.
- **Ações executadas:** somente edição de teste, workflow, documentação e commits nas branches Draft; nenhuma mutação em Supabase produtivo, Render, Android, Web, WSL, Vault ou cobrança.
- **Próximo passo exato:** conferir CI pós-documentação e estado dos PRs; manter drafts e gerar novo checkpoint operacional antes de qualquer troca de chat. Não acionar deploy que execute scripts de schema destrutivos.


## 14/11/2026 | Etapa 09 — validação de JWT real com segredo sintético no GET

- **Atualização do teste de autenticação:** a PR [#693](https://github.com/MarcosVilalva/MEG-Platform/pull/693), ainda Draft e sem merge, evoluiu o ensaio Fastify `stage09-get-auth-route-pg17.test.ts` do `authenticate` simulado para o **plugin JWT verdadeiro do MEG** com segredo inteiramente fictício e declarado no CI. Permanece banco PG17 efêmero e nenhuma conexão a usuário, sessão ou serviço de produção. O teste não comprova login remoto com credenciais reais.
- **CI do código exato `6dc16b0c22d1525667ed3f268d902cc85de5b5e4`:** [PG17 #43587685877](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43587685877) **SUCCESS**; [Platform CI #43587685885](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43587685885) **SUCCESS**. O log registrou `jwtAuthentication=real-fastify-jwt-synthetic-secret`, HTTP 401 para anônimo e JWT inválido, HTTP 200 para proprietário e membro VIEWER autorizado, isolamento entre dois workspaces e igualdade de JSON do GET com e sem a flag habilitada.
- **Governança da PR #693:** o HEAD posterior `29b4dfe101300df323875defa877092be6047043` alterou **somente documentação** para refletir o novo ensaio. Para qualquer edição adicional de código ou workflow, verificar novamente os gates no SHA respectivo. PRs #666/#689/#692/#693 permanecem Draft, sem merge/deploy.
- **Build seguro:** a PR [#692](https://github.com/MarcosVilalva/MEG-Platform/pull/692) passou [CI compilatória sem banco #43587484354](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43587484354) e [Platform CI #43587484386](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43587484386) **SUCCESS** no commit `abcc3ee8ff511f0e3ae610b1b3b6155cfcb08e9d`, inclusive `NODE_ENV=production` com dependências de build explícitas. **Nenhuma alteração no Build Command real do Render**, que ainda pode deletar `Budget` e aceitar `--accept-data-loss`.
- **Bloqueio operacional inalterado:** Gate 1 de recuperação Supabase PARCIAL; Gates 2 a 4 NO-GO. Ausência de medição de economia **faturada** e de recuperação gerenciada integral. O usuário autorizou avanço das tarefas, mas não foi executado nenhum ato destrutivo, de cobrança, de merge ou de deploy. Android, UI homologada, Supabase e Render produtivos, Vault e WSL preservados. Próximo passo exato: resolver isolamento/restore gerenciado e a mudança segura de Build Command, em QA, com rollback antes de liberar qualquer publicação.


## 14/11/2026 | Etapa 09: HEADs conferidos e bloqueio efetivo do isolamento gerenciado

Continuidade exclusiva da Etapa 09, sem repetir auditorias ou testes encerrados. Consulta direta dos check-runs por SHA, pois combined status estava vazio e fetch_commit_workflow_runs retornava somente runs de evento pull_request, omitindo checks de push. Ausência nesses dois retornos não significa ausência de CI.

| PR Draft aberta | HEAD consultado | Checks executados no SHA |
|---|---|---|
| #666 | `5c6b02a994220d3ae6ee01543bfd07bc0a11c7da` | cors-stage09: success; postgres17-synthetic-restore: success; pg17-disposable-financial-writers: success; financial-invariants-postgres17: success; validate: success; offline-contract: success |
| #689 | `4bda62fa4091302412681a33331c865848147fde` | validate: success; pg17-egress-wire-synthetic: success |
| #692 | `5bdefdb8c2b40090964d15fc3cf76b54f3162c7f` | validate: success; compile-without-database: success |
| #693 | `5d75ede1c18aabe56a221cf6bd669e584ff59e3c` | validate: success; pg17-egress-wire-synthetic: success |

Checks SKIPPED foram preservados como omitidos, nunca como aprovação. Resultados sintéticos anteriores, JWT real com segredo fictício, restore local public e custódias permanecem válidos no respectivo escopo. As bases reportadas em #689/#692 ainda indicam 6328bdf8a3448c1220cea88531926e13a2a057ae; #666 está no SHA acima. Não foi feita sincronização de branches nem alegada paridade.

### Avanço read-only no Dashboard do sandbox
Destino exclusivo: oxwmqbzeuiibdlkcbjzv. O painel foi acessível nesta rodada:
- Provedores padrão Email/Phone/SAML/Web3/OAuth listados como Disabled; anonymous sign-ins e manual linking desmarcados. Allow new users to sign up e Confirm email marcados. Nenhum switch alterado.
- URL Configuration: Site URL http://localhost:3000, No Redirect URLs. Nenhum destino alterado.
- Banner real: Services restricted, organização excedeu quota. A consulta de Custom Auth Providers falhou explicitamente com exceed_egress_quota. Não é bloqueio de login ou evidência de bot.
- Conclusão limitada: as telas fornecem configuração parcial; não demonstram egress bloqueado por política nem ausência integral de callbacks. Restrição de cota não serve como controle de isolamento e pode desaparecer. SMTP/SMS/hooks/Storage/Realtime/runtime e provedores customizados continuam não homologados nesta rodada.
- list_projects ainda reporta ACTIVE_HEALTHY para origem e sandbox. Isso não significa serviços liberados: o Dashboard reporta restrição organizacional. Não remover spend cap, fazer upgrade ou gerar custo.

### Preparação segura Render preservada
get_service confirmou meg-platform-api Free, branch main, autoDeploy=yes, trigger commit. Build Command continua npm install && npm run db:generate && npm run build:api && npm run db:prepare:production && npm run db:push:production.
Candidata #692 mantém bash scripts/meg-stage09-render-api-build.sh, compilação sem banco comprovada no HEAD acima. Não foi aplicada ao serviço. Antes de executar configuração: gates de DR/rollback positivos, revisão do comportamento de auto-deploy e autorização específica. Não restaurar o comando inseguro como rollback e não usar pre-deploy pago para contornar limite R$0.

### Rastreabilidade e limites
Issues #674, #676, #690 e #691 consultadas e OPEN. Nenhum comentário externo enviado ou issue encerrada. #674 tem correção apenas em branch; #676 depende de watchdog/pg_net; #690 não prova economia faturada; #691 continua bloqueador produtivo.

Gate 1 PARCIAL e BLOQUEADO para conclusão funcional pela restrição de serviço e evidências faltantes. Gates 2 a 4 NO-GO. Nenhuma fixture, restore remoto, GET/PUT de root key, SQL produtivo, mudança Render, merge, deploy, alteração de plano ou custo nesta rodada. Android, Web homologada, WSL e dados reais preservados. Apenas checkpoint alterado na branch #666.

Próximo passo exato: concluir inspeção sanitizada de SMTP/SMS/hooks/Storage/Realtime e provedores customizados quando o serviço permitir, sem upgrade nem remoção de limite; então comprovar isolamento funcional antes de qualquer fixture/restore. Preparação #692 permanece revisável e bloqueada para aplicação. Novo SHA documental exige consulta de checks próprios; não transferir aprovação do SHA anterior.


## 14/11/2026 | Etapa 09: avanço do isolamento e gate automático do build seguro

Autorização de continuidade recebida. Checks aplicáveis de ffaa7d0975ebd75d1871c786693ebae78c6dce01 concluídos SUCCESS: validate, offline-contract, financial-invariants-postgres17, postgres17-synthetic-restore, pg17-disposable-financial-writers e cors-stage09. Jobs Android/financial-e2e/Foundation omitidos não são nova homologação.

### Dashboard exclusivo do sandbox, somente leitura
- Auth Hooks: painel vazio, convite Create an auth hook; nenhum hook listado.
- SMTP Settings: Enable custom SMTP desmarcado; Save changes desabilitado. Não equivale a bloquear o serviço padrão de email.
- Notificações de segurança listadas no painel Emails estavam desmarcadas.
- Storage: Failed to retrieve buckets, exceed_egress_quota. Não substituir contagem histórica por alegação de inventário atual válido.
- Storage Settings: transformação de imagens indisponível/desativada e limite Free fixo 50 MB; nenhuma configuração alterada.
- Realtime Settings: Enable Realtime service desmarcado e aviso Realtime service is disabled. Nenhuma conexão/subscription/fixture iniciada.
- Provedores customizados continuam sem leitura válida e saída de rede não comprovada. Restrição de quota não é política de isolamento. Gate 1 PARCIAL, Gates 2 a 4 NO-GO.

### Correção restrita de CI da PR #692
No HEAD 5bdefdb8c2b40090964d15fc3cf76b54f3162c7f o workflow de build compilatório aceitava somente fix/stage09-render-safe-build-qa-20261114. O check verde daquele SHA existe, porém edições futuras na branch da PR não o disparariam automaticamente.
Commit 29f6a6aa1a61360e740a86201b959ddf4aac2448 adicionou safety/stage09-render-build-non-destructive-20261114 ao push.branches e à condição do job. Apenas .github/workflows/meg-stage09-render-api-safe-build.yml alterado. Script compilatório, contrato, API, banco e UI preservados. Verificar checks próprios desse commit; CI anterior não substitui esta execução.

### Procedimento Render preparado, não executado
Referências oficiais lidas em 14/11/2026: https://render.com/docs/deploys.md ; https://render.com/docs/health-checks.md ; https://render.com/docs/rollbacks.md .
- Depois dos gates DR e autorização específica, registrar configuração/artefato live e verificar disponibilidade do artefato de rollback antes de mexer no serviço. Nenhum artefato foi escolhido ou rollback ensaiado em produção.
- Auto-deploy On Commit deve ser controlado antes de qualquer futura publicação. O modo After CI Checks Pass do Render aceita conclusões skipped/neutral; portanto não substitui gates explícitos MEG.
- Build proposto permanece bash scripts/meg-stage09-render-api-build.sh, sem tarefas de banco. Não aplicar enquanto o arquivo não existir no commit efetivamente implantável e os gates não forem liberados.
- Rollback usa artefato anterior, não reverte efeitos no banco. Pelo Dashboard desativa autodeploy; pela API não desativa automaticamente. Não reintroduzir o comando destrutivo como rollback.
- Confirmar /health e revisão efetiva apenas após publicação autorizada. Não há publicação nesta rodada.
- Não usar pre-deploy pago nem upgrade para contornar limite de custo zero. Não presumir que editar Build Command é operação sem deploy.

Issues #674/#676/#690/#691 permanecem rastreadas e abertas conforme última consulta. Nenhum backfill, segredo, SQL produtivo, restore, plano/cobrança, merge ou deploy. Android/Web homologada/WSL preservados. Próximo passo: verificar CI 29f6a6a e manter bloqueio de restore até leitura integral e isolamento funcional possíveis sem custos.


## 14/11/2026 | Etapa 09: acesso PostgreSQL da API confirmado e kit semanal OneDrive preparado

Pedido atual: concluir backup, torna-lo aplicavel pelo menos semanalmente no OneDrive e avaliar uso ate 15/11/2026, sem custo autorizado. Nenhum plano alterado, merge ou deploy executado.

### Correcao da avaliacao de disponibilidade
O bloqueio de servicos gerenciados nao foi tratado como prova de indisponibilidade da API:
- GET https://meg-platform-api.onrender.com/ready retornou HTTP 200, {"status":"ready"}. Codigo main apps/api/src/server.ts confirma que essa rota executa prisma SELECT 1.
- GET /health retornou HTTP 200, {"status":"ok","financialReady":true}.
- GET /app-state sem token retornou HTTP 401, {"error":"UNAUTHORIZED"}. Nao houve captura de token, login ou mutacao financeira.
- SELECT simples pela Management API confirmou database postgres e PG17; a sessao reportou transaction_read_only=off, mas a consulta executada foi exclusivamente SELECT de metadados, sem dados financeiros.
Isso comprova acesso API -> PostgreSQL naquele instante, nao login autenticado de usuario, escrita financeira real, estabilidade futura, economia de Egress ou recuperacao completa. Os servicos Auth/Storage gerenciados permanecem restritos. O MEG tem autenticacao propria em public.User conforme runbook; nao confundir com Supabase Auth.
Painel Usage consultado nesta conversa confirmou ciclo 27/10/2026 a 27/11/2026. Renovacao nao atende prazo 15/11. Pro anunciado a partir de US$25/mes, sem cotacao total aceita e sem contratacao. Nenhuma necessidade de upgrade foi demonstrada para o caminho /ready, portanto nao exigir plano pago sem evidencia adicional.

### Kit semanal candidato e testes
Commit inicial 5ce1ef10736b27a201d2edc0c9d0d43cf2ff5eac e correcao de recibo df478cec7c66b6d100ecc6bfd5fb93f90aee7da9, exclusivamente na PR #666 Draft:
- scripts/MEG-INSTALAR-BACKUP-SEMANAL.ps1: instalacao local usuario Windows, ACL privada, credencial DPAPI, chamada WSL, primeiro backup antes de registrar tarefa.
- scripts/MEG-EXECUTAR-BACKUP-SEMANAL.ps1: senha em stdin codificado, nunca argv/arquivo claro; recibo de falha atual substitui exibicao enganosa de recibo anterior.
- scripts/meg-stage09-weekly-backup.py: reutiliza safe-backup.sh SEM ALTERACAO, TLS verify-full/PG17/projeto fixo; lock, guarda sete dias, uma tentativa automatica/dia, sem retry continuo, copia exclusiva criptograma+manifesto com hash, sem sobrescrita nem exclusao.
- scripts/kit-sha256.json; tests/test_weekly_backup.py; .github/workflows/meg-stage09-weekly-backup.yml; docs/MEG-STAGE09-BACKUP-SEMANAL-ONEDRIVE-20261114.md.
Agenda proposta pelo instalador: domingo 10h no Windows e login quando vencido. Usa conta interativa sem elevacao. Depende de notebook ligado, sessao, internet, WSL, OneDrive e credenciais validas. Nao oferece SLA semanal com computador desligado.
7 testes offline locais PASS, bash -n PASS, hashes internos do ZIP PASS. CI especifica offline-copy-contracts e powershell-syntax-only PASS no commit df478cec; parser Windows PowerShell 5.1, sem executar instalador. CI original completa PASS no commit inicial 5ce1ef1. Conferir gates finais da correcao/documentacao no SHA proprio antes de citacao.
Pacote MEG-Backup-Semanal-OneDrive.zip entregue sem segredos. Nao foi instalado no notebook, nao ha tarefa ativa comprovada, nenhum novo pg_dump ou upload OneDrive real executado nesta rodada. Somente o operador tem acesso local a identidade/CA e ao OneDrive. Instalador exige senha apenas no terminal privado e recusa substituir instalacao/tarefa existente.
O recibo distingue ENCRYPTED_BACKUP_AND_LOCAL_ONEDRIVE_COPY_OK de remote_upload_verified=false. A primeira copia exige confirmacao OneDrive Web/download+hash. Cada copia nova tem integridade validada, nao restore funcional automatico. Nao apresentar kit pronto como automacao ja ativa.
Custodia age/Vault e restore local anteriores preservados. Nao repetir Vault GET/PUT, restauracao existente ou auditorias encerradas. Sem alteracao de scripts financeiros, Android, UI, banco ou Render.

### Viabilidade e gates
Uso da API atual e tecnicamente possivel no estado observado, mas nova publicacao continua NO-GO: Build Command real inseguro (#691), backup semanal ainda nao executado/instalado, recuperacao gerenciada Gate 1 parcial/Gates 2-4 NO-GO e validacao autenticada/visual propria da Web nao comprovada nesta rodada. Nao prometer conclusao ate amanha antes das evidencias.
Proximo passo exato: operador executar UMA VEZ o instalador do ZIP no Windows habitual, informar host e caminhos locais da identidade/CA existentes e senha apenas no terminal privado; fornecer somente marcadores saneados. Confirmar arquivo remoto no OneDrive e hash. Em paralelo, usar as evidencias de acesso API para continuar trabalho isolado sem exigir Pro; manter PRs #666/#689/#692/#693 Draft e issues #674/#676/#690/#691 abertas. Qualquer aplicacao do build, merge ou deploy depende de gate e autorizacao especifica.

## 14/11/2026 | Etapa 09: backup novo no ASUS e download OneDrive comprovados pelo operador

Esta secao supera a pendencia de instalacao do kit registrada acima, sem alterar gates de recuperacao gerenciada ou de publicacao.
- Operador migrou a preparacao para ASUS i5-14450HX, Windows proprio: WSL2 e Ubuntu-24.04 instalados, usuario m_vil; age 1.1.1, Python 3.12.3 e clientes PostgreSQL 17.12 confirmados, codigo 0. Nao foi instalado servidor PostgreSQL nesta preparacao. A mudanca de CurrentUser para RemoteSigned foi executada localmente pelo operador.
- Identidade existente recuperada de identity-protegida.age no OneDrive para pasta Linux privada, sem gerar chave nova. Relatorio: IDENTIDADE_RECUPERADA=OK, ABERTURA_INTEGRAL_BACKUP=OK, CODIGO_RECUPERACAO=0; abertura do archive antigo integralmente autenticada, sem restauracao e sem Supabase. Nao confundir com novo restore local neste ASUS.
- CA baixada pelo operador do Dashboard de meg-financas, validada como certificado CA e copiada para /home/m_vil/.meg-recovery-keys/prod-supabase-ca.crt, codigo 0. Identidade /home/m_vil/.meg-recovery-keys/identity.txt. Nenhum conteudo de chave ou senha enviado ao chat.
- Instalador do kit concluiu sem erro. Tarefa MEG-Backup-Semanal-OneDrive encontrada Ready, proximo disparo informado 15/11/2026 10h no Windows. LastTaskResult reportado 267011; nao e prova de execucao automatica concluida. Teste efetivo pelo Agendador ainda pendente.
- Primeiro backup novo: recibo ENCRYPTED_BACKUP_AND_LOCAL_ONEDRIVE_COPY_OK em 2026-11-14T13:02:26.620248+00:00 (10h02 Brasilia), encrypted_copy_hash_verified=True. Pasta 20261114T130226Z-393; arquivo meg-financas-full-20261114T130227Z-399.pgdump.age, manifesto correspondente e receipt.json.
- Verificador local independente confirmou INTEGRIDADE_COPIA_LOCAL=OK. Print do OneDrive Web enviado pelo operador mostra os tres arquivos, archive aproximadamente 1,51 MB, particular. Painel indicava 3,8 GB/5 GB usados (76%); nao houve compra de armazenamento.
- Download inicial nao encontrado pelo nome esperado; isso foi somente falha de localizacao, nao falha de integridade. Operador selecionou copia baixada pelo navegador fora das raizes OneDrive; relatorio posterior: INTEGRIDADE_DOWNLOAD_WEB=OK, HASH_E_TAMANHO=IGUAIS_AO_MANIFESTO, BACKUP_DESCRIPTOGRAFADO=NAO, NOVO_BACKUP_EXECUTADO=NAO, SUPABASE_ACESSADO=NAO.
- Gate de transporte desta copia: PASS com evidencia de listagem Web + download/hash pelo operador. Nao e inspecao independente da conta, SLA de backups futuros ou restauracao funcional do archive novo. O campo remote_upload_verified=false dos recibos locais e deliberado; a evidencia remota esta registrada aqui, sem editar recibo para simular verificacao automatica.
- Agenda instalada depende de computador ligado, sessao Windows e OneDrive disponiveis. Sem exclusao automatica de backups. Proxima verificacao: executar a tarefa pelo Agendador sem Force, esperar NOT_DUE devido ao backup recente e confirmar LastTaskResult=0 com novo LastRunTime. Nao repetir pg_dump para esse teste.
- Nova exportacao de leitura e copia cifrada foram executadas NO NOTEBOOK pelo operador dentro do pedido atual de concluir backup semanal, nao por este ambiente. Nao houve restore, mudanca financeira, Vault GET/PUT, merge, deploy, custo ou alteracao Render. As issues #674/#676/#690/#691 e os gates gerenciados permanecem em seus estados anteriores.
- Estado: backup novo + copia remota integramente conferida; tarefa registrada mas ainda sem teste de disparo pelo Agendador. Etapa 09 integral e publicacao continuam condicionadas aos gates restantes. Preservar resultados concluidos.

## 14/11/2026 | Etapa 09: disparo real pelo Agendador Windows aprovado

Relatorio do operador no ASUS: EXECUCAO_CONCLUIDA=True; ESTADO=Ready; ULTIMA_EXECUCAO=14/11/2026 10:14:49, horario Windows do operador; CODIGO_AGENDADOR=0; RESULTADO_ROTINA=NOT_DUE.
Isso comprova que o Agendador iniciou e concluiu o runner no contexto instalado e que a guarda do backup recente funcionou. Nao houve nova exportacao nesse disparo.
Consolidacao: primeiro backup novo de 14/11 com verificacao age/catalogo e copia cifrada local OK, disponibilidade OneDrive Web e download/hash/tamanho conferidos pelo operador, tarefa semanal registrada e disparo real NOT_DUE aprovado. Kit operacional no notebook, sem afirmar execucao futura garantida.
Limites preservados: primeiro disparo que efetivamente gerar outro backup vencido ainda nao ocorreu; notebook/sessao/rede/OneDrive devem estar disponiveis. Upload futuro nao tem verificacao remota automatica. Nenhum restore funcional do archive novo foi executado; restauracao anterior e demais evidencias continuam preservadas. Gate de backup semanal local/offsite desta rodada aprovado dentro desses limites, sem fechar Etapa 09 integral nem autorizar producao.
Proximas pendencias: recuperacao gerenciada Supabase, plano de rollback e Build Command seguro Render #691, homologacao aplicavel antes de publicacao. Nao repetir instalacao, backup imediato, custodia age ou auditorias ja encerradas. Nenhum merge/deploy, custo, alteracao financeira, Android ou UI nesta atualizacao documental.

## 14/11/2026 | Etapa 09: preparacao tecnica de Build Render e rollback concluida

Pedido de continuidade limitado a Etapa 09, custo R$0 e sem merge/deploy/producao. Backup semanal, custodia e transporte ja aprovados foram preservados, sem repetir exportacoes ou restauracoes.

### Candidata PR #692
Branch safety/stage09-render-build-non-destructive-20261114, HEAD a30e455105e78c79ee355f171643fc33d5357057, base PR #666, permanece Draft aberta sem merge.
Problema adicional encontrado: contrato anterior ignorava qualquer echo e nao cobria prepare/pre/post npm; npm ci poderia executar lifecycle hooks. Sem evidencia de hook malicioso existente. Correcao preventiva confinada ao build.
Script verifica contrato, substitui DATABASE_URL por localhost ficticio apenas na compilacao, usa ignore-scripts na instalacao e nos comandos npm explicitos. Prisma generate e tsc permanecem, sem tarefas de banco. Regressoes recusam echo com substituicao de comando, comandos DDL extras, URL externa, falta de ignore-scripts e hooks nos manifests. Nenhum package.json/lock/schema/servico financeiro alterado.
CI exata a30e455105e78c79ee355f171643fc33d5357057: compile-without-database SUCCESS [43599911160](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43599911160); Platform validate SUCCESS [43599911216](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43599911216), incluindo seguranca, testes e builds. android-rc1/financial-e2e SKIPPED, sem converter isso em homologacao.
Schema JSON oficial Render e contrato local PASS. Diff final revisado: .github/workflows/ci.yml; .github/workflows/meg-stage09-render-api-safe-build.yml; docs/MEG-STAGE09-RENDER-BUILD-SEGURO-20261114.md; render.yaml; scripts/meg-stage09-render-api-build.sh; scripts/meg-stage09-render-api-build.contract.test.mjs; scripts/meg-stage09-render-api-build.regression.test.mjs.
A CI geral agora acompanha a branch safety e o gate do YAML exige deploy manual. Testes anteriores permanecem associados aos respectivos SHAs.

### Origem produtiva e rollback conferidos somente leitura
Render meg-platform-api srv-d98k61daeets7384hvb0 Free/ohio/main continua live no SHA 28703a95310c9b9b5f193ef4f3a0cbe80e121f07, deploy dep-dbm92b17lnhs738s0jr0. Build Command real ainda inseguro; autoDeploy yes/on commit. Nenhuma configuracao foi salva.
Dashboard revelou Blueprint managed: meg-platform-production, exs-d98k30uq1p3s738jj240, branch main, path render.yaml, Auto Sync Yes. Corrigir somente Dashboard poderia ser sobrescrito. YAML na candidata agora aponta para bash scripts/meg-stage09-render-api-build.sh e autoDeployTrigger 'off', preservando plano/nome/regiao/runtime/envVars/start/health/filtros; sem recurso novo.
O painel mostrou Rollback ativo para dep-dbm7cprncjis738tl350 (222cee8) e dep-dbm7are8bjmc739li41g (db32195), e indisponivel para artefatos mais antigos. Nenhum link acionado. Disponibilidade nao prova compatibilidade desses commits. Para retornar apos nova publicacao, preferir artefato do live atual, reconfirmando disponibilidade e compatibilidade antes da janela autorizada.
Runbook fechado: pausar Auto Sync E auto-deploy antes de integrar o YAML na main; revisar diff herdado de #666; plano de sync com apenas mudancas esperadas; sync pode publicar mesmo com auto-deploy de commits off. Rollback por artefato nao reverte dados/efeitos de startup, nao restabelece build inseguro e nao substitui DR. Dashboard e API tem comportamentos diferentes de auto-deploy no rollback; reler controles separadamente.
Fontes oficiais Render deploys/health-checks/rollbacks/blueprint-spec/infrastructure-as-code e npm-ci consultadas nesta rodada. Nenhum plano/sync/approve/deploy solicitado.

### Checklist e decisao
Atendido: build isolado reforcado, fonte Blueprint candidata corrigida, schema validado, CI geral e compilatoria verdes, procedimentos de aplicacao e rollback revisaveis, PR atualizada, evidencia do backup preservada.
Nao atendido: aplicacao do comando/Blueprint real, ensaio produtivo de rollback, recuperacao integral Supabase e demais gates operacionais. #674/#676/#690/#691 consultadas OPEN. UI/Android/WSL/chaves/dados reais intocados.
Preparacao tecnica do Build Command CONCLUIDA. Etapa 09 integral e publicacao ainda NO-GO. Nao declarar problema produtivo #691 resolvido: comando perigoso permanece ate aplicacao autorizada. Nao exigir repetir backup semanal nem testes encerrados para esse checkpoint.
Proximo passo exato: tratar gates de recuperacao pendentes e a decisao de janela operacional; qualquer pausa de Auto Sync, mudanca do servico, integracao ou publicacao exige autorizacao especifica dentro dos gates. Nao misturar implementacoes experimentais #689/#693 ou Etapa 10 neste chat. Esta atualizacao e somente documental; verificar checks do novo SHA separadamente.

## 14/11/2026 | Etapa 09: diagnostico agregado dos endpoints do sandbox, sem alteracoes

- Continuidade restrita ao sandbox Supabase `oxwmqbzeuiibdlkcbjzv` e a branch `stage09/backup-recovery-kit-20261110`, PR #666 Draft. Releitura do checkpoint, autoridade financeira, plano de restore gerenciado e proposta de isolamento; backup semanal, Vault, restauracao local anterior e build seguro #692 nao foram repetidos.
- `Supabase.get_project` somente leitura retorna `ACTIVE_HEALTHY` e PostgreSQL `17.11.0.019`. Este metadado nao certifica disponibilidade operacional de Auth/Storage, isolamento de trafego nem retirada da restricao organizacional.
- Diagnostico NOVO na consulta: `Supabase.query_logs`, consultas agregadas read-only ao fluxo de logs do **sandbox**, janela padrao de ultimas 24h. `edge_logs`: Auth 1 resposta HTTP 200 e 6 respostas HTTP 402; Storage 2 respostas HTTP 402; demais rotas 3 respostas HTTP 200 e 2 respostas HTTP 402. Total 14 requests, sendo 4 HTTP 200 e 10 HTTP 402. A categorizacao usou somente prefixos de caminho (`/auth/`, `/storage/`, `/rest/`, outros), sem expor caminhos integrais, usuarios, IPs, credenciais, payloads, headers ou segredos. Leituras preliminares enumeraram apenas contagem por fonte e nomes de atributos disponiveis, nao valores confidenciais.
- Interpretação limitada: os HTTP 402 atuais reforcam o bloqueio operacional; a causa individual de cada resposta nao foi inferida apenas pelo codigo (a restricao de Egress esta documentada em observacoes anteriores). HTTP 200 isolado nao comprova funcionamento de cadastro, email, Storage ou recuperacao. A documentacao oficial de Auth permite introspeccao read-only de provedores, mas a ferramenta conectada nao disponibiliza configuracao gerenciada completa. Endpoints Management GET requerem credenciais e podem retornar segredos: nao foram utilizados. Tentativa de consultar o endpoint publico via ferramenta Web nao retornou dado utilizavel; nao equiparar esta falha a resposta do proprio Supabase.
- **Gate 1 continua PARCIAL, Gates 2-4 NO-GO.** Permanecem sem prova suficiente: fornecedores SMS e provedores customizados, ausencia de envios externos no Auth, funcionalidade Storage sob restricao, egress/callbacks e isolamento efetivo quando a quota voltar a permitir trafego. SMTP custom desabilitado e Realtime desabilitado nas ultimas leituras anteriores nao sao atestado geral de isolamento.
- Proximo passo tecnico depende de leitura autenticada e **sanitizada** das configuracoes gerenciadas do sandbox e de disponibilidade real do servico; quando possivel, completar somente os controles faltantes na matriz `docs/MEG-STAGE09-SANDBOX-GATE1-CONTROLES-GERENCIADOS-20261112.md`, sem repetir auditorias historicas. Nenhum acesso a producao, nenhuma fixture, SQL de escrita, Vault GET/PUT, e-mail, SMS, upload, restore, configuracao, plano, custo, merge, deploy, Blueprint sync ou alteracao Render/Android/Web/WSL.
- PR #692 build seguro permanece apenas candidata Draft, sem aplicacao produtiva. Issues #674/#676/#690/#691 preservadas abertas segundo verificacao anterior. O HEAD da PR #666 antes desta atualizacao era `fbdb024e049c7f3588103b11eafde06fb5e01909`; todos os checks aplicaveis daquele HEAD passaram conforme checkpoint do operador, mas o novo commit documental exige avaliacao independente de seus checks. Nao converter jobs skipped em sucesso.

## 14/11/2026 | Etapa 09: avaliador offline fail-closed de evidências do Gate 1

- Continuidade limitada a Etapa 09, branch `stage09/backup-recovery-kit-20261110` e PR #666 Draft; a fonte financeira `docs/MEG-WEB-FINANCIAL-AUTHORITY.md`, o plano `docs/MEG-STAGE09-SUPABASE-MANAGED-RESTORE-DRILL-20261112.md` e a proposta de isolamento existentes foram consultados antes de implementar.
- Novo avaliador em `scripts/meg-stage09-sandbox-gate1-evaluator.mjs`, com `tests/meg-stage09-sandbox-gate1-evaluator.test.mjs`, workflow `.github/workflows/meg-stage09-sandbox-gate1-offline.yml` e guia `docs/MEG-STAGE09-SANDBOX-GATE1-OFFLINE-20261114.md`. Não substitui auditorias ou runbooks anteriores e não altera scripts de backup já homologados.
- O avaliador executa **somente offline** e não contém rede, SQL, credenciais, PUT, autenticação, cadastro, upload nem funções de alteração de ambiente. Entrada JSON estritamente saneada com ref exclusiva `oxwmqbzeuiibdlkcbjzv`, contagens agregadas HTTP 200/402, data e 8 controles `SIM/NAO/NAO_VERIFICADO`. Recusa referências da produção/inativo, campos extras, números inválidos e entrada incompleta, sem ecoar campos de entrada ou conteúdo potencialmente sensível. Não recupera evidências gerenciadas sozinho nem fornece prova de isolamento; saída é somente `NO_GO` ou `REVISAO_MANUAL_OBRIGATORIA`, jamais `PASS` ou autorização de restore.
- Testes locais Node.js: 7/7 PASS (cenários fictícios) e sintaxe PASS. CI isolada `MEG Stage09 Sandbox Gate1 (offline, synthetic only)` SUCCESS no SHA `6672543c280ef5409fda9c764970141fbc7d3526` (run #43603615341) e no SHA `b7a5b42276669195d17f15121bbedb6ac395b154` (run #43603661686). Os demais workflows do SHA `b7a5b422...` estavam em execução na última leitura; `MEG Web Evolution Foundation` constava SKIPPED.
- Resultado técnico: nova guarda contra falsa aprovação do Gate 1 e contra entrada não sanitizada, sem qualquer acesso às configurações gerenciadas reais ou mudança de ambiente. **Gate 1 PARCIAL, Gate 2/3/4 NO-GO**; restrição operacional por HTTP 402 e ausência de comprovação de SMTP/SMS/providers customizados, integrações/egress, Auth/Storage e isolamento permanecem.
- Preservados backup semanal OneDrive, restauração public local anterior, Vault e age, Render, Supabase original `ugbiqzaqnrhulhetevby`, projeto inativo, Web homologada, Android, banco WSL, regras financeiras e issue #674/#676/#690/#691. Nenhuma fixture hospedada, teste de email/SMS, arquivo real, custo, merge, deploy ou Blueprint sync.
- Próximo passo exato: leitura autenticada somente das configurações gerenciadas restantes do **sandbox** quando o serviço permitir, relatando apenas indicadores sanitizados; depois comprovar isolamento real e disponibilidade operacional antes de qualquer fixture. PR #692 build seguro permanece Draft, sem integração produtiva. Após este novo commit documental, verificar os workflows associados ao novo SHA, sem reutilizar resultado do SHA anterior.
