# MEG Evolution — Paridade funcional Android → Web

> Fonte de verdade operacional para a migração funcional solicitada em 03/10/2026.
> O Android 2.0.708 permanece congelado e somente leitura. Nenhum componente ou CSS Mobile é importado pelo Evolution.

## Regra

Tudo o que é função financeira ou experiência validada do Android deve existir no Web Evolution, recomposto para desktop e obedecendo às pranchas visuais aprovadas.

Funções estritamente nativas do aparelho, como autenticação biométrica do Android e OTA/APK, permanecem no Android. O Web deve apresentar o estado correspondente quando fizer sentido, mas não simular capacidades inexistentes no navegador.

## Matriz

| Domínio Android | Origem | Evolution | Estado desta rodada |
|---|---|---|---|
| Saldo monetário separado do benefício | Home | Home/System | HERDADO |
| Período mensal | PeriodSheet | Seletor de período | HERDADO |
| Ações rápidas | Home | Home | HERDADO |
| Lançamentos individuais, sem agrupar categoria | MegMobileMovements | Lançamentos | HERDADO |
| Busca por descrição/categoria/conta/forma | MegMobileMovements | Lançamentos | HERDADO |
| Filtros tipo/data/categoria/conta/forma | MegMobileMovements | Lançamentos | HERDADO |
| KPIs entradas/saídas/resultado/benefício | MegMobileMovements | Lançamentos | HERDADO |
| Novo lançamento Despesa/Receita/Benefício | MegMobileLaunchSheet | EvolutionLaunchModal | HERDADO |
| Autocomplete por histórico | MegMobileLaunchSheet | EvolutionLaunchModal | HERDADO |
| Cartão de crédito 1–48 parcelas | MegMobileLaunchSheet | EvolutionLaunchModal | HERDADO |
| Prévia de parcelas | MegMobileLaunchSheet | EvolutionLaunchModal | HERDADO |
| Benefício trava conta/meio compatível | MegMobileLaunchSheet | EvolutionLaunchModal | HERDADO |
| Editar lançamento | MegMobileLaunchSheet | EvolutionActionDialog | HERDADO |
| Excluir lançamento com confirmação | MegMobileLaunchSheet | EvolutionActionDialog | HERDADO |
| Pendentes Todas/A pagar/Pagas/Vencidas | Payables | Pendentes | HERDADO |
| Agrupamento operacional por data | Payables | Pendentes | HERDADO |
| Baixa individual/lote | Payables | EvolutionActionDialog | HERDADO |
| Data, conta e forma na baixa | Payables | EvolutionActionDialog | HERDADO |
| Bloqueio de saldo e valor faltante | Payables | system-domain/ActionDialog | HERDADO |
| Carrossel cíclico de cartões | Cards/InfiniteCarousel | Cartões | HERDADO |
| Cartões e artes reais | Cards | Cartões | HERDADO |
| Fatura, limite e compras | MegMobileCardCenter | Central de cartão | HERDADO |
| Resumo/Atual/Próximas/Parcelas/Histórico | MegMobileCardCenter | EvolutionCardCenterTable | HERDADO NESTA RODADA |
| Busca na central do cartão | MegMobileCardCenter | EvolutionCardCenterTable | HERDADO NESTA RODADA |
| Exportação da central | MegMobileCardCenter | CSV + impressão/PDF | HERDADO NESTA RODADA |
| Edição de compra individual | MegMobileCardCenter | EvolutionPurchaseDialog | HERDADO |
| Benefício saldo/créditos/consumo | Benefit Center/Modal | Benefícios | HERDADO |
| Evolução do saldo benefício | MegMobileBenefitModal | BenefitChart/ActionDialog | HERDADO |
| Recarga Verocard | Mobile Benefit | EvolutionActionDialog | HERDADO |
| Histórico/Fluxo/Analytics | CoreScreens | Relatórios/Fluxo | HERDADO, refinamento desktop contínuo |
| Preferências de blocos da Home | MegMobileSettings | EvolutionSettings | HERDADO NESTA RODADA |
| Avatar/foto + nuvem | MegMobileSettings | EvolutionSettings/profile-avatar | HERDADO NESTA RODADA |
| Ativar/desativar forma de pagamento | MegMobileSettings | EvolutionSettings | HERDADO NESTA RODADA |
| Ativar/desativar cartão | MegMobileSettings | EvolutionSettings | HERDADO NESTA RODADA |
| Diagnóstico/teste de notificações | MegMobileSettings | EvolutionSettings | HERDADO NESTA RODADA |
| Estado do sistema / atualização de dados | MegMobileSettings | EvolutionSettings | HERDADO NESTA RODADA |
| Biometria | MegMobileSettings/native | Android somente | PLATAFORMA NATIVA, NÃO SIMULAR NO WEB |
| APK/OTA | Android | Android somente | CONGELADO POR REGRA OFICIAL |
| Crediário novo | Mobile histórico | Web Evolution | APOSENTADO POR DECISÃO OFICIAL; histórico preservado |

## Lacunas de acabamento

- Home ainda está em correção visual e não congelada.
- Lançamentos, Pendentes, Cartões, Benefício, Relatórios e Configurações precisam de pré-validação por screenshot conforme EVOLUTION-VISUAL-QA.md.
- A experiência histórica de amplo período deve continuar sendo refinada na superfície desktop, sem alterar a fonte financeira.
- Nenhuma dessas pendências autoriza importar layout ou CSS Mobile.

## Critério de conclusão

Paridade funcional só é marcada como concluída quando:
1. dados reais e gateways oficiais são usados;
2. Android permanece sem alteração;
3. Web não importa visual Mobile/Phoenix/WebNext;
4. build e CI estão verdes;
5. screenshot real passa pela pré-validação interna;
6. usuário valida a superfície final quando ela tiver referência visual.