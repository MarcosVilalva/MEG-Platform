# MEG WEB — CONTINUIDADE OFICIAL

> **ATUALIZAÇÃO DE 01/11/2026 | Home 06: PRÉ-CONFIRMAÇÃO VISUAL, NÃO HOMOLOGAÇÃO.** O usuário declarou que o preview publicado melhorou bastante e autorizou guardar esta revisão como marco seguro de comparação. Versão de código `25b167f38c9a302cf83ba079227ab7887fb6870a`, confirmada `live` no Render em 01/11/2026; teste Home Panorama verde (run `41132153131`); Foundation geral permanece com falhas. Este aceite **não** autoriza merge, não homologa a Home e não dispensa validação visual futura. Melhorias devem partir da mesma base e ocorrer isoladamente. Evidência e escopo: `docs/MEG-HOME06-PRECONFIRMACAO-20261101.md`. O novo checkpoint compacto está em PR #652 (ainda Draft) e deve incorporar este registro antes de seu merge.\n\n
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


---

## 30/10/2026 — Recomeço oficial da Home 06, sem herança visual reprovada

**Decisão explícita atual, prevalente para a Home:** o print escolhido permanece como norte de identidade, cor e composição, **sem obrigação de reprodução pixel a pixel**. Estão autorizadas melhorias criativas comprováveis em hierarquia gerencial, gráfico, proporções, acessibilidade e responsividade. Essa flexibilização se aplica somente à Home 06; a prioridade das regras financeiras e a proteção das demais telas aprovadas permanecem.

**Base limpa autorizada:** branch `meg-web-evolution/06-home-reinicio-20261030`, criada a partir da cabeça da PR #649 (`7d80367c078ba5816014baedaa1ac0a94dc4e2d8`). Verificado que `apps/web/src/meg-web-evolution/` nessa origem inclui `auth/`, `components/`, `datagrid/`, `shell/`, `styles/` e `main.tsx`, mas **não inclui `home/`**. A PR #650 está visualmente reprovada e NÃO faz parte da base nova. Não mesclar a #650.

**Visual validado pelo usuário:** carregamento inicial, Login, Criar Conta, recuperação/alteração de senha, carregamento pós-login, sidebar/topbar (busca e período) e DataGrid. A validação visual não substitui homologação funcional.

**Nova diretriz:** construção visual limpa bloco por bloco. Fotos e assets reais HD para cenas decorativas, DOM/SVG/ECharts para dados, textos, botões e gráficos. Rótulo de benefício genérico (`Benefício Alimentação` no caso pessoal), sem impor a marca Verocard ao produto comercial; preservar vínculos de domínio existentes.

**Auditoria preliminar:** `phoenix/`, `web-next/`, `mobile/`, `legacy-*.js` e previews antigos presentes no repositório/Render. A presença de testes/entradas antigas impede exclusão generalizada sem mapa de dependências. Nada foi removido da main, API, Android ou Render.

**Banco:** Supabase `meg-financas` contém esquema financeiro e dados exploratórios somente leitura associados ao cadastro do administrador configurado. Render não listou PostgreSQL próprio, mas hospeda APIs e previews. A conexão da API de produção com esse banco ainda não foi comprovada. Métricas de análise não autorizam valores fixos na UI.

**Documentação completa:** `docs/MEG-WEB-HOME-REINICIO-20261030.md` (auditoria inicial, direção visual e plano de isolamento/limpeza).

**Status:** Etapa Home 06 em REDEFINIÇÃO, nova apresentação ainda não implementada e não homologada; PR #650 Draft sem merge. Prioridade: especificação visual em componentes novos, validação no navegador e publicação de prévia comprovada. Não avançar para outras telas.

