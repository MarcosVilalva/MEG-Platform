# MEG WEB NEXT — INVENTÁRIO E REMOÇÃO DE LEGADO

> Documento temporário. Deve diminuir conforme a reconstrução avança.
> Um item só permanece aqui se ainda houver consumidor ativo não migrado.

## 1. Diagnóstico confirmado

O Web atual possui múltiplas gerações visuais carregadas simultaneamente. Isso permite que regras antigas continuem alterando layout, z-index, overflow, tamanhos e responsividade mesmo quando uma camada mais nova tenta sobrescrevê-las.

Sintomas observados em produção:
- comportamento diferente da sidebar entre telas e larguras;
- elementos/pseudo-elementos decorativos escapando do contexto;
- densidade e tipografia inconsistentes;
- telas de gerações visuais distintas;
- grandes áreas vazias e compressões inesperadas;
- necessidade de sobrescritas sucessivas para neutralizar CSS anterior.

## 2. Imports visuais atualmente ativos em PhoenixWebStyles.ts

### Legado/ponte que ainda existe
1. `phoenix-v15.css`
2. `phoenix-parity-v15.css`
3. `phoenix-period.css`
4. `phoenix-sidebar.css`
5. `phoenix-operational-mobile.css`
6. `phoenix-home-period-mobile.css`
7. `phoenix-home-fidelity-v12.css`
8. `phoenix-home-fidelity-v13.css`
9. `phoenix-layers.css`
10. `phoenix-screens.css`
11. `phoenix-home-now.css`
12. `phoenix-users.css`
13. `phoenix-settings.css`
14. `phoenix-decision-center.css`
15. `phoenix-web-screens.css`
16. `phoenix-overlays.css`
17. `phoenix-grid.css`
18. `phoenix-launch-editor-polish.css`

Baseline permitido: **18 imports Phoenix visuais**. Esse número pode diminuir, nunca aumentar.

### Camadas transitórias MEG Web
- `meg-web-2026.css`
- `meg-web-shell-revolution.css`
- `meg-web-home-revolution.css`
- `meg-web-movements-revolution.css`
- `meg-web-cards-revolution.css`
- `meg-web-payables-benefit-revolution.css`
- `meg-web-reports-revolution.css`
- `meg-web-cashflow-revolution.css`
- `meg-web-board4-reports-cashflow.css`
- `meg-web-board4-planning-goals.css`
- `meg-web-home-board1-fidelity.css`

Essas camadas NÃO são destino final. Serão removidas tela a tela quando Web Next assumir as respectivas rotas.

## 3. Arquivos de alto risco visual identificados

### Home
- `phoenix-home-fidelity-v12.css`
- `phoenix-home-fidelity-v13.css`
- `phoenix-home-now.css`
- `phoenix-home-dashboard.css`
- `phoenix-home-hero-v2.css`
- `meg-web-home-revolution.css`
- `meg-web-home-board1-fidelity.css`

### Cartões
Há várias gerações simultâneas:
- `phoenix-cards-fidelity-v6.css`
- `phoenix-cards-mobile-v2.css`
- `phoenix-cards-mobile-v7.css`
- `phoenix-cards-mobile-v8.css`
- `phoenix-cards-premium.css`
- `phoenix-cards-responsive-v61.css`
- `phoenix-cards-wow.css`
- `meg-web-cards-revolution.css`

### Lançamentos / overlays
- `phoenix-launch.css`
- `phoenix-launch-dynamic.css`
- `phoenix-launch-editor-polish.css`
- `phoenix-launch-write.css`
- `phoenix-overlays.css`
- `phoenix-layers.css`
- `meg-web-movements-revolution.css`

## 4. O que NÃO deve ser confundido com legado visual

Arquivos de domínio/gateway/bridge podem ter nomes Phoenix ou legacy e ainda serem necessários para compatibilidade funcional.

Exemplos que NÃO serão removidos apenas por nome:
- gateways de escrita e baixa;
- regras de lançamentos;
- normalização;
- bridges de cartão;
- histórico/auditoria;
- contratos financeiros;
- arquivos `legacy-finance*.js` enquanto testes e reconciliação dependerem deles.

A remoção funcional exige auditoria separada de consumidores e comportamento.

## 5. Regra de exclusão por tela

Uma tela antiga pode ser removida quando TODOS forem verdadeiros:
- Web Next assumiu a rota;
- usuário validou visualmente;
- regras funcionais equivalentes estão cobertas;
- busca no repositório não mostra consumidores externos necessários;
- contratos antigos incompatíveis foram atualizados/removidos;
- CI completo passou;
- deploy e smoke passaram.

Depois disso:
- excluir componente antigo sem consumidor;
- excluir CSS exclusivo daquele componente;
- excluir testes que só exigem a aparência aposentada;
- excluir assets órfãos;
- atualizar este documento;
- reduzir baseline/imports quando aplicável.

## 6. Próxima remoção planejada

Primeiro alvo: **Home**. A competência mensal já possui substituta clean-room na branch `feat/web-next-home`, mas nada antigo será excluído antes da validação visual.

