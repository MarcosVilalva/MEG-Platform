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

---

## Correção pontual Sair → Login (21/10/2026, aguardando revisão)

- **Escopo:** somente encerramento de sessão e retorno ao Login na nova Web; não constitui encerramento da Etapa 05 nem aprovação visual.
- **Base:** `main` em `f7792edb047bbc36c951baee77ad18e414d19dbe`, merge squash da PR #642.
- **Causa:** botão Sair do `AppShell.tsx` sem evento/callback; `AuthGateway` não recebia sinal de logout e não desmontava o Shell. O cliente de autenticação já possuía `logout(session)`, sem ligação à interface.
- **Correção:** o botão aciona logout; a sessão e o cache autenticado local são limpos imediatamente, o Shell desmonta e o Login aparece no mesmo documento. A revogação do refresh token usa o contrato `/auth/logout`, com timeout e aviso se houver falha remota. A renovação assíncrona atrasada não salva sessões invalidadas. Novo login permanece possível, inclusive enquanto a revogação antiga estiver pendente.
- **Validação temporária:** commit `6e5287a8c1197447121dd182926892a795915995`; [MEG Platform CI #39532869580](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/39532869580) aprovado (`npm run check`, testes e builds Web/API); [MEG Logout Validation #39532869617](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/39532869617) aprovado, 10/10 Playwright com sessões fictícias, viewports 1366×768, 1366×600, 1024×600, 1093×480 e 910×400. Workflow usado apenas na branch temporária; não integrar à `main`.
- **Limitações:** testes de navegador usaram mocks. Revogação remota só pode ser afirmada quando o servidor responder com sucesso; o contrato atual revoga refresh token, não garante invalidar imediatamente todo access token já emitido. Homologação contra a API real e aprovação humana continuam pendentes.
- **Proteções:** Android, regras financeiras, DataGrid, baselines visuais, dependências, contratos da API e produção não alterados por esta correção. Nova PR deve permanecer **Draft**, sem merge nem publicação de produção.

---

## Auditoria e refinamento Sair → Login, PR #643 (22/10/2026)

- **Escopo:** exclusivamente a sessão da nova Web, sem alterar roadmap ou visual. A PR [#643](https://github.com/MarcosVilalva/MEG-Platform/pull/643) permanece Draft, sem merge e sem deploy.
- **Comparação de conteúdo:** os seis arquivos de aplicação/testes e os workflows CI/Pages possuíam o mesmo blob SHA na branch temporária previamente validada e no HEAD original da PR `86da0a5baf3720165e240bc08f818f0120beb5eb`; o workflow temporário existia apenas na branch de teste.
- **Auditoria direta do SHA original da PR:** [Actions #39867236947](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/39867236947), checkout confirmado de `86da0a5baf3720165e240bc08f818f0120beb5eb`: **19 passed, 1 failed** de 20 testes. Falha reproduzida: uma resposta atrasada de `updateOwnProfile` conseguia sobrescrever o perfil da nova sessão (esperado `user-two`, recebido `user-one`).
- **Correção adicional mínima:** `auth-client.ts` agora verifica a revisão da sessão, o refresh token e a identidade do usuário que iniciou a atualização de perfil antes de gravar a resposta. Incluído cenário de regressão em `logout.playwright.spec.mjs`.
- **Validação da correção na branch de auditoria:** SHA `91673df72aa994c6ef18eb73985d77191c4bc681`; [CI #39867703491](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/39867703491) **SUCCESS**, `npm run check` (testes e builds Web/API); [Playwright #39867703479](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/39867703479) **SUCCESS, 21/21**, incluindo auditoria isolada de teclado, logout local, histórico, recarga, sessão trocada e requisições atrasadas; [artifact #12463664620](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/39867703479/artifacts/12463664620). Executados em GitHub Actions com dados fictícios, sem Codespace ou conta pessoal.
- **Responsividade:** 1366×768 (sidebar expandida/recolhida), 1366×600 (expandida no teste original e recolhida na auditoria), 1024×600 (ambos), 1093×480 (expandida no teste original e recolhida na auditoria), 910×400 (sidebar compacta estrutural, sem toggle de expansão).
- **Gates condicionais:** Foundation `skipped` pela expressão de branch; Financial E2E e Android RC1 `skipped` pelas regras existentes. Não tratar skips como aprovados. `npm run check` inclui testes financeiros de contrato e build da API sem mutações reais.
- **Pendências:** homologação contra API real com ambiente/credencial fictícia autorizada; confirmação remota de revogação; access tokens já emitidos podem permanecer válidos até expirar; aprovação humana/visual. Nenhuma prévia da PR está publicada por esta operação.
- **Proteções:** Android, `apps/web/src/mobile`, regras financeiras, DataGrid, dependências, backend, assets, CSS e workflows de produção permanecem intocados. A Etapa 05 não foi encerrada. Branches temporárias preservadas para rastreabilidade.

---

## Etapa 05 - Loading no ciclo real de autenticação (22/10/2026)

- **Etapa autorizada:** 05, caracterização e correção mínima do Loading já existente, conforme o prompt `prompt-loading-na-autenticacao-apos-a-pr-644.md`; **não aprova visualmente** qualquer tela nem encerra a Etapa 05.
- **Base testada e dependência:** `fix/web-logout-return-login@c982d3bc4e0fd3593e6872039398b96c422a181b`, HEAD da PR #643 ainda Draft. A `main` não possuía handler Sair e portanto não permitia caracterizar o logout real sem esta dependência; a nova branch `fix/stage05-loading-auth-single-flight` deve abrir PR **Draft empilhada, base #643**, sem modificar o HEAD #643 ou integrar silenciosamente commits.
- **Escopo preservado:** LoadingScreen, logo, fundo, CSS, cores, fontes, composição, Login, Cadastro, Recuperar Senha, API, banco, endpoints, contratos de autenticação, DataGrid, Mobile, Android e regras financeiras **não foram alterados**. Só `apps/web/src/meg-web-evolution/main.tsx` e novos testes de caracterização. Nenhuma duração, percentual ou prazo fictício foi introduzido.
- **Fluxo real:** `AuthGateway` lê `sessionStorage:meg.auth.session`. Sem sessão: Login direto; sessão armazenada: Loading runtime enquanto GET `/auth/me` valida. HTTP 401/403: tenta `POST /auth/refresh` via cliente já existente, deduplicado; valida token renovado antes de Shell. Falha de rede/5xx: retorna ao Login, sem abrir Shell; preview `?auth=loading` é exclusivamente demonstrativa. Sair está disponível **somente pela dependência #643** e limpa sessão local imediatamente, solicitando revogação remota.
- **Defeito reproduzido 1:** [Actions #39882768726](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/39882768726), SHA original #643 e banco/API reais isolados: **5 falhas** entre 16 cenários mockados, todas de dupla validação concorrente de `/auth/me` durante montagem do StrictMode nos viewports 1366×768, 1366×600, 1024×600, 1093×480 e 910×400; os outros 11 casos simulados e 1 real passaram. **Correção:** `validateSessionOnce` compartilha Promise pendente por par accessToken/refreshToken; libera após sucesso ou falha, sem cache de resposta nem alteração de contrato.
- **Defeito reproduzido 2:** [Actions #39883539349](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/39883539349) confirmou **3 falhas de foco**: retorno ao Login após falha de rede, HTTP 503 ou sessão inválida/refresh rejeitado não focalizava e-mail. **Correção:** o fluxo já existente de `focusOnMount` do Login é acionado após falha na restauração ou na validação de login, sem mudar HTML/CSS do Login.
- **Pré-validação verde 1:** `71eb7919e461aca5900412b5e308d7808327c48e`, [CI #39883151543](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/39883151543) SUCCESS e [browser/API #39883202483](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/39883202483) SUCCESS, 16/16 simulados e 1/1 API real efêmera.
- **Validação final do código antes do checkpoint:** `a428aaa3dec249c9050c915c0bd7a6232a0701f7`, [CI #39883861582](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/39883861582) SUCCESS e [navegador/API #39883917812](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/39883917812) SUCCESS, **25/25 simulados e 1/1 real**. [Artifact #12471881953](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/39883917812/artifacts/12471881953) com capturas de Loading runtime e de erro demonstrativo, sem segredos ou identidade pessoal.
- **Cenários cobertos:** sem sessão/Login sem loop; sessão válida/Shell; token inválido com refresh sucesso/falha; API lenta; ausência de duplicação, erro rede, HTTP 503; resposta refresh tardia não restaura sessão depois de Sair; reload/novo login; logout real e revogação no backend com PostgreSQL temporário; foco pós-erro; navegação por teclado sem controles protegidos; preview erro recuperável. Viewports 1366×768, 1366×600, 1024×600, 1093×480, 910×400. `prefers-reduced-motion` ativo no navegador; sem scroll horizontal nos estados cobertos. Dados fictícios e nenhuma credencial real exposta.
- **Gates:** `npm run check` e builds Web/API aprovados; teste de backend real com conta fictícia/workspace/licença e PostgreSQL 16 efêmero aprovado. Financial E2E dedicado e Android RC1 **skipped** por condição de CI; não são aprovados. Testes visuais são técnicos e não substituem aprovação do usuário. Sem deploy de produção ou hospedagem.
- **Gate de confirmação do SHA com checkpoint inicial `07ce8c9e979916383f081df27772c8df7418b10f`:** [CI #39884277722](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/39884277722) **SUCCESS**, `npm run check` e builds Web/API; [navegador e API #39884355668](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/39884355668) **SUCCESS, 25/25 simulados e 1/1 API real**; [artifact #12472445431](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/39884355668/artifacts/12472445431). O checkout do SHA `07ce8c9e...` foi conferido no log. Este complemento de checkpoint é somente documental; código, testes e contratos não foram alterados.
- **Pendências reais:** revisão visual humana da PR e artefatos, homologação hospedada, autorização explícita antes de merge, reconciliação futura da base empilhada #643 e dos drafts #628/#629/#644. Nenhum HEAD histórico foi alterado. Os estados `?auth=loading&state=error/empty` são demonstrativos, não um relato de erro real da API. Etapa 05 **aberta**.


---

## Etapa 05 - Ciclo completo de autenticação: caracterização posterior à PR #645 (23/10/2026)

- **Estado pré-missão:** `main@f7792edb047bbc36c951baee77ad18e414d19dbe`; PR #643 Draft `c982d3bc4e0fd3593e6872039398b96c422a181b`; PR #644 Draft `7ce156ae39cc7d657362654d3df5813b53605e3e`; PR #645 Draft baseada em #643, inicialmente `a8c0a2ae714f15143791cbe1282ae3e67f7e258c`. Não houve merge, deploy ou alteração na `main`.
- **Diagnóstico antes da correção:** [QA red #39888415344](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/39888415344), 4 falhas reais no ciclo: duplo POST em Login, Criar Conta e Recuperar Senha, além de dois botões «Voltar ao login» na confirmação de Criar Conta.
- **Correções pontuais:** `LoginScreen.tsx` e `CreateAccountScreen.tsx` ganharam trava síncrona `useRef` contra envio duplo no mesmo frame; Criar Conta removeu só o botão duplicado no sucesso e foca o título de confirmação. `RecoverPasswordScreen.tsx` adota **exatamente o blob `308cab8801c4324441f5fe88e333ef96cf34838a` da PR #644**, incluindo proteção contra duplo envio, foco, acessibilidade e resposta neutra. Teste de regressão `cycle.characterization.playwright.spec.mjs` preservado na PR #645.
- **Validação pré-integração exata:** `tmp/stage05-auth-cycle-audit@e0320b0e770c268fe3cef13bf11c7adeb4e62519`. [Actions QA/browser #39890480255](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/39890480255): `npm run check` e 29/29 testes de navegador **SUCCESS** (inclui os 25 cenários de Loading existentes). [Actions QA/API #39890480253](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/39890480253): 2/2 cenários de integração com API Fastify real e PostgreSQL 16 efêmero **SUCCESS**: `Criar meu espaço MEG` gera cadastro PENDING, Login/Loading/Sair/reload e refresh-token revogado; Recuperar Senha gera senha temporária real, faz novo login, revoga sessões antigas e respeita HTTP 429. [Artifact #12474856180](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/39890480253/artifacts/12474856180), capturas com dados fictícios.
- **Falhas de teste distinguidas de produto:** primeiro runner de CI não gerou Prisma antes de `npm run check`; corrigido somente no workflow temporário. O teste de `Solicitar acesso` retornou `WORKSPACE_MEMBER_LIMIT_REACHED`, regra legítima da licença; homologado o outro caminho, `Criar meu espaço MEG`, sem alterar limites comerciais. O retorno por histórico pode exibir uma rota **pública** anterior (Cadastro), mas não o Shell; o roteiro foi ajustado para exigir segurança da sessão, não sempre a rota Login. O transporte externo Brevo foi interceptado em memória por adapter só no runner (`NODE_ENV=test`, banco local, emails fictícios); **não foi testado o provedor externo**.
- **Isolamento:** arquivos de workflow, fixtures/seeds, captação de e-mail e testes temporários de backend ficaram em `tmp/stage05-auth-cycle-audit`; não são incorporados às interfaces ou ao backend da PR #645. PRs #643 e #644 não alteradas. Nenhuma mudança de CSS, telas oficiais, Shell, LoadingScreen, API, banco de produção, domínio financeiro, DataGrid, Android ou Mobile.
- **Gate restante:** após este commit, executar CI e toda a suíte no HEAD da PR #645 (checkout exato), verificar artefatos e só então marcar a validação técnica concluída. Homologação hospedada, prévia interativa e aprovação visual humana **pendentes**. Não fazer merge, auto-merge, deploy ou encerrar a Etapa 05.

---

## Prioridade Operacional - Primeira entrega: Lançamentos com DataGrid real (23/10/2026)

- **Mudança de prioridade expressamente solicitada:** operação financeira desktop primeiro, Lançamentos → Novo/Editar Lançamento → panorama financeiro; preservar autenticação (PR #645), regras canônicas e prints oficiais. Sem merge, deploy, migrations ou acesso a dados pessoais reais.
- **Base:** PR #645 Draft `d821dffde424f3f2720b7459e6edfbf7a4fa3bf1`, empilhada sobre #643. `main@f7792edb047bbc36c951baee77ad18e414d19dbe` intacta. Branch exclusiva `feature/meg-web-operational-launches-read`, dedicada ao primeiro incremento, read-only.
- **Auditoria do código:** Shell novo abre apenas contêiner vazio; DataGrid completo existia em harness técnico com 640 registros fictícios. `GET /finance/events` já usa authorize readRoles, `financialDataOwnerId`, paginação 1..100 e `listFinancialEvents` que filtra `userId` e `archivedAt=null`, com conta/categoria/pagamento. `financeClient.listEvents` já existia, antes sem sinal de cancelamento. Writers protegidos continuam no backend: `event-mutation.ts`, `benefit-event-mutation.ts`, `transfer-service.ts`, `payables`, `cards`.
- **Mudança integrada para consulta:** no Shell, navegação Início/Lançamentos e identidade derivada da sessão autenticada (não texto fixo de outro usuário). A primeira tela após login exibe Lançamentos com `DataGrid` existente, nunca fixture. Leitura pagina a API inteira (100 por página), com verificação de total, página, IDs e completude; só libera grade, filtros, paginação e exportações ao final, sem vender pagina parcial como histórica. Progresso, erro, ausência de resultados e botão Atualizar explícitos. Aborta requisição ao desmontar/log out. `persistenceKey` do DataGrid segmentado por usuário.
- **Valores:** usa campos monetários **já calculados na API** (`amount` e `signedAmount`) apenas para exibição, sem recalcular saldos, faturas ou status; agregações de dinheiro deliberadamente desabilitadas, pois resultados com diferentes contas/benefícios e transferências não podem ser confundidos com saldo disponível. A contagem filtrada reflete o conjunto completo carregado. PDF configurado para não cortar artificialmente no padrão de 5000; CSV/XLSX/PDF usam filtros e ordenação do DataGrid existente.
- **Limitações conscientes deste incremento:** ainda não oferece editor/mutação, detecção confiável de duplicidades ou totais financeiros filtrados canônicos. Não afirmar aceite integral da primeira etapa sem essas capacidades. A estratégia de carregar todo o histórico é correta, porém pode exigir futura paginação/consulta com filtros e agregações no servidor para históricos extensos. Mudanças simultâneas detectadas por total/IDs geram erro e atualização, não dados truncados.
- **Segurança:** API continua autorizando escopo; nenhum arquivo de API, esquema, migração, regra financeira, mobile, Android ou CSS antigo alterado. `GET /finance/events` já impõe no máximo 100 registros/chamada; a UI percorre todas as páginas. Não usar dados reais em QA.
- **Pendências:** gates CI completos, testes de consulta isolada/usuários distintos, revisão visual nos prints oficiais, preview hospedado e aprovação expressa. CI oficial atualmente bloqueado por advisory high de `zod`, herdado do lockfile da `main`; não desabilitar nem ignorar o gate. PR Draft e sem merge/deploy. A Etapa financeira operacional **não está finalizada**.

---

## Continuidade operacional — PR #646, revisão de integridade e segurança (24/10/2026)

- **Prioridade vigente:** Lançamentos reais no desktop, seguidos por Novo Lançamento, cadastros necessários e Home financeira. Esta alteração permanece **somente** na Etapa operacional de Lançamentos, sem iniciar outras telas.
- **PR:** #646, Draft, branch `feature/meg-web-operational-launches-read`, base empilhada na PR #645 (que depende da #643). Nenhum merge, deploy, alteração de banco real, credenciais ou Android está autorizado nesta entrega.
- **Base original auditada:** `ec1c869516c6c95ed27af0bf6e7156d7c5a9d7b9`; QA original [#40043735244](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/40043735244) passou no SHA exato, com API real, PostgreSQL descartável, 251 eventos e dois usuários sintéticos.
- **Correção de leitura isolada:** `d502530ebec55d1326154e7a6f8ac5b2d62f0e53`. `listFinancialEvents` retorna uma revisão baseada no total e máximo `FinancialEvent.updatedAt`, apurada junto com os registros em `RepeatableRead`; o carregador compara as revisões das páginas e reconfirma a revisão após terminar. ID repetido, página incompleta, alteração detectada ou erro não liberam histórico parcial nem exportações. Testes unitários novos cobrem alteração com total constante, alteração no encerramento e resposta sem revisão. [QA exato #40045493076](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/40045493076) foi aprovado.
- **Segurança de dependência isolada:** advisory `GHSA-mrhx-c7xc-m3w5`, confirmado no `zod@3.25.76` do lockfile; pacote corrigido `zod@4.6.7` nos workspaces API e Web. Os 19 imports diretos da API usam `zod/v3` para preservar os contratos de validação existentes; os demais códigos e políticas monetárias não foram reescritos. O QA descartável [#40045763857](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/40045763857) aprovou o ensaio migratório com testes e auditoria de segurança. O código versionado está em branch candidata separada.
- **QA de código versionado:** [execução #40046026131](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/40046026131), checkout explícito do commit `3597663541076bade06c0c07ff8dc783d734c9db`, com `npm ci`, gate de segurança e API/PostgreSQL reais. Consultar o estado efetivo da execução antes de promover a branch.
- **Alcance preciso da consistência:** protege contra mudanças detectáveis em eventos financeiros entre páginas. Não afirma snapshot transacional único entre requisições; renomeação concorrente de cadastros associados e alterações externas não acompanhadas por `FinancialEvent.updatedAt` exigem verificação separada. Não vender uma garantia mais ampla que a comprovada.
- **Ainda pendentes:** revisão humana visual desktop, preview hospedado sem cache do SHA final, detecção semântica de possíveis lançamentos duplicados (distinta da repetição de IDs), totais financeiros filtrados canônicos e todos os fluxos de escrita. Novo Lançamento usará exclusivamente writers existentes, sem recomeçar o DataGrid ou criar outro motor financeiro.
- **Gates para promoção:** QA e CI oficial devem cobrir o HEAD efetivo da entrega, com SHA conferido nos logs. PR permanece Draft. Android, dados financeiros reais, migrations, deploy, merges e PRs-base não são alterados.


---

## MEG Web Evolution — Novo Lançamento operacional PR #647 (24/10/2026)

- **Base:** PR #646 Draft e HEAD 94f60d4fa53ee741d07f67ac1d13c2a985c49d9e; CI #40046273281 e QA #40046224707 aprovados. PRs #643/#645 e main preservadas.
- **Nova entrega:** PR #647 Draft, branch feature/meg-web-operational-new-launch-basic, empilhada sobre #646, sem merge ou deploy. Formulário acessível pelo Shell e pela tela Lançamentos; usa os catálogos autorizados e o writer canônico POST /finance/events. Campo monetário somente para digitação e validação de formato brasileiro; cálculos e status definitivos continuam no servidor. O DataGrid existente recarrega o histórico integral após resposta de gravação confirmada.
- **Receita:** intenção planned, promovida pelo backend para paid segundo resolveCanonicalFinancialStatus.
- **Despesa:** apenas planned/pendente nesta primeira fatia, sem débito. Cartão, crédito, transferência, Verocard, benefício e categoria Fixo excluídos desta via. Motivo concreto: o writer genérico createFinancialEventProtected ainda não verifica saldo insuficiente antes de postar despesa paga; não alterar regras sem caracterização e validação. Cartão e benefício têm writers separados.
- **Segurança:** operaçãoId para idempotência, bloqueio de duplo clique, IDs de catálogos ativos validados em escopo, erro POSSIBLE_DUPLICATE sem sobreposição automática, permissão de criação conferida pelo backend. Autocomplete consulta histórico autorizado, recupera somente conta/categoria/meio de pagamento compatíveis com a descrição do mesmo tipo, sem copiar data, valor ou status.
- **Evidências iniciais:** QA PostgreSQL 16 e navegador sobre commit bacffa63d1ee1f10a686b4b6d7bdf5adbf2d7e9c: https://github.com/MarcosVilalva/MEG-Platform/actions/runs/40047064498 SUCCESS, 3/3 cenários de navegador, API real, criação de receita e despesa pendente, sem impacto no saldo pela pendência, isolamento entre dois usuários e refresh da consulta. Autocomplete e checkpoint adicionados depois, exigindo novo CI e QA no SHA final.
- **Pendências:** preview hospedado da versão final e aprovação visual explícita; cadastro de referências pela nova UI; baixa protegida de despesa, crédito/parcelas e benefício nos respectivos writers; duplicidades semânticas históricas; Home bancária e alimentação. A PR não está autorizada para produção.
- **Validação desktop:** entrada apps/web/web-evolution.html sob API e banco QA isolados, credenciais fictícias, sem confundir endereço antigo do Render com a branch atual. Android congelado e dados reais intocados.


---

## Visual oficial de Novo Lançamento e correção da grade — PR #648

- Origem: PR #647 Draft, commit 18209e9adb1a3c2ab9b7fd6f871ec9b5daa5f38a. Nova PR #648 Draft, branch feature/meg-web-new-launch-visual-official, empilhada sobre #647. Nenhum merge, deploy, migration, mudança Android ou dado financeiro real alterado.
- Referência A: chooser oficial com coluna de apresentação, quatro cards Despesa, Receita, Transferência e Benefício e identidade teal escura. Somente Despesa e Receita habilitadas. Transferência e Benefício aparecem como indisponíveis e não têm rota de gravação.
- Referência B: imagem oficial Novo lançamento financeiro neon.png. Formulário financeiro em três áreas no desktop (informações principais, data/valor/detalhes, resumo dinâmico), categoria e atalhos de catálogos reais; design com tokens oficiais, layout responsivo em 640px e 1024px. Nenhum valor, conta, marca, cartão ou saldo fictício da imagem foi integrado ao produto.
- Resumo: apenas reprodução formatada do valor digitado e das referências selecionadas, sem cálculos de saldo, fatura, parcela ou status financeiro na tela. Situação final continua no servidor.
- Segurança: writer POST /finance/events inalterado, operationId estável durante tentativas, prevenção de duplo envio, duplicidade detectada pela API, autocomplete preservado sem trazer valor/data, controle de papéis, refresh do histórico após gravação. Receita é realizada pelo domínio; despesa permanece planned e sem débito.
- Restrições mantidas: despesa paga, Fixo, parcelamento/cartão, transferência e benefício não liberados no fluxo genérico; os três últimos exigem autoridades separadas.
- Regressão DataGrid: o viewport original com flex-basis zero foi criado para harness de altura fixa e podia colapsar na tela operacional. Aplicado ajuste CSS exclusivamente dentro de Lançamentos: flex-basis automático e altura mínima com rolagem. O DataGrid não foi refeito nem teve seu código central editado.
- Acessibilidade: cards com botões, controles indisponíveis desabilitados, rótulos, Tab/Escape, devolução de foco, resumo legível, rolagem no diálogo, prefers-reduced-motion e mobile sem layout fixo.
- QA exigido: screenshot da seleção, Receita, Despesa, resumo e tabela com cabeçalho/linhas visíveis; PostgreSQL descartável com usuários fictícios; resoluções 1366x768, 1024x600, 910x400 e 390x844; conferir CI e QA no HEAD final. Registrar provas após execução, sem declarar CI como homologação humana.
- Prévia: nenhuma URL publicada para esta branch. Usar web-evolution.html em ambiente de QA local com API e PostgreSQL fictícios, ou artifacts de GitHub Actions como evidência preliminar. Sem merge ou deploy.
- Pendências: homologação visual explícita, publicação isolada autorizada, proteção atômica de saldo para pagamento, cadastros por UI e fluxos canônicos de cartão, benefício e transferência.



---

## PR #648: acabamento de rolagem, resumo e acessibilidade (24/10/2026)

- Etapa autorizada: somente acabamento da seleção do tipo e formulário Novo Lançamento da PR #648, sem iniciar nova tela e sem alterar regra financeira, writers canônicos ou dados reais.
- Base preservada: PR #647 HEAD 18209e9adb1a3c2ab9b7fd6f871ec9b5daa5f38a, PR #648 empilhada, Draft e sem merge/deploy.
- Alterações: visual teal oficial em duas etapas mantido. Ícones dos quatro cards padronizados usando Icon já existente; itens indisponíveis mantêm contraste, não ativam gravação. Resumo formata somente a data textual AAAA-MM-DD para DD/MM/AAAA, sem converter Date nem mudar payload da API. Valor em reais permanece prévia local, sem saldo ou cálculos financeiros.
- Acessibilidade: foco inicial no título, controle de Tab e Shift+Tab também quando o título recebe foco, Esc e devolução ao gatilho. O modal mantém uma área de rolagem com scroll-padding; cabeçalho sticky opaco e rodapé sticky opaco com espaço de foco. Atenção especial às resoluções desktop 1366x768, 1024x600, baixa 910x400 e mobile 390x844.
- Corrigida previamente a visibilidade do DataGrid por CSS de escopo da tela Lançamentos, sem modificar o componente central. QA exige conferir cabeçalho e linhas renderizados após a gravação.
- Continuidade financeira: apenas Receita (status final servidor) e Despesa Pendente (sem débito). Transferência, Benefício, Cartão/parcelamento e Despesa Paga não são habilitados. Catálogos e autocomplete continuam autorizados; operationId e writer canônico intocados.
- Qualidade: testes financeiros, autenticação, consulta histórica e 5xx com estado preservado devem continuar verdes. QA real Fastify/PostgreSQL efêmero, screenshots de topo/final dos formulários e validação de alcance do resumo/observações/rodapé. A versão só poderá ser indicada como tecnicamente validada após CI e QA no mesmo SHA que inclui este checkpoint. Não declarar homologação visual sem aprovação explícita do usuário.
- Preview: examinar o mecanismo isolado existente antes de criar recursos. Nunca publicar no ambiente produtivo nem usar dados financeiros reais. Se preview isolado requer infraestrutura/custo, informar bloqueio e não executar sem autorização.


---

## PR #648 — Comparação de fidelidade com as referências originais (24/10/2026)

- **Pedido ativo:** refinamento de fidelidade das imagens originais A (seletor, arquivo oficial de 03/10 às 17:31:26) e B (Novo lançamento financeiro neon.png); capturas da PR #648 são evidência de implementação anterior, não são a referência visual soberana.
- **Codespace:** não montado/disponível nesta sessão. Branch e HEAD foram verificados via integração GitHub; mudanças com SHA prévio verificado para não sobrepor alterações posteriores. O working tree de um Codespace externo não foi acessado, nem se afirma que foi inspecionado.
- **Mudança localizada:** seleção de tipo com largura de modal mais próxima do screenshot oficial, opções mais altas, proporções de hero/cards ajustadas, ícones existentes e faixa informativa inferior. Transferência e Benefício permanecem desabilitados com motivo exposto. Formulário mantém três áreas e agora hierarquia visual aprimorada por labels/ícones já disponíveis, proporção mais ampla à esquerda, valor/resumo com maior legibilidade, bordas e contraste oficiais.
- **Limite de fidelidade:** não existe no conjunto autorizado do repositório um asset oficial da montanha presente nas imagens do mockup. NÃO reconstruir ou reutilizar arte antiga não aprovada. O screenshot não foi posto como fundo, e dados falsos de saldo/cartão do print não foram integrados. Faixa informativa do seletor reproduz posição e função visual, mas textos descrevem propriedades efetivas do fluxo seguro.
- **Preservação financeira:** somente receita e despesa pendente continuam graváveis pelo writer central. Despesa paga, cartão/parcelamento, transferência e benefício seguem indisponíveis; nenhuma UI calcula saldo/fatura. Contas, categorias e meios reais vêm da API, autocomplete não copia valor/data, erros 503 mantêm dados, operaçãoId/idempotência e isolamento preservados. Data do resumo continua pt-BR sem mudança no payload.
- **Responsividade:** modalidade única de rolagem interna do diálogo; cabeçalho/rodapé sticky opacos, alvos e espaçamento. QA requerido em 1366x768, 1024x600, 910x400 e 390x844 com começo/fim, último card, observações, resumo, foco por teclado, exportação e DataGrid existente visível.
- **Governança:** PR #648 permanece Draft, sem merge, deploy, alteração na main, Android ou dados financeiros reais. Nenhum preview hospedado confirmado; não criar infraestrutura de custo sem autorização. Não declarar homologação visual antes da aprovação expressa do usuário.
- **Gates:** CI e QA real Fastify/PostgreSQL descartável DEVEM ser refeitos após este checkpoint no mesmo SHA final. Android RC1 e Financial E2E dedicados skipped quando não executados. Capturas no artifact do QA comprovam implementação, não aceitação visual.

- **Ajuste de conformidade de assets:** barras ilustrativas introduzidas em implementação anterior foram excluídas do seletor. A montanha oficial continua ausente como asset independente, sem substituição visual improvisada. Capturas adicionais em 1672×941 devem ser confrontadas diretamente com as duas imagens oficiais em tamanho nativo.


---

## PR #648 — Reconstrução visual direta em React/CSS (24/10/2026)

- **Autorização:** o usuário optou pela reconstrução direta, sem API de conversão Screenshot to Code. Escopo exclusivo: seletor de tipos e formulário da PR #648. Prints oficiais soberanos: "Imagem do ChatGPT 3 de out. de 2026, 17_31_26.png" (seletor) e "Novo lançamento financeiro neon.png" (formulário); capturas antigas da PR são evidências de regressão, não referências.
- **Base preservada:** SHA 96f4acd0daec61aa8384f877fdc1e8c72d8e32e4 confirmado antes da edição. O terminal do Codespace externo não está conectado; o working tree remoto não foi examinado. Operações feitas pela integração GitHub sob lease de SHA. Criar/alterar somente arquivos expressamente citados; não sobrepor trabalho externo.
- **Reforma, não remendo:** arquivo new-launch.css reconstruído integralmente a partir da composição oficial (sem pilhas de sobrescritas). Modificações de markup limitadas à apresentação em NewLaunchForm.tsx. Seletor com hierarquia, proporção dos cards, cores e faixa inferior; formulário com posicionamento e três regiões, resumo maior, tipografia, rótulos e footer. CSS sem novas dependências e com breakpoints estruturais em 640 e 1024. Imagem de montanhas e arte ilustrativa de cartões continuam ausentes como assets independentes autorizados, não foram redesenhadas nem simuladas por screenshots.
- **Sem alteração de negócio:** writer financeClient.createEvent, operaçãoId/idempotência, isolamento/workspace, sugestões/autocomplete, carregamento de catálogos, tratamento de duplicidades e erros 503, formatação monetária e data pt-BR permanecem intactos. Receita conforme servidor, despesa apenas pendente; despesa paga, parcelamento/cartões, transferência e benefício seguem bloqueados.
- **Evidência técnica exigida:** após o commit de checkpoint, repetir CI e QA integrado Fastify + PostgreSQL descartável com usuários fictícios no mesmo HEAD; registrar screenshots em 1672x941, 1366x768, 1024x600, 910x400 e 390x844. Foco Tab/Shift+Tab e Escape, área única de rolagem, rodapé e observações alcançáveis. CI não equivale à homologação visual.
- **Limitações:** PR permanece Draft, sem merge, deploy de produção, alteração em main/Android, dados reais ou infraestrutura paga. Preview hospedado isolado não confirmado. Layout visual só estará aprovado mediante manifestação expressa do usuário.

- **Encaixe desktop:** em largura >= 1024, formulário é alinhado à direita/parte inferior da área principal com largura limitada a 86,1vw e 1440px; seletor continua central, conforme os dois prints. Para telas menores o overlay usa layout mobile/tablet. Nenhuma rolagem horizontal intencional.

- **Refino pós-captura (antes de novos gates):** em 1672×941, a comparação revelou que o seletor precisava de mais altura útil por card e que a linha externa de tipo do formulário atrasava o início das colunas cerca de 40px. Os cards cresceram sem altura rígida de página, o seletor de tipo migrou para a linha inferior do cabeçalho oficial, o formulário passou a preencher verticalmente o modal e o rótulo visível do campo monetário foi encurtado para “Valor *”, preservando aria-label “Valor em reais *”. CI e QA anteriores de 3121161 deixaram de validar o HEAD e deverão ser refeitos após este checkpoint.


---

## PR #648 — Funcionalidade protegida e SVGs oficiais (24/10/2026)

- **Pedido atual:** priorizar a funcionalidade do Novo Lançamento, adicionando identidade visual com SVGs personalizados. Ajustes visuais restantes poderão vir após validação visual expressa. Não avançar para outras telas.
- **PR e base:** branch `feature/meg-web-new-launch-visual-official`, HEAD inicial `61870f3d03a45557ee3674ac1894f5f852a83806`, PR Draft, base da PR #647. Working tree de Codespace externo não disponível, commits protegidos por lease no GitHub.
- **Escopo dos arquivos:** `LaunchVisualIcon.tsx` novo, `NewLaunchForm.tsx` com substituição de ícones e contadores de caracteres não financeiros, `new-launch.css` com estilo localizado e este checkpoint.
- **Regras intocáveis:** receita somente conforme writer e status da API; despesa apenas pendente (planned, sem débito). Nenhuma mudança em `financeClient.createEvent`, `basicLaunchInput`, `event-mutation`, autorização, idempotência, dados/contas por workspace, autocomplete, retry 503, DataGrid ou camada financeira. Transferência, benefício, cartão, parcelas e pagamento de despesas permanecem indisponíveis. Resumo é prévia, não autoriza mutação local.
- **SVGs:** ícones vetoriais autorais exclusivos do modal, sem dependência de pacote ou imagem externa; diferenciam despesa, receita, transferência, benefício, categorias, contas, pagamento, data, valor, situação, parcelamento, observações e resumo, sem recriar o logotipo ou a montanha dos prints oficiais.
- **Qualidade exigida:** CI validate e QA Playwright + Fastify + PostgreSQL 16 descartável em usuários fictícios no mesmo SHA final. Confirmar 1672x941, 1366x768, 1024x600, 910x400 e 390x844, rolagem, Esc/Tab, criação de receita/despesa pendente, histórico e idempotência. `android-rc1` / `financial-e2e` dedicados skipped não contam como aprovados.
- **Disponibilização:** nenhum serviço Render isolado da PR #648 encontrado no workspace em 24/10; os existentes são de `main` ou etapas antigas e não serão modificados. Sem novo serviço pago/preview público, merge, produção ou dados reais sem autorização. Entregar artifact visual de QA e link sem cache somente se preview isolado real for publicado.
- **Aprovação:** build e QA comprovam apenas execução técnica, não homologação visual. Android permanece congelado e main não muda.


---

## PR #648 — Pacote de homologação funcional isolada no Codespaces (24/10/2026)

- **Decisão atual do usuário:** priorizar a versão funcional do Novo Lançamento e postergar o refinamento visual. Não equivale a aprovação da aparência nem autoriza merge ou produção.
- **Implementação funcional anteriormente caracterizada:** receitas e despesas pendentes com autenticação, writer canônico, idempotência, isolamento por workspace, autocomplete e histórico/DataGrid; SHA `b36f21c2980ec6f4188428760bd120edd6b58979`, QA integrado 5/5 e CI verdes. Despesa paga, transferência, benefício, cartão e parcelamento permanecem indisponíveis.
- **Bootstrap isolado:** `apps/web/vite.codespace-preview.config.ts` substitui o proxy de API de produção por `http://127.0.0.1:3334` e exige `VITE_API_URL=/api`; `scripts/meg-pr648-codespace-preview.mjs` prepara PostgreSQL local Docker em 127.0.0.1:5548, Fastify local, Vite 5174, usuário e catálogos estritamente fictícios via APIs canônicas, sem alterar regras financeiras. Bloqueia branch/repositório inesperados e arquivos .env externos potencialmente reais.
- **Infraestrutura:** usa exclusivamente recursos do Codespace existente, com porta 5174 configurada como privada pelo usuário. Não utiliza Render, API remota, dados reais, produção ou Android; não depende de Gemini nem consome créditos Gemini. Pode consumir cota de processamento do Codespaces.
- **Estado da publicação:** script adicionado à PR Draft, mas **não executado no Codespace do usuário nesta sessão**; logo **nenhum preview publicado/verificado** e nenhum link sem cache fornecido como ativo. O usuário deverá executar no clone isolado, conferir a porta privada e enviar a URL real gerada pelo script para verificação visual.
- **Qualidade:** os novos arquivos de infraestrutura precisam de CI no SHA final e execução end-to-end no Codespace. Gates prévios não validam automaticamente os novos arquivos; não declarar homologação técnica/visual completa até testar o bootstrap. Sem merge.


---

## PR #648 — Correção de bootstrap comercial do preview Codespaces (24/10/2026)

- **Falha efetivamente observada no Codespace:** PostgreSQL 16 local iniciado, `npm ci`, `prisma generate` e `prisma db push` concluídos, Fastify iniciado, mas a criação de conta fictícia falhou com HTTP 402 `LICENSE_NOT_CONFIGURED`.
- **Causa auditada:** na primeira execução, `ensureCommercialFoundation()` é iniciada assincronamente ao subir a API, antes de existir o usuário administrativo. `registerUser()` então chama `ensurePrimaryWorkspace()` (cria o workspace, mas não sua licença). A checagem comercial `assertWorkspaceWriteAccess()` bloqueia corretamente a criação de catálogos quando a assinatura do workspace está ausente.
- **Correção restrita à homologação:** criado `scripts/meg-pr648-preview-commercial.ts`, que invoca `ensureCommercialFoundation()` sem duplicar regras de negócios, protegido por igualdade exata do `DATABASE_URL` descartável, `NODE_ENV=development`, `ADMIN_EMAIL=preview-admin@meg.invalid` e marcador `MEG_PR648_PREVIEW_LOCAL_DB=1`. O inicializador `scripts/meg-pr648-codespace-preview.mjs` chama esta rotina após autenticação e antes dos catálogos. Não há bypass de licença, alteração da API, nem dado real.
- **Execução requerida:** no clone `/workspaces/meg-pr648-homologacao`, executar `git pull --ff-only` e `node scripts/meg-pr648-codespace-preview.mjs`. Manter a porta 5174 privada. A execução corrigida não foi testada ainda no Codespace; só o usuário pode confirmar o preview real.
- **Governança:** branch da PR #648 em Draft, sem merge/produção/Android; CI no SHA final é gate técnico e não valida visual. Credenciais fictícias em `~/.local/state/meg-pr648-preview/credenciais.txt`; não compartilhar senha em chats.


---

## PR #648 — Proteção de inicialização contra portas ocupadas (24/10/2026)

- **Erro real na segunda execução do Codespace:** embora PostgreSQL e licença comercial canônica funcionassem, nova API Fastify falhou com \`EADDRINUSE 127.0.0.1:3334\`; um processo remanescente atendia \`/ready\` e o script exibiu indevidamente “MEG HOMOLOGAÇÃO DISPONÍVEL” enquanto a API nova estava morta.
- **Correção no inicializador:** verificar previamente se as portas 3334 e 5174 estão livres, abortando com identificação de porta e instrução segura via \`lsof\` caso contrário. Subprocessos npm passam a rodar em grupo isolado, com encerramento do grupo no \`Ctrl+C\` e detecção da morte de API/Vite antes de informar sucesso.
- **Retomada obrigatória:** parar o inicializador, identificar o processo que ocupa a porta 3334 (\`lsof -nP -iTCP:3334 -sTCP:LISTEN\`), encerrar somente se confirmado como API órfã desta homologação, verificar também 5174, \`git pull --ff-only\` no clone isolado e reiniciar. NÃO executar comandos amplos \`pkill node\`, \`killall\`, apagar contêiner nem interromper infraestrutura desconhecida.
- **Validação:** as verificações são restritas ao script de homologação; não alterar writers financeiros, licenças, API de produção, Android, main ou serviços Render. Nenhuma visualização foi homologada explicitamente; CI no SHA final e execução real da versão corrigida continuam pendentes.


---

## PR #648 — Ativação controlada da fonte financeira no preview (24/10/2026)

- **Evidência de execução no Codespace:** clone isolado no HEAD `5d8f16bed`, PostgreSQL local 5548 ativo, Fastify 3334 e Vite 5174 iniciados, licença canônica configurada e link sem cache gerado, mas API registrou `NORMALIZATION_PRIMARY_REQUIRED` no startup de `reconcilePrimaryAppStateFromNormalized`. Portanto o anúncio “MEG HOMOLOGAÇÃO DISPONÍVEL” NÃO era prova de `financialReady` nem liberava gravação financeira.
- **Causa auditada:** o bootstrap primeiro cria usuário e workspace vazio; no startup `server.ts` chama `reconcilePrimaryAppStateFromNormalized` antes de `activateNormalizationPrimary`. Sem marcador `normalized-primary`, a conciliação falha e a rotina de ativação seguinte não executa.
- **Correção somente em `scripts/meg-pr648-codespace-preview.mjs`:** após autenticação e fundação comercial canônica, GET protegido `/app-state/normalization-preview`; somente se não estiver em rollback, com `source.validCount=0`, `source.invalidCount=0`, `normalized.count=0` e `reconciled=true`, executar o endpoint ADMIN `POST /app-state/normalization-cutover` com `action=activate`, `expectedRevision` e confirmação obrigatória `ATIVAR_BASE_NORMALIZADA`. Se já primária, exigir consistência. Bloquear tudo se houver dados divergentes/inesperados.
- **Gate final obrigatório:** exigir `GET /health` retornando `financialReady=true` após cutover e novamente após subir o Vite, antes de fornecer URL. Não alterar endpoints financeiros, saldo, status, writers, licenças, regras de negócio, dados reais, Android ou produção.
- **Validação pendente:** execução corrigida no Codespace e testes de integração contra banco descartável; o novo SHA tem de passar CI e QA. Nenhuma homologação visual presumida.


## PR #648 - acesso pelo Codespaces e gate de login (24/10/2026)

O usuario relatou que o navegador nao entra no MEG, embora o teste via localhost:5174/api/auth/login tenha retornado HTTP 200 AUTORIZADO. Confirmado por leitura do codigo que o Vite em modo desenvolvimento servia o index antigo na rota raiz, enquanto a nova Web reside em /web-evolution.html. A config exclusiva vite.codespace-preview.config.ts foi ajustada para redirecionar GET da rota raiz para a nova Web. O inicializador agora exige que a rota raiz redirecione corretamente, que a pagina inclua a raiz da Web Evolution, que /api/health via proxy reporte financialReady true e que /api/auth/me via proxy reconheca a sessao ficticia. A origem exata da falha no navegador ainda nao foi comprovada. Nao validar a tela ou lancamentos sem observacao no navegador. Somente a branch Draft da PR 648 recebeu as mudancas; producao e Android permanecem intocados.


## PR #648 - bloqueio de login na homologação Codespaces (24/10/2026)

- **Evidência visual recebida:** a rota pública `/web-evolution.html` abre corretamente a tela de Login, mas após digitar as credenciais fictícias exibe `Não foi possível entrar agora. Verifique sua conexão e tente novamente.`. No log correspondente da API local, `POST /auth/login` retornou HTTP 500 com `Origin not allowed by CORS`. A origem exata recebida pela API não foi registrada, portanto a causa fica caracterizada como falha no percurso browser/proxy/CORS, sujeita à prova do novo gate.
- **Correção técnica circunscrita ao Codespaces:** em `apps/web/vite.codespace-preview.config.ts`, o proxy de homologação remove `Origin` somente quando o cabeçalho equivale exatamente ao `Host` HTTPS `*-5174.app.github.dev` da mesma requisição. Outros hosts/origens não recebem essa exceção e continuam sujeitos à restrição CORS da API. A API principal não foi alterada.
- **Gate acrescentado:** `scripts/meg-pr648-codespace-preview.mjs` agora faz `POST /api/auth/login` com `Origin` e `Host` equivalentes aos do navegador público e exige token/usuário fictício; sem isso, bloqueia o anúncio de preview disponível. O gate anterior `GET /auth/me` com token permanece.
- **Commits:** `bcf01e037c1fd0a1c726fc01551ad64628538c0b` (proxy) e `3f9a95704e8aa1a9358adb170b05845f67c3278d` (gate real de login).
- **Próxima ação:** interromper o bootstrap atual com Ctrl+C, em `/workspaces/meg-pr648-homologacao` executar `git pull --ff-only` e `node scripts/meg-pr648-codespace-preview.mjs`, manter porta 5174 privada e exigir `GATE LOGIN: ... POST /api/auth/login ... OK` antes de experimentar o link novo sem cache. **Ainda não executado e nem comprovado no Codespace do usuário**. A PR #648 permanece Draft, sem merge e sem aprovação visual/funcional; Android, main e produção intocados.


## PR #648 - login pelo navegador público ainda falha (24/10/2026)

- **Nova evidência:** captura do Chrome DevTools mostra repetidos `POST /api/auth/login` retornando HTTP 500 via domínio público `*-5174.app.github.dev`. O usuário executou dois POSTs pela porta local 5174 com as mesmas credenciais fictícias e `Origin` de Codespaces: ambos HTTP 200 e `Autenticado: true`. Logo, o gate local anterior não representa integralmente o percurso público de requisição. A resposta HTTP 500 precisa ser correlacionada aos logs do servidor para confirmar se ainda provém de CORS.
- **Correção restrita:** `apps/web/vite.codespace-preview.config.ts` deixou de exigir igualdade com `request.headers.host` (passível de reescrita pela camada de encaminhamento do Codespaces). A remoção de `Origin` no salto Vite -> API ocorre somente com `Origin` exatamente igual ao domínio HTTPS calculado a partir de `CODESPACE_NAME` e `Sec-Fetch-Site: same-origin`. Demais origens permanecem sujeitas à política CORS existente. Log de diagnóstico para POST /auth/login HTTP >= 500 informa apenas status e flags booleanas, sem senha, token ou dados privados.
- **Gate de inicialização:** agora simula `Origin` e `Sec-Fetch-Site` sem falsificar `Host`; a mensagem indica explicitamente que é teste LOCAL e não substitui validação pelo navegador público.
- **Commits desta rodada:** `2344b5fe34bd459097037274748d417100523c9c`, `56206180c3bb4951f792e6953e1726ec7486a906` e `9ed91a433bdf11a635f650ed8b02a5b8dc9e5656`.
- **Execução pendente:** parar o bootstrap antigo com Ctrl+C; fazer `git pull --ff-only` e iniciar `node scripts/meg-pr648-codespace-preview.mjs` no clone isolado; conferir novo preview sem cache e login real no navegador. Se persistir 500, coletar log sanitizado `[MEG preview] Login rejeitado pela API local` e erro correspondente da API. Ainda não testado no Codespace do usuário.
- **Governança:** PR #648 continua Draft, sem merge ou aprovação visual/funcional; sem alteração da API principal, main, Android, regras financeiras, produção ou dados reais.


## PR #648 - correção objetiva do ambiente de login Codespaces (24/10/2026)

- **Raiz de código confirmada:** o inicializador filtrava as variáveis do processo filho `webEnv` e não enviava `CODESPACE_NAME` ao Vite. O proxy `vite.codespace-preview.config.ts` usa `process.env.CODESPACE_NAME` para montar `previewOrigin`. Assim, na configuração anterior, `previewOrigin` ficava `null` e `isFirstPartyCodespaces` nunca autorizava retirar o cabeçalho `Origin` no salto Vite -> API. O erro HTTP 500 do navegador e a mensagem prévia `Origin not allowed by CORS` continuam evidência da falha observada, mas a resolução final ainda depende de teste público.
- **Correção restrita à homologação:** `scripts/meg-pr648-codespace-preview.mjs` agora repassa `CODESPACE_NAME` explicitamente no `webEnv`, preservando o filtro de outras variáveis e o destino exclusivo local `VITE_API_URL=/api`. `apps/web/vite.codespace-preview.config.ts` agora falha na inicialização quando `CODESPACE_NAME` é ausente/inválido; o proxy retira `Origin` somente quando ele corresponde **exatamente** ao domínio HTTPS da porta 5174 deste Codespace. O `Host` e o `Sec-Fetch-Site` não são exigidos para a comparação por poderem ser alterados/suprimidos pelo encaminhamento. Demais origens continuam sob CORS restritivo da API.
- **Commits:** `2101de9ce45a5e7bf99be764993c48bc726e8824` (repassar variável ao Vite); `da528e28911b1763c828e8685d356262e7eb8abc` (validar origem exata sem depender de metadados do túnel).
- **Gates e pendências:** PR #648 em Draft; nenhuma alteração em `main`, Android, rotas da API de produção ou writers financeiros. A nova configuração ainda **não foi executada nem validada no Codespaces do usuário**. Próxima etapa: Ctrl+C no inicializador anterior, `git pull --ff-only` no clone `/workspaces/meg-pr648-homologacao` e `node scripts/meg-pr648-codespace-preview.mjs`; verificar novo endereço sem cache e POST real de login no Chrome, depois consultar Lançamentos. Nenhuma tela aprovada nem merge autorizado antes da confirmação funcional/visual e dos gates técnicos.


## PR #648 - CORS do navegador: evidência definitiva e teste de regressão (24/10/2026)

- **Evidência reproduzida na execução do usuário:** com HEAD `5641d932`, banco de homologação e API iniciaram, `financialReady=true` e o teste local de login passou. Porém, seis requisições reais `POST /auth/login` vindas do Chrome via túnel do Codespaces retornaram HTTP 500 `Origin not allowed by CORS`. O diagnóstico do proxy registrou **`originAutorizada: false` e `mesmaOrigemBrowser: true`** em todas. Isso demonstra que comparar `Origin` com o endereço derivado de `CODESPACE_NAME` não cobre o encaminhamento público e que o gate local anterior era insuficiente.
- **Correção isolada no Vite da PR #648:** em `apps/web/vite.codespace-preview.config.ts`, requisições com `Origin` e `Sec-Fetch-Site: same-origin`, ou com a origem exata autorizada deste Codespace, deixam de encaminhar `Origin` para a API privada 127.0.0.1:3334. A requisição continua passando pela autenticação e regras de acesso existentes. Para requisições `cross-site` de origens diferentes, `Origin` continua encaminhada e a política CORS restritiva da API permanece responsável pelo bloqueio. O tratamento existe apenas neste proxy de homologação, nunca na API de produção.
- **Teste de regressão novo:** `scripts/meg-pr648-codespace-preview.mjs` agora exige, além dos gates anteriores, que `POST /api/auth/login` passe mesmo se o `Origin` for encaminhado de forma diferente mas `Sec-Fetch-Site` indicar `same-origin`. Também exige que um preflight `OPTIONS` com origem externa e `Sec-Fetch-Site: cross-site` NÃO seja aceito. São testes locais e não equivalem à verificação do Chrome real.
- **Commits:** `82941ecd660ab1ea0daa793f7e21bf24c2ccb5a9` (proxy), `ad54f35311645e013a9476229de1e1efd9df48b8` (testes). Não existem resultados de CI/QA no Codespaces para esses commits nesta sessão.
- **Retomada:** no terminal atual de bootstrap Ctrl+C, depois `cd /workspaces/meg-pr648-homologacao && git pull --ff-only && node scripts/meg-pr648-codespace-preview.mjs`. Exigir o novo `GATE LOGIN LOCAL: sessao, POST com Origin encaminhada e bloqueio cross-site OK.`, abrir o URL real sem cache impresso, e validar o POST de login no Chrome e acesso a Lançamentos. Credenciais fictícias existentes não devem ser trocadas/compartilhadas.
- **Governança:** sem merge ou alterações na `main`, Android, writers/regras financeiros, produção ou dados reais. PR continua Draft, nenhuma tela validada visualmente e login ainda pendente de confirmação no navegador.


## PR #648 - correção do gate CORS com preflight HTTP 204 (24/10/2026)

- **Falha observada pelo usuário:** HEAD `f0b38010` atualizado no Codespaces; PostgreSQL sincronizado, licença canônica e `GATE FINANCEIRO: API financialReady=true` concluídos, Vite 5174 iniciado. O script abortou em `GATE CORS: preflight de origem externa aceito; preview bloqueado.`; os servidores foram encerrados automaticamente e `esbuild: The service was stopped` apareceu como efeito do encerramento, não como diagnóstico independente do problema financeiro.
- **Causa do gate:** o script classificava `response.ok` ao preflight `OPTIONS` como autorização cross-origin. O servidor Vite pode responder 204 mesmo sem `Access-Control-Allow-Origin` liberando aquela origem. O teste confundia status HTTP com permissão de acesso CORS. A resposta efetiva e seus cabeçalhos ainda não foram extraídos do Codespaces.
- **Ajustes somente de homologação:** em `apps/web/vite.codespace-preview.config.ts`, configurar `server.cors` e `preview.cors` para aceitar apenas a origem HTTPS exata calculada para a porta 5174 do Codespace. Em `scripts/meg-pr648-codespace-preview.mjs`, o gate preflight agora examina se o servidor devolveu `Access-Control-Allow-Origin: *` ou o valor exato da origem externa, independentemente de 200/204. Também envia GET `/api/health` com `Origin` externa e `Sec-Fetch-Site: cross-site` exigindo que a API rejeite efetivamente a solicitação sem CORS liberado.
- **Commits:** `3b5806f01f59119e547031af950557376b1af4a2`, `4b8b90ceb1837a829ee26e642cd3447ed7a57267` e `f12367aa20d60ad20448140354babfbc3161a40f`.
- **Estado:** o gate novo ainda precisa ser executado no Codespaces do usuário; sem afirmação de que login no navegador funcionou. PR #648 segue Draft sem merge, deploy de produção, mudanças de Android, API financeira ou dados reais. Ctrl+C se a execução anterior ainda existir, `git pull --ff-only` na pasta `/workspaces/meg-pr648-homologacao`, `node scripts/meg-pr648-codespace-preview.mjs`, depois validar navegador público com novo URL sem cache e credenciais fictícias existentes.


## PR #648 - acesso autenticado observado em gravação de tela (24/10/2026)

- **Evidência observada:** vídeo de aproximadamente 44 segundos fornecido pelo usuário, `Gravando 2026-10-24 234649.mp4`, mostra sessão autenticada do usuário fictício `Homologação MEG` no endereço Codespaces da PR #648. O navegador está na página de Lançamentos, sem a falha prévia HTTP 500 na captura. Não há exposição da senha nem de tokens.
- **Fluxo visual percorrido:** Lançamentos com DataGrid vazio (`0 de 0 registros`); botão `Novo lançamento` abre o seletor; `Despesa` abre formulário `Despesa pendente` com os catálogos de teste de categoria, conta e pagamento; `Alterar tipo` volta ao seletor; `Receita` abre formulário correspondente; fechamento/retorno e atualização da consulta voltam à listagem. Também foram observadas as opções de Transferência e Benefício indisponíveis, de acordo com o escopo explicitamente bloqueado.
- **Limite da prova:** o vídeo inicia na sessão autenticada e não necessariamente mostra a submissão do login; comprova acesso autenticado funcional no navegador, e não valida por si só a robustez de novos logins/relogins. Não houve preenchimento completo, submissão de `Salvar lançamento`, confirmação de persistência, baixa, alteração de saldo, idempotência, atualização de DataGrid após gravação nem validação responsiva completa. O layout não foi aprovado explicitamente pelo usuário.
- **Próximo gate funcional:** executar lançamento de receita fictícia via writer canônico; verificar retorno/status definido pelo servidor e persistência no DataGrid após nova consulta/recarregamento. Depois testar despesa pendente com mesmas garantias e ausência de débito imediato. Usar somente banco e catálogos fictícios do preview, nunca dados reais.
- **Governança:** nenhuma mudança funcional realizada nesta constatação. PR #648 segue Draft, sem merge, sem main/Android/produção. Testes/CI em HEAD final ainda devem ser confirmados separadamente de qualquer homologação visual.


## PR #648 - gravacao de Despesa pendente comprovada em video (24/10/2026)

- **Evidência:** segundo vídeo enviado pelo usuário `Gravando 2026-10-24 234649(1).mp4` (aprox. 52,5 segundos), com a sessão do usuário fictício Homologação MEG, demonstra preenchimento e clique em `Salvar lançamento` da tela Nova Despesa pendente em Codespaces PR #648.
- **Dados observados na gravação:** descrição `TESTE`; valor final `R$ 1,00` (durante a digitação houve prévia de R$ 100,00, substituída antes da submissão); data `24/10/2026`; categoria `Despesa de teste`; conta `Conta de teste`; pagamento `Boleto de teste`; observações `TESTE`. Situação declarada pelo formulário: `Pendente, sem baixa`. Tudo é fictício e restrito ao banco descartável de homologação.
- **Resultado observado:** botão exibiu `Salvando...`; depois a página Lançamentos exibiu `Gravação confirmada pelo servidor: TESTE. Atualizando histórico...` e DataGrid `1 de 1 registros`, com linha de 24/10/2026, `TESTE`, `Despesa`, `Planejado`, `Conta de teste`, `Despesa de teste`. Há comprovação visual de confirmação da API e leitura da lista após a gravação, sem evidência de erro nesse ciclo.
- **Nomenclatura a revisar:** `apps/web/src/meg-web-evolution/launches/new-launch.ts` envia `status: 'planned'` como status solicitado; `LaunchesScreen.tsx` exibe `planned` como `Planejado`; `NewLaunchForm.tsx` exibe `Pendente` e `Pendente, sem baixa`. Não alterar status, mapeamento ou regras financeiras sem auditar o contrato canônico e obter decisão funcional; a diferença visual não prova inconsistência contábil.
- **Limites da prova:** vídeo não demonstra F5/relogin para durabilidade após novo carregamento, consulta de valor da linha na coluna horizontal fora do enquadramento, confirmação independente de saldos/baixas, duplicidade/idempotência, teste de receita, pagamento, transferências ou benefícios, nem aprovação visual explícita ou conjunto completo de gates de CI. Sem afirmar esses itens como validados.
- **Governança:** atualização apenas documental deste checkpoint, sem modificação de regras, interface, API, main, Android, produção ou dados reais. PR #648 permanece em Draft e nenhum merge autorizado. Próximos testes: persistência após F5; receita fictícia pelo fluxo canônico; ausência de baixa e impacto no saldo; diferença de texto Pendente vs Planejado como item de alinhamento funcional.


## PR #648 - captura de dois lancamentos e status de receita futura (24/10/2026)

- **Evidência visual, sem aprovação de layout:** print `image(20261025-025808).png` enviado pelo usuário (Chrome, 24/10/2026 aproximadamente 23h57, Codespaces na porta 5174, versão de preview `341a0b628`). Sessão fictícia Homologação MEG autenticada; Lançamentos mostra **`2 de 2 registros`** no DataGrid: (1) `TESTE` / Receita / `05/12/2026` / `Pago` / Conta de teste / Receita de teste; (2) `TESTE` / Despesa / `24/10/2026` / `Planejado` / Conta de teste / Despesa de teste. Exibição de dois registros observada. A prova não inclui os valores nas colunas à direita, leitura direta do banco, F5 comprovado nem alteração de saldo.
- **Persistência ainda não caracterizada após F5:** a captura conserva a mensagem transitória `Gravação confirmada pelo servidor: TESTE. Atualizando histórico...`, portanto **não usar esta imagem isolada como prova de recarregamento integral**. O histórico contém dois registros após gravações no navegador, mas o reload de toda a aplicação e um novo login ainda exigem observação específica.
- **Auditoria de status:** a nova Web `new-launch.ts` solicita `status: planned` tanto para receita quanto para despesa. A rota `POST /finance/events` usa `createFinancialEventProtected`, que invoca a política central `resolveCanonicalFinancialStatus` em `apps/api/src/modules/finance/financial-policy.ts`. Atualmente essa função retorna **`paid` incondicionalmente para `income` ou `redemption`**, sem conferir `date`; caso a receita tenha conta monetária, o writer em `event-mutation.ts` cria também `ledgerEntry` pela natureza de status publicado. A UI do DataGrid apresenta exatamente esse status canônico como `Pago`. A despesa não Fixo e sem crédito conserva `planned`, traduzido como `Planejado`.
- **Risco/decisão funcional:** a receita de **05/12/2026** foi gravada como `Pago`, embora a data seja futura em **24/10/2026**. É comportamento do contrato central **existente**, não erro de renderização. O PDF de regras consolidadas nos itens aplicáveis 7-16, 18-19, 21-22 não estabelece uma exceção explícita para receita com data futura. Não alterar por conta própria a política, o writer, o histórico ou os saldos; conferir regras de recebimento/antecipação e impacto no saldo disponível versus fluxo projetado antes de uma eventual correção.
- **Pendências reais:** F5/relogin com histórico persistindo, consulta canônica de saldos e ledger de ambas as operações, casos de data futura, duplicidade/idempotência, CI/testes completos e aprovação visual expressa. Nenhuma tela validada visualmente por esta captura. Nenhuma alteração em main, Android, produção, banco real ou regra financeira nesta atualização documental; PR #648 permanece em Draft.


## PR #648 - persistência após atualização do navegador observada (25/10/2026)

- **Evidência:** o usuário foi orientado a pressionar F5 depois de salvar uma Despesa TESTE e uma Receita TESTE no Codespaces da PR #648. Na captura posterior `image(20261025-030210).png`, relógio Windows indicando 00:01 de 25/10/2026, a tela de Lançamentos está autenticada como Homologação MEG e mostra `2 de 2 registros`. A mensagem transitória `Gravação confirmada pelo servidor` do print anterior desapareceu. A sequência é consistente com recarregamento e leitura persistida da API; o gesto F5 propriamente dito não está visível na imagem estática.
- **Registros ainda visíveis:** `TESTE`, **Receita**, `05/12/2026`, **Pago**, Conta de teste, Receita de teste; `TESTE`, **Despesa**, `24/10/2026`, **Planejado**, Conta de teste, Despesa de teste. Dados fictícios, no banco de homologação.
- **Validação alcançada:** retenção dos dois lançamentos no histórico após a atualização solicitada e nova leitura da interface, sem prova independente de inspeção física dos registros SQL, valores monetários nas colunas horizontais ocultas, saldo ou impactos contábeis.
- **Pendências financeiras:** a receita de data futura `05/12/2026` aparece como `Pago` por decisão da política `resolveCanonicalFinancialStatus`, que resolve `income` como `paid` independentemente da data; isso pode gerar lançamento em ledger e requer caracterização específica da dimensão temporal dos saldos, sem mudança automática de regra central. A despesa pedida como pendente é `planned` e exibida como Planejado. Não declarar valores de saldo nem situação contábil verificados por este print.
- **Outras pendências:** testes independentes de saldo da conta após as duas gravações, ausência de baixa imediata da despesa, status de receita futura, idempotência, controles de autorização, automação/CI e aprovação visual explícita dos prints oficiais. Esta imagem não é uma aprovação do layout.
- **Governança:** checkpoint documental somente. Sem merge, main, Android, produção, rotas financeiras ou alterações de regra. PR #648 ainda Draft até gates e validação visual expressa.


## PR #648 - primeira rodada de auditoria financeira e refinamento visual oficial (25/10/2026)

- **Escopo autorizado:** validação minuciosa e alinhamento do visual de Lançamentos/Novo Lançamento solicitado pelo usuário. Branch isolada `feature/meg-web-new-launch-visual-official`, PR #648 Draft. Sem tocar na main, Android, produção ou base real.
- **Fontes visuais:** imagens oficiais do Projeto, especialmente `Imagem do ChatGPT 3 de out. de 2026, 16_54_48-4.png` (Lançamentos), `Novo lançamento financeiro neon.png` (formulário), e os prints da captura de homologação mais recentes. A referência é normativa, mas indicadores/gráficos não podem ser preenchidos com valores fictícios ou calculados na tela.
- **Arquivos de apresentação alterados:** `apps/web/src/meg-web-evolution/launches/LaunchesScreen.tsx` e `launches.css`: cabeçalho em banner com hierarquia próxima à referência, ícones SVG para criar/atualizar, distribuição e alinhamentos para breakpoints 640/1024, texto funcional de informação do DataGrid mantido. `NewLaunchForm.tsx`, `new-launch.css`, `LaunchVisualIcon.tsx`: substituir caracteres tipográficos de fechar/salvar/bloqueio/tipo por SVG, alinhamento vertical dos rótulos e botões, leitura esquerda dos dados do resumo, área de toque preservada, quebra mobile e remoção de altura mínima desktop fixa. Ícones adicionados são exclusivamente de interface, sem inventar categoria financeira.
- **Teste de caracterização adicionado:** `apps/api/src/modules/finance/financial-policy.test.ts` cobre que `planned` de despesa comum não integra o saldo realizado e que receita solicitada como `planned` é resolvida como realizada pela política central. **Nenhum código de regra financeira foi alterado.**
- **Contratos auditados:** `docs/MEG-WEB-FINANCIAL-AUTHORITY.md` confirma `financial-policy.ts` como autoridade de status, `monetary-protection.ts` como autoridade de saldo/data, `event-mutation.ts` como writer transacional/idempotente e `read-model.ts` como fonte de resumo/fluxo da Web. Decisão vigente em 06/10/2026 determina **Receita e Fixo realizados**, cartão de crédito pendente, benefício writer próprio e transferência de duas pernas. O PDF de regras consolidadas preserva autocomplete sem copiar valor/data, pendente sujeito a baixa posterior, alinhamento de ícones SVG, crédito/fatura e benefícios separados.
- **Receita datada no futuro:** `resolveCanonicalFinancialStatus` marca receitas `paid` sem considerar a data; `event-mutation.ts` grava lançamento de ledger com data efetiva do evento. `monetaryAccountBalanceAt` consulta ledger/eventos até a data de corte, não incluindo eventos com data posterior. `getCanonicalFinancialSummary` inclui receitas `paid` em `realizedIncome` da própria competência, mesmo se ela estiver no futuro. Essa semântica temporal precisa de teste com saldos reais de banco fictício e decisão explícita se houver divergência; **não corrigir a política só por interpretação de label**.
- **Gates observados anteriormente (versão do preview anterior):** login real, gravação dos dois eventos fictícios e presença no DataGrid após recarregamento, conforme vídeos/prints já registrados. **Essas evidências não validam o visual recém-alterado.** Os novos commits não foram carregados no Codespaces nem executados em build, CI ou testes nesta sessão. A etapa não está aprovada.
- **Pendências objetivas:** `npm --workspace apps/web run build`, `npm --workspace apps/api run build`, `npm --workspace apps/api run test:finance`, `npm --workspace apps/web exec -- tsx src/meg-web-evolution/launches/new-launch.test.ts` ou comando equivalente suportado pelo workspace, testes de visual desktop 1024+/tablet/mobile 640- com o novo preview sem cache; testes independentes de saldo em 24/10 vs 05/12, ledger por ID, idempotência e duplicidade; aprovação visual explícita do usuário. Nenhuma alegação de gate verde até evidência produzida.
- **Commits visuais/teste:** `97e3dd3595caf15f7bb91669851b0683ab549708`, `848347a78d62b5b54305bd888e337c40474cb268`, `84e87d9764ba1e31cf0a862ba8d026301d868756`, `90f15774efb0d3208019d1b815cdfe3ba8e7e984`, `3c8977e0ec122b5c1ad9453b3e41fe34a9cbe266`, `6ae4cce751157d6a5a441c6941f9cd293ac2863e`, `f5504ccfe2ac0db43cccc97702cf73c54ee09f2c`.
- **Divergências:** falta de cards/visuais e gráfico da referência de Lançamentos no preview atual; não foram inventados dados para implantá-los. A interface ainda distingue `Pendente` (formulário) de `Planejado` (DataGrid), ambas relativas ao status técnico `planned`. Não criar cálculos locais nem substituir status sem decisão funcional. Nenhuma tela está marcada como visualmente validada.


## PR #648 - capturas automatizadas para homologação visual (25/10/2026)

- **Novo recurso somente leitura:** `scripts/meg-pr648-capturar-telas.mjs` gera capturas da Web Evolution no preview local da porta 5174, com API 3334 e banco fictício da PR #648 já iniciados. Verifica a branch isolada e o repositório, autentica com o usuário de homologação a partir do arquivo de credenciais local, sem registrar senha/tokens no ZIP.
- **Escopo visual:** capturas de Lançamentos, seleção de Novo Lançamento e formulários de Despesa/Receita (início e rodapé) para 1440x900, 1024x768 e 390x844. Arquivo `diagnostico-visual.json` traz dimensões de página/scroll do diálogo e DataGrid, sem dados financeiros nem segredos. Pacote ZIP é gravado em `artifacts/meg-pr648-capturas/<sha>-<data>.zip` no Codespaces para download manual e envio no chat; os PNGs ficam na pasta correspondente.
- **Instalação técnica isolada:** se necessário, o script instala Playwright no cache pessoal `~/.cache/meg-pr648-visual-playwright` e usa navegador Chromium local ou baixado no cache; nenhuma alteração em package.json, lockfile, API, Android ou dependências do repositório.
- **Execução:** iniciar o preview atualizado em um terminal com `node scripts/meg-pr648-codespace-preview.mjs`, deixando-o aberto; em outro terminal, executar `node scripts/meg-pr648-capturar-telas.mjs` após `git pull --ff-only` no clone `/workspaces/meg-pr648-homologacao`. O script de captura não salva nem altera lançamentos, saldo, status ou mock financeiro. Não iniciar preview paralelo nas mesmas portas.
- **Status de validação:** utilitário criado e commitado, mas **não executado ainda no Codespaces do usuário**; não há capturas desta revisão nem inspeção visual da saída real. A PR #648 permanece Draft, sem merge, CI/build e aprovação visual ainda pendentes. O usuário deverá enviar o ZIP gerado para comparação objetiva com as imagens oficiais, sem que o resultado seja considerado aprovação automática.

- **Correção do seletor na captura:** como a barra superior e a tela de Lançamentos exibem ambas `Novo lançamento`, o capturador seleciona explicitamente `.meg-launches__actions .meg-launches__refresh--primary` para evitar ambiguidade no Playwright. Commit `a6870ab7b0dd050f682b030468601871f10a1c30`. Ainda requer execução no Codespaces para comprovar imagens, métricas e compactação.
