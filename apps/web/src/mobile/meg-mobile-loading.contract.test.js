import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const preview = readFileSync(new URL('../phoenix/preview-main.tsx', import.meta.url), 'utf8');
const component = readFileSync(new URL('./MegMobileLoading.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('./meg-mobile-loading.css', import.meta.url), 'utf8');
const legacyBootCss = readFileSync(new URL('../phoenix/preview-boot.css', import.meta.url), 'utf8');
const androidStyles = readFileSync(new URL('../../../../android/app/src/main/res/values/styles.xml', import.meta.url), 'utf8');
const mainActivity = readFileSync(new URL('../../../../android/app/src/main/java/br/com/megfinancas/app/MainActivity.java', import.meta.url), 'utf8');
const nativeBiometric = readFileSync(new URL('../native-biometric-login.js', import.meta.url), 'utf8');
const approvedArt = new URL('../../public/brand/meg-loading-approved-bg.jpg', import.meta.url);

assert.match(preview,/MegMobileLoading progress=\{active\.progress\}/,'O boot real do APK deve renderizar o loading aprovado.');
assert.doesNotMatch(preview,/px-preview-boot-v5|data-boot-fidelity="approved-v5"/,'O V5 antigo não pode voltar ao boot principal.');
assert.doesNotMatch(legacyBootCss,/px-preview-boot-v5|MEG Boot 5\.0|approved-v5/,'O CSS visual V5 antigo deve permanecer removido.');

assert.ok(existsSync(approvedArt),'A arte estática validada deve existir como asset do aplicativo.');
assert.match(component,/data-meg-loading-reference="approved-static-art"/,'O loading deve declarar a arte estática aprovada como referência.');
assert.match(component,/meg-loading-static-art/,'A tela deve usar a arte validada como composição visual única.');
assert.doesNotMatch(component,/FeatureIcon|tile-chart|tile-card|tile-home|tile-pie|meg-loading-features/,'Ícones, cards e benefícios não podem ser reconstruídos sobre a arte.');
assert.match(component,/progressLabel/,'O progresso real deve continuar funcional.');
assert.match(component,/progressLabel >= 100 \? 'Tudo pronto'/,'A conclusão do boot deve continuar dinâmica.');

assert.match(css,/meg-loading-approved-bg\.jpg/,'O CSS deve usar diretamente a imagem validada.');
assert.match(css,/\.meg-loading-static-art\{[\s\S]*background-size:100% 100%/,'A arte aprovada deve preencher todo o viewport.');
assert.match(css,/\.meg-loading-progress-shell\{/,'Somente a camada funcional de progresso deve ficar sobre a arte.');
assert.match(css,/\.meg-loading-screen\{[\s\S]*height:100dvh[\s\S]*overflow:hidden/,'A tela deve ocupar o viewport sem rolagem.');
assert.match(css,/\.meg-loading-track>span\.complete\{[\s\S]*width:100%!important[\s\S]*transition:none/,'O preenchimento deve sincronizar com 100%.');
assert.doesNotMatch(css,/(?:-webkit-)?backdrop-filter\s*:|(^|[;{])\s*filter\s*:/m,'O loading não deve depender de filtros instáveis no Android WebView.');

assert.match(nativeBiometric,/approved-static-art/,'A transição biométrica deve reutilizar exatamente a mesma arte estática.');
assert.match(nativeBiometric,/meg-loading-static-art[\s\S]*meg-loading-progress-shell/,'A transição biométrica deve manter apenas arte e progresso.');
assert.doesNotMatch(nativeBiometric,/tile-chart|tile-card|tile-home|tile-pie|meg-loading-features/,'A transição biométrica não pode reconstruir os ícones.');

assert.match(androidStyles,/android:windowLightStatusBar">false<[\s\S]*android:windowLightNavigationBar">false</,'O tema Android deve usar ícones claros nas barras do sistema.');
assert.match(mainActivity,/setSystemBarsAppearance\([\s\S]*APPEARANCE_LIGHT_STATUS_BARS[\s\S]*APPEARANCE_LIGHT_NAVIGATION_BARS/,'O runtime Android deve manter as barras do sistema escuras.');

console.log('Contrato do loading mobile com arte estática validada.');
