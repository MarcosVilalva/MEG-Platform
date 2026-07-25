# MEG Analytics 2.0

## Regra central do fechamento

O valor exibido como **Disponível hoje** deve vir da mesma fonte de verdade do painel monetário atual.

```text
Saldo monetário atual
- despesas monetárias pendentes do recorte
= saldo livre após compromissos
```

Regras:

- considerar somente contas monetárias;
- não misturar benefícios, como Verocard, com dinheiro disponível;
- não somar receitas apenas previstas ao saldo atual;
- despesas pagas já estão refletidas no saldo monetário atual e não podem ser abatidas novamente;
- despesas pendentes entram uma única vez na projeção;
- transferências entre contas próprias não alteram o patrimônio consolidado;
- todos os indicadores devem usar a mesma data de corte e a mesma função de cálculo;
- a memória de cálculo deve permitir conferir cada parcela do resultado.

## Segmentações de dados

O painel terá segmentações combináveis e persistentes por sessão:

- período: mês, ano, intervalo e histórico completo;
- conta monetária;
- tipo: receita ou despesa;
- situação: pago, pendente e vencido;
- grupo;
- classificação;
- modalidade;
- forma de pagamento;
- cartão;
- faixa de valor;
- pesquisa por descrição.

Cada segmentação atualizará KPIs, gráficos, tabelas e memória de cálculo ao mesmo tempo.

## Estrutura executiva

### 1. Resumo principal

- saldo monetário atual;
- pendências filtradas;
- saldo livre após compromissos;
- receitas do período;
- despesas pagas;
- despesas pendentes;
- taxa de poupança;
- cobertura das obrigações;
- tendência contra o período anterior.

### 2. Gráficos interativos

- linha de evolução do saldo com área e pontos de eventos;
- fluxo de caixa diário com entradas, saídas e saldo acumulado;
- barras empilhadas por grupo e situação;
- Pareto de despesas com percentual acumulado;
- composição por grupo em rosca interativa;
- calendário de vencimentos e mapa de intensidade;
- comparação entre planejado e realizado;
- projeção dos próximos meses;
- evolução de receitas recorrentes;
- distribuição por forma de pagamento e modalidade.

Os gráficos devem possuir tooltip, destaque ao passar o cursor, animação moderada, seleção por clique e adaptação completa ao Android.

### 3. Tabela dinâmica financeira

A tabela dinâmica permitirá escolher:

- linhas: grupo, descrição, conta, forma de pagamento, mês ou situação;
- colunas: mês, situação, tipo ou modalidade;
- valores: soma, quantidade, média, maior valor e participação percentual;
- ordenação crescente ou decrescente;
- expansão de agrupamentos até o lançamento original;
- exportação do recorte.

### 4. Diagnóstico MEG

O diagnóstico deve explicar os números em linguagem direta, sem executar operações automaticamente:

- principais pressões do orçamento;
- variações relevantes;
- vencimentos críticos;
- concentração de gastos;
- margem real disponível;
- sugestões de revisão e prioridades.

## Padrões visuais

- visual premium, sem excesso de elementos;
- hierarquia clara entre indicador, explicação e detalhe;
- animações suaves e respeitando `prefers-reduced-motion`;
- cores acessíveis e não dependentes apenas da cor;
- descrições financeiras como texto principal, nunca IDs ou números de linha;
- carregamento com skeleton, estados vazios úteis e mensagens de erro acionáveis.

## Critérios de aceite

1. O saldo monetário exibido na análise é exatamente o mesmo saldo do painel monetário para a mesma data de corte.
2. O fechamento projetado é o saldo monetário atual menos as despesas monetárias pendentes filtradas.
3. Nenhuma despesa paga é descontada duas vezes.
4. Benefícios não compõem o dinheiro disponível.
5. Toda segmentação recalcula todos os componentes do painel.
6. Cada KPI possui memória de cálculo acessível.
7. A experiência funciona em desktop, navegador móvel e aplicativo Android.
