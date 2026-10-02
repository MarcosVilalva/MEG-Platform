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

**Iniciar a fundação do MEG Evolution Web com separação real de entrypoint/runtime, mantendo o Android atual intocado.**

Ordem inicial:
1. criar a raiz `apps/web/src/evolution/`;
2. criar entrypoint Web Evolution separado do runtime Android;
3. preservar o entrypoint Android atual;
4. construir Loading → Login → Shell → Home pelas referências aprovadas;
5. avançar uma tela por vez somente após validação explícita.

### Frase obrigatória para retomar após travamento

> **Retomar MEG pela Memória Oficial de Validação e Continuidade. Não revalidar decisões já aprovadas. Conferir o estado atual do GitHub e continuar exatamente do último ponto validado.**

Ao receber essa frase, o primeiro procedimento é ler este arquivo e o estado do GitHub. Não voltar ao plano Web Next/Phoenix incremental e não gerar atualização Android.
