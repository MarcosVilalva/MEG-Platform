-- MEG / ETAPA 10: demonstracao do guard de identidade em Postgres 17 DESCARTAVEL.
-- NAO E MIGRACAO, NAO INSTALAR EM BANCO REAL OU API COMPARTILHADA.
-- O trigger sera criado e removido pelo ROLLBACK desta mesma transacao.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
DO $$
BEGIN
 IF current_database() <> 'meg_stage10_sandbox'
  OR current_user <> 'meg_stage10_ci'
  OR current_setting('application_name',true) <> 'MEG_STAGE10_QA_DISPOSABLE_ONLY' THEN
  RAISE EXCEPTION 'STAGE10_QA_DISPOSABLE_ONLY';
 END IF;
END $$;

INSERT INTO "User" (id,name,email,"passwordHash","updatedAt")
VALUES ('stage10guard-owner-a','Dono A QA','guard-a@meg.test','QA_ONLY',now()),
       ('stage10guard-owner-b','Dono B QA','guard-b@meg.test','QA_ONLY',now());
INSERT INTO "Workspace" (id,name,slug,"ownerId","updatedAt")
VALUES ('stage10guard-work-a','QA A','stage10guard-work-a','stage10guard-owner-a',now()),
       ('stage10guard-work-b','QA B','stage10guard-work-b','stage10guard-owner-b',now());
INSERT INTO "Account" (id,"userId",name,type,"updatedAt")
VALUES ('stage10guard-account-a','stage10guard-owner-a','Conta QA A','checking',now()),
       ('stage10guard-account-b','stage10guard-owner-b','Conta QA B','checking',now());
INSERT INTO "Category" (id,"userId",name,"group",type,"updatedAt")
VALUES ('stage10guard-cat-a','stage10guard-owner-a','Alimentos','Compras','expense',now());
INSERT INTO "PaymentMethod" (id,"userId",name,type,"updatedAt")
VALUES ('stage10guard-method-a','stage10guard-owner-a','PIX','instant',now());
INSERT INTO "FinancialEvent"
(id,"userId","workspaceId","legacyTransactionId",description,type,status,date,competence,amount,"signedAmount","accountId","categoryId","paymentMethodId","sourcePayload","updatedAt")
VALUES
('stage10guard-e1','stage10guard-owner-a','stage10guard-work-a','legacy-qa-same','QA com ledger','expense','paid','2026-11-01','2026-11',21.37,-21.37,'stage10guard-account-a','stage10guard-cat-a','stage10guard-method-a','{"category":"Alimentos","expenseClass":"Compras","paymentMethod":"PIX"}',now()),
('stage10guard-e2','stage10guard-owner-b','stage10guard-work-b','legacy-qa-same','Mesmo legado outro tenant','expense','paid','2026-11-02','2026-11',8.25,-8.25,'stage10guard-account-b',NULL,NULL,'{}',now());
INSERT INTO "LedgerEntry" (id,"eventId",date,"accountId",debit,credit,memo)
VALUES ('stage10guard-ledger','stage10guard-e1','2026-11-01','stage10guard-account-a',0,21.37,'QA ficticio');

-- Funcoes pg_temp e trigger sao escopo exclusivo da transacao descartavel.
CREATE FUNCTION pg_temp.stage10_guard_legacy_identity()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN
  IF OLD."legacyTransactionId" IS NOT NULL THEN
   RAISE EXCEPTION 'QA_DELETE_LEGACY_ID_BLOCKED';
  END IF;
  RETURN OLD;
 END IF;
 IF OLD."legacyTransactionId" IS NOT NULL AND (
    NEW.id IS DISTINCT FROM OLD.id
    OR NEW."userId" IS DISTINCT FROM OLD."userId"
    OR NEW."workspaceId" IS DISTINCT FROM OLD."workspaceId"
    OR NEW."legacyTransactionId" IS DISTINCT FROM OLD."legacyTransactionId"
 ) THEN
    RAISE EXCEPTION 'QA_IDENTITY_MUTATION_BLOCKED';
 END IF;
 IF OLD."archivedAt" IS NOT NULL AND NEW."archivedAt" IS NULL
    AND OLD."legacyTransactionId" IS NOT NULL THEN
    RAISE EXCEPTION 'QA_IMPLICIT_RESTORE_BLOCKED';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER stage10_guard_legacy_identity_demo
BEFORE UPDATE OR DELETE ON "FinancialEvent"
FOR EACH ROW EXECUTE FUNCTION pg_temp.stage10_guard_legacy_identity();

