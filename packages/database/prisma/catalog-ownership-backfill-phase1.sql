-- Phoenix V15 - Fase 1 do backfill de propriedade dos catálogos
-- Compatível com a aplicação atual: apenas adiciona colunas nullable, FKs/índices
-- e preenche Category/PaymentMethod já existentes. Não cria contas e não altera
-- FinancialEvent.accountId.

DO $$
DECLARE
  app_count integer;
  app_owner text;
  event_owner_count integer;
  event_owner text;
  bad_category_refs integer;
  bad_payment_refs integer;
  unknown_categories integer;
  unknown_payment_methods integer;
BEGIN
  SELECT COUNT(*)::int, MIN("userId") INTO app_count, app_owner FROM "AppState";
  IF app_count <> 1 OR app_owner IS NULL THEN
    RAISE EXCEPTION 'PHOENIX_CATALOG_BACKFILL_ABORTED: expected exactly one AppState owner';
  END IF;

  SELECT COUNT(DISTINCT "userId")::int, MIN("userId")
    INTO event_owner_count, event_owner
  FROM "FinancialEvent"
  WHERE "userId" IS NOT NULL;
  IF event_owner_count <> 1 OR event_owner <> app_owner THEN
    RAISE EXCEPTION 'PHOENIX_CATALOG_BACKFILL_ABORTED: FinancialEvent owner differs from AppState owner';
  END IF;

  WITH refs AS (
    SELECT "categoryId" AS catalog_id, "userId" AS user_id FROM "FinancialEvent" WHERE "categoryId" IS NOT NULL
    UNION ALL SELECT "categoryId", "userId" FROM "CardPurchase" WHERE "categoryId" IS NOT NULL
    UNION ALL SELECT "categoryId", "userId" FROM "Payable" WHERE "categoryId" IS NOT NULL
    UNION ALL SELECT "categoryId", "userId" FROM "RecurringExpense" WHERE "categoryId" IS NOT NULL
  )
  SELECT COUNT(*)::int INTO bad_category_refs
  FROM refs
  WHERE user_id IS NULL OR user_id <> app_owner;
  IF bad_category_refs <> 0 THEN
    RAISE EXCEPTION 'PHOENIX_CATALOG_BACKFILL_ABORTED: category references have ambiguous owner (%)', bad_category_refs;
  END IF;

  WITH refs AS (
    SELECT "paymentMethodId" AS catalog_id, "userId" AS user_id FROM "FinancialEvent" WHERE "paymentMethodId" IS NOT NULL
    UNION ALL
    SELECT r."paymentMethodId", rv."userId"
    FROM "Receipt" r JOIN "Receivable" rv ON rv.id = r."receivableId"
    WHERE r."paymentMethodId" IS NOT NULL
    UNION ALL
    SELECT pp."paymentMethodId", p."userId"
    FROM "PayablePayment" pp JOIN "Payable" p ON p.id = pp."payableId"
    WHERE pp."paymentMethodId" IS NOT NULL
  )
  SELECT COUNT(*)::int INTO bad_payment_refs
  FROM refs
  WHERE user_id IS NULL OR user_id <> app_owner;
  IF bad_payment_refs <> 0 THEN
    RAISE EXCEPTION 'PHOENIX_CATALOG_BACKFILL_ABORTED: payment method references have ambiguous owner (%)', bad_payment_refs;
  END IF;

  WITH referenced AS (
    SELECT "categoryId" AS id FROM "FinancialEvent" WHERE "categoryId" IS NOT NULL
    UNION SELECT "categoryId" FROM "CardPurchase" WHERE "categoryId" IS NOT NULL
    UNION SELECT "categoryId" FROM "Payable" WHERE "categoryId" IS NOT NULL
    UNION SELECT "categoryId" FROM "RecurringExpense" WHERE "categoryId" IS NOT NULL
  ), app_groups AS (
    SELECT upper(trim(item #>> '{}')) AS name
    FROM "AppState", LATERAL jsonb_array_elements(state::jsonb->'catalogs'->'groups') item
  )
  SELECT COUNT(*)::int INTO unknown_categories
  FROM "Category" c
  WHERE NOT EXISTS (SELECT 1 FROM referenced r WHERE r.id = c.id)
    AND NOT EXISTS (SELECT 1 FROM app_groups g WHERE g.name = upper(trim(c.name)));
  IF unknown_categories <> 0 THEN
    RAISE EXCEPTION 'PHOENIX_CATALOG_BACKFILL_ABORTED: unreferenced categories absent from AppState (%)', unknown_categories;
  END IF;

  WITH app_methods AS (
    SELECT upper(trim(item->>'description')) AS name
    FROM "AppState", LATERAL jsonb_array_elements(state::jsonb->'catalogs'->'paymentMethods') item
  )
  SELECT COUNT(*)::int INTO unknown_payment_methods
  FROM "PaymentMethod" pm
  WHERE NOT EXISTS (SELECT 1 FROM app_methods a WHERE a.name = upper(trim(pm.name)));
  IF unknown_payment_methods <> 0 THEN
    RAISE EXCEPTION 'PHOENIX_CATALOG_BACKFILL_ABORTED: PaymentMethod absent from AppState (%)', unknown_payment_methods;
  END IF;
END $$;

ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "PaymentMethod" ADD COLUMN IF NOT EXISTS "userId" TEXT;

UPDATE "Category"
SET "userId" = (SELECT "userId" FROM "AppState" LIMIT 1)
WHERE "userId" IS NULL;

UPDATE "PaymentMethod"
SET "userId" = (SELECT "userId" FROM "AppState" LIMIT 1)
WHERE "userId" IS NULL;

CREATE INDEX IF NOT EXISTS "Account_userId_isActive_idx" ON "Account"("userId", "isActive");
CREATE INDEX IF NOT EXISTS "Category_userId_isActive_idx" ON "Category"("userId", "isActive");
CREATE INDEX IF NOT EXISTS "PaymentMethod_userId_isActive_idx" ON "PaymentMethod"("userId", "isActive");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Account_userId_fkey') THEN
    ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Category_userId_fkey') THEN
    ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentMethod_userId_fkey') THEN
    ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Category" WHERE "userId" IS NULL) THEN
    RAISE EXCEPTION 'PHOENIX_CATALOG_BACKFILL_INCOMPLETE: Category.userId still null';
  END IF;
  IF EXISTS (SELECT 1 FROM "PaymentMethod" WHERE "userId" IS NULL) THEN
    RAISE EXCEPTION 'PHOENIX_CATALOG_BACKFILL_INCOMPLETE: PaymentMethod.userId still null';
  END IF;
END $$;
