-- MEG Etapa 10: PROVA ISOLADA EM POSTGRESQL 17. NUNCA EXECUTAR EM PRODUCAO.
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

-- Todos os registros seguintes sao completamente ficticios e desaparecem no ROLLBACK final.
INSERT INTO "User" (id,name,email,"passwordHash","updatedAt") VALUES
 ('stage10qa-owner-a','Titular QA A','stage10qa-a@meg.test','QA_DISPOSABLE_ONLY',now()),
 ('stage10qa-owner-b','Titular QA B','stage10qa-b@meg.test','QA_DISPOSABLE_ONLY',now());
INSERT INTO "Workspace" (id,name,slug,"ownerId","updatedAt") VALUES
 ('stage10qa-work-a','Workspace QA A','stage10qa-work-a','stage10qa-owner-a',now()),
 ('stage10qa-work-b','Workspace QA B','stage10qa-work-b','stage10qa-owner-b',now());
INSERT INTO "Account" (id,"userId",name,type,"updatedAt") VALUES
 ('stage10qa-account-a','stage10qa-owner-a','Conta QA A','checking',now()),
 ('stage10qa-benefit-a','stage10qa-owner-a','Beneficio QA A','benefit',now()),
 ('stage10qa-account-b','stage10qa-owner-b','Conta QA B','checking',now());
INSERT INTO "Category" (id,"userId",name,"group",type,"updatedAt") VALUES
 ('stage10qa-market-a','stage10qa-owner-a','Mercado','CONTAS GERAIS','expense',now()),
 ('stage10qa-market-alt-a','stage10qa-owner-a','Mercado','Despesas','expense',now()),
 ('stage10qa-sem-a','stage10qa-owner-a','Sem categoria','CONTAS GERAIS','expense',now()),
 ('stage10qa-fixo-a','stage10qa-owner-a','Fixo','Fixo','expense',now()),
 ('stage10qa-receita-a','stage10qa-owner-a','Receitas','Receitas','income',now()),
 ('stage10qa-market-b','stage10qa-owner-b','Mercado','Despesas','expense',now());
INSERT INTO "PaymentMethod" (id,"userId",name,type,"updatedAt") VALUES
 ('stage10qa-pix-a','stage10qa-owner-a','PIX','instant',now()),
 ('stage10qa-card-a','stage10qa-owner-a','CARTAO QA','other',now()),
 ('stage10qa-vero-a','stage10qa-owner-a','VEROCARD','credit',now()),
 ('stage10qa-pix-b','stage10qa-owner-b','PIX','instant',now());

INSERT INTO "FinancialEvent"
 (id,"userId","workspaceId",description,type,status,date,competence,amount,"signedAmount","sourcePayload","accountId","categoryId","paymentMethodId","archivedAt","updatedAt")
VALUES
 ('stage10qa-e1','stage10qa-owner-a','stage10qa-work-a','Despesa PIX A','expense','paid','2026-11-01','2026-11',21.35,-21.35,'{"category":"Mercado","expenseClass":"CONTAS GERAIS","paymentMethod":"PIX","modality":"À VISTA"}','stage10qa-account-a',NULL,NULL,NULL,now()),
 ('stage10qa-e2','stage10qa-owner-a','stage10qa-work-a','Classe ausente','expense','paid','2026-11-02','2026-11',10.01,-10.01,'{"category":"Mercado","expenseClass":"SEM CLASSIFICAÇÃO","paymentMethod":"PIX","modality":"À VISTA"}','stage10qa-account-a',NULL,NULL,NULL,now()),
 ('stage10qa-e3','stage10qa-owner-a','stage10qa-work-a','Sem categoria literal','expense','paid','2026-11-03','2026-11',4.00,-4.00,'{"category":"Sem categoria","expenseClass":"CONTAS GERAIS","paymentMethod":"PIX","modality":"À VISTA"}','stage10qa-account-a',NULL,NULL,NULL,now()),
 ('stage10qa-e4','stage10qa-owner-a','stage10qa-work-a','Receita nao classificada','income','paid','2026-11-04','2026-11',30.00,30.00,'{"category":"Receitas","expenseClass":"SEM CLASSIFICAÇÃO","paymentMethod":"Não informado","modality":"-"}','stage10qa-account-a',NULL,NULL,NULL,now()),
 ('stage10qa-e5','stage10qa-owner-b','stage10qa-work-b','Outro titular','expense','paid','2026-11-05','2026-11',9.00,-9.00,'{"category":"Mercado","expenseClass":"CONTAS GERAIS","paymentMethod":"PIX","modality":"À VISTA"}','stage10qa-account-b',NULL,NULL,NULL,now()),
 ('stage10qa-e6','stage10qa-owner-a','stage10qa-work-a','Consumo beneficio','expense','paid','2026-11-06','2026-11',17.00,-17.00,'{"category":"Alimentação","expenseClass":"CONTAS GERAIS","paymentMethod":"VEROCARD","modality":"ALIMENTAÇÃO"}','stage10qa-benefit-a',NULL,NULL,NULL,now()),
 ('stage10qa-e7','stage10qa-owner-a','stage10qa-work-a','Cartao historico','expense','paid','2026-11-07','2026-11',12.99,-12.99,'{"category":"Mercado","expenseClass":"CONTAS GERAIS","paymentMethod":"CARTAO QA","modality":"CREDITO"}','stage10qa-account-a',NULL,NULL,NULL,now()),
 ('stage10qa-e8','stage10qa-owner-a','stage10qa-work-a','Fixo precisa regra financeira','expense','planned','2026-11-08','2026-11',100.00,-100.00,'{"category":"Fixo","expenseClass":"Fixo","paymentMethod":"PIX","modality":"À VISTA"}','stage10qa-account-a',NULL,NULL,NULL,now()),
 ('stage10qa-e9','stage10qa-owner-a','stage10qa-work-a','Ja canonico','expense','paid','2026-11-09','2026-11',5.55,-5.55,'{"category":"Mercado","expenseClass":"CONTAS GERAIS","paymentMethod":"PIX","modality":"À VISTA"}','stage10qa-account-a','stage10qa-market-a','stage10qa-pix-a',NULL,now()),
 ('stage10qa-e10','stage10qa-owner-a',NULL,'Arquivado historico','expense','archived','2026-11-10','2026-11',2.00,-2.00,'{"category":"Mercado","expenseClass":"CONTAS GERAIS","paymentMethod":"PIX","modality":"À VISTA"}','stage10qa-account-a',NULL,NULL,now(),now());

