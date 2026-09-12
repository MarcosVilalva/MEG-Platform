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
- Parcelas/faturas devem ser classificadas pela data efetiva de vencimento/fatura, não apenas pela data original da compra.

## Dados e compatibilidade
- Snapshot mensal principal: `/finance/phoenix-preview?month=AAAA-MM`.
- Pendentes usa `Payable` oficial quando houver registro e complementa, em read-only, com despesas planejadas reais ainda existentes no legado, sem duplicar.
- Cartões preserva domínio novo quando houver compras/parcelas normalizadas e usa a agenda legada real como compatibilidade read-only enquanto a migração não estiver concluída.
- Benefício/Verocard permanece separado do caixa monetário.
- Transferência é neutra no patrimônio e backend já possui fluxo atômico de duas pernas, mas Phoenix ainda não grava.

## Classificação e Grupo — regra validada em 12/09/2026
- O cadastro real usa `Category.group` como **Classificação** e `Category.name` como **Grupo**.
- Exemplos reais: `CONTAS GERAIS -> SUPERMERCADO / SAÚDE / AUTOMÓVEL / ...`; `INVESTIMENTO -> LAZER / MOTO / TÍTULOS-PREVIDÊNCIA`; `RES. PAG. DÍVIDA -> PGTO DE DÍVIDAS / TÍTULOS-PREVIDÊNCIA`.
- No lançamento de **Despesa**, selecionar primeiro Classificação; depois Grupo mostra somente os grupos pertencentes àquela classificação.
- O `categoryId` real do grupo escolhido deve ser preservado internamente para futura gravação.
- No lançamento de **Receita**, classificação é opcional e Grupo não deve ser exigido.
- Regra especial de Alimentação/benefício deve permanecer.
- Leitura de lançamentos existentes: se não houver `sourceDetails`, `category.group` representa Classificação e `category.name` representa Grupo.

## Validações já aceitas pelo usuário
- Preview isolado e autenticação real.
- Pendentes após compatibilidade com legado.
- Cartões após compatibilidade com agenda real de parcelas.
- Conceito do Grid MEG e filtros modernos; contraste dos filtros foi corrigido após homologação.
- KPIs de Lançamentos reagem aos filtros mantendo referência do total do período.
- Atualização silenciosa após primeira carga.

## Estado técnico atual
- Último commit deste checkpoint deve ser conferido na PR #243; não confiar em SHA gravado aqui como fonte única.
- CI deve estar verde antes de considerar uma rodada concluída.
- Preview Render deve estar `live` no commit correspondente.

## Próximos gates
1. concluir paridade da área de lançamento, incluindo Classificação -> Grupo e demais regras V15;
2. revisar áreas não tabulares para consistência visual e responsividade;
3. validar numericamente saldo, benefício, despesas, pendentes, faturas e projeções contra a base real;
4. revisar índices/performance e dependências npm sem `npm audit fix --force`;
5. somente depois começar habilitação seletiva de escrita, um fluxo por vez;
6. corte da Web atual somente após paridade funcional, numérica e visual suficiente.

## Protocolo para novo chat
Ao aproximar o limite de contexto, parar em commit seguro, garantir CI/deploy, atualizar este arquivo e a PR #243. No novo chat, usar: `Continuar MEG Phoenix V15 pela PR #243 e docs/PHOENIX_V15_CHECKPOINT.md; não fazer merge nem liberar escrita sem validação.`
