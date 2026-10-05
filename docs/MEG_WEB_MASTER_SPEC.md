# MEG Web — Memória Oficial e Especificação Mestre

**Status:** FONTE OFICIAL DO PROJETO  
**Versão:** 2026-10-04 / Expert Baseline  
**Repositório:** MarcosVilalva/MEG-Platform  
**Referência visual corrente:** PR #570 `feat/evolution-final-fidelity`  
**Regra de proteção:** Android e `apps/web/src/mobile` são referência funcional e permanecem somente leitura durante a evolução Web.

---

## 0. Regra de retomada

Este documento é a fonte de verdade para qualquer novo chat, handoff ou retomada do projeto.

Ao receber algo como:

> Retomar MEG — memória oficial — último ponto validado.

a execução deve:

1. Ler este documento primeiro.
2. Verificar o estado atual da PR/branch corrente no GitHub.
3. Verificar o último CI / Visual Preflight.
4. Continuar do último checkpoint validado, sem reconstruir decisões já fechadas.
5. Não tocar no Android salvo instrução explícita posterior do usuário.

Nenhuma afirmação de “pronto” deve ser feita apenas porque o build passou. É obrigatória validação funcional + visual contra as referências aprovadas.

---

# 1. Princípio do produto

O MEG Web não é uma versão ampliada do Android.

O Web será o **centro de comando principal do ecossistema MEG**:

- configura parâmetros mestres;
- mantém cadastros;
- executa operações financeiras;
- analisa dados;
- oferece relatórios e apoio à decisão;
- gerencia cartões, categorias, formas de pagamento e demais cadastros;
- define preferências e comportamentos consumidos pelo Android;
- oferece uma experiência visual superior, moderna, responsiva e rica em dados.

O Android permanece focado na operação cotidiana, rápida e essencial.

**Diretriz:** Web > Android em capacidade analítica, administrativa e de configuração.

---

# 2. Relação Web x Android

## Web
Deve concentrar:
- parâmetros mestres;
- cadastros completos;
- regras configuráveis;
- relatórios avançados;
- análises;
- dashboards;
- Smart Grids;
- configuração de cartões;
- configuração de categorias;
- configuração de formas de pagamento;
- preferências de experiência;
- gestão de notificações;
- integração de imagem/identidade de cartões;
- auditoria e histórico;
- apoio à decisão financeira.

## Android
Deve concentrar:
- consulta rápida;
- lançamento;
- baixa;
- cartões;
- pendentes;
- benefício;
- notificações;
- configurações essenciais;
- biometria e recursos nativos.

O Android não deve carregar toda a complexidade administrativa do Web.

---

# 3. Linguagem visual oficial

O MEG deve ter aparência de produto financeiro de 2026.

Obrigatório:

- visual escuro premium;
- 3D controlado;
- profundidade por camadas;
- cantos arredondados;
- brilho/neon elegante;
- SVG linear premium;
- hierarquia visual clara;
- ausência de fundos brancos genéricos;
- ausência de componentes com estética de navegador padrão;
- evitar qualquer aparência de ERP dos anos 2000;
- cards com presença e profundidade;
- microinterações discretas;
- nenhum excesso de efeitos que comprometa legibilidade.

## Profundidade
Nível 0: fundo.  
Nível 1: painéis e áreas de conteúdo.  
Nível 2: cards, menus, filtros, modais e elementos selecionáveis.  
Nível 3: ações críticas/selecionadas.

Hover:
- elevação sutil;
- sombra reforçada;
- contorno luminoso leve.

Active:
- sensação de pressão;
- deslocamento mínimo.

---

# 4. Tipografia oficial

A tipografia atual é considerada insuficiente.

Direção preferencial: **Manrope Variable** ou equivalente moderno de alta legibilidade.

Escala:
- 400: secundário;
- 500: interface;
- 600: campos e grids;
- 700: KPIs;
- 750/800: valores financeiros principais.

Ativar:
- `font-variant-numeric: tabular-nums` em valores financeiros;
- `clamp()` para escalas responsivas;
- container queries quando o componente precisar responder ao próprio espaço.

## Regra de truncamento

Não podem usar ellipsis como solução principal:
- valor;
- saldo;
- data;
- status;
- parcela;
- conta selecionada;
- forma de pagamento crítica.

Podem truncar quando necessário:
- descrição;
- observação;
- histórico textual longo.

Ao truncar, deve existir tooltip, detalhe lateral ou expansão.

---

# 5. Responsividade

Responsividade não significa “encolher desktop”.

O sistema deve recompor layout por breakpoint e por espaço do componente.

