# Gerenciamento de cartões

O endpoint de gerenciamento é separado da leitura operacional de `/cards` para que cartões inativos nunca voltem a compor faturas, limites ou lançamentos por acidente.

- `GET /cards-management?month=AAAA-MM`: lista cartões ativos e inativos do workspace para administração.
- `POST /cards-management/:id/reactivate`: reativa um cartão existente; permitido somente a ADMIN e MANAGER.
- A reativação preserva o mesmo `id` e todo o histórico do cartão.
- Se já existir outro cartão ativo com o mesmo nome normalizado, a API retorna `409 CARD_NAME_ALREADY_ACTIVE`.
- Reativar um cartão que já esteja ativo é idempotente e não duplica registros.
- A reativação grava `CARD_REACTIVATED` no log de auditoria.
