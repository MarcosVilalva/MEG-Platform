import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const gateway = readFileSync(new URL('./data/phoenix-write-gateway.ts', import.meta.url), 'utf8');
const pendingGateway = readFileSync(new URL('./data/phoenix-pending-write-gateway.ts', import.meta.url), 'utf8');
const movements = readFileSync(new URL('./screens/PhoenixMovementsV15.tsx', import.meta.url), 'utf8');
const writeControl = readFileSync(new URL('./components/PhoenixLaunchWriteControl.tsx', import.meta.url), 'utf8');
const appShell = readFileSync(new URL('./PhoenixApp.tsx', import.meta.url), 'utf8');
const bridge = readFileSync(new URL('./simple-event-form-bridge.ts', import.meta.url), 'utf8');
const previewServer = readFileSync(new URL('../../phoenix-preview-server.mjs', import.meta.url), 'utf8');

assert.match(gateway, /simpleEvent:\s*true/,
  'Writer frontend de receita/despesa simples deve refletir a capacidade liberada no fluxo Phoenix.');
assert.match(gateway, /cardPurchase:\s*true/,
  'Writer frontend de compra no cartão deve refletir a capacidade específica liberada no fluxo Phoenix.');
assert.match(gateway, /existingOperationId\s*\|\|\s*operationId\(\)/,
  'Retry do mesmo comando deve poder reutilizar o mesmo operationId.');
assert.match(gateway, /operationId:\s*prepared\.operationId/,
  'Envio deve usar exatamente o operationId preparado antes da primeira tentativa.');
assert.match(gateway, /financeClient\.createEvent/,
  'Writer simples deve usar o domínio financeiro oficial.');
assert.match(gateway, /cardsClient\.createPurchase/,
  'Compra no crédito deve usar o domínio oficial de cartões, e não criar despesa monetária comum.');
assert.match(gateway, /operationId\('phoenix-card-purchase'\)/,
  'Compra no cartão deve nascer com operationId próprio para retry idempotente.');
assert.match(gateway, /runtimeCapabilities\.cardPurchaseWrite/,
  'Writer de cartão deve exigir capacidade efetiva do ambiente imediatamente antes da mutação.');
assert.match(gateway, /getPhoenixCardPurchaseEligibility/,
  'Fluxo de cartão deve possuir elegibilidade própria, sem relaxar as proteções do writer simples.');
assert.match(gateway, /PHOENIX_CARD_NOT_IN_SIMPLE_FLOW:\s*'Compras no crédito são gravadas pelo writer protegido de cartões e faturas\.'/,
  'Mensagem do writer simples deve encaminhar crédito ao writer específico já disponível.');
assert.match(gateway, /flow\.manualDue[\s\S]*PHOENIX_CARD_MANUAL_DUE_NOT_SUPPORTED/,
  'Vencimento manual deve continuar protegido enquanto o contrato do domínio de cartões não suportar a exceção.');
assert.match(gateway, /input\.installments < 1 \|\| input\.installments > 48/,
  'Writer de cartão deve respeitar o limite de parcelas homologado pela API.');
assert.match(gateway, /clearPhoenixReadModelCache\(\)/);
assert.match(gateway, /loadPhoenixReadModel\(refreshMonth,\s*\{ force: true \}\)/,
  'Snapshot só deve ser recarregado depois da confirmação do servidor.');
assert.match(gateway, /input\.amount\s*===\s*0/,
  'Writer simples deve rejeitar zero e preservar valores negativos usados para estorno/reversão.');
assert.doesNotMatch(gateway, /input\.amount\s*<=\s*0/,
  'Writer simples não pode voltar a bloquear estornos negativos.');
assert.match(gateway, /type:\s*'income'\s*\|\s*'expense'/,
  'Gateway simples deve continuar restrito a receita/despesa; transferência usa contrato atômico próprio.');
assert.match(gateway, /status:\s*'planned'\s*\|\s*'paid'/,
  'Writer simples deve limitar a situação ao contrato explicitamente homologado.');
assert.match(gateway, /if \(!PHOENIX_WRITE_CAPABILITIES\.simpleEvent\)/,
  'Gateway deve continuar falhando fechado se a capacidade frontend for revogada.');
assert.match(gateway, /if \(!PHOENIX_WRITE_CAPABILITIES\.cardPurchase\)/,
  'Gateway de cartão deve falhar fechado se a capacidade frontend for revogada.');
assert.match(gateway, /getPhoenixRuntimeWriteCapabilities\(true\)/,
  'Gateway deve exigir capacidade efetiva do ambiente imediatamente antes do POST.');
