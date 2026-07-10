# Matriz RBAC — Financeiro

| Operação | ADMIN | MANAGER | OPERATOR | VIEWER |
|---|---:|---:|---:|---:|
| Consultar eventos, contas, categorias e ledger | Sim | Sim | Sim | Sim |
| Criar eventos financeiros | Sim | Sim | Sim | Não |
| Editar eventos financeiros | Sim | Sim | Sim | Não |
| Excluir eventos financeiros | Sim | Sim | Não | Não |

As permissões são validadas na API. Ocultar botões na interface não substitui a autorização do backend.
