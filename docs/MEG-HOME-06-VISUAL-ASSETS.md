# HOME 06 | Fotografias e licença | 30/10/2026

A Home 06 clean-room usa **fotos reais**, apenas como plano de fundo, com **interface e valores independentes da imagem**.
Nenhum número, botão, gráfico ou título foi rasterizado.

## Fotografia 1 | Hero panorâmico
- Fotógrafo: **Pascal Debrunner**, Unsplash.
- Fonte e licença: https://unsplash.com/photos/a-lake-surrounded-by-trees-and-a-mountain-BtMu8YbfFjQ
- Imagem: https://images.unsplash.com/photo-1691661485699-7e459573cb35
- Entrega atual: CDN Unsplash, WebP, crop responsivo, até 2560 pixels, com véu dark teal na camada CSS.
- CSS: \`apps/web/src/meg-web-evolution/home/home-dashboard.css\`, seletor \`.pano-hero::before\`.

## Fotografia 2 | Benefício Alimentação
- Fotógrafo: **Florian Paulus**, Unsplash.
- Fonte e licença: https://unsplash.com/photos/a-produce-section-of-a-grocery-store-filled-with-fresh-produce-C0sKd8JR1_k
- Imagem: https://images.unsplash.com/photo-1705140643816-2bb76d7ddeb1
- Entrega atual: CDN Unsplash, WebP, crop responsivo, até 1300 pixels.
- CSS: \`apps/web/src/meg-web-evolution/home/home-dashboard.css\`, seletor \`.pano-benefit-card::before\`.

## Direitos e critérios
Unsplash License: https://unsplash.com/license. Fotografias publicadas sob essa licença podem ser usadas em aplicações pessoais e comerciais, respeitadas as condições da licença. Atribuição registrada por transparência. Evitar representar a operadora real como marca do produto comercial.

## Pendência de otimização
As imagens são servidas do CDN do autor da licença, com alta resolução; **não são arquivos locais do repositório nesta entrega**. Em etapa futura, considerar cópias WebP/AVIF 1×/2× com licença e proveniência registradas, após confirmar desempenho e fidelidade dos recortes por breakpoint. Não bloquear funcionamento se uma atualização futura de asset falhar.
