# MEG Home 06 | DESIGN.md da experiência de refino

Referência visual soberana: print oficial `Tela principal.png` e as decisões atuais do MEG Web Evolution. Referência de retorno pré-confirmada: `25b167f38c9a302cf83ba079227ab7887fb6870a` registrada em `docs/MEG-HOME06-PRECONFIRMACAO-20261101.md`.

## Ajustes delimitados pela análise do vídeo 11-39-22.mp4

1. Eliminar espaço vazio abaixo do painel de indicadores, alongando apenas o saldo para alinhar o final da coluna financeira ao fim dos cartões em duas colunas reais.
2. Reorganizar as cinco ações rápidas desktop em 3 + 2, sem perder nenhuma ação; duas na segunda linha ocupando metade da largura cada.
3. Alinhar o rodapé do gráfico ao final do conjunto Benefícios + Ações rápidas em desktop, deixando o gráfico ocupar a altura disponível. O gráfico existente já dispõe de ResizeObserver; não criar um novo cálculo nem uma biblioteca nova.
4. Preservar cores dark teal/turquesa, logotipo, imagens, tipografia, carrossel circular, estados, benefícios, fluxo financeiro e ambas as instâncias do DataGrid.
5. Mobile-first, breakpoints principais 640 e 1024px, sem rolagem horizontal, cortes nem sobreposição. Não introduzir dados financeiros na UI.

## Ferramentas e limites

Taste Skill pode apoiar crítica e inspeção, mas **não está comprovadamente instalado** neste repositório. Refero e catálogos de DESIGN.md ajudam na documentação, mas não substituem os prints. Cult UI/ShaderGradient não são incorporados neste experimento, para evitar novos frameworks e regressões sem justificativa. Nunca utilizar estilos de terceiros como referência visual principal.

## Gate

Nove resoluções Playwright. Quando há 2 colunas superiores, diferença entre base dos KPIs e base do painel dos cartões <= 8px; igualar rodapés de Fluxo financeiro e Benefícios/Ações rápidas <= 8px; 5 ações visíveis, distribuídas 3 + 2 em desktop. Conferir capturas lado a lado com baseline, preservar a PR #651 Draft sem homologação e não tocar em Android, API financeira, Shell ou DataGrid.

## Experimento A/B sobre a Home real (01/11/2026)
- Baseline pré-confirmado SHA `25b167f`; nenhum número, componente ou organização inventado.
- `?estilo=a` é acabamento Neon elegante teal; `?estilo=b` é Neon premium teal com brilho mais forte.
- Variações existem somente no `preview.tsx` e `preview-style-variants.css`, não no bundle da Home real.
- O teste captura A/B em 1672 e 390px e preserva os nove viewports padrão. Ambos continuam sem aceite visual expresso; não publicar no Render sem decisão do usuário.
- As imagens genéricas A/B produzidas na conversa anterior foram rejeitadas e não servem de referência.

## 03/11/2026 | Refinos locais de cartões e grids
- Solicitação expressa: SVGs melhores nos DataGrids da Home, cartão principal mais destacado e setas centralizadas verticalmente sobre o palco.
- Duas setas semanticamente rotuladas e alvos 44px no palco; indicadores permanecem abaixo; manter swipe, navegação por teclado e índice circular.
- HomeGlyph acrescenta ícones locais; sort, filtro por coluna e paginação são refinados pelo CSS escopado .pano-grid sem alterar datagrid/** compartilhado.
- Teste verifica setas sobre o palco e SVGs nos dois DataGrids nos nove viewports. Status: candidato sem aceite visual explícito, baseline PR651 preservado.

## 03/11/2026 | Taste Skill em auditoria automatizada

O workflow .github/workflows/meg-home-06-taste.yml usa os scripts originais da versão 2.1.5 do Taste Skill, fixados por SHA, no modo --app, para inspecionar a Home existente em 1672/1024/390px. É ferramenta auxiliar, nunca autoridade superior aos prints oficiais, à pré-confirmação nem às regras financeiras. Ver docs/MEG-HOME06-TASTE-SKILL.md. A execução deve ser comprovada por run e artefato da CI.
