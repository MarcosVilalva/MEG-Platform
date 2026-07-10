# Regras de Negócio

## Escopo

MEG Platform é exclusivamente de finanças pessoais.

## Receita disponível

Receita disponível do mês = saldo final do mês anterior + entradas do mês.

A interface deve mostrar o mês/ano e o valor do saldo transportado.

## Datas

Competência, vencimento e pagamento são independentes.

## Tipos

- receita aumenta disponibilidade quando efetivada;
- despesa reduz disponibilidade quando paga;
- transferência movimenta recursos entre contas e não altera patrimônio líquido;
- investimento e resgate devem preservar origem e destino;
- ajuste exige justificativa e auditoria.

## Ciclo financeiro

Rascunho → Previsto → Confirmado → Pago → Conciliado → Arquivado.

Estados incompatíveis não devem aparecer no formulário. Receitas não usam a mesma lógica de pendente/pago apresentada para despesas.

## Saldos

- saldo atual considera somente eventos efetivados;
- saldo projetado inclui eventos futuros conforme filtros;
- valores previstos não são apresentados como dinheiro disponível;
- saldo não é editado diretamente: resulta de eventos e saldo inicial.

## Histórico

Operações financeiras não são apagadas fisicamente na rotina comum. Usar arquivamento, cancelamento, estorno ou reversão.

## Usuários

- cadastro gera PENDING;
- acesso exige ACTIVE e aprovação;
- administrador principal: `m_vilalva@hotmail.com`;
- cada usuário acessa seus próprios dados;
- bloqueio revoga sessões;
- decisões administrativas são auditadas.

## Perfis

- VIEWER: leitura;
- OPERATOR: leitura, inclusão e alteração operacional;
- MANAGER: gestão financeira e arquivamentos;
- ADMIN: controle total, usuários e configurações críticas.

## Contas a receber

- título mantém valor total e saldo em aberto;
- recebimentos podem ser parciais;
- juros e multas são registrados separadamente;
- recebimento associado a conta pode gerar evento de receita;
- saldo em aberto nunca fica negativo;
- título é pago quando o saldo em aberto chega a zero.

## Cartões (regra alvo)

- compra parcelada gera todas as parcelas;
- limite é comprometido pela compra;
- pagamento libera limite conforme regra do cartão;
- fechamento e vencimento são independentes;
- estornos preservam histórico.

## Home e Analytics

Home exibe decisão e ação rápida. Analytics serve para investigação, tendência, comparação e drill-down.

## IA e automação

IA sugere e explica. Nenhuma ação financeira é executada sem confirmação explícita.
