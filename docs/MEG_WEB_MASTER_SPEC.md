# MEG Web — Memória Oficial e Especificação Mestre

**Status:** FONTE OFICIAL DO PROJETO  
**Versão:** 2026-10-05 / Production Checkpoint + /FULL  
**Repositório:** MarcosVilalva/MEG-Platform  
**Referência visual corrente:** `main` no commit de produção `2cdf05cc89d9b9cbfdf713570d7e3c69bdb2ea86` (merge da PR #570)  
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
6. Aplicar por padrão a metodologia oficial `/EXPERT + /CRITIC + /DEEP + /RISK + /CHANCE`.

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

# 20. Estado atual — checkpoint de produção 2026-10-05

- PR #570: **mesclada em `main`** em 2026-10-05.
- Commit de produção: `2cdf05cc89d9b9cbfdf713570d7e3c69bdb2ea86`.
- Head final da PR: `07fba6a547c976bf7872e541d958274911840aaf`.
- Gates pré-merge no head final: **MEG Platform CI = sucesso** e **MEG Evolution Visual Preflight = sucesso**.
- Gates pós-merge no commit de produção: **validate = sucesso**, **build = sucesso**, **smoke = sucesso**, **deploy = sucesso**.
- GitHub Pages recebeu o deploy do commit de produção com sucesso.
- O job de aquecimento/availability posterior ao merge também concluiu com sucesso.
- Android e `apps/web/src/mobile`: permanecem protegidos e não foram alterados pelo fechamento da PR #570.
- O deploy da API no Render continua protegido por filtro de caminhos: alterações exclusivamente Web não devem reiniciar a API.
- Login, Loading, Home, Novo Lançamento, Lançamentos, Pendentes/Baixa, Cartões, Benefício, Fluxo de Caixa, Histórico, Relatórios/Financial Copilot e Configurações Mestre compõem agora a baseline oficial do MEG Web.
- MEG Smart Grid, filtros por coluna, proteção contra duplicidade, idempotência nos fluxos críticos, validação de saldo, comprovante de baixa e responsividade crítica fazem parte da baseline e não podem regredir silenciosamente.
- Arte customizada persistente de cartão continua dependente de estratégia apropriada de storage/backend; não simular persistência de imagem grande em estado local.
- A partir deste checkpoint, qualquer evolução deve sair de `main`, em branch própria, com CI e validação pertinente antes do merge.

---

# 21. Próximo passo oficial

A fase de reconstrução principal foi encerrada. O próximo ciclo passa a ser **produção real + Security Hardening + endurecimento pós-merge**, sem reabrir decisões já estabilizadas.

A segurança passa a ser a prioridade anterior a novas funções cosméticas ou expansões de escopo.

Ordem de execução:

1. executar o **Security Hardening Gate** descrito na seção 24;
2. validar a rota publicada do Evolution sem cache e confirmar carregamento do commit de produção;
3. executar smoke funcional contra o ambiente publicado, sem criar dados financeiros reais durante QA;
4. revisar visualmente as telas estruturais em desktop e 430 px contra as referências aprovadas;
5. registrar qualquer divergência como regressão objetiva, não como redesenho livre;
6. priorizar correções encontradas em uso real;
7. implementar storage/backend persistente para arte customizada de cartão somente quando a solução de armazenamento estiver definida;
8. manter Android/Mobile somente leitura em toda evolução Web;
9. atualizar este documento a cada novo checkpoint de produção.

Nenhuma etapa futura deve partir de branches históricas da reconstrução. A base oficial de reconstrução concluída é `main@2cdf05cc89d9b9cbfdf713570d7e3c69bdb2ea86`; checkpoints posteriores de documentação e hardening devem sempre partir da `main` corrente.

---

# 22. Regra anti-regressão

Decisões marcadas neste documento como oficiais não devem ser desfeitas silenciosamente.

Qualquer mudança estrutural deve:
- ser explicitada;
- justificar o impacto;
- atualizar este documento;
- atualizar testes/preflight correspondentes.

Este documento deve evoluir junto com o produto.

---

# 23. Metodologia oficial — Five-Lens Method

Todo trabalho relevante no MEG deve aplicar, por padrão, cinco lentes complementares:

## /EXPERT
Objetivo: produzir solução de nível profissional.

Antes de implementar:
- analisar arquitetura;
- verificar regras de negócio;
- verificar UX;
- verificar consistência com módulos existentes;
- escolher a solução mais robusta, não apenas a mais rápida;
- considerar banco, API, Web, Android e fluxo completo quando houver impacto.

Uma entrega não deve ser aprovada apenas por funcionar localmente.

## /CRITIC
Objetivo: procurar ativamente o que está errado.

Obrigatório:
- apontar incoerências visuais;
- identificar comportamento de protótipo;
- detectar regressões;
- questionar escolhas fracas;
- comparar com a referência aprovada;
- não preservar uma solução ruim apenas porque já existe.

A revisão deve assumir que existem defeitos até que sejam descartados por evidência.

## /DEEP
Objetivo: evitar análise superficial.

Antes de considerar uma mudança concluída:
- seguir o fluxo ponta a ponta;
- verificar efeitos indiretos;
- conferir integração entre módulos;
- testar estados vazios, erro, carga e persistência;
- verificar refresh, mudança de período, mudança de resolução e retorno à tela;
- conferir regras financeiras associadas.

## /RISK
Objetivo: mapear risco antes de alterar.

Avaliar:
- risco de perda/corrupção de dados;
- duplicidade;
- quebra de saldo;
- inconsistência entre Web e Android;
- regressão visual;
- performance;
- acessibilidade/legibilidade;
- responsividade;
- dependência externa;
- impacto de migração;
- impacto de deploy/rollback.

Mudanças financeiras críticas exigem proteção, idempotência e caminho claro de recuperação.

## /CHANCE
Objetivo: identificar oportunidades de elevar o produto além do pedido literal.

Durante a análise:
- procurar melhorias de UX;
- reduzir passos desnecessários;
- encontrar dados que podem gerar decisão útil;
- propor automação segura;
- detectar componentes que podem ser compartilhados;
- buscar melhor uso do espaço;
- identificar oportunidades de performance e clareza;
- sugerir melhorias que preservem as regras já validadas.

O uso de /CHANCE não autoriza alterar escopo silenciosamente. Oportunidades relevantes devem ser compatíveis com a visão oficial ou registradas antes de uma mudança estrutural.

## Combinação padrão

Salvo instrução explícita em contrário, todo trabalho do MEG deve ser conduzido como:

`/EXPERT + /CRITIC + /DEEP + /RISK + /CHANCE`

Esses nomes são atalhos de metodologia do projeto, não recursos especiais da plataforma.

## Regra de saída

Antes de declarar uma etapa pronta, a revisão final deve responder internamente:

1. **EXPERT:** é a melhor implementação razoável para o produto?
2. **CRITIC:** o que ainda está abaixo do padrão?
3. **DEEP:** o fluxo inteiro foi verificado?
4. **RISK:** quais riscos permanecem e estão controlados?
5. **CHANCE:** existe uma melhoria evidente e segura que estamos deixando passar?

Se alguma resposta crítica estiver insatisfatória, a etapa não deve ser marcada como final.


---

# 24. Security Hardening Gate — regra oficial

A partir do checkpoint de produção de 2026-10-05, segurança é uma fase obrigatória e permanente do MEG, não uma revisão opcional posterior.

## Objetivo

Reduzir superfície de ataque e impedir que futuras evoluções reintroduzam vulnerabilidades em autenticação, autorização, dados financeiros, integrações, Web, API, banco, notificações e recursos de IA.

## Prioridades obrigatórias

1. **Rate limiting e proteção contra abuso**
   - login;
   - cadastro;
   - recuperação de senha;
   - refresh de sessão;
   - endpoints administrativos;
   - notificações;
   - integrações externas;
   - operações financeiras sensíveis quando aplicável.

2. **Autenticação e autorização**
   - toda rota não pública deve exigir autenticação;
   - toda mutação deve verificar papel e acesso de escrita;
   - toda leitura/escrita de dados deve respeitar workspace/tenant;
   - testar IDOR e tentativa de acesso cruzado entre usuários/workspaces.

3. **Superfície pública**
   - revisar Swagger em produção;
   - proteger, restringir ou desabilitar documentação técnica quando não houver necessidade pública;
   - manter apenas health/readiness estritamente necessários.

4. **Headers e navegador**
   - adotar headers de segurança adequados;
   - definir CSP compatível com a Web publicada;
   - revisar proteção contra XSS e injeção de conteúdo;
   - evitar HTML arbitrário e execução dinâmica sem necessidade.

5. **Segredos**
   - nenhum segredo em código-fonte;
   - nenhum segredo em variável `VITE_*`;
   - revisar histórico/repositório para credenciais expostas;
   - manter segredos apenas em provedores seguros de ambiente;
   - rotacionar credenciais quando houver suspeita de exposição.

6. **Banco e persistência**
   - validar permissões efetivas do PostgreSQL/Supabase;
   - minimizar privilégios do usuário da aplicação;
   - impedir acesso administrativo desnecessário;
   - confirmar criptografia em trânsito;
   - revisar políticas e isolamento de dados;
   - manter Prisma/queries parametrizadas como padrão.

7. **Entradas hostis**
   - tratar qualquer entrada do usuário, importação, integração ou IA como não confiável;
   - validar tamanho, tipo, conteúdo e esquema;
   - cobrir XSS, SQL/NoSQL injection, path traversal, upload malicioso e payload excessivo conforme aplicável.

8. **Dependências**
   - manter auditoria automática de dependências;
   - não instalar pacote apenas porque foi sugerido por IA;
   - confirmar existência, mantenedor, reputação, versão e necessidade antes de adicionar dependência;
   - bloquear vulnerabilidades críticas conhecidas no CI.

9. **Financial Copilot / IA**
   - dados financeiros e descrições nunca devem possuir autoridade para executar comandos;
   - prompt injection deve ser tratado como dado hostil;
   - qualquer ferramenta futura do Copilot deve operar com privilégios mínimos;
   - o Copilot não pode movimentar dinheiro, alterar cadastro ou executar mutação sem ação explícita e autorizada do usuário;
   - separar instruções de sistema de conteúdo financeiro recuperado.

10. **Observabilidade e resposta**
    - registrar falhas de autenticação e eventos de segurança sem gravar senha/token;
    - detectar padrões anormais;
    - manter caminho de rollback;
    - documentar rotação de segredo e revogação de sessão;
    - revisar incidentes e transformar correções em testes anti-regressão.

## Gate de entrega

Antes de considerar o Security Hardening concluído, deve existir evidência automatizada ou revisável de:

- rate limiting funcional;
- autenticação/autorização por rota;
- isolamento entre workspaces;
- ausência de segredo público;
- headers/CSP adequados;
- dependências sem vulnerabilidade crítica conhecida;
- proteção contra classes principais de injeção aplicáveis;
- Swagger/rotas técnicas com exposição deliberada;
- testes de regressão de segurança no CI;
- Android/Mobile preservados salvo solicitação explícita.

O resultado deve ser incorporado ao CI. Uma futura PR que reduza essas proteções deve falhar ou exigir mudança explícita da especificação.

## Estado inicial observado em 2026-10-05

Já existem:
- JWT com segredo obrigatório em produção;
- access token curto e refresh sessions;
- validação de entrada com Zod;
- autorização por papéis;
- resolução de workspace e controle de acesso de escrita;
- CORS com origens configuradas;
- Prisma como camada principal de banco;
- segredos de produção fora do código via Render;
- proteção de duplicidade/idempotência em fluxos financeiros críticos;
- gate de dependências no CI.

Lacunas prioritárias a verificar/corrigir:
- rate limiting global e específico de autenticação;
- política explícita de security headers/CSP;
- exposição de Swagger em produção;
- testes automatizados de IDOR/acesso cruzado;
- auditoria formal de segredos;
- validação efetiva de privilégios do banco;
- política formal de segurança para o Financial Copilot e futuras ferramentas de IA.

Nenhuma dessas lacunas autoriza afirmar vulnerabilidade sem teste. Elas constituem itens de hardening obrigatórios.


---

# 25. Protocolo de continuidade autônoma

O projeto possui escopo, baseline, critérios de qualidade e regras financeiras consolidados. Quando Marcos autorizar continuidade autônoma, a execução deve avançar sem depender de aprovação intermediária para decisões técnicas rotineiras já cobertas por esta especificação.

Fluxo padrão autorizado:

1. partir da `main` corrente;
2. criar branch temática;
3. implementar o próximo bloco prioritário;
4. executar testes, build, smoke e gates aplicáveis;
5. corrigir regressões encontradas;
6. abrir PR;
7. revisar diff, CI e riscos;
8. fazer merge somente com gates verdes;
9. verificar pós-merge/deploy quando aplicável;
10. atualizar o checkpoint oficial.

A execução deve parar para decisão humana apenas diante de risco material de perda de dados, mudança irreversível, credenciais/segredos, custos externos, decisão de produto nova não coberta pelo escopo, conflito entre regras oficiais ou alteração do Android/Mobile sem autorização específica.

Microdecisões de implementação, correções de CI e escolhas técnicas reversíveis dentro do escopo não exigem interrupção.
