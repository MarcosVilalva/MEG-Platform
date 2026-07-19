# Regras de Negócio

## Princípios financeiros

- Saldo de fechamento do mês anterior = todas as receitas desde o início da base até o último dia do mês anterior menos todas as despesas do mesmo intervalo.
- Receita disponível do mês atual = receitas registradas no mês atual + saldo de fechamento acumulado do mês anterior.
- Receita monetária é toda receita cuja **descrição não seja VEROCARD**. Quando a descrição for VEROCARD, o valor pertence exclusivamente ao ticket alimentação.
- Despesa monetária é toda despesa cuja **forma de pagamento não seja VEROCARD**. Quando a forma de pagamento for VEROCARD, o valor pertence exclusivamente ao ticket alimentação, independentemente da descrição.
- Créditos e gastos do Verocard permanecem nos lançamentos e nas análises próprias, mas não compõem receitas, despesas, saldo anterior nem saldo realizado em dinheiro.
- O mês anterior é sempre derivado do mês escolhido no filtro; ao trocar o período mensal, o saldo acumulado e o texto explicativo do card devem acompanhar a nova seleção.
- Saldo realizado do mês atual = receita disponível do mês atual - despesas pagas do mês atual.
- Despesas pendentes são exibidas separadamente e não reduzem o saldo realizado até serem pagas.
- O diagnóstico principal de saúde financeira sempre responde à situação do mês corrente, independentemente do filtro analítico: saldo monetário disponível hoje menos todas as despesas monetárias pendentes dentro do mês. Resultado negativo significa falta de dinheiro para fechar o mês e deve ser apresentado como alerta prioritário.
- Na aba Fluxo, o resultado líquido do período = receitas monetárias do período - todas as despesas monetárias do período, pagas ou pendentes. Esse indicador operacional pode ser negativo mesmo quando existe caixa realizado antes das pendências.
- O fechamento projetado do Fluxo = saldo de fechamento anterior + resultado líquido do período. Ele é o indicador principal de sobra ou falta de dinheiro; o subtotal antes das contas pendentes nunca deve ser apresentado como dinheiro livre.
- O filtro da aba Análises continua controlando a memória de cálculo, comparativos, grupos e gráficos; ele não pode mascarar um déficit existente no mês corrente.
- O painel deve exibir separadamente saldo anterior, receitas do mês, receita disponível e fechamento; o saldo anterior nunca pode ficar oculto dentro de outro indicador.
- O resumo principal possui três painéis: Monetário, Ticket Alimentação e Consolidado. Cada painel exibe Receitas, Despesas e Situação usando o mesmo período selecionado.
- No painel Monetário, Receitas = saldo monetário anterior + receitas monetárias do período; Despesas = despesas monetárias pagas; Situação = Receitas - Despesas pagas. As pendências aparecem no detalhamento.
- No painel Ticket Alimentação, Receitas e Despesas consideram exclusivamente o período selecionado; Situação = créditos Verocard do período - despesas pagas com Verocard no mesmo período.
- No painel Consolidado, Receitas = receitas disponíveis monetárias + créditos do ticket no período; Despesas = despesas monetárias pagas + despesas do ticket no período; Situação = situação monetária + situação do ticket do período.
- A agenda do painel principal lista todas as despesas pendentes do período em ordem de vencimento. Lançamentos de cartão com a mesma data e o mesmo cartão são apresentados como uma única fatura, preservando os lançamentos individuais.
- O pagamento rápido sempre exige confirmação. Ao confirmar uma conta, todos os lançamentos do agrupamento recebem status `paid` e situação `PAGO`; a alteração é salva no mesmo estado usado pelo restante do sistema.
- Contas individuais abrem para edição ao serem clicadas. Dentro de uma fatura de cartão agrupada, cada lançamento permanece visível e clicável para edição individual.
- Faturas com até cinco lançamentos exibem os itens diretamente na agenda. Acima de cinco, exibem o comando `Editar lançamentos do cartão`, que abre uma lista em pop-up; cada item da lista abre sua edição individual.
- O painel de acompanhamento apresenta no gráfico circular a participação de receitas monetárias disponíveis versus despesas monetárias totais do período. A barra horizontal representa separadamente o percentual das despesas já pagas, acompanhada por quantidade paga, quantidade pendente e próximo vencimento.
- O bloco `Saúde dos orçamentos` não é exibido no painel principal; a gestão detalhada de limites permanece no módulo Orçamentos.
- Para julho de 2026 na planilha de origem, a reconciliação esperada é: saldo monetário acumulado até junho R$ 882,81 + receitas monetárias de julho R$ 9.574,31 = receita monetária disponível R$ 10.457,12; despesas monetárias R$ 12.153,40, sendo R$ 4.419,66 pagas e R$ 7.733,74 pendentes; saldo monetário realizado R$ 6.037,46 e saldo monetário projetado -R$ 1.696,28. No período de julho, o ticket registra crédito de R$ 2.000,00, nenhuma despesa e situação R$ 2.000,00; o saldo consolidado realizado é R$ 8.037,46.
- Competência, vencimento e pagamento são datas independentes.
- Eventos previstos não compõem o saldo disponível.
- O saldo é consequência dos eventos; não deve ser alterado diretamente.
- Quando o saldo calculado divergir do saldo real do banco, a conciliação deve exibir os dois valores e registrar a diferença como um lançamento pago, identificado como `AJUSTE DE CONCILIAÇÃO BANCÁRIA`. O ajuste nunca pode ficar oculto nem sobrescrever lançamentos existentes.