assert.match(gateway, /runPhoenixSimpleEventEdit/,
  'Edição simples deve permanecer encapsulada no gateway protegido da Phoenix.');
assert.match(gateway, /runtimeCapabilities\.bulkEventWrite/,
  'Edição deve exigir a capacidade bulk homologada no ambiente.');
assert.match(gateway, /financeClient\.bulkUpdateEvents/,
  'Edição deve usar o writer bulk idempotente, e não PATCH direto da tela.');
assert.match(gateway, /operationId\('phoenix-event-edit'\)/,
  'Cada edição deve possuir identidade explícita de mutação.');
assert.match(gateway, /const snapshot = await confirmedSnapshot\(refreshMonth\)/,
  'Edição só deve atualizar a interface depois da releitura confirmada.');

assert.match(pendingGateway, /PHOENIX_SNAPSHOT_COMMITTED_EVENT\s*=\s*'meg:phoenix-snapshot-committed'/,
  'Baixa confirmada deve publicar uma fotografia oficial para o shell sem depender de novo GET.');
assert.match(pendingGateway, /publishCommittedSnapshot\(snapshot\)/,
  'Snapshot de Pendentes deve ser publicado somente depois da releitura confirmada.');
assert.match(pendingGateway, /new CustomEvent\(PHOENIX_SNAPSHOT_COMMITTED_EVENT,\s*\{ detail: \{ snapshot \} \}\)/,
  'Evento de commit deve transportar a mesma fotografia já confirmada pelo gateway.');

assert.doesNotMatch(movements, /submitPhoenixSimpleEvent|runPhoenixSimpleEventWrite|cardsClient\.createPurchase/,
  'Tela React base não deve acionar criação diretamente; a confirmação fica isolada no controle protegido.');