Alvos de validação:
- 1920×1080;
- 1672×941;
- 1366×768;
- 1024×768;
- 768×1024;
- 430×932.

Regras:
- nenhuma tela principal com scroll global;
- listas e grids densos podem rolar internamente;
- evitar scroll horizontal;
- mobile deve trocar estrutura quando necessário;
- tabela desktop não pode apenas ser espremida em 430 px;
- valores críticos nunca podem desaparecer;
- tipografia deve adaptar sem quebrar limites físicos do componente.

---

# 6. MEG Smart Grid — componente oficial

Toda área tabular analítica deve usar um Smart Grid inspirado no melhor comportamento do Excel, porém com visual MEG.

Aplicação principal:
- Lançamentos;
- Histórico;
- Central do Cartão;
- relatórios tabulares;
- futuros módulos com dados tabulares.

Pendentes NÃO deve necessariamente usar o Smart Grid completo, pois é uma tela orientada à execução e baixa em lote.

## Cabeçalho
Cada coluna relevante:
- possui filtro;
- indica filtro ativo;
- suporta ordenação;
- pode ter cabeçalho sticky.

## Filtro por tipo

### Texto
- A → Z;
- Z → A;
- busca digitável;
- múltiplos checkboxes;
- selecionar tudo;
- limpar;
- aplicar.

### Número / valor
- menor → maior;
- maior → menor;
- maior que;
- menor que;
- entre valores;
- múltiplos critérios quando aplicável.

### Data
- antiga → recente;
- recente → antiga;
- antes;
- depois;
- intervalo;
- calendário.

### Categoria / Conta / Forma / Status / Cartão
- busca;
- múltipla seleção;
- checkboxes;
- valores reais provenientes do banco.

## Lógica
Múltiplos valores na mesma coluna = OU.  
Filtros em colunas diferentes = E.

Exemplo:
Categoria = Supermercado OU Fast Food  
E Conta = Banco do Brasil  
E Data = setembro/2026.

## Desktop
Popover pequeno ancorado na coluna.

## Mobile
Bottom sheet adaptado.

---

# 7. Lançamentos

Objetivo: análise e manutenção de eventos financeiros.

Grid sugerido:
- Data;
- Descrição;
- Categoria;
- Conta;
- Forma;
- Status;
- Valor.

Regras:
- não agrupar por categoria;
- filtros nas colunas;
- descrição é a coluna com maior flexibilidade;
- valores nunca truncados;
- histórico/autocomplete;
- edição;
- arquivamento/exclusão conforme regra de domínio;
- atualização do saldo após operação;
- proteção contra duplicidade.

---

# 8. Pendentes

Objetivo: execução financeira, não análise tabular pesada.

Manter:
- Todas;
- A pagar;
- Pagas;
- Vencidas;
- busca;
- período;
- conta;
- ordenação simples por vencimento/valor;
- agrupamento por vencimento;
- checkboxes;
- seleção múltipla;
- pagamento em lote;
- consolidação de fatura;
- detalhe antes da baixa.

Baixa:
- escolher data;
- conta;
- forma;
- saldo antes;
- valor;
- saldo depois;
- bloqueio por insuficiência;
- informar exatamente quanto falta;
- operação idempotente;
- confirmação final;
- botão cancelar no padrão secundário MEG.

---

# 9. Novo Lançamento

Modal/superfície única, sem scroll global.

Fluxos:
- Despesa;
- Receita;
- Alimentação/Benefício;
- Transferência quando aplicável.

Campos:
- descrição com histórico;
- categoria;
- classificação de conta;
- conta;
- forma de pagamento;
- cartão quando aplicável;
- valor;
- data/vencimento;
- situação;
- observação;
- parcelamento;
- visualização de parcelas;
- resumo;
- confirmação.

Cartão de crédito:
- cartão obrigatório;
- parcelamento até 48;
- cálculo real de competência, fechamento e vencimento.

Benefício:
- conta e forma adequadas;
- receita de benefício;
- consumo;
- histórico.

---

# 10. Configurações — Centro de Comando Mestre

Configurações Web é um módulo de primeira classe e deve ser totalmente funcional.

Não é uma tela de “opções restantes”.

Deve ser responsável pelos parâmetros que governam o comportamento do sistema e, quando aplicável, do Android.

## Áreas

### Perfil
- nome;
- avatar;
- preferências;
- identidade do usuário.

### Aparência
- tema;
- densidade;
- preferências visuais;
- comportamento de dashboard;
- opções futuras de acessibilidade.

### Parâmetros financeiros
- regras de competência;
- regras de período;
- preferências de saldo;
- defaults de lançamento;
- limites e comportamentos configuráveis compatíveis com o domínio.

