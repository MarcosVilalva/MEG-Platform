# MEG — estado operacional corrente

> Fonte curta para retomadas rápidas. A especificação completa continua em `docs/MEG_WEB_MASTER_SPEC.md`.

## Checkpoint

- Data: 2026-10-05
- `main` de partida do bloco atual: `c6447ae567d1b7fa77ae676c62845c475fe9e445`
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

**Fluxo de Caixa — revisão estrutural e anti-regressão — branch `feat/evolution-cashflow-structure` em validação.**

Fundação estrutural global concluída pela PR #590. Login consolidado pela PR #591. Loading consolidado pela PR #592. Shell/Navegação consolidado pela PR #593. Home consolidada pela PR #594. Lançamentos consolidado pela PR #595. Pendentes consolidado pela PR #596. Cartões consolidado pela PR #597. Benefícios consolidado pela PR #598, com CI e Visual Preflight verdes.

Objetivos imediatos de Fluxo de Caixa:

- preservar abas Resumo/Entradas/Saídas sobre os dados reais do período;
- manter entradas, saídas, resultado e fechamento realizado ligados ao domínio financeiro;
- preservar evolução diária com escala derivada dos valores reais;
- manter saldo realizado e projetado por dia;
- preservar saldo inicial e fechamento projetado da posição do período;
- manter tabela em rolagem interna e recomposição responsiva em 430 px;
- reforçar contrato anti-regressão no CI.

## Próximo bloco

Após Fluxo de Caixa: **Relatórios**, seguindo então a ordem fixa acima.

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
