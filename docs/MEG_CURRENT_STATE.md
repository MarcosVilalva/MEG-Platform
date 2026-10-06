# MEG — estado operacional corrente

> Fonte curta para retomadas rápidas. A especificação completa continua em `docs/MEG_WEB_MASTER_SPEC.md`.

## Checkpoint

- Data: 2026-10-05
- `main` de partida do bloco atual: `831f158d72cf1e8dc249d422ef6e15b5e90c8810`
- Fase: **Estrutura + fidelidade + UX do MEG Web**
- Reconstrução principal: concluída
- Security Hardening inicial: concluído e mantido como gate permanente
- Android e `apps/web/src/mobile`: **somente leitura / protegidos**

## Objetivo atual

Finalizar o MEG Web sobre a `main` corrente, preservando regras financeiras e a identidade aprovada, com foco em:

- estrutura global;
- composição e proporção das telas;
- uso correto do viewport;
- responsividade;
- fidelidade visual;
- Smart Grid e áreas densas com rolagem interna;
- telas e modais funcionais com dados reais;
- polimento visual sem redesenho arbitrário.

## Ordem fixa da fase

1. Fundação estrutural global
2. Login
3. Loading
4. Shell / navegação
5. Home
6. Lançamentos
7. Pendentes
8. Cartões
9. Benefícios
10. Fluxo de Caixa
11. Relatórios
12. Histórico
13. Configurações
14. Modais
15. QA estrutural e visual final

## Regras de viewport

- alvo principal: **1920 × 1080 a 100%**;
- validar também desktop reduzido, tablet e **430 px**;
- Home desktop sem rolagem geral;
- rolagem permitida somente dentro de grids, listas e quadros densos;
- nenhuma tela deve depender de zoom manual;
- nenhuma correção Web pode alterar Android/Mobile.

## Gate por bloco

Um bloco só pode ser fechado após os gates pertinentes:

- testes de contrato;
- build;
- CI;
- smoke;
- Visual Preflight quando houver impacto visual;
- comparação com referência aprovada;
- verificação de Android/Mobile intocados.

## Estado do último bloco concluído

- PR #587: regressões objetivas em 430 px corrigidas.
- PR #588: KPIs de contagem corrigidos e protegidos por teste.
- PR #589: checkpoint pós-hardening e revisão visual registrado.
- CI, Production Smoke e deploy do GitHub Pages estavam verdes no último checkpoint de produção.

## Bloco em execução

**REPRODUÇÃO FIEL — Login — branch `feat/evolution-login-faithful-v3`.**

A partir das referências visuais anexadas em 05/10/2026, o projeto deixa de aceitar interpretações estéticas. As imagens aprovadas são a única fonte da verdade para estrutura, posição, proporção, cor, tipografia, ícones, bordas, glow, textos e dados visíveis.

Estado do Login:

- stack preservada: React + TypeScript + CSS customizado + Vite;
- referência desktop oficial: 1672×941;
- fundo final fornecido separadamente, sem texto/logo/cards, destinado a `apps/web/public/bg-login.webp`;
- o fundo é tratado exclusivamente como imagem, sem recriação de montanhas, barras 3D ou brilhos por CSS;
- overlay operacional: `rgba(0,0,0,.25)`;
- estrutura HTML real para logo, narrativa, três cards e formulário;
- cabeçalho do card usa escudo com cadeado interno;
- composição desktop auditada contra a referência antes do merge;
- mobile recompõe em coluna e centraliza o card;
- nenhuma tela previamente aprovada pode ser alterada ao trabalhar em outra.

A PR #601 permanece fora da `main` e não é tratada como direção visual aprovada.

## Próximo bloco

Somente após aprovação visual do Login: **Loading**, repetindo Passo 1 → código → auditoria imagem × código → aprovação.

## Bloqueios que exigem Marcos

Somente:

- risco de perda/corrupção de dados;
- mudança irreversível;
- segredo/credencial;
- custo externo;
- decisão nova de produto;
- conflito entre regras oficiais;
- alteração do Android/Mobile.

Fora desses casos, a execução segue autonomamente.

## Retomada

Comando de retomada:

**Retomar MEG — memória oficial — último ponto validado.**

Hierarquia de recuperação:

`GitHub main → MEG_CURRENT_STATE.md → MEG_WEB_MASTER_SPEC.md → AGENTS.md → histórico do chat`.
