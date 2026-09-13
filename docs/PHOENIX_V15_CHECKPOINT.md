# Phoenix V15 — Checkpoint de Continuidade

Este arquivo é a fonte persistente de retomada do projeto MEG Phoenix V15. Em um novo chat, consultar primeiro este arquivo e a PR #243 antes de alterar código.

## Regra de segurança
- Branch principal de homologação: `phoenix/v15-clean-room`.
- PR de acompanhamento: #243.
- **NÃO mesclar a PR #243 em `main` sem validação explícita do usuário.**
- Produção Web/GitHub Pages atual permanece intacta durante a homologação.
- Phoenix continua **read-only para finanças**. No servidor de preview, somente login/refresh/logout admitem POST; demais mutações devem responder `PREVIEW_READ_ONLY`.
- Escrita financeira só pode ser liberada fluxo por fluxo depois de paridade, idempotência, auditoria e proteção transacional.
- Links de validação enviados ao usuário devem sempre incluir cache-buster baseado no commit: `?v=<sha>`.

## Preview e infraestrutura
- Frontend Phoenix: `https://meg-phoenix-v15-preview.onrender.com`.
- Serviço Render: `meg-phoenix-v15-preview`, branch `phoenix/v15-clean-room`, auto deploy ativo.
- API usada pelo preview: `https://meg-platform-api.onrender.com` via proxy do preview.
- A API principal Render continua na branch `main`; portanto alterações backend feitas somente na branch Phoenix **não estão ativas na API principal** até hotfix/PR separado ser explicitamente mesclado.
- A tela `SERVICE WAKING UP` pode aparecer em cold start do Render Free e não faz parte da UI final do MEG.

## Referência do produto
- A V15 validada é a especificação visual/UX oficial.
- Phoenix é reconstrução clean-room em React ligada aos dados reais, sem reutilizar o layout antigo.
- Nenhum mock deve substituir dado real ausente.
- Web deve ser completa; Android continua focado no essencial de lançamento/uso móvel.

## UX consolidada
- Loading institucional MEG concentrado na entrada.
- Depois da primeira carga, a navegação reutiliza o snapshot em memória.
- Atualização manual/periódica/foco mantém a fotografia atual visível até a nova estar completa.
- Troca mensal é atômica: uma resposta atrasada de período anterior não pode sobrescrever o período mais recente.
- Sidebar esquerda fixa; recolhida mostra logo proporcional, ícones centralizados e badges legíveis.
- Workspace reflowa ao redimensionar a janela e ao recolher/expandir a sidebar.
- Cabeçalhos de telas e tabelas sticky onde aplicável.
- Claro/escuro devem permanecer coerentes em cards, filtros, drawers e tabelas.
- Filtros/popovers fecham ao clicar fora quando aplicável.
- Histórico, Usuários e Configurações já receberam primeira rodada específica de tela dividida/mobile.

## Seletor global de período — padrão V15 restaurado
O seletor global possui:
- modos **Mês / Intervalo / Tudo**;
- atalhos **Hoje / 7 dias / 30 dias / Mês atual / Mês anterior**;
- campos **Data inicial / Data final** no modo Intervalo;
- botão **Aplicar período**;
- indicador visível de carregamento sem desmontar a tela atual.

Regras:
- **Mês** altera o snapshot oficial mensal somente depois que a nova leitura estiver completa e coerente.
- **Intervalo** e **Tudo** são visões de Lançamentos; Home, Cartões, Fluxo e demais indicadores globais continuam mensais para não misturar conceitos financeiros.
- Lançamentos diferencia **Vencimento** de **Data da compra**. `purchaseDate` real deve ser usado quando existir; nunca repetir automaticamente o vencimento na coluna Data da compra.
- O rótulo de mês é formatado de forma estável para não retroceder um mês por conversão UTC → Brasil.
- Base atual possui aproximadamente 3.633 eventos ativos normalizados, de 2025-06 até 2028-08; o modo Tudo deve buscar o conjunto completo, não apenas os primeiros 100.

