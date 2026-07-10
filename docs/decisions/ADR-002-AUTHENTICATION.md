# ADR-002 — Autenticação e aprovação

## Status

Aceita.

## Contexto

Cadastro aberto liberaria dados financeiros a usuários não autorizados.

## Decisão

Usar JWT de curta duração, refresh token persistido e aprovação administrativa. Novos cadastros ficam PENDING. O administrador principal é `m_vilalva@hotmail.com`.

## Consequências

- usuário pendente não acessa o sistema;
- bloqueio revoga sessões;
- ações administrativas devem ser auditadas;
- recuperação de senha e confirmação de e-mail são requisitos antes da Beta.
