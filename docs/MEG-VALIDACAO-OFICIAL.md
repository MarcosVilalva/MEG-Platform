# MEG — MEMÓRIA OFICIAL DE VALIDAÇÃO E CONTINUIDADE

> Fonte operacional para retomar a reconstrução após troca ou travamento de chat.
> Comando oficial de retomada: **Retomar MEG pela Memória Oficial de Validação e Continuidade. Não revalidar decisões já aprovadas. Conferir o estado atual do GitHub e continuar exatamente do último ponto validado.**

## 1. Regra de continuidade

Antes de qualquer alteração Web:
1. ler este arquivo;
2. ler `WEB-REBUILD-STATUS.md`;
3. ler `WEB-LEGACY-REMOVAL.md`;
4. conferir HEAD da `main` e PRs Web Next abertos;
5. continuar do primeiro item ainda em construção/validação;
6. não reabrir decisões já aprovadas sem solicitação explícita.

## 2. Identidade visual validada

Paleta-base oficial: **NAVY COMPACTO + VERDE MEG**.

- fundo: `#071321`
- painel: `#0A1728`
- painel secundário: `#0D1D2D`
- texto: `#EEF4F6`
- texto secundário: `#A5B3BD`
- borda: `#294052`
- verde MEG: `#53CF8D`
- verde luminoso: `#71DDA4`
- ciano: `#4BBAC7`
- navegação: `#102938`
- navegação profunda: `#0D2834`
- despesa/perigo: `#E2636B`
- alerta: `#E2B65D`
- informação: `#93B9D8`

Linguagem visual: dark premium, navy + teal/ciano/verde, neon elegante e localizado, glass moderado, contraste alto, tipografia grande e legível, profundidade sem poluição. Evitar interface monocromática verde, texto minúsculo, dashboard genérico e fundos brancos.

## 3. Referências visuais validadas em 02/10/2026

1. Loading: logo central, gráfico financeiro, cartões flutuantes, barra neon, texto “Carregando seus dados...” e “Organizando suas finanças para o seu dia a dia.”
2. Login mobile: logo no topo, “Bem-vindo de volta.”, campos escuros luminosos, “Entrar no MEG”, “Criar conta”.
3. Login Web desktop: composição dividida; hero à esquerda com “Sua vida financeira, com clareza para decidir.” e selos Saldo real/Projeções/Controle; formulário à direita.
4. Home Web: Command Center premium, sidebar forte, busca/período/alertas/avatar, cards financeiros, fluxo, cartões, metas, movimentos, vencimentos e resumo.
5. Novo Lançamento: modal central premium acionado por “+ Incluir”, campos grandes, categorias/chips, Cancelar e Salvar lançamento.

## 4. Regras permanentes

- Web e Android são superfícies diferentes.
- **ANDROID CONGELADO:** o aplicativo Android atualmente em uso permanece funcionando na base atual enquanto o Web Evolution é reconstruído.
- **Não gerar, publicar, oferecer nem atualizar APK/OTA Android durante a reconstrução do Web Evolution.**
- O manifesto estável Android deve permanecer na versão já publicada (`2.0.708`) até decisão explícita posterior.
- A migração do Android para deixar de depender do Phoenix ocorrerá somente depois que o Web Evolution estiver concluído e validado.
- Durante essa fase, arquivos Phoenix ainda necessários ao Android não devem ser removidos.
- **EVOLUTION é o futuro cliente Web oficial. Phoenix deixa de ser referência visual e deixa de ser o destino arquitetural do Web.**
- A reconstrução do Evolution é clean-room na camada visual/estrutural Web.
- Preservar autenticação, APIs, gateways, regras financeiras, persistência e dados.
- Uma tela por vez.
- Tela validada fica congelada.
- Não empilhar CSS visual antigo.
- Tela principal sem scroll geral; scroll apenas em regiões internas densas. Novo/Editar lançamento pode rolar.
- Responsividade estrutural.
- O Evolution não deve importar componentes visuais ou CSS Phoenix.
- O Android não pode ser usado como laboratório para alterações do Evolution Web.

## 5. Ponto atual

### DECISÃO FINAL DE ARQUITETURA — 02/10/2026

A estratégia anterior de evolução incremental do `web-next` sobre o runtime Phoenix foi encerrada como direção futura.

