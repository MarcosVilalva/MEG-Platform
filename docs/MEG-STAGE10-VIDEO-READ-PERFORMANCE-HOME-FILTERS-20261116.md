# MEG Finanças Web Evolution | Etapa 10 | Diagnóstico do vídeo e correções de leitura

Data: 16/11/2026. PR #696 Draft, branch `stage10/prism-real-read-optin-20261116`. Escopo exclusivo da Etapa 10. **Não avançar para a Etapa 11**.

## Evidência visual fornecida pelo responsável

Arquivo recebido na conversa: `11-12-05.mp4`, duração verificada 28,485 s, captura de 1920×1200 px. Não enviar o vídeo ao repositório, pois apresenta sessão autenticada e identificação do usuário.

- Em ~1 s o carregamento do histórico estava em 17%; ~4 s em 28%; ~7 s em 39%; ~10 s em 44%; ~13 s em 50%; ~16 s em 51%.
- Em ~19 s a Home apareceu sem dados, com a mensagem `Não foi possível consultar as informações financeiras e compromissos abertos. Nenhum resultado foi estimado.`.
- O vídeo não demonstra que o histórico nunca completa: a gravação muda para a Home antes da conclusão.
- O responsável pede carregamento inicial rápido com dados já existentes, filtros de mês e datas abertos, Home com cartões/benefícios reais e preservação das regras de modalidade.

## Causa confirmada no código, sem presumir falhas de banco

A API produtiva já oferece `GET /finance/events/month?month=YYYY-MM` e retorna o conjunto completo não arquivado do mês, com conta, categoria, meio de pagamento e detalhes de origem. Entretanto, a Web operacional anterior usava `readAuthorizedHistory` em **duas passagens** por 38 páginas (100 itens por página), resultando em dezenas de GETs antes de renderizar. Os logs registraram páginas 1–38 com HTTP 200. Não repetir importação: o Supabase já possui 3.731 eventos não arquivados do workspace e 49 eventos de novembro/2026, 116 de outubro/2026.

A Home exige `GET /finance/home-commitments`, ainda ausente da API publicada (HTTP 404), provocando erro de todo o `Promise.all`. A rota opcional `/finance/home-available` também pode retornar 404. Isso não autoriza cálculo improvisado de saldo, vencimento ou compromisso no cliente.

## Correções registradas na PR #696

1. `apps/web/src/app/finance-client.ts`: leitura mensal canônica com `AbortSignal` e sem cache de dados obsoletos.
2. `apps/web/src/meg-web-evolution/launches/OperationalLaunches.tsx`: somente no modo Prism autenticado, uma consulta mensal completa e validada substitui a dupla leitura histórica global; IDs e datas devem ser únicos e consistentes com o mês. O `sync-status` antes/depois permanece obrigatório. Na carga inicial, indicação textual breve sem barra percentual de 76 chamadas. Na flag desligada, fluxo original preservado.
3. `apps/web/src/meg-web-evolution/launches/LaunchesStage09.tsx`: filtros gerais abertos por padrão somente no caminho Prism; input mês e intervalo de data visíveis; intervalo limitado ao mês selecionado para evitar consulta enganosamente incompleta. A seleção de outro mês solicita novamente o conjunto completo correspondente.
4. `apps/web/src/meg-web-evolution/integrated-qa/PrismOperationalLaunches.tsx` e `main.tsx`: propagação do mês selecionado para a leitura e rótulo do cabeçalho, sem mudar o shell visual aprovado.
5. `apps/web/src/meg-web-evolution/home/HomeDashboard.tsx`: no **404 específico de compromissos**, apresenta os demais dados reais autorizados (resumo, cashflow, cartões, benefício) e sinaliza o painel canônico como indisponível. Não mostra zero, não calcula compromisso, não muda CSS. Falhas de outros endpoints continuam bloqueantes.
6. `scripts/meg-stage10-prism-real-read-optin.browser.mjs`: caracteriza consulta mensal, seleção de mês, filtros e Home com 404 de compromissos em ambiente inteiramente sintético. Escritas financeiras bloqueadas.