## Lançamentos e parcelamentos

- A descrição sugere valores já utilizados no histórico, removendo o sufixo de parcela para sugerir o nome-base da compra.
- Para novos lançamentos de despesa nas modalidades `CREDITO` ou `CREDIÁRIO`, o usuário informa o valor total e a quantidade de parcelas. O sistema divide em centavos sem perder diferença de arredondamento e gera os meses subsequentes.
- A data informada é o vencimento da primeira parcela. Vencimentos que caiam no sábado ou domingo passam para a segunda-feira seguinte; em meses mais curtos, o dia é limitado ao último dia do mês antes desse ajuste.
- Cada descrição gerada recebe o sufixo `n/total`, por exemplo `VIDEO GAME 1/12` até `VIDEO GAME 12/12`, e as parcelas nascem como `PENDENTE`.
- A edição de um lançamento parcelado altera apenas a parcela selecionada; não recria nem sobrescreve as demais.
- Os cadastros iniciais de grupos, formas de pagamento e modalidades reproduzem a base histórica e podem receber novos itens pela aba Cadastros.
- Modalidade, forma de pagamento, classificação da despesa e grupo são campos de seleção fechada alimentados pela aba Cadastros. A modalidade filtra as formas de pagamento compatíveis; selecionar uma forma mantém sua modalidade cadastrada. Novos valores só entram pelo módulo Cadastros.

## Planejamento e saúde financeira

- As metas sugeridas utilizam todo o histórico monetário desde o início do controle, excluindo créditos e gastos Verocard.
- A referência de saúde financeira segue a distribuição 50/30/20: até 50% da renda média para grupos essenciais, até 30% para gastos flexíveis e meta mínima de 20% para poupança.
- A reserva de emergência sugerida equivale a seis meses da média histórica das despesas essenciais.
- A meta por grupo parte da média mensal histórica e aplica uma redução prudente: 5% para grupos essenciais e 15% para grupos flexíveis, respeitando os tetos de 50% e 30% da renda média.
- O Índice MEG, de 0 a 100, combina capacidade histórica de poupança, peso das despesas essenciais e equilíbrio entre renda e despesa. É um indicador interno de acompanhamento, não uma avaliação de crédito.
- O gasto do período selecionado é comparado com a meta mensal de cada grupo. Até 80% indica situação saudável; entre 80% e 100% exige atenção; acima de 100% indica limite excedido.
- Metas sugeridas podem ser aplicadas em conjunto ou substituídas manualmente por grupo.
- Transferências entre contas não alteram o patrimônio líquido.

## Ciclo financeiro

