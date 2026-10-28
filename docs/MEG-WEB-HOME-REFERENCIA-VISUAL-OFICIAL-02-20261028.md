# MEG Web Evolution · Home 06 · Referência visual oficial 02

**Decisão do usuário:** 28/10/2026. A **segunda imagem gerada** nesta conversa, depois da remoção das ofertas/descontos promocionais sem base real, é a nova **única referência visual oficial da Home**. Ela substitui a antiga referência da Home, \`Tela principal.png\`, e todas as candidatas/imagens anteriores para a finalidade de composição visual da Home. As referências das demais telas não são alteradas.

## Identificação inequívoca da imagem

- Nome canônico: \`MEG_HOME_REFERENCIA_VISUAL_02_20261028.png\`
- Arquivo fonte: segunda imagem exibida na conversa em 28/10/2026 (interface MEG em dark teal, carteira física no card Saldo e cartão no Verocard, cinco atalhos).
- Resolução original: **1536 × 1024 px**.
- SHA-256 do PNG original: \`f5159708960a2b85321cd67be6f0d746459d9df68761dadfacb3682f0e7b6665\`.
- A imagem original está anexada à conversa/projeto. Se for necessário incorporá-la fisicamente ao repositório, não substituí-la por uma recriação, thumbnail nem outra renderização de mesmo tema; usar os bytes correspondentes ao hash acima.

## Grade, identidade, hierarquia e composição

1. **Shell:** sidebar e topo com marca oficial MEG, logo em destaque, fundo azul petróleo escuro e turquesa. Utilizar Shell real já construído, nunca rasterizar menu como imagem.
2. **Primeira linha:** Saldo disponível (7 colunas) + Fluxo do mês (5 colunas). O saldo usa **asset de carteira** e **não** montanhas nem gráfico 3D SVG. Seu texto, valor, controle de privacidade e CTA são DOM real. Fluxo exibe **entradas, saídas, saldo/resultado do período**, mas sem inventar percentuais nem tendências.
3. **Segunda linha:** 4 KPIs simétricos com ícones, título, dado e resumo: contas a pagar, faturas, pendências e contas pagas. Onde o backend só tem contagem, **não inventar valor monetário** para reproduzir números ilustrativos.
4. **Terceira linha:** painel Verocard (saldo do benefício separado do saldo bancário, créditos e utilizado) + **cinco** ações rápidas iguais: Novo lançamento, Transferência, Pagar conta, Relatórios, Configurar metas. O painel de Benefícios usa asset visual próprio; sem descontos/promessas comerciais nem dados inventados.
5. **Quarta linha:** duas tabelas com o **DataGrid oficial existente**, com linhas acessíveis e SVGs pequenos para representar categorias das despesas. Preservar filtros, exportação e estados funcionais do DataGrid, sem substituir a tabela por imagem.
6. **Simetria obrigatória:** alinhamento de títulos, ícones, conteúdo e ações; alturas iguais por linha; botões de mesma altura, espaçamentos e cantos consistentes; nada sobreposto.
7. **Arte híbrida:** imagem WebP real para carteira, cartão e cenas artísticas; HTML/React para dados, tabelas, botões e leitura funcional. SVG somente onde for útil (ícones, gráficos **reais** baseados em read models).

## Regra da tela única e limites físicos

- **Desktop:** toda a Home, incluindo cabeçalho do Shell, 4 linhas de painéis e as linhas principais de ambas as tabelas, deve caber no viewport em **100% de zoom**, **sem rolagem vertical ou horizontal da página**. Validar especialmente **1366×768** e **1672×941**, com evidência do viewport útil real do navegador. Não basta que caiba em captura de 1536×1024.
- Fazer ajuste **estrutural**, por distribuição de altura, densidade editorial e sizing proporcional ao viewport (sem fixar alturas de um jeito que corte conteúdo). Não esconder ou truncar informação financeira crítica para passar em um teste.
- **Celular/tablet:** a imagem 02 define identidade e ordem visual, mas literalmente mostrar todos os 4 blocos e dez linhas de tabela de uma só vez num viewport estreito é incompatível com legibilidade, alvos de toque e ausência de cortes. **Não forçar escala minúscula ou ocultar conteúdo.** A solução mobile sem rolagem da página exige composição própria com painéis/abas navegáveis, sujeita a validação específica; o aceite desta imagem para desktop NÃO equivale a aceite do design mobile.
- Testar as dimensões padrão 320×700, 390×844, 768×1024, 1366×768, 1672×941 e 2560×1440. Critérios: \`documentElement.scrollWidth <= innerWidth\`, \`documentElement.scrollHeight <= innerHeight\`, ausência de scroll externo e elementos visíveis. Para mobile, testes devem respeitar a adaptação aprovada sem esconder acesso ao conteúdo.
- Não aplicar \`overflow:hidden\` no \`body\`/Home apenas para passar um teste: é proibido cortar informações e controles.

## Qualidade e aceitação

- Hierarquia imutável: (1) regras do domínio financeiro e seus testes, (2) esta imagem oficial para Home, (3) Prompt Master. A imagem contém **dados fictícios**: R$ 12.345,67, R$ 1.890,32, percentuais e marcas bancárias exemplificativas NÃO são dados reais autorizados.
- Saldo monetário consulta a autoridade canônica (data de referência explicitada); benefício consulta sua própria autoridade. Não combinar saldos.
- Shell, DataGrid, autenticação 01–04, API financeira existente, Android e produção preservados.
- Implementação isolada na PR #650, em Draft e sem merge. Build, testes, deploy e screenshots não substituem validação visual expressa.
- **Status:** **referência visual 02 oficialmente escolhida**; **implementação da Home ainda NÃO aprovada**. Publicação só deve ser chamada de validável quando houver preview Render do SHA exato, link sem cache e capturas de viewport.
