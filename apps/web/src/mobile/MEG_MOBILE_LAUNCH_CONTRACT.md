# Contrato de Fidelidade — Lançamentos Mobile

Referência visual oficial: prancha “Prévia das Telas — Aplicativo Android MEG Finanças”, especialmente as telas 6 (Novo lançamento) e 9 (Lançamentos — lista).

## 1. Lançamentos — lista
- A tela representa lançamentos individuais. Não agrupa registros por categoria.
- As abas Todos / Receitas / Despesas / Alimentação são filtros, não agrupadores.
- Cada card mostra, nesta hierarquia:
  1. Data + status;
  2. Descrição;
  3. Categoria + conta;
  4. Forma de pagamento/recebimento em chip próprio;
  5. Valor;
  6. Acesso ao detalhe/edição.
- Cabeçalho, abas e busca ficam fixos.
- Somente a lista rola.
- O dock inferior permanece fixo.

## 2. Novo / Editar lançamento
A ordem conceitual é:
1. Tipo: Despesa / Receita / Alimentação;
2. Descrição;
3. Categoria;
4. Forma de pagamento/recebimento;
5. Conta;
6. Cartão, quando aplicável;
7. Valor;
8. Data ou vencimento;
9. Parcelas e prévia, quando for crédito;
10. Estado pendente/realizado;
11. Observações;
12. Ações fixas no rodapé.

Regras:
- Não usar <select> nativo do Android.
- Categoria, forma, conta e cartão usam seletor MEG próprio.
- Categoria aparece com nome principal e grupo como informação secundária, nunca como uma linha gigante “GRUPO · CATEGORIA”.
- Alimentação trava Conta em Benefício e Forma em Verocard.
- Compra no cartão exige cartão, categoria e forma de pagamento.
- A alteração de sinal continua disponível onde a regra financeira permite.

## 3. Seletor MEG
- Overlay escuro no padrão do app.
- Sheet responsivo, sem ultrapassar o viewport.
- Busca quando houver muitas opções.
- Somente a lista interna rola.
- Item mostra título e subtítulo.
- Seleção atual é destacada.
- Nunca abrir o seletor branco nativo do Android.

## 4. Regra de arquitetura
- Reaproveitar apenas dados, writers e regras de negócio.
- O visual desta área pertence à árvore clean-room mobile.
- Nenhuma tela principal rola; apenas listas e corpos internos explicitamente marcados.