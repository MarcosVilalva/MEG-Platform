# MEG Web — Galeria Oficial de Prévias

## Correção de fidelidade — 03/10/2026

A galeria criada inicialmente em 03/10/2026 **não deve ser tratada como referência visual final**. Ela reproduziu a estrutura do App, mas simplificou demais arte, cores, profundidade, acabamento e proporções.

Nova regra: a Home do App passa a ser a **prancha-mãe visual**. Antes de propagar para as demais telas, a Home Web deve copiar os tokens reais, gradientes, bordas, sombras, raios, tipografia, iconografia e densidade do App. O desktop só pode melhorar encaixe, proximidade, largura útil e distribuição espacial.

Enquanto a Home-mãe não estiver validada pelo usuário, as demais prévias permanecem apenas como inventário estrutural, não como direção visual aprovada.

## Regra permanente

A partir de 03/10/2026, toda evolução relevante do MEG Web deve deixar rastros persistentes no repositório.

1. Atualizar `docs/MEG-RETOMADA-OFICIAL.md` quando mudar direção, regra de produto, referência visual ou ponto validado.
2. Manter esta galeria de prévias atualizada.
3. Não depender apenas do histórico do chat para decisões do projeto.
4. Antes de implementar um módulo funcional completo, gerar e revisar sua prévia Web baseada no App real.
5. Toda PR visual relevante deve rodar o `MEG Evolution Visual Preflight` e produzir screenshots.
6. O App/Mobile é a fonte de verdade. As prévias Web podem reorganizar espaço, mas não inventar outra identidade ou outra hierarquia.

## Como abrir

No ambiente Evolution:

`evolution.html?screen=preview&preview=<tela>`

## Inventário obrigatório de telas

| Prévia | Origem no App | Objetivo Web | Estado |
| --- | --- | --- | --- |
| `home` | `Home` em `MegMobileFinal.tsx` | Expandir Situação atual, Saldo, Fluxo, Resumo, Benefício e Ações rápidas | Prévia |
| `movements` | `MegMobileMovements` | Lista de lançamentos com filtros e leitura desktop | Prévia |
| `launch` | `MegMobileLaunchSheet` | Novo lançamento mantendo Despesa/Receita/Alimentação | Prévia |
| `payables` | `Payables` em `MegMobileFinal.tsx` | Pendentes com agrupamento, filtros e seleção | Prévia |
| `settlement` | fluxo de baixa de Pendentes | Confirmação de pagamento, data e insuficiência de saldo | Prévia |
| `cards` | `Cards` em `MegMobileFinal.tsx` | Carrossel infinito + resumo da fatura/benefício | Prévia |
| `card-center` | `MegMobileCardCenter` | Central detalhada do cartão | Prévia |
| `benefit` | `MegMobileBenefitModal` | Evolução do benefício/Verocard e histórico | Prévia |
| `cashflow` | `MegMobileCashflow` | Fluxo de caixa ampliado | Prévia |
| `analytics` | `MegMobileAnalytics` | Relatórios e categorias | Prévia |
| `history` | `MegMobileHistory` | Histórico financeiro | Prévia |
| `settings` | `MegMobileSettings` | Configurações com navegação lateral interna | Prévia |
| `period` | `PeriodSheet` | Seletor de competência/intervalo/todos | Prévia |
| `menu` | `MenuSheet` | Menu completo do App adaptado para desktop | Prévia |

## Critério de fidelidade

Uma prévia só pode avançar para implementação quando:

- a marca e a paleta forem reconhecíveis como MEG;
- a ordem mental da tela for a mesma do App;
- não houver módulos inventados para “encher” desktop;
- controles do App tiverem equivalentes claros;
- a expansão para desktop melhorar leitura e produtividade, sem alterar o produto;
- a captura for revisada em pelo menos um viewport desktop real.

## Capturas automáticas

O workflow visual deve manter screenshots individuais das prévias principais dentro do artifact `evolution-visual-preflight`.

A galeria existe justamente para que, se um chat travar, o próximo chat consiga abrir o repositório, localizar o inventário e retomar o trabalho sem reconstruir decisões já tomadas.
