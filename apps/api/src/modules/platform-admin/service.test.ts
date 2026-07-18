import assert from 'node:assert/strict';
import { LicenseStatus } from '@meg/database';
import { effectiveLicenseStatus } from './service';

const future = new Date(Date.now() + 60_000);
const past = new Date(Date.now() - 60_000);
assert.equal(effectiveLicenseStatus({ status: LicenseStatus.ACTIVE, expiresAt: future, graceUntil: null }), LicenseStatus.ACTIVE);
assert.equal(effectiveLicenseStatus({ status: LicenseStatus.TRIAL, expiresAt: past, graceUntil: null }), LicenseStatus.EXPIRED);
assert.equal(effectiveLicenseStatus({ status: LicenseStatus.ACTIVE, expiresAt: past, graceUntil: future }), LicenseStatus.ACTIVE);
assert.equal(effectiveLicenseStatus({ status: LicenseStatus.SUSPENDED, expiresAt: future, graceUntil: null }), LicenseStatus.SUSPENDED);
console.log('MEG commercial license tests passed.');