INSERT INTO "LedgerEntry" (id,"eventId",date,"accountId",debit,credit,memo) VALUES
 ('stage10qa-ledger-e1','stage10qa-e1','2026-11-01','stage10qa-account-a',0,21.35,'Ficticio'),
 ('stage10qa-ledger-e9','stage10qa-e9','2026-11-09','stage10qa-account-a',0,5.55,'Ficticio');

CREATE TEMP TABLE qa_initial AS
 SELECT id,"userId","workspaceId",description,type,status,date,competence,amount,"signedAmount","sourcePayload","accountId","categoryId","paymentMethodId","archivedAt"
 FROM "FinancialEvent" WHERE id LIKE 'stage10qa-%';
CREATE TEMP TABLE qa_ledger_initial AS
 SELECT id,"eventId",date,"accountId",debit,credit,memo
 FROM "LedgerEntry" WHERE id LIKE 'stage10qa-%';

-- Identificador de candidato NAO equivale a decisao de migracao. Grava-se somente em QA.
CREATE TEMP TABLE qa_category_candidates AS
 SELECT e.id AS event_id, MIN(c.id) AS candidate_id, COUNT(c.id) AS matches
 FROM "FinancialEvent" e LEFT JOIN "Category" c
 ON c."userId"=e."userId" AND c."isActive"=true
 AND c.type=e.type AND lower(btrim(c.name))=lower(btrim(e."sourcePayload"->>'category'))
 AND lower(btrim(c."group"))=lower(btrim(e."sourcePayload"->>'expenseClass'))
 AND lower(btrim(c.name)) NOT IN ('sem categoria','fixo')
 AND lower(btrim(c."group")) <> 'fixo'
 AND lower(btrim(e."sourcePayload"->>'expenseClass')) NOT IN ('sem classificação','sem classificacao')
 WHERE e.id LIKE 'stage10qa-%' AND e."archivedAt" IS NULL AND e."categoryId" IS NULL
 GROUP BY e.id;

DO $$
BEGIN
 IF (SELECT count(*) FROM qa_category_candidates WHERE matches=1) <> 2 THEN
   RAISE EXCEPTION 'QA_CATEGORIES_UNEXPECTED';
 END IF;
 IF (SELECT candidate_id FROM qa_category_candidates WHERE event_id='stage10qa-e1') <> 'stage10qa-market-a'
    OR (SELECT candidate_id FROM qa_category_candidates WHERE event_id='stage10qa-e7') <> 'stage10qa-market-a' THEN
   RAISE EXCEPTION 'QA_CANDIDATE_WRONG';
 END IF;
 IF EXISTS (SELECT 1 FROM qa_category_candidates WHERE event_id IN
  ('stage10qa-e2','stage10qa-e3','stage10qa-e4','stage10qa-e5','stage10qa-e6','stage10qa-e8') AND matches > 0) THEN
   RAISE EXCEPTION 'QA_BLOCKED_CATEGORY_MAPPED';
 END IF;