Rascunho → Previsto → Confirmado → Pago/Recebido → Conciliado → Arquivado.

Arquivamento não remove histórico. Estornos devem ser registrados como eventos reversos.

## Usuários e acesso

- O primeiro administrador só pode ser criado com o e-mail principal configurado.
- Novos usuários entram como pendentes.
- Usuário pendente, rejeitado ou bloqueado não pode autenticar.
- Apenas ADMIN gerencia usuários e permissões críticas.
- Bloquear usuário revoga sessões ativas.
- Mudanças de acesso geram auditoria.

## Perfis

- ADMIN: acesso total.
- MANAGER: cria, altera e arquiva dados financeiros.
- OPERATOR: cria e altera lançamentos, sem ações administrativas críticas.
- VIEWER: somente leitura.

## Eventos financeiros

- Receitas possuem valor positivo; despesas, valor negativo.
- Eventos pagos ou recebidos afetam o saldo realizado.
- Eventos conciliados permanecem rastreáveis.
- Cada evento pertence ao usuário, salvo compartilhamento familiar explícito futuro.

## Contas

- Saldo atual = saldo inicial + eventos efetivados.
- Contas inativas não aceitam novos lançamentos.
- Inativação preserva histórico.

## Categorias e formas de pagamento

- Categorias podem ser de receita ou despesa.
- Cadastros utilizados não são apagados fisicamente.
- Itens inativos permanecem no histórico.

## Contas a receber

- Cada título possui valor original, vencimento e saldo aberto.
- Recebimento parcial reduz o saldo aberto.
- O título só é quitado quando o saldo chega a zero.
- Juros e multa devem permanecer identificáveis.
- Recebimento associado a conta gera evento financeiro de receita.
- Títulos vencidos e não quitados devem ser destacados.

## Cartões de crédito

- Compra parcelada gera todas as parcelas na confirmação.
- O limite disponível é reduzido pelo total comprometido.
- Pagamento da fatura libera limite conforme a regra do cartão.
- Fechamento e vencimento determinam a fatura da compra.
- Estorno gera evento reverso; não apaga a compra original.
- Cada cartão possui bandeira, forma de pagamento, limite, fechamento, vencimento e melhor dia de compra.
- A bandeira define automaticamente a identidade visual do cartão, sem alterar os dados financeiros.
- Limite utilizado corresponde às despesas de crédito ainda não pagas, inclusive parcelas futuras; limite disponível é o limite cadastrado menos esse total comprometido.
- A Central de Cartões respeita o período global para fatura, maiores compras e grupos, mas calcula o limite comprometido usando todo o histórico ainda em aberto.
- Os filtros por cartão, situação e pesquisa devem atualizar todos os indicadores e a fatura detalhada da central.

## Orçamento e metas — planejado

- Orçamento é definido por competência e categoria.
- Realizado considera eventos pagos ou recebidos.
- Projetado inclui eventos previstos conforme configuração.
- Metas registram objetivo, valor acumulado e prazo.
- Simulações nunca alteram dados reais.

## Dashboard e Analytics

- A Home exibe informações que exigem ação ou decisão.
- Analytics é destinado à investigação, tendência e comparação histórica.
- Cálculos financeiros reutilizáveis devem residir no MEG Core.

## Alertas e destinatários

- O administrador escolhe quais números cadastrados recebem cada alerta manual.
- Números de WhatsApp pertencem ao usuário administrador e não são compartilhados entre contas.
- O alerta informa data da consulta, total em aberto, contas vencidas, contas dos próximos três dias, valor e forma de pagamento.
- O agendamento automático envia para todos os destinatários ativos e não repete o mesmo alerta no mesmo canal e dia.
- Ao abrir o sistema web, o usuário recebe uma central de alertas com contas vencidas, vencimentos de hoje, compromissos dos próximos três dias e eventual falta de caixa para fechar o mês.
- No aplicativo Android, as contas pendentes geram notificações locais três dias antes e às 06:00 do vencimento. A agenda é refeita sempre que os dados são carregados ou alterados, removendo contas já pagas.

## Proteção do saldo

