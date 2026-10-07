# MEG Web Evolution — Etapa 03 — Diagnóstico da sidebar

Em 07/10/2026, o contrato real de viewport confirmou que a falha `1366x768 expandida: item 5 parcialmente cortado` era causada pelo limite inferior do `.meg-nav`, não pelo rodapé.

No diagnóstico anterior à correção, o item `Benefícios` terminava em `434.015625px`, enquanto o nav terminava em `428.78125px`, gerando clipping de `5.234375px`. O grafismo inferior começava em `444.78125px` e o rodapé em `691.625px`, portanto nenhum deles sobrepunha diretamente o item 5; eles apenas consumiam altura do flex e deixavam o nav curto demais.

A correção em andamento é restrita à sidebar expandida em desktop e preserva SVGs, topbar e estado recolhido.
