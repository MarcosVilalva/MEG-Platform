# Regras de Negócio

## Cartões de crédito
- Uma compra compromete o limite total no momento do registro.
- Compra acima do limite disponível é recusada.
- Compras após o fechamento entram na fatura seguinte.
- Parcelas dividem o valor total, preservando os centavos na última parcela.
- Cancelamento é lógico e restaura o limite comprometido.
- Usuário Leitor apenas consulta; Operador lança; Gerente e Administrador podem cancelar.

## Orçamento
- O orçamento é definido por usuário, mês e grupo de categoria.
- O realizado soma despesas não arquivadas cuja competência coincide com o mês.
- O saldo do orçamento pode ficar negativo e deve ser destacado.

## Segurança
- Todo dado pessoal é filtrado pelo usuário autenticado.
- Novas contas dependem de aprovação do administrador, salvo bootstrap inicial.
