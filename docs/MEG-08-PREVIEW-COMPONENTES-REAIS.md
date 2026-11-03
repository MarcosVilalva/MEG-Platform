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
