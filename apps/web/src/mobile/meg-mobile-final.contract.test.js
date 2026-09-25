import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mobile = readFileSync(new URL('./MegMobileFinal.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('./meg-mobile-final.css', import.meta.url), 'utf8');
const phoenix = readFileSync(new URL('../phoenix/PhoenixApp.tsx', import.meta.url), 'utf8');
const source = mobile + '\n' + css;

assert.doesNotMatch(source, /\bpx-[a-z0-9-]+/i,
  'Reconstrução mobile final não pode reutilizar classes visuais .px-* do Phoenix legado.');
assert.doesNotMatch(mobile, /Phoenix(?:Sidebar|NavIcon|Reference|OperationalMobileHome|HomeDashboard|CardsGrid|Payables)/,
  'Reconstrução mobile final não pode importar componentes visuais Phoenix anteriores.');
assert.doesNotMatch(phoenix, /PhoenixMobileReferenceScreens/,
  'Shell não pode reintroduzir a implementação intermediária das três telas.');
assert.match(phoenix, /if \(nativeOperational && viewData && \(view === 'home' \|\| view === 'cards' \|\| view === 'payables'\)\)[\s\S]*<MegMobileFinal[\s\S]*return <div className="phoenix-v15"/,
  'Home, Cartões e Pendentes do APK devem retornar a árvore mobile nova antes do shell Phoenix antigo.');
assert.match(mobile, /cards\.concat\(cards, cards\)/,
  'Carrossel de cartões deve possuir cópias circulares para rolagem infinita real.');
assert.match(mobile, /index < cards\.length[\s\S]*scrollLeft \+=[\s\S]*index >= cards\.length \* 2[\s\S]*scrollLeft \+=/,
  'Carrossel deve recircular para frente e para trás sem travar nas extremidades.');
assert.match(mobile, /scroll-snap|scrollIntoView/,
  'Carrossel deve manter interação por gesto e centralização visual.');
assert.match(css, /\.meg2-app\{[\s\S]*position:fixed;inset:0/,
  'Nova interface deve possuir viewport próprio e independente do shell anterior.');
assert.match(css, /@media\(max-width:390px\)/,
  'Nova interface deve adaptar composição para telefones menores.');
assert.match(css, /@media\(max-width:340px\)/,
  'Nova interface deve possuir fallback para resoluções estreitas.');
assert.match(css, /env\(safe-area-inset-top\)/,
  'Cabeçalho deve respeitar safe area do Android/iOS.');
assert.match(css, /env\(safe-area-inset-bottom\)/,
  'Dock deve respeitar safe area inferior.');
assert.match(mobile, /PeriodSheet[\s\S]*Mês[\s\S]*Intervalo[\s\S]*Tudo/,
  'Filtro de período final deve ser novo e preservar Mês, Intervalo e Tudo.');
assert.doesNotMatch(source, /phoenix-mobile-reference\.css|PhoenixMobileReferenceScreens/,
  'Arquivos intermediários removidos não podem voltar a ser dependência da reconstrução final.');

console.log('Contrato da reconstrução mobile final validado.');
