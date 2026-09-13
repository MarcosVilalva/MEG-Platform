# MEG V15 Phoenix — Plano de migração limpa

## Objetivo

Reconstruir a camada de interface do MEG a partir da V15 validada, preservando dados, regras financeiras, API, autenticação, sincronização, notificações e integrações já existentes. A nova interface não deve herdar CSS, componentes ou estruturas visuais legadas.

## Princípio central

A V15 passa a ser a referência oficial de UI/UX. O sistema atual deixa de ser a referência visual e passa a ser a fonte de regras, contratos de API e comportamento financeiro.

Fluxo-alvo:

`Banco real -> API existente -> regras/core existentes -> camada de serviços V15 -> interface V15 React -> Web/Android`

## O que será preservado

### Dados e persistência
- PostgreSQL via `DATABASE_URL` e Prisma.
- `User`, `Workspace`, `WorkspaceMember`, `AuthSession` e permissões.
- `AppState` e controle de `revision` enquanto a migração para entidades normalizadas ainda for necessária.
- `CloudMutationReceipt` para idempotência/confirmação de gravações.
- `FinancialEvent`, `LedgerEntry`, `Account`, `Category`, `PaymentMethod`.
- `CreditCard`, `CardPurchase`, `CardInstallment`.
- `Payable`, `PayablePayment`, `RecurringExpense`.
- `Receivable`, `Receipt`, `Budget`, `AuditLog`.
- Configuração de notificações e integrações por workspace.

### Backend e regras
- `apps/api` como backend oficial.
- módulos: `app-state`, `auth`, `finance`, `cards`, `payables`, `receivables`, `notifications`, `integrations`, `workspaces`.
- `packages/core` como fonte das regras reutilizáveis de financeiro, ledger, projeções, simulação e regras.
- testes existentes de financeiro, sincronização, histórico, máscara monetária, editor de lançamentos, status e despesas negativas.

### Integrações
- WhatsApp via Evolution API por workspace.
- e-mail e destinatários configurados.
- notificações e resumo diário.
- consultor financeiro.
- Alexa.
- atualização Android/Capacitor.

## O que será adaptado

- Clientes de API do frontend.
- gerenciamento de sessão no Web.
- carregamento inicial e cache.
- sincronização e confirmação de mutações.
- estado de tela necessário para filtros, seleção, drawers e navegação.
- identidade visual de cartões, sempre baseada nos dados reais do cadastro.
- histórico/auditoria apresentado na UI.

## O que será descartado da nova interface

- `global.css` legado como dependência visual da V15 nova.
- adaptadores CSS destinados a fazer componentes antigos parecerem V15.
- componentes React cuja hierarquia não corresponda à V15 validada.
- breakpoints baseados somente no viewport quando o comportamento depende da largura útil do workspace.
- SVGs/ícones que substituam visualmente os elementos validados da V15 sem necessidade funcional.
- qualquer dado de demonstração/hardcoded da V15 original.

## Riscos identificados

### 1. Dupla fonte de verdade
Hoje coexistem `AppState` em JSON e entidades normalizadas como `FinancialEvent`, cartões, contas a pagar/receber etc. A nova V15 não deve criar uma terceira fonte de verdade.

Ação: mapear, por operação, qual fonte é oficial hoje e qual é somente compatibilidade/migração.

### 2. Regras financeiras distribuídas
Parte das regras está no backend, parte em `packages/core` e parte ainda em utilitários/testes do frontend legado.

Ação: catalogar cada regra antes de transportar qualquer tela de escrita.

### 3. Sincronização
Existem mecanismos de confirmação, receipt/idempotência, write-ahead/outbox e recuperação.

Ação: manter esses contratos e criar um único serviço de mutação para a V15. Nenhuma tela deve gravar diretamente por caminhos alternativos.

### 4. Cartões
Existem regras de fechamento, vencimento, parcelas e identidade visual.

Ação: separar regra financeira do ciclo da regra puramente visual da arte do cartão.

## Fases

