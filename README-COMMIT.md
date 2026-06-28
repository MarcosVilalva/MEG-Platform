# MEG 006.001 — Domain Layer

## Como aplicar

Extraia este pacote por cima da raiz do projeto.

## Depois execute

```powershell
git status
npm --workspace packages/domain run test
git add .
git commit -m "feat(domain): add core financial entities"
git push -u origin feature/domain-layer
```

## Observação

Este commit não altera API nem interface ainda.

Ele cria a base de domínio que será usada nas próximas Sprints.
