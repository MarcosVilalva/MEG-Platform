-- Etapa 10. Prova NEGATIVA da estrutura FK existente (somente Postgres17 QA).
-- Mostra porque ON DELETE SET NULL nao protege lastro financeiro.
-- Nunca executar sobre dados reais, nunca aplicar como migration.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
DO $$
BEGIN
 IF current_database()<>'meg_stage10_sandbox' OR current_user<>'meg_stage10_ci'
    OR current_setting('application_name',true)<>'MEG_STAGE10_QA_DISPOSABLE_ONLY' THEN
  RAISE EXCEPTION 'STAGE10_QA_DISPOSABLE_ONLY';
 END IF;
END $$;

INSERT INTO "User"(id,name,email,"passwordHash","updatedAt")
VALUES('stage10fk-owner','QA FK','stage10-fk@meg.test','QA_ONLY',now());
INSERT INTO "Workspace"(id,name,slug,"ownerId","updatedAt")
VALUES('stage10fk-work','Workspace QA FK','stage10fk-work','stage10fk-owner',now());
INSERT INTO "Account"(id,"userId",name,type,"updatedAt")
VALUES('stage10fk-account','stage10fk-owner','Conta QA','checking',now());
INSERT INTO "FinancialEvent"(id,"userId","workspaceId","legacyTransactionId",description,type,status,date,competence,amount,"signedAmount","accountId","updatedAt")
VALUES
('stage10fk-receipt','stage10fk-owner','stage10fk-work','stage10fk-r','QA vinculado a recibo','income','paid','2026-11-01','2026-11',10,10,'stage10fk-account',now()),
('stage10fk-payable','stage10fk-owner','stage10fk-work','stage10fk-p','QA vinculado a baixa','expense','paid','2026-11-01','2026-11',20,-20,'stage10fk-account',now()),
('stage10fk-import','stage10fk-owner','stage10fk-work','stage10fk-i','QA vinculado a importacao','expense','paid','2026-11-01','2026-11',30,-30,'stage10fk-account',now()),
('stage10fk-ledger','stage10fk-owner','stage10fk-work','stage10fk-l','QA vinculado a ledger','expense','paid','2026-11-01','2026-11',40,-40,'stage10fk-account',now());
INSERT INTO "Receivable"(id,"userId",description,"totalAmount","openAmount","dueDate","updatedAt")
VALUES('stage10fk-receivable','stage10fk-owner','Receber QA',10,0,'2026-11-01',now());
INSERT INTO "Receipt"(id,"receivableId",amount,"receivedAt","financialEventId")
VALUES('stage10fk-receipt-link','stage10fk-receivable',10,'2026-11-01','stage10fk-receipt');
INSERT INTO "Payable"(id,"userId",description,"totalAmount","openAmount","dueDate","updatedAt")
VALUES('stage10fk-payable-parent','stage10fk-owner','Pagar QA',20,0,'2026-11-01',now());
INSERT INTO "PayablePayment"(id,"payableId",amount,"paidAt","financialEventId")
VALUES('stage10fk-payable-link','stage10fk-payable-parent',20,'2026-11-01','stage10fk-payable');
INSERT INTO "ImportBatch"(id,"userId","fileName","fileHash","rowCount")
VALUES('stage10fk-batch','stage10fk-owner','qa.csv','stage10fk-hash',1);
INSERT INTO "ImportedRow"(id,"batchId","rowNumber",status,"rawData","eventId")
VALUES('stage10fk-import-link','stage10fk-batch',1,'imported','{"qa":true}','stage10fk-import');
INSERT INTO "LedgerEntry"(id,"eventId",date,"accountId",debit,credit)
VALUES('stage10fk-ledger-link','stage10fk-ledger','2026-11-01','stage10fk-account',0,40);

-- Um delete legado e permitido no banco sem a guarda da aplicacao:
-- tres FKs passam a NULL, perdendo associacao auditavel.
DELETE FROM "FinancialEvent" WHERE id IN ('stage10fk-receipt','stage10fk-payable','stage10fk-import');
DO $$
BEGIN
 IF (SELECT "financialEventId" FROM "Receipt" WHERE id='stage10fk-receipt-link') IS NOT NULL
 OR (SELECT "financialEventId" FROM "PayablePayment" WHERE id='stage10fk-payable-link') IS NOT NULL
 OR (SELECT "eventId" FROM "ImportedRow" WHERE id='stage10fk-import-link') IS NOT NULL THEN
  RAISE EXCEPTION 'QA_SET_NULL_NOT_REPRODUCED';
 END IF;
 IF (SELECT count(*) FROM "FinancialEvent" WHERE id IN('stage10fk-receipt','stage10fk-payable','stage10fk-import')) <> 0 THEN
  RAISE EXCEPTION 'QA_ROWS_NOT_DELETED';
 END IF;
END $$;

-- LedgerEntry usa RESTRICT: aqui o delete DEVE falhar, sem apagar entrada.
DO $$
BEGIN
 BEGIN
  DELETE FROM "FinancialEvent" WHERE id='stage10fk-ledger';
  RAISE EXCEPTION 'QA_LEDGER_DELETE_UNEXPECTED_SUCCESS';
 EXCEPTION WHEN foreign_key_violation THEN NULL;
 END;
 IF (SELECT count(*) FROM "FinancialEvent" WHERE id='stage10fk-ledger') <> 1
  OR (SELECT count(*) FROM "LedgerEntry" WHERE "eventId"='stage10fk-ledger') <> 1 THEN
  RAISE EXCEPTION 'QA_LEDGER_FK_INVARIANT_FAILED';
 END IF;
END $$;

SELECT 'MEG_STAGE10_QA_FK_SET_NULL_RISK_CONFIRMED_LEDGER_RESTRICT_CONFIRMED' AS resultado;
ROLLBACK;
DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM "User" WHERE id='stage10fk-owner')
 OR EXISTS(SELECT 1 FROM "FinancialEvent" WHERE id LIKE 'stage10fk-%')
 OR EXISTS(SELECT 1 FROM "Receipt" WHERE id='stage10fk-receipt-link')
 OR EXISTS(SELECT 1 FROM "PayablePayment" WHERE id='stage10fk-payable-link')
 OR EXISTS(SELECT 1 FROM "ImportedRow" WHERE id='stage10fk-import-link')
 THEN RAISE EXCEPTION 'QA_FK_TEST_LEFTOVERS'; END IF;
END $$;
SELECT 'MEG_STAGE10_QA_FK_RISK_PROOF_ROLLED_BACK' AS resultado;
