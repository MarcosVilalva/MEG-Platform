# Instalação

1. Confirme que está na branch correta:

```powershell
git branch
```

Deve aparecer:

```text
* feature/domain-layer
```

2. Extraia este pacote por cima da raiz do projeto.

3. Rode o teste:

```powershell
npm --workspace packages/domain run test
```
