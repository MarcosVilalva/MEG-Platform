# MEG Finance System

Sistema financeiro pessoal com interface React adaptativa, API Fastify, Prisma e persistência compartilhada.

## Aplicação publicada

- Web: https://marcosvilalva.github.io/MEG-Platform/
- API: https://meg-platform-api.onrender.com
- Documentação da API: https://meg-platform-api.onrender.com/docs

## Desenvolvimento local

```powershell
npm.cmd install
copy .env.example .env
npm.cmd run db:generate
npm.cmd run db:push
npm.cmd run dev
```

## Validação

```powershell
npm.cmd run check
```

A interface Web usa exclusivamente a entrada React em `apps/web/src/app/main.tsx`. O layout anterior foi removido; regras financeiras, persistência, auditoria e integrações permanecem preservadas.