**PR de trabalho nova:** [#651](https://github.com/MarcosVilalva/MEG-Platform/pull/651), Draft, base PR #649; aberta em 30/10/2026 para a reconstrução limpa da Home. **PR #650 continua rejeitada e fora da base.**


## 30/10/2026 | Home 06 clean-room implementada inicialmente na PR #651

**Este checkpoint substitui o estado anterior "sem Home implementada", mas NÃO constitui homologação visual ou funcional.**

- Home criada exclusivamente em \`apps/web/src/meg-web-evolution/home/\`: \`HomeDashboard.tsx\`, \`HomeChart.tsx\`, \`HomeGlyph.tsx\`, \`home-dashboard.css\` e módulo separado de prévia. Nenhum import de Home CSS/JSX da PR #650.
- O \`main.tsx\` da nova Web foi conectado ao \`HomeDashboard\` **somente após sessão autenticada**; Loading, Login, Criar Conta, Recuperação de Senha, Shell/sidebar, topbar e DataGrid compartilhado foram mantidos.
- Hero com foto verdadeira HD WebP e CSS dark teal isolado; benefício alimentação tem outra foto verdadeira, sem branding Verocard. Origens/licenças em \`docs/MEG-HOME-06-VISUAL-ASSETS.md\`. Servidas pelo CDN na revisão inicial, não são assets WebP locais.
- Gráfico ECharts com barras de \`cashflow.days.income\` e \`expense\` e linha de \`cashflow.days.net\`, tooltip BRL, vazio/privacidade e zero tratamento financeiro no cliente.
- APIs existentes: summary, cashflow, benefício, events, accounts, categories, cards e payables. **Novo endpoint de leitura** \`GET /finance/home-available?date=YYYY-MM-DD\` chama exclusivamente a função canônica \`monetaryBalanceAt\` e respeita autorização do workspace. Até publicar API correspondente, saldo disponível apresenta indisponibilidade, sem estimativa.
- Cards: receitas, despesas, despesas previstas (não confundidas com Payable) e quantidade de cartões. Benefícios fora do saldo monetário. Próximos compromissos combinam *linhas de leitura* identificadas como evento previsto ou payable, sem somar ou alterar status.
- Navegação para telas ainda não implementadas responde com aviso explícito, sem forçar rota falsa. Integrações das outras etapas permanecem pendentes.
- **Prévia pública isolada:** \`apps/web/home-06-panorama.html\`, fixture explicitamente fictícia (não importada no fluxo autenticado); Render \`https://meg-home-06-panorama-clean.onrender.com\`. Verificar SHA implantado antes de enviar link de validação.
- Testes criados: \`scripts/meg-home-06-panorama-viewport.mjs\`, workflow \`.github/workflows/meg-home-06-panorama.yml\`; sete viewports, privacidade, gráfico, screenshots de topo e rodapé.
- **Evidência inicial:** workflow \`41050062978\` no SHA \`0f48f118e3ec2d8006bc79b73fe01a699eb35ed0\` concluiu **success**; capturas reais em sete tamanhos foram inspecionadas. Fundação do mesmo SHA falhou em teste legado de Shell, que esperava Shell visível sem autenticação. Foi criado harness técnico exclusivo para testar o Shell existente, sem modificar autenticação. Verificar novos gates do SHA vigente, não presumir verde.
- **Proteções:** API financeira não teve fórmulas alteradas; apenas endpoint protegido de leitura. Android, componentes visuais da Etapa 05, sidebar, tokens globais e DataGrid permanecem preservados. PR #651 Draft; não merge.
- **Pendências críticas:** confirmar Foundation com harness, testar fluxo autenticado com a nova rota de saldo publicada na API autorizada, conferir capturas inferiores das tabelas, validar responsividade e aprovação visual explícita do usuário. Nenhuma tela futura autorizada.


### Home 06 | Revisão pós-capturas, DataGrids, mobile e leitura futura (30/10/2026)

- Artefato de captura visual \`41051561294\`, SHA \`d65ed5623eb5a6811c902fbadace84151e6d4991\`, concluído com **success**. Inspeção efetiva das capturas \`desktop-1672.png\`, \`desktop-1672-bottom.png\`, \`mobile-390.png\`, \`mobile-390-bottom.png\`.
- Corrigido o viewport do DataGrid **somente dentro do CSS isolado da Home**, mantendo componente central inalterado. Cabeçalhos, linhas, ferramentas e paginação apareceram no desktop.
- Corrigida a rolagem da Home em tela de 390px com estilos escopados à Home, sem alterar o Shell: captura mobile inferior passou a mostrar cards de vencimento e rodapé do DataGrid; teste automatizado agora exige scroll efetivo e linhas nos grids.
- Filtro de últimas movimentações deixou de misturar eventos planejados e futuros com lançamentos realizados; próximos compromissos consultam também eventos planejados do mês seguinte pela API autorizada (\`/finance/events/month?month=\`), mantendo Payable separado e sem calcular saldos/status na UI.
- **Gates:** novo workflow Home Panorama tinha sucesso no commit \`d65ed562\`; atualização funcional \`b8ec0f531c138944c4243e40f16a1d28f87e4389\` disparou nova execução, que ainda não estava concluída ao registrar esta nota. Foundation geral mantém falhas de baseline/screenshot do DataGrid em execução anterior; não afirmar verde.
- **Render:** serviço de preview \`meg-home-06-panorama-clean\` publica por auto-deploy da PR #651. Somente oferecer link sem cache após verificar explicitamente o SHA do deploy em status live.
- A **implementação ainda não está visualmente homologada** pelo usuário; não fazer merge da PR #651 nem avançar para telas futuras.


## 30/10/2026 | Home 06 | Refino visual e interações após avaliação do usuário

**Retorno do usuário:** a nova Home da PR #651 melhorou bastante, mas o usuário pediu maior refinamento de alinhamentos/proporções, ocultação opcional de filtros nos grids, redução dos espaços vazios, abandono da fotografia genérica do hero, ações em cards e carrossel compacto de cartões. Autorizou seguir com essas sugestões. A Home implementada **não foi homologada**.

**Mudanças entregues na mesma PR #651, ainda Draft:**

- HomeDashboard.tsx: hero executivo reduzido sem paisagem; saldo monetário e resultado realizado em áreas distintas. Gráfico mantém séries financeiras, com maior área útil. Cards de Receitas/Despesas filtram movimentações na própria Home; Pendências rola até compromissos; Cartões rola até carrossel. Botão Ver detalhes do saldo rola até movimentações da Home.
- Carrossel com cartões reais fornecidos pela API, anterior/próximo, fatura aberta e detalhes expansíveis como limite e dia de vencimento somente se constarem na autoridade canônica. Sem soma financeira local, sem logos de bandeira inventados. Fixture isolada de prévia contém 3 cartões claramente fictícios.
- home-dashboard.css: composição compacta reescrita na folha isolada, sem pilha de CSS legado. Hero dark teal abstrato substitui foto de montanhas. Relação ECharts/KPIs 8/4 e bloco Benefícios/Cartões/Ações 4/3/5. Foto de alimentos apenas no benefício.
- DataGrid homologado não foi editado. Toggle Mostrar/Ocultar filtros na Home esconde área primária de filtros/ordenação, preservando busca, seletor de colunas, XLS/PDF e contagem de filtros ativos. Estados independentes para os dois DataGrids.
- Script scripts/meg-home-06-panorama-viewport.mjs acrescentou testes de filtros, mudança de cartão, expansão de detalhes e seleção do KPI Receitas, além de sete capturas de desktop/tablet/celular, sem overflow e com rolagem mobile.
- Workflow Home Panorama #41055360810: success, SHA 4d9851d0cc303b1bcf99f2ddb1fcfd486a47abf7. Evidências reais do navegador arquivadas no GitHub Actions; verificadas capturas desktop/mobile, incluindo rodapé.
- Mudança posterior: CTA Ver detalhes do saldo usa a própria Home, SHA 2b7b3876d375300705d4fa91655979b5d52b9568. Os checks dessa nova cabeça exigem confirmação separada.

**Proteções e pendências:** sidebar, topbar, autenticação, DataGrid, API de regras financeiras e Android não foram alterados nesta rodada. PR #651 segue Draft sem merge. Endpoint home-available criado anteriormente ainda depende de deploy da API para retornar saldo real. Verificar Foundation do SHA final, Render em status live com commit exato e recolher aprovação visual explícita da nova Home. Navegação para telas futuras ainda usa aviso, não simula funcionalidades inexistentes.


## 30/10/2026 | Home 06 | Nova direção fotográfica aprovada para implementação

**Autorização explícita:** após mostrar a imagem "Painel Financeiro Futurista MEG.png" o usuário a aprovou como direção de qualidade, com adaptação funcional ao MEG, e solicitou implementação. A imagem é referência de composição/impacto, não screenshot de interface pronta. **A Home implementada ainda não foi homologada.**

**Escopo:** PR #651 Draft, somente Home 06. Não importar JSX/CSS de Home rejeitada (#650), não alterar Android, autenticação, Shell, sidebar, topbar, DataGrid compartilhado nem cálculos financeiros.

**Implementado nesta rodada:**
- Hero panorâmico com fotografia REAL de montanhas sob céu turquesa, WebP HD da Unsplash (autoria/licença no arquivo docs/MEG-HOME-06-VISUAL-ASSETS.md). Títulos/valores/ações são DOM. Saldo monetário continua vindo da API canônica e pode aparecer como indisponível antes do deploy da rota.
- Quatro KPIs em faixa própria: Receitas, Despesas, Benefício e Pendências previstas. Valores exclusivamente de summary/benefit-summary; nenhum percentual inventado. Cada KPI foca a seção adequada. Não criar módulos inexistentes.
- Gráfico ECharts central com barras income/expense e linha net canônicas por dia, com acesso aos relatórios quando o módulo existir.
- Carrossel "Meus cartões" ao lado do gráfico: cartão visual com FOTO real abstrata de luz azul em alta resolução, SVG de bandeiras Visa/Mastercard/Elo/Amex apenas quando brand do cadastro corresponde, sem inventar bandeira pelo nome do banco; previews usam nomes/bandeiras fictícios claramente rotulados. Navegação e detalhes de fatura/limite/dia do cartão mediante API.
- Benefício Alimentação mantém foto REAL de mercado; saldo separado das contas monetárias e conteúdo clicável com aviso quando tela futura ainda não foi construída.
- Nos dois DataGrids homologados, a área COMPLETA de ferramentas `.meg-datagrid-toolbar` agora vem recolhida e é ocultada por inteiro por padrão, sem faixa vazia; ação "Mostrar/Ocultar filtros" é independente por grid, mas não perde estado/persistência de filtros.
- Layout reconstruído na folha de estilo da própria Home, sem CSS do protótipo rejeitado. Breakpoints 640/1024, sem scroll horizontal esperado.

**Arquivos alterados/criados:** HomeDashboard.tsx, home-dashboard.css, CardBrandMark.tsx (novo), preview.fixture.ts, scripts/meg-home-06-panorama-viewport.mjs, docs/MEG-HOME-06-VISUAL-ASSETS.md, presente checkpoint.

**Gates ainda pendentes neste registro:** build atual e screenshots reais; conferência de filtros/carrossel em sete viewports; resultado do Foundation geral; Render publicar exato SHA em status live; comparação visual e aprovação explícita do usuário no navegador. PR #651 permanece Draft e **não pode ser mesclada**.


## 30/10/2026 | Vídeo 13-09-45.mp4 | Autonomia operacional da Home 06

**Decisão explícita do usuário:** daqui para frente ele enviará vídeos para avaliação e delegará à assistência as decisões de composição, correção, implementação e refinamento da Home 06. NÃO solicitar escolhas intermediárias repetidas. Continuar exigindo aprovação visual explícita antes de chamar uma tela de homologada. Respeitar gates financeiros/Android congelado. O usuário solicitou ainda alerta antecipado se o chat se alongar e checkpoint antes de transição de conversa.

**Vídeo real analisado:** `13-09-45.mp4`, duração ~46,8 s, captura desktop 1920×1080 da prévia pública no navegador. Foi revisada sequência de topo, carrossel, navegação e rolagem até ambos os DataGrids.

**Evidências e decisões desta rodada:**
1. O carrossel principal muda de cartão e exibe bandeira; porém os *peeks* laterais eram retângulos genéricos com ícone, sem identidade dos outros cartões. Substituídos por cartões adjacentes visuais com o próprio nome e bandeira provenientes de `data.cards[cardIndex ± 1]`, textura fotográfica, sem inventar registros ou marca. Nenhum card adjacente quando não houver registro.
2. O clique em ação ainda não implementada exibia barra informativa **no fluxo normal** acima do hero, deslocando toda a página (confirmado em ~11–18s). Aviso foi convertido em toast `position: fixed`, sem deslocamento geométrico e com botão fechar, deixando claro que o módulo ainda está indisponível nesta etapa.
3. Os DataGrids da Home foram inspecionados no vídeo na parte inferior: toolbar recolhida por padrão, cabeçalhos, linhas, rodapé/paginação visíveis. **Preservados**, sem alteração no DataGrid central e sem novos overrides desnecessários.

**Arquivos desta revisão:** `apps/web/src/meg-web-evolution/home/HomeDashboard.tsx`, `home-dashboard.css`, `scripts/meg-home-06-panorama-viewport.mjs`, este checkpoint. O teste agora confere identidade real do próximo cartão e ausência de layout shift após toast. Preview e API não devem ser divulgados como homologados sem confirmar CI do SHA atual e deploy Render live.

**Escopo e bloqueios:** PR #651 Draft; sem merge; sem edição de Android, API financeira, autenticação, Shell, topbar, DataGrid nem telas futuras. Home ainda sem homologação visual. Não tratar dados da prévia como dados financeiros reais.

**Continuidade entre chats:** consultar este checkpoint e `docs/MEG-WEB-HOME-REINICIO-20261030.md`. A etapa autorizada permanece **Home 06**, e o próximo chat deve continuar exclusivamente nela. O vídeo seguinte passa a ser evidência direta para diagnóstico e decisões autônomas.


## 30/10/2026 | Continuação Home 06 | Cartões e saldo, PR #651 (aguardando validação)

- Nova direção explícita do usuário: dar protagonismo aos cartões, material fotográfico real e sensação física; eliminar o container artificial do saldo disponível. Autonomia para correções intermediárias, mas sem homologar sem aprovação visual expressa.
- A versão atual mantém fotografias reais HD já licenciadas (montanha, luz azul, alimentos) e acrescenta fotografia de pedra preta sob o carrossel. Cartões aumentados, com textura fotográfica, chip/ícone de aproximação decorativos, efeitos de luz e sombra e fatura em linha de informação fora do cartão. Os dados, bandeiras e quantidades continuam sendo lidos da API, nunca inventados no fluxo autenticado.
- Saldo disponível redesenhado como dado monetário principal diretamente sobre fotografia panorâmica, sem card/container translúcido independente. Controle de privacidade e acesso a movimentações preservados. Indisponibilidade da rota canônica continua explicitada, sem cálculo alternativo.
- `14-13-34.mp4` foi citado como evidência; o arquivo binário ainda não está acessível no chat atual ou nos anexos localizados. Não declarar análise quadro a quadro desse vídeo nem aprovação visual.
- Mudança restrita a JSX/CSS da Home e documentação/checkpoint; proteger Android, Shell, topbar, autenticação, DataGrid e cálculos financeiros. Commit/gates/Render devem ser registrados pelo SHA efetivo; PR segue Draft e sem merge.


## 30/10/2026 | Home 06 | Correção de proporção, indicadores e loop infinito

- Vídeo recebido e efetivamente inspecionado: `14-48-11.mp4` (20,715 s, desktop 1920x1080). Foi observado desperdício vertical no hero, cartões de Receita/Despesa com ícones isolados acima do rótulo e carrossel que trava na primeira/última posição.
- Pesquisa nas conversas e documentação histórica confirmou contrato funcional de carrossel cíclico/infinito, cartão central, anterior/posterior, enquadramento correto e mobile responsivo. Referências visuais antigas não foram promovidas a padrão da nova Web.
- JSX da Home: rótulo e ícone dos 4 KPIs agora compartilham uma linha, notas repetidas de Receitas/Despesas removidas; hero reduzido, chamada visual redundante removida; saldo monetário permanece canônico.
- Carrossel: índice módulo N; anterior do primeiro é o último, próximo do último é o primeiro; navegação circular por botões, cartões laterais e indicadores; setas só desabilitam para 0/1 cartão; para 2 cartões evita mostrar duas prévias do mesmo registro; teclado setas esquerda/direita e swipe horizontal em touchscreen; animação lateral com `prefers-reduced-motion` respeitado. Nenhuma clonagem de registros financeiros.
- Teste Playwright reforçado para detectar travamento de ponta, validação de identidade dos peeks e alinhamento vertical título/ícone dos indicadores.
- Proteções: PR #651 Draft, sem merge; não modificar Android, finanças centrais, API, Shell, autenticação e DataGrid central. Gates, screenshots reais e Render SHA-live precisam ser conferidos e validação visual explícita continua pendente.


## 30/10/2026 | Home 06 | Revisão de proporções após reprovação visual
- Usuário reprovou novamente o preview da Home, apesar de correção técnica do carrossel. **Não homologar.**
- Diagnóstico pela captura real Playwright do SHA `ffd6299d`: hero com grande área fotográfica sem conteúdo; gráfico relegado a 5/12 e carrossel a 7/12; cartão central superdimensionado; no mobile o título e a área do período da visualização sobrepostos. A aparência foi considerada insatisfatória, ainda que Home Panorama tenha passado.
- Correção estrutural apenas no CSS isolado da Home: relação visual do gráfico/carrossel invertida para 7/5, cartão principal em escala menor com peeks adjacentes, altura do hero reduzida, KPIs limpos, atalhos menos altos e seções Benefícios/Ações em 6/6. Removidos estilos de elementos não usados. Retirada a legenda supérflua do hero e o período duplicado do título do gráfico.
- Teste de viewport passou a medir eventual sobreposição real entre título e ação do gráfico. Carrossel cíclico da rodada anterior preservado.
- Gates devem ser verificados no HEAD da revisão e as capturas devem ser examinadas antes de apresentar prévia para avaliação. PR #651 continua Draft, sem merge.
- No HEAD anterior `ffd6299d`, a suíte Home Panorama passou, mas a Foundation geral falhou em regressões/baselines visuais do DataGrid e testes da toolbar. Essa falha não autoriza mexer no DataGrid desta etapa.


## 30/10/2026 | Home 06 | Reconstrução de layout aprovada para execução, ainda sem homologação
- O usuário reprovou visualmente as composições anteriores. A instrução "Continue" autoriza reconstrução apenas da camada visual da **Home 06**, após confronto com o modelo financeiro `docs/MEG-WEB-FINANCIAL-AUTHORITY.md`. Nenhuma nova entidade/campo/regra financeira permitida.
- Problema raiz: cartão esticado artificialmente ao lado do gráfico e saldos/KPIs com quantidade inadequada de espaço vazio; vários CSS de correção acumulados. A nova Home usa folha CSS reescrita de forma isolada, sem reaproveitar estilos rejeitados da PR #650.
- Nova estrutura: `pano-spotlight` desktop com saldo fotográfico e carrossel de cartão real lado a lado em grade 4/6; indicadores compactos numa linha, cada valor à direita do ícone; segunda faixa com gráfico financeiro e coluna de Benefícios/Ações rápidas; DataGrids mantidos no fim.
- Preservados: modelos de leitura da API, saldo monetário e benefício segregados, privacidade, filtros, fatura canônica, navegação cíclica de cartões com swipe e teclado, estado vazio, DataGrid compartilhado e Shell.
- Proporções móveis estruturalmente empilhadas em 1024/640, sem breakpoints improvisados. Verificações Playwright adicionais de horizontalidade do KPI, centro do cartão, cartões adjacentes e geometria da área superior.
- Limite técnico: fotografia via CDN ainda não está vendorizada; integração autenticada real não foi validada; teste Home Panorama e Foundation do SHA devem ser verificados, assim como preview Render *live* antes de validar visualmente. PR #651 Draft, sem merge, usuário ainda não aprovou Home.


### Home 06 | Inspeção de captura do SHA 3792647 e correção geométrica
- Home Panorama no SHA `3792647e8b51a63c5fdee48d0a532c04d41e018d` apresentou SUCCESS; Render também confirmou `live`. Inspeção visual humana das capturas reais 1672px e 390px identificou **cartão central cortado verticalmente no desktop**, além de cartões adjacentes demasiado largos com aparência de painéis, apesar de teste automatizado verde. A tela permanece NÃO HOMOLOGADA.
- Ajuste na mesma estrutura limpa: estágio recebe altura mínima suficiente para cartão com proporção física 1,72; cartão principal limitado a 20rem desktop; vizinhos recebem proporção física 1,72 e sobreposição controlada; variante responsiva mantém cartão inteiro.
- Playwright agora verifica a visibilidade integral da face do cartão (top/bottom) e proporção geométrica dos cartões adjacentes em cada viewport, além dos testes cíclicos/financeiros existentes. Não houve mudança financeira nem no Android, Shell, auth ou DataGrid.


## 30/10/2026 | Home 06 | Auditoria explícita de responsividade após vídeo 16-31-44.mp4

- Usuário novamente **reprovou** visualmente a Home 06, perguntando onde estão as regras de responsividade. Vídeo `16-31-44.mp4` realmente examinado no chat: 14,817 segundos, vídeo de navegador desktop 1920x1080 (frames revisados entre início, navegação circular e rolagem até os DataGrids). Evidência: carrossel de cartões laterais gigantes, cartão físico central pequeno perante o espaço útil e conjunto visual não coerente. **O vídeo não demonstra diretamente viewport mobile**.
- Regras obrigatórias reforçadas: mobile-first, apenas 640px e 1024px para quebras principais; conteúdo dimensionado pelo espaço, não esticado; zero rolagem horizontal da página; nenhuma sobreposição, truncamento funcional ou elemento inacessível; DataGrid adaptável e controles de toque >=42px visíveis.
- Auditoria encontrou CSS anterior desktop-first, `height:100dvh;max-height:100dvh` imposto ao body do Shell na Home mobile e controles dos dots com área de 16px. CSS da Home corrigido para defaults de celular com progressão `min-width:640px` e `min-width:1024px`; body da Home utiliza altura herdada `100%` do Shell já aprovado para preservar scroll interno sem reaplicar uma altura fixa em dvh; nenhum CSS compartilhado alterado.
- Nova estrutura `pano-financial-column`: saldo e KPIs 2x2 formam **coluna esquerda** na largura desktop, cartões ocupam **coluna direita**; em tablet/celular empilhamento estrutural. Carrossel limitado a palco de até 43rem de largura e cards na proporção física 1,72; parou de esticar vizinhos conforme largura arbitrária da página. Setas, dots e controle de privacidade têm alvos >=44 CSS px.
- Teste Playwright ampliado para 1920px e 360px, scroll real do conteúdo, ausência de overflow horizontal do `.meg-main`, geometria do scroll, escalas visuais dos cartões e alvos de toque. Teste verde não implica aprovação visual; capturas da nova revisão devem ser inspecionadas antes de apresentar como validação.
- Não editar Android, API financeira, auth, Shell, sidebar ou DataGrid; nenhum campo, entidade ou regra financeira criada. PR #651 permanece Draft, sem merge; sem homologação.


### Correção imediata de captura: números quebrados em 320px e coluna insuficiente em 1024px
- Após revisão efetiva das capturas no commit `eed6285`: em 320px, indicadores quebravam último dígito de valores monetários; em 1024px a coluna de 4/6 com sidebar expandida espremia saldo e KPIs, quebrando seus valores. **Testes gerais tinham passado, mas a regressão visual era real.**
- Fix sem terceiro breakpoint: grid de KPIs usa `repeat(auto-fit,minmax(min(100%,10.5rem),1fr))` no mobile; em 320px um card por linha, em 390px dois. Para desktop ≥1024, área superior usa `auto-fit` com trilhas mínimas de 31,5rem, de modo que a sidebar existente determine quantas colunas cabem sem quebra. Valores monetários ganham `white-space:nowrap` com tamanhos tipográficos compatíveis.
- Teste Playwright passa a falhar quando `strong` de moeda ocupa duas linhas. Autonomia financeira e UX não alteradas; continua pendente captura visual de novo HEAD, CI/Render e validação expressa.


### 30/10/2026 | Gate após correção 47acfa: falso negativo de geometria, sem nova regra
- Capturas finais do SHA `47acfa825a44e23b47a9b6d70d6604fd5bde827e` foram efetivamente revisadas: em 320px os números de KPI não quebram; em 1024px o saldo/KPIs empilham sobre o carrossel sem cortes ou overflow. Outros 7 viewports passaram métricas e interações.
- Workflow Home Panorama saiu como failure **por assert antigo `tightCards` em 1024px**, que exigia mesma linha entre saldo e cartão sempre que `innerWidth>=1024`, mesmo quando CSS `auto-fit` detecta largura insuficiente da área do Shell. Não era falha funcional observada da Home, mas falso negativo no teste.
- Corrigido teste para consultar as colunas reais computadas do grid: em uma coluna exige empilhamento com gap <=32px, em duas exige alinhamento no topo e ausência de sobreposição. Sem alteração visual, API, Android, Shell ou DataGrid neste commit. Novo gate precisa passar antes de liberar link de validação do SHA final.


### Correção de harness após workflow #41117909227
- Workflow Home Panorama do SHA `f9295434` falhou antes das capturas por **SyntaxError: Identifier 'spotlight' has already been declared**. Auditoria do script também identificou variável de retorno `tracks/isStacked` no contexto incorreto. Ambas as falhas são do teste e foram corrigidas sem alterar a Home.
- As capturas reais do SHA `47acfa` já mostraram números íntegros em 320px e empilhamento seguro em 1024px. O único motivo confirmado da falha do SHA `47acfa` era o teste antigo que exigia cards alinhados horizontalmente em todos os desktops. Revalidar no próximo SHA, sem chamar a tela homologada.


### Gate Home 06 | CSS Grid auto-fit e colunas vazias
- SHA `b28128a2`: workflow visual executou nove viewports e interações; falha isolada `tightCards=false` somente em 1920px. Causa do script: CSS `repeat(auto-fit,...)` pode retornar também trilha colapsada `0px` no `gridTemplateColumns`, que foi contada como terceira coluna fictícia. A captura desktop confirmou somente duas colunas ocupadas, sem corte.
- Teste corrigido para contar somente trilhas reais `>1px`. Nenhuma mudança no código de Home/financeiro; conferir novo gate final antes de proclamar sucesso.


## 30/10/2026 | Home 06 | Evidência 17-01-12.mp4 e correção de largura efetiva
- Vídeo de **17,203 segundos**, captura de navegador desktop 1920x1080, inspecionado quadro a quadro por amostragem (16 quadros). A imagem mostra a segunda faixa com `Benefícios` e `Ações rápidas` ocupando apenas parte estreita da coluna direita, deixando faixa vazia extensa, mesmo em viewport largo. No vídeo também é possível verificar que a navegação circular de cartões opera; isto NÃO prova aprovação visual.
- Causa reproduzida por leitura do CSS do HEAD `c44cfd`: no breakpoint ≥1024px `.pano-mid{display:flex;flex-direction:column}` herda do estilo base `align-items:start`; filhos `.pano-benefits` e `.pano-actions` encolhem para largura intrínseca em lugar de preencher a coluna definida pelo grid exterior. Corretivo: `align-items:stretch` e `width:100%;align-self:stretch` na camada exclusivamente da Home.
- A lista de cinco ações rápidas agora usa colunas automáticas com mínimo útil de `6.4rem`, em vez de cinco colunas forçadas dentro de 5/12 de largura em 1024px. Mantidos somente breakpoints 640/1024px e todos os botões/fluxos existentes.
- Playwright verifica largura efetiva da coluna de Benefícios/Ações em relação às trilhas reais, além da largura de cada ação rápida (mínimo 88px) nos nove viewports. Finanças, Android, Shell, autenticação, DataGrid inalterados. Requer gate técnico e visual da PR #651 em Draft, sem merge nem homologação.


## 30/10/2026 | Continuidade Home 06 e auditoria de autodeploy Render
- Direção explícita do usuário: **manter o funcionamento automático** do Render, corrigir desperdício de build e erros de verificação. Não suspender automaticamente os ambientes importantes.
- Checagem de PR #651 no SHA `9e188d6b`: Home Panorama falhou antes da execução por duplicação de `const panels`; corrigido no script com `midPanels`, sem alterar tela. Workflow Home agora inclui `node --check` antes do npm ci e reporta corretamente nove resoluções.
- Build Render segue bloqueado por consumo de 500/500 minutos de pipeline; último deploy comprovado live `c44cfd37`. A nova revisão de testes/documentação usa `[skip render]` para não provocar build desnecessário. CI GitHub Actions permanece automático.
- Foundation anterior falhou em testes de toolbar e screenshots do DataGrid compartilhado. **Não atualizar snapshots automaticamente nem tocar no DataGrid em uma etapa da Home.**
- Auditoria operacional e roteiro de filtros seguros para autodeploy: `docs/MEG-RENDER-PUBLICACAO-AUTOMATICA-AUDITORIA-20261030.md`. Conector Render não oferece update de filtros em serviços já existentes. Nenhuma alteração de produção no Render, API ou banco.
- Home 06 sem homologação, PR Draft e sem merge. Próximos gates requerem conclusão e inspeção visual de screenshots gerados pelo novo SHA.


## Etapa 08 — Prévia integrada de componentes reais (03/11/2026)

- Solicitação: visualizar a sequência Carregamento → Login → Carregamento inicial → Home → Novo Lançamento, utilizando as telas **realmente implementadas**, não uma montagem de imagens.
- PR isolada: **#654** (`preview/08-fluxo-componentes-reais-20261103`), base na **PR #651**. Permanece **Draft, sem merge e sem publicação comprovada**.
- Fontes: autenticação/Loading da PR #649, Home e AppShell pré-confirmados na PR #651, seletor da PR #648 com arquivos e WebPs originais copiados por SHA. A PR #653 continua experimento, sem aprovação.
- Entrada própria: `apps/web/fluxo-integrado-08.html`; configuração `apps/web/vite.fluxo-integrado-08.config.ts`; composição em `apps/web/src/meg-web-evolution/integrated-preview/`.
- O Login permanece `previewOnly`, carregamento é ilustrativo e a Home utiliza `homePreviewFixture`. Não há autenticação real, API, mutação, gravação ou migração de dados.
- Apenas o seletor do Novo Lançamento é apresentado; formulário protegido de Despesa/Receita, Benefício e Transferência não são ativados nesta prévia.
- Android, API financeira, banco, Shell, DataGrid e componentes já existentes foram mantidos sem alterações.
- **Pendências:** build, testes de responsividade/fluxo, preview publicado sem cache, aprovação visual explícita e revisão de integração operacional antes de qualquer merge.
- Documentação: `docs/MEG-08-PREVIEW-COMPONENTES-REAIS.md`.


## 03/11/2026 | Refino da integração a pedido do usuário
- A Home de código foi atualizada pelo conteúdo da PR **#653** (HEAD \`814c128\`), incluindo correção de categoria/ícone, melhor leitura, cartões e ajustes de simetria. A PR #653 é a candidata mais recente, **não** uma homologação final.
- Três arquivos copiados por SHA da PR #653: \`HomeDashboard.tsx\`, \`HomeGlyph.tsx\`, \`home-dashboard.css\`, apenas para a branch isolada da prévia.
- Acabamento visual no CSS **escopado da prévia**: luz teal suave, imagem fotográfica local do Novo Lançamento no saldo, cartão principal em destaque, ações rápidas menores e próximas, mantendo a grade 3+2 e alvos de clique.
- Novo Lançamento: tipografia, alinhamento das colunas, margens e texto dos quatro cards refinados somente na prévia; código/estilos e imagens da PR #648 continuam íntegros.
- Verificar build, nove resoluções, integridade da Home, responsividade/legibilidade, navegação e ausência de gravação/API em CI. Publicar no serviço estático isolado Render **somente após o resultado técnico**.
- Status de aprovação: **nenhuma tela nova validada por esta integração**. Home #651 segue pré-confirmada, Home #653 e esta composição continuam candidatas.

## 03/11/2026 | PR #654 | Revisão integrada do candidato visual
- A última Home da PR #653 foi copiada para a prévia #654, sem tocar na PR #651 pré-confirmada nem na #653 original. Arquivos copiados por SHA: HomeDashboard.tsx, HomeGlyph.tsx e home-dashboard.css.
- Refinos somente na prévia: imagem local hero.webp no saldo, glows moderados no saldo e cartões, cinco ações rápidas menores em disposição desktop 3+2. Nenhuma alteração financeira, API, autenticação, Android, Shell ou DataGrid.
- Novo Lançamento: proporção/textos refinados; tablet 640–1023 empilhado, desktop em duas colunas, mobile vertical.
- Workflow #41741985134: SUCCESS, 19 resultados, Home e Novo Lançamento em nove resoluções, fluxo demonstrativo Login → Carregamento → Home → Novo → Voltar, sem API nem rolagem horizontal.
- Inspeção de screenshots revelou botão demonstrativo Rever sequência sobre o cartão mobile. Ajuste isolado: ocultar esse controle não funcional em larguras menores que 1024px. Logout real continua preservado.
- Render publicou a revisão anterior d41712fc6658e6cd1f5faa1e536e1062ad914144, deploy dep-dbl75e5ckfvc73cl1ekg LIVE. Revisão atual requer checar novo SHA no CI/Render.
- Status: PR #654 Draft, sem merge. Home #653 ainda candidata; nenhuma homologação visual nova.


## 04/11/2026 | Continuidade visual isolada, Etapa 08 Novo Lançamento
- Usuário autorizou seguir refinamento tela a tela, iniciando no seletor de Novo Lançamento; Home refinada vem depois, Loading/Login/Carregamento inicial só após validação de cada tela.
- Seleção preserva as decisões do projeto e os tipos ativos e indisponíveis do componente canônico PR #648, sem operações financeiras.
- Refino estrutural local ao preview PR #654: stylesheet exclusivo `choice-refinement.css`, ícones SVG de ação e footer, crop da imagem com foco inferior e cartões sem distorção. Elimina overrides de escolha acumulados em `integrated-preview.css`.
- Testes de captura e publicação Render serão obrigatórios antes de envio para validação humana. PR #654 Draft, sem merge, Home original e Android inalterados.


- Revisão de QA (04/11/2026): teste de geometria de alinhamento, crop cover e hero com foco inferior; cenário de alturas compactas; smoke de autenticação em desktop/mobile, sem API. Tipografia auxiliar do rodapé aumentada. Prévia PR #654 ainda Draft e não homologada.


## 04/11/2026 | Ajuste localizado das extremidades das imagens
- Print do usuário mostrou nas quatro opções um limite vertical escuro entre a parte fotográfica e a região de texto, além de recorte marcado na borda esquerda.
- Correção restrita ao CSS de `choice-refinement.css`: máscara progressiva (inclusive borda inicial e final) nos WebPs de Despesa, Receita, Transferência e Benefício, com cobertura `cover` preservada e escurecimento gradual atrás de texto e chips. Variação equivalente no mobile.
- Mantidos posicionamento central dos ícones e grade estruturada, textos, estados disponíveis/indisponíveis, Home, fluxo real, API e Android. Nenhuma imagem oficial foi editada ou substituída.
- Incluída verificação automatizada da máscara das quatro opções. Requer screenshot/CI/Render, e aprovação visual explícita para validar.


## 04/11/2026 | Correção específica, faixa preta interna dos quatro banners
- O usuário ampliou a imagem e apontou a faixa vertical interna, logo após a borda arredondada colorida, antes de começar a foto. Revisão anterior interpretou erroneamente como transição em sentido geral.
- Causa efetiva no CSS de preview: `mask-image: linear-gradient(... transparent 0%, #000 2.5%, ...)`, que apagava a extremidade esquerda da imagem e expunha o fundo preto em uma tira perceptível.
- Correção: a imagem agora inicia opaca desde `0%` e permanece assim até `30%`; a dissolução é preservada apenas em direção à região do texto. `overflow:hidden` e `border-radius` nativos dos quatro cards mantêm o recorte exato na moldura. A fotografia não sofre distorção.
- Nova verificação automatizada proíbe início transparente do `mask-image`. Sem mudança no hero, Home, fontes visuais oficiais, funcionalidades financeiras, API, Android ou componentes de outras etapas.
- A tela permanece candidata à validação visual humana; PR #654 em Draft sem merge.


## 04/11/2026 | Correção final da moldura duplicada embutida nas WebPs
- A captura após retirar o início transparente revelou **dois contornos**: borda CSS do card e borda interna já rasterizada no asset oficial. O problema é geométrico, não uma emenda a resolver com mais sombras.
- Ajuste apenas nos fundos fotográficos, com pequena sangria `inset:-10px -15px` nos banners e `-6px -9px` no hero; os cantos arredondados do contêiner HTML permanecem como única moldura visível. Não altera arte-fonte, proporção da imagem ou posição de textos e ícones.
- Playwright adiciona verificação da sangria e capturas recortadas dos quatro banners em desktop/mobile. Inspeção manual deve confirmar que o contorno interno sumiu; CI não equivale a validação visual humana.


## 04/11/2026 | DECISÃO FUNCIONAL APROVADA: Verocard = Cartão benefício pré-pago
- Aprovada explicitamente pelo usuário a apresentação do Verocard como **cartão alimentação pré-pago**, inclusive futuro carrossel de Cartões, sem modelá-lo como cartão de crédito.
- **Preservar** o item 12 das Regras Consolidadas: Alimentação = Conta Benefício + Verocard + Pago, com vínculos automáticos e sem interferência no saldo monetário. Escrita exclusiva de benefício em `apps/api/src/modules/finance/benefit-event-mutation.ts`.
- Recarga aumenta saldo de benefício; despesa reduz com proteção de saldo. Não gerar fatura/limite/parcelas, nem salário/recarga duplicados. Carrossel somente projeção de leitura da mesma fonte.
- **Nesta etapa:** ajustar apenas a comunicação visual do seletor de Novo Lançamento em PR #654, mantendo Benefício desabilitado na prévia. Implementações reais de Cartões/Home/Despesas/Benefícios ficam pendentes de suas respectivas etapas e gates.
- Registro detalhado: `docs/MEG-WEB-VEROCARD-PRE-PAGO-DECISAO-20261104.md`.
- Imagem local de Verocard é uma representação ilustrativa, não um cartão físico verificado. Aprovação visual e eventual substituição do asset oficial permanecem pendentes. PR #654 Draft, Android intacto.

## QA de largura mínima (04/11/2026)
- A rodada `41801006263` compilou, mas o Playwright encontrou **1 falha em 320×640**: o novo texto/chips de Verocard faziam três chips quebrar para duas linhas, deslocando o centro do cadeado em 3,95px. Não foi erro de regra financeira.
- Ajuste estrutural e localizado ao card Benefício em mobile: três chips compactos em uma linha, mantendo informações e cadeado alinhado. Não ocultar controles nem reduzir área de toque do card.
- Repete CI/Render no novo commit; revisão anterior com falha não deve ser considerada tecnicamente aprovada.

## 04/11/2026 | CORREÇÃO DE ESCOPO APROVADA: Benefício genérico, operadora por cadastro
- Usuário esclareceu que o MEG é produto de uso geral: Verocard é exemplo particular; outra pessoa poderá ter Ticket, Alelo, VR ou outro emissor. **O card genérico Benefício no Novo Lançamento NÃO pode mostrar marca/operadora fixa**.
- A imagem específica do cartão pertence ao **cadastro real do cartão e ao carrossel de Cartões**, com identificação/asset conforme a instância cadastrada. Sem marca cadastrada ou asset confirmado, usar representação genérica.
- Nova referência: `docs/MEG-WEB-BENEFICIOS-MULTIOPERADORA-DECISAO-20261104.md`. Ela **complementa e corrige o escopo** da decisão anterior de Verocard pré-pago: regra particular ainda válida, mas não universal.
- Prévia PR #654: subtítulo genérico, ilustração de cesta/mercado + cartão sem marca; mantém Saldo/Recarga/Consumo, Benefício indisponível, demais cards e o resto da Home intactos. Asset `apps/web/public/meg-assets/benefit-generic-groceries.webp`.
- **Lacuna técnica identificada:** domínio atual exige Verocard no `financial-policy.ts` e no writer `benefit-event-mutation.ts`. Suporte operacional multioperadora **ainda não existe**; não alterar writer, nem inferir suporte universal a partir da revisão visual.
- Testes, deploy Render e validação visual humana continuam exigidos antes de merge. Android congelado.

## 04/11/2026 | VALIDAÇÃO VISUAL EXPLÍCITA — Seletor Novo Lançamento (Etapa 08)

- Usuário declarou **“Excelente, por mim validado”** após a prévia Render da tela com Benefício genérico (cesta de compras/alimentação, sem marca fixa) e carrossel/cartão específico reservado ao cadastro futuro.
- **Escopo aprovado:** composição e apresentação visual da tela **Novo Lançamento — seleção dos quatro tipos** em desktop e mobile, incluindo imagens, chips, tipografia, ícones, alinhamentos, responsividade e card **Benefício genérico**.
- **Revisão visual aprovada:** commit `28a2bd0f3b550c87958e78805f0ca1739e8adf62`, CI `41804115634` (SUCCESS), Render `dep-dblf925bedkc73a8abjg` (LIVE no mesmo SHA). Link histórico sem cache: https://meg-fluxo-08-integrado-pr654.onrender.com/fluxo-integrado-08.html?tela=novo&v=28a2bd0f3b550c87958e78805f0ca1739e8adf62
- **Congelamento visual:** não alterar esta tela por iniciativa própria. Sugestões em outras telas podem ser propostas como estudos, sem mudar a tela aprovada, os assets oficiais nem seu enquadramento.
- **Aprovação NÃO abrange:** formulário financeiro operacional, gravação na API, habilitação de Transferência/Benefício, Home, carregamento/login/cadastro/recuperação, aplicação global da identidade visual, carrossel de Cartões, regra multioperadora da API, merge ou produção.
- PR #654 permanece em Draft, sem merge. Android congelado; regras de negócio e autoridade financeira seguem intactas. Avançar apenas pela etapa/tela autorizada em chat próprio. Próximas propostas visuais para Home/autenticação são estudos pendentes de aprovação, não substituem os prints oficiais.

## 04/11/2026 | Home: candidato de acabamento preservando layout validado
- Após homologar visualmente **Novo Lançamento** no SHA `28a2bd0f3b550c87958e78805f0ca1739e8adf62`, o usuário autorizou iniciar refinamentos na Home, **sem redesenhar** ou perder a base da PR #653.
- Nova branch independente `preview/06-home-refino-preservado-20261104` derivada da PR #654 no SHA documental `75f48ac2e215b34f7bd17cdd74744a2f1733641e`; a PR #654 original e seu Render ficam preservados.
- O acabamento pré-existente da Home foi **movido**, sem mudança, da folha global de prévia para `integrated-preview/home-refinement.css`. Novos ajustes da Home são escopados a `[data-preview-view="home"]`, evitando qualquer mudança na seleção Novo Lançamento aprovada.
- Proposta: contorno e iluminação mais consistentes em saldo e cartões, cards secundários com contraste um pouco maior, acessos rápidos menores e próximos, texto mais legível. Grids, campos, dados, navegação, controles e regras continuam os mesmos.
- Home ainda **NÃO homologada**. Exige compilação, testes, screenshots de antes/depois nas mesmas resoluções, Render separado sem cache e aprovação visual explícita.
- Não alterar Android, API financeira, DataGrid, autenticação ou a escolha de Novo Lançamento.


## 04/11/2026 | Home PR #655 | Imagem 02 aprovada como direção + atalhos configuráveis futuros
- Usuário escolheu **imagem 02** da proposta do carrossel e acessos rápidos; correção explícita: deixar **os cinco botões** (Novo lançamento, Transferência, Pagar conta, Relatórios, Configurações) no painel Ações rápidas, retirar apenas **Novo lançamento (+) duplicado no cabeçalho** na Home.
- Implementação desta branch: cartão central valorizado, resumo de cartão em faixa estruturada usando os mesmos campos canônicos de cartões (nome, emissor, payableStatementAmount), indicadores do carrossel preservados. Atalhos em grade 3+2 no desktop e disposição responsiva nos menores viewports; o topo não exibe o CTA duplicado somente na Home.
- **Futuro, não implementado:** configuração dos botões de Acesso rápido por usuário dentro de Configurações. Não alterar dados persistentes, permissões ou criar preferências até a etapa adequada.
- Este refinamento visual será submetido a novo CI/comparativo e novo Render. A seleção **Novo Lançamento homologada** permanece intacta. Android/API/finanças/DataGrid sem alterações.
- O aceite da ilustração confirma a **proposta**, não homologa automaticamente a Home renderizada. PR #655 Draft, sem merge.


## 04/11/2026 | Gate responsivo corrigido
- No primeiro CI da imagem 02 (`41817103792`), o navegador encontrou o cartão principal cortado em **640×900 e 768×1024**; build havia passado, mas o gate visual falhou.
- Causa localizada: cartão ampliado a 69%/máximo 23rem com aspect ratio 1.72:1 e palco limitado a 12rem no tablet. Corrigida apenas altura mínima do palco de 640px a 1023px, sem escala artificial nem mexer no objeto cartão.
- Reexecutar 9 viewports, fluxo e comparação; não homologar enquanto o CI não estiver verde.


## 04/11/2026 | CORREÇÃO DO ESCOPO DA HOME, IMAGEM 01
- O usuário corrigiu a interpretação anterior: imagem **01** é a referência, a imagem **02** corresponde ao estado errado. O **Novo lançamento (+)** permanece no cabeçalho junto à busca e sai de **Ações rápidas**, que terá **exatamente quatro cartões**: Transferência, Pagar conta, Relatórios e Configurações.
- Ações rápidas agora têm faixa de largura completa logo abaixo de Meus cartões / área principal, com 4 colunas no desktop, 2 em tablet e 1 no celular. Descrições presentes conforme referência.
- Monitor wide: a Home deixa de preencher indiscriminadamente toda largura e passa a usar composição centralizada até 93rem; colunas estáveis a partir de 1024px e cartões proporcionais. **Não é zoom/transform nem só aumento de CSS**.
- Testes: 320, 360, 390, 640, 768, 1024, 1366, 1672, 1920 e 2560px, incluindo checagem de largura máxima e centralização, 4 atalhos e seus textos, botão + no topo, carrossel e fluxo do Novo Lançamento.
- Preferências futuras de atalhos em Configurações seguem **não implementadas**. Nenhum dado financeiro, benefício, writer, Android, DataGrid ou visual do Novo Lançamento homologado foi alterado.
- PR #655 Draft; nova versão requer CI verde, Render LIVE e validação visual humana antes de considerar a Home homologada.


## 04/11/2026 | Gate responsivo adicional no desktop
- Workflow `41827321615`: build concluído, mas QA apontou duas falhas: regra legada `nth-last-child(-n+2)` aplicava `grid-column:span 3` aos últimos atalhos, quebrando a linha de quatro; em 1024px as colunas fixas comprimiam o cartão em vez de destacá-lo.
- Correção pontual **na mesma folha consolidada**: `grid-column:auto` nos quatro botões da faixa e auto-fit com largura mínima útil de 31.5rem na região de saldo/cartões, evitando forçar duas colunas no limite de 1024px. Sem introduzir novo breakpoint.
- Repetir CI (10 viewports incluindo wide 2560px), Render e inspecionar capturas. A Home segue candidata, não homologada.

## 04/11/2026 | Correção de inspeção visual em tablet
- O CI `41827695566` concluiu **SUCCESS** (10 larguras + fluxo). A inspeção das capturas revelou, porém, em 768px uma distribuição **3+1** dos quatro KPIs, com área vazia. Isto não era capturado pelo teste antigo.
- Corrigido em CSS isolado: a partir de 640px os indicadores usam `repeat(2,minmax(0,1fr))`, mantendo a grade existente em desktop e evitando quebra assimétrica em tablet.
- O navegador passa a medir geometricamente as duas linhas de KPIs, rejeitando regressão 3+1. Nenhum valor, cálculo, fonte de dados ou componente financeiro alterado. Exige nova CI/Render e avaliação visual final.


## 04/11/2026 | Rodada específica de responsividade e legibilidade (gravação 11:24)
- A gravação do usuário mostrou texto pequeno no gráfico e cabeçalhos das tabelas comprimidos, sobretudo em desktop. O vídeo não comprova responsividade entre todas as larguras. Ajustes aprovados para avaliação **somente na Home**, sem redesenho e sem mexer nos quatro atalhos da imagem 01.
- **Fluxo financeiro**: o ECharts passa a adaptar legenda, fontes, densidade de datas e área de plotagem à largura do painel via ResizeObserver. Séries e valores continuam provenientes da autoridade financeira; zero recálculos de negócio.
- **Próximos compromissos/Últimas movimentações**: as duas tabelas só são colocadas lado a lado quando cada uma possui largura útil; caso contrário ocupam uma linha inteira. Larguras iniciais das colunas da Home foram calibradas para Vencimento, Situação e Categoria; DataGrid compartilhado não modificado.
- **Proporções**: a região Fluxo/Benefícios agora muda de uma para duas colunas por auto-fit e largura mínima, sem forçar 7/5 em 1024px. Gráfico e texto auxiliares mais legíveis; a imagem de benefício mantém cover, sem distorção.
- **Responsividade real a verificar**: 320, 390, 640, 768, 1024, 1366, 1920 e 2560px, com alturas compactas e simulação de zoom 125%; áreas de toque, scroll horizontal, títulos/cabeçalhos, gráfico e diferença antes/depois. Isso é proposta de implementação, não aprovação visual.
- **Notificação da prévia**: o aviso após clicar Despesa pode sobrepor modal, mas a escolha Novo Lançamento foi homologada; tratar mudança da experiência do modal separadamente em etapa autorizada, preservando a tela aprovada.
- Sem mudanças em autenticação, Shell compartilhado, DataGrid, API, banco, Android ou design homologado do Novo Lançamento. PR #655 Draft e merge bloqueado até gates e aprovação visual da Home.


## 04/11/2026 | Testes adicionais para a revisão de responsividade
- Redimensionamentos do gráfico com Canvas presente e altura suficiente; geometria e largura das tabelas; títulos Vencimento/Situação não devem ser truncados no modo tabela quando visíveis.
- Cenários de janela com altura reduzida 390×667, 1366×600 e 1920×650; simulação de zoom de layout 125% em 1366×768 e 1920×1080. Zoom é cenário de CSS, não substitui teste manual com Chrome/Windows.
- Larguras iniciais do DataGrid **somente na Home** calibradas para 669px e 660px no desktop, sem alterar as colunas nem o DataGrid central. Continua possível arrastar largura e usar os controles próprios da grade.
- Sem mudança de fórmulas, filtros, totais, status e operações financeiras. Comparação real de capturas permanece obrigatória.


## 04/11/2026 | Resultado do QA e correção de cabeçalhos
- Primeiro gate ampliado `41854794010`: todas as larguras, alturas compactas, zoom e gráfico foram medidos; **4 falhas de legibilidade** localizadas no título **Vencimento** (1024, 1672, 1920, 2560px). Os dados não estavam ausentes; o rótulo do botão era truncado em até 18px.
- Ajustada a distribuição de larguras, preservando os cinco campos do DataGrid e o total de **660px**: Vencimento 150, Descrição 155, Origem 119, Valor 112, Situação 124. Nenhuma alteração no DataGrid compartilhado, ordenação, filtros, valores ou API.
- Teste existente mede `scrollWidth` e `clientWidth` dos rótulos para rejeitar títulos cortados. Reexecutar CI e confirmar Render no mesmo SHA.


## 04/11/2026 | Inspeção visual das capturas, valores financeiros
- CI `41855333315`: **SUCCESS**, 16 cenários, zero falhas; títulos Vencimento e Situação passaram sem truncamento em todas as larguras.
- Inspeção da captura inferior em 1920px identificou, porém, o valor `+ R$ 3.250,...` cortado na tabela de movimentações. **Não é aceitável ocultar parte de valor monetário**.
- Larguras da tabela de Movimentações realocadas, preservando o total de 669px: Data 105, Descrição 165, Categoria 145, Conta 114 e **Valor 140px**. Controles de filtro, ordenação, resize e conteúdo financeiro são preservados.
- Descrição/Conta/Origem longas mantêm texto integral no atributo `title`, visível no hover, sem alterar dados. Texto curto continua íntegro. Adicionado teste geométrico para identificar cortes de números em `strong` dentro de DataGrids desktop.
- Reexecutar CI, capturas e deploy Render do novo SHA. Home ainda **não homologada visualmente**.


## 04/11/2026 | Correção estrutural dos espaços laterais e verticais na Home
- **Diagnóstico confirmado no JSX:** o container `pano-finance-block` agrupava Fluxo e Benefícios, enquanto `pano-tables` vinha depois para ambos os DataGrids. A altura do gráfico fazia a tabela Próximos compromissos aguardar o fim da outra coluna, produzindo o vazio relatado pelo usuário.
- **Reconstrução limpa do trecho da Home**: agora há duas colunas independentes, `is-primary` = Fluxo financeiro → Últimas movimentações e `is-secondary` = Benefícios → Próximos compromissos. O espaçamento segue um gap regular, não a altura do gráfico vizinho.
- Em mobile/tablet (até 1023px), caixas genéricas usam `display:contents` e CSS `order` para preservar a leitura Fluxo → Benefícios → Movimentações → Compromissos; nenhuma informação foi removida.
- Para o grande vão lateral do wide, limite da Home passa de 93rem (1488px) para 134rem (2144px), com `margin-inline:auto`. O carrossel segue com limite de largura próprio e não é ampliado artificialmente.
- Testes medirão os vãos em ambas as colunas, a ordem de leitura móvel, a largura do container e a preservação de quatro atalhos e dos valores. Esta revisão é **candidata**, não homologada. CI, capturas e Render devem corresponder ao mesmo commit.
- Não foram alterados DataGrid compartilhado, fórmulas, APIs, banco, Android, Shell, nem Novo Lançamento homologado.


## 04/11/2026 | Correção da única regressão mobile detectada
- CI `41873483519`: compilação verde e novas verificações geométricas sem falhas em nove larguras, exceto **scroll horizontal interno em 320px**. Captura `resultados.json` mostrou `mainScrollWidth=422px` para `mainWidth=320px`, enquanto as duas seções DataGrid tinham largura computada de `402.47px` e o container raiz apenas `296px`.
- Causa real: o layout mobile usa `display:contents` para preservar a ordem de leitura e o pai flex permanecia com `align-items:start`, fazendo os DataGrids assumirem a largura intrínseca. Correção: `align-items:stretch` no pai flex e `width/max-width:100%` nas seções DataGrid; a rolagem de tabelas continua **dentro do DataGrid**, sem rolagem da página.
- Teste de navegador passa a medir explicitamente o `right` de cada painel contra o `right` da Home em mobile/tablet. Repetir CI e Render; não homologar automaticamente.


## 04/11/2026 | Alinhamento inferior dos dois DataGrids, conforme imagem do usuário
- O usuário esclareceu que não quer mostrar mais registros, e sim **preencher o espaço vazio abaixo de Próximos compromissos**, fazendo os dois DataGrids terminarem alinhados visualmente.
- Mantida a estrutura em duas colunas independentes que elimina o vão entre Benefícios e Compromissos. Em desktop com duas colunas, o grid externo usa `align-items:stretch` e os painéis DataGrid crescem até a base comum.
- O DataGrid da direita mantém **somente os quatro compromissos existentes** e expande a altura da tabela para distribuir essas linhas reais. Não cria informação, não recalcula valores, não muda a paginação, a ordenação ou os filtros.
- Em 1024px quando só couber uma coluna, tablet e celular, o comportamento natural continua, sem altura fixa. CSS limitado à Home da PR #655 e ao `@media(min-width:1024px)`.
- Novo gate geométrico compara a posição inferior dos dois rodapés (tolerância de 5px), preservação da quantidade de linhas reais, responsividade e valores. Nenhuma tela homologada ou regra financeira foi alterada.
- Revisão ainda **não homologada visualmente**. Exigir CI verde, Render LIVE no mesmo SHA e aprovação humana.


## 04/11/2026 | HOMOLOGAÇÃO VISUAL EXPLÍCITA DA HOME — PR #655
- Usuário declarou **“BOA, PARA MIM TA VALIDADO”** após inspecionar a Home no Render, incluindo o **alinhamento inferior dos dois DataGrids**, que eliminou o espaço vazio abaixo de Próximos compromissos.
- **Versão visual aprovada:** `dd0a472eee736558c224268c5bca096bc2d58187` da branch `preview/06-home-refino-preservado-20261104`; preview: https://meg-home-06-refino-pr655.onrender.com/fluxo-integrado-08.html?tela=home&v=dd0a472eee736558c224268c5bca096bc2d58187
- **Escopo exato:** Home visual na prévia, composição para telas responsivas, saldo/indicadores, carrossel de cartões, gráfico, Benefícios, quatro Ações rápidas (Transferência, Pagar conta, Relatórios e Configurações), botão Novo lançamento no topo, duas tabelas com rodapés alinhados no desktop e comportamento natural no mobile.
- **Congelamento:** não redesenhar nem alterar o visual aprovado sem solicitação explícita; novas correções estruturais devem preservar a composição. A homologação visual **não cobre** API operacional, integração de lançamentos financeiros, pagamentos, transferências, cartões de benefício multioperadora, demais telas ou produção.
- **Gate técnico do último código:** workflow `41879282835` ainda **em andamento** na consulta desta aprovação; status não deve ser declarado verde sem resultado conclusivo. PR #655 **Draft, sem merge** até passar CI, testes, gates e checagem do commit.
- **Próxima prioridade recomendada:** concluir gate técnico da Home e avançar para a próxima etapa autorizada pelo Prompt Master, **Lançamentos**, em chat/PR próprios. Correções globais no Shell e personalização futura de Ações rápidas em Configurações ficam registradas, mas não avançar prematuramente.
- Android congelado, DataGrid compartilhado e regras financeiras centrais preservados; Novo Lançamento (seletor) permanece homologado visualmente de forma independente.


## 04/11/2026 | GATE TÉCNICO CONCLUÍDO APÓS HOMOLOGAÇÃO VISUAL HOME
- **Confirmação posterior à aprovação do usuário:** workflow [41879282835](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/41879282835) alcançou status `completed` e conclusão **`success`** para o SHA visual `dd0a472eee736558c224268c5bca096bc2d58187`.
- A Home desse commit já estava **homologada visualmente pelo usuário**. A PR #655, contudo, permanece **OPEN / Draft / não mesclada**, e nenhuma publicação de produção foi autorizada. O SHA atual da branch no momento do registro anterior era `5ab6f2f888a741a2477ee73d6534de5e0349fd5e`, contendo apenas documentação após o commit visual.
- **Continuidade:** revalidar os checks obrigatórios e a cadeia de dependências de PRs antes de qualquer merge; preservar a versão visual aprovada. A próxima etapa/tela a tratar, em chat próprio, é **Lançamentos**, após leitura deste checkpoint e da autoridade financeira. Não alterar o Android nem antecipar funções.


## 04/11/2026 | ETAPA 09 — Lançamentos | PR #656 (candidata, NÃO homologada)
- **Etapa autorizada:** Lançamentos somente. Home PR #655, versão visual homologada `dd0a472eee736558c224268c5bca096bc2d58187`, e seletor Novo Lançamento PR #654, versão visual `28a2bd0f3b550c87958e78805f0ca1739e8adf62`, continuam congelados. PRs #654 e #655 abertas em Draft, sem merge.
- **Branch isolada:** `preview/09-lancamentos-20261104`; PR **#656 Draft**, base na PR #655 (`preview/06-home-refino-preservado-20261104@0e3ca5592d8d8458819dab4f8649ee26d1575aa8`). Não fazer merge ou promover a base sem gates.
- **Documento de auditoria:** `docs/MEG-WEB-ETAPA-09-LANCAMENTOS-AUDITORIA.md`, com mapa de regras/arquivos, divergências e requisitos não implementados.
- **Referência visual exclusiva:** imagem atual oficial de Lançamentos, `Imagem do ChatGPT 3 de out. de 2026, 16_54_48-4.png`, presente no Projeto.
- **Implementado somente como demonstração visual:** `launches/LaunchesStage09.tsx`, folha escopada `launches/launches-stage09.css` e rota `fluxo-integrado-08.html?tela=lancamentos`; filtros de consulta, DataGrid existente, 4 KPIs de read model existente quando aplicável, detalhes read-only e rosca rotulada como contagem por categoria. Sem API na demonstração nem operações de escrita. Dados vêm de `homePreviewFixture` já existente, jamais de valores novos digitados para imitar o print.
- **Preview dedicado Render:** `https://meg-lancamentos-09-pr.onrender.com/fluxo-integrado-08.html?tela=lancamentos&v=bfa3901d92c7c5c87d967263847d90e8eff53cca`. Ao compartilhar, usar SHA da versão efetivamente LIVE.
- **Gates próprios:** workflow `MEG Web Etapa 09 - Lançamentos isolados`, script `scripts/meg-stage09-lancamentos.browser.mjs`. Primeiro CI `41902483037` falhou por `db:generate` ausente no runner, não por regra financeira; corrigido workflow adicionando geração Prisma. Runs seguintes exigem verificação de conclusão.
- **Lacuna financeira objetiva:** loader de PR #646 pressupõe revisão de snapshot `revision`, não declarada na atual interface `FinancialEventPage` desta base. KPIs sob filtros arbitrários dependem de read model explícito da API. Não integrar PR #646 ou inventar total/saldo no React.
- **Divergências de prévia:** alguns campos (forma de pagamento e cartão) não estão disponíveis na fixture Home; mostrar ausência explicitamente. Painel de rosca por quantidade, não valor financeiro. Resumos financeiros ficam indisponíveis sob filtro customizado; necessidade de leitura canônica posterior.
- **Alterações proibidas e não feitas:** Android, API, domínio financeiro, DataGrid compartilhado, Shell compartilhado, visual Home, seletor Novo.
- **Pendências obrigatórias:** CI conclusivo do SHA de código, revisão de capturas nos viewports requisitados e zoom, validação visual **EXPLÍCITA** do usuário, contrato de leitura completo e integração de operações financeiras em etapas autorizadas. **Etapa 09 NÃO ENCERRADA.**

## 04/11/2026 | Etapa 09 — Ampliação do DataGrid e accordions por solicitação do usuário
- **Mudança explicitamente autorizada na conversa:** Lançamentos com gráficos e painel de detalhes recolhidos por padrão, expansão/recolhimento independente e maior espaço horizontal/vertical para muitas colunas.
- Implementação isolada **na PR #656 Draft**, branch `preview/09-lancamentos-20261104`: painéis complementares convertidos em accordions acessíveis acima do DataGrid, não ocupam coluna lateral. Grade usa 100% da largura mesmo com painéis abertos, sem rolagem horizontal do documento. A janela rolável da grade foi ampliada e o padrão de paginação alterado para 25 itens.
- Detalhes da linha selecionada abrem o painel explicitamente, sem editar/apagar; no mobile a expansão é inline, não modal. Estado inicial dos dois painéis é fechado. Os totais e dados permanecem os da demonstração controlada pela Home, sem cálculo financeiro novo.
- Arquivos: `apps/web/src/meg-web-evolution/launches/LaunchesStage09.tsx`, `launches-stage09.css`, `scripts/meg-stage09-lancamentos.browser.mjs`, workflow específico e documentação de auditoria. Sem mudanças na Home aprovada, seletor Novo aprovado, Shell/DataGrid compartilhados, Android, banco, API ou política financeira.
- CI: gates de financeiro, core, fonte única, DataGrid, TypeScript, Vite e Playwright atualizados para checar default fechado, botões acessíveis, abertura independente, seleção e viewport. **Não declarar gate verde até conclusão do run correspondente ao SHA final.**
- Render dedicado: https://meg-lancamentos-09-pr.onrender.com/fluxo-integrado-08.html?tela=lancamentos (adicionar `&v=<SHA LIVE>` para validação sem cache).
- **Situação:** implementação candidata à validação visual do usuário, **não homologada**. PR #656 permanece Draft sem merge. Lacunas de integração financeira descritas em `docs/MEG-WEB-ETAPA-09-LANCAMENTOS-AUDITORIA.md` continuam abertas; Etapa 09 não encerrada.


## 04/11/2026 | HOMOLOGAÇÃO VISUAL EXPLÍCITA — Lançamentos, PR #656
- **Aprovação do usuário neste chat:** “linduuu aprovado, caso tenha algo acrescentar”. Esta declaração aprova o **layout visual atualmente publicado da Etapa 09**, especificamente o DataGrid expandido em largura/altura, paginação inicial 25 e os painéis “Distribuição no período” e “Lançamento selecionado” recolhidos por padrão com expansão independente.
- **SHA VISUAL CONGELADO:** `61970409b834da102a5b6351d64a1e4776963678` da branch `preview/09-lancamentos-20261104`, PR [#656](https://github.com/MarcosVilalva/MEG-Platform/pull/656).
- **Prévia visual homologada, link sem cache:** https://meg-lancamentos-09-pr.onrender.com/fluxo-integrado-08.html?tela=lancamentos&v=61970409b834da102a5b6351d64a1e4776963678
- **Gate técnico do mesmo SHA:** [GitHub Actions #41921287908](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/41921287908), resultado `completed / success`: testes financeiros, core, fonte única, DataGrid, TypeScript, build isolado e Playwright em 8 viewports. O serviço Render correspondente estava `live`.
- **Congelamento:** não redesenhar ou acrescentar UI sem novo pedido/autorização explícitos. Home homologada `dd0a472...`, seletor Novo homologado `28a2bd0...`, Android congelado, Shell/DataGrid comuns e políticas financeiras preservados.
- **Escopo da aprovação é SOMENTE visual:** não homologa read model de dados reais, filtros financeiros canônicos, API de eventos, persistência, autenticação, edição/exclusão, baixa, pagamentos ou produção. A amostra permanece demonstrativa e read-only.
- **Pendências prioritárias da própria Etapa 09:** reconciliar contrato `GET /finance/events` versus loader de PR #646 que exige `revision`; implementar leitura operacional com autorização, paginação e estados; obter somatórios filtrados via autoridade financeira (não calcular saldo no React); mapear os dados efetivamente presentes, sem criar valores ou atributos falsos; reexecutar gates e testar a integração mantendo a apresentação homologada.
- **Situação:** Lançamentos **VISUAL HOMOLOGADO**, Etapa 09 **AINDA NÃO ENCERRADA** até concluir integração financeira segura, testes e validação aplicável. PR #656 permanece **Draft, sem merge**; não avançar para outra tela nem promover a produção antecipadamente.
 
## 04/11/2026 | Etapa 09 — Integração de leitura autenticada (após homologação visual)
- **Solicitação do usuário:** “pode prosseguir”. Escopo permanece **apenas Lançamentos**. Não avançar para outra tela.
- **Versão visual homologada congelada:** `61970409b834da102a5b6351d64a1e4776963678`, preview https://meg-lancamentos-09-pr.onrender.com/fluxo-integrado-08.html?tela=lancamentos&v=61970409b834da102a5b6351d64a1e4776963678. A PR #656 permanece aberta/Draft, sem merge. O fluxo de preview continua com dados sintéticos e não usa API.
- **Implementação operacional segregada:** novo `launches/authorized-history.ts`, `launches/OperationalLaunches.tsx`; `main.tsx` passou a abrir Lançamentos autenticados por navegação de `AppShell` (Home ⇄ Lançamentos), mantendo `HomeDashboard` visualmente intacta. No Shell autenticado, nome e período vêm da sessão/relógio de São Paulo, não de valores do preview. O CSS é o mesmo aprovado.
- **Leitura financeira:** `GET /finance/events` (máx. 100/página) via `financeClient` autenticado, AbortSignal e cache desativado. Duas passagens completas conferem número de registros, IDs e conteúdo; divergência bloqueia o DataGrid, filtros e exportações. **Sem revision no contrato**, a solução é detecção por varredura dupla, não snapshot transacional forte. `service.ts` inclui somente desempate de ordenação por ID; writers e cálculos financeiros inalterados.
- **Dados e KPIs:** contas/categorias/formas obtidas da API; valores usados somente para apresentação. KPIs operacionais do mês atual usam `/finance/summary` (receitas, despesas, resultado projetado/realizado), nunca somas no React. KPIs não são recalculados para filtro arbitrário; nesse caso são ocultos. Painéis recolhidos e grade em largura total continuam padrão. Filtros do formulário são mantidos durante atualização; persistência do DataGrid isolada por titular.
- **Gates adicionados:** build da Web autenticada no CI; navegador com sessão e rotas **simuladas** conferindo 101 registros / 2 páginas, verificação dupla, alteração concorrente, filtros preservados, read-only, desktop/mobile. A validação da API real em ambiente controlado ainda é necessária.
- **Limites de escopo:** Novo, edição, exclusão e baixa permanecem desabilitados na entrada autenticada, até contratos de writer/etapa própria. Preview isolado Render publica somente demonstração, não prova integração real. Sem homologação funcional do usuário, sem merge e **Etapa 09 ainda aberta**.
- **Documento detalhado:** `docs/MEG-WEB-ETAPA-09-LANCAMENTOS-AUDITORIA.md`. Consultar CI final do SHA documental para afirmar gates verdes.

## 04/11/2026 | Etapa 09 — Ícones Lucide e direções dos KPIs (candidato visual)
- Usuário questionou as direções invertidas de Entradas/Saídas e solicitou pacote mais moderno de ícones e ícones nas categorias do DataGrid. **Essa autorização é de alteração visual localizada, não homologação prévia da versão alterada.**
- Anterior: KPI Entrada `↓`, Saída `↑` (ambiguidade entre movimento de caixa e desempenho). Agora: **Entradas = tendência ascendente verde**, **Saídas = tendência descendente vermelha**. Ícones de Resultado e Saldo substituídos por gráficos/carteira da mesma família.
- **Pack adotado:** subconjunto de SVG Lucide obtidos de `lucide-icons/lucide`, licença ISC e aviso preservados em `apps/web/src/meg-web-evolution/launches/LaunchIcon.tsx`, empacotados localmente, sem CDN ou nova dependência. Aplicação restrita à Etapa 09.
- **Categorias da grade:** ícones por nomes existentes e correspondências visuais explícitas em `launches/category-icon.ts` (Mercado, Saúde, Transporte, Casa, Receitas, etc.); nomes desconhecidos exibem ícone genérico `tag`. Nenhuma regra de categorização é alterada. O grid mantém filtros/exportações; chip recebe SVG, com **largura original da coluna Categoria em 160 px**. Tentativa anterior de 188 px foi revertida após inspeção da captura de 1366px, pois comprimia Ações; rolagem horizontal restrita à tabela.
- **Arquivos alterados:** `LaunchesStage09.tsx`, `launches-stage09.css`, testes Playwright visual/operacional, documentação Etapa 09; `LaunchIcon.tsx` e `category-icon.ts` criados. APIs, financeiras, Home aprovada, Novo aprovado, Shell e DataGrid compartilhados, Android intocados.
- **Gates exigidos:** typecheck, build da prévia e Web autenticada, testes financeiros, 8 viewports da prévia e 2 da entrada autenticada, inspeção de capturas, Render LIVE e link com cache-bust.
- **Status:** o último SHA visual homologado continua `61970409b834da102a5b6351d64a1e4776963678`. A nova iconografia é **CANDIDATA**, exigindo aprovação visual EXPLÍCITA do usuário. PR #656 Draft, sem merge, Etapa 09 aberta.

## 04/11/2026 | Etapa 09 — Phosphor candidato principal, Tabler comparativo
- Usuário autorizou a recomendação de **Phosphor como linguagem principal** com **teste comparativo visual com Tabler antes de replicar a outros módulos**, ao dizer: “Vamos seguir com sua recomendação”. Esta autorização **não configura homologação visual**.
- Branch isolada `preview/09-lancamentos-20261104`, PR #656 Draft. Substituição exclusivamente interna à tela **Lançamentos**, inclusive preview: `?tela=lancamentos&icones=phosphor` (padrão) versus `?tela=lancamentos&icones=tabler`; compartilhar URL sem cache com `&v=<commit-live>`.
- Implementado adaptador `launches/LaunchIcon.tsx` e oito subconjuntos de SVG em `launches/icon-packs/`. Phosphor Core Regular e Duotone em KPIs, Tabler Outline para comparação. SVGs oficiais com avisos MIT, empacotados localmente; nenhum recurso externo em tempo de execução, nenhuma nova dependência.
- Preservadas caixas de ícones de 16/17/19/20/25 px conforme tamanho original. Phosphor tem viewBox interno 256; Tabler, 24; o tamanho final não muda. Coluna de categoria permanece em 160 px com rolagem somente dentro do DataGrid. Autocomplete, saldos, pagamentos, parcelas, valor monetário, API e autorização permanecem inalterados.
- Gating visual do experimento: capturas 390/768/1024/1366/1920/2560 e alturas compactas **para ambas as versões**; verificar ainda ações, filtros, largura da página e limites dos SVG. Preservar módulos Home e Novo homologados, Shell e DataGrid compartilhados e Android (congelado).
- O **único SHA homologado visualmente antes do experimento** continua `61970409b834da102a5b6351d64a1e4776963678`; a prévia Lucide posterior não recebeu aprovação explícita. **Nunca declarar Phosphor ou Tabler aprovados antes de nova confirmação do usuário.**
- Próximo passo **sem mudar de etapa**: publicar comparações e colher aprovação visual para Phosphor ou Tabler em Lançamentos. Padronização global fica **pendente**, não executada aqui. A integração financeira real da Etapa 09 também continua pendente e não está homologada.

## 04/11/2026 | Decisão final de identidade iconográfica: Phosphor
- **Aprovação explícita do usuário após comparar imagens reais:** “seguir com Phosphor”. Escolhido **Phosphor Icons como padrão de iconografia do MEG Web**. O protótipo de Lançamentos com Phosphor é o referencial visual aprovado para estes ícones; não implica re-homologação da Home ou de outras telas.
- Padrão definido: **Regular** nos controles e categorias, **Duotone** nos KPIs de destaque; viewBox original 256, caixas finais em 16/17/19/20/25 px conforme os componentes. Cores continuam semânticas. Proibido alterar cálculo de saldos, status, parcelas ou classificação financeira para escolher ícones.
- **Etapa atual 09 apenas:** `LaunchIcon.tsx` consolidado com Phosphor-only, 4 módulos Tabler experimentais removidos; `LaunchesStage09.tsx` fixo em Phosphor e `integrated-preview/preview.tsx` não requer `&icones`. Testes voltam a cobrir Phosphor em oito viewports; comparação Tabler arquivada em commits/capturas anteriores. Categorias desconhecidas mantêm o rótulo original e ícone neutro, sem reclassificação.
- **Continuidade entre telas:** adotar Phosphor progressivamente nas etapas específicas de cada tela, com adaptação semântica e dimensões preservadas, respeitando prints oficiais e a aprovação visual individual. **Nenhuma alteração global da Home, Novo Lançamento, Shell/DataGrid compartilhado ou Android realizada nesta etapa.** Não avançar prematuramente.
- PR #656 continua **Draft e sem merge**; sem declaração de encerramento funcional da Etapa 09. Integração com API real, consistência/snapshot do read model, resumo financeiro filtrado e writers continuam lacunas. CI/build/deploy precisam ficar verdes no SHA final e não equivalem a homologação operacional.

## 04/11/2026 | Etapa 09 — captação real preparada; deploy público BLOQUEADO
- **Pedido do usuário:** “siga agora com a captaçao de dados reais o q vc acha”. A Etapa 09 continua única autorizada neste chat. Phosphor e layout Lançamentos já homologados permanecem preservados.
- **Fonte de verdade:** API oficial de produção `meg-platform-api.onrender.com`; rotas autenticadas `GET /finance/events` (100 por página), `/finance/summary`, `/finance/accounts`, `/finance/categories`, `/finance/payment-methods`, `/finance/sync-status`. Leitor de Lançamentos usa duas passagens sem cache com ids/ordem/conteúdo e compara token de sincronização antes/depois. Nenhum cálculo de saldo ou escritor na UI.
- **Arquivos criados:** `scripts/meg-stage09-readonly-gateway.mjs` (gateway Node same-origin, sem finanças POST/PATCH/DELETE), `scripts/meg-stage09-readonly-gateway.test.mjs` (teste com backend simulado), `scripts/meg-stage09-origin-probe.mjs` (CORS sem dados), `scripts/meg-stage09-real-local.sh` (um comando para Codespaces). Alterados: `OperationalLaunches.tsx` (token), `main.tsx` (link direto autenticado), teste navegador, workflow, auditoria. **Dados reais não foram capturados pelo assistente** sem login da conta.
- **Modo real local/privado:** no branch `preview/09-lancamentos-20261104` do Codespaces, executar `bash scripts/meg-stage09-real-local.sh`, abrir port 4178 como **PRIVATE** e acessar `/web-evolution.html?tela=lancamentos`. Login da própria conta existente no browser; não enviar senha ao chat. Gateway é de revisão e bloqueia todas as gravações financeiras em HTTP. O Render visual não tem essa rota.
- **Bloqueio confirmado:** Render recusou novo serviço gratuito por **25/25 serviços Hobby**. CORS da API recusou as três OPTIONS do domínio `meg-lancamentos-09-pr.onrender.com` com **HTTP 500 e sem Access-Control-Allow-Origin**. Publicar login na estática criaria tela quebrada; build com a entrada autenticada foi revertido no `vite.fluxo-integrado-08.config.ts`, sem mudar a prévia visual homologada. **Não mexer em CORS_ORIGINS da API de produção por suposição.**
- **Próximo passo para URL pública real:** o usuário precisa decidir manualmente liberar uma vaga na conta Render para um gateway gratuito separado, mantendo serviços homologados intactos; após isso criar serviço na branch da Etapa 09 com o gateway já testado. Não eliminar nenhum serviço sem aprovação explícita.
- **Pendente:** validar login e contagem contra conta real no ambiente privado, snapshot revisional forte da API, totais financeiros sob filtros arbitrários, writers autorizados só nas etapas próprias. Não homologar operacional, não encerrar Etapa 09, não fazer merge da PR #656 sem gates e aprovação pertinente.

## 05/11/2026 | Etapa 09 — validação de dados reais sem Codespaces
- Autorização: usuário deseja validar com dados reais sem Codespaces e sem exportar dados privados ao repositório. **Não incorporar lançamentos particulares como fixtures públicas, commits, assets ou mocks.** API oficial MEG mantém autenticação, ownership e cálculo canônico.
- Supabase `meg-financas` confirmado como fonte persistida em consulta agregada somente leitura: **6.576** eventos, dos quais **3.731 ativos** e **2.845 arquivados**. 47 categorias, 2 contas, 1 dono de eventos. Ativos: 2.759 `expense/paid`, 646 `income/paid`, 326 `expense/planned`. Nenhum valor ou descrição individual foi lido/compartilhado.
- **Achado operacional significativo:** 3.626 ativos sem `categoryId` e 3.512 sem `paymentMethodId`. Não possuem `ImportedRow` ativo relacionado. O `sourcePayload` original contém rótulo `category` para todos os 3.626 e `paymentMethod` para todos os 3.512. A UI Etapa09 agora **mostra o rótulo literal existente**, sem mudar qualquer vínculo ou regra; filtro de categorias históricas usa prefixo `legacy:` para não colidir com IDs canônicos. Teste sem dados reais adicionado ao Playwright.
- A tentativa de proxy Supabase Edge em projeto separado `meg-evolution` foi **bloqueada com HTTP 402 pela plataforma no preflight**, apesar de deploy declarado ACTIVE. Função substituída por stub de desativação `410`; arquivos experimentais retirados da branch. **Não há acesso real por Edge**. Render também recusou serviço adicional devido ao limite Hobby de 25 serviços.
- **Solução principal preparada fora da PR visual:** [PR #657](https://github.com/MarcosVilalva/MEG-Platform/pull/657) Draft, base main, permite somente a origem exata `https://meg-lancamentos-09-pr.onrender.com` na API oficial, com gate `GET` para leitura, `POST` apenas para login/refresh/logout, bloqueio de todas as operações financeiras de escrita a partir dessa origem. Preserva Android e demais origens. **Sem merge ou deploy de API sem autorização.**
- **Atenção gate técnico independente:** pipeline geral da PR #657 bloqueado pelo advisory de segurança high do pacote `zod` no lockfile, não causado pela alteração de CORS. Não tratar como verde ou contornar o gate.
- **Rota de continuidade:** obter gates verdes da PR #657, aprovação expressa para merge/deploy de alteração controlada da API, depois publicar `web-evolution.html?tela=lancamentos` no Render isolado de PR #656 usando a API diretamente. Validar via login real no browser, sem solicitar senha no chat. Não liberar writes, não alterar layouts Home/Novo, não modificar Android, não encerrar Etapa 09 prematuramente.


## 05/11/2026 | Etapa 09 — acesso autenticado real publicado, sem Codespaces
- **Autorização:** usuário disse “Siga” para resolver segurança da API e publicar leitura dos dados reais sem Codespaces. Trabalho permanece limitado à Etapa 09, preservando Home, Novo, Android e Phosphor homologados.
- **PR #658 (segurança) incorporada** na main com CI geral verde [#42026464025](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42026464025), commit `db3219517998c1cd726c0ea3453922f5ad4535e9`. Zod atualizado de 3.25.76 para 4.6.7 nos manifests API/Web e no lock autêntico, sem alterações de código Android. Auditoria high e suíte completa concluídas; apps Android instalados não foram testados contra o upgrade.
- **PR #657 (CORS por origem exata e bloqueio de writers) incorporada** na main, commit `222cee8c563ee853ccbb12228e24a100c5e601b4`; CI geral [#42027114023](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42027114023) e CORS específico [#42027113994](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42027113994) verdes. Render API `meg-platform-api` LIVE no commit. Origem exclusiva `https://meg-lancamentos-09-pr.onrender.com`, GETs de leitura autenticada, POST apenas login/refresh/logout, demais escritores da origem HTTP 405. Regras de workspace/JWT existentes obrigatórias.
- **PR #656 Web permanece Draft, sem merge.** `vite.fluxo-integrado-08.config.ts` publica a entrada visual demonstrativa `/fluxo-integrado-08.html?tela=lancamentos` e, separada, entrada autenticada para leitura real `/web-evolution.html?tela=lancamentos`. Ambiente isolado Render `meg-lancamentos-09-pr` confirmado LIVE no commit `0512df8edf3a3b5c6760ed7722d8ce176694d5bb`; CI [#42027715633](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42027715633) success, incluindo teste CORS OPTIONS real e Playwright 8+2 viewports, estes últimos com API simulada. Mudanças subsequentes somente documentais exigem reconferir SHA LIVE antes de informar link.
- **Link autenticado para validação pessoal, sem cache:** `https://meg-lancamentos-09-pr.onrender.com/web-evolution.html?tela=lancamentos&v=0512df8edf3a3b5c6760ed7722d8ce176694d5bb`. Entrar com conta MEG preexistente **no navegador, jamais compartilhar credenciais no chat**. Os lançamentos vêm diretamente da API em tempo de consulta; NÃO há cópia de dados privados em GitHub, bundle ou mocks.
- **Link somente visual/demonstrativo, sem cache:** `https://meg-lancamentos-09-pr.onrender.com/fluxo-integrado-08.html?tela=lancamentos&v=0512df8edf3a3b5c6760ed7722d8ce176694d5bb`.
- **Ainda não homologado:** nenhum login real foi efetuado pelo assistente, nem totais ou registros de conta particular conferidos visualmente no navegador. Um usuário autenticado deverá validar os registros. Snapshot transacional forte e totais com filtros financeiros arbitrários permanecem pendentes. Os controles financeiros de edição, pagamentos e baixa seguem indisponíveis na Etapa 09. Visual Phosphor validado, funcional operacional ainda NÃO. Sem merge #656 e sem avançar a outras etapas.


## 05/11/2026 | Etapa 09 — auditoria real de paginação e desempate corrigido
- **Autorização de continuidade:** usuário disse “vamos la fazer o q falta entao”. Mantida a etapa exclusivamente de Lançamentos, sem alterar visual Phosphor ou outras telas.
- **Auditoria agregada direta no banco MEG (`meg-financas`, somente SELECT):** 6.576 lançamentos totais, **3.731 ativos**, **2.845 arquivados**, um único proprietário; no histórico ativo, **49 em novembro/2026**, 116 em outubro/2026, 241 em setembro/2026 e 233 em agosto/2026. Essas contagens são do banco no instante da consulta, não da sessão browser; podem mudar com novos movimentos.
- **Catálogos históricos read-only:** 3.626/3.731 ativos sem `categoryId` e 3.512/3.731 sem `paymentMethodId`, mas **todos esses registros mantêm um rótulo correspondente em `sourcePayload`**. A tela utiliza fallback textual sem reclassificar, sem alterar IDs e sem criar vínculo cadastral.
- **Risco de integridade encontrado:** `GET /finance/events` na API main ordenava por `date DESC, createdAt DESC` sem chave única. No banco, **3.477 eventos ativos em 371 grupos de mesma data + mesmo `createdAt`**, sendo 117 no maior grupo (excede a página de 100). Sem desempate, `skip/take` pode duplicar ou perder eventos entre páginas.
- **Correção isolada em [PR #659](https://github.com/MarcosVilalva/MEG-Platform/pull/659):** último desempate `{id:'asc'}` após `date DESC, createdAt DESC` em `apps/api/src/modules/finance/service.ts`; novo contrato anexado em `apps/api/src/modules/finance/web-evolution-characterization.test.ts` cobre ordenação e fronteira de 117 eventos (100+17). **CI geral [#42044132598](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42044132598) e CI CORS/finance [#42044132389](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42044132389) verdes.** PR incorporada na main por squash `28703a95310c9b9b5f193ef4f3a0cbe80e121f07`. Zero alteração de saldos, regras, ações de escrita, tabelas, dados persistidos ou Android.
- **Prévia Web read-only autenticada existente:** `https://meg-lancamentos-09-pr.onrender.com/web-evolution.html?tela=lancamentos&v=fa41df40b80659b2710b0f2e4ed21ec52c791d18`. O HTML continua na PR #656 Draft, isolada. A API central passou a oferecer ordenação determinística; isso não é snapshot transacional. **Não afirmar homologação da sessão real enquanto usuário não abrir a URL, autenticar e confirmar contagem, filtros e rótulos.**
- **Último gate necessário:** usuário entra no link direto com sua conta MEG já existente, verifica **49 registros em novembro/2026** e **3.731 ativos no histórico total** (ou identifica diferença por novos lançamentos), testa filtro mês/categoria/conta, e informa se há erro de login/API ou captura da tela. **Não compartilhar senha ou token**. Sem essa confirmação visual/operacional, não encerrar Etapa 09 ou fazer merge da PR #656.
- **Outras lacunas não resolvidas:** falta contrato forte de snapshot/revision da leitura paginada; KPI de período arbitrário continua indisponível intencionalmente, porque requer resumo canônico no backend; operações de escrita só podem ser tratadas na etapa adequada. A UI não deve calcular saldo ou totais financeiros próprios.


## 05/11/2026 | Etapa 09 — carregamento visível e sidebar compacta
- **Evidência do usuário:** login real abriu a rota autenticada de Lançamentos; captura em janela estreita mostrou mensagem "600 de 3.731 registros" e a grade ainda não exibida. **Não afirmar falha de renderização:** o código deliberadamente só libera a grade após duas leituras integrais; o print mostra leitura em andamento, não erro comprovado.
- **Ajuste isolado na PR #656:** `authorized-history.ts` mantém validação de contagem, paginação, IDs únicos, ordem e comparação de duas passagens, mas processa até quatro requisições de páginas por lote após a primeira página. Nenhum evento parcial é publicado; não há writer nem recálculo financeiro na Web. Snapshot transacional segue pendente.
- **Feedback visual atendido na branch:** `OperationalLaunches.tsx` exibe painel de progresso e skeleton sem valores inventados enquanto consulta; `launches-stage09.css` reequilibra ícones da sidebar compacta apenas quando `AppShell` está em Lançamentos operacional (`is-launches-operational`). Home, prévia visual e Android permanecem sem alterações na composição aprovada.
- **Testes adicionados:** navegador cobre estado de carregamento antes da grade, distribuição da sidebar compacta em 960×900, leitura simulada de 3.731 registros em 38 páginas com duas passagens, filtros e bloqueio de dados parciais/alteração concorrente. Testes anteriores de visual continuam obrigatórios.
- **Estado:** alterações na branch de PR #656 Draft; validar o CI no head final, conferir deploy LIVE e obter inspeção do usuário com sua sessão real antes de considerar a etapa operacional homologada ou autorizar merge. A Home operacional com dados reais não pertence à aprovação desta etapa.

## 05/11/2026 | Etapa 09 — colunas adicionais dos lançamentos reais
- **Feedback visual do usuário:** a carga autenticada concluiu e o DataGrid mostrou os lançamentos, mas somente as sete colunas básicas do print oficial (Data, Descrição, Categoria, Conta/Cartão, Forma de pagamento, Valor, Ações). O usuário observou que nem todas as colunas dos dados estavam presentes.
- **Correção na PR #656 (Draft):** a visualização `mode=live` recebeu onze colunas adicionais, todas de leitura: Tipo, Status, Competência, Tipo original, Classificação original, Grupo original, Situação original, Modalidade original, Dia da semana, Observações e Observações originais. Ações e as sete colunas de referência permanecem no início da grade. Não se altera o `mode=preview`, o print homologado, a Home ou o Android.
- **Fonte de dados:** Tipo/Status/Competência são exibidos dos campos canônicos da API sem recálculo. Demais colunas usam texto de `sourceDetails` ou, quando presente, rótulos textuais literais de `sourcePayload`. Não fabricar histórico ausente nem alterar categorias, forma de pagamento ou situação canônica.
- **Interação:** o DataGrid mantém a ordenação, filtros, menu Seletor de colunas, persistência de preferências e rolagem horizontal interna no desktop; a busca textual da página passa a incluir campos adicionais. Sem writer financeiro nesta etapa.
- **Testes:** fluxo de navegador alterado para verificar todas as colunas, recuperação de rótulos de origem, rolagem horizontal e 3.731 eventos sintéticos em duas leituras; CI deve ficar verde no SHA final. Controles de edição, baixa e escrita continuam bloqueados.
- **Pendências:** validação visual e operacional explícita com conta real após deploy do commit final, conferência de campos historicamente não preenchidos, snapshot transacional de leitura e totais canônicos para filtros arbitrários. Sem merge da PR #656 e sem encerrar Etapa 09 antes da homologação.


## 05/11/2026 | Etapa 09 — revisão do DataGrid, modal de consulta e auditoria de receita/despesa
- **Feedback visual ainda não homologado:** usuário observou `Ações` perdido no meio da grade, painel aberto de detalhes confundindo com a lista e redundância entre `Tipo` e `Tipo original`, `Status` e `Situação original`, `Categoria` e `Classificação original`. Solicitou preservar o histórico e questionou unificação das colunas de receita/despesa.
- **PR #656, apenas modo autenticado:** `Ações / Ver` passa a ser a primeira coluna após seleção, antes de Data/Descrição; abre modal responsivo de leitura (Escape, retorno de foco, fecho por botão/backdrop, bloqueio de escrita). A prévia demonstrativa homologada mantém a disposição anterior. O painel lateral de detalhes deixa de aparecer no modo real; o gráfico permanece recolhido inicialmente.
- **Redução de redundância sem descarte de dados:** grade operacional exibe os sete campos básicos aprovados e somente `Tipo`, `Status`, `Competência` adicionais. Rótulos históricos `launchType`, `expenseClass`, `group`, `situation`, `modality`, `weekday`, `historicalNotes` continuam disponíveis em seção expansível “Dados originais do histórico” no modal e no adaptador de leitura, sem mutação no banco. Colunas históricas foram removidas da grade, não do dado persistido. Persistência específica `stage09-launches-live-v2` reinicia apenas as preferências da grade autenticada para fixar a nova ordem padrão; não muda preferências Home ou filtros gerais.
- **Auditoria da proposta de unificar receitas e despesas:** `packages/database/prisma/schema.prisma` já define a tabela canônica única `FinancialEvent`, com `type` e campos Decimal `amount` e `signedAmount`. `apps/api/src/modules/finance/amount-sign.ts` calcula o sinal no writer central, e `financial-policy.ts` decide políticas/status. As colunas `incomeAmount` e `expenseAmount` aparecem no contrato de compatibilidade `BulkLegacyTransactionPatch` em `apps/web/src/app/finance-client.ts`. `LedgerEntry.debit/credit` são campos de escrituração, não uma duplicidade a eliminar. **Sem migração, alteração de esquema, writer, cardinalidade ou saldos neste chat.** Qualquer limpeza definitiva de dados legados exige levantamento de origens, testes de caracterização, plano de reconciliação/rollback e autorização separada.
- **Condições de segurança e validação:** testes devem verificar modal, foco/ESC, valor lido, campos originais preservados e nenhuma operação de escrita. CI/build não equivalem a aprovação visual; PR permanece Draft, Android/ Home/ Novo não alterados, nenhuma homologação operacional sem usuário validar na prévia LIVE do commit final.


## 05/11/2026 | Etapa 09 — APROVAÇÃO VISUAL EXPLÍCITA da revisão operacional
- **Manifestação direta do usuário:** "FICOU EXCELENTE, POR MIM APROVADO, MAS CASO QUEIRA SUGERIR ALGO FIQUE A VONTADE".
- **Escopo aprovado:** composição visual autenticada de Lançamentos apresentada na revisão `b1a1f144937ad73ce5d38a4b6e16745ae18bd0f4`, incluindo a coluna `Ações / Ver` logo no início, modal de consulta em vez do painel lateral, redução das colunas duplicadas e preservação dos rótulos históricos dentro do modal. **Essa aprovação não autoriza redesign espontâneo, alteração do print oficial ou avanço de etapa.**
- **Gate técnico da revisão aprovada:** workflow `MEG Web Etapa 09 - Lançamentos isolados` [#42060024763](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42060024763) finalizou `success`. A PR #656 ainda estava Draft e sem merge na conferência de 05/11/2026.
- **O que esta homologação NÃO prova:** não constitui validação integral de operações de escrita, resumo financeiro sob filtros arbitrários, snapshot transacional entre múltiplas páginas, disponibilidade da prévia LIVE no Render ou homologação das demais telas. A Etapa 09 segue com pendências funcionais reais e não é declarada encerrada.
- **Próxima prioridade sugerida (sem autorização de implementação neste registro):** substituir gradualmente a estratégia de duas leituras completas por um contrato de paginação consistente/snapshot da autoridade financeira, sem somas na Web, sem alterações de dados existentes e com testes financeiros de caracterização. Qualquer mudança de comportamento, migração ou merge demanda gates correspondentes.


## 05/11/2026 | Etapa 09 — UX autorizada: cabeçalho sticky e maximização do DataGrid
- **Autorização expressa:** após o usuário aprovar a revisão visual `b1a1f144`, solicitou o banner “Lançamentos” fixo enquanto o restante rola por trás sem vazamento/sombra e um botão que maximize a tabela dentro da área útil do MEG. Respondeu **“ESCELENTE, PODE SEGUIR”** à proposta. **Esta autorização é de implementação, não homologação visual do resultado.**
- **Implementado SOMENTE na Etapa 09 autenticada:** `LaunchesStage09.tsx` adicionou moldura sticky para o cabeçalho com máscara opaca e modo foco reversível para a grade; `launches-stage09.css` aplica o sticky ao scrollport de `.meg-main`, não à janela, com fundo opaco sem transparência residual. A topbar/sidebars permanecem fora do overlay. Não há regra financeira na interface.
- **Modo foco:** botão “Maximizar tabela” no início do painel da grade e “Restaurar visualização” ao expandir, com `aria-pressed`, `aria-controls` e saída por Escape. Oculta temporariamente hero, KPIs, nota, gráfico e resumo; mantém filtros, toolbar, DataGrid, scroll próprio, exportação, seleção e dados. Retorna ao scroll anterior quando sai. **Não usa fullscreen do navegador.**
- **Preservação:** o modo demonstração anterior e sua referência oficial não recebem sticky nem botão; API, domínio financeiro, Home, Novo e Android intactos. PR #656 continua Draft, sem merge.
- **Gates técnicos:** testes Playwright adicionados em `scripts/meg-stage09-operational.browser.mjs` para sticky opaco após scroll, grade ampliada restrita ao espaço da shell, restauração, Esc e três viewports autenticados, além dos oito de regressão visual. Workflow [#42067291703](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42067291703) **SUCCESS** para o commit `232f2d2e55ff7bae48f2da1dbdd55dd75524e191`, incluindo contratos financeiros. Nenhuma mudança de escrita.
- **Pendente:** confirmação de que o Render publicou a revisão e **nova aprovação visual explícita do usuário** para sticky/mode foco (não transferir a aprovação visual anterior para o novo estado). Snapshot transacional e KPIs com filtros arbitrários não foram implementados aqui. Não encerrar Etapa 09 nem merge antes dos gates restantes.

## 05/11/2026 | Etapa 09 — homologação visual do cabeçalho sticky e modo foco em 05/11/2026
- **Aprovação explícita do usuário:** “validadooooo, tem algo a acrescentar?” em resposta à prévia da PR #656 com cabeçalho Lançamentos fixo e máscara opaca, mais botão Maximizar tabela/Restaurar visualização dentro da área útil do sistema.
- **Escopo homologado:** somente comportamento visual e de interação dos dois refinamentos na tela autenticada Lançamentos. Preserva a homologação anterior do DataGrid, coluna Ações/Ver, modal de consulta e colunas consolidadas. Não altera Home, Novo, referência visual oficial ou Android.
- **Código autorizado e testado:** revisão de implementação `232f2d2e55ff7bae48f2da1dbdd55dd75524e191`; CI [#42067291703](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42067291703) success. O checkpoint documental subsequente `0e93e3e9940093888c5f7f31cf1ceef3761141cf` também passou no CI [#42067969043](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42067969043).
- **Decisão:** congelar o visual aprovado; não introduzir modificações estéticas espontâneas. Priorizar, como pendências técnicas da mesma Etapa 09, leitura paginada com consistência/snapshot/revisão no backend e indicadores canônicos compatíveis com filtros. Nada de cálculos financeiros na Web.
- **Limites da aprovação:** não equivale a validação de migração legada, escrita financeira, liquidação/pagamento, snapshot forte, todas as combinações de filtros ou demais telas. PR #656 permanece Draft e sem merge, aguardando gates funcionais/operacionais aplicáveis. Não declarar encerrada a Etapa 09.

## 05/11/2026 | Etapa 09 — sidebar compacta e snapshot do histórico financeiro
- **Feedback novo ainda sem homologação visual:** screenshot do usuário em 960px de largura mostrou ícones da sidebar compacta agrupados acima do rodapé e espaço ocioso até Sair. Solicitou distribuição efetivamente uniforme e autorizou a sequência da prioridade de desempenho.
- **Refino isolado:** `launches-stage09.css` remove apenas na navegação compacta da rota Lançamentos a reserva da arte decorativa; `.meg-nav` passa a ocupar todo o espaço útil do logotipo até o rodapé, com `justify-content:space-evenly` e scroll próprio para futuros ícones. Nenhuma alteração no shell compartilhado ou nas referências visuais homologadas da Home/Android. Teste de navegador 960×900 verifica máscara, cobertura da altura, espaçamento e distância ao rodapé.
- **Leitura inteligente sem writer:** nova rota autenticada `GET /finance/events/history-snapshot` reutiliza a autoridade de propriedade financeira (`financialDataOwnerId`) e consulta `FinancialEvent` não arquivado com vínculos e dados originais em **uma transação Prisma REPEATABLE READ**; mesma ordem canônica do endpoint antigo. Limite defensivo de 5.000 eventos por resposta, com `kind: limit-exceeded` acima do limite e nenhum dado parcial. Não altera modelos, schema, valores, classificações ou operações do Android.
- **Cliente Web:** `readSmartAuthorizedHistory` prefere snapshot completo, valida protocolo, total, contagem e IDs únicos, continua validando sync-status antes/depois e nunca expõe resultados parciais. Fallback protegido para endpoint ausente (404/405/501) ou limite excedido, mantendo a leitura histórica de duas passagens; falhas 500/503 e respostas inconsistentes são exibidas, não escondidas. `OperationalLaunches` comunica consulta no servidor ou verificação em duas passagens.
- **Gateway seguro:** allowlist de `scripts/meg-stage09-readonly-gateway.mjs` ganhou somente GET da nova rota. Teste exige Bearer, proíbe POST e exige não-cache. Sem secrets, sem contas pessoais copiadas, sem API de escrita.
- **Gates verdes:** workflow `MEG Web Etapa 09 - Lançamentos isolados` [#42072657538](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42072657538) **SUCCESS**, cobrindo testes financeiros, contrato da API, typecheck API/Web, gateway, renderização em 8 viewports e fluxo operacional em 1366×768, 960×900 e 390×844. Simulação compara snapshot (1 requisição HTTP de histórico) e fallback (76 requisições em 3.731 eventos).
- **PENDÊNCIAS REAIS:** deploy do novo contrato na API real NÃO confirmado; enquanto não houver deploy, o preview utiliza fallback lento com consistência anterior. Também pendem teste real de desempenho com dados do usuário, aprovação visual explícita da sidebar corrigida, snapshot conjunto dos KPIs e catálogos, totais canônicos sob filtros arbitrários e eventual auditoria de legado. A PR #656 segue Draft e sem merge, não declarar a Etapa 09 encerrada.

## 05/11/2026 | Etapa 09 — recuperação após erro Failed to fetch na consulta autenticada
- **Evidência:** usuário enviou print com mensagem “Failed to fetch Nenhum resultado parcial foi publicado.” ao abrir Lançamentos, após a integração do snapshot opcional; não há evidência de alteração/remoção de dados e o shell autenticado abriu normalmente. Causa raiz exata de rede/proxy não foi reproduzida na sessão real; falha de compatibilidade entre Web antecipada e backend/proxy não atualizado é hipótese material e foi protegida.
- **Correção na PR #656:** `GET /finance/sync-status` retorna `capabilities.historySnapshotV1: true` apenas na API com o novo endpoint; versões anteriores não possuem esse campo. `OperationalLaunches` só solicita `/finance/events/history-snapshot` se a capacidade estiver explicitamente anunciada. Na ausência, usa diretamente `readAuthorizedHistory`, com duas passagens, contagem, ordem, IDs e token antes/depois verificados. Nenhum registro parcial, mock ou cálculo financeiro é publicado.
- **Falha de transporte específica do endpoint opcional:** `readSmartAuthorizedHistory` agora usa fallback somente para `Failed to fetch`, `NetworkError`, `Load failed` do `fetch` e HTTP 404/405/501 ou limite excedido. Resposta inválida, erro HTTP 500/503, inconsistência do snapshot e falha posterior da API antiga permanecem bloqueantes. Não ocultar falhas da autoridade financeira; mensagem de falha geral de conexão agora é compreensível em pt-BR.
- **Testes reforçados:** contrato integrado verifica anúncio da capacidade, Web não chamar a nova rota sem o anúncio, recuperação por TypeError de transporte, manutenção da dupla verificação, erro da API legada e bloqueio de respostas inválidas. Playwright autentica: 1366px backend novo/snapshot, 960px backend antigo sem capacidade e 390px falha real de transporte simulada com fallback. Resultado técnico: [CI #42087326878](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42087326878) **SUCCESS**.
- **Preservação/limites:** nenhuma mudança de Home, Novo, Android, UI aprovada, schema, escritor financeiro ou registros do usuário. A PR #656 permanece Draft e sem merge. **Não afirmar que o Render publicou o novo commit nem que o acesso real foi restabelecido sem teste da sessão do usuário.** Requer confirmação do deploy de frontend e validação do usuário no preview real. Caso a API antiga também falhe, investigar upstream/rede em vez de reduzir os gates de consistência.

## 05/11/2026 | Etapa 09 — gate PostgreSQL efêmero e status real do Render
- **Retomada autorizada:** usuário pediu seguir a recomendação de validar implantação e medir desempenho do carregamento financeiro inteligente, sem alterar visual homologado ou avançar para outra tela.
- **Render verificado com a integração oficial, sem inferir deploy:** serviço `meg-lancamentos-09-pr` é Static Site no Render, branch `preview/09-lancamentos-20261104`, autoDeploy; último deploy confirmado como LIVE `dep-dbmcv8ajnfac739a6jgg` no commit `cd7eb520faedd9a809acd82a7b8ea02b4f62f84e` de 05/11/2026. Serviço `meg-platform-api` é Web Service ligado à `main`; último deploy LIVE `dep-dbm92b17lnhs738s0jr0` no commit `28703a95310c9b9b5f193ef4f3a0cbe80e121f07`. **Este commit da API é anterior ao endpoint `/finance/events/history-snapshot` da PR #656.** Assim a dupla leitura dos 3.731 registros continua sendo o caminho esperado, não falha de publicação da Web.
- **Risco identificado no deploy da API:** o buildCommand do serviço principal Render executa `npm run db:prepare:production && npm run db:push:production`; o último script inclui `prisma db push --accept-data-loss`. **Nunca disparar deploy da API só para ativar snapshot sem revisão explícita do impacto no banco, gates de schema/rollback e autorização.** Não executar migrations, db push, merge ou writer nesta etapa.
- **Novo gate independente em `.github/workflows/meg-stage09-lancamentos.yml`:** job `snapshot-postgres-sintetico` usa PostgreSQL 16 local DESCARTÁVEL do GitHub Actions, banco `meg_stage09_ci`, com guard de URL para impedir acerto em instâncias remotas. Cria schema apenas nesse banco efêmero e executa `scripts/meg-stage09-snapshot-postgres.integration.ts`. Não usa dados privados nem conexão do Render.
- **Verificação executada no PostgreSQL real descartável:** criou 3.731 eventos sintéticos e validou snapshot REPEATABLE READ, quantidade/ordenação por ID, isolamento por usuário, exclusão de arquivados, decimal de `amount`/`signedAmount`, vínculos e metadados de importação, ausência de mudança na contagem. Resultado do job: **306 ms** para obter 3.731 eventos, resposta JSON sintética de **5.189.007 bytes**. **Não são medidas de produção, não incluem latência de internet nem renderização no navegador.** Ao elevar a 5.001 eventos, confirmou resposta `limit-exceeded` sem linhas parciais.
- **Próximos gates:** verificar CI completo da branch e o preview mais recente no Render; preparar liberação isolada do endpoint backend sem `db push --accept-data-loss` inadvertido, com testes financeiros e autorização apropriada; somente então avaliar com sessão real tempo total e exatidão de indicadores/linhas antes de considerar substituir fallback. PR #656 continua Draft, sem merge nem encerramento da Etapa 09.


## 05/11/2026 | Etapa 09 — filtros favoritos e diretrizes aprovadas de personalização
- **Solicitação explícita:** usuário aprovou a direção de MEG Identidade & Personalização (atalhos configuráveis, ícones semânticos mais expressivos e melhor aproveitamento do cabeçalho em Lançamentos) e acrescentou pedido de **salvar combinações habituais de filtros**, especialmente por cartões/contas e categorias. Aprovação é de PROPOSTA e autorização para implementação isolada; **não é homologação visual de uma tela ainda não apresentada**.
- **Escopo implementado AGORA na PR #656, somente Lançamentos autenticados:** `saved-filters.ts` versiona até 12 filtros nomeados por ID de usuário, nesta instalação de navegador. Guarda apenas critérios (busca, tipo, categoria, conta, forma de pagamento, datas e filtros de coluna), não eventos financeiros, saldos ou dados de cartões. Permite criar, aplicar, excluir com segunda confirmação; recupera mês corrente relativamente ao período ao reutilizar a configuração. Configuração personalizada com datas fixas preserva o intervalo. Sem backend de preferências nesta entrega; **não alegar sincronização entre dispositivos**.
- **DataGrid:** nova prop **opcional** `applySavedFilters` atualiza somente filtros e limpa buscas transitórias ao aplicar favorito, preservando ordem, larguras, colunas ocultas e paginação configurada. Outras telas continuam com funcionamento padrão; a prévia visual homologada (mode=preview) não recebe o painel de favoritos.
- **Forma de pagamento:** a consulta operacional agora oferece filtro textual por forma de pagamento disponibilizada no dado autenticado. Não infere cartão pelo nome nem classifica lançamentos; filtros existentes por conta/categoria seguem intactos. KPIs continuam vindos exclusivamente do resumo canônico da API, e ficam ocultos sob filtros personalizados.
- **Gates técnicos:** workflow [#42140660581](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42140660581) **SUCCESS**, incluindo contrato de armazenamento isolado por usuário, limpeza/limites, período relativo, compilação Web/API, teste operacional Playwright (salvar/aplicar/excluir filtro de categoria e forma de pagamento), oito viewports e PostgreSQL descartável. Nenhum writer foi habilitado.
- **Diretrizes aceitas, NÃO implementadas aqui:** Home em tela/etapa própria terá um painel único de Ações rápidas com lista permitida de destinos reais, opção de adicionar/remover/reordenar/restaurar padrão e persistência por usuário. Unificação visual de ícones deve respeitar os prints oficiais e adotar referências semânticas (saúde, supermercado, carro, moto, pet, alimentação etc.) com contraste e acessibilidade, sem reclassificar dados ou impor logotipos protegidos. Melhor aproveitamento do cabeçalho de Lançamentos exige **nova prévia isolada e aprovação visual explícita** antes de substituir disposição homologada. Para sincronizar preferências entre dispositivos, preparar contrato autenticado da API de preferências, sem reaproveitar tabelas financeiras nem migration antecipada.
- **Estado:** PR #656 permanece Draft, sem merge; não mexer na Home homologada, Android ou regras financeiras. Pendem deploy/revisão visual do novo painel de favoritos, confirmação funcional na conta real, API de snapshot em Render e eventual etapa autorizada da Home. Não declarar a Etapa 09 encerrada.

## 06/11/2026 | Etapa 09 — filtros recolhíveis, favoritos no DataGrid e modo foco confinado
- **Feedback explícito em 3 prints:** ao limpar os filtros, o seletor “Filtros favoritos” deve voltar à opção vazia; os filtros superiores redundantes devem ser removidos ou escondidos por comando de exibição; “Salvar filtros” deve aparecer no cabeçalho da Grade de lançamentos; Maximizar tabela deve ocupar o espaço útil da shell sem rolagem vertical da página, somente rolagem interna do DataGrid.
- **Implementação isolada SOMENTE na tela autenticada de Lançamentos:** formulário superior permanece funcional, mas inicia **recolhido**, exibível pelo botão “Mostrar filtros” na barra da grade. O cabeçalho da própria grade reúne “Selecionar filtro favorito”, “Salvar filtros”, “Excluir favorito” (se houver), “Limpar filtros” (com consulta modificada) e Maximizar/Restaurar. O formulário de nome do favorito aparece sob a barra apenas durante a gravação. Visual homologado do modo `preview` e Home não foram modificados.
- **Reset unificado:** `clearAllLaunchFilters` restaura busca, tipo, categoria, conta, forma de pagamento e intervalo do mês; limpa filtros avançados da grade e seu termo transitório; desmarca o favorito selecionado sem apagar os filtros salvos. O `DataGrid` ganhou prop **opcional** `onClearAllFilters`, invocada no botão já existente “Limpar tudo”, permitindo a mesma limpeza no cabeçalho da grade e no DataGrid. Nenhuma outra tela recebe essa prop.
- **Modo foco refinado:** estado de maximização preenche exclusivamente `.meg-main`, preserva topbar/sidebar e bloqueia scroll vertical externo; viewport interno do DataGrid detém a rolagem. Breakpoint mobile 639px requer altura explícita na shell-body enquanto a grade está maximizada, porque o shell muda de grid para block. A correção é escopada via `:has(.meg-l09.is-grid-focus)` e não altera layout compartilhado fora deste estado.
- **Gates técnicos:** CI [#42145111825](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42145111825) **SUCCESS**: teste de contratos financeiros, snapshot PostgreSQL descartável (3.731 eventos), types Web/API, renderização em oito viewports e autenticação em 1366×768, 960×900, 390×844. O teste verifica início recolhido, comando de exibir filtros, favoritos na barra, limpar favorito, ausência de scroll vertical externo no modo foco, restauração e preservação de filtros após atualizar consulta. A rodada anterior falhou em razão de altura colapsada no mobile e teste tentando preencher filtro recolhido; ambos corrigidos antes deste gate verde.
- **Estado e pendências:** PR #656 permanece Draft/sem merge. Nova organização não foi homologada visualmente pelo usuário. Confirmar deploy do commit final no Render e validação real (inclusive botão “Limpar tudo” da grade). Filtros favoritos seguem no localStorage do navegador, sem sincronização. API de snapshot do backend ainda depende de liberação isolada segura, sem executar `db push --accept-data-loss`; indicadores filtrados ainda não possuem autoridade de cálculos. Android, Home e writers financeiros intocados.

## 05/11/2026 (horário de Brasília) | Validação visual explícita de Lançamentos (transição prematura corrigida abaixo)
- **Aprovação explícita do usuário:** “VALIDADO, SEGUIR PA PROXIMA ETAPA”, imediatamente após conferir a prévia da tela Lançamentos com filtros superiores recolhidos, filtros favoritos e “Salvar filtros” na barra da grade, limpeza que desmarca o favorito, e tabela maximizada dentro da área útil do MEG com rolagem interna. **Registrar como VALIDAÇÃO VISUAL deste refinamento da Etapa 09.** Não presumir que propostas ainda não implementadas (mini-indicadores no banner, nova iconografia, personalização da Home) foram visualmente homologadas.
- **Gates confirmados:** PR [#656](https://github.com/MarcosVilalva/MEG-Platform/pull/656), branch `preview/09-lancamentos-20261104`, commit de código/checkpoint anterior `a6bcc9a1eb0bd3235e68ee72e947d57cf2c610e3`; CI [#42145462063](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42145462063) **SUCCESS** nos dois jobs e deploy Render da prévia `meg-lancamentos-09-pr` **LIVE** nesse commit, confirmados após a publicação. PR segue **DRAFT, SEM MERGE**.
- **Pendências que não desaparecem com aprovação visual:** API de snapshot consistente ainda **NÃO publicada** na API de produção (`meg-platform-api` em `main` no commit `28703a95310c9b9b5f193ef4f3a0cbe80e121f07`); queda segura para dupla leitura permanece. O build de produção da API utiliza comando de atualização de banco que inclui `prisma db push --accept-data-loss`, portanto **não disparar deploy de API para resolver desempenho** sem revisão separada de segurança/schema e autorização. KPIs sob filtros personalizados permanecem indisponíveis, pois faltam resultados canônicos filtrados da API. Filtros favoritos são locais no navegador, não sincronizados. Não declarar a Etapa 09 integralmente encerrada nem aprovar sua integração final enquanto pendências críticas não forem tratadas.
- **CORREÇÃO DE ESCOPO:** a interpretação anterior de “VALIDADO, SEGUIR PA PROXIMA ETAPA” como autorização para iniciar imediatamente a Etapa 10 foi **PREMATURA E REVOGADA** após manifestação expressa do usuário. O que foi validado é **somente o refinamento visual implementado da Etapa 09**. Existem entregas expressamente aprovadas como direcionamento e ainda não executadas dentro da Etapa 09; portanto **NÃO INICIAR Etapa 10, não abrir chat 10 e não fazer merge** enquanto essas entregas estiverem pendentes e o usuário não autorizar uma nova transição específica.
- **Identidade & Personalização:** propostas aprovadas conceitualmente de ícones semânticos, mini-indicadores e atalhos personalizáveis continuam no backlog das telas adequadas, não são obrigatoriamente entregas da Etapa 10 e não têm homologação visual.

## 05/11/2026 | CORREÇÃO PRIORITÁRIA DA CONTINUIDADE — NÃO PULAR TAREFAS APROVADAS
- **Manifestação expressa do usuário:** “VC NAO ESYECEU DE NADA NAO? VC NAO PODE FICAR PULALNDO POR CONTA PROPIA”, ao apontar que a proposta integral de **MEG Identidade & Personalização** estava aprovada conceitualmente e não havia sido entregue. **A orientação anterior para pular à Etapa 10 é anulada**; o chat de Lançamentos continua na Etapa 09. A aprovação visual do último refinamento da grade permanece válida, mas não valida nem elimina tarefas pendentes.
- **Regra de passagem obrigatória:** antes de mencionar “próxima etapa”, comparar **itens aprovados versus implementados versus validados visualmente versus pendentes técnicos**. Uma validação parcial de layout não autoriza encerrar automaticamente a etapa inteira. Não confundir validação conceitual de proposta com homologação visual de código.
- **Pendências VISUAIS E FUNCIONAIS DA ETAPA 09 (executar em ordem, prévias isoladas e validar uma por uma):**
  1. **Ícones semânticos modernos nas categorias de Lançamentos:** catálogo coerente com o print oficial e a identidade MEG, incluindo Saúde, Mercado, Carro, Moto, Pet, Alimentação, Dinheiro e Educação, com variações visuais expressivas, cores controladas, acessibilidade e sem reclassificar lançamentos; não usar símbolos/marcas protegidos indevidamente. Preservar ícones existentes onde não houver correspondência segura. Priorizar uma camada compartilhável para futura personalização por identificador de categoria.
  2. **Aproveitar banner de Lançamentos:** prévia isolada que integra MINI-INDICADORES no cabeçalho DESKTOP sem perder título, subtítulo, ação Novo Lançamento e valores canônicos da API. Não repetir indicadores na faixa abaixo; mobile reorganiza sem cortar conteúdo. **Não alterar os cálculos.** Submeter à aprovação visual.
  3. **Cabeçalho compacto ao rolar:** preservar sticky e máscara opaca homologados, com estado recolhido fluido e reversível, sem ocultar ações. Submeter à aprovação visual.
- **Pendências técnicas DA ETAPA 09:** snapshot financeiro da API ainda não implantado com segurança em produção; manter fallback de duas passagens. Analisar risco de `prisma db push --accept-data-loss` antes de qualquer deploy. KPIs canônicos sob filtros personalizados ainda pendentes, sem computação financeira nas telas. Testar as opções acima com os gates responsivos e financeiros.
- **Pendências da HOME (NÃO implementar neste chat da Etapa 09):** painel único alinhado de Ações rápidas; permitir adicionar/remover/reordenar/restaurar atalhos permitidos por funcionalidade/permissão, preservando Home já homologada até nova aprovação. Tratar no chat/branch próprios da Home, antes de declarar resolvida a iniciativa de personalização. Não antecipar a Etapa 10 só para adiar a Home.
- **Pendências COMPARTILHADAS de Personalização:** permitir escolher ícone e cor das categorias mediante mapeamento por ID e sem tocar na regra financeira; central de preferências do MEG; sincronizar atalhos, ícones/cores e filtros favoritos entre dispositivos com API autenticada de preferências, arquitetura isolada dos dados financeiros e respeito às permissões. Os filtros favoritos locais já existem, **não equivalem a sincronização**. Mapear a etapa adequada e pedir autorização específica antes da implementação transversal.
- **Estados explícitos:** Filtros favoritos, limpar/mostrar filtros, salvar na grade e maximização = **IMPLEMENTADOS E VISUALMENTE VALIDADOS**. Ícones semânticos, mini-indicadores no banner, cabeçalho compacto, atalhos configuráveis, central de personalização e sincronização = **APROVADOS COMO PROPOSTA; NÃO IMPLEMENTADOS/NÃO HOMOLOGADOS**. Nada disso autoriza merge ou escrita financeira. PR #656 segue Draft e sem merge; Android congelado.
- **Rastreio permanente no GitHub:** [#660 — Etapa 09: ícones, mini-indicadores e cabeçalho compacto](https://github.com/MarcosVilalva/MEG-Platform/issues/660); [#661 — Home: painel único e atalhos configuráveis](https://github.com/MarcosVilalva/MEG-Platform/issues/661); [#662 — Central de Personalização, catálogo e sincronização](https://github.com/MarcosVilalva/MEG-Platform/issues/662). Todas estão pendentes e só podem ser consideradas homologadas mediante evidência técnica e aprovação visual do usuário.

## 05/11/2026 | Etapa 09 — catálogo de ícones semânticos implementado e aguardando homologação
- **Autorização:** usuário respondeu “SEGUIR” à ordem corrigida de continuar na Etapa 09 pelo item 1 da issue [#660](https://github.com/MarcosVilalva/MEG-Platform/issues/660), antes de mini-indicadores no banner ou cabeçalho compacto. Não é aprovação visual do resultado.
- **Implementação na PR #656, sem merge:** `category-presentation.ts` mapeia APENAS nomes explícitos de categorias existentes normalizados (sem `includes`/inferência de classificação), incluindo Saúde, Mercado, Carro, Moto, Pet, Alimentação, Dinheiro e Educação, além de rótulos conhecidos como Imóvel e Cursos. O tratamento define ícone e tom VISUAL apenas; categorias desconhecidas continuam com o ícone neutro. `LaunchCategoryBadge.tsx` apresenta cores contextuais e ícones no grid e no modal de consulta da rota autenticada. `category-semantic-extended.tsx` contém os novos SVGs originais de mercado, moto e pet; `LaunchIcon.tsx` mantém os glifos Phosphor existentes, distinguindo no atributo `data-launch-pack` os SVGs originais do MEG. `launches-stage09.css` cuida dos tons, acessibilidade e mobile. Não alterou a versão demonstrativa homologada (`mode='preview'`), fonte de dados, chaves, filtros, totais, writers, banco ou Android.
- **Gates:** workflow [#42151585183](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42151585183) **SUCCESS** nos dois jobs (financeiros/API, PostgreSQL sintético, TypeScript, oito viewports de regressão e três tamanhos no navegador autenticado, reconhecendo Saúde e fallback neutro). Novo contrato `scripts/meg-stage09-category-visual.contract.test.ts` valida correspondências, acentos, desconhecidas e preservação do ícone demonstrativo. Prévia LIVE confirmada pelo Render no commit `147584b21df28d43f9268e9602581e21a1c61872`, sem cache via `/web-evolution.html?tela=lancamentos&v=147584b21df28d43f9268e9602581e21a1c61872`.
- **GATE VISUAL PENDENTE:** o usuário ainda precisa ver e aprovar os badges novos. **Não chamar o catálogo de homologado**; não avançar prematuramente para item 2 (mini-indicadores no banner) ou 3 (sticky compacto). Não declarar Etapa 09 concluída.
- **Demais pendências preservadas:** personalização real de ícones/cores por ID da categoria ainda não foi implementada (issue #662); Home/atalhos ficam no chat próprio (issue #661). API snapshot do histórico não publicada em produção, indicadores filtrados ainda sem autoridade, filtros favoritos continuam locais no navegador. A PR #656 permanece Draft e sem merge.

## 06/11/2026 | Requisito permanente: sugestões críticas e auditoria integral de categorias, pagamentos e logout
- **Pedido direto do usuário com cinco prints:** percorrer a base do MEG e substituir ícones genéricos por representação mais expressiva em todas as categorias já conhecidas, sem alterar nomes, tipos ou classificação financeira; personalizar a coluna “Forma de pagamento” com miniaturas de cartões, boleto, PIX, dinheiro, depósito etc.; lembrar da reorganização dos quatro indicadores no cabeçalho de Lançamentos (print 4), da Home com painel único de Ações rápidas e atalhos configuráveis (print 5), e corrigir o botão Sair que aparece mas não funciona.
- **Requisito transversal de comportamento da assistência:** em cada entrega, além de executar o pedido, fazer **análise crítica propositiva e recomendações concretas de melhorias**, informando vantagens, riscos, impacto arquitetural, opções mais simples quando pertinentes e o que NÃO está implementado. **Não usar isso para alterar telas sem validação ou pular etapas.** Salvar esta regra no checkpoint para continuidade entre chats.
- **Auditoria real SOMENTE LEITURA:** projeto Supabase `meg-financas` (não confundir com `meg-evolution`, que contém entidades de outra aplicação). Consultadas exclusivamente categorias e formas de pagamento distintas, e rótulos de categoria/forma no `FinancialEvent.sourcePayload`, sem extrair valores, credenciais, dados de cartão ou modificar dados. Resultado: 47 registros de categorias (incluindo grupos duplicados), 17 formas cadastradas e histórico contendo `CARTÃO LATAM PASS`, embora ausente no cadastro atual de formas. A lista de categorias reais inclui `BEBIDAS E SIMILARES`, `ELETRO/ELETRONICOS/ UTILIDADES`, `FAST FOOD`, `HIGIENE PESSOAL`, `MAT. ESCOLAR`, `PGTO DE DIVIDAS`, `TITULOS/PREVIDÊNCIA`, `VESTUÁRIO`, `COMPRA REEMBOLSÁVEL`. Rótulos novos/desconhecidos ficam neutros; não inferir categoria pela descrição do lançamento.
- **Implementação visual da Etapa 09 (AGUARDANDO HOMOLOGAÇÃO):** `category-presentation.ts` ampliado com todos os rótulos reais identificados e glifos SVG adicionais no pack local; `payment-presentation.ts` + `LaunchPaymentBadge.tsx` usam miniaturas de cartão apenas ILUSTRATIVAS, sem falsa representação da marca/cartão real e sem vínculo presumido entre `PaymentMethod` e `CreditCard`. Incluem PIX, boleto, dinheiro, depósito, débito automático, Verocard, Riachuelo, cartões AZUL, BB, BV, Itaú, Kabum, Magalu, ML, Nubank e LATAM PASS do histórico. Preservados os nomes originais, filtros, totalização e as operações canônicas; modo preview previamente homologado permanece igual.
- **Botão Sair:** auditoria localizou `logout(session)` e `clearSession()` já existentes em `auth-client.ts`, mas o botão `AppShell.tsx` não chamava nenhuma ação. Ligado via propriedade opcional `onLogout` ao `AuthGateway` da rota autenticada, com revogação remota e limpeza local em `finally`; sinalizar erro caso a revogação no servidor não seja confirmada, sem alegar logout remoto. Proteção contra clique duplicado. Não altera tela demonstrativa.
- **Não implementados e NÃO HOMOLOGADOS:** mini-indicadores no banner de Lançamentos e redução do sticky (issue #660); painel único de Home e atalhos configuráveis por usuário (issue #661); preferências sincronizadas e customização por ID de categoria (issue #662). NÃO avançar sem validações separadas. Etapa 09/PR #656 permanece isolada sem merge. Segurança API snapshot, filtros canônicos e publish seguros continuam pendentes.
- **Gates necessários:** `scripts/meg-stage09-category-visual.contract.test.ts` cobre as categorias reais e pagamentos conhecidos; Playwright operacional valida o Sair com revogação 204 e com erro remoto 503. Testes financeiros e PostgreSQL descartável continuam mandatórios. **A validação visual do usuário para esta revisão ainda não ocorreu.**

## 08/11/2026 | Aprovação explícita do catálogo e do Sair; autorização para otimizar banner
- **Usuário aprovou expressamente:** “excelente, concordo com sua sugestão adicional, vamos seguir”, em resposta à revisão de ícones das categorias, miniaturas ilustrativas de formas de pagamento e correção funcional do botão Sair. Registrar a **homologação visual** desses itens específicos na prévia publicada do commit `640ac9eaa060e3f6b665b56f3bebaf52083a1ef5`. A proposta de futura personalização deve usar o **ID canônico de categoria**, nunca depender de rótulos iguais, e miniaturas fiéis aos cartões dependem de vínculo explícito com o módulo Cartões. **Essa arquitetura futura foi aceita, mas NÃO foi implementada nem homologada.**
- **Próxima entrega autorizada dentro da Etapa 09:** integrar os quatro KPIs (Resultado projetado, Entradas, Saídas, Resultado realizado) no **banner de Lançamentos**, sem repetir a faixa abaixo. Os valores devem continuar vindo exclusivamente do resumo financeiro canônico da API, permanecer indisponíveis sob filtros personalizados quando a API não prover agregações canônicas, preservar o banner oficial, CTA Novo Lançamento, sticky e máscara opaca, e adaptar 640/1024/mobile sem rolagem horizontal. Novo layout exige validação visual específica do usuário.
- **Não iniciar** cabeçalho compacto nem Home, atalhos ou Etapa 10 durante esta entrega. PR #656 segue Draft, sem merge. Pendências financeiras de snapshot/deploy seguro e KPIs filtrados permanecem.

## 08/11/2026 | Indicadores financeiros compactos integrados ao banner de Lançamentos
- **Aprovação do item anterior:** usuário respondeu “excelente, concordo com sua sugestão adicional, vamos seguir”, validando a revisão de categorias semânticas, miniaturas ilustrativas de pagamento e Sair. Aceitou também como **diretriz de arquitetura futura**, ainda não implementada, personalização de ícones e cores pelo ID canônico da categoria e imagem fiel de cartões somente com vínculo explícito ao módulo Cartões. A [issue #660](https://github.com/MarcosVilalva/MEG-Platform/issues/660) teve estes estados atualizados.
- **Implementado agora, SOMENTE na Etapa 09 e na tela de Lançamentos autenticada:** os quatro indicadores `Resultado projetado`, `Entradas`, `Saídas`, `Resultado realizado` foram movidos da faixa de quatro cards abaixo do banner para uma única faixa compacta dentro de `.meg-l09-hero`, sem duplicação. O título, subtítulo, imagem oficial e botão `Novo lançamento` permanecem. O mesmo componente de métricas `statisticsView` preserva a prévia demonstrativa existente na disposição homologada; **apenas `mode='live'` usa a faixa integrada**. Valores e estados continuam provenientes **exclusivamente de `FinanceSummary` retornado pela API** e continuam como `—` quando filtros personalizados impedem agregação canônica. Nenhuma regra financeira nova foi criada.
- **Responsividade estrutural:** >=1024px apresenta os quatro valores no banner em uma faixa horizontal única; 640–1023px e <=639px usam duas colunas no próprio banner, sem rolagem horizontal. O botão de inclusão mantém tamanho de toque adequado. Sticky opaco oficial continua inalterado; o **cabeçalho compacto durante a rolagem é item separado NÃO implementado ainda**. Modo foco preserva a ocultação dos indicadores e deixa apenas a rolagem interna do DataGrid.
- **Arquivos alterados:** `apps/web/src/meg-web-evolution/launches/LaunchesStage09.tsx`, `launches-stage09.css`, `scripts/meg-stage09-operational.browser.mjs`. Regressões de CI iniciais detectadas e corrigidas: teste comparava `R$ 160,00` sem tolerar espaço inseparável do formatador BR e CSS novo dava precedência indevida ao `display:grid` dos KPIs quando a grade era maximizada. A revisão final aplica regra explícita de ocultação no modo foco e normaliza espaços apenas na asserção, **sem alterar formatação monetária**.
- **Gates técnicos:** [workflow #42523900453](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42523900453) **SUCCESS** nos dois jobs: testes financeiros, PostgreSQL 16 descartável com 3.731 eventos sintéticos, testes de contratos, compilação Web/API, oito viewports demonstrativos e navegador autenticado 1366x768, 960x900 e 390x844. O teste operacional verifica quatro valores exatos de `/finance/summary`, uma única faixa dentro do banner, CTA visível, ausência de scroll horizontal, modo foco e fallback seguro. Preview Render `meg-lancamentos-09-pr` **LIVE confirmado** para commit `88d3b400a038d26f77f4d272188d3b9cf3251484`; URL de validação sem cache `https://meg-lancamentos-09-pr.onrender.com/web-evolution.html?tela=lancamentos&v=88d3b400a038d26f77f4d272188d3b9cf3251484`.
- **PENDÊNCIA VISUAL:** o usuário **ainda NÃO homologou esta nova composição no banner**. Não avançar ao próximo refinamento (cabeçalho compacto ao rolar) sem aprovação explícita. PR #656 continua **Draft, sem merge**. Home/atalhos (#661), personalização por ID e sincronização (#662), e pendências técnicas da API snapshot/cálculo de KPIs filtrados seguem abertas. Android e writers financeiros preservados.

## 08/11/2026 | Cabeçalho compacto e comandos de análise integrados — AGUARDA VALIDAÇÃO VISUAL
- **Autorização:** após ver o banner com os quatro KPIs integrados, o usuário respondeu “combinado, pode seguir” à proposta de: (1) reduzir o cabeçalho durante rolagem, (2) condensar o aviso de verificação financeira, (3) abrir Distribuição sob demanda a partir da grade, (4) diferenciar filtros gerais dos filtros avançados do DataGrid. Essa autorização permite IMPLEMENTAR e TESTAR os refinamentos, não equivale a homologação visual do resultado.
- **Entregue somente na Etapa 09, modo autenticado:** `LaunchesStage09.tsx` observa scroll de `.meg-main` e alterna `is-header-compact` com histerese (ativa >=190px, desativa <=70px), mantendo título, botão Novo lançamento ainda protegido/desabilitado, e os 4 indicadores com valores da API canônica, sem cálculos na UI. Subtítulo e legendas secundárias são omitidos no estado compacto, com o banner oficial e máscara opaca mantidos. O bloco de auditoria passa a exibir “Histórico verificado” e detalhes acessíveis sob demanda, com `Atualizar consulta` à direita. A Distribuição no período permanece funcional, mas o painel está oculto por padrão e abre/recolhe com `Distribuição` na barra da grade. `Filtros gerais` abre o formulário superior; o DataGrid usa `Filtros da grade (N)` via prop opcional, mantendo o nome-padrão `Filtros (N)` nos outros consumidores.
- **Mobile:** foi corrigida a estrutura do scrollport apenas da rota autenticada de Lançamentos até 639px para o sticky funcionar no `.meg-main` com a topbar mantida; removido padding redundante de 12px da área principal para não aparecer conteúdo por trás da máscara. Nenhuma alteração de layout na Home, demo homologada ou Android.
- **Gates técnicos verificados:** workflow [#42546647939](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42546647939), **SUCCESS** nos jobs `lancamentos` e snapshot PostgreSQL descartável (3.731 eventos), contratos financeiros, types/build, oito viewports demonstrativos e browser autenticado em 1366×768, 960×900 e 390×844. Teste verifica faixa de KPIs exclusivamente no banner, valores canônicos sem cálculo local, sticky compacto e opaco, restauro após scroll, ausência de overflow, filtros renomeados apenas aqui, abertura/recolhimento da distribuição, modo foco e auth/logout. As primeiras rodadas detectaram ajustes necessários no teste de compatibilidade do DataGrid, referências antigas de textos e scrollport mobile; todos corrigidos antes deste resultado verde.
- **Preview:** Render serviço `meg-lancamentos-09-pr` LIVE confirmado no commit `ca4a1627caa370f6b6f2672e85dd7a6ef2afaaf1`, URL sem cache `https://meg-lancamentos-09-pr.onrender.com/web-evolution.html?tela=lancamentos&v=ca4a1627caa370f6b6f2672e85dd7a6ef2afaaf1`. PR [#656](https://github.com/MarcosVilalva/MEG-Platform/pull/656) continua **Draft, sem merge**.
- **Não homologado:** cabeçalho compacto, resumo de verificação, abertura da distribuição por botão e novos rótulos de filtros ainda dependem de **APROVAÇÃO VISUAL EXPLÍCITA** do usuário. Não declarar Etapa 09 concluída ou transição autorizada. Permanecem snapshot rápido ainda não implantado com deploy seguro na API de produção, valores canônicos sob filtros personalizados, personalização por ID e sincronização (#662), Home/atalhos (#661), writers bloqueados/etapa 10 não iniciada. Regras financeiras e Android intactos.

## 09/11/2026 | Feedback do vídeo e continuidade no chat PT3
- **Manifestação do usuário:** após receber o refinamento de cabeçalho compacto, aviso de integridade, Distribuição sob demanda e diferenciação dos filtros, respondeu “ficou bom, se tiver algo a acrescentar fique a vontade ou vamos seguir para próxima, o q acha de começarmos em um novo chat?” e anexou vídeo `07-27-05.mp4` (38 s, 1366×768) percorrendo lançamentos, estados do cabeçalho e tabela maximizada. O vídeo foi examinado: o banner compacto, a navegação da tabela e a maximização aparecem sem problema evidente no material. O feedback é **POSITIVO** e autoriza parar o refinamento visual nesta rodada, mas **não constitui validação operacional integral da Etapa 09**. Nunca declarar a Etapa 09 encerrada com base apenas na aparência.
- **Decisão de continuidade sugerida:** novo chat `09 - Lançamentos PT3 — Fechamento técnico`, mantendo a mesma etapa e PR #656 em Draft/sem merge. A próxima atividade é revisar a implementação segura do snapshot de histórico na API de produção **sem** executar a sequência arriscada `prisma db push --accept-data-loss`, e o cálculo canônico de indicadores sob filtros personalizados (se o contrato da API exigir, planejar antes de implementar). Fazer análise de risco, compatibilidade com Home e Android congelados e consultar `docs/MEG-WEB-FINANCIAL-AUTHORITY.md`. A simulação de PostgreSQL descartável 3.731 registros, UI e testes de browser até o CI [#42547018455](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42547018455) são verdes, mas não substituem validação em dados reais nem testes de deploy da API.
- **Não pular:** mantém-se a issue [#660](https://github.com/MarcosVilalva/MEG-Platform/issues/660) aberta para fechamento técnico, e [#661](https://github.com/MarcosVilalva/MEG-Platform/issues/661) Home/atalhos e [#662](https://github.com/MarcosVilalva/MEG-Platform/issues/662) personalização/sincronização como backlog autorizado conceitualmente, em chats/etapas apropriados. Não iniciar Etapa 10 sem aprovação explícita de transição após gates financeiros. Preservar prévia visual aprovada anteriormente, sem introduzir novas alterações por conta própria.


## 09/11/2026 | Etapa 09 PT3 — auditoria do Render e bloqueio de publicação segura
- **Workspace Render confirmado explicitamente pelo usuário:** `My Workspace` (`tea-d98k1qhkh4rs73f4sfj0`). Auditoria de serviços realizada em modo somente leitura; sem deploy da API, sem mudanças em banco, writers, Android, Home ou UI homologada.
- **API financeira REAL:** `meg-platform-api` (serviço `srv-d98k61daeets7384hvb0`) segue na `main`, commit LIVE `28703a95310c9b9b5f193ef4f3a0cbe80e121f07` em 05/11. Não confundir com `meg-evolution-api`, serviço Docker de terceiro.
- **BLOQUEIO CRÍTICO CONFIRMADO:** build da API no Render chama `db:prepare:production` e `db:push:production`; o script `packages/database/package.json` contém `prisma db push --accept-data-loss`. PROIBIDO iniciar/reiniciar deploy da API por esse pipeline. Snapshot de leitura já existe na PR #656, mas não foi comprovado LIVE na API principal.
- **Preview estático:** serviço `meg-lancamentos-09-pr`, último LIVE observado na auditoria `a25a5796a150a7f4443f98ac4828a70bfeaca774`, anterior ao HEAD da PR observado `d8e5e27f3ad31c96eb8c107eab4698dcb72a13e8`. Não afirmar que o Render serve o HEAD sem consultar o deploy mais recente.
- **Gates:** run [#42601569567](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42601569567) SUCCESS nos jobs de Lançamentos e PostgreSQL sintético (3.731 eventos, limite 5.000). `db push` do CI é restrito ao banco descartável e sem `--accept-data-loss`.
- **KPIs sob filtros personalizados:** ainda ocultos com `—`; cálculo no browser permanece proibido. Contrato filtrado canônico, equivalência de filtros e consistência do snapshot estão pendentes. Não confundir teste sintético com validação em dados reais.
- **Auditoria e plano de ação rastreáveis:** `docs/MEG-WEB-STAGE09-SAFE-API-DEPLOY-AUDIT-20261109.md`.
- **Estado:** PR #656 permanece Draft, sem merge. Etapa 09 NÃO encerrada. Issues #661 e #662 continuam backlog. Não iniciar Etapa 10. Antes de publicação real da API é necessária revisão explícita do pipeline para remover o risco de perda de dados, sem qualquer migração ou ajuste destrutivo.


## 09/11/2026 | Etapa 09 PT3 — indicadores filtrados implementados em Draft e proteção de deploy
- **Escopo autorizado:** auditoria e preparação técnica de Lançamentos; não alterar Android, Home, shell homologada, CSS de Lançamentos ou escritores financeiros. Nenhum merge ou deploy da API principal autorizado/executado.
- **Risco confirmado no Render:** serviço `meg-platform-api` ainda usa `npm run db:prepare:production` (script `prepare-production.ts` pode **excluir** duplicidades da tabela `Budget`) e `npm run db:push:production` (executa `prisma db push --accept-data-loss`). Não disparar deploy/redeploy desse serviço com a configuração existente. `meg-evolution-api` não é a API financeira.
- **Preflight fail-closed:** `scripts/meg-stage09-api-readonly-preflight.mjs` e seu teste comprovam rejeição de comandos de build destrutivos ou desconhecidos. O pipeline seguro a avaliar, sem mutações de banco, é `npm ci --audit=false && npm run db:generate && npm run build:api`. A mudança da configuração do serviço Render e a publicação REAL **não foram realizadas**.
- **Indicadores filtrados implementados no código da PR #656:** `history-filter.ts`, `service.ts`, `routes.ts`, `finance-client.ts`, `OperationalLaunches.tsx` e `LaunchesStage09.tsx`. A API valida filtros gerais e de coluna, seleciona somente dados autorizados e usa `summarizeMonetaryEvents` da autoridade financeira para os quatro indicadores. Disponibiliza GET `/finance/events/filtered-summary` somente leitura, com `no-store`, e capacidade aditiva `filteredSummaryV1`.
- **Compatibilidade:** somente habilitar KPIs filtrados quando a API real anunciar `filteredSummaryV1`. Consulta compara o token de revisão do histórico antes/depois, usa debounce e cancelamento; sem capacidade, erro, limite de 5.000 eventos ou inconsistência, a UI conserva o marcador `—`, sem calcular no navegador. Modo demonstrativo e CSS aprovado permanecem intocados.
- **Gates verificados:** [CI #42611361286](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42611361286), jobs `lancamentos` e `Snapshot transacional no PostgreSQL descartável (3.731 registros)`: ambos **SUCCESS**. Inclui teste de contrato e equivalência dos filtros, integração em banco efêmero, testes financeiros, browser com indicadores derivados exclusivamente de resposta de API simulada e verificações de responsividade.
- **Documentação auditável:** `docs/MEG-WEB-STAGE09-SAFE-API-DEPLOY-AUDIT-20261109.md`. O CI verde valida o código isolado, não prova disponibilidade do novo endpoint na API LIVE nem acesso a registros de produção.
- **Pendências mandatórias:** corrigir pipeline Render antes de qualquer deploy; preparar publicação isolada da API sem merge da PR #656 inteira; revisar autenticação e CORS na implantação; validar sessão real, integridade, latência e dados reais de modo somente leitura; reexecutar gates e confirmar SHA LIVE; obter autorização explícita de fechamento. Até lá Etapa 09 permanece EM EXECUÇÃO, PR #656 Draft/sem merge. Issues #661 e #662 backlog sem implementação neste chat; Etapa 10 bloqueada.
