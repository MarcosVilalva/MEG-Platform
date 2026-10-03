# MEG EVOLUTION — STATUS OFICIAL DA RECONSTRUÇÃO

> Este arquivo é a fonte de verdade para qualquer continuação da reconstrução Web.
> Antes de alterar a interface Web, leia `MEG-VALIDACAO-OFICIAL.md`, `EVOLUTION-VISUAL-CONTRACT.md`, `EVOLUTION-VISUAL-QA.md`, `EVOLUTION-MOBILE-FUNCTIONAL-INHERITANCE.md`, este documento e `WEB-LEGACY-REMOVAL.md`.

## 1. Decisão arquitetural

**Decisão final de 02/10/2026:** o Web deixa de evoluir sobre Phoenix/Web Next híbrido e passa a ser reconstruído como **MEG Evolution**, em clean-room visual e estrutural.

O cliente Web será reconstruído tela por tela em `apps/web/src/evolution/`.

O Android atualmente em uso fica congelado na base atual. Nenhum APK/OTA deve ser gerado ou publicado durante a reconstrução do Evolution. A migração Android para remover dependências Phoenix só começa após a conclusão e validação do Web.

O objetivo NÃO é reconstruir o sistema financeiro. Devem ser preservados:
- API e contratos de backend;
- autenticação;
- regras financeiras;
- persistência e gateways de escrita;
- lançamentos, baixas e conciliações;
- cartões, faturas e benefício;
- filtros, histórico e relatórios;
- dados normalizados, auditoria e demais regras de domínio já validadas.

O que será substituído progressivamente é a **camada visual/estrutural Web antiga**.

## 2. Fonte de verdade visual

### Fidelidade visual global obrigatória

As referências aprovadas são contrato visual para o **MEG Evolution inteiro**. Isso vale para todas as telas, módulos, modais e estados do sistema, não apenas para o Loading.

Não aceitar implementações apenas inspiradas na referência. Quando uma composição aprovada depender de arte complexa, profundidade, cenário, iluminação ou elementos 3D/holográficos, a solução pode usar artwork dedicado do Evolution como base e manter interações/dados como camadas reais. O critério de aprovação é fidelidade visual máxima somada à funcionalidade real.



Referência oficial: **5 pranchas-mestre reafirmadas e fixadas em 02/10/2026**, detalhadas em `EVOLUTION-VISUAL-CONTRACT.md`. Elas regem telas existentes e também todas as variações/telas futuras.

Regra de prioridade:
1. pranchas Web aprovadas;
2. regras funcionais e dados reais;
3. contratos de domínio;
4. código visual antigo somente enquanto uma tela ainda não foi migrada.

As pranchas Android NÃO são referência de layout do Web. O **Android em funcionamento é referência de fluxo e comportamento**: regras e funções validadas devem ser herdadas pelo Evolution, enquanto o desktop amplia contexto, densidade útil e capacidade analítica.

## 3. Referência principal de desktop

Alvo principal de validação visual:
- monitor: 1920 x 1080;
- Windows: escala 100%;
- Chrome: zoom 100%;
- navegador maximizado.

A aplicação continua responsiva. O alvo Full HD é referência de composição, não breakpoint rígido.

## 4. Regras obrigatórias

1. Uma tela por vez.
2. Uma implementação oficial por módulo.
3. Tela aprovada pelo usuário entra em estado VALIDADA.
4. Após validação e publicação verde, o legado substituído por aquela tela deve ser removido no mesmo ciclo.
5. Não manter componentes antigos comentados, escondidos com `display:none`, ou duplicados como backup.
6. Não criar novas versões nomeadas `v12`, `v13`, `v15`, `final2`, `wow`, `old`, `legacy` ou equivalentes na árvore Web Next.
7. Android fica congelado durante a reconstrução Web e deve ser tratado como fonte funcional somente leitura.
8. Código visual Web Next não pode depender diretamente de CSS Phoenix antigo.
9. Regras de negócio não podem ser reimplementadas dentro de componentes visuais.
10. O Web deve herdar a lógica validada do Mobile e melhorar a experiência para tela grande; não copiar layout móvel esticado.
11. `CREDIÁRIO` não é oferecido para novos lançamentos no Web Evolution; histórico legado permanece preservado.
12. CI verde não equivale a validação visual. A aprovação da tela é explícita.
13. Git é o backup. Código morto não permanece no runtime por medo de perda.
14. Toda remoção deve ocorrer após busca de consumidores e CI completo.

## 5. Processo obrigatório por tela

**Nova regra:** antes da validação do usuário existe uma etapa de **pré-validação visual interna** com screenshot real e comparação contra a prancha oficial. O usuário não deve ser usado para detectar divergências visuais óbvias que podem ser identificadas previamente.



`mapear → construir clean-room → CI → publicar preview/produção → validação visual → remover legado substituído → CI → congelar`

Se uma tela ainda não foi validada, o legado necessário pode continuar ativo temporariamente e deve constar em `WEB-LEGACY-REMOVAL.md`.

## 6. Estado atual

