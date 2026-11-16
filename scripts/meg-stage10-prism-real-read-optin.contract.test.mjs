import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Static guard for the Stage 10 opt-in. Does not access API, DB or production.
const read=path=>readFileSync(path,'utf8');
const main=read('apps/web/src/meg-web-evolution/main.tsx');
const prism=read('apps/web/src/meg-web-evolution/integrated-qa/PrismOperationalLaunches.tsx');
const operational=read('apps/web/src/meg-web-evolution/launches/OperationalLaunches.tsx');
const grid=read('apps/web/src/meg-web-evolution/launches/LaunchesStage09.tsx');
const actions=read('apps/web/src/meg-web-evolution/stage10/LaunchActionsQa.tsx');

assert.match(main,/import\.meta\.env\.VITE_PRISM_LAYOUT === 'true'/);
assert.match(main,/prismLayoutEnabled && !query\.has\('tela'\)/);
assert.match(main,/prismLayoutEnabled[\s\S]*<React\.Suspense/);
assert.match(main,/\: <OperationalLaunches key=/);
assert.match(prism,/from '\.\.\/launches\/OperationalLaunches'/);
assert.match(prism,/searchHistorySuggestions=\{searchHistorySuggestions\}/);
assert.match(prism,/readAuthorizedHistory\(/);
assert.doesNotMatch(prism,/historySnapshot=\{history\}/);
assert.match(operational,/readVerifiedMonthlyEvents\(/);
assert.match(operational,/readVerifiedHistoricalSnapshot\(/);
assert.match(operational,/filterEventsForPeriod\(/);
assert.match(grid,/value="year"/);
assert.match(grid,/value="range"/);
assert.match(grid,/value="all"/);
assert.match(grid,/canonicalCriteria/);
assert.match(prism,/saveEnabled=\{false\}/g);
assert.match(prism,/existingExpenseDraft/);
assert.match(prism,/onLoading:clear/);
assert.match(operational,/financeClient\.getSyncStatus/);
assert.match(operational,/readSmartAuthorizedHistory/);
assert.match(operational,/onLoaded\(\{events,accounts,categories,methods,cards\}\)/);
assert.match(operational,/authenticatedRequest<PrismCardRead\[]>\('\/cards\?month=/);
assert.match(grid,/qaActions&&!readOnlyRealData/);
assert.match(actions,/disabled=\{readOnlyRealData/);
for(const [name,source] of Object.entries({prism,operational})){
 assert.doesNotMatch(source,/homeP0QaPreviewFixture|QA_EDIT_EXPENSE_SNAPSHOT|previewOnly|MEG_UNIFIED_QA_NETWORK_BLOCKED|window\.fetch/);
 assert.doesNotMatch(source,/\bcreateFinancialEvent\(|\bupdateFinancialEvent\(|\bdeleteFinancialEvent\(|financeClient\.createEvent|financeClient\.updateEvent|financeClient\.archiveEvent|financeClient\.bulkUpdateEvents/);
 assert.doesNotMatch(source,/SUPABASE_SERVICE_ROLE_KEY|DATABASE_URL|JWT_SECRET|service_role/);
}
console.log('MEG_STAGE10_PRISM_REAL_READ_OPTIN_STATIC_GATE PASS');
