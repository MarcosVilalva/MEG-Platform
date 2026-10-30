# MEG WEB EVOLUTION | HOME 06 | RECOMEÇO 30/10/2026

**Status:** AUDITORIA E REDIRECIONAMENTO DE DESIGN; SEM HOME IMPLEMENTADA; SEM APROVAÇÃO VISUAL DA NOVA IMPLEMENTAÇÃO.  
**Branch limpa:** `meg-web-evolution/06-home-reinicio-20261030`.  
**Base técnica:** PR #649, commit `7d80367c078ba5816014baedaa1ac0a94dc4e2d8`. Esta base inclui os fluxos visuais aprovados da Etapa 05, Shell e DataGrid, mas **não contém a pasta `apps/web/src/meg-web-evolution/home`**, conforme inspeção da árvore em 30/10.  
**PR #650:** implementação antiga da Home, REPROVADA; NÃO usar como base, NÃO mesclar.

## 1. Decisão explícita de 30/10/2026

O usuário autorizou **flexibilizar a reprodução pixel a pixel do print** para a **Home 06**, preservando a imagem escolhida como referência de identidade, densidade, composição e nível visual. A criatividade é permitida para melhorar legibilidade, hierarquia de decisão, responsividade e impacto, sem inventar dados, telas, funcionalidades ou condições de benefício.

**Prioridades preservadas:** (1) regras financeiras canônicas, (2) decisões funcionais aprovadas, (3) conjunto visual oficial como orientação da Home, (4) Prompt Master com esta exceção expressamente autorizada de fidelidade rígida **apenas para a Home**. O restante das telas mantém suas próprias referências até decisão explícita.

**Regra sem remendos:** componente visual não validado não é reutilizável. Se reprovado, criar componente/estilos novos, sem imports do JSX, CSS ou assets rejeitados, e sem introduzir uma segunda camada financeira. Reutilização de regras financeiras, autenticação, Shell e DataGrid previamente aprovados é obrigatória e **não** caracteriza reaproveitamento de UI rejeitada.

**O que permanece validado visualmente segundo o usuário:** tela de carregamento inicial, Login, Criar Conta, alteração/recuperação de senha, carregamento pós-login, sidebar, topbar com busca e período, DataGrid. A validação **funcional** de autenticação/recuperação é separada e segue pendente onde registrada. Android funcional fica congelado.

## 2. Achados reais do repositório e infraestrutura

- Repositório: `MarcosVilalva/MEG-Platform`, branch oficial `main`; workspaces `apps/web`, `apps/api`, `packages/database`, `packages/core`, etc.
- A árvore histórica possui `apps/web/src/phoenix/`, `apps/web/src/web-next/`, `apps/web/src/mobile/`, `apps/web/src/legacy-*.js` e outros módulos. **Existência não significa desuso**; `package.json` executa explicitamente testes `phoenix`, `web-next`, compatibilidade legada e Android.
- PRs #649 e #650 estão em Draft; a PR #650 tem falhas em contratos de viewport, auditoria gráfica e captura visual, incluindo seletores de componentes descartados.
- Render contém API `meg-platform-api` e múltiplos ambientes estáticos e Phoenix. Nenhum PostgreSQL foi listado no workspace Render consultado. `render.yaml` configura `DATABASE_URL` externa, e o banco com tabelas financeiras foi encontrado no Supabase.
- Projetos Supabase: `meg-financas` contém `Account`, `Category`, `FinancialEvent`, `Payable`, `CardPurchase` e outras entidades; `meg-evolution` não retornou essas tabelas no esquema público consultado. **Ainda não foi verificado que a API de produção aponta exatamente para a instância inspecionada.**

## 3. Levantamento exploratório de dados sem mutação

Consulta **somente leitura**, restrita ao cadastro que coincide com o administrador configurado no repositório. Esses números não substituem read models financeiros, não certificam titularidade da sessão autenticada e não serão digitados na UI.

- 2 contas (1 `checking`, 1 `benefit`); 47 categorias; 3.731 eventos financeiros não arquivados; 21 compras de cartão; 0 registros em `Payable` nessa conta.
- Em outubro/2026 (por data do evento): 24 despesas pagas, 72 despesas `planned`, 20 receitas pagas. Dos 96 eventos de despesa, 79 não possuem `categoryId` (7 pagas e as 72 planejadas).
- Amostra das classificações existentes: `SUPERMERCADO`, `IMÓVEL`, `TRANSPORTE`, `SAÚDE`, `COMUNICAÇÃO`, `LAZER`, `HIGIENE PESSOAL`, `Receitas`, entre outras. Há diversos registros com categoria nula; não adivinhar sua classificação.
- Existem lançamentos com data futura até pelo menos 2028; não tratá-los como pagos ou atuais só por existirem.

