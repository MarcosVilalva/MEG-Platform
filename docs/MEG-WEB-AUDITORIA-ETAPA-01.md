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
| Benefício explícito + legado Verocard | DUPLICADA / DIVERGENTE | `apps/web/src/legacy-financial-accounts.js:1-27,38-96`; `apps/api/src/modules/finance/monetary-protection.ts:42-58`; `apps/api/src/modules/payables/core.ts:13-19` | O legado mantém `financialAccountId` + `financialScope` e migração por heurísticas VEROCARD/ALIMENTAÇÃO. A API normalizada usa `accountId` + `Account.type`, mas ainda mantém heurísticas VEROCARD; o core de payables é mais estreito e não reconhece conta explícita. | Benefícios, Pendentes, saldos |
| Saldo insuficiente de benefício | OK | `apps/api/src/modules/finance/benefit-event-mutation.ts:75-97,159-168,312-321` | Despesa de benefício calcula saldo na data e bloqueia quando não há saldo. | Benefícios, Registrar recarga |
| Benefício sempre realizado | OK | `benefit-event-mutation.ts:173-185,329-340` | Recarga/despesa do writer canônico é persistida com `status: paid`. | Benefícios |
| Parcelamento por centavos | DUPLICADA coerente | `apps/api/src/modules/cards/service.ts:317-337`; `apps/api/src/modules/cards/routes.ts:133-149`; `apps/api/src/modules/payables/create-service.ts:45-51` | Total vira centavos; divisão usa piso; resto de centavos é distribuído nas primeiras parcelas. | Novo Lançamento, Cartões, Pendentes |
| Competência inicial do cartão | DUPLICADA coerente | `cards/service.ts:317-336`; `cards/routes.ts:139-149` | Compra no dia do fechamento permanece no mês; somente compra com dia > fechamento migra para o mês seguinte. | Novo Lançamento, Cartões |
| Vencimento de fatura / fim de semana | OK | `apps/api/src/modules/finance/card-statement-canonical.ts:122-142` | Dia é limitado ao último dia do mês; sábado vai +2 dias e domingo +1 dia. | Cartões, Pagar fatura |
| Fatura canônica / saldo credor | OK | `card-statement-canonical.ts:144-161,176-261` | Créditos reduzem encargos; saldo credor nunca vira valor pagável negativo. | Cartões |
| Limite comprometido | OK com legado coexistente | `apps/api/src/modules/cards/service.ts:237-258` | Todas as parcelas oficiais abertas e compras legadas abertas comprometem limite, inclusive meses futuros. | Cartões |
| Pagamento de fatura | DECIDIDO / CONSOLIDADO | `apps/api/src/modules/cards/routes.ts`; `apps/api/src/modules/cards/service.ts`; `card-statement-canonical.ts` | Contrato aceita valor opcional para pagamento parcial (`Outro`) e mantém pagamento total quando omitido. `Mínimo` só é exposto quando houver valor explícito; atualmente fica indisponível, sem percentual inventado. | Pagar fatura |
| Edição de compra parcelada | DECIDIDO / CONSOLIDADO | `apps/api/src/modules/cards/routes.ts` | Edição da compra preserva identidades das parcelas abertas; endpoint de edição unitária altera somente a parcela escolhida e reconcilia o total agregado pela soma das parcelas. Parcelas pagas ou parcialmente pagas permanecem protegidas. | Editar Lançamento, Cartões |
| Saldo inicial auditável | DECIDIDO / MIGRAÇÃO COMPATÍVEL | `apps/api/src/modules/finance/opening-balance.ts`; `catalog-mutation.ts`; `monetary-protection.ts`; legado `legacy-financial-accounts.js` | `OPENING_BALANCE` é a autoridade auditável aprovada. O campo `Account.openingBalance` permanece temporariamente como fallback compatível até materialização/migração segura dos eventos. | Configurações, Home, Relatórios |
| Projeção mensal antiga do core | DIVERGENTE / risco de autoridade dupla | `packages/core/src/projections/cashflow.ts:7-32`; `packages/core/src/finance/financial-engine.ts:28-64` | A projeção soma eventos por data sem aplicar a política canônica de status/conta/benefício; não deve ser adotada pela nova Web como autoridade financeira sem reconciliação. | Home, Relatórios, projeções |
| Precisão persistida | OK estrutural | `packages/database/prisma/schema.prisma:313-320,369-401,561-617` | Valores financeiros persistem em `Decimal`; comparações operacionais críticas normalizam para centavos. | Todas |
| Read model financeiro principal | OK / autoridade de leitura atual | `apps/api/src/modules/finance/routes.ts:247-297`; `apps/api/src/modules/finance/read-model.ts:1-310` | `/summary`, `/cashflow` e `/analytics` usam o `read-model.ts`, que consome `monetary-protection.ts` para status, escopo monetário e saldo inicial. | Home, Relatórios, KPIs |
| Preview Phoenix financeiro | CONSOLIDADA nesta branch | `apps/api/src/modules/finance/phoenix-preview-read.ts`; `financial-policy.ts`; `monetary-protection.ts` | Helpers duplicados de status, benefício, escopo monetário e saldo foram removidos do preview. O preview passou a consumir a política financeira central sem mudar o contrato de leitura. | Preview/compatibilidade |
| Summary/Cashflow antigos em `service.ts` | DIVERGENTE / legado não roteado | `apps/api/src/modules/finance/service.ts:251-401`; `apps/api/src/modules/finance/routes.ts:5-13,247-297` | Existem funções antigas que tratam receita passada como realizada e usam heurística Verocard; as rotas principais não as chamam mais. Não devem voltar a ser consumidas pela nova Web. | Nenhuma tela nova deve consumir |
| Política de status | CONSOLIDADA | `apps/api/src/modules/finance/financial-policy.ts`; `event-mutation.ts`; legado `transaction-status-policy.js` caracterizado | Writer geral resolve status no domínio. Receita é `paid`; Fixo é `paid`; cartão de crédito prevalece como `planned`; benefício é recusado no writer geral e segue contrato próprio. | Novo Lançamento, Editar Lançamento |
| Categoria/grupo Fixo | OK / CENTRALIZADA | `apps/api/src/modules/finance/financial-policy.ts`; `financial-policy.test.ts` | Categoria ou grupo Fixo entra como `paid`, exceto quando a forma é cartão de crédito, que prevalece como `planned` até pagamento da fatura. | Novo Lançamento, Pendentes |
| Crediário | FORA DO ESCOPO DA NOVA WEB | Decisão aprovada 06/10/2026 | Crediário não será utilizado na nova Web. O parcelamento de compras seguirá exclusivamente o domínio de cartão de crédito. Código legado de crediário não deve virar autoridade. | Nenhuma tela nova |
| Writer alternativo de baixa de payable | DIVERGENTE / não ativo na rota pública | `apps/api/src/modules/payables/payment-mutation.ts:37-132`; `apps/api/src/modules/payables/routes.ts:98-107`; `apps/api/src/server.ts:22,121` | A rota pública registrada usa `payPayableProtected`. O writer `createPayablePaymentProtected` permanece no repositório, mas não está ligado à rota pública e não contém a mesma proteção monetária. | Pendentes / integrações |

