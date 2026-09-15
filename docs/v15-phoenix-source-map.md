# MEG V15 Phoenix — Mapa de fontes e contratos

Este documento registra de onde cada parte da nova V15 deve ler e, futuramente, gravar. A finalidade é impedir que a reconstrução crie uma terceira fonte de verdade ou replique regras financeiras na interface.

## Regra geral

A interface Phoenix nunca calcula sozinha aquilo que já possui contrato no backend. O frontend organiza, apresenta, filtra e coleta entrada. Saldos, ciclo financeiro, permissões, persistência e efeitos contábeis pertencem aos serviços existentes.

## 1. Autenticação e sessão

**Fonte atual:** `/auth/*` + `AuthSession`.

- sessão Web fica em `sessionStorage`;
- access token é renovado pelo refresh token;
- uma resposta 401 tenta renovação automática antes de encerrar a sessão;
- papéis: `ADMIN`, `MANAGER`, `OPERATOR`, `VIEWER`;
- status: `PENDING`, `ACTIVE`, `REJECTED`, `BLOCKED`.

**Decisão Phoenix:** PRESERVAR. A nova interface reutiliza o contrato, mas a apresentação de login/perfil será V15 limpa.

## 2. Workspace e isolamento

**Fonte atual:** `Workspace`, `WorkspaceMember` e `resolveWorkspaceContext()`.

O backend prioriza o workspace pertencente ao próprio usuário e, na ausência dele, o primeiro workspace ativo em que o usuário é membro.

**Decisão Phoenix:** PRESERVAR.

**Ponto de atenção:** nem todas as entidades financeiras antigas possuem `workspaceId`. Algumas ainda são vinculadas por `userId` ou são globais. A nova UI não deve tentar corrigir isso silenciosamente; qualquer saneamento de isolamento é uma evolução de backend separada.

## 3. Lançamentos — leitura compartilhada

Existem duas representações relacionadas:

1. `AppState.state.transactions` — contrato legado compartilhado e ordenado;
2. `FinancialEvent` — projeção normalizada e domínio financeiro estruturado.

O endpoint `GET /app-state` já executa o mecanismo de reconciliação:

- quando a normalização está ativa e reconciliada, reconstrói `transactions` a partir de `FinancialEvent`;
- se houver divergência, usa automaticamente AppState como fallback;
- expõe `dataSource`, `normalizedPrimary` e dados de integridade.

**Decisão Phoenix para leitura:** usar o backend como árbitro. A Phoenix pode consumir os endpoints normalizados para resumos e consultas de domínio, mas não deve manter uma cópia financeira independente no navegador.

## 4. Lançamentos — escrita durante a transição

A Web atual ainda possui um caminho importante de gravação por `PATCH /app-state/transactions`.

Esse protocolo contém:

- `operationId`;
- `expectedRevision`;
- detecção de conflito;
- receipt/idempotência por `CloudMutationReceipt`;
- confirmação da mutação;
- sincronização dos registros alterados para `FinancialEvent` quando a base normalizada está ativa.

Em paralelo, existem `POST/PATCH/DELETE /finance/events`, que gravam diretamente `FinancialEvent`.

**Decisão Phoenix:** nenhuma tela de escrita será liberada até existir um único `PhoenixMutationGateway` com uma decisão explícita por operação. Não serão misturados `app-state/transactions` e `/finance/events` dentro de componentes de tela.

## 5. Dashboard, fluxo, análises e orçamento

**Fonte atual preferencial:** endpoints de domínio financeiro:

- `GET /finance/summary`;
- `GET /finance/cashflow`;
- `GET /finance/analytics`;
- `GET /finance/budgets`.

Esses serviços leem `FinancialEvent` e demais tabelas normalizadas.

**Decisão Phoenix:** PRESERVAR e usar diretamente. A UI não deve recalcular totais a partir da tabela visível quando já existir resposta oficial do backend.

## 6. Contas, classificações e formas de pagamento

**Fonte atual:** `Account`, `Category`, `PaymentMethod` via `/finance/*`.

**Decisão Phoenix:** PRESERVAR os contratos CRUD.

**Ponto de atenção:** essas entidades atualmente não possuem `workspaceId` no schema. Como a reconstrução é de interface, a Phoenix preservará o comportamento atual e registrará essa limitação para uma evolução posterior de isolamento.

## 7. Cartões

**Fonte estruturada:** `CreditCard`, `CardPurchase`, `CardInstallment`.

A rota de cartões ainda possui compatibilidade com AppState:

- cartões legados podem ser migrados automaticamente para `CreditCard`;
- compras antigas ainda podem ser agregadas aos resultados com prefixo `legacy-`;
- compras novas são criadas em `CardPurchase` e parceladas em `CardInstallment`;
- o fechamento define o primeiro `statementMonth`;
- pagamento da fatura fecha parcelas abertas e cria `FinancialEvent` de despesa.

**Decisão Phoenix:** usar `/cards` como contrato oficial de tela enquanto essa compatibilidade existir. A UI não deve tentar reconstruir faturas por conta própria.

