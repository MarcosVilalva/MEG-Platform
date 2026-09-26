import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const preview = readFileSync(new URL('../phoenix/preview-main.tsx', import.meta.url), 'utf8');
const component = readFileSync(new URL('./MegMobileLoading.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('./meg-mobile-loading.css', import.meta.url), 'utf8');
const legacyBootCss = readFileSync(new URL('../phoenix/preview-boot.css', import.meta.url), 'utf8');

assert.match(
  preview,
  /MegMobileLoading progress=\{active\.progress\}/,
  'O boot real do APK deve renderizar o novo loading clean-room.',
);

assert.doesNotMatch(
  preview,
  /px-preview-boot-v5|data-boot-fidelity="approved-v5"/,
  'A estrutura visual V5 antiga não pode voltar ao boot principal.',
);

assert.doesNotMatch(
  legacyBootCss,
  /px-preview-boot-v5|MEG Boot 5\.0|approved-v5/,
  'O CSS visual V5 antigo deve ser removido, não apenas deixado dormente.',
);

assert.match(
  component,
  /data-meg-loading="validated-cleanroom"/,
  'O loading aprovado deve declarar explicitamente a implementação clean-room.',
);

assert.match(
  component,
  /data-meg-loading-reference="board-04"/,
  'O loading deve declarar a quarta prancha aprovada como referência visual.',
);

assert.match(
  component,
  /brand\/meg-loading-lockup\.svg/,
  'O loading deve usar a marca exclusiva reconstruída para a referência aprovada.',
);

assert.match(
  component,
  /SUAS FINANÇAS[\s\S]*EM UM SÓ LUGAR/,
  'O slogan da prancha aprovada deve permanecer visível no loading.',
);

assert.match(
  component,
  /Carregando sua experiência/,
  'A mensagem de progresso deve seguir a prancha aprovada.',
);

assert.match(
  component,
  /MAIS[\s\S]*CONTROLE[\s\S]*ORGANIZAÇÃO[\s\S]*TRANQUILIDADE[\s\S]*RESULTADOS/,
  'O rodapé deve preservar os quatro benefícios visuais da prancha aprovada.',
);

assert.match(
  component,
  /progressLabel/,
  'O loading deve exibir o progresso real em percentual ao lado da barra.',
);

assert.doesNotMatch(
  component,
  /Carregando seu ambiente|px-preview-boot-v5-ring|Organizando suas finanças para o seu dia a dia/i,
  'O novo loading não pode reaproveitar a composição textual anterior ou o V5.',
);

assert.match(
  css,
  /\.meg-loading-screen\{[\s\S]*height:100dvh[\s\S]*overflow:hidden/,
  'A tela de carregamento deve ocupar o viewport inteiro sem rolagem.',
);

assert.match(
  css,
  /\.meg-loading-layout\{[\s\S]*safe-area-inset-top[\s\S]*safe-area-inset-bottom/,
  'O loading deve respeitar as safe areas do Android.',
);

assert.match(
  css,
  /\.meg-loading-features\{[\s\S]*grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/,
  'Os quatro benefícios inferiores devem permanecer em uma grade fixa e responsiva.',
);

assert.match(
  css,
  /@media\(max-height:760px\)[\s\S]*@media\(max-height:640px\)/,
  'O loading deve adaptar proporções também pela altura do aparelho.',
);

assert.doesNotMatch(
  css,
  /(?:-webkit-)?backdrop-filter\s*:|(^|[;{])\s*filter\s*:/m,
  'O loading não pode depender de filtros de composição instáveis no Android WebView.',
);

console.log('Contrato do loading mobile clean-room validado.');