**Implicação funcional crítica:** a Home não deve equiparar 72 despesas planejadas a 72 títulos em `Payable`, nem criar card `Contas a pagar` com valor inventado. Indicadores de pagamento, fatura, categorias e benefício consumirão **somente** os contratos oficiais da API de leitura.

## 4. Modelo visual proposto: Panorama de Decisão

A Home deve permitir reconhecer situação financeira e próximo passo em poucos segundos. **Recomendação:** tela editorial de gestão, não simulação de um print em CSS.

1. **Cabeçalho existente, intocável:** sidebar e topbar já aprovados, com busca e competência reais.
2. **Zona de impacto:** hero panorâmico fotográfico em WebP/AVIF de alta definição e recorte responsivo; poucas informações sobrepostas; saldo **monetário** real + privacidade + CTA contextual. A arte não contém números/textos de interface embutidos, nem representa rentabilidade fictícia.
3. **Zona de decisão:** gráfico principal ECharts amplo, com receitas, despesas e resultado da fonte `cashflow.days`, zero claramente marcado, tooltip BRL e controle de período real. KPIs de entrada, saída, pendências e fatura em alinhamento geométrico explícito, sem altura artificial imposta ao gráfico.
4. **Benefícios:** componente visual reutilizável com categoria `Benefício Alimentação` ou rótulo genérico `Benefício`. Imagem ilustrativa HD de mercado/alimentos sobre cartão, sem marca Verocard embutida. Saldo/créditos/uso exclusivamente do `benefit-summary`; nunca adicionados ao saldo monetário. Separar `tipo de benefício` de `operadora/nome do cartão`; **não modificar cadastro ou writer da API agora**.
5. **Ações rápidas:** cinco funções que já existam na navegação da nova Web; alvos adequados, ícones SVG Lucide com traços consistentes, estados acessíveis.
6. **Leitura operacional:** últimos lançamentos e próximos vencimentos via **DataGrid homologado**, preservando ordenação cronológica, campos de forma de pagamento/conta quando disponíveis, filtros e dados reais. Não criar DataGrid paralelo.
7. **Informação ausente:** usar estado neutro com explicação e ação útil; nunca inventar saldo, desconto promocional, percentuais, limites ou quantidade de pendências.

**Tipografia:** propor `Manrope` para títulos e `Inter Variable` para leitura numérica/tabelas. Testar antes de aprovar; NÃO substituir globalmente a fonte das telas já validadas.  
**Paleta:** dark teal oficial, ciano/turquesa como destaque; verde para valores positivos, vermelho para saídas, dourado para pendências e azul para cartão/transferência. Glow concentrado, não em todas as superfícies.  
**Assets:** fotografia/arte não funcional em arquivos locais HD 1x/2x, licença e autoria documentadas, `cover` sem distorção; interface, gráfico, dados, controles e legendas permanecem DOM/SVG/ECharts. Não reutilizar assets rejeitados nem fabricar fotografia em CSS.  
**Responsividade:** mobile-first, breakpoints 640px e 1024px salvo necessidade comprovada; navegação sem scroll horizontal e sem sobreposição, área principal pode rolar verticalmente.

## 5. Limpeza segura e isolamento do legado

**Objetivo não é reduzir o repositório indiscriminadamente. É eliminar a influência do visual não homologado sobre a nova Web.**

| Grupo | Decisão | Justificativa |
|---|---|---|
| `apps/web/src/meg-web-evolution/home/` na PR #650 | EXCLUIR DA NOVA BASE | A nova branch parte da #649, que não tem essa pasta |
| CSS/JSX e imagens de Home rejeitadas | NÃO IMPORTAR | Sem reaproveitamento de interface |
| `apps/web/src/phoenix/`, `web-next/`, `mobile/` | QUARENTENA / AUDITORIA DE REFERÊNCIAS | Scripts e entradas ainda podem usá-los |
| `legacy-*.js`, `packages/core/` | PRESERVAR até prova de desuso | Compatibilidade, migração, testes e Android |
| API financeira, autenticação, Shell, DataGrid, fonte única | PRESERVAR | Autoridades funcionais/visuais já aceitas |
| PRs e previews antigos | INVENTARIAR, NÃO APAGAR AGORA | Podem documentar comportamento; remover só após mapa de dependências e aprovação |