### Identidade visual

A imagem do cartão é apresentação, não regra financeira. A identidade deve usar uma tabela visual explícita baseada prioritariamente em `issuer`, `brand` e produto/nome cadastrado. Heurísticas amplas como tratar AZUL e LATAM como equivalentes são proibidas.

## 8. Pendentes / contas a pagar

**Fonte atual:** `Payable`, `PayablePayment`, `RecurringExpense` via `/payables`.

- parcelamento divide em centavos no backend;
- recorrência gera títulos conforme horizonte;
- pagamento reduz `openAmount`, muda status e cria `FinancialEvent` correspondente;
- cancelamento não exclui pagamento já concluído.

**Decisão Phoenix:** PRESERVAR. Seleção em lote e simulação de baixa são estado de interface; a efetivação deverá usar contratos confirmados do backend.

## 9. Contas a receber

**Fonte atual:** `Receivable`, `Receipt`, `Customer` via `/receivables`.

**Decisão Phoenix:** PRESERVAR. A nova V15 apenas reorganiza a experiência.

## 10. Histórico e auditoria

O schema possui `AuditLog`, mas a tela React atual chamada Histórico não é uma auditoria real: ela transforma os lançamentos financeiros em uma lista cronológica de atividades.

**Decisão Phoenix:** não transportar essa simplificação como se fosse auditoria. Antes da tela V15 de histórico ser considerada concluída, deve existir uma fonte explícita de eventos de auditoria/atividade com usuário, ação, antes/depois e sincronização. Até isso ser confirmado, a tela ficará em leitura parcial e identificada como tal no desenvolvimento.

## 11. Sincronização

Componentes já encontrados e que devem ser preservados conceitualmente:

- `revision`;
- confirmação de mutação;
- `CloudMutationReceipt`;
- idempotência por `operationId`;
- conflito 409;
- normalização com reconciliação e fallback;
- mecanismos Web já existentes de write-ahead/outbox/recuperação.

**Decisão Phoenix:** centralizar em uma camada única. Componentes visuais não chamarão múltiplos protocolos de persistência diretamente.

## 12. Notificações, WhatsApp e e-mail

**Fonte atual:** backend de notificações e integrações por workspace.

- WhatsApp utiliza Evolution API;
- credencial é criptografada no backend com AES-256-GCM;
- e-mail possui configuração de remetente/resposta;
- há destinatários, resumo diário e consultor financeiro;
- Alexa possui integração própria.

**Decisão Phoenix:** PRESERVAR integralmente os serviços. A V15 fornecerá apenas a nova interface de configuração e status.

## 13. Android

**Fonte atual:** Capacitor + módulos de atualização, biometria e notificações existentes.

**Decisão Phoenix:** ADAPTAR após a Web Phoenix atingir estabilidade de leitura e escrita. Não duplicar regras financeiras no aplicativo.

## 14. Performance e carregamento

A implementação atual possui cache de GET e prefetch, porém o boot ainda depende de confirmar `/app-state` antes de liberar a interface.

A Phoenix adotará um `read model` único por período:

- carrega em paralelo resumo, catálogo, cartões, pendentes e lançamentos recentes;
- mantém os dados em memória durante a navegação;
- revalida sem apagar o conteúdo já confirmado;
- mostra indicador de atualização, não uma tela vazia entre seções;
- nunca exibe dados locais antigos como se fossem dados confirmados da base.

## Matriz de fonte oficial da primeira versão Phoenix

| Domínio | Leitura Phoenix | Escrita futura | Situação |
|---|---|---|---|
| Sessão | `/auth` | `/auth` | definida |
| Workspace | backend workspace | backend workspace | definida |
| Dashboard | `/finance/summary` | n/a | definida |
| Fluxo | `/finance/cashflow` | n/a | definida |
| Análises | `/finance/analytics` | n/a | definida |
| Lançamentos recentes | `/finance/events` + integridade AppState | gateway único | escrita pendente de decisão |
| Estado compartilhado legado | `/app-state` | gateway único | compatibilidade/fallback |
| Cartões | `/cards` | `/cards` por gateway | definida com compatibilidade legado |
| Pendentes | `/payables` | `/payables` por gateway | definida |
| Recebíveis | `/receivables` | `/receivables` por gateway | definida |
| Catálogos | `/finance/accounts`, `/categories`, `/payment-methods` | mesmos contratos | definida |
| Histórico V15 | fonte de auditoria a consolidar | n/a | pendente |
| Notificações | `/notifications` | `/notifications` | definida |
| Integrações | `/integrations` | `/integrations` | definida |

## Condição para liberar escrita Phoenix

Uma operação só poderá ser ativada quando estiver documentado:

1. endpoint oficial;
2. regra de permissão;
3. regra de idempotência/confirmação;
4. efeito sobre AppState e/ou entidades normalizadas;
5. efeito sobre saldo, ledger, fatura ou título relacionado;
6. comportamento em conflito e falha de rede;
7. teste de regressão correspondente.

Até lá, a raiz Phoenix permanece somente leitura.