DO $$
DECLARE err text;
BEGIN
 -- Apagar um evento com ledger nunca podera apagar o evento nem desanexar referencias.
 BEGIN
   DELETE FROM "FinancialEvent" WHERE id='stage10guard-e1';
   RAISE EXCEPTION 'QA_UNSAFE_DELETE_SUCCEEDED';
 EXCEPTION WHEN raise_exception THEN
   GET STACKED DIAGNOSTICS err = MESSAGE_TEXT;
   IF err <> 'QA_DELETE_LEGACY_ID_BLOCKED' THEN RAISE; END IF;
 END;
 -- Mesmo sem ledger, identidade historica nao e apagada.
 BEGIN
   DELETE FROM "FinancialEvent" WHERE id='stage10guard-e2';
   RAISE EXCEPTION 'QA_UNSAFE_UNLINKED_DELETE_SUCCEEDED';
 EXCEPTION WHEN raise_exception THEN
   GET STACKED DIAGNOSTICS err = MESSAGE_TEXT;
   IF err <> 'QA_DELETE_LEGACY_ID_BLOCKED' THEN RAISE; END IF;
 END;
 -- Nao se altera a chave primaria, nem workspace, nem tenant.
 BEGIN
   UPDATE "FinancialEvent" SET id='stage10guard-different' WHERE id='stage10guard-e1';
   RAISE EXCEPTION 'QA_ID_REPLACE_SUCCEEDED';
 EXCEPTION WHEN raise_exception THEN
   GET STACKED DIAGNOSTICS err = MESSAGE_TEXT;
   IF err <> 'QA_IDENTITY_MUTATION_BLOCKED' THEN RAISE; END IF;
 END;
 BEGIN
   UPDATE "FinancialEvent" SET "workspaceId"='stage10guard-work-b' WHERE id='stage10guard-e1';
   RAISE EXCEPTION 'QA_WORKSPACE_REPLACE_SUCCEEDED';
 EXCEPTION WHEN raise_exception THEN
   GET STACKED DIAGNOSTICS err = MESSAGE_TEXT;
   IF err <> 'QA_IDENTITY_MUTATION_BLOCKED' THEN RAISE; END IF;
 END;
 BEGIN
   UPDATE "FinancialEvent" SET "legacyTransactionId"='legacy-qa-changed' WHERE id='stage10guard-e1';
   RAISE EXCEPTION 'QA_LEGACY_ID_REPLACE_SUCCEEDED';
 EXCEPTION WHEN raise_exception THEN
   GET STACKED DIAGNOSTICS err = MESSAGE_TEXT;
   IF err <> 'QA_IDENTITY_MUTATION_BLOCKED' THEN RAISE; END IF;
 END;
 -- Contrato Prisma existente: UNIQUE(workspaceId,legacyTransactionId).
 BEGIN
   INSERT INTO "FinancialEvent"
    (id,"userId","workspaceId","legacyTransactionId",description,type,status,date,competence,amount,"signedAmount","updatedAt")
   VALUES ('stage10guard-dupe','stage10guard-owner-a','stage10guard-work-a','legacy-qa-same',
    'Duplicado proibido','expense','paid','2026-11-01','2026-11',1,-1,now());
   RAISE EXCEPTION 'QA_COMPOSITE_UNIQUE_NOT_ENFORCED';
 EXCEPTION WHEN unique_violation THEN NULL;
 END;
END $$;

-- Atualizar campo nao-identitario conserva eventId e vinculos, apenas demonstra a guarda.
UPDATE "FinancialEvent"
SET description='Edicao segura QA'
WHERE id='stage10guard-e1';
DO $$
BEGIN
 IF (SELECT count(*) FROM "FinancialEvent" WHERE id LIKE 'stage10guard-e%') <> 2
  OR (SELECT "categoryId" FROM "FinancialEvent" WHERE id='stage10guard-e1') <> 'stage10guard-cat-a'
  OR (SELECT "paymentMethodId" FROM "FinancialEvent" WHERE id='stage10guard-e1') <> 'stage10guard-method-a'
  OR (SELECT count(*) FROM "LedgerEntry" WHERE "eventId"='stage10guard-e1') <> 1
  OR (SELECT "legacyTransactionId" FROM "FinancialEvent" WHERE id='stage10guard-e1') <> 'legacy-qa-same'
  OR (SELECT amount FROM "FinancialEvent" WHERE id='stage10guard-e1') <> 21.37
 THEN RAISE EXCEPTION 'QA_GUARD_FINANCIAL_INVARIANT_FAILED'; END IF;
END $$;

-- Arquivamento conserva identificador. Reativacao implicita continua bloqueada.
UPDATE "FinancialEvent" SET "archivedAt"=now() WHERE id='stage10guard-e2';
DO $$
DECLARE err text;
BEGIN
 BEGIN
   UPDATE "FinancialEvent" SET "archivedAt"=NULL WHERE id='stage10guard-e2';
   RAISE EXCEPTION 'QA_IMPLICIT_RESTORE_SUCCEEDED';
 EXCEPTION WHEN raise_exception THEN
   GET STACKED DIAGNOSTICS err = MESSAGE_TEXT;
   IF err <> 'QA_IMPLICIT_RESTORE_BLOCKED' THEN RAISE; END IF;
 END;
 IF (SELECT count(*) FROM "FinancialEvent" WHERE id='stage10guard-e2' AND "archivedAt" IS NOT NULL) <> 1 THEN
   RAISE EXCEPTION 'QA_ARCHIVED_EVENT_DISAPPEARED';
 END IF;
END $$;
SELECT 'MEG_STAGE10_DB_IDENTITY_GUARD_SYNTHETIC_PASS' AS result;
ROLLBACK;
DO $$
BEGIN
 IF EXISTS (SELECT 1 FROM "User" WHERE id LIKE 'stage10guard-%')
 OR EXISTS (SELECT 1 FROM "FinancialEvent" WHERE id LIKE 'stage10guard-%')
 OR EXISTS (SELECT 1 FROM "LedgerEntry" WHERE id LIKE 'stage10guard-%')
 OR EXISTS (
   SELECT 1 FROM pg_trigger WHERE tgname='stage10_guard_legacy_identity_demo'
 ) THEN RAISE EXCEPTION 'QA_GUARD_LEFTOVERS_DETECTED'; END IF;
END $$;
SELECT 'MEG_STAGE10_DB_IDENTITY_GUARD_ROLLBACK_ZERO_RESIDUES_PASS' AS result;
