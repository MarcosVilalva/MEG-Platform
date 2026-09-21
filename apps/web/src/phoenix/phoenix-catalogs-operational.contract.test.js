import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const catalogs = readFileSync(new URL('./screens/PhoenixCatalogsGrid.tsx', import.meta.url), 'utf8');
const cards = readFileSync(new URL('./card-management-bridge.ts', import.meta.url), 'utf8');
const styles = readFileSync(new URL('./phoenix-screens.css', import.meta.url), 'utf8');

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

console.log('Contrato de cadastros operacionais Web/Android validado.');
