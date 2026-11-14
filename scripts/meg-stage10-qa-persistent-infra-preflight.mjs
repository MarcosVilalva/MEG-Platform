import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

/**
 * Offline, fail-closed gate. This only verifies the proposed deployment profile
 * and repo isolation: it NEVER creates Render resources or connects to databases.
 */
const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const spec=JSON.parse(read('docs/MEG-STAGE10-QA-PERSISTENT-INFRA-PROFILE-20261114.json'));
assert.equal(spec.schemaVersion,1);
assert.equal(spec.stage,10);
assert.equal(spec.repository,'MarcosVilalva/MEG-Platform');
assert.equal(spec.branch,'stage08/unified-qa-stage05-08-10-20261112');
assert.equal(spec.status,'DESIGN_ONLY_NOT_AUTHORIZED_FOR_DEPLOY');
assert.equal(spec.render.proposedWebAutoDeploy,'off');
assert.equal(spec.render.actualQaFrontendType,'static_site');
assert.equal(spec.render.useExistingServices,false);
assert.equal(spec.render.proposedDatabaseName,'meg_stage10_qa_synthetic');
assert.equal(spec.render.confirmedWorkspacePlan,null);
assert.equal(spec.render.proposedDatabaseExpiresAfterDays,30);
for(const [key,value] of Object.entries(spec.prohibitions)){
 assert.equal(value,false,'Bloqueio obrigatório violado: '+key);
}
assert.equal(spec.requirements.includes('explicit-cost-approval'),true);
assert.equal(spec.requirements.includes('qa-database-with-synthetic-data-only'),true);
const blueprint=read('render.yaml');
assert.match(blueprint,/name: meg-platform-api/,'render.yaml mantém a API principal como serviço histórico');
assert.doesNotMatch(blueprint,/name:\s*meg-stage10-readonly-preview-qa/,'Proibido provisionar QA pelo blueprint produtivo');
assert.doesNotMatch(blueprint,/meg_stage10_qa_synthetic/,'Proibido acoplar QA ao blueprint da API principal');
const server=read('apps/api/src/server.ts');
assert.doesNotMatch(server,/stage10-qa-readonly-loopback|batch-edit-preview-http-contract|registerStage10BatchPreviewReadContract/,
 'Nenhuma rota QA deve ser registrada no servidor principal');
const loopback=read('apps/api/src/modules/finance/stage10-qa-readonly-loopback.ts');
for(const marker of [
 'STAGE10_QA_DISPOSABLE_ONLY',
 "env.MEG_STAGE10_ISOLATED_PG!=='1'",
 "env.MEG_STAGE10_QA_HTTP_ENABLED!=='1'",
 "env.NODE_ENV!=='test'",
 "host:'127.0.0.1',port:0",
]){
 assert.ok(loopback.includes(marker),'Guarda de loopback ausente: '+marker);
}
const adapter=read('apps/api/src/modules/finance/batch-edit-preview-adapter.ts');
assert.ok(adapter.includes("SET TRANSACTION READ ONLY"),'Transação PostgreSQL deve ser read-only');
assert.ok(adapter.includes('Prisma.TransactionIsolationLevel.RepeatableRead'),
 'A leitura deve preservar isolamento de snapshot');
const run=read('.github/workflows/meg-stage10-financial-readonly.yml');
assert.ok(run.includes('MEG_STAGE10_ISOLATED_PG:'),'Runner precisa exigir DB descartável');
assert.ok(run.includes('MEG_STAGE10_QA_HTTP_ENABLED:'),'Runner precisa habilitar loopback explicitamente');
assert.ok(run.includes('stage10-qa-readonly-loopback.isolated.test.ts'),
 'Teste HTTP real de loopback obrigatório');
console.log('MEG_STAGE10_QA_PERSISTENT_INFRA_PREFLIGHT PASS: design only, no deploy permission');