assert.doesNotMatch(movements, /financeClient\.updateEvent|financeClient\.bulkUpdateEvents|clearPhoenixReadModelCache|loadPhoenixReadModel\(data\.month/,
  'Tela de Lançamentos não pode administrar diretamente a mutação e releitura.');
assert.match(movements, /runPhoenixSimpleEventEdit/,
  'Tela deve encaminhar a edição ao gateway Phoenix em vez de acessar cliente mutável.');
assert.match(movements, /PhoenixLaunchWriteControl/,
  'Primeira etapa visual deve revisar e delegar a segunda etapa ao controle protegido de confirmação.');
assert.match(movements, /cardInput=\{cardWriteInput\}/,
  'Compra no crédito deve entregar um comando de cartão ao controle protegido, sem mutar o domínio diretamente.');
assert.match(movements, /refreshMonth=\{data\.month\}/,
  'Após a compra, a releitura deve preservar a competência atualmente aberta no shell.');
assert.match(movements, /onDataCommitted\?\.\(snapshot\)/,
  'Snapshot confirmado deve ser propagado imediatamente ao shell global.');
assert.match(movements, /event\.category\?\.name \|\| event\.sourceDetails\?\.group/,
  'Grade deve priorizar a categoria normalizada após uma edição confirmada.');
assert.match(movements, /eventStatus\(event\.status\) \|\| event\.sourceDetails\?\.situation/,
  'Situação exibida deve priorizar o status normalizado confirmado pelo backend.');
assert.match(appShell, /function commitSnapshot\(snapshot: PhoenixReadModel\)/,
  'Shell deve incorporar a fotografia confirmada sem exigir nova consulta.');
assert.match(appShell, /onDataCommitted=\{commitSnapshot\}/,
  'Lançamentos deve entregar a fotografia confirmada ao shell global.');
assert.match(appShell, /addEventListener\(PHOENIX_SNAPSHOT_COMMITTED_EVENT,\s*handleCommittedSnapshot/,
  'Shell deve incorporar também a fotografia confirmada por baixas em Pendentes.');
assert.match(appShell, /event\?\.type === 'focus' && !event\.isTrusted/,
  'Focus sintético legado não pode provocar uma segunda leitura após a baixa já confirmada.');
assert.match(writeControl, /getPhoenixRuntimeWriteCapabilities\(true\)/,
  'Controle de confirmação deve verificar o gate de runtime antes de habilitar a ação final.');
assert.match(writeControl, /runPhoenixSimpleEventWrite/,
  'Controle de confirmação deve usar exclusivamente o gateway financeiro protegido para lançamento simples.');
assert.match(writeControl, /runPhoenixCardPurchaseWrite/,
  'Controle deve rotear crédito para o writer protegido de cartões.');
assert.match(writeControl, /capabilities\.cardPurchaseWrite/,
  'A ação de cartão só pode ser habilitada quando o runtime declarar a capacidade específica.');
assert.match(writeControl, /projectedCardEvent/,
  'Após confirmação, o controle deve localizar a projeção da parcela no snapshot quando ela pertence ao mês visível.');
assert.match(writeControl, /if \(cardFlow \? !cardInput : !input\) return;[\s\S]*setCommitState\('saving'\)/,
  'O controle não pode entrar em estado saving quando não há comando válido para o fluxo selecionado.');
assert.match(writeControl, /duplicateAccepted/,
  'Possível duplicidade deve exigir aceite explícito antes da confirmação.');
assert.match(writeControl, /preparedCardRef/,
  'Retry de cartão após falha incerta deve preservar o comando preparado e o operationId.');
assert.match(writeControl, /preparedRef/,
  'Retry após falha incerta deve preservar o comando preparado e o operationId.');

assert.match(bridge, /preparePhoenixSimpleEvent/,
  'Bridge homologado deve preparar o comando antes do envio.');
assert.match(bridge, /runPhoenixSimpleEventWrite/,
  'Bridge homologado deve executar o gateway oficial e aguardar confirmação.');
assert.match(bridge, /state\.operationId\s*=\s*prepared\.operationId/,
  'Bridge deve preservar operationId para retry idempotente.');
assert.match(bridge, /result\.status !== 'confirmed'/,
  'Bridge não pode tratar a gravação simples como concluída sem confirmação do servidor.');
assert.match(bridge, /authenticatedRequest\('\/finance\/transfers'/,
  'Transferência deve usar o endpoint atômico oficial, fora do writer simples.');
assert.match(bridge, /payablesClient\.createRecurring/,
  'Recorrência de despesa deve usar o domínio oficial de contas a pagar.');
assert.match(bridge, /const amount = parseMoney/,
  'Receita/despesa simples deve preservar o sinal digitado para estornos.');
assert.doesNotMatch(bridge, /Estornos e valores negativos continuam bloqueados/,
  'Estornos negativos homologados não podem voltar a ser bloqueados no bridge.');
assert.match(bridge, /Cartão e crediário usam o writer específico do domínio de faturas/,
  'Cartão e crediário devem permanecer nos writers específicos de seus domínios.');
assert.match(bridge, /SALVAR COMO MODELO/);
assert.match(bridge, /label\.hidden\s*=\s*true/,
  'Função sem contrato backend não deve ser oferecida como gravação disponível.');

assert.match(previewServer, /simpleEventWriteEnabled\s*=\s*process\.env\.PHOENIX_SIMPLE_EVENT_WRITE\s*===\s*'enabled'/,
  'Proxy deve exigir flag explícita além da capacidade frontend.');
assert.match(previewServer, /cardPurchaseWriteEnabled\s*=\s*process\.env\.PHOENIX_CARD_PURCHASE_WRITE\s*===\s*'enabled'/,
  'Proxy de cartão deve exigir flag própria para liberar criação de compras.');
assert.match(previewServer, /allowedCardPurchasePosts\s*=\s*new Set\(\['\/cards\/purchases'\]\)/,
  'Proxy de cartão deve limitar criação ao endpoint oficial de compras.');
assert.match(previewServer, /isAllowedCardPurchaseWrite\(method, pathname\)/,
  'POST/PATCH/DELETE de compra devem passar pelo gate específico de cartão.');
assert.match(previewServer, /cardPurchaseWrite:\s*cardPurchaseWriteEnabled/,
  'Preview-health deve publicar a capacidade de cartão usada pelo frontend.');
assert.match(previewServer, /allowedFinancialPosts\s*=\s*new Set\(\['\/finance\/events'\]\)/,
  'Proxy isolado do writer simples deve aceitar somente o endpoint exato de criação quando a flag estiver ligada.');
assert.match(previewServer, /simpleEventWriteEnabled\s*&&\s*allowedFinancialPosts\.has\(pathname\)/,
  'Allowlist financeira simples não pode funcionar com a flag do ambiente desligada.');
assert.match(previewServer, /bulkEventWriteEnabled\s*&&\s*allowedBulkEventPosts\.has\(pathname\)/,
  'Edição no preview deve permanecer atrás da flag bulk explícita.');
assert.match(previewServer, /PREVIEW_READ_ONLY/,
  'Mutações não habilitadas no ambiente isolado devem continuar bloqueadas pelo proxy.');

console.log('Writers Phoenix validados: criação simples, compra real no cartão, edição protegida, baixa com snapshot imediato, domínios especiais isolados e preview gated.');