## Performance de período
### Frontend/preview
- Contexto estático (AppState, usuários, clientes, saúde e normalização) é reutilizado entre trocas de mês e não deve ser recarregado só porque o período mudou.
- O preview possui agregador isolado em `/finance/phoenix-preview/events` implementado no próprio `phoenix-preview-server.mjs`.
- Esse agregador usa a rota oficial paginada `/finance/events`, busca páginas servidor-a-servidor em lotes controlados, deduplica registros e mantém cache curto de 60 s por sessão usando hash SHA-256 do contexto de autenticação.
- O objetivo é reduzir o atraso percebido de **Tudo** sem exigir alteração imediata da API principal.

### Snapshot mensal backend preparado
A branch Phoenix contém `phoenix-preview-snapshot.ts`, que consolida resumo, fluxo, análises e benefício sobre uma única leitura histórica mínima, evitando recalcular o mesmo mês várias vezes.

Como a API Render principal continua em `main`, foi aberta a PR separada **#247 — Hotfix: consolidar snapshot financeiro Phoenix**:
- branch `hotfix/phoenix-preview-snapshot-performance`;
- base `main`;
- apenas 3 arquivos alterados;
- estritamente somente leitura;
- não altera frontend nem habilita mutação;
- CI 1293 verde;
- permanece **draft e não mesclada** aguardando autorização explícita.

Não afirmar que a otimização mensal da PR #247 está ativa em produção antes do merge/deploy da API principal.

## Grid MEG — regra global
Toda tabela real presente ou futura deve usar o padrão Grid MEG:
- ordenação crescente/decrescente;
- filtro por coluna;
- busca dentro dos valores;
- seleção múltipla e Selecionar tudo;
- filtros de texto, data e intervalo numérico;
- Aplicar / Cancelar / Limpar;
- chips de filtros ativos;
- indicação clara de coluna filtrada;
- visual sólido e legível nos temas claro/escuro;
- adaptação mobile;
- KPIs analíticos reagem aos filtros, mas indicadores globais oficiais não mudam silenciosamente por filtro local.

Telas usando Grid MEG: Lançamentos, Cadastros, Cartões (fatura/parcelas), Contas a receber, Receitas e Fluxo de caixa. Histórico, Pendentes e Usuários mantêm layouts próprios.

## Classificação e Grupo
Regra validada:
- `Category.group` = **Classificação**;
- `Category.name` = **Grupo**;
- em Despesa, escolher primeiro Classificação e depois somente os Grupos vinculados;
- `categoryId` real do Grupo permanece como autoridade interna;
- em Receita, Classificação é opcional e Grupo não é exigido;
- fallback legado usa `sourceDetails.expenseClass/group`; sem isso, usa `category.group/name` na mesma ordem semântica;
- eventos antigos sem `categoryId` podem recuperar Classificação/Grupo do `sourcePayload` em leitura;
- a mesma semântica é usada em Lançamentos, Pendentes e Análises.

Exemplos reais de classificação/grupo: `CONTAS GERAIS -> SUPERMERCADO / SAÚDE / AUTOMÓVEL / ...`, `INVESTIMENTO -> LAZER / MOTO / TÍTULOS-PREVIDÊNCIA`, `RES. PAG. DÍVIDA -> PGTO DE DÍVIDAS / TÍTULOS-PREVIDÊNCIA`.

## Política monetária consolidada
- `signedAmount` é a autoridade do efeito financeiro.
- Despesa normal possui efeito negativo; estorno/reversão reduz a despesa em vez de ser somado por `abs(amount)`.
- Benefício/Verocard permanece visível, porém fora de receitas/despesas/saldo monetários.
- Lançamentos mostra KPIs de **Receitas monetárias**, **Despesas monetárias** e **Resultado monetário**.
- Receitas separa **Receitas monetárias** de **Benefício alimentação**.
- Fluxo de caixa e Home usam o snapshot canônico do backend como autoridade do saldo realizado/projetado.

### Paridade numérica de setembro/2026
Referência de homologação, não hardcodar:
- saldo anterior: `R$ 2.643,56`;
- receitas monetárias: `R$ 10.581,99`;
- despesas monetárias líquidas: `R$ 12.454,42`;
- despesas monetárias realizadas: `R$ 3.046,67`;
- pendentes líquidos: `R$ 9.407,75`;
- saldo realizado: `R$ 10.178,88`;
- fechamento projetado: `R$ 771,13`;
- benefício: créditos `R$ 2.000,00`, utilizado `R$ 1.250,83`, saldo `R$ 749,17`.

