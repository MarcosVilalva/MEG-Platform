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
