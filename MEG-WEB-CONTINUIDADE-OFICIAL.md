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

## Início da revisão sequencial oficial das telas (27/10/2026)

- Nova autorização explícita: o usuário forneceu 16 imagens oficiais no chat e quer reconstrução **uma tela por vez**, com homologação sem Codespaces, preservando o DataGrid já criado. O mapeamento está no documento novo `docs/MEG-WEB-REFERENCIAS-OFICIAIS-20261027.md`.
- Há um desencontro real entre a solicitação verbal “primeira tela antes do login” e o arquivo oficial chamado `Loading pos login.png`. A tela de carregamento é tratada nesta rodada como **primeira a validar visualmente**, mas **continua pós-autenticação em produção**. O fluxo de autenticação existente não foi alterado nem simulado.
- Etapa autorizada **nesta branch:** somente revisão da interface de carregamento. Branch `meg-web-evolution/07-revisao-visual-loading-20261027`, PR #649 Draft contra `main`. A PR #648 de Novo Lançamento permanece separada e não será mesclada sem aprovação.
- Arquivos alterados: `apps/web/src/meg-web-evolution/auth/LoadingScreen.tsx`, `loading.css`, três WebP oficiais em `apps/web/public/meg-web-evolution/visual-loading/`; entrada de preview `apps/web/visual-sequence/`, `apps/web/vite.visual-sequence.config.ts`, teste de contrato `scripts/meg-web-07-loading-visual.test.mjs`. A arte foi recortada do print para isolar fundo/holograma/logo e evitar captura inteira como UI. Corrigido recorte com texto duplicado no holograma, commit `9ceec8d0`.
- Render isolado para a nova sequência: `meg-evolution-telas-visual`, ID `srv-dbghlt59fdbs73dgn1a0`, URL `https://meg-evolution-telas-visual.onrender.com/`, auto-deploy em cada commit. Exclusivamente estático e sem API/banco, não autentica nem registra finanças.
- DataGrid preservado integralmente. Nenhuma mudança em `apps/web/src/meg-web-evolution/datagrid/`, backend financeiro, `main`, Android ou operações financeiras.
- Solicitação de importar dados existentes do banco permanece **não executada**: não foi identificada e conectada uma base de homologação PostgreSQL isolada nem snapshot autorizado/mascarado. Não copiar produção nem expor dados no site estático. Antes de importar, verificar a origem real, privacidade, destino isolado, compatibilidade e o writer financeiro canônico.
- Gates: teste estático e build acionados no Render; conferir último deploy `live`, captura real em desktop e mobile, zero corte/rolagem, respeito a configurações de movimento e aprovação visual explícita. **Tela ainda não aprovada**. Próxima tela: Login, somente após autorização visual desta.

## Revisão sequencial · Tela 01 aprovada visualmente, Tela 02 Login em homologação (27/10/2026)

- **Aprovação do usuário:** após ver screenshot real do Render, o usuário declarou **"ficou bom, vamos para a próxima, a responsividade está boa"**. Registra aprovação visual explícita da **Tela 01: Loading pós-login** somente; aprovação visual não substitui testes da aplicação autenticada. A ordem funcional Login → Loading → aplicação permanece.
- **Tela 02 autorizada e implementada nesta rodada:** Login oficial conforme `Login.png` (1672×941), em `apps/web/src/meg-web-evolution/auth/LoginScreen.tsx` (componente funcional Web Evolution, não UI legada). Mantém o fluxo real `await login(normalizedEmail, password)`, validação de e-mail e senha, mostrar/ocultar senha, lembrar somente e-mail, links de Criar Conta e Recuperar Senha. A marca usa o WebP já aprovado da Tela 01. O fundo `login-background.webp` oficial existente e a composição responsiva `login.css` foram preservados porque já existem testes de caracterização anteriores; não improvisar mudanças que percam a referência. **Login não aprovado visualmente ainda.**
- **Preview isolado:** `apps/web/visual-sequence/entry.tsx` agora seleciona `?tela=login` como padrão e mantém `?tela=carregamento` para revisar a primeira tela. O componente de Login recebe `previewOnly` e interrompe submit antes da chamada à API, não lê/grava e-mail lembrado, desativa autocomplete e mostra aviso de não inserir senha real. A aplicação funcional usa prop padrão `previewOnly=false`, sem alteração no writer de autenticação. Este site não realiza autenticação e não valida login real.
- **Correção de layout no preview:** `apps/web/visual-sequence/preview.css` deixa a página de Login crescer sem clipping em dispositivo estreito, sem modificar o Loading já aprovado. Se a altura física não comportar todo o conteúdo, é preferível rolagem acessível a cortar campo. Zero rolagem na página *ainda precisa ser verificado visualmente nas resoluções solicitadas*, sem prometer resultado não testado.
- **Teste estático:** `scripts/meg-web-07-loading-visual.test.mjs` passou a verificar que preview bloqueia login antes da API, mantém autenticação real quando não preview, usa WebP e conserva DataGrid. Render `meg-evolution-telas-visual` em auto-deploy; build da revisão `abf9a4ff` reportado `live`, mas não equivale a E2E do aplicativo.
- **Arquivos alterados:** `LoginScreen.tsx`, `visual-sequence/entry.tsx`, `visual-sequence/preview.css`, `scripts/meg-web-07-loading-visual.test.mjs`, este checkpoint e metadados da PR #649. `login.css`, `DataGrid.tsx`, API, regras financeiras, Android, produção, `main` não foram modificados.
- **Próximo gate:** validação visual explícita pelo usuário da Tela 02 em desktop e mobile. Não avançar para Tela 03/Outros sem essa aprovação. Backend PostgreSQL isolado e importação de dados existentes seguem pendentes; não confundir site estático público com homologação financeira.

## Ajuste pontual da Tela 01 após avaliação do enquadramento (27/10/2026)

- Usuário aprovou o visual/responsividade da tela de carregamento e também o Login, porém questionou se a **ilustração de carregamento estava cortada**. Foi confirmado que sim: o asset anterior do holograma foi extraído de `Loading pos login.png` com recorte `(588,278,1163,676)` e continha fragmentos laterais e parte superior da arte interrompida. A aprovação anterior não elimina este defeito.
- Correção isolada: reexportado `apps/web/public/meg-web-evolution/visual-loading/hologram.webp` diretamente do mesmo print oficial, com região mais ampla `(557,296,1147,664)` e máscara de transparência nas bordas para separar gráfico da ambientação. Não foram substituídos o logo ou o fundo aprovados. Commit do asset `eb0289da`.
- Em `apps/web/src/meg-web-evolution/auth/loading.css` foram redistribuídas as frações das linhas do grid para dar **mais espaço vertical ao holograma** em desktop, tablet e mobile, mantendo `object-fit:contain` e os únicos breakpoints principais em 1024/640. Commit `2b7b0d49`.
- **Status:** ajuste submetido à branch isolada da PR #649 e ao Render automático, mas **esta nova revisão da Tela 01 exige conferência visual**, mesmo havendo aprovação anterior. Login, autenticação real, DataGrid, API financeira, Android, main e dados não foram modificados. Não declarar ausência de corte em viewport real sem captura/navegação.

## Sequência de teste Carregamento → Login e nova arte holográfica (27/10/2026)

- **Nova solicitação explícita:** conectar carregamento com Login para teste contínuo, sem usuário abrir duas URLs. A apresentação dessa sequência foi autorizada **somente no preview estático**, como fluxo de demonstração; a regra funcional existente continua `Login → Loading pós-auth → aplicação`. Não alterar o roteamento de produção, a API nem a autenticação real.
- **Novo visual solicitado:** cena fotográfica/holográfica gerada a partir do último conceito aprovado, com gráficos laterais, anéis e partículas, eliminando o efeito de névoa e falta de elementos da ilustração anterior. Criados assets WebP locais reais `apps/web/public/meg-web-evolution/visual-loading/scene-desktop.webp` e `scene-mobile.webp`, extraídos da nova imagem sem logo, textos ou barra de carregamento embutidos; texto e barra continuam React/CSS. Mobile usa corte artístico do gráfico central, não a panorama desktop inteira comprimida.
- **Alterado:** `LoadingScreen.tsx` usa `<picture>` com fonte mobile até 639px e arte desktop em resolução maior; `loading.css` contém grid e `object-fit:contain` preservando marca e status. `apps/web/visual-sequence/entry.tsx` agora implementa `?tela=fluxo` (padrão, demonstração inicia com Loading e muda para Login após 4,5s), `?tela=carregamento` (visual estático para inspeção), e `?tela=login` (login direto). Botões `Ir para o Login` e `Rever carregamento` disponíveis; sem funcionamento de API no preview.
- **Segurança:** `LoginScreen previewOnly` já existente continua bloqueando a submissão antes de `login()` e não consulta banco nem grava credenciais. A animação de progresso de 4,45s é explicitamente **simulada na prévia**, nunca apresentada como progresso real do backend. O estado de produção continua vindo da prop `progress`.
- **Conformidade:** DataGrid e API financeira intocados; Android e `main` intocados. Criação/Recuperação ainda sem telas revisadas; não avançar sem autorização do usuário. Última verificação estática no Render passou na revisão `d7c401ef`, mas houve falha intermediária de teste por asserção antiga de rota, corrigida.
- **Pendências:** confirmar última publicação Render `live`, visual real em desktop/tablet/mobile, transição automática, avanço manual e ausência de conteúdo cortado; aprovação explícita do usuário. Nenhuma prova E2E com banco; produção segue intocada. PR #649 continua Draft.


## Tela 01 · correção de splash full-bleed após vídeo 19-48-33.mp4 (27/10/2026)

- **Diagnóstico do vídeo real:** o usuário rejeitou a arte panorâmica comprimida no centro com grandes áreas vazias; decidiu por tela inteira ou retorno à composição anterior. Foi escolhida uma **nova arte cinematográfica de tela cheia** gerada exclusivamente para o carregamento. A substituição foi autorizada para elevar a qualidade. O arquivo recebido `19-48-33.mp4` foi inspecionado em quadros de 1s, 3s, 7s e 10s; a falha visual ocorre no carregamento antes da transição e não no Login.
- **Nova implementação:** background fotográfico `loading-fullbleed-cinematic.webp`, que preserva mundo/linhas/hologramas até as bordas da viewport, sem moldura central. O arquivo gerado foi limpo da logo, barra e textos incorporados; estes continuam elementos React semânticos (logo `logo-transparent.webp`, barra, mensagens e progresso). Imagem em `cover` no desktop e foco central no celular, mantendo o painel principal em destaque. `LoadingScreen.tsx` removeu `<picture>` com cenas horizontais reduzidas e usa espaçador decorativo sem imagem recortada. `loading.css` foi refeito sem sobreposições antigas. Somente breakpoints de largura 640 e 1024.
- **Prévia local de composição** realizada com Pillow em 1366×768, 390×844 e 320×568; demonstra enquadramento esperado, **não constitui E2E do navegador**. Navegação Playwright local não funcionou por bloqueio da política do ambiente. Requer conferir screenshots reais/zoom 100% no preview Render.
- **Fluxo visual** `Carregamento → Login` permanece exclusivamente no preview, com transição de 4,5 segundos; a sequência real continua `Login → Carregamento pós-auth → aplicativo`. Nenhum writer financeiro, DataGrid, API de autenticação, `main` ou Android foi alterado.
- **Gates:** verificar build/teste estático do Render e inspecionar desktop/mobile. A nova arte **não está visualmente aprovada** até manifestação explícita do usuário. PR #649 continua Draft, sem merge. Materiais antigos `scene-desktop.webp`, `scene-mobile.webp` e `hologram.webp` podem ser removidos do branch após verificar ausência de dependentes.

## Gate de progressão completa antes de mudar tela (27/10/2026)

