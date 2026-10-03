# MEG Web — prévias e verificação do sistema

Referência vigente: os 16 originais em [design/2026-10-03](design/2026-10-03/). O [checkpoint oficial](MEG-RETOMADA-OFICIAL.md) tem precedência sobre a antiga galeria derivada do App. As regras financeiras do App continuam obrigatórias; a composição Web segue as imagens aprovadas.

## Rotas

- Produto: `evolution.html?screen=login` → Loading preservado → sistema autenticado.
- QA: `evolution.html?screen=preview&preview=<chave>`. Usa os mesmos componentes do produto, dados ilustrativos identificados e gravações bloqueadas.
- Sem sessão, `screen=system` também é QA identificada. Erro em sessão autenticada nunca ativa dados de exemplo.

| Chave | Superfície implementada |
| --- | --- |
| home | Saldo, fluxo diário, indicadores, benefício, ações e listas |
| movements | Lançamentos, filtros reais, edição |
| payables | Pendentes agrupados por data, seleção, totais |
| settlement | Confirmação, data e saldo insuficiente |
| cards | Carrossel cíclico, fatura canônica, compras |
| card-center | Central funcional compartilhada com cartões |
| card-payment | Pagamento protegido de fatura |
| benefit | Saldo próprio e histórico de benefício |
| benefit-recharge | Crédito exclusivo em benefício |
| transfer | Transferência entre contas monetárias |
| edit-launch | Edição protegida de lançamento |
| period | Competência para todos os módulos |
| launch | Escolha de tipo de lançamento |
| cashflow | Série diária realizada e projetada |
| analytics | Resultados e distribuição por categoria |
| settings | Perfil e consulta de cadastros reais |
| history | Lista de lançamentos |
| menu | Configurações |

Formulário Novo: `evolution.html?screen=system&modal=launch&mode=expense`. Login e Loading: `screen=login` e `screen=loading`.

## Verificação reproduzível

`npm run build:web` e `node scripts/evolution-system-smoke.mjs` (Playwright/Chromium instalados). O script serve o build e substitui todas as APIs por mock isolado; não altera dados reais. Verifica oito módulos em três viewports, filtros, insuficiência de saldo, data e pagamento atômico, recarga/histórico, retry idempotente e preservação do sinal de ajuste credor na edição. Captura também os modais, Login e Loading em desktop e vertical.

O workflow `MEG Evolution Visual Preflight` executa o smoke e publica screenshots/resultados em `evolution-visual-preflight`. Capturas aprovadas são referências, não comprovantes de operações reais.

## Pendências visuais explícitas

Build e CI não equivalem à aprovação visual do usuário. A Home usa arte SVG geométrica, diferente da textura aprovada; a central compartilha o layout funcional dos cartões. Conferir proporções e acabamento lado a lado com os originais antes de declarar fidelidade integral. Loading e Android permanecem preservados.
