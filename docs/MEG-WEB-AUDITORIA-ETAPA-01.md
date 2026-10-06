# MEG Web Evolution — Etapa 01 — Auditoria e Fundação

**Branch:** `meg-web-evolution/01-auditoria-fundacao`  
**Base:** `main@87e04b989568d95c182927c6f493061be26440db`  
**Escopo:** somente regras financeiras, serviços, testes, schema e documentação. Nenhuma UI e nenhum arquivo Android foram alterados.

## Critério

Classificação:
- **OK**: existe uma autoridade atual coerente e já protegida por contrato/teste.
- **DUPLICADA**: a mesma regra aparece em mais de um ponto.
- **DIVERGENTE**: implementações ou contratos coexistentes produzem ou exigem comportamentos diferentes.
- **PENDENTE**: ainda é necessário confirmar o caminho ativo/callers antes de qualquer correção.

## Mapa inicial de regras

| Regra | Classificação | Arquivo:linha | Comportamento atual | Consumidores/telas futuras |
|---|---|---|---|---|
| Saldo monetário realizado | OK | `apps/api/src/modules/finance/monetary-protection.ts:60-80,139-199` | Só `paid/reconciled/confirmed` entram no saldo; transferências e benefício ficam fora do caixa monetário. | Home, Lançamentos, Pendentes, Cartões, Transferência |
| Pago x pendente | OK | `monetary-protection.ts:60-80`; `apps/api/src/modules/payables/service.ts:79-88` | Previsto não financia baixa; pendência permanece aberta até pagamento. | Home, Pendentes, KPIs |
| Proteção contra saldo insuficiente monetário | DUPLICADA controlada | `monetary-protection.ts:122-130`; `payables/service.ts:291-300`; `cards/service.ts:444-446` | Comparação é feita em centavos; baixa/fatura é bloqueada se solicitado > disponível. | Confirmar pagamento, Pagar fatura |
| Saldo por conta na transferência | OK | `apps/api/src/modules/finance/transfer-service.ts:46-67,165-171` | Usa saldo realizado da conta origem até a data da operação e bloqueia falta de saldo. | Nova Transferência |
| Transferência conservativa | OK | `apps/api/src/modules/finance/transfer-core.ts:60-124` | Cria duas pernas iguais e opostas; origem e destino não podem ser a mesma conta. | Nova Transferência, relatórios |
| Atomicidade financeira | OK | `monetary-protection.ts:338-354` | Mutações críticas usam transação Prisma `Serializable`, com retry para conflito P2034. | Todas as operações de escrita |
| Benefício explícito + legado Verocard | DUPLICADA / DIVERGENTE | `monetary-protection.ts:42-58`; `apps/api/src/modules/payables/core.ts:13-19` | A regra central aceita conta `benefit`, forma VEROCARD ou descrição contendo VEROCARD; o core de payables reconhece apenas forma/descrição e não a conta explícita. | Benefícios, Pendentes, saldos |
| Saldo insuficiente de benefício | OK | `apps/api/src/modules/finance/benefit-event-mutation.ts:75-97,159-168,312-321` | Despesa de benefício calcula saldo na data e bloqueia quando não há saldo. | Benefícios, Registrar recarga |
| Benefício sempre realizado | OK | `benefit-event-mutation.ts:173-185,329-340` | Recarga/despesa do writer canônico é persistida com `status: paid`. | Benefícios |
| Parcelamento por centavos | DUPLICADA coerente | `apps/api/src/modules/cards/service.ts:317-337`; `apps/api/src/modules/cards/routes.ts:133-149`; `apps/api/src/modules/payables/create-service.ts:45-51` | Total vira centavos; divisão usa piso; resto de centavos é distribuído nas primeiras parcelas. | Novo Lançamento, Cartões, Pendentes |
| Competência inicial do cartão | DUPLICADA coerente | `cards/service.ts:317-336`; `cards/routes.ts:139-149` | Compra no dia do fechamento permanece no mês; somente compra com dia > fechamento migra para o mês seguinte. | Novo Lançamento, Cartões |
| Vencimento de fatura / fim de semana | OK | `apps/api/src/modules/finance/card-statement-canonical.ts:122-142` | Dia é limitado ao último dia do mês; sábado vai +2 dias e domingo +1 dia. | Cartões, Pagar fatura |
| Fatura canônica / saldo credor | OK | `card-statement-canonical.ts:144-161,176-261` | Créditos reduzem encargos; saldo credor nunca vira valor pagável negativo. | Cartões |
| Limite comprometido | OK com legado coexistente | `apps/api/src/modules/cards/service.ts:237-258` | Todas as parcelas oficiais abertas e compras legadas abertas comprometem limite, inclusive meses futuros. | Cartões |
| Pagamento de fatura | DIVERGENTE com requisito da Etapa 1 | `apps/api/src/modules/cards/routes.ts:42-47`; `cards/service.ts:435-451` | API atual não recebe valor parcial; soma todas as parcelas abertas do mês e baixa todas. O comportamento atual é pagamento integral. | Pagar fatura |
| Edição de compra parcelada | DIVERGENTE com requisito da Etapa 1 | `apps/api/src/modules/cards/routes.ts:314-363` | Ao editar compra ainda não paga, executa `deleteMany` e recria todas as parcelas. Não preserva edição individual das demais. | Editar Lançamento, Cartões |
| Saldo inicial auditável | DIVERGENTE | `docs/GLOBAL_FINANCIAL_FOUNDATION.md:25-27`; `apps/api/src/modules/finance/catalog-mutation.ts:125-153`; `monetary-protection.ts:139-147` | Documento determina evento sistemático `OPENING_BALANCE`, mas o catálogo atual grava `Account.openingBalance` diretamente e o saldo monetário soma esse campo. | Configurações, Home, Relatórios |
| Projeção mensal antiga do core | DIVERGENTE / risco de autoridade dupla | `packages/core/src/projections/cashflow.ts:7-32`; `packages/core/src/finance/financial-engine.ts:28-64` | A projeção soma eventos por data sem aplicar a política canônica de status/conta/benefício; não deve ser adotada pela nova Web como autoridade financeira sem reconciliação. | Home, Relatórios, projeções |
| Precisão persistida | OK estrutural | `packages/database/prisma/schema.prisma:313-320,369-401,561-617` | Valores financeiros persistem em `Decimal`; comparações operacionais críticas normalizam para centavos. | Todas |
| Read model financeiro principal | OK / autoridade de leitura atual | `apps/api/src/modules/finance/routes.ts:247-297`; `apps/api/src/modules/finance/read-model.ts:1-310` | `/summary`, `/cashflow` e `/analytics` usam o `read-model.ts`, que consome `monetary-protection.ts` para status, escopo monetário e saldo inicial. | Home, Relatórios, KPIs |
| Preview Phoenix financeiro | DUPLICADA | `apps/api/src/modules/finance/phoenix-preview-read.ts:17-55,80-220` | Reimplementa localmente `isPosted`, conta monetária, benefício e cálculo de saldo. É compatível em vários pontos, mas duplica a autoridade central. | Preview/compatibilidade |
| Summary/Cashflow antigos em `service.ts` | DIVERGENTE / legado não roteado | `apps/api/src/modules/finance/service.ts:251-401`; `apps/api/src/modules/finance/routes.ts:5-13,247-297` | Existem funções antigas que tratam receita passada como realizada e usam heurística Verocard; as rotas principais não as chamam mais. Não devem voltar a ser consumidas pela nova Web. | Nenhuma tela nova deve consumir |
| Writer alternativo de baixa de payable | DIVERGENTE / não ativo na rota pública | `apps/api/src/modules/payables/payment-mutation.ts:37-132`; `apps/api/src/modules/payables/routes.ts:98-107`; `apps/api/src/server.ts:22,121` | A rota pública registrada usa `payPayableProtected`. O writer `createPayablePaymentProtected` permanece no repositório, mas não está ligado à rota pública e não contém a mesma proteção monetária. | Pendentes / integrações |

