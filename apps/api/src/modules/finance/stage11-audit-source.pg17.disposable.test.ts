/**
 * Stage11 Issue #699 | channel origin preservation on PostgreSQL 17 disposable.
 * The database MUST first contain two real pre-migration AuditLog rows,
 * and MUST have had the controlled SQL migration executed.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prisma, UserRole, UserStatus } from '@meg/database';
import { recordFinancialAudit } from './audit';

const target = new URL(process.env.DATABASE_URL || 'https://invalid');
assert.ok(process.env.NODE_ENV === 'test'
 && process.env.GITHUB_ACTIONS === 'true'
 && process.env.GITHUB_REPOSITORY === 'MarcosVilalva/MEG-Platform'
 && process.env.MEG_STAGE10_ISOLATED_PG === '1'
 && process.env.MEG_STAGE11_FIRST_WRITE_SYNTHETIC === '1'
 && target.protocol === 'postgresql:' && target.hostname === '127.0.0.1'
 && target.port === '5432'
 && target.pathname === '/meg_stage11_first_write_sandbox'
 && target.username === 'meg_stage10_ci',
 'STAGE11_SOURCE_PROTECTED_DATABASE_FORBIDDEN');

try {
  const historical = await prisma.auditLog.findMany({
    where: {id: {in: ['stage11-before-audit-1', 'stage11-before-audit-2']}},
    orderBy: {id: 'asc'},
  });
  assert.equal(historical.length, 2);
  const expected = [
    {id:'stage11-before-audit-1', entity:'FinancialEvent', action:'BEFORE_MIGRATION',
      metadata:'{"historic":1}', date:'2025-01-02T03:04:05.000Z'},
    {id:'stage11-before-audit-2', entity:'FinancialEvent', action:'BEFORE_MIGRATION',
      metadata:'{"historic":2}', date:'2025-01-03T04:05:06.000Z'},
  ];
  for (let i=0;i<2;i++) {
    const row = historical[i], want = expected[i];
    assert.equal(row.id, want.id);
    assert.equal(row.entity, want.entity);
    assert.equal(row.entityId, want.id);
    assert.equal(row.action, want.action);
    assert.equal(row.metadata, want.metadata);
    assert.equal(row.userId, null);
    assert.equal(row.createdAt.toISOString(), want.date);
    assert.equal(row.sourceChannel, 'historico-desconhecido');
  }
  console.log('STAGE11_AUDIT_HISTORICAL_ROWS_UNCHANGED_EXCEPT_ORIGIN=PASS');

  const user = await prisma.user.create({data: {
    email:'stage11-origin-'+randomUUID()+'@example.invalid',
    name:'FAKE ORIGIN QA',passwordHash:'NOT_A_LOGIN',
    role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true,
  }});
  const direct = await prisma.auditLog.create({data: {
    userId:user.id,entity:'FinancialEvent',entityId:'stage11-new-default',
    action:'STAGE11_DEFAULT_CHECK',metadata:'{"test":true}',
  }});
  assert.equal(direct.sourceChannel,'canal-nao-atestado');

  const viaWriter = await prisma.$transaction(tx => recordFinancialAudit(tx, {
    actorId:user.id,entity:'FinancialEvent',entityId:'stage11-writer',
    action:'FINANCIAL_EVENT_CREATED',
    context:{operationId:'stage11-fake-op',workspaceId:'stage11-fake-workspace'},
  }));
  assert.equal(viaWriter.sourceChannel,'canal-nao-atestado');
  assert.equal(viaWriter.userId,user.id);
  assert.ok(Number.isFinite(viaWriter.createdAt.getTime()));
  console.log('STAGE11_AUDIT_DIRECT_AND_CENTRAL_WRITER_NEW_ORIGIN=PASS');

  await assert.rejects(() => prisma.auditLog.create({data: {
    userId:user.id,entity:'FinancialEvent',entityId:'stage11-forged-web',
    action:'STAGE11_FORGED_WEB',sourceChannel:'web',
  }}), 'Database must reject forged web even if application writer is bypassed');
  assert.equal(await prisma.auditLog.count({where:{sourceChannel:'web'}}),0);
  assert.equal(await prisma.auditLog.count({where:{action:'STAGE11_FORGED_WEB'}}),0);
  console.log('STAGE11_AUDIT_WEB_FORGERY_DB_REJECTED=PASS');

  await assert.rejects(() => prisma.auditLog.update({
    where:{id:'stage11-before-audit-1'},data:{sourceChannel:'web'},
  }), 'Historical row cannot be reclassified as web');
  assert.equal((await prisma.auditLog.findUniqueOrThrow({
    where:{id:'stage11-before-audit-1'},
  })).sourceChannel,'historico-desconhecido');
  console.log('STAGE11_AUDIT_HISTORICAL_WEB_RECLASSIFICATION_BLOCKED=PASS');

  assert.equal(await prisma.auditLog.count({where:{sourceChannel:'historico-desconhecido'}}),2);
  console.log('STAGE11_AUDIT_SOURCE_PG17_FINAL=PASS');
} finally {
  await prisma.$disconnect();
  console.log('STAGE11_AUDIT_SOURCE_CLIENT_CLOSED=PASS');
}
