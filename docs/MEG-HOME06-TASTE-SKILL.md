# MEG Home 06 | Taste Skill oficial
Data: 03/11/2026. Etapa 06, PR #653 Draft, sem merge.

## Instalação e execução no projeto

O workflow .github/workflows/meg-home-06-taste.yml obtém o repositório oficial https://github.com/Leonxlnx/taste-skill no commit fixo 12af471f627f866411b4bd785b19646d3672784c (v2.1.5, licença MIT), confere o SHA, cria um link temporário .agents/skills/design-taste-frontend e executa os scripts oficiais lint.mjs --app e inspect.mjs --app. Node 22 e Chrome. Nenhuma dependência de frontend é acrescentada à aplicação.

O inspector opera sobre build local com homePreviewFixture, sem API ou banco de produção, capturando 1672, 1024 e 390 pixels e gerando o artefato meg-home06-taste-review com report.json e imagens. O workflow tem permissão read-only no GitHub e não transmite segredos à ferramenta. O Taste Skill é instalado **temporariamente na execução do GitHub Actions**, não no notebook do usuário.

## Hierarquia de autoridade

As recomendações genéricas do Taste Skill são **consultivas**. Em conflito, prevalecem regras financeiras existentes do MEG, prints visuais oficiais atuais e Prompt Master. Não remover o visual dark teal/neon pré-confirmado apenas porque a ferramenta prefere superfícies discretas, poucos gradientes ou menos SVG. Não fabricar dados, valores ou recursos para melhorar pontuação.

Não alterar Android, API, camada financeira, Shell, autenticação ou DataGrid compartilhado. Não fazer merge nem declarar homologação visual sem aprovação explícita do usuário.

## Uso e validação

A rotina roda em mudanças de arquivos da Home na branch experimental e por workflow_dispatch. Ela faz o diagnóstico; não altera CSS, React ou regras. Os achados devem ser analisados contra prints oficiais e capturas Playwright antes de implementar uma correção. A Home da PR #651 e o preview pré-confirmado permanecem preservados. A PR #653 continua Draft.

Para instalar no notebook separadamente, o comando oficial é:
```powershell
npx.cmd skills add https://github.com/Leonxlnx/taste-skill --skill design-taste-frontend
```
Esse comando local não foi executado por este workflow.

## 03/11/2026 | Tratamento dos achados (segunda rodada)
- Fonte: execução Taste Skill #41721922540 (7 FAIL, 3 WARN, incluindo 21 textos <11px e no-title). Advertências sobre neon e gradientes não prevalecem contra o padrão oficial.
- Alteração proposta: aumentar fontes pequenas, melhorar contraste e adicionar h1 sem criar nova seção. Retestar no Taste Skill e Playwright, comparar screenshots antes/depois.
- Adoção de Tailwind CSS foi avaliada e adiada: React 19/Vite 6 atuais comportam a UI sem alterar dependências, e o Preflight global poderia afetar Shell e DataGrid.
