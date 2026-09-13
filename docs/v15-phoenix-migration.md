# MEG V15 Phoenix — plano de migração clean-room

## Objetivo

Reconstruir a camada Web usando a V15 validada como contrato visual canônico, preservando o motor financeiro, os dados reais, a API, o banco, autenticação, sincronização, auditoria, cartões, notificações e integrações existentes.

A V15 deixa de ser um tema aplicado ao sistema antigo e passa a ser uma nova entrada de aplicação, isolada do layout legado.

## Princípios obrigatórios

1. **Dados e regras são patrimônio do sistema.** Nenhuma regra financeira é reimplementada por aparência ou suposição.
2. **V15 é a fonte visual.** Estrutura, hierarquia, densidade, componentes, navegação e responsividade partem do HTML `MEG_validacao_cadastros_v15(1).html`.
3. **Sem dados fictícios em produção.** Valores e listas da V15 de validação são substituídos por dados da API/AppState.
4. **Sem CSS legado na nova entrada.** A nova aplicação não importa `global.css`, `meg-v15.css`, `v15-contract.css`, `AppShell` nem componentes visuais da Web atual.
5. **Migração paralela.** A Web atual permanece disponível até existir paridade funcional e financeira comprovada.
6. **Leitura antes de escrita.** A nova V15 começa em modo leitura. Mutação só entra após validar saldos, lançamentos, cartões e pendências.
7. **Sem alteração de banco por conveniência visual.** Schema/API só mudam quando faltar contrato real de negócio.

## Arquitetura preservada

### Backend e dados

- PostgreSQL via Prisma.
- `Workspace` e `WorkspaceMember` para contexto compartilhado.
- `AppState` com revisão, conflitos, recibos de mutação e idempotência.
- Base normalizada com `FinancialEvent`, `LedgerEntry`, `Account`, `Category` e `PaymentMethod`.
- `CreditCard`, `CardPurchase` e `CardInstallment`.
- `Payable`, `PayablePayment` e `RecurringExpense`.
- `Receivable` e `Receipt`.
- `AuditLog`.
- Sessões de autenticação e perfis ADMIN / MANAGER / OPERATOR / VIEWER.
- Configuração de WhatsApp e e-mail por workspace.
- Notificações, resumo diário, consultor financeiro e Alexa.

### Regras financeiras já identificadas

- Saldo realizado usa eventos monetários realizados; benefício alimentação fica fora do saldo monetário.
- Receita entra no realizado; despesa só reduz realizado quando paga/confirmada/conciliada.
- Pendente reduz o resultado projetado, não o realizado.
- Cartão calcula a primeira fatura pelo dia de fechamento e reparte centavos entre parcelas sem perder o total.
- Pagamento de fatura baixa parcelas e gera evento financeiro de despesa.
- Contas a pagar suportam parcelamento, recorrência, pagamento parcial, juros e multa.
- Mutação do AppState exige `expectedRevision` e usa `operationId` para evitar duplicação.
- Usuário VIEWER é leitura; escrita é restrita por papel e licença/workspace.

## Classificação de migração

### Preservar integralmente

- `apps/api`
- `packages/core`
- `packages/database`
- contratos de autenticação
- `app-state` e protocolo de sincronização
- regras de cartões
- regras de contas a pagar/receber
- auditoria
- notificações e integrações
- ativos oficiais de marca

### Adaptar

- clientes Web para uma fachada V15 de leitura/escrita
- estado de UI (período, tema, menu, filtros)
- identidade visual dos cartões usando nome/emissor/bandeira reais
- navegação e roteamento
- feedback de sincronização
- operações de baixa protegida

### Descartar como legado visual

- shell/layout Web atual
- CSS global legado
- adaptadores que sobrepõem V15 sobre componentes antigos
- breakpoints dependentes apenas da viewport quando o componente precisa responder ao workspace
- componentes visuais intermediários anteriores à V15
- dados demonstrativos hardcoded da V15

## Estratégia de implantação

### Fase 1 — inventário e contrato
- mapear APIs, schema, regras, permissões e integrações;
- congelar o HTML V15 como fonte visual;
- criar teste que impeça importação do layout legado pela nova entrada.

### Fase 2 — leitura real
- autenticação;
- shell V15;
- período global;
- Dashboard usando a mesma regra financeira atual;
- pré-carregamento da base compartilhada;
- cartões e pendências em segundo plano.

### Fase 3 — operação principal
- Lançamentos;
- Histórico/auditoria;
- Pendentes e baixa protegida;
- Cartões.

### Fase 4 — administração
- Cadastros;
- Usuários/permissões;
- Configurações;
- integrações e notificações.

### Fase 5 — escrita controlada
- criar/editar/arquivar;
- pagar/baixar;
- cartão/fatura;
- recorrência;
- confirmação de gravação;
- conflito de revisão e recuperação.

### Fase 6 — paridade
Para o mesmo período e a mesma base, comparar automaticamente:
- saldo anterior;
- receitas;
- despesas pagas;
- pendentes;
- saldo realizado;
- resultado projetado;
- cartões/faturas;
- quantidade de eventos;
- histórico/auditoria.

### Fase 7 — corte
Somente depois de paridade visual e financeira:
- V15 vira `index.html`;
- Web anterior fica preservada por uma janela de contingência;
- Android passa a consumir a mesma entrada estabilizada.

## Primeira entrega desta branch

A branch `feat/v15-phoenix-clean-room` introduz:
- `v15.html` como entrada paralela;
- CSS fonte da V15 imutável;
- CSS mínimo de integração React separado;
- shell V15 novo;
- autenticação reaproveitando o contrato existente;
- Dashboard em leitura usando o AppState real e a mesma regra atualmente validada;
- carregamento prioritário do AppState e carregamento secundário de cartões/cadastros/pendências;
- teste clean-room para bloquear dependência visual do sistema antigo.

Nenhuma mutação financeira é habilitada nesta primeira entrega.
