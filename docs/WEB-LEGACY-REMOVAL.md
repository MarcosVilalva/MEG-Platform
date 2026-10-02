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

O PR #518 (`0cdc42d2`) incorporou duas regras aprovadas:
- botão `+ Incluir` na topbar Web Next;
- launcher inicial com `Despesa`, `Receita` e `Alimentação`, inspirado funcionalmente no Android;
- cada opção usa os presets financeiros canônicos existentes: `expense`, `income`, `benefit`;
- `benefit` continua delegando ao fluxo existente que fixa conta benefício e Verocard;
- carteira deixa de usar `overflow-x:auto` e passa a usar carrossel por estado, setas e indicadores;
- Home mantém `overflow:hidden`; rolagem é permitida apenas verticalmente dentro de listas densas, com scrollbar visual MEG.

A referência Android define o fluxo de escolha do lançamento, não o layout Web.


## 13. Lançamentos Web Next e host transitório do editor

A branch `feat/web-next-movements-command-center` inicia a substituição visual de Lançamentos sem duplicar regras financeiras:
- `WebNextMovements.tsx` assume a leitura, filtros, KPIs, paginação e histórico visual da rota Web;
- `movements-view-model.ts` é a fronteira de leitura entre o Web Next e o modelo financeiro existente;
- a lista permanece cronológica, sem agrupamento por categoria, com forma de pagamento e situação visíveis;
- a área principal não possui rolagem geral nem horizontal; somente a grade densa possui rolagem vertical personalizada;
- Despesa, Receita e Transferência chamam o fluxo financeiro já existente;
- `PhoenixMovementsV15.tsx` permanece montado somente com `editorOnly` para servir temporariamente o Novo/Editar, parcelamento, cartão, benefício, transferência, validações e gateways de escrita já testados.

Esse host NÃO é uma segunda tela oficial de Lançamentos. Ele é uma ponte funcional temporária e deverá desaparecer quando Novo/Editar lançamento for reconstruído em Web Next e validado.

Até essa etapa:
- não remover `phoenix-launch.css`, `phoenix-launch-dynamic.css`, `phoenix-launch-editor-polish.css` ou `phoenix-launch-write.css`;
- não remover `PhoenixLaunchWriteControl` nem os gateways de escrita usados pelo editor;
- `meg-web-movements-revolution.css` continua candidato a remoção somente após validação visual da nova rota e auditoria de consumidores.


## 14. Novo / Editar lançamento Web Next

A branch `feat/web-next-launch-editor-clean-room` substitui a superfície visual do editor na rota Web:
- `WebNextLaunchEditor.tsx` renderiza Novo e Editar com classes `mnx-`, sem importar CSS Phoenix;
- o formulário mantém Despesa, Receita, Transferência, Benefício, cartão, crediário, parcelas, recorrência, modelo, observações, validação e resumo;
- confirmações de descarte, baixa, exclusão e visualização de parcelas possuem superfície Web Next própria;
- `PhoenixMovementsV15` continua temporariamente como controlador de estado/orquestração, mas em `editorOnly` entrega a apresentação ao Web Next;
- `PhoenixLaunchWriteControl` mantém um único motor de gravação e recebe `surface="web-next"` apenas para trocar a apresentação do estado de escrita;
- transferência passa a receber `transferInput` explícito na rota nova, sem depender de leitura do DOM;
- Android continua usando a superfície Phoenix existente e não muda nesta etapa.

Esta etapa NÃO autoriza remoção imediata dos gateways nem do editor Phoenix. Após CI, publicação e validação visual, deve-se auditar consumidores e então extrair/remover a apresentação antiga que ficar órfã.


## 15. Login / autenticação Web Next

A branch `feat/web-next-auth-validated` migra somente a apresentação Web da autenticação:
- `WebNextAuth.tsx` e `auth.css` formam a superfície oficial Web;
- login, sessão, cadastro e recuperação continuam usando `auth-client` e o controlador de `preview-main.tsx`;
- o runtime Android continua usando a superfície Phoenix atual e não recebe alteração visual nesta etapa;
- a Web não exibe mais “Phoenix V15” nem “Ambiente de validação” no login;
- a apresentação Phoenix de autenticação só poderá ser removida quando o Login Web Next for validado e a superfície Android deixar de depender dela ou for separada explicitamente.

Até a validação visual:
- não remover `preview-auth-flow.css`;
- não remover o markup Phoenix de autenticação usado pelo Android;
- não alterar biometria, sessão, `auth-client`, cadastro ou recuperação de senha por motivo visual.
