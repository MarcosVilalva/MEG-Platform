# MEG EVOLUTION — CONTRATO VISUAL MESTRE

> **Status:** OBRIGATÓRIO  
> **Data de fixação:** 02/10/2026  
> **Escopo:** TODO o cliente Web MEG Evolution, inclusive telas futuras ainda não desenhadas.

## 1. Princípio absoluto

As cinco pranchas aprovadas pelo usuário são a **matriz visual canônica** do MEG Evolution.

Elas não são moodboard, referência genérica nem sugestão de paleta. São o padrão de execução.

Toda tela existente deve reproduzir sua prancha correspondente com fidelidade máxima.

Toda tela futura que não possua prancha própria deve ser derivada do mesmo sistema visual, como se tivesse sido desenhada no mesmo conjunto, pelo mesmo designer e na mesma sessão.

## 2. Cinco pranchas-mestre fixadas

### PRANCHA A — Loading / abertura
Fonte de validação: `Imagem do ChatGPT 2 de out. de 2026, 15_14_16-3.png`.

Características obrigatórias:
- fundo navy/teal cinematográfico;
- logo MEG FINANÇAS destacada;
- cena central holográfica com gráfico de crescimento;
- cards flutuantes;
- arcos/rings luminosos;
- relevo/paisagem escura;
- profundidade, brilho e atmosfera;
- barra de progresso integrada à composição;
- tipografia grande, legível e premium;
- não reduzir a cena a um card retangular genérico.

### PRANCHA B — Login Web desktop
Fonte de validação: `Imagem do ChatGPT 2 de out. de 2026, 15_14_12-1.png`.

Características obrigatórias:
- composição desktop em duas zonas integradas;
- área institucional/hero com forte presença visual;
- formulário premium de autenticação;
- dark navy + teal/ciano/verde MEG;
- iluminação de profundidade, não fundo chapado;
- campos e CTAs com presença visual coerente;
- assinatura visual consistente com Loading e Home.

### PRANCHA C — Login / experiência vertical
Fonte de validação: `Imagem do ChatGPT 2 de out. de 2026, 15_14_14-2.png`.

Características obrigatórias:
- mesma identidade do desktop, reorganizada verticalmente;
- logo e hierarquia preservadas;
- formulário central legível;
- brilho, cenário e profundidade mantidos;
- responsividade por recomposição, nunca por simples encolhimento.

### PRANCHA D — Home / Command Center
Fonte de validação: `Painel Financeiro Futurista MEG(1).png`.

Características obrigatórias:
- sidebar premium e fortemente integrada;
- headline de alto impacto;
- KPIs/cards com hierarquia clara;
- fluxo de caixa, cartões, metas, movimentações, vencimentos e resumo;
- cenário visual futurista com profundidade;
- composição desktop densa sem parecer sistema administrativo genérico;
- neon localizado, não espalhado indiscriminadamente;
- áreas internas podem rolar quando necessário, tela principal não deve depender de scroll geral.

### PRANCHA E — Home + Novo Lançamento / overlays
Fonte de validação: `Dashboard financeiro neon com modal de lançamento(1).png`.

Características obrigatórias:
- modal central integrado à Home;
- profundidade e glass coerentes com o restante do sistema;
- campos grandes e legíveis;
- categorias/chips premium;
- estados Despesa/Receita claramente diferenciados;
- ações Cancelar/Salvar coerentes com a hierarquia do sistema;
- overlays, drawers e diálogos devem parecer parte do mesmo produto, nunca componentes padrão de biblioteca.

## 3. DNA visual obrigatório

### Cor
Base:
- fundo profundo: `#071321`;
- painel: `#0A1728`;
- painel secundário: `#0D1D2D`;
- texto principal: `#EEF4F6`;
- texto secundário: `#A5B3BD`;
- borda: `#294052`.

Marca:
- verde MEG: `#53CF8D`;
- verde luminoso: `#71DDA4`;
- ciano: `#4BBAC7`.

Semântica:
- despesa/perigo: `#E2636B`;
- alerta: `#E2B65D`;
- informação: `#93B9D8`.

### Profundidade
Obrigatório:
- camadas;
- sombras profundas;
- brilho controlado;
- transparência/glass moderada;
- highlights de borda;
- fundos com atmosfera;
- contraste claro entre plano de fundo, superfície funcional e elemento focal.

