import assert from 'node:assert/strict';
import { LicenseStatus } from '@meg/database';
import { effectiveLicenseStatus } from './service';
import { billingGraceDeadline } from '../billing/service';

const future = new Date(Date.now() + 60_000);
const past = new Date(Date.now() - 60_000);
assert.equal(effectiveLicenseStatus({ status: LicenseStatus.ACTIVE, expiresAt: future, graceUntil: null }), LicenseStatus.ACTIVE);
assert.equal(effectiveLicenseStatus({ status: LicenseStatus.TRIAL, expiresAt: past, graceUntil: null }), LicenseStatus.EXPIRED);
assert.equal(effectiveLicenseStatus({ status: LicenseStatus.ACTIVE, expiresAt: past, graceUntil: future }), LicenseStatus.ACTIVE);
assert.equal(effectiveLicenseStatus({ status: LicenseStatus.SUSPENDED, expiresAt: future, graceUntil: null }), LicenseStatus.SUSPENDED);
const dueAt = new Date('2026-07-10T12:00:00.000Z');
assert.equal(billingGraceDeadline(dueAt, 5).toISOString(), '2026-07-15T12:00:00.000Z');
console.log('MEG commercial license and billing tests passed.');