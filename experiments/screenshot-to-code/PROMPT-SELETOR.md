# MEG | Screenshot to Code | Etapa A - Seletor

**Imagem única de entrada:** `Nono lançamento.png` (1672 × 941). Este arquivo pertence ao conjunto de referências visuais oficiais do Projeto e NÃO deve ser commitado no repositório.

**Stack da geração:** escolha `React + Tailwind` (suportada pelo upstream), exportando componentes reais. A adaptação posterior para React/TypeScript/CSS do MEG é uma etapa separada. Nunca substitua automaticamente arquivos da PR #648.

## Prompt para colar na ferramenta

Implement a **standalone visual-only React layout** matching the attached screenshot at 1672 × 941. The image is the authoritative visual reference, not a bitmap to use as the background. Recreate genuine accessible layout components with CSS Grid/Flexbox. High fidelity on modal geometry, dark cyan glass material, typography, vertical rhythm, colors, borders, card proportions, icon size, detail strips and the four-card lower information bar.

Visual stage A has intro editorial copy on the left and vertically stacked cards on the right: 1) Despesa (coral/pink), 2) Receita (green-cyan), 3) Transferência (blue), 4) Benefício (gold). The cards have dimensional neon outlines, an icon plate, main label, helper text, decoration region and a circular arrow. Draw simple functional icons as inline SVG components. Do not invent the MEG logo, scenic mountains, bank brands, Verocard art or counterfeit assets; leave a documented visual-asset slot when no approved independent original asset exists. Keep text readable, main action touch targets >=44px.

The only selectable/active choices are **Despesa** and **Receita**. Transferência and Benefício MUST be visibly and semantically disabled, with descriptive messages. Selecting Despesa/Receita may only toggle local visual stage; do not generate writes, balances, payment methods, HTTP calls, auth, fake success feedback or financial APIs. Do not display the illustration's fictional financial amounts as real data.

Use mobile-first layout, structural breakpoints 640 and 1024px, no horizontal page scrolling, with scrollable modal for 1366×768, 1024×600, 910×400, 390×844. Trap focus, Escape closes, aria-modal semantics, labels and reduced-motion support. Maintain a visible but subdued note explaining the output is only a design proposal, unconnected to financial writes.

**Deliver:** complete React components + styles; no pseudo-code, screenshot overlays, global CSS affecting the host app, imported libraries not available in upstream. Explain deviations due to unavailable authorized art.