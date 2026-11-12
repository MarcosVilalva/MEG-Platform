# MEG Web Evolution | Projeto de identidade iconográfica e tipográfica 2.0
**Data:** 12/11/2026  
**Pedido do usuário:** levar a qualidade do MEG Prism 3D ao sistema Web inteiro e abandonar a tipografia genérica e pequena.  
**Etapa deste chat:** 08, Home + Lançamentos. Os demais módulos pertencem a suas etapas e não serão modificados antecipadamente.  
**Status:** diretriz global solicitada e piloto tipográfico em QA isolada, não homologação visual global.

## I. Constatação técnica no código
- `styles/tokens.css`: variável `--meg-font: Inter, ui-sans-serif, system-ui, ...`. Não se encontrou aqui uma definição local `@font-face`. O navegador pode cair em fonte do sistema.
- `home/home-dashboard.css`: `font-family:Inter,system-ui,sans-serif` explícito, títulos com `Manrope,Inter`. Há muitos rótulos em `.7rem`, `.71rem`, `.72rem` e grade em `.71rem`; com raiz de 16px isso equivale aproximadamente a **11,2–11,5px**.
- `launches/launches-stage09.css`: `.meg-l09-eyebrow` em `.57rem` (~9,1px), `.meg-l09-stat small` em `.64rem` (~10,2px), no mobile `.58rem` (~9,3px), e vários controles em `.68–.77rem`. Essa escala explica o feedback de leitura difícil.
- `shell/shell.css`: navegação e topbar em valores isolados, sem tokens tipográficos coerentes.
- Iconografia espalhada entre `home/HomeGlyph.tsx` (SVG linear 24×24), `components/Icon.tsx` (Shell) e `launches/LaunchIcon.tsx` (Phosphor + categorias + MEG Prism). Uma substituição global cega quebraria semântica, compactação e referências visuais homologadas.
- Em produção a política de dados financeiros permanece centralizada: `docs/MEG-WEB-FINANCIAL-AUTHORITY.md`, nenhum componente desta frente calcula saldo ou status.

## II. Direção criativa proposta
**MEG Prism 2.0:** estética premium, sólida e legível, não uma coleção de brilhos artificiais.

### Ícones
- SVG locais originais, sem font-icon e sem CDN, acabamento dimensional com volumes discretos, duas ou três camadas visuais, cantos arredondados e identidade cromática estável.
- Entradas: seta para **baixo**, entrando; Saídas: para **cima**, saindo. Cor é apoio à leitura, não sua única fonte de significado.
- Três pesos de leitura: **hero/KPI** 22–26px, **ações principais** 20–24px, **navegação e etiquetas** 18–22px, responsivos conforme espaço disponível. Valores de projeto, sujeitos à inspeção real da tela.
- Tooltips, foco/teclado, nome acessível e alvo de toque 44×44px em mobile.
- **Não converter categorias com ícones semânticos de modo automático.** Mapear significado real por categoria, benefício, conta e método, sem alterar classificação financeira.
- Os cinco ícones `meg-prism-icons.tsx` da PR #679 constituem o primeiro grupo de referência, **sem representar aceitação visual de todas as futuras famílias**.

### Tipografia
- **Títulos:** Sora, variações 600–800, caráter geométrico mais distinto; corpo financeiro: Plus Jakarta Sans, 400–800, com boa altura-x e algarismos tabulares. Ambas sob **SIL Open Font License**. Ver fontes externas oficiais no final.
- Hierarquia candidata: página 30–46px; seção 18–24px; corpo 15–16px; controles 14–16px; legenda crítica 13px ou mais em desktop, adaptada no mobile. Este projeto **não define um mínimo universal WCAG de 13px**, e sim meta legível de implementação.
- Números: `font-variant-numeric: lining-nums tabular-nums` nos KPIs, totais, datas e tabelas, para alinhamento sem mascarar precisão.
- Aumentar fonte sem ampliar largura útil ou permitir quebra pode cortar conteúdo. Revisar cartões, DataGrid, badges, filas, modal, sidebar recolhida e tela 390px antes de homologação.
- Testar a 100%, 125%, 150% e **200% de zoom** sem perda de informação, conforme WCAG 2.2 SC 1.4.4 (AA), mas não declarar conformidade antes da comprovação.
- Em release, **auto-hospedar fontes** licenciadas e preservar avisos OFL; Google Fonts só é usado como ferramenta de comparação na QA experimental, nunca aceito como dependência automática de produção.

