# Regras de Negócio

## Princípios financeiros

- Receita disponível do mês = saldo final do mês anterior + entradas efetivadas do mês.
- Fechamento do mês = saldo final anterior + receitas do mês - despesas do mês.
- O painel deve exibir separadamente saldo anterior, receitas do mês, receita disponível e fechamento; o saldo anterior nunca pode ficar oculto dentro de outro indicador.
- Para julho de 2026 na planilha de origem, a reconciliação esperada é: saldo anterior R$ 882,81 + receitas R$ 11.574,31 - despesas R$ 12.153,40 = fechamento R$ 303,72.
- Competência, vencimento e pagamento são datas independentes.
- Eventos previstos não compõem o saldo disponível.
- O saldo é consequência dos eventos; não deve ser alterado diretamente.
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
