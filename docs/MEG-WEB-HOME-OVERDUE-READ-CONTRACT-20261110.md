# MEG Web Evolution — P0: leitura de compromissos vencidos

**Status:** contrato de leitura implementado em branch isolada e validado por CI; **não integrado à Home nem publicado em produção**. A Home da PR #664 foi aprovada visualmente em 10/11/2026, mas o problema funcional permanece aberto: [issue #667](https://github.com/MarcosVilalva/MEG-Platform/issues/667).

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

A autorização explícita foi concedida em 10/11/2026 para **alteração de leitura da API em branch separada**. A fonte foi implementada na PR [#668](https://github.com/MarcosVilalva/MEG-Platform/pull/668), Draft com base na Home #664, **sem writers, banco, migrations ou deploy**. Não existe autorização de merge ou publicação em produção. A aprovação visual da Home permanece válida.

## Implementação verificada na branch P0

- `GET /finance/home-commitments?limit=8&cursor=...` (cursor opcional). `limit` deve ser inteiro de 1 a 50, default 8. Requer autenticação e papel de leitura; usa `request.user.sub` e `resolveWorkspaceContext` para obter o proprietário do workspace.
- Duas queries com `take:limit+1` por origem, ordenação data/ID e cursor opaco. Lê `FinancialEvent` planejado de despesa (incluindo meses passados), não arquivado e com valor negativo, e `Payable` em aberto com saldo positivo. Não varre histórico em loop; uma página executa duas buscas limitadas.
- Reutiliza `isMonetaryFinancialEvent`, exclui o tipo de pagamento `credit` e evento ligado a `PayablePayment`. Não colapsa lançamentos distintos apenas por valor/descrição.
- Responde `{asOf,items,hasMore,nextCursor}`. Cada item tem `id,source,sourceId,dueAt,dueDate,description,amount,status,dueState`. `amount` é **string decimal com duas casas**. `dueState`: `overdue`, `due_today` ou `upcoming` pela data-base do servidor em `America/Sao_Paulo`.
- Quando uma página consumir registros excluídos pelo filtro canônico, ela pode vir **com `items:[]` e `hasMore:true`**. Consumidores devem continuar pelo `nextCursor`, sem interpretar a página vazia como ausência de compromissos. Isso evita ocultar registros e não requer leitura ilimitada.
- Cursor inválido e limite inválido recebem HTTP 400; sucesso com `Cache-Control: private, no-store`. Falhas de banco/autorização não são silenciosamente convertidas em lista vazia.
- Teste puro de cursor, desempate, atraso de meses anteriores, vencimento atual, virada de mês, despesas independentes com o mesmo valor, páginas com itens filtrados e fuso. Teste estrutural protege isolamento por proprietário, limites da query, status, políticas, não mutação e rota autenticada.
- CI [42939308455](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42939308455) **success**: geração de Prisma sem banco, build da API, testes da nova fonte, suíte financeira completa da API e gate de isolamento dos arquivos da PR.

## Pendências para concluir o P0

1. **A Home visualmente aprovada ainda usa a leitura anterior**. Após a PR da API cumprir os gates de integração e implantação autorizada, será necessário consumir a nova rota e testar a lista completa dos compromissos sem mudar a aparência validada.
2. Fazer análise de plano de consulta e volumes em ambiente de teste; o limite de resposta controla Egress, mas índices do banco não foram alterados neste escopo.
3. Avaliar com dados de integração os casos de faturas, benefícios e vínculos historicamente incompletos. Não inferir duplicidade por texto/valor.
4. A PR #668 fica Draft e sem merge; nenhuma API de produção foi modificada ou publicada.