## Consolidação segura já executada

- Criado `apps/api/src/modules/finance/financial-policy.ts` como camada pura para regras de classificação monetária, benefício, status realizado, resumo monetário e decisão de saldo em centavos.
- `monetary-protection.ts` mantém os nomes/assinaturas públicas existentes por reexportação e continua responsável apenas pela proteção transacional/consultas que exigem banco.
- `phoenix-preview-read.ts` deixou de manter cópias próprias das regras monetárias e agora usa a mesma política central.
- Nenhuma regra divergente foi corrigida silenciosamente; esta consolidação alcançou apenas implementações equivalentes.

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

## Divergências e decisões atuais

1. **Saldo inicial — DECIDIDO/IMPLEMENTADO NA FUNDAÇÃO:** `OPENING_BALANCE` foi aprovado como autoridade auditável. A API passou a sincronizar o evento sistemático e mantém `Account.openingBalance` apenas como fallback de compatibilidade durante migração.
2. **Pagamento de fatura — DECIDIDO/IMPLEMENTADO NA FUNDAÇÃO:** pagamento total e parcial (`Outro`) passam a ser suportados. `Mínimo` permanece indisponível enquanto não existir valor explícito proveniente do domínio/dado da fatura; nenhum percentual será inventado.
3. **Edição de parcelas — DECIDIDO/IMPLEMENTADO NA FUNDAÇÃO:** existe edição unitária de parcela aberta, preservando os IDs e valores das demais; o total agregado da compra é reconciliado pela soma das parcelas.
4. **Benefício — COMPATIBILIDADE MANTIDA:** coexistem `financialScope` legado, conta explícita normalizada e heurísticas VEROCARD. A nova Web deve consumir a conta explícita; heurísticas permanecem apenas como ponte de migração.
5. **Projeção mensal — PENDENTE DE ENCERRAMENTO:** `packages/core` e a política monetária da API ainda precisam ter autoridade explicitamente definida para a nova Web.
6. **Baixa de payable — CARACTERIZADA:** a rota pública usa `payPayableProtected`; o writer `payment-mutation.ts` permanece alternativo e não conectado à rota pública.
7. **Read models duplicados — CONSOLIDADO:** `phoenix-preview-read.ts` passou a consumir a política monetária central.
8. **Summary/Cashflow antigos — LEGADO NÃO ROTEADO:** funções divergentes permanecem em `service.ts`, mas as rotas principais usam `read-model.ts`. Não devem ser reutilizadas pela nova Web.
9. **Status de lançamento — DECIDIDO/IMPLEMENTADO NA FUNDAÇÃO:** writer geral resolve status no domínio. Receita e Fixo entram como `paid`; cartão de crédito prevalece como `planned`; benefício continua no writer próprio.
10. **Fixo — DECIDIDO/IMPLEMENTADO NA FUNDAÇÃO:** regra centralizada em `financial-policy.ts`.
11. **Crediário — REMOVIDO DO ESCOPO:** a nova Web não utilizará crediário. O parcelamento canônico será o de cartão de crédito; código legado de crediário não será autoridade.

