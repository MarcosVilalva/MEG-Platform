import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const checks = [];

function text(path) {
  return readFileSync(resolve(root, path), 'utf8');
}

function json(path) {
  return JSON.parse(text(path));
}

function check(name, condition, details = '') {
  if (!condition) {
    console.error(`✗ ${name}${details ? ` — ${details}` : ''}`);
    process.exitCode = 1;
    return;
  }
  checks.push(name);
  console.log(`✓ ${name}`);
}

const packageJson = json('package.json');
const webPackage = json('apps/web/package.json');
const officialIndex = text('apps/web/index.html');
const phoenixHtml = text('apps/web/phoenix.html');
const previewServer = text('apps/web/phoenix-preview-server.mjs');
const ci = text('.github/workflows/ci.yml');
const pagesWorkflow = text('.github/workflows/deploy-pages.yml');
const androidWorkflow = text('.github/workflows/build-android-apk.yml');
const productionSmoke = text('.github/workflows/production-smoke.yml');
const cardsClient = text('apps/web/src/app/cards-client.ts');
const simpleWriter = text('apps/web/src/phoenix/simple-event-form-bridge.ts');
const simpleGateway = text('apps/web/src/phoenix/data/phoenix-write-gateway.ts');
const forecastBridge = text('apps/web/src/phoenix/home-commitment-forecast-bridge.ts');
const scenarioBridge = text('apps/web/src/phoenix/home-scenario-simulator-bridge.ts');
const decisionBridge = text('apps/web/src/phoenix/home-purchase-decision-bridge.ts');

check('Build Web usa TypeScript antes do Vite', /tsc\s+-b\s+&&\s+vite\s+build/.test(String(webPackage.scripts?.build || '')));
check('Suite geral continua ligada ao build', String(packageJson.scripts?.check || '').includes('test') && String(packageJson.scripts?.check || '').includes('build'));
check('Gate RC1 possui script dedicado', packageJson.scripts?.['test:rc1-gate'] === 'node scripts/rc1-readiness-gate.mjs');
check('CI acompanha a branch Phoenix V15', ci.includes('phoenix/v15-clean-room'));
check('CI executa a validação completa', ci.includes('npm run check'));

const moduleScripts = [...phoenixHtml.matchAll(/<script\s+type="module"\s+src="([^"]+)"/g)].map((match) => match[1]);
const officialModuleScripts = [...officialIndex.matchAll(/<script\s+type="module"\s+src="([^"]+)"/g)].map((match) => match[1]);
check('Phoenix possui scripts de inicialização', moduleScripts.length > 0);
check('Phoenix não carrega bridge duplicado', new Set(moduleScripts).size === moduleScripts.length);
check('Entrada oficial declara Phoenix V15', officialIndex.includes('data-meg-shell="phoenix-v15"') && officialIndex.includes('content="phoenix-v15"'));
check('Entrada oficial usa o mesmo bootstrap modular da Phoenix homologada', JSON.stringify(officialModuleScripts) === JSON.stringify(moduleScripts));
check('Entrada oficial inicializa Phoenix por último', officialModuleScripts.at(-1) === '/src/phoenix/preview-main.tsx');

for (const src of moduleScripts.filter((value) => value.startsWith('/src/'))) {
  const file = `apps/web${src}`;
  check(`Entrada Phoenix existe: ${src}`, existsSync(resolve(root, file)), file);
}

const requiredBridges = [
  '/src/phoenix/card-domain-live-refresh-bridge.ts',
  '/src/phoenix/card-management-bridge.ts',
  '/src/phoenix/card-statement-payment-bridge.ts',
  '/src/phoenix/card-statement-reopen-bridge.ts',
  '/src/phoenix/card-statement-lifecycle-bridge.ts',
  '/src/phoenix/card-statement-history-bridge.ts',
  '/src/phoenix/card-statement-projection-bridge.ts',
  '/src/phoenix/home-commitment-forecast-bridge.ts',
  '/src/phoenix/home-scenario-simulator-bridge.ts',
  '/src/phoenix/home-purchase-decision-bridge.ts',
  '/src/phoenix/bulk-event-actions-bridge.ts',
  '/src/phoenix/preview-main.tsx',
];
for (const bridge of requiredBridges) check(`Bridge crítico ativo: ${bridge}`, moduleScripts.includes(bridge));

