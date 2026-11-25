-- #699 | Etapa 10 | PostgreSQL 17 | uso exclusivamente QA descartavel.
-- O conteudo do recibo pode ser expurgado; a chave da operacao NAO.
-- Regras existentes: UNIQUE(workspaceId,operationId) e erro OPERATION_ID_REUSED.
-- Nao executar em producao; requer revisao de retencao/LGPD e plano de rollout.
--
-- Este guard e instalado SOMENTE apos verificar schema/host/usuario no runner QA.
-- Excluir Workspace deve continuar efetuando CASCADE integral dos marcadores.

CREATE OR REPLACE FUNCTION meg_stage10_cloud_receipt_preserve_operation_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Nunca restaure o marcador se a workspace estiver sendo excluida
  -- (onDelete:Cascade). A eliminacao integral da conta continua possivel.
  IF NOT EXISTS (SELECT 1 FROM "Workspace" WHERE "id" = OLD."workspaceId") THEN
    RETURN NULL;
  END IF;

  -- A exclusao FISICA do recibo e sucedida atomicamente pela insercao
  -- da identidade minima, sem corpo, resultado, tipo real ou hash original.
  -- A unicidade workspaceId+operationId permanece; uma colisao deve abortar,
  -- nunca ser ignorada, inclusive sob concorrencia ou reexecucao.
  INSERT INTO "CloudMutationReceipt" (
    "id", "workspaceId", "operationId", "requestHash",
    "mutationType", "revision", "response", "createdAt", "expiresAt"
  ) VALUES (
    OLD."id", OLD."workspaceId", OLD."operationId",
    '__MEG_PURGED_OPERATION_ID__', 'PURGED_OPERATION_ID',
    0, '{}'::jsonb, OLD."createdAt", '9999-12-31T00:00:00Z'::timestamp
  );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS meg_stage10_receipt_purge_guard
  ON "CloudMutationReceipt";

CREATE TRIGGER meg_stage10_receipt_purge_guard
AFTER DELETE ON "CloudMutationReceipt"
FOR EACH ROW EXECUTE FUNCTION meg_stage10_cloud_receipt_preserve_operation_id();

-- Protecao contra reativacao do marcador por um UPDATE incorreto.
CREATE OR REPLACE FUNCTION meg_stage10_cloud_receipt_no_unpurge()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."requestHash" = '__MEG_PURGED_OPERATION_ID__'
     AND (NEW."requestHash" IS DISTINCT FROM OLD."requestHash"
       OR NEW."response" IS DISTINCT FROM OLD."response"
       OR NEW."mutationType" IS DISTINCT FROM OLD."mutationType") THEN
    RAISE EXCEPTION 'OPERATION_ID_REUSED';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS meg_stage10_receipt_no_unpurge
  ON "CloudMutationReceipt";

CREATE TRIGGER meg_stage10_receipt_no_unpurge
BEFORE UPDATE ON "CloudMutationReceipt"
FOR EACH ROW EXECUTE FUNCTION meg_stage10_cloud_receipt_no_unpurge();