- branch oficial: `main`;
- Android estável publicado: `2.0.708`;
- Android: **CONGELADO / PROTEGIDO / SOMENTE LEITURA COMO REFERÊNCIA FUNCIONAL** durante toda a reconstrução Web;
- nenhum APK/OTA deve ser gerado ou publicado nesta fase;
- nenhum arquivo de `apps/web/src/mobile/` deve ser alterado para atender demandas do Evolution;
- Phoenix: legado temporário, preservado somente para manter o Android atual e dependências ainda não desacopladas;
- implementações Web Next anteriores (#512–#522): histórico/protótipos úteis, mas **não são a fundação arquitetural final do Evolution**;
- referências visuais aprovadas de 02/10/2026 permanecem o contrato visual;
- entrypoint Evolution publicado em `apps/web/evolution.html`;
- pré-validação visual automática/manual está operacional: screenshots reais são inspecionados antes de comunicar prontidão;
- Loading Evolution: **VALIDADO / CONGELADO** pelo usuário em 03/10/2026; não alterar sem nova solicitação explícita;
- Login Evolution: fluxo real conectado; autofill corrigido; **PUBLICADO / AGUARDANDO VALIDAÇÃO FINAL**;
- Home Evolution: Command Center em refinamento visual; Plano Premium removido; carrossel cíclico e assets reais aplicados; **EM CORREÇÃO / NÃO CONGELADA**;
- Novo Lançamento Evolution: integrado à Home e publicado; **PRÉ-VALIDADO INTERNAMENTE / AGUARDANDO APROVAÇÃO DO USUÁRIO**;
- `CREDIÁRIO`: aposentado para novos lançamentos no Web Evolution; parcelamento permanece no cartão de crédito; histórico legado preservado;
- Lançamentos / Movimentações: reconstrução desktop iniciada a partir das regras funcionais do Mobile, sem importar o visual Mobile;
- regra oficial de herança: `EVOLUTION-MOBILE-FUNCTIONAL-INHERITANCE.md`.

**Não retomar módulos sobre a arquitetura Web Next anterior. Cada módulo novo nasce em `apps/web/src/evolution/`, herdando regras funcionais validadas e expandindo a experiência para desktop.**

## 7. Matriz de migração

| Área | Referência | Estado Evolution | Aprovação |
|---|---|---|---|
| Fundação Web / shell | Sistema visual das 5 pranchas | MERGED | FUNDAÇÃO ATIVA |
| Loading | Prancha A | MERGED | **VALIDADO / CONGELADO** |
| Login / Autenticação | Pranchas B/C | MERGED · fluxo real | AGUARDANDO VALIDAÇÃO FINAL |
| Home / Command Center | Prancha D | MERGED · refinamento em andamento | EM CORREÇÃO |
| Novo Lançamento | Prancha E + regras Mobile | MERGED · funcional | PRÉ-VALIDADO INTERNAMENTE |
| Lançamentos / Movimentações | Regras `MegMobileMovements` + DNA Evolution | EM CONSTRUÇÃO EVOLUTION | NÃO |
| Pendentes / baixa | Regras `Payables` + DNA Evolution | PRÓXIMO CICLO | NÃO |
| Cartões / Central / Fatura | Regras `Cards` / `MegMobileCardCenter` | MAPEADO | NÃO |
| Benefício | Regras Mobile de benefício | MAPEADO | NÃO |
| Relatórios / Analytics / Fluxo | Regras `MegMobileHistory/Cashflow/Analytics` | MAPEADO | NÃO |
| Planejamento / Metas | Regras de domínio + DNA Evolution | MAPEADO | NÃO |
| Configurações / Perfil | Regras `MegMobileSettings` | MAPEADO | NÃO |

## 8. Estrutura alvo

A camada oficial é `apps/web/src/evolution/`:
```
apps/web/src/evolution/
  app/
  screens/
  styles/
  main.tsx
```

Princípios:
- `styles/`: tokens, shell e estilos canônicos do Evolution;
- `screens/`: composição das telas Web;
- regras financeiras permanecem nos clientes, contratos e gateways existentes;
- Evolution não importa CSS/componentes visuais Phoenix, Web Next ou Mobile;
- o Mobile pode ser lido para herdar comportamento, mas não é importado como camada visual;
- novas telas devem ampliar a experiência para desktop, não reproduzir uma tela de celular em tamanho maior.

## 9. Continuidade entre chats

Comando oficial:

> **Retomar MEG pela Memória Oficial de Validação e Continuidade. Não revalidar decisões já aprovadas. Conferir o estado atual do GitHub e continuar exatamente do último ponto validado.**

Em qualquer novo chat:
1. abrir `MEG-VALIDACAO-OFICIAL.md`;
2. abrir este arquivo;
3. abrir `WEB-LEGACY-REMOVAL.md`;
4. verificar HEAD da `main`;
5. verificar PRs abertos relacionados a Evolution;
6. confirmar que o Android continua congelado;
7. continuar exatamente do último marco Evolution registrado.

Não reabrir Web Next incremental como direção arquitetural. Não gerar APK/OTA Android durante a reconstrução do Web.