Proibido:
- cards brancos;
- cinza administrativo;
- grid genérico sem profundidade;
- neon excessivo em tudo;
- sombras de biblioteca padrão;
- bordas sem integração com a cena.

### Tipografia
- hierarquia forte;
- títulos grandes;
- números financeiros com leitura imediata;
- textos auxiliares ainda legíveis;
- evitar microtipografia usada apenas para “caber mais coisa”.

### Ícones
- linguagem linear premium;
- traço consistente;
- integração com teal/ciano/verde;
- glow apenas quando fizer sentido;
- evitar ícones genéricos de aparência desigual entre módulos.

### Layout
- desktop alvo: 1920 × 1080, Windows 100%, Chrome 100%;
- responsivo sem destruir hierarquia;
- Home e telas-painel sem scroll geral sempre que a composição aprovada permitir;
- grids/listas densas podem ter rolagem vertical interna personalizada;
- sem rolagem horizontal estrutural;
- proporções e pesos visuais devem acompanhar a referência.

## 4. Regra para novas telas e variações futuras

Uma tela futura sem prancha explícita deve ser construída por **derivação do contrato**, obedecendo:

1. usar os mesmos tokens, materiais e profundidade;
2. reutilizar padrões visuais canônicos já validados, sem copiar layout de forma mecânica;
3. manter a mesma densidade e escala tipográfica;
4. usar o mesmo comportamento de sidebar/topbar/overlays;
5. novas tabelas, gráficos, cards, filtros e formulários devem parecer naturais ao lado das cinco pranchas;
6. qualquer novo estado responsivo deve preservar identidade e hierarquia;
7. qualquer arte nova deve parecer pertencente ao mesmo universo visual;
8. não introduzir uma nova paleta, família de cantos, padrão de sombra ou linguagem de ícones sem aprovação explícita;
9. variações são permitidas **dentro do sistema**, não fora dele.

Teste conceitual obrigatório:

> Se uma captura da nova tela for colocada ao lado das cinco pranchas, ela precisa parecer parte do mesmo produto sem explicação adicional.

Se isso não acontecer, a tela está visualmente incorreta.

## 5. Arquitetura de implementação

- O Android atual é referência funcional de leitura, não referência de layout desktop. O mapeamento oficial está em `EVOLUTION-MOBILE-FUNCTIONAL-INHERITANCE.md`.
- A regra de produto é: **Mobile mais funcional e direto; Web mais completo, amplo e analítico**.
- O Web herda regras, fluxos, estados e contratos validados no Mobile, mas recompõe a experiência para desktop em vez de esticar telas móveis.
- Evolution não importa visual Phoenix.
- Evolution não importa visual Web Next anterior.
- Dados, APIs, autenticação e regras de negócio permanecem reais.
- Artwork pode ser utilizado onde a prancha exigir composição complexa/cinematográfica.
- Componentes interativos permanecem componentes reais sobre/ao lado do artwork.
- Não transformar imagem inteira em screenshot estático quando a região precisa ser operável.
- Não sacrificar fidelidade por conveniência de reaproveitamento.

## 6. Regra de aprovação

Uma tela só recebe status **VALIDADA** com aprovação explícita do usuário.

CI, smoke, deploy ou ausência de erro funcional não equivalem a aprovação visual.

As classificações corretas são:
- EM CONSTRUÇÃO;
- PUBLICADA / AGUARDANDO VALIDAÇÃO VISUAL;
- REPROVADA / EM CORREÇÃO;
- VALIDADA / CONGELADA.

Não existe estado “bom o suficiente”.

## 7. Android

Este contrato rege a reconstrução **Web Evolution**.

O Android atual permanece congelado e protegido até a conclusão e validação do Evolution Web. Nenhum APK/OTA deve ser publicado durante esta fase.

A migração visual do Android será tratada somente depois e deverá seguir o mesmo DNA visual, adaptado à experiência nativa/móvel.


## 8. Pré-validação antes da apresentação ao usuário

Toda implementação visual do Evolution deve passar pelo processo descrito em `docs/EVOLUTION-VISUAL-QA.md`.

O assistente deve comparar uma captura real da implementação contra a prancha-mestre correspondente **antes** de declarar a tela pronta.

A aprovação final continua pertencendo ao usuário, porém a identificação de desalinhamentos óbvios de composição, marca, proporção, tipografia, profundidade, cor e componentes deve ocorrer antes.

Uma tela que ainda não passou por screenshot + comparação não pode receber status de pronta ou validada.