A partir deste marco:

1. **MEG Evolution será reconstruído do zero na camada visual Web**, com raiz, shell, navegação, componentes, estilos e rotas próprios.
2. Phoenix passa a ser **legado protegido temporariamente**, mantido apenas onde ainda sustenta o Android atual ou regras/bridges que ainda não foram desacopladas.
3. O Evolution Web não deve depender visualmente de `PhoenixApp`, componentes Phoenix nem CSS Phoenix.
4. Regras de negócio, autenticação, APIs, persistência e gateways existentes serão preservados e acessados por fronteiras/adaptadores quando necessário.
5. As referências visuais oficiais continuam sendo as imagens aprovadas em 02/10/2026 e a paleta **Navy Compacto + Verde MEG**.
6. O Android atual fica **CONGELADO** e continua sendo usado normalmente.
7. **Nenhum novo APK/OTA Android deve ser gerado ou publicado enquanto o Web Evolution estiver em reconstrução.**
8. O canal estável Android permanece em `2.0.708` até decisão explícita de retomada da migração Android.
9. Somente após o Web Evolution estar concluído e validado será iniciada a migração do Android para deixar de depender do Phoenix.

### Próximo ponto obrigatório de retomada

**Fundação do MEG Evolution mesclada na `main` pelo PR #524, commit `640cec2da12897c5515aa5dd6c540448f8d93154`, com entrypoint independente `evolution.html`, raiz `apps/web/src/evolution/` e Loading clean-room. CI, smoke e deploy verdes. Android permanece intocado e congelado.**

Estado da fundação:
1. raiz `apps/web/src/evolution/`: CRIADA;
2. entrypoint `apps/web/evolution.html`: CRIADO e separado do Android;
3. build Capacitor: permanece usando somente `index.html`, portanto não inclui o entrypoint Evolution;
4. Loading Evolution: CORRIGIDO no PR #525, commit `d4ffde4d6f49fef3bf6a9d2e861c5cc0b3ba0b28` — logo Evolution própria com M/E separados e progresso concluindo em 100%; aguardando nova validação visual;
5. após validação do Loading: construir Login → Shell → Home, uma tela por vez.

### Frase obrigatória para retomar após travamento

> **Retomar MEG pela Memória Oficial de Validação e Continuidade. Não revalidar decisões já aprovadas. Conferir o estado atual do GitHub e continuar exatamente do último ponto validado.**

Ao receber essa frase, o primeiro procedimento é ler este arquivo e o estado do GitHub. Não voltar ao plano Web Next/Phoenix incremental e não gerar atualização Android.


### Ajustes obrigatórios do Loading Evolution — 02/10/2026

O Loading publicado no PR #524 **não foi validado**. Foram identificados dois defeitos:
- a logo usada no Evolution compactava o `M` contra o `E`;
- o progresso terminava em `92%`.

Correção oficial implementada no PR #525 / commit `d4ffde4d6f49fef3bf6a9d2e861c5cc0b3ba0b28`:
- asset exclusivo do Evolution em `apps/web/public/evolution/brand/meg-mark.svg`, sem alterar os assets compartilhados usados pelo Android;
- letras M, E e G posicionadas separadamente, sem compactação negativa;
- progresso do Loading avança até `100%`;
- o estado `aria-busy` encerra ao atingir 100%;
- CI, smoke e deploy verdes;
- Android permaneceu congelado e não participou da correção.

**Estado de retomada: Loading Evolution corrigido e publicado, aguardando validação visual. Não avançar para Login Evolution antes dessa validação.**


### Reprovação visual do Loading Evolution — 02/10/2026

A composição minimalista publicada anteriormente foi **reprovada visualmente** por não corresponder à imagem oficial de referência. Não tratar o PR #525 como validação visual.

O Loading deve reproduzir a linguagem da referência aprovada:
- logo MEG FINANÇAS grande e central;
- cena holográfica central, não um simples card retangular;
- gráfico de barras + curva luminosa;
- quatro cards flutuantes (donut, lista, tendência e alvo);
- plataforma/rings luminosos na base;
- arcos neon e relevo/paisagem escura no fundo;
- ordem: **logo → cena → progresso → título → subtítulo**;
- progresso obrigatório até 100%.

