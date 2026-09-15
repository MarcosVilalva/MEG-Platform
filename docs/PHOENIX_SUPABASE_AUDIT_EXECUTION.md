# Phoenix V15 — execução segura da auditoria no banco real

Data: 12/09/2026

## Origem confirmada do banco

Os logs do serviço `meg-platform-api` no Render confirmam que o `DATABASE_URL` aponta para PostgreSQL no Supabase, usando o pooler `aws-1-sa-east-1.pooler.supabase.com:5432` e schema `public`.

Nenhuma credencial foi extraída, exibida ou copiada do Render.

## Estratégia de auditoria

A auditoria de propriedade dos catálogos deve ser executada diretamente no Supabase em modo somente leitura, sem publicar a branch Phoenix no serviço de produção e sem alterar o `DATABASE_URL` do Render.

O arquivo preparado para isso é:

`packages/database/prisma/catalog-ownership-audit.sql`

Esse SQL foi escrito contra o schema atual de produção, no qual `Account`, `Category` e `PaymentMethod` ainda não possuem `userId`. Ele deriva possíveis proprietários exclusivamente das referências reais existentes nos domínios que já possuem proprietário.

## Fontes consideradas

### Account

- `FinancialEvent.userId`
- `Receipt -> Receivable.userId`
- `PayablePayment -> Payable.userId`
- `LedgerEntry -> FinancialEvent.userId`

### Category

- `FinancialEvent.userId`
- `CardPurchase.userId`
- `Payable.userId`
- `RecurringExpense.userId`

### PaymentMethod

- `FinancialEvent.userId`
- `Receipt -> Receivable.userId`
- `PayablePayment -> Payable.userId`

## Classificação do relatório

- `SINGLE_OWNER`: exatamente um usuário identificado. Candidato a manter o ID atual durante o backfill.
- `MULTI_OWNER`: mais de um usuário usa o mesmo catálogo. Exige clonagem por proprietário e religação das referências.
- `REVIEW_OWNERLESS`: existe referência que não permite determinar usuário. Não migrar automaticamente.
- `NO_REFERENCE`: catálogo sem referência. Não atribuir proprietário por suposição.

## Gate obrigatório

O backfill não pode ser executado enquanto existir `MULTI_OWNER`, `REVIEW_OWNERLESS` ou `NO_REFERENCE` sem decisão explícita para cada registro afetado.

A auditoria SQL é somente leitura e não contém `UPDATE`, `INSERT`, `DELETE` ou DDL.

Depois da auditoria real:

1. conservar o relatório bruto;
2. revisar cada exceção;
3. gerar um plano determinístico de clonagem/religação;
4. simular o resultado esperado;
5. somente então preparar a migração transacional;
6. validar novamente o relatório até chegar a propriedade inequívoca;
7. só depois incorporar `openingBalance` à política monetária.
