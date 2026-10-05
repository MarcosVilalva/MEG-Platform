# MEG — estado operacional corrente

> Fonte curta para retomadas rápidas. A especificação completa continua em `docs/MEG_WEB_MASTER_SPEC.md`.

## Checkpoint

- Data: 2026-10-05
- `main` de partida do bloco atual: `9f12b72a61cbbbf549e073b7b69f683543e8b676`
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

**Login — revisão estrutural e anti-regressão.**

Fundação estrutural global concluída pela PR #590, com CI, Visual Preflight, Production Smoke e deploy verdes.

Objetivos imediatos do Login:

- preservar composição aprovada em desktop e 430 px;
- garantir viewport fixo no login mobile sem rolagem geral;
- manter rolagem interna apenas quando o formulário crescer;
- eliminar semântica de cadeado no cabeçalho, mantendo o marcador de segurança como escudo;
- reforçar contrato anti-regressão no CI.

## Próximo bloco

Após Login: **Loading → Shell/Navegação**, seguindo então a ordem fixa acima.

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
