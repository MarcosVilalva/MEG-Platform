import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const catalogs = readFileSync(new URL('./screens/PhoenixCatalogsGrid.tsx', import.meta.url), 'utf8');
const cards = readFileSync(new URL('./card-management-bridge.ts', import.meta.url), 'utf8');
const styles = readFileSync(new URL('./phoenix-screens.css', import.meta.url), 'utf8');
const confirm = readFileSync(new URL('./meg-confirm.ts', import.meta.url), 'utf8');

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

console.log('Contrato de cadastros operacionais Web/Android validado.');
