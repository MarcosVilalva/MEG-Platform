import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const catalogs = readFileSync(new URL('./screens/PhoenixCatalogsGrid.tsx', import.meta.url), 'utf8');
const cards = readFileSync(new URL('./card-management-bridge.ts', import.meta.url), 'utf8');
const styles = readFileSync(new URL('./phoenix-screens.css', import.meta.url), 'utf8');
const confirm = readFileSync(new URL('./meg-confirm.ts', import.meta.url), 'utf8');
const financeClient = readFileSync(new URL('../app/finance-client.ts', import.meta.url), 'utf8');
const cardsClient = readFileSync(new URL('../app/cards-client.ts', import.meta.url), 'utf8');

for (const writer of [
  'financeClient.createAccount',
  'financeClient.updateAccount',
  'financeClient.deactivateAccount',
  'financeClient.createCategory',
  'financeClient.updateCategory',
  'financeClient.deactivateCategory',
  'financeClient.createPaymentMethod',
  'financeClient.updatePaymentMethod',
  'financeClient.deactivatePaymentMethod'
]) {
  assert.match(catalogs, new RegExp(writer.replace('.', '\\.')),
    `Cadastro operacional deve usar writer real: ${writer}`);
}

assert.match(catalogs, /isActive: true/,
  'Cadastros inativos devem poder ser reativados sem recriar o histórico.');
assert.match(catalogs, /histórico financeiro existente será preservado/,
  'Desativação deve deixar explícita a preservação do histórico.');
assert.match(catalogs, /meg:open-card-management/,
  'A aba de cartões deve abrir o gerenciador de domínio já existente.');
assert.match(cards, /addEventListener\('meg:open-card-management'/,
  'Gerenciador de cartões deve aceitar abertura segura a partir dos cadastros.');
assert.match(catalogs, /px-catalog-mobile-list/,
  'Android deve ter representação compacta própria em vez de depender da tabela desktop.');
assert.match(styles, /max-width:720px[\s\S]*px-catalog-panel \.px-table-scroll\{display:none\}[\s\S]*px-catalog-mobile-list\{display:grid/,
  'No layout móvel a tabela deve ceder lugar à lista operacional compacta.');
assert.match(catalogs, /Somente ADMIN ou MANAGER pode desativar cadastros/,
  'Desativação deve respeitar a permissão administrativa do backend.');
assert.doesNotMatch(catalogs, /window\.confirm|window\.alert/,
  'Cadastros não podem usar caixas nativas que ficam fora da hierarquia visual do MEG.');
assert.doesNotMatch(cards, /window\.confirm|window\.alert/,
  'Gestão de cartões não pode usar confirmação nativa do navegador.');
assert.match(catalogs, /px-meg-confirm-overlay px-catalog-active-confirm/,
  'Ativação e desativação devem usar confirmação MEG prioritária.');
assert.match(catalogs, /onDataCommitted/,
  'Alteração confirmada de cadastro deve atualizar imediatamente o snapshot global, sem esperar releitura completa.');
assert.match(catalogs, /Alteração salva e confirmada pelo servidor/,
  'Editor deve sair do estado de salvamento assim que a API confirmar a alteração.');
assert.match(cards, /replaceCard\(saved\)[\s\S]*refreshCardsInBackground\(\)/,
  'Cadastro de cartão deve aplicar o retorno confirmado antes da releitura em segundo plano.');
assert.doesNotMatch(cards, /await loadCards\(\);[\s\S]{0,220}mode = 'list'/,
  'Salvar, desativar ou reativar cartão não pode prender a interface aguardando uma segunda leitura.');
assert.match(cards, /loadingPromise/,
  'Leituras concorrentes do cadastro de cartões devem ser coalescidas em uma única promise.');
assert.match(cards, /megConfirm/,
  'Gestão de cartões deve reutilizar a confirmação MEG central.');
assert.match(confirm, /px-meg-confirm-overlay[\s\S]*role="alertdialog"/,
  'Confirmação compartilhada deve ser modal acessível e usar a camada crítica.');
assert.match(catalogs, /mutationOperationId/,
  'Retry do cadastro deve preservar operationId enquanto o mesmo comando estiver pendente.');
assert.match(catalogs, /expectedUpdatedAt: editor\.expectedUpdatedAt/,
  'Edição deve enviar a versão originalmente carregada para detectar concorrência.');
assert.match(catalogs, /CATALOG_STALE_VERSION/,
  'Conflito entre dispositivos deve ser explicado ao usuário sem sobrescrever silenciosamente.');
assert.match(catalogs, /ACCOUNT_ALREADY_EXISTS[\s\S]*CATEGORY_ALREADY_EXISTS[\s\S]*PAYMENT_METHOD_ALREADY_EXISTS/,
  'Duplicidades dos três catálogos devem possuir mensagens operacionais claras.');
assert.match(catalogs, /disabled=\{editor\.mode === 'edit'\}[\s\S]*natureza financeira da conta/,
  'Tipo da conta deve ficar protegido depois da criação.');
assert.match(catalogs, /Saldo inicial[\s\S]*disabled=\{editor\.mode === 'edit'\}[\s\S]*Ajustes de saldo devem ocorrer por lançamento/,
  'Saldo inicial não pode ser reescrito em uma conta existente.');
assert.match(catalogs, /Tipo protegido para não reclassificar lançamentos antigos silenciosamente/,
  'Tipo da classificação deve permanecer estrutural após a criação.');
assert.match(catalogs, /Tipo protegido depois da criação para manter as regras de pagamento consistentes/,
  'Tipo da forma de pagamento deve permanecer estrutural após a criação.');
assert.match(financeClient, /deactivateAccount:[\s\S]*body: JSON\.stringify\(meta\)/,
  'Desativação deve transportar operationId e versão para o backend.');
assert.match(financeClient, /updatedAt\?: string/,
  'Cliente deve preservar a versão do cadastro devolvida pelo servidor.');
assert.match(cards, /mutationOperationId/,
  'Gerenciador de cartões deve preservar operationId durante retry do mesmo comando.');
assert.match(cards, /expectedUpdatedAt: current\?\.updatedAt/,
  'Edição do cartão deve enviar a versão originalmente carregada.');
assert.match(cards, /CARD_STALE_VERSION/,
  'Conflito de cartão entre dispositivos deve ser tratado sem sobrescrita silenciosa.');
assert.match(cardsClient, /deactivate: \(id: string, meta:[\s\S]*JSON\.stringify\(meta\)/,
  'Desativação de cartão deve transportar versionamento/idempotência.');
assert.match(cardsClient, /updatedAt\?: string/,
  'Cliente de cartões deve preservar versão de concorrência do cadastro.');

console.log('Contrato de cadastros operacionais Web/Android validado.');
