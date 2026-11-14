import type {PrismaClient} from '@meg/database';

/**
 * Comprova privilegios efetivos do usuario de conexao ANTES de abrir a API QA.
 * O bloqueio transacional do snapshot continua sendo a segunda barreira.
 * Nao cria roles, modifica grants nem realiza DDL.
 */
export async function assertStage10ReadOnlyDatabaseRole(db:Pick<PrismaClient,'$queryRaw'>){
 const rows=await db.$queryRaw<Array<{
  databaseCreate:boolean;schemaCreate:boolean;tableWrite:boolean;
 }>>`
  SELECT
    has_database_privilege(current_user,current_database(),'CREATE') AS "databaseCreate",
    has_schema_privilege(current_user,current_schema(),'CREATE') AS "schemaCreate",
    EXISTS (
      SELECT 1 FROM pg_tables t
      WHERE t.schemaname=current_schema()
        AND (
          has_table_privilege(current_user,format('%I.%I',t.schemaname,t.tablename),'INSERT')
          OR has_table_privilege(current_user,format('%I.%I',t.schemaname,t.tablename),'UPDATE')
          OR has_table_privilege(current_user,format('%I.%I',t.schemaname,t.tablename),'DELETE')
          OR has_table_privilege(current_user,format('%I.%I',t.schemaname,t.tablename),'TRUNCATE')
        )
    ) AS "tableWrite"
 `;
 if(rows.length!==1||rows[0].databaseCreate||rows[0].schemaCreate||rows[0].tableWrite)
  throw new Error('STAGE10_DATABASE_ROLE_NOT_READ_ONLY');
}
