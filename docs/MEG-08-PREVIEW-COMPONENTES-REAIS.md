# MEG Web Evolution | Visualização integrada de componentes REAIS | Etapa 08

Branch de preview isolada, criada **sobre #651**. Não aprova nem mescla as PRs.
Não altera os componentes das etapas 05/06, API, Android, banco, autenticação ou DataGrid.

## Proveniência
- Loading, Login, Criar Conta, Recuperar Senha: componentes oficiais da PR #649, herdados pela #651.
- Home e Shell: PR #651 (baseline pré-confirmado de 01/11; a #653 permanece experimental).
- LaunchTypePicker, seus dois estilos originais e cinco WebPs: copiados por SHA sem adaptação da PR #648.
- Apenas entrypoint, controle de navegação demonstrativa e ajustes responsivos ESCOPADOS a esta prévia são novos.

## Executar localmente
Na raiz do repositório:
1. npm ci --audit=false
2. cd apps/web
3. npx vite --config vite.fluxo-integrado-08.config.ts --host 0.0.0.0 --port 5175
4. http://localhost:5175/fluxo-integrado-08.html

Rotas da prévia: ?tela=login, home, novo, cadastro, recuperar-senha, carregamento-inicial.
Percurso padrão: carregamento ilustrativo → login visual → clicar "Entrar em modo demonstração" → carregamento ilustrativo → Home com fixture existente → "Novo lançamento".

## Restrições explícitas
- Não é login real. Não inserir credenciais no preview. A tela Login foi preservada com previewOnly.
- O progresso é ilustrativo. Não faz consultas de API.
- Os dados da Home são a fixture técnica existente, nunca dados reais.
- O seletor de tipo é real, mas o formulário protegido de Despesa/Receita NÃO é chamado nesta prévia para evitar escrita de dados.
- Transferência/Benefício permanecem desabilitados no componente de origem.
- Botão de Novo do Shell é capturado somente pelo container de preview, sem modificar AppShell.
- Não realizar merge/deploy até gates e validação visual expressa.


## Revisão visual conjunta (03/11/2026)
Última Home da PR #653 aplicada à PR #654 como candidato, sem alterar a PR #651. Complemento visual isolado reforça o cartão principal, utiliza imagem local no saldo, compacta os acessos rápidos e melhora a simetria/responsividade do seletor de Novo Lançamento. Android, gravações financeiras, API, Shell, DataGrid e componentes de autenticação não foram alterados.

**Gates:** verificar build, sequência navegável, capturas em nove resoluções e status Render/SHA exato antes de encaminhar. A prévia **não é homologação**.


## Correção estrutural de tablet e qualidade da Home
Capturas de 640×900 e 768×1024 revelaram texto muito estreito e interferência visual com fotos. Para 640–1023, hero e opções são empilhados de forma proporcional; a coluna dupla continua no desktop ≥1024. Os atributos informativos do rodapé permanecem com título, sem descrições excessivamente estreitas.

O teste integrado foi estendido: nove viewports para Home e nove para Novo Lançamento, com medição de overflow, cinco atalhos/ícones de até 29px, alvos >=44px, grade 3+2 desktop, presença dos dois DataGrids, ícone de categoria, imagem local e palco de cartões sem corte. Capturas da Home no topo e ao final da rolagem. Falha de teste bloqueia status aprovado.


## 04/11/2026 | Etapa de refino 1, Novo Lançamento
- Feedback visual explícito do usuário: deformação/crop das imagens, moedas não aparentes no fundo, ícones dos cards fora do eixo visual, desalinhamento do rodapé e diferenças tablet/desktop.
- Troca restrita ao preview integrado da PR #654; original da PR #648 inalterado. A folha antiga de opções deixa de ser importada **apenas** nessa entrada e foi substituída por `integrated-preview/choice-refinement.css` autossuficiente, sem acumular CSS de remendos.
- O seletor usa CSS Grid com colunas reais para arte, copy e ação; imagens WebP em `background-size:cover` com focos controlados; hero com foco inferior para preservar moedas; SVGs de ação, tags e rodapé alinhados.
- Preservados títulos e tipos, estados ativo/inativo, marcação das funcionalidades futuras, bloqueios de Transferência/Benefício e callback de Despesa/Receita, sem autenticação nem gravação.
- Breakpoints principais 640/1024, reorganização estrutural para tablet/mobile, alt. reduzida com rolagem acessível quando necessária. Home permaneceu com os mesmos componentes e CSS visual da rodada anterior.
- **Pendente:** rodar Playwright, verificar capturas em nove larguras e alturas compactas, confirmar mesmo SHA LIVE no Render, submeter a revisão visual. Não declarar homologação.


## QA extra de geometria e rotas (04/11/2026)
- Validação de centro vertical das setas/cadeados dos quatro tipos (tolerância 2px), sem invasão do texto na ação. Fotos dos banners com cover e imagem principal focada no rodapé para destacar moedas.
- Três resoluções de altura compacta (320×568, 390×667, 1366×600) e 8 verificações de rota de Login/Cadastro/Recuperação/Carregamento inicial em 390×844 e 1366×768.
- Rodapé descritivo ajustado para legibilidade mínima de aproximadamente 11px.
- Nenhuma tela adicional é homologada pelos testes. Validar capturas e publicar somente após CI.


