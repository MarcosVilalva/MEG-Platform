# Web Next

Nova camada visual Web clean-room do MEG Finanças.

Regras:
- ler `docs/WEB-REBUILD-STATUS.md` e `docs/WEB-LEGACY-REMOVAL.md` antes de alterar;
- não importar CSS Phoenix;
- não importar componentes visuais Phoenix;
- regras financeiras permanecem fora desta árvore;
- integrações com o sistema existente passam exclusivamente por `data/`;
- uma tela por vez; após validação, remover o legado substituído.

Estrutura inicial:
- `app/` — shell e roteamento Web Next;
- `components/` — componentes visuais canônicos;
- `screens/` — telas;
- `styles/` — tokens e CSS único;
- `data/` — adaptadores para contratos/gateways existentes.

## Fundação já criada

A fundação clean-room contém:
- `app/WebNextShell.tsx`;
- `components/WebNextSidebar.tsx`;
- `components/WebNextTopbar.tsx`;
- `components/WebNextIcon.tsx`;
- `styles/tokens.css`;
- `styles/shell.css`;
- contrato automático `web-next-foundation.contract.test.js`.

Ela ainda não assume rotas de produção. A primeira rota a migrar será a Home.

## Home Web Next

A primeira tela migrada é a Home da Prancha Web 1:
- adaptador: `data/home-view-model.ts`;
- tela: `screens/WebNextHome.tsx`;
- estilo: `styles/home.css`;
- seletor de período: `components/WebNextPeriodPopover.tsx`;
- contrato: `web-next-home.contract.test.js`.

A competência mensal utiliza Web Next. Intervalo/Tudo permanecem temporariamente no runtime anterior até sua reconstrução.
