import assert from 'node:assert/strict';
import {test} from 'node:test';
import {validateReadOnlyBuild} from './meg-stage09-api-readonly-preflight.mjs';
test('fail closed when Render build command is missing',()=>{
 assert.deepEqual(validateReadOnlyBuild(undefined),['BUILD_COMMAND_NOT_PROVIDED']);
});
test('block current Render production build including deleting budgets and db push',()=>{
 const command='npm install && npm run db:generate && npm run build:api && npm run db:prepare:production && npm run db:push:production';
 const errors=validateReadOnlyBuild(command);
 assert.ok(errors.includes('PREPARE_PRODUCTION_CAN_DELETE_ROWS'));
 assert.ok(errors.includes('PRISMA_DB_PUSH_NOT_ALLOWED'));
});
test('block direct Prisma operations, --accept-data-loss and migrations',()=>{
 const errors=validateReadOnlyBuild('npm run db:generate && npm run build:api && prisma db push --accept-data-loss && prisma migrate deploy');
 assert.ok(errors.includes('PRISMA_DB_PUSH_NOT_ALLOWED'));
 assert.ok(errors.includes('ACCEPT_DATA_LOSS_FORBIDDEN'));
 assert.ok(errors.includes('MIGRATION_NOT_ALLOWED_IN_READONLY_DEPLOY'));
});
test('allow only compilation without database mutations',()=>{
 assert.deepEqual(validateReadOnlyBuild('npm ci --audit=false && npm run db:generate && npm run build:api'),[]);
});