**CI do código**: [GitHub Actions #43885968607](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43885968607), commit `cfd9008b8e2eca9dc695b74b9c38dee38ec15b8f`, **SUCCESS**, incluindo npm ci, TypeScript, builds Vite com flag OFF/ON, bundle sem padrões de segredos, gateway owner-only, Playwright em 8 resoluções. Não afirmar que os valores reais foram exibidos no navegador do responsável; isso depende da preview atualizada e homologação explícita.

## Regras de negócio que não devem regredir

Regras consolidadas do PDF, itens 7–16, 18–19, 21–22:
- Lançamentos cronológicos, não agrupados por categoria, com forma de pagamento por item.
- Autocomplete reconhece descrição, categoria, conta, forma de pagamento; não copia data ou valor.
- À vista mostra somente métodos ordinários cadastrados. Crédito mostra somente cartões ativos reais, parcelas, fechamento e vencimento, sem calcular competência no componente. Crediário permanece separado.
- Alimentação exige Conta Benefício + Verocard + Pago, vínculos travados, sem mover conta monetária.
- Fixo deve obedecer à regra financeira original; Pendente permanece explícito até baixa confirmada; edição precisa restaurar vínculos canônicos e respeitar estornos, sem inventar IDs.
- Cartões e benefícios consomem o domínio existente. A área Benefícios exige saldo, evolução e lançamentos; ícones consistentes.

No PR atual, `ExpenseForm` já distingue modalidade À vista/Crédito e seleciona apenas cartões cadastrados, mas **gravações, competência de fatura, edição canônica, Alimentação integral e telas completas de Cartões/Benefícios NÃO ESTÃO ENTREGUES**. Não habilitar writers nem iniciar Etapas 11, 12 ou 13 até gates próprios.

## Pendências e ordem de execução

- Publicar **somente a preview Free isolada**, manualmente, após gates, mantendo Auto Deploy OFF. Nenhum merge/main/produto Android/API produtiva.
- Validar com sessão real no navegador: novembro/2026 deve retornar 49 eventos, outubro/2026 deve retornar 116 (salvo alteração legítima posterior), sem 76 GETs e sem barra percentual longa.
- Conferir Home, inclusive 4 cartões reais e resumo de benefício, sem confundir ausência da rota canônica de compromissos com lista vazia.
- Testar fidelidade visual da barra de filtros em 390×844, 640×900, 960×900, 1024×768, 1366×768, 820×360, 1024×450, 1920×1080. CI não substitui aprovação explícita.
- Filtro **multimensal/ano completo** e consulta global ainda não entregues no caminho rápido; não mostrar valores derivados para uma janela não coberta.
- Diagnosticar e prover a rota canônica de compromissos num novo gate seguro, sem modificar produção nesta rodada.
- Integração financeira de writers e páginas Cartões/Benefícios permanece pendente das etapas apropriadas.

## Restrições

Sem escrita financeira, sem alteração dos dados reais ou RLS, sem serviço Render adicional, sem API publicada, sem produção/main/Android, sem merge. O login operacional anterior escreve apenas metadados de autenticação. `VITE_PRISM_LAYOUT` permanece false por padrão fora da preview opt-in. PR #688 e #696 Draft, sem merge.

## Saúde e retomada

Saúde do chat: **ATENÇÃO**, histórico extenso e várias validações, mas checkpoint oficial atualizado. Em eventual troca, reutilizar o checkpoint em `MEG-WEB-CONTINUIDADE-OFICIAL.md` e permanecer na Etapa 10, não abrir Etapa 11 por conveniência.

## Resultado adicional: autocomplete entre meses e publicação validada

- Durante o fechamento, foi detectado que usar apenas os 49 registros de novembro como `HistorySnapshot.kind='complete'` reduziria indevidamente o autocomplete histórico. Essa hipótese foi descartada e o erro não foi aprovado.
- `ExpenseForm.tsx` agora recebe o adaptador opcional `searchHistorySuggestions`, executado **apenas após o usuário digitar**, com debounce de 260 ms, cancelamento e aviso explícito de falha. A abertura de um lançamento no editor não aciona a busca global. A QA antiga preserva seu `historySnapshot` anterior na ausência da prop.
- `integrated-qa/PrismOperationalLaunches.tsx` consulta `GET /finance/events?search=...` usando `readAuthorizedHistory` com duas passagens paginadas de resultados filtrados, e o conversor `suggestionsFromCanonicalHistory` consome o histórico integral correspondente ao termo. Seleção copia somente descrição, categoria e forma/conta conforme política existente, nunca data ou valor.
- O teste sintético caracteriza lançamento de outubro encontrado ao digitar em novembro e proíbe a busca histórica na abertura do formulário ou no carregamento inicial da grade.
- Contrato estático foi atualizado para exigir `readAuthorizedHistory` sob demanda, e não `historySnapshot={history}` como se o único mês fosse o histórico completo.
- **CI principal:** [GitHub Actions #43888812214](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43888812214), commit de código `d6b573b3797d9ac6cf6bce07bf3e4d3af50be652`, **SUCCESS**, incluindo 8 viewports sintéticos, consulta mensal, Home sem rota de compromissos, autocomplete de mês anterior, npm ci, Vite OFF/ON, gateway e TypeScript.
- **Render preview Free**: deploy manual `dep-dbthejmi0phs73f2a380`, no mesmo commit `d6b573b...`, status **live**, Auto Deploy OFF. Endereço sem cache para validar: https://meg-stage10-prism-real-preview.onrender.com/web-evolution.html?tela=lancamentos&v=d6b573b3797d9ac6cf6bce07bf3e4d3af50be652
- A URL permite login real e consulta à API existente, porém a evidência de UI em sessão do responsável **ainda precisa de homologação visual explícita**. Nenhum writer liberado, banco/custos novos alterados, API produtiva/Android/main/merge intocados.
- **Limites atuais:** filtro de mês e intervalo dentro dele, não período livre multimensal; Home compromissos indisponíveis porque API publicada retorna 404; área Cartões/Benefícios e módulos de escrita precisam dos gates de negócio seguintes. Não declarar a Etapa 10 concluída nem abrir a Etapa 11 por conveniência.
