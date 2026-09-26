import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const preview = readFileSync(new URL('../phoenix/preview-main.tsx', import.meta.url), 'utf8');
const component = readFileSync(new URL('./MegMobileLoading.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('./meg-mobile-loading.css', import.meta.url), 'utf8');

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

assert.match(
  component,
  /data-meg-loading="validated-cleanroom"/,
  'O loading aprovado deve declarar explicitamente a implementação clean-room.',
);

assert.match(
  component,
  /brand\/meg-loading-lockup\.svg/,
  'O loading deve usar a marca exclusiva reconstruída para a referência aprovada.',
);

assert.match(
  component,
  /Carregando seus dados\.\.\./,
  'O texto central deve ser exatamente o da prévia aprovada.',
);

assert.match(
  component,
  /Organizando suas finanças[\s\S]*para o seu dia a dia\./,
  'O rodapé deve preservar a mensagem da prévia aprovada.',
);

assert.doesNotMatch(
  component,
  /Carregando seu ambiente|px-preview-boot-v5|ring|percent/i,
  'O novo loading não pode reaproveitar texto, anéis ou estrutura do V5.',
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
  /@media\(max-height:760px\)[\s\S]*@media\(max-height:640px\)/,
  'O loading deve adaptar proporções também pela altura do aparelho.',
);

console.log('Contrato do loading mobile clean-room validado.');
