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

## Resultado mensurado no refino de 03/11/2026

**SHA visual:** `cf8d46de34a5cfa54e3fed6f82c0e6504d1c7e9a`.

| Critério | Antes | Depois |
|---|---:|---:|
| Trechos com texto inferior a 11px apontados pelo Taste | 21 | 4 |
| H1 semântico ausente | Sim | Não |
| Falhas de critério Taste | 7 | 6 |
| Avisos de critério Taste | 3 | 3 |

Os quatro trechos remanescentes são os rótulos vetoriais `XLS` e `PDF` existentes **dentro dos desenhos SVG de exportação do DataGrid compartilhado** (dois grids). Eles não são textos do conteúdo financeiro e seu tamanho não deve ser ampliado por override imprudente na Home. Os demais achados do Taste discordam de escolhas dark teal/neon oficialmente aprovadas como direção visual e permanecem sob análise.

O [Home Panorama #41725054926](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/41725054926) passou com nove viewports; o [Taste #41725054984](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/41725054984) executou e forneceu capturas, não sendo gate visual de homologação.

O [Foundation #41725054928](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/41725054928) falhou em quatro checagens de toolbar do DataGrid compartilhado a 600, 660, 720 e 760px. **Não alterar o componente compartilhado dentro desta etapa nem marcar os gates como verdes**.

Prévia isolada do commit visual, confirmada live no Render: https://meg-home-06-refino-pr653.onrender.com/home-06-panorama.html?v=cf8d46de34a5cfa54e3fed6f82c0e6504d1c7e9a

Sem aprovação visual explícita do usuário para esta revisão. PR permanece Draft, sem merge. Tailwind v4 foi avaliado e não instalado.
