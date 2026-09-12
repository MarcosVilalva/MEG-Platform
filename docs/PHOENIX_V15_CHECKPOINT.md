# Phoenix V15 — Checkpoint de Continuidade

Este arquivo é o ponto persistente de retomada do projeto MEG Phoenix V15. Em um novo chat, consultar primeiro este arquivo e a PR #243 antes de alterar código.

## Regra de segurança
- Branch de trabalho: `phoenix/v15-clean-room`.
- PR de acompanhamento: #243.
- NÃO mesclar em `main` até validação explícita do usuário.
- Produção atual/GitHub Pages deve permanecer intacta durante a homologação.
- Preview Phoenix permanece read-only para finanças; somente autenticação/refresh/logout admitem POST no servidor de preview.
- Escrita financeira só será liberada fluxo por fluxo após paridade, idempotência, auditoria e proteção transacional.

## Preview
- Render service: `meg-phoenix-v15-preview`.
- URL: `https://meg-phoenix-v15-preview.onrender.com`.
- API real: `https://meg-platform-api.onrender.com` via proxy do preview.
- A tela `SERVICE WAKING UP` é do Render Free Web Service e pode aparecer durante cold start; não faz parte da UI final do MEG.

## Referência de produto
- V15 é a especificação visual/UX oficial.
- Phoenix é reconstrução clean-room em React ligada aos dados reais.
- Nenhum mock deve substituir dado real ausente.
- Web completa; Android permanece focado no essencial de lançamento/uso móvel.

## UX consolidada
- Loading institucional MEG concentrado na entrada.
- Após a entrada, telas devem abrir com dados já carregados; atualizações manuais, por foco e periódicas são silenciosas e mantêm o último snapshot válido até o novo estar completo.
- Sidebar esquerda fixa; recolhida mostra logo proporcional, ícones centralizados e badges legíveis.
- Workspace central precisa reflowar naturalmente ao recolher/expandir sidebar e ao redimensionar janela.
- Cabeçalhos de telas sticky no desktop; cabeçalhos de tabelas sticky dentro da grade.
- Claro/escuro devem ser auditados componente por componente; painéis, filtros, drawers, cards e tabelas não podem destoar.
- Filtros devem fechar ao clicar fora quando aplicável.

## Grid MEG — regra global
Toda tabela real presente ou futura deve usar o padrão Grid MEG:
- ordenação crescente/decrescente;
- filtro por coluna;
- busca dentro dos valores;
- seleção múltipla e Selecionar tudo;
- filtros específicos de texto, data e intervalo numérico;
- Aplicar / Cancelar / Limpar;
- chips de filtros ativos;
- indicação clara de coluna filtrada;
- visual moderno, sólido e legível nos temas claro/escuro;
- sem transparência excessiva nem scroll horizontal no popover;
- adaptação mobile;
- KPIs ligados à grade devem reagir aos filtros quando forem indicadores analíticos; indicadores globais oficiais, como saldo monetário, não podem mudar silenciosamente por filtro.

Telas já usando Grid MEG: Lançamentos, Cadastros, Cartões (fatura/parcelas), Contas a receber, Receitas e Fluxo de caixa. Histórico, Pendentes e Usuários permanecem em layouts próprios porque hoje são feed/lista/cards.

## Cartões
- Layout premium padronizado inspirado na composição validada do LATAM.
- LATAM pode preservar arte oficial conhecida.
- Cartões conhecidos recebem identidade específica por produto/emissor/bandeira.
- Cartões novos/desconhecidos recebem template premium determinístico automaticamente, sem depender de criar arte manual.
- Futuramente, arte oficial validada pode substituir o template genérico; não buscar/aplicar imagem aleatória.
- Parcelas/faturas são classificadas pela data efetiva de vencimento/fatura, não apenas pela data original da compra.
- A fatura do período mostra o valor líquido histórico mesmo quando já estiver paga; o pagamento retira o valor do limite comprometido, mas não apaga o histórico da fatura.
- Créditos e estornos negativos reduzem a fatura e aparecem explicitamente como `Crédito/estorno`; não podem ser tratados como nova compra positiva.
- `Total comprometido` considera somente fatura atual ainda em aberto + parcelas futuras ainda em aberto.
- O seletor lateral exibe a fatura líquida do período; não deve cair em `statementAmount` apenas porque o saldo aberto é zero.
- Compatibilidade de nomes legados possui aliases controlados para os cartões atuais. Em especial, o cadastro `MELI`/Mercado Livre reconhece `CARTÃO ML` no AppState.
- O early return que ocorria antes dos hooks em `PhoenixCardsGrid` foi removido da posição inválida; a tela mantém ordem estável de hooks mesmo sem cartão cadastrado.

