# Issue #699 | Fase A | Contrato de idempotência e compatibilidade, antes da correção

**Data:** 24/11/2026. **Status:** Fase A autorizada; diagnóstico de contrato, NÃO é implementação concluída. **Branch:** PR #705 Draft. Não houve deploy, merge, alteração de APK estável, banco protegido ou produção.

## Causa reproduzida (não confundir com duplicidade contábil no ledger)

Gate PG17 descartável [45397090451](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45397090451): perda da resposta HTTP após commit, GET da revisão, retry sem operationId **com novo ID financeiro**. Tanto PATCH quanto PUT responderam HTTP 200 e persistiram dois FinancialEvent planned de R$ 12,35 para uma intenção, revisão final 3, saldo projetado R$ 475,30 sobre abertura R$ 500,00; LedgerEntry permaneceu vazio. A duplicação de lançamento financeiro é P0 comprovada; dupla baixa contábil não foi demonstrada.

## Pontos já protegidos na versão candidata, que NÃO devem ser reconstruídos

1. `apps/web/src/instant-persistence.js`: `persistOutbox` (aprox. 323–342) gera operationId ao registrar operações no armazenamento antes de `ensureOutboxConfirmed` (aprox. 496); reenvio usa a mesma identidade. Gate de bundle real [45390434997](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45390434997) PASS.
2. `apps/web/src/phoenix/data/phoenix-write-gateway.ts`: `preparePhoenixSimpleEvent` e demais preparadores geram operationId antes do request; journal em `apps/web/src/phoenix/data/phoenix-create-attempt-journal.ts` valida storage local e IndexedDB no candidato Android QA e impede nova intenção sem resolver a anterior. Preservar PT212.
3. `apps/api/src/modules/app-state/routes.ts`: PATCH transações tem recibo e mutação na mesma transação serializável, controle `expectedRevision`, replay de operationId+hash e 409 por intenção divergente (PT215). Contrato aceita `operationId` omitido (`z.guid().optional()`) e gera novo UUID no servidor, o que **não identifica um retry entre requisições**.
4. `PUT /app-state` não possui recibo idempotente equivalente; revisão sozinha é insuficiente quando o cliente realiza GET e reenvia.

## Invariante essencial

Uma identidade `operationId` aleatória, criada **antes do primeiro envio** e armazenada de maneira durável com seu contexto (user/workspace, tipo de operação, ID do evento), deve sobreviver a timeout, reinício e retry. A API deve gravar recibo atômico e verificar mesma identidade + mesmo pedido. Reuso da identidade com pedido divergente = 409 definitivo, sem perder a intenção pendente. A identidade NÃO deve ser recalculada de data/valor/descrição.

## Limite matemático do cliente legado sem identidade

Duas requisições com mesmo usuário, data, conta, valor e descrição e **IDs financeiros diferentes**, sem operationId, são indistinguíveis entre: (A) retry de uma intenção que teve resposta perdida; (B) duas ações legítimas idênticas. O servidor não pode prometer deduplicação perfeita para ambas usando apenas o payload. Mesmo um sinal temporal por sessão é heurístico, não prova.

**Consequência:** o item de decisão “proteção equivalente via recibo” deve ser implementado com negociação/compatibilidade explícita, sem atribuir falsamente garantias de idempotência a clientes legados que não enviam identidade. Gerar um novo UUID no servidor por chamada não resolve esse limite. Nunca descartar automaticamente ou confirmar duplicidade sem recibo confiável.

## Contratos candidatos a caracterizar em QA antes de alterar as rotas

| Cliente / rota | Comportamento proposto para caracterização | Risco de compatibilidade |
| --- | --- | --- |
| Web/Phoenix novo com operationId persistido | Recibo atômico, retry pelo mesmo ID, 409 definitivo para payload divergente, recuperação por leitura | Baixo, mas exige regressão financeira |
| PATCH legado sem operationId | Suspeita de nova intenção com mesmo fingerprint contextual dentro de janela curta produz código explícito de **verificação necessária**, sem gravar nova operação até resolução; comparar cenários legítimos idênticos | Clientes antigos podem repetir 409/422 indefinidamente ou não ter UI de confirmação |
| PUT legado sem operationId | Mesma triagem de suspeita **antes da gravação** e sem remover eventos omitidos; exigir caracterização separada de estado completo | Alto: o cliente pode reenviar snapshots completos e não compreender nova resposta |
| Novo cliente após suspeita | Fluxo de confirmação explícita autenticada e vinculada a intenção/versão, sem deduplicar automaticamente | Precisa interface/canal suportado; não presume alteração do Android estável |
| Cliente antigo incapaz de confirmar | Nunca prometer resolução invisível. Definir política operacional de bloqueio/atualização, com recuperação sem perder dados, antes de habilitar regra | Não se pode implantar um novo bloqueio sem gate real de APK compatível |

A tabela é **proposta de ensaio**. Não são novos requisitos de produto aprovados além da decisão de princípio do usuário; códigos HTTP, janelas temporais, telas e formato de recibo ainda precisam de especificação/validação antes de implementação.

## Gates mínimos afetados, sem repetir PT63–PT217

- Duas intenções idênticas legítimas com IDs distintos não podem ser eliminadas silenciosamente.
- Retry com mesmo operationId e resposta perdida permanece único; revisão não avança em replays idênticos.
- Retry legado com novo ID e revisão atualizada recebe triagem/alerta sem segunda gravação quando suspeito, com recuperação explícita comprovada no cliente suportado.
- PUT legado: preservação de IDs, sem exclusão implícita, sem novas mutações indevidas; resposta de suspeita deve ser compreensível pelo cliente antigo ou ter mitigação operacional aprovada.
- Concorrência serializável, recibos e operação principal atômicos; expurgo não autoriza reuso de identidade.
- Preservar Issue #698 encerrada, vínculos Ledger/ImportedRow/Receipt/PayablePayment; Issue #700 sem mapeamento automático.
- HTML/Web + API/Fastify/JWT/PG17 descartável; APK QA isolada somente se necessário para compatibilidade. Proteção real de Android estável proibida nesta fase.

## Gate de decisão antes de implementação de guarda legada

O requisito “alerta + confirmação explícita” **não pode ser presumido operacional em APK imutável que não entende o novo protocolo**. O próximo gate deve extrair/validar o comportamento da APK708 existente diante de um novo código de suspeita e confirmar se há canal de confirmação/atualização. Sem isso, implementar o bloqueio pode criar loop de sincronização P0 ainda pior. Nova API e UX requerem decisão explícita de compatibilidade antes de habilitar.

**Etapa 10 permanece aberta, Issue #699 P0 OPEN, PR #705 Draft.**
