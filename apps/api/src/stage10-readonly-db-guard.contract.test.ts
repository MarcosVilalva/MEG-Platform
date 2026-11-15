import assert from 'node:assert/strict';
import {assertStage10ReadOnlyDatabaseRole} from './stage10-readonly-db-guard';

/**
 * Teste de contrato puro, sem PostgreSQL, conexao, migracao ou fixture financeira.
 * Confirma o fail-closed do guard, mas NAO substitui teste RLS entre tenants.
 */
type Row={
 databaseCreate:boolean;databaseTemporary:boolean;schemaCreate:boolean;
 tableWrite:boolean;sequenceWrite:boolean;privilegedRole:boolean;
 sessionReadOnly:boolean;unsafeRlsReadPolicy:boolean;
};
const safe:Row={
 databaseCreate:false,databaseTemporary:false,schemaCreate:false,
 tableWrite:false,sequenceWrite:false,privilegedRole:false,
 sessionReadOnly:true,unsafeRlsReadPolicy:false,
};
let sql='';
function check(row:Row){
 const fake={
  async $queryRaw(strings:TemplateStringsArray){
   sql=String.raw({raw:strings});
   return [row];
  },
 } as unknown as Parameters<typeof assertStage10ReadOnlyDatabaseRole>[0];
 return assertStage10ReadOnlyDatabaseRole(fake);
}
await assert.doesNotReject(check({...safe}));
assert.match(sql,/NOT c\.relrowsecurity/,'RLS desligada deve bloquear');
assert.match(sql,/p\.polcmd IN \('r','\*'\)/,'Policy SELECT exigida');
assert.match(sql,/p\.polqual IS NULL/,'Policy sem USING deve bloquear');
assert.match(sql,/pg_get_expr\(p\.polqual,p\.polrelid\)/,'USING(true) deve ser inspecionado');
assert.match(sql,/\^true\(\?:::/,'Expressao constante verdadeira deve bloquear');
assert.match(sql,/<> 13/,'Tabelas canonicas devem existir');
for(const key of [
 'databaseCreate','databaseTemporary','schemaCreate','tableWrite',
 'sequenceWrite','privilegedRole','unsafeRlsReadPolicy',
] as const){
 await assert.rejects(check({...safe,[key]:true}),
  /STAGE10_DATABASE_ROLE_NOT_READ_ONLY/,key);
}
await assert.rejects(check({...safe,sessionReadOnly:false}),
 /STAGE10_DATABASE_ROLE_NOT_READ_ONLY/);
console.log('STAGE10_RLS_UNRESTRICTED_QA_ROLE_GATE_SYNTHETIC PASS');
