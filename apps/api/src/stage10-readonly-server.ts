import {prisma} from '@meg/database';
import {createStage10ReadOnlyApp} from './stage10-readonly-app';

/**
 * Entry point exclusivamente de QA opt-in. Nao substitui server.ts.
 * Deve usar usuario PostgreSQL sem INSERT/UPDATE/DELETE, CREATE ou TRUNCATE.
 * A verificacao ocorre ANTES de abrir a porta. Sem db:push/migrate.
 */
async function assertDatabaseRoleIsReadOnly(){
 const rows=await prisma.$queryRaw<Array<{
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

if(process.env.MEG_STAGE10_READONLY_SERVER_ENABLED!=='true')
 throw new Error('STAGE10_READONLY_SERVER_NOT_ENABLED');
const origin=process.env.MEG_STAGE10_QA_PREVIEW_ORIGIN;
if(!origin)throw new Error('STAGE10_QA_PREVIEW_ORIGIN_REQUIRED');
const port=Number(process.env.PORT||3333);
if(!Number.isSafeInteger(port)||port<1||port>65535)
 throw new Error('STAGE10_READONLY_PORT_INVALID');

let app:Awaited<ReturnType<typeof createStage10ReadOnlyApp>>|undefined;
try{
 await assertDatabaseRoleIsReadOnly();
 app=await createStage10ReadOnlyApp(origin);
 await app.listen({host:process.env.HOST||'0.0.0.0',port});
}catch(error){
 await app?.close();
 await prisma.$disconnect();
 throw error;
}