const order = requiredBridges.map((bridge) => moduleScripts.indexOf(bridge));
check('Inicialização crítica respeita ordem declarada', order.every((value) => value >= 0) && order.every((value, index) => index === 0 || value > order[index - 1]));
check('Aplicação React é inicializada por último entre bridges críticas', moduleScripts.at(-1) === '/src/phoenix/preview-main.tsx');

check('Preview mantém escrita simples protegida por feature flag', previewServer.includes("PHOENIX_SIMPLE_EVENT_WRITE === 'enabled'"));
check('Preview mantém baixas protegidas por feature flag', previewServer.includes("PHOENIX_PENDING_WRITE === 'enabled'"));
check('Preview mantém ações em lote protegidas por feature flag', previewServer.includes("PHOENIX_BULK_EVENT_WRITE === 'enabled'"));
check('Preview nega mutações fora dos gateways permitidos', previewServer.includes('PREVIEW_READ_ONLY'));
check('Preview envia proteção contra sniffing', previewServer.includes("'x-content-type-options': 'nosniff'"));
check('Preview bloqueia framing', previewServer.includes("'x-frame-options': 'DENY'"));
check('HTML Phoenix não é cacheado', previewServer.includes("decoded === '/phoenix.html' ? 'no-store'"));

check('Pages aguarda API do mesmo commit antes da publicação', pagesWorkflow.includes('RENDER_GIT_COMMIT') && pagesWorkflow.includes('github.sha'));
check('Android valida marcador Phoenix V15 no artefato Web', androidWorkflow.includes('data-meg-shell="phoenix-v15"'));
check('Smoke de produção exige marcador Phoenix V15', productionSmoke.includes('data-meg-shell="phoenix-v15"'));

check('Writer Phoenix libera transferência atômica oficial', simpleWriter.includes("authenticatedRequest('/finance/transfers'") && !simpleWriter.includes('Transferências continuam bloqueadas'));
check('Writer Phoenix libera recorrência oficial de despesas', simpleWriter.includes('payablesClient.createRecurring') && !simpleWriter.includes('Recorrência continua em simulação'));
check('Writer Phoenix preserva sinal para estornos', simpleWriter.includes('const amount = parseMoney(') && !simpleWriter.includes('Estornos e valores negativos continuam bloqueados'));
check('Gateway simples aceita valor negativo diferente de zero', simpleGateway.includes('input.amount === 0') && !simpleGateway.includes('input.amount <= 0'));
check('Modelo sem contrato não é oferecido para gravação', simpleWriter.includes("label.hidden = true") && simpleWriter.includes('SALVAR COMO MODELO'));

check('Cliente de cartões expõe ciclo de fatura', cardsClient.includes('statementLifecycle:'));
check('Cliente de cartões expõe pagamento protegido', cardsClient.includes('payStatement:'));
check('Cliente de cartões expõe reabertura protegida', cardsClient.includes('reopenStatement:'));
check('Radar consolidado é somente leitura', !/method\s*:\s*['\"](?:POST|PUT|PATCH|DELETE)['\"]/.test(forecastBridge));
check('Simulador preditivo é somente leitura', !/method\s*:\s*['\"](?:POST|PUT|PATCH|DELETE)['\"]/.test(scenarioBridge));
check('Assistente de decisão é somente leitura', !/method\s*:\s*['\"](?:POST|PUT|PATCH|DELETE)['\"]/.test(decisionBridge));
check('Simulador sinaliza que não grava dados', scenarioBridge.includes('SEM GRAVAR'));
check('Assistente calcula fechamento real do cartão', decisionBridge.includes('closingDay'));
check('Assistente calcula vencimento real do cartão', decisionBridge.includes('dueDay'));

if (process.exitCode) {
  console.error('\nRC1 readiness gate: FALHOU. Corrija os itens acima antes de promover o candidato.');
  process.exit(process.exitCode);
}

console.log(`\nRC1 readiness gate: APROVADO (${checks.length} verificações).`);
console.log('Este gate valida invariantes automatizáveis; homologação financeira, segurança de dependências, Android e corte de produção continuam gates separados.');
