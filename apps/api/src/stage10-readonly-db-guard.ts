import type {PrismaClient} from '@meg/database';

/**
 * Bloqueia a API QA antes de ouvir requests caso a conexao nao seja
 * efetivamente somente leitura. Nao assume que grants sobre public bastam:
 * verifica todos os schemas nao-sistema, heranca de privilegios e configuracao
 * da sessao. Recusa RLS desligada, SELECT sem policy e USING(true) em public.
 * Isto nao comprova isolamento entre tenants: publicacao permanece dependente
 * de auditoria de policies e testes de nao vazamento. Nao executa DDL.
 */
export async function assertStage10ReadOnlyDatabaseRole(db:Pick<PrismaClient,'$queryRaw'>){
 const rows=await db.$queryRaw<Array<{
  databaseCreate:boolean;
  databaseTemporary:boolean;
  schemaCreate:boolean;
  tableWrite:boolean;
  sequenceWrite:boolean;
  privilegedRole:boolean;
  sessionReadOnly:boolean;
  unsafeRlsReadPolicy:boolean;
 }>>`
  SELECT
    has_database_privilege(current_user,current_database(),'CREATE') AS "databaseCreate",
    has_database_privilege(current_user,current_database(),'TEMP') AS "databaseTemporary",
    EXISTS (
      SELECT 1 FROM pg_namespace n
      WHERE n.nspname NOT IN ('pg_catalog','information_schema')
        AND n.nspname NOT LIKE 'pg_toast%'
        AND n.nspname NOT LIKE 'pg_temp_%'
        AND has_schema_privilege(current_user,n.oid,'CREATE')
    ) AS "schemaCreate",
    EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname NOT IN ('pg_catalog','information_schema')
        AND n.nspname NOT LIKE 'pg_toast%'
        AND n.nspname NOT LIKE 'pg_temp_%'
        AND c.relkind IN ('r','p','v','m','f')
        AND (
          has_table_privilege(current_user,c.oid,'INSERT')
          OR has_table_privilege(current_user,c.oid,'UPDATE')
          OR has_table_privilege(current_user,c.oid,'DELETE')
          OR has_table_privilege(current_user,c.oid,'TRUNCATE')
        )
    ) AS "tableWrite",
    EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname NOT IN ('pg_catalog','information_schema')
        AND n.nspname NOT LIKE 'pg_toast%'
        AND n.nspname NOT LIKE 'pg_temp_%'
        AND c.relkind='S'
        AND has_sequence_privilege(current_user,c.oid,'UPDATE')
    ) AS "sequenceWrite",
    EXISTS (
      SELECT 1 FROM pg_roles r
      WHERE r.rolname=current_user
        AND (r.rolsuper OR r.rolcreaterole OR r.rolcreatedb
             OR r.rolreplication OR r.rolbypassrls)
    ) AS "privilegedRole",
    current_setting('transaction_read_only')='on' AS "sessionReadOnly",
    (
      /* Ausencia de qualquer tabela canonica e falha fechada. */
      (SELECT count(*)
       FROM pg_class c
       JOIN pg_namespace n ON n.oid=c.relnamespace
       WHERE n.nspname='public' AND c.relkind IN ('r','p')
         AND c.relname IN ('User','AuthSession','Workspace','WorkspaceMember',
           'FinancialEvent','Account','Category','PaymentMethod','CreditCard',
           'CardPurchase','CardInstallment','ImportedRow','LedgerEntry')) <> 13
      OR EXISTS (
       SELECT 1 FROM pg_class c
       JOIN pg_namespace n ON n.oid=c.relnamespace
       WHERE n.nspname='public' AND c.relkind IN ('r','p')
         AND (
           NOT c.relrowsecurity
           OR NOT EXISTS (
             SELECT 1 FROM pg_policy p
             WHERE p.polrelid=c.oid AND p.polcmd IN ('r','*')
           )
           OR EXISTS (
             SELECT 1 FROM pg_policy p
             WHERE p.polrelid=c.oid AND p.polcmd IN ('r','*')
               AND (
                 p.polqual IS NULL
                 OR regexp_replace(
                   lower(pg_get_expr(p.polqual,p.polrelid)),
                   '[[:space:]()]','','g'
                 ) ~ '^true(?:::boolean|::bool)?$'
               )
           )
         )
      )
    ) AS "unsafeRlsReadPolicy"
 `;
 const row=rows[0];
 if(rows.length!==1||!row||row.databaseCreate||row.databaseTemporary||
    row.schemaCreate||row.tableWrite||row.sequenceWrite||
    row.privilegedRole||!row.sessionReadOnly||row.unsafeRlsReadPolicy)
  throw new Error('STAGE10_DATABASE_ROLE_NOT_READ_ONLY');
}
