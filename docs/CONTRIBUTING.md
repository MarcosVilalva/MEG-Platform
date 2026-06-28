# Contribuição

## Convenções

- Regras financeiras ficam em `packages/core`.
- Componentes reutilizáveis ficam em `packages/ui`.
- Tipos compartilhados ficam em `packages/shared`.
- Interfaces de tela ficam em `apps/web/src/modules`.

## Qualidade

Antes de alterar regra de negócio:
1. Documente a regra.
2. Implemente no Core.
3. Crie teste.
4. Só então use na interface.
