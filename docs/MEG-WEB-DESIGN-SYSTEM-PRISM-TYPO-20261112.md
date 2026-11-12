# MEG Finanças Web | Design System Prism: iconografia e tipografia

**Início:** 12/11/2026. **Motivação:** pedido explícito do usuário para levar a identidade MEG Prism 3D a toda a nova Web e substituir a tipografia genérica e pequena.

## 1. Regras de prioridade e isolamento

1. Regras financeiras canônicas (`docs/MEG-WEB-FINANCIAL-AUTHORITY.md`) permanecem acima de qualquer decisão visual; nenhum KPI, saldo, parcela, estado ou tipo financeiro pode ser recalculado no React.
2. Prints e layouts oficialmente homologados continuam preservados nas branches e serviços originais. O pedido de modernização autoriza **criar candidatos**, não registrar automaticamente homologação da aparência alterada.
3. Esta intervenção ocorre em `design/meg-prism-unified-typography-20261112`, **branch derivada da PR #679**, separada da Etapa 09 de backup/auditoria e da Etapa 10 Novo/Editar. Não modificar Android, writers, Supabase, banco, API ou serviços produtivos.
4. Não adicionar controles sem rota ou simular mutações financeiras em protótipos. QA utiliza apenas o gateway autenticado com dados fictícios e bloqueio de chamadas reais.

## 2. Padrão tipográfico proposto

**Famílias:**
- **MEG Sora Variable:** títulos, hero, cabeçalhos e valores financeiros destacados. Peso 600 a 800.
- **MEG Manrope Variable:** navegação, textos, botões, formulários, tabelas, rótulos e legendas. Peso 400 a 800.
- Fallback operacional existente Inter / system-ui. Algarismos financeiros com `tabular-nums` e `lining-nums`.

**Escalas base pretendidas:** texto principal 15 px, rótulos de interface 14 px, legendas 13 px, destaques de valores a partir de 18 px, títulos fluidos. Componentes compactos de KPI podem ter exceção justificada, mas não devem esconder informações essenciais. Evitar zoom global ou `html{font-size:...}`, pois quebraria breakpoints e proporções homologadas.

**Fontes:** quatro arquivos WOFF2 variáveis (Latin + Latin Extended) do projeto Fontsource Font Files, fixados no commit `5a72889057f592bb0659629e38337359f94d53b2`, com verificação de tamanho e Git SHA-1 por arquivo. Download SOMENTE durante o build em `scripts/meg-stage08-fetch-typefaces.mjs`; os arquivos são servidos depois pela **própria origem** da Web, sem Google Fonts/CDN no navegador. Licenças `OFL-Manrope.txt` e `OFL-Sora.txt` incluídas na árvore; `InterVariable.woff2` original preservado.

## 3. Padrão iconográfico

- **Prism 3D premium:** glifos originais em SVG, com camadas, cantos arredondados, alto contraste e luz/sombra discretas. `meg-prism-icons.tsx` da PR #679 mantém os cinco ícones 3D de Lançamentos, incluindo direção correta das setas.
- **Prism System:** `components/PrismLineIcon.tsx` é a infraestrutura vetorial compartilhada para os ícones legados de **Shell** e **Home**, sem mudar destinos, botões, modais, rótulos, ações ou a biblioteca de componentes. Gradientes únicos por instância com `useId`, sem fontes de ícones nem dependências remotas.
- **Semântica financeira obrigatória:** Entrada = **seta para baixo/entrando**, Saída = **seta para cima/saindo**. Home corrigida para a mesma semântica da PR #679. A forma do pictograma não decide status, soma, valor ou categoria.

## 4. Matriz de implementação

| Área | Estado nesta branch | Gate de produto |
|---|---|---|
| Tokens tipográficos da nova Web | Implementados | Inspeção da QA, acesso e contraste |
| Shell e navegação | Prism System nos símbolos, Manrope nos controles | Aprovação visual específica desta revisão |
| Home P0 e Ações rápidas | Prism System e tipografia por função | Conferir screenshots, ações persistentes e layout aprovado |
| Lançamentos autenticados | Prism 3D nos 5 ícones; fonte e escala dos KPIs, filtros e linhas da grade | Revisão de desktop, tablet, celular e modal |
| DataGrid compartilhado | **Não alterado**. A tipografia do DataGrid **dentro** de Home e Lançamentos recebe ajustes locais | Auditar genericamente na etapa própria |
| Loading, Login, Criar Conta, Recuperar Senha | Fonte herdada da nova Web em QA, sem revisão de layout/ícones específicos | Etapa de autenticação, nova validação visual |
| Categorias/forma de pagamento | Pack anterior e significados preservados; só filtro de relevo discreto em Lançamentos | Não reclassificar ícones sem autorização de cada tela |
| Novo/Editar Lançamento | Fora deste chat; **não implementado** nesta revisão | Etapa 10 em chat próprio |
| Pendentes, Cartões, Benefícios, Transferência, Relatórios, Configurações | Não migrados aqui; alguns módulos ainda não possuem tela Web integrada | Migrar por etapa do Prompt Master |

**Não afirmar que o sistema completo foi migrado:** a infraestrutura compartilhada foi estabelecida, a primeira aplicação abrange as superfícies disponíveis na Etapa 08 e a cobertura dos demais módulos precisa de sua própria validação.

## 5. Qualidade exigida

- Playwright nos viewports 1366×768, 960×900 e 390×844; testes legados em oito tamanhos onde aplicável.
- Nenhuma rolagem horizontal da página. Títulos, valores, filtros, cards e DataGrid não podem cortar textos/valores essenciais.
- Carregamento real das fontes WOFF2, comprovado por `document.fonts` e HTTP local; nenhuma solicitação a provedores de fontes em runtime.
- Ações rápidas, favoritos, modal de consulta, sidebar, logout, leitura da API e estado de carregamento preservados.
- Testes financeiros/CI **não equivalem** à aprovação visual; aprovação específica do usuário é obrigatória.
- Nenhum merge/deploy produtivo sem gates externos da Etapa 09 e permissão explícita.

## 6. Entrega e continuidade

- PR candidata: **#680** (Draft), baseada na PR #679. Prévia pública isolada Render: `meg-prism-designsystem-qa`, Auto Deploy OFF; URL e SHA somente quando comprovados LIVE.
- Referências protegidas: PR #673 (integração), PR #677 (navegação funcional), PR #679 (Prism 3D original) e commit homologado `760b7ad0e3217dbab70ea426df9cad67318f79ef`.
- Próximo gate: concluir CI, comprovar prévia no navegador público, obter aprovação/reprovação visual de **Home, Shell e Lançamentos**. Após homologação, produzir plano de migração dos módulos restantes, separando etapas e PRs.
