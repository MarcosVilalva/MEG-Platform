# Phoenix V15 — Checkpoint de Continuidade

Fonte persistente para retomar o MEG Phoenix V15. Em um novo chat, consultar primeiro este arquivo e a PR #243.

## Segurança e branches
- Branch de homologação: `phoenix/v15-clean-room`.
- PR principal: #243 — permanece **draft, aberta e sem merge**.
- **NÃO mesclar a PR #243 em `main` sem autorização explícita do usuário.**
- Web/GitHub Pages de produção permanecem intactos durante a homologação.
- Phoenix continua **read-only para finanças**. Escritas financeiras seguem bloqueadas pelo preview.
- Exceções de POST no preview são somente do ciclo de autenticação: login, refresh, logout, cadastro e recuperação de acesso.
- Escrita financeira só será liberada fluxo por fluxo após paridade, idempotência, auditoria e proteção transacional.
- Links de validação devem sempre usar cache-buster: `?v=<sha>`.

## Infraestrutura
- Preview: `https://meg-phoenix-v15-preview.onrender.com`.
- Serviço Render: `meg-phoenix-v15-preview` (`srv-daimvbgae00c73f68bfg`).
- Auto deploy ativo na branch Phoenix; não disparar deploy manual após commit.
- API consumida pelo preview: `https://meg-platform-api.onrender.com`, via proxy do preview.
- A API principal Render continua em `main`; alterações backend exclusivas da branch Phoenix não estão ativas até hotfix/PR separado ser explicitamente mesclado.
- Cold start do Render Free pode mostrar tela de serviço acordando; isso não é UI do MEG.

## Direção do produto
- V15 validada é a referência visual/UX oficial.
- Phoenix é clean-room React ligada aos dados reais, sem reaproveitar o layout legado.
- Web deve ser completa; Android fica para uma segunda etapa, focado no essencial móvel.
- Nenhum mock deve substituir dado real ausente.
- Objetivo da Fase 4: fechar leitura, projeção, consistência visual, autenticação, performance e paridade antes da escrita seletiva.

## UX consolidada
- Sidebar esquerda fixa, recolhível e responsiva.
- Ícones da navegação foram padronizados em SVG; Histórico e Pendentes não usam mais o mesmo símbolo.
- Menu recolhido possui tooltip por hover/foco com o nome da aba; badges continuam legíveis.
- Cabeçalhos sticky onde aplicável; filtros/popovers fecham ao clicar fora.
- Claro/escuro revisados globalmente; Histórico, Usuários e Configurações receberam rodada específica de tela dividida/mobile.
- Loading institucional MEG fica na entrada; depois da primeira carga a navegação reutiliza snapshot em memória.
- Atualizações manuais/periódicas/foco mantêm a fotografia válida visível até a nova leitura estar completa.

## Entrada, cadastro e recuperação de acesso
A entrada Phoenix foi transformada em experiência de produto, não apenas formulário:
- layout premium em duas áreas no desktop e uma coluna no mobile;
- texto reduzido para evitar repetição de marca e proposta;
- lado esquerdo: identidade MEG + mensagem principal + chips compactos `Saldo real / Projeções / Controle`;
- lado direito: login direto, mostrar/ocultar senha, mensagens humanas de erro e carregamento;
- links discretos `Criar conta` e `Esqueci minha senha`.

Cadastro:
- usa o contrato real `register(...)`;
- permite `REQUEST_ACCESS` (acessar MEG existente) ou `CREATE_WORKSPACE` (criar novo espaço);
- coleta nome, telefone, e-mail, senha e confirmação;
- possui indicador de força da senha e validação local;
- pedidos de acesso podem ficar `PENDING_APPROVAL` e aguardam aprovação do administrador;
- criação de workspace segue o fluxo comercial/backend existente.

Recuperação:
- usa o contrato real `/auth/forgot-password`;
- **o backend atual ainda gera e envia senha temporária** por e-mail/WhatsApp e revoga sessões existentes;
- a UI é transparente sobre isso e não finge fluxo por token;
- antes do corte de produção, avaliar migração para token/código de uso único com expiração e definição de nova senha.

O preview agora permite apenas os POSTs de autenticação necessários (`login`, `refresh`, `logout`, `register`, `forgot-password`); mutações financeiras continuam bloqueadas.