### Categorias
CRUD completo:
- incluir;
- editar;
- ativar/desativar;
- excluir apenas quando permitido pela integridade referencial;
- grupo;
- ícone;
- ordem;
- cor/identidade;
- tipo de receita/despesa quando aplicável.

### Formas de pagamento
CRUD completo:
- incluir;
- editar;
- ativar/desativar;
- regras;
- tipo;
- compatibilidades;
- ordem;
- ícone.

### Cartões
CRUD completo:
- incluir;
- editar;
- ativar/desativar;
- excluir quando permitido;
- nome;
- banco/emissor;
- bandeira;
- últimos dígitos;
- limite;
- fechamento;
- vencimento;
- tipo;
- identidade visual;
- arte.

### Contas
Gerenciamento completo quando suportado pelo domínio:
- conta geral;
- investimento;
- monetária;
- benefício;
- ativa/inativa;
- identidade visual;
- regras compatíveis.

### Notificações
- canais;
- eventos;
- lembretes;
- resumo diário;
- preferências;
- testes de canal;
- parâmetros consumíveis pelo Android.

### Segurança
- sessão;
- dispositivos quando suportado;
- políticas e proteções;
- biometria permanece nativa do Android.

### Sistema
- diagnóstico;
- versão;
- integrações;
- estado de sincronização;
- parâmetros técnicos apropriados;
- OTA permanece recurso nativo do Android.

---

# 11. Cartões — cadastro e arte

Quando um cartão novo for cadastrado no Web:

1. deve aparecer automaticamente na guia Cartões;
2. deve entrar no carrossel;
3. deve ter identidade tipográfica coerente;
4. deve respeitar dimensões e proporção;
5. deve permitir arte customizada.

## Origem da arte
Prioridade recomendada:
1. biblioteca interna/catálogo de artes conhecidas;
2. upload de imagem pelo usuário;
3. URL/importação externa quando suportada e segura;
4. integração futura com busca de referência oficial.

Nunca depender de hotlink frágil para a UI final.

## Upload
O usuário pode escolher arquivo local no computador.

Após upload:
- validar formato;
- normalizar;
- redimensionar;
- gerar crop;
- manter proporção;
- preencher o card corretamente;
- criar versões otimizadas;
- armazenar no backend/storage do MEG;
- não esticar.

## Carrossel
- infinito/cíclico;
- centralizado;
- cartão ativo maior;
- cartões laterais menores;
- sombra 3D;
- neon elegante;
- full-bleed;
- gestos/scroll;
- teclado no desktop;
- responsivo.

---

# 12. Benefício

Verocard/benefício possui regra própria.

Mostrar:
- saldo;
- recargas;
- consumo;
- entradas;
- saídas;
- evolução;
- histórico.

Não tratar como cartão de crédito comum.

---

# 13. Relatórios — Analytics & Financial Copilot

O módulo atual de relatórios é considerado insuficiente e deve ser profundamente reconstruído.

Objetivo:
**apoio à decisão financeira**, não apenas gráfico estático.

## Modelo de interação
Inspirado em tabela dinâmica + gráficos responsivos.

O usuário seleciona dimensões e métricas; tabela e gráfico se atualizam juntos.

### Dimensões
- período;
- categoria;
- grupo de categoria;
- conta;
- cartão;
- forma de pagamento;
- status;
- tipo de evento;
- receita/despesa/benefício;
- competência.

Descrição NÃO deve ser dimensão principal de análise, pois é genérica e granular demais.

### Métricas
- valor total;
- quantidade de lançamentos;
- média;
- participação percentual;
- variação contra período anterior;
- tendência;
- saldo/resultado quando aplicável.

## Exemplos
- gastos por categoria;
- gastos por grupo de categoria;
- gastos por cartão;
- categoria dentro de cartão;
- cartão dentro de categoria;
- gasto por forma de pagamento;
- entradas por categoria;
- receitas x despesas;
- gasto mensal por supermercado;
- bebidas por cartão;
- categorias que mais cresceram;
- concentração de gastos;
- comparação mês atual x anterior.

## Visualizações
- barras;
- barras empilhadas;
- linhas;
- área;
- donut;
- ranking;
- heatmap quando fizer sentido;
- tabela dinâmica;
- KPIs.

O gráfico deve reagir à seleção da tabela/dimensões.

## Interação
- clicar em barra filtra tabela;
- selecionar linha destaca gráfico;
- múltiplos filtros;
- drill-down;
- voltar nível;
- salvar visão;
- exportar;
- período Mês / Intervalo / Tudo.

