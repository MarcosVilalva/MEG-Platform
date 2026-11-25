import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';

const root='/home/m_vil/meg-stage11-web-clean-20261125';
process.chdir(root);
const base='apps/api/src/modules/finance/';
const source='refs/remotes/origin/source-706';
const rlsSource='refs/remotes/origin/source-708';
const baseline='28703a95310c9b9b5f193ef4f3a0cbe80e121f07';
const cmd=(args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:12*1024*1024}).trimEnd();
if(cmd(['rev-parse','HEAD'])!==baseline) throw Error('BASELINE_HEAD_CHANGED');
if(cmd(['branch','--show-current'])!=='stage11/web-foundation-clean-20261125')throw Error('WRONG_BRANCH');
const src=(p,ref=source)=>execFileSync('git',['show',ref+':'+p],{encoding:'utf8',maxBuffer:12*1024*1024});
const own=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const replace=(s,old,neo,label,count=1)=>{
  const found=s.split(old).length-1;
  if(found!==count)throw Error('ANCHOR_COUNT_'+label+'_'+found);
  return s.replaceAll(old,neo);
};
const extract=(s,first,last,label,from=0)=>{
  const a=s.indexOf(first,from),b=s.indexOf(last,a+1);
  if(a<0||b<0)throw Error('SOURCE_BOUNDS_'+label);
  return s.slice(a,b);
};
const stage={}; const add=(p,c)=>stage[p]=c;
const audit=base+'audit.ts',mono=base+'monetary-protection.ts',ev=base+'event-mutation.ts',service=base+'service.ts',routes=base+'routes.ts';
add(audit,replace(own(audit),"  | 'FINANCIAL_EVENT_CREATED'","  | 'FINANCIAL_EVENT_CREATED'\n  | 'FINANCIAL_EVENT_DUPLICATE_SUSPECTED'\n  | 'FINANCIAL_EVENT_SUSPICION_RESOLVED'\n  | 'FINANCIAL_EVENT_SUSPICION_REVERSED'\n  | 'FINANCIAL_EVENT_REVIEW_COUNTERENTRY'\n  | 'FINANCIAL_EVENT_REVIEW_COUNTERENTRY_UNDONE'",'AUDIT'));
add(mono,src(mono));
const ws='apps/api/src/modules/workspaces/service.ts';
let w=own(ws);
w=replace(w,'export async function resolveWorkspaceContext(userId: string) {','export async function resolveWorkspaceContext(userId: string, options: { allowLegacyBootstrap?: boolean } = {}) {','WS_SIG');
w=replace(w,'  if (!membership) {\n    await ensurePrimaryWorkspace();','  if (!membership && options.allowLegacyBootstrap !== false) {\n    await ensurePrimaryWorkspace();','WS_GUARD');
add(ws,w);
let em=own(ev),sEm=src(ev);
em=replace(em,"import { isBenefitPaymentMethod, isPostedFinancialStatus, resolveCanonicalFinancialStatus } from './financial-policy';","import { isBenefitPaymentMethod, isMonetaryAccountType, isPostedFinancialStatus, resolveCanonicalFinancialStatus } from './financial-policy';",'EVENT_POLICY_IMPORT');
em=replace(em,"import { SEMANTIC_DUPLICATE_WINDOW_MS, findRecentFinancialEventDuplicate, serializableFinancialTransaction } from './monetary-protection';","import { findRecentFinancialEventDuplicate, financialEventSuspicionFingerprint, monetaryAccountDebitWindow, serializableFinancialTransaction } from './monetary-protection';",'EVENT_MON_IMPORT');
em=replace(em,'export async function createFinancialEventProtected(userId: string, input: CreateFinancialEventMutationInput) {','export async function createFinancialEventProtected(userId: string, input: CreateFinancialEventMutationInput, expectedWorkspaceId?: string) {','EVENT_SIG');
em=replace(em,'  const workspace = await resolveWorkspaceContext(userId);\n  const dataOwnerId = workspace.workspace.ownerId;',
'  const workspace = await resolveWorkspaceContext(userId,\n    expectedWorkspaceId ? { allowLegacyBootstrap: false } : {});\n  if (expectedWorkspaceId && workspace.workspaceId !== expectedWorkspaceId) {\n    throw new FinancialEventMutationError(\'WORKSPACE_CONTEXT_CHANGED\');\n  }\n  const dataOwnerId = workspace.workspace.ownerId;','EVENT_WORKSPACE');
const block=extract(sEm,'      // #699 Phase A: similarity','      // The second path','EVENT_SIMILARITY');
const pos=em.indexOf('      if (!input.allowDuplicate) {'),end=em.indexOf('      const event = await tx.financialEvent.create({',pos);
if(pos<0||end<0)throw Error('BASELINE_SIMILARITY_BOUNDS');
em=em.slice(0,pos)+block+em.slice(end);
const audBlock=extract(sEm,'      if (duplicate) {','      const response = {','EVENT_BILATERAL',sEm.indexOf("action: 'FINANCIAL_EVENT_CREATED'"));
em=replace(em,'      const response = { ...result, idempotentReplay: false };',audBlock+'      const response = { ...result, idempotentReplay: false };','EVENT_AUDIT');
em=replace(em,'    });\n  } catch (error) {','    }, { maxAttempts: 12, retryDelayMs: 35 });\n  } catch (error) {','EVENT_RETRY');
add(ev,em);
let se=own(service),sSe=src(service);
se=replace(se,"import { recordFinancialAudit } from './audit';","import { recordFinancialAudit } from './audit';\nimport { assertA17GenericMutationAllowed } from './suspected-duplicates-review';",'SERVICE_IMPORT');
se=replace(se,"    if (!current) throw new Error('FINANCIAL_EVENT_NOT_FOUND');\n    if (current.receipt && !current.receipt.reversedAt)","    if (!current) throw new Error('FINANCIAL_EVENT_NOT_FOUND');\n    await assertA17GenericMutationAllowed(tx, current);\n    if (current.receipt && !current.receipt.reversedAt)",'SERVICE_GUARDS',2);
const rev=extract(sSe,'    // A direct paid -> planned','    await validateActiveReferences','SERVICE_REVERSAL');
se=replace(se,'    await validateActiveReferences(tx, dataOwnerId, input);\n\n    const nextType =',rev+'    await validateActiveReferences(tx, dataOwnerId, input);\n\n    const nextType =','SERVICE_REVERSAL_INSERT');
add(service,se);
let ro=own(routes),sRo=src(routes);
ro=replace(ro,"import { listFinancialAudit } from './audit';","import { listFinancialAudit } from './audit';\nimport { listSuspectedDuplicateFinancialEvents } from './suspected-duplicates-read';\nimport { A17ReviewError, resolveSuspectedFinancialEvent, undoSuspectedFinancialEventResolution } from './suspected-duplicates-review';",'ROUTE_IMPORT');
ro=replace(ro,'const readRoles =',extract(sRo,'const a17CommandBase =','const readRoles =','A17_DEFINITIONS')+'const readRoles =','ROUTE_SCHEMA');
ro=replace(ro,'const operationIdSchema = z.string().trim().min(8).max(128).optional();','const operationIdSchema = z.string().trim().min(8).max(128).optional();\nconst expectedWorkspaceHeaderSchema = z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/).optional();','ROUTE_HEADER');
ro=replace(ro,'function eventError(reply: FastifyReply, error: unknown) {\n','function eventError(reply: FastifyReply, error: unknown) {\n  if (error instanceof A17ReviewError) return a17Error(reply, error);\n','ROUTE_ERROR');
ro=replace(ro,"['OPERATION_ID_REUSED', 'POSSIBLE_DUPLICATE']","['OPERATION_ID_REUSED', 'POSSIBLE_DUPLICATE', 'WORKSPACE_CONTEXT_CHANGED']",'ROUTE_CONFLICT');
ro=replace(ro,"  app.get('/events',",extract(sRo,'  // A17 intentionally defaults OFF.',"  app.get('/events',",'ROUTE_A17_BLOCK')+"  app.get('/events',",'ROUTE_A17_INSERT');
const oldPost="    const parsed = createEventRequestSchema.safeParse(request.body);\n    if (!parsed.success) return validationError(reply, parsed.error.flatten());\n    try {\n      return reply.code(201).send(await createFinancialEventProtected(request.user.sub, parsed.data));";
const newPost="    const parsed = createEventRequestSchema.safeParse(request.body);\n    const expected = expectedWorkspaceHeaderSchema.safeParse(request.headers['x-meg-expected-workspace-id']);\n    if (!parsed.success || !expected.success) return validationError(reply, {\n      body: parsed.success ? undefined : parsed.error.flatten(),\n      workspaceHeader: expected.success ? undefined : expected.error.flatten(),\n    });\n    try {\n      return reply.code(201).send(await createFinancialEventProtected(request.user.sub, parsed.data, expected.data));";
ro=replace(ro,oldPost,newPost,'ROUTE_POST');
add(routes,ro);
for(const n of ['suspected-duplicates-read.ts','suspected-duplicates-review.ts','stage10-issue699-phase-a-http-pg17.disposable.test.ts','stage10-issue699-a17-review.pg17.disposable.test.ts'])add(base+n,src(base+n));
add('packages/database/prisma/schema.prisma',src('packages/database/prisma/schema.prisma'));
add('packages/database/prisma/supabase-rls-hardening.sql',src('packages/database/prisma/supabase-rls-hardening.sql',rlsSource));
const doc=[
'# MEG Stage11 | Fundação Web limpa | Fase A #699 e RLS #707',
'',
'Data: 25/11/2026. Status: candidata ISOLADA e NÃO HOMOLOGADA.',
'Parent único: main@28703a95310c9b9b5f193ef4f3a0cbe80e121f07.',
'Origem Fase A: PR #706, commit ca7560243856bbfee72384ea739847be1fb090f1.',
'Origem RLS: PR #708, commit 3612bb5c7ba9d691e2c842574214a3e2f5ec08f4, blob 12d16bc4c7b6991add4f4e38c8263953952824a4.',
'',
'## Proveniência por arquivo',
'',
'| Arquivo | Origem | Justificativa |',
'|---|---|---|',
'| apps/api/src/modules/finance/event-mutation.ts | #706, trechos Fase A sem QA mirror | Novo operationId não é bloqueado por semelhança; detecção bilateral e débito seguro |',
'| apps/api/src/modules/finance/monetary-protection.ts | #706, funções financeiras | Janela de saldo retroativo e fingerprint canônico |',
'| apps/api/src/modules/finance/audit.ts | #706, cinco ações novas | Tipagem da auditoria Fase A/A17 |',
'| apps/api/src/modules/finance/routes.ts | #706, rotas GET suspeitas e POST A17 condicionais, header workspace | HTTP autenticado, revisão OFF por padrão |',
'| apps/api/src/modules/finance/suspected-duplicates-read.ts | #706, integral | Leitura por workspace e paginação |',
'| apps/api/src/modules/finance/suspected-duplicates-review.ts | #706, integral | Decisão auditada e reversão |',
'| apps/api/src/modules/finance/service.ts | #706, guardas de edição e exclusão | Preservação do ledger e das contrapartidas |',
'| apps/api/src/modules/workspaces/service.ts | #706, allowLegacyBootstrap false | Impedir bootstrap automático durante revisão e leitura |',
'| packages/database/prisma/schema.prisma | #706/#708, CardLimitControl | Schema exigido pelo SQL RLS |',
'| packages/database/prisma/supabase-rls-hardening.sql | #708, integral | RLS/REVOKE CardLimitControl e EXECUTE de funções |',
'| apps/api/src/modules/finance/stage10-issue699-phase-a-http-pg17.disposable.test.ts | #706, integral e inalterado | Teste de caracterização original Fase A |',
'| apps/api/src/modules/finance/stage10-issue699-a17-review.pg17.disposable.test.ts | #706, integral e inalterado | Teste de caracterização original A17 |',
'',
'## Delimitação e gates',
'',
'Não importados: QA mirror, edição/arquivamento sintéticos da Etapa 10, histórico filtrado, Home commitments e seus módulos; nenhum Android; nenhum merge de branches históricas.',
'A matriz A01–A18 anterior NÃO transfere aprovação para esta candidata. Reexecutar os testes antes de qualquer decisão; A15/A16 antigos incluem APKs de versões Android históricas e não comprovam integração Web atual.',
'O endpoint A17 só é registrado quando MEG_STAGE10_ISSUE699_A17_REVIEW_ENABLED=1. Padrão OFF.',
'NÃO aplicar SQL em banco protegido. NÃO deploy/merge/ativação. Issues #699/#707 e PRs #705/#706/#708 continuam abertas/Draft.',
''];
add('docs/MEG-STAGE11-WEB-CLEAN-ISSUE699-PROVENANCE.md',doc.join('\n'));
for(const [p,c] of Object.entries(stage)){
 if(!c||c.length<100)throw Error('INVALID_FILE_'+p);
 const out=path.join(root,p);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,c);
}
const temporary=path.join(root,'docs/MEG-STAGE11-SOURCE-CHECK.txt');
if(fs.existsSync(temporary)&&fs.readFileSync(temporary,'utf8').startsWith('Fonte local de trabalho: main@'))fs.unlinkSync(temporary);
console.log('STAGE11_PORT_FILES='+Object.keys(stage).length);
console.log('STAGE11_RLS_IDENTICAL='+String(stage['packages/database/prisma/supabase-rls-hardening.sql'].includes('public."CardLimitControl"')));
console.log('STAGE11_A17_DEFAULT_OFF='+String(stage[routes].includes("process.env.MEG_STAGE10_ISSUE699_A17_REVIEW_ENABLED === '1'")));