Branch de reconstrução visual: `feat/evolution-loading-cinematic`.
Android permanece congelado e não participa desta alteração.


### Loading Evolution cinematográfico publicado — PR #527

Implementação mesclada na `main` no commit `17176eeaed92b3b9a72db50671a7acd472954f8a`.

Estado:
- composição anterior minimalista: REPROVADA;
- PR #526: ENCERRADO sem merge;
- Loading cinematográfico: PUBLICADO;
- CI: verde;
- smoke: verde;
- GitHub Pages: publicado;
- validação visual do usuário: PENDENTE;
- Android: congelado, sem alteração.

**Não avançar para Login Evolution até a validação explícita do Loading publicado no PR #527.**


## 6. Regra-mãe de fidelidade visual do Evolution

Esta regra vale para **TODO o MEG Evolution Web**, não apenas para o Loading.

As imagens/pranchas aprovadas são **contrato visual de implementação**, e não simples inspiração.

Aplicação obrigatória:
- Loading;
- Login;
- Shell e Sidebar;
- Home;
- Lançamentos;
- Novo/Editar lançamento;
- Pendentes e baixa;
- Cartões, central e fatura;
- Benefício;
- Metas e planejamento;
- Relatórios e fluxo de caixa;
- Histórico;
- Configurações e perfil;
- buscas, filtros, modais, drawers, alertas, toasts, estados vazios e erros.

Regras:
1. Não reinterpretar livremente uma tela aprovada.
2. Não reduzir uma composição visual complexa a cards genéricos só porque é mais simples de codificar.
3. Quando a referência utilizar arte complexa, cenário, brilho, profundidade ou elementos gráficos difíceis de reproduzir fielmente com CSS puro, utilizar artwork/asset próprio do Evolution como base visual, mantendo dinâmicos apenas os elementos que precisarem ser funcionais.
4. Elementos funcionais devem continuar reais: dados, filtros, botões, formulários, navegação, carrosséis, modais, gráficos, progresso e estados.
5. Responsividade deve preservar composição, hierarquia e impacto visual, adaptando enquadramento sem deformar a arte.
6. Não reutilizar visual Phoenix ou Web Next para acelerar entrega.
7. Fidelidade visual tem prioridade sobre reaproveitamento de componentes antigos.
8. Uma tela só pode ser marcada como VALIDADA após aprovação explícita do usuário comparando-a com a referência oficial.
9. Se a implementação ficar apenas “parecida”, “inspirada” ou “na mesma paleta”, ela deve continuar como NÃO VALIDADA.

**Resumo operacional:** o objetivo do Evolution é reproduzir o sistema aprovado, tela por tela, com fidelidade máxima e funcionalidade real.


## 7. Cinco pranchas fixadas como contrato mestre

As cinco imagens reafirmadas pelo usuário em 02/10/2026 estão fixadas como matriz visual canônica de **TODO o MEG Evolution**.

O contrato detalhado está em `docs/EVOLUTION-VISUAL-CONTRACT.md` e deve ser lido obrigatoriamente em qualquer retomada.

Regra para telas novas: **não criar uma nova identidade**. Toda variação futura deve ser derivada dessas cinco pranchas e parecer pertencer exatamente ao mesmo produto.

Critério visual simples: ao colocar uma captura de qualquer nova tela ao lado das cinco pranchas, ela deve parecer parte do mesmo MEG sem precisar de explicação.


## 8. Pré-validação visual interna obrigatória

O usuário **não é o QA visual primário** do MEG Evolution.

Antes de comunicar que qualquer tela está pronta, concluída ou disponível para validação final, o assistente deve executar a **pré-validação visual interna obrigatória** definida em `docs/EVOLUTION-VISUAL-QA.md`.

Fluxo:
`implementar → CI → preview → screenshot real → comparar com a prancha → corrigir → recapturar → repetir → pré-validar → só então chamar o usuário`.

CI verde não autoriza a frase “está pronto”.

Se a captura ainda apresentar divergências evidentes, o assistente deve continuar corrigindo sem transferir essa triagem ao usuário.

Se a captura não puder ser obtida ou inspecionada, o estado correto é **CAPTURA PENDENTE**, nunca “pronto”.

O workflow oficial de captura é `.github/workflows/evolution-visual-preflight.yml`.
