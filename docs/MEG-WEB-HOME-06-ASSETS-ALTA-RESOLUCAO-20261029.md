# MEG Web Evolution | Home 06 | Qualidade dos assets

**29/10/2026. Situação: diagnóstico e primeira integração de ferramentas. Home ainda NÃO aprovada; PR #650 Draft, sem merge.**

## Defeito observado

Os arquivos wallet-official-02.webp (2.706 bytes) e verocard-oficial-panorama.webp (2.038 bytes), em apps/web/public/meg-web-evolution/home/, são recortes visuais da referência oficial 02 da Home (1536×1024), não fotografias originais em alta resolução. O navegador os amplia nos cards, agravando sua falta de definição. Converter ou ampliar o mesmo arquivo não recupera os detalhes perdidos.

## Ferramentas GitHub pesquisadas

| Ferramenta | Papel | Decisão |
|---|---|---|
| [Sharp](https://github.com/lovell/sharp), Apache-2.0 | Metadados, processamento WebP/AVIF e dimensões de fontes | **Integrado ao runner isolado**, versão npm 0.35.5 |
| [Playwright](https://github.com/microsoft/playwright), Apache-2.0 | Testar DPR 2, renderização real, capturas, cortes e proporções | **Reutilizado**, já existente no projeto |
| [vite-imagetools](https://github.com/JonasKruckenberg/imagetools), MIT | Gerar imagens responsivas e srcset a partir de fontes HD | **Próxima fase após substituir fontes ruins** |
| [Pixelmatch](https://github.com/mapbox/pixelmatch), ISC | Diff de captura depois de aprovação de baseline | **Adiado**, já existe comparação no Playwright |
| [Penpot](https://github.com/penpot/penpot), MPL-2.0 | Especificação editável de layout/tokens | **Adiado**, custo operacional elevado no momento |
| [Upscayl](https://github.com/upscayl/upscayl), AGPL-3.0 | Upscale por IA | **Não integrar**: precisa de GPU/Vulkan, pode inventar detalhes e não conserta desfoque de origem |

Taste Skill continua apenas como auditor de composição, subordinado ao print oficial 02.

## Primeira integração implementada

- Script: scripts/meg-web-home-06.asset-quality.mjs. Com Sharp, mede largura, altura, bytes e SHA-256. Com Playwright, mede a largura/altura CSS exibidas e a densidade efetiva em DPR 2.
- Workflow: .github/workflows/meg-web-home-06-image-quality.yml. Executa sem acesso a backend/credenciais e sem mudar dependências do runtime da Web.
- Verificações de desktop 1366×768 e 1920×1080 e mobile 390×844, a DPR 2.
- Saídas: artifacts/home-06/asset-quality/report.json e report.md, disponíveis no artefato GitHub Actions.
- Metas iniciais para fontes originais: carteira >=1200×600 px; cartão >=900×500 px. Esses números são parâmetros de imagem para testar alta densidade, não regra de negócio.
- O workflow passou a ser **gate bloqueador**: enquanto houver LOW_RESOLUTION o job falha, preservando o relatório em artefato pelo passo if: always(). Isso é intencional até a substituição por fontes originais HD. Nunca alegar melhoria visual apenas por passar o build.

## Substituição necessária

1. Recriar ou obter assets originais nítidos no enquadramento da imagem oficial 02. Não aumentar o recorte nem rasterizar texto, números, menus ou componentes.
2. Usar a marca MEG do conjunto oficial; não inventar logos, bancos, cartões ou promoções.
3. Gerar variantes WebP/AVIF a partir das fontes grandes com Sharp e, somente com fontes aprovadas, avaliar vite-imagetools para srcset responsivo.
4. Confirmar sem blur e sem cortes nos screenshots, contrastando com a referência 02. O diagnóstico de resolução não detecta qualidade artística, que exige validação humana.
5. Manter o gate bloqueador agora e corrigir a falha substituindo as fontes de imagem, nunca reduzindo seu rigor para ficar verde.
6. Publicar novo Render apenas após implementar efetivamente os assets novos e verificar o SHA, com link sem cache.

Nenhuma regra financeira, API, DataGrid, Shell, autenticação nem Android foi alterado neste piloto. Home não aprovada. PR #650 segue Draft e sem merge.
