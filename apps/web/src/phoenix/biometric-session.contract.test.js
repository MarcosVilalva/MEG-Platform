import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const preview = readFileSync(new URL('./preview-main.tsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('./PhoenixApp.tsx', import.meta.url), 'utf8');
const settings = readFileSync(new URL('./screens/PhoenixSettings.tsx', import.meta.url), 'utf8');
const auth = readFileSync(new URL('../app/auth-client.ts', import.meta.url), 'utf8');

assert.match(preview, /offerAndroidBiometricEnrollment/,
  'APK deve oferecer habilitação biométrica depois do primeiro login válido.');
assert.match(preview, /getBiometricLoginStatus\(\)[\s\S]*saveBiometricLogin/,
  'Habilitação deve conferir disponibilidade antes de persistir a credencial biométrica.');
assert.match(preview, /consumePreparedAndroidBiometricCredentials[\s\S]*if \(!credentials\)[\s\S]*getBiometricLoginStatus/,
  'Boot Android deve consumir primeiro as credenciais já autenticadas pelo bootstrap nativo e só consultar a ponte novamente como fallback.');
assert.match(nativeBiometric, /CACHED_CREDENTIALS_MS\s*=\s*30_000/,
  'Handoff biométrico em memória deve sobreviver ao carregamento inicial do bundle sem persistir senha no WebView.');
assert.match(nativeBiometric, /BIOMETRIC_BRIDGE_CALL_TIMEOUT_MS[\s\S]*bridgeCallWithTimeout\(BiometricAuth\.isAvailable\(\)\)/,
  'Consulta de disponibilidade biométrica deve ter timeout para nunca prender o boot em 22%.');
assert.match(preview, /Deseja usar a biometria neste dispositivo nos próximos acessos ao MEG\?/,
  'Primeiro login deve perguntar explicitamente se o usuário deseja biometria.');
assert.match(preview, /biometricEnrollmentDeclinedKey[\s\S]*localStorage\.setItem/,
  'Recusa da biometria deve ser lembrada no mesmo dispositivo em vez de perguntar em todo login.');
assert.match(preview, /await loginWithServiceRetry\(loginEmail, password\);[\s\S]*await offerAndroidBiometricEnrollment\(loginEmail, password\);/,
  'Oferta biométrica só pode acontecer depois de autenticação por senha bem-sucedida.');
assert.match(preview, /async function closeNativeApp\(\)[\s\S]*exitAndRemoveTask/,
  'Fechamento do APK deve continuar removendo a tarefa Android.');
const closeBlock = preview.slice(preview.indexOf('async function closeNativeApp()'), preview.indexOf("if (state === 'signed-in')"));
assert.equal((closeBlock.match(/signOut\(\)/g) || []).length, 1,
  'Fechamento nativo pode usar signOut apenas no fallback não-mobile; Android não deve revogar a sessão antes de fechar.');
assert.match(preview, /async function signOut\(\)[\s\S]*clearBiometricLogin/,
  'Saída explícita da conta deve remover a credencial biométrica para permitir troca de usuário.');

assert.match(app, /function requestClose\(\)/,
  'Shell deve separar fechamento do aplicativo de logout da conta.');
assert.match(app, /onClick=\{requestClose\}>Fechar o MEG</,
  'Menu Android deve oferecer fechamento sem chamar logout.');
assert.match(app, /onClose\?\.\(\)/,
  'Confirmação de fechamento deve usar callback próprio.');
assert.match(app, /Deseja fechar o aplicativo\?/,
  'Diálogo Android deve descrever fechamento, não encerramento de conta.');
assert.match(settings, /Sair da conta[\s\S]*remove a credencial biométrica deste aparelho/,
  'Configurações deve manter uma ação distinta para sair da conta e trocar usuário.');
assert.match(settings, /Biometria neste aparelho[\s\S]*Fechar o MEG não remove a biometria/,
  'Configurações deve explicar que fechar o APK preserva a biometria.');
assert.match(settings, /Ver todos \(\$\{phoenixAvatarPresets\.length\}\)/,
  'Lista de avatares deve oferecer expansão explícita.');
assert.match(settings, /Recolher avatares/,
  'Lista de avatares deve poder ser recolhida depois da expansão.');
assert.match(settings, /\/notifications\/status[\s\S]*\/notifications\/deliveries/,
  'Configurações deve consultar o estado real dos canais e entregas.');
assert.match(settings, /downloads\/app-version\.json/,
  'Configurações deve exibir a versão publicada do aplicativo sem valor fixo.');

assert.match(auth, /AUTH_REFRESH_TIMEOUT_MS\s*=\s*15_000/,
  'Renovação da sessão deve possuir timeout curto para não prender o boot.');
assert.match(auth, /status === 401 \|\| status === 403[\s\S]*clearSession\(\)/,
  'Somente rejeição real da credencial deve limpar a sessão durante o refresh.');
assert.match(auth, /cacheKey = method === 'GET'[\s\S]*!init\?\.signal/,
  'Leituras com timeout próprio não podem herdar um GET anterior preso em voo.');

console.log('Contrato de biometria persistente e fechamento seguro do APK validado.');