A antiga divergência de `R$ 14.139,19` vinha de `abs(amount)`, que somava benefício e estornos como despesas positivas. Essa lógica não pode retornar.

## Pendentes e Agenda da Home
- `Payable` oficial é usado quando houver registro; o legado real complementa a leitura enquanto a migração estiver incompleta.
- Estornos planejados permanecem ajustes negativos e não podem ser selecionados como obrigação para baixa.
- Setembro/2026: obrigações acionáveis `109 itens / R$ 9.505,66`; ajustes negativos `-R$ 97,91`; pendente líquido oficial `R$ 9.407,75`.
- Agenda da Home mostra obrigações acionáveis, não transforma estorno em conta a pagar.

## Cartões
- Layout premium determinístico; produtos conhecidos mantêm identidade específica e desconhecidos usam template MEG, nunca arte aleatória.
- Fatura do período continua visível mesmo quando paga; pagamento remove o compromisso aberto, não o histórico.
- Créditos/estornos reduzem a fatura e aparecem como `Crédito/estorno`.
- `Total comprometido` considera somente valores ainda em aberto.
- MELI/Mercado Livre reconhece o alias legado `CARTÃO ML`.
- Ordem de hooks de `PhoenixCardsGrid` foi estabilizada.

### Referência setembro/2026
- AZUL: fatura `R$ 1.875,52`, compras `R$ 1.937,52`, créditos `R$ 62,00`, comprometido `R$ 7.166,25`.
- LATAM PASS: fatura `R$ 3.422,24`, compras `R$ 3.453,24`, créditos `R$ 31,00`, comprometido `R$ 8.358,55`.
- MELI: fatura paga `R$ 1.824,02`, compras `R$ 1.943,08`, créditos `R$ 119,06`, comprometido `R$ 2.608,42`.
- RIACHUELO: fatura `R$ 132,99`, comprometido `R$ 531,96`.

## Dados e compatibilidade
- Snapshot mensal principal: `/finance/phoenix-preview?month=AAAA-MM`.
- `Payable`, `CardPurchase` e `CardInstallment` ainda não possuem todo o histórico normalizado necessário.
- Compatibilidade read-only com AppState/eventos legados permanece necessária até migração controlada.
- Transferência é neutra no patrimônio; backend possui serviço atômico de duas pernas, mas Phoenix ainda não grava.
- Propriedade financeira permanece por `userId`.
- Eventos-sombra importados foram arquivados, não apagados.

## Estado técnico atual
- Head funcional Phoenix anterior a este checkpoint: `93d7794b5777135e809ede6b583ac2691e9f9d76` (`test: proteger agregação de período no preview`).
- CI Phoenix **1292** verde.
- Deploy Render desse head ficou **live**.
- PR #243 continua aberta, draft e sem merge.
- Hotfix mensal de performance: PR #247, head `4feb84096e0c8b14046ca41d793ce35d8e8d7ac3`, CI **1293** verde, draft e sem merge.
- Conferir sempre a PR #243 para o head mais recente, pois este arquivo pode receber commits documentais posteriores.

## Próximos gates
1. validar novamente Mês / Intervalo / Tudo no link sem cache, observando rótulo do mês, Data da compra x Vencimento e tempo percebido do modo Tudo;
2. decidir, mediante autorização explícita, se a PR #247 pode ser mesclada para medir a latência mensal real após a consolidação do snapshot;
3. concluir revisão visual/responsiva das áreas não tabulares e temas;
4. fechar últimas paridades derivadas contra a base real;
5. revisar dependências/índices restantes somente com medição, sem `npm audit fix --force` e sem indexação indiscriminada;
6. somente depois iniciar escrita seletiva, um fluxo por vez;
7. corte da Web atual somente após paridade funcional, numérica e visual suficiente.

## Protocolo para novo chat
Ao aproximar o limite de contexto, parar em commit seguro, garantir CI/deploy, atualizar este arquivo e a PR #243. No novo chat, usar:

`Continuar MEG Phoenix V15 pela PR #243 e docs/PHOENIX_V15_CHECKPOINT.md; não fazer merge nem liberar escrita sem validação.`
