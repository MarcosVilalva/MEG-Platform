import {prisma} from '@meg/database';
import {createStage10ReadOnlyApp} from './stage10-readonly-app';
import {assertStage10ReadOnlyDatabaseRole} from './stage10-readonly-db-guard';

/**
 * Entry point exclusivamente de QA opt-in. Nao substitui server.ts.
 * Deve usar usuario PostgreSQL sem INSERT/UPDATE/DELETE, CREATE ou TRUNCATE.
 * A verificacao ocorre ANTES de abrir a porta. Sem db:push/migrate.
 */
if(process.env.MEG_STAGE10_READONLY_SERVER_ENABLED!=='true')
 throw new Error('STAGE10_READONLY_SERVER_NOT_ENABLED');
if(process.env.NODE_ENV!=='production')
 throw new Error('STAGE10_READONLY_SERVER_PRODUCTION_CONFIG_REQUIRED');
const origin=process.env.MEG_STAGE10_QA_PREVIEW_ORIGIN;
if(!origin)throw new Error('STAGE10_QA_PREVIEW_ORIGIN_REQUIRED');
// A entrada de servidor somente admite chave PUBLICA RS256 configurada.
// JWT_SECRET canonico nao e consultado nem encaminhado ao app QA.
const publicKeyPem=process.env.MEG_STAGE10_QA_JWT_PUBLIC_KEY_PEM;
const issuer=process.env.MEG_STAGE10_QA_JWT_ISSUER;
const audience=process.env.MEG_STAGE10_QA_JWT_AUDIENCE;
if(!publicKeyPem||!issuer||!audience)
 throw new Error('STAGE10_PUBLIC_JWT_CONFIGURATION_REQUIRED');
const port=Number(process.env.PORT||3333);
if(!Number.isSafeInteger(port)||port<1||port>65535)
 throw new Error('STAGE10_READONLY_PORT_INVALID');

let app:Awaited<ReturnType<typeof createStage10ReadOnlyApp>>|undefined;
try{
 await assertStage10ReadOnlyDatabaseRole(prisma);
 app=await createStage10ReadOnlyApp(origin,{publicKeyPem,issuer,audience});
 await app.listen({host:process.env.HOST||'0.0.0.0',port});
}catch(error){
 await app?.close();
 await prisma.$disconnect();
 throw error;
}
