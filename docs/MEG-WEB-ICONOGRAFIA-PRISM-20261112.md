# MEG Web | Padrão iconográfico MEG Prism (12/11/2026)

**Estado:** proposta de direção visual derivada de feedback explícito do usuário na Etapa 08. **A implementação publicada da PR #679 precisa de homologação visual própria.** Este documento não autoriza alterar outras telas aprovadas nem passar a substituir bibliotecas globalmente.

## Problema demonstrado
O usuário reprovou a primeira revisão da PR #679, por pictogramas lineares pouco expressivos e direção semântica inadequada. A UI visível deve comunicar a operação financeira corretamente e combinar com a identidade da nova Web: arredondada, consistente, leitura nítida no tamanho real e acabamento dimensional com profundidade discreta.

## Padrão a adotar em novas implementações, sujeito a aceite por tela
- **Fonte**: SVG vetorial local, sem CDN, sem fontes de ícones, sem imagens rasterizadas. Componentes React estáticos, com identificador de pacote `data-launch-pack="meg-prism-3d"` apenas nos glifos efetivamente convertidos.
- **Forma**: volume controlado por camadas, gradientes, realces suaves, sombras internas/externas discretas; contornos arredondados. Elementos reconhecíveis no tamanho de **20 a 24 px**, sem depender de brilho excessivo, número monetário ou texto longo.
- **Semântica inequívoca**: entrada / recebimento = **seta vertical para baixo, entrando em bandeja/caixa**; saída / pagamento = **seta vertical para cima, saindo do caixa**. Evitar diagonais ambíguas para esses dois conceitos. Projeção = gráfico crescente, realizado = carteira consolidada, detalhes = olho. Ícones não determinam valores financeiros nem status.
- **Cores**: preservam a hierarquia homologada, com entrada em verde, saída em coral/vermelho, projeção em turquesa, realizado em dourado. Contraste verificável em fundo escuro, sem substituir texto.
- **Interação**: botões com nome acessível, foco visível, tooltip hover/foco em desktop e alvo 44×44 px em mobile; preservar teclado, modal e feedback. Não criar ações que não existam.
- **Modularidade**: aplicar por tela, somente após validar layout, teste de caracterização e aprovação visual explícita. Não trocar automaticamente todos os ícones da Home, categoria, menu, DataGrid e demais telas já homologadas.

## Escopo efetivamente codificado na PR #679
Somente cinco glifos da tela autenticada **Lançamentos**:
- `projection3d`: quatro indicadores, posição 1, projeção.
- `entry3d`: posição 2, recebimentos, `data-financial-flow="down"`.
- `exit3d`: posição 3, despesas, `data-financial-flow="up"`.
- `wallet3d`: posição 4, resultado realizado.
- `details3d`: coluna Ações, consulta de detalhes do lançamento.

Novo arquivo: `apps/web/src/meg-web-evolution/launches/icon-packs/meg-prism-icons.tsx`. O pacote visual anterior `refined-action-icons.tsx`, reprovado, foi retirado da branch. Os componentes aprovados não afetados continuam usando os ícones existentes até autorização de revisão específica.

## Gates obrigatórios
Build e regras financeiras, histórico canônico, integridade de Shell/Home/DataGrid, teste de navegação e consulta sem escrita, tamanhos 1366 / 960 / 390 px, verificação de direção semântica, ausência de overflow e renderização pública sem API real. A aprovação técnica não substitui a inspeção visual do usuário.

**Proibições:** nenhum merge, produção, Android, Supabase, writers, saldo ou reclassificação por conta desta padronização.
