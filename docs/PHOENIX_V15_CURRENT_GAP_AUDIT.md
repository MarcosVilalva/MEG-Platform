# Phoenix V15 — auditoria da versão aprovada versus versão atual

Data de referência: 16/09/2026.

## Base comparada

- Referência visual/funcional V15: branch `phoenix/v15-clean-room`, tip `fc27117ca82f7225a082b8c3d0ac894815132e34`.
- Primeira versão funcional publicada: merge `5c782cf77f821d4825f0aeaffa4b061f9b2484fb` na `main`.
- A comparação Git entre a V15 e a `main` mostrou a `main` 210 commits à frente e a V15 apenas 2 commits à frente; esses 2 commits exclusivos da V15 removem somente artefatos de reconciliação RC1, sem arquivos de interface. Portanto, a versão atual contém a linhagem visual da V15, mas recebeu muitas alterações posteriores que precisam de auditoria de fidelidade tela a tela.

## O que melhorou depois da V15

### Entrada e desempenho inicial

- O formulário de login sai imediatamente após a confirmação de envio e entra no loading dedicado.
- O caminho crítico deixou de usar `/ready`, que também aquecia provedores externos, e passou a aquecer somente `/health`.
- O snapshot financeiro e a leitura de saúde iniciam em paralelo.
- Leituras secundárias de usuários, AppState, clientes, recebíveis e orçamentos passaram para hidratação posterior à Home.
- Lançamentos, Pendentes, Cartões e Histórico são pré-carregados após a Home.
- O histórico completo usado no autocomplete de descrição é pré-aquecido em segundo plano.

### Estrutura funcional

- Home ficou separada do conteúdo de previsão de 12 meses.
- Decisões concentra Radar, Margem Segura, simulação e apoio à decisão.
- Pendentes ganhou agrupamento operacional por data e outros critérios.
- Compras de cartão passaram a usar domínio próprio com criação, edição e exclusão protegidas e auditáveis.
- O fechamento da tela após confirmação na nuvem foi padronizado nos fluxos já conectados.
- Foram adicionadas proteções de idempotência e writers específicos para eventos financeiros e cartões.

### Entrega e segurança operacional

- CI, Pages, Android e smoke de produção foram reforçados no processo de publicação.
- A primeira versão funcional foi publicada na `main` sem force-push.
- A base Phoenix passou a usar cache e deduplicação de GETs autenticados.

## Diferenças/regressões encontradas na varredura atual

### Avatares — corrigido no PR pós-publicação

Problema encontrado:

- Os 36 arquivos individuais estavam presentes no repositório, porém o caminho usado para o avatar era absoluto (`/brand/...`), incompatível com a base do GitHub Pages (`/MEG-Platform/`).
- Sem preferência gravada, o sistema voltava para iniciais.
- Na tela Usuários, apenas o usuário atual usava `PhoenixProfileAvatar`; os demais mostravam uma letra.
- A preferência não era reaplicada de forma garantida depois de um login novo na mesma página.

Correção:

- Caminho passou a respeitar `import.meta.env.BASE_URL`.
- Cada usuário recebe um avatar individual determinístico quando ainda não escolheu foto/avatar/iniciais.
- A tela Usuários usa o componente de avatar para todos os usuários.
- O avatar é reaplicado no bootstrap, após login e quando a preferência muda.

### Lentidão depois de ações — corrigido parcialmente no PR pós-publicação

Problema encontrado:

- Qualquer mutação limpava todo o cache autenticado, inclusive contas, classificações e formas de pagamento que não haviam mudado.
- Ações de cartão podiam precisar buscar novamente cartão e classificação justamente quando o usuário clicava em editar/excluir.

Correção:

- Mutações preservam catálogos estáveis quando a mutação não pertence àquele domínio.
- Foi adicionada proteção por geração (`cacheEpoch`) para impedir que uma leitura antiga em andamento volte a preencher o cache depois de uma mutação.
- Contas, categorias, formas de pagamento, cartões e Pendentes são pré-aquecidos no tempo ocioso após a entrada.

Ainda a melhorar:

- Eliminar a resolução de compra de cartão baseada em descrição/data/valor e passar a carregar identidade direta da compra na linha projetada.
- Atualizar a tela de forma otimista com resposta do writer e deixar a fotografia completa sincronizar em segundo plano, sempre que o contrato financeiro permitir.
- Medir e tratar endpoints individuais que continuarem acima da latência aceitável.

### Visual e responsividade — em correção no PR pós-publicação

Problemas observados:

- Drawers e ações podiam estourar horizontalmente em janelas estreitas.
- Botões longos ficavam comprimidos.
- Textos e valores extensos podiam colar ou ultrapassar o card.
- Algumas grades precisavam preservar rolagem horizontal própria sem empurrar o shell inteiro.

Correção em curso:

- `min-width:0` e limites de largura aplicados a shell, cards, drawers e campos.
- Ações passam a quebrar em múltiplas linhas e, no mobile, viram uma coluna.
- Drawers limitados a `100vw`.
- Tabelas mantêm rolagem no contêiner próprio.
- Textos longos recebem quebra segura.
- Preferência `prefers-reduced-motion` respeitada.

## Pontos que ainda precisam validação funcional completa

Não considerar finalizados apenas porque há código disponível. Precisam ser exercitados ponta a ponta com base real e regras de negócio:

- baixa de Pendentes, especialmente qualquer operação em lote;
- transferência;
- recorrência;
- benefício;
- pagamento e reabertura de fatura;
- edição/arquivamento em lote;
- ações administrativas de usuários e permissões;
- cadastro/edição de cartões e demais cadastros mutáveis;
- filtros, ordenação, seleção múltipla e responsividade em todas as grids;
- Web e Android após os novos merges.

## Critério de entrega funcional

Uma tela/ação só deve ser marcada como concluída quando atender simultaneamente:

1. usa dado real da base;
2. não cria duplicidade nem perde centavos/estado;
3. confirma a mutação no servidor antes de tratar como sincronizada;
4. fecha ou atualiza a interface sem espera artificial;
5. permanece utilizável em desktop, janela dividida e mobile;
6. mantém texto, espaçamento, imagens e proporções coerentes com a V15;
7. passa CI/build e não quebra os fluxos já validados.

## Status desta auditoria

- Primeira versão funcional: **publicada**.
- Entrada e navegação: **melhoradas e validadas pelo uso**.
- Avatares: **causa localizada e correção implementada no PR pós-publicação**.
- Hardening visual global: **implementado no PR pós-publicação, aguardando validação/merge**.
- Cache e pré-aquecimento das ações: **implementados no PR pós-publicação, aguardando validação/merge**.
- Paridade visual completa tela a tela: **em auditoria**.
- Todos os writers avançados: **a validar ponta a ponta**.