### Paridade de faturas — setembro/2026
Auditoria direta do AppState real, usada como referência de homologação e não hardcodada na UI:
- **AZUL**: fatura líquida `R$ 1.875,52`; compras `R$ 1.937,52`; créditos/estornos `R$ 62,00`; setembro em aberto `R$ 1.875,52`; outubro `R$ 1.685,53`; futuro em aberto após setembro `R$ 5.290,73`.
- **LATAM PASS**: fatura líquida `R$ 3.422,24`; compras `R$ 3.453,24`; créditos/estornos `R$ 31,00`; setembro em aberto `R$ 3.422,24`; outubro `R$ 1.214,85`; futuro em aberto após setembro `R$ 4.936,31`.
- **MELI**: fatura líquida `R$ 1.824,02`; compras `R$ 1.943,08`; créditos/estornos `R$ 119,06`; fatura de setembro já paga; outubro `R$ 1.136,91`; futuro em aberto após setembro `R$ 2.608,42`.
- **RIACHUELO**: fatura líquida `R$ 132,99`; setembro em aberto `R$ 132,99`; outubro `R$ 132,99`; futuro em aberto após setembro `R$ 398,97`.

Para limite comprometido em setembro, a referência é: AZUL `R$ 7.166,25`; LATAM PASS `R$ 8.358,55`; MELI `R$ 2.608,42` (a fatura de setembro já paga não entra); RIACHUELO `R$ 531,96`.

## Dados e compatibilidade
- Snapshot mensal principal: `/finance/phoenix-preview?month=AAAA-MM`.
- Pendentes usa `Payable` oficial quando houver registro e complementa, em read-only, com despesas planejadas reais ainda existentes no legado, sem duplicar.
- No estado atual da base, `Payable`, `CardPurchase` e `CardInstallment` ainda não possuem os registros históricos necessários; por isso a compatibilidade read-only com eventos/AppState permanece necessária até migração controlada.
- Pendentes usa `signedAmount` como autoridade para o efeito financeiro. Estornos de despesa permanecem ajustes negativos, não viram novas obrigações e não podem ser selecionados para baixa.
- Cartões preserva domínio novo quando houver compras/parcelas normalizadas e usa a agenda legada real como compatibilidade read-only enquanto a migração não estiver concluída.
- Benefício/Verocard permanece separado do caixa monetário.
- Transferência é neutra no patrimônio e backend já possui fluxo atômico de duas pernas, mas Phoenix ainda não grava.

## Política monetária consolidada na UI
- `signedAmount` é a autoridade para o efeito financeiro de lançamentos normalizados.
- Despesa normal possui `signedAmount` negativo; na apresentação de despesa o valor é `-signedAmount`.
- Estorno/reversão de despesa possui efeito oposto e reduz o total de despesas, em vez de ser somado pelo valor absoluto.
- Benefício/Verocard permanece visível nos lançamentos, mas não integra KPIs de receitas/despesas monetárias.
- A tela Lançamentos mantém todos os eventos visíveis, mas os KPIs são explicitamente **Receitas monetárias**, **Despesas monetárias** e **Resultado monetário**.
- Esses KPIs reagem aos filtros da grade e mantêm a referência do total do período.
- A tela Receitas separa **Receitas monetárias** de **Benefício alimentação**, inclui a coluna/filtro `Escopo` e recalcula seus indicadores quando a grade é filtrada.
- Fluxo de caixa e Home continuam usando o snapshot canônico do backend como autoridade de saldo realizado/projetado.