## Gates da Etapa 1

- [x] branch isolada criada a partir da main;
- [x] Android preservado;
- [x] nenhum código de UI criado;
- [x] mapa inicial das regras críticas por arquivo/linha;
- [x] duplicidades e divergências reportadas sem correção;
- [x] teste de caracterização da nova Web criado;
- [x] testes financeiros existentes relevantes adicionados ao gate;
- [x] gate isolado `MEG Web Evolution Foundation` executado com sucesso: caracterização financeira + core + compatibilidade financeira legada + política de status legada + build da API;
- [x] camada pura `financial-policy.ts` extraída sem quebrar assinaturas existentes;
- [x] duplicação monetária do Phoenix Preview consolidada na política central;
- [x] rota pública/caminho ativo de baixa de payable mapeados;
- [ ] CI global `MEG Platform CI` verde — advisories de `@capacitor/android` e `source-map-js` já foram corrigidos no lockfile; execução atual ainda precisa fechar todos os testes;
- [x] auditoria de saldo inicial encerrada e autoridade `OPENING_BALANCE` aprovada;
- [x] decisão formal sobre pagamento parcial de fatura registrada;
- [x] decisão formal sobre edição individual de parcelas registrada;
- [ ] consolidação da camada financeira central;
- [ ] fonte única de dados/mocks.

## Estado técnico da PR

O workflow isolado `MEG Web Evolution Foundation` passou integralmente: instalação, geração Prisma, `test:finance`, `test:core`, `test:legacy-finance`, `test:transaction-status-policy` e build da API.

O security gate global já passou após a autorização de atualização técnica: `@capacitor/android/@capacitor/core/@capacitor/cli` foram atualizados para a linha 7.6.9 e `source-map-js` foi fixado em 1.2.2. O Android permanece congelado funcional e visualmente; a exceção foi apenas para correção de dependência de segurança. O CI global ainda aguarda fechamento de todos os testes da branch.

## Observação sobre `financialScope`

A auditoria aprofundada confirmou que `financialScope` existe no legado Web, especialmente em `apps/web/src/legacy-financial-accounts.js`, ao lado de `financialAccountId`. A camada normalizada da API não persiste esse campo: usa `accountId` e `Account.type`. Portanto, o problema real é uma coexistência de modelos entre legado e API, com heurísticas VEROCARD como ponte de compatibilidade.

**Importante:** as decisões críticas já foram formalizadas e parte da consolidação foi implementada. A Etapa 1 só pode ser encerrada quando os gates estiverem verdes e as autoridades legadas restantes estiverem explicitamente classificadas como canônicas, compatibilidade ou não utilizadas.


## Decisões aprovadas — 06/10/2026

- **OPENING_BALANCE:** aprovado como autoridade definitiva do saldo inicial, com migração compatível.
- **Fatura:** aprovado pagamento total e parcial. `Mínimo` não terá percentual inventado; deve vir de dado/regra explícita.
- **Parcelas:** aprovado editar somente a parcela escolhida, preservando as demais e reconciliando o total da compra pela soma das parcelas.
- **Status:** aprovado centralizar Receita/Fixo como `paid`; cartão de crédito permanece pendente até pagamento da fatura; benefício continua no contrato próprio.
- **Crediário:** removido do escopo da nova Web por decisão atual. A regra canônica de parcelamento passa a ser cartão de crédito.
- **Capacitor:** autorizada atualização necessária para corrigir o advisory crítico, sem liberar mudanças funcionais/visuais no Android.
