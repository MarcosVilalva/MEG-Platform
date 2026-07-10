# Padrões de Código

## TypeScript

- modo estrito;
- não introduzir `any` sem justificativa registrada;
- contratos compartilhados entre API e frontend;
- valores monetários convertidos explicitamente;
- datas e competência tratadas de forma consistente.

## Arquitetura

- UI exibe e coleta intenção;
- API autoriza e orquestra;
- domínio valida regras;
- repositórios persistem;
- Prisma não deve vazar para componentes React;
- integrações externas ficam atrás de interfaces.

## Qualidade

- uma responsabilidade principal por módulo;
- evitar duplicação;
- erros de domínio têm mensagens claras;
- ações críticas são auditadas;
- novas rotas declaram autenticação e autorização;
- alterações de schema preservam dados ou documentam migração.

## Validação mínima

```powershell
npm run check
```

Antes de merge:

- testes passam;
- frontend compila;
- API compila;
- documentação foi atualizada;
- nenhuma credencial entrou no diff;
- arquivos gerados não rastreados foram removidos.

## Git

- branches curtas;
- commits objetivos;
- PR descreve impacto, regra e validação;
- `main` deve permanecer executável.
