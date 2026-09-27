import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const preview = readFileSync(new URL('../phoenix/preview-main.tsx', import.meta.url), 'utf8');
const component = readFileSync(new URL('./MegMobileLoading.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('./meg-mobile-loading.css', import.meta.url), 'utf8');
const legacyBootCss = readFileSync(new URL('../phoenix/preview-boot.css', import.meta.url), 'utf8');
const androidStyles = readFileSync(new URL('../../../../android/app/src/main/res/values/styles.xml', import.meta.url), 'utf8');
const mainActivity = readFileSync(new URL('../../../../android/app/src/main/java/br/com/megfinancas/app/MainActivity.java', import.meta.url), 'utf8');
const nativeBiometric = readFileSync(new URL('../native-biometric-login.js', import.meta.url), 'utf8');
const abandonedStaticArt = new URL('../../public/brand/meg-loading-approved-bg.jpg', import.meta.url);

assert.match(preview,/MegMobileLoading progress=\{active\.progress\}/,'O boot real do APK deve renderizar o loading clean-room.');
assert.doesNotMatch(preview,/px-preview-boot-v5|data-boot-fidelity="approved-v5"/,'O V5 antigo não pode voltar ao boot principal.');
assert.doesNotMatch(legacyBootCss,/px-preview-boot-v5|MEG Boot 5\.0|approved-v5/,'O CSS V5 antigo deve permanecer removido.');

assert.equal(existsSync(abandonedStaticArt),false,'A tentativa de usar screenshot como fundo deve permanecer removida.');
assert.match(component,/data-meg-loading-reference="approved-neon-built"/,'O loading deve declarar a construção neon validada.');
assert.match(component,/meg-loading-brand-stage[\s\S]*meg-loading-scene[\s\S]*meg-loading-progress-shell[\s\S]*meg-loading-features/,'Marca, cena, progresso e benefícios devem ser construídos em camadas reais.');
assert.match(component,/tile-bars[\s\S]*tile-card[\s\S]*tile-home[\s\S]*tile-pie/,'Os quatro cards centrais devem ser componentes reais.');
assert.doesNotMatch(component,/meg-loading-static-art|approved-static-art/,'A tela não pode voltar a usar screenshot como composição.');
assert.match(component,/progressLabel/,'O progresso real deve continuar funcional.');
assert.match(component,/progressLabel >= 100 \? 'Tudo pronto'/,'A conclusão deve continuar dinâmica.');

assert.doesNotMatch(css,/meg-loading-approved-bg|background-size:100% 100%/,'O CSS não pode voltar a esticar uma imagem para fingir a tela.');
assert.match(css,/\.meg-loading-screen\{[\s\S]*height:100dvh[\s\S]*overflow:hidden/,'A tela deve ocupar o viewport sem rolagem.');
assert.match(css,/\.meg-loading-tile\{[\s\S]*box-shadow:/,'Os cards devem ter profundidade construída, não rasterizada.');
assert.match(component,/meg-loading-energy-grid[\s\S]*grid-glow[\s\S]*grid-fine[\s\S]*grid-nodes/,'A malha luminosa central deve ser construída em SVG real, não em screenshot.');
assert.match(css,/\.meg-loading-energy-grid\{[\s\S]*width:140%[\s\S]*height:78%/,'A malha neon deve preencher a região dos cards como na referência.');
assert.match(css,/\.meg-loading-tile\{[\s\S]*width:clamp\(78px,23\.5vw,104px\)/,'Os cards centrais devem permanecer grandes e agrupados.');
assert.match(css,/\.meg-loading-scene::before\{[\s\S]*radial-gradient/,'A atmosfera atrás dos cards deve continuar construída em CSS.');
assert.match(css,/\.meg-loading-features\{[\s\S]*grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/,'Os quatro benefícios devem permanecer responsivos.');
assert.match(css,/\.meg-loading-track>span\.complete\{[\s\S]*width:100%!important[\s\S]*transition:none/,'O preenchimento deve sincronizar com 100%.');
assert.doesNotMatch(css,/(?:-webkit-)?backdrop-filter\s*:|(^|[;{])\s*filter\s*:/m,'O loading não deve depender de filtros instáveis no Android WebView.');

assert.match(nativeBiometric,/approved-neon-built/,'A transição biométrica deve reutilizar a construção neon.');
assert.match(nativeBiometric,/meg-loading-brand-stage[\s\S]*meg-loading-scene[\s\S]*meg-loading-progress-shell[\s\S]*meg-loading-features/,'A biometria deve reproduzir a mesma estrutura construída.');
assert.doesNotMatch(nativeBiometric,/meg-loading-static-art|approved-static-art/,'A biometria não pode voltar ao screenshot.');

assert.match(androidStyles,/android:windowLightStatusBar">false<[\s\S]*android:windowLightNavigationBar">false</,'O tema Android deve usar ícones claros nas barras do sistema.');
assert.match(mainActivity,/setSystemBarsAppearance\([\s\S]*APPEARANCE_LIGHT_STATUS_BARS[\s\S]*APPEARANCE_LIGHT_NAVIGATION_BARS/,'O runtime Android deve manter as barras do sistema escuras.');

console.log('Contrato do loading mobile neon construído validado.');
