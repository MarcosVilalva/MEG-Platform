# MEG Web Evolution | Auditoria de publicações automáticas no Render

Data do levantamento: 30/10/2026. Referência operacional: PR #651, branch `meg-web-evolution/06-home-reinicio-20261030`.

## Objetivo confirmado pelo usuário

**Manter o deploy automático**, preservando a API principal e as referências das telas aprovadas. Reduzir compilações duplicadas, **sem suspender nem excluir serviços**. Este documento não homologa telas e não muda regras financeiras.

## Resultado comprovado

- Workspace `My Workspace`: 21 serviços; 16 com `autoDeployTrigger=commit`, 5 com deploy automático desligado.
- Outubro: **pelo menos 556 registros de deploy consultados**; alguns endpoints devolveram limite de 100 registros, portanto não representam total exaustivo nem minutos faturados.
- Uma alteração da branch `main`, por exemplo o commit `e3fc9b24` de 21/10, gerou deploy em **oito serviços**. Sete serviços sem filtro de build estavam ligados à `main` e a API possuía filtro para API e banco.
- No período mostrado pelo usuário, a franquia do Render chegou a **500/500 pipeline minutes**.
- O deploy do commit `9e188d6b`, da Home 06, foi cancelado pelo Render devido à franquia esgotada. A última versão `live` é `c44cfd37`. O GitHub possui o código novo, ainda sem publicação.
- O GitHub Action Home Panorama do mesmo commit falhou por `SyntaxError: Identifier 'panels' has already been declared`. O teste foi corrigido nesta revisão; validação no novo SHA necessária.
- Foundation geral falhou em regressões/toolbar do DataGrid compartilhado. Não se devem atualizar baselines ou alterar o componente aprovado automaticamente para deixar o gate verde.

## Regra recomendada de autodeploy

1. **Manter `On Commit` nos ambientes realmente ativos**, com Build Filters por caminhos que afetam cada build. Evitar desabilitar todos os autodeploys.
2. Para o preview `meg-home-06-panorama-clean` (serviço `srv-dbi85l1srm7s73dh8r80`), considerar caminhos incluídos:
   - `apps/web/**`
   - `packages/**`
   - `package.json`
   - `package-lock.json`

   A lista é **candidata**. Antes de aplicar, confirmar se o Vite ou o build do preview dependem de outros arquivos raiz ou scripts. O script `scripts/meg-home-06-panorama-viewport.mjs` é executado no GitHub Actions, não no build configurado do Render.
3. Para os previews históricos ligados à `main`: classificar quais URLs ainda são usadas. Para ambientes de referência não mais em desenvolvimento, escolher entre `Off` (preserva a última versão) ou um filtro de caminhos específico da respectiva funcionalidade. **Não desligar uma referência ativa sem confirmação**.
4. Para `meg-platform-api`, preservar inicialmente a configuração existente de caminhos `apps/api/**`, `packages/database/**`, `package.json` e `package-lock.json`. O build executa `db:push:production`; auditar separadamente antes de qualquer alteração neste serviço. Não modificar a API financeira ou sua automação neste ciclo.
5. Após regularizar o consumo, avaliar `After CI Checks Pass` somente quando os checks exigidos estiverem verdes e corretamente associados à branch. Com Foundation geral falhando, essa opção pode bloquear todos os deploys da Home.

## Limitação de execução

O conector Render disponível na conversa permite listar serviços, configurações, deploys, logs e eventos, porém **não disponibiliza a operação de atualizar os filtros ou o gatilho automático de um serviço já existente**. Portanto, editar este documento ou `render.yaml` **não altera diretamente os 21 serviços existentes**. Os filtros devem ser configurados em Settings → Build Filters dos serviços no Render, mantendo Auto-Deploy = On Commit, ou por integração com permissão de atualização.

O recurso de skip deploy do Render ([skip render]) será usado exclusivamente em commits de testes/documentação que não alteram artefatos publicados, mantendo deploy automático para mudanças de código relevante. Esse mecanismo não substitui Build Filters nos serviços.

## Gates e condições de avanço

- Home Panorama em SUCCESS no SHA atual, com screenshots desktop/mobile analisados.
- Foundation geral: falhas identificadas e sem contorno indevido; se falhas compartilhadas persistirem, registrar bloqueio e não executar merge.
- Render `live` deve corresponder ao SHA do código antes de disponibilizar link sem cache como se fosse preview novo.
- **Validação visual explícita pelo usuário sempre obrigatória**.
- Android congelado, modelos e cálculos financeiros canônicos preservados. Nenhum merge nesta auditoria.