## 04/11/2026 | Ajuste localizado das extremidades das imagens
- Print do usuário mostrou nas quatro opções um limite vertical escuro entre a parte fotográfica e a região de texto, além de recorte marcado na borda esquerda.
- Correção restrita ao CSS de `choice-refinement.css`: máscara progressiva (inclusive borda inicial e final) nos WebPs de Despesa, Receita, Transferência e Benefício, com cobertura `cover` preservada e escurecimento gradual atrás de texto e chips. Variação equivalente no mobile.
- Mantidos posicionamento central dos ícones e grade estruturada, textos, estados disponíveis/indisponíveis, Home, fluxo real, API e Android. Nenhuma imagem oficial foi editada ou substituída.
- Incluída verificação automatizada da máscara das quatro opções. Requer screenshot/CI/Render, e aprovação visual explícita para validar.


## 04/11/2026 | Correção específica, faixa preta interna dos quatro banners
- O usuário ampliou a imagem e apontou a faixa vertical interna, logo após a borda arredondada colorida, antes de começar a foto. Revisão anterior interpretou erroneamente como transição em sentido geral.
- Causa efetiva no CSS de preview: `mask-image: linear-gradient(... transparent 0%, #000 2.5%, ...)`, que apagava a extremidade esquerda da imagem e expunha o fundo preto em uma tira perceptível.
- Correção: a imagem agora inicia opaca desde `0%` e permanece assim até `30%`; a dissolução é preservada apenas em direção à região do texto. `overflow:hidden` e `border-radius` nativos dos quatro cards mantêm o recorte exato na moldura. A fotografia não sofre distorção.
- Nova verificação automatizada proíbe início transparente do `mask-image`. Sem mudança no hero, Home, fontes visuais oficiais, funcionalidades financeiras, API, Android ou componentes de outras etapas.
- A tela permanece candidata à validação visual humana; PR #654 em Draft sem merge.


## 04/11/2026 | Correção final da moldura duplicada embutida nas WebPs
- A captura após retirar o início transparente revelou **dois contornos**: borda CSS do card e borda interna já rasterizada no asset oficial. O problema é geométrico, não uma emenda a resolver com mais sombras.
- Ajuste apenas nos fundos fotográficos, com pequena sangria `inset:-10px -15px` nos banners e `-6px -9px` no hero; os cantos arredondados do contêiner HTML permanecem como única moldura visível. Não altera arte-fonte, proporção da imagem ou posição de textos e ícones.
- Playwright adiciona verificação da sangria e capturas recortadas dos quatro banners em desktop/mobile. Inspeção manual deve confirmar que o contorno interno sumiu; CI não equivale a validação visual humana.

## 04/11/2026 | Verocard como cartão benefício (decisão aprovada)
- Comunicação da opção Benefício atualizada para `Verocard Alimentação · cartão pré-pago`, chips Saldo/Recarga/Consumo, **mantendo opção desabilitada** enquanto a API não for integrada nesta tela.
- A ilustração local `verocard-alimentacao-v659.svg` substitui a imagem genérica de benefício nesta prévia, como representação visual provisória. Não afirmar que reproduz a frente do cartão físico atual.
- Criada decisão financeira/documental; Home, Cards, API e saldo não são modificados. Mais detalhes em `docs/MEG-WEB-VEROCARD-PRE-PAGO-DECISAO-20261104.md`.

## QA de largura mínima (04/11/2026)
- A rodada `41801006263` compilou, mas o Playwright encontrou **1 falha em 320×640**: o novo texto/chips de Verocard faziam três chips quebrar para duas linhas, deslocando o centro do cadeado em 3,95px. Não foi erro de regra financeira.
- Ajuste estrutural e localizado ao card Benefício em mobile: três chips compactos em uma linha, mantendo informações e cadeado alinhado. Não ocultar controles nem reduzir área de toque do card.
- Repete CI/Render no novo commit; revisão anterior com falha não deve ser considerada tecnicamente aprovada.

## 04/11/2026 | Benefício com identidade visual genérica (substitui a personalização de Verocard)
- A comunicação visual da escolha foi neutralizada a pedido do usuário para uso comercial futuro. Subtítulo: `Usar ou recarregar cartão benefício`; imagem autoral de cesta de compras/alimentos e cartão pré-pago **sem marca**.
- **Não** confundir identificação genérica da tela com implementação financeira multioperadora. O writer atual ainda está restrito ao método Verocard, conforme autoridade existente. Benefício segue desabilitado na prévia, sem API/gravação.
- Arquivos da Etapa 08: `LaunchTypePicker.tsx`, `choice-refinement.css`, arte `benefit-generic-groceries.webp`, testes, checkpoint e decisões. Home/Cartões/API/Android intactos.
