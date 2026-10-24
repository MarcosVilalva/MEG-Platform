# MEG | Screenshot to Code | Etapa B - Formulário

**Imagem única de entrada:** `Novo lançamento financeiro neon.png` (1672 × 941). O screenshot original é referência visual oficial, NÃO um fundo para a UI nem autoridade sobre negócios.

**Stack da geração:** `React + Tailwind` para proposta isolada. Posteriormente adaptar de forma localizada ao React/TypeScript/CSS da PR #648 sem copiar handlers gerados.

## Prompt para colar na ferramenta

Build a **visual-only real React component** reproducing the attached official MEG financial new-launch desktop design with high fidelity at 1672×941. It must use semantic inputs, selects, labeled controls, responsive CSS Grid/Flexbox, custom inline SVG icons (not Unicode placeholders), and CSS gradients/glass/neon effects for the actual layout. Do not use the full screenshot as a background, absolute-position fields on a screenshot, external stock/old UI assets, or fake brand logos.

Composition: transparent dark shell at left, panel anchored to the content area on the right; horizontal header with return chevron, title, type identification, and decorative ART SLOT at upper-right; three form regions in desktop grid: wide left data-entry area, middle date/value/status/notes area, right vivid summary card; lower full-width cancel/back and prominent cyan save visual. Align field baselines, account category controls, summary rows, labels, radii, letter spacing and pink-cyan status differentiation. Prefer SVG icons for description, category, account, payment method, calendar, amount, status, notes, and summary. Do not recreate inaccessible mountain artwork; keep transparent reserved scene region if no official asset is provided separately.

**This is a visual PROPOSAL and MUST NOT be operational.** The illustrative screenshot displays expense paid, credit card, installments, fictitious balance, card number, bank account, category and monetary values. Those are NOT authorized product state. Draw neutral placeholders or disabled informative controls, not working buttons. Production currently allows **only income and pending expense (no debit)**. Paid expense, credit cards/installments, transfer and benefit MUST remain visibly blocked. No handlers that write finance records; no fake success, no local balance, installments or invoice computation. No mocked account names, category lists, card/bank data, dates or amounts presented as real data. Show summary as passive preview of local form entries, clearly labeling visual-only. Do not invent endpoints or domain contracts.

Mobile-first breakpoints only at 640px and 1024px. Verify 1672×941, 1366×768, 1024×600, 910×400, 390×844. No whole-page horizontal overflow, keep action footer and focus reachable via a single intentional scrolling area. Accessible labels, aria status, disabled semantics, sufficient touch target and reduced motion.

**Deliver:** standalone complete React/Tailwind design components plus brief deviation list. Never replace any MEG production React/TSX/CSS code automatically. The real finance form remains owned by `NewLaunchForm.tsx`, `basicLaunchInput` and `financeClient.createEvent`.