## Financial Copilot
O relatório deve produzir apoio à decisão baseado em dados reais.

Exemplos:
- categoria com maior aumento;
- cartão com maior concentração;
- gasto acima do padrão;
- redução/aumento contra mês anterior;
- tendências;
- compromissos futuros;
- possíveis excessos;
- comportamento recorrente;
- impacto no saldo projetado.

O Copilot:
- não movimenta dinheiro sozinho;
- não altera dados sem ação explícita;
- explica a evidência usada;
- aponta período e base da análise;
- deve evitar recomendações vazias ou genéricas.

---

# 14. Histórico

Interface legível para humanos.

Exemplos:
- “Lançamento criado”;
- “Lançamento alterado”;
- “Pagamento confirmado”.

Não exibir códigos técnicos como linguagem principal.

Smart Grid:
- data/hora;
- operação;
- descrição;
- usuário;
- origem;
- valor quando aplicável.

Código técnico pode permanecer no detalhe/auditoria.

---

# 15. Home

Tela principal sem scroll global.

Estrutura:
- período;
- usuário;
- avatar;
- busca global;
- notificações;
- saldo;
- entradas;
- saídas;
- resultado;
- resumo financeiro;
- cartões;
- benefício;
- ações rápidas.

Remover Plano Premium por enquanto.

---

# 16. Login e Loading

Login:
- manter identidade atual;
- remover/neutralizar autofill visual invasivo;
- responsivo.

Loading:
- considerado referência forte;
- preservar arte mestre;
- preservar tela cheia;
- não permitir flash intermediário.

---

# 17. Relatórios e Configurações são prioridades de produto

Após estabilização do Smart Grid e da base visual, as maiores prioridades são:

1. Configurações mestre funcional.
2. Relatórios / Financial Copilot.
3. Cadastros completos.
4. Cartões dinâmicos + gestão de arte.
5. Responsividade real.
6. Refinamento visual 3D.
7. Validação funcional e visual.

---

# 18. Critério de “100% real”

Uma tela não está pronta apenas por parecer correta.

Para ser considerada pronta:

- usa dados reais;
- grava dados reais quando aplicável;
- atualiza saldo;
- trata erro;
- impede duplicidade;
- respeita permissões/regras;
- funciona após refresh;
- funciona mudando mês;
- funciona mudando usuário quando aplicável;
- funciona em desktop/tablet/mobile;
- não depende de fixture em produção;
- passa testes;
- passa smoke;
- passa CI;
- passa Visual Preflight;
- é comparada com a referência visual aprovada.

---

# 19. Validação antes de merge/deploy

Obrigatório:
- testes de contrato;
- testes do domínio;
- smoke;
- CI;
- Visual Preflight;
- screenshots em múltiplas resoluções;
- revisão de telas;
- revisão de modais;
- revisão de fluxos críticos;
- verificação de Android intocado.

Build verde não equivale a produto validado.

---

# 20. Estado atual — checkpoint 2026-10-04

- PR #570: último modelo visual/funcional em validação.
- Android: protegido e somente leitura.
- Visual Preflight da PR #570: passou.
- Web pública/homologação atual no Render: não representa a PR #570 e possui histórico de build falho; não usar como referência final.
- Login: próximo do final.
- Loading: referência forte.
- Home: base correta, requer acabamento.
- Lançamentos: requer Smart Grid completo.
- Pendentes: manter foco em lote/baixa.
- Cartões: ampliar presença visual e cadastro dinâmico.
- Central: funcional, precisa refinamento.
- Benefício: boa base.
- Fluxo: requer visualização mais rica.
- Relatórios: prioridade máxima de reconstrução.
- Histórico: precisa linguagem humana + Smart Grid.
- Configurações: prioridade máxima como centro de comando mestre.
- Responsividade 430 px: precisa recomposição real, não redução.

---

# 21. Próximo passo oficial

Antes de implantação final:

1. implementar MEG Smart Grid;
2. refazer tipografia responsiva;
3. aplicar profundidade 3D e arredondamento;
4. reconstruir Configurações mestre;
5. reconstruir Relatórios / Financial Copilot;
6. completar cadastros;
7. tornar cartões dinamicamente cadastráveis e com arte customizável;
8. recompor mobile/tablet;
9. rodar validação;
10. somente então preparar merge/deploy.

---

# 22. Regra anti-regressão

Decisões marcadas neste documento como oficiais não devem ser desfeitas silenciosamente.

Qualquer mudança estrutural deve:
- ser explicitada;
- justificar o impacto;
- atualizar este documento;
- atualizar testes/preflight correspondentes.

Este documento deve evoluir junto com o produto.