## Paridade numérica de referência — setembro/2026
Snapshot de auditoria direta da base para o usuário principal, usado como referência de homologação (não hardcodar na aplicação):
- saldo monetário anterior ao mês: `R$ 2.643,56`;
- receitas monetárias do mês: `R$ 10.581,99`;
- despesas monetárias do mês, já considerando estornos: `R$ 12.454,42`;
- despesas monetárias realizadas: `R$ 3.046,67`;
- despesas monetárias pendentes líquidas: `R$ 9.407,75`;
- saldo monetário realizado: `R$ 10.178,88`;
- fechamento monetário projetado: `R$ 771,13`;
- créditos de benefício no mês: `R$ 2.000,00`;
- benefício utilizado no mês: `R$ 1.250,83`;
- saldo de benefício ao fim do mês: `R$ 749,17`.

A discrepância visual anterior de `R$ 14.139,19` em Despesas de Lançamentos vinha de `abs(amount)` e somava benefício + estornos como despesa positiva. Essa lógica foi removida; a UI deve seguir `signedAmount` e a separação monetário/benefício.

## Classificação e Grupo — regra validada em 12/09/2026
- O cadastro real usa `Category.group` como **Classificação** e `Category.name` como **Grupo**.
- Exemplos reais: `CONTAS GERAIS -> SUPERMERCADO / SAÚDE / AUTOMÓVEL / ...`; `INVESTIMENTO -> LAZER / MOTO / TÍTULOS-PREVIDÊNCIA`; `RES. PAG. DÍVIDA -> PGTO DE DÍVIDAS / TÍTULOS-PREVIDÊNCIA`.
- No lançamento de **Despesa**, selecionar primeiro Classificação; depois Grupo mostra somente os grupos pertencentes àquela classificação.
- O `categoryId` real do grupo escolhido deve ser preservado internamente para futura gravação.
- No lançamento de **Receita**, classificação é opcional e Grupo não deve ser exigido.
- Regra especial de Alimentação/benefício deve permanecer.
- Leitura de lançamentos existentes: se não houver `sourceDetails`, `category.group` representa Classificação e `category.name` representa Grupo.
- A mesma semântica Classificação/Grupo deve ser usada em Pendentes e demais telas derivadas.

## Validações já aceitas pelo usuário
- Preview isolado e autenticação real.
- Pendentes após compatibilidade com legado.
- Cartões após compatibilidade com agenda real de parcelas.
- Conceito do Grid MEG e filtros modernos; contraste dos filtros foi corrigido após homologação.
- KPIs de Lançamentos reagem aos filtros mantendo referência do total do período.
- Atualização silenciosa após primeira carga.

## Estado técnico atual
- Último commit funcional antes deste checkpoint: `83da4db9f87e3621507cbe84a938b7a2be171145` (`fix: consolidar faturas líquidas e aliases de cartões`).
- O build/deploy automático do Render desse commit concluiu `live` no preview.
- O último CI confirmado antes desta rodada foi o `MEG Platform CI` run **1255**, verde no head documental anterior. No momento deste checkpoint o GitHub ainda não havia emitido um novo run para `83da4db`; não considerar a rodada de cartões totalmente encerrada até o próximo CI verde.
- Último commit deste checkpoint deve sempre ser conferido na PR #243; não confiar em SHA gravado aqui como fonte única.
- CI deve estar verde antes de considerar uma rodada concluída.
- Preview Render deve estar `live` no commit correspondente.

## Próximos gates
1. validar visualmente no preview os totais líquidos e status das quatro faturas de setembro, especialmente MELI paga e estornos AZUL/LATAM;
2. revisar áreas não tabulares para consistência visual e responsividade;
3. continuar paridade numérica de projeções e demais visões derivadas contra a base real;
4. revisar dependências npm e os demais índices sugeridos pelo Supabase somente com medição de uso, sem `npm audit fix --force` e sem indexação indiscriminada;
5. somente depois começar habilitação seletiva de escrita, um fluxo por vez;
6. corte da Web atual somente após paridade funcional, numérica e visual suficiente.

## Protocolo para novo chat
Ao aproximar o limite de contexto, parar em commit seguro, garantir CI/deploy, atualizar este arquivo e a PR #243. No novo chat, usar: `Continuar MEG Phoenix V15 pela PR #243 e docs/PHOENIX_V15_CHECKPOINT.md; não fazer merge nem liberar escrita sem validação.`