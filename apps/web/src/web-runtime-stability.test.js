import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (name) => fs.readFileSync(path.join(here, name), 'utf8');
const nativeUpdate = read('native-app-update.js');
const legacyApp = read('legacy-app.js');
const legacyStyles = read('legacy-styles.css');
const ongoing = read('ongoing-card-installments.js');
const legacyEntry = read('legacy-entry.js');
const biometric = read('native-biometric-login.js');
const comfortContrast = read('meg-contrast-comfort.css');
const indexHtml = read('../index.html');

const webBranch = nativeUpdate.slice(
  nativeUpdate.indexOf("if (!nativeMobile)"),
  nativeUpdate.indexOf("await Promise.all", nativeUpdate.indexOf("if (!nativeMobile)")),
);
const forbiddenWebModules = [
  'market-upgrades',
  'ux-enhancements-safe',
  'excel-filter-pro',
  'finance-workspace-modernization',
  'transaction-grid-stability',
  'pending-monetary-balance',
  'transaction-status-guard',
  'transaction-classification-defaults',
  'fast-logout',
];
for (const moduleName of forbiddenWebModules) {
  assert.equal(webBranch.includes(moduleName), false, `${moduleName} não pode ser carregado no navegador`);
}

assert.equal(nativeUpdate.includes('loadOptionalUiEnhancements();'), false, 'recursos opcionais não podem iniciar durante a avaliação do módulo');
assert.equal(nativeUpdate.includes('startup-api-readiness'), false, 'a prontidão da API não pode liberar a interface em paralelo');
assert.ok(
  indexHtml.indexOf('id="cloudLoadingOverlay"') < indexHtml.indexOf('class="app-shell"'),
  'a barreira de inicialização deve existir antes do Dashboard no primeiro frame'
);
assert.match(indexHtml, /Conectando ao banco de dados/);
assert.match(legacyEntry, /import '\.\/startup-data-protection\.js'/);
assert.equal(legacyApp.includes('premiumWebDashboard'), false, 'dashboard premium duplicado deve permanecer removido');
assert.equal(legacyApp.includes('renderPremiumWebDashboard'), false, 'renderização premium duplicada deve permanecer removida');
assert.equal(legacyStyles.includes('.premium-dashboard-web'), false, 'CSS premium pesado deve permanecer removido');
assert.equal(legacyStyles.includes('.fast-combobox'), false, 'CSS do editor personalizado removido não pode permanecer no pacote');
assert.equal(legacyStyles.includes('.transaction-editor-v2'), false, 'layout antigo do editor personalizado deve permanecer removido');
assert.equal(ongoing.includes("observe(document.body"), false, 'parcelamentos não podem observar todo o documento');
assert.equal(ongoing.includes("attributeFilter: ['open']"), true, 'parcelamentos devem observar apenas a abertura do diálogo');
assert.equal(legacyApp.includes('DEFAULT_CATALOGS.expenseClasses[0]'), true, 'classificação padrão deve ser tratada pelo núcleo');
assert.equal(legacyEntry.includes("import { readSheet } from 'read-excel-file/browser'"), false, 'leitor de planilha deve ser carregado somente quando necessário');
assert.equal(legacyEntry.includes("import { syncLocalDueNotifications }"), false, 'notificações nativas não podem entrar no pacote inicial da web');
assert.equal(nativeUpdate.includes("import { Capacitor, registerPlugin }"), false, 'atualizador Android deve ser carregado sob demanda');
assert.equal(biometric.includes('@capgo/capacitor-native-biometric'), false, 'somente uma ponte biométrica pode existir no aplicativo');
assert.equal(biometric.includes('withBiometricTimeout'), false, 'a ponte biométrica não pode ser interrompida por timeouts da camada web');
assert.equal((nativeUpdate.match(/meg-contrast-comfort\.css/g) || []).length, 2, 'o contraste confortável deve carregar no web e no Android');
assert.match(comfortContrast, /\.analytics-calculation-panel/);
assert.match(comfortContrast, /\.income-kpi-grid article/);
assert.match(comfortContrast, /\.cashflow-answer-card/);
assert.match(comfortContrast, /\.smart-budget-card/);
assert.match(comfortContrast, /\.catalog-row/);
assert.match(comfortContrast, /\.meg-mobile-transaction/);
assert.match(comfortContrast, /\.app-update-banner/);
assert.match(comfortContrast, /\.app-update-sidebar-badge/);
assert.match(comfortContrast, /\.app-update-check-warning/);
assert.match(comfortContrast, /\.opening-alert-dialog/);
assert.match(comfortContrast, /\.autocomplete-option/);
assert.match(legacyApp, /function applyIncomeTransactionDefaults\(\)/);
assert.match(legacyApp, /normalizeText\(item\.description\) === "PIX"/);
assert.match(legacyApp, /normalizeText\(item\) === "A VISTA"/);
assert.match(legacyApp, /transactionType\.addEventListener\("change", syncTransactionType\)/);

console.log('web runtime stability tests passed');