- **Nova decisão explícita:** a barra de carregamento precisa atingir visualmente 100% antes da troca para a próxima tela. Corrigido no **preview visual** `apps/web/visual-sequence/entry.tsx`: progresso ilustrativo de 0 a 100% durante 4,5 segundos, com avanço `Carregamento → Login` **somente quando `progress === 100`**, segurando 550 ms para visualização. Nenhuma navegação por timeout independente do percentual. O botão `Carregando... NN%` fica desabilitado até 100%, quando passa a `Continuar para o Login`. `?tela=carregamento` pode mostrar 100% sem avançar para facilitar comparação visual.
- Em `LoadingScreen.tsx`, o preview recebe `progress` e renderiza preenchimento via `scaleX(progress / 100)`; ARIA informa percentual e marca expressamente o progresso **ilustrativo**, sem afirmar leitura de dados. A animação CSS que controlava a barra independentemente do React foi retirada de `loading.css` e `visual-sequence/preview.css`, evitando divergência entre barra e navegação. O progresso em produção permanece vindo da prop canônica `progress`, e **100% no produto deve significar conclusão real das operações essenciais**, não duração arbitrária. Nenhuma mudança de autenticação/roteamento real.
- Teste estático `scripts/meg-web-07-loading-visual.test.mjs` atualizado para verificar componente controlado, ausência de timeout que navegue cedo, guarda de 100%, controles e DataGrid. **Pendente**: build do Render + validação visual da barra em desktop/mobile. Não validar tela automaticamente por build. PR #649 continua Draft; Android, `main` e domínio financeiro intactos.

## Tela 03 · Criar Conta após aprovação do Loading completo (27/10/2026)

- **Aprovação visual expressa do usuário:** após o preview `0c3a0f35` com cenário full-bleed e barra atingindo 100% antes do Login, o usuário afirmou `EXATAMENTO, FICOU LINDO, VAMOS PARA PROXIMA`. Registrar **aprovação visual da Tela 01 no último formato mostrado**, inclusive transição de demonstração. O Login (Tela 02) já havia sido aprovado em conversa imediatamente anterior. Nenhuma aprovação técnica de fluxo financeiro E2E nem merge implícito.
- **Próxima tela autorizada:** **Criar Conta**, conforme ordem obrigatória Loading / Login / Criar Conta / Recuperar Senha do Prompt Master. Importante: **não existe print separado de Criar Conta entre as 16 imagens oficiais de 27/10**; utilizou-se a identidade visual do Login que o usuário aprovou, e somente a organização de campos do componente funcional já existente. Ainda exige validação visual explícita da Tela 03. Não avançar para Recuperar Senha nem Home antes do aceite.
- **Contratos preservados no componente existente `CreateAccountScreen.tsx`:** modos `REQUEST_ACCESS` e `CREATE_WORKSPACE`, campos nome, e-mail, telefone, senha, confirmar senha e nome do espaço quando aplicável, validações existentes, fluxo `register(...)` canônico, estados de aprovação/pendência e retorno para Login. Não alterar tipos, aprovação, lógica do servidor nem API.
- **Preview seguro:** adicionado `previewOnly=false` por padrão; no preview, campos são validados com as regras já existentes, mas a função interrompe ANTES de `register`, limpa senhas após validação e informa explicitamente que não houve envio. Autocomplete desligado somente no preview, usuários orientados a inserir **apenas dados fictícios**; o app real conserva funções e propriedades anteriores. `AuthScreenLayout` agora usa logo WebP oficial já aprovado (sem alteração na tela principal de Login).
- **Navegação visual:** `apps/web/visual-sequence/entry.tsx` oferece `?tela=cadastro` direto e o link de Criar Conta do Login conectado ao componente real; voltar ao Login funciona independentemente do percentual de Loading, mas no fluxo de carregamento mantém guarda `progress===100`. `preview.css` mantém botão de navegação externo fora do formulário no cadastro. `auth-screens.css` adiciona apenas aviso visual de homologação e feedback distinto do erro, mantendo as disposições de campos já existentes.
- **Testes estáticos:** `scripts/meg-web-07-loading-visual.test.mjs` acrescentou verificação do bloqueio de cadastro em preview antes de `register`, preservação de modos/validação, acesso direto à tela, retorno, marca WebP e DataGrid. Build automático e publicação no Render devem ser confirmados para a última revisão, sem presumir aceite visual.
- **Arquivos editados:** `CreateAccountScreen.tsx`, `AuthScreenLayout.tsx`, `auth-screens.css`, `visual-sequence/entry.tsx`, `visual-sequence/preview.css`, teste de contrato e checkpoint. Nenhum arquivo de DataGrid, domínio financeiro, API, Android ou main alterado. PR #649 permanece Draft, sem merge. Banco isolado com dados existentes segue pendente, e a prévia estática não autentica nem registra usuários.

## Tela 03 · rolagem interna, botão persistente e logo ampliada (27/10/2026)