## Testes de caracterização adicionados

Arquivo novo:
- `apps/api/src/modules/finance/web-evolution-characterization.test.ts`

O gate caracteriza o comportamento atual para:
- virada de mês;
- fevereiro e mês de 30 dias;
- pago x pendente;
- saldo insuficiente monetário;
- compatibilidade benefício explícito + VEROCARD legado;
- crédito/débito e estorno;
- saldo insuficiente de benefício;
- divisão não exata de parcelas e preservação de centavos;
- fechamento e vencimento de fatura;
- fim de semana para segunda-feira;
- saldo credor de fatura;
- limite comprometido por parcelas futuras;
- transferência conservativa;
- comportamento atual de pagamento integral de fatura;
- comportamento atual de recriação de parcelas na edição;
- comportamento atual do saldo inicial gravado diretamente na conta.

Também foram incluídos no `test:finance` testes financeiros que existiam no repositório, mas não participavam desse gate:
- `monetary-protection.test.ts`;
- `transfer-core.test.ts`;
- `payables/core.test.ts`;
- `web-evolution-characterization.test.ts`.

## Divergências que NÃO serão corrigidas automaticamente

1. **Saldo inicial:** evento sistemático auditável no documento x campo direto no código.
2. **Pagamento parcial de fatura:** exigido na matriz de caracterização, mas a API ativa hoje só faz pagamento integral.
3. **Edição de parcelas:** requisito de preservar parcelas x rota atual recria todas.
4. **Benefício:** coexistência de autoridade por conta explícita e heurísticas VEROCARD.
5. **Projeção mensal:** `packages/core` e política monetária do API não calculam o mesmo conceito de saldo.
6. **Baixa de payable:** a rota pública foi confirmada em `payPayableProtected`; o writer `payment-mutation.ts` ficou caracterizado como alternativo e não conectado à rota pública.
7. **Read models duplicados:** `phoenix-preview-read.ts` ainda replica política monetária que já existe em `monetary-protection.ts`.
8. **Summary/Cashflow antigos:** funções divergentes permanecem em `service.ts`, embora não sejam usadas pelas rotas principais.

