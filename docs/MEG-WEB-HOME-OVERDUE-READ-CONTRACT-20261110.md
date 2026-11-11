# MEG Web Evolution — P0: leitura de compromissos vencidos

**Status:** auditoria confirmada e contrato de leitura PROPOSTO. A Home da PR #664 foi aprovada visualmente em 10/11/2026, mas o problema funcional permanece aberto: [issue #667](https://github.com/MarcosVilalva/MEG-Platform/issues/667).

## Evidências do repositório

1. `HomeDashboard.tsx` busca `/finance/events/month` somente para o mês corrente e o próximo. `listPhoenixFinancialEventsForMonth` restringe o retorno a `date >= start && date < end`. Lançamentos de meses anteriores não chegam à Home.
2. `HomeDashboard.tsx` filtra compromissos com `status === 'planned' && date >= dateNow() && signedAmount < 0`. Portanto, **previstos vencidos dentro do mês também ficam ocultos**.
3. `GET /payables/open` chama `listOpenPayables`, que filtra por proprietário do workspace, `status NOT IN ('paid','cancelled')` e `openAmount > 0`, **sem limite de data**. Contas a pagar vencidas permanecem nessa leitura.
4. `GET /finance/events` fornece listagem geral em páginas de 10 a 100 registros, sem filtro específico por status/vencimento; varrer todo o histórico a cada Home seria caro em consultas/Egress e não resolveria o contrato de status.
5. `financial-policy.ts` controla status realizados e âmbito monetário/benefício. `PayablePayment.financialEventId` vincula eventos de pagamento a contas a pagar. Não deduplicar obrigações comparando apenas texto, valor e data.

## Contrato proposto para aprovação técnica, ainda não executado

Uma fonte de leitura **canônica, autenticada, com paginação/limites e isolamento pelo proprietário do workspace** deverá expor compromissos abertos, inclusive vencidos de meses anteriores, com: ID estável, origem real (`payable` ou `financialEvent`), vínculo de domínio, data, valor aberto canônico, status e referência temporal do servidor. A API deverá estabelecer, se autorizado, classificação `overdue`, `due_today` e `upcoming` com data-base/fuso documentados. Um erro de leitura não pode ser convertido em falso estado “sem compromissos”.

**A Home não deve calcular urgência, reinventar saldo em aberto nem classificar cartão/Verocard como dívida monetária.** Preservar a autoridade canônica de `docs/MEG-WEB-FINANCIAL-AUTHORITY.md`.

## Casos obrigatórios para a implementação posterior

- previsto em atraso no mês atual e em mês anterior; vence hoje; futuro; virada de mês;
- conta a pagar aberta vencida, parcialmente paga, integralmente paga e cancelada;
- evento arquivado/realizado; vínculo de pagamento que não deve duplicar uma obrigação;
- duas obrigações genuinamente distintas com a mesma descrição, data e valor;
- cartões/faturas e benefício Verocard, sem duplicar competência e sem criar dívida incorreta;
- segregação entre workspaces; volume alto com leitura limitada, sem varrer todo o histórico;
- data-base canônica/fuso; falha de API não se passando por resultado vazio.

## Gates

Esta documentação não autoriza nova rota, migração, consulta SQL em produção, writer, alteração da API financeira ou mudança de regra no navegador. Para corrigir definitivamente, a etapa financeira da API precisa de autorização e testes de contrato em branch própria. A aprovação visual da Home permanece válida; a PR #664 continua Draft, sem merge ou deploy de produção.