## III. Piloto implementado, sem alterar layout homologado
Branch isolada `stage08/prism-typography-system-pilot-20261112` derivada da PR #679. Apenas a URL QA com `?visual=prism` ativa:
- `stage08-qa/prism-type-pilot.css`: Sora + Plus Jakarta Sans em CSS escopado pelo atributo `data-meg-typography-pilot=true`, com escala inicial calibrada para Home e Lançamentos.
- `stage08-qa/bootstrap.ts`: importa o tema **somente** com a flag.
- `stage08-funcional-qa.html`: CSP permite somente Google Fonts CSS/font em QA, mantendo `connect-src 'self'` e o bloqueio de APIs reais.
- `scripts/meg-stage08-prism-typography.browser.mjs`: testes em 390, 960 e 1366, fontes calculadas, quatro KPIs, fluxo down/up, sem rolagem horizontal global e sem requisições financeiras externas.
- A visualização sem `?visual=prism` continua igual à PR #679. **Nenhum CSS base, Shell, Home, DataGrid ou API é alterado por este piloto.**

## IV. Rollout por domínio e gates
| Ordem | Frente | Escopo futuro | Gate |
| --- | --- | --- | --- |
| 1 | **Etapa 08** | Comparar lado a lado Home + Lançamentos, tipografia Prism e ícones; ajustar legibilidade sem cortar DataGrid; confirmar aceite humano | QA isolada, 390/640/960/1024/1366, 200% zoom |
| 2 | Shell global | Navegação, topo, toolbar, tooltips; identidade base única | Aprovação visual própria, sem alterar funcionalidade |
| 3 | DataGrid | Tipografia, alinhamento tabular, densidade e rótulos; preservar ordenação, seleção e filtros | Regressão funcional completa e responsividade |
| 4 | Acesso | Loading, Login, Criar Conta, Recuperar Senha | Respeitar aprovações anteriores e branches por etapa |
| 5 | Operações | Novo/Editar, Pendentes/Pagamento, Cartões/Fatura, Benefícios/Recarga, Transferência/Período | Um módulo por etapa; preservar autoridades monetárias |
| 6 | Relatórios/Configurações | KPIs, gráficos, tabelas, preferências | Verificação visual, a11y, performance e semântica |
| 7 | Consolidação | Tokens, pacotes SVG locais e fontes auto-hospedadas, eliminação do legado somente após cobertura validada | Gatilhos técnicos verdes, aprovação por tela, merge autorizado |

**Cada módulo tem checklist de identidade, acessibilidade e testes e só migra após aprovação explícita.** Usuário solicitou a evolução geral, não autorizou perder telas aprovadas.

## V. Critérios que proíbem declarar finalizado
- Não houve ainda homologação visual do piloto por usuário.
- Nenhuma evidência autoriza migrar Shell, Home homologada, DataGrid inteiro e telas futuras silenciosamente.
- Não modificar Android, banco, API, Supabase, escritores financeiros, produtos em produção ou serviços Render homologados.
- Não realizar merge, deploy produtivo nem substituir o preview aprovado `760b7ad0e3217dbab70ea426df9cad67318f79ef`.
- A fonte deve ser servida localmente em release, com respeito à licença OFL e política de segurança. Não enviar arquivos de fontes ao usuário.
- Uma fonte bonita mas ilegível, inconsistente ou cortada no mobile **não será aceita**.

## Referências verificadas
- [Sora, projeto da fonte e licença OFL](https://github.com/sora-xor/sora-font)
- [Plus Jakarta Sans, Google Fonts, licença OFL](https://github.com/google/fonts/blob/main/ofl/plusjakartasans/upstream_info.md)
- [W3C, WCAG 2.2, Resize Text 1.4.4](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html)

## Registro e rastreabilidade
A expansão para todos os módulos da Web foi formalizada em [issue #683](https://github.com/MarcosVilalva/MEG-Platform/issues/683). A PR #682 permanece um **piloto da Etapa 08**, não uma alteração das demais telas.
