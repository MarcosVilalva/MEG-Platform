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

## Cartões de crédito — planejado para Alpha 0.5

- Compra parcelada gera todas as parcelas na confirmação.
- O limite disponível é reduzido pelo total comprometido.
- Pagamento da fatura libera limite conforme a regra do cartão.
- Fechamento e vencimento determinam a fatura da compra.
- Estorno gera evento reverso; não apaga a compra original.

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

## IA

- A IA pode classificar, sugerir, explicar e simular.
- A IA não exclui, paga, transfere ou confirma sem ação explícita do usuário.
- Sugestões devem informar os dados considerados sempre que possível.
