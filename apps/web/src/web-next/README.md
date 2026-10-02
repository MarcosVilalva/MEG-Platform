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