- Usuário enviou captura do cadastro renderizado (`image(20261027-235059).png`, 1357×637, página com barra vertical à direita e footer cortado). Solicitou **zero rolagem da página, somente formulário rolável, botão de envio sempre visível e logo MEG maior/melhor**. Não alterou requisitos de campos, modos de cadastro ou aprovação.
- A causa foi identificada em `apps/web/src/meg-web-evolution/auth/auth-screens.css`: regras cumulativas antigas (inclusive PR #627) forçavam `height:auto`, `overflow-y:visible`, desconstruíam a grade e empilhavam os três cards comerciais em desktop de menor altura. **Reescrita limpa e estrutural**, preservando as regras CSS compartilhadas das demais telas até o início do bloco anterior do cadastro e substituindo todo o restante relativo a cadastro por **um único bloco** coerente.
- Estrutura desktop: tela e `.meg-login-frame` com `height:100dvh`/limites de altura; painel cadastro em grade `header auto / form minmax(0,1fr) / footer auto`; dentro do form `fields minmax(0,1fr) / mensagens auto / CTA auto`. **Só `.meg-auth-fields` usa `overflow-y:auto`**, com `overscroll-behavior:contain`, indicadores discretos e foco acessível. Rodapé `Voltar ao login` e botão canônico `Continuar` sempre fora do bloco rolável. Não trocar rótulo de negócio para `Salvar` sem aprovação; CTA efetua solicitação de acesso, não cria transação financeira.
- Para <=1024px: hero reduzido à marca, sem ocultar campos; tela em uma coluna com logo em linha superior e formulário no restante, evitando a página longa. Breakpoints de largura apenas 640/1024. Em janelas desktop extremamente baixas, cards promocionais podem ser omitidos, preservando todas as informações obrigatórias.
- `AuthScreenLayout.tsx` escolhe **somente para `variant=register`** a logo `logo-transparent.webp` de 440×360 RGBA, já versionada; logo ampliada no CSS a aproximadamente 10–12,5rem no desktop e adaptada em mobile. Login e recuperação continuam com `logo.webp` anterior, para não modificar telas fora da etapa.
- Preview `visual-sequence/entry.tsx` não renderiza a navegação externa na Tela 03: o `Voltar ao login` interno do card já existe e permanece acessível. `preview.css` limita o cadastro ao viewport `100dvh` e bloqueia rolagem externa.
- `scripts/meg-web-07-loading-visual.test.mjs` recebeu caracterização de CSS estrutural, marca e navegação, preservando o bloqueio de `register` em `previewOnly`. Build Render **live na revisão `494d4c56`**. Correções não publicadas em `main` ou Android; nenhuma mudança em DataGrid, API, auth client, financeiro ou banco.
- **Pendência:** revisão visual real do usuário em Chrome 100%, desktop e mobile, com teste de teclado, scroll interno/foco, alternância `Solicitar acesso` / `Criar meu espaço MEG`, feedback de erro e CTA persistente. Build/teste estático não comprovam zero corte em todas as viewports; **Tela 03 não aprovada**. PR #649 Draft, sem merge.

## Tela 03 · novo hero editorial sem cards promocionais (28/10/2026)

- **Pedido com print real:** o usuário enviou `image(20261027-235836).png`, mostrando a lateral esquerda do Criar Conta: grande faixa vazia entre logo e slogan, texto genérico, três cards compactos de Saldo real/Projetos/Controle desproporcionais. Pediu sugestão e autorizou **nova composição**. Esse print rejeita a qualidade da lateral, sem revogar a aprovação do Login ou da Tela 01.
- **Decisão de design:** retirar os três cards genéricos **somente na Tela 03**. Manter como fundo a fotografia real de montanhas e luzes do Login já aprovado, com gradiente de contraste próprio para cadastro. Novo painel editorial: logo transparente, etiqueta `MEG WEB EVOLUTION`, título `Seu próximo passo começa aqui.`, texto vinculado aos dois modos de cadastro já existentes e assinatura mínima `CLAREZA PARA DECIDIR` com traço luminoso. Sem dados fictícios, painéis SVG adicionais, campos falsos ou animações financeiras. A composição não deve ser uma cópia de screenshot como UI.
- **Arquivos alterados:** `AuthScreenLayout.tsx` apresenta hero independente quando `variant === 'register'` e preserva integralmente o hero anterior quando essa prop não está presente. `auth-screens.css` remove regras de grade de cards da etapa 03, insere hero editorial sem cards e mantém a estrutura da página fixa com formulário interno rolável e CTA persistente. Breakpoints principais 640/1024; em tablet/mobile a lateral editorial some e apenas a logo fica visível, para preservar os campos obrigatórios e toques. `scripts/meg-web-07-loading-visual.test.mjs` ampliado para assegurar presença do novo layout, exclusividade do cadastro e manutenção do fluxo/validação. Nenhum arquivo financeiro, `DataGrid`, LoginScreen, LoadingScreen, `main` ou Android foi modificado.
- **Gates:** exigir build do Render em verde; inspecionar efetivamente desktop e celular no link sem cache, com 100% zoom, testando ausência de rolagem da página, campos que rolam dentro do formulário e CTA que permanece visível. A proposta **não está visualmente aprovada** até manifestação do usuário. PR #649 continua Draft, sem merge. Dados reais de banco ainda não importados; preview não autentica e não cria cadastro.

## Tela 02 · revisão de boas-vindas a partir de screenshot do usuário (28/10/2026)

- **Autorização explícita:** usuário enviou screenshot do Login `image(20261028-000345).png` e pediu padronizar/melhorar a primeira impressão da tela de boas-vindas. A captura mostra três cards de marketing comprimidos e rolagem vertical da página. Este pedido autoriza revisar a Tela 02, **sem concluir por implicação a aprovação da nova versão ou modificar as regras de negócio**. Telas 01 já aprovada, 03 ainda pendente de aprovação.
- **Decisão visual:** reconstrução editorial exclusivamente do Login: remover cards genéricos `Saldo real / Projetos / Controle` apenas deste componente, mantendo a paisagem financeira aprovada. Logo agora usa `meg-web-evolution/visual-loading/logo-transparent.webp`, o mesmo arquivo transparente de melhor definição da Tela 03. Eyebrow `MEG WEB EVOLUTION`, frase aprovada `Sua vida financeira, com clareza para decidir.`, descrição já existente e assinatura curta `SEU ESPAÇO FINANCEIRO`. A interface é HTML/React real, sem screenshots como botões ou saldos ilustrativos.
- **Estrutura sem remendos:** `apps/web/src/meg-web-evolution/auth/login.css` **reescrito de forma limpa**, removendo breakpoints históricos contraditórios e mantendo o estilo-base de auth compartilhado; breakpoints estruturais 1024 e 640. `LoginScreen.tsx` agrupa email/senha/opções dentro de `meg-login-fields` com rolagem interna somente quando necessária; cabeçalho, feedback, `Entrar no MEG`, link `Criar conta` e observação de segurança ficam fora dessa área, sem sobreposição. No mobile, o hero comercial é reduzido à marca e o formulário ocupa a janela. A página Login fica restrita a `100dvh`, sem rolagem externa no preview, exigindo ainda validação visual em navegador/zoom 100%.
- **Navegação da demonstração:** botão `Rever carregamento` foi movido da região externa abaixo do Login para dentro do painel, exclusivamente com `previewOnly && onReviewLoading`. `apps/web/visual-sequence/entry.tsx` passa o callback e mantém transição ilustrativa Loading 100% → Login → Criar Conta. `preview.css` não gera altura extra para botão externo.
- **Sem alterações funcionais:** fluxo `await login(normalizedEmail,password)`, mensagens de erro e validação, lembrar somente email, mostrar senha, recuperação, Criar Conta, API, escritores financeiros, DataGrid, Android e `main` intocados; componente do app não recebe `onReviewLoading` e funciona normalmente. O preview público segue `previewOnly` sem envio de senhas.
- **Testes:** contrato estático `scripts/meg-web-07-loading-visual.test.mjs` atualizado para estrutura editorial, CSS responsivo, fluxo e proteção do preview. Acompanhar último gate do Render antes de divulgar o link; build bem-sucedido **não equivale à aprovação visual**. PR #649 segue Draft, sem merge. Importação de banco ainda não executada.

## Padronização editorial das laterais Login e Criar Conta (28/10/2026)

- Prints de revisão do usuário `image(20261028-001123).png` (Login) e `image(20261028-001139).png` (Cadastro), ambos no Chrome desktop, mostram contraste entre alinhamento vertical da chamada, tamanhos e respiro das laterais. O pedido de melhoria enfatiza **personalidade, profissionalismo, consistência e mudanças pontuais**. Interpretação operacional limitada à composição, sem presumir aprovação das telas nem modificar texto de negócio.
- **Correção:** `login.css` e `auth-screens.css` usam a **mesma grade editorial desktop** na lateral (`grid-template-rows: minmax(0, 36%) minmax(0, 1fr) auto`), logo nítido já existente com largura e altura equivalentes (`clamp(10rem, 13vw, 12.5rem)` e `clamp(8rem,19vh,10.75rem)`), títulos de mesmo tamanho/entrelinha (responsivos), mesma altura de início das mensagens, descrição com escala/entrelinha e assinatura de rodapé padronizadas. A grade de colunas entre a lateral e formulário do Login foi igualada à do Cadastro (`1fr 1fr` com o mesmo gap), evitando deslocamento de aproximadamente 15 px.
- Textos específicos foram preservados: Login `Sua vida financeira, com clareza para decidir`; Criar Conta `Seu próximo passo começa aqui`. A arte fotográfica oficial não foi alterada. Nenhum novo card, número ou comportamento inventado.
- **Mobile/tablet:** continuam usando o layout compacto já existente e campos acessíveis; apenas os estilos desktop da área editorial foram alinhados. Breakpoints principais mantidos em 640 e 1024 px, sem rolagem horizontal.
- **Regressão:** Login real, Criar Conta com os dois modos, proteção `previewOnly`, Loading aprovado 100%, DataGrid, financeiro, API e Android não alterados. `scripts/meg-web-07-loading-visual.test.mjs` acrescenta assertivas da grade compartilhada. PR #649 permanece Draft, sem merge.
- **Aguardando:** build verde e publicação Render da revisão consolidada; inspeção visual real de Login/Cadastro lado a lado, incluindo viewport estreita, para confirmar ausência de cortes e aceite expresso. Não declarar aprovado sem isso.

## Retificação prioritária · logo MEG em destaque (28/10/2026)

- **Feedback visual explícito:** prints do usuário `image(20261028-001707).png` (Login) e `image(20261028-001724).png` (Cadastro) rejeitam a logo pequena. O usuário afirmou: `VC ACABOU COM NOSSA LOGO, ELA PRECISA SEER DESTAQUE`. Não considerar versão anterior visualmente validada após a regressão.
- **Causa:** marca `logo-transparent.webp` possuía margens transparentes e estava sendo escalada em caixa limitada a `max-height:27%` da lateral em grade; a arte visível ficava extremamente pequena, apesar da largura CSS relativamente grande.
- **Correção sem redesenhar o logotipo:** `logo-meg-oficial-recortada.webp` foi extraída exclusivamente do print oficial `Loading pos login.png` (região de identidade visual original), eliminando apenas fundo e margens internos; símbolo da seta, lettering MEG e FINANÇAS preservados. Saída WebP RGBA compacta, sem logo genérica e sem SVG novo. Este asset não substitui o original na Tela 01 já aprovada.
- **Aplicação exclusiva em Login e Criar Conta:** `LoginScreen.tsx` e `AuthScreenLayout.tsx` passam a usar a nova imagem. `login.css` e `auth-screens.css` passam a reservar largura `clamp(12.5rem,18vw,15.5rem)` e altura `clamp(10.5rem,30vh,13.4rem)` sem teto de 27%, mantendo a grade compartilhada e a área dos formulários. Versão mobile mantém logo compacta, mas aumenta seu tamanho útil até 13vh para priorizar legibilidade. Sem mudanças em fluxos de API, cadastro, recuperação, DataGrid ou financeiros.
- **Teste estático:** `scripts/meg-web-07-loading-visual.test.mjs` verifica caminho do novo asset nas duas telas, existência do WebP, dimensões de destaque e remoção do teto de altura. Builds transitórios falharam antes de atualizar assertions de referência ao antigo asset, mas último commit corrige essas expectativas. Verificar status do deploy final.
- **Pendências:** revisar visualmente a marca em Chrome (desktop 1366×768 e mobile 390×844), garantir espaço superior, evitar sobreposição com título e CTA, e obter **aprovação visual explícita**. PR #649 permanece Draft sem merge, `main` e Android intocados.

## Decisão oficial 28/10/2026 · SIMETRIA PRIORITÁRIA E TELAS DE ACESSO APROVADAS

- **Nova regra permanente e obrigatória:** o usuário exigiu que **simetria entre telas seja prioridade**, com coerência de eixos, proporções, logotipo MEG em destaque, margens, tipografia, cartões, cabeçalhos, rodapés e ações. A regra foi incorporada em `AGENTS.md` (instruções persistentes para intervenções no repo) e em `docs/MEG-WEB-REFERENCIAS-OFICIAIS-20261027.md` (checklist visual). Prioridade de negócio e fidelidade aos prints continuam acima de simplificações estéticas.
- **Aceite visual explícito em 28/10/2026:** após a revisão que recuperou o tamanho e o recorte da marca MEG no **Login** e **Criar Conta**, o usuário disse que **"agora ficou muito bom, tá aprovado"**, reforçando que a logo deve ser destaque e a simetria é prioritária. Considerar essas duas telas **aprovadas visualmente na revisão `4121857c`**, e a Tela 01 Loading anteriormente aprovada. Não usar o status "pendente de aprovação" de checkpoints históricos anteriores para essas versões; a aprovação não se estende a próximas telas ou alterações futuras.
- **Limites do aceite:** a aprovação é **visual**, não valida autenticação/cadastro reais em API, permissões, backend, persistência, acessibilidade E2E ou importação de dados financeiros. Os previews do Render são estáticos e têm login/cadastro intencionalmente bloqueados. **Nenhum merge autorizado automaticamente**: PR #649 permanece Draft, branch isolada; `main`, Android, DataGrid e regras financeiras preservados.
- **Aplicação futura:** toda tela nova deverá ser comparada lado a lado com as telas oficiais aprovadas em desktop/tablet/mobile; só divergir do alinhamento comum por necessidade da regra financeira, print oficial, acessibilidade, responsividade ou funcionalidade. Corrigir a estrutura quando necessário em vez de empilhar exceções de CSS. Não avançar para tela posterior antes da etapa autorizada.
- **Próxima tela da sequência visual:** Recuperar Senha, ainda não iniciada nesta alteração documental. Exige execução isolada, testes, preview sem cache e aprovação visual específica.

## Tela 04 · Recuperar Senha em validação visual (28/10/2026)

- **Autorização atual:** usuário disse `EXCELENTE, VAMOS PARA PROXIMA` após registrar aprovação visual das telas 01 Carregamento, 02 Login e 03 Criar Conta. A única próxima tela autorizada pela sequência do projeto é **Tela 04 Recuperar Senha**.
- **Contrato financeiro/funcional identificado antes da implementação:** `RecoverPasswordScreen.tsx` já usava `forgotPassword(email)` do cliente existente, validação de formato de e-mail, estados `idle/sending/sent`, mensagem de falha neutra e resposta que não revela existência de e-mail cadastrado; regra expressa do código: solicitação de **senha temporária por e-mail ou WhatsApp**, sem token e sem escolha de nova senha nesta etapa. Não alterar API nem inventar regras.
- **Implementado:** `AuthScreenLayout.tsx` agora suporta `variant="recover"`, com hero editorial simétrico ao Cadastro, logo MEG oficial recortado, tagline própria `Seu acesso de volta, com tranquilidade.` e assinatura visual `CLAREZA PARA RECOMEÇAR`. Por ora, a variante reutiliza internamente a classe de grade `meg-auth-register` junto a `meg-auth-recover`, sem tocar no CSS visual das telas 01–03. `auth-screens.css` tem somente regras adicionais da Tela 04 para alinhar o formulário e a mensagem de sucesso.
- **Funcionalidade:** `RecoverPasswordScreen.tsx` mantém `await forgotPassword(normalized)` somente na aplicação real. Na prévia (`previewOnly=true`), após validar o formato do e-mail, retorna **antes** da chamada; desativa autocomplete, mostra nota para usar e-mail fictício e mensagem `Nenhuma solicitação foi enviada`. `sent` continua exclusivo de retorno real da API. E-mail/campos não são gravados no preview. Campos roláveis apenas se necessário, cabeçalho e ação principal fixos; footer `Voltar ao login` preservado. Removida duplicação do botão de retorno no estado sent, sem alterar navegação.
- **Encadeamento:** em `apps/web/visual-sequence/entry.tsx`, o link `Esqueci minha senha` navega para `RecoverPasswordScreen previewOnly`; `?tela=recuperar-senha` permite acesso direto; retorno ao Login funciona; o fluxo demonstrativo continua Loading 100% → Login, sem mudar a ordem funcional do produto. `preview.css` restringe a Tela 04 a `100dvh` sem rolagem externa.
- **Gates de revisão:** `scripts/meg-web-07-loading-visual.test.mjs` caracteriza a preservação de `forgotPassword` real, bloqueio da API em preview, fluxo de navegação e simetria do layout. Render `meg-evolution-telas-visual` confirmou o commit `237cf5eb5da5abb9cbdd7b7f33b3659e5f0ebc87` **live em 28/10/2026**. Builds intermediários de commits incompletos falharam enquanto testes e arquivos eram atualizados; o build consolidado ficou verde.
- **Limites:** preview estático não envia senhas temporárias, não possui backend financeiro nem confirma funcionamento da API de recuperação real. Nenhum dado de banco importado. Android, DataGrid, autores financeiros, fluxo de cadastro e Login aprovado, `main` intactos. PR #649 ainda Draft, sem merge.
- **Pendente real:** conferir em navegador desktop/tablet/celular a identidade MEG e a simetria com Login/Cadastro, rolagem interna e CTA, resposta de validação, acessibilidade e ausência de cortes. **Tela 04 NÃO está aprovada visualmente**, exige aceite explícito do usuário antes de avançar à próxima.

## Aceite visual da Tela 04 · Recuperar Senha (28/10/2026)

- **Aprovação explícita do usuário:** após receber a publicação de Recuperar Senha com link de validação sem cache, o usuário respondeu **`APROVADO`**. Isso constitui **aprovação visual da Tela 04**, na implementação apresentada pela revisão `5445564d30c8e0a0233f3b144535b75e03311ea4` (mesmo código de UI da revisão `237cf5eb5da5abb9cbdd7b7f33b3659e5f0ebc87`; commit posterior apenas documental). **Este aceite substitui o status de pendência visual** registrado no checkpoint anterior.
- **Bloco visual de autenticação fechado:** Telas 01 Carregamento, 02 Login, 03 Criar Conta e 04 Recuperar Senha estão **aprovadas visualmente pelo usuário em suas revisões de referência**. Simetria, grade, alinhamento e destaque da logo MEG são regras permanentes para próximas telas. Qualquer mudança posterior nessas telas exige nova validação visual específica.
- **Limites técnicos não dispensados:** aprovação visual **não** homologa efetivo envio da senha temporária, autenticação, cadastro, integração com backend, segurança de permissões, acesso a banco, responsividade E2E em todos os dispositivos ou testes financeiros. No Render, o modo `previewOnly` continua sem envio de e-mail ou chamada à API de recuperação.
- **Estado do projeto:** PR #649 **Draft**, sem merge; `main` e Android congelado intocados; DataGrid e regras de negócio financeiras preservadas. Nenhum avanço automático à Home ou telas posteriores neste chat. Continuar por chat/etapa autorizada, começando pela etapa seguinte definida no Prompt Master e no checkpoint aplicável, após seus gates.


## Etapa 06 · Home · primeira candidata visual isolada (27/10/2026, horário de São Paulo)

- **Autorização expressa neste chat:** \`VAMOS SEGUIR\` depois do aceite visual das Telas 01–04.
- **Branch:** \`meg-web-evolution/06-home-visual-20261027\`, criada a partir do head aprovado da PR #649 \`7d80367c078ba5816014baedaa1ac0a94dc4e2d8\`.
- **PR empilhada:** [#650](https://github.com/MarcosVilalva/MEG-Platform/pull/650), Draft, base \`meg-web-evolution/07-revisao-visual-loading-20261027\`, sem merge. PR #649 mantém a autenticação e telas aprovadas na base.
- **Home implementada:** \`apps/web/src/meg-web-evolution/home/HomeScreen.tsx\` e \`home.css\`. Grid desktop soberano 7/5, KPIs 3/3/3/3, 6/6, 6/6; mobile-first com breakpoints 640/1024, sem rolagem horizontal da página. Paisagem decorativa SVG independente de cálculo.
- **DataGrid existente preservado:** tabela de últimas movimentações e próximos vencimentos usa \`DataGrid.tsx\` original, sem modificá-lo. No contexto restrito da Home, as ferramentas ficam recolhidas por padrão para apresentar linhas; o botão de ferramentas permite reabrir filtros, exportação e paginação.
- **Fonte canônica real:** \`authenticatedRequest\` de \`/finance/summary\`, \`/finance/cashflow\`, \`/finance/analytics\`, \`/finance/events/month\`, \`/payables\`, \`/cards\`, \`/finance/categories\`. Respostas passam pelos adaptadores da fonte única de dados \`src/evolution/data/\`. A Home não recria saldo, fatura, parcelas nem status. KPI sem autoridade de total agregado permanece indisponível em produção.
- **Prévia estritamente demonstrativa:** \`apps/web/home-visual.html\`, \`home-visual/entry.jsx\`, \`home-visual/fixture.js\`; a fixture usa \`createMegDataSource\`, cifras ilustrativas da referência oficial e aviso visível de que **não são dados reais**. Não chama API, não faz login, não envia credenciais e não importa banco.
- **Integração:** \`apps/web/src/meg-web-evolution/main.tsx\` exibe Home após validação real da sessão. \`apps/web/vite.config.ts\` inclui a entrada de prévia isolada com CSP.
- **Teste isolado novo:** \`scripts/meg-web-home-06.visual-test.mjs\` e \`.github/workflows/meg-web-home-06-visual.yml\`; build Web e capturas reais em 1672×941, 1366×768, 1366×600, 768×1024, 390×844, 320×700 e 2560×1440.
- **Gate isolado Home:** [Actions #40611991402](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/40611991402) **SUCCESS** em \`7c0e928a3e5326839796e89ee315b51e6075b7c2\`. Capturas: [artifact #12782479268](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/40611991402/artifacts/12782479268).
- **Gate global Foundation:** [Actions #40611991429](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/40611991429) **FAILURE**, reproduzindo bloqueio em \`shell.viewport.browser.test.mjs\` (a validação aguarda Shell enquanto a entrada protegida exige sessão); falhas similares já atingiam o SHA-base #649. Não mascarar nem declarar o gate global verde. Investigar e aprovar correção isolada antes de qualquer merge.
- **Render:** nesta rodada não houve deploy de preview público porque o workspace Render não foi selecionado/autorizado para alterações; não oferecer URL pública como se a Home estivesse hospedada.
- **Estado de aprovação:** Home **NÃO APROVADA** visualmente, nem homologada funcionalmente. Capturas e build são evidências técnicas, não aceite humano. O aviso demonstrativo aparece somente na prévia visual e não em produção.
- **Pendências reais:** comparação visual explícita com o print oficial; homologação de dados reais e métricas agregadas de pendências/faturas/contas pagas; navegação das ações para telas futuras, atualização real de notificações, filtro de período global, acessibilidade E2E, preview público sem cache, investigação do gate Foundation. Preservar PR #649, Android e regras financeiras; não iniciar Lançamentos antes do aceite da Home.


## Home 06 - Render e assets (27/10/2026)
PR #650 Draft: artes WebP incorporadas, preview independente no Render `meg-home-06-visual`. Sem acesso a dados reais. Home ainda não aprovada. Gate Foundation pendente. PR #649, Android e main preservados.


## Home 06 - MEG Panorama (candidata visual, 27/10/2026)

Após o pedido `siga`, a proposta MEG Panorama foi implementada na branch da PR #650. O CSS da Home foi refeito em camada limpa, preservando o grid soberano 7/5, quatro KPIs e duas linhas 6/6. Saldo recebeu controle acessível para mostrar/ocultar valores e acesso a movimentações; gráfico diário teve escala visual centralizada e suporte a toque/teclado; Verocard ganhou composição e CTA próprios; DataGrid, Shell, Android e autenticação aprovada não foram alterados. O preview demonstrativo segue em `meg-home-06-visual.onrender.com/home-visual.html`, com auto-deploy; não utiliza API, credenciais ou banco. A PR continua Draft. Não há aprovação visual da Home, nem autorização de merge. Gates e última publicação devem ser conferidos pelo SHA da revisão.


## Home 06 - saldo de benefícios obrigatório (28/10/2026)

Usuário determinou que a Home exiba também o saldo do benefício. Alterações isoladas na PR #650 Draft: `HomeScreen.tsx` lê `GET /finance/benefit-summary?month=YYYY-MM`, incorpora `benefitSummary` à fonte única por `fromCanonicalReadModels`, apresenta saldo de benefícios, créditos e valor utilizado do mês no painel Verocard; saldo bancário permanece separado. A privacidade do ícone de olho oculta ambos os saldos. O endpoint atualmente resume todas as contas de benefício e os eventos Verocard classificados pela política financeira existente, com saldo apurado até o fim do mês consultado; não equivale a saldo por cartão nem comprova saldo bancário atual. Na prévia estática, o saldo do benefício aparece mascarado sem número inventado. A grade de estabelecimentos decorativa foi removida para acomodar os dados reais. Arquivos: `HomeScreen.tsx`, `home.css`, `scripts/meg-web-home-06.visual-test.mjs`. **Home segue NÃO aprovada visualmente**, sem merge, com pendências de homologação real do saldo, refino global da Home, layout e gate Foundation. Não alterar Android ou telas 01-04 aprovadas.

## Home 06 · reconstrução visual autorizada em 28/10/2026

- Usuário autorizou implementar a imagem proposta nesta conversa. A implementação NÃO representa aprovação visual final, nem autoriza merge.
- Composição nova: grid 12 colunas (7/5, quatro cards 3/12, dois 6/12, dois 6/12); cinco atalhos simétricos; DataGrid original e Shell intactos; arte WebP separada dos dados.
- HomeScreen.tsx e home.css reconstruídos, sem reaproveitar CSS visual anterior; mock da prévia atualizado e identificado como FICTÍCIO.
- Fonte única data.js/api-adapter.js recebe readModels.homeOverview.
- Rota autenticada de somente leitura GET /finance/home-overview: saldo usa monetaryBalanceAt já canônico; cartões usam listCards, contas usam listPayables. A função projectHomeMetrics apenas agrega campos de serviços de domínio em centavos e conta registros, sem mutar regras financeiras.
- Lançamentos pendentes usam summary.pendingAmount; indicador de contas quitadas mostra quantidade, NÃO inventa valor pago. Contas quitadas referem-se a registros com vencimento no período, sem comprovar data efetiva do pagamento.
- Saldo dos benefícios vem de GET /finance/benefit-summary, sempre SEPARADO do monetário. Vencimentos usam /payables/open, inclusive outros meses.
- Contrato financeiro home-overview-read.contract.test.ts, build da API com geração Prisma, build Web e capturas Playwright no gate próprio.
- Android, PR #649, Login e recuperação aprovados, shell, DataGrid e regras de negócios originais preservados.
- Render estático independente: https://meg-home-06-visual.onrender.com/home-visual.html. Gerar link com cache-busting após verificar deploy atual.
- Pendências: aprovação visual EXPLÍCITA, integração real de navegação e seleção de período, homologação financeira com credenciais e dados reais, gate global Foundation. PR #650 permanece Draft, sem merge.

## Home 06 · Correção de direção visual após rejeição expressa (28/10/2026)

- Usuário REJEITOU a Home anterior como genérica e sem o padrão visual do trabalho anterior. Não registrar a Home como aprovada.
- Referência visual vigente da Home: print oficial de 03/10/2026, com linha de saldo/fluxo, 4 KPIs, Benefícios/4 ações, 2 DataGrids. A imagem de 28/10 usada anteriormente foi apenas candidata não aprovada.
- Camada home.css novamente reconstruída de forma integral, não como acúmulo de patches; removido cabeçalho redundante Visão geral para trazer os grids de volta à área útil.
- HomeFinanceVisuals.tsx novo: SVGs de receita, alimentação, transporte, moradia, entretenimento, saúde, cartão, transferência, benefício etc. Os SVGs servem exclusivamente à apresentação das categorias já classificadas no catálogo. Não aplicam regras financeiras nem mudam IDs/status.
- HomeScreen.tsx: duas tabelas preservam DataGrid original e ganharam células com SVGs, categorias coloridas e valores semânticos. Quatro atalhos em igual dimensão, como na referência. Nenhum total é calculado pela Home.
- Benefício usa o saldo canônico separado de contas monetárias; artes WebP seguem isoladas e reaproveitam apenas o conjunto de imagens oficial atual.
- Gate próprio Home: build API com Prisma, contrato financeiro, build Web e sete viewports; teste também verifica quatro atalhos, SVGs financeiros e badges. Validar SHA exato e Render LIVE, sem declarar gate Foundation aprovado.
- PR #650 permanece Draft; nenhum merge, Android intocado, telas de autenticação 01-04 preservadas. Aprovação visual explícita PENDENTE.

## Home 06 · revisão focal do card Saldo após vídeo (28/10/2026)

- Usuário avaliou a evolução como parcial e rejeitou principalmente o card Saldo disponível. Vídeo enviado nesta conversa `20-11-08.mp4` evidenciou valor pequeno, arte escura e linha quase reta disputando espaço com os textos.
- Escopo autorizado desta rodada: APENAS card de saldo e fixture da prévia visual. PR #650 continua Draft, sem merge; Home NÃO aprovada visualmente.
- `HomeScreen.tsx`: identidade editorial do card reconstruída (ícone carteira oficial, título alinhado, valor monetário predominante, data de apuração, privacidade e acesso às movimentações). SVG de evolução/colunas com volume 3D desenha exclusivamente valores `cashflow.days[].realizedBalance` recebidos da autoridade canônica. Nenhum saldo ou regra de negócio calculado na tela.
- `home.css`: composição limpa do saldo, iluminação e montanhas WebP existentes, gráfico concentrado à direita, máscara de proteção para valores e CTA, responsividade em 640/1024 mantida.
- `home-visual/fixture.js`: saldos diários demonstrativos não lineares, informados como fictícios, para inspeção do gráfico; não tocar banco ou persistência.
- `scripts/meg-web-home-06.visual-test.mjs`: checar presença de ícone principal, traçado do gráfico e tamanho mínimo da tipografia em sete viewports.
- Preservados: Shell, DataGrid, SVGs financeiros das linhas, demais cards, benefícios, políticas financeiras, contas, API e Android. Gate Foundation segue bloqueador independente; gates isolados e Render não substituem aceite visual.
- Preview Render em `https://meg-home-06-visual.onrender.com/home-visual.html`, validar SHA mais recente e abrir URL com cache-busting. Nenhuma próxima tela autorizada.

## Checkpoint Home 06 | imagem oficial 02 e requisito de tela única (28/10/2026)

- **Autorização do usuário:** a **SEGUNDA** imagem gerada e apresentada nesta conversa, identificada pelo PNG original 1536×1024, é a **nova referência soberana da Home**. Substitui a antiga `Tela principal.png` **somente para esta tela**. Documento de especificação: `docs/MEG-WEB-HOME-REFERENCIA-VISUAL-OFICIAL-02-20261028.md` e tabela oficial atualizada em `docs/MEG-WEB-REFERENCIAS-OFICIAIS-20261027.md`.
- **Regra nova do usuário:** toda a Home deve caber em **uma tela desktop sem rolagem vertical/horizontal**, preservando o Shell, os 4 grupos de conteúdo, os dois DataGrids e botões legíveis. Testar browser real em 1366×768 e 1672×941, com zoom 100%; não mascarar overflow nem cortar conteúdos para forçar sucesso.
- **Mobile:** a impossibilidade material de mostrar toda a composição desktop legível em 320×700 sem rolagem exige adaptação funcional específica, como painéis navegáveis, que ainda não foi aprovada. Não afirmar que todos os breakpoints cumprem simultaneamente o requisito.
- **Conteúdo oficial da imagem:** saldo com imagem real de carteira, fluxo mensal sem estatísticas inventadas, 4 KPIs simétricos, Benefícios Verocard com saldo separado e sem ofertas/descontos, **5 ações rápidas alinhadas**, 2 tabelas DataGrid com ícones semânticos. Contratos financeiros têm prioridade sobre números que aparecem no mockup.
- **Situação:** apenas a REFERÊNCIA VISUAL está escolhida; a Home atual na PR #650 **continua rejeitada/não aprovada**, branch isolada, PR Draft sem merge. Android, telas 01–04 aprovadas, DataGrid e regras financeiras não alterados nesta decisão. Não iniciar tela posterior.
- **Próxima implementação autorizada por esta decisão:** reconstrução/adequação da Home à nova imagem, com arte em assets separados, testes de viewport e preview sem cache. Não confundir o commit documental com publicação de uma Home nova.

## Home 06 · Implementação da imagem oficial 02 (28/10/2026)

- Aprovada como **referência**, não como tela final: `MEG_HOME_REFERENCIA_VISUAL_02_20261028.png`, documentada em `docs/MEG-WEB-HOME-REFERENCIA-VISUAL-OFICIAL-02-20261028.md`.
- **Escopo implementado na PR #650 Draft:** nova versão de `HomeScreen.tsx`, `home.css`, asset `apps/web/public/meg-web-evolution/home/wallet-official-02.webp` extraído somente da zona artística da imagem 02 e testes em `scripts/meg-web-home-06.visual-test.mjs`.
- Saldo monetário é componente React, com controle de privacidade e data de referência; removido gráfico 3D SVG e montanhas do card. Benefícios permanecem totalmente separados no painel Verocard; nenhuma oferta ou desconto comercial foi incluído.
- Cinco botões simétricos: Novo lançamento, Transferência, Pagar conta, Relatórios, Configurar metas. Quatro KPIs e duas tabelas continuam consumindo autoridades e DataGrid preexistentes.
- **Desktop:** distribuição de quatro linhas em altura proporcional ao viewport, incluindo cinco linhas por tabela, sem rolagem externa; objetivo de verificação em 1366×768 e 1672×941 com navegador real. CSS de Home e topbar **somente com Home montada**, preservando CSS das demais telas.
- **Mobile/tablet:** quatro abas internas `Resumo`, `Contas`, `Ações` e `Listas`, tornando todo o conteúdo acessível sem reduzir tipografia nem adicionar rolagem à página. Essa é uma **adaptação funcional proposta**, ainda sujeita à aprovação visual específica do usuário.
- Prévia exclusivamente ilustrativa no Render independente `meg-home-06-visual`; conteúdo fictício identificado. A arte da carteira é um recorte da imagem oficial, não uma screenshot de tela inteira nem campos clicáveis rasterizados.
- Testes: build API, contratos financeiros, build Web, sete viewports, assets, simetria dos cinco atalhos, privacidade dos saldos, abas e critérios de não rolagem desktop. Verificar resultado no SHA final, sem equiparar CI a validação visual.
- **NÃO APROVADA** visualmente; PR #650 ainda em Draft, sem merge. Gate geral Foundation pendente. Android, telas 01-04 e DataGrid mantidos sem alteração.


## Home 06 | rejeição do encaixe sem rolagem (28/10/2026)

- O usuário enviou o vídeo `21-00-46.mp4` mostrando a Home publicada em 1366×768 e declarou que a solução "não foi boa ideia".
- **Feedback visual explícito:** versão compactada/reprovada, com título do saldo cortado, CTA parcialmente escondido, tipografia excessivamente reduzida e tabelas exibindo apenas três linhas. O gate de não rolagem não equivale a preservação da integridade visual ou dos dados.
- **Não aprovar a tela atual, não fazer merge da PR #650.** O requisito de 'nenhuma rolagem vertical' precisa de reavaliação: proposta de permitir rolagem vertical natural sem rolagem horizontal, sem cortar painéis, mantendo a identidade da referência oficial 02 e regras financeiras existentes. Essa proposta ainda não substitui formalmente a decisão do usuário até sua concordância explícita.
- Nenhuma regra financeira, tela anterior ou Android deve ser alterada por causa deste feedback. Corrigir estrutura limpa em vez de empilhar remendos de altura fixa/overflow oculto.

## Home 06 | Reestruturação com rolagem vertical natural após rejeição (28/10/2026)

- O usuário solicitou "continue" após a proposta de abandonar a compressão artificial que cortou título, botão e linhas das tabelas no vídeo `21-00-46.mp4`. Esta autorização vale para **refazer a Home**, não para aprová-la.
- **Nova decisão operacional aplicada à candidata**: manter **zero rolagem horizontal da página**, permitir rolagem vertical da área principal (`.meg-main`) quando necessário, sem ocultar linhas nem controles. Os testes de 1366×768/1672×941 deixam de considerar ausência de scroll vertical como sinal de qualidade. A referência **visual** oficial 02 permanece soberana; seu texto anterior sobre ausência de scroll fica superado por esta correção de usabilidade da Home.
- `apps/web/src/meg-web-evolution/home/home.css`: reconstruído integralmente, grades de 12 colunas no desktop, alturas mínimas legíveis em lugar de quatro linhas espremidas; SVG semântico nas células, carteira e Verocard em WebP; tabelas com viewport livre e cinco registros visíveis no desktop. Menu, cabeçalho e componentes das outras telas não alterados.
- `apps/web/src/meg-web-evolution/home/HomeScreen.tsx`: removida a navegação por quatro abas mobile que não tinha aprovação; os quatro grupos e os dois DataGrids voltam ao fluxo vertical natural, responsivo, sem reduzir tipografia.
- `scripts/meg-web-home-06.visual-test.mjs`: passa a testar largura sem overflow, altura adequada dos cards, simetria de KPIs e atalhos, todas as colunas e linhas das tabelas, acesso aos painéis no celular e duas capturas (topo/parte inferior) por viewport.
- Nenhuma alteração em saldos, serviços, regras financeiras, DataGrid global, autenticação aprovada ou Android. A PR #650 continua Draft, sem merge, e a Home NÃO está aprovada visualmente.
- O usuário deverá validar tanto o topo quanto a parte inferior pelo Render publicado no SHA exato, com link sem cache. O gate Foundation continua bloqueador independente.

## Home 06 | Piloto Taste Skill v2 iniciado (29/10/2026)

- O usuário aprovou começar a experiência com Taste Skill na PR #650. Revisão da ferramenta confirmou que `redesign-existing-projects` foi aposentado; método aplicável a dashboard financeiro é `design-taste-frontend` com `references/app-screens.md`, usando `--app`.
- Documento de auditoria e prioridades: `docs/MEG-WEB-HOME-06-TASTE-AUDITORIA-20261029.md`.
- Workflow isolado `.github/workflows/meg-web-home-06-taste-audit.yml`: obtém somente no runner a revisão pinada `12af471f627f866411b4bd785b19646d3672784c` do Taste Skill e roda `lint.mjs --app` + `inspect.mjs --app` contra a prévia, gerando relatório e capturas de 1366/768/390 px.
- Este piloto é **diagnóstico e não bloqueador**. Não incorporar código, dados ou tokens do plugin ao produto nem reinterpretar a imagem oficial 02. Onde o guia genérico conflitar com os prints e regras MEG, a regra interna prevalece.
- **Sem alterações nesta rodada** em `HomeScreen.tsx`, `home.css`, DataGrid, Shell, API, Android e telas 01–04. Nenhuma tela foi visualmente aprovada. PR #650 segue Draft e sem merge; gate geral Foundation ainda requer correção independente.
- Próximo passo estrito: avaliar relatório de auditoria, escolher os 3 achados reais prioritários e implementar correções de uma só vez, comparando screenshots antes/depois e publicando um preview sem cache somente quando existir commit visual novo.

## Home 06 | Resultados do piloto Taste Skill (29/10/2026)

- Confirmado: `design-taste-frontend` v2.1.5, módulo app, auditado no GitHub Actions da PR #650, run `40916502984`. Tool externa baixada somente no runner no commit imutável `12af471f627f866411b4bd785b19646d3672784c`; não instalada como dependência do runtime.
- Saída: 6 FAIL e 2 WARN **do Taste**, sem equivalência com gate oficial. Detalhes em `docs/MEG-WEB-HOME-06-TASTE-AUDITORIA-20261029.md`.
- Mudanças seguras aplicadas ao visual da Home: `h1` acessível sem alterar composição visível, bordas dos painéis discretizadas, text-shadow decorativo removido do saldo. **Não alterados** saldos, cards, benefício, regras financeiras, DataGrid, Shell, Android ou autenticação aprovada.
- Exceções justificadas: gradientes da imagem oficial 02 e ícones coloridos dos cards/atalhos não podem ser suprimidos por padrão externo; a referência soberana prevalece. Texto `XLS/PDF` em 7px identificado pelo checker fica como investigação, sem intervenção global no DataGrid.
- Inspector de terceiro mede parte visível e pode não enxergar a rolagem interna de `.meg-main`; usar Playwright específico para conferir tabelas completas. **Home não aprovada**, PR Draft sem merge, gate Foundation independente.

## Home 06 | Integração funcional autenticada e validação (29/10/2026)

- Usuário determinou deixar a Home **real e funcional**, empregando o Taste Skill apenas como auditor, mantendo a referência visual oficial 02.
- **HomeScreen.tsx**: agora aceita competência e consulta real via `authenticatedRequest`; saldos permanecem exclusivamente em `home-overview` e `benefit-summary`. Busca no cabeçalho filtra descrições, categorias e contas efetivamente carregadas nas tabelas. Em troca de competência, o snapshot anterior é invalidado e respostas assíncronas antigas não podem sobrescrever a nova, evitando exibição de saldos de mês errado.
- **AppShell.tsx**: removidos usuário e competência fixos; nome é retirado da sessão autenticada; período tem seletor `type=month`; busca controlada; saída aciona logout. O botão Novo lançamento, menu e ações para telas futuras respondem com aviso explícito de indisponibilidade, sem navegação fictícia ou mutação financeira.
- **main.tsx**: conecta a sessão, logout, seleção de competência, busca e aviso de ações não implantadas ao Shell e à Home real. Não utiliza os módulos visuais históricos; não avança etapas posteriores.
- **home.css**: somente ajustes locais para seletor de período, aviso de seção ainda não disponível e posição mobile; identidade visual oficial 02 preservada.
- **shell.contract.test.js**: testes antes baseados em usuário e busca fictícios foram convertidos para exigir propriedades reais; **scripts/meg-web-home-06.authenticated.test.mjs**: teste browser da entrada `web-evolution.html` autenticada, com respostas HTTP simuladas, exige leitura das rotas canônicas, troca de competência, busca, privacidade, mensagem de funcionalidade futura e logout. O workflow da Home agora executa também esse teste.
- **Divisão crítica:** `home-visual.html` segue prévia *pública estática, com valores fictícios*, e `web-evolution.html` é a entrada *autenticada* da nova Web. Nenhuma homologação com dados bancários/contas reais ocorreu. A API da PR ainda depende dos gates e deploy seguro antes de teste de integração com contas reais; não se pode afirmar que a prévia demonstra isso.
- **Pendências reais:** integração e aceitação das telas futuras (Novo Lançamento, Transferência, Pagamentos, Relatórios, Metas), autenticação ponta a ponta contra servidor com dados verdadeiros, validação visual expressa, gate Foundation e publicação segura quando autorizada. PR #650 continua **Draft e sem merge**. Android, regras financeiras, DataGrid e telas 01–04 permanecem sem alterações.


## Home 06 | Auditoria de arte em alta resolução, ferramentas GitHub (29/10/2026)

- Usuário rejeitou o aspecto amador/desfocado da Home e autorizou pesquisar e integrar ferramentas GitHub, preservando a imagem oficial 02.
- Diagnóstico factual: wallet-official-02.webp tem **224×185 pixels, 2.706 bytes**, e verocard-oficial-panorama.webp tem **204×131 pixels, 2.038 bytes**. São recortes extremamente pequenos da composição; o navegador os amplia, causando falta de definição. A referência visual oficial 02 é uma screenshot de 1536×1024, NÃO deve ser reaproveitada como fonte fotográfica HD de elementos isolados.
- Ferramentas confirmadas: **Sharp** para metadados/processamento de fontes originais grandes e **Playwright** para medidas reais em DPR 2; aproveitar Playwright existente. vite-imagetools fica candidato após termos fontes HD, pois não recupera nitidez de recortes. Pixelmatch já coberto por Playwright. Penpot opcional adiado. Upscayl não é solução padrão por desfoque de origem/necessidade de GPU.
- Integração feita nesta PR: scripts/meg-web-home-06.asset-quality.mjs e .github/workflows/meg-web-home-06-image-quality.yml. O runner instala Sharp 0.35.5 isoladamente e mede os dois assets no browser em 1366×768, 1920×1080 e 390×844, DPR 2. Relatório JSON/Markdown no artefato meg-home-06-image-quality-report. Detalhes em docs/MEG-WEB-HOME-06-ASSETS-ALTA-RESOLUCAO-20261029.md.
- Execução inicial GitHub Actions 40934290470: **oito falhas de qualidade dos assets** (duas fontes de baixa resolução mais densidade insuficiente nas resoluções testadas). A etapa de auditoria está continue-on-error apenas enquanto não houver substitutos, portanto o workflow verde NÃO indica aprovação de imagens. O log indica exit code 1 no diagnóstico.
- **PENDÊNCIA CRÍTICA:** produzir ou obter imagens de carteira/cartão ORIGINAIS e NÍTIDAS em alta resolução, respeitando composição e identidade da imagem oficial 02; gerar WebP/AVIF para mobile/desktop com Sharp, sem upscale dos recortes. Confirmar marca/logotipo pelos originais oficiais. Só então tornar o gate bloqueador e publicar nova Home.
- **Sem mudança nas imagens da tela nesta rodada**: não afirmar que o desfoque foi resolvido ou que a Home teve melhora visual. Esta entrega foi uma auditoria e integração de ferramentas para impedir recorrência.
- Nenhum saldo, API, pagamento, benefício, DataGrid, Shell, Android ou tela de autenticação foi alterado. A PR #650 segue **Draft, sem merge**; aprovação visual e homologação com contas reais permanecem pendentes.

- **Correção posterior no mesmo ciclo:** o workflow de auditoria de imagem foi promovido de não bloqueador para **gate bloqueador** (commit 1596f0f2). Com as miniaturas atuais, o resultado esperado é falha. Isso impede aceitar qualidade baixa como se fosse aprovada. O relatório continua publicado pelo passo always().


## Home 06 | Substituição efetiva dos assets HD (29/10/2026)

- O usuário autorizou continuar a reconstrução, priorizando a nitidez real das imagens. O visual oficial da Home continua sendo a imagem 02. Home NÃO aprovada.
- Criado script de geração isolado: scripts/meg-web-home-06.build-hd-assets.mjs. Fonte fotográfica da carteira: Aleksandrs Karevs, Pexels 15440419, licença Pexels Free. O enquadramento e o tratamento de luz são adaptados à composição dark-teal. O cartão do painel Verocard é **ilustração demonstrativa construída em vetor e renderizada em WebP**, não a fotografia de cartão físico emitido. Nenhum número financeiro está dentro das imagens.
- Criado workflow .github/workflows/meg-web-home-06-build-hd-assets.yml, limitado à branch isolada, com Sharp pinado no runner, controle de tamanho/resolução, commit de somente dois arquivos WebP e push por github-actions[bot].
- **Commit de assets gerados:** ec13a618b7e2760445e52351d9030fee70676a86. Carteira: 1800×1000 px (289.862 bytes). Cartão: 1800×1040 px (69.628 bytes). A etapa de geração de HD foi concluída com sucesso na execução GitHub 40937871970.
- IMPORTANTE: **não é uma fotografia oficial da marca MEG ou cartão Verocard**. Deve ser conferida esteticamente contra a referência 02, principalmente textura/fundo da carteira, logotipo do cartão, perspectiva, luz e cores. Se o usuário rejeitar a composição, voltar à elaboração dos assets sem mexer nas regras ou no grid.
- Os assets antigos de 224×185 e 204×131 px foram substituídos no código da PR; não existe necessidade de CSS para esticá-los artificialmente.
- O pipeline de qualidade de imagens continua **bloqueador**, precisa passar no novo SHA (não declarar aprovado só pela presença de dimensões grandes). A compilação Home e Foundation devem ser reexecutadas sobre o SHA novo. Render deve publicar o mesmo SHA e oferecer URL sem cache.
- PR #650 permanece Draft, sem merge; Android, regras financeiras, autenticação e DataGrid preservados. Nenhuma tela futura iniciada.


## Home 06 | Refinamento do Fluxo e revisão final HD (29/10/2026)

- Carteira e Verocard HD continuam na branch. Gate de resolução aprovado no SHA bb7aed6c com densidade DPR2 adequada. A fonte da carteira é fotografia licenciada da Pexels, com perspectiva diferente da imagem oficial 02, sujeita à validação.
- home.css refinado: iluminação frio/teal, enquadramento maior da carteira e equilíbrio da arte Verocard. Nenhuma regra financeira alterada.
- HomeScreen.tsx: removido o gráfico SVG de fluxo diário oculto; substituído por barra visual horizontal de entradas e saídas, usando exclusivamente totais já apurados pelo read model. CSS flex-grow define geometria, não calcula saldo, resultados ou status. Quando os dois valores são zero, não há barra.
- scripts/meg-web-home-06.visual-test.mjs: passou a exigir a barra proporcional na prévia.
- Correção de compilação: a primeira remoção do gráfico apagou acidentalmente definições locais de SectionHeading e colunas DataGrid, causando TS2304 no preflight. Essas definições foram restauradas no commit d57b6b21, antes de qualquer merge. É obrigatório passar build final depois dessa correção.
- Home sem aprovação visual. PR #650 Draft sem merge. Foundation e homologação autenticada com contas reais permanecem independentes.


### Home 06 · Refinamento artístico da referência oficial 02 (29/10/2026)

- Confirmação do usuário no chat 06: **a última imagem selecionada é a imagem oficial 02**, carteira MEG e cartão Verocard. A seleção de referência **não** constitui homologação da Home implementada.
- A inspeção dos novos assets de 1800 px demonstrou divergência de identidade: a fotografia da carteira não continha a marca MEG; o cartão vetorial exibia uma palavra VEROCARD gigantesca não presente no modelo escolhido.
- Atualizado `scripts/meg-web-home-06.build-hd-assets.mjs` na PR #650 para usar o **SVG oficial** `apps/web/public/brand/logo-meg-financas.svg` como marca nativa das duas artes HD, com iluminação teal da carteira, novo enquadramento gráfico do cartão, reflexos e composição mais próxima da imagem 02. Não utilizar pixels ampliados do screenshot.
- O workflow isolado de geração de imagens é acionado pelo script e deve materializar os dois WebPs. **Não declarar as artes ou a Home aprovadas sem confirmação de geração, inspeção das capturas e avaliação visual explícita.**
- Preservados: autoridade financeira, saldo de benefício separado, DataGrid, Shell autenticado, Android e telas 01–04. PR #650 continua Draft e merge bloqueado se qualquer gate estiver vermelho.
- Pendentes: confirmar novo commit de binários e deploy do SHA correspondente, executar auditoria de densidade, conferir alinhamentos desktop/mobile e obter aprovação visual.


### Home 06 | refinamento de hierarquia, profundidade e responsividade (29/10/2026)

- **Autorização:** o usuário autorizou outra rodada visual na Home com base apenas na referência oficial 02. Isso não equivale a homologação da tela nem autorização de merge.
- **React Home:** HomeScreen.tsx reorganizado em dois indicadores de Fluxo do mês com ícones destacados, distribuição proporcional aos totais canônicos e rótulo visual Outras pendências. Saldo e resultado continuam exclusivos da API; benefício separado do dinheiro.
- **CSS Home:** home.css foi reconstruído por seções substituídas na origem, sem empilhar overrides. Hero, Fluxo, KPIs com setas, Verocard com perspectiva, cinco atalhos e DataGrid real receberam refinamento e hierarquia. Rolar verticalmente na área principal continua permitido; rolagem horizontal externa proibida.
- **Shell:** AppShell.tsx recebeu propriedade opcional homeContext, somente chamada na Home real e prévia. Saudação usa usuário autenticado e data de execução, calculada com new Date() no fuso São Paulo; aparece apenas com espaço suficiente no container. Busca, período, menu e demais telas não mudaram.
- **Prévia:** home-visual/entry.jsx usa identidade e mês do print oficial apenas na fixture; busca demonstrativa funciona e comandos de telas futuras exibem aviso de indisponibilidade. Sem autenticação ou banco nesta prévia.
- **Responsividade:** breakpoints 640/1024; exceção de DataGrids 1024-1279. Em 320 px, apenas uma coluna, controles das tabelas no fluxo normal e alvos de toque de 48 px. Fonte do saldo mobile corrigida após falha factual inicial de 30,4 px.
- **Testes:** script visual estendido com verificações de cabeçalho, Fluxo, setas e toque mobile. Workflow visual passou no SHA 3eab3b908ce65941e97a7ba8a7902e3167e2326b; novos gates do SHA final continuam por conferir.
- **Proteções:** API financeira, regras de negócio, DataGrid reutilizável, Android e autenticação 01-04 preservados. Mudança opcional do Shell só é habilitada na Home.
- **Pendências:** validar gates finais, confirmar o deploy do mesmo SHA em Render, inspecionar capturas desktop/mobile e receber aprovação visual expressa. PR #650 continua Draft; sem merge.


### Home 06 | rodada de correções após crítica do vídeo (29/10/2026)

- O usuário autorizou prosseguir **somente na Home 06** após análise visual do vídeo `18-03-10.mp4`. A referência soberana permanece a imagem oficial 02 (arquivo original de 1536×1024). A Home implementada segue **NÃO aprovada**, PR #650 em Draft, sem merge.
- **Autoridade financeira:** `summary.projectedResult` foi confirmado em `apps/api/src/modules/finance/read-model.ts` e `financial-policy.ts` como resultado projetado, não saldo bancário. O texto da Home foi corrigido de «Saldo do período» para **«Resultado projetado»**, sem alteração de cálculo, valor, API ou writer.
- **Vencimentos:** o endpoint `GET /payables/open` já ordena por `dueDate asc`. A Home também ordena ascendente, com desempate por ID; o estado antigo do DataGrid armazenado na chave `meg-home-due` podia sobrescrever essa ordem por descrição. Foi adotada chave nova `meg-home-due-chronological-v3`, preservando ordenação, filtros, exportação e persistência posteriores do DataGrid. A apresentação inicial é cronológica e os testes foram ampliados para exigir 28/10/2026 na fixture.
- **Coluna Conta sem dados:** o contrato atual de pendências não contém conta de pagamento vinculada antes da baixa; não usar bancos fictícios. Na Home, a coluna de vencimentos passou a **Situação**, tradução estritamente textual de `Payable.status` (`open` → A pagar; `partial` → Parcial; fallback exibe status bruto). Nenhum vencimento, atraso ou pagamento é classificado localmente. A coluna Conta das movimentações continua intacta.
- **Card Contas pagas:** eliminação da repetição de «12 contas» na legenda quando a autoridade só disponibiliza o quantitativo, sem inventar valor monetário.
- **Visual:** `home.css` recebeu composição de Verocard separando arte dos valores, incluindo mobile empilhado com cartão visual independente; ações rápidas receberam alturas e tipografia mais equilibradas. Shell, DataGrid global, Android, telas de autenticação e motor financeiro preservados.
- **Carteira HD:** tentativa inicial de destaque por foto mascarada revelou madeira e cortes no objeto; imagem não considerada aprovada. O gerador `scripts/meg-web-home-06.build-hd-assets.mjs` passou a atenuar o fundo marrom, usar logotipo SVG oficial e incluir margem transparente antes da rotação para corrigir bordas. Exige nova inspeção real das imagens geradas.
- **Workflow HD:** commit simultâneo na branch causou rejeição de push, sem perda de alterações. `.github/workflows/meg-web-home-06-build-hd-assets.yml` agora serializa a geração por ref e faz `git fetch`/`git rebase` antes do push, sem `force`.
- **Testes adicionados:** `scripts/meg-web-home-06.visual-test.mjs` exige rótulo de resultado, cronologia e situação canônica; `scripts/meg-web-home-06.authenticated.test.mjs` exige distinção entre resultado projetado e saldo do benefício. Ainda é preciso confirmar gates completos sobre SHA final com binários.
- **Pendências reais:** inspeção final da arte da carteira e Verocard contra referência original; concluir gates, investigar falha Foundation se persistir (no passado houve sobreposição busca/período a 900×700), confirmar Render no SHA exato e capturas; aprovação visual explícita do usuário. Nenhuma tela posterior autorizada.


#### Complemento operacional HD: geração final da rodada

- A geração do script de wallet HD encontrou primeiro conflito de push quando a branch mudou em paralelo; o workflow passou a fazer fetch/rebase, sem force. Em tentativa posterior o gate rejeitou arte 1115×901 fora do envelope máximo de 1100px; escala ajustada no script.
- O workflow de geração HD da correção de escala (run 40956768180) concluiu com **success**, materializando a nova carteira na branch por commit automático. Confirmar o SHA da PR após o commit do bot, não reutilizar o SHA do script.
- Inspeção da arte resultante: a marca MEG ficou legível e inteira e a mesa de madeira perdeu destaque, mas a borda do recorte fotográfico continua perceptível na parte inferior/direita. **Divergência estética permanece** e deve ser mostrada para aprovação explícita antes de qualquer merge.
- Variação visual está limitada a Home. A coluna Situação utiliza status retornado pela API, a nomenclatura Resultado projetado foi corrigida sem regras locais e a ordem inicial de vencimentos é cronológica por data.
- Os gates Home Visual and Build, Foundation e confirmação Render **não são declarados concluídos** sem consulta do último SHA com binários; estado Draft permanece obrigatório.

## Home 06 | reconstrução limpa da camada visual baseada na referência oficial 02 (29/10/2026)

- O usuário rejeitou o protótipo ORBIT por fugir do layout aprovado e autorizou uma reconstrução visual respeitando somente a **imagem oficial 02**. ORBIT não foi incorporado ao código. A imagem soberana permanece a especificada por `docs/MEG-WEB-HOME-REFERENCIA-VISUAL-OFICIAL-02-20261028.md`.
- `apps/web/src/meg-web-evolution/home/home.css` foi **substituído integralmente**, sem empilhar novas regras sobre a folha de estilos rejeitada. Preserva grade 7/5, quatro KPIs simétricos, benefícios e cinco ações rápidas, dois DataGrids oficiais, rolagem vertical interna e responsividade 640/1024 com necessidade técnica 1024–1279 nos DataGrids.
- A nova apresentação aprimora hierarquia, contraste, proporções, alvos de toque e espaço de leitura. Não altera nem duplica saldos, cálculos, datas, status, pagamentos, transferência, fatura ou fonte única.
- `scripts/meg-web-home-06.build-hd-assets.mjs` foi reconstruído. Agora compõe os dois assets de 1800px **sem fotografias genéricas externas, sem upscale de miniaturas ou recorte irregular**: couro procedural, costuras e sombras da carteira, cartão de benefício vetorial e logotipo SVG canônico do repositório. O cartão é ilustrativo e não substitui emissão física Verocard.
- A primeira geração de imagem foi bloqueada pelo requisito de tamanho físico do asset; foi adotado WebP sem perdas para preservar detalhe. Em seguida foi detectado recorte vertical da carteira na captura em 1672×941. A correção separou resize/rotação em etapas Sharp independentes para respeitar a geometria e ajustou a posição/escala. O workflow de geração concluiu com sucesso após a correção.
- **Divergência estética real:** a nova carteira é uma representação gráfica de couro, **não uma fotografia** como a imagem oficial 02. A reprodução visual completa permanece pendente de confirmação do usuário; não classificar como tela aprovada. A composição física e a linguagem da referência ainda exigem julgamento visual.
- `HomeScreen.tsx`, integração autenticada, Shell, DataGrid reutilizável, backend, regras financeiras, telas 01–04 e Android **não foram alterados funcionalmente** nesta rodada. As correções anteriores de `Resultado projetado`, vencimentos cronológicos e `Situação` continuam preservadas.
- A PR #650 permanece **Draft, sem merge**. Gate visual Home, Foundation, fonte HD e preflight devem ser conferidos no SHA final com assets. Foundation já apresentava falhas independentes da Home em snapshots do DataGrid; não substituir esse diagnóstico por sucesso de build.
- **Pendências:** comprovar preview Render do SHA final (workspace Render não selecionado nesta sessão), inspecionar screenshots desktop/tablet/320/390, conferir status de todos os gates, comparar com o PNG original e colher aprovação visual explícita. Não avançar para próximas telas.

## Home 06 | substituição IMPLEMENTADA da carteira por cena HD com marca MEG (29/10/2026)

- Contexto: usuário rejeitou mockup que não era implementado; autorizou expressamente **tirar a carteira** e usar uma imagem de alta definição atrás do saldo com logo MEG. Essa adaptação está aprovada como diretriz de implementação, não homologação visual da Home.
- `HomeScreen.tsx`: substituído `img.meg-home-wallet-photo` por `img.meg-home-balance-art` com URL `/meg-web-evolution/home/meg-balance-scene-hd.webp`. Valor do saldo, privacidade e botão de detalhes permanecem funcionais e não são rasterizados.
- `home.css`: apresentação do hero usa a nova cena em 100% da área, gradiente do texto e composição oficial em 7/5. Todo restante do layout oficial 02 preservado.
- `scripts/meg-web-home-06.build-hd-assets.mjs`: removida geração de carteira, substituída por imagem HD 2400×1200 construída em Sharp/SVG, fundo dark teal, gráficos abstratos luminosos e logo do SVG canônico `public/brand/logo-meg-financas.svg`. Gráficos de fundo são exclusivamente decorativos, sem simular ganhos, métricas ou cálculos financeiros.
- Binário gerado e commitado por workflow em `apps/web/public/meg-web-evolution/home/meg-balance-scene-hd.webp`; arquivo antigo `wallet-official-02.webp` removido do branch (não apenas oculto via CSS). Verocard atual mantido.
- `scripts/meg-web-home-06.asset-quality.mjs`: verifica novo arquivo, fonte mínima 2000×1100 e densidade Retina nos viewports oficiais.
- `scripts/meg-web-home-06.visual-test.mjs`: exige nova cena, valida URL e ausência da classe de carteira antiga, mantendo controles e DataGrids.
- `.github/workflows/meg-web-home-06-build-hd-assets.yml`: gera novo asset, remove binário antigo em commit sem force e usa fetch/rebase; build isolado da Home continua exigido.
- Proibido chamar tela pronta antes de verificar screenshot, green gates do último SHA e aprovação explícita. Base da PR #650 permanece Draft, sem merge. O Android, APIs financeiras, transferências, faturas, saldos e DataGrid compartilhado não foram alterados nesta tarefa.
- **Pendências:** conferir captura do último SHA com asset gerado, execução final de `Home 06 - Visual and Build` e `Foundation`, validar publicação exata no Render e aprovação visual. Falhas anteriores do Foundation relacionadas a contratos de viewport do DataGrid são independentes da nova arte e não devem ser ignoradas.


## Home 06 | validação objetiva do Bloco Saldo + Fluxo após rejeição estética (29/10/2026)


- O usuário expressou forte desgaste com a evolução visual e pediu **uma entrega sólida**, não outra promessa ou dashboard diferente. **Home continua a única prioridade**; referência oficial 02 continua soberana.
- Implementação limitada ao painel de saldo. O gerador `scripts/meg-web-home-06.build-hd-assets.mjs` deixa de desenhar barras ascendentes/linha de rentabilidade fictícia; gera cenário ambiental de vidro/iluminação teal com SVG canônico MEG, em 2400 × 1200 pixels, sem alterar os dados React.
- Bloco de saldo e Fluxo permanecem no padrão de duas colunas da imagem oficial. `scripts/meg-web-home-06.visual-test.mjs` agora exige geometria da primeira linha (alinhamento, altura equivalente, ausência de colisão, proporção 7/5 com tolerância) e empilhamento tablet/mobile sem sobreposição.
- O workflow de geração de assets HD (run 40967482789) concluiu com sucesso e publicou o WebP na branch. O teste Home Visual and Build (run 40967722914) concluiu **success**, incluindo capturas reais nos oito tamanhos e contrato 7/5. Arte do saldo fotografada e revisada na captura `desktop-oficial.png` e `mobile.png` do artifact `12938966448`.
- Inspeção visual: nova cena está mais discreta, sem rentabilidade simulada e com leitura do saldo preservada. Ainda **não** reproduz a riqueza fotográfica da referência oficial. Portanto **não homologar Home**.
- Preservados APIs, auth, operações financeiras, cálculo de saldos, status, domínio de benefícios, card Verocard, DataGrid compartilhado e Android.
- PR #650 permanece Draft, sem merge. **Foundation e Preflight do SHA `15764e3fcb42083aad66d9328f0bf0485ced5633` estavam em execução** quando registrado; não declarar verde. Render continua sem comprovação do SHA implantado.
- Próxima decisão: só considerar esse bloco aprovado mediante avaliação visual explícita do usuário; seguir para demais cards da Home somente depois de consolidar o primeiro bloco, sem alterar layout ou identidade.


## Home 06 | Reinício visual funcional STUDIO a pedido explícito do usuário (29/10/2026)


- **Decisão atual e prevalente:** após sucessivas rejeições, o usuário revogou a exigência de copiar o layout 02 para a Home e determinou **começar um layout totalmente novo mantendo a paleta dark teal/turquesa**. Novas imagens geradas de dashboards também foram expressamente rejeitadas. Trabalhar apenas na Home 06, não em telas futuras. A imagem 02 permanece como histórico, não como restrição de layout da Home nesta nova tentativa.
- **Implementação real STUDIO:** `apps/web/src/meg-web-evolution/home/HomeScreen.tsx` ganhou título editorial visível, hierarquia sem imagens cenográficas, marca textual discreta e removeu carteira e cartão ilustrativo. Preserva adaptação da fonte de dados, eventos, privacy toggle, ações de navegação e DataGrid. Não acrescenta nenhum número ou status inventado.
- `apps/web/src/meg-web-evolution/home/home.css` foi **reescrito do zero** (não CSS emendado): modo escuro sóbrio, teal como foco, saldo/fluxo 8/4 no desktop largo, quatro KPIs contidos, cinco ações úteis à esquerda (7/12), benefícios financeiros à direita (5/12), dois DataGrids 6/6, conteúdo empilhado em 640 e 1024, tablet e celular sem scroll horizontal.
- `scripts/meg-web-home-06.visual-test.mjs` não exige mais assets antigos nem proporção 7/5: protege a versão nova, saldo e benefícios com privacy, Fluxo canônico, cronologia, status, navegação/ações, ausência de imagens artificiais e proporção 8/4 (7/5 técnica entre 1024 e 1279) / empilhamento mobile.
- `scripts/meg-web-home-06.asset-quality.mjs` e `.github/workflows/meg-web-home-06-image-quality.yml` agora fiscalizam **independência gráfica da interface** em 1366, 1920, 390, inclusive ausência de imagens decorativas e URLs de fundo, em vez de obrigar as imagens rejeitadas. Checkpoint não implica deploy.
- **Autoridades preservadas:** `financial-policy.ts`, `monetary-protection.ts`, `opening-balance.ts`, `read-model.ts`, `event-mutation.ts`, `benefit-event-mutation.ts`, `transfer-service.ts`, `payables/service.ts`, cartão e faturas canônicas; sem alterações na API financeira ou Android. Componentes Shell e DataGrid globais intocados.
- **Pendências críticas:** testar build, capturas reais de todos viewports, investigar Foundation se vermelho, analisar visualmente captura e pedir aprovação visual **explícita** antes de merge. Manter PR #650 **Draft**. Render só pode ser apresentado como publicado no SHA exato quando verificado por deploy; `?v=` não comprova publicação.

## Home 06 | ATLAS: novo layout funcional, não derivado do STUDIO (29/10/2026)

- Após o usuário **rejeitar explicitamente** o STUDIO e pedir novo layout, esta etapa mudou apenas a apresentação da Home 06 para a abordagem **ATLAS**. Não considerar aprovada: deve ser avaliada visualmente pelo usuário.
- `HomeScreen.tsx`: DOM reorganizado de forma real, não apenas cores/CSS: `meg-home-overview` com **núcleo financeiro integrado Saldo+Fluxo** à esquerda e **quatro KPIs de navegação** em rail 2x2 à direita; `meg-home-operations` com cinco ações e resumo do Verocard; `meg-home-ledger` com dois DataGrids de **largura total** em sequência. Sem imagens cenográficas e sem métricas inventadas.
- `home.css`: **substituição integral** por linguagem dark teal, turquesa em destaques, tipografia legível e hierarquia mais limpa; sem CSS antigo ou imagens fotográficas. Layout realmente diferente da imagem 02 e do STUDIO. Breakpoints principais 640px e 1024px.
- `scripts/meg-web-home-06.visual-test.mjs`: contratos atualizados para verificar Fluxo abaixo do Saldo dentro do núcleo, KPI rail lado a lado no desktop, empilhamento tablet/mobile, DataGrids full width e nenhum corte/scroll horizontal. Outros testes de privacidade, domínio, ações e data permanecem.
- `scripts/meg-web-home-06.asset-quality.mjs`: auditoria gráfica aponta para `.meg-home-atlas`, sem imagens cenográficas. Nenhuma alteração em API, leitura financeira, Shell global, DataGrid central, Android ou outras telas.
- **Pendências:** capturas da aplicação real e revisão, gates Foundation/Preflight, prova do deploy exato no Render e **aprovação visual explícita**. PR #650 deve permanecer em Draft, sem merge.


## HOME 06 - DECISÃO VIGENTE: ATLAS REPROVADA VISUALMENTE (29/10/2026)

- O usuário examinou a captura real da Home ATLAS e declarou expressamente: **"pior de todas até agora"**. **ATLAS REPROVADA.** Nenhuma tela Home foi homologada; não tratar ATLAS, STUDIO, ORBIT ou quaisquer propostas rejeitadas como referência visual ou layout aceito.
- O pedido atual permanece focado **somente na Home**, com paleta MEG dark teal/turquesa e preservação integral das regras financeiras canônicas. A qualidade visual é uma pendência crítica e não pode ser compensada por CI verde, imagens geradas ou versões superficiais de CSS.
- Bloquear merge da PR #650 enquanto não existir nova proposta aprovada explicitamente. Manter PR **Draft**. Não avançar para outras telas. Nenhuma migração do Android.
- **Não recomeçar outra refação automática baseada na ATLAS.** O próximo trabalho deve definir a experiência de informação da Home e só depois reconstruir a apresentação limpa em isolamento, com captura real e revisão visual. Não inferir aprovação ou publicação em Render apenas por URL sem cache.


## HOME 06 | Implementação da referência Tela principal(1).png com primitivas shadcn locais e ECharts (29/10/2026)

- **Diretriz atual:** o usuário anexou `Tela principal(1).png` (1672×941), autorizou usar componentes `shadcn/ui` selecionados, e exigiu fidelidade na área interna da Home, com sidebar existente intocada. Esta imagem substitui as experiências rejeitadas ATLAS/STUDIO/ORBIT como fonte visual da Home. **Ainda NÃO homologada visualmente.**
- **Camada React:** `apps/web/src/meg-web-evolution/home/HomeScreen.tsx` foi reestruturado para Saldo+Fluxo 7/5, quatro KPIs, Benefícios Verocard/Ações rápidas, dois DataGrids na última linha 6/6. Valores preservados de `/finance/summary`, `cashflow`, `benefit-summary`, `home-overview`, `payables` e `cards`, passando pela fonte única `api-adapter.js`.
- **Biblioteca:** `HomePrimitives.tsx` contém Card/Button locais adaptados à composição shadcn/ui (licença MIT) com CSS isolado. **Não foi instalado Tailwind global nem executado shadcn init**, para não alterar Shell/sidebar nem criar segunda arquitetura de estilos. O componente existente DataGrid permaneceu intacto.
- **Gráfico real:** `HomeCashflowChart.tsx` usa ECharts 6, já dependência do app, e exibe `cashflow.days` (income/expense) sem criar regras de saldo ou totais. Tooltip de datas e valores reais, estado vazio e proteção de visibilidade; sem valores de gráfico fictícios no modo autenticado.
- **Arte de saldo:** `home.css` foi integralmente substituído por CSS escopado à Home. Foto real e licenciada de 志远 杨 (@yangzhiyuan), Unsplash `https://unsplash.com/photos/kzH-sVU5pqs`, servida otimizada `w=1600&q=78`, com crédito na origem do código. O traço SVG decorativo atrás do saldo **não representa desempenho nem afirma rentabilidade**.
- **Adaptações de negócio que NÃO são falhas:** percentuais genéricos e promoções Verocard ilustrativas do print NÃO foram inventados; exibem-se somente leitura de saldo/benefício/entradas/saídas/contagens canônicas. Quinto atalho "Pagar conta" preservado (a referência mostra quatro) e quinta coluna "Situação"/"Conta" dos DataGrids é preservada quando funcional.
- `scripts/meg-web-home-06.visual-test.mjs` protege a geometria da referência, controles, privacidade, ações, DataGrids, responsividade e zero overflow; `scripts/meg-web-home-06.asset-quality.mjs` verifica fonte fotográfica, ECharts canônico e CSS sem assets rejeitados.
- **Evidência:** workflow Home 06 Visual and Build run **40978103328** no SHA `0272746f9b6cf24a8368ff6bf6aa1842acb11d27` terminou **success**; capturas reais geradas para oito tamanhos, incluindo `desktop-oficial.png`, `mobile.png`; artifact GitHub **12943641370**. Auditoria de assets run **40978103363** também **success**.
- **Gates restantes:** Foundation run **40978103274** e Visual Preflight run **40978110132** ainda estavam em execução na consulta. Não declarar verdes. Publicação no Render do SHA exato ainda sem evidência. A PR #650 permanece **Draft**, **não mesclar**, e a Home segue aguardando aprovação visual expressa.

## HOME 06 | Refinamento de simetria, ícones Lucide, fotografia HD local e gráfico legível (29/10/2026)

- Solicitação atual do usuário: corrigir **simetria interna**, tornar ícones **modernos e robustos**, trocar imagem de Saldo por fotografia **HD responsiva sem distorção**, modernizar gráfico para leitura fácil. **Não mudar a composição 7/5 da Home oficial atual.**
- `HomeIcons.tsx` **criado** com linguagem SVG Lucide (licença ISC, atribuição no fonte), traços consistentes de 2,25 e nomes conservados para ícones funcionais da Home. O ícone local anterior em `HomeScreen.tsx` foi substituído. Sidebar/Shell não receberam alterações.
- `home.css` refinado para proporções iguais entre ícones de KPIs, headings e atalhos (variáveis de tamanho), botões operacionais simétricos, foco visual e foto WebP local carregada por `image-set(1x,2x)` + `cover` sem deformação geométrica. **A representação fictícia de rentabilidade (SVG de barras e linha) foi retirada do Saldo**, preservando o texto financeiro real e o botão de privacidade.
- Foto de montanhas e lago © **Francesco Ungaro**, licença Unsplash, original `https://unsplash.com/photos/a-mountain-range-with-a-body-of-water-in-the-foreground-VrpZtXxwyvE`. Arquivos criados por `scripts/meg-web-home-06.hero-photo.mjs` e `.github/workflows/meg-web-home-06-hero-photo.yml`: `apps/web/public/meg-web-evolution/home/meg-hero-mountains-1600.webp` (1600 × 700) e `meg-hero-mountains-2560.webp` (2560 × 1120). Workflow 40981710261 **success** e commit automático de asset `a524c84a344161da3cf29df9acdb010d1d84d473`.
- `HomeCashflowChart.tsx` redesenhado em ECharts: barras **agrupadas** de entradas e saídas (ambas positivas para comparação visual), bordas arredondadas, legenda clara, tooltip em BRL, eixo discreto e respeito à ocultação de saldos. Séries derivadas somente de `cashflow.days` canônico; não recalcula saldos, faturas ou transferências.
- Captura real do navegador em 1672 × 941, 390 × 844 e 320 × 700 revisada. Identificada uma colisão em 320px; `home.css` corrigido para Fluxo mobile em duas colunas com Resultado projetado na linha seguinte, e `scripts/meg-web-home-06.visual-test.mjs` passou a exigir **ícones simétricos, WebP 2x, canvas ECharts e ausência de colisão numérica em mobile**.
- Validação: `MEG Web Evolution Home 06 - Visual and Build` workflow **40982543990**, SHA `a169ecf43c3c01e7c90d51ca3adf998e8932cd32`, **success**, com capturas reais nos oito viewports (artefato **12945861504**). Auditoria de assets **40982513220** sobre o mesmo conjunto visual antes da última modificação apenas nos testes, **success**.
- Preservados: fonte financeira API, eventos, conta/benefício Verocard, 4 KPIs funcionais, 5 atalhos, DataGrid compartilhado, auth, Shell/sidebar global, todas demais telas e Android.
- **Gate:** Home NÃO HOMOLOGADA. PR #650 permanece Draft, sem merge. Foundation e Preflight do SHA testado ainda em andamento na última consulta. Render do SHA exato não foi comprovado implantado; parâmetro `?v=` é apenas cache-buster. A aprovação visual do usuário é obrigatória.


## Home 06 | Referência visual aprovada em 29/10/2026

- **Aprovação explícita do usuário:** após apresentar a proposta dark teal de dashboard com fotografia panorâmica de montanhas e lago, card de saldo translúcido, quatro indicadores, gráfico moderno de fluxo, área de benefícios, ações rápidas e dois DataGrids, o usuário declarou "essa e boa", perguntou sobre a implementação e confirmou **"homologado"**.
- **Escopo da homologação:** somente a **imagem/conceito visual escolhido** para orientar a próxima implementação da Home 06. **Não é homologação da Home React atualmente publicada**, nem validação funcional, financeira, responsiva ou autorização de merge.
- **Diretriz vigente:** manter paleta MEG dark teal/turquesa; reconstruir a apresentação isoladamente e comparar com a imagem aprovada, preservando Shell/sidebar, autenticação, DataGrid, APIs, autoridades financeiras e Android. Gráfico interativo pode consumir ECharts com séries reais de `/finance/cashflow`, sem inventar rentabilidade ou totais.
- **Atenções de negócio:** saldo monetário não inclui saldo Verocard; percentuais comparativos, saldos de contas, descontos promocionais e números da arte são ilustrativos, e só aparecem em produção se disponibilizados pelas autoridades canônicas.
- **Gates:** PR #650 permanece Draft, sem merge. Última inspeção antes deste registro apontou `MEG Web Evolution Foundation` com falha em `Validate Web Evolution viewport contracts`; corrigir e revalidar. Ainda é necessária a aprovação explícita da implementação real em desktop e mobile, com preview publicado no SHA exato e link sem cache.