**Porta de exclusão:** mapear importações diretas/transitivas, referências em build e testes, dependências do Android e deploy; testar a remoção em branch isolada e comparar com baseline. Nunca excluir arquivos da main ou da produção na mesma rodada que uma alteração visual.

## 6. Método obrigatório de desenvolvimento

1. Preparar mapa de componentes **apenas do novo layout**, com grid e hierarquia ajustáveis.
2. Criar protótipo visual novo (arte + componentes), sem implementar regra financeira na UI.
3. Validar cada bloco em captura real do navegador: hero, gráfico/KPIs, benefícios/ações, DataGrids.
4. Integrar read models existentes e estados vazios; observar atualização, privacidade e navegação.
5. Testes de 320, 390, 640, 768, 1024, 1366 e 1672+ px; garantir alinhamento, tipografia, centralização de ícones, foco e zero overflow horizontal.
6. Capturas e comparação com **direção visual aprovada de 30/10**, inclusive novos ajustes que o usuário autorizar. Testes de DOM devem ser alterados para medir requisitos, não para forçar aprovação de layout.
7. Rodar gates financeiros, segurança e CI; não alterar testes do Android.
8. Publicar **preview do SHA comprovado**, acrescentar parâmetro sem cache e registrar aprovação visual explícita da implementação. Sem validação, sem merge.

## 7. Decisões pendentes reais

- Confirmar que a instância Supabase explorada corresponde à base atual usada pela API autenticada e definir isolamento de dados comerciais multiusuário.
- Confirmar a definição funcional de `Benefício Alimentação` no catálogo sem renomear registros antigos/alterar contratos financeiros.
- Avaliar os próximos assets e a tipografia visualmente antes de codar demais telas.
- Completar mapa de importações/deploys para exclusão segura de histórico.
- Resolver homologação funcional de autenticação/recuperação quando chegar a respectiva etapa de revisão; não misturar com a Home.

**Regra final:** somente telas com aprovação visual explícita podem virar fundação visual. Regras financeiras continuam soberanas, inclusive quando seu módulo histórico ainda for necessário.


## Refinamento dos cartões e do looping (30/10/2026)
Vídeo `14-48-11.mp4` e pesquisa de decisões históricas reforçam uso obrigatório de carrossel circular real: card central, anterior/seguinte, wrap em ambas as extremidades, sem cópia de entidades financeiras. Navegação de teclado e gesto horizontal complementam botões; uma única entrada não cria peeks falsos. Indicadores compactos passam a reunir ícone e rótulo na mesma linha; hero sem headline redundante libera altura para o conteúdo de decisão. Esta revisão é candidata não homologada.


## Home 06, revisão de densidade visual após rejeição (30/10/2026)
A captura Playwright da versão `ffd6299d` demonstrou desproporção do carrossel (7/12), compressão do gráfico (5/12) e hero com informação insuficiente em área muito grande. Nesta candidata isolada a relação passa para gráfico 7/12 e cartões 5/12, com cartão central dimensionado, laterais cíclicos preservados, hero sem legenda decorativa e leitura numérica compacta. Benefícios/Ações passam a ter paridade 6/6. Teste visual de cabeçalho do gráfico inclui medição contra sobreposição em mobile. Sem aprovação visual.


## Reconstrução estrutural da faixa superior em 30/10/2026
A proposta anterior de aumentar/diminuir `min-height` por remendos de CSS foi descartada após reprovação. A Home da PR #651 recebe uma estrutura separada por responsabilidade: `pano-spotlight` (saldo monetário + cartões reais, na proporção 4/6 desktop), `pano-overview` (indicadores lidos da API, valor à direita do ícone) e `pano-finance-block` (fluxo diário + Benefícios/Ações). Imagens continuam reais/documentadas, sem valores embutidos. Loop circular do carrossel permanece. A mudança é exclusivamente visual, sem alteração das entidades, contratos financeiros e das telas homologadas. Permanece pendente aprovação visual.


### Responsividade auditada após vídeo de 30/10/2026
A versão anterior foi reprovada pelo usuário. `16-31-44.mp4` mostra navegador em desktop e carrossel de proporções ruins. O requisito é mobile-first com `640px` e `1024px` somente. A nova revisão impede alturas artificiais no body da Home, diminui palco de cartões e reposiciona KPIs ao lado do saldo no desktop em duas linhas 2x2; em tablet e celular a leitura empilha naturalmente. Controles de carrossel recebem 44px de alvo. Os DataGrids e a camada financeira permanecem intactos.
