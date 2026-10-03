# MEG EVOLUTION — HERANÇA FUNCIONAL DO MOBILE PARA O WEB

> Status: REGRA DE ARQUITETURA
> Data: 03/10/2026
> Escopo: reconstrução do MEG Evolution Web.

## 1. Princípio central

O Android atual é a referência funcional consolidada do MEG.

Durante a reconstrução do Web Evolution, o Android deve ser tratado como **fonte de leitura** para regras, fluxos, estados, filtros, validações e comportamentos já aprovados.

O Android permanece **congelado**:
- não alterar componentes mobile;
- não alterar CSS mobile;
- não gerar APK;
- não publicar OTA;
- não refatorar o fluxo mobile durante esta fase.

A migração é **Mobile → Web**, nunca Web → Mobile enquanto o Evolution não estiver concluído e validado.

## 2. Regra de produto

A lógica de experiência é:

**Mobile = mais funcional e direto. Web = mais completo, mais amplo e mais analítico.**

O Web não deve copiar uma tela de celular esticada.

Ele deve herdar a mesma regra de negócio e o mesmo fluxo mental, aproveitando a área maior para:
- mostrar mais contexto simultaneamente;
- manter filtros visíveis quando fizer sentido;
- exibir mais colunas e detalhes sem abrir telas extras;
- usar painéis laterais, drawers e modais maiores;
- combinar KPIs, listas e gráficos na mesma visão;
- oferecer atalhos de teclado e ações de mouse;
- preservar tipografia legível;
- evitar microtexto;
- manter scroll apenas em regiões densas, nunca como solução estrutural para a Home.

## 3. Mapa funcional Mobile → Web Evolution

### Home
Fonte mobile:
- `Home`
- `PastHome`
- `FutureHome`
- `AllHistoryHome`

Herança obrigatória:
- saldo monetário;
- benefício separado do caixa;
- pendências;
- faturas;
- visão por período;
- ações rápidas;
- comportamento distinto para passado, mês atual, futuro e histórico.

Evolução Web:
- Command Center com mais contexto simultâneo;
- KPIs maiores;
- fluxo de caixa;
- carrossel de cartões;
- metas;
- movimentações recentes;
- vencimentos;
- resumo do mês.

### Lançamentos / Movimentações
Fonte mobile:
- `MegMobileMovements`

Herança obrigatória:
- lançamentos individuais;
- nunca agrupar por categoria;
- pesquisa por descrição, categoria, conta e forma;
- filtros por tipo, categoria, conta e forma de pagamento;
- ordenação por data;
- KPIs de entradas, saídas e resultado;
- status visível;
- forma de pagamento/recebimento visível;
- edição individual.

Evolução Web:
- tabela/lista ampla;
- filtros persistentes;
- mais colunas visíveis;
- ações de linha;
- pesquisa sem esconder contexto;
- painel de detalhes/edição sem perder a lista.

### Novo / Editar lançamento
Fonte mobile:
- `MegMobileLaunchSheet`

Herança obrigatória:
- Despesa / Receita / Benefício;
- descrição;
- categoria;
- conta;
- forma de pagamento/recebimento;
- cartão quando aplicável;
- data;
- valor;
- observações;
- Pago / Pendente quando aplicável;
- cartão de crédito com parcelamento;
- benefício trava a conta compatível e o meio de benefício;
- gravação em dados reais;
- recarregar a visão após salvar.

Evolução Web:
- modal central amplo;
- campos organizados em colunas;
- categorias visíveis;
- mais contexto de conta/cartão;
- prévia de parcelamento;
- histórico/autocomplete sem bloquear a digitação;
- validações visíveis no próprio modal.

### Pendentes / Baixa
Fonte mobile:
- `Payables`

Herança obrigatória:
- filtros Todas / A pagar / Pagas / Vencidas;
- agrupamento por data quando útil à agenda;
- baixa individual e em lote;
- escolha da data da baixa;
- escolha da conta e forma;
- bloqueio por saldo monetário insuficiente;
- informar quanto falta;
- fatura de cartão resumida sem perder os lançamentos individuais.

Evolução Web:
- agenda + tabela ampla;
- seleção múltipla persistente;
- resumo do saldo antes/depois;
- painel lateral de composição da fatura;
- confirmação de baixa mais rica.

### Cartões / Benefício
Fonte mobile:
- `Cards`
- `InfiniteCarousel`
- `MegMobileCardCenter`
- `MegMobileBenefitCardCenter`
- `MegMobileBenefitModal`

Herança obrigatória:
- carrossel cíclico;
- cartões reais;
- fatura;
- limite;
- compras;
- parcelas;
- benefício separado;
- saldo, créditos e consumo;
- edição do lançamento individual.

Evolução Web:
- central de cartões maior;
- cartão + fatura + métricas no mesmo viewport;
- tabela detalhada;
- filtros;
- gráficos de uso;
- benefício como visão própria dentro da mesma linguagem visual.

### Histórico / Fluxo / Analytics / Relatórios
Fonte mobile:
- `MegMobileHistory`
- `MegMobileCashflow`
- `MegMobileAnalytics`

Herança obrigatória:
- mesma fonte financeira;
- mesmos conceitos de período;
- separação monetário/benefício;
- filtros coerentes;
- resultados consistentes com Home e Lançamentos.

Evolução Web:
- gráficos maiores;
- comparações lado a lado;
- drill-down;
- tabelas de apoio;
- exportação quando aplicável.

### Configurações
Fonte mobile:
- `MegMobileSettings`

Herança obrigatória:
- perfil;
- preferências da Home;
- meios de pagamento;
- cartões;
- segurança;
- avisos;
- sistema.

Evolução Web:
- navegação lateral por seções;
- formulários mais largos;
- visão simultânea de catálogo e estado;
- ações administrativas mais claras.

## 4. Crediário

O **Crediário está aposentado para novos lançamentos no Web Evolution**.

Regras:
- não exibir Crediário como nova modalidade no Web;
- não criar novos lançamentos Web com modalidade Crediário;
- compras em cartão de crédito continuam aceitando parcelamento de 1 a 48 vezes;
- registros históricos de Crediário permanecem legíveis e preservados;
- o Android congelado não será alterado apenas para remover essa opção durante esta fase.

Esta decisão não autoriza apagar dados históricos nem alterar o comportamento do Android em produção.

## 5. Regra de implementação

O Web Evolution pode reutilizar:
- APIs;
- contratos de dados;
- regras financeiras;
- funções utilitárias neutras.

O Web Evolution **não deve importar o visual mobile** para obter aparência pronta.

Não reutilizar diretamente:
- CSS `meg-mobile-*`;
- layout de `MegMobile*`;
- dock inferior mobile;
- sheets móveis como solução desktop;
- dimensões, densidade e hierarquia feitas para tela pequena.

A aparência do Web deve seguir o contrato visual Evolution e as pranchas aprovadas.

## 6. Critério de aceite

Uma função migrada só pode ser considerada concluída quando:
1. a regra funcional do Mobile estiver preservada;
2. a experiência Web estiver mais completa, não apenas maior;
3. os dados reais estiverem conectados;
4. o Android não tiver sido modificado;
5. CI estiver verde;
6. houver captura real;
7. houver comparação visual interna;
8. o usuário fizer a validação final.
