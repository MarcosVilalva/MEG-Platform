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


---

## 10/11/2026 — Etapa 08 Home PT2 — Ações rápidas customizáveis (correção isolada)

- **Autorização específica do usuário:** personalização do painel Ações rápidas da Home já homologada visualmente, sem alterar outros módulos. Este registro atualiza a continuidade sem reabrir a homologação da composição geral.
- **Base visual congelada:** PR #655, branch `preview/06-home-refino-preservado-20261104`; versão visual explicitamente aprovada em 04/11/2026, `dd0a472eee736558c224268c5bca096bc2d58187`. A branch corretiva foi criada do head `0e3ca5592d8d8458819dab4f8649ee26d1575aa8` da PR #655. Nenhuma alteração foi feita na PR original.
- **Branch isolada:** `preview/08-home-acoes-customizaveis-20261110`. Escopo restrito ao `QuickActions`, integração pontual na Home e passagem do ID de sessão autenticada. As issues #661 e #662 seguem distintas.
- **Quatro atalhos iniciais:** Transferência, Pagar conta, Relatórios e Configurações, mantendo as ações de navegação/avisos já existentes. Novo lançamento continua exclusivamente na topbar. A inclusão de atalhos se limita a restaurar atalhos desse catálogo existente; destinos adicionais exigem confirmação real de rotas e permissões.
- **Alterações em código:** `apps/web/src/meg-web-evolution/home/QuickActions.tsx`, `quick-actions.css`, `HomeDashboard.tsx` e `main.tsx`. Editor permite adicionar, remover, reordenar por controles de teclado e restaurar o padrão. Sem drag-and-drop obrigatório. Nenhum cálculo, status ou operação financeira introduzidos.
- **Persistência local:** chave de `localStorage` versionada e segregada por `session.user.id`. Prévia de demonstração usa chave própria, sem acesso financeiro e sem misturar usuários. Leitura valida lista, IDs permitidos e ausência de duplicatas; dados inválidos retornam ao padrão. Falha no storage não anuncia gravação falsa.
- **Sincronização entre dispositivos:** pendente. Exige contrato autenticado de preferências e homologação transversal da issue #662. Não criar migration, schema, writer, endpoint ou mudança em Render nesta correção.
- **Testes adicionados:** `scripts/meg-08-home-quick-actions.browser.mjs` (oito larguras, persistência após recarga, adicionar, remover, reordenar, restaurar, estado inválido, topbar e overflow); `.github/workflows/meg-08-home-quick-actions.yml` (build Vite + regressão Home original + testes de personalização, sem publicação). Resultado de CI e prévia pública ainda precisam ser verificados após commit.
- **Gates:** não fazer merge, deploy de produção, alterações de banco, API, Render, Android ou outras telas. PR #656 e PR #663 da Etapa 09 permanecem intocadas.
- **Validação visual do novo editor:** PENDENTE de aprovação explícita. Homologação anterior da composição da Home permanece válida e congelada.
- **Pendências reais:** CI de branch, revisão visual no navegador, URL de preview com cache-busting, homologação do editor, verificação de navegação real/permissões antes de expandir o catálogo e sincronização futura somente mediante autorização.

### 10/11/2026 — resultado técnico e PR da correção
- **PR isolada:** #664 (Draft), base `preview/06-home-refino-preservado-20261104`. Sem merge.
- **CI confirmada:** workflow [42871932832](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42871932832), conclusão `success`, SHA `1601926adeac3a0b46b3c5d356588cb2e38ffd89`. Build isolado e testes de navegador concluídos. Artefato `meg-home-08-qa` registrado no run.
- **Preview público independente:** ainda NÃO publicado; não alterar configurações ou executar deploy Render sem autorização. A prévia existente da PR #655 NÃO representa o novo editor. Evidências do Actions não substituem demonstração interativa e validação visual.
- **Homologação do painel customizável:** PENDENTE de inspeção visual do usuário. **Sincronização entre dispositivos:** PENDENTE da issue #662 e aprovação própria.

### 10/11/2026 — autorização para prosseguir após entrega
- Usuário respondeu **"APROVADO PODE SEGUIR"** à entrega da PR #664. Interpretar como autorização de continuidade técnica e preparação de validação, **não como homologação visual de interface que ainda não teve preview próprio**.
- CI do head anterior `847dde648674ca88c674e16ee5c124aa35985e16`: [42872403421](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42872403421) **success**.
- Adicionado upload de **build estático navegável** como artefato do workflow, para inspeção sem modificar serviços Render. Isso não equivale a URL pública de preview; instalação/serviço de hospedagem permanece pendente.
- PR #664 permanece Draft e sem merge. Não alterar API, banco, Android, serviço Render ou PRs #656/#663; autorização de merge/deploy de produção segue ausente.
- Atenção: os destinos da Home visual demonstrativa são avisos, não navegação operacional autenticada. Validar rotas/autorização antes de ampliar catálogo; não prometer lançamento de transferência, pagamento, relatórios ou configurações sem módulo implementado.

### 10/11/2026 — evidências definitivas do workflow da correção
- Workflow do commit `ed9d3421719ecc63381c6ab0fc95aa48143dddce`: [42873289447](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42873289447), conclusão **success**.
- Logs confirmam **16 cenários da Home original, zero falhas**, e **73 verificações da personalização aprovadas em oito larguras**. Build Vite e etapas de artefato concluídas.
- Artefatos gerados: `meg-home-08-preview-estatico` (build compilado, uso com servidor HTTP local) e `meg-home-08-qa` (evidências). Artefatos ficam no run GitHub, sem deploy.
- **Ainda faltam:** URL de prévia pública sem cache no commit atualizado, validação visual explícita do novo editor e decisão futura de sincronização. Esta autorização de continuidade não substitui esses gates nem libera merge.

### 10/11/2026 — auditoria de custo e serviços Render (workspace My Workspace)
- Usuário autorizou limpeza de serviços não utilizados para economizar recursos. Inventário de **25 serviços** ativos/listados alcança teto Hobby Render, que bloqueou criação do static site `meg-home-08-acoes-pr664` (HTTP 400: `Hobby Tier is limited to 25 services`).
- Não foram encontradas instâncias Render Postgres nem Key Value no workspace; isso NÃO implica que as APIs ou bancos externos possam ser alterados.
- Candidatos iniciais com evidência objetiva: `meg-web-stage05-login-pr626` (`srv-db6nr0l9fdbs73dkjkrg`, PR #626 fechada sem merge, autoDeploy desligado) e `meg-stage05-criar-conta-pr627` (`srv-db6obd59fdbs73dmln40`, PR #627 fechada sem merge, autoDeploy desligado). Ambos previews estáticos de 13/10, URLs próprias; requerem checagem final de referências externas antes de exclusão.
- Outros candidatos, mas com necessidade de revisão extra: `meg-phoenix-v15-ux-preview-pr271` (PR #271 merged) e `meg-home-06-refino-pr653` (PR #653 ainda Draft; não excluir sem verificar usos).
- Métricas HTTP consultadas para alguns candidatos retornaram séries vazias; NÃO usar como prova definitiva de zero acessos.
- **Limite operacional:** ferramentas Render disponíveis neste chat NÃO incluem exclusão, suspensão ou edição de configuração de serviços. Portanto, nenhum serviço foi efetivamente excluído. Não afirmar economia realizada ou vaga liberada.
- Proteger `meg-platform-api`, `meg-evolution-api`, previews de produção/main, `meg-home-06-refino-pr655`, `meg-lancamentos-09-pr` e serviços cuja dependência não foi auditada. Manter PR #664 Draft, sem merge.
- Próximo passo: exclusão dos candidatos comprovadamente dispensáveis via painel Render por operador autorizado, seguida de nova conferência de quota e criação do Static Site isolado já autorizado.

### 10/11/2026 — Home PT2: refinamento solicitado de ícones e marca compacta
- Usuário mostrou screenshot da Home PT2 e solicitou ícones modernos de subir, descer, excluir e capacidade de adicionar atalhos no futuro; em seguida solicitou alinhamento e ampliação da logo na sidebar recolhida, tomando o botão de expandir como referência.
- Implementado na branch `preview/08-home-acoes-customizaveis-20261110`: `QuickActions.tsx`, `HomeGlyph.tsx`, `quick-actions.css` (controles SVG com texto acessível, estados e catálogo extensível sem inventar destinos); `shell.css` (logo compacta desktop 46 px centrada em superfície de 54 px e mesma faixa vertical do cabeçalho, com exceções para alturas baixas; logo expandida preservada); `scripts/meg-08-home-quick-actions.browser.mjs` (testes de SVG e alinhamento relativo no desktop).
- Site estático de prévia `meg-home-08-acoes-pr664`, serviço Render `srv-dbpmnrd6e07s73dflai0` no workspace My Workspace, conectado exclusivamente à branch da PR #664; deploys automáticos nessa branch. Link de validação deve incluir `?tela=home&v=<SHA-do-deploy-live>`; não declarar validação antes de checar deploy `live`.
- Novos gates técnicos e homologação visual do usuário ainda necessários; qualquer ajuste desta rodada é **candidato**, não aprovada visualmente. Não avançar à Etapa 09 nem mudar API, banco, Android ou PRs #656/#663.

### 10/11/2026 — Home PT2, acabamento icon-only e sidebar recolhida (aguarda homologação)
- Usuário solicitou novamente acabamento visual com marca compacta maior dentro do contorno, moldura premium delimitada nos ícones da sidebar e controles **somente ícones** com tooltips em Subir/Descer/Remover. Feedback visual anterior não equivale a aprovação.
- Alterações restritas à PR #664 na branch `preview/08-home-acoes-customizaveis-20261110`: `QuickActions.tsx` (rótulos `aria-label` e `data-tooltip` nos botões de ordenar/remover, sem texto visível); `quick-actions.css` (alvos de 44 px, microinterações, tooltip visível no foco e hover); `shell.css` (marca compacta desktop com imagem 52 px e moldura 56 px, double-stroke e estados active/hover/focus dos ícones recolhidos); `scripts/meg-08-home-quick-actions.browser.mjs` (verificações de ícones-only, tooltip, alinhamento, contornos e responsividade).
- A sidebar expandida e a marca oficial SVG não foram alteradas. Catálogo funcional segue com apenas quatro destinos autorizados; sem cálculos financeiros locais, sem API, banco, Android, merge ou alteração de PRs #656/#663.
- O Static Site isolado `meg-home-08-acoes-pr664` (`srv-dbpmnrd6e07s73dflai0`) acompanha automaticamente esta branch; confirmar status `live` e SHA antes de fornecer link sem cache. CI e validação visual ainda exigidos após estes ajustes. Não marcar homologado sem aprovação explícita.

### 10/11/2026 — correção visual após feedback crítico (sem homologação)
- Usuário enviou dois prints e **reprovou** versão anterior da PR #664: logo visualmente cortada, caixas repetitivas nos ícones recolhidos, botão Sair sem destaque vermelho, editor de atalhos com linhas extensas e controles pouco evidentes. NÃO tratar versão anterior como homologada.
- Refeito de modo isolado: `shell.css` remove molduras pesadas dos itens inativos, preserva apenas ativo em ciano, restaura botão Sair em vermelho, contém a marca SVG dentro de moldura de 56 px com imagem 48 px, mantendo alinhamento ao botão de expandir. Há variante para alturas baixas.
- Editor reorganizado como grade de cartões correspondente às ações, bordas superiores por cor e três comandos icon-only com tooltip dentro de cada cartão: `QuickActions.tsx` e `quick-actions.css`.
- Teste `scripts/meg-08-home-quick-actions.browser.mjs` agora mede limites de botões nos cartões, logo contida, cor do Sair, posicionamento e persiste screenshot `home-pt2-editor-grade-1366.png` nas evidências do workflow.
- CI do commit `ea1f8a3c6de537860a395e6f20f2bdc6802978a6` teve etapa de contratos visuais **success**, mas o novo commit de checkpoint ainda requer seus próprios gates. Serviço de preview isolado `srv-dbpmnrd6e07s73dflai0` deve publicar `live` o SHA final antes de enviar URL sem cache.
- Proteções mantidas: não alterar Android, regras financeiras, API, banco, PRs #656/#663, não fazer merge e não declarar homologação sem aprovação explícita da aparência corrigida.

### 10/11/2026 — nova direção visual da Home PT2, baseada nas imagens 01 e 03 (aguarda aprovação)
- O usuário **não aprovou** a moldura da logo compacta, nem o texto no botão Personalizar, nem a representação do editor como cartões vazios. Pediu a marca solta e alinhada ao botão de expandir, ícone de lápis com tooltip, cards editáveis **iguais aos atalhos reais** contendo ícone/título/descrição, comandos de ordenação/remoção com ícones e seta de escolha de funcionalidade. Esta é a referência visual atual para esse componente.
- Implementação apenas na branch da PR #664: `shell.css` restaura logo recolhida sem caixa, 52px, correção óptica vertical de -4px (variante -3px em altura baixa), sem alterar logo expandida e preservando Sair vermelho; `HomeGlyph.tsx` inclui ícone lápis; `QuickActions.tsx` faz botão icon-only de lápis/check com tooltip, cards fiéis ao formato dos atalhos, seta de seleção que abre um catálogo e permite troca segura de posições sem IDs duplicados; `quick-actions.css` foi reconstruído do zero para evitar camadas sucessivas; `scripts/meg-08-home-quick-actions.browser.mjs` verifica troca/reversão, tooltip, geometria e posições.
- **Limite funcional honesto:** só as quatro ações existentes e autorizadas na Home são oferecidas no seletor; não se deve anunciar todas as funcionalidades como operacionais sem auditar rotas reais, permissões e contrato de navegação. O seletor está preparado para futuros itens e exibe a limitação claramente. Operações permanecem no comportamento de demonstração atual até implementação da navegação real.
- Testes/deploy desta rodada devem ser reconfirmados no SHA final; somente URL Render `live` sem cache pode ser apresentada. Nada desta tela fica homologado sem aprovação visual explícita do usuário. PR #664 em Draft; não merge, Android/API/banco, PRs #656/#663 preservados.

### 10/11/2026 — resultado técnico da rodada de personalização com selector
- Corrigido defeito de clique no seletor: item escolhido precisa passar `item.id` para `replace`, não objeto completo; testes de troca e reversão agora aprovados.
- Ajuste de alinhamento aferido no navegador entre topo da marca recolhida e o botão Expandir: reposicionamento óptico de `translateY(5px)`, com tolerância automatizada máxima de 4px. Logo sem caixa, SVG completo. Excluídas regras CSS redundantes/obsoletas da logo para reduzir sobreposição.
- CI do código `9655d00de9443960199c43366bf92df648033072`: [workflow 42897022365](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42897022365) **success**. Logs: **16 cenários originais da Home, zero falhas**; **189 verificações da Home PT2 em oito viewports, sem falhas**.
- Render serviço isolado `srv-dbpmnrd6e07s73dflai0`: deploy SHA `9655d00de9443960199c43366bf92df648033072` confirmado **live**, em `https://meg-home-08-acoes-pr664.onrender.com/fluxo-integrado-08.html?tela=home&v=9655d00de9443960199c43366bf92df648033072`.
- **Ainda não homologado visualmente pelo usuário**; catálogo só contém destinos oficialmente existentes na Home; navegação operacional e sincronização entre dispositivos seguem pendentes. Sem merge/deploy de produção, Android, API, banco, PRs #656 e #663 intocados.

### 10/11/2026 — Home PT2 corrigida: ordem horizontal + placeholders tracejados
- Usuário rejeitou explicitamente seta no cartão como seletor de funcionalidade. Regra correta: **seta esquerda e seta direita servem apenas para reordenar os atalhos na grade**; lixeira remove. A seleção de funcionalidade só aparece quando se clica no cartão pontilhado **Adicionar** de uma vaga vazia.
- Referência entregue pelo usuário: retângulo com cantos arredondados, `stroke-dasharray`, símbolo + e texto Adicionar. Implementação usa CSS `border:2px dashed`, sem fundo sólido pesado, cores da Home oficial, sem reproduzir a legenda técnica de fonte do exemplo. Slots ocupam as vagas não usadas até completar a grade de quatro, tanto na visualização quanto no editor, ajustando para 2 colunas e 1 coluna na responsividade.
- Em `QuickActions.tsx`: removido seletor de troca por seta, controles horizontais, placeholders acionam seletor que mostra somente atalhos aprovados e ainda ausentes; a ordem é preservada no `localStorage` por usuário. `quick-actions.css`: card pontilhado de adicionar. `shell.css`: marca recolhida livre e elevada de `translateY(5px)` para `translateY(2px)`, Sair vermelho preservado.
- CI do código `85d6b8951525d5bc48f0481f0c8d3fd9637f4f09`: [42901645921](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42901645921) **success**, logs confirmam **197 verificações em oito viewports** e **16 cenários da Home original, zero falhas**. Deploy Render deste código confirmado **live**. Teste adicional para dois slots e restauração: commit `8d377d7f367167c5d34c1b23a6cef66f3861949c`, CI próprio ainda a confirmar.
- PR #664 continua Draft e isolada. Não liberar merge nem homologação sem aprovação visual expressa. Manter API, banco, Android, Render de produção e PRs #656/#663 intocados. Catálogo funcional permanece restrito aos destinos que já constavam na Home.

### 10/11/2026 — Home PT2: catálogo expansível e seleção iluminada, ainda sem homologação visual
- Usuário esclareceu que deseja **adicionar novos tipos de atalho sem ter de remover um dos quatro padrões**. Havia restrição indevida de catálogo aos quatro itens e o botão Adicionar sumia quando os quatro estavam ocupados.
- `apps/web/src/meg-web-evolution/home/QuickActions.tsx`: mantidos quatro padrões (Transferência, Pagar conta, Relatórios, Configurações) e incluídos no catálogo **Lançamentos, Cartões e Benefícios**, todos destinos já previstos na union `Action` da Home e nomeados na sidebar oficial. A grade oferece pelo menos um slot tracejado Adicionar enquanto houver opções não utilizadas, mesmo com quatro ou mais ações ativas. Limite baseado no catálogo completo, sem IDs duplicados. Exemplo: quatro padrões + Cartões resultam em cinco cards e um slot de expansão. Persistência local por usuário preservada. **Não cria navegação operacional nova**: a Home demonstrativa ainda usa avisos para destinos sem integração.
- `apps/web/src/meg-web-evolution/shell/shell.css`: substituída borda ciano de seleção no menu recolhido por fundo de halo radial e `drop-shadow` no SVG ativo, sem quadro desproporcional. Marca livre/centralizada e Sair vermelho preservados.
- `scripts/meg-08-home-quick-actions.browser.mjs`: ampliados testes da vaga permanente, adição do quinto atalho (Cartões), persistência após recarga, remoção, restauração, ausência de contorno no ativo e presença de halo luminoso.
- Commit de código `70c7fdbb0b0aed9c8a827e938d950d36656a312c`: workflow [42904473250](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42904473250) **success**. Logs: **277 verificações de personalização em 8 viewports** e **16 cenários originais da Home, zero falhas**. Render `meg-home-08-acoes-pr664` confirmou esse commit **live**.
- A PR #664 segue Draft, sem merge. Nenhuma alteração de produção, Android, API/banco ou PRs #656/#663. **Usuário ainda precisa aprovar o novo aspecto visual explicitamente.** Catálogo adicional não substitui integração de rotas reais, controle de permissões e preferência sincronizada entre dispositivos.

### 10/11/2026 — Home PT2: carrossel ÚNICO, normal e edição na mesma linha
- Usuário determinou substituir a grade e a área de editor duplicada por uma **única faixa horizontal** em ambos os modos, visual minimalista. Todos os cartões ficam na mesma linha com scroll horizontal interno, arraste/toque no mobile e setas de navegação no cabeçalho, sem scroll horizontal da página. O cartão pontilhado **Adicionar** fica sempre no final, inclusive com sete itens.
- O lápis alterna o próprio carrossel para edição; os mesmos cartões mostram ordenar esquerda/direita e lixeira, sem segunda grade ou segundo painel. O botão Restaurar fica apenas como ícone no cabeçalho quando editando. O seletor de novas funcionalidades abre em diálogo sobreposto, **não aumenta a altura do painel**, e mantém apenas destinos já tipados na Home. Quando todos estiverem incluídos, o clique em Adicionar informa exatamente: **"Todos os ícones disponíveis já foram adicionados."**. Preferências continuam locais e isoladas por usuário.
- Reescritos integralmente `QuickActions.tsx` e `quick-actions.css` da Home PT2. Testes de caracterização `scripts/meg-08-home-quick-actions.browser.mjs` verificam uma linha única, estado de edição, setas, sete atalhos, fim de catálogo, persistência, remoção, restauração, scroll responsivo e acessibilidade com alvos de 44 px. A suíte original `scripts/meg-06-home-refino.browser.mjs` foi adaptada **somente para o novo contrato explícito de layout de atalhos**, preservando as verificações financeiras/KPIs/DataGrids/cartões/benefícios e o bloqueio de scroll horizontal externo. O carrossel pode ter scrollWidth interno sem caracterizar transbordamento da página.
- Build/código no commit `16e9d8643017a68c3819627a25957b1cf215b283`: GitHub Actions [42911721817](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42911721817) **success**: 16 cenários originais Home, zero falhas; **245 verificações em 8 viewports**, zero falhas; Render serviço `srv-dbpmnrd6e07s73dflai0` confirmado `live` neste SHA.
- Link público sem cache para inspeção: `https://meg-home-08-acoes-pr664.onrender.com/fluxo-integrado-08.html?tela=home&v=16e9d8643017a68c3819627a25957b1cf215b283`.
- **Sem homologação visual explícita do usuário.** PR #664 permanece Draft, sem merge; Android, API financeira, banco, produção, PRs #656/#663 intocados. A navegação financeira demonstrativa continua sem integração operacional; sincronização de preferência entre dispositivos permanece pendente de contrato backend.

### 10/11/2026 — Home PT2: carrossel circular sem cortes e sidebar com halo redondo
- Usuário rejeitou a lista horizontal com cartão cortado e o card Adicionar fora da linguagem visual; solicitou navegação **circular/infinita**, como nos cartões financeiros, sem borda "quebrada", card Adicionar com identidade consistente, e sidebar recolhida sem retângulo: halo circular no item ativo, no hover e no foco de teclado Tab, preservando Sair vermelho.
- Atualizado **somente** na branch `preview/08-home-acoes-customizaveis-20261110` da PR #664: `apps/web/src/meg-web-evolution/home/QuickActions.tsx` passa a renderizar uma **janela de 1 a 4 cartões completos**, conforme espaço disponível, com rotação circular por setas e gesto de toque, e `Adicionar` como último item da sequência lógica. A edição continua nos mesmos cartões, sem duplicação. Adicionar mantém catálogo atual, opção sempre alcançável e aviso ao completar o catálogo.
- `apps/web/src/meg-web-evolution/home/quick-actions.css`: grid de janela circular que não mostra metade de cartão, Adicionar usando mesmo tamanho/estrutura do card real, borda tracejada sutil e ícone em superfície interna. `apps/web/src/meg-web-evolution/shell/shell.css`: halo circular via pseudo-elemento, ativo/hover/Tab, sem borda externa pesada nos itens de navegação recolhida; Sair vermelho mantido.
- `scripts/meg-06-home-refino.browser.mjs` preserva cobertura dos 16 cenários anteriores, atualizando apenas a caracterização do trilho de ações para a janela circular. `scripts/meg-08-home-quick-actions.browser.mjs` testa ciclo circular, cards completos, 8 larguras, inclusão de 7 atalhos, persistência, restauração, edição, hover/foco e Sair.
- GitHub Actions [42917635009](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42917635009) do commit `c20dda71f35363505262db1972dcd1390debd39e`: **success**, **16 cenários originais, 0 falhas**, **273 verificações da Home 08 em 8 viewports**. Render isolado `srv-dbpmnrd6e07s73dflai0` confirmou este código como **live**.
- URL de validação sem cache do código testado: `https://meg-home-08-acoes-pr664.onrender.com/fluxo-integrado-08.html?tela=home&v=c20dda71f35363505262db1972dcd1390debd39e`.
- **Aguardando homologação visual explícita**. PR permanece Draft e sem merge; Android, API financeira, banco de produção, serviços de produção e PRs #656/#663 preservados. Destinos financeiros ainda são demonstrativos até integração funcional autorizada, e preferência permanece local por navegador.

### 10/11/2026 — Home PT2: halo sem contorno em sidebar aberta E recolhida
- Usuário enviou print oficial atual mostrando que o item Início continuava com contorno retangular quando o menu estava expandido. Exigência: **nenhum item selecionado deve ter borda de seleção, nem com sidebar expandida nem recolhida**. O estado ativo deve ser reconhecido exclusivamente pela luz circular em torno do ícone, com iluminação equivalente em hover e foco por Tab. Sair deve permanecer vermelho.
- `apps/web/src/meg-web-evolution/shell/shell.css`: removido bloco anterior de seleção em CSS específico recolhido e unificado contrato com `.meg-sidebar .meg-nav .meg-nav-item`. Estados ativo/hover/Tab usam pseudo-elemento circular de 46px no centro do ícone, fundo transparente e borda externa transparente; expandido ancora o halo junto ao ícone à esquerda; recolhido centraliza em 50%; rótulo ativo continua legível. Foco por teclado mostra halo mais forte, sem desenhar um novo contorno. Nenhuma mudança na lógica de navegação nem no botão Sair vermelho.
- `scripts/meg-08-home-quick-actions.browser.mjs`: novos cenários em 1024/1366/1920/2560 verificam ativo expandido sem borda, pseudo-elemento 50%, halo e icon glow, mouse hover iluminado, Tab iluminado sem outline, ativo recolhido sem borda e Sair vermelho.
- Commit de código `6d8f179e3306cbf05acf926a878b4e4239f69821`, workflow [42919297379](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42919297379) **success**: **16 cenários originais sem falhas** e **293 verificações da Home 08 em oito viewports**. Render preview isolado confirmado **live** neste SHA.
- Link para validar sem cache: `https://meg-home-08-acoes-pr664.onrender.com/fluxo-integrado-08.html?tela=home&v=6d8f179e3306cbf05acf926a878b4e4239f69821`.
- **Aguardando aprovação visual explícita** do usuário. PR #664 segue Draft e sem merge; produção, Android, API financeira, banco, PR #656 e PR #663 preservados. Integração operacional e preferência sincronizada não tratadas nesta rodada.

### 10/11/2026 — Etapa 08: acabamento gerencial da Home e densidade dos dois DataGrids
- Usuário aprovou **prosseguir com as melhorias propostas**, sem homologar visualmente o resultado final. Escopo autorizado: linhas proporcionais nos dois DataGrids, rodapés alinhados, paginação compacta, indicadores do carrossel, estados de compromisso baseados no status existente, hover/Tab e cabeçalhos. Preservar visual oficial, API/financeiro, Android, banco e demais etapas.
- Auditadas as duas tabelas reais de `HomeDashboard.tsx`: `Últimas movimentações` e `Próximos compromissos`, ambas consumindo `DataGrid` compartilhado, com `pageSize={5}` e persistências independentes. A proporção ruim ocorria porque a direita, com três registros, esticava linhas. A alteração fica em CSS escopado à `.pano-finance-block .pano-grid`, padroniza linhas em 3rem (sem forçar altura no mobile), impede expansão artificial do `tbody`, mantém o rodapé de paginação alinhado, e preserva scroll, filtros, sorts e renderizações.
- O DataGrid compartilhado recebeu **somente uma prop opcional e retrocompatível** `pageSizeOptions?: number[]`, em `types.ts` e `DataGrid.tsx`. Sem a prop, todas as opções originais permanecem. Apenas os grids da Home passam `pageSizeOptions={[5,10]}`, inclusive normalizando preferência local anterior fora das opções (ex. 600) na montagem. Não mudou lógica de filtragem, seleção, paginação ou ordenação de outros consumidores.
- `QuickActions.tsx` recebeu indicadores de páginas clicáveis, acessíveis e sincronizados com a posição do carrossel circular, e `quick-actions.css` uma pílula ciano ativa + bolinhas discretas. Indicadores não aparecem quando há só uma página.
- Os estados já existentes `A pagar`, `Parcial`, `Previsto` ganharam distinção puramente visual na Home (âmbar/azul/ciano). **Não foi inventado status de urgência nem calculado vencimento localmente**; regras de prazo continuam com a camada financeira.
- Teste `scripts/meg-08-home-quick-actions.browser.mjs` expandido para 8 viewports: bolinhas navegáveis, opções 5/10 sem 600, alturas equivalentes das primeiras linhas nas duas tabelas (desktop), preservando os testes existentes de carrossel, edição e sidebar. Sem mexer nas suítes de lógica financeira.
- Branch `preview/08-home-acoes-customizaveis-20261110`, PR [#664](https://github.com/MarcosVilalva/MEG-Platform/pull/664) **Draft sem merge**. Último código `6fabecd2cd376dec8d805a231b95353591280e41`: CI [42922760288](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42922760288) **success**, com **16 cenários da Home original (0 falhas) e 341 verificações da Home 08 (8 larguras)**. O Render isolado `srv-dbpmnrd6e07s73dflai0` confirmou esse SHA como **live**.
- URL de inspeção sem cache do código testado: `https://meg-home-08-acoes-pr664.onrender.com/fluxo-integrado-08.html?tela=home&v=6fabecd2cd376dec8d805a231b95353591280e41`.
- **Não declarar Home homologada visualmente até aprovação explícita.** Destinos reais do carrossel e sincronização entre dispositivos continuam dependentes de contratos e integração de suas etapas, não tratados. Não fazer merge nem alterar produção, Android, API financeira, banco ou PRs #656/#663.

### 10/11/2026 — APROVAÇÃO VISUAL EXPLÍCITA da Home PT2 e prioridades de funcionalidade
- **O usuário declarou textualmente: "VALIDAÇÃO VISUAL APROVADA"**, após inspecionar a prévia da Home com carrossel, dots, DataGrids de densidade equivalente, sidebar e estados visuais. Esta é a **aprovação visual da candidata atual da Etapa 08**, não autorização automática para merge ou deploy de produção. PR #664 continua Draft e isolada.
- Usuário ordenou que a continuidade priorize **divergências e pendências importantes em vez de novas alterações cosméticas**.
- AUDITORIA: em `apps/web/src/meg-web-evolution/main.tsx` o AuthGateway renderiza `<AppShell><HomeDashboard userId={session.user.id}/></AppShell>` sem `onNavigate`. Em `HomeDashboard.tsx`, o fallback `move()` mostra aviso de tela ainda indisponível. Em `shell/AppShell.tsx`, os botões de navegação renderizam sem `onClick`, e o topo `Novo lançamento` também não dispõe de handler operacional. **Portanto a navegação completa NÃO está implementada nesta composição da Web**; não prometer atalhos funcionais nem criar URLs hipotéticas. A prévia visual só demonstra os destinos tipados. **Prioridade P0**: verificar contrato real de roteamento, autenticação, permissões e disponibilidade das telas de suas etapas, sem modificar a API nem implementar funcionalidades financeiras nesta branch. A integração depende da etapa de cada destino e do shell autorizado.
- AUDITORIA: `HomeDashboard.tsx` compõe `commitments` com a lista de eventos `planned` e contas abertas, utilizando data/status para exibição; o conjunto exibido **não contém classificação canônica `overdue/today/upcoming` ou um indicador de urgência fornecido pela API**. Os rótulos visuais atuais `A pagar`, `Parcial`, `Previsto` NÃO são urgência de vencimento. **Prioridade P1**: auditar política/status canônico em `financial-policy.ts`, leitura de vencimentos em `payables/service.ts` e contrato de read model, antes de adicionar indicadores vencido/vence hoje. Não inferir liquidação/urgência por data na Home.
- Preferências de atalhos `QuickActions.tsx`: persistência local isolada por chave user/demo, não sincronizada entre dispositivos. Conforme [#662](https://github.com/MarcosVilalva/MEG-Platform/issues/662), **prioridade P2** e dependência externa: contrato autenticado de preferências, propriedade/isolamento, conflitos, clientes antigos, autorização explícita de schema/endpoint antes de escrita. Não criar tabela, API ou migração no escopo da Home visual.
- Gates após esta aprovação: manter regression tests e CI; verificar mergeabilidade e dependências da base de PR #655 antes de eventual merge. **Aprovação visual ≠ gates de integração ou autorização de deploy**. Não alterar Android, dados de produção, PRs #656/#663 ou etapas 09+.

#### Achado crítico P0 — compromissos previstos vencidos possivelmente omitidos
- Auditando a expressão atual de `HomeDashboard.tsx`, a lista `commitments` contém `[...data.transactions,...followingTransactions]` filtrados por `t.status==='planned' && t.date>=dateNow() && t.signedAmount<0`. **Fato verificável:** um `FinancialEvent` planejado com data anterior à data corrente não entra nessa lista por este caminho. Em contraste, as contas `payables` abertas são incluídas por `status!='paid'/'cancelled'` e `openAmount>0`, sem a mesma barreira de data. Há risco de um compromisso financeiro vencido desaparecer da visão de compromissos, mesmo que esteja em aberto.
- A presença ou ausência de eventos históricos na resposta API e o tratamento contábil correto de vencidos ainda precisam de auditoria canônica; **não alterar filtro local improvisadamente**, especialmente porque `readHome` busca eventos somente do mês corrente e mês seguinte. O fluxo correto deve vir de fonte de leitura que inclua os vencidos abertos e informe o estado canônico, conforme `docs/MEG-WEB-FINANCIAL-AUTHORITY.md`, sem duplicidade entre eventos e contas a pagar.
- Prioridade efetiva: **P0 integridade da lista de compromissos e vencidos**, P1 navegação real autorizada, P2 sincronização de preferências. Esta nota complementa a priorização operacional anterior e não equivale a correção implementada. A Home permanece visualmente aprovada, porém com pendência funcional crítica expressamente aberta.

### 10/11/2026 — Auditoria P0 concluída, correção financeira permanece bloqueada por contrato
- Ao comando **“então vamos seguir”**, retomou-se exclusivamente o risco de **compromissos previstos vencidos omitidos da Home** (issue #667), sem alterar finance API, writers, Android, banco nem produção.
- Resultado confirmado em código: `HomeDashboard.tsx/readHome` consulta `GET /finance/events/month` apenas mês selecionado + seguinte; `listPhoenixFinancialEventsForMonth` restringe à competência da consulta; `HomeDashboard.tsx/commitments` exclui `planned` com `date < dateNow()`. Assim, mesmo os previstos vencidos no mês corrente são excluídos, e os de meses anteriores nem são carregados. `GET /payables/open` já retorna payables abertos sem corte temporal, mas `GET /finance/events` geral é paginado sem filtro por status, sendo inadequado varrer todo o histórico por Egress/desempenho.
- Modelo `PayablePayment.financialEventId` comprova a existência de vínculo de pagamento com `FinancialEvent`; deduplicação de compromissos deve ser baseada na identidade canônica e nas autoridades financeiras, nunca em descrições/valores coincidentes.
- Criado `docs/MEG-WEB-HOME-OVERDUE-READ-CONTRACT-20261110.md` no commit `4a9ba86efbda11668c38c7aa31376070ff1fabcc`, com evidências, requisitos mínimos de fonte read-only, fuso/estado de urgência a definir, limite/paginação para proteger Egress, isolamento por workspace e matriz de casos de teste. Issue #667 comentada com achados e bloqueio técnico.
- **Correção ainda NÃO implementada**, pois a fonte canônica necessária demandará autorização de alteração de código da camada financeira de API em branch própria e respectivos testes; não resolver por filtro de frontend incompleto ou varredura custosa do histórico. Sem aprovação dessa integração, manter Home visualmente homologada mas funcionalmente pendente e PR #664 Draft, sem merge.

### 10/11/2026 — Autorização expressa e implementação P0 de leitura financeira em branch separada
- Usuário **autorizou explicitamente** alterar somente a leitura da API financeira para resolver a omissão de compromissos vencidos, em branch separada, **sem migração, sem alteração de pagamento/saldo e sem deploy de produção**.
- Branch: `audit/08-home-p0-overdue-read-20261110`; PR [#668](https://github.com/MarcosVilalva/MEG-Platform/pull/668) **Draft**, baseada em `preview/08-home-acoes-customizaveis-20261110` (PR #664 visualmente aprovada, não mergeada). Alterações limitadas ao novo `home-commitments-core.ts`, `home-commitments-read.ts`, testes, `finance/routes.ts`, workflow de CI e documentação/checkpoint.
- Implementado `GET /finance/home-commitments` autenticado e estritamente read-only. Resolve proprietário via `resolveWorkspaceContext(userId)`; lê dois conjuntos limitados (`limit+1` eventos previstos e payables abertos), incluindo vencidos de meses anteriores. Paginação por cursor de data/origem/ID, estados `overdue/due_today/upcoming` calculados no servidor com referência São Paulo; moeda retornada em string decimal. Exclui eventos de benefício, compras por modalidade de crédito e eventos já vinculados a `PayablePayment`; não deduplica obrigações distintas por texto/valor.
- API **não varre todo o histórico** e o cliente não deve confundir página sem itens elegíveis com ausência de compromissos quando `hasMore:true`. Falhas de leitura não viram falso zero.
- CI [42939308455](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42939308455) do código `16541dfd96e9d79fbd8aae30b30a1034571d3aeb`: **success**. Inclui `npm --workspace apps/api run build`, novo teste de contrato, toda a suíte `test:finance`, e gate contra alteração em Android, writers, schema ou arquivos fora do escopo.
- Contrato técnico atualizado: `docs/MEG-WEB-HOME-OVERDUE-READ-CONTRACT-20261110.md`. Issue #667. **A Home ainda NÃO consome este endpoint**; correção P0 de ponta a ponta continua pendente de implantação/autorização de integração, revisão de desempenho e testes com dados reais. A aprovação visual da Home permanece registrada.
- **Nenhum deploy ou merge executado**. Produção, banco, Android, APIs financeiras existentes e PRs #656/#663 intocados.

### 11/11/2026 — P0: integração da leitura canônica de vencidos na Home, sem merge/deploy
- Autorização de continuidade do usuário: **“seguir para proxima etapa”**. Nesta conversa, significa continuar o P0 de compromissos pendentes da Home, **sem avançar para telas futuras**, sem writers, sem banco/migrations, sem Android e sem deploy de produção. Base de autoridade da PR #668, com Home visualmente homologada na PR #664.
- Criada branch isolada `integration/08-home-p0-canonical-20261111`, PR [#669](https://github.com/MarcosVilalva/MEG-Platform/pull/669) **Draft**, empilhada sobre a PR #668. Nenhum merge.
- `apps/web/src/meg-web-evolution/home/home-commitments-read.ts`: consumidor autenticado de `GET /finance/home-commitments`, lê até **4 páginas x limit=16** de forma encadeada, até obter **8 compromissos válidos**, respeitando `hasMore`/cursor mesmo quando uma página intermediária vem sem itens elegíveis. Detecta loop/duplicação de IDs, mudança de dia de referência, resposta inválida e erro da fonte; **fail closed**, nunca apresenta lista parcial ou falsa ausência de compromissos quando não consegue concluir a leitura.
- `HomeDashboard.tsx`: em **sessão real** usa exclusivamente a lista canônica (status, datas, valores abertos e urgência retornados pela API); não calcula urgência na UI. Dados fictícios da **prévia visual** preservam a composição homologada e os filtros antigos só para `previewData`. Falha da fonte canônica dispara erro geral de leitura, não fallback para estimativa local. Os demais cartões/grids preservados.
- `home-dashboard.css`: diferencia `overdue` e `due_today` com ícone/contraste discreto dentro da coluna Situação, sem criar coluna ou alterar a geometria dos grids. A aparência dessas duas indicações **ainda requer homologação visual específica** quando houver prévia funcional, apesar do restante da Home permanecer aprovado.
- `home-commitments-read.contract.test.ts`: valida página vazia com `hasMore`, continuidade, oito itens, cursor inválido/repetido, duplicatas, mudança de data, falha HTTP, resposta corrupta, limitador de 4 consultas e ausência de classificação de vencimentos no frontend.
- CI [42956746188](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42956746188) **SUCCESS** no commit funcional `05011c4201c71b04b78fb201175db6a8f0fa8035`: build da API, nova fonte API P0, suíte financeira completa, teste do consumidor da Home, build Vite, **16 cenários visuais originais / 0 falhas**, **341 verificações de ações rápidas / 8 viewports**, gate de arquivos autorizados e artefato estático do preview. Não houve deploy.
- **P0 de ponta a ponta ainda NÃO validado com API/DB integrados**: falta teste ponta a ponta autenticado em ambiente isolado com dados fictícios, revisão de plano de consulta/índices (sem migração autorizada), implantação de API e Web coordenada e posterior aprovação específica dos indicadores de urgência. A rota ainda não está disponível em produção; publicar apenas a Web antes da API **faria a Home falhar de maneira segura**, então **não publicar isoladamente**.
- PRs #664 e #668 continuam Draft sem merge. Produção, dados financeiros reais, Android, Render produtivo e PRs #656/#663 preservados. Última versão visual homologada continua a prévia da PR #664, **não confundir com build da integração #669**.

### 11/11/2026 — Complemento P0: teste E2E autenticado fictício e redução de Egress, gates verdes
- Após CI inicial funcional [42956746188](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42956746188) verde, aprimorada a integração da PR [#669](https://github.com/MarcosVilalva/MEG-Platform/pull/669), mantendo Draft e sem merge.
- Em `HomeDashboard.tsx/readHome` foram **removidas as chamadas autenticadas redundantes** `GET /payables/open` e `GET /finance/events/month` para o mês seguinte, pois a fonte `GET /finance/home-commitments` já substitui essa composição. As propriedades `payables/followingTransactions` continuam no tipo de dados fictícios `previewData` para preservar a prévia homologada; no fluxo real esses conjuntos ficam vazios e o DataGrid usa exclusivamente `canonicalCommitments`.
- `apps/web/vite.fluxo-integrado-08.config.ts` inclui, **apenas no build isolado de QA**, a entrada autenticada `web-evolution.html` além da prévia estática. Criado `scripts/meg-home-p0-authenticated.browser.mjs`: navegador Playwright com sessão e APIs fictícias interceptadas, verificando um vencido de meses anteriores, vencimento de hoje com status parcial, futuro, página vazia com `hasMore:true` e cursor, ausência das duas requisições redundantes, ausência de mudança na estrutura dos DataGrids e falha HTTP 503 sem falso estado vazio. Não houve consulta real a banco, API ou serviço produtivo.
- Workflow específico `.github/workflows/meg-home-p0-integration.yml` executa build API, suíte financeira completa, contrato do cliente, build visual, regressões visuais originais, E2E fictício e gate de arquivos; substituído artefato pesado de ~180MB por capturas de QA pequenas, preservando recursos.
- CI [42958086214](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42958086214), código `d92a48db90db39890b9ac4a179ed5d7484261ce8`: **SUCCESS**. Logs: **16 cenários originais (0 falhas); 341 verificações em 8 viewports; Home P0 E2E fictício aprovado**, além da suíte financeira da API e teste do consumidor. Sem migrações, alterações no Android, writers ou dados reais.
- **P0 integrado no código e validado com dados fictícios; ainda não validado contra ambiente de integração com banco realista/volumoso**. A sequência API #668 → Home #669 requer gates de deploy e coordenação. **NÃO publicar a Home antes do endpoint de API**, pois ela falhará de forma segura quando a rota não existir. Revisão de plano de consulta/custos e homologação visual específica dos indicadores de urgência permanecem pendentes.
- A Home PR #664 continua visualmente aprovada (não autoriza homologar automaticamente o novo estado `Vencido/Vence hoje` de #669). Sem preview live específico de #669: workflow gerou QA com servidor local e artefatos, portanto não inventar link de Render para a nova versão. PRs #664/#668/#669 continuam Draft, sem merge, produção, Render produtivo, banco e Android intocados.

### 11/11/2026 — Continuidade da PR #669: falha fechada da Home corrigida
- Na revisão do consumidor P0 foi identificada uma divergência de apresentação: quando a consulta autenticada falhava, a Home mostrava o alerta, mas ainda renderizava `HomeContent` com `emptyState`, expondo DataGrids vazios sob o aviso. Isso poderia sugerir ausência de compromissos mesmo em erro de consulta.
- Corrigido somente `apps/web/src/meg-web-evolution/home/HomeDashboard.tsx`: após erro de leitura, permanece o alerta com opção **Tentar novamente**, sem renderizar os quadros financeiros vazios. A prévia fictícia e o layout funcional aprovado não foram alterados.
- Expandido `scripts/meg-home-p0-authenticated.browser.mjs` para exigir, no cenário HTTP 503, que nenhum `.pano-grid` seja apresentado e que o botão de repetição esteja disponível. Não foram alterados regras financeiras, API, banco, Render, Android ou produção.
- Branch `integration/08-home-p0-canonical-20261111`, PR [#669](https://github.com/MarcosVilalva/MEG-Platform/pull/669) em Draft, sem merge. Commits funcionais: `5de4b57f4a40267541cbbaa05d328da8da82416a` e `a55c2c47f00e8d569c33535f25cfde7fb8df2321`. **Os gates técnicos desses novos commits ainda precisam de confirmação; não confundir com CI verde do commit anterior `d92a48db90db39890b9ac4a179ed5d7484261ce8`.**
- Pendências críticas preservadas: teste integrado em ambiente isolado com dados fictícios realistas/volume; análise de plano de consulta e custo, especialmente índices de `FinancialEvent`; homologação visual específica dos indicadores de urgência; estratégia coordenada API → Home com autorização de deploy. Não publicar Web #669 antes do endpoint #668.

### 11/11/2026 — P0 PostgreSQL 17 isolado, volume fictício e planos de consulta (preparação)
- Continuidade autorizada pelo usuário (“vamos prosseguir”) mantida exclusivamente na **Etapa 08 — Home PT2 / P0 compromissos**. Nenhuma autorização de produção, merge ou migração.
- Criado `apps/api/src/modules/finance/home-commitments-postgres-isolated.test.ts` na PR [#669](https://github.com/MarcosVilalva/MEG-Platform/pull/669). **Bloqueio obrigatório:** só executa se `DATABASE_URL` for exatamente `postgresql://meg_qa:meg_qa@127.0.0.1:5432/meg_home_p0_qa?schema=public`; também exige banco vazio. Recusa endpoints remotos e credenciais distintas.
- Adicionado serviço `postgres:17` descartável em `.github/workflows/meg-home-p0-integration.yml`, com banco/usuário/senha fictícios e `prisma db push` **somente no banco efêmero do job**. Não usa secrets, banco Supabase ou Render.
- Teste de integração sem escrituras financeiras operacionais: gera 2 proprietários/workspaces fictícios e 2.500 eventos + 1.000 Payables sintéticos; exercita **o serviço de leitura canônico real** (não mock), com vencido antigo/hoje/futuro, valor parcialmente aberto, 2 despesas iguais independentes, evento vinculado a pagamento sem duplicação, exclusão de benefício/cartão/pago/cancelado/arquivado, isolamento de workspace e cursor em duas páginas.
- O job também coleta via `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` os planos das duas queries principais do PostgreSQL, somente com dados fictícios e limite 17. Tempos/planos são diagnósticos, **sem pressupor benchmark representativo da produção**.
- Risco preliminar a confirmar pelo plano: `FinancialEvent` tem índice `[workspaceId,date]` no Prisma, mas a nova leitura filtra por `userId/status/type/signedAmount` e ordena por data/ID; `Payable` já tem índice `[userId,dueDate]`. **Não criar índices sem auditoria e autorização específica**.
- Commits nesta rodada: `c208558639d0ad9c0a785febd51fdaee8bb4bb1f` (teste) e `70f7579cd80f370948d5c1ba1c2182c32eebbd9a` (workflow). **Novos resultados da CI ainda não confirmados no momento deste registro**; não declarar teste de banco aprovado por ter sido configurado.
- Pendências: confirmar CI no novo SHA; revisar resultados EXPLAIN reais do banco descartável; avaliar teto de 8 compromissos e caminho de consulta integral; ensaio de API HTTP autenticada + frontend contra banco efêmero; homologação específica dos estados de urgência; coordenação de publicação API → Home somente após autorização expressa. Sem alteração de produção, banco, Android ou serviços Render.

### 11/11/2026 — Home P0: ensaio PostgreSQL 17 verde, planos inspecionados e QA visual isolado
- Continuou-se a **Etapa 08 / PR #669**, sem merge/deploy, sem tocar em dados reais, Supabase, Android, produção ou PRs de outras etapas.
- Teste de integração `home-commitments-postgres-isolated.test.ts` executou **o serviço canônico de leitura real** em PostgreSQL 17 do próprio GitHub Actions, com 2 workspaces, 2.500 FinancialEvents e 1.000 Payables sintéticos e casos adicionais. A conexão é rigidamente travada em `127.0.0.1/meg_home_p0_qa`; o workflow verifica a URL **ANTES** do `prisma db push`, e o teste exige banco vazio. Nenhuma conexão real fora do job.
- Contratos exercitados: vencidos antigos e de hoje, datas futuras, moeda decimal e saldo aberto parcial, duplicidades genuínas, exclusão de eventos de benefício/crédito, evento de pagamento vinculado, payables encerrados e isolamento entre dois proprietários. Paginação real por cursor testada.
- O `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` em consultas sintéticas representativas dos filtros (seleção apenas de ID) confirmou:
  - `FinancialEvent`: `Limit → Sort → Seq Scan`, **0,762 ms** em ~2.500 eventos, 63 hits de buffer; índice existente `[workspaceId,date]` não foi usado nesse plano.
  - `Payable`: `Limit → Incremental Sort → Index Scan` pelo índice `Payable_userId_dueDate_idx`, **0,032 ms** em ~1.000 contas, 19 hits de buffer.
  - Esses tempos são exclusivamente QA fictícia, **não benchmark de produção**, e o plano simplificado não inclui todas as consultas auxiliares/relações que o Prisma realiza. Avaliar índice parcial baseado em proprietário, data e ID para `FinancialEvent` após estudo; **nenhuma migration autorizada**.
- A falha crítica anterior em HTTP 503 ficou protegida pelo E2E: não renderizar DataGrids vazios após erro, mantendo alerta e botão `Tentar novamente`.
- E2E capturou Home autenticada com dados 100% fictícios nas larguras **1366 e 375 px**, inclusive painéis de `Próximos compromissos`. O desktop tem tabela com rolagem horizontal interna; o mobile exibe cards com urgência. A evidência mobile mostra item de 05/07/2026 com sinalização vermelha, mas texto `Previsto`; diferenciação visual ainda aguarda **aprovação explícita**, pois a semântica `overdue` vem da API, sem substituir o status financeiro.
- Último commit de código validado: `86583002337f6986ea33aba8388f3610af9eb5f7`. GitHub Actions [42962597203](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42962597203): **SUCCESS**, incluindo PostgreSQL sintético + API finance tests + Home P0 client + build Vite + 16 cenários originais sem falha + 341 verificações em 8 viewports + navegador autenticado com capturas desktop/mobile. Artefato: `meg-home-p0-qa`, ID `13829628716`. Nenhum deploy.
- Arquivos modificados nesta continuidade: `apps/api/src/modules/finance/home-commitments-postgres-isolated.test.ts` (novo), `.github/workflows/meg-home-p0-integration.yml`, `scripts/meg-home-p0-authenticated.browser.mjs`, mais checkpoint.
- **Pendências reais**: endpoint HTTP autenticado com API e banco de teste integrados (o E2E atual intercepta APIs fictícias); análise de volume/índice sem alterar produção; comportamento de lista com >8 compromissos; preview funcional coordenado API+Web somente após autorização; aprovação visual específica da sinalização de urgência. PRs #664/#668/#669 continuam Draft sem merge.

### 11/11/2026 — TESTE HTTP P0 EXECUTADO E APROVADO (PostgreSQL 17 descartável)
- Autorização do usuário: “vamos realizar o teste”. Escopo: Etapa 08, PR #669, leitura `GET /finance/home-commitments` autenticada integrada ao PostgreSQL local e consumidor Web. **Não autorizou merge, deploy, alterações de índice ou banco produtivo.**
- Criado `apps/api/src/modules/finance/home-commitments-http-isolated.test.ts`: usa **Fastify real, `registerAuth` com JWT real, `financeRoutes` real e HTTP via socket `127.0.0.1`**, além do PostgreSQL 17 descartável povoado no step anterior. Também importa em tempo de execução o consumidor `readCanonicalHomeCommitments` da Web para verificar `cliente → HTTP → auth → API → banco`. **Não usa** `server.ts`, porque aquele entrypoint pode iniciar manutenção e writers em background. Não usa browser neste teste específico; o browser tem QA fictício separado.
- Segurança: a execução exige conexão `postgresql://meg_qa:meg_qa@127.0.0.1:5432/meg_home_p0_qa?schema=public`, `NODE_ENV=test`, `MEG_HOME_P0_HTTP_QA=1` e JWT fixo exclusivamente fictício. Servidor escuta `127.0.0.1` em porta efêmera. Confere existência das 2 contas e dos 2 workspaces sintéticos, sem criar/migrar dados neste teste. Nenhuma rede/API Supabase, Render, dados reais ou writers financeiros.
- Casos aprovados: sem token/credencial inválida → HTTP 401; papel inválido → HTTP 403; filtros/limites/cursor inválidos → HTTP 400; GET válido → HTTP 200 e `Cache-Control: private, no-store`; proprietário A versus B segregados; vencidos antigos, pagas/parciais e monetário versus benefício/crédito; obrigações distintas de mesmo valor não colapsadas; valores decimais; paginação real sem IDs duplicados. Também foi testado o cliente real da Home lendo a fonte real via HTTP.
- Evidência objetiva do log: `{"result":"PASS","auth":{"missing":401,"invalid":401,"unauthorizedRole":403},"validation":400,"workspaces":2,"events":2511,"apiPageSize":13,"nextPageSize":16,"visibleCommitments":8,"uiCalls":1,"totalReadRequests":11}`. A primeira página contém **13 elegíveis**, embora a API leia até 16 candidatos, porque aplica exclusões canônicas; o teste foi corrigido para respeitar isso, sem alterar regra financeira.
- **CI final [42964977089](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42964977089): SUCCESS** no código `6b180bd9f51f9c9ee72857c2292062e7d9474865`. Passaram build API, testes de fonte financeira, banco sintético, HTTP+JWT+consumidor Web, contrato do cliente, build Vite, 16 cenários visuais originais (0 falhas), 341 verificações (8 viewports) e E2E navegador fictício, bem como gate de arquivos autorizados.
- Arquivos desta entrega: `apps/api/src/modules/finance/home-commitments-http-isolated.test.ts` (novo), `.github/workflows/meg-home-p0-integration.yml` e este checkpoint. Não alterou finance writers, API existente, schema/índices, produção, Android nem serviços.
- **Pendências mantidas**: testar a Home renderizada no navegador com **a API HTTP+PostgreSQL reais** (hoje o navegador usa interceptações fictícias, enquanto o novo consumidor Web em teste Node usa HTTP real); avaliar consulta de mais de 8 compromissos/encaminhamento à listagem completa; estudar índice de `FinancialEvent` em ambiente isolado sem migration; homologar visualmente estados `Vencido/Vence hoje`; coordenar implantação API→Web em autorização específica. PRs #664/#668/#669 permanecem Draft, sem merge e sem preview publicado da nova integração.

### 11/11/2026 — Home PT2: navegador REAL → API HTTP/JWT REAL → PostgreSQL QA, APROVADO
- Autorização do usuário: "vamos testar". Escopo EXCLUSIVO da Etapa 08, prioridade P0. PR #669 permanece **Draft** e empilhada sobre #668. **Não houve merge, publicação de preview, deploy de produção, alteração no Android, Supabase, financeiro ou migração de índices.**
- Criado \`scripts/meg-home-p0-live-browser.browser.mjs\` (Playwright via \`npx tsx\`) e passo dedicado em \`.github/workflows/meg-home-p0-integration.yml\`, com gate de arquivos e evidências visuais. Os testes anteriores de contratos, PostgreSQL, HTTP/JWT e regressão visual permanecem obrigatórios.
- Banco **PostgreSQL 17 descartável** da própria CI. O script exige URL exata \`postgresql://meg_qa:meg_qa@127.0.0.1:5432/meg_home_p0_qa?schema=public\`, ambiente \`NODE_ENV=test\`, JWT exclusivamente fictício e flag \`MEG_HOME_P0_HTTP_QA=1\`. Fastify real registra as rotas existentes \`authRoutes\` e \`financeRoutes\`; é iniciado somente em \`127.0.0.1\`, porta efêmera, **sem carregar \`server.ts\`**, que dispararia tarefas de manutenção. Servidor de arquivos QA responde apenas em loopback e encaminha HTTP GET de \`/auth/me\` e \`/finance/home-commitments\` à API REAL. **Nenhuma interceptação das respostas dessas duas rotas no navegador.** As demais oito fontes auxiliares da Home têm mocks explícitos no gateway local (24 leituras fictícias), para isolar o escopo P0. Nenhum POST/PATCH/DELETE é encaminhado; nenhuma consulta à produção.
- No primeiro ensaio, a autenticação \`/auth/me\` retornou HTTP 500 porque a fixture não continha plano/assinatura exigidos por \`workspaceSeatSummary\`. Corrigida **somente a fixture de QA**, acrescentando \`Plan\` e \`WorkspaceSubscription\` sintéticos aos dois workspaces. Na segunda execução, \`/auth/me\` e a API P0 retornaram HTTP 200. O segundo bloqueio foi apenas no teste de navegador: tentou localizar a obrigação parcial na primeira página de um DataGrid com paginação 5, quando ela estava na página 2. Corrigido o teste para selecionar "10 por página". Nenhuma regra, UI ou writer financeiro foi alterado.
- GitHub Actions [42966819885](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42966819885) **SUCCESS** no commit funcional \`34e3873beb82018d6259fa665379a07fd2264024\`. O log registra literalmente: \`{"result":"PASS","cases":[{"name":"A-desktop-1366","width":1366,"apiCalls":1,"horizontalOverflow":false},{"name":"A-mobile-375","width":375,"apiCalls":1,"horizontalOverflow":false},{"name":"B-mobile-375","width":375,"apiCalls":1,"horizontalOverflow":false}],"realCommitmentRequests":3,"realAuthRequests":3,"auxiliaryFictitiousRequests":24,"blockedRequests":0}\`. Também passaram build API, regressão financeira, PostgreSQL, contrato HTTP/JWT, build Web, **16 cenários visuais originais (0 falhas)**, **341 verificações em 8 viewports**, E2E anterior com APIs simuladas e gate de arquivos.
- Fotos de QA geradas em \`artifacts/meg-home-p0-live\` para 1366 desktop, 375 mobile A e 375 mobile B (Home inteira e painel de compromissos). Workflow publica temporariamente o artefato \`meg-home-p0-qa\`, ID **13830708972**. **Não é um preview web publicado nem substitui a homologação visual explícita pelo usuário.**
- Revisão visual da captura: o vencido está sinalizado em vermelho, mas o texto do status permanece \`Previsto\` para a fonte FinancialEvent, preservando a distinção entre situação financeira e urgência. A captura também apresenta o mês \`Outubro de 2026\` no topo, embora o teste use obrigações de novembro e a API compute seu dia-base de forma independente; **não está confirmada a causa ou se há divergência real de relógio/período**, exigindo investigação antes de mudança funcional. Não alterar layout homologado por inferência.
- Arquivos alterados nesta continuidade: \`scripts/meg-home-p0-live-browser.browser.mjs\` (novo), \`apps/api/src/modules/finance/home-commitments-postgres-isolated.test.ts\` (fixture apenas), \`.github/workflows/meg-home-p0-integration.yml\` e este checkpoint.
- **Pendências**: (1) homologação visual explícita dos estados vencido/hoje e do comportamento mobile; (2) conferir aparente divergência mês do cabeçalho versus data-base da API em QA; (3) mecanismo de consulta de >8 compromissos sem sugerir lista completa; (4) análise de possível índice \`FinancialEvent\` somente em QA, sem migrations de produção; (5) coordenação API #668 → Home #669 e estratégia de deploy só com autorização própria. **Não declarar Etapa 08 concluída.**

### 11/11/2026 — Prévia estática isolada Home P0 PR #669 publicada para validação
- Usuário pediu expressamente "gere o link para teste". Foi criado **site estático separado no Render**, workspace anteriormente confirmado **My Workspace** (`tea-d98k1qhkh4rs73f4sfj0`), sem alterar sites antigos, API, Supabase ou Android.
- Serviço `meg-home-p0-qa-pr669`, ID `srv-dbq07fjl550s7395ht1g`, branch isolada `preview/08-home-p0-qa-pr669-20261111`, com `autoDeploy=no`. Build específico `vite.home-p0-qa.config.ts` publica apenas a prévia `fluxo-integrado-08.html`, **sem a entrada de login autenticado `web-evolution.html`**. Deploy `dep-dbq07frl550s7395htt0`, commit `86305c97457f3b4ffefdd9a032b9caa45c69177f`, status **LIVE** confirmado no Render.
- **URL de validação sem cache:** https://meg-home-p0-qa-pr669.onrender.com/fluxo-integrado-08.html?tela=home-p0&v=86305c97457f3b4ffefdd9a032b9caa45c69177f
- O novo modo `?tela=home-p0` reutiliza a Home e DataGrid existentes da PR #669, com `home-p0-qa.preview.fixture.ts` **100% fictício**, separando oito registros plausíveis do contrato já ensaiado em CI: vencido antigo, pagamento parcial, vencido recente, vencimento hoje e futuro. O cabeçalho apresenta Novembro de 2026 e o rodapé exibe "QA visual P0 · Dados fictícios · Sem conexão com API".
- **Atenção:** prévia pública é exclusivamente **visual interativa, sem API real e sem leitura de banco**. Não chamar de "integração de produção" nem usá-la para validar cálculo financeiro; a integração real navegador→Fastify/JWT→PostgreSQL 17 foi aprovada **somente na CI isolada** [42966819885](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42966819885).
- Publicação foi verificada como LIVE pelo provedor; acesso externo no navegador do usuário e **aprovação visual explícita** ainda não foram confirmados. Não considerar a tela homologada por ter build/deploy verde.
- PRs #664, #668 e #669 permanecem Draft, sem merge ou deploy de API. A branch QA é independente e não modifica código financeiro, schema, writers, Android ou serviços produtivos.

### 11/11/2026 — Retorno de validação visual do usuário, com ressalva de legibilidade e urgência
- O usuário abriu o preview independente `https://meg-home-p0-qa-pr669.onrender.com/fluxo-integrado-08.html?tela=home-p0` e enviou uma captura real do navegador desktop em 11/11/2026, dizendo expressamente: **"apesar da tabela nao frisar o q esta vencido ou a vencer vou validar, esta pequeno"**.
- Interpretar como **aceite visual do layout/composição geral com ressalvas expressas**, e NÃO como aprovação integral da legibilidade ou da comunicação de vencimentos. Não classificar os indicadores `overdue`/`due_today` como homologados nem encerrar P0 enquanto as ressalvas estiverem abertas. A prévia permanece somente demonstrativa com dados fictícios.
- Evidência visual da captura: a tabela de "Próximos compromissos" usa caracteres pequenos; o DataGrid possui rolagem horizontal interna e a coluna "Situação" (onde ficam informações de urgência) não aparece na área inicialmente visível. Consequência: um compromisso vencido pode aparecer sem diferenciação de urgência óbvia para o usuário, ainda que o backend devolva `dueState` corretamente.
- Direção funcional a avaliar na própria Etapa 08: **tornar `Vencido`, `Vence hoje` e `A vencer` imediatamente visíveis sem rolagem horizontal**, preferencialmente junto à data de vencimento; aumentar a legibilidade sem deformar o layout oficial e testar mobile 375 px e desktop 1366 px. Rotulagem deve consumir exclusivamente `dueState` canônico recebido da API, sem calcular vencimentos, saldos ou status na UI; preservar status `planned`/`partial` separadamente. Alteração visual só em branch isolada, com nova prévia, regressão e solicitação de aprovação específica.
- **Outra divergência na captura**: seletor superior mostra `Outubro de 2026` enquanto a fixture P0 descreve obrigações de novembro. Verificar se cabeçalho do shell é estático/legado antes de alterar qualquer código. Evitar inferir regra de competência a partir do QA estático.
- Nenhuma implementação adicional autorizada por esse comentário; registrado apenas o feedback do usuário. PRs permanecem Draft, sem merge/produção/Android afetados.

### 11/11/2026 — Correção de legibilidade e urgência da Home P0, CI e prévia independente
- Continuidade autorizada expressamente pelo usuário: **"siga com as correcoes"** após validar layout geral com ressalvas de fonte pequena e urgência invisível sem rolagem. Escopo estrito da **Etapa 08 / Home PT2 P0**, sem alteração Android, finance writers, schema, API de produção, Supabase ou serviços produtivos.
- Diagnóstico: a coluna `Situação` era a única com indicação de urgência e ficava fora do campo visível do DataGrid devido à sua rolagem horizontal interna. A tipografia da tabela de compromissos estava em `.71rem`; o seletor do Shell mostrava `Outubro de 2026` codificado no componente, sem relação com a Home autenticada.
- Implementação em `apps/web/src/meg-web-evolution/home/HomeDashboard.tsx`: `date` possui renderizador próprio com data e rótulo textual **Vencido / Vence hoje / A vencer**, com contraste e estado acessível `aria-label` na **primeira coluna**; usa exclusivamente `row.dueState` vindo do endpoint canônico, sem qualquer cálculo de vencimento. `Situação` volta a representar apenas status financeiro `Previsto`, `Parcial` ou `A pagar`; classe `pano-grid--commitments` isola estilos.
- `apps/web/src/meg-web-evolution/home/home-dashboard.css`: ampliada a fonte da tabela somente na seção dos compromissos, badges textuais, cor e leitura mobile; **mantida densidade de 48 px para os dois DataGrids**. Primeiro ensaio falhou na comparação de densidade em 1024 px (esquerda 48 px, direita ~40,61 px); corrigido CSS e regressão original aprovada novamente. Não houve mudança na biblioteca DataGrid.
- `apps/web/src/meg-web-evolution/shell/AppShell.tsx` recebeu prop opcional `periodLabel` preservando período padrão de telas/previews anteriores. `apps/web/src/meg-web-evolution/main.tsx` passa o mês atual `pt-BR` calculado no fuso `America/Sao_Paulo` para o Shell autenticado. Trata apenas exibição do mês civil, sem alterar períodos financeiros. A prévia estática P0 explicita `Novembro de 2026` consistente com seus dados fictícios; demais prévias mantêm o comportamento anterior.
- Ampliados `scripts/meg-home-p0-authenticated.browser.mjs` e `scripts/meg-home-p0-live-browser.browser.mjs` para exigir rótulos de urgência visíveis na primeira coluna, exibição de estados overdue/due_today/upcoming, mês correto no Shell autenticado e ausência de rolagem horizontal na página. `.github/workflows/meg-home-p0-integration.yml` mantém gate de arquivos com exceção estrita dos dois arquivos necessários ao cabeçalho da Home.
- **CI final do código [42971216916](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42971216916): SUCCESS**, commit funcional `6107b1efe3d04b10cd8f34c07ff7e811aab88d2f`. Verificados: build API/Web; contratos e regressão financeira; PostgreSQL 17 isolado + JWT/HTTP reais; 16 cenários visuais originais sem falhas; 341 checks de Ações Rápidas em 8 viewports; Playwright real em desktop 1366, mobile 375 de proprietários A e B; três leituras canônicas autenticadas, segregação dos usuários, sem rolagem horizontal da página e sem requests proibidos; gate de arquivos aprovado.
- Prévia estática **isolada no Render** atualizada, sem modificar serviço homologado original: `meg-home-p0-qa-pr669` (`srv-dbq07fjl550s7395ht1g`), `autoDeploy=no`, branch `preview/08-home-p0-qa-pr669-20261111`, commit de prévia `d2655a0e0fde4c7c82c2110ac25278890be8d0f6`. Deploy `dep-dbq0hohsrm7s7394ldr0` confirmado **LIVE** em 11/11/2026. **Link de validação sem cache**: https://meg-home-p0-qa-pr669.onrender.com/fluxo-integrado-08.html?tela=home-p0&v=d2655a0e0fde4c7c82c2110ac25278890be8d0f6
- **Limites de homologação:** LIVE, CI verde e apresentação de URL não equivalem à aprovação visual desta revisão; aguardar aceite expresso do usuário. A prévia não é uma API pública, não contém registros reais e não grava dados.
- Pendências P0 ainda abertas: (1) aceite visual do usuário especificamente para tipografia, badges e mês do cabeçalho; (2) estratégia para mostrar mais de 8 compromissos sem alegar que a lista parcial é completa; (3) estudo de índice `FinancialEvent` somente com dados sintéticos e sem migrations produtivas; (4) estratégia coordenada de promoção API #668 → Home #669, mediante autorização própria. PRs continuam Draft sem merge.

### 11/11/2026 — Qualidade MEG, melhoria 1/6: compromissos íntegros e listagem canônica sob demanda
- Autorização expressa do usuário para seis melhorias **em ordem sequencial**: (1) compromissos nunca ocultos; (2) Home prioriza atenção; (3) saldos/projeções explicáveis; (4) acabamento visual; (5) proteção contra inconsistências; (6) performance medida. A **presente entrega é APENAS a melhoria 1**, na Etapa 08. Próximas só em execução isolada conforme autorização de etapa, gates e aprovações.
- Diagnóstico confirmado: `readCanonicalHomeCommitments` retorna até **8 itens para o resumo**; a API já dispõe de cursor canônico autenticado e `hasMore`. O componente de Home não pode afirmar que oito são todos nem executar varredura histórica automática.
- Implementado `apps/web/src/meg-web-evolution/home/HomeCommitmentsFullList.tsx` (novo): botão `Ver todos` na tabela da Home abre diálogo modal nativo acessível, reutilizando o DataGrid e as MESMAS colunas e rótulos canônicos. Começa consulta HTTP real **apenas sob interação do usuário**, 16 candidatos por página, até 4 páginas vazias filtradas por ação, sem limite acumulado artificial; botão `Carregar próximos compromissos` enquanto `hasMore`, com paginação local do DataGrid dos itens já carregados. Sem copiar cálculos financeiros, reclassificar benefícios/cartões, calcular vencimento ou valor. Conversão de exibição compartilhada com resumo.
- Mensagens rigorosas: `N compromissos carregados` (não total) enquanto há cursor; `Consulta concluída` somente se `hasMore=false`; erro HTTP/contrato/cursor/duplicidade/dia-base é explícito e preserva registros carregados, com nova tentativa. Páginas sem elegíveis **não são tratadas como fim**. Exige ids únicos, limite 16, dia-base consistente e cursor não cíclico. Diálogo usa foco do navegador, `Esc`, botão fechar, layout responsivo 375 e 1366 sem horizontal da página.
- `apps/web/src/meg-web-evolution/home/home-commitments-read.ts` exporta a validação de página canônica **já existente** para ser reutilizada, sem alterar comportamento do consumidor inicial. `HomeDashboard.tsx` preserva primeira janela resumida de 8 e adiciona ação `Ver todos`; `home-dashboard.css` isola novo diálogo, preservando design aprovado. Nada modificado na API canônica #668, banco, schema/índice, writers, Android ou recursos produtivos.
- Novos gates no `scripts/meg-home-p0-authenticated.browser.mjs`: abertura, sucessão de páginas inicialmente filtradas vazias, resultado completo sem contagem inventada. No `scripts/meg-home-p0-live-browser.browser.mjs`: navegador Chrome real → GET HTTP/JWT → PostgreSQL 17 local fictício, modal `Ver todos`, 13 elegíveis na primeira página + 16 na segunda = **29 carregados**, funcionamento desktop 1366 e celular 375, outro workspace com **somente 2 registros**, zero overflow horizontal e nenhum request bloqueado. `.github/workflows/meg-home-p0-integration.yml` ampliado exclusivamente para o novo componente, sem adicionar permissões de banco.
- **CI [43054169342](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43054169342): SUCCESS**, commit funcional `de5bad4f3fb252b454faeacc2a902a3ef378b79f`. Passaram: compilação API/Web; suíte financeira; postgres17 QA; Fastify/JWT/HTTP real; 16 cenários visuais originais sem falha; 341 checks em 8 viewports; E2E navegador usuários A/B, desktop/mobile e gate de arquivos autorizados. Logs: `realCommitmentRequests=8`, `realAuthRequests=3`, `blockedRequests=0`. Primeiro teste falhou por expressão JSX de botão de filtros, corrigida. Segunda execução detectou regex de contagem no **teste** mal escapada, corrigida sem mudar regra financeira.
- Capturas de QA reais em artefato `meg-home-p0-qa` ID **13871745249**, incluindo `A-desktop-1366-lista-completa.png`, `A-mobile-375-lista-completa.png` e `B-mobile-375-lista-completa.png`. Evidência inspecionada: cabeçalho com contagem carregada e botão; DataGrid/células mobile adaptados; segregação de B.
- **Prévia ESTÁTICA de demonstração sem API** sincronizada em branch isolada `preview/08-home-p0-qa-pr669-20261111`, com `autoDeploy=no`, commit `e2702850af9f0d13956b32218851a906e31d237b`. Deploy `dep-dbq94d8m7kps738p5b8g` do serviço Render `srv-dbq07fjl550s7395ht1g` confirmado **LIVE**: https://meg-home-p0-qa-pr669.onrender.com/fluxo-integrado-08.html?tela=home-p0&v=e2702850af9f0d13956b32218851a906e31d237b. A prévia possui **somente os 8 registros da fixture estática**; a capacidade de carregar >8 foi provada na CI HTTP isolada, NÃO pela prévia pública. Não solicitar login real.
- **Estado:** melhoria 1 implementada e tecnicamente testada, **ainda NÃO homologada visualmente pelo usuário**. PR #669 permanece Draft, sem merge; #668 segue Draft e nenhuma API produtiva foi implantada. Não declarar Etapa 08 concluída. Limite conhecido: contador total exato só é conhecido quando termina o cursor; enquanto isso mostra carregados, para não inventar global.
- **Fila aprovada, mas não iniciada:** melhoria 2 (destaques que exigem atenção), melhoria 3 (origem de saldos/projeções), melhoria 4 (acabamento da tela), melhoria 5 (caracterização de cenários financeiros combinados), melhoria 6 (instrumentação e estudo de plano/índice QA). Executar na ordem após validação pertinente, sem empilhar modificações de etapas diferentes.

### 11/11/2026 — Revisão pós-vídeo (1/6): preservar Home P0 ao fechar Novo lançamento
- Autorização explícita do usuário: **"vamos sseguir com as suas recomendações"** após análise do vídeo `13-17-35.mp4` (~64 s) em 11/11/2026. A ordem proposta na análise começa por corrigir a troca de novembro para outubro ao fechar o modal **Novo lançamento**. Trabalhar **um ajuste por vez**; as demais correções do vídeo (DataGrid compacto, prioridades de urgência, modo de edição de Ações rápidas, acabamento, consistência dos mocks) permanecem na fila, sem antecipar telas de outras etapas.
- **Causa confirmada, restrita à prévia visual isolada**: `apps/web/src/meg-web-evolution/integrated-preview/preview.tsx` na branch `preview/08-home-p0-qa-pr669-20261111` usava `goHome={() => setScreen('home')}`; mesmo quando a entrada era `?tela=home-p0`, ao fechar o modal voltava para `home` (outubro). O componente também trocava a fixture para outubro **enquanto o overlay de Novo lançamento estava aberto**, pois comparava `screen === 'home-p0'`.
- Correção somente na branch de prévia: captura estável de `returnHome` (`home-p0` ou `home`) a partir da tela inicial, uso de `activeHome` quando `screen === 'new-launch'`, preservando `periodLabel`, `previewData` e `month` no fundo do modal. O retorno tanto pelo **X** quanto por **Voltar à Home** passa a `setScreen(returnHome)`. Nenhuma alteração nas regras financeiras, API, dados reais, Android, schema, writers, Home autenticada ou formulário de Novo lançamento.
- Adicionado `scripts/meg-home-preview-navigation.browser.mjs`: Playwright Chromium testa `?tela=home-p0` com Novembro de 2026 e `?tela=home` com Outubro de 2026, em **375 e 1366 px**, verificando abertura do modal, integridade do período e dos dados durante overlay, retorno pelo X e botão Voltar, ausência de rolagem horizontal da página, manutenção do modal de lista de compromissos P0 e **zero chamadas à API**.
- Workflow isolado de prévia `.github/workflows/meg-home-preview-navigation-qa.yml`: build somente `vite.home-p0-qa.config.ts`, teste em `127.0.0.1:4176`, dados exclusivamente fictícios, sem qualquer banco/segredo. O primeiro teste falhou porque selecionava um elemento desktop **oculto** no viewport 375; o teste foi corrigido para selecionar apenas elementos visíveis, sem alteração no componente financeiro.
- **[GitHub Actions 43060105712](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43060105712) SUCCESS** na branch de preview, commit `bd520161536c469b364b29a573cfd7594f826220`. Log JSON: quatro casos `home-p0/375`, `home/375`, `home-p0/1366` e `home/1366`, todos com `returnBack=PASS`, `returnClose=PASS`, `samePeriod=true`, `sameFixture=true`, `noApi=true`, `noHorizontalOverflow=true`.
- Deploy manual de prévia independente Render `srv-dbq07fjl550s7395ht1g`, `dep-dbq9k1om7kps738qflng`, confirmado **LIVE**, `autoDeploy=no`. **Link de validação sem cache:** https://meg-home-p0-qa-pr669.onrender.com/fluxo-integrado-08.html?tela=home-p0&v=bd520161536c469b364b29a573cfd7594f826220.
- **Estado:** correção técnica na prévia **concluída e testada**, mas a navegação corrigida **aguarda aprovação visual expressa do usuário**. Não homologar apenas por CI/deploy. PR #669 continua Draft, sem merge, e permanece sem alterações de produção. Evidências de QA em workflow artifact `meg-home-preview-navigation-qa` (4 screenshots).
- **Próxima proposta do vídeo:** refinar a apresentação compacta do DataGrid de compromissos, preservando a leitura canônica e a possibilidade de consultar tudo pelo diálogo. Não começar sem considerar o último aceite visual e o escopo da Etapa 08.

### 11/11/2026 — Revisão pós-vídeo (2): tabela compacta de compromissos da Home
- Usuário **validou explicitamente** o ajuste anterior de retorno de Novo lançamento (preservar Home P0 de novembro, sem voltar para outubro), dizendo "validado, seguir para poroxima". Este aceite é **somente** da navegação da prévia anterior, e não autoriza homologar a revisão visual desta tabela.
- Escopo executado agora, exclusivamente Etapa 08, PR #669 **Draft**: melhorar a apresentação resumida de "Próximos compromissos", sem alterar o DataGrid compartilhado, o serviço `GET /finance/home-commitments`, os dados, a contagem e as regras de negócio.
- `apps/web/src/meg-web-evolution/home/HomeDashboard.tsx`: resumo de **três colunas** `Vence em / Descrição / Valor` derivado das colunas existentes, mantendo exatamente os mesmos compromissos, datas, `dueState` da API, descrições e valores. `Origem` e `Situação` permanecem na janela **"Ver todos" com as cinco colunas originais**, filtros/paginação e consulta canônica sob demanda. Chave de persistência isolada `meg-panorama-08-due-compact-v1` impede importar larguras/colunas salvas do esquema anterior de cinco colunas. Nenhuma regra financeira recalculada na Web.
- `apps/web/src/meg-web-evolution/home/home-dashboard.css`: formatação apenas do resumo P0, sem alterar o componente compartilhado. Texto do vencimento e aviso `Vencido / Vence hoje / A vencer` continuam visíveis; descrições podem ocupar **até duas linhas** mantendo a densidade pareada de 48 px; valor fica sempre na última coluna.
- **Causa técnica de overflow encontrada em QA**: em 1366 px, a alça nativa de resize do último cabeçalho do DataGrid se projetava **4 px além da borda** (`right:-.25rem`). Corrigido exclusivamente no resumo compacto com `right:0`, preservando a capacidade de redimensionar. Não esconder scroll por CSS como remendo. Em **1024 px**, a coluna direita mede apenas ~295 px úteis, insuficientes para qualquer tabela legível de 3 colunas; aplicada **container query `max-width:26rem`** que apresenta os **cards responsivos já existentes** do DataGrid quando o painel fica estreito, sem adicionar breakpoint global nem recortar valores.
- Scripts atualizados: `scripts/meg-home-p0-authenticated.browser.mjs` e `scripts/meg-home-p0-live-browser.browser.mjs` verificam três colunas no resumo, ausência de overflow desktop, cinco colunas na lista integral, status `Parcial` no detalhamento e invariância financeira. Corrigida uma corrida no teste assíncrono aguardando a resposta HTTP antes de inspecionar o modal. Nenhum writer de produção é chamado.
- **CI integrado [43065256789](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43065256789) SUCCESS**, último commit funcional testado `81a68fcd20a5d2bf0ce1f5ba60999ffbcdc9910c`: build Web e API, suítes financeiras, PostgreSQL 17 sintético + Fastify/JWT/HTTP autênticos, **16 cenários visuais originais com 0 falhas**, **341 verificações de Ações Rápidas em 8 viewports**, QA real dos usuários sintéticos A/B em desktop 1366 / mobile 375, cursor paginado e gate de escopo. Log QA: `realCommitmentRequests=8`, `realAuthRequests=3`, `blockedRequests=0`.
- Na branch de prévia independente `preview/08-home-p0-qa-pr669-20261111`, QA adicional `scripts/meg-home-preview-navigation.browser.mjs` verifica resumo sem corte ou cards, modal completo e integridade ao abrir/fechar Novo lançamento, em **375/640/1024/1366 px**, versões de outubro e novembro, total de 8 combinações. **[CI de prévia 43065321203](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43065321203) SUCCESS**, SHA `74915b2dcd96c7202b6b109e6f75246f3190b2b6`. Capturas foram inspecionadas: em 1366 px o cabeçalho `Vence em` e descrição de duas linhas aparecem completos, urgência e valores permanecem na primeira visualização; em 1024 px cards preservam texto e valores.
- Prévia visual estática, **sem API ou login real**, publicada no serviço Render isolado `meg-home-p0-qa-pr669` (`srv-dbq07fjl550s7395ht1g`, `autoDeploy=no`). Deploy `dep-dbqa3t67bikc73ddrt6g` confirmado **LIVE**, commit `74915b2dcd96c7202b6b109e6f75246f3190b2b6`, link **sem cache**: https://meg-home-p0-qa-pr669.onrender.com/fluxo-integrado-08.html?tela=home-p0&v=74915b2dcd96c7202b6b109e6f75246f3190b2b6 .
- **Estado:** correção 2 pós-vídeo implementada, testes técnicos verdes, preview LIVE, mas **não validada visualmente pelo usuário ainda**. O código funcional permanece na PR #669 Draft. Sem merge, sem deploy da API #668, sem Supabase/banco produtivo, sem Android. Não declarar Etapa 08 concluída.
- Próxima correção da lista do vídeo, **ainda não iniciada**: prioridade visual da urgência financeira no topo da Home; jamais calcular quantidades, saldos ou vencimentos em componentes. Iniciar somente depois de registrar decisão de validação do usuário para esta revisão.

### 11/11/2026 — Revisão pós-vídeo (3): atenção financeira priorizada na Home
- **Decisão expressa do usuário:** respondeu "validado vamos apra proxima" após testar o resumo compacto de compromissos (revisão pós-vídeo 2). Portanto **a revisão compacta de 3 colunas/cards está visualmente validada**; a nova faixa de atenção desta revisão 3 **ainda não recebeu validação visual**. Escopo autorizado: **Etapa 08 Home, prioridade visual de obrigações urgentes**; seguir uma revisão por vez.
- **Autoridade financeira preservada:** `apps/web/src/meg-web-evolution/home/HomeDashboard.tsx` consome a lista canônica `data.canonicalCommitments` com no máximo oito itens resumidos. A Home **seleciona sem computar** o primeiro `dueState='overdue'` e o primeiro `dueState='due_today'`, já classificados pela API. Se não houver um desses estados nos oito recebidos, não mostra o respectivo destaque e **jamais afirma que não há dívidas**. Não calcula saldo, dias de atraso, status, parcelas, valores, totais ou número global de compromissos. `format(Number(item.amount),hidden)` é apenas formatação de valor já recebido; respeita ocultação do valor da Home.
- **Nova faixa compacta "Atenção aos compromissos"**, textual e acionável, com avisos **Vencido** e **Vence hoje**, descrição, data, valor e aviso honesto "Destaques da consulta inicial". Clique em qualquer aviso ou `Ver todos` abre **o mesmo modal canônico integral já aprovado**, sem leitura adicional automática. Se não houver itens urgentes canônicos na janela inicial, a faixa não é renderizada; não exibir "tudo em dia".
- **Hierarquia responsiva:** desktop largo mantém saldo+KPIs ao lado do carrossel de cartões; faixa logo abaixo, antes das Ações rápidas. Mobile e larguras até 1024 px: saldo+KPIs, **faixa de atenção**, cartões e Ações rápidas. CSS isolado em `apps/web/src/meg-web-evolution/home/home-dashboard.css`, usando apenas breakpoint principal 1024 px, 640 px e estilos locais. Em 1024 px, título e ação ficam na primeira linha e dois destaques abaixo; descrições móveis/tablet ocupam até duas linhas, sem diminuir tipografia ou criar scroll horizontal.
- **Arquivos funcionais alterados:** `apps/web/src/meg-web-evolution/home/HomeDashboard.tsx`, `apps/web/src/meg-web-evolution/home/home-dashboard.css`. **Testes ampliados:** `scripts/meg-home-p0-authenticated.browser.mjs`, `scripts/meg-home-p0-live-browser.browser.mjs`, e teste de prévia isolada `scripts/meg-home-preview-navigation.browser.mjs` na branch `preview/08-home-p0-qa-pr669-20261111`. Os testes exigem correspondência **exata da descrição de destaque com o registro canônico recebido**, inclusive para caso de obrigação parcialmente paga vencendo hoje, e isolamento entre usuários A/B.
- **CI integrado [43071416096](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43071416096) SUCCESS** no SHA funcional `6ce1a6f9919cda98aaf17f53b608237e62a85638`: build API/Web, testes financeiros, PostgreSQL 17 descartável/JWT/HTTP reais, 16 cenários visuais da Home sem falha, 341 verificações de Ações rápidas em 8 viewports, leitura dos usuários sintéticos A/B em 1366/375 px, modal paginado e gate de arquivos autorizados. Testes verificam zero overflow da página e zero requests proibidos.
- **QA isolado [43071431096](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43071431096) SUCCESS** no SHA de prévia `7f2694ea366a7a0151ecec25ad188338c2e62998`: `home` e `home-p0` em 375, 640, 1024, 1366 px, navegação de Novo lançamento preservada, faixa antes dos cartões em mobile/tablet, valores e descrições legíveis, ação abrindo modal e zero API financeira. Capturas inspecionadas (inclusive 1024 com descrições em 2 linhas).
- Render **site estático QA isolado** `meg-home-p0-qa-pr669` (`srv-dbq07fjl550s7395ht1g`), branch `preview/08-home-p0-qa-pr669-20261111`, `autoDeploy=no`. Deploy `dep-dbqalgnf3r2c73c5kl50` confirmado **LIVE**; **URL sem cache:** https://meg-home-p0-qa-pr669.onrender.com/fluxo-integrado-08.html?tela=home-p0&v=7f2694ea366a7a0151ecec25ad188338c2e62998 . Esta prévia é pública apenas para testes visuais e usa valores e obrigações **fictícios**, sem login nem conexão com API de produção.
- **Estado:** revisão 3 pós-vídeo implementada, CI e QA verdes, preview LIVE, **aguarda aprovação visual expressa do usuário**. PR #669 segue **Draft**, sem merge, sem API #668 em produção, sem alterar Android, banco, schema ou writers. Não homologar por deploy/CI. **Pendente real:** provimento futuro de contagens globais de vencidos/hoje requer autoridade do servidor específica; não inventar esses totais a partir de oito itens.
- **Próxima sugestão da análise de vídeo:** simplificar o modo de personalização das Ações rápidas, reduzindo controles concorrentes/variação excessiva de altura, preservando o comportamento homologado. **Não iniciada** nesta revisão.

### 11/11/2026 — Revisão pós-vídeo (3B): faixa rejeitada; modal inicial + sino com lembrete horário
- **Decisão expressa do usuário:** enviou print da Home e rejeitou a faixa horizontal `Atenção aos compromissos` ("não gostei"). Pediu alternativa de **popup/modal chamativo ao abrir** e **aviso na área de notificações a cada hora enquanto houver compromisso vencido**. Esta decisão SUBSTITUI a proposta visual da revisão 3 anterior: **a faixa não foi homologada**, não deve reaparecer por rollback acidental. A revisão anterior de **tabela compacta** continua explicitamente validada.
- **Implementação isolada na Etapa 08 / PR #669 Draft:** `HomeDashboard.tsx` removeu completamente a faixa `pano-attention`, publica somente compromissos **canônicos recebidos da API** via contexto estável. `home-dashboard.css` removeu o bloco de estilos rejeitado, sem empilhar CSS. `AppShell.tsx` inclui provider para modal e sino real, mantendo demais controles. Arquivos novos `HomeDueAlerts.tsx` e `home-due-alerts.css`: modal nativo acessível, estilizado com cores oficiais e **até 3 registros destacados** (até 2 vencidos e 1 vencendo hoje), botões `Entendi`, fechar e `Ver todos os compromissos`. No celular de 375px o conteúdo integral e botões cabem dentro da tela, comprovado por screenshot QA; não há scroll horizontal da página.
- **Sem cálculos financeiros na tela:** utiliza `dueState` e `amount` do `GET /finance/home-commitments`; jamais compara datas para decidir vencido, calcula saldo, parcela, total global, juros ou status. Texto esclarece que os alertas são **da consulta inicial** e outros compromissos podem estar na lista completa. O modal integral `Ver todos` conserva cursor/paginação já aprovados. Valores respeitam a opção Ocultar valores da Home.
- **Entrada/periodicidade:** modal inicial apenas **uma vez por sessão/usuário/dia** (sessionStorage por navegador, sem API/registro permanente), com proteção ao ciclo de efeitos do React StrictMode. O sino antes estático passa a mostrar indicador somente quando a consulta canônica confirma estado `overdue` ou `due_today`; clique abre painel contendo os destaques e ação para listar todos. Para evitar janelas interrompendo trabalho, o **lembrete após 60 minutos é notificação discreta dentro da aplicação**, nunca modal bloqueante recorrente. A versão autenticada **consulta novamente a API antes do aviso horário**; se não houver atraso, não avisa. Ao retornar para uma aba visível, verifica a janela temporal. Se a API falhar, não envia lembrete como se o atraso tivesse sido reconfirmado e informa falha de atualização na central. Prévia usa exclusivamente dados fictícios, sem chamadas financeiras reais. Não é push do sistema operacional nem promete aviso quando o aplicativo está fechado.
- **Gates verdes:** [CI integrado 43077088612](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43077088612) **SUCCESS** no SHA funcional `734eec7a4b3f8e7caf271ef36868aac037a296b8`: build API/Web, contratos financeiros, PostgreSQL17 descartável, Fastify/JWT/HTTP real, 16 cenários visuais anteriores sem falha, 341 verificações de Ações rápidas em 8 larguras, Chrome 1366/375 usuários sintéticos A/B e gate de escopo. O teste autenticado avançou uma hora virtualmente e confirmou uma **nova requisição HTTP** antes do toast, sem reabrir modal; `realCommitmentRequests=9`, `blockedRequests=0`. Teste de preview [43076942988](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43076942988) **SUCCESS** no SHA `3a1ee4981830c44dea261057cd1cc1170eee04f6`: mock 100% fictício, 375/640/1024/1366, outubro/novembro, modal+bell+lembrete após uma hora simulada, sem API ou overflow.
- Evidências: PNGs QA em artefato `meg-home-preview-navigation-qa` da execução 43076942988 (ID 13883380062). O modal 375px foi inspecionado, contém três alertas e dois botões inteiramente visíveis; mantém origem/cor/status corretos e identidade visual da Home.
- **Publicação isolada para homologação:** `meg-home-p0-qa-pr669` no Render, branch `preview/08-home-p0-qa-pr669-20261111`, `autoDeploy=no`, último commit de prévia `3a1ee4981830c44dea261057cd1cc1170eee04f6`, deploy `dep-dbqb64ui0phs73ci9s9g`. Link **sem cache**, utilizar SOMENTE após status LIVE: https://meg-home-p0-qa-pr669.onrender.com/fluxo-integrado-08.html?tela=home-p0&v=3a1ee4981830c44dea261057cd1cc1170eee04f6 .
- **Ainda NÃO validado visualmente pelo usuário**: a substituição da faixa por modal/central e a periodicidade precisam de aceite específico. Nenhum merge, deploy produtivo, alteração de banco/Supabase, writers, API ou Android. A PR #669 permanece Draft. Pendência estrutural fora desta revisão: futura fonte server-side de contagens globais de vencidos/hoje, sem inferir a partir dos 8 itens da Home. Não avançar para Ações rápidas até homologar a correção atual.


## Home PT3 — Revisão pós-vídeo #4: edição compacta das Ações rápidas (11/11/2026)
- **Autorização recebida:** usuário respondeu “SIGA” após a revisão #3B. Isso autoriza a continuidade técnica isolada, mas **não equivale à homologação visual explícita** da revisão #3B (modal/sino) nem da revisão #4.
- **Diagnóstico confirmado:** no editor anterior, cada card aumentava de **75 px para 120 px** ao entrar em edição para comportar três botões por atalho. O aumento de altura e a competição visual estavam documentados na análise do vídeo.
- **Correção localizada:** `QuickActions.tsx` e `quick-actions.css` mantêm os cards com **75 px** em modo normal/edição. Cada atalho em edição abre um **diálogo nativo acessível**, com posição atual, mover esquerda/direita, remover, fechamento claro e Escape. O botão Adicionar, catálogo de 7 destinos existentes, restaurar padrão, persistência local por usuário/demo, carrossel circular e navegação normal foram preservados. Nenhuma regra financeira foi incluída na UI.
- **Testes de caracterização da interação atualizados:** `scripts/meg-08-home-quick-actions.browser.mjs` agora exige altura invariável, ausência dos antigos controles embutidos, organização com alvos de toque >=44 px, mudança de posição, Escape, adicionar/remover/reincluir, restauração do padrão e persistência em **8 viewports**. Gate de arquivos autorizado expandido apenas para os três arquivos envolvidos.
- **Branch da PR #669:** `integration/08-home-p0-canonical-20261111`; commit funcional `db0916da914c4765c555ca632b6a5a1b2c668ebf`.
- **[CI integrado 43081482084](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43081482084) SUCCESS:** build Web/API, testes financeiros, PostgreSQL 17 sintético, HTTP/JWT, 405 verificações de Ações rápidas em 8 viewports, navegador A/B real de QA sem chamadas externas e gate de escopo.
- **Branch de prévia espelhada:** `preview/08-home-p0-qa-pr669-20261111`, commit `dc137d27d48111aa17f8c585aabd66fedbb58128`; workflow QA atualizado para executar também o contrato completo de Ações rápidas.
- **[CI prévia 43081661772](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43081661772) SUCCESS:** Home antiga/P0 em 375, 640, 1024 e 1366 px, abertura/retorno de Novo lançamento sem perda do período, modal/sino e testes de Ações rápidas **405/8**, sem chamadas financeiras na prévia e sem overflow da página. Artefato visual `meg-home-preview-navigation-qa` ID `13884936732`.
- **Publicação:** código da nova prévia está na branch e foi compilado/testado, mas **ainda não houve novo deploy LIVE no Render**. O serviço anterior permanece na revisão #3B até uma publicação autorizada pelo workspace correto; **não divulgar o link antigo como se contivesse a revisão #4**.
- **Checklist atendido:** mudanças isoladas na Home, sem cálculos financeiros na UI, preservação de catálogo/carrossel/persistência, build, contratos de navegador, integração isolada e versionamento das duas branches. **Não atendido:** deploy Render da nova versão e homologação visual da revisão #4. **Pendências:** homologação visual explícita das revisões #3B e #4, publicação de preview sem cache e avaliação posterior dos demais refinamentos do vídeo. PR #669 continua Draft, sem merge, sem alteração de Android, Supabase, writers, schema ou API de produção.


## Home PT3 — Preview publicado da revisão #4 (11/11/2026)
- **Render LIVE:** serviço estático isolado `meg-home-p0-qa-pr669` (`srv-dbq07fjl550s7395ht1g`), workspace **My Workspace** previamente confirmado, com `autoDeploy=no`. Deploy manual com limpeza de cache `dep-dbqbn8bbc2fs73eaqsk0`, status **live** (concluído em 11/11/2026 19:02:44 UTC), commit da branch de prévia `dc137d27d48111aa17f8c585aabd66fedbb58128`.
- **Link sem cache para validação:** https://meg-home-p0-qa-pr669.onrender.com/fluxo-integrado-08.html?tela=home-p0&v=dc137d27d48111aa17f8c585aabd66fedbb58128
- O código da edição compacta permanece na PR #669, com gates isolados verdes [43081482084](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43081482084) e [43081661772](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43081661772). A prévia usa dados fictícios e não acessa API/banco produtivo.
- **Status visual:** o modal/sino da revisão #3B e a edição compacta das Ações rápidas da revisão #4 **ainda aguardam aprovação visual explícita**. "Pode seguir" foi tratado como autorização de continuidade operacional/publicação da prévia, não como homologação da interface.
- **Aviso técnico não relacionado ao layout:** o log de build da prévia exibiu avisos do `npm audit` sobre dependências, inclusive uma alta, e avisos do Vite sobre assets públicos. Não houve modificação automática de dependências, pois isso exige auditoria e escopo próprios. A build concluiu e o Render confirmou LIVE.
- **Próximo gate:** validação humana da prévia publicada; somente depois prosseguir para padronização visual de tipografia/espaçamentos/estados da Home. Sem merge, API produtiva, Supabase, writers, schema ou Android alterados.


## Home PT3 — Aceite visual anterior e revisão #5 (11/11/2026)
- **Validação visual explícita recebida:** após prévia Render LIVE da revisão #4, o usuário respondeu “validaddo, vamos seguir para o proximo”. Fica registrada aprovação visual da versão exibida, **incluindo revisão #3B (modal inicial/sino)** e **revisão #4 (editor compacto de Ações rápidas)**. Este aceite não autoriza merge nem deploy de API, banco ou produção. Supera os registros históricos que ainda indicavam ausência de homologação dessas revisões.
- **Escopo da revisão #5:** padronização localizada da **tipografia, espaçamento interno e estados dos controles** do componente `QuickActions`, sem mudar a altura fixa aprovada dos cartões (**75px**), navegação circular, sete destinos cadastrados, add/remover/mover/restaurar, preferências em localStorage ou interface financeira. `aria-pressed` indica corretamente o modo de edição; foco de teclado recebe contorno visível; tipografia das descrições passa a tamanho legível, estados hover/disabled mantêm hierarquia funcional. Não houve CSS ou componentes de outras telas alterados.
- **Arquivos funcionais:** `apps/web/src/meg-web-evolution/home/QuickActions.tsx`, `apps/web/src/meg-web-evolution/home/quick-actions.css`; **testes:** `scripts/meg-08-home-quick-actions.browser.mjs` (legibilidade, 75px invariáveis, foco de teclado e aria-pressed em oito viewports, além dos comportamentos anteriores).
- **Branch PR #669** `integration/08-home-p0-canonical-20261111`, commit funcional `a3f9ab54c2fb437902996763fd85b61a7336c67c`; branch QA independente `preview/08-home-p0-qa-pr669-20261111`, commit `a6f3915ff375e628ade3565374e67dbb0c7bb51c`.
- **Gates técnicos SUCCESS:** [integrado 43084926483](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43084926483) e [preview 43084992558](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43084992558). Abrangem API/build financeiro, PostgreSQL 17 descartável e JWT/HTTP isolados, browser QA, controles de Ações rápidas e ausência de overflow.
- **Preview Render LIVE:** serviço estático QA `meg-home-p0-qa-pr669` (`srv-dbq07fjl550s7395ht1g`), `autoDeploy=no`, workspace confirmado `tea-d98k1qhkh4rs73f4sfj0`. Deploy manual com cache limpo `dep-dbqbtedg1s2s73dsskh0`, finalizado LIVE em 11/11/2026 19:16:00 UTC, SHA de prévia `a6f3915ff375e628ade3565374e67dbb0c7bb51c`. **Link de validação sem cache:** https://meg-home-p0-qa-pr669.onrender.com/fluxo-integrado-08.html?tela=home-p0&v=a6f3915ff375e628ade3565374e67dbb0c7bb51c
- **Checklist atendido:** escopo isolado na Home/Ações rápidas, contratos de navegação e persistência preservados, estrutura responsiva e DataGrid intocados, gates completos verdes, preview fictício LIVE. **Não atendido:** aceitação visual da **nova revisão #5**; falta autorização para merge/produção. **Divergências financeiras novas:** nenhuma identificada. **Pendência externa persistente:** logs de Render mostram `npm audit` com 10 advisories (1 baixo, 8 moderados, 1 alto) e avisos Vite de assets; requer auditoria técnica separada, sem `npm audit fix --force` ou alterações de dependências neste escopo.
- **Regra de parada:** aguardar aprovação visual específica da revisão #5. Não avançar em alterações de outra tela, não mesclar PR #669, não promover #668/API, não tocar Android ou Supabase produtivo.


## Home PT3 — Revisão visual estrutural #6: linguagem fluida e ações SVG (11/11/2026)
- **Solicitação explícita do usuário:** realizar auditoria visual ampla das telas já validadas, apontando botões de fechar pesados, cards desalinhados, excesso de botões textuais e tabela de vencimentos com data empilhada sobre status; adotar padrão **teal/neon futurista, fluido, sem aspecto de interface rígida**. Como o chat atual é da Home, **somente a Home foi modificada**. Pendentes e demais telas ficam como itens de auditoria futuros, sem falsa alegação de conclusão nem aprovação visual.
- **Revisão #5:** a última prévia estava tecnicamente verde, mas o novo feedback explicitou **insatisfação visual geral**; a revisão #5 não foi homologada. Revisões anteriores de regras/funcionalidades aprovadas permanecem preservadas.
- **Modal inicial/sino/toast:** `HomeDueAlerts.tsx` e `home-due-alerts.css` reconstruídos com fechar circular de 44px e ícone SVG `x`, alertas mais legíveis, sirene vermelha para `overdue`, temporizador âmbar para `due_today`, cantos arredondados, contraste e foco por teclado. Mantida regra do modal uma vez por sessão/dia, lembrete horário somente após nova leitura, abertura do sino e lista integral, sem cálculos financeiros na UI.
- **Tabela compacta dos compromissos:** `HomeDashboard.tsx` e `home-dashboard.css` passam a mostrar **ícone SVG e data na mesma linha**, sem empilhar badge de estado sob data. Estados visuais: `overdue` sirene vermelha, `due_today` temporizador amarelo, `upcoming` ícone positivo verde com rótulo acessível **A vencer**, sem afirmar que foi pago ou que há folga de muitos dias. A API fornece somente esses três estados; distinção "próximos dias × distante" depende de decisão/contrato do servidor e **não foi inventada pela Web**. Mantidas 3 colunas na Home, 5 no modal completo, paginação, fonte canônica e ausência de scroll horizontal.
- **Ações e cards da Home:** botões secundários de relatório, filtro e ver todos com SVG, tooltip/título, `aria-label`, foco e alvos 44px; padding/raios de painel, saldo, KPIs e benefício alinhados. Não foram alterados Shell global, DataGrid compartilhado, API, regras financeiras, Android ou outras telas. `HomeGlyph.tsx` ganhou somente símbolos necessários à Home.
- **Fechar do diálogo integral:** `HomeCommitmentsFullList.tsx` passou de botão textual "Fechar" a SVG circular com nome acessível, preservando ação.
- **Arquivos alterados:** `apps/web/src/meg-web-evolution/home/HomeGlyph.tsx`, `HomeDueAlerts.tsx`, `home-due-alerts.css`, `HomeDashboard.tsx`, `home-dashboard.css`, `HomeCommitmentsFullList.tsx`; testes `scripts/meg-home-p0-authenticated.browser.mjs`, `scripts/meg-home-p0-live-browser.browser.mjs`, `scripts/meg-home-preview-navigation.browser.mjs` (este último somente branch QA); workflow de CI da Home ajustado para a inclusão do SVG local. Branch oficial PR #669 `integration/08-home-p0-canonical-20261111`, código funcional no commit `cd0aa806251c5e1dd6e3d7df8a7d916a4ba55673`; branch de prévia `preview/08-home-p0-qa-pr669-20261111`, commit `894745780480987e60fa4c2c7849f4d79eacbf43`.
- **Gates técnicos verdes:** [integração 43089445940](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43089445940) **SUCCESS**: 16 cenários visuais, 437 verificações de Ações rápidas em 8 viewports, HTTP/JWT/PostgreSQL 17 com dados sintéticos, browser desktop/mobile usuários A/B, zero overflow horizontal e zero chamadas proibidas. [QA visual 43089633206](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43089633206) **SUCCESS**: Home antiga/P0 em 375,640,1024,1366 px, modal, navegação, cartões e ações SVG, sem API real.
- **Prévia isolada Render LIVE:** `meg-home-p0-qa-pr669` (serviço `srv-dbq07fjl550s7395ht1g`, autoDeploy=no) deploy manual com limpeza de cache `dep-dbqcb9m7bikc73an96r0`, finalizado `LIVE` em 11/11/2026 19:45:25 UTC. **Link sem cache:** https://meg-home-p0-qa-pr669.onrender.com/fluxo-integrado-08.html?tela=home-p0&v=894745780480987e60fa4c2c7849f4d79eacbf43
- **Checklist atendido:** código completo em branch isolada, testes financeiros, responsividade QA, ícones semânticos da Home, modais, ações visuais, preview publicado e checkpoint. **Checklist não atendido:** aprovação visual humana da revisão #6; auditoria e revisão de outras telas; taxonomia de alerta de proximidade além dos três estados da API. **Divergências:** necessidade solicitada de "próximo vencimento em N dias" não pode ser classificada corretamente só com `upcoming`; requer autoridade financeira no servidor antes de segmentar futuro próximo/distante. **Pendências reais:** homologação visual da Home #6; varredura por etapas das telas oficiais restantes e correção de inconsistências; advisories persistentes do `npm audit` (1 alto, 8 moderados, 1 baixo) e alertas Vite de assets/volume de bundles devem ser auditados separadamente.
- **Regra de parada:** sem merge, sem deploy produtivo, sem mudanças em banco/Supabase, escritores/API financeira ou Android. A PR #669 continua Draft; não considerar revisão #6 validada até aceite específico do usuário.


## Home PT3 — Revisão #7: SVGs escolhidos pelo usuário e fechar ghost (11/11/2026)
- **Nova orientação explícita:** o usuário forneceu **três SVGs exatos** para a apresentação dos compromissos: (a) círculo com exclamação `#EF4444` para vencidos; (b) relógio circular `#F59E0B` para vence hoje; (c) calendário com check `#10B981` para a vencer. Pediu mostrar os exemplos no chat e criticou o botão fechar anterior como pouco moderno. Os três modelos foram renderizados na conversa e aplicados na Home.
- **Ícones implementados:** `apps/web/src/meg-web-evolution/home/HomeGlyph.tsx` mantém viewBox `0 0 24 24`, caminhos geométricos fornecidos, `stroke-width=2`, contornos arredondados e as cores exatas por estado nos CSS `home-dashboard.css` e `home-due-alerts.css`. A descrição `A vencer` representa somente `dueState='upcoming'` da API, **não significa pago nem distância temporal garantida**. Não houve cálculo de datas, saldos, totais, parcelas ou status na UI.
- **Fechar redesenhado:** estilo único do tipo **ghost minimalista sem borda permanente**, área de toque 44×44 px, SVG `x` nítido, fundo translúcido muito leve apenas no hover/foco; acessibilidade por `aria-label`, `title` e `:focus-visible`, respeito a `prefers-reduced-motion`. Aplicado a modal de alerta/sino/lembrete (`home-due-alerts.css`), diálogo de lista completa (`home-dashboard.css`) e dois painéis de Ações rápidas (`QuickActions.tsx`, `quick-actions.css`).
- **Arquivos de código:** `HomeGlyph.tsx`, `home-due-alerts.css`, `home-dashboard.css`, `QuickActions.tsx`, `quick-actions.css` (todos sob `apps/web/src/meg-web-evolution/home/`). Testes: `scripts/meg-home-p0-authenticated.browser.mjs`, `scripts/meg-home-p0-live-browser.browser.mjs`; e `scripts/meg-home-preview-navigation.browser.mjs` na branch de QA. Os testes agora verificam desenhos SVG, cores computadas, espessura e acessibilidade dos ícones, e botão fechar sem moldura.
- **Versões:** PR #669 em Draft, branch `integration/08-home-p0-canonical-20261111`, commit funcional `dfad6ad017b59d954af9598d691003613ecadf96`. Branch de QA `preview/08-home-p0-qa-pr669-20261111`, commit `adb7ca7949acb8b98008d86620fe30ce36625319`.
- **Gates verdes:** [integração 43092119978](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43092119978) **SUCCESS**; [QA preview 43092218390](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43092218390) **SUCCESS**. Web/API financial contratos e navegador com dados exclusivamente sintéticos, comportamento, foco/responsividade e ausência de overflow preservados.
- **Prévia Render QA LIVE:** serviço `meg-home-p0-qa-pr669` (`srv-dbq07fjl550s7395ht1g`) com autoDeploy=no e cache limpo; deploy `dep-dbqcjcmc6qcc73eu2qt0` finalizado **LIVE** em 11/11/2026 20:02:43 UTC; **link para validação sem cache:** https://meg-home-p0-qa-pr669.onrender.com/fluxo-integrado-08.html?tela=home-p0&v=adb7ca7949acb8b98008d86620fe30ce36625319
- **Checklist atendido:** execução em branch isolada, SVGs exatamente conforme desenhos enviados, botão fechar modernizado, casos financeiros/visuais verdes, preview fictício publicado, histórico preservado. **Checklist não atendido:** homologação visual humana da **revisão #7**, auditoria transversal completa da issue #671 e eventual contrato futuro de proximidade por dias.
- **Divergências e pendências:** nenhuma regra financeira modificada ou divergência nova identificada. O glifo verde possui check gráfico pedido pelo usuário, mas a legenda funcional continuará **A vencer** (e não pago); quaisquer alterações semânticas exigem contrato canônico. Permanecem avisos prévios de dependências no Render (1 alta, 8 moderadas, 1 baixa) e assets Vite, sem remendo automático neste escopo.
- **Proteções:** não houve merge, deploy produtivo, alteração de Android, Supabase produtivo, schema, writer, lógica de pagamento, saldo ou API financeira. A PR continua Draft e a revisão **não está validada visualmente** até aceite explícito do usuário.


## Home PT3 — Revisão #8: Ações rápidas minimalistas aprovadas conceitualmente (11/11/2026)
- **Referência e autorização:** o usuário aprovou entusiasticamente o estudo visual de Ações rápidas minimalistas mostrado no chat (“Nossa perfeito, adorei”) e autorizou expressamente aplicar (“PODE APLICAR”). A aprovação refere-se ao **conceito**, não à homologação visual da implementação real. A Home continua na etapa autorizada; nenhuma outra tela foi alterada.
- **Implementação funcional:** `QuickActions.tsx` preservou catálogo dos sete destinos autorizados, quatro atalhos padrão, carrossel circular, pontos, edição em diálogo, adicionar/remover/mover/restaurar, preferência por usuário/demo e interação por toque/teclado. Cabeçalho reagrupou controles de personalização, restauração e navegação no lado direito, com ícones SVG e tooltips.
- **Reconstrução visual limpa:** seção anterior dos cards de `quick-actions.css` foi substituída por bloco único: fundos teal uniformes, **sem quatro bordas categóricas coloridas** e **sem quadrados atrás dos SVGs**. Cores somente nos SVGs: azul `#65CFFF`, violeta `#B9A3FF`, âmbar `#F4C76B`, cinza-azulado `#A7DDE8`. Mantidos cards com 75px, ícones e controles de 44px+, hover/foco suave, bordas arredondadas, tooltip e responsividade sem rolagem horizontal.
- **Arquivos alterados:** `apps/web/src/meg-web-evolution/home/QuickActions.tsx`, `apps/web/src/meg-web-evolution/home/quick-actions.css`, `scripts/meg-08-home-quick-actions.browser.mjs`, workflows de QA para separar etapas de teste (`.github/workflows/meg-home-p0-integration.yml` na PR e `.github/workflows/meg-home-preview-navigation-qa.yml` apenas na branch de prévia).
- **Commits:** implementação de código `39004f05900725fc212a0a1a5b27fb11e4ca6e42`; teste mais robusto de bordas em repouso e gate isolado `40a682a5bc334e9bf8b8e78c4b6d0901999f6458` na PR #669. Preview espelhado `114c27b4ef3c3685dc3d70537261d141adaffaa6`, workflow separado `2a9f97f82ab4e98f96fbe0225e705f20c0dafb0f`, teste corrigido `9627cb63a51a3491d8921825e4e88327f7d2227c`.
- **Status técnico atual:** build inicial da Web/preview passou, mas a primeira regressão da Home/Ações rápidas falhou em navegador ([integração #43094887291](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43094887291), [preview #43094955251](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43094955251)). A diferença visual entre estado em repouso e hover foi separada no teste para evitar falso positivo; os workflows foram divididos para diagnosticar regressão de navegação versus Ações rápidas. As execuções corrigidas [integração #43095770261](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43095770261) e [preview #43095805164](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43095805164) estavam **na fila** na última consulta, enquanto jobs anteriores continuavam presos na etapa de upload de artefatos. **Não declarar gates verdes até sucesso confirmado.**
- **Não foi publicado novo preview Render**, em respeito ao bloqueio por falha/pendência de QA. A versão LIVE anterior é a revisão #7 (commit `adb7ca7949acb8b98008d86620fe30ce36625319`), URL sem cache histórica: https://meg-home-p0-qa-pr669.onrender.com/fluxo-integrado-08.html?tela=home-p0&v=adb7ca7949acb8b98008d86620fe30ce36625319. **Não usar esse link como se mostrasse o minimalismo #8.**
- **Pendências reais:** (1) obter conclusão e detalhes dos gates isolados e corrigir qualquer falha restante; (2) publicar preview fictício da revisão #8 com cache limpo somente após gates verdes; (3) validação visual explícita da implementação; (4) tratar alinhamento de nome/descrição do card de crédito observado no print em rodada própria, mantendo escopo; (5) auditoria transversal #671 e avisos técnicos de dependências permanecem separados.
- **Proteções:** sem merge PR #669, sem deploy produtivo, sem alterações Android, API financeira, Supabase, banco ou DataGrid compartilhado. A tela não está homologada.


## Home PT3 — Investigação dos gates #8 (11/11/2026)
- **Falha exata, reproduzida em dois logs de Actions concluídos em failure:** execução de integração [43094887291](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43094887291), job `130781028678`, e execução QA [43094955251](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43094955251), job `130781256751`: `Error: cards devem usar uma borda sutil única, não quatro contornos coloridos: 768`, originada em `scripts/meg-08-home-quick-actions.browser.mjs:64`. Os logs mostram que o build passou, os **16 cenários visuais básicos da Home** passaram na integração, e os testes de navegação com contexto fictício em 8 combinações de telas/larguras passaram no QA. A falha está na assertiva adicional de uniformidade de borda dos atalhos em 768px; **não é prova, por si só, de defeito financeiro**.
- **Hipótese verificada no código do teste:** a assertiva original comparava indistintamente bordas do card em repouso com cards em estado `:hover/:focus-within`, cujo contorno de destaque é intencional. O ajuste implementado no commit `40a682a5bc334e9bf8b8e78c4b6d0901999f6458` (e espelhado em QA `9627cb63a51a3491d8921825e4e88327f7d2227c`) passou a comparar a uniformidade **apenas entre cards em repouso** e a permitir realce interativo. Esta é **correção de teste candidata**, não declarada validada até nova execução verde.
- **Segunda falha independente, infraestrutura de artefatos:** `actions/upload-artifact@v4` em ambos os jobs retornou `Failed to CreateArtifact: Failed to make request after 5 attempts: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`; as requisições de artefatos receberam HTML em vez da resposta JSON prevista. Tratar como falha do caminho de upload, não como erro de CSS nem motivo para mascarar um gate funcional.
- **Retomada pendente:** [integração corrigida 43095770261](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43095770261), [QA corrigido 43095805164](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43095805164) e [QA intermediário 43095467703](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43095467703) continuam `queued`, sem jobs provisionados na última verificação. Os uploads anteriores terminaram com erro; acompanhar fila e eventual nova falha dos artefatos.
- **Bloqueio absoluto:** não publicar revisão #8 no Render nem notificar link de revisão #8 antes de gates verdes e deploy `LIVE` com SHA conferido. Não alterar Android, outras telas ou domínio financeiro; não fazer merge. O último deploy `LIVE` continua a revisão #7, não o visual minimalista aprovado conceitualmente. Homologação visual #8 permanece pendente.


## Home PT3 — Incidente oficial GitHub Actions em 11/11/2026 (bloqueio externo)
- **Evidência externa oficial:** consulta ao [GitHub Status](https://www.githubstatus.com/) em 11/11/2026 revelou **Actions em Major Outage**, com atualização oficial de `Actions is experiencing degraded availability` às **20:48 UTC** (17:48 em Brasília) e investigação de múltiplos produtos às **20:56 UTC**. A indisponibilidade é contemporânea à fila travada e às falhas anteriores de upload de artefatos, mas não substitui a investigação do teste visual originalmente falho.
- **Situação dos gates da revisão #8 nesta verificação:** [integração corrigida #43095770261](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43095770261) e [QA corrigido #43095805164](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43095805164) permaneciam `queued`, sem jobs alocados (resultado `jobs: []`). A revisão ainda **não foi verificada nem publicada**. Os workflows anteriores #43094887291 e #43094955251 são `failure` por assertiva visual de borda em 768 px e erro independente de `actions/upload-artifact`.
- **Decisão operacional:** suspender retries, alterações de YAML e qualquer deploy enquanto o incidente externo persistir. Quando os jobs corrigidos iniciarem, confirmar separadamente regressão visual com hover, integrações financeiras em banco sintético, fluxo do carrossel e upload de evidências. Caso apareça erro novo com Actions normalizado, corrigir apenas o escopo autorizado. Publicar somente preview QA com cache limpo e SHA comprovadamente LIVE após **ambos os gates verdes**. Não fazer merge nem presumir homologação visual.


## Home PT3 — Reexecução dos gates após recuperação oficial do Actions (11/11/2026)
- **GitHub Status em 11/11/2026:** o incidente `Impact across multiple GitHub products including Actions, Pages, and Copilot products` foi encerrado oficialmente às **21:21 UTC**, com backlog declarado processado na mesma atualização. Fonte: https://www.githubstatus.com/ .
- **Estado pré-reexecução:** runs corrigidos [integração 43095770261](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43095770261) e [QA visual 43095805164](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43095805164) permaneciam `queued`, sem jobs associados, embora o status oficial mostrasse `Actions Operational`. Não considerar esses checks concluídos, nem esconder a falha original de uniformidade de borda/artefatos.
- **Ação autorizada:** reexecutar gates por commit exclusivamente documental/checkpoint nesta branch de integração e comentário inerte de workflow na branch QA, mantendo totalmente intactas lógica financeira, implementação visual, casos e gates técnicos. **Não** publicar no Render sem ambos os resultados `success`, ainda mais após a indisponibilidade de upload de artefatos.
- **Aguardando conclusão das novas execuções:** confirmar separadamente CI API/PostgreSQL sintético, Web, navegação visual e QA 8 viewports; em caso de falha obter logs e corrigir sem simplificar ou desabilitar checks. Preservar PR #669 Draft, Android congelado e não executar merge.


## Home PT3 — Revisão #8: gates recuperados e preview minimalista LIVE (11/11/2026)
- **Status oficial e retomada:** GitHub Status confirmou resolução do incidente que afetou Actions e backlog às **21:21 UTC** em 11/11/2026. Duas execuções novas foram disparadas por commits documentais/inertes após recovery, sem alterar aplicação nem relaxar checks.
- **Gates finais de código financeiro e integração:** [workflow #43105223826](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43105223826), SHA `3b83d5a3f5e888fcaeb2d2c2d12071739917dc47`, **COMPLETED/SUCCESS**, incluindo contratos API P0, regressão financeira, PostgreSQL 17 descartável com dados sintéticos, HTTP autenticado, build, 16 cenários da Home, **Ações rápidas em oito larguras**, navegação com backend sintético, gate de arquivos autorizados e upload de evidências.
- **Gate final de preview isolada:** [workflow #43105252453](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43105252453), SHA `9e6eece42251e71a283788fbbe3f624cf14c6ce1`, **COMPLETED/SUCCESS**, validando compilação sem API, navegação de contexto e Ações rápidas minimalistas em oito viewports, além de evidências. Corrigida e revalidada a comparação de bordas entre cartões em repouso; hover interativo é intencional.
- **Prévia publicada:** serviço Render QA `meg-home-p0-qa-pr669`, workspace `tea-d98k1qhkh4rs73f4sfj0`, serviço `srv-dbq07fjl550s7395ht1g`, branch `preview/08-home-p0-qa-pr669-20261111`, autoDeploy=no, deploy **com cache limpo** `dep-dbqe3a8ae00c7384lqu0`, SHA `9e6eece42251e71a283788fbbe3f624cf14c6ce1`, status **LIVE** confirmado às **21:44:56 UTC** em 11/11/2026.
- **Link oficial para validação sem cache da versão minimalista #8:** https://meg-home-p0-qa-pr669.onrender.com/fluxo-integrado-08.html?tela=home-p0&v=9e6eece42251e71a283788fbbe3f624cf14c6ce1
- **O que mudou:** Ações rápidas com superfícies teal uniformes e bordas sutis não cromáticas, SVGs multicoloridos sem quadrados internos, controles discretos de lápis/setas em cabeçalho à direita com tooltips e 44px, cards 75px, funções e carrossel circular preservados. Não houve modificação financeira, Android ou banco produtivo.
- **Checklist atendido:** compilação, contratos financeiros, Postgres sintético, testes visuais/responsivos, evidências, gates green e preview LIVE sem cache. **Checklist não atendido:** a implementação real da revisão #8 ainda **aguarda aprovação visual explícita do usuário**; não homologar por aprovação anterior do conceito. Auditoria transversal outras telas issue #671, alinhamento de texto do cartão de crédito e advisories npm/Vite permanecem pendências separadas.
- **Proteções:** PR #669 permanece Draft; **nenhum merge** nem deploy de produção. Sem mudanças em Android, API produtiva ou Supabase/banco de produção. Próximo passo: recolher validação visual da nova prévia e tratar apenas divergências comprovadas.


## Home PT3 — Revisão #9: ícones soltos e simetria estrutural (11/11/2026)
- **Reprovação visual explícita da revisão #8:** prints de 11/11 mostraram destaque/medalhão em SVGs de KPIs, compromissos e controles, texto do nome/emissor de cartão colado, painéis empilhados com espaçamentos inconsistentes e desalinhamento entre seções. A versão #8 permanece **não homologada** apesar dos gates técnicos anteriores.
- **Revisão estrutural em branch isolada, sem alterar fontes financeiras:** `home-dashboard.css` usa gaps constantes de 12px na Home, libera SVGs dos KPIs, vencimentos, controles de fluxo/cartão/tabelas, separa linhas de nome/emissor no resumo do cartão e emprega **CSS subgrid** somente a partir de 1024px para alinhar ambas as colunas e os rodapés das tabelas, preservando wrappers existentes. `quick-actions.css` remove a elevação por hover que deslocava cards e mantém ícones sem fundo. `home-due-alerts.css` remove medalhões dos alertas e deixa o sino da Home sem caixa, sem alterar demais telas. Alvos acessíveis e regras financeiras intactos.
- **Testes adicionais:** `scripts/meg-08-home-quick-actions.browser.mjs` verifica SVGs sem fundos/bordas/sombras, espaço vertical entre seções, malha simétrica 2x2 em desktop e nome/emissor do cartão em linhas distintas em oito larguras de navegador.
- **Falhas diagnosticadas na primeira iteração #9:** [integração #43110968905](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43110968905) detectou quatro falhas de alinhamento de rodapés no teste legado `meg-06-home-refino.browser.mjs`. [QA #43111047548](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43111047548) detectou outro estilo de maior precedência aplicando fundo/borda à classe `pano-card-summary-icon`. Esses defeitos foram tratados em `home-dashboard.css` no commit `639580a716d7f07dcbef003fc03d56d3986d2fe8` por subgrid e seletor mais específico. Espelhado no QA no commit `8add8097f104c96a533e3854d071fc2c479d11b8`. **Correções ainda pendentes de novo gate verde; não presumir validação.**
- **Gates e preview:** publicar revisão #9 somente quando integração financeira/API/PostgreSQL sintético e QA de oito larguras estiverem `COMPLETED/SUCCESS`, incluindo upload de evidências; então Render de QA manual com cache limpo e comprovação `LIVE`/SHA. **Sem merge** PR #669 e **sem deploy produtivo**. Homologação visual permanece pendente; próximo link precisa apontar para o novo commit.

- **Revisão #9, diagnóstico adicional nos testes:** QA #43111640603 encontrou em 1024px o painel de Benefícios com altura de 1036,5px, ocupando indevidamente os dois tracks do subgrid e deslocando Próximos compromissos para fora da malha. Removido `height:100%` do item de Benefícios no commit `b1efafdc0205717eca17bec54e3076aff4354f65`, espelhado no QA `60ba5e673f1a75f9f46a71466206f1db18415104`. Teste de geometria em 8 viewports e CI financeiro precisam passar **novamente** antes de publicar; falha não pode ser mascarada.

- **Revisão #9, terceira tentativa de layout:** QA #43111975483 apurou em 1024px que Benefícios terminava 61px antes do Fluxo, deslocando a tabela de compromissos, embora o bloqueio da altura total já tivesse sido removido. O teste legado da Home também detectou valor monetário cortado em 1024px. Foi substituído o subgrid por grade 2×2 direta e explícita no desktop, mantendo as colunas DOM apenas como wrappers de acessibilidade/mobilidade (CSS `display:contents` exclusivo no desktop), sem alturas artificiais. Código `7d32df35bdc355bfd246c91083a0dd61c70d5a59`; QA espelhado `3797e474ef20e28f0dd81e6f202873076f8b951c`. **Reexecutar gates; nenhum preview aprovado ou publicado.**

- **Diagnóstico exato de breakpoint em 1024px (#9):** QA com estilos computados demonstrou `window.innerWidth=1024`, porém grade financeira ainda com `gridTemplateColumns=791.438px` (coluna única) e wrappers com `display:flex`. A consulta `@media(min-width:1024px)` não estava ativando no espaço CSS reduzido por scrollbar. Ajustadas as duas regras desktop da Home para `min-width:1008px`, tolerância técnica de 16px para manter o breakpoint principal de 1024px no viewport físico. Mantidos 640px e 1024px como referenciais; nenhuma media global foi alterada. Commits `57896a568148cb951bac2809158fea30b19e6d74` no PR e `95c77de18580eed6d4cf877ec6e98f023f6079d5` em QA. **Necessário confirmar em nova execução; sem preview publicada nem homologação.**


## Home PT3 — Revisão #9: SVG minimalista, simetria e QA LIVE (11/11/2026)
- **Contexto da homologação:** prints do usuário detectaram inconsistência de alinhamento vertical e fundos decorativos nos ícones da Home. A revisão #8 foi **rejeitada visualmente**; a revisão #9 foi autorizada para corrigir ícones, distribuição/simetria dos painéis e alinhamento do nome/emissor do cartão, sem modificar domínio financeiro e sem estender a outras telas.
- **Alterações:** `apps/web/src/meg-web-evolution/home/home-dashboard.css`, `quick-actions.css`, `home-due-alerts.css` e `apps/web/src/meg-web-evolution/integrated-preview/home-refinement.css` implementam SVGs sem medalhões, blocos e fundos decorativos na Home; destaque leve e foco acessível, harmonização dos gaps em 12px e painel superior/grade financeira mais simétricos. `HomeDashboard.tsx` marca as movimentações com classe `pano-grid--movements` para responsividade contextual. O DataGrid compartilhado **não foi alterado**: em colunas estreitas, a Home usa os cards responsivos existentes, preservando todos os registros, datas e valores. Nome e emissor do cartão ficaram em linhas distintas. `QuickActions.tsx` preserva personalização, navegação circular, sete opções autorizadas e posição dos atalhos.
- **Conflito de CSS corrigido:** a folha `integrated-preview/home-refinement.css` continha seletores de alta especificidade que reativavam `auto-fit` e os wrappers em `flex` na grade financeira; consolidados para preservar quatro painéis dentro de duas linhas desktop e ordem mobile Fluxo > Benefícios > Movimentações > Compromissos. Breakpoints principais 640/1024px respeitados.
- **Testes:** `scripts/meg-06-home-refino.browser.mjs` verifica que DataGrid usa tabela **ou** cards visíveis conforme largura útil (não basta esconder tabela); `scripts/meg-08-home-quick-actions.browser.mjs` verifica SVGs sem caixas, áreas de toque, ausência de overflow, simetria dos quatro painéis, integridade visual de dados, hover/foco e oito viewports. Compilação e regressão de API/financeiro, PostgreSQL 17 descartável e HTTP autenticado com dados sintéticos permanecem exigidos.
- **Gates finais verdes:** [integração #43115777636](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43115777636), código `eaf1a880ac1078b588e339b4717baa544c21fcf1`, **COMPLETED/SUCCESS**; [QA isolado #43115932970](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43115932970), código `ec521dd3cf8af1c2327cc4ca27c4900d8fbe1fe3`, **COMPLETED/SUCCESS**, incluindo verificações de layout e evidências. Não confundir os inúmeros runs anteriores, que falharam, com a revisão atual.
- **Deploy isolado validado:** Render `meg-home-p0-qa-pr669` (workspace `tea-d98k1qhkh4rs73f4sfj0`, serviço `srv-dbq07fjl550s7395ht1g`, autoDeploy=no), deploy manual com **cache limpo** `dep-dbqf6g2jnfac738h26fg`, SHA `ec521dd3cf8af1c2327cc4ca27c4900d8fbe1fe3`, status **LIVE** confirmado às **23:00:01 UTC** em 11/11/2026.
- **Link de validação sem cache, revisão #9:** https://meg-home-p0-qa-pr669.onrender.com/fluxo-integrado-08.html?tela=home-p0&v=ec521dd3cf8af1c2327cc4ca27c4900d8fbe1fe3
- **Checklist atendido:** alterações visuais isoladas, painéis e ícones mínimos, testes responsivos, dados financeiros preservados, upload de evidências, preview LIVE e checkpoint. **Checklist não atendido:** aprovação visual humana desta implementação; auditoria transversal das demais telas issue #671. **Divergências:** DataGrid passa a modo cards em colunas estreitas por necessidade funcional e para preservar cabeçalhos/valores; não considerar alteração das regras financeiras. Advertências Vite e npm audit (1 alta, 8 moderadas, 1 baixa) anteriores permanecem sob análise separada.
- **Regra de parada:** PR #669 permanece Draft, sem merge, sem deploy de produção e sem mudanças em Android, Supabase ou banco produtivo. Não considerar revisão #9 validada sem aceite explícito do usuário.

- **Precisão de deploy final e diagnóstico:** o deploy `dep-dbqf6g2jnfac738h26fg` esteve LIVE e foi depois desativado automaticamente quando o segundo deploy QA **do mesmo SHA**, `dep-dbqf6go54qbs73emhsb0`, ficou **LIVE** às `2026-11-11T23:01:07 UTC`. O endereço com cache-buster `v=ec521dd3cf8af1c2327cc4ca27c4900d8fbe1fe3` continua sendo a referência atual. A hipótese histórica de breakpoint/scrollbar em 1024px foi **refutada**: o navegador confirmou `matchMedia('(min-width:1024px)').matches=true`; a causa real foi a maior especificidade do `integrated-preview/home-refinement.css`, depois corrigida. Regra principal retornou a 1024px. A revisão #9 ainda aguarda **aprovação visual do usuário**; gates verdes e Render LIVE não substituem isso.


## Home PT4 — Revisão #9: validação visual com refinamentos futuros (11/11/2026)
- **Manifestação explícita do usuário:** "FICOU BOM, MAIS PARA FRENTE MEXEMOS MAIS NELA" após abrir a revisão #9, seguida da solicitação de consolidar pendências e próximas etapas. Registrar como **APROVAÇÃO VISUAL DA REVISÃO #9**, preservando o visual mostrado no SHA de preview `ec521dd3cf8af1c2327cc4ca27c4900d8fbe1fe3`.
- **Limite do aceite:** não é aprovação integral de produção, integração financeira, API autenticada, publicação produtiva, merge, nem encerramento de toda a auditoria transversal. Melhorias adicionais de acabamento da Home ficam **adiadas para rodada futura explicitamente autorizada**, sem mudança silenciosa no layout aprovado.
- **Situação técnica vigente:** integração e QA visuais da revisão #9 foram aprovados nos runs `43115777636` e `43115932970`, Render de QA LIVE no deploy `dep-dbqf6go54qbs73emhsb0`, commit de preview `ec521dd3cf8af1c2327cc4ca27c4900d8fbe1fe3`.
- **Próximos gates reais:** consolidar a cadeia de branches/PRs da Home (#664 → #668 → #669, dependente das bases históricas); validar contratos de leitura e autenticação em ambiente seguro; revisar proteção operacional do build Render e backup/restore antes de qualquer liberação produtiva; preservar as outras telas e Android. Sincronização de preferências por usuário/dispositivos está fora do escopo da revisão visual atual (issue #662). A auditoria transversal permanece na issue #671.
- **Proteções:** PR #669 continua Draft e sem merge; não executar deploy de produção, migrations, alterações Supabase ou mudanças de regras financeiras por conta deste aceite visual. A etapa/tela seguinte só será iniciada no chat correspondente e após os gates de integração aplicáveis.


## Home PT4 — Sequência técnica após validação visual #9 (11/11/2026)
- O usuário autorizou seguir a sequência recomendada de fechamento técnico, preservando Home #9 aprovada e os cinco pontos visuais da Etapa 09 Lançamentos, **sem iniciar nova tela**.
- O backup criptografado e recuperação real estão sendo conduzidos **em chat paralelo**, PR #666; não executar nem modificar essa PR nesta frente. A prova de recuperação real continua gate externo antes de operação produtiva.
- Foi criado o handoff operacional **`docs/MEG-WEB-HOME-STAGE09-RELEASE-GATES-20261111.md`**, com inventário da cadeia de PRs, arquivos sobrepostos, bloqueios de produção e ordem de execução protegida.
- Auditoria de leitura confirmou todas as PRs relevantes em Draft: Home #664/#668/#669, Lançamentos #656 e API read-only #663, build seguro offline #670, backup #666. Sobreposição real de `apps/api/src/modules/finance/routes.ts` entre #668, #663 e #656 e de `DataGrid.tsx`, `main.tsx`, `AppShell.tsx` em ramificações diferentes; não realizar merge cego.
- Render API `meg-platform-api` conserva Auto Deploy ON e Build Command com `db:prepare:production` / `db:push:production`; SHA LIVE `28703a95310c9b9b5f193ef4f3a0cbe80e121f07`. **NO-GO para deploy ou merge** até backup/restore, preflight, autorização específica de janela e configuração comprovadamente segura.
- Gates offline verificados no SHA atual da PR #670: workflow #42956805822 SUCCESS e `MEG Platform CI` #42956805830 SUCCESS. Gates PR #663 SHA atual: workflow #42864176243 SUCCESS e `MEG Platform CI` #42864175843 SUCCESS. Gate da Web #656 SHA atual: workflow #42686850292 SUCCESS. Esses testes não equivalem a deploy ou homologação operacional.
- Próximo passo dentro do escopo da Home: preparar conciliação de patches em branch isolada de integração com QA, sem alterar UI aprovada, API ou banco produtivos. Após fechamento seguro da infraestrutura, publicar API e Web em gates separados, com autorização expressa. Etapa 10 só após encerramento formal da Etapa 09.


## Etapa 09 — API Home + Lançamentos integrada em QA isolado (11/11/2026)
- **Autorização:** usuário pediu continuidade da sequência priorizada, mantendo backup/restore em outro chat. A PR #666 é independente e **não foi modificada**.
- **Escopo desta entrega:** criada a branch `integration/09-readonly-home-p0-20261111`, PR #672 **DRAFT** sobre a branch da Home #669. Integra somente rotas e contratos de leitura da API, ainda sem absorver UI de Lançamentos da PR #656 e sem alterar qualquer tela aprovada.
- **Contratos preservados:** `GET /finance/home-commitments`; adicionados `GET /finance/events/history-snapshot` e `GET /finance/events/filtered-summary`; `sync-status` usa `activeHistoryRevision` no token, com anúncio de capacidades canônicas. `history-filter.ts` importado da PR #663, incluindo aliases históricos de `sourcePayload` e `importedRow`.
- **Primeira CI falhou de forma segura:** run #43123746496 encontrou bloqueio de destino nos testes, pois o snapshot Stage09 exige banco local `meg_stage09_ci` e o Home P0 utiliza `meg_home_p0_qa`. Nenhuma verificação foi desabilitada, nenhum segredo foi fornecido e nenhum banco real foi acessado.
- **Correção segura:** CI dividida em dois jobs independentes, cada qual com PostgreSQL 17 descartável, nome/usuário/senha locais próprios e proteção de destino antes de qualquer `prisma db push` em QA.
- **Resultado:** [GitHub Actions #43123967596](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43123967596) **COMPLETED / SUCCESS**, SHA funcional `ae5c617ec2e9d0dc3110346c166fbe06f87c7fb4`. Jobs `api-both-read-contracts` e `stage09-snapshot-isolated` **SUCCESS**. Testes de domínio, segurança, API, contratos Home e Lançamentos, snapshots PG17 e build Web passaram.
- **Arquivos de código alterados:** `apps/api/src/modules/finance/routes.ts`, `service.ts`, `history-filter.ts`, `history-revision.ts`, `workspace-sharing.contract.test.ts`; scripts de ensaio Stage09 e novo workflow `meg-stage09-home-api-combined-qa.yml`; documento próprio `docs/MEG-STAGE09-HOME-API-COMBINED-QA-20261111.md`. UI, DataGrid, Shell, Android, writers, schema e banco produtivo **não alterados**.
- **Status:** API combinada **validada tecnicamente SOMENTE no QA sintético**. **Não houve merge, deploy no Render, migração, escrita no Supabase nem homologação operacional com usuários reais**. A nova PR #672 permanece Draft; a PR #669 e todas as predecessoras permanecem protegidas.
- **Próximo passo na Etapa 09:** integrar isoladamente o frontend homologado da PR #656 à base da Home #9/#672, reconciliando `AppShell` (navegação autenticada + sino), `DataGrid`, `main.tsx` e filtros; repetir CI financeiro, QA visual em múltiplas larguras e teste autenticado com banco sintético. Não fazer merge ou deploy sem o gate independente de backup/restore real da PR #666 e correção autorizada do Build Command do Render.
- **Limites persistentes:** o serviço `meg-platform-api` ainda possui `db:prepare:production` e `db:push:production` em build com Auto Deploy ON. **NO-GO produtivo**. Não iniciar Etapa 10 antes do encerramento formal da Etapa 09.


## Etapa 09 — Integração visual Home #9 + Lançamentos PR #673 e QA estática (11/11/2026)
- **Autorização:** continuidade da Etapa 09, Lançamentos, preservando a Home revisão #9 já aceita. Backup/restore PR #666 é conduzido em chat paralelo e não foi alterado.
- **Código integrado isolado:** PR [#673](https://github.com/MarcosVilalva/MEG-Platform/pull/673), branch `integration/09-web-home-p0-20261111` sobre a PR #672, ainda em **Draft, sem merge**. Componentes de Lançamentos da PR #656 foram preservados por arquivos/blobs oficiais, sem recuperar UI antiga, mantendo layout homologado.
- **Compatibilização real:** `main.tsx` mantém `HomeDashboard userId`, autenticação e período atual de São Paulo; adiciona navegação para `OperationalLaunches` e revogação de sessão; `AppShell.tsx` preserva `HomeDueAlertsProvider` e sino da Home com navegação autenticada, perfil e logout; `DataGrid` ganha parâmetros *opcionais* para filtros favoritos. `finance-client.ts` consome apenas GETs canônicos com fallback seguro; nenhum cálculo monetário nem writer novo.
- **Visual e QA:** preview `fluxo-integrado-08.html?tela=lancamentos` usa exclusivamente fixture fictícia e preserva o contexto ao retornar de Novo Lançamento; a entrada autenticada existe no build de CI apenas e foi exercitada com API interceptada e dados sintéticos.
- **Gates da integração:** [Actions #43126375923](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43126375923) **COMPLETED/SUCCESS**, código `055b998aabb52a89203d798101d67380cade5434`: financeiro, segurança, contratos, build API/Web, gateway somente leitura, 16 cenários Home, 700 verificações de Ações rápidas, oito viewports Lançamentos e sessão/navegação autenticada fictícia. Duas falhas anteriores eram somente preparação de ambiente CI (dependência gateway e porta QA) e foram corrigidas mantendo os gates.
- **Prévia segregada:** branch `preview/09-lancamentos-home-p0-qa-20261111`, SHA `8c6734d28d5e5c723a98265c3f4d76263922005c`, Vite exclusivo com um único HTML fictício, bloqueando `web-evolution.html`, `phoenix.html` e `index.html`. [Actions #43126903694](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43126903694) **COMPLETED/SUCCESS**, artefato `meg-stage09-static-qa` ID `13903304216`, 8 viewports e zero API. Não confundir artefato CI com preview publicada.
- **Bloqueio Render confirmado:** tentativa de criar novo **static site QA** independente foi rejeitada com HTTP 400: `Hobby Tier is limited to 25 services`. **Nenhum novo serviço foi criado**, nenhuma configuração de serviço existente foi alterada. Não substituir a Home #9 publicada nem excluir/reciclar outras prévias sem decisão explícita do usuário. Ainda **não existe URL sem cache publicada** para a versão integrada #673; screenshots e evidências encontram-se apenas nos artifacts do GitHub Actions.
- **Arquivos de UI alterados apenas na branch isolada:** módulos `launches/*`, `main.tsx`, `AppShell.tsx`, `DataGrid.tsx`/`types.ts`, `finance-client.ts`, `integrated-preview/preview.tsx`, aviso Login e testes/workflow. API, bancos, Android e escritor financeiro intocados.
- **Checklist atendido:** integração de código, contratos API preservados, testes financeiros, regressões de Home/Lançamentos, segurança de escopo, evidência visual QA estática. **Checklist não atendido:** preview público ao vivo bloqueado pelo limite de serviços; homologação visual humana da composição integrada; operação real contra infraestrutura QA autorizada; fechamento/merge das PRs e deploy produtivo.
- **Próxima ação autorizável:** escolher explicitamente uma prévia antiga descartável para liberação de cota ou outro destino de publicação estática isolada, sem tocar os serviços produtivos nem perder referências validadas. Só depois publicar cache-buster e solicitar aceite da composição integrada. Persistem gate externo de backup/restore real e remoção controlada do Build Command produtivo com `db:prepare:production` e `db:push:production`.
- **Regra de parada:** PR #673, #672 e #669 continuam Draft, **NO-GO para merge/deploy produtivo**, e Etapa 09 permanece aberta. Não avançar à Etapa 10 nem declarar tela integrada visualmente homologada.


## Etapa 09 — QA estático Render LIVE após liberação de vaga (12/11/2026)
- O usuário confirmou o procedimento de liberação da vaga. Consulta Render confirmou a remoção efetiva do antigo serviço `meg-home-06-refino-pr653` (ID `srv-dbl4re0u01pc73eljmng`), reduzindo a conta de 25 para 24 serviços antes da criação. A Home #9 oficial `meg-home-p0-qa-pr669` permaneceu presente e intacta.
- Criado novo **Static Site exclusivamente de QA visual**: `meg-stage09-home-launches-qa`, serviço Render `srv-dbqlth8n74is73cjq9a0` (https://dashboard.render.com/static/srv-dbqlth8n74is73cjq9a0).
- Branch `preview/09-lancamentos-home-p0-qa-20261111`, commit do pacote fictício `8c6734d28d5e5c723a98265c3f4d76263922005c`, build `npm ci --audit=false && cd apps/web && npx vite build --config vite.stage09-home-launches-qa.config.ts`, publish `apps/web/dist-stage09-home-launches-qa`, **Auto Deploy NO**.
- Deploy inicial `dep-dbqlthgn74is73cjq9s0` foi confirmado pelo Render em estado **LIVE** (12/11/2026), apontando para o commit acima; sem alteração de serviço de produção, banco ou API.
- Link oficial de validação **sem cache** (Lançamentos): https://meg-stage09-home-launches-qa.onrender.com/fluxo-integrado-08.html?tela=lancamentos&v=8c6734d28d5e5c723a98265c3f4d76263922005c
- A prévia usa apenas HTML demonstrativo e fixture fictícia, sem entrada autenticada ou acesso à API; isolamento aprovado em [GitHub Actions #43126903694](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43126903694) (SUCCESS).
- **Limitação desta conferência:** Render confirmou build LIVE e URL do serviço, mas os verificadores HTTP externos do assistente não conseguiram obter resposta direta da página. Verificar a abertura da URL no navegador do usuário; não declarar homologação visual sem aceite explícito.
- PR #673 permanece **Draft e sem merge**. Pendente a validação visual humana da integração; backup/restore real PR #666 e saneamento do Build Command do Render produtivo continuam gates independentes. Android, API, dados e escritor financeiro preservados.


## Etapa 09 — Correção de divergência visual da prévia integrada (12/11/2026)
- **Incidente de validação reportado pelo usuário:** a primeira prévia publicada da PR #673 não correspondia à Home #9 aprovada. Causa confirmada: `integrated-preview/preview.tsx` usava `homePreviewFixture` com competência 2026-10, em vez de oferecer a Home P0 de referência (`?tela=home-p0`, `homeP0QaPreviewFixture`, competência visual 2026-11). O primeiro QA exercitava só a prévia histórica e não comparava o estado P0 homologado. **A publicação anterior não foi homologada**.
- **Segunda divergência descoberta por auditoria de blobs:** `shell.css` no ramo Home #9 é exatamente o arquivo Stage09 da PR #656 mais um bloco adicional de estilos da marca e menu lateral. Esse bloco era global, afetando indevidamente o visual de Lançamentos. As regras adicionais foram limitadas à Home por `.meg-shell:not(.is-launches-operational):not(.is-launches-visual-preview)`; a estrutura/CSS originais da PR #656 continuam íntegros em Lançamentos, e o conjunto da Home permanece aplicável à Home P0.
- **Correção implementada na PR Draft #673:** prévia recomposta a partir de `preview/08-home-p0-qa-pr669-20261111`, restaurando o arquivo oficial `home-p0-qa.preview.fixture.ts`; a rota `?tela=home` e `?tela=home-p0` resolvem a Home P0, inclusive ao voltar de Lançamentos e fechar Novo Lançamento. `?tela=home-legado` preserva isoladamente a antiga fixture apenas para testes de regressão histórica. `LaunchesStage09.tsx` e `launches-stage09.css` permanecem byte a byte iguais à PR #656. `AppShell` recebe apenas `visualVariant` opcional na prévia para aplicar o contrato CSS correto, sem alterar o financeiro ou a Home autenticada.
- **Gates fortalecidos:** foram preservados os 16 cenários da Home histórica e as 700 verificações de Ações rápidas em oito viewports; acrescentado `scripts/meg-stage09-home-p0-preservation.browser.mjs` para verificar P0, período, fixture sintética, navegação Home ↔ Lançamentos, retorno de Novo Lançamento, mobile e zero chamadas API. O QA visual de Lançamentos em oito viewports e o fluxo autenticado sintético também permanecem.
- **Resultados técnicos verdes:** [integração #43174376682](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43174376682) `completed/success`, código `5f81fffed75a9e43fdffa3a5141667416ccd2ebd`. [Prévia estática #43174381449](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43174381449) `completed/success`, código `7574b6fddc74ecfd58f2c126007d74970216fcb6`. Rodadas anteriores falharam por problemas encontrados em testes e compilação; foram corrigidos sem suprimir gates.
- **Render QA atualizado manualmente** porque Auto Deploy permanece `no`: serviço `srv-dbqlth8n74is73cjq9a0`, deploy `dep-dbqmir5g1s2s73eq3k70`, `LIVE` em 12/11/2026, SHA `7574b6fddc74ecfd58f2c126007d74970216fcb6`. O cache de build foi limpo e o serviço da Home #9 original `meg-home-p0-qa-pr669` permaneceu intacto.
- **Links de inspeção sem cache:** Home https://meg-stage09-home-launches-qa.onrender.com/fluxo-integrado-08.html?tela=home-p0&v=7574b6fddc74ecfd58f2c126007d74970216fcb6 ; Lançamentos https://meg-stage09-home-launches-qa.onrender.com/fluxo-integrado-08.html?tela=lancamentos&v=7574b6fddc74ecfd58f2c126007d74970216fcb6 .
- **Limite de verificação externa:** o Render confirmou `LIVE` no SHA correto, porém o ambiente do assistente não conseguiu abrir a URL por HTTP/DNS. Não inferir aceite visual ou funcionamento do CDN a partir desse acesso frustrado.
- **Estado:** correção publicada em QA isolado, ainda **AGUARDANDO VALIDAÇÃO VISUAL EXPLÍCITA do usuário**. PRs #673/#672/#669 permanecem Draft sem merge. Nenhum Android, banco de produção, API produtiva, regra central ou PR #666 foi alterado. Backup/restauração real e saneamento do Build Command do Render produtivo permanecem gates independentes para qualquer operação real. Não avançar para a Etapa 10.


## Etapa 09 — Regressão da prévia Lançamentos: modo visual operacional restaurado (12/11/2026)
- **Feedback do usuário:** “lançamentos nao esta certo, a nossa ja havia varias modificações validadas”. A reclamação é correta. A prévia integrada publicada anteriormente em `fluxo-integrado-08.html?tela=lancamentos` criava `LaunchesStage09` **sem informar `mode`**, portanto entrava no padrão `mode='preview'` (tela antiga). A aprovação explícita dos **cinco pontos em 09/11** está documentada na issue #660 com a URL **operacional** `web-evolution.html?tela=lancamentos&v=d62b1b8b449f7667e1ef6f261ae69096f4efaf2c`, que usa `mode='live'`. O código dos módulos da PR #656 ter sido preservado byte a byte **não significava que a entrada publicada mostrava o visual aprovado**. Os testes anteriores não cobriam essa equivalência; a comunicação anterior de que o link demonstrativo era “versão aprovada” foi incorreta.
- **Contrato visual recuperado da PR #656/issue #660:** banner com quatro KPIs integrados e CTA; cabeçalho compacto sticky durante scroll e restauração; filtros gerais separados dos filtros DataGrid e favoritos; grade maximizada com rolagem interna; Phosphor de categorias, miniaturas de métodos de pagamento e modal com detalhes. A Home #9 permanece sob sua própria autoridade da PR #669.
- **Correção segura:** somente `integrated-preview/preview.tsx` exibe `LaunchesStage09 mode='live'` com `homeP0QaPreviewFixture` sintética, competência 2026-11, ID de usuário exclusivamente de QA para favoritos locais, retorno visual de atualização simulado e aviso expresso **QA visual: dados fictícios, sem API**. A Shell recebe `activeSection='launches'` e `onNavigate` reais, resultando em `is-launches-operational` e fechamento normal do drawer mobile. A Home P0 permanece com dados sintéticos aprovados; `?tela=lancamentos-legado` conserva o modo demonstrativo antigo **apenas para regressão interna**. Nenhuma entrada HTML autenticada é publicada pelo serviço QA.
- **Arquivos visuais intocados:** `LaunchesStage09.tsx`, `launches-stage09.css`, `LaunchCategoryBadge.tsx`, `LaunchPaymentBadge.tsx` e ícones continuam byte a byte iguais à PR #656. O shell/CSS da Home #9 anteriormente isolados não foram redesenhados nesta correção. Não habilitar writers, autenticação nem API real no estático.
- **Gates novos:** `scripts/meg-stage09-approved-visual.browser.mjs` exige o modo operacional nos oito viewports com quatro indicadores no banner, sticky, botões distintos de filtro, favoritos, grade em foco/restauração, miniaturas, ícones e ausência de egress/API/escritas. Regressão original `scripts/meg-stage09-lancamentos.browser.mjs` foi preservada em `lancamentos-legado`; teste P0 mobile adaptado ao comportamento de menu que fecha após navegação, sem alterar a UI. Testes de frontend autenticado com API sintética, contratos e proteção financeira continuam obrigatórios.
- **Gates finais:** [CI integrado #43192553798](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43192553798) **completed/success**, código `3add371cda844efcbe2e5d83883d31731e4c3fb1`; [CI visual estático #43192566251](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43192566251) **completed/success**, branch QA `550675ada6b62ac88921647439dbd4b213acf296`.
- **Render atualizado exclusivamente na prévia estática:** serviço `meg-stage09-home-launches-qa` ID `srv-dbqlth8n74is73cjq9a0`, Auto Deploy **OFF**; deploy manual `dep-dbqohu2jnfac739ankcg` confirmado **LIVE** em `550675ada6b62ac88921647439dbd4b213acf296` (12/11). Link sem cache: https://meg-stage09-home-launches-qa.onrender.com/fluxo-integrado-08.html?tela=lancamentos&v=550675ada6b62ac88921647439dbd4b213acf296 .
- **Estado e divergência remanescente:** testes e deploy de QA concluídos, **aguardando nova inspeção e aprovação visual explícita do usuário**; não alegar igualdade de pixels com capturas anteriores, nem homologação operacional real ou fonte canônica conectada. Render confirma LIVE, mas ambiente do assistente não verificou o conteúdo da página por HTTP externo. PR #673, #672 e #656 continuam Draft/sem merge. Android, produção, API, banco, writers e PR #666 permanecem intocados. Etapa 09 não encerrada.



## Etapa 09 — Aceite visual do usuário da integração corrigida (12/11/2026)
- **Aceite visual explícito do usuário após abrir a prévia corrigida:** “agora simmmmm, excelente trabalho estamos fazendo, bora continuar”. Interpretação **estritamente delimitada ao visual integrado corrigido** de Home P0 + Lançamentos em modo operacional de QA, após as divergências de `mode='preview'` identificadas pelo usuário terem sido corrigidas. O usuário declarou a composição visual satisfatória; não ampliar a aprovação para dados reais, funcionalidade financeira, autenticação ou release.
- **Fonte visual congelada para a continuidade:** Home #9 da PR #669, Lançamentos com os cinco grupos aprovados na PR #656 / issue #660, integração isolada da PR #673. **SHA estático validado:** `550675ada6b62ac88921647439dbd4b213acf296`, URL de homologação sem cache: https://meg-stage09-home-launches-qa.onrender.com/fluxo-integrado-08.html?tela=lancamentos&v=550675ada6b62ac88921647439dbd4b213acf296 ; Home correspondente: https://meg-stage09-home-launches-qa.onrender.com/fluxo-integrado-08.html?tela=home-p0&v=550675ada6b62ac88921647439dbd4b213acf296 .
- **Evidências técnicas anteriores ao aceite:** [CI estática #43192566251](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43192566251) SUCCESS; [CI integrada #43192553798](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43192553798) SUCCESS; Render QA `srv-dbqlth8n74is73cjq9a0`, deploy `dep-dbqohu2jnfac739ankcg` LIVE. Aprovado visualmente somente este estado do QA. Os componentes da PR #656 permanecem íntegros, sem redesenho.
- **Continuidade autorizada:** prosseguir **somente com preparação, auditoria, testes e saneamento técnico não destrutivo da Etapa 09**, sem avançar para Etapa 10 e sem modificar a identidade visual aprovada. PRs #656/#669/#672/#673 continuam Draft e sem merge. **NO-GO** de banco/produção permanece até backup externo cifrado com restauração real comprovada (PR #666 em trabalho separado), análise de cota Supabase e proteção do Build Command destrutivo do serviço Render produtivo `meg-platform-api`, com autorização específica de operação.
- **Protocolo futuro:** qualquer mudança que afete layout, componentes, ícones, dados ou comportamento financeiro da tela integrada exige explicitação do motivo e nova inspeção; testes verdes não revalidam visual automaticamente. Android permanece congelado.


## Etapa 09 — Proteção automatizada do visual homologado e gates de release (12/11/2026)
- Usuário aprovou visualmente a integração corrigida no serviço QA estático `meg-stage09-home-launches-qa`, SHA aprovado `550675ada6b62ac88921647439dbd4b213acf296`, Home P0 + Lançamentos com `mode='live'` usando somente fixture fictícia. **Visual congelado neste estado, sem produção.**
- Criada na PR #673 uma nova etapa de CI `Bloquear divergencia dos componentes visuais homologados` que confere, via `git hash-object`, cinco blobs aprovados: `HomeDashboard.tsx` da PR #669; `LaunchesStage09.tsx`, `launches-stage09.css`, `LaunchCategoryBadge.tsx` e `LaunchPaymentBadge.tsx` da PR #656. Divergência bloqueia CI com erro e exige nova autorização/validação visual. Não é substituto de inspeção humana; testes Playwright continuam exigindo a entrada operacional aprovada em 8 viewports.
- **Novo gate confirmado:** [GitHub Actions #43194448562](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43194448562) `completed/success` no **SHA de código** `2a193ce4067ba1753a9a611edfb516a457bbec6f`. Build API e Web, financeiro/CORS/segurança, contratos, gateway somente leitura, Playwright Home/Lançamentos/autenticação sintética e gate de escopo passaram. Apenas workflow de CI foi alterado desde a aprovação visual, portanto não houve novo deploy do site estático e o SHA visual no Render permanece o aprovado.
- **Auditoria pós-aceite:** PRs #656 (visual), #663 (API read-only), #669 (Home), #672 (contratos), #673 (integração) e #666 (backup) seguem `open/draft` e sem merge. A PR #666 passou no [teste offline #43193519809](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43193519809) no SHA `202de8ff30a8c40aaa63766d2960acda5b79d533`, mas **backup de produção criptografado + restauração isolada REAL ainda NÃO estão comprovados**. O Render `meg-platform-api` ainda está com `autoDeploy=yes`; a configuração de Build Command previamente documentada com `db:prepare:production` e `db:push:production` **não foi novamente inspecionável pelo conector nesta rodada**. A última cota Supabase Egress foi auditada em outra frente, mas não foi revalidada hoje.
- **NO-GO de produção:** sem permissão de alteração no Android, API/DB produtivos, Render Build Command, merge ou publish de Web autenticada até: (1) backup real externo/restauração verificados, (2) confirmação da cota/egress e plano, (3) preflight e mudança segura do comando de build com autorização explícita, (4) validação de API read-only autenticada com segurança/observabilidade, (5) revisão das PRs empilhadas, CI final e autorização específica de merge/deploy. Não avançar à Etapa 10 neste chat.



## Etapa 09 — Regra visual universal do Shell após revisão por vídeo (12/11/2026)
- **Nova decisão expressa do usuário:** após enviar o vídeo `06-52-59.mp4`, identificou que a transição Home → Lançamentos alterava elementos da moldura global e determinou: “precisa ser tudo padronizado conforme a home, aplicar a regra para qualquer tela”. O **Shell P0 da Home homologada é fonte da verdade para TODAS as telas, atuais e futuras**, incluindo logotipo, sidebar, destaque ativo, menu expandido/recolhido, topbar, busca, botão +, período, sino e perfil. Apenas a navegação ativa, conteúdo central e estados reais/canônicos podem variar. Nenhuma tela pode definir estética própria para esses componentes compartilhados.
- **Causa específica no código e no vídeo:** `launches-stage09.css` definia bordas/retângulos exclusivos do menu, espaçamento da sidebar compacto e ocultava `.meg-topbar-new` na rota Lançamentos; `shell.css` aplicava refinamentos da Home apenas em `.meg-shell:not(.is-launches-operational):not(.is-launches-visual-preview)`; `home-due-alerts.css` deixava o sino sem moldura somente na presença de `.pano-root`. Essas diferenças não eram cobertas pelo QA anterior.
- **Correção implementada na branch isolada da PR #673:** Shell CSS globalizado sem exclusão de rota, logo/nav padrão da Home aplicados a qualquer tela, sino sem moldura independente da Home montada. Removidos **apenas seletores que alteravam o Shell** de `launches-stage09.css` (32 linhas líquidas), preservando integralmente banner, grade, filtros, favoritos, modais e visual interno da tela validada. Removido `visualVariant` de `AppShell.tsx`/preview para impedir bifurcação visual; a navegação semântica ativa permanece funcionando. O indicador luminoso do sino **não é decorativo**: ele só aparece quando a fonte canônica da sessão tiver um alerta real; não fabricar status nem saldos.
- **Contratos automatizados:** `scripts/meg-stage09-shell-continuity.browser.mjs` compara estilos computados e dimensões de Home ↔ Lançamentos com retorno, em **sete resoluções (390, 768, 960, 1024, 1366×768, 1366×600, 1920)**, inclusive ausência de API e escritas no estático. O teste `meg-stage09-operational.browser.mjs` em 960px foi corrigido para exigir **igualdade com a Home**, não o espaçamento exclusivo de Lançamentos historicamente imposto. O gate de hashes dos cinco componentes foi preservado, atualizando apenas o hash do `launches-stage09.css` para a versão sem sobrescritas de Shell, com os demais blobs protegidos.
- **CI final da nova candidata:** [QA visual estática #43198473199](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43198473199) **SUCCESS** no commit `760b7ad0e3217dbab70ea426df9cad67318f79ef`; [QA integrada #43198458311](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43198458311) **SUCCESS** no commit `aa5a12daef89605c589c68f36a00640a9dd72140`. As rodadas anteriores detectaram regras de teste legadas incompatíveis com o Shell universal; corrigidos os testes **sem suprimir verificações**.
- **Preview Render QA não produtiva:** `meg-stage09-home-launches-qa` (`srv-dbqlth8n74is73cjq9a0`) Auto Deploy **OFF**, deploy manual com cache limpo `dep-dbqp4h3m8hqs73eg9hn0` **LIVE** no commit `760b7ad0e3217dbab70ea426df9cad67318f79ef`. Home sem cache: https://meg-stage09-home-launches-qa.onrender.com/fluxo-integrado-08.html?tela=home-p0&v=760b7ad0e3217dbab70ea426df9cad67318f79ef ; Lançamentos sem cache: https://meg-stage09-home-launches-qa.onrender.com/fluxo-integrado-08.html?tela=lancamentos&v=760b7ad0e3217dbab70ea426df9cad67318f79ef .
- **NOVA VALIDAÇÃO VISUAL PENDENTE:** o usuário aprovou anteriormente a integração antes dessa correção de Shell; não declarar a mudança visual de Shell aprovada automaticamente por CI. Solicitar inspeção humana do vídeo/links e aceite explícito. O visual *interno* de Home e Lançamentos previamente aprovado permanece autorizado; a nova moldura universal é apenas **candidata**.
- **Segurança/continuidade:** PRs continuam **Draft e sem merge**, nenhuma alteração no Android, API financeira, banco real, writers ou produção. Backup real/restauração isolada (PR #666), cota Supabase e proteção do Build Command produtivo continuam **NO-GO**. Não avançar à Etapa 10 nem alterar outras telas até autorização adequada.


## Etapa 09 — HOMOLOGAÇÃO VISUAL EXPRESSA do Shell universal e encaminhamento para Etapa 10 (12/11/2026)
- **Aprovação explícita do usuário nesta conversa:** após inspeção da versão corrigida com o mesmo Shell da Home em Lançamentos, afirmou **“agora sim, validado, vamos seguir para proxima etapa”**. Portanto fica **VISUALMENTE HOMOLOGADO** o Shell global no QA de Home ↔ Lançamentos e confirmada a regra permanente de identidade única: logotipo, menu lateral com ícone ativo, botão +, topbar, busca, período, sino, perfil, dimensões e responsividade devem conservar o padrão oficial da Home em **todas** as telas posteriores. O conteúdo central e a seção ativa podem mudar; o indicador de vencimentos deve refletir apenas dados canônicos.
- **Artefato visual homologado:** branch QA isolada `preview/09-lancamentos-home-p0-qa-20261111`, SHA exato `760b7ad0e3217dbab70ea426df9cad67318f79ef`, deploy estático Render `dep-dbqp4h3m8hqs73eg9hn0` status LIVE, Auto Deploy OFF. Validar sem cache: Home `https://meg-stage09-home-launches-qa.onrender.com/fluxo-integrado-08.html?tela=home-p0&v=760b7ad0e3217dbab70ea426df9cad67318f79ef`, Lançamentos `https://meg-stage09-home-launches-qa.onrender.com/fluxo-integrado-08.html?tela=lancamentos&v=760b7ad0e3217dbab70ea426df9cad67318f79ef`.
- **Gates técnicos correspondentes:** [QA estática #43198473199](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43198473199) SUCCESS e [QA integrada #43198458311](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43198458311) SUCCESS. Testes `meg-stage09-shell-continuity.browser.mjs` comparam efetivamente Home e Lançamentos em sete viewports; teste operacional 960px exige identidade da sidebar com a Home. **Não extrapolar aceite visual para homologação funcional/autenticada.**
- **Nova autorização do usuário:** seguir para a **Etapa 10 — Novo Lançamento e Editar Lançamento**, respeitando a ordem oficial, **em chat próprio da Etapa 10**, sem executar essa nova etapa no chat da Etapa 09. A autorização diz respeito a preparar e desenvolver isoladamente a nova tela após auditoria e testes, **não é autorização de writer financeiro de produção, deploy, merge ou alteração de banco**. Não reaproveitar visuais antigos; usar os prints oficiais atuais, Shell/DataGrid já homologados e regras financeiras canônicas.
- **Requisitos de abertura da Etapa 10:** ler este checkpoint, `docs/MEG-WEB-FINANCIAL-AUTHORITY.md`, Prompt Master, regras consolidadas (itens financeiros aplicáveis), issues/PRs atualizadas; identificar contratos atuais de criar/editar/excluir lançamento, categorias/contas/pagamento/cartões/parcelas/benefícios, autocomplete e regra obrigatória Alimentação (Conta Benefício + Verocard + Pago); escrever testes de caracterização de writes/atomicidade/saldo insuficiente antes de implementar; nenhuma tela calcula status, saldos ou parcelas. Reproduzir os prints oficiais de seletor de tipo, formulário de despesa e edição, mantendo conteúdo já aprovado e transições de Shell. Se regra não existir, registrar bloqueio; não inventar writer.
- **Status remanescente da Etapa 09:** Visual de Home+Lançamentos integrado e Shell **aprovado**, porém **sem encerramento técnico/de produção**: PRs #656/#663/#666/#669/#672/#673 permanecem Draft e sem merge na última consulta. Backup real cifrado e restore isolado comprovado (PR #666), cota/egress Supabase, saneamento do Build Command Render e validação autenticada real da API somente leitura permanecem gates NO-GO para release. Não mexer em Android, produção, API ou banco. Merge somente com CI, auditoria e autorização específica.

## 12/11/2026 — Etapa 08 (chat de fechamento funcional): Home → Lançamentos, inventário de controles e regressão

**Separação operacional expressa do usuário:** este chat é considerado **Etapa 08, integração Home + Lançamentos**; outro chat da **Etapa 09** conduz backup, recuperação, auditoria financeira, Supabase e segurança de publicação; um terceiro chat da **Etapa 10** desenvolve Novo/Editar Lançamento. Nenhuma autorização para sobrepor essas frentes, fazer merge, deploy ou alteração financeira produtiva foi dada.

**Autorização:** o usuário concordou e assinalou os sete itens de trabalho: (1) conectar navegação Home → Lançamentos por rota existente; (2) auditar controles inativos; (3) conferir atalhos/favoritos autenticados; (4) caracterizar lacunas de saldos explicáveis, contagens globais e atualização entre telas; (5) executar regressões; (6) revisar dependências de PRs; (7) consolidar backlog e checkpoint. Assinalar o checklist é autorização de execução, **não** declaração de testes já concluídos.

**Branch/PR própria:** `stage08/home-launches-closeout-20261112`, baseada no código de `integration/09-web-home-p0-20261111@49b0824091677b874a77000da3576ff4e15d2e67`; [PR #677](https://github.com/MarcosVilalva/MEG-Platform/pull/677) **Draft, sem merge**, base branch da PR #673 (não `main`).

### Alteração funcional delimitada
- `apps/web/src/meg-web-evolution/main.tsx` conecta somente o destino identificado como `lancamentos` ao `section='launches'` já autorizado pela Shell. Outros atalhos não recebem rotas falsas.
- `apps/web/src/meg-web-evolution/home/HomeDashboard.tsx` admite callback `void|boolean`, mantendo a mensagem original de indisponibilidade quando retorna `false`; as prévias anteriores com callbacks `void` mantêm seu comportamento. **Markup/JSX visual e CSS intocados.**
- `QuickActions.tsx`, DataGrid, AppShell, Shell CSS, `LaunchesStage09.tsx`, ícones, cartões e componentes financeiros não foram alterados.
- Teste `scripts/meg-stage08-home-navigation.browser.mjs` cobre o fluxo autenticado com dados fictícios 1366×768 e 390×844: aviso para destino sem rota, navegação pelo atalho, retorno pela sidebar, persistência por usuário, ausência de requisição financeira de escrita e de overflow. No celular, o teste interage com o carrossel real, sem pressupor visibilidade de cartões fora da janela.
- O workflow já existente `meg-stage09-web-home-integrated-qa.yml` foi estendido somente para a branch isolada e novo teste; seu gate de hashes da Home foi atualizado para o blob funcional revisado `9ccb041d72088db1f071bad2c82965c564f73743`, mantendo os quatro blobs homologados de Lançamentos bloqueados e os testes visuais de Shell.

### Provas executadas
- Primeira rodada [Actions #43209146240](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43209146240) **FAILURE exclusiva do novo teste mobile**: clique em atalho fora do recorte do carrossel. Corrigido somente o teste.
- Rodada final [Actions #43209902280](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43209902280) **COMPLETED/SUCCESS**, SHA de código `7ce1c785583bd5d24a4b3a2db93e8b4d2bb05ae3`: build API/Web, testes financeiros, CORS, segurança, contratos e gateway somente leitura, 16 cenários de Home, 700 verificações dos atalhos em oito viewports, visual Lançamentos em oito, Shell em sete, teste operacional autenticado, filtros favoritos, logout e nova navegação 1366/390 aprovados. Gate de arquivos autorizados **SUCCESS**. A prova pertence ao SHA de **código**; commits documentais posteriores usam `[skip ci]`.
- Diff auditado na PR #677 antes do checkpoint: somente `main.tsx`, `HomeDashboard.tsx`, teste novo, workflow e documentação própria. Nenhum arquivo do Android, API, writers financeiros, banco, CSS/JSX aprovado, Render, Supabase ou demais PRs sofreu alteração.
- Documento completo com matriz de controles, riscos e responsáveis: [MEG-STAGE08-HOME-LAUNCHES-CLOSEOUT-20261112.md](docs/MEG-STAGE08-HOME-LAUNCHES-CLOSEOUT-20261112.md).

### Pendências preservadas e próxima autorização
1. **Revisão humana do comportamento funcional novo na QA autorizada.** O preview visual homologado continua `760b7ad0e3217dbab70ea426df9cad67318f79ef`, sem novo deploy; não declarar que ele já contém o atalho corrigido.
2. Controles que permanecem deliberadamente inativos: Novo Lançamento da topbar (Etapa 10), busca global, seletor de período, perfil e sidebar Cartões/Pendentes/Benefícios/Relatórios/Configurações (etapas próprias); sem placeholders falsos.
3. Pendências conceituais/documentadas, **não implementadas**: detalhamento rastreável de saldos/projeções, contagem global de urgências sem inferência pelos oito registros iniciais, invalidação de leituras entre telas após writers autorizados, otimização de consultas com evidências representativas e sincronização de preferências/ícones por usuário (issue #662). A auditoria transversal de outras telas (issue #671) permanece fora deste chat.
4. PRs #664/#668/#669/#656/#663/#672/#673 mantidas nos seus escopos Draft; PR #677 também Draft. Revisão de dependências e arquivos compartilhados documentada; **não existe autorização de merge nem deploy**.
5. Gates externos de backup, cota Supabase, segurança do Build Command e integridade financeira são responsabilidade do outro chat da Etapa 09. Nenhuma alteração nesses itens foi executada por esta branch.

**Status:** sete atividades do checklist foram tratadas no escopo autorizado e o **CI do código está verde**; a integração funcional permanece **candidata em PR Draft**, aguardando verificação humana/autorização de incorporação. A Etapa 08 **não equivale a publicação produtiva** e o projeto não perde qualquer homologação visual anterior.

## 12/11/2026 — Etapa 08 | QA funcional estática PR #677

**Autorização:** usuário pediu executar uma prévia da navegação Home → Lançamentos. A branch isolada stage08/home-launches-closeout-20261112 e a PR #677 Draft permanecem separadas das frentes Etapa 09 (backup/auditoria) e Etapa 10 (Novo/Editar). Nenhuma autorização de merge ou deploy produtivo.

**Implementado apenas para QA:** apps/web/stage08-funcional-qa.html, vite.stage08-funcional-qa.config.ts, stage08-qa/bootstrap.ts, scripts/meg-stage08-static-qa.browser.mjs e workflow isolado meg-stage08-static-functional-qa.yml. A página usa a entrada autenticada real main.tsx com sessão e respostas financeiras fictícias. O bootstrap bloqueia a rede externa e operações financeiras de escrita. A CSP permite apenas conexão à mesma origem; fotografias do layout aprovado podem vir de images.unsplash.com. Nenhum dado real, segredo, Supabase, API produtiva ou banco acessados.

**Correções restritas ao teste e à build fictícia:** NODE_ENV=production para não usar o endpoint de desenvolvimento localhost:3333; aguardada a abertura e fechamento regular do alerta inicial de vencimentos; excluída a cópia de public/downloads do artefato estático (arquivos originais intactos). Os elementos homologados da Home, Shell e Lançamentos não foram alterados.

**Evidência de QA:** [smoke GitHub Actions #43219345293](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43219345293), SUCCESS, SHA 9dbe0b12aee39a209243e5f12958032b7e7ed883. Inclui fluxo real de navegador em 1366x768 e 390x844, retorno à Home, fallback de rotas ainda indisponíveis, persistência e zero requisições de API pela rede. Artefato [meg-stage08-funcional-qa-pr677](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43219345293/artifacts/13945176562), ID 13945176562, ZIP 6,15 MiB, expiração indicada em 12/12/2026. [CI integrada #43219345431](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43219345431): COMPLETED/SUCCESS no SHA 9dbe0b12aee39a209243e5f12958032b7e7ed883, com regras financeiras, contratos, segurança, Home, Shell, Lançamentos, filtros favoritos, gateway, testes de navegador e gate de arquivos autorizados verdes.

**Bloqueio de hospedagem:** tentativa de criar um NOVO site Render meg-stage08-funcional-pr677 com Auto Deploy NO foi recusada com HTTP 400, mensagem exata: Hobby Tier is limited to 25 services. Nenhum serviço foi criado, excluído, reconfigurado ou publicado. A prévia homologada meg-stage09-home-launches-qa, SHA 760b7ad0e3217dbab70ea426df9cad67318f79ef, permanece íntegra e não representa o novo teste funcional.

**Alternativas:** ZIP pode ser servido localmente no WSL com python3 -m http.server 4175 --directory ~/meg-stage08-qa após extração, abrindo http://localhost:4175/stage08-funcional-qa.html no Windows. Hospedagem alternativa (Vercel) exige conexão explícita do usuário. Não apagar serviços do Render nem alterar a assinatura sem autorização adicional.

**Status:** teste funcional sintético comprovado e pacote estático entregue; URL pública LIVE e homologação humana ainda PENDENTES. Sem merge, API produtiva, banco, Android, Render homologado ou writer financeiro. Ver docs/MEG-STAGE08-HOME-LAUNCHES-CLOSEOUT-20261112.md para matriz, instruções e evidências.

**Próximo passo:** hospedar a QA por serviço adicional previamente autorizado ou validar localmente o ZIP; registrar aceitação humana de navegação e comportamento; só então preparar eventual incorporação sob gates externos e autorização separada.

## 12/11/2026 — Etapa 08 | Publicação isolada da QA funcional da PR #677

**Retomada autorizada:** o usuário informou ter excluído cinco serviços do Render e autorizou continuar o projeto. A auditoria de serviços confirmou **20 serviços restantes**, sem remoções adicionais pela intervenção. A API principal e a prévia Home + Lançamentos homologada continuam preservadas.

**Static Site criado (sem tocar nos existentes):**
- `meg-stage08-funcional-pr677`, ID `srv-dbqrgtu7bikc73aufrvg`, [Render Dashboard](https://dashboard.render.com/static/srv-dbqrgtu7bikc73aufrvg), branch `stage08/home-launches-closeout-20261112`, **Auto Deploy NO**, sem segredos, sem API externa.
- Build: `npm ci --audit=false && cd apps/web && NODE_ENV=production npx vite build --config vite.stage08-funcional-qa.config.ts`. Saída exclusiva `apps/web/dist-stage08-funcional-qa`. Dados são 100% fictícios. O bootstrap intercepta e bloqueia chamadas a API externa.
- Deploy `dep-dbqrgu67bikc73aufsv0` confirmado **LIVE** em 12/11/2026, às 13:02:02 UTC, SHA `571cc7aabecf96a44ecb44dee5043823e6f6ac29`; os quatro commits entre o SHA já aprovado tecnicamente `9dbe0b12aee39a209243e5f12958032b7e7ed883` e o SHA implantado alteraram somente documentação, comprovado pelo comparador do GitHub.
- **URL sem cache:** https://meg-stage08-funcional-pr677.onrender.com/stage08-funcional-qa.html?v=571cc7aabecf96a44ecb44dee5043823e6f6ac29
- CI de código anterior [#43219345431](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43219345431): SUCCESS. Novo teste de navegador contra o **domínio público real** [run #43223667175](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43223667175) **COMPLETED/SUCCESS**: Playwright 1366×768 e 390×844 passou tanto localmente quanto no site Render LIVE, com login fictício, Home ↔ Lançamentos, fallback de destino indisponível e zero chamadas financeiras à rede. A CI completa correspondente é o [run #43223667125](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43223667125), cuja conclusão final deve ser registrada separadamente.
- **PENDENTE:** inspeção humana e validação funcional explícita pelo usuário, antes de merge. Testes verdes, deploy LIVE e link sem cache não substituem homologação.
- **Restrições permanentes:** não tocar Android, API, Supabase, banco restaurado, Render produtivo, serviço de prévia visual já homologada ou demais PRs; nenhuma autorização para merge/deploy produtivo. Outro chat continua com recuperação/backup Etapa 09 e terceiro chat com Novo/Editar Etapa 10.
- Matriz, provas e instruções detalhadas em `docs/MEG-STAGE08-HOME-LAUNCHES-CLOSEOUT-20261112.md`. Próximo passo: confirmar teste público e obter aceite explícito do usuário na nova URL.

## 12/11/2026 — Etapa 08 | Revisão aprovada dos ícones dos KPIs e botão Ações (#679)

**Decisão do usuário:** proposta de trocar ícones dos quatro KPIs da tela autenticada de Lançamentos e substituir o botão `Ver` por ícone de olho com tooltip foi aprovada com **"validado, prosseguir"**. A aprovação referiu-se à proposta, **não à inspeção da implementação em produção ou na QA**.

**PR/branch isolados:** PR [#679](https://github.com/MarcosVilalva/MEG-Platform/pull/679) Draft, branch `stage08/lancamentos-icons-refinement-20261112`, base PR #677 `stage08/home-launches-closeout-20261112`. Sem merge e sem modificação no serviço da PR #677, PR #673 ou preview visual homologado `760b7ad0e3217dbab70ea426df9cad67318f79ef`.

**Arquivos de código alterados nesta revisão:** `apps/web/src/meg-web-evolution/launches/icon-packs/refined-action-icons.tsx` (novo), `LaunchIcon.tsx`, `LaunchesStage09.tsx`, `launches-stage09.css`. O novo pacote SVG cria `projectedChart`, `cashIn`, `cashOut`, `walletMinimal` e `eye`; sua integração nos KPIs fica restrita a `mode='live'`, preservando os símbolos da preview antiga. O botão de consulta visual passa a mostrar somente o olho, com tooltip mouse/teclado, título e nome acessível por registro; modal, controles financeiros, resumo canônico, filtros e DataGrid estrutural inalterados. Alvo 36 px no desktop, 44 px no celular.

**Testes alterados:** novo `scripts/meg-stage08-lancamentos-icons.browser.mjs`, ajuste de expectativas em `scripts/meg-stage09-operational.browser.mjs`, workflows `meg-stage08-static-functional-qa.yml` e `meg-stage09-web-home-integrated-qa.yml`. O primeiro teste falhou pela cópia oculta da tabela no viewport 960 px; foi ajustado apenas o seletor para o botão visível no DataGrid em modo de cartões, sem modificar UI.

**CI verificada:** [integração #43226129382](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43226129382) **SUCCESS**, [QA isolada #43226129447](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43226129447) **SUCCESS**, ambas no commit de código `c1133b6c246a1652d3f3e3712fe5c612f8689c88`. [QA pública #43226911114](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43226911114) **SUCCESS**: navegador real sobre serviço público, 1366×768, 960×900, 390×844, preservação dos valores e nenhuma chamada financeira externa. Capturas de QA: [artefato `meg-stage08-icons-visual-pr679`](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43226911114/artifacts/13948775773).

**Prévia Render dedicada criada, sem reutilizar site homologado:** `meg-stage08-icones-pr679`, ID `srv-dbqrr7qfngtc738gae3g`, [painel](https://dashboard.render.com/static/srv-dbqrr7qfngtc738gae3g), `autoDeploy=no`, branch isolada, sem API/banco/segredos. Deploy `dep-dbqrr82fngtc738gaee0` **LIVE** em 12/11/2026 13:23:26 UTC, commit `c1133b6c246a1652d3f3e3712fe5c612f8689c88`. **URL sem cache:**
https://meg-stage08-icones-pr679.onrender.com/stage08-funcional-qa.html?v=c1133b6c246a1652d3f3e3712fe5c612f8689c88

**Situação e limites:** implementação e testes técnicos concluídos, nova QA pública disponível. **Homologação visual da nova implementação pelo usuário ainda PENDENTE.** Nenhum merge, deploy produtivo, writer, migração, Android, API, Supabase, dados reais, Home, Shell ou DataGrid aprovado foram alterados. A documentação detalhada está em `docs/MEG-STAGE08-HOME-LAUNCHES-CLOSEOUT-20261112.md`. Próximo passo exato: usuário inspecionar a nova URL sem cache e aprovar ou apontar diferenças; só depois considerar a incorporação PR #679 em sua base, com gates externos e autorização própria.

## 12/11/2026 — Etapa 08 | Reprovação dos ícones anteriores e implementação MEG Prism 3D

**Aprovação/reprovação com prioridade:** depois de inspecionar a primeira QA da PR #679, o usuário **REPROVOU** os ícones anteriores, descrevendo sentido invertido/ambíguo de Entradas e Saídas, qualidade visual insuficiente e preferência por aspecto **3D, arredondado e de alta definição**. Autorizou expressamente continuar e refazer. Esta decisão posterior **substitui a aprovação da proposta inicial**, que não constitui aceite visual da implementação.

**Branch/PR:** `stage08/lancamentos-icons-refinement-20261112`, [PR #679](https://github.com/MarcosVilalva/MEG-Platform/pull/679) ainda **Draft** sobre a PR #677, sem merge. Preservados Home, Shell, DataGrid, prévia visual anterior homologada, Android, API, Supabase, banco, commits de outras etapas e writers.

**Correção realizada:**
1. Novo pacote SVG local próprio `apps/web/src/meg-web-evolution/launches/icon-packs/meg-prism-icons.tsx` com glifos `projection3d`, `entry3d`, `exit3d`, `wallet3d`, `details3d`. Símbolos 256×256 vetoriais, gradientes, profundidade, cantos arredondados, reflexos e sombras discretas; pacote visual anterior reprovado `refined-action-icons.tsx` excluído da **branch de trabalho**, preservado apenas no histórico Git.
2. Semântica explícita: **Entradas seta vertical para baixo, entrando no caixa; Saídas seta vertical para cima, saindo do caixa**. Com `data-financial-flow="down"/"up"` para teste. Novo identificador de pack `meg-prism-3d` somente nestes cinco, sem substituir categorias, menu ou ícones históricos já homologados.
3. Atualizados `LaunchIcon.tsx`, `LaunchesStage09.tsx` e `launches-stage09.css` somente na tela autenticada de Lançamentos. Tamanho SVG maior dentro de badges da mesma dimensão; botão de olho com tooltip hover/foco, área de toque 44×44 px no celular, nome acessível por linha, mesmo modal read-only. Ajuste de clipping restrito à célula Ações; **DataGrid global não modificado**.
4. Testes `scripts/meg-stage08-lancamentos-icons.browser.mjs` e `scripts/meg-stage09-operational.browser.mjs` atualizados com novo pack, direções e integridade financeira, sem falsas expectativas de Phosphor nos KPIs live. Critérios de futuras telas no documento `docs/MEG-WEB-ICONOGRAFIA-PRISM-20261112.md`, sem aplicar automaticamente a outras telas.

**Publicação QA:** serviço isolado `meg-stage08-icones-pr679`, ID `srv-dbqrr7qfngtc738gae3g`, Auto Deploy **NO**, reimplantado apenas após smoke local do novo pack. Deploy `dep-dbqsf9gn74is73d3vn90` **LIVE** às 14:06:15 UTC de 12/11/2026 no commit `5d296e72922ea25d37aac9df57cac74a51b75374`. **Link sem cache:**
https://meg-stage08-icones-pr679.onrender.com/stage08-funcional-qa.html?v=5d296e72922ea25d37aac9df57cac74a51b75374

**Evidências técnicas:** QA pública [GitHub Actions #43233865891](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43233865891) **SUCCESS**, com navegador real e dados fictícios. A execução anterior do CI integrado chegou aos contratos visuais e falhou por expectativa antiga do pacote Phosphor na tela live; o teste foi corrigido sem alterar UI. [CI integrada #43234013513](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43234013513) e [QA mais recente #43234013218](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43234013218) ambas **COMPLETED/SUCCESS**, SHA `a04c1b819c9148b1931ba527f15cb3faddd886d9`. A primeira confirma build/financeiro, contratos, Home/atalhos, Shell, DataGrid, preview histórico e teste operacional; a segunda confirma QA fictícia e URL pública em 1366/960/390. Entre o deploy `5d296e7` e o HEAD da PR ocorreram apenas alterações em testes, workflow e documentos, sem mudanças no código da UI publicado.

**Estado:** implementação nova publicada apenas em QA, **aprovação visual do usuário pendente**, PR #679 Draft sem merge, e nenhuma mudança financeira/Android/produção. A substituição global de outros pacotes exige aprovação tela por tela. Próximo passo: validar visualmente o novo link, coletar aceite ou rejeição explícitos e somente depois revisar integração sob gates técnicos externos e autorização específica. Relatório detalhado em `docs/MEG-STAGE08-HOME-LAUNCHES-CLOSEOUT-20261112.md`.

## 12/11/2026 — Etapa 08 | Programa MEG Prism 2.0, iconografia global e tipografia

**Pedido e diretriz do usuário:** após aprovar o espírito visual dos novos glifos MEG Prism 3D, solicitou aplicar essa qualidade a todo o sistema Web e melhorar fontes genéricas e excessivamente pequenas. **A diretriz global foi recebida e planejada; a implementação de todas as telas NÃO está concluída nem homologada.** Esta conversa trabalha exclusivamente a **Etapa 08**; etapas futuras terão gates específicos e não devem sofrer edição silenciosa.

**Auditoria técnica:** a Web declara `Inter` em `styles/tokens.css` e `home-dashboard.css`, títulos pontuais `Manrope` e muitos textos com `0.57–0.77rem` (aproximadamente 9–12px com raiz de 16px). Shell, Home e Lançamentos possuem pacotes SVG distintos. Aumentar a fonte indiscriminadamente arriscaria corte de informações em cards, DataGrid, modal e mobile, motivo para testar por tela.

**Direção proposta, ainda não aprovada visualmente:** MEG Prism 2.0, glifos SVG locais arredondados e dimensionais com semântica correta (entradas ↓, saídas ↑), fonte **Sora** para títulos e **Plus Jakarta Sans** para corpo financeiro, números tabulares e escala mais legível. Licenças SIL Open Font License verificadas. **Não incluir fontes externas em produção:** o piloto experimental usa Google Fonts em QA para comparar, o release exigirá auto-hospedagem e avisos de licença.

**Branch/PR isolada:** `stage08/prism-typography-system-pilot-20261112`, [PR #682](https://github.com/MarcosVilalva/MEG-Platform/pull/682) Draft, baseada na `stage08/lancamentos-icons-refinement-20261112` (PR #679). Nenhum merge; PR #677, PR #679 e prévias homologadas preservadas.

**Arquivos implementados SOMENTE no laboratório:** `apps/web/src/meg-web-evolution/stage08-qa/prism-type-pilot.css` (novo); `stage08-qa/bootstrap.ts` (importa tema apenas quando `?visual=prism`), `apps/web/stage08-funcional-qa.html` (CSP somente da QA permite Google Fonts CSS/fontes, mantendo `connect-src 'self'`); `scripts/meg-stage08-prism-typography.browser.mjs` (novo, verifica carregamento real das duas fontes, textos, quatro KPIs, rota Home → Lançamentos, 390/960/1366, ausência de rolagem global e requisição financeira externa); workflows de QA/integração da branch. Nenhum CSS de produção, HomeDashboard, Shell, DataGrid, API, writer financeiro, banco ou Android foi modificado.

**Plano completo e backlog:** `docs/MEG-WEB-IDENTIDADE-PRISM-2-0-PLANO-20261112.md`. Ordem futura: (1) Home + Lançamentos no piloto (Etapa 08); (2) Shell global; (3) DataGrid; (4) Loading/Login/Conta; (5) operações Novo/Editar, Pendentes, Cartões, Benefícios, Transferências; (6) Relatórios/Configurações; (7) tokens/fontes auto-hospedadas e consolidação. Cada etapa requer inspeção visual e regressões funcionais; não alterar telas antes de sua etapa autorizada.

**Testes e publicação:**
- [CI integrada #43243728500](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43243728500) **COMPLETED/SUCCESS** no SHA `d2b45a72c6605467aa7f4377c8433282352b74fd`, incluindo financeiro, contratos, Shell, Home, Lançamentos e QA piloto.
- [QA pública com carregamento real das fontes #43244463748](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43244463748) **COMPLETED/SUCCESS** no SHA `4e0954da2b7f4705060d950f1d63aeb7aab9462a`: ensaio de navegador real nos viewports 390, 960 e 1366, com fontes Sora/Plus Jakarta Sans efetivamente carregadas no site público, preservação de fluxo Home↔Lançamentos e nenhuma chamada à API financeira.
- A CI integrada mais recente [#43244463686](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43244463686) foi verificada como **COMPLETED/SUCCESS** no commit de teste/workflow `4e0954da2b7f4705060d950f1d63aeb7aab9462a`, incluindo build financeiro, contratos, QA autenticação/fluxos, regressões Shell, Home e Lançamentos, comparação visual e gate de arquivos. Os commits documentais posteriores usam `[skip ci]` e não alteram o bundle implantado.
- Serviço Render **exclusivo novo** `meg-stage08-prism-tipografia-pilot`, ID `srv-dbqtbm61egvs7395pugg`, [painel](https://dashboard.render.com/static/srv-dbqtbm61egvs7395pugg), Auto Deploy **OFF**, branch própria, sem API real, sem credenciais. Deploy `dep-dbqtbme1egvs7395pvg0` **LIVE** no commit `d2b45a72c6605467aa7f4377c8433282352b74fd`. **Link sem cache do piloto:**
https://meg-stage08-prism-tipografia-pilot.onrender.com/stage08-funcional-qa.html?visual=prism&v=d2b45a72c6605467aa7f4377c8433282352b74fd
- Para comparação de tipografia SEM piloto no MESMO serviço, abrir a URL da QA sem `visual=prism`; nenhuma das prévias homologadas de outras PRs foi substituída.

**Validações que NÃO existem:** usuário ainda não aprovou visualmente a nova tipografia. O sucesso de testes e o deploy não comprovam acessibilidade em zoom 200%, nem aprovam a implantação transversal, nem autorizam merge. Fontes auto-hospedadas ainda não foram integradas à produção. **Nenhum outro módulo foi convertido a MEG Prism por esta PR.**

**Próximo passo exato:** usuário inspecionar e validar ou rejeitar a proposta tipográfica com a URL sem cache, sobretudo leitura da Home, valores de KPIs, DataGrid, mobile e hierarquia visual. Após aceite, executar o rollout por tela em suas etapas, com gates e homologações independentes. Sem merge ou deploy produtivo sem autorização explícita.

**Rastreabilidade global:** issue [#683](https://github.com/MarcosVilalva/MEG-Platform/issues/683) aberta para executar a iconografia/typografia MEG Prism 2.0 em toda a Web, etapa por etapa, sem reabrir telas homologadas fora da etapa autorizada. Até o momento, **somente o piloto da Etapa 08 foi codificado**; os demais módulos permanecem pendentes, não implementados e não validados.

## 12/11/2026 — Etapa 08 | Aprovação Prism 2.0, correção real das setas e ampliação de ícones PR #684

**Decisão MAIS RECENTE do usuário, prevalece sobre checkpoints anteriores:** a tipografia **Sora nos títulos e Plus Jakarta Sans nos textos** da PR #682 foi expressamente aprovada visualmente. O usuário autorizou expandir a identidade MEG Prism 3D por toda a Web e ressalvou que as setas de Lançamentos continuavam invertidas. **Convenção final do usuário: Entradas = seta verde PARA CIMA (↑); Saídas = seta coral PARA BAIXO (↓)**. Substitui a regra down/up registrada em documentos anteriores. A aprovação visual de fontes não implica aprovação automática dos demais ícones ou telas.

**Escopo efetivamente executado neste chat (somente Etapa 08 e componentes de identidade reutilizáveis):**
- Branch nova `stage08/prism-ui-rollout-and-flow-fix-20261112` a partir da PR #682, [PR #684](https://github.com/MarcosVilalva/MEG-Platform/pull/684) **Draft**, sem merge. A iniciativa para os módulos de outras etapas segue na [issue #683](https://github.com/MarcosVilalva/MEG-Platform/issues/683).
- `launches/icon-packs/meg-prism-icons.tsx`: os dois SVGs foram **realmente invertidos na geometria**, mantendo verde em `entry3d` e coral em `exit3d`. `data-financial-flow` e os testes confirmam `up/down`, incluindo inspeção do `transform` dos paths.
- Novo `components/PrismStrokeIcon.tsx`: renderizador de microícones vetoriais com camada de sombra, gradiente e brilho, IDs gerados por `useId` para evitar colisões. `components/Icon.tsx` (Shell) e `home/HomeGlyph.tsx` (Home) o consomem na QA Prism, preservando nomes e semântica originais. `launches/LaunchIcon.tsx` e `LaunchPaymentBadge.tsx` aplicam acabamento prismático aos símbolos de categorias, controles e formas de pagamento, mantendo rótulos e classificação.
- A nova identidade só é ativada no **site estático de QA com `?visual=prism`**, pelo `stage08-qa/bootstrap.ts`; sem a flag, a renderização histórica é preservada. O CSS experimental em `prism-type-pilot.css` recebeu ajustes apenas para ícones. **Nenhuma alteração nos layouts estruturais HomeDashboard, AppShell, DataGrid ou no CSS base**, e nenhuma execução de operação financeira.
- Testes `scripts/meg-stage08-lancamentos-icons.browser.mjs` e `scripts/meg-stage08-prism-typography.browser.mjs` foram reforçados para a seta visual ↑/↓ e presença real de SVG Prism no Shell, Home, categoria, formas de pagamento e KPI.
- A CI nesta branch distingue serviços históricos: `meg-stage08-funcional-pr677`, `meg-stage08-icones-pr679` e `meg-stage08-prism-tipografia-pilot` permanecem intactos. O teste do novo sentido somente é aplicado à QA nova da PR #684. Gates de `check_blob` e escopo foram preservados com hash autorizado de `LaunchPaymentBadge.tsx`.
- Normas atualizadas em `docs/MEG-WEB-ICONOGRAFIA-PRISM-20261112.md`, `docs/MEG-WEB-IDENTIDADE-PRISM-2-0-PLANO-20261112.md` e na issue #683.

**Build/QA local:** [run #43269232465](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43269232465), **COMPLETED/SUCCESS** no SHA de código `e7b45864662ff35885c4f4e82f058b1f95f3e793`, incluindo Chrome 1366/960/390, fontes carregadas, setas, ícones e ausência de chamadas financeiras reais. A [CI integral #43269232512](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43269232512) estava em andamento no registro; verificar conclusão antes de declarar gate integral verde.

**Render QA nova (sem tocar outras):** serviço `meg-stage08-prism-rollout-pr684`, ID `srv-dbqvdp67bikc73c0adr0`, [dashboard](https://dashboard.render.com/static/srv-dbqvdp67bikc73c0adr0), branch própria, Auto Deploy OFF, sem segredos nem backend real, deploy `dep-dbqvdpe7bikc73c0aeeg` **LIVE** no commit `e7b45864662ff35885c4f4e82f058b1f95f3e793`. Link sem cache:
https://meg-stage08-prism-rollout-pr684.onrender.com/stage08-funcional-qa.html?visual=prism&v=e7b45864662ff35885c4f4e82f058b1f95f3e793

**Pendente:** conclusão do teste externo [#43269772110](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43269772110), revisão visual pelo usuário **dos novos SVGs** e confirmação da correção de setas; zoom 200% e fontes auto-hospedadas antes de release; execução das demais telas em etapas separadas. A aprovação de tipografia da PR #682 já foi concedida, **mas a PR #684 não tem aprovação visual própria**. PRs #677/#679/#682/#684 permanecem Draft e sem merge. Não alterar Android, API, Supabase, produção, banco ou writers. A issue #683 controla adoção nos demais módulos.

**Incidente de publicação externa PR #684 e correção pontual:** o primeiro teste remoto [#43269772110](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43269772110) falhou, enquanto a QA local e a CI integrada passaram, porque o Render não disponibilizou o chunk CSS de carregamento assíncrono: `Unable to preload CSS for /assets/prism-type-pilot-749i2R-g.css`. O app ficava na mensagem inicial. Foi obtido diagnóstico com HTTP 200, corpo HTML e `pageErrors` no [run #43270510592](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43270510592). A correção na branch importa `prism-type-pilot.css?inline` como texto no bundle e insere `<style data-meg-prism-style="inline-qa">`, removendo dependência de chunk CSS e garantindo importação incondicional do `main.tsx`. O navegador agora testa a existência do estilo e o carregamento real das fontes. **Verificar novas CI e deploy antes de declarar resolução externa**. Somente QA foi alterada; fonte externa continua proibida no release sem auto-hospedagem.

## 12/11/2026 — Etapa 08 | Publicação Prism PR #684 corrigida e teste público aprovado

**RESOLUÇÃO verificada do erro de CSS da QA:** o bundle inicial carregava a folha `prism-type-pilot.css` como chunk CSS assíncrono; o Render público não a disponibilizava, provocando `Unable to preload CSS` e impedindo `main.tsx`. A correção `?inline` aplica a folha por `<style data-meg-prism-style="inline-qa">` antes de iniciar o aplicativo, sem CSS dinâmico externo à publicação. O teste de navegador valida ainda que as fontes Sora/Plus Jakarta Sans foram efetivamente carregadas. Essa correção é **exclusiva da QA**, não do ambiente produtivo.

**Render isolado:** serviço `meg-stage08-prism-rollout-pr684`, `srv-dbqvdp67bikc73c0adr0`, Auto Deploy OFF, deploy corretivo `dep-dbqviql6e07s738lvp6g` **LIVE** no SHA `d857fcffb2dd3e98a18c3d349f899b18e5b6f311`. [Painel](https://dashboard.render.com/static/srv-dbqvdp67bikc73c0adr0).

**URL de validação sem cache da nova identidade aprovada em diretriz:**
https://meg-stage08-prism-rollout-pr684.onrender.com/stage08-funcional-qa.html?visual=prism&v=d857fcffb2dd3e98a18c3d349f899b18e5b6f311

**Evidências técnicas independentes:**
- [QA pública #43271603804](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43271603804) **COMPLETED/SUCCESS**, no SHA `c7a0f1c71026d06d4432b25c34bd667123cd25e2`. Executa Chrome sobre o site Render LIVE em 390×844, 960×900 e 1366×768, verifica fontes carregadas, microícones Prism em Home/Shell, ícones e formas de pagamento em Lançamentos, setas Entradas **↑** e Saídas **↓** pelo atributo e geometria dos paths, modal de detalhes, valores canônicos imutáveis, zero APIs financeiras reais e nenhuma rolagem horizontal global.
- [CI financeira e visual #43271074427](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43271074427) **COMPLETED/SUCCESS**, no código com CSS `?inline`. [CI integrada final #43271603753](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43271603753) verificada **COMPLETED/SUCCESS**, incluindo testes financeiros, Shell, Home, DataGrid, Lançamentos, gateway, browser, preservação visual e controle de arquivos autorizados.
- Comparação GitHub entre o commit Render `d857fcf` e o commit de QA pública `c7a0f1c`: **apenas três arquivos de testes/workflow** mudaram, nenhum componente visual ou financeiro após o deploy. Capturas no [artefato da QA pública](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43271603804/artifacts/13967643394).

**Aprovações exatas:** fonte Sora + Plus Jakarta Sans da PR #682 **aprovada visualmente pelo usuário**. Sentido de setas exigido pelo usuário implementado e testado. Aparência integral da nova iconografia Home/Shell/Lançamentos da **PR #684 ainda não foi aprovada por inspeção humana**. Ainda não foi implementado nem homologado o rollout nas outras telas do projeto, a ser feito nas etapas próprias pela [issue #683](https://github.com/MarcosVilalva/MEG-Platform/issues/683). Não declarar a implantação global concluída.

**Preservação:** PRs #677, #679, #682 e #684 continuam Draft, sem merge; sites estáticos antigos e serviço produtivo inalterados. Nenhuma modificação na API financeira, Android, Supabase, banco, escritores financeiros ou dados reais. Fontes ainda são remotas APENAS nesta QA; auto-hospedagem, testes de zoom 200% e aplicação por telas estão pendentes para a liberação futura.

**Próximo passo exato:** usuário inspecionar nova QA pública sem cache, conferir quatro KPIs, setas ↑/↓, ícones de Shell/Home, legibilidade e DataGrid; registrar aceite visual explícito da PR #684. Após aceite, orientar implementação dos módulos restantes por suas etapas, sem merge/deploy produtivo automático.

## 12/11/2026 — Etapa 08 | Triângulo de alerta Prism para vencidos, PR #685

**Origem e aceite exatos:** após inspecionar a prévia da PR #684, o usuário aprovou expressamente a **proposta** de substituir o símbolo vermelho de exclamação circular, pouco legível, por **triângulo vermelho/coral arredondado com exclamação maior**, mantendo o estilo dimensional Prism e preservando os estados amarelo/verde. Autorizou implementação; **não homologou ainda a nova execução visual**.

**Branch isolada e PR:** `stage08/overdue-prism-warning-20261112`, PR [#685](https://github.com/MarcosVilalva/MEG-Platform/pull/685) Draft, base `stage08/prism-ui-rollout-and-flow-fix-20261112` (PR #684). Nenhum merge e nenhuma mudança nas demais branches/serviços.

**Código:** novo `apps/web/src/meg-web-evolution/home/HomeOverdueWarningIcon.tsx`, SVG Prism de 32 unidades, triângulo arredondado em gradiente coral/vermelho, contraste elevado no ponto de exclamação, reflexo discreto e ID de gradiente exclusivo via React `useId`. Apenas `home/HomeDueAlerts.tsx` foi editado para usar o novo símbolo **quando `dueState='overdue'`**, nos itens do modal e do painel do sino. O emblema do modal usa o triângulo se houver vencidos; sem vencidos usa o relógio amarelo já existente. Ícones verdes e o relógio de `due_today` não foram modificados. Sem alteração de CSS global, layout, DataGrid, classes financeiras, valor, status, datas, seleção, horários ou remissão de alertas.

**Teste novo:** `scripts/meg-stage08-overdue-prism.browser.mjs`, rodando Chrome em 390, 960 e 1366 px, valida triângulo em todos os vencidos (modal e sino), presença de gradiente e exclamação legível, IDs SVG únicos, preservação do relógio amarelo, etiquetas de status, zero overflow horizontal, zero erros JS e zero requisições financeiras reais. Workflows ampliados sem relaxar hashes dos componentes homologados.

**QA isolada Render:** serviço `meg-stage08-alerta-prism-pr685`, ID `srv-dbr00b56e07s738n62n0`, [painel](https://dashboard.render.com/static/srv-dbr00b56e07s738n62n0), Auto Deploy OFF, branch exclusiva, nenhum segredo ou API real. Deploy `dep-dbr00bd6e07s738n63a0` **LIVE** no commit de código `0151bb45e5e805821cfafe3f53ed893a4008aa84`. Link sem cache para validação visual:
https://meg-stage08-alerta-prism-pr685.onrender.com/stage08-funcional-qa.html?visual=prism&v=0151bb45e5e805821cfafe3f53ed893a4008aa84

**Gates comprovados:** QA local [#43276059943](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43276059943) **COMPLETED/SUCCESS** no SHA do deploy; CI integral [#43276059885](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43276059885) **COMPLETED/SUCCESS**, inclusive contratos, testes financeiros, Home, Shell, DataGrid, navegador e proteção de arquivos; QA pública definitiva [#43277122075](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43277122075) **COMPLETED/SUCCESS**, Chrome real no domínio Render, 390/960/1366, triângulos, sino, relógio e zero chamadas financeiras. Capturas: [artefato #13971102051](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43277122075/artifacts/13971102051), expira em 26/11/2026. A primeira tentativa pública [#43276519337](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43276519337) **FALHOU** por timeout aguardando o modal; a segunda passou sem alteração na aplicação, após instrumentação apenas do teste. A causa do timeout inicial **não foi comprovada**, não presumir correção de bug de UI inexistente. CI integrada adicional [#43277122255](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43277122255) **COMPLETED/SUCCESS**, cobrindo novamente compilação, contratos, testes financeiros, autenticação/QA, Home, Shell, Lançamentos e gate de escopo. Todos os gates técnicos necessários para a QA da PR #685 foram verificados como verdes; homologação visual humana permanece pendente. Commits posteriores ao SHA Render alteraram somente testes, workflow e checkpoint, sem mudar UI publicada.

**Status:** proposta visual do símbolo autorizada; código e QA local aprovados, deploy QA LIVE; **inspeção visual humana do triângulo ainda pendente**, bem como gates técnicos que ainda estiverem em andamento. Nenhum merge, alteração do Android, API, Supabase, produção, escritores financeiros, banco ou das prévias homologadas. O Render tinha 24 serviços antes da criação desta QA; novo serviço ocupou a vaga restante, não excluir ou substituir serviços sem decisão específica.

**Próximo passo exato:** usuário abrir URL LIVE sem cache e aprovar/reprovar visualmente o novo triângulo vermelho, conferindo emblema, itens e sino contra o relógio amarelo inalterado. Somente após autorização específica considerar incorporação na base #684, nunca em produção automaticamente.


## 12/11/2026 — Etapa 08 | Iconografia Prism no DataGrid de Próximos compromissos

**Origem:** usuário apontou no print que as linhas vencidas da tabela "Próximos compromissos" ainda tinham o círculo de alerta antigo. Inspeção do código confirmou que `HomeDashboard.tsx` usava `HomeGlyph name='siren'`, enquanto modal e sino já usavam o triângulo Prism da PR #685.

**Branch isolada:** `stage08/commitments-grid-prism-icons-20261112`, derivada de `stage08/overdue-prism-warning-20261112` (PR #685), sem tocar nos serviços publicados.

**Alteração mínima:** `apps/web/src/meg-web-evolution/home/HomeDashboard.tsx` importa e reutiliza `HomeOverdueWarningIcon` somente quando `dueState='overdue'` no DataGrid compacto, sem alterar datas, valores, contratos, critérios de urgência, layout ou cálculos financeiros. `due_today` preserva `timer`, e `upcoming` preserva `checkCircle`. O componente do triângulo não foi duplicado ou redesenhado.

**Regressão adicionada:** `scripts/meg-stage08-overdue-prism.browser.mjs` verifica no DataGrid a presença de triângulo em todos os vencidos, ausência da sirene anterior, relógio intacto para vencimento hoje e existência das datas. Testes ainda dependem de execução e confirmação de CI; não registrar como aprovados previamente.

**Aprovação:** proposta do ícone Prism e direção visual geral aprovadas; **este código ainda não foi homologado visualmente em preview próprio**. Não confundir aprovação do conceito com validação da versão publicada.

**Restrições:** não modificar Android, API, Supabase, banco, writers, produção, PRs anteriores ou previews homologados. Sem merge/deploy produtivo.

**Próximo passo:** executar CI e QA com fixture fictício, disponibilizar preview isolado sem cache somente quando houver capacidade/condições seguras, pedir homologação visual do DataGrid e então preparar integração sequencial na cadeia Prism mediante autorização.


### 12/11/2026 — Retomada da publicação PR #686, verificação de infraestrutura

- Workspace Render confirmado pelo usuário: `My Workspace` (`tea-d98k1qhkh4rs73f4sfj0`). A permissão prévia para previews isolados foi reiterada; não pedir autorização repetidamente para o mesmo tipo de QA.
- Inventário ao vivo: **25/25 serviços** no Render. A PR #685 ocupa `meg-stage08-alerta-prism-pr685`; outras QA e a API principal também existem. **Nenhum serviço foi eliminado ou modificado** e não há vaga para criar outra QA isolada sem limpeza expressamente autorizada.
- GitHub no SHA `0b841d3a809db73e5c3b4f5ee3e1af65afb8e149`: consulta de runs e status retornou listas vazias. Isso não comprova aprovação da CI; testes adicionados ainda **não foram executados e confirmados**.
- Git CLI no ambiente disponível não conseguiu resolver `github.com`; não foi possível executar build ou Playwright local por clone.
- A conexão Vercel retornou 403 no escopo `mvilalva87-3474` (time `team_q1mXZVqUpp2VJ8dzyXWd99ZL`), portanto não há permissão funcional para publicar preview por ela nesta sessão. Não usar outro escopo por suposição.
- **Bloqueio atual:** distribuição da QA #686 e teste externo pendentes. Não confundir prévia #685 com código #686. Não criar serviços acima da quota, não reutilizar homologados, não excluir recursos, nem efetuar merge/deploy produtivo.
- **Próximo passo:** obter capacidade segura no Render sem exclusões automáticas, ou autorização de escopo na Vercel; então publicar QA com dados fictícios, executar regressão em 390/960/1366, apresentar URL sem cache para homologação explícita.


## 12/11/2026 — Etapa 08 | Política de QA reutilizável e consolidação da iconografia Prism

**Decisão operacional autorizada:** deixar de criar um novo serviço Render por PR ou ajuste visual. Usar uma QA rotativa isolada para a Etapa 08, preservando por SHA a versão homologada, mantendo a QA de integração Home + Lançamentos separadamente protegida. Dados fictícios, sem conexão com API/banco real. Testes e CI não substituem homologação humana. Etapa 10 segue independente até a futura integração autorizada, com regressão financeira antes de mesclar qualquer código.

**Serviço consolidado de QA Etapa 08:** `meg-stage08-alerta-prism-pr685` (ID `srv-dbr00b56e07s738n62n0`), reutilizado sem criar outra hospedagem. Auto Deploy **OFF**, branch `stage08/overdue-prism-warning-20261112` avançada por fast-forward seguro de `50cd18bb1ebca7f873a1676bab10bd2d07ca9fd8` a `90777706e9ab87d8b1c5713776f9b825cbe3c510`, trazendo **somente** ajuste da tabela Próximos compromissos, teste correspondente e atualização documental da PR #686. Não houve merge para main ou produção. Os commits prévios permanecem no GitHub.

**Deploy QA:** `dep-dbr2gk6k1f9s73dpabl0`, Render **LIVE** no commit `90777706e9ab87d8b1c5713776f9b825cbe3c510`. URL com cache-busting: https://meg-stage08-alerta-prism-pr685.onrender.com/stage08-funcional-qa.html?visual=prism&v=90777706e9ab87d8b1c5713776f9b825cbe3c510 . O Render confirma deploy; inspeção funcional externa da página e CI no último commit **ainda não foram comprovadas**. NÃO registrar aprovação visual automática da tabela.

**Infraestrutura:** inventário Render de 12/11 apontou **25 serviços** e nenhuma vaga; atualização acima reutilizou o serviço existente, mantendo 25. Nunca criar QA nova automaticamente em etapa ou PR.

**Remoção somente após conferência de vínculos e autorização de exclusão:**
- **Primeiros candidatos históricos:** `meg-pr648-visual-preview` (`srv-dbgh9dui0phs73aloha0`) e `meg-home-06-refino-pr655` (`srv-dblfrddbedkc73ah970g`), sem consumo mensurado de banda no período consultado.
- **Candidatos da própria Etapa 08, APÓS homologação da QA consolidada e auditoria de dependências:** `meg-stage08-funcional-pr677`, `meg-stage08-icones-pr679`, `meg-stage08-prism-tipografia-pilot`, `meg-stage08-prism-rollout-pr684`; `meg-prism-designsystem-qa` só após confirmar que não serve a outra validação do design system.
- **Outros a avaliar posteriormente:** `meg-web-evolution-preview` e serviços Phoenix legados. Tráfego baixo ou zero não prova ausência de dependência.
- **PROTEGIDOS:** `meg-platform-api`, `meg-evolution-api` até descarte de dependências, `meg-stage09-home-launches-qa` (preview homologado), QA da Etapa 10 PR #678 e demais ambientes cuja dependência não foi auditada.
**Nenhuma exclusão foi executada**.

**Próximo passo:** obter CI e QA externa da nova branch; usuário inspecionar a URL sem cache e homologar explicitamente o DataGrid e conjunto Prism; preparar pacote de integração para o chat 10 com SHA, arquivos protegidos, dependências, status de gates e restrições, sem merge/deploy produtivo.


## 12/11/2026 — Integração isolada solicitada para transição ao chat 10 | MEG Prism 2.0

### (1) Tema, objetivo, etapa
O usuário aprovou explicitamente a prévia Prism 2.0 consolidada da Etapa 08 e autorizou reunir em uma QA única Loading inicial, Login, Criar Conta, Recuperar Senha, Loading após login demonstrativo, Home, Lançamentos, Novo Lançamento e modal/formulário de Nova Despesa. Esta é **uma integração visual e de navegação para QA**, não integração de escritores financeiros nem fechamento da Etapa 10.

### (2) Decisões e regras confirmadas
- Prioridade: regras financeiras do repositório > prints oficiais > Prompt Master.
- MEG Prism 2.0 aprovado como direção visual para todo o produto, incluindo tipografia Sora + Plus Jakarta Sans e ícones semânticos, com ajustes futuros por tela.
- O mesmo serviço Render de QA deve ser reutilizado; **não criar serviço novo a cada ajuste**.
- Homologação visual é humana e específica de cada versão, não consequência de build verde.
- Tudo nesta QA usa dados fictícios; **não aceitar credenciais verdadeiras nem fazer gravações**.
- Preservar Home, Shell, DataGrid, Lançamentos, regras de parcelas, status, benefícios e autocomplete; não modificar writers para atender aparência.
- A Etapa 10 continua no chat próprio, suas branches e seus serviços não foram modificados nesta junção.

### (3) Trabalho executado
- Branch `stage08/unified-qa-stage05-08-10-20261112`, PR #688 Draft, derivada da cadeia Prism QA em `stage08/overdue-prism-warning-20261112`.
- Cinco arquivos da PR #678 (ExpenseForm.tsx, ExpenseForm.css, autocomplete-history.ts, brl-money-mask.ts, text-entry-policy.ts) foram importados **sem alteração** para `apps/web/src/meg-web-evolution/stage10/`; nenhuma alteração na PR #678.
- Nova entrada isolada `apps/web/meg-unificado-qa.html`, `integrated-qa/unified-preview.tsx`, `integrated-qa/unified-qa.css`; entrada antiga da QA Prism preservada.
- O Vite de QA passou a compilar duas entradas estáticas no **mesmo build** e serviço.
- Navegação de demonstração: Loading -> Login -> Loading após botão de demonstração -> Home -> Lançamentos -> seletor de tipo -> Nova Despesa; Cadastro e Recuperar Senha acessíveis pelo Login. Formulário financeiro com `saveEnabled=false`.
- Prism visual ativado na QA: tipografia e ícones compartilhados, incluindo triângulo de compromisso vencido na Home, sino e tabela; telas históricas de autenticação não tiveram seu JSX/CSS base reescritos.
- Render reutilizado: `meg-stage08-alerta-prism-pr685` (`srv-dbr00b56e07s738n62n0`), Auto Deploy OFF, sem novo serviço. Branch de hospedagem `stage08/overdue-prism-warning-20261112` avançada apenas por fast-forward para código testado `2f71aae9661eddbaefe5fca00c88f809a3df264e` (o avanço altera o HEAD da PR #685 sem merge).
- Deploy manual QA `dep-dbr32qe7bikc73fn69ng` confirmado **LIVE**, código SHA `2f71aae9661eddbaefe5fca00c88f809a3df264e`.
- URL sem cache: https://meg-stage08-alerta-prism-pr685.onrender.com/meg-unificado-qa.html?visual=prism&v=2f71aae9661eddbaefe5fca00c88f809a3df264e

### (4) Testes comprovados
- CI/build + Chrome local em 390 x 844, 960 x 900 e 1366 x 768: [run #43311594688](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43311594688) **completed/success** no SHA `2f71aae`. Testa entrada estática, Login demonstrativo, Loading pós-login, Home, Lançamentos, seletor Novo, formulário Nova Despesa, Cadastro, Recuperação, Loading inicial, ausência de APIs reais e de rolagem horizontal global.
- Run #43310871993 falhou por teste clicando sidebar fechada em mobile; run #43311276180 falhou porque o modal de alertas já aprovado interceptava a navegação. Teste corrigido para abrir menu e reconhecer/fechar o modal; **nenhum código visual alterado para acomodar o teste**.
- Render confirmou deploy LIVE. Teste público de navegador em domínio Render [#43312319058](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43312319058) **completed/success** no checkpoint documental `44224566`, com o mesmo código visual já publicado em `2f71aae`. CI repetida [#43312318950](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43312318950) **completed/success**, alterações posteriores ao deploy somente documentação e workflow externo.

### (5) Aprovações e não validados
- Usuário homologou explicitamente **MEG Prism 2.0 | Ambiente de QA consolidado**, anterior a esta integração.
- A nova integração multi-telas `meg-unificado-qa.html` **ainda precisa de aprovação visual explícita** após inspeção. O sucesso da automação não a homologa.
- A Nova Despesa da PR #678 é uma demonstração visual com gravação bloqueada. Não presumir aprovações de funcionalidade real, Receita, Editar, cartão, transferência, beneficio ou writers.

### (6) Riscos e pendências
- Navegador externo Render conferido e aprovado tecnicamente; inspeção visual humana ainda pendente.
- Conferir fidelidade Prism individualmente em Loading, Login, Cadastro, Recuperação, Loading pós-login, Home, Lançamentos, escolha do tipo e Nova Despesa. O CSS Prism foi aplicado na QA sem revalidar pixel a pixel as telas de autenticação.
- Operações reais bloqueadas; integração de autenticação e escritores depende da autoridade financeira, validação isolada e gates próprios.
- A home fixture é fictícia; período/resumos não representam dados reais.
- A QA unificada não constitui produção nem merge.
- Serviços antigos só podem ser excluídos após auditoria de dependências e autorização própria; não foi excluído nenhum.

### (7) Arquivos, links e fontes
- Nova entrada: `apps/web/meg-unificado-qa.html`.
- Navegação: `apps/web/src/meg-web-evolution/integrated-qa/unified-preview.tsx`.
- Estilo QA: `apps/web/src/meg-web-evolution/integrated-qa/unified-qa.css`.
- Formulário e suporte: `apps/web/src/meg-web-evolution/stage10/` (cinco arquivos).
- Build: `apps/web/vite.stage08-funcional-qa.config.ts`.
- Teste e gate: `scripts/meg-stage08-unified-qa.browser.mjs`, `.github/workflows/meg-stage08-unified-qa.yml`.
- PR #688: https://github.com/MarcosVilalva/MEG-Platform/pull/688
- Referência Prism anterior: SHA `90777706e9ab87d8b1c5713776f9b825cbe3c510`; este commit preserva a versão anterior, embora não mais publicada na URL rotativa.
- Issues e PRs de origem: #683, #684, #685, #686, #678, #675; nenhuma delas foi mesclada em `main` por esta operação.

### (8) Repositório e refs
`MarcosVilalva/MEG-Platform`; branch de integração `stage08/unified-qa-stage05-08-10-20261112`; PR #688 Draft contra baseline independente `stage08/prism-approved-baseline-20261112` (`a968c52`).. Código QA testado e publicado `2f71aae9661eddbaefe5fca00c88f809a3df264e`; branch rotativa do Render agora aponta ao mesmo SHA. Não houve alteração no Android, API de produção, Supabase, banco, Render da Etapa 10, nem merge para main.

### (9) Restrições
Sem merge, deploy produtivo, real writer, credencial real, SQL, migrations, alteração do Android, exclusão de Render, mutação em produção ou edição da branch da Etapa 10. Não mover telas homologadas para release sem regressão financeira e nova homologação visual da integração.

### (10) Próximo passo exato para o chat 10
1. Abrir a URL QA unificada sem cache e inspecionar todas as telas em desktop e celular; registrar aprovação visual explícita por tela e do percurso.
2. Preservar as evidências do Chrome público #43312319058 e o SHA de código publicado (2f71aae) ao iniciar integração funcional.
3. No **chat 10**, ler este checkpoint, a autoridade financeira canônica, docs da PR #678 e revisão #675; comparar a implementação isolada da Nova Despesa com a integração `PR #687` e decidir tecnicamente como incorporá-la, preservando código Prism e regras financeiras.
4. Continuar Novo/Editar pela ordem autorizada, sem transformar a QA demonstrativa em writer de produção.
5. Preparar lista final de serviços Render candidatos à exclusão apenas após homologação e auditoria de vínculos, sem eliminar a referência histórica de forma prematura.

**Texto de retomada para copiar:** "Continuar MEG Finanças Web Evolution no chat 10 a partir do checkpoint de integração de 12/11/2026, branch stage08/unified-qa-stage05-08-10-20261112, PR #688 Draft, SHA de código 2f71aae9661eddbaefe5fca00c88f809a3df264e. Conferir QA unificada no Render, aprovações visuais e CI externa. Integrar somente os contratos autorizados da Etapa 10, preservando Home, Shell, Lançamentos, DataGrid, MEG Prism 2.0 e regras financeiras. Não fazer merge/deploy produtivo nem alterar Android/API/banco." 


### Correção do controle de PRs e do registro final
- **PR #687** foi marcada pelo GitHub como `merged=true` em 12/11/2026 21:36 UTC, porque a branch-base rotativa de Render (`stage08/overdue-prism-warning-20261112`) foi avançada por fast-forward ao mesmo SHA da integração. Isso representa incorporação **na branch isolada de QA**, **não em `main`** nem publicação produtiva. A ação desviou do controle ideal de revisão PR e não deve ser repetida.
- Baseline Prism estável criado sem hospedagem adicional: `stage08/prism-approved-baseline-20261112`, SHA `a968c52fc7482f1e65d7cd1f3c2269be277b7235`.
- **PR substituta de revisão #688 Draft**, cabeça `stage08/unified-qa-stage05-08-10-20261112`, base baseline Prism estável, **sem merge**. https://github.com/MarcosVilalva/MEG-Platform/pull/688 .
- Para futuras QA rotativas, **não avançar uma branch que é base de PR ativa**, pois o GitHub pode marcá-la como integrada automaticamente. Preferir branch de QA dedicada, desvinculada de revisões, quando houver meio autorizado de reconfigurar o serviço de hospedagem.
- Run local [#43312318950](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43312318950): **SUCCESS** no commit documental `44224566`. Run de verificação pública [#43312319058](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43312319058): **SUCCESS** no Chrome via Render, 390/960/1366 px. A QA permanece não homologada visualmente pelo usuário.


## Etapa 10 — Homologação Nova Despesa e reconciliação com QA unificada (12/11/2026)

- **Usuário homologou explicitamente a Nova Despesa isolada** no chat da Etapa 10: “PRONTO É ISSO ESTA VALIDADO A TELA DE NOVA DESPESA”. Versão do código homologado na PR #678: `32a21b9d544cfaa693b0d33254539f1293d66de9`; preview QA isolado: https://meg-stage10-nova-despesa-qa-pr678.onrender.com/?v=32a21b9d544cfaa693b0d33254539f1293d66de9 . A homologação visual **NÃO** libera escritores financeiros.
- **Integração na PR #688 Draft:** atualizados somente `stage10/ExpenseForm.tsx` e `ExpenseForm.css` pelo conteúdo idêntico ao homologado em #678. Os três módulos de suporte `autocomplete-history.ts`, `brl-money-mask.ts`, `text-entry-policy.ts` foram conferidos por blob SHA e já eram idênticos. O percurso multi-telas da QA utiliza somente dados fictícios, não faz API real e mantém `saveEnabled=false`.
- **MEG Prism 2.0:** usuário reiterou aplicação global, **mantendo todas as telas homologadas**. A issue #683 estabelece expansão módulo por módulo e gates próprios. Este chat continua restrito à Etapa 10 e à integração QA da Nova Despesa, sem reescrever Home, Lançamentos, Shell, DataGrid, Loading, Login, Cadastro ou Recuperação. Homologação visual das telas individuais e da integração continua separada.
- **Render QA rotativa:** em 12/11 o workspace `tea-d98k1qhkh4rs73f4sfj0` tinha **25 serviços**; não criar novos. O serviço de QA unificada existente é `meg-stage08-alerta-prism-pr685` (`srv-dbr00b56e07s738n62n0`), Auto Deploy OFF. Outras QAs permanecem protegidas até auditoria de dependências e autorização de descarte; não eliminar nem sobrescrever ambientes homologados.
- **Cuidado com branches:** #687 foi fechada automaticamente ao avançar branch que era sua base. A PR #688 utiliza base estável `stage08/prism-approved-baseline-20261112`; proteger seu estado Draft e evitar transformar mudanças de QA em merge automático.
- **Gates pendentes deste registro:** QA integrada atualizada exige testes locais e públicos da **mesma revisão** e posterior homologação visual humana; não equiparar QA anterior em Render a esta nova revisão. Os resultados CI posteriores a este registro devem ser anexados com SHA e URL. Ainda não habilitar writes, não alterar Android/API/banco/produção e não efetuar merge.


## Etapa 10 — QA unificada atualizada e verificada publicamente (12/11/2026)

- **Aceite visual registrado:** versão Nova Despesa isolada `32a21b9d544cfaa693b0d33254539f1293d66de9` aprovada explicitamente pelo usuário. A versão visual em QA unificada recebeu exatamente os blobs `ExpenseForm.tsx` `84c02802b4bbebb4310e45cf9ee3dcc7437a33ba` e `ExpenseForm.css` `9e52da981c03b1258cc30190a1277462fb73e17b`, sem reescrever componentes homologados de outras etapas. Os três arquivos auxiliares da Etapa 10 já tinham blobs idênticos nos dois ramos.
- **Código da QA integrada:** `762555dc7c472ff520db14ce6fdf27a40ca29ec3`, PR #688 **Draft**, base estável `stage08/prism-approved-baseline-20261112`. O teste de Chrome integra máscara brasileira DD/MM/AAAA, dia/mês+Tab, ícone de calendário, Observações à esquerda e preservação do texto ao alternar modalidade; mantém dados sintéticos, Salvar desativado, bloqueio de chamadas financeiras e telas de acesso/Home/Lançamentos existentes.
- **CI com prova:** [workflow integrado #43315660683](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43315660683) **completed/success**, [Chrome público #43315660863](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43315660863) **completed/success**. Ambas as execuções sobre alteração somente de workflow `58d08478a2bc8df6e6d8ef66b7060acb8d58c8af`, com o mesmo código de UI LIVE. A primeira execução de teste adicionado falhou por seletor genérico “Crédito” também coincidir com uma linha de Lançamentos; seletor foi escopado ao diálogo da Nova Despesa, e CI posterior passou. Não houve correção cosmética simulando aprovação.
- **QA rotativa reutilizada:** Render `meg-stage08-alerta-prism-pr685` (`srv-dbr00b56e07s738n62n0`), Auto Deploy OFF. Fast-forward **não forçado** da branch de hospedagem `stage08/overdue-prism-warning-20261112` de `2f71aae9661eddbaefe5fca00c88f809a3df264e` para `762555dc7c472ff520db14ce6fdf27a40ca29ec3`, após confirmação de que nenhuma PR aberta usa esta branch como base. PR #688 permanece independente e Draft. Deploy manual `dep-dbr3cgo8v5cc738rbhhg` **LIVE** em 12/11/2026 21:58:08 UTC. URL sem cache: https://meg-stage08-alerta-prism-pr685.onrender.com/meg-unificado-qa.html?visual=prism&v=762555dc7c472ff520db14ce6fdf27a40ca29ec3 . Smoke público pelo GitHub Actions confirma acesso funcional ao domínio e fluxo.
- **Inventário Render:** 25 serviços no workspace `tea-d98k1qhkh4rs73f4sfj0`. Nenhum serviço criado ou excluído, nenhuma API, banco, writer, Android ou produção alterados. A consolidação reduz a criação futura, mas ainda **não reduziu o estoque dos serviços históricos**. Não apagar sem auditoria de dependências e autorização específica.
- **Homologação do conjunto ainda pendente:** o usuário validou Nova Despesa isolada, não o percurso Loading, Login, Cadastro, Recuperação, Home, Lançamentos, seletor e Nova Despesa reunidos no mesmo tema Prism 2.0. A questão global #683 mantém rollout de Prism por etapa e aprovação humana individual, sem declarar todas as telas do produto concluídas.
- **Próximo passo autorizado:** solicitar inspeção visual da QA unificada sem cache e eventuais ajustes exclusivamente na Etapa 10; após aceite, auditar contratos de Editar/Nova Receita e escritores em PostgreSQL descartável antes de qualquer integração real. Preservar todos os recursos e PRs protegidos, PR #678 e #675 abertos Draft, sem merge/deploy produtivo.


## Etapa 10 — Seletor Novo Lançamento com MEG Prism 2.0 (12/11/2026)

- **Aprovação preservada:** o usuário enviou prints e afirmou explicitamente que as **demais telas estão validadas**; neste turno os prints mostravam Login, Recuperar Senha e Criar Conta. Nenhum JSX/CSS desses módulos foi alterado. Home, Lançamentos, Shell, DataGrid e Nova Despesa seguem protegidos pelas aprovações já registradas.
- **Pedido autorizado:** melhorar exclusivamente a tela de escolha do tipo de Novo Lançamento, que ainda destoa do MEG Prism 2.0. Original `launches/LaunchTypePicker.tsx` e `launches/launch-type-picker.css` preservados sem edição; a nova aparência foi criada de forma isolada, sem empilhar mudanças no componente legado.
- **Arquivos novos:** `apps/web/src/meg-web-evolution/integrated-qa/PrismLaunchChoice.tsx` e `prism-launch-choice.css`. O novo seletor usa ícones locais `LaunchIcon` (`exit3d` coral para Despesa, `entry3d` verde para Receita, `projection3d` e `wallet3d`), as quatro opções originais, fotografias decorativas oficiais `/meg-assets/`, Sora + Plus Jakarta Sans, controles acessíveis. Transferência e Benefício continuam desabilitados; nenhuma operação financeira liberada.
- **Integração restrita QA:** `integrated-qa/unified-preview.tsx` usa exclusivamente o novo seletor Prism na QA unificada e permite acesso direto para inspeção por `?tela=lancamentos&modal=novo`. Não altera autenticação real, Home, Lançamentos, Shell ou Nova Despesa.
- **Testes:** `scripts/meg-stage08-unified-qa.browser.mjs` ampliado para 390×844, 640×900, 960×900, 1024×768 e 1366×768, com verificação dos quatro cards, ícones entrada/saída, estados indisponíveis, geometria sem corte/overflow, navegação para Nova Despesa e link direto QA. CI integrada [#43317891308](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43317891308) `completed/success` no código `8b630fe088ebefd3546bb69159389988fb85596d`.
- **Publicação rotativa segura:** serviço Render existente `meg-stage08-alerta-prism-pr685` (`srv-dbr00b56e07s738n62n0`), Auto Deploy OFF, sem novo serviço. Após verificar que nenhuma PR aberta usava como base a branch de hospedagem, realizado fast-forward não forçado com lease até `8b630fe088ebefd3546bb69159389988fb85596d`. Deploy manual `dep-dbr3l749v7es73ekklm0` confirmado `LIVE` em 12/11/2026 às 22:16:43 UTC, SHA exatamente correspondente.
- **Prévia direta sem cache:** https://meg-stage08-alerta-prism-pr685.onrender.com/meg-unificado-qa.html?visual=prism&tela=lancamentos&modal=novo&v=8b630fe088ebefd3546bb69159389988fb85596d
- **Teste público comprovado:** a primeira tentativa [#43317891439](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43317891439) reprovou porque acessou o código anterior publicado antes do deploy. Após a versão Prism passar a LIVE no Render, a tentativa 2 do mesmo workflow foi **completed/success**, no job `public-browser` de ID `131532477983`, navegando pelo domínio público com Chrome. A falha inicial foi resolvida pela publicação correspondente, sem alterações artificiais nos testes.
- **Homologação pendente:** o novo seletor Prism é **candidato visual** e requer aprovação explícita do usuário. O aceite das outras telas não homologa esta revisão. Não fazer merge, deploy produtivo, writer, API, banco, Android, exclusão de serviços Render ou mudanças em telas homologadas.
- **Próximo passo exato:** conferir a nova execução de Chrome público sobre a versão LIVE, registrar resultado e pedir validação visual do seletor. Depois prosseguir com os contratos de Editar Lançamento na Etapa 10.


## Etapa 10 — Reversão do seletor fotográfico e ícones Prism 2.0 (12/11/2026)

- **Decisão expressa do usuário:** voltar EXATAMENTE à composição fotográfica do seletor `Novo Lançamento` que havia sido aprovada, alterando apenas ícones/SVGs (incluindo Fechar, ações, etiquetas e Voltar) para MEG Prism 2.0. **Regra vinculante:** não modificar layout, tamanho de cards, hierarquia, proporções, imagens, textos nem componentes visuais de telas homologadas sem consulta e aprovação explícita ANTES de implementar. O usuário pediu avaliação crítica, não concordância automática.
- **Reversão efetivamente implementada na PR #688 Draft**, branch `stage08/unified-qa-stage05-08-10-20261112`, código `e71400e7e85cd628509a48b5a08446145e2ed433`. Arquivos: `apps/web/src/meg-web-evolution/integrated-qa/PrismLaunchChoice.tsx` recriado com markup/classes/conteúdo da versão fotográfica original `launches/LaunchTypePicker.tsx` e somente os SVGs reestilizados com gradientes Prism de IDs únicos; `integrated-qa/unified-preview.tsx` atualiza apenas SVG do botão Fechar; `integrated-qa/unified-qa.css` acrescenta regras escopadas de dimensões/acabamento dos SVGs, sem alterar grids/cards/fotografias; `scripts/meg-stage08-unified-qa.browser.mjs` passa a exigir 4 opções originais, hero fotográfico, imagens, faixa de 3 recursos, botões, ícones Prism e layout em 390/640/960/1024/1366. O JSX/CSS homologado original `launches/LaunchTypePicker.tsx` e `launches/launch-type-picker.css` permanecem intactos. `stage10/ExpenseForm.tsx` e `ExpenseForm.css` homologados não foram tocados. Outras telas e fluxos mantidos.
- **Arquivo inativo:** `integrated-qa/prism-launch-choice.css` do conceito 2x2 anterior não é mais importado por nenhum dos componentes alterados; não integra visual da versão publicada. Remoção limpa poderá ser feita em futura janela de manutenção controlada, sem alteração de funcionalidade.
- **Gates aprovados:** CI integrada local [#43328133387](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43328133387) `completed/success`. Teste Chrome público [#43328133449](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43328133449): tentativa inicial falhou somente porque Render ainda apresentava a versão 2x2 anterior; após atualização, a repetição (job `131567421002`) terminou `completed/success`.
- **Render QA rotativa reutilizada SEM novos serviços:** `meg-stage08-alerta-prism-pr685`, ID `srv-dbr00b56e07s738n62n0`, workspace `tea-d98k1qhkh4rs73f4sfj0`, Auto Deploy OFF; branch da hospedagem avançada por fast-forward não forçado com lease após verificar ausência de PRs dependentes. Deploy manual com cache limpo `dep-dbr4kulbedkc73cgogdg` confirmado LIVE em 12/11/2026 23:24:20 UTC no mesmo commit de código `e71400e7e85cd628509a48b5a08446145e2ed433`. URL direta cache-busted: https://meg-stage08-alerta-prism-pr685.onrender.com/meg-unificado-qa.html?visual=prism&tela=lancamentos&modal=novo&v=e71400e7e85cd628509a48b5a08446145e2ed433 .
- **Aprovações:** usuário havia aprovado composição fotográfica original, telas de Login/Cadastro/Recuperar Senha e a versão isolada da Nova Despesa `32a21b9d...`. O **acabamento novo dos SVGs desta reversão ainda NÃO recebeu homologação visual humana**, apenas gates técnicos verdes. Nenhuma gravação financeira, merge, deploy produtivo, API, banco, Android ou serviço Render adicional.
- **Plano de ícones de autenticação, SEM implementação nesta rodada:** análise somente leitura mostrou que `auth/LoginScreen.tsx` exporta `LoginIcon` (shield, mail, lock, eye, eye-off, arrow, bars, target, sliders) e `auth/AuthScreenLayout.tsx` o reutiliza em Criar Conta/Recuperar Senha. Próxima frente visual, sujeita a autorização específica da etapa correspondente: biblioteca de SVGs MEG Prism 2.0 compartilhada, mesmo `viewBox`/dimensões/acessibilidade e sem alteração de layout, textos, fluxos de autenticação, imagens, campos, alinhamento ou hierarquia. Testar foco, teclado, olho da senha, ícones do cabeçalho, e-mail, cadeado, CTA e rodapé, responsividade e preview isolado antes de solicitar aprovações visuais individuais.
- **Próximo passo exato:** usuário avaliar ícones restaurados no seletor fotográfico QA. Após aprovação, registrar aceite. Etapa 10 continua com Editar Lançamento e seus contratos financeiros, sem writer real até gates transacionais. Aplicação de ícones de acesso é plano futuro, não autorização para reabrir telas da Etapa 05 silenciosamente.


## Etapa 10 — Recorte de imagens e trilha útil no seletor fotográfico (12/11/2026)

- **Pedido atual explicitamente autorizado:** usuário destacou na captura `image(20261112-232813).png` a moldura interna das artes WebP e a faixa inferior do seletor fotográfico com propagandas técnicas. Pediu corrigir o encaixe das imagens dentro dos contornos e substituir a faixa com uma solução funcional/visual criativa, sem redesenhar o restante. Comentou que sairia para jantar e voltaria para conferir.
- **Causa identificada pela inspeção do recorte:** a WebP apresenta borda interna já ilustrada (uma segunda moldura) a aproximadamente 16px do contorno externo, embora `meg-choice__option` tenha `overflow:hidden`. A solução da QA usa exclusivamente CSS escopado `meg-unified-choice-overlay`: `meg-choice__option-photo` com `inset:-13px -27px`, mantendo `background-size:100% 100%`, `overflow:hidden` e `isolation:isolate` no card. Dessa forma, a moldura interna recua para fora da área visível e o contorno original recebe a imagem integralmente. Não alterar os WebP, grid, textos, cards, hero ou estilo de outras telas.
- **Faixa inferior revista, mantendo os mesmos 3 espaços + Voltar:** `01 · Escolha` (Selecione o tipo de movimentação), `02 · Preencha` (Informe os dados do lançamento), `03 · Confira` (Revise o resumo antes de continuar). Ícones Prism locais redesenhados nas mesmas caixas e dimensões. Removidas as mensagens decorativas `Dimensionamento automático`, `Tipografia ampliada`, `Responsivo para Web` do seletor na QA.
- **Arquivos alterados SOMENTE na integração QA Stage10:** `apps/web/src/meg-web-evolution/integrated-qa/PrismLaunchChoice.tsx`, `integrated-qa/unified-qa.css`, `scripts/meg-stage08-unified-qa.browser.mjs`. Não foram modificados `launches/LaunchTypePicker.tsx`, `launches/launch-type-picker.css`, `stage10/ExpenseForm.tsx`, autenticação, Home, Lançamentos, Shell, DataGrid, Android, produção, API ou banco. Transferência/Benefício seguem indisponíveis, Salvar continua desabilitado.
- **GitHub:** código final de QA `89522ed5364383341be3bb99e0597ec99264855a`, PR #688 aberta Draft sem merge. CI integrado em Chrome [#43329665382](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43329665382) `completed/success` incluindo 390×844, 640×900, 960×900, 1024×768 e 1366×768, imagens sangrando sob contornos com clipping, faixa de 3 passos, navegação integrada e proibição de APIs financeiras reais. Teste público [#43329665562](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43329665562) falhou inicialmente porque o Render ainda tinha a versão anterior do texto da faixa; **não era prova de falha no código novo**. Reexecutar somente após deploy LIVE.
- **Render QA rotativa existente:** branch de hospedagem `stage08/overdue-prism-warning-20261112` avançou por fast-forward não forçado até `89522ed5364383341be3bb99e0597ec99264855a`, após confirmar nenhuma PR dependente e Auto Deploy OFF. Disparado deploy manual com cache limpo `dep-dbr4q30ae00c73ej3jd0` no mesmo serviço `meg-stage08-alerta-prism-pr685` (`srv-dbr00b56e07s738n62n0`) às 23:34:36 UTC. **Última confirmação antes deste registro: status `build_in_progress`, logs apenas `Cloning from https://github.com/MarcosVilalva/MEG-Platform`, sem status LIVE, sem resultado HTTP da revisão. Não liberar link de homologação novo até confirmar LIVE e Chrome público. Versão LIVE anterior `e71400e7...` continua preservada.
- **Monitoramento real habilitado:** automação `MEG QA Seletor Prism` ID `6af64e88448c81919a8322f0be150491`, verificação condicional horária, sem notificar durante build; ao LIVE do SHA previsto, reexecuta job público e notifica o link sem cache; se falha terminal, relata sem sobrepor a versão anterior; desativa após notificar conclusão. Não fazer deploy paralelo durante `build_in_progress`.
- **Aprovação visual pendente:** o usuário autorizou estas duas alterações, mas ainda não as homologou. Só após inspeção explícita declarar o novo seletor validado; demais telas homologadas preservadas. Não criar serviços Render extras, apagar previews, realizar merge/deploy de produção, habilitar writers ou alterar dados reais.
- **Próximo passo exato:** verificar status do deploy `dep-dbr4q30ae00c73ej3jd0` no Render e depois tentar novamente o CI público #43329665562. Se LIVE e público verde, informar URL com `?visual=prism&tela=lancamentos&modal=novo&v=89522ed5364383341be3bb99e0597ec99264855a` e pedir avaliação visual do recorte e da faixa de três passos. Se continuar aguardando, deixar o monitoramento automático agir sem nova implantação.


## Etapa 10 — Homologação visual final do seletor fotográfico Prism (12/11/2026)

- **APROVAÇÃO VISUAL HUMANA EXPLÍCITA:** após acessar a versão QA com imagens recortadas e rodapé `01 · Escolha / 02 · Preencha / 03 · Confira`, o responsável declarou: **“aprovado, qual a proxima esta´?”**. A aprovação refere-se ao seletor fotográfico de **Novo Lançamento** MEG Prism 2.0, commit de código `89522ed5364383341be3bb99e0597ec99264855a`. Preservar exatamente a composição fotográfica, quatro opções e estados, recorte das WebP, ícones SVG Prism, botão Fechar, faixa inferior funcional e Voltar. Não redesenhar ou alterar quaisquer layouts homologados sem nova consulta/anuência prévia.
- **Gates comprovados antes do aceite:** workflow integrado [#43329665382](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43329665382) concluído com sucesso; workflow Chrome público [#43329665562](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43329665562) aprovado em nova tentativa após publicação no Render. Deploy manual QA rotativo `dep-dbr4q30ae00c73ej3jd0` LIVE no serviço existente `meg-stage08-alerta-prism-pr685`, sem criação de serviços, commit `89522ed5364383341be3bb99e0597ec99264855a`. URL de versão homologada: https://meg-stage08-alerta-prism-pr685.onrender.com/meg-unificado-qa.html?visual=prism&tela=lancamentos&modal=novo&v=89522ed5364383341be3bb99e0597ec99264855a .
- **Aprovações anteriores mantidas:** Nova Despesa versão isolada QA `32a21b9d544cfaa693b0d33254539f1293d66de9` e telas de Loading/Login/Criar Conta/Recuperar Senha/Home/Lançamentos/Shell/DataGrid onde houver aceite explícito. O seletor aprovado não autoriza novos comportamentos financeiros nem libera gravação no sistema real.
- **Situação da Etapa 10:** seletor de tipo e formulário visual Nova Despesa homologados. **Pendente dentro da Etapa 10:** continuação controlada de `Editar Lançamento` (incluindo regras financeiras de edição, cartão, parcelas, benefícios/autocomplete) e eventual `Nova Receita` conforme auditoria e Prompt Master, sem presumir aprovação. PR #675 é protótipo histórico, não base visual autorizada. PRs #678 e #688 seguem Draft, sem merge.
- **Próxima etapa ordinal após ENCERRAR a Etapa 10:** Etapa 11 `Pendentes e Confirmar Pagamento`. NÃO iniciar Etapa 11 enquanto houver pendências críticas da Etapa 10. Nenhuma mudança em Android, writers, API, banco/produção, nem deploy produtivo ou merge.


## Etapa 10 — Prévia de Editar Despesa baseada na Nova Despesa homologada (12/11/2026)

- **Etapa autorizada:** Etapa 10, após aceite humano da Nova Despesa e do seletor fotográfico Prism. A próxima tarefa é `Editar Lançamento`, sem iniciar Pendentes/Confirmar Pagamento (Etapa 11). Branch `stage08/unified-qa-stage05-08-10-20261112`, PR #688 Draft, integrada à QA rotativa já existente. PRs #675 e #678 preservadas em Draft.
- **Autoridade/regras antes do código:** `docs/MEG-WEB-FINANCIAL-AUTHORITY.md`, `docs/MEG-WEB-STAGE10-AUDITORIA-20261112.md` (PR #675), `finance/service.ts:updateFinancialEvent`, `cards/service.ts`, `benefit-event-mutation.ts`, política de status e histórico. Identificada LACUNA CRÍTICA: edição monetária genérica não tem comprovação de transação serializável com versão/idempotência e política de status reaplicada. Compra formal de cartão/parcelas, benefício Verocard, pendências vinculadas e arquivamento têm contratos próprios. Proibido habilitar PATCH/DELETE/save real antes de caracterização transacional em banco descartável.
- **Documentação criada:** `docs/MEG-STAGE10-EDITAR-DESPESA-READINESS-20261112.md`, matriz de prontidão por origem financeira, limites da prévia, segurança, próximos gates, sem inventar suporte a editar cartão/benefício.
- **Prévia visual de Editar Despesa**, a ser homologada pelo usuário: novos `apps/web/src/meg-web-evolution/stage10/EditExpensePreview.tsx` e `EditExpensePreview.css`. Reutiliza `ExpenseForm.css` aprovado para a composição 3 colunas, sem alterar `ExpenseForm.tsx` nem seus estilos. Snapshot explicitamente sintético `QA_EDIT_EXPENSE_SNAPSHOT` (`financial-event`, escopo `monetary`, tipo `expense`). Exibe valor, data, status, conta, categoria e forma originais como leitura, sem cálculo de saldo, parcela, fatura ou status no React. Só Descrição/Observações são campos locais de demonstração e ficam em maiúsculas. Botão `Salvar alterações` permanentemente desabilitado. Sem `onSave`, writers, fetch, PATCH, DELETE, acesso a dados reais ou exclusão.
- **Rota exclusiva QA:** `meg-unificado-qa.html?visual=prism&tela=lancamentos&modal=editar`, adicionada apenas em `integrated-qa/unified-preview.tsx`, sem alterar o clique/seleção nas linhas da tela de Lançamentos homologada, autenticação, Home ou Novo Lançamento. Não declarar a edição real concluída.
- **Testes adicionados:** `scripts/meg-stage08-unified-qa.browser.mjs` verifica Editar por acesso direto, todas as cinco larguras (390/640/960/1024/1366), descrição/observações maiúsculas, exibição de resumo, bloqueio de campos financeiros e Salvar, fechamento e ausência de chamadas reais. O CI integrado no commit de código `6ff8e9edd9f0d738c471fb3349c3b87e85f049af` **completed/success**, execução [#43347496014](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43347496014). O CI integrado do último commit documental `37b0f94ccf8eac5e279d19719621566d9c5e72b6` também **completed/success**, execução [#43347636716](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43347636716).
- **Render QA rotativa existente reutilizada:** serviço `meg-stage08-alerta-prism-pr685`, `srv-dbr00b56e07s738n62n0`, Auto Deploy OFF. Após comparar branches e ausência de PRs com base na de hospedagem, feito fast-forward não forçado com lease de `89522ed5364383341be3bb99e0597ec99264855a` a `37b0f94ccf8eac5e279d19719621566d9c5e72b6`. Deploy manual com cache limpo `dep-dbr6q3d9fdbs73dfaap0`, **LIVE** confirmado no commit `37b0f94ccf8eac5e279d19719621566d9c5e72b6`, 13/11/2026 01:51:52 UTC. Nenhum serviço adicional criado, nenhum deploy produtivo.
- **Prova pública CONCLUÍDA:** primeira tentativa da execução [#43347636735](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43347636735) reprovou antes do deploy porque a rota `modal=editar` ainda não existia no Render. Após LIVE, a **segunda tentativa**, job `131632059535` (`public-browser`), terminou `completed/success`, confirmando navegação da QA pública e cinco larguras. O gate técnico não substitui aceite visual humano; Editar continua NÃO homologado.
- **Próximo passo exato:** conferir nova tentativa de #43347636735 e, se verde, abrir prévia sem cache `https://meg-stage08-alerta-prism-pr685.onrender.com/meg-unificado-qa.html?visual=prism&tela=lancamentos&modal=editar&v=37b0f94ccf8eac5e279d19719621566d9c5e72b6` para avaliação visual explícita de Editar. Depois dos ajustes homologados, avançar caracterização de edição segura e Nova Receita, sem merge nem alterações de produção, API, banco ou Android.


## Etapa 10 — Artes cinematográficas Prism dos quatro cards (13/11/2026)

- **Autorização explícita:** o usuário aprovou o conjunto visual proposto em `MEG-Prism-2.0-preview-4-cards-realistas.png` e pediu publicar (“Aparentemente ficou bem legal ... pode subir. Tá validado”). A aprovação vale para o conceito das **quatro imagens** de Despesa, Receita, Transferência e Benefícios, NÃO para mudanças estruturais nos cards, nem aprovação automática da integração em navegador.
- **Critério comercial:** Benefícios deve ter imagem **genérica**, sem Verocard ou marca de fornecedor, com representação visual de alimentos, combustível e transporte; isto NÃO autoriza operações multioperadora/benefício no writer. A regra financeira existente de Alimentação/Verocard e o writer exclusivo de benefício continuam preservados.
- **Arquivos novos e preservação:** quatro WebP originais gerados para o projeto adicionados **sem sobrescrever** os antigos em `apps/web/public/meg-assets/prism-cinematic-20261113/{expense,income,transfer,benefit}.webp` no commit `239f072f551647ca80de7fabcd1e5df34a0c7603`. Dimensões respectivamente 1672×230, 1672×227, 1672×230, 1672×244; tamanhos 38188, 29938, 35584 e 41882 bytes, SHA de blob Git verificado contra os arquivos locais. A arte prévia é proposta aprovada, mas a integração visual precisa de nova conferência humana.
- **Mudança visual isolada:** `apps/web/src/meg-web-evolution/integrated-qa/unified-qa.css` recebeu somente regras escopadas `.meg-unified-choice-overlay` apontando para novas imagens, sem tocar JSX, CSS base, imagens antigas, hero, ícones, textos, layout, ações, responsividade, outras telas. Novo WebP sem moldura interna substitui o recorte especial anterior, com `inset:0`, `background-size:100% 100%`, `overflow:hidden` herdado do card, por isso não há foto fora do contorno. O seletor Prism usa as quatro artes apenas dentro da QA unificada.
- **Gates:** `scripts/meg-stage08-unified-qa.browser.mjs` verifica cada `background-image`, URL de imagem, HTTP 200, bytes exatos, cabeçalho WebP RIFF, largura/altura e clipping em 390×844, 640×900, 960×900, 1024×768 e 1366×768; valida também as opções e funções anteriores sem regressão. Workflow local [#43431073096](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43431073096) COMPLETED/SUCCESS no commit `0ef881ad784de45ec7529719b993ae674d6116ba`.
- **QA rotativa LIVE:** PR #688 Draft, branch `stage08/unified-qa-stage05-08-10-20261112`. Hospedagem `stage08/overdue-prism-warning-20261112` avançada de `37b0f94ccf8eac5e279d19719621566d9c5e72b6` para `0ef881ad784de45ec7529719b993ae674d6116ba` por fast-forward não forçado com lease, após conferir ausência de PRs dependentes, mesma branch Render, Auto Deploy OFF e CI verde. Serviço reutilizado `meg-stage08-alerta-prism-pr685` ID `srv-dbr00b56e07s738n62n0`. Deploy manual cache limpo `dep-dbrh7krtqb8s73eiev20` **LIVE em 13/11/2026 às 13:43:26 UTC**, no commit exato `0ef881ad784de45ec7529719b993ae674d6116ba`. Não foi criado serviço novo, não houve deploy produtivo ou merge.
- **Teste público VERDE:** [#43431073107](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43431073107) primeira tentativa falhou PRE-DEPLOY (Render ainda servia o commit anterior). Após o deploy ficar LIVE no commit exato, o job repetido **#131922253777** terminou **completed/success** no Chrome público, com cinco larguras e todas as validações de imagens. A falha inicial foi resolvida pela publicação; nenhuma asserção foi relaxada.
- **QA esperada sem cache:** `https://meg-stage08-alerta-prism-pr685.onrender.com/meg-unificado-qa.html?visual=prism&tela=lancamentos&modal=novo&v=0ef881ad784de45ec7529719b993ae674d6116ba`. Divulgar como nova prévia após LIVE confirmado e Chrome público verde. Preservar explicitamente o seletor fotográfico anteriormente homologado, Nova Despesa, Editar QA, Login, Cadastro, Recuperação, Home, Lançamentos, Shell, DataGrid e Android.
- **Próximo passo:** o usuário deve inspecionar visualmente a nova QA pública sem cache da escolha Novo Lançamento com as quatro novas artes, incluindo 390px e desktop, antes de registrar homologação visual da **integração**. A aprovação prévia das artes conceituais não substitui essa revisão final. Manter PR Draft, sem alterar writers, API, banco ou produção. Restam Editar funcional/Nova Receita/contratos na Etapa 10. 


## Etapa 10 — Correção de paisagem em tela curta, POCO C75 (13/11/2026)

- **Relato visual do usuário:** dois screenshots do navegador Chrome no POCO C75 mostram seletor MEG Prism 2.0 bom na vertical, mas **cards absurdamente achatados e textos cortados na horizontal**. O usuário priorizou manter visual homologado para notebooks 15,6 e 16 polegadas e monitor wide 23 polegadas. Não foi autorizado redesenhar desktop, trocar imagens, ícones ou funcionalidades. Arquivos de evidência no chat: `1000304753.jpg` (450×1024 px, vertical), `1000304752.jpg` (1024×450 px, horizontal). Essas dimensões são do screenshot e não devem ser confundidas com viewport CSS. A especificação POCO C75 oficial é tela 6,88 polegadas, 1640×720 pixels físicos, 260 ppi; tamanho CSS no Chrome depende de DPR, zoom e UI do navegador.
- **Causa técnica confirmada no código:** `launch-type-picker.css` define `grid-template-rows:repeat(4,minmax(0,1fr))` com painel modal de altura vinculada ao `100dvh` e `overflow:hidden`. Em paisagem com navegador baixo, faltava altura para os quatro cards e rodapé, comprimindo cada card. Não se tratava de perda de resolução de imagem.
- **Correção mínima em QA**, commit `1124f59818913e456206e50b47cca7e7dacb57d4`: somente `apps/web/src/meg-web-evolution/integrated-qa/unified-qa.css` recebeu media query técnica `@media (max-height: 560px) and (orientation: landscape) and (min-width: 640px)`. O seletor passa a ter `overflow-y:auto` **dentro do diálogo**, o cabeçalho/Fechar permanece visível com `position:sticky`, grid deixa de impor alturas minúsculas, cards têm `min-height:108px`, rodapé fica após os quatro cards e alcançável por rolagem. Zero rolagem horizontal. Fora de paisagem curta, a regra NÃO se aplica. `launch-type-picker.css`, componentes, cards, assets, Home, Login, Nova Despesa e demais telas homologadas não foram alterados.
- **Testes de regressão:** `scripts/meg-stage08-unified-qa.browser.mjs` ampliado no commit `5c6c1a4cd09ddfa51a0db9000811fd5cb24fb520` com 820×360 (POCO C75 viewport CSS aproximado, não medição do aparelho), 1024×450 (referência visual), 1366×768 (notebook 15,6), 1920×1080 (monitor 23), 1920×1200 (notebook 16 formato 16:10). Checa min-height e não sobreposição dos quatro cards, ausência de texto cortado, área rolável/scroll funcionando, rodapé após cards, ausência de scroll horizontal, bloqueios de Transferência e Benefícios e sem erros JS. Todos cinco `MEG_PRISM_COMPACT_LANDSCAPE ... PASS`. Os cinco testes existentes 390×844, 640×900, 960×900, 1024×768 e 1366×768 também `MEG_UNIFIED_PRISM ... PASS`. CI integrada [#43438929304](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43438929304) **completed/success**.
- **QA rotativa:** PR #688 permanece Draft, código `5c6c1a4cd09ddfa51a0db9000811fd5cb24fb520`; branch de hospedagem `stage08/overdue-prism-warning-20261112` avançou em fast-forward não forçado com lease de `0ef881ad784de45ec7529719b993ae674d6116ba` a `5c6c1a4cd09ddfa51a0db9000811fd5cb24fb520`, após auditar dependências (nenhuma PR aberta com base nessa branch) e confirmar Render Auto Deploy OFF. Mesmo serviço `meg-stage08-alerta-prism-pr685` `srv-dbr00b56e07s738n62n0`, sem serviço novo, sem alteração de produção ou banco. Deploy manual com cache limpo `dep-dbrhi7rtqb8s73ejc6i0` **LIVE**, concluído em 13/11/2026 às 14:06:13 UTC, commit exato `5c6c1a4cd09ddfa51a0db9000811fd5cb24fb520`.
- **Gate público APROVADO:** a primeira tentativa [#43438929328](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43438929328) falhou porque acessou a QA antiga antes do deploy. Após Render LIVE no commit exato, **segunda tentativa Chrome público** job `131933799779` terminou `completed/success` com asserções inalteradas. A falha inicial foi de sincronização pré-publicação, resolvida pela atualização do Render.
- **Próximo passo exato:** disponibilizar a versão já LIVE e validada tecnicamente na QA por URL com cache-buster `https://meg-stage08-alerta-prism-pr685.onrender.com/meg-unificado-qa.html?visual=prism&tela=lancamentos&modal=novo&v=5c6c1a4cd09ddfa51a0db9000811fd5cb24fb520`; solicitar conferência visual real no POCO C75 vertical/horizontal e no notebook. **Não registrar aceite visual da correção sem resposta expressa.** Etapa 10 continua, sem avançar para Etapa 11, escritores financeiros, merge, deploy produtivo ou Android.


## Etapa 10 — Rolagem profissional do seletor em paisagem (13/11/2026)

- **Solicitação direta e evidência visual:** usuário enviou screenshot `1000304777.jpg` no Poco C75 deitado, observando que, ao rolar, os cards/imagens da escolha `Novo lançamento` surgiam por trás dos títulos e do botão Fechar. Pediu que os cards “fossem ocultando” quando passassem pelo cabeçalho. Não houve pedido de redesenho de layout, mudança de imagens ou de funcionalidades.
- **Diagnóstico estrutural:** a correção anterior usava `overflow-y:auto` no modal inteiro e `position:sticky` no cabeçalho. Isso mantinha ambos na mesma região rolável; a imagem continuava visível por trás do cabeçalho, agravada pelo fundo com alfa 0,98 e cantos arredondados. Apenas aumentar z-index não resolveria a separação.
- **Correção escopada na Etapa 10 QA:** `apps/web/src/meg-web-evolution/integrated-qa/unified-qa.css`, exclusivamente dentro de `@media (max-height:560px) and (orientation:landscape) and (min-width:640px)`. O contêiner `.meg-new-launch.is-choose` virou flex-column com `overflow:hidden`; o cabeçalho agora é um elemento não rolável, `position:relative`, opaco `#031b20` e borda sem raio próprio; apenas `.meg-choice--photo` possui `overflow-y:auto` com `min-height:0`, clipping no seu limite superior e rolagem por toque. Grid do scrollport usa `grid-template-rows:max-content max-content` e `align-content:start`, corpo com `min-height:max-content`, prevenindo invasão do rodapé sobre o último card. Quatro opções preservam `min-height:108px`; todas as imagens, ícones, textos e estados permanecem intactos. Nenhuma mudança para retrato, notebook ou desktop, nem no CSS homologado de origem.
- **Arquivos/commits de código:** `unified-qa.css`: commits `375cbb25bd23c4827e2a855f8fd33d4b5003abc7` (separação do scrollport), `dd9f07eee41a4bdde89351bd0864c1f603e81254` (impedir compressão dos tracks que causava sobreposição com rodapé). `scripts/meg-stage08-unified-qa.browser.mjs`: commit `474b226052e6a4e16ee70c0d8e92b5cc83db04c9`, verificando header estático, fundo opaco, scroller independente, quatro cards inteiros e não sobrepostos, rolagem até o rodapé, conteúdo invisível/sem hit-test fora da área rolável, sem scroll horizontal, sem regressão nos módulos preservados.
- **Gates técnicos:** primeira execução da CI do commit `474b2260` falhou em `Rodapé não pode cobrir os cards`, revelando encolhimento do grid dentro do novo scrollport; correção estrutural em `dd9f07`. CI integrada **completed/success** [#43443806373](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43443806373), com PASS em 820×360, 1024×450, 1366×768, 1920×1080, 1920×1200 e os cinco tamanhos anteriores 390×844, 640×900, 960×900, 1024×768, 1366×768. Teste Chrome público **completed/success após reexecução pós-deploy**, execução [#43443806726](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43443806726), job `131950656668`, sem relaxar asserções.
- **Publicação QA:** branch hospedagem `stage08/overdue-prism-warning-20261112` avançada por fast-forward não forçado com lease de `5c6c1a4cd09ddfa51a0db9000811fd5cb24fb520` para `dd9f07eee41a4bdde89351bd0864c1f603e81254`, após auditar PRs dependentes (nenhuma) e confirmar Auto Deploy OFF. Deploy manual com cache limpo `dep-dbri1256e07s73bpiuu0` no mesmo Render QA rotativo `meg-stage08-alerta-prism-pr685` (`srv-dbr00b56e07s738n62n0`) confirmado LIVE no commit `dd9f07eee41a4bdde89351bd0864c1f603e81254`, em 13/11/2026 às 14:37:40 UTC. Não foi criado serviço novo.
- **Link QA direto sem cache:** https://meg-stage08-alerta-prism-pr685.onrender.com/meg-unificado-qa.html?visual=prism&tela=lancamentos&modal=novo&v=dd9f07eee41a4bdde89351bd0864c1f603e81254
- **Estado de aprovação:** telas e imagens anteriormente homologadas preservadas. Esta correção de rolagem foi testada tecnicamente e está LIVE, mas ainda **PENDENTE de homologação visual explícita do responsável no Poco C75 real**. PR #688 continua Draft, sem merge, alterações de produção, API, banco, writer ou Android.
- **Próximo passo exato:** pedir inspeção visual do scroll do seletor na horizontal e vertical no Poco C75 pela URL sem cache acima; registrar aceite se explícito. Só então retomar itens pendentes da Etapa 10 (Editar financeiro seguro e Nova Receita) sem avançar para Etapa 11.


## Etapa 10 — Homologação da rolagem do seletor no POCO C75 (13/11/2026)

- **Aceite visual humano explícito:** após publicação e revisão da correção de rolagem do seletor no Poco C75 em paisagem, o responsável declarou **“validado, qual a poroxima”**. Isso homologa a separação do cabeçalho opaco e fixo da área rolável, o recorte dos cards ao subir, a ausência de achatamento, o rodapé acessível e a preservação das quatro imagens Prism. Aceite referente ao código QA `dd9f07eee41a4bdde89351bd0864c1f603e81254` e ao link de validação sem cache já registrado na seção anterior.
- **Gates previamente comprovados:** CI integrada [#43443806373](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43443806373) `success`, Chrome público [#43443806726](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43443806726) segunda tentativa `success`, Render `dep-dbri1256e07s73bpiuu0` LIVE no commit acima. A aprovação visual é adicional, não substituída por tais testes.
- **Tela homologada a preservar:** seletor fotográfico Novo Lançamento MEG Prism 2.0 em desktop, mobile vertical e horizontal, imagens originais para Despesa, Receita, Transferência e Benefícios; Transferência e Benefícios continuam indisponíveis na QA, sem liberar novos comportamentos financeiros. Não mudar composição ou imagens sem consulta e autorização prévias.
- **Próximo trabalho DA MESMA Etapa 10:** concluir **Editar Lançamento**. Há prévia Editar Despesa `EditExpensePreview.tsx` publicada na QA com dados fictícios, campos monetários bloqueados e Salvar desabilitado, mas **ainda sem homologação visual explícita do Editar**. É a próxima candidata para inspeção visual e refinamento autorizado. Após isso, seguir com `Nova Receita`, auditoria/contratos financeiros de edição segura, cartões, parcelas, autocomplete e Alimentação/benefícios. A ordem pode ser detalhada sem presumir que writer está seguro: generic `updateFinancialEvent` ainda demanda caracterização transacional antes de habilitar PATCH/DELETE.
- **Próxima etapa ordinal SOMENTE após concluir Etapa 10:** Etapa 11, Pendentes e Confirmar Pagamento. PR #688 Draft; não merge, deploy produtivo, Android, API/banco produção, writers reais nem criação de serviço Render por causa do aceite visual.


## Etapa 10 — Refino visual isolado da prévia Editar Despesa (14/11/2026)

- **Autorização do responsável:** após conferir screenshot da prévia `Editar lançamento` na QA, o usuário respondeu **“concordo”** à proposta explícita de refinar a prévia, especialmente redução do espaço vazio, SVG do Fechar e distinção visual dos campos bloqueados, mantendo composição de 3 colunas e sem homologar a versão antiga. Isso NÃO é aprovação visual da versão refinada. Nenhuma alteração do layout de Nova Despesa homologado foi autorizada.
- **Escopo exclusivo:** Etapa 10, PR #688 Draft, branch `stage08/unified-qa-stage05-08-10-20261112`, prévia de **Editar Despesa fictícia**. Sem avançar para Receita, Pendentes, autenticação ou writer financeiro real neste ajuste.
- **Alterações:** `apps/web/src/meg-web-evolution/stage10/EditExpensePreview.tsx` agora usa fechamento em SVG Prism 2.0 (sem caracteres ×), substitui cinco falsas escolhas de categoria indisponíveis por aviso somente consulta, substitui toggle visual de Paga/Pendente por rótulo estático `output` do status do snapshot fictício. Os dados exibidos continuam exatamente os do fixture; nenhum saldo, fatura ou status é recalculado localmente. Descrição/Observações permanecem editáveis apenas em memória e em maiúsculas; campos financeiros e botão `Salvar alterações` continuam `disabled`.
- **CSS isolado:** `apps/web/src/meg-web-evolution/stage10/EditExpensePreview.css`: diferencia inputs/select desabilitados por contraste/borda/fundo de consulta, diferencia status não clicável, estiliza SVG e limita no desktop a altura do modal ao conteúdo, mantendo 3 colunas e alinhamento. Em desktop baixo (altura <= 610 px), mantém altura de viewport e rolagem independente por painel. `ExpenseForm.tsx` e `ExpenseForm.css` da Nova Despesa homologada, seletor fotográfico Prism, Home, Lançamentos, Login, Shell e DataGrid **não foram tocados**.
- **Teste expandido:** `scripts/meg-stage08-unified-qa.browser.mjs` verifica `Fechar edição` SVG Prism, status exibido sem botão, ausência de categorias falsas clicáveis, campos monetários/salvar bloqueados, composição desktop sem área vazia abaixo da malha, colunas alinhadas e sem cortes ou overflow; testes adicionais 1440×900, 1920×1080 e 1920×1200. Os cinco tamanhos do fluxo integrado e os cinco cenários do seletor horizontal permanecem. Execução integrada [#43545655051](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43545655051) **completed/success**, com logs `MEG_EDIT_PRISM_WIDE 1440x900 PASS`, `1920x1080 PASS`, `1920x1200 PASS` e todos os dez tamanhos anteriores PASS. Código do último commit de teste: `108f499932cf284fa679605db29fe8b7e47d8c17`.
- **Publicação QA rotativa:** serviço Render existente `meg-stage08-alerta-prism-pr685`, ID `srv-dbr00b56e07s738n62n0`, Auto Deploy OFF; branch hospedagem `stage08/overdue-prism-warning-20261112` atualizada por fast-forward não forçado com lease de `dd9f07eee41a4bdde89351bd0864c1f603e81254` a `108f499932cf284fa679605db29fe8b7e47d8c17`, após comparar commits e ausência de PRs dependentes. Deploy manual `dep-dbrsbn61egvs73c4egjg` no mesmo serviço, com cache limpo, confirmado **LIVE em 14/11/2026 às 02:22:55 UTC**, exatamente no commit acima. Nenhum serviço Render criado ou removido.
- **Gate público CONFIRMADO:** workflow [#43545655035](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43545655035) falhou inicialmente antes do deploy (Render antigo). Após LIVE no commit exato, a reexecução do job `132297366253` terminou **completed/success**, validando o navegador público sem flexibilizar os testes.
- **Link QA LIVE com público verde, SEM CACHE:** https://meg-stage08-alerta-prism-pr685.onrender.com/meg-unificado-qa.html?visual=prism&tela=lancamentos&modal=editar&v=108f499932cf284fa679605db29fe8b7e47d8c17
- **PENDENTE:** receber validação **visual humana explícita** da prévia Editar Despesa refinada. Testes de CI e Render LIVE não substituem essa etapa. Writer genérico de atualização ainda não caracterizado em transação segura, nenhum save real, PATCH, DELETE, banco, API, Android, merge, deploy produtivo ou alteração em telas homologadas foi feito. Etapa 11 continua bloqueada pela ordem do projeto.
- **Próximo passo exato:** disponibilizar URL de validação sem cache da edição já testada em Chrome público e solicitar aceite visual específico. Depois seguir com caracterização financeira do escritor e demais funcionalidades restantes da Etapa 10.

## Etapa 10 — Formulário único, Dirty State e cancelamento por X (13/11/2026, horário de Brasília)

**Decisão humana explícita:** o responsável aprovou que Editar Despesa tenha os mesmos campos e o mesmo layout da Nova Despesa homologada, com o botão **Salvar alterações** habilitado somente quando algum campo tiver sido modificado. A desistência ocorre pelo **X**, descartando o rascunho. Não interpretar essa aprovação funcional como homologação visual da nova prévia.

- **Implementação na PR #688 Draft:** branch `stage08/unified-qa-stage05-08-10-20261112`. `ExpenseForm.tsx` passou a aceitar modos `create` e `edit`, além de `initialDraft`, sem duplicar a interface. O editor carrega dados fictícios, aplica as mesmas opções de categoria, data, valor, pagamento, observações, status e responsividade. A Nova Despesa homologada mantém o modo create sem alterações estruturais. `EditExpensePreview.tsx` foi reduzido a adaptador de snapshot. `unified-preview.tsx` usa callback de simulação **sem writer**. O botão X descarta qualquer mudança local sem confirmação; Salvar ativa com qualquer diferença válida e desativa se o campo voltar ao valor original.
- **Testes atualizados:** `scripts/meg-stage08-unified-qa.browser.mjs` cobre preenchimento original, comparação/reversão de alterações, validação de campos obrigatórios, simulação sem persistência, reabertura após X, layout responsivo e as rotas aprovadas. Regras financeiras, API, banco, Android, produção, Home, Shell, DataGrid, Login e seletor fotográfico Prism não foram modificados.
- **Gates:** GitHub Actions integrado [#43548251683](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43548251683) **SUCCESS**, no commit de código/testes `a60a68b8d4d6e14015b9257cc073aa771b4342f2`; web build, isolamento estático e Chrome integrados aprovados. O teste público [#43548251725](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43548251725) **FAILURE**, pois o Render continua servindo a prévia anterior até o deploy (diferença esperada de versão, ainda não aprovado como gate público).
- **Branch de hospedagem atualizada com segurança:** `stage08/overdue-prism-warning-20261112` fast-forward de `108f499932cf284fa679605db29fe8b7e47d8c17` para `a60a68b8d4d6e14015b9257cc073aa771b4342f2`, sem força e com lease. A atualização não criou serviço Render nem fez merge. A PR #688 permanece Draft, sem merge.
- **Render, BLOQUEIO EXPLÍCITO:** serviço QA existente `meg-stage08-alerta-prism-pr685` ID `srv-dbr00b56e07s738n62n0`, Auto Deploy OFF. O conector exigiu selecionar workspace previamente à ação. `list_workspaces` retornou um único `My Workspace`, ID `tea-d98k1qhkh4rs73f4sfj0`, **ainda sem confirmação explícita do usuário**. A tentativa de disparo sem workspace falhou sem iniciar deploy.
- **Visual não homologado:** a prévia de Editar com formulário compartilhado não está no Render LIVE ainda. Não usar o link anterior (`v=108f499`) como validação da nova versão. Também não declarar sucesso de publicação nem de gravação.
- **Próximo passo exato:** obter confirmação do responsável de que o Render workspace `My Workspace` é o autorizado; acionar **somente** deploy QA manual com cache limpo no serviço existente, conferir LIVE no commit da branch hospedagem, reexecutar teste público; fornecer URL direta sem cache `?visual=prism&tela=lancamentos&modal=editar&v=<sha publicado>` e solicitar homologação visual separada. Continuar na Etapa 10 com direitos financeiros de edição e Nova Receita apenas depois dos gates pertinentes. Sem writers, merge, produção ou serviço novo Render.

## Etapa 10 — Confirmação workspace e publicação QA do Editar compartilhado (14/11/2026, UTC)

- **Autorização explícita:** responsável respondeu "ok" à pergunta sobre o workspace Render `My Workspace`, conta vinculada informada anteriormente. Workspace autorizado `tea-d98k1qhkh4rs73f4sfj0`, serviço já existente `meg-stage08-alerta-prism-pr685` (`srv-dbr00b56e07s738n62n0`). Não criar novo serviço.
- **Situação preservada:** PR [#688](https://github.com/MarcosVilalva/MEG-Platform/pull/688) Draft, branch `stage08/unified-qa-stage05-08-10-20261112`, sem merge na main; branch de hospedagem `stage08/overdue-prism-warning-20261112` conferida idêntica ao SHA técnico `a60a68b8d4d6e14015b9257cc073aa771b4342f2`.
- **Deploy QA manual com cache limpo:** `dep-dbrsr03rjlhs73cfql1g`, disparado com workspace autorizado, **LIVE**, concluído em 14/11/2026 02:55:37 UTC, commit `a60a68b8d4d6e14015b9257cc073aa771b4342f2`. Render está com Auto Deploy OFF. Nenhum deploy produtivo, serviço novo, writer financeiro, API, banco, Android ou merge.
- **Gates:** Chrome integrado [#43548251683](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43548251683) `SUCCESS`. Smoke público [#43548251725](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43548251725), reexecução do job `132306637114` **SUCCESS** após publicação LIVE. Logs públicos confirmam `MEG_UNIFIED_PRISM` em 390×844, 640×900, 960×900, 1024×768, 1366×768; `MEG_PRISM_COMPACT_LANDSCAPE` em 820×360, 1024×450, 1366×768, 1920×1080 e 1920×1200; `MEG_EDIT_PRISM_WIDE` em 1440×900, 1920×1080, 1920×1200. Todas as linhas `PASS`.
- **Prévia sem cache:** https://meg-stage08-alerta-prism-pr685.onrender.com/meg-unificado-qa.html?visual=prism&tela=lancamentos&modal=editar&v=a60a68b8d4d6e14015b9257cc073aa771b4342f2
- **Comportamento autorizado e entregue para visualização:** Editar Despesa reutiliza formulário da Nova Despesa homologada, com dados fictícios pré-preenchidos; botão **Salvar alterações** inicia desabilitado, habilita apenas com alguma diferença válida e desabilita novamente quando os valores originais são restaurados. X fecha e descarta rascunho. Salvar na QA apenas emite mensagem, **não executa mutação financeira**.
- **Gate pendente obrigatório:** homologação visual humana explícita da edição compartilhada. Teste técnico e deploy LIVE NÃO homologam aparência. Gravação real permanece bloqueada pela matriz transacional de `docs/MEG-STAGE10-EDITAR-DESPESA-READINESS-20261112.md`. Sem avançar para Etapa 11.
- **Próximo passo exato:** responsável inspecionar a URL acima nas resoluções relevantes e aprovar ou apontar ajustes de Editar Despesa; só então tratar os contratos financeiros seguros e restante da Etapa 10, uma tarefa por vez.


## Etapa 10 — Homologação de Editar Despesa e ações da grade em QA (14/11/2026)

- **Aceite humano do Editar Despesa:** responsável declarou na conversa “tela de editar está validado”. A versão compartilhada de Editar Despesa em `a60a68b8d4d6e14015b9257cc073aa771b4342f2` está HOMOLOGADA VISUALMENTE. A aprovação não autoriza gravação real.
- **Decisão de produto aprovada:** substituir o olho por lápis nas despesas monetárias elegíveis, manter Ver detalhes, acrescentar menu de ações com Duplicar, Histórico, Confirmar pagamento e Arquivar, e botão `Editar em lote` no cabeçalho. O responsável confirmou “CONCORDO COM TUDO, ESTA VALIDADO TODAS AS AÇÕES, PODE SEGUIR”. Isso aprova a proposta funcional, não representa inspeção visual da interface nova após deploy.
- **Implementação somente na QA unificada:** opt-in `qaActions` em `LaunchesStage09.tsx`. Fora da QA, cabeçalho e ação original de consulta são mantidos sem redesenho. Despesa monetária da fixture pode abrir o editor com dados do registro selecionado; benefício, receita e outros domínios continuam em consulta. Duplicação cria rascunho local, sem valor/data reaproveitados ou gravação. Histórico de auditoria, baixa e arquivamento apenas informam seus bloqueios, sem simular persistência.
- **Edição em lote:** o `DataGrid` expõe seleção por callback opt-in (IDs selecionados e IDs filtrados); nenhuma seleção paralela. Botão com contador inicia desabilitado; modal mostra todos os registros selecionados, inclusive de páginas/filtros distintos; observações e categoria são apenas campos de simulação. Classificação sem catálogo canônico, valores, contas, status, cartão, fatura, parcelas, competência, pagamento e arquivamento ficam bloqueados.
- **Arquivos de código alterados:** `apps/web/src/meg-web-evolution/datagrid/{types.ts,DataGrid.tsx}`, `apps/web/src/meg-web-evolution/launches/{LaunchesStage09.tsx,launches-stage09.css}`, `apps/web/src/meg-web-evolution/integrated-qa/unified-preview.tsx`, `apps/web/src/meg-web-evolution/stage10/{LaunchActionsQa.tsx,LaunchActionsQa.css}`, `scripts/meg-stage08-unified-qa.browser.mjs`.
- **Commit técnico publicado:** `4914f53a3cec7eb7e2530b87ebab1b0d0a5ca068`, PR #688 Draft, branch de desenvolvimento `stage08/unified-qa-stage05-08-10-20261112`, branch QA `stage08/overdue-prism-warning-20261112` avançada por fast-forward com lease, sem merge na main. Comparação demonstrou 16 commits à frente de `a60a68b8`, zero atrás. Nenhuma PR aberta com base na branch de hospedagem.
- **Gates comprovados:** CI integrado [#43552931162](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43552931162) **SUCCESS**; Chrome público [#43552931151](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43552931151), reexecução do job `132320188234` **SUCCESS** após Render LIVE. Logs confirmam `MEG_STAGE10_QA_ACTIONS` em 390, 640, 960, 1024 e 1366 px e regressão anterior `MEG_UNIFIED_PRISM`, `MEG_PRISM_COMPACT_LANDSCAPE` e `MEG_EDIT_PRISM_WIDE` com PASS em 13 perfis.
- **Render QA:** mesmo serviço rotativo `meg-stage08-alerta-prism-pr685` (`srv-dbr00b56e07s738n62n0`), workspace autorizado `My Workspace` (`tea-d98k1qhkh4rs73f4sfj0`), Auto Deploy OFF; novo deploy manual com cache limpo `dep-dbrti68n74is7388fd80` **LIVE** no código `4914f53a3cec7eb7e2530b87ebab1b0d0a5ca068`. Nenhum novo serviço criado.
- **Link sem cache:** https://meg-stage08-alerta-prism-pr685.onrender.com/meg-unificado-qa.html?visual=prism&tela=lancamentos&v=4914f53a3cec7eb7e2530b87ebab1b0d0a5ca068
- **Segurança preservada:** nenhuma chamada API real na QA; sem PATCH, DELETE, pagamentos, writers, saldo recalculado na UI, banco real, Android, produção, merge ou avanço para Etapa 11. Regras de Alimentação, Verocard, parcelas, competência, benefício, estorno e edição financeira permanecem sob a autoridade canônica.
- **PENDÊNCIA VISUAL:** a nova barra de ações, menus por linha e modal Editar em lote ainda não receberam homologação visual explícita APÓS esta publicação. A homologação anterior da tela Editar Despesa continua válida e não é transferida automaticamente às novas ações.
- **Próximo passo exato:** responsável validar visualmente as ações na URL sem cache (desktop e Poco C75 vertical/paisagem). Após ajustes e aceite específicos, caracterizar contratos transacionais de edição individual/coletiva e avançar um item por vez nos demais pendentes da Etapa 10, incluindo Nova Receita. Não ativar writers sem autorização separada.


## Etapa 10 — Menu único de Ações (ícone lista + seta) na QA (14/11/2026)

- **Autorização de interface:** após enviar como referência o ícone compacto de lista com pequena seta, o responsável declarou “bora seguir assim entao”. Essa aprovação autoriza a mudança proposta, mas **não** homologa visualmente a versão publicada; a inspeção continua pendente.
- **Escopo:** somente coluna Ações do `LaunchesStage09` no fluxo opt-in `qaActions` da QA unificada (PR #688 Draft). Duas ações inline (lápis e reticências) foram substituídas por **um único botão lista + seta**, no padrão Prism 2.0. Menu mantém seis opções com `Editar lançamento` em primeiro lugar, seguido de Ver detalhes, Duplicar como rascunho, Histórico, Confirmar pagamento e Arquivar. Coluna QA reduzida para 78px (mínimo 72px). Fora da QA, o fluxo legado de consulta permanece intacto.
- **Comportamento:** trigger `aria-haspopup="menu"`, `aria-expanded`, foco no primeiro item, navegação por setas/Home/End, fechamento por Escape/clique externo/ação. Modal/menu restrito à viewport, com toque ≥44px no mobile. Evitado fechamento involuntário decorrente do scroll/foco do DataGrid. Menus financeiros continuam protegidos: nenhuma simulação de write para histórico canônico, baixa e arquivamento. `Editar em lote` e a seleção nativa DataGrid permanecem preservados.
- **Arquivos técnicos modificados:** `apps/web/src/meg-web-evolution/stage10/LaunchActionsQa.tsx`, `LaunchActionsQa.css`, `apps/web/src/meg-web-evolution/launches/LaunchesStage09.tsx`, `scripts/meg-stage08-unified-qa.browser.mjs`. Nenhum arquivo da Home, Android, API ou banco alterado.
- **Commit técnico publicado:** `040bf15f3929961a2e7063c68a8ac62a4a69bc80`, branch de desenvolvimento `stage08/unified-qa-stage05-08-10-20261112`; hospedagem `stage08/overdue-prism-warning-20261112` avançada de `4914f53a3cec7eb7e2530b87ebab1b0d0a5ca068` por fast-forward sem força, após conferir 6 commits à frente e zero atrás e ausência de PRs dependentes.
- **CI integrado:** https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43582214610 **SUCCESS**. **QA pública pós-deploy:** https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43582214591 **SUCCESS na reexecução** (job `132410000979`). Evidências `MEG_STAGE10_QA_ACTIONS` PASS em 390, 640, 960, 1024 e 1366px; regressão Prism em 820×360, 1024×450, 1366×768, 1920×1080, 1920×1200; Editor wide em 1440×900, 1920×1080, 1920×1200. O teste público falhou antes de publicar o novo código, mas passou após LIVE.
- **Render QA:** workspace autorizado `My Workspace` (`tea-d98k1qhkh4rs73f4sfj0`), mesmo serviço `meg-stage08-alerta-prism-pr685` (`srv-dbr00b56e07s738n62n0`), Auto Deploy OFF. Deploy manual cache limpo `dep-dbs2tkec6qcc73a1r3d0` **LIVE** no SHA exato `040bf15f3929961a2e7063c68a8ac62a4a69bc80`. Sem serviço novo.
- **Link sem cache para inspeção:** https://meg-stage08-alerta-prism-pr685.onrender.com/meg-unificado-qa.html?visual=prism&tela=lancamentos&v=040bf15f3929961a2e7063c68a8ac62a4a69bc80
- **Gate legado divergente já preexistente:** workflow `MEG Stage09 - Web integrada Home + Lancamentos isolada` executado na branch hospedagem falhou em https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43582396712, ao comparar `HomeDashboard.tsx` com hash `9ccb041...`, quando o blob atual já era `781412...`. A MESMA falha constava na execução anterior https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43553150519, antes desta alteração. Não alterar hashes/guards nem declarar todos os gates verdes. A reconciliação do workflow está pendente de revisão escopada e aprovação. Gate da QA Stage08 de hospedagem https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43582396713 **SUCCESS**.
- **Limites preservados:** PR #688 Draft; sem merge na main, writer PATCH/DELETE, dados ou API real, produção, Android, Etapa 11, mudança de qualquer tela homologada ou novo serviço Render. Editor Despesa já homologado visualmente permanece intocado. Edição financeira em lote real e Nova Receita continuam pendentes da Etapa 10.
- **Próximo passo:** usuário inspecionar a interface de Ações e seu menu no link LIVE (desktop, mobile vertical e Poco C75 horizontal). Registrar aceite visual apenas mediante manifestação explícita. Não ativar mutações financeiras.


## Etapa 10 — Micro-refino do botão Ações Prism 2.0 (14/11/2026)

- **Autorização:** usuário enviou captura do botão Ações e observou que a seta estava colada às linhas. Após proposta de refinamento pontual, autorizou expressamente: `pode seguir`. Isso autoriza implementar/publicar a QA, mas não é homologação visual do resultado.
- **Escopo efetivo:** somente botão único Ações da QA unificada da Etapa 10. Ícone de linhas e seta passaram a ser dois SVGs semânticos internos ao mesmo botão, separados por `gap: .5rem` (aprox. 8px), centralizados e com caret menor/discreto. Botão desktop `3.15rem × 2.65rem`, mobile até 639px `3.15rem × 2.75rem`, sem corte e com alvos adequados. Identidade e estados MEG Prism preservados. Nenhuma mudança em menu, seis opções, edição em lote, DataGrid, formulário homologado, regras financeiras ou fluxo fora da QA.
- **Arquivos técnicos modificados:** `apps/web/src/meg-web-evolution/stage10/LaunchActionsQa.tsx`, `apps/web/src/meg-web-evolution/stage10/LaunchActionsQa.css`, `scripts/meg-stage08-unified-qa.browser.mjs`. Comparação com último checkpoint confirma SOMENTE esses 3 arquivos. Os testes medem espaçamento real de pelo menos 6px, centralização de até 2px, contorno interno e altura do alvo, mantendo testes de navegação e ausência de writes.
- **Commit técnico QA:** `fba0511a2cbc81721fdcc92f9e40fa508da42a61`. PR #688 permanece Draft e sem merge. Branch de desenvolvimento `stage08/unified-qa-stage05-08-10-20261112`; hospedagem `stage08/overdue-prism-warning-20261112` avançada por fast-forward sem força, de `040bf15f3929961a2e7063c68a8ac62a4a69bc80` ao SHA técnico, sem commits divergentes nem PRs dependentes.
- **Gates positivos:** CI integrado https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43585122288 **SUCCESS**. Smoke público depois do deploy https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43585122318 **SUCCESS** na reexecução, job `132418667630`. Logs `MEG_STAGE10_QA_ACTIONS` PASS em 390, 640, 960, 1024 e 1366 px; testes prévios de Prism em 820×360, 1024×450, 1366×768, 1920×1080 e 1920×1200, além do editor wide em 1440×900, 1920×1080 e 1920×1200, também PASS. QA hospedagem Stage08 https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43585304664 **SUCCESS**.
- **Gate legado ainda vermelho (pré-existente):** Stage09 https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43585304766 falha em hash obsoleto de `HomeDashboard.tsx`: esperado `9ccb041d72088db1f071bad2c82965c564f73743`, atual `781412cfeef4b72a7a95de0766c94fd17c1de239`. Mesma falha já registrada anteriormente, fora dos três arquivos desta revisão. NÃO desativar nem adulterar este controle sem revisão e autorização; não declarar todos os gates verdes.
- **Render QA:** workspace autorizado `My Workspace` (`tea-d98k1qhkh4rs73f4sfj0`), mesmo serviço `meg-stage08-alerta-prism-pr685` (`srv-dbr00b56e07s738n62n0`), Auto Deploy OFF. Deploy manual com limpeza de cache `dep-dbs3eqifngtc73bk4fsg` confirmado **LIVE** no commit exato `fba0511a2cbc81721fdcc92f9e40fa508da42a61`. Nenhum novo serviço.
- **Prévia sem cache:** https://meg-stage08-alerta-prism-pr685.onrender.com/meg-unificado-qa.html?visual=prism&tela=lancamentos&v=fba0511a2cbc81721fdcc92f9e40fa508da42a61
- **Aprovações/pêndencias:** Editar Despesa compartilhado já homologado visualmente anteriormente e intocado. Visual do novo micro-refino do botão Ações ainda **NÃO HOMOLOGADO** pelo responsável; CI e deploy não substituem inspeção. A integração real da edição, lote financeiro, atualização, exclusão e Nova Receita permanecem bloqueadas/pendentes na Etapa 10.
- **Restrições:** sem PATCH/DELETE, writer financeiro real, API ou banco de produção, Android, merge na main, deploy produtivo, novas instâncias Render ou avanço à Etapa 11.
- **Próximo passo exato:** responsável inspecionar botão Ações atualizado, alinhamento e menu na URL sem cache, no desktop e celular (incluindo paisagem). Registrar homologação apenas se explícita, ou corrigir pontualmente a QA conforme observação.

## Etapa 10 — Homologação visual do micro-refino de Ações (14/11/2026)

- **Aprovação explícita do responsável:** após receber o link QA do botão refinado, declarou `validado, qual a proxima etapa`. Fica **HOMOLOGADO VISUALMENTE** exclusivamente o micro-refino do botão Ações em MEG Prism 2.0 (espaçamento entre lista e seta, proporção, alinhamento), entregue no commit técnico `fba0511a2cbc81721fdcc92f9e40fa508da42a61`. Não extrapolar para homologação visual do modal Editar em lote nem dos outros fluxos não vistoriados.
- **Evidências preservadas:** Render QA `dep-dbs3eqifngtc73bk4fsg` LIVE no SHA acima; CI integrada `43585122288` SUCCESS e teste público após publicação `43585122318` SUCCESS na reexecução. PR #688 permanece Draft, sem merge. Nenhuma edição financeira real autorizada.
- **Etapa autorizada permanece 10. Próximo passo exato:** conferir visualmente, em QA, o menu de ações e sobretudo o modal Editar em lote (seleção e contagem, campos opt-in, proteção de campos financeiros, cancelar, preview e responsividade). Após aceite visual específico, continuar pela caracterização de contratos transacionais de edição individual/coletiva e respectivos testes isolados, sem writer produtivo. Nova Receita permanece item subsequente da Etapa 10. Etapa 11 não autorizada.
- **Bloqueios inalterados:** workflow legado Stage09 ainda vermelho por hash antigo da Home; não adulterar gate. Sem PATCH/DELETE, banco/API/Android/produção, novos serviços Render, merge ou deploy produtivo.


## Etapa 10 | Edição em lote expandida, QA publicada em 14/11/2026

- **Autorização explícita:** responsável aprovou a proposta de retirar o seletor amplo `Ordenar por` da grade para usar seu espaço com `Editar em lote (N)`; manter ordenação compacta no celular; ampliar leque de alterações, exigir prévia Antes → Depois, identificação de elegíveis/bloqueados, processamento financeiro exclusivamente canônico e testes antes de ativação. O responsável declarou `exatamente isso que esperava, pode seguir com toda proposta`. Isto **não** constitui homologação visual da nova versão nem autorização de ativação de PATCH/DELETE/writers reais.
- **Repositório/PR:** `MarcosVilalva/MEG-Platform`, PR #688 **Draft**, branch de desenvolvimento `stage08/unified-qa-stage05-08-10-20261112`, branch de hospedagem QA `stage08/overdue-prism-warning-20261112`. O código isolado foi publicado no commit `01e55459aa6fba813984dc047470383c80eb54ec`, branch hospedagem avançada por fast-forward sem força do código anterior `fba0511a2cbc81721fdcc92f9e40fa508da42a61`, sem PR dependente. Não houve merge na `main`.
- **Implementação Stage10 QA:** `DataGrid.tsx` e `datagrid/types.ts` ganharam slot opt-in `toolbarAction` e mantêm todas as interfaces legadas fora da QA. `LaunchesStage09.tsx` moveu `Editar em lote (N)` para a própria barra da grade; o hero retém somente Novo lançamento. `BatchEditQa.tsx` e `BatchEditQa.css` criados para modal Prism com Descrição, Observações (substituir/adicionar), Categoria, Vencimento, Forma de pagamento, Conta, Cartão, Data da compra e Parcelamento, campos opt-in, conferência individual antes/depois e razões de proteção em seleções mistas. `unified-preview.tsx` conecta apenas catálogos QA. `LaunchActionsQa.tsx` mantém o menu unitário aprovado, removido modal antigo duplicado.
- **Caracterização read-only:** `scripts/meg-stage10-batch-card-readonly.contract.test.ts` executa testes de datas canônicas (inclusive ajuste para dia útil), competência de compra e guardas de parcela paga/domínio vinculado, integrado a `.github/workflows/meg-stage08-unified-qa.yml`. Não são testes transacionais PostgreSQL e **não** validam edição real. Autoridades: `apps/api/src/modules/cards/service.ts`, `cards/routes.ts`, `finance/card-statement-canonical.ts`, `finance/service.ts`, `finance/benefit-event-mutation.ts`. O browser **não calcula** fatura, vencimento, competência, saldo ou parcelas.
- **Gates positivos confirmados:** CI integrado [run 43587853904](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43587853904) **SUCCESS**; smoke público pós-LIVE [run 43587853875](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43587853875) **SUCCESS** na reexecução, job `132427119393`. Testes de seleção de 1 e 11 registros, menu unitário, formulário de edição, campos protegidos, cartão sem cálculo local, ausência de chamada API, responsive 390/640/960/1024/1366, paisagem 820×360, 1024×450, 1366×768, 1920×1080/1200 e editor wide 1440×900/1920×1080/1200. Stage08 QA hospedagem [43588097086](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43588097086) **SUCCESS**.
- **Divergência técnica preexistente:** gate legado Stage09 [run 43588097006](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43588097006) **FAILURE**, por hash esperado `9ccb041d72088db1f071bad2c82965c564f73743` de `HomeDashboard.tsx` versus blob `781412cfeef4b72a7a95de0766c94fd17c1de239`. Mesma divergência anterior à tarefa. Nenhum guard/hashing foi alterado. Não declarar todos os gates verdes.
- **Render QA:** workspace autorizado `My Workspace` (`tea-d98k1qhkh4rs73f4sfj0`), mesmo serviço `meg-stage08-alerta-prism-pr685` (`srv-dbr00b56e07s738n62n0`); Auto Deploy OFF; deploy manual cache limpo `dep-dbs3vijbc2fs73aggcn0` **LIVE** no commit técnico exato `01e55459aa6fba813984dc047470383c80eb54ec`. Nenhum serviço novo.
- **Preview sem cache:** https://meg-stage08-alerta-prism-pr685.onrender.com/meg-unificado-qa.html?visual=prism&tela=lancamentos&v=01e55459aa6fba813984dc047470383c80eb54ec
- **Documento técnico detalhado:** `docs/MEG-STAGE10-BATCH-EDIT-READINESS-20261114.md` (escopo entregue, contratos canônicos, riscos, critérios de desbloqueio, resultados).
- **Aprovações:** Nova Despesa, Editar Despesa compartilhada e botão Ações Prism anterior continuam homologados e preservados. Novo posicionamento de Editar em lote e modal expandido **ainda NÃO HOMOLOGADOS VISUALMENTE**. Regras financeiras e writer real ainda bloqueados, inclusive cartão, baixa, vencimento, benefício, faturas, edição por lote, confirmação de pagamento, arquivamento e exclusão.
- **Próximo passo exato:** responsável inspecionar na URL sem cache o novo posicionamento na barra, ordenação compacta mobile, modal com todos os campos, seleção mista, rolagem, prévia por registro e botões; somente após manifestação explícita registrar aceite. Na sequência, ainda na Etapa 10, implementar/characterizar contrato read-only de prévia de competência/vencimento na API central em ambiente isolado, testar serialização/idempotência/rollback/auditoria com PostgreSQL descartável e obter autorização específica antes de qualquer writer financeiro. Nova Receita continua pendente na Etapa 10. Etapa 11 não autorizada.
- **Restrições preservadas:** não alterar Android, dados reais, banco/API de produção, Web homologada, Home/Shell/DataGrid fora do opt-in; não criar Render novo; não merge/deploy produtivo; não ativar API PATCH/DELETE ou pagamento; não redesenhar telas homologadas.


## Etapa 10 | Homologação visual do editor em lote ampliado (14/11/2026)

- **Aprovação explícita:** após o link sem cache da edição em lote ampliada, o responsável declarou “validado, pode segui para o proximo passo”. Ficam **homologados visualmente** o posicionamento contextual de Editar em lote na barra do DataGrid, o tratamento compacto de ordenação mobile e a aparência do modal ampliado da QA, no código técnico `01e55459aa6fba813984dc047470383c80eb54ec`. Esta homologação não valida integração financeira real, nem autoriza PATCH/DELETE, migração, merge ou deploy produtivo.
- **Evidências previamente comprovadas:** Render QA `dep-dbs3vijbc2fs73aggcn0` LIVE; CI integrado `43587853904` SUCCESS; teste público `43587853875` SUCCESS na reexecução. Workflow legado Stage09 continua vermelho por hash antigo da Home e não deve ser contornado.
- **Próximo trabalho autorizado, exclusivamente Etapa 10:** caracterizar e implementar em branch isolada contrato de prévia financeira **somente leitura**, reaproveitando domínio canônico de compra/cartão/fatura, com testes de caracterização, bloqueios seguros de vínculo/benefício e documentação. Não alterar a UI homologada nesta rodada; somente APIs e serviços internos não publicados, sem escritores ou dados de produção. Testes PostgreSQL descartáveis somente se o harness isolado estiver verificado; nenhum acesso ao banco real.
- **Etapa 11 não autorizada.** Nova Receita permanece pendente na Etapa 10. Nenhuma aprovação visual pendente da edição em lote apresentada nesta rodada.


## Etapa 10 | Gate técnico de prévia financeira read-only, 14/11/2026

- **Contexto e autorização:** responsável homologou visualmente a edição em lote na QA, e autorizou avançar ao contrato financeiro somente leitura. A homologação de UI não autoriza mutações reais. Continuar exclusivamente na Etapa 10, PR #688 Draft.
- **Auditoria de duplicidade:** encontrado contrato canônico já existente `apps/api/src/modules/finance/batch-edit-preview-read.ts` com testes `batch-edit-preview-read.test.ts` e workflow `.github/workflows/meg-stage10-financial-readonly.yml`. Uma segunda prévia experimental criada nesta rodada foi **retirada** para preservar uma fonte única. Commit técnico de consolidação: `0ed5dbed1ee94fd46bd4df7c2dbe7d87fb8747f8`.
- **O que ficou implementado:** o contrato `previewBatchCardCycle` permanece **interno e somente leitura**, consome snapshots confiáveis de domínio, valida proprietário/versão/itens, usa `cardPurchaseStatementMonth` e `cardStatementDueDate` canônicos, distingue candidatos e impedidos, informa Antes/Depois e `canWrite:false`. Não expõe endpoint nem conecta a UI. Testes acrescidos para seleção mista, proprietário divergente, lote excessivo e data inválida. Workflow integrado preservado sem teste duplicado.
- **Gates comprovados:** Stage10 PostgreSQL 17 efêmero [43591030695](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43591030695) **SUCCESS** no SHA `0ed5dbed...`. Inclui caracterização read-only, transação fictícia em banco `meg_stage10_sandbox` localhost, rollback, atomicidade, concorrência, idempotência/recibo, auditoria e preservação de centavos/competência de compras. CI integrado/Chrome [43591035954](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43591035954) **SUCCESS** no mesmo SHA. Não extrapolar os testes para todos os cenários de produção.
- **Artefatos:** `docs/MEG-STAGE10-BATCH-EDIT-READINESS-20261114.md` atualizado com análise e limites; `MEG-WEB-CONTINUIDADE-OFICIAL.md` atualizado. Não houve alteração de UI homologada, Android, produção, dados reais, writers públicos, serviço Render, nem deploy ou merge. Preview visual anterior continua LIVE no Render (`dep-dbs3vijbc2fs73aggcn0`, `01e55459aa6fba813984dc047470383c80eb54ec`). Link sem cache: https://meg-stage08-alerta-prism-pr685.onrender.com/meg-unificado-qa.html?visual=prism&tela=lancamentos&v=01e55459aa6fba813984dc047470383c80eb54ec
- **Aprovações e pendências:** botão Ações e editor em lote ampliado **homologados visualmente**. Prévia financeira interna tecnicamente testada, porém **não homologada funcionalmente na Web**: falta adaptador de leitura autenticado que consulte snapshots do workspace com autorização e versão, futura projeção na interface sem writer, caracterização de vencimentos de Payable e conversão de evento para compra de cartão, e cobertura contratual de implantação. Edição real e alteração coletiva de parcelas seguem bloqueadas. Nova Receita pendente dentro da Etapa 10. Etapa 11 não autorizada.
- **Divergência preexistente:** gate legado Stage09 ainda falha por hash anterior de `HomeDashboard.tsx`, sem relação com esta rodada. Não alterar hashes ou desabilitar proteções apenas para obter verde.
- **Próximo passo exato:** desenhar e testar adaptador server-side autenticado **somente leitura** de `previewBatchCardCycle`, sem publicar rota ou integrar UI sem novo gate e sem alterar escritores; delimitar dados/versões requeridos, privilégios do workspace e tratamento de erro seguro. Uma tarefa por vez e autorização específica para qualquer ativação de escrita.



## Etapa 10 | Prévia financeira canônica e PostgreSQL descartável, 14/11/2026

- **Visual explicitamente homologado:** Editar em lote (barra da grade, ordenação mobile e modal ampliado), conforme declaração do responsável "validado, pode segui para o proximo passo", já registrada na seção de homologação visual anterior. Nenhuma autorização de writers/merge/deploy de produção.
- **Estado técnico verificável:** commit base de consolidação `0ed5dbed1ee94fd46bd4df7c2dbe7d87fb8747f8`, PR #688 Draft, branch `stage08/unified-qa-stage05-08-10-20261112`. Domínio `cards/purchase-cycle-canonical.ts` unifica competência e distribuição de centavos da compra. O módulo interno `finance/batch-edit-preview-read.ts` é somente leitura, preserva valores/IDs das parcelas registradas, verifica proprietário, versões, vínculo, pagamento parcial e cartão ativo e nunca retorna autorização para escrita. Nenhum endpoint/hidratação real habilitado.
- **Regra duplicada tratada:** `stage10-batch-read-preview.ts`, acrescentado em paralelo, gerava projeção por total e poderia divergir de parcelas editadas individualmente; consolidado no módulo principal e removido no commit `0ed5dbed`. Testes de proteção acrescidos.
- **Gate financeiro isolado:** [GitHub Actions 43591030695](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43591030695) **SUCCESS** em PostgreSQL 17 efêmero, com atomicidade, rollback, versão/concorrência, idempotência, auditoria, compra com 3 parcelas e verificação TypeScript. **Gate integrado UI:** [43591035954](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43591035954) **SUCCESS**. Uso de PostgreSQL exclusivamente local do runner, sem conexão a produção.
- **Documento operacional detalhado:** `docs/MEG-STAGE10-BATCH-EDIT-READINESS-20261114.md`, seção "Pós-homologação visual: prévia canônica, Postgres isolado".
- **Hospedagem QA visual preservada:** Render `dep-dbs3vijbc2fs73aggcn0` LIVE no código `01e55459aa6fba813984dc047470383c80eb54ec`, sem deploy novo nesta rodada; Auto Deploy OFF. Android, API e banco reais, Home e telas homologadas preservados. Workflow legado Stage09 ainda tem pendência de hash da Home; não adulterar.
- **Próximo passo exato:** leitor de snapshots autenticado, com checagem de workspace, vínculo de origem, versão e catálogo de cartão, isolado e somente leitura; testes de autorização e zero writes. Depois avaliar integração com UI, sem habilitar writer financeiro e sem avançar à Etapa 11.


## Etapa 10 | Adaptador autenticado de prévia em lote, 14/11/2026

- **Tema e etapa autorizada:** MEG Finanças Web Evolution, exclusivamente Etapa 10 (Novo/Editar Lançamento), após homologação visual do modal de Edição em lote. Usuário autorizou o próximo passo com "SEGUIR". PR #688 Draft, branch `stage08/unified-qa-stage05-08-10-20261112`, sem merge. Etapa 11 não autorizada.
- **Implementação técnica:** `apps/api/src/modules/finance/batch-edit-preview-adapter.ts` interno, função `previewBatchCardCycleForActor` somente leitura, sem rota HTTP, sem AppState legado e sem escritores. Exige identidade do ator entregue por uma futura sessão autenticada; verifica User ACTIVE, membership ACTIVE e workspace ativo, respeitando prioridade do workspace próprio, sem chamar `ensurePrimaryWorkspace` (que poderia gerar writes). Lê compras/cartões e parcelas estritamente por `userId` do proprietário autorizado, via transação PostgreSQL `RepeatableRead`. Adapta Decimal em strings e versões reais `updatedAt` para a autoridade canônica única `batch-edit-preview-read.ts`, que sempre retorna `canWrite:false`.
- **Arquivos criados/alterados:** `apps/api/src/modules/finance/batch-edit-preview-adapter.ts`; `apps/api/src/modules/finance/batch-edit-preview-adapter.isolated.test.ts`; `.github/workflows/meg-stage10-financial-readonly.yml`; documentação detalhada `docs/MEG-STAGE10-AUTHENTICATED-BATCH-READ-ADAPTER-20261114.md`. Nenhum arquivo visual ou writer financeiro modificado.
- **Gates comprovados:** commit técnico `e7a07ee83491a2f95148309968dc1faa7de99eae`. PostgreSQL 17 descartável [run 43592296237](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43592296237) **SUCCESS**, com novo teste `MEG_STAGE10_AUTHENTICATED_BATCH_READ_ADAPTER_POSTGRES PASS`, contratos anteriores, atomicidade/concorrência/idempotência/auditoria em fixture e `tsc` da API. CI integrado/Chrome [run 43592300938](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43592300938) **SUCCESS**, regressões Prism 390/640/960/1024/1366 e paisagem/editor wide.
- **Aprovações:** aparência de Nova Despesa, Editar Despesa compartilhada, menu Ações e Edição em lote ampliada permanecem explicitamente homologadas pelo responsável. O adaptador foi validado somente tecnicamente e ainda NÃO foi exposto ou homologado funcionalmente na interface. O CI não autoriza writer.
- **Segurança e restrições:** Sem alteração ou consulta ao banco de produção; testes confinados ao PostgreSQL local descartável do runner com guarda `MEG_STAGE10_ISOLATED_PG`, e as escritas de fixture não são da função de leitura. Nenhum deploy novo no Render; QA visual homologada permanece `dep-dbs3vijbc2fs73aggcn0` LIVE no commit `01e55459aa6fba813984dc047470383c80eb54ec`, Auto Deploy OFF. Link sem cache https://meg-stage08-alerta-prism-pr685.onrender.com/meg-unificado-qa.html?visual=prism&tela=lancamentos&v=01e55459aa6fba813984dc047470383c80eb54ec . Não habilitar PATCH/DELETE, writer, merge, deploy produtivo, Android, banco real, alteração visual ou Etapa 11.
- **Divergências e pendências:** Workflow legado Stage09 ainda com falha preexistente de hash da Home, não adulterar. Ainda não há endpoint HTTP autorizado nem integração do retorno à QA, tampouco contrato para editar vencimento de Payable ou converter eventos monetários para compra com cartão. Benefício/Verocard continuam domínio separado. Prévia não reserva versão; eventual writer deve revalidar no commit.
- **Próximo passo exato:** continuar somente na Etapa 10, revisando e caracterizando contrato HTTP **somente leitura** com ator de sessão, Zod, autorização e respostas seguras em QA isolada; obter autorização própria antes de publicar rota ou ligar a UI. Nova Receita permanece pendente dentro da Etapa 10. Saúde do chat: Atenção, checkpoint atualizado antes de possível transição.



## Etapa 10 | Contrato HTTP de prévia financeira, isolado e não publicado (14/11/2026)

- **Autorização:** após o adaptador read-only aprovado, responsável declarou `AUTORIZADO` para caracterizar contrato HTTP da prévia de edição em lote, com JWT, Zod, autorização e respostas seguras, **antes** de exposição na QA. Não autorizou ativar writers, registrar rota no servidor principal, ligar modal, merge ou deploy produtivo. Etapa autorizada continua exclusivamente 10; Etapa 11 não autorizada.
- **PR/branch:** repositório `MarcosVilalva/MEG-Platform`, PR #688 Draft, branch `stage08/unified-qa-stage05-08-10-20261112`. Implementação técnica testada no commit `00ee181968a8cf1799351902c16a52439da138a7`.
- **Implementação:** `apps/api/src/modules/finance/batch-edit-preview-http-contract.ts`, módulo de contrato HTTP deliberadamente **não importado/registrado** em `apps/api/src/server.ts`. Caminho apenas reservado para teste `POST /finance/batch-edit/card-cycle/preview`; nenhum endpoint novo está ativo. JWT `request.jwtVerify` + papeis READ ADMIN/MANAGER/OPERATOR/VIEWER; POST read-only usa guard próprio pois `app.authorize` interpreta POST como WRITE. A permissão atual do membro, workspace e owner continua validada pelo adaptador `batch-edit-preview-adapter.ts` a cada leitura. Não confiar em proprietário/ator/workspace enviado por browser.
- **Contratos:** entrada Zod `.strict()`, 1–200 registros, IDs únicos, versão para compra, ISO date real e `preserve/common`; corpo limitado a 64 KiB; 60 requisições/minuto/IP por limiter atual em memória; respostas 400/401/403/429/503 sem vazamento de detalhes. Saída Zod estrita com `canWrite:false`, candidatos somente com Antes/Depois, bloqueados sem projeção e totais coerentes; falha segura se houver campos de debug/internos inesperados. Cabeçalhos `no-store`, `no-cache` e `Vary: Authorization`. Limiter não distribuído: revisão obrigatória antes de escalar/publicar.
- **Arquivos modificados/criados:** `apps/api/src/modules/finance/batch-edit-preview-http-contract.ts` e `batch-edit-preview-http-contract.test.ts` criados; `.github/workflows/meg-stage10-financial-readonly.yml` ampliado com Fastify.inject; documentação `docs/MEG-STAGE10-BATCH-PREVIEW-HTTP-CONTRACT-20261114.md`. Nenhum arquivo visual, API writer ou servidor principal modificado.
- **Gates comprovados no SHA técnico:** [financeiro / PostgreSQL descartável / TypeScript #43593729676](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43593729676) **SUCCESS**; [QA integrada navegador #43593732640](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43593732640) **SUCCESS**. Teste HTTP `MEG_STAGE10_HTTP_PREVIEW_AUTH_ZOD_RATE_READONLY PASS`. Testes de adapter com ator/VIEWER/workspace/versão e zero writes anteriores preservados. Primeiras rodadas tiveram falhas de tipagem na fixture Fastify.inject/JWT; corrigidas e gates finais verdes, sem mudanças financeiras reais.
- **Aprovações e limites:** Modal expandido, botão Ações, Nova Despesa e Editar Despesa continuam homologados visualmente; NÃO há homologação funcional de prévia via Web, pois a rota não está publicada. Sem gravação real, PATCH/DELETE, mudanças em produção/API real/banco real/Android, merge ou serviço/deploy Render novo. Render QA visual permanece `dep-dbs3vijbc2fs73aggcn0` LIVE no código `01e55459aa6fba813984dc047470383c80eb54ec`, Auto Deploy OFF; link sem cache https://meg-stage08-alerta-prism-pr685.onrender.com/meg-unificado-qa.html?visual=prism&tela=lancamentos&v=01e55459aa6fba813984dc047470383c80eb54ec
- **Divergências e pendências:** Gate Stage09 legado continua divergente por hash antigo de Home (sem adulteração). `Payable` vencimento, conversão FinancialEvent→cartão, benefícios/Verocard e writers em lote continuam em suas autoridades e não foram implementados. Rate limit multi-instância, exposição da rota somente em QA isolada, autenticação real via infraestrutura de QA e integração do modal exigem nova validação/autorização.
- **Próximo passo exato:** revisão de segurança e decisão de autorização para registrar/ativar **exclusivamente** a rota read-only em QA isolada, sem escritores e com origem de dados fictícia ou ambiente já autorizado; só depois projetar integração da resposta com modal. Não avançar para Etapa 11. Saúde do chat: Atenção, checkpoint atualizado.




## Etapa 10 | Ativação HTTP read-only somente no QA efêmero (14/11/2026)

- **Tema, autorização e objetivo:** responsável declarou "SEGUIR COM O PROXIMO" após o gate do contrato HTTP de prévia financeira. Escopo foi revisar segurança e ativar exclusivamente em QA isolada, mantendo interface homologada, dados reais, writers, Android, produção, merge e Etapa 11 intocados. PR #688 continua Draft, branch `stage08/unified-qa-stage05-08-10-20261112`.
- **Decisão da infraestrutura:** o Render QA oficialmente homologado `meg-stage08-alerta-prism-pr685` é do tipo `static_site` e não pode hospedar Fastify. Auto Deploy OFF. Read-only `list_services` encontrou outros web services com status/autorização de QA não estabelecidos; **não foram usados ou alterados**. Sem novo serviço, deploy, credencial, banco real, porta pública ou API produtiva. Usado GitHub Actions com runner temporário, PostgreSQL 17 local descartável, Fastify com bind fixo `127.0.0.1` e porta efêmera.
- **Implementado no commit técnico `f722ff104acbbac6922a4baa8d60a752a4b03571`:** `apps/api/src/modules/finance/stage10-qa-readonly-loopback.ts` ativa somente a rota `POST /finance/batch-edit/card-cycle/preview` no ambiente `NODE_ENV=test`, `MEG_STAGE10_ISOLATED_PG=1`, `MEG_STAGE10_QA_HTTP_ENABLED=1` e `DATABASE_URL` restrito a `127.0.0.1:5432/meg_stage10_sandbox?schema=public`. `stage10-qa-readonly-loopback.isolated.test.ts` usa HTTP real `fetch`, JWT sintético, fixture inventada de usuários/workspace/cartões/compras e testes de ausência de writer; `batch-edit-preview-adapter.ts` ganhou `SET TRANSACTION READ ONLY` na transação `RepeatableRead`. Workflow `.github/workflows/meg-stage10-financial-readonly.yml` ampliado. Nenhum arquivo da UI ou `server.ts` alterado.
- **Gates comprovados:** [financeiro e PostgreSQL descartável #43595159986](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43595159986) **SUCCESS** com `MEG_STAGE10_CARD_BATCH_READONLY_PREVIEW PASS`, `MEG_STAGE10_AUTHENTICATED_BATCH_READ_ADAPTER_POSTGRES PASS`, `MEG_STAGE10_HTTP_PREVIEW_AUTH_ZOD_RATE_READONLY PASS` e `MEG_STAGE10_QA_LOOPBACK_HTTP_POSTGRES_READONLY PASS`, TypeScript API verde. [QA integrada navegador #43595159996](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43595159996) **SUCCESS** com Prism, menu e editor em 390/640/960/1024/1366 e paisagem/wide. Não extrapolar os testes sintéticos para produção.
- **Segurança validada em CI:** inicialização bloqueada fora de `NODE_ENV=test`/ambiente temporário/banco localhost; só bind loopback; GET/writers/alteração em lote, pagamento e arquivamento não registrados (404); JWT ausente/inválido bloqueado; VIEWER membro autorizado lê snapshot, outsider recebe 403, campo `workspaceId` forjado e data inválida recebem 400; cálculo de competência/vencimento e preservação dos centavos seguem fonte canônica; compras, parcelas, audit logs e receipts não alterados por leituras. Operações de seed de CI somente no banco efêmero.
- **Aprovações e limites:** Nova Despesa, Editar Despesa, botão Ações e modal Editar em lote permanecem homologados visualmente e intocados. A rota está **validada funcionalmente apenas no runner CI temporário**, sem endpoint público ou integração com o modal. Não foi criado preview novo no Render. Último Render visual homologado `dep-dbs3vijbc2fs73aggcn0` em `01e55459aa6fba813984dc047470383c80eb54ec`; link sem cache https://meg-stage08-alerta-prism-pr685.onrender.com/meg-unificado-qa.html?visual=prism&tela=lancamentos&v=01e55459aa6fba813984dc047470383c80eb54ec
- **Divergências/riscos e documentação:** workflow legado Stage09 permanece vermelho por hash anterior da Home, não adulterar. Rate limit atual em memória por IP não serve como garantia multi-instância; backend QA externo necessita segregação de credenciais/DB fictício, HTTPS, CORS, JWT real, controle de acesso e autorização de infraestrutura. Domínios Payable, benefícios/Verocard, conversão de evento para cartão e writers financeiros continuam bloqueados. Documento detalhado `docs/MEG-STAGE10-QA-HTTP-READONLY-ACTIVATION-20261114.md`.
- **Restrições expressas:** sem writers/PATCH/DELETE, produção, API/banco real, Android, alteração da Web homologada, novo serviço Render sem autorização, merge, deploy produtivo ou Etapa 11.
- **Próximo passo exato:** planejar backend QA persistente **separado** (ou avaliar serviço de QA existente sem modificá-lo) e solicitar autorização específica de uso/custo/dados antes de criar ou ativar serviço. Somente após isolação real e gates seguros publicar a rota read-only e validar a integração do modal em etapa separada. Saúde do chat: Atenção; checkpoint atualizado.



## Etapa 10 | Plano de QA persistente e gate de não implantação (14/11/2026)

- **Tema, objetivo e etapa:** MEG Finanças Web Evolution, exclusivamente Etapa 10. Após aprovação do HTTP local somente leitura, responsável escreveu "seguir". Próxima tarefa: decidir arquitetura e custo da API QA persistente e preparar proteção contra uso acidental da infraestrutura produtiva. Sem autorização explícita de criação de serviço/DB, contratação ou deploy. Etapa 11 não autorizada.
- **Repositório e branch:** `MarcosVilalva/MEG-Platform`; PR [#688](https://github.com/MarcosVilalva/MEG-Platform/pull/688) Draft; branch `stage08/unified-qa-stage05-08-10-20261112`. Código/artefatos da tarefa commit `846557895d5c0063514420dc02ba699071426d34`. Não houve merge, deploy ou mudança de ambiente.
- **Inventário verificado via Render, somente leitura:** workspace `My Workspace` ID `tea-d98k1qhkh4rs73f4sfj0`, `list_services` retornou **25 serviços** (8 web services), com plano de workspace **não confirmado**; `list_postgres_instances` retornou **No Postgres instances found**. Render estático homologado `srv-dbr00b56e07s738n62n0` não executa API. `meg-platform-api` (`srv-d98k61daeets7384hvb0`) usa `main` com Auto Deploy ON e build `db:prepare:production && db:push:production`. `meg-evolution-api` e demais web services não estão autorizados para nova QA. Não tocar em nenhum deles nem deletar serviços para abrir vaga.
- **Custos/fatos oficiais consultados em 14/11/2026:** https://render.com/pricing e https://render.com/docs/free e https://render.com/docs/blueprint-spec. Render publica limite de **25 serviços Hobby**, mas plano efetivo da conta não verificado; Web Free US$ 0 e Postgres Free US$ 0 para piloto, porém PostgreSQL Free expira em **30 dias**, limite 1 GB e sem backups; web hiberna e perde disco efêmero. Postgres `0.1c-256mb` anunciado desde US$ 6/mês, web `0.5c-512mb` US$ 7/mês antes de extras. Franquias de 750 horas web Free por workspace/mês e possíveis cobranças de build/bandwidth. Não afirmar vaga nem custo zero garantido sem confirmar plano e uso reais.
- **Decisão técnica segura:** CI com PostgreSQL 17 descartável permanece QA funcional atual aprovada; não se cria infraestrutura persistente sem autorização específica e análise de custo. Recomendada futura API QA em serviço separado com Auto Deploy OFF, JWT/DB sintéticos próprios, TLS/CORS restritos e sem writers. Não reutilizar `render.yaml` raiz, pois define API produtiva e comandos `db:push:production`. Não conectar a UI homologada a endpoint inexistente.
- **Arquivos criados/alterados:** `docs/MEG-STAGE10-QA-PERSISTENT-INFRA-DECISION-20261114.md` plano com alternativas, limites, riscos e próximos gates; `docs/MEG-STAGE10-QA-PERSISTENT-INFRA-PROFILE-20261114.json` perfil machine-readable `DESIGN_ONLY_NOT_AUTHORIZED_FOR_DEPLOY` com flags de proibição `false`; `scripts/meg-stage10-qa-persistent-infra-preflight.mjs` gate estático fail-closed; `.github/workflows/meg-stage10-financial-readonly.yml` executa o gate. Nenhuma alteração em `server.ts`, `render.yaml`, UI, Android, writers, serviço ou dados reais.
- **Gates comprovados:** [GitHub Actions financeiro #43596856124](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43596856124) **SUCCESS**, incluindo `MEG_STAGE10_QA_LOOPBACK_HTTP_POSTGRES_READONLY PASS`, `MEG_STAGE10_HTTP_PREVIEW_AUTH_ZOD_RATE_READONLY PASS`, `MEG_STAGE10_QA_PERSISTENT_INFRA_PREFLIGHT PASS` e TypeScript API. [QA integrada #43596860666](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43596860666) **SUCCESS**, Prism e ações da Etapa 10 nas larguras 390/640/960/1024/1366, wide 1440/1920. Gate legado Stage09 tem divergência histórica de hash da Home, não mexer nem declarar todos os gates verdes.
- **Aprovações:** Nova Despesa, Editar Despesa, botão Ações e modal Editar em lote continuam explicitamente homologados **visualmente** na última QA estática. A prévia financeira canônica validada via HTTP no CI descartável não está publicada ou homologada funcionalmente no navegador. Render visual autorizado permanece deploy `dep-dbs3vijbc2fs73aggcn0` no código `01e55459aa6fba813984dc047470383c80eb54ec`, Auto Deploy OFF. Link sem cache: https://meg-stage08-alerta-prism-pr685.onrender.com/meg-unificado-qa.html?visual=prism&tela=lancamentos&v=01e55459aa6fba813984dc047470383c80eb54ec
- **Pendências e riscos:** plano de workspace e limites efetivos não conferidos; nenhuma vaga livre identificada no inventário de 25 serviços; necessidade de ambiente dedicado (ou novo workspace aprovado), escolha entre piloto Free de 30 dias e Postgres pago duradouro, confirmação de orçamento/quotas, segredo JWT distinto, banco fictício isolado, limitação de requisições, CORS, auditabilidade, rollback e teardown. Preflight apenas estático, não substitui infraestrutura. Conversão FinancialEvent→cartão, Payable vencimento, Verocard/benefícios, writers de lote e demais fluxos ainda bloqueados.
- **Restrições/ações proibidas:** não criar/deletar recursos Render sem autorização específica, não usar API/banco reais ou restaurados, não importar MEG reais, não alterar `render.yaml` produtivo, Android, Web homologada, main, merge/deploy produtivo, habilitar escritores ou avançar à Etapa 11. Preservar gates históricos e PRs/branches existentes.
- **Próximo passo exato:** confirmar a alternativa de infraestrutura e aprovação expressa de recursos/custos/slot ou workspace. Até lá manter somente QA efêmera comprovada. Após aprovação, preparar entrypoint específico da API QA com banco sintético e deploy manual sem reutilizar `server.ts`, `render.yaml` ou serviço produtivo. Não registrar rota pública antes dos novos testes.
- **Texto de retomada:** "Continuar MEG Web Evolution exclusivamente na Etapa 10, PR #688 Draft, branch stage08/unified-qa-stage05-08-10-20261112. Ler MEG-WEB-CONTINUIDADE-OFICIAL.md e docs/MEG-STAGE10-QA-PERSISTENT-INFRA-DECISION-20261114.md. O inventário Render registrou 25 serviços e zero PostgreSQL; plano/custos ainda sem autorização. Commit técnico 846557895, gates 43596856124 e 43596860666 SUCCESS. Proibidos produção, Android, merge, writers e mudanças visuais. Próximo passo é resolver autorização de infraestrutura QA persistente com dados fictícios e custos claros, sem presumir vagas ou ativar serviços." 


## Etapa 10 | Retomada: orçamento revisado, sem provisionamento (14/11/2026)

- PR #688 Draft confirmado no head `349e813b9aba45f9e3420651e33aae188a461e17`; inventário Render permanece com 25 serviços (17 estáticos, 8 web), zero PostgreSQL. Nenhum recurso alterado.
- Documento `docs/MEG-STAGE10-QA-PERSISTENT-INFRA-DECISION-20261114.md`, seção 7, detalha orçamento corrigido: API Free + PostgreSQL mínimo pago com 1 GB = US$ 6,30/mês antes de extras; API paga + DB = US$ 13,30/mês. Eventual Pro acrescenta US$ 25/mês. Novo workspace não é alternativa gratuita confirmada.
- Plugin não informa plano faturado; Dashboard sem sessão, na tela de login. Capacidade/uso/plano permanecem sem confirmação. Nenhum login ou contratação executado.
- Proposta NÃO APROVADA: teto incremental sugerido US$ 8/mês para API Free e banco sintético pago, somente se houver capacidade no plano existente; sem upgrade de plano, excedentes autorizados ou integração da UI. Teto não é bloqueio técnico de faturamento. Se capacidade faltar, nova decisão é obrigatória.
- Isolamento proposto reforçado: papel runtime SELECT sem DDL/writes, preparação de schema/fixtures separada, banco sem acesso externo, JWT próprio, Auto Deploy OFF, serviço novo sem importar server.ts ou writers. Nenhuma implementação/deploy nesta revisão documental.
- Homologações visuais preservadas; nenhum novo preview. Gates financeiros/visuais anteriores não repetidos por não haver alteração de código. Preflight estático `MEG_STAGE10_QA_PERSISTENT_INFRA_PREFLIGHT` PASS e `git diff --check` sem erros nesta revisão. Pendência Stage09 histórica mantida.
- Próximo passo exato: aprovação específica do orçamento/recursos e confirmação autenticada do plano e capacidade antes de criação; depois preparar rede restrita em branch isolada. Produção, Android, merge, escritores financeiros, UI homologada e Etapa 11 proibidos.


## Etapa 10 | Limpeza Render autorizada e verificada (14/11/2026)

- Responsável autorizou auditoria/limpeza Render e confirmou especificamente "sim" para exclusão definitiva de `meg-pr648-visual-preview`, ID `srv-dbgh9dui0phs73aloha0`.
- Serviço estático histórico da PR #648 excluído pelo Dashboard. Painel retornou Active (24), All (24); inventário independente via plugin confirmou 24 serviços e ausência do ID eliminado. Uma vaga liberada, sem criação de recursos.
- Auditoria anterior: checkpoint já indicava esse preview como primeiro candidato; sem referências encontradas na busca por nome/ID em .github, apps, scripts e docs, exceto o registro de limpeza; sem custom domain no painel. Código/branch GitHub não excluídos.
- Plano confirmado no Billing autenticado: Hobby, limite 25 serviços, sem cartão cadastrado, cobranças acumuladas US$ 0; uso observado 203,22/750 horas Free, 2,65/5 GB de banda e 299/500 minutos de pipeline. Valores são fotografia da consulta, não garantia futura.
- `meg-platform-api`, `meg-evolution-api` e QA homologada `srv-dbr00b56e07s738n62n0` permanecem no inventário. Nenhum outro serviço alterado. Não se afirma teste funcional de produção, que não foi acessada.
- Demais candidatos históricos preservados: alguns ainda são alvos de workflows; Home PR #655 possui registro de homologação histórica. Exigem conferência própria antes de exclusão. Não presumir que todos são descartáveis.
- Próximo passo da infraestrutura: verificar capacidade necessária para API e DB e obter aprovação específica de criação/custos; limpeza não autoriza contratação, banco pago, deploy ou integração de UI. Orçamento sugerido anteriormente continua sem aprovação. Produção, Android, merge, escritores financeiros e Etapa 11 continuam proibidos.


## Etapa 10 | Fonte real autorizada, integração ainda pendente (14/11/2026)

- Responsável corrigiu a direção: uma única preview consolidada até futura main, sem contratação e sem banco temporário como solução definitiva. Determinou uso da base real para fundamentar toda implementação.
- Consulta autorizada somente leitura à base meg-financas e workspace do responsável comprovou: 3738 FinancialEvent (3731 ativos), 3630 AppState.transactions, 2 contas, 4 cartões, 21 CardPurchase e 0 Payable. AppState em normalized-primary. Não somar representações nem confundir Payable vazio com ausência de compromissos.
- 3512 eventos ativos preservam forma de pagamento/histórico em sourcePayload sem paymentMethodId. Não inventar vínculos ou migrar dados. Leitor operacional existente já trata rótulos históricos. Verocard permanece benefício.
- Documento docs/MEG-STAGE10-REAL-DATA-READ-AUDIT-20261114.md registra escopo, consultas e contratos, sem exportar registros privados.
- Integração NÃO implementada: unified-preview.tsx ainda usa fixtures, login demonstrativo e bloqueio total de fetch. Prévia canônica de ciclo atual cobre CardPurchase, sem converter FinancialEvent. Não declarar dados reais exibidos na QA.
- Próximo passo: ponte autenticada de leitura reutilizando clientes/snapshots existentes, sem efeitos colaterais, mesma QA, sem segredos frontend ou dados reais em assets. Auditar fallback ensurePrimaryWorkspace nos GETs; não presumir read-only apenas pelo verbo HTTP. Sem alterações de banco, CORS produtivo, writers, Android, merge ou Etapa 11.


---

## Atualização Etapa 10 — leitura real isolada (14/11/2026)

- Escopo autorizado: Etapa 10 apenas, PR #688 Draft e preview única Prism. Não iniciar Etapa 11, não alterar Android, não habilitar writers, não migrar dados, não contratar banco, não alterar produção/CORS nem efetuar merge/deploy sem gates e aprovações.
- Base de referência: commit `3757303c94fe4fe68c03c515a9dd7d0273086884` na branch `stage08/unified-qa-stage05-08-10-20261112`.
- Branch de trabalho: `stage10/real-data-read-integration-20261114`. A ponte `stage10/real-data-read.ts` e o componente `stage10/UnifiedRealReadQa.tsx` são opt-in, desabilitados por padrão na preview publicada; ainda não constituem integração funcional homologada.
- Correção aplicada: seleção de histórico respeita `historySnapshotV1`; quando o servidor não anuncia a capacidade, usa `readAuthorizedHistory`, com paginação e dupla leitura integralmente verificadas.
- Resolução estritamente consultiva de workspace criada em `apps/api/src/modules/finance/stage10-readonly-workspace.ts`; tem transação SQL READ ONLY e não chama `ensurePrimaryWorkspace`. Não foi conectada às rotas existentes nem implantada.
- Testes estáticos de contrato estendidos em `scripts/meg-stage10-real-data-read.contract.test.mjs`; a compilação, CI e teste real no navegador ainda requerem comprovação de execução e resultado.
- Bloqueio remanescente: rotas GET usadas na leitura financeira ainda transitam por `resolveWorkspaceContext`, cujo fallback pode escrever. Não liberar origem real/CORS ou ativar flag na preview enquanto não houver caminho autenticado comprovadamente sem escrita, seguido de testes de isolamento, sessão, versão, falha segura e CORS.
- Estado da preview pública: visual anterior preservado, dados demonstrativos no caminho padrão, sem nova publicação nesta atualização. Nenhuma gravação financeira ou banco de produção alterado nesta rodada.
- Próximo passo: conectar a resolução consultiva a contratos de leitura próprios, sem alterar os GETs legados; executar gates de tipos, integração e navegador, verificar CORS/sessão e só então avaliar deploy na preview única para validação funcional explícita.


## Etapa 10 | Ponte autenticada de leitura preparada e bloqueada por segurança (14/11/2026)

- **Objetivo e autorização:** leitura dos dados reais de `meg-financas` na **mesma** QA estática unificada, sem banco novo/temporário, custos, writers, mudanças em Android, produção, CORS, `main` ou Etapa 11. A autorização de leitura **não** permite mutar dados reais por GETs com efeitos colaterais.
- **Base e continuidade:** branch oficial `stage08/unified-qa-stage05-08-10-20261112`, PR #688 **Draft** e último head `3757303c94fe4fe68c03c515a9dd7d0273086884` preservados. Criada remotamente a branch isolada `stage10/real-data-read-integration-20261114` a partir desse commit. Não houve merge.
- **Implementação preparada:** adaptador frontend em `stage10/real-data-read.ts`, componente isolado `stage10/UnifiedRealReadQa.tsx`, entrada condicional no mesmo `integrated-qa/unified-preview.tsx`. Leitores `HomeDashboard.readHome`, `OperationalLaunches.buildReadOnlyData`, `authorized-history`, `auth-client` e `finance-client` reaproveitados. IDs reais preservados, autocomplete sem copiar valor/data, campos históricos como rótulos, conta benefit distinta de monetary, sem promover Verocard a CreditCard ou FinancialEvent a CardPurchase. `EditExpensePreview` recebeu `strictReferences` para proibir inferência de conta e método pelo nome. UI demo e bloqueio de rede padrão preservados; writers financeiros desabilitados.
- **Defesa adicional:** modo `?dados=reais` exige feature flag, origem de API HTTPS e, **antes de GET financeiro**, atestado autenticado da rota ainda não implantada `/finance/stage10-readonly-capability` com identidade, workspace, `canRead=true`, `canWrite=false`, `sideEffects=none`. Sem contrato ou em qualquer falha, **nenhum resultado real/parcial é exibido**, sem substituir por fixture.
- **Backend investigado:** `resolveWorkspaceContext` das rotas GET existentes pode chamar `ensurePrimaryWorkspace`, que executa writes. Adaptador `stage10-readonly-workspace.ts` criado na branch em transação `READ ONLY` / `RepeatableRead` sem fallback mutável, **ainda não ligado às rotas**. A configuração CORS versionada da produção não inclui o Render QA. O site de QA é estático, sem proxy Fastify. Não alterar CORS/serviços de produção para contornar o bloqueio.
- **Testes:** `scripts/meg-stage10-real-data-read.contract.test.mjs`, `scripts/meg-stage10-real-read-gate.browser.mjs` e workflow `meg-stage10-real-read-integration.yml`. Execução [#43602553746](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43602553746) **SUCCESS** (gate estático, TypeScript, Vite e Playwright), antes de acrescentar a exigência do atestado; commits posteriores demandam CI atualizado. O gate Stage09 de hash histórico continua pendente; não declarar conjunto global verde.
- **Aprovações:** permanecem as homologações visuais anteriores de Home, Lançamentos, Nova/Editar Despesa, Ações e lote. **Não** existe homologação funcional de dados reais. Nenhuma nova publicação. Render `srv-dbr00b56e07s738n62n0` e último deploy visual `dep-dbs3vijbc2fs73aggcn0` preservados. Link da QA homologada, **ainda fictícia**: https://meg-stage08-alerta-prism-pr685.onrender.com/meg-unificado-qa.html?visual=prism&tela=lancamentos&v=01e55459aa6fba813984dc047470383c80eb54ec
- **Arquivos e evidência detalhada:** `docs/MEG-STAGE10-REAL-DATA-READ-AUDIT-20261114.md`; diff de branch novo contém apenas módulos Stage10 e pequenos ajustes de tipagem Web, QA e documentos. Nenhum dado real, token ou segredo foi enviado a fixtures, bundle, Git, CI ou Render.
- **Pendências e riscos:** projetar e testar backend estritamente consultivo para todas as rotas reais consumidas e a rota de atestado; garantir origem CORS autorizada, sessão real e isolamento por workspace sem writes; validar API/versão/retorno em navegador autenticado; revisar gates totais; publicar a **mesma** preview e obter homologação funcional explícita. Sem esses gates, não ativar a flag, fazer deploy real, merge ou avançar Etapa 11.
- **Próximo passo exato:** avançar no contrato backend **somente em branch de desenvolvimento**, com testes sintéticos de transação read-only e matriz de permissões; resolver formalmente a origem QA e o deploy autorizado, sem alterar produção silenciosamente. A publicação e o merge continuam bloqueados.
- **Saúde do chat:** Normal no marco inicial deste trabalho; reavaliar ao crescer o histórico de testes/integrações.


### Continuação de 14/11/2026 — endpoint isolado da Etapa 10

- Criado `withStage10ReadOnlyWorkspace` em `apps/api/src/modules/finance/stage10-readonly-workspace.ts`, mantendo autenticação do ator, precedência do workspace próprio, verificação de associação ativa e consultas na mesma transação PostgreSQL `SET TRANSACTION READ ONLY` / `REPEATABLE READ`. Sem criação automática de workspace.
- Adicionado `apps/api/src/modules/finance/stage10-readonly-routes.ts`, registrado exclusivamente como `GET /finance/stage10-readonly/snapshot` em `finance/routes.ts`. Rota autenticada com papéis de leitura existentes, `Cache-Control: private, no-store`, limite explícito de 5.000 eventos, escopo pelo proprietário do workspace; retorna histórico, contas, categorias, formas de pagamento e cartões, `canWrite:false`, sem exportação do `ImportedRow.rawData` bruto. A rota não gera totais, saldos ou faturas fora da autoridade financeira.
- GETs produtivos anteriores e `resolveWorkspaceContext` permanecem intocados; nenhum deploy, CORS, segredo ou banco real foi alterado.
- Contratos estáticos adicionados em `scripts/meg-stage10-real-data-read.contract.test.mjs` para exigir rota autenticada, transação consultiva compartilhada e ausência de exportação de rawData. Execução de CI/build/API/PostgreSQL e testes de navegador ainda NÃO comprovada nesta rodada.
- Bloqueio crítico atual: a preview Web continua sem leitura funcional real, pois `loadStage10RealRead` ainda exige `/finance/stage10-readonly-capability` não implementado e depende dos GETs legados de Home/resumos que podem passar pelo fallback com escrita. Não habilitar a flag nem afirmar integração.
- Próximo passo: criar um adaptador Web para consumir somente a rota isolada e conectar resumos da Home exclusivamente através de read models canônicos executáveis sob transação READ ONLY, com testes reais; manter todos os escritores desligados e não publicar sem gates e autorização de origem.


### Continuação Etapa 10 — snapshot financeiro canônico e UI real de Lançamentos (14/11/2026)

- Branch de trabalho: `stage10/real-data-read-integration-20261114`. Base originária: `3757303c94fe4fe68c03c515a9dd7d0273086884`. PR #688 permanece Draft na branch oficial, sem merge deste delta.
- A rota opt-in `GET /finance/stage10-readonly/snapshot?month=YYYY-MM` usa `withStage10ReadOnlyWorkspace` na mesma transação PostgreSQL `SET TRANSACTION READ ONLY` / `REPEATABLE READ`, com ator autenticado e associação ativa ao workspace, eventos ativos limitados a 5.000, catálogos reais, resumo e fluxo de caixa das funções canônicas, sem `ImportedRow.rawData` bruto. Sua montagem continua condicionada a `MEG_STAGE10_REAL_READ_API_ENABLED === 'true'`; não habilitada em produção.
- `getCanonicalFinancialSummary` e `getCanonicalFinancialCashflow` receberam argumento opcional `db`, mantendo o comportamento antigo quando omitido; a rota isolada passa o transaction client para impedir escape à conexão de leitura.
- A Web de QA opt-in consome somente o snapshot isolado, autenticado, sem requisições aos GETs financeiros legados. Valida protocolo, ator, workspace, total e unicidade dos IDs, identidade atual e mês do resumo. Não inventa token de revisão a partir de contagem; a própria transação oferece o snapshot consistente.
- Novo/Editar/Duplicar Despesa no modo real continuam sem writers. Autocomplete recebe histórico real, cadastros mantêm IDs reais; sem fallback silencioso para fixture. A Home real foi bloqueada de modo explícito até a conclusão dos contratos de benefícios, faturas e compromissos; Home demonstrativa previamente homologada não foi modificada.
- Workflow isolado do commit `5870b37e7c187865bbfee64d6de2c9b64e678216`: SUCCESS confirmado no job 132474295951 (run 43603904741). Passaram contrato fail-closed, geração do Prisma, build/typecheck API, typecheck Web, build unificado e navegador da QA demonstrativa. Isto NÃO constitui E2E real com credenciais/HTTP/PostgreSQL nem homologação visual/funcional.
- Nenhuma credencial, dado real, custo, mudança em produção, CORS, banco, Android, Render ou main nesta rodada. Não declarar integração real no navegador homologada: o endpoint ainda não foi implantado e o fluxo real não foi validado contra a base de produção.
- Próximo passo: concluir gate browser, testes de HTTP/JWT e PostgreSQL descartável com isolamento/negação de escrita, validar origem e sessão. Implementar leitura canônica restante da Home sem reabrir Etapa 11. Somente então considerar atualização da mesma preview e aprovação funcional explícita.


### Etapa 10 — HTTP/JWT PostgreSQL 17 e navegador autenticado sintético (14/11/2026)

- Trabalhado somente na branch isolada `stage10/real-data-read-integration-20261114`, ligada à Etapa 10/PR #688 Draft; sem merge na `main`, sem alteração do Android e sem deploy de API ou da preview.
- Criado `apps/api/src/modules/finance/stage10-readonly-http.pg.test.ts`, usando PostgreSQL 17 temporário do GitHub Actions, banco `meg_stage10_test` exclusivamente sintético e mini-instância Fastify com JWT; o servidor completo da API NÃO é iniciado, pois suas tarefas de manutenção poderiam escrever. Nenhum dado, segredo ou credencial real entra no CI.
- O teste HTTP comprova: autenticação obrigatória (401), query de mês inválida (400), proprietário A acessa somente seu workspace, proprietário B não recebe eventos de A, resumo e fluxo usam autoridade canônica, `Cache-Control: private, no-store`, tentativa de `INSERT` em transação `READ ONLY` recusada pelo PostgreSQL, usuário inativo 403 e escopo financeiro cruzado rejeitado com 409 sem expor dados.
- Criada verificação Playwright sintética `scripts/meg-stage10-real-read-browser.synthetic.mjs` com login simulado, API `qa-api.example.invalid` interceptada no próprio navegador, sem chamadas de rede a APIs reais. HTTP local simples não satisfazia o gate HTTPS: corrigido criando servidor HTTPS local com certificado descartável, sem reduzir a proteção da aplicação.
- Identificado CSP original `connect-src 'self'` em `apps/web/meg-unificado-qa.html`. `apps/web/vite.stage08-funcional-qa.config.ts` foi ajustado para permitir APENAS origem HTTPS explicitamente configurada na build opt-in com `VITE_MEG_STAGE10_REAL_READ_ENABLED=true`; build demonstrativa padrão mantém `connect-src 'self'`. Ambos os contratos são verificados no CI. Não houve modificação de CORS produtivo.
- Gate isolado completo: SUCCESS para o commit `afcfa9afa67c941fb77db865eb4a21151b8bddbc`, GitHub Actions run `43616779405`, job `132513463732`. Incluiu teste estático fail-closed, geração Prisma, build TypeScript API, HTTP JWT com PostgreSQL descartável, typecheck Web, build opt-in, CSP, Playwright autenticado com resposta sintética, build padrão e regressão visual/browser da QA demonstrativa.
- A leitura real pelo navegador em infraestrutura publicada permanece PENDENTE: API isolada não foi implantada, a origem HTTPS real não foi aprovada no CORS, e a mesma preview Render NÃO foi atualizada. O green no CI prova somente integração funcional isolada e sintética, NÃO homologa dados reais ou comportamento visual no serviço publicado. Não inventar token, nem criar fixtures com dados reais.
- Home real permanece explicitamente bloqueada até leitura canônica de benefício, cartões e compromissos; Lançamentos reais estão ligados no código ao único snapshot autenticado, mas ainda não publicados. Escritores financeiros bloqueados. Verocard segue benefício, não CreditCard; nenhuma inferência de CardPurchase a partir de FinancialEvent.
- Próximo passo seguro: localizar e verificar a origem da API existente e a sessão/CORS efetivos, sem expor segredos. Avaliar como disponibilizar o endpoint isolado apenas no ambiente QA aprovado, sem alterar produção silenciosamente, custos, novos bancos ou novos previews. Validar dados reais por sessão autenticada no mesmo serviço visual somente depois de confirmar isolamento de origem e versão; obter homologação funcional explícita antes de qualquer integração na `main`.


### Etapa 10 — infraestrutura existente e pré-condições reais de escopo (14/11/2026)

- Pesquisa somente leitura no Render, workspace anteriormente autorizado `My Workspace` (`tea-d98k1qhkh4rs73f4sfj0`): preview única `meg-stage08-alerta-prism-pr685`, ID `srv-dbr00b56e07s738n62n0`, `static_site`, branch `stage08/overdue-prism-warning-20261112`, deploy automático OFF; URL `https://meg-stage08-alerta-prism-pr685.onrender.com`. Não ocorreu mudança de Render.
- API existente: `meg-platform-api`, ID `srv-d98k61daeets7384hvb0`, `web_service`, branch `main`, deploy automático ON, URL `https://meg-platform-api.onrender.com`. Outros web services vistos acompanham `main` ou branches históricas; nenhum foi considerado QA backend isolado autorizado. NÃO ativar `MEG_STAGE10_REAL_READ_API_ENABLED` nesse serviço sem autorização produtiva expressa, testes de segurança e contrato CORS. Não criar serviço adicional, custo ou ambiente temporário.
- Supabase projeto real `meg-financas` (`ugbiqzaqnrhulhetevby`): agregações SQL exclusivamente SELECT, sem nomes, IDs de usuário, registros pessoais ou valores individuais. Resultado na verificação: 6.576 eventos no total, 3.731 ativos; zero ativos com `workspaceId` ou `userId` nulos; exatamente um workspace/proprietário com eventos ativos. Verificações correlacionadas: workspace ativo e pertencente ao proprietário, um workspace ativo por proprietário, nenhum evento ativo em workspace cruzado, nenhuma identidade de proprietário cruzada. Esses dados atendem à guarda de exclusividade do novo snapshot no estado consultado, mas não representam E2E publicado nem garantia imutável.
- Teste de CORS acrescentado em `apps/api/src/modules/finance/stage10-readonly-http.pg.test.ts`: simula preflight da URL exata da preview única e origem hostil, com PostgreSQL sintético; sem alterar CORS real. A implantação do backend continua bloqueada até ambiente isolado/reutilização explicitamente autorizada. Não inventar o valor de `CORS_ORIGINS` do ambiente produtivo.
- Dependência de arquitetura verificada: Render static_site não executa o Fastify. Sem endpoint de QA autorizado, a nova rota não está acessível pela preview, mesmo com Web/CSP testados. Nenhum deploy da API ou da preview foi realizado.
- Próximo passo: aguardar conclusão do gate completo de CORS e registrar resultado. Após isso, propor via autorização específica um caminho de backend QA utilizando infraestrutura EXISTENTE que não exponha a API produtiva; somente com deploy isolado, autenticação, CORS restrito e validação funcional poderá ativar dados reais na preview única. Manter Home real bloqueada e PR #688 Draft.


### Etapa 10 — redução do payload histórico da leitura real (14/11/2026)

- Implementado `apps/api/src/modules/finance/stage10-source-details.ts`, extrator de rótulos históricos por allowlist. Lê internamente os campos de `ImportedRow.rawData` ou `FinancialEvent.sourcePayload`, normaliza nomes das chaves e fornece somente os campos `sourceDetails` já exibidos pela grade e rótulos `category`/`paymentMethod` legados, sem inferir/vincular IDs financeiros.
- Atualizado `apps/api/src/modules/finance/stage10-readonly-routes.ts`: `ImportedRow.rawData` consultado exclusivamente na transação `READ ONLY`; não é exportado. O `sourcePayload` bruto não segue para o browser. A resposta recebe a projeção estritamente destinada à exibição, preservando `sourceRowNumber`, contas/categorias/métodos por IDs reais e as funções canônicas de resumo/cashflow.
- Expandido teste HTTP+JWT/PostgreSQL descartável em `stage10-readonly-http.pg.test.ts` com atributos sintéticos de importação, checando rótulos legados e ausência de campo arbitrário/nested token no JSON HTTP. Atualizado o contrato estático `scripts/meg-stage10-real-data-read.contract.test.mjs` para exigir allowlist e inexistência de `sourceRawData` bruto.
- Gate aprovado: commit técnico `91327327d77c7abc6de8db2bb2d8955733b9bf00`, GitHub Actions `43618225249`, job `132517875227`, resultado SUCCESS. Confirmados testes de contrato, Prisma, typecheck API e Web, PostgreSQL/JWT/CORS sintéticos, build opt-in/CSP, navegador autenticado sintético, build demonstrativa e regressão do navegador de QA.
- Alterações apenas na branch isolada da Etapa 10. Sem publicar API/preview, sem ativar flags, sem alterar produção/Supabase, Render, Android ou `main`. PR #688 continua Draft, preview oficial preservada. Dados reais no browser ainda NÃO homologados.
- Próximo passo técnico: preparar/aprovar backend QA realmente isolado na infraestrutura existente sem impactar a API `main`; confirmar autenticação/CORS/configuração externa e executar E2E somente leitura com dados reais sob autorização. Home real segue bloqueada até os demais modelos canônicos.


### Etapa 10 — autorização compartilhada, limite de histórico e UX fail-closed (14/11/2026)

- Branch exclusiva da Etapa 10: `stage10/real-data-read-integration-20261114`. PR #688 continua Draft e ainda NÃO recebeu esta branch. Preservar `main`, Web homologada, Android congelado, banco produtivo e preview Render existente. Nenhum deploy, merge, trigger de serviço Render ou operação Supabase produtiva nesta rodada.
- Ampliação de `apps/api/src/modules/finance/stage10-readonly-http.pg.test.ts`: verifica ator de workspace compartilhado (VIEWER ativo) com leitura dos eventos exclusivos do proprietário, bloqueio 403 quando a associação é revogada, bloqueio 403 a usuário ativo sem membership e negativa de vazamento de eventos de workspace alheio. Também gera 5.000 eventos adicionais sintéticos em PostgreSQL 17 descartável, exige `kind=stage10-financial-history-limit-v1` para total 5.001 e confirma que a resposta não publica eventos, resumo ou histórico truncado.
- `apps/web/src/meg-web-evolution/stage10/real-data-read.ts` passou a reconhecer e validar explicitamente o protocolo de excesso de histórico, com mensagem clara e bloqueio integral de dados parciais (limite 5.000). Não atribui novos totais, não calcula valores financeiros, não recorre a fixtures.
- `scripts/meg-stage10-real-read-browser.synthetic.mjs` agora realiza dois fluxos no navegador HTTPS isolado: leitura autenticada válida com evento sintético e posterior login/requisição retornando o limite 5.001, que apresenta aviso de bloqueio, não retém evento antigo nem selo de dados carregados. O teste foi corrigido para verificar a mensagem como string literal, sem regex incorreta.
- **CI final da implementação** `bf72c9782f010d1767d0cd39c0e296cafdd0fa8c`: GitHub Actions run `43619215088`, job `132520852326`, **SUCCESS** confirmado. Passaram contratos fail-closed, TypeScript API/Web, PostgreSQL JWT/CORS/membership/volume, build opt-in, HTTPS Playwright sintético, CSP, build demonstrativa e regressão de navegador original. Uma execução intermediária falhou somente por regex incorreta do novo teste; corrigida e repetida integralmente até verde.
- Os testes realizados NÃO comprovam endpoint publicado nem leitura autenticada com dados reais. O endpoint continua ausente da API produtiva `meg-platform-api` (`main`). Sua implantação exige ambiente backend QA isolado autorizado, origem CORS específica, configuração de sessão e homologação funcional visual. A Home real segue bloqueada por contratos canônicos pendentes. Nenhuma etapa 11 autorizada.
- Próximo passo exato: verificar possibilidade técnica e autorização de reutilização segura de backend QA EXISTENTE, sem criar serviços/custos; antes de qualquer alteração produtiva ou publicação de dados reais, estabelecer gates e obter autorização expressa. Continuar consolidando Etapa 10 sem tocar em outras etapas.
