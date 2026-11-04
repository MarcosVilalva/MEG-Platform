# MEG Web Evolution | Home | Candidato de refinamento visual 04/11/2026

**Origem:** Home React mais recente da PR #653, presente no ramo integrado #654.
**Tipo:** candidato visual isolado. **Não homologado**.

## Limites
- Não muda o DOM da Home, nem o carrossel financeiro, fixtures, saldo, saldo do benefício ou cálculo.
- Não altera Shell, DataGrid, rotas, autenticação, imagens oficiais ou o seletor **Novo Lançamento já validado**.
- Apenas folha CSS de acabamento da Home, consolidada com o CSS já existente da prévia.
- Nenhuma mudança no Android, API, banco, regras ou modelos de cartões.

## Ajustes
- Mesma arte de fundo do saldo, com contraste e brilho controlados.
- Cartão central com maior presença, cartões adjacentes ligeiramente mais legíveis.
- Acessos rápidos em grade original 3+2 (desktop): menos espaço e menores ícones, preservando o texto e áreas clicáveis.
- Consistência de bordas, títulos, foco de teclado e contraste.
- Breakpoints 640px e 1024px, sem reestruturação artificial.

## Validação
- Comparar renderizações baseline/candidata na mesma branch desligando o atributo de preview apenas para a Home, já que toda a melhoria desta rodada está escopada a \`[data-preview-view="home"]\`.
- Conferir 320, 360, 390, 640, 768, 1024, 1366, 1672 e 1920px, preservando cinco ações, quatro KPIs, dois DataGrids, carrossel e acesso a Novo Lançamento.
- Render isolado e link sem cache após CI. Aprovação humana não é substituída por CI.

**Pendência:** aprovação da Home; integração operacional real fora do escopo.


## 04/11/2026 | Aprovação da proposta imagem 02 com cinco atalhos
- Usuário escolheu a **segunda proposta ilustrada** como direção para cartões e acessos rápidos, e explicitou que **Novo lançamento deve continuar no painel**, retirando apenas o ícone redundante do topo da Home.
- Confirmada a grade **3+2 de cinco ações** na Home. Para telas estreitas a disposição se adapta, preservando rótulos e alvos de toque.
- **Cartão central com mais destaque**, mantendo carrossel circular. A faixa inferior agrupa **nome do cartão e emissor**, os **indicadores** e a **fatura em aberto já recebida da API**. Nenhum valor é recalculado na tela.
- Ajustes isolados na Home: o CSS esconde `.meg-topbar-new` somente quando `data-preview-view=home`, preservando o Shell compartilhado e todas as outras telas.
- A possibilidade de **escolher/reordenar os atalhos nas Configurações** fica registrada como funcionalidade diferencial futura, sem salvar preferências agora nem inventar comportamento. Critérios: opções permitidas pelo roteador e permissões atuais; fallback padrão, responsividade, manutenção de atalhos essenciais e testes de navegação.
- A ilustração representa direção estética. **Aprovação do desenho não substitui inspeção da implementação**. PR #655 Draft até CI + Render + validação humana da Home renderizada.


## 04/11/2026 | Gate responsivo corrigido
- No primeiro CI da imagem 02 (`41817103792`), o navegador encontrou o cartão principal cortado em **640×900 e 768×1024**; build havia passado, mas o gate visual falhou.
- Causa localizada: cartão ampliado a 69%/máximo 23rem com aspect ratio 1.72:1 e palco limitado a 12rem no tablet. Corrigida apenas altura mínima do palco de 640px a 1023px, sem escala artificial nem mexer no objeto cartão.
- Reexecutar 9 viewports, fluxo e comparação; não homologar enquanto o CI não estiver verde.


## 04/11/2026 | CORREÇÃO DO ESCOPO DA HOME, IMAGEM 01
- O usuário corrigiu a interpretação anterior: imagem **01** é a referência, a imagem **02** corresponde ao estado errado. O **Novo lançamento (+)** permanece no cabeçalho junto à busca e sai de **Ações rápidas**, que terá **exatamente quatro cartões**: Transferência, Pagar conta, Relatórios e Configurações.
- Ações rápidas agora têm faixa de largura completa logo abaixo de Meus cartões / área principal, com 4 colunas no desktop, 2 em tablet e 1 no celular. Descrições presentes conforme referência.
- Monitor wide: a Home deixa de preencher indiscriminadamente toda largura e passa a usar composição centralizada até 93rem; colunas estáveis a partir de 1024px e cartões proporcionais. **Não é zoom/transform nem só aumento de CSS**.
- Testes: 320, 360, 390, 640, 768, 1024, 1366, 1672, 1920 e 2560px, incluindo checagem de largura máxima e centralização, 4 atalhos e seus textos, botão + no topo, carrossel e fluxo do Novo Lançamento.
- Preferências futuras de atalhos em Configurações seguem **não implementadas**. Nenhum dado financeiro, benefício, writer, Android, DataGrid ou visual do Novo Lançamento homologado foi alterado.
- PR #655 Draft; nova versão requer CI verde, Render LIVE e validação visual humana antes de considerar a Home homologada.


## 04/11/2026 | Gate responsivo adicional no desktop
- Workflow `41827321615`: build concluído, mas QA apontou duas falhas: regra legada `nth-last-child(-n+2)` aplicava `grid-column:span 3` aos últimos atalhos, quebrando a linha de quatro; em 1024px as colunas fixas comprimiam o cartão em vez de destacá-lo.
- Correção pontual **na mesma folha consolidada**: `grid-column:auto` nos quatro botões da faixa e auto-fit com largura mínima útil de 31.5rem na região de saldo/cartões, evitando forçar duas colunas no limite de 1024px. Sem introduzir novo breakpoint.
- Repetir CI (10 viewports incluindo wide 2560px), Render e inspecionar capturas. A Home segue candidata, não homologada.