- Uma despesa monetária não pode ser marcada como paga quando seu valor for superior ao saldo monetário disponível na data atual.
- O saldo disponível para pagamento considera todas as receitas monetárias recebidas até hoje menos todas as despesas monetárias já pagas até hoje; Verocard permanece separado.
- Quando o saldo for insuficiente, o sistema bloqueia a baixa, informa pagamento solicitado, saldo disponível e receita faltante, e oferece acesso direto a um novo lançamento de receita.

## Análise de receitas

- A aba Receitas respeita o período global e separa receitas monetárias dos créditos Verocard.
- A origem/descrição da receita pode ser filtrada e pesquisada; total, indicadores, evolução mensal, participação e ranking respondem ao filtro selecionado.
- A análise apresenta total monetário, média mensal, maior fonte, recorrência, evolução mensal e concentração por fonte.
- Queda superior a 10% entre os dois meses mais recentes do período deve ser destacada como atenção; ausência de receita monetária é uma situação crítica.

## Automação inteligente de notificações

- Compras em cartão de crédito com o mesmo cartão e vencimento aparecem como uma única fatura, com valor total e quantidade de compras.
- Em painéis, diagnósticos, alertas e indicadores de próximo vencimento, os compromissos são resumidos por data. Compras do mesmo cartão e vencimento aparecem sob o nome da fatura, nunca como a descrição isolada de uma compra.
- A prioridade é classificada como máxima (pendência aberta trazida de mês anterior), crítica (vencida no mês atual), urgente (vence hoje), alta (amanhã), atenção (até três dias) ou programada.
- Os alertas automáticos são avaliados às 06:00, 12:00 e 19:00 no horário de São Paulo; itens pagos deixam de aparecer imediatamente.
- Pendências de meses anteriores continuam nos alertas até serem pagas e aparecem como prioridade máxima.
- A cada cinco dias, às 06:00, o aviso normal é substituído por um resumo das pendências anteriores e de todas as contas abertas no mês corrente, sem antecipar meses futuros.
- O administrador pode cadastrar vários números de WhatsApp e vários e-mails na tela Ajustes.

## IA

- A IA pode classificar, sugerir, explicar e simular.
- A IA não exclui, paga, transfere ou confirma sem ação explícita do usuário.
- Sugestões devem informar os dados considerados sempre que possível.

## Identidade visual e projeção dos cartões

- O cadastro de cartão pode armazenar emissor, nome comercial, bandeira, quatro últimos dígitos e tema visual. Esses dados são cadastrais e não alteram valores, datas ou históricos financeiros.
- Cartões históricos sem os novos campos continuam válidos. O sistema infere identidade pelo nome da forma de pagamento e usa o visual genérico quando não houver correspondência segura.
- As bandeiras são recursos locais do aplicativo; a disponibilidade da carteira não depende de serviços de imagens de terceiros.
- A projeção de faturas considera despesas de crédito dos seis meses iniciados no mês selecionado, agrupando valor e quantidade por competência.
- A identidade visual nunca deve substituir a forma de pagamento usada para relacionar lançamentos, faturas e limites.

## Contas financeiras e beneficios

- Todo lancamento pertence explicitamente a uma conta financeira.
- Contas monetarias representam conta corrente, poupanca, dinheiro, carteira digital, investimento ou outra disponibilidade em moeda.
- Contas de beneficio representam alimentacao, refeicao, transporte, combustivel, saldo flexivel ou outro beneficio que nao deve compor o caixa monetario.
- O Verocard existente de Marcos e migrado para uma conta de beneficio de alimentacao; o nome e mantido apenas como dado legado do cliente.
- Novos clientes podem cadastrar qualquer emissor de beneficio sem depender de regra ou nome especifico.
- O campo `financialScope` prevalece sobre heuristicas antigas. A identificacao por descricao, modalidade ou forma de pagamento existe somente para migrar dados sem classificacao explicita.
- A migracao nao altera descricao, data, situacao, valor, quantidade de lancamentos nem totais historicos.
- Contas vinculadas a lancamentos nao podem ser excluidas; devem ser editadas ou ter os lancamentos movidos.
