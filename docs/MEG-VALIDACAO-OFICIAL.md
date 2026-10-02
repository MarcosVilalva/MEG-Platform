# MEG — MEMÓRIA OFICIAL DE VALIDAÇÃO E CONTINUIDADE

> Fonte operacional para retomar a reconstrução após troca ou travamento de chat.
> Comando de retomada: **Retomar MEG pela Memória Oficial de Validação e Continuidade, do último ponto validado.**

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

- Web e Android são superfícies diferentes; reconstrução Web não altera visual Android.
- Uma tela por vez.
- Tela validada fica congelada.
- Não empilhar CSS visual antigo.
- Preservar autenticação, APIs, gateways e regras financeiras.
- Tela principal sem scroll geral; scroll apenas em regiões internas densas. Novo/Editar lançamento pode rolar.
- Responsividade estrutural.
- Não manter versões paralelas `vXX`, `old`, `final2` etc. no Web Next.

## 5. Ponto atual

Home, Lançamentos e Novo/Editar lançamento já possuem implementação Web Next mesclada e aguardam validação visual final antes de remoção de legado.

Próximo marco: **Login/Autenticação Web Next**, seguindo exatamente a referência desktop dividida e a identidade acima, sem alterar Android.

Após Login validado:
1. congelar Login;
2. auditar/remover apresentação Phoenix de autenticação Web que ficar órfã;
3. seguir para Pendentes / baixa;
4. atualizar este documento e a matriz oficial.