## Gates da Etapa 1

- [x] branch isolada criada a partir da main;
- [x] Android preservado;
- [x] nenhum código de UI criado;
- [x] mapa inicial das regras críticas por arquivo/linha;
- [x] duplicidades e divergências reportadas sem correção;
- [x] teste de caracterização da nova Web criado;
- [x] testes financeiros existentes relevantes adicionados ao gate;
- [x] gate isolado `MEG Web Evolution Foundation` executado com sucesso: caracterização financeira + core + build da API;
- [x] rota pública/caminho ativo de baixa de payable mapeados;
- [ ] CI global `MEG Platform CI` verde — atualmente bloqueado no security gate por `@capacitor/android` (critical) e `source-map-js` (high);
- [ ] auditoria de saldo inicial encerrada;
- [ ] decisão formal sobre pagamento parcial de fatura;
- [ ] decisão formal sobre edição individual de parcelas;
- [ ] consolidação da camada financeira central;
- [ ] fonte única de dados/mocks.

## Estado técnico da PR

O workflow isolado `MEG Web Evolution Foundation` passou integralmente: instalação, geração Prisma, `test:finance`, `test:core` e build da API.

O workflow global `MEG Platform CI` continua vermelho antes dos testes por um bloqueio de segurança de dependências já presente no lockfile: `@capacitor/android` em severidade crítica e `source-map-js` em severidade alta. O gate NÃO foi desativado nem contornado. Como Android está congelado, nenhuma atualização do Capacitor será feita automaticamente nesta etapa.

## Observação sobre `financialScope`

O checkpoint anterior mencionava coexistência com `financialScope`. Na `main` auditada não foi localizada ocorrência desse identificador. A fundação atual representa o escopo financeiro por `accountId` e `Account.type` (`checking`, `savings`, `cash`, `investment`, `credit`, `benefit`), mantendo heurísticas VEROCARD apenas para compatibilidade. O checkpoint deve ser atualizado para refletir o código real.

**Importante:** os testes de caracterização da fundação estão verdes. A consolidação financeira só deve começar depois de dar destino explícito às divergências de saldo inicial, pagamento parcial de fatura, edição de parcelas e autoridades duplicadas.