END $$;

SAVEPOINT qa_before_pilot;
UPDATE "FinancialEvent" e
SET "categoryId"=c.candidate_id
FROM qa_category_candidates c
WHERE e.id=c.event_id AND c.matches=1 AND e."categoryId" IS NULL AND e."archivedAt" IS NULL;

-- Unico pagamento demonstrado: PIX/instant para despesa a vista e conta checking.
UPDATE "FinancialEvent" e SET "paymentMethodId"='stage10qa-pix-a'
WHERE e.id='stage10qa-e1' AND e."paymentMethodId" IS NULL
AND e."sourcePayload"->>'paymentMethod'='PIX' AND e."sourcePayload"->>'modality'='À VISTA';
DO $$
BEGIN
 IF (SELECT "categoryId" FROM "FinancialEvent" WHERE id='stage10qa-e1') <> 'stage10qa-market-a'
 OR (SELECT "paymentMethodId" FROM "FinancialEvent" WHERE id='stage10qa-e1') <> 'stage10qa-pix-a'
 OR (SELECT "paymentMethodId" FROM "FinancialEvent" WHERE id='stage10qa-e7') IS NOT NULL
 OR (SELECT "paymentMethodId" FROM "FinancialEvent" WHERE id='stage10qa-e6') IS NOT NULL
 OR (SELECT "categoryId" FROM "FinancialEvent" WHERE id='stage10qa-e8') IS NOT NULL
 OR (SELECT "categoryId" FROM "FinancialEvent" WHERE id='stage10qa-e9') <> 'stage10qa-market-a'
 OR (SELECT "workspaceId" FROM "FinancialEvent" WHERE id='stage10qa-e10') IS NOT NULL THEN
  RAISE EXCEPTION 'QA_PILOT_INVARIANTS_FAILED';
 END IF;
 IF EXISTS ((SELECT id,"userId","workspaceId",description,type,status,date,competence,amount,"signedAmount","sourcePayload","accountId","archivedAt" FROM qa_initial
   EXCEPT SELECT id,"userId","workspaceId",description,type,status,date,competence,amount,"signedAmount","sourcePayload","accountId","archivedAt" FROM "FinancialEvent" WHERE id LIKE 'stage10qa-%')
   UNION ALL
   (SELECT id,"userId","workspaceId",description,type,status,date,competence,amount,"signedAmount","sourcePayload","accountId","archivedAt" FROM "FinancialEvent" WHERE id LIKE 'stage10qa-%'
   EXCEPT SELECT id,"userId","workspaceId",description,type,status,date,competence,amount,"signedAmount","sourcePayload","accountId","archivedAt" FROM qa_initial))
 THEN RAISE EXCEPTION 'QA_FINANCIAL_FIELDS_CHANGED'; END IF;
 IF EXISTS (
   SELECT id,"eventId",date,"accountId",debit,credit,memo FROM qa_ledger_initial
   EXCEPT SELECT id,"eventId",date,"accountId",debit,credit,memo FROM "LedgerEntry" WHERE id LIKE 'stage10qa-%'
 ) THEN RAISE EXCEPTION 'QA_LEDGER_CHANGED'; END IF;
END $$;
ROLLBACK TO SAVEPOINT qa_before_pilot;

DO $$
BEGIN
 IF EXISTS (
   SELECT id,"categoryId","paymentMethodId" FROM qa_initial
   EXCEPT SELECT id,"categoryId","paymentMethodId" FROM "FinancialEvent" WHERE id LIKE 'stage10qa-%'
 ) THEN RAISE EXCEPTION 'QA_ROLLBACK_NOT_EFFECTIVE'; END IF;
END $$;

-- Idempotencia: primeira execucao atualiza 2; segunda, nenhum.
UPDATE "FinancialEvent" e SET "categoryId"=c.candidate_id
FROM qa_category_candidates c
WHERE e.id=c.event_id AND c.matches=1 AND e."categoryId" IS NULL AND e."archivedAt" IS NULL;
DO $$
DECLARE n integer;
BEGIN
 UPDATE "FinancialEvent" e SET "categoryId"=c.candidate_id
 FROM qa_category_candidates c
 WHERE e.id=c.event_id AND c.matches=1 AND e."categoryId" IS NULL AND e."archivedAt" IS NULL;
 GET DIAGNOSTICS n = ROW_COUNT;
 IF n <> 0 THEN RAISE EXCEPTION 'QA_NOT_IDEMPOTENT: %',n; END IF;
END $$;
SELECT 'MEG_STAGE10_QA_POSTGRES17_ROLLBACK_IDEMPOTENCE_FINANCIAL_FIELDS_PASS' AS resultado;
ROLLBACK;