Somente após a Home Web Next ser validada:
- desviar rota Home para Web Next;
- verificar consumidores dos CSS Home antigos;
- remover CSS/componente visual que ficar órfão;
- atualizar contratos;
- reduzir a lista acima;
- marcar Home como VALIDADA + LEGADO REMOVIDO no status oficial.

## 7. Proibições

- não adicionar novo `phoenix-*-vXX.css`;
- não criar `*-old.css`, `*-backup.css`, `*-final2.css`;
- não esconder tela aposentada com CSS;
- não manter duas rotas oficiais para a mesma tela após validação;
- não importar CSS de `apps/web/src/mobile` na nova árvore Web;
- não reaproveitar componentes visuais antigos dentro de Web Next apenas para acelerar migração.

## 8. Candidatos de remoção após validação da Home mensal

Após validação explícita da Home Web Next e busca de consumidores:
- `PhoenixHomeDashboard.tsx`;
- `PhoenixHomePastMonth.tsx`;
- `PhoenixHomeHorizon.tsx`;
- CSS exclusivos dessas telas que ficarem sem consumidor;
- contratos que exigirem textos/layouts aposentados.

`PhoenixHomeAllTime.tsx` permanece enquanto os modos Intervalo/Tudo ainda dependerem dele.

Nenhum item acima deve ser removido antes da validação do usuário.

## 9. Busca e overlays durante a transição

A Home mensal já não depende visualmente de `PhoenixCommandPalette` após o PR de UI transversal.

Entretanto, os seguintes elementos Phoenix permanecem necessários para rotas ainda não migradas:
- `PhoenixCommandPalette.tsx`;
- overlays e confirmações Phoenix usados por Lançamentos, Pendentes, Cartões, Configurações e demais telas;
- loading/empty states específicos de telas ainda Phoenix.

Eles só podem ser removidos quando todos os consumidores tiverem equivalente Web Next validado.

## 10. Home / Sidebar premium antes da validação

A branch `feat/web-next-home-sidebar-v2` refina a Home e o shell clean-room sem criar nova camada paralela:
- `WebNextHome.tsx` é atualizado no próprio arquivo oficial;
- `WebNextSidebar.tsx` é atualizado no próprio arquivo oficial;
- `home.css`, `shell.css` e `tokens.css` são substituídos, não empilhados;
- gráfico passa a ter leitura por mês, valores e interação;
- tipografia de Full HD é ampliada;
- legado Phoenix continua intocado até aprovação explícita.

A validação desta rodada ainda NÃO autoriza exclusão da Home Phoenix.

## 11. Home Command Center

A rodada visual do PR #516 foi funcionalmente válida, porém NÃO aprovada visualmente pelo usuário por ainda transmitir sensação de dashboard convencional.

A branch `feat/web-next-home-command-center` substitui a composição oficial da Home no próprio `WebNextHome.tsx` e `home.css`:
- núcleo financeiro dominante com saldo e liquidez;
- quatro indicadores orbitais subordinados ao núcleo;
- carteira financeira em faixa própria;
- cockpit inferior com MEG Pulse;
- central de atenção e atividade recente;
- sidebar permanece a única implementação Web Next e recebe acabamento de bandeja flutuante.

Não foi criada segunda Home, stylesheet paralelo ou fallback visual novo.
O legado Phoenix permanece bloqueado para remoção até aprovação explícita desta nova composição.

## 12. Launcher Web e carrossel da Home

A branch `feat/web-next-home-launcher-carousel` incorpora duas regras aprovadas:
- botão `+ Incluir` na topbar Web Next;
- launcher inicial com `Despesa`, `Receita` e `Alimentação`, inspirado funcionalmente no Android;
- cada opção usa os presets financeiros canônicos existentes: `expense`, `income`, `benefit`;
- `benefit` continua delegando ao fluxo existente que fixa conta benefício e Verocard;
- carteira deixa de usar `overflow-x:auto` e passa a usar carrossel por estado, setas e indicadores;
- Home mantém `overflow:hidden`; rolagem é permitida apenas verticalmente dentro de listas densas, com scrollbar visual MEG.

A referência Android define o fluxo de escolha do lançamento, não o layout Web.


## 13. Lançamentos clean-room

A branch `feat/web-next-movements-clean-room` inicia a substituição visual da rota de Lançamentos:
- a leitura, KPIs, busca, filtros, grade, detalhes e responsividade passam para `WebNextMovements.tsx`;
- a tela Web Next não importa CSS Phoenix;
- a página permanece sem rolagem global em desktop; apenas a grade usa rolagem vertical interna com scrollbar MEG;
- o Android continua usando `PhoenixMovementsV15` sem alteração de rota;
- no Web desktop, `PhoenixMovementsV15` recebe `editorOnly` e permanece montado fora da árvore visual Web Next somente para preservar gravação, edição, cartão, parcelamento, benefício, recorrência e gateways já validados;
- o visual antigo da grade não é renderizado no modo `editorOnly`.

Esse host de escrita é transitório e pertence à linha **Novo / Editar lançamento** da matriz. Ele não autoriza remoção de `phoenix-launch.css`, `phoenix-launch-dynamic.css`, `phoenix-launch-editor-polish.css` ou gateways até o editor Web Next equivalente ser implementado, testado e validado.