## Seletor global de período
Padrão V15 restaurado:
- modos **Mês / Intervalo / Tudo**;
- atalhos **Hoje / 7 dias / 30 dias / Mês atual / Mês anterior**;
- Data inicial / Data final;
- botão Aplicar período;
- carregamento sem desmontar a tela.

Regras:
- Mês troca o snapshot apenas quando a nova leitura estiver completa e coerente.
- Intervalo abre Lançamentos e aplica filtro real por data.
- Tudo permanece ativo entre Home e Lançamentos e usa todo o histórico normalizado.
- Lançamentos diferencia **Vencimento** e **Data da compra**; `purchaseDate` real tem prioridade.
- Rótulos de mês usam UTC controlado para não retroceder por timezone.

## Home — passado, presente, futuro e Tudo
### Mês atual/passado
Mantém leitura mensal oficial: saldo realizado, receitas/despesas, pendências, benefício, agenda e fechamento projetado.

### Mês futuro = horizonte financeiro
Ao escolher, por exemplo, dezembro/2026, a Home passa a responder **“como estarei até o fim de dezembro”**, e não somente “o que acontece em dezembro”.

Regra:
- saldo monetário atual permanece a fotografia realizada de hoje;
- acumula compromissos pendentes até a data final do período;
- soma receitas futuras planejadas até a mesma data;
- calcula dinheiro livre após compromissos;
- calcula projeção final;
- identifica primeira data projetada negativa e menor saldo previsto quando aplicável;
- benefício/Verocard permanece separado do caixa monetário;
- transferências permanecem neutras.

Referência de auditoria para até dezembro/2026, sem hardcode:
- saldo realizado: `R$ 10.178,88`;
- compromissos líquidos até 31/12: `R$ 25.297,21`;
- receitas futuras planejadas encontradas: `R$ 0,00`;
- obrigações acionáveis: `277`;
- vencidas: `7 / R$ 2.625,05`;
- primeira projeção negativa: `05/10/2026`;
- menor/fechamento projetado no horizonte: `-R$ 15.118,33` em `28/12/2026`.

### Tudo
Home própria de histórico completo:
- mostra do primeiro ao último lançamento normalizado;
- saldo monetário atual continua sendo o dinheiro realizado hoje;
- consolida receitas/despesas registradas e realizadas desde o início;
- mostra compromissos ainda em aberto, receitas futuras, saldo livre e projeção final da base;
- benefício permanece separado.

A base observada possui aproximadamente 3.633 eventos ativos normalizados, de 2025-06 a 2028-08.

## Performance de período
- Contexto estático (AppState, usuários, clientes, saúde/normalização) é reutilizado entre trocas de mês.
- Troca mensal é atômica e protege contra resposta atrasada sobrescrever seleção mais recente.
- Preview possui agregador `/finance/phoenix-preview/events`, com paginação servidor-a-servidor em lotes, deduplicação e cache curto de 60 s por sessão com hash SHA-256.
- Isso reduziu o custo percebido do modo Tudo.

### PR #247 — otimização mensal backend
Existe PR separada **#247 — Hotfix: consolidar snapshot financeiro Phoenix**:
- base `main`;
- branch `hotfix/phoenix-preview-snapshot-performance`;
- consolida resumo, fluxo, análises e benefício sobre uma leitura financeira compartilhada;
- somente leitura;
- CI 1293 verde;
- permanece draft e sem merge aguardando autorização explícita.

Não afirmar que essa otimização mensal está ativa na API principal antes de merge/deploy.

## Grid MEG
Padrão obrigatório para tabelas reais:
- ordenação;
- filtro por coluna;
- busca em valores;
- seleção múltipla/Selecionar tudo;
- filtros de texto/data/número;
- Aplicar/Cancelar/Limpar;
- chips ativos;
- estado de coluna filtrada;
- claro/escuro e mobile.

Telas com Grid MEG: Lançamentos, Cadastros, Cartões, Contas a receber, Receitas e Fluxo de caixa. Histórico, Pendentes e Usuários mantêm layouts próprios.

## Classificação e Grupo
- `Category.group` = **Classificação**.
- `Category.name` = **Grupo**.
- Despesa: Classificação primeiro, depois Grupo vinculado; `categoryId` do Grupo é autoridade.
- Receita: classificação opcional, sem obrigação de Grupo.
- Fallback legado: `sourceDetails.expenseClass/group`; depois `category.group/name`.
- Eventos antigos sem `categoryId` podem recuperar semântica pelo `sourcePayload`.
- Mesma regra aplicada em Lançamentos, Pendentes e Análises.

