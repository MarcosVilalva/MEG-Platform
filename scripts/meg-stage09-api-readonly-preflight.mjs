#!/usr/bin/env node
/**
 * Etapa 09: bloqueio fail-closed de publicação de API somente-leitura.
 * Executar com MEG_API_RENDER_BUILD_COMMAND contendo o build REAL configurado
 * no Render. Não invoca API Render, Prisma nem altera dados.
 */
const buildCommand=process.env.MEG_API_RENDER_BUILD_COMMAND;
export function validateReadOnlyBuild(command){
 const failures=[];
 if(!command||!command.trim()){
  failures.push('BUILD_COMMAND_NOT_PROVIDED');
  return failures;
 }
 const unsafe=[
  [/\bdb:prepare:production\b/i,'PREPARE_PRODUCTION_CAN_DELETE_ROWS'],
  [/\bdb:push(?::production)?\b/i,'PRISMA_DB_PUSH_NOT_ALLOWED'],
  [/\bprisma\s+db\s+push\b/i,'PRISMA_DB_PUSH_NOT_ALLOWED'],
  [/\baccept-data-loss\b/i,'ACCEPT_DATA_LOSS_FORBIDDEN'],
  [/\bdb:migrate\b|\bprisma\s+migrate\b/i,'MIGRATION_NOT_ALLOWED_IN_READONLY_DEPLOY'],
  [/\bdb:seed\b|\bprisma\s+db\s+seed\b/i,'SEED_NOT_ALLOWED_IN_READONLY_DEPLOY'],
  [/\btsx\s+prisma\/(?:prepare-production|ensure-performance-indexes)\.ts\b/i,'PRODUCTION_DB_MUTATION_NOT_ALLOWED'],
 ];
 for(const [pattern,code] of unsafe)if(pattern.test(command)&&!failures.includes(code))failures.push(code);
 if(!/\bdb:generate\b/.test(command))failures.push('PRISMA_GENERATE_REQUIRED');
 if(!/\bbuild:api\b/.test(command))failures.push('API_BUILD_REQUIRED');
 return failures;
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const errors=validateReadOnlyBuild(buildCommand);
 if(errors.length){
  console.error('STAGE09_API_RELEASE_BLOCKED: '+errors.join(', '));
  process.exitCode=1;
 }else{
  console.log('STAGE09_API_BUILD_PREFLIGHT_PASS: comando não contém mutações de banco conhecidas.');
  console.log('A aprovação deste preflight NÃO autoriza deploy, merge ou acesso a dados reais.');
 }
}
