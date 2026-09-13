# MEG V15 Phoenix — Auditoria da fonte de Histórico

Este documento define o que pode e o que ainda não pode ser chamado de histórico/auditoria na Phoenix V15.

## Conclusão executiva

Hoje existem duas fontes distintas:

1. `AuditLog`, persistido no banco PostgreSQL/Prisma;
2. `AppState.state.activityLog`, mantido pelo fluxo legado de estado compartilhado.

Eles não são equivalentes e a Phoenix não deve misturá-los silenciosamente.

A tela V15 validada pressupõe um histórico com usuário, ação, horário, origem, sincronização, registro, comparação antes/depois e caráter protegido/imutável. Nenhuma das fontes atuais, isoladamente, foi confirmada como capaz de fornecer todo esse contrato para lançamentos financeiros.

## 1. AuditLog no banco

O schema Prisma possui:

- `id`;
- `userId` opcional;
- `entity`;
- `entityId`;
- `action`;
- `metadata` opcional;
- `ipAddress` opcional;
- `createdAt`.

Há índices por `userId` e por `entity + entityId`.

### Uso confirmado

O serviço de autenticação grava `AuditLog` para eventos administrativos e de segurança, entre eles:

- solicitação/registro de acesso;
- alteração de acesso de usuário;
- redefinição de senha;
- testes de entrega de e-mail e outras ações de segurança.

Portanto a tabela é real e já possui utilidade operacional.

### Limitação encontrada

Não foi localizado, na estrutura atual de módulos da API, um módulo/endpoint dedicado de Histórico/Auditoria que exponha `AuditLog` para a Web.

Também não foi comprovado ainda que criação, alteração, baixa e exclusão de todos os lançamentos financeiros gerem registros equivalentes em `AuditLog`.

**Decisão Phoenix:** não criar uma tela que chame `AuditLog` de auditoria financeira completa até essa cobertura ser confirmada e exposta por um contrato do backend.

## 2. activityLog dentro do AppState

O arquivo `activity-log-core.js` mantém um histórico operacional de lançamentos por comparação entre o estado anterior e o próximo estado de `transactions`.

Ações produzidas:

- `CREATED`;
- `UPDATED`;
- `DELETED`;
- `RECOVERED` para recuperação de snapshots.

Cada item registra, entre outros campos:

- identificador;
- data/hora;
- `userId`;
- `userName`;
- ação;
- `transactionId`;
- snapshot do lançamento.

O histórico é limitado a 500 itens.

Metadados exclusivamente classificatórios são ignorados na detecção de alteração operacional para evitar gerar atividade sem mudança financeira relevante.

### Limitações

- fica embutido no estado compartilhado, e não em uma tabela de auditoria independente;
- registra o snapshot associado ao evento, mas não mantém explicitamente os dois objetos `before` e `after` necessários à comparação V15;
- o cliente legado de Histórico pode combinar o snapshot armazenado com o lançamento atualmente existente;
- o histórico legado também podia considerar cache/localStorage e estado global do navegador;
- portanto não deve ser apresentado como trilha de auditoria imutável do servidor.

## 3. Tela activity-history.js

A implementação legada possui recursos úteis de experiência, como:

- ordenação do mais recente para o mais antigo;
- filtros por ação e usuário;
- consolidação de parcelamentos;
- ações `CREATED`, `UPDATED`, `DELETED` e `RECOVERED`;
- exibição do usuário responsável.

Esses conceitos podem orientar a experiência Phoenix, mas o código visual e sua política de fonte não serão reutilizados.

## 4. Contrato necessário para a V15

Antes de considerar a tela Histórico concluída, o backend precisa fornecer uma fonte explícita com, no mínimo:

- `id` do evento;
- data/hora;
- usuário responsável;
- ação normalizada;
- entidade e identificador do registro;
- origem da ação;
- estado de sincronização, quando aplicável;
- snapshot anterior, quando existir;
- snapshot posterior, quando existir;
- metadados de recuperação/baixa/estorno, quando aplicável;
- paginação e filtros por período, ação e usuário.

A interface não deve tentar reconstruir `before/after` retrospectivamente a partir do estado atual.

## 5. Estratégia de migração

### Fase A — leitura parcial segura

Enquanto o contrato consolidado não existir, a Phoenix pode exibir uma tela de Histórico identificada como **Histórico operacional**, alimentada por `activityLog`, sem afirmar que se trata de auditoria imutável e sem inventar comparação antes/depois.

### Fase B — contrato de backend

Criar um endpoint somente leitura de histórico/auditoria que centralize a fonte apropriada. A implementação deverá decidir explicitamente como conciliar eventos financeiros do AppState e registros de `AuditLog`, sem apagar a origem de cada item.

### Fase C — cobertura de escrita

Antes de liberar a escrita Phoenix, cada mutação financeira deverá produzir o registro necessário à trilha definida pelo contrato. Isso deve fazer parte do `PhoenixMutationGateway`, e não dos componentes React.

### Fase D — paridade V15

Somente após as fases anteriores habilitar:

- detalhe do evento;
- comparação antes/depois;
- origem;
- sincronização;
- abertura do lançamento relacionado;
- exportação de histórico filtrado;
- indicação de registro protegido.

## Regra permanente

**A Phoenix não fabricará auditoria.** Se a fonte não suportar um campo da V15, a interface deverá informar que ele ainda não está disponível ou permanecer em modo de histórico operacional até que o backend forneça o dado real.