### Fase 1 — Inventário técnico
Status: EM ANDAMENTO

- mapear banco e entidades.
- mapear API e rotas.
- mapear regras financeiras.
- mapear sincronização.
- mapear autenticação/permissões.
- mapear notificações, WhatsApp, e-mail e Alexa.
- mapear Android/atualização.
- identificar código visual legado.

Saída: matriz `preservar / adaptar / descartar`.

### Fase 2 — Contratos da V15
- definir tokens visuais da V15.
- congelar estrutura de sidebar/topbar/dock mobile.
- definir comportamento responsivo por container/workspace.
- definir componentes básicos: cards, tabelas, filtros, selects, drawers, modais, badges e feedback de gravação.
- proibir importação de CSS legado na nova raiz.

### Fase 3 — Leitura real sem escrita
- autenticação real.
- bootstrap real.
- Dashboard real.
- Lançamentos em leitura.
- Histórico.
- Pendentes.
- Cartões.
- Cadastros.

Critério: os mesmos dados e totais do sistema atual devem aparecer na V15.

### Fase 4 — Escrita controlada
Ordem sugerida:
1. novo lançamento.
2. edição.
3. baixa/recebimento.
4. alteração em lote.
5. exclusão/arquivamento.
6. recorrência.
7. cartão/parcelamento.

Cada operação deve esperar confirmação do backend antes de liberar nova ação.

### Fase 5 — Integrações e configurações
- WhatsApp.
- e-mail.
- notificações.
- usuários/permissões.
- backup/recuperação.
- Android/update.

### Fase 6 — Paridade e troca
- comparar V15 nova x produção por tela.
- validar saldo, receitas, despesas, pendências, cartões, faturas e projeções.
- validar Web, celular e tela dividida.
- manter rollback até a aprovação final.
- somente depois substituir a Web atual.

## Critérios obrigatórios de aceite

- nenhum dado fictício em produção.
- nenhum valor financeiro deve depender de CSS ou de estado local não confirmado.
- nenhuma tela pode sobrepor texto em larguras suportadas.
- a interface deve responder ao espaço útil do conteúdo, não apenas ao viewport.
- filtros/popovers fecham ao clicar fora e com Escape quando aplicável.
- navegação entre telas deve reutilizar dados pré-carregados/cacheados.
- alterações de dados precisam de confirmação visível de persistência.
- regras financeiras existentes não serão reescritas por suposição.
- V15 é a referência visual; sistema atual é referência funcional durante a migração.

## Primeira matriz de classificação

| Área | Decisão | Observação |
|---|---|---|
| PostgreSQL/Prisma | PRESERVAR | Fonte persistente |
| API Fastify/serviços | PRESERVAR | Reusar contratos existentes |
| `packages/core` | PRESERVAR | Motor financeiro/regras |
| AppState | ADAPTAR | Compatibilidade; não criar nova dependência estrutural |
| Entidades normalizadas | PRESERVAR | Caminho preferencial de domínio |
| Auth/Workspace | PRESERVAR | Sessão, papéis e isolamento |
| WhatsApp/E-mail | PRESERVAR | Backend independente da UI |
| Notificações | PRESERVAR | Serviço próprio |
| Alexa | PRESERVAR | Integração separada |
| Android/Capacitor | ADAPTAR | Consumir nova V15 quando estável |
| V15 HTML validada | PRESERVAR COMO ESPECIFICAÇÃO | Não usar dados demo como fonte |
| React/CSS visual atual | DESCARTAR GRADUALMENTE | Só reaproveitar lógica não visual comprovada |
| `global.css` legado na nova V15 | DESCARTAR | Nova raiz deve ser clean-room |
| adaptadores V15 sobre legado | DESCARTAR | Não entram na arquitetura final |

## Regra de segurança

Até a fase de paridade, `main` continua sendo a produção. Todo o trabalho Phoenix/V15 limpo acontece em branch separada. Nenhuma migração de banco ou alteração destrutiva será feita como parte da reconstrução visual.