Regra pendente antes da escrita: em Receita, restringir formas aos valores reais equivalentes a **Pix, Dinheiro e Depósito bancário**, após nova conferência dos cadastros ativos.

## Política monetária e referência setembro/2026
- `signedAmount` é autoridade.
- Estornos/reversões reduzem despesa; não usar `abs(amount)` indiscriminadamente.
- Benefício/Verocard visível, mas fora de receitas/despesas/saldo monetários.
- Transferência neutra.

Referência de homologação, não hardcodar:
- saldo anterior: `R$ 2.643,56`;
- receitas monetárias: `R$ 10.581,99`;
- despesas monetárias líquidas: `R$ 12.454,42`;
- despesas realizadas: `R$ 3.046,67`;
- pendentes líquidos: `R$ 9.407,75`;
- saldo realizado: `R$ 10.178,88`;
- fechamento projetado: `R$ 771,13`;
- benefício: créditos `R$ 2.000,00`, utilizado `R$ 1.250,83`, saldo `R$ 749,17`.

Agenda de setembro:
- obrigações acionáveis: `109 / R$ 9.505,66`;
- ajustes negativos: `-R$ 97,91`;
- pendente líquido oficial: `R$ 9.407,75`.

## Cartões — referência setembro/2026
- AZUL: fatura `R$ 1.875,52`, compras `R$ 1.937,52`, créditos `R$ 62,00`, comprometido `R$ 7.166,25`.
- LATAM PASS: fatura `R$ 3.422,24`, compras `R$ 3.453,24`, créditos `R$ 31,00`, comprometido `R$ 8.358,55`.
- MELI: fatura paga `R$ 1.824,02`, compras `R$ 1.943,08`, créditos `R$ 119,06`, comprometido `R$ 2.608,42`.
- RIACHUELO: fatura `R$ 132,99`, comprometido `R$ 531,96`.

Fatura paga continua visível no histórico; pagamento remove compromisso aberto, não histórico. Créditos/estornos reduzem a fatura.

## Telas ainda em consolidação
- **Análises Financeiras** já existe, mas ainda precisa chegar ao nível V15: tendências, comparações, projeções, concentração e inteligência histórica.
- **Configurações** já possui infraestrutura (tema, sessão, saúde da base, sincronização, diagnóstico, backup, dispositivos e alertas), mas ainda falta a personalização de dashboard no padrão V15.
- Próxima direção para Configurações: dashboard por blocos configuráveis (`Saldo atual`, `Dinheiro livre`, `Projeção`, `Cartões`, `Agenda`, `Benefício`, `Classificações`, `Alertas`), com ordem e visibilidade por usuário.
- Usuários e permissões deve evoluir para agrupamentos Pendentes / Ativos / Bloqueados, badge de solicitações e ações administrativas claras.

## Estado técnico atual
- Head funcional no momento desta atualização: `b30b2ab008b0f197bf2f9ec4f1378c48c8bc962f`.
- Lote atual: login enxuto + cadastro + recuperação + allowlist de autenticação no preview + teste de contrato atualizado.
- CI **1308** verde.
- PR #243 continua draft/aberta/sem merge.
- Render está em auto deploy desse head; confirmar estado `live` antes de enviar link final de homologação.

## Próximos gates
1. validar visualmente login enxuto, Criar conta e Recuperar acesso em desktop, tela dividida e mobile;
2. não testar recuperação em conta real sem necessidade, pois o backend atual altera a senha para uma temporária;
3. consolidar Análises Financeiras no nível V15;
4. completar Configurações V15 com personalização real do dashboard;
5. melhorar Usuários e permissões (Pendentes/Ativos/Bloqueados + badge + ações);
6. avaliar fluxo seguro por token de recuperação antes do corte de produção;
7. decidir explicitamente sobre PR #247 para performance mensal;
8. fechar últimas paridades e dependências sem `npm audit fix --force`;
9. só depois iniciar escrita financeira seletiva;
10. corte da Web atual somente após paridade funcional, numérica e visual suficiente.

## Protocolo de retomada
Ao aproximar o limite de contexto: parar em commit seguro, garantir CI/deploy, atualizar este arquivo e a PR #243.

Prompt para novo chat:

`Continuar MEG Phoenix V15 pela PR #243 e docs/PHOENIX_V15_CHECKPOINT.md; não fazer merge nem liberar escrita financeira sem validação